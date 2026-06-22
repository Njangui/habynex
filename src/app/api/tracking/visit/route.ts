import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const { visitorId, pathname, userAgent, referrer, ip } = await req.json()
    if (!visitorId) return NextResponse.json({ ok: false })

    const supabase = createAdminClient()

    const ua = (userAgent ?? '').toLowerCase()
    const deviceType = /tablet|ipad/.test(ua) ? 'tablet'
      : /mobile|android|iphone/.test(ua) ? 'mobile' : 'desktop'
    const browser = /edg/.test(ua) ? 'Edge'
      : /chrome/.test(ua) ? 'Chrome'
      : /firefox/.test(ua) ? 'Firefox'
      : /safari/.test(ua) ? 'Safari' : 'Autre'

    // Session active = dernière activité < 30 minutes
    const thirtyMinAgo = new Date(Date.now() - 30 * 60000).toISOString()
    const { data: existing } = await supabase
      .from('visitor_sessions')
      .select('id, pages_visited, created_at')
      .eq('visitor_id', visitorId)
      .gt('last_active_at', thirtyMinAgo)
      .order('last_active_at', { ascending: false })
      .limit(1)
      .single()

    if (existing) {
      const pages = [...new Set([...(existing.pages_visited ?? []), pathname])]
      const duration = Math.floor((Date.now() - new Date((existing as any).created_at).getTime()) / 1000)
      await supabase.from('visitor_sessions').update({
        pages_visited: pages,
        last_active_at: new Date().toISOString(),
        session_duration: duration,
      }).eq('id', existing.id)
    } else {
      const cleanIp = (ip ?? '').split(',')[0].trim().slice(0, 45)
      await supabase.from('visitor_sessions').insert({
        visitor_id: visitorId,
        ip_address: cleanIp || null,
        device_type: deviceType,
        browser,
        referrer: referrer || null,
        landing_page: pathname,
        pages_visited: [pathname],
        is_registered: false,
        last_active_at: new Date().toISOString(),
      })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    // Silencieux — le tracking ne doit jamais bloquer l'utilisateur
    return NextResponse.json({ ok: false })
  }
}
