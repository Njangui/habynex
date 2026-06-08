import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

// Après inscription : lie le filleul à son parrain en mettant à jour profiles.referred_by
// Utilise le service_role pour bypasser RLS (le user vient de se créer, pas encore de session)
export async function POST(req: NextRequest) {
  try {
    const { userId, referrerId } = await req.json()

    if (!userId || !referrerId) {
      return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // 1. Mettre à jour le profil du filleul avec referred_by
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ referred_by: referrerId })
      .eq('id', userId)
      .is('referred_by', null) // Seulement si pas déjà rempli

    if (profileError) {
      console.error('profile update error:', profileError)
      return NextResponse.json({ error: 'Erreur mise à jour profil' }, { status: 500 })
    }

    // 2. Insérer dans la table referrals (si elle existe)
    await supabase
      .from('referrals')
      .upsert(
        { referrer_id: referrerId, referred_id: userId },
        { onConflict: 'referred_id', ignoreDuplicates: true }
      )

    // 3. Vérifier si le parrain a atteint un multiple de 5 filleuls → visite gratuite
    const { count } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('referred_by', referrerId)

    if (count && count % 5 === 0) {
      // Incrémenter le solde de visites gratuites du parrain
      await supabase.rpc('increment_free_visits', { user_id: referrerId })
    }

    return NextResponse.json({ success: true, totalFilleuls: count })
  } catch (err) {
    console.error('referral link error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
