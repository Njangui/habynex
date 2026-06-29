import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { sendPushToUser } from '@/lib/push/sendToUser'
import type { FaqItem } from '@/types'

// ================================================================
// POST /api/ai/chat — sans IA externe
//
// Flux :
// 1. Chercher correspondance FAQ → retourner réponse si trouvée
// 2. Notifier les admins (push + in-app)
// 3. Retourner null → admin répond depuis dashboard ou Messages
//
// Le ChatBox s'occupe déjà de :
// - Insérer le message user en DB
// - Insérer data.reply en DB si non null
// ================================================================

const ADMIN_URL = process.env.NEXT_PUBLIC_ADMIN_URL ?? ''

function findFaqMatch(message: string, questions: FaqItem[]): string | null {
  const normalize = (s: string) =>
    s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()
  const msg = normalize(message)

  for (const item of questions) {
    const keywords = item.keywords ?? []
    const matches = keywords.filter((kw: string) => msg.includes(normalize(kw)))
    const hasStrong = matches.some((kw: string) => kw.length > 5)
    if (matches.length >= 2 || (matches.length === 1 && hasStrong)) return item.a
  }
  return null
}

async function notifyAdmins(
  supabase: ReturnType<typeof createAdminClient>,
  conversationId: string,
  listingId: string,
  title: string,
  body: string,
) {
  const { data: admins } = await supabase
    .from('user_roles').select('user_id').in('role', ['admin', 'super_admin'])
  if (!admins?.length) return

  await supabase.from('notifications').insert(
    admins.map((a: { user_id: string }) => ({
      user_id: a.user_id, title, body,
      action_url: `${ADMIN_URL}/conversations?id=${conversationId}`,
      channel: 'in_app',
      metadata: { conversationId, listingId },
    }))
  )

  await Promise.allSettled(
    admins.map((a: { user_id: string }) =>
      sendPushToUser({
        userId: a.user_id, type: 'message', title, message: body,
        url: `/conversations?id=${conversationId}`, requireInteraction: true,
      })
    )
  )
}

export async function POST(req: NextRequest) {
  try {
    const { conversationId, message } = await req.json()

    if (!conversationId || !message?.trim()) {
      return NextResponse.json({ error: 'conversationId et message requis' }, { status: 400 })
    }

    const supabase = createAdminClient()
    const now = new Date()

    // Récupérer la conversation
    const { data: conv } = await supabase
      .from('conversations')
      .select('id, listing_id, admin_notified_at, claimed_by')
      .eq('id', conversationId)
      .single()

    if (!conv) {
      return NextResponse.json({ error: 'Conversation introuvable' }, { status: 404 })
    }

    // Mettre à jour les timestamps
    await supabase.from('conversations').update({
      last_user_msg_at: now.toISOString(),
      last_message_at: now.toISOString(),
      pending_ai_reply: false, // plus d'IA — on n'attend pas
      status: 'open',
    }).eq('id', conversationId)

    // ── 1. Chercher dans le FAQ ──────────────────────────────────────
    const { data: faq } = await supabase
      .from('listing_faqs')
      .select('questions')
      .eq('listing_id', conv.listing_id)
      .single()

    if (faq?.questions?.length) {
      const faqAnswer = findFaqMatch(message.trim(), faq.questions as FaqItem[])
      if (faqAnswer) {
        // Le ChatBox va insérer data.reply en DB automatiquement
        // On notifie quand même l'admin (il peut compléter si nécessaire)
        notifyAdmins(
          supabase, conversationId, conv.listing_id,
          '💬 Question avec réponse FAQ automatique',
          message.trim().slice(0, 80),
        ).catch(() => {})

        return NextResponse.json({
          reply: faqAnswer,
          source: 'faq',
          escalated: false,
        })
      }
    }

    // ── 2. Pas de FAQ → notifier les admins ─────────────────────────
    // Anti-spam : notifier une fois, puis seulement après 10 min d'inactivité
    const shouldNotify = !conv.admin_notified_at ||
      Date.now() - new Date(conv.admin_notified_at).getTime() > 10 * 60 * 1000

    if (shouldNotify) {
      await supabase.from('conversations').update({
        admin_notified_at: now.toISOString(),
        ai_active: false,
      }).eq('id', conversationId)

      // Récupérer le nom du client pour la notification
      const { data: conv2 } = await supabase
        .from('conversations')
        .select(`
          listing:listings(title),
          client:profiles!conversations_client_id_fkey(full_name)
        `)
        .eq('id', conversationId)
        .single()

      const listingTitle = (Array.isArray(conv2?.listing) ? conv2.listing[0] : conv2?.listing as any)?.title ?? 'Annonce'
      const clientName = (Array.isArray(conv2?.client) ? conv2.client[0] : conv2?.client as any)?.full_name ?? 'Client'

      notifyAdmins(
        supabase, conversationId, conv.listing_id,
        `💬 ${clientName} — ${listingTitle}`,
        message.trim().slice(0, 80),
      ).catch(() => {})
    }

    // ── 3. Pas de réponse automatique → admin répondra ──────────────
    return NextResponse.json({
      reply: null,      // ChatBox n'insère rien → utilisateur attend la réponse admin
      source: 'human',
      escalated: false,
    })

  } catch (err: any) {
    console.error('[ai/chat] error:', err)
    return NextResponse.json({ error: err?.message ?? 'Erreur serveur' }, { status: 500 })
  }
}