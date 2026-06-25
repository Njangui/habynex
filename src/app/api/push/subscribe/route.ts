import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const { userId, endpoint, p256dh, auth } = await req.json()
    if (!userId || !endpoint) return NextResponse.json({ error: 'Params manquants' }, { status: 400 })
    const supabase = createAdminClient()
    const { error } = await supabase.from('push_subscriptions').upsert(
      { user_id: userId, endpoint, p256dh, auth, user_agent: req.headers.get('user-agent')?.slice(0, 200) },
      { onConflict: 'endpoint' }
    )
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { endpoint } = await req.json()
    const supabase = createAdminClient()
    await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint)
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
