import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      visitor_id, user_id, path, referrer,
      user_agent, device_type,
      utm_source, utm_medium, utm_campaign,
    } = body ?? {}

    if (!visitor_id || !path) {
      return NextResponse.json({ error: 'visitor_id et path requis' }, { status: 400 })
    }

    // Géoloc IP via headers Vercel (présents en production)
    const country = req.headers.get('x-vercel-ip-country')
      ?? req.headers.get('cf-ipcountry')
      ?? null
    const city = req.headers.get('x-vercel-ip-city')
      ? decodeURIComponent(req.headers.get('x-vercel-ip-city')!)
      : null

    const supabase = createAdminClient()

    // Si la page est une fiche annonce (/bien/[slug]), on résout l'id
    let listing_id: string | null = null
    const bienMatch = typeof path === 'string' ? path.match(/^\/bien\/([^/?#]+)/) : null
    if (bienMatch) {
      const { data: listing } = await supabase
        .from('listings')
        .select('id')
        .eq('slug', bienMatch[1])
        .maybeSingle()
      listing_id = listing?.id ?? null
    }

    const { error } = await supabase.from('site_visits').insert({
      visitor_id,
      user_id: user_id || null,
      path,
      listing_id,
      referrer: referrer || null,
      user_agent: user_agent || null,
      device_type: device_type || null,
      country,
      city,
      utm_source: utm_source || null,
      utm_medium: utm_medium || null,
      utm_campaign: utm_campaign || null,
    })

    if (error) {
      console.error('Erreur insertion site_visits:', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('Erreur /api/track-visit:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}