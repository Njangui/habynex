import { NextRequest, NextResponse } from 'next/server'
import { anthropic, AI_MODEL, AI_MAX_TOKENS, SYSTEM_PROMPT_BASE, shouldEscalate } from '@/lib/ai/client'
import { createAdminClient } from '@/lib/supabase/server'

const ADMIN_URL = process.env.NEXT_PUBLIC_ADMIN_URL ?? 'https://admin.habynex.com'

export async function POST(req: NextRequest) {
  try {
    const { conversationId, message, listingContext } = await req.json()

    if (!conversationId || !message) {
      return NextResponse.json({ error: 'conversationId et message requis' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Vérifier si escalade nécessaire AVANT d'appeler l'IA
    if (shouldEscalate(message)) {
      await supabase
        .from('conversations')
        .update({
          ai_active: false,
          escalated_at: new Date().toISOString(),
          escalation_reason: 'Sujet sensible détecté (argent/confirmation)',
        })
        .eq('id', conversationId)

      // Notifier les admins — lien vers habynex-admin
      const { data: admins } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin')

      if (admins?.length) {
        await supabase.from('notifications').insert(
          admins.map((a: { user_id: string }) => ({
            user_id: a.user_id,
            title: '🚨 Escalade conversation',
            body: 'Un client demande une intervention humaine.',
            action_url: `${ADMIN_URL}/conversations`,
            channel: 'in_app',
          }))
        )
      }

      return NextResponse.json({
        reply: 'Je transfère votre demande à un conseiller Habynex qui vous répondra très rapidement. Merci pour votre patience ! 🙏',
        escalated: true,
      })
    }

    // Récupérer l'historique des messages (10 derniers)
    const { data: history } = await supabase
      .from('messages')
      .select('role, content')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(10)

    const listingCtx = listingContext
      ? `\n\nBien immobilier en cours de discussion:\n${JSON.stringify(listingContext, null, 2)}`
      : ''

    const response = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: AI_MAX_TOKENS,
      system: SYSTEM_PROMPT_BASE + listingCtx,
      messages: [
        ...(history ?? []).map((m: { role: string; content: string }) => ({
          role: m.role === 'ai' ? 'assistant' : 'user' as 'user' | 'assistant',
          content: m.content,
        })),
        { role: 'user', content: message },
      ],
    })

    const reply = response.content[0].type === 'text' ? response.content[0].text : ''

    await supabase.from('ai_logs').insert({
      action_type: 'message_response',
      conversation_id: conversationId,
      tokens_input: response.usage.input_tokens,
      tokens_output: response.usage.output_tokens,
      escalated: false,
    })

    return NextResponse.json({ reply, escalated: false })
  } catch (error) {
    console.error('AI chat error:', error)
    return NextResponse.json({ error: 'Erreur IA' }, { status: 500 })
  }
}
