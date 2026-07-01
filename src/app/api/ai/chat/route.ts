import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { sendPushToUser } from '@/lib/push/sendToUser'
import type { FaqItem } from '@/types'

// POST /api/ai/chat — sans IA externe
// Le serveur insère lui-même les réponses FAQ (client admin = service role).
// Le ChatBox écoute uniquement le canal realtime pour afficher les nouvelles lignes.

const ADMIN_URL = process.env.NEXT_PUBLIC_ADMIN_URL ?? ''

function findFaqMatch(message: string, questions: FaqItem[]): string | null {
  const normalize = (s: string) =>
    s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()
  const msg = normalize(message)

  for (const item of questions) {
    // 1. Match sur les mots-clés définis
    const keywords: string[] = item.keywords ?? []
    const kwMatches = keywords.filter((kw) => msg.includes(normalize(kw)))
    const hasStrong = kwMatches.some((kw) => kw.length > 4)
    if (kwMatches.length >= 2 || (kwMatches.length === 1 && hasStrong)) return item.a

    // 2. Fallback : match sur les mots de la question elle-même
    const qWords = normalize(item.q ?? '')
      .split(/\s+/)
      .filter((w) => w.length > 3)
    const qMatches = qWords.filter((w) => msg.includes(w))
    if (qMatches.length >= 2) return item.a
    if (qMatches.length === 1 && qMatches[0].length > 6) return item.a
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
  try {
    const { data: admins } = await supabase
      .from('user_roles')
      .select('user_id')
      .in('role', ['admin', 'super_admin'])
    if (!admins?.length) return

    await supabase.from('notifications').insert(
      admins.map((a: { user_id: string }) => ({
        user_id: a.user_id,
        title,
        body,
        action_url: `${ADMIN_URL}/conversations?id=${conversationId}`,
        channel: 'in_app',
        metadata: { conversationId, listingId },
      }))
    )

    await Promise.allSettled(
      admins.map((a: { user_id: string }) =>
        sendPushToUser({
          userId: a.user_id,
          type: 'message',
          title,
          message: body,
          url: `/conversations?id=${conversationId}`,
          requireInteraction: true,
        })
      )
    )
  } catch (e) {
    console.error('[ai/chat] notifyAdmins error:', e)
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const conversationId: string = body?.conversationId
    const message: string = body?.message

    if (!conversationId || !message?.trim()) {
      return NextResponse.json(
        { error: 'conversationId et message requis' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()
    const now = new Date().toISOString()

    // ── Récupérer la conversation ────────────────────────────────────
    const { data: conv, error: convErr } = await supabase
      .from('conversations')
      .select('id, listing_id, admin_notified_at')
      .eq('id', conversationId)
      .single()

    if (convErr || !conv) {
      console.error('[ai/chat] conversation not found:', convErr)
      return NextResponse.json({ error: 'Conversation introuvable' }, { status: 404 })
    }

    // Mise à jour basique (uniquement colonnes qui existent à coup sûr)
    await supabase
      .from('conversations')
      .update({ last_message_at: now })
      .eq('id', conversationId)

    // ── 1. Chercher dans la FAQ ──────────────────────────────────────
    const { data: faq } = await supabase
      .from('listing_faqs')
      .select('questions')
      .eq('listing_id', conv.listing_id)
      .single()

    if (faq?.questions?.length) {
      const faqAnswer = findFaqMatch(message.trim(), faq.questions as FaqItem[])
      if (faqAnswer) {
        const { error: insertMsgErr } = await supabase.from('messages').insert({
          conversation_id: conversationId,
          sender_id: null,
          role: 'ai',
          content: faqAnswer,
        })

        if (insertMsgErr) {
          console.error('[ai/chat] insert AI message failed:', insertMsgErr)
        }

        notifyAdmins(
          supabase,
          conversationId,
          conv.listing_id,
          '💬 Question avec réponse FAQ automatique',
          message.trim().slice(0, 80),
        )

        return NextResponse.json({
          reply: faqAnswer,
          source: 'faq',
          escalated: false,
          inserted: !insertMsgErr,
        })
      }
    }

    // ── 2. Pas de FAQ → notifier les admins ─────────────────────────
    const lastNotif = conv.admin_notified_at
      ? new Date(conv.admin_notified_at).getTime()
      : 0
    const shouldNotify = Date.now() - lastNotif > 10 * 60 * 1000

    if (shouldNotify) {
      await supabase
        .from('conversations')
        .update({ admin_notified_at: now })
        .eq('id', conversationId)

      // Récupérer titre annonce + nom client pour la notification
      const { data: conv2 } = await supabase
        .from('conversations')
        .select(`
          listing:listings(title),
          client:profiles!conversations_client_id_fkey(full_name)
        `)
        .eq('id', conversationId)
        .single()

      const listingTitle =
        (Array.isArray(conv2?.listing) ? conv2.listing[0] : (conv2?.listing as any))
          ?.title ?? 'Annonce'
      const clientName =
        (Array.isArray(conv2?.client) ? conv2.client[0] : (conv2?.client as any))
          ?.full_name ?? 'Client'

      notifyAdmins(
        supabase,
        conversationId,
        conv.listing_id,
        `💬 ${clientName} — ${listingTitle}`,
        message.trim().slice(0, 80),
      )
    }

    return NextResponse.json({ reply: null, source: 'human', escalated: false })
  } catch (err: any) {
    console.error('[ai/chat] unexpected error:', err)
    return NextResponse.json(
      { error: err?.message ?? 'Erreur serveur' },
      { status: 500 }
    )
  }
}