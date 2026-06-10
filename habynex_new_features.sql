-- ================================================================
-- HABYNEX — NOUVELLES FONCTIONNALITÉS
-- Exécuter dans Supabase SQL Editor
-- ================================================================

-- ── 1. AJOUTER AWAE dans les neighborhoods ───────────────────────
-- D'abord trouver l'id de la ville Yaoundé
DO $$
DECLARE
  v_city_id uuid;
BEGIN
  SELECT id INTO v_city_id FROM cities WHERE slug = 'yaounde' LIMIT 1;

  IF v_city_id IS NULL THEN
    RAISE NOTICE 'Ville Yaoundé non trouvée. Vérifiez le slug.';
    RETURN;
  END IF;

  -- Insérer Awae si non existant
  INSERT INTO neighborhoods (name, slug, city_id)
  VALUES ('Awae', 'awae', v_city_id)
  ON CONFLICT (slug) DO NOTHING;

  -- Ajouter les quartiers voisins d'Awae si non existants
  INSERT INTO neighborhoods (name, slug, city_id) VALUES
    ('Nkol-Eton', 'nkol-eton', v_city_id),
    ('Odza',      'odza',      v_city_id),
    ('Emana',     'emana',     v_city_id)
  ON CONFLICT (slug) DO NOTHING;

  RAISE NOTICE 'Awae et quartiers voisins ajoutés avec succès ✓';
END $$;

-- ── 2. TABLE agent_ratings — Notes des agents ────────────────────
CREATE TABLE IF NOT EXISTS agent_ratings (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  client_id   uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  booking_id  uuid UNIQUE,  -- Un avis par visite
  stars       int NOT NULL CHECK (stars BETWEEN 1 AND 5),
  comment     text,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

ALTER TABLE agent_ratings ENABLE ROW LEVEL SECURITY;

-- Tout le monde peut lire les avis
DROP POLICY IF EXISTS "agent_ratings_select_public" ON agent_ratings;
CREATE POLICY "agent_ratings_select_public"
  ON agent_ratings FOR SELECT USING (true);

-- Seul le client peut créer/modifier son avis
DROP POLICY IF EXISTS "agent_ratings_insert_own" ON agent_ratings;
CREATE POLICY "agent_ratings_insert_own"
  ON agent_ratings FOR INSERT
  WITH CHECK (auth.uid() = client_id);

DROP POLICY IF EXISTS "agent_ratings_update_own" ON agent_ratings;
CREATE POLICY "agent_ratings_update_own"
  ON agent_ratings FOR UPDATE
  USING (auth.uid() = client_id);

-- Vue agrégée des notes par agent
CREATE OR REPLACE VIEW agent_rating_summary AS
SELECT
  agent_id,
  COUNT(*)                    AS total_ratings,
  ROUND(AVG(stars)::numeric, 2) AS average_stars,
  COUNT(*) FILTER (WHERE stars = 5) AS stars_5,
  COUNT(*) FILTER (WHERE stars = 4) AS stars_4,
  COUNT(*) FILTER (WHERE stars = 3) AS stars_3,
  COUNT(*) FILTER (WHERE stars = 2) AS stars_2,
  COUNT(*) FILTER (WHERE stars = 1) AS stars_1
FROM agent_ratings
GROUP BY agent_id;

-- ── 3. TABLE agent_contracts — Contrats signés ───────────────────
CREATE TABLE IF NOT EXISTS agent_contracts (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id       uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  signature_data text,          -- Base64 PNG de la signature
  fingerprint    text,          -- Empreinte de l'appareil
  signed_at      timestamptz DEFAULT now(),
  ip_info        text,
  status         text DEFAULT 'signed' CHECK (status IN ('signed', 'revoked', 'expired')),
  created_at     timestamptz DEFAULT now()
);

ALTER TABLE agent_contracts ENABLE ROW LEVEL SECURITY;

-- L'agent voit son propre contrat, l'admin voit tout
DROP POLICY IF EXISTS "agent_contracts_select" ON agent_contracts;
CREATE POLICY "agent_contracts_select"
  ON agent_contracts FOR SELECT
  USING (
    auth.uid() = agent_id
    OR EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "agent_contracts_insert" ON agent_contracts;
CREATE POLICY "agent_contracts_insert"
  ON agent_contracts FOR INSERT
  WITH CHECK (auth.uid() = agent_id);

-- ── 4. COLONNE agent_id dans listings ────────────────────────────
ALTER TABLE listings ADD COLUMN IF NOT EXISTS agent_id uuid REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS rejection_reason text;

-- Mettre à jour le CHECK status pour inclure pending et rejected
ALTER TABLE listings DROP CONSTRAINT IF EXISTS listings_status_check;
ALTER TABLE listings ADD CONSTRAINT listings_status_check
  CHECK (status IN ('draft', 'pending', 'published', 'rejected', 'archived'));

-- Policy : agents peuvent insérer des listings en pending
DROP POLICY IF EXISTS "listings_insert_agent" ON listings;
CREATE POLICY "listings_insert_agent"
  ON listings FOR INSERT
  WITH CHECK (
    status = 'pending'
    AND auth.uid() = agent_id
    AND EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'agent'
    )
  );

-- ── 5. AJOUTER QUARTIERS À LA CARTE DES VOISINS ──────────────────
-- La table neighbors permet de définir quels quartiers sont proches
-- Pour ajouter un nouveau quartier plus tard :
-- 1. Insérer dans neighborhoods : INSERT INTO neighborhoods (name, slug, city_id) VALUES ('Nouveau Quartier', 'nouveau-quartier', 'id_ville')
-- 2. Ajouter dans NEIGHBORS dans ListingBlocks.tsx : 'nouveau-quartier': ['quartier-voisin-1', 'quartier-voisin-2']
-- Exemple commenté :
-- INSERT INTO neighborhoods (name, slug, city_id) VALUES ('Nouvelle Zone', 'nouvelle-zone', (SELECT id FROM cities WHERE slug='yaounde'))
-- ON CONFLICT (slug) DO NOTHING;

-- ── 6. INDEX pour performance ─────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_listings_neighborhood ON listings(neighborhood_id);
CREATE INDEX IF NOT EXISTS idx_listings_status ON listings(status);
CREATE INDEX IF NOT EXISTS idx_listings_type_transaction ON listings(type, transaction);
CREATE INDEX IF NOT EXISTS idx_listings_price ON listings(price);
CREATE INDEX IF NOT EXISTS idx_listings_agent ON listings(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_ratings_agent ON agent_ratings(agent_id);
CREATE INDEX IF NOT EXISTS idx_neighborhoods_slug ON neighborhoods(slug);

-- ── 7. VÉRIFICATION FINALE ────────────────────────────────────────
SELECT 'Awae ajouté :' AS info, COUNT(*) AS nb FROM neighborhoods WHERE slug = 'awae';
SELECT 'Tables créées :' AS info, tablename FROM pg_tables
  WHERE schemaname = 'public'
  AND tablename IN ('agent_ratings', 'agent_contracts');

SELECT 'Nouvelles fonctionnalités installées ✓' AS status;

-- ── PUSH NOTIFICATIONS ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint   text NOT NULL UNIQUE,
  p256dh     text NOT NULL,
  auth       text NOT NULL,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "push_own" ON push_subscriptions;
CREATE POLICY "push_own"
  ON push_subscriptions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_push_user ON push_subscriptions(user_id);

SELECT 'push_subscriptions créée ✓' AS status;

-- ── TABLE PUSH LOGS ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS push_logs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type            text NOT NULL,
  title           text NOT NULL,
  message         text,
  url             text,
  target_user_id  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  sent_count      int DEFAULT 0,
  failed_count    int DEFAULT 0,
  expired_count   int DEFAULT 0,
  created_at      timestamptz DEFAULT now()
);

ALTER TABLE push_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "push_logs_admin_only"
  ON push_logs FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

-- ── TABLE PUSH SUBSCRIPTIONS ──────────────────────────────────
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint    text NOT NULL UNIQUE,
  p256dh      text NOT NULL,
  auth        text NOT NULL,
  user_agent  text,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "push_subscriptions_own" ON push_subscriptions;
CREATE POLICY "push_subscriptions_own"
  ON push_subscriptions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_push_subs_user ON push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_logs_type ON push_logs(type);
CREATE INDEX IF NOT EXISTS idx_push_logs_date ON push_logs(created_at DESC);

SELECT 'Tables push créées ✓' AS status;

-- ── TRIGGERS NOTIFICATIONS ──────────────────────────────────────

-- 1. Trigger: Notifier le propriétaire quand une annonce est publiée
CREATE OR REPLACE FUNCTION notify_listing_published()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.status = 'published' AND OLD.status = 'pending' AND NEW.agent_id IS NOT NULL THEN
    -- Notifier l'agent que son annonce est approuvée
    PERFORM net.http_post(
      url := current_setting('app.supabase_url') || '/functions/v1/handle-events',
      headers := json_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || current_setting('app.service_role_key'))::text,
      body := json_build_object(
        'type', 'booking',
        'record', json_build_object('title', NEW.title, 'slug', NEW.slug, 'id', NEW.id),
        'user_ids', ARRAY[NEW.agent_id::text]
      )::text
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_listing_published ON listings;
CREATE TRIGGER on_listing_published
  AFTER UPDATE OF status ON listings
  FOR EACH ROW
  WHEN (NEW.status = 'published' AND OLD.status != 'published')
  EXECUTE FUNCTION notify_listing_published();

-- 2. Trigger: Notifier quand un message est reçu
CREATE OR REPLACE FUNCTION notify_new_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_recipient_id uuid;
BEGIN
  -- Récupérer l'autre participant de la conversation
  SELECT CASE 
    WHEN participant1_id = NEW.sender_id THEN participant2_id 
    ELSE participant1_id 
  END INTO v_recipient_id
  FROM conversations WHERE id = NEW.conversation_id;

  IF v_recipient_id IS NOT NULL THEN
    PERFORM net.http_post(
      url := current_setting('app.supabase_url') || '/functions/v1/handle-events',
      headers := json_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || current_setting('app.service_role_key'))::text,
      body := json_build_object(
        'type', 'message',
        'record', json_build_object('sender', 'Habynex', 'message', LEFT(NEW.content, 80)),
        'user_ids', ARRAY[v_recipient_id::text]
      )::text
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_new_message ON messages;
CREATE TRIGGER on_new_message
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_message();

-- 3. Trigger: Notifier quand une visite est réservée
CREATE OR REPLACE FUNCTION notify_booking_created()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_title text;
BEGIN
  SELECT title INTO v_title FROM listings WHERE id = NEW.listing_id;
  
  PERFORM net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/handle-events',
    headers := json_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || current_setting('app.service_role_key'))::text,
    body := json_build_object(
      'type', 'booking',
      'record', json_build_object('title', v_title),
      'user_ids', ARRAY[NEW.client_id::text]
    )::text
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_booking_created ON visit_bookings;
CREATE TRIGGER on_booking_created
  AFTER INSERT ON visit_bookings
  FOR EACH ROW
  EXECUTE FUNCTION notify_booking_created();

-- ── TABLE view_milestone_notifications ──────────────────────────
CREATE TABLE IF NOT EXISTS view_milestone_notifications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id  uuid REFERENCES listings(id) ON DELETE CASCADE,
  owner_id    uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  milestone   int NOT NULL,
  view_count  int,
  channels    text[],
  sent_at     timestamptz DEFAULT now(),
  UNIQUE(listing_id, milestone)
);

-- ── CRON JOBS (pg_cron) ─────────────────────────────────────────
-- Activer l'extension pg_cron si pas encore fait
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Job 1: Property matching — toutes les heures
SELECT cron.schedule(
  'habynex-property-matching',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/property-matching',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer ' || current_setting('app.service_role_key') || '"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
) ON CONFLICT (jobname) DO UPDATE SET schedule = '0 * * * *';

-- Job 2: High views check — toutes les 6 heures
SELECT cron.schedule(
  'habynex-high-views',
  '0 */6 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/high-views',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer ' || current_setting('app.service_role_key') || '"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
) ON CONFLICT (jobname) DO UPDATE SET schedule = '0 */6 * * *';

-- Job 3: Reengagement — tous les dimanches à 10h
SELECT cron.schedule(
  'habynex-reengagement',
  '0 10 * * 0',
  $$
  SELECT net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/reengagement',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer ' || current_setting('app.service_role_key') || '"}'::jsonb,
    body := '{"inactive_days": 7}'::jsonb
  );
  $$
) ON CONFLICT (jobname) DO UPDATE SET schedule = '0 10 * * 0';

SELECT 'Triggers, tables et crons créés ✓' AS status;

-- ── HIGH VIEWS : colonne pour tracer les seuils déjà notifiés ────────────────
ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS notified_view_thresholds integer[] DEFAULT '{}';

COMMENT ON COLUMN listings.notified_view_thresholds IS
  'Seuils de vues déjà notifiés à l''agent (ex: [50, 100]). Géré par high-views Edge Function.';

CREATE INDEX IF NOT EXISTS idx_listings_high_views
  ON listings (status, views_count)
  WHERE status = 'published';

SELECT 'Migration high-views ✓' AS status;
