-- ================================================================
-- Correctif : rendre atomiques decrement_free_visits / increment_free_visits
-- Objectif : éliminer la race condition où deux requêtes concurrentes
-- passent toutes les deux le contrôle "balance >= 1" avant qu'une seule
-- décrémentation n'ait eu lieu (TOCTOU : check côté API puis update séparé).
--
-- Avec ces fonctions, tout se passe en UNE seule instruction atomique
-- côté base de données : impossible de décrémenter sous 0.
-- ================================================================

-- ─── Décrémenter (consommer une visite gratuite) ──────────────────
CREATE OR REPLACE FUNCTION decrement_free_visits(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated boolean;
BEGIN
  UPDATE profiles
  SET free_visits_balance = free_visits_balance - 1
  WHERE id = user_id
    AND free_visits_balance >= 1
  RETURNING true INTO v_updated;

  -- Si aucune ligne n'a été mise à jour (solde déjà à 0), on échoue proprement
  IF v_updated IS NOT TRUE THEN
    RAISE EXCEPTION 'Aucune visite gratuite disponible pour cet utilisateur';
  END IF;

  RETURN true;
END;
$$;

-- ─── Incrémenter (parrainage validé / remboursement d'une visite gratuite) ──
CREATE OR REPLACE FUNCTION increment_free_visits(user_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE profiles
  SET free_visits_balance = COALESCE(free_visits_balance, 0) + 1
  WHERE id = user_id;
$$;

-- Note : ces fonctions sont SECURITY DEFINER pour pouvoir être appelées
-- via supabase.rpc() depuis l'API (clé utilisateur), tout en modifiant
-- une colonne que les policies RLS normales du client n'autorisent
-- pas à modifier directement.

-- ================================================================
-- Traçabilité des remboursements
-- Avant : un remboursement ne laissait aucune trace de qui l'a fait
-- ni quand. On ajoute deux colonnes pour l'auditabilité.
-- ================================================================
ALTER TABLE visit_bookings
  ADD COLUMN IF NOT EXISTS refunded_at timestamptz,
  ADD COLUMN IF NOT EXISTS refunded_by uuid REFERENCES profiles(id);

