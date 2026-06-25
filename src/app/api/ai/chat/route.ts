import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { sendPushToUser } from '@/lib/push/sendToUser'
import type { FaqItem } from '@/types'

// ================================================================
// POST /api/ai/chat — version sans IA externe
//
// Flux simplifié :
// 1. Créer/récupérer la conversation dans la table conversations
// 2. Sauvegarder le message de l'utilisateur
// 3. Si la question est dans le FAQ → répondre automatiquement
//    (la conversation reste ouverte dans tous les cas)
// 4. Notifier les admins par push + in-app
// 5. Retourner la réponse FAQ (si trouvée) ou null
//
// L'admin répond depuis le dashboard admin OU depuis l'onglet
// Messages de habynex. Plus de timer, plus d'IA fallback.
// ================================================================

const ADMIN_URL = process.env.NEXT_PUBLIC_ADMIN_URL ?? ''

// ── Correspondance FAQ ─────────────────────────────────────────────
function findFaqMatch(message: string, questions: FaqItem[]): FaqItem | null {
  const normalize = (s: string) =>
    s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()
  const msg = normalize(message)

  for (const item of questions) {
    const keywords = item.keywords ?? []
    const matches = keywords.filter((kw: string) => msg.includes(normalize(kw)))
    const hasStrong = matches.some((kw: string) => kw.length > 5)
    if (matches.length >= 2 || (matches.length === 1 && hasStrong)) return item
  }
  return null
}

// ── Notifier tous les admins ───────────────────────────────────────
async function notifyAdmins(
  supabase: ReturnType<typeof createAdminClient>,
  conversationId: string,
  listingTitle: string,
  clientName: string,
  messagePreview: string,
) {
  const { data: admins } = await supabase
    .from('user_roles').select('user_id').in('role', ['admin', 'super_admin'])
  if (!admins?.length) return

  const title = `💬 ${clientName} — ${listingTitle}`
  const body = messagePreview.slice(0, 80) + (messagePreview.length > 80 ? '…' : '')
  const actionUrl = `${ADMIN_URL}/conversations?id=${conversationId}`

  // In-app (dashboard admin)
  await supabase.from('notifications').insert(
    admins.map((a: { user_id: string }) => ({
      user_id: a.user_id,
      title,
      body,
      action_url: actionUrl,
      channel: 'in_app',
      metadata: { conversationId },
    }))
  )

  // Push (canal principal)
  await Promise.allSettled(
    admins.map((a: { user_id: string }) =>
      sendPushToUser({
        userId: a.user_id,
        type: 'message',
        title,
        message: body,
        url: actionUrl,
        requireInteraction: true,
      })
    )
  )
}

// ── Route principale ───────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { listingId, message, conversationId: existingConvId } = await req.json()

    if (!listingId || !message?.trim()) {
      return NextResponse.json({ error: 'listingId et message requis' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Récupérer les infos utilisateur depuis le token
    const authHeader = req.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    let userId: string | null = null
    let clientName = 'Client'

    if (token) {
      const { data: { user } } = await supabase.auth.getUser(token)
      if (user) {
        userId = user.id
        const { data: profile } = await supabase
          .from('profiles').select('full_name').eq('id', user.id).single()
        clientName = profile?.full_name ?? 'Client'
      }
    }

    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    // ── 1. Créer ou récupérer la conversation ──────────────────────
    let conversationId = existingConvId

    if (!conversationId) {
      // Chercher une conv existante pour cet utilisateur + annonce
      const { data: existing } = await supabase
        .from('conversations')
        .select('id')
        .eq('listing_id', listingId)
        .eq('client_id', userId)
        .single()

      if (existing) {
        conversationId = existing.id
      } else {
        // Créer une nouvelle conversation
        const { data: created, error: convErr } = await supabase
          .from('conversations')
          .insert({
            listing_id: listingId,
            client_id: userId,
            status: 'open',
            admin_notified_at: new Date().toISOString(),
          })
          .select('id')
          .single()

        if (convErr || !created) {
          console.error('Conversation create error:', convErr)
          return NextResponse.json({ error: 'Impossible de créer la conversation' }, { status: 500 })
        }
        conversationId = created.id
      }
    }

    // ── 2. Sauvegarder le message de l'utilisateur ─────────────────
    await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_id: userId,
      content: message.trim(),
      role: 'user',
    })

    // Mettre à jour le timestamp de la conversation
    await supabase.from('conversations').update({
      last_message_at: new Date().toISOString(),
      status: 'open',
    }).eq('id', conversationId)

    // ── 3. Chercher une correspondance dans le FAQ ─────────────────
    const { data: faqData } = await supabase
      .from('listing_faqs')
      .select('questions')
      .eq('listing_id', listingId)
      .single()

    let faqAnswer: string | null = null

    if (faqData?.questions?.length) {
      const match = findFaqMatch(message.trim(), faqData.questions as FaqItem[])
      if (match) {
        faqAnswer = match.a
        // Sauvegarder la réponse FAQ comme message automatique
        await supabase.from('messages').insert({
          conversation_id: conversationId,
          sender_id: null,
          content: faqAnswer,
          role: 'ai',   // badge "FAQ" côté client
          metadata: { source: 'faq', question: match.q },
        })
      }
    }

    // ── 4. Notifier les admins (dans tous les cas) ─────────────────
    // Récupérer le titre de l'annonce pour la notification
    const { data: listing } = await supabase
      .from('listings').select('title').eq('id', listingId).single()

    // Notifier seulement si c'est le premier message (nouvelle conv)
    // ou si c'est une vraie question sans réponse FAQ
    if (!faqAnswer || !existingConvId) {
      notifyAdmins(
        supabase,
        conversationId,
        listing?.title ?? 'Annonce',
        clientName,
        message.trim(),
      ).catch(() => {}) // non-bloquant
    }

    // ── 5. Retourner la réponse ────────────────────────────────────
    return NextResponse.json({
      conversationId,
      faqAnswer,            // null si pas de correspondance FAQ
      source: faqAnswer ? 'faq' : 'human', // indique si réponse auto ou attente humain
    })

  } catch (err: any) {
    console.error('chat route error:', err)
    return NextResponse.json({ error: err?.message ?? 'Erreur serveur' }, { status: 500 })
  }
}