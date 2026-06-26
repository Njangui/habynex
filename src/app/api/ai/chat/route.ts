import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { sendPushToUser } from '@/lib/push/sendToUser'
import type { FaqItem } from '@/types'

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

    const { data: conv } = await supabase
      .from('conversations')
      .select(`
        id, listing_id, client_id, admin_notified_at,
        listing:listings(title),
        client:profiles!conversations_client_id_fkey(full_name)
      `)
      .eq('id', conversationId)
      .single()

    if (!conv) {
      return NextResponse.json({ error: 'Conversation introuvable' }, { status: 404 })
    }

    const listingTitle = (Array.isArray(conv.listing) ? conv.listing[0] : conv.listing as any)?.title ?? 'Annonce'
    const clientName = (Array.isArray(conv.client) ? conv.client[0] : conv.client as any)?.full_name ?? 'Client'

    // Mettre à jour la conversation
    await supabase.from('conversations').update({
      last_message_at: new Date().toISOString(),
      status: 'open',
      pending_ai_reply: false,
    }).eq('id', conversationId)

    // Chercher correspondance FAQ
    const { data: faqData } = await supabase
      .from('listing_faqs')
      .select('questions')
      .eq('listing_id', conv.listing_id)
      .single()

    let faqAnswer: string | null = null

    if (faqData?.questions?.length) {
      faqAnswer = findFaqMatch(message.trim(), faqData.questions as FaqItem[])
      if (faqAnswer) {
        await supabase.from('messages').insert({
          conversation_id: conversationId,
          sender_id: null,
          role: 'ai',
          content: faqAnswer,
          metadata: { source: 'faq' },
        })
      }
    }

    // Notifier les admins — une fois par tranche de 10 minutes
    const shouldNotify = !conv.admin_notified_at ||
      Date.now() - new Date(conv.admin_notified_at).getTime() > 10 * 60 * 1000

    if (shouldNotify) {
      await supabase.from('conversations').update({
        admin_notified_at: new Date().toISOString(),
      }).eq('id', conversationId)

      notifyAdmins(
        supabase, conversationId, conv.listing_id,
        `💬 ${clientName} — ${listingTitle}`,
        message.trim().slice(0, 80),
      ).catch(() => {})
    }

    return NextResponse.json({
      reply: faqAnswer,
      source: faqAnswer ? 'faq' : 'human',
      escalated: false,
    })

  } catch (err: any) {
    console.error('[chat] error:', err)
    return NextResponse.json({ error: err?.message ?? 'Erreur serveur' }, { status: 500 })
  }
}