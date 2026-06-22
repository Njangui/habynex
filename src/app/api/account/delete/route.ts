import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import { sendAccountDeletionEmail } from '@/lib/email/resend'

// POST /api/account/delete
// Suppression définitive du compte de l'utilisateur connecté.
// Vérifie la session côté serveur avant toute suppression.
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const adminClient = createAdminClient()

    // Récupérer infos pour l'email avant suppression
    const { data: profile } = await adminClient
      .from('profiles').select('full_name').eq('id', user.id).single()

    const email = user.email
    const fullName = profile?.full_name ?? ''

    // Vérifier s'il a des annonces publiées en cours (à gérer avant suppression)
    const { count: activeListings } = await adminClient
      .from('listings')
      .select('id', { count: 'exact', head: true })
      .eq('submitted_by_agent', user.id)
      .eq('status', 'published')

    if (activeListings && activeListings > 0) {
      return NextResponse.json({
        error: `Vous avez ${activeListings} annonce(s) publiée(s). Contactez le support pour les transférer avant de supprimer votre compte.`,
      }, { status: 400 })
    }

    // ── Suppression en cascade des données personnelles ──────────────
    // Les FK avec ON DELETE CASCADE s'occupent de la plupart des tables
    // (messages, conversations, favorites, ratings, etc.)
    // On nettoie explicitement ce qui n'a pas de cascade automatique :

    await adminClient.from('push_subscriptions').delete().eq('user_id', user.id)
    await adminClient.from('notifications').delete().eq('user_id', user.id)

    // Anonymiser plutôt que supprimer les avis (garde l'intégrité des données)
    await adminClient
      .from('listing_ratings')
      .update({ comment: null })
      .eq('user_id', user.id)

    // Supprimer le profil
    await adminClient.from('profiles').delete().eq('id', user.id)

    // Supprimer le compte Auth (déclenche les cascades restantes)
    const { error: authError } = await adminClient.auth.admin.deleteUser(user.id)
    if (authError) {
      console.error('[account/delete] Auth deletion error:', authError)
      return NextResponse.json({ error: 'Erreur lors de la suppression du compte' }, { status: 500 })
    }

    // Email de confirmation — fire-and-forget
    if (email) {
      sendAccountDeletionEmail(email, fullName).catch(() => {})
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[account/delete] error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
