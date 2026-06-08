import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

// Route API pour vérifier un code de parrainage
// Utilise le client admin (bypass RLS) — un non-connecté peut vérifier un code
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')

  if (!code || code.trim().length === 0) {
    return NextResponse.json({ valid: false, error: 'Code manquant' }, { status: 400 })
  }

  try {
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('referral_code', code.trim().toUpperCase())
      .maybeSingle()

    if (error) {
      return NextResponse.json({ valid: false, error: 'Erreur serveur' }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ valid: false, error: 'Code invalide' }, { status: 404 })
    }

    return NextResponse.json({ valid: true, referrerId: data.id })
  } catch {
    return NextResponse.json({ valid: false, error: 'Erreur serveur' }, { status: 500 })
  }
}
