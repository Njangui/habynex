import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { initiatePayment, getBookingPrice } from '@/lib/payments/campay'
import { z } from 'zod'

const schema = z.object({
  listingIds: z.array(z.string().uuid()).min(1).max(3),
  phoneNumber: z.string().regex(/^237[0-9]{9}$/, 'Format: 237XXXXXXXXX'),
  operator: z.enum(['mtn', 'orange']),
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

    const { listingIds, phoneNumber, operator, isFree } = parsed.data
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
        payment_method: operator,
      })
      .select()
      .single()

    if (error || !booking) {
      return NextResponse.json({ error: 'Erreur création booking' }, { status: 500 })
    }

    // Si visite gratuite, décrémenter le solde et retourner
    if (isFree) {
      await supabase
        .from('profiles')
        .update({ free_visits_balance: supabase.rpc('free_visits_balance - 1') as any })
        .eq('id', user.id)

      return NextResponse.json({ bookingId: booking.id, status: 'paid', isFree: true })
    }

    // Initier le paiement Campay
    const campayResult = await initiatePayment({
      amount,
      currency: 'XAF',
      from: phoneNumber,
      description: `Habynex — ${nbListings} visite(s) terrain`,
      external_reference: booking.id,
    })

    // Mettre à jour avec la référence Campay
    await supabase
      .from('visit_bookings')
      .update({ payment_ref: campayResult.reference })
      .eq('id', booking.id)

    return NextResponse.json({
      bookingId: booking.id,
      reference: campayResult.reference,
      ussdCode: campayResult.ussd_code,
      amount,
      status: 'pending_payment',
    })
  } catch (error) {
    console.error('Payment initiate error:', error)
    return NextResponse.json({ error: 'Erreur paiement' }, { status: 500 })
  }
}
