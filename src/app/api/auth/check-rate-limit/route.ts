import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

// POST /api/auth/check-rate-limit
// Vérifie et enregistre les tentatives de connexion/inscription par IP.
// Bloque après 8 tentatives échouées en 15 minutes.
//
// Appelé AVANT signInWithPassword / signUp côté client.
// Table requise : auth_attempts (voir migration_all.sql)

const MAX_ATTEMPTS = 8
const WINDOW_MINUTES = 15

export async function POST(req: NextRequest) {
  try {
    const { identifier, action } = await req.json()
    // identifier = email ou IP, action = 'login' | 'register'
    if (!identifier) return NextResponse.json({ allowed: true })

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      ?? req.headers.get('x-real-ip')
      ?? 'unknown'

    const supabase = createAdminClient()
    const windowStart = new Date(Date.now() - WINDOW_MINUTES * 60000).toISOString()

    // Compter les tentatives récentes pour cet email OU cette IP
    const { count } = await supabase
      .from('auth_attempts')
      .select('id', { count: 'exact', head: true })
      .or(`identifier.eq.${identifier},ip_address.eq.${ip}`)
      .eq('action', action ?? 'login')
      .gte('created_at', windowStart)

    const blocked = (count ?? 0) >= MAX_ATTEMPTS

    if (blocked) {
      return NextResponse.json({
        allowed: false,
        error: `Trop de tentatives. Réessayez dans ${WINDOW_MINUTES} minutes.`,
      }, { status: 429 })
    }

    // Enregistrer cette tentative
    await supabase.from('auth_attempts').insert({
      identifier,
      ip_address: ip,
      action: action ?? 'login',
    })

    return NextResponse.json({ allowed: true })
  } catch (err) {
    // Ne jamais bloquer un login légitime en cas d'erreur du rate limiter
    console.error('[check-rate-limit] error:', err)
    return NextResponse.json({ allowed: true })
  }
}
