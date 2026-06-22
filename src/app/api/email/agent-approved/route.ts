import { NextRequest, NextResponse } from 'next/server'
import { sendAgentApprovedEmail } from '@/lib/email/resend'

// POST /api/email/agent-approved
// Appelé depuis le dashboard ADMIN après validation d'un agent
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.ADMIN_EMAIL_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { email, agentName } = await req.json()
    if (!email) return NextResponse.json({ ok: false }, { status: 400 })
    await sendAgentApprovedEmail(email, agentName ?? '')
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
