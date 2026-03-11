-- ============================================================
-- HABYNEX NOTIFICATION SYSTEM - TRIGGERS WEBHOOK
-- ============================================================

-- Configuration: Remplacez par votre vraie URL et clé
-- Note: La clé service_role_key doit être définie dans les variables d'environnement Supabase

-- ============================================================
-- 1. FONCTIONS DE WEBHOOK GÉNÉRIQUES
-- ============================================================

-- Fonction générique pour envoyer des webhooks
CREATE OR REPLACE FUNCTION notify_webhook(event_type text, record_data jsonb)
RETURNS void AS $$
DECLARE
  supabase_url text;
  service_key text;
BEGIN
  -- Récupérer les paramètres
  BEGIN
    supabase_url := current_setting('app.settings.supabase_url');
  EXCEPTION WHEN OTHERS THEN
    supabase_url := 'https://votre-projet.supabase.co';
  END;
  
  -- La clé doit être dans les variables d'environnement, pas en dur
  service_key := current_setting('app.settings.service_role_key', true);
  
  IF service_key IS NULL OR service_key = '' THEN
    RAISE WARNING 'Service role key not configured';
    RETURN;
  END IF;

  -- Envoyer le webhook
  PERFORM net.http_post(
    url := supabase_url || '/functions/v1/handle-events',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_key
    ),
    body := jsonb_build_object(
      'type', event_type,
      'record', record_data
    )
  );
EXCEPTION WHEN OTHERS THEN
  -- Log l'erreur mais ne pas bloquer la transaction
  RAISE WARNING 'Webhook failed for %: %', event_type, SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 2. TRIGGERS POUR MESSAGES
-- ============================================================

-- Nouveau message
CREATE OR REPLACE FUNCTION trigger_new_message()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM notify_webhook('new_message', row_to_json(NEW)::jsonb);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_new_message ON messages;
CREATE TRIGGER on_new_message
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION trigger_new_message();

-- ============================================================
-- 3. TRIGGERS POUR DEMANDES DE VISITE/INQUIRIES
-- ============================================================

-- Nouvelle demande de visite
CREATE OR REPLACE FUNCTION trigger_new_inquiry()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM notify_webhook('new_inquiry', row_to_json(NEW)::jsonb);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_new_inquiry ON property_inquiries;
CREATE TRIGGER on_new_inquiry
  AFTER INSERT ON property_inquiries
  FOR EACH ROW
  EXECUTE FUNCTION trigger_new_inquiry();

-- ============================================================
-- 4. TRIGGERS POUR PROPRIÉTÉS
-- ============================================================

-- Nouvelle propriété publiée
CREATE OR REPLACE FUNCTION trigger_new_property()
RETURNS TRIGGER AS $$
BEGIN
  -- Ne notifier que si la propriété est publiée et disponible
  IF NEW.is_published = true AND NEW.is_available = true THEN
    PERFORM notify_webhook('new_property', row_to_json(NEW)::jsonb);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_new_property ON properties;
CREATE TRIGGER on_new_property
  AFTER INSERT ON properties
  FOR EACH ROW
  EXECUTE FUNCTION trigger_new_property();

-- Propriété mise à jour (prix, disponibilité)
CREATE OR REPLACE FUNCTION trigger_property_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Notifier si le prix a baissé
  IF OLD.price > NEW.price AND NEW.is_published = true THEN
    PERFORM notify_webhook('price_drop', jsonb_build_object(
      'id', NEW.id,
      'title', NEW.title,
      'old_price', OLD.price,
      'new_price', NEW.price,
      'city', NEW.city,
      'neighborhood', NEW.neighborhood,
      'owner_id', NEW.owner_id,
      'images', NEW.images
    ));
  END IF;
  
  -- Notifier si la propriété est de nouveau disponible
  IF OLD.is_available = false AND NEW.is_available = true AND NEW.is_published = true THEN
    PERFORM notify_webhook('new_property', row_to_json(NEW)::jsonb);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_property_update ON properties;
CREATE TRIGGER on_property_update
  AFTER UPDATE ON properties
  FOR EACH ROW
  EXECUTE FUNCTION trigger_property_update();

-- ============================================================
-- 5. TRIGGERS POUR AVIS/REVIEWS
-- ============================================================

-- Nouvel avis
CREATE OR REPLACE FUNCTION trigger_new_review()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM notify_webhook('new_review', row_to_json(NEW)::jsonb);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_new_review ON reviews;
CREATE TRIGGER on_new_review
  AFTER INSERT ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION trigger_new_review();

-- ============================================================
-- 6. TRIGGERS POUR VÉRIFICATIONS
-- ============================================================

-- Mise à jour de la vérification d'identité
CREATE OR REPLACE FUNCTION trigger_verification_update()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.level_2_status IS DISTINCT FROM NEW.level_2_status THEN
    PERFORM notify_webhook('verification_update', row_to_json(NEW)::jsonb);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_verification_update ON profiles;
CREATE TRIGGER on_verification_update
  AFTER UPDATE ON profiles
  FOR EACH ROW
  WHEN (OLD.level_2_status IS DISTINCT FROM NEW.level_2_status)
  EXECUTE FUNCTION trigger_verification_update();

-- Compte vérifié (level_2_status = approved)
CREATE OR REPLACE FUNCTION trigger_account_verified()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.level_2_status = 'approved' AND (OLD.level_2_status IS NULL OR OLD.level_2_status != 'approved') THEN
    PERFORM notify_webhook('account_verified', row_to_json(NEW)::jsonb);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_account_verified ON profiles;
CREATE TRIGGER on_account_verified
  AFTER UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION trigger_account_verified();

-- ============================================================
-- 7. TRIGGERS POUR TÉMOIGNAGES
-- ============================================================

-- Nouveau témoignage
CREATE OR REPLACE FUNCTION trigger_new_testimonial()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM notify_webhook('new_testimonial', row_to_json(NEW)::jsonb);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_new_testimonial ON testimonials;
CREATE TRIGGER on_new_testimonial
  AFTER INSERT ON testimonials
  FOR EACH ROW
  EXECUTE FUNCTION trigger_new_testimonial();

-- ============================================================
-- 8. CRON JOBS POUR ÉVÉNEMENTS PÉRIODIQUES
-- ============================================================

-- Réengagement des utilisateurs inactifs (tous les jours à 10h)
SELECT cron.schedule(
  'daily-reengagement',
  '0 10 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/reengagement',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := '{"inactive_days": 7}'::jsonb
  );
  $$
);

-- Vérification des vues élevées (toutes les heures)
SELECT cron.schedule(
  'hourly-high-views-check',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/check-high-views',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Matching des propriétés (toutes les heures)
SELECT cron.schedule(
  'hourly-property-matching',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/property-matching',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Digest hebdomadaire (lundi à 9h)
SELECT cron.schedule(
  'weekly-digest',
  '0 9 * * 1',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/weekly-digest',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Nettoyage quotidien (3h du matin)
SELECT cron.schedule(
  'daily-cleanup',
  '0 3 * * *',
  'SELECT cleanup_old_notifications()'
);

-- ============================================================
-- 9. VÉRIFICATION DE LA CONFIGURATION
-- ============================================================

-- Vue pour monitorer les notifications récentes
CREATE OR REPLACE VIEW notification_stats AS
SELECT 
  notification_type,
  channel,
  status,
  COUNT(*) as count,
  DATE_TRUNC('hour', created_at) as hour
FROM notification_history
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY notification_type, channel, status, DATE_TRUNC('hour', created_at)
ORDER BY hour DESC, count DESC;

-- Vue pour les utilisateurs sans préférences (problème potentiel)
CREATE OR REPLACE VIEW users_without_preferences AS
SELECT 
  u.id as user_id,
  u.email,
  u.created_at as user_created_at
FROM auth.users u
LEFT JOIN notification_preferences np ON u.id = np.user_id
WHERE np.id IS NULL;

-- ============================================================
-- FIN DES TRIGGERS
-- ============================================================