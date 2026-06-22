import { NextRequest, NextResponse } from 'next/server'
import { sendPushToUser } from '@/lib/push/sendToUser'

// POST /api/push/notify-user
// Route appelable depuis le dashboard ADMIN (projet séparé) pour déclencher
// une notification push à un utilisateur précis, sécurisée par secret partagé.
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.ADMIN_EMAIL_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { userId, type, title, message, url, requireInteraction } = await req.json()
    if (!userId || !title || !message) {
      return NextResponse.json({ ok: false, error: 'Champs manquants' }, { status: 400 })
    }

    const result = await sendPushToUser({
      userId, type: type ?? 'system', title, message,
      url: url ?? '/', requireInteraction: requireInteraction ?? false,
    })

    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    console.error('[push/notify-user] error:', err)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
