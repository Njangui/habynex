import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { checkPaymentStatus } from '@/lib/payments/cinetpay'
import type { CinetPayWebhookPayload } from '@/lib/payments/cinetpay'

const ADMIN_URL = process.env.NEXT_PUBLIC_ADMIN_URL ?? 'https://admin.habynex.com'

export async function POST(req: NextRequest) {
  try {
    // CinetPay envoie le webhook en form-urlencoded OU JSON selon la version
    let payload: CinetPayWebhookPayload
    const contentType = req.headers.get('content-type') ?? ''

    if (contentType.includes('application/json')) {
      payload = await req.json()
    } else {
      const form = await req.formData()
      payload = Object.fromEntries(form.entries()) as unknown as CinetPayWebhookPayload
    }

    const supabase = createAdminClient()

    // cpm_result = '00' → SUCCÈS
    if (payload.cpm_result !== '00') {
      await supabase
        .from('visit_bookings')
        .update({ status: 'cancelled' })
        .eq('id', payload.cpm_trans_id)

      return NextResponse.json({ received: true })
    }

    // Double vérification via l'API CinetPay (anti-spoofing)
    let verified = false
    try {
      const status = await checkPaymentStatus(payload.cpm_trans_id)
      verified = status.data?.status === 'ACCEPTED'
    } catch {
      // Si l'API est indisponible, on fait confiance au webhook (à ajuster selon votre niveau de risque)
      verified = true
    }

    if (!verified) {
      console.warn(`[cinetpay-webhook] Paiement non vérifié pour ${payload.cpm_trans_id}`)
      return NextResponse.json({ received: true })
    }

    // Paiement confirmé : mettre à jour le booking
    const { data: booking } = await supabase
      .from('visit_bookings')
      .update({
        status: 'paid',
        paid_at: new Date().toISOString(),
        payment_method: payload.payment_method ?? 'cinetpay',
      })
      .eq('id', payload.cpm_trans_id)
      .select('id, client_id, nb_listings')
      .single()

    if (!booking) return NextResponse.json({ received: true })

    // Notifier le client
    await supabase.from('notifications').insert({
      user_id: booking.client_id,
      title: '✅ Paiement confirmé !',
      body: `Votre réservation de ${booking.nb_listings} visite(s) est confirmée. Un agent va vous être assigné.`,
      action_url: `/profil?tab=visites`,
      channel: 'in_app',
    })

    // Notifier les admins
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
    console.error('CinetPay webhook error:', error)
    return NextResponse.json({ error: 'Webhook error' }, { status: 500 })
  }
}
