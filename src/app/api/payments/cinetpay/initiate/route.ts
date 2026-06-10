import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { initiatePayment, getBookingPrice } from '@/lib/payments/cinetpay'
import { z } from 'zod'

const schema = z.object({
  listingIds: z.array(z.string().uuid()).min(1).max(3),
  phoneNumber: z.string().regex(/^237[0-9]{9}$/, 'Format: 237XXXXXXXXX'),
  isFree: z.boolean().optional().default(false),
})

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const { listingIds, phoneNumber, isFree } = parsed.data
    const nbListings = listingIds.length
    const amount = getBookingPrice(nbListings, isFree)

    // Vérifier si visite gratuite disponible
    if (isFree) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('free_visits_balance')
        .eq('id', user.id)
        .single()

      if (!profile || profile.free_visits_balance < 1) {
        return NextResponse.json({ error: 'Aucune visite gratuite disponible' }, { status: 400 })
      }
    }

    // Récupérer l'email et le nom du profil
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email, phone')
      .eq('id', user.id)
      .single()

    // Créer le booking en base
    const { data: booking, error } = await supabase
      .from('visit_bookings')
      .insert({
        client_id: user.id,
        listing_ids: listingIds,
        nb_listings: nbListings,
        amount_paid: amount,
        is_free: isFree,
        status: isFree ? 'paid' : 'pending_payment',
        payment_method: 'cinetpay',
      })
      .select()
      .single()

    if (error || !booking) {
      return NextResponse.json({ error: 'Erreur création booking' }, { status: 500 })
    }

    // Si visite gratuite, décrémenter et retourner
    if (isFree) {
      await supabase.rpc('decrement_free_visits', { user_id: user.id })
      return NextResponse.json({ bookingId: booking.id, status: 'paid', isFree: true })
    }

    // Initier le paiement CinetPay
    const cinetpayResult = await initiatePayment({
      amount,
      currency: 'XAF',
      phoneNumber,
      description: `Habynex — ${nbListings} visite(s) terrain`,
      transactionId: booking.id,
      customerName: profile?.full_name ?? undefined,
      customerEmail: profile?.email ?? user.email ?? undefined,
    })

    // Stocker le payment_token
    await supabase
      .from('visit_bookings')
      .update({ payment_ref: cinetpayResult.data.payment_token })
      .eq('id', booking.id)

    return NextResponse.json({
      bookingId: booking.id,
      paymentToken: cinetpayResult.data.payment_token,
      paymentUrl: cinetpayResult.data.payment_url,
      amount,
      status: 'pending_payment',
    })
  } catch (error: any) {
    console.error('CinetPay initiate error:', error)
    return NextResponse.json({ error: error.message ?? 'Erreur paiement' }, { status: 500 })
  }
}
