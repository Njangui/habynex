import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { z } from 'zod'

// ================================================================
// Paiement manuel — MTN MoMo / Orange Money
// Remplace CinetPay pendant la phase de test (sans entreprise enregistrée)
//
// Flux :
//   1. Client paie sur le numéro MoMo de l'admin
//   2. Client soumet sa référence de transaction ici
//   3. Booking créé avec status 'pending_verification'
//   4. Admin reçoit une notif et confirme/rejette dans le dashboard
// ================================================================

const schema = z.object({
  listingIds:     z.array(z.string().uuid()).min(1).max(3),
  transactionRef: z.string().min(3).max(50),
  operator:       z.enum(['mtn', 'orange']),
  isFree:         z.boolean().optional().default(false),
})

const PRICES: Record<number, number> = { 1: 3000, 2: 5000, 3: 7000 }
const ADMIN_URL = process.env.NEXT_PUBLIC_ADMIN_URL ?? 'https://admin.habynex.com'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const { listingIds, transactionRef, operator, isFree } = parsed.data
    const nbListings = listingIds.length
    const amount = isFree ? 0 : (PRICES[nbListings] ?? 7000)

    // ── Vérifier solde visites gratuites ──────────────────────────
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

    // ── Créer le booking ──────────────────────────────────────────
    const { data: booking, error: bookingError } = await supabase
      .from('visit_bookings')
      .insert({
        client_id:      user.id,
        listing_ids:    listingIds,
        nb_listings:    nbListings,
        amount_paid:    amount,
        is_free:        isFree,
        // Visite gratuite → directement payée, sinon en attente de vérification
        status:         isFree ? 'paid' : 'pending_verification',
        payment_method: isFree ? 'free' : operator,   // 'mtn' | 'orange' | 'free'
        payment_ref:    isFree ? null : transactionRef,
      })
      .select('id, client_id, nb_listings')
      .single()

    if (bookingError || !booking) {
      console.error('Booking insert error:', bookingError)
      return NextResponse.json({ error: 'Erreur lors de la création de la réservation' }, { status: 500 })
    }

    // ── Visite gratuite : décrémenter + notifier client ──────────
    if (isFree) {
      await supabase.rpc('decrement_free_visits', { user_id: user.id })

      await supabase.from('notifications').insert({
        user_id:    user.id,
        title:      '✅ Visite confirmée !',
        body:       `Votre réservation de ${nbListings} visite(s) est confirmée. Un agent va vous être assigné.`,
        action_url: '/profil?tab=visites',
        channel:    'in_app',
      })

      return NextResponse.json({ bookingId: booking.id, status: 'paid', isFree: true })
    }

    // ── Paiement manuel : notifier tous les admins ────────────────
    const adminSupabase = createAdminClient()
    const { data: admins } = await adminSupabase
      .from('user_roles')
      .select('user_id')
      .in('role', ['admin', 'super_admin'])

    if (admins?.length) {
      await adminSupabase.from('notifications').insert(
        admins.map((a: { user_id: string }) => ({
          user_id:    a.user_id,
          title:      '💳 Paiement à vérifier',
          body:       `${nbListings} visite(s) · Réf: ${transactionRef} (${operator.toUpperCase()}) · ${amount.toLocaleString('fr-FR')} FCFA`,
          action_url: `${ADMIN_URL}/reservations`,
          channel:    'in_app',
        }))
      )
    }

    return NextResponse.json({
      bookingId: booking.id,
      status:    'pending_verification',
      amount,
    })

  } catch (error: any) {
    console.error('Manual payment submit error:', error)
    return NextResponse.json({ error: error.message ?? 'Erreur serveur' }, { status: 500 })
  }
}