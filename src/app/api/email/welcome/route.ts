import { NextRequest, NextResponse } from 'next/server'
import { sendWelcomeEmail } from '@/lib/email/resend'

// POST /api/email/welcome
// Appelé côté client juste après une inscription réussie (fire-and-forget)
export async function POST(req: NextRequest) {
  try {
    const { email, fullName } = await req.json()
    if (!email) return NextResponse.json({ ok: false }, { status: 400 })
    await sendWelcomeEmail(email, fullName ?? '')
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false })
  }
}
