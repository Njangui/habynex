-- ================================================================
-- MIGRATION COMPLÈTE — Tous les nouveaux points
-- À exécuter dans Supabase SQL Editor
-- ================================================================

-- ── 1. Réduction sur une annonce ──────────────────────────────────
ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS original_price numeric(12,0),
  ADD COLUMN IF NOT EXISTS expires_at     timestamptz;

COMMENT ON COLUMN listings.original_price IS
  'Prix avant réduction — si renseigné, badge % affiché sur la carte';
COMMENT ON COLUMN listings.expires_at IS
  'Date d expiration de l annonce — déclenche le CountdownOffer';

-- ── 2. Notations d'un bien ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS listing_ratings (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id   uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  overall      smallint NOT NULL CHECK (overall BETWEEN 1 AND 5),
  location     smallint CHECK (location BETWEEN 1 AND 5),
  value        smallint CHECK (value BETWEEN 1 AND 5),
  accuracy     smallint CHECK (accuracy BETWEEN 1 AND 5),
  cleanliness  smallint CHECK (cleanliness BETWEEN 1 AND 5),
  comment      text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE(listing_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_listing_ratings_listing
  ON listing_ratings(listing_id);

ALTER TABLE listing_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ratings_select_all" ON listing_ratings
  FOR SELECT USING (true);

CREATE POLICY "ratings_insert_auth" ON listing_ratings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "ratings_update_own" ON listing_ratings
  FOR UPDATE USING (auth.uid() = user_id);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION set_updated_at_generic()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_listing_ratings_updated ON listing_ratings;
CREATE TRIGGER trg_listing_ratings_updated
  BEFORE UPDATE ON listing_ratings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at_generic();

-- ── 3. Tracking visiteurs anonymes ────────────────────────────────
CREATE TABLE IF NOT EXISTS visitor_sessions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id      text NOT NULL,         -- cookie hbx_vid
  ip_address      text,
  country         text,
  city            text,
  device_type     text NOT NULL DEFAULT 'desktop'
                    CHECK (device_type IN ('desktop','mobile','tablet')),
  browser         text,
  os              text,
  referrer        text,
  landing_page    text,
  pages_visited   text[] NOT NULL DEFAULT '{}',
  session_duration integer,              -- secondes
  is_registered   boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now(),
  last_active_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_visitor_sessions_visitor
  ON visitor_sessions(visitor_id);
CREATE INDEX IF NOT EXISTS idx_visitor_sessions_created
  ON visitor_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_visitor_sessions_last_active
  ON visitor_sessions(last_active_at DESC);

-- RLS : seuls les admins voient les sessions
ALTER TABLE visitor_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "visitor_sessions_admin_select" ON visitor_sessions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('admin','super_admin')
    )
  );

-- Insertion sans auth (service role côté API)
CREATE POLICY "visitor_sessions_service_insert" ON visitor_sessions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "visitor_sessions_service_update" ON visitor_sessions
  FOR UPDATE USING (true);

-- ── 4. Réservations multi-biens ───────────────────────────────────
-- Ajouter colonne listing_ids sur visit_bookings (array de plusieurs biens)
ALTER TABLE visit_bookings
  ADD COLUMN IF NOT EXISTS listing_ids uuid[] DEFAULT '{}';

COMMENT ON COLUMN visit_bookings.listing_ids IS
  'IDs des biens à visiter dans cette réservation groupée (max 3)';

-- Vue pratique pour requêter les réservations avec les biens
CREATE OR REPLACE VIEW visit_bookings_with_listings AS
SELECT
  vb.*,
  (
    SELECT json_agg(json_build_object(
      'id', l.id,
      'title', l.title,
      'slug', l.slug,
      'price', l.price,
      'type', l.type,
      'transaction', l.transaction
    ))
    FROM listings l
    WHERE l.id = ANY(vb.listing_ids)
  ) AS listings_detail
FROM visit_bookings vb;

-- ── 5. API route tracking (colonne last_seen sur profiles) ─────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS last_seen timestamptz;

-- ── 6. Modification d'annonce — colonne modification_history ───────
ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS modification_history jsonb DEFAULT '[]';

COMMENT ON COLUMN listings.modification_history IS
  'Historique des modifications : [{date, by, role, reason}]';

-- ── 7. Realtime sur visitor_sessions (optionnel, pour dashboard live)
-- ALTER PUBLICATION supabase_realtime ADD TABLE visitor_sessions;

-- ── Fin migration ──────────────────────────────────────────────────


-- ================================================================
-- FULL-TEXT SEARCH — Colonne générée + Index GIN
-- ================================================================

-- 1. Colonne générée fts (combinaison titre + description + adresse)
ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS fts tsvector
  GENERATED ALWAYS AS (
    to_tsvector(
      'french',
      coalesce(title, '') || ' ' ||
      coalesce(description, '') || ' ' ||
      coalesce(address_hint, '') || ' ' ||
      coalesce(owner_name, '')
    )
  ) STORED;

-- 2. Index GIN pour les recherches rapides
CREATE INDEX IF NOT EXISTS idx_listings_fts
  ON listings USING gin(fts);

-- Vérification : SELECT title FROM listings WHERE fts @@ websearch_to_tsquery('french', 'studio simbock');

-- ================================================================
-- OPEN GRAPH — vercel analytics (rien à faire en SQL)
-- ================================================================


-- ================================================================
-- VIRTUAL TOUR — Table visites 360°
-- ================================================================
CREATE TABLE IF NOT EXISTS virtual_tours (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id  uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  scenes      jsonb NOT NULL DEFAULT '[]',
  -- Format : [{ "id": "salon", "label": "Salon", "image_url": "https://...", "initial_yaw": 0 }]
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(listing_id)
);

CREATE INDEX IF NOT EXISTS idx_virtual_tours_listing ON virtual_tours(listing_id);

ALTER TABLE virtual_tours ENABLE ROW LEVEL SECURITY;

CREATE POLICY "virtual_tours_select_all" ON virtual_tours
  FOR SELECT USING (true);

CREATE POLICY "virtual_tours_admin_write" ON virtual_tours
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin','super_admin'))
  );

-- ================================================================
-- RATE LIMITING AUTH — Table tentatives de connexion/inscription
-- ================================================================
CREATE TABLE IF NOT EXISTS auth_attempts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier  text NOT NULL,       -- email tenté
  ip_address  text,
  action      text NOT NULL DEFAULT 'login', -- 'login' | 'register'
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auth_attempts_identifier ON auth_attempts(identifier, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auth_attempts_ip ON auth_attempts(ip_address, created_at DESC);

-- Nettoyage auto des tentatives anciennes (> 1h) — à exécuter via cron périodique
-- DELETE FROM auth_attempts WHERE created_at < now() - interval '1 hour';

ALTER TABLE auth_attempts ENABLE ROW LEVEL SECURITY;

-- Insertion libre (la route API utilise le service role pour bypasser RLS)
CREATE POLICY "auth_attempts_service_only" ON auth_attempts
  FOR ALL USING (false) WITH CHECK (false);
-- Note : seule la route API avec createAdminClient() (service_role) peut écrire ici.

-- ================================================================
-- SUPPRESSION COMPTE — Vérifier les cascades existantes
-- ================================================================
-- Vérifiez que ces FK ont bien ON DELETE CASCADE vers profiles(id) ou auth.users(id) :
--   conversations.client_id, messages.sender_id, favorites.user_id,
--   listing_ratings.user_id, push_subscriptions.user_id, notifications.user_id
-- Si ce n'est pas le cas, ajoutez :
-- ALTER TABLE favorites DROP CONSTRAINT IF EXISTS favorites_user_id_fkey,
--   ADD CONSTRAINT favorites_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
