import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import type { CampayWebhookPayload } from '@/types'

const ADMIN_URL = process.env.NEXT_PUBLIC_ADMIN_URL ?? 'https://admin.habynex.com'

export async function POST(req: NextRequest) {
  try {
    const payload: CampayWebhookPayload = await req.json()
    const supabase = createAdminClient()

    if (payload.status !== 'SUCCESSFUL') {
      await supabase
        .from('visit_bookings')
        .update({ status: 'cancelled' })
        .eq('payment_ref', payload.reference)
      return NextResponse.json({ received: true })
    }

    // Paiement confirmé : mettre à jour le booking
    const { data: booking } = await supabase
      .from('visit_bookings')
      .update({
        status: 'paid',
        paid_at: new Date().toISOString(),
      })
      .eq('payment_ref', payload.reference)
      .select('id, client_id, nb_listings')
      .single()

    if (!booking) return NextResponse.json({ received: true })

    // Notifier le client (lien vers son profil dans Habynex-final)
    await supabase.from('notifications').insert({
      user_id: booking.client_id,
      title: '✅ Paiement confirmé !',
      body: `Votre réservation de ${booking.nb_listings} visite(s) est confirmée. Un agent va vous être assigné.`,
      action_url: `/profil?tab=visites`,
      channel: 'in_app',
    })

    // Notifier les admins — lien vers habynex-admin
    const { data: admins } = await supabase
      .from('user_roles')
      .select('user_id')
      .in('role', ['admin', 'super_admin'])

    if (admins?.length) {
      await supabase.from('notifications').insert(
        admins.map((a: { user_id: string }) => ({
          user_id: a.user_id,
          title: '🏠 Nouvelle réservation payée',
          body: `${booking.nb_listings} visite(s) réservée(s) — à assigner à un agent.`,
          action_url: `${ADMIN_URL}/reservations`,
          channel: 'in_app',
        }))
      )
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Campay webhook error:', error)
    return NextResponse.json({ error: 'Webhook error' }, { status: 500 })
  }
}
