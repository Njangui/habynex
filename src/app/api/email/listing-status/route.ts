import { NextRequest, NextResponse } from 'next/server'
import { sendListingPublishedEmail, sendListingRejectedEmail } from '@/lib/email/resend'

// POST /api/email/listing-status
// Appelé depuis le dashboard ADMIN après validation/rejet d'une annonce
// Sécurisé par un secret partagé entre les deux projets Vercel
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.ADMIN_EMAIL_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { type, email, agentName, listingTitle, listingSlug, reason } = await req.json()
    if (!email) return NextResponse.json({ ok: false }, { status: 400 })

    if (type === 'published') {
      await sendListingPublishedEmail(email, agentName ?? '', listingTitle ?? '', listingSlug ?? '')
    } else if (type === 'rejected') {
      await sendListingRejectedEmail(email, agentName ?? '', listingTitle ?? '', reason ?? 'Non précisée')
    } else {
      return NextResponse.json({ error: 'type invalide' }, { status: 400 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[email/listing-status] error:', err)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
