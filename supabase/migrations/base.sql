-- ============================================================
-- HABYNEX NOTIFICATION SYSTEM - SCHEMA COMPLET
-- ============================================================

-- 1. EXTENSIONS NÉCESSAIRES
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pg_net";
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- 2. TABLES PRINCIPALES
-- ============================================================

-- Abonnements push des utilisateurs
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint ON push_subscriptions(endpoint);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_created_at ON push_subscriptions(created_at);

-- Préférences de notification par utilisateur
CREATE TABLE IF NOT EXISTS notification_preferences (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  
  -- Email notifications
  email_new_message boolean DEFAULT true,
  email_new_inquiry boolean DEFAULT true,
  email_property_views boolean DEFAULT true,
  email_recommendations boolean DEFAULT true,
  email_marketing boolean DEFAULT true,
  email_weekly_digest boolean DEFAULT true,
  
  -- Push notifications
  push_new_message boolean DEFAULT true,
  push_new_inquiry boolean DEFAULT true,
  push_property_views boolean DEFAULT true,
  push_recommendations boolean DEFAULT true,
  push_marketing boolean DEFAULT true,
  
  -- SMS notifications
  sms_new_message boolean DEFAULT true,
  sms_new_inquiry boolean DEFAULT true,
  sms_urgent_only boolean DEFAULT true,
  
  -- Quiet hours (heures silencieuses)
  quiet_hours_enabled boolean DEFAULT false,
  quiet_hours_start time DEFAULT '22:00',
  quiet_hours_end time DEFAULT '08:00',
  
  -- Digest frequency
  digest_frequency text DEFAULT 'weekly' CHECK (digest_frequency IN ('daily', 'weekly', 'monthly', 'never')),
  
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notification_prefs_user_id ON notification_preferences(user_id);

-- Historique des notifications envoyées
CREATE TABLE IF NOT EXISTS notification_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type text NOT NULL,
  channel text NOT NULL CHECK (channel IN ('push', 'email', 'sms')),
  title text NOT NULL,
  content text,
  status text DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'skipped', 'pending')),
  metadata jsonb DEFAULT '{}',
  sent_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notification_history_user_id ON notification_history(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_history_type ON notification_history(notification_type);
CREATE INDEX IF NOT EXISTS idx_notification_history_channel ON notification_history(channel);
CREATE INDEX IF NOT EXISTS idx_notification_history_sent_at ON notification_history(sent_at);
CREATE INDEX IF NOT EXISTS idx_notification_history_created_at ON notification_history(created_at DESC);

-- Tracking des milestones de vues (pour éviter les doublons)
CREATE TABLE IF NOT EXISTS view_milestone_notifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE,
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  milestone integer NOT NULL,
  view_count integer NOT NULL,
  channels text[] DEFAULT '{}',
  sent_at timestamp with time zone DEFAULT now(),
  UNIQUE(property_id, milestone)
);

CREATE INDEX IF NOT EXISTS idx_view_milestone_property ON view_milestone_notifications(property_id);
CREATE INDEX IF NOT EXISTS idx_view_milestone_sent_at ON view_milestone_notifications(sent_at);

-- Tracking des envois de réengagement (pour éviter le spam)
CREATE TABLE IF NOT EXISTS reengagement_sent (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  sent_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, sent_at) -- Un envoi par jour max
);

CREATE INDEX IF NOT EXISTS idx_reengagement_user ON reengagement_sent(user_id);
CREATE INDEX IF NOT EXISTS idx_reengagement_sent_at ON reengagement_sent(sent_at);

-- 3. POLITIQUES RLS (ROW LEVEL SECURITY)
-- ============================================================

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE view_milestone_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE reengagement_sent ENABLE ROW LEVEL SECURITY;

-- Politique: utilisateurs gèrent leurs propres abonnements push
CREATE POLICY "Users manage own push subscriptions"
  ON push_subscriptions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Politique: utilisateurs gèrent leurs préférences
CREATE POLICY "Users manage own notification preferences"
  ON notification_preferences
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Politique: utilisateurs voient leur historique
CREATE POLICY "Users view own notification history"
  ON notification_history
  FOR SELECT
  USING (auth.uid() = user_id);

-- Politique: service role peut tout faire sur l'historique
CREATE POLICY "Service role manages notification history"
  ON notification_history
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Politique: service role pour milestones
CREATE POLICY "Service role manages view milestones"
  ON view_milestone_notifications
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Politique: service role pour réengagement
CREATE POLICY "Service role manages reengagement"
  ON reengagement_sent
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 4. FONCTIONS UTILITAIRES
-- ============================================================

-- Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers pour updated_at
DROP TRIGGER IF EXISTS update_push_subscriptions_updated_at ON push_subscriptions;
CREATE TRIGGER update_push_subscriptions_updated_at
  BEFORE UPDATE ON push_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_notification_prefs_updated_at ON notification_preferences;
CREATE TRIGGER update_notification_prefs_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Fonction pour créer les préférences par défaut à l'inscription
CREATE OR REPLACE FUNCTION create_default_notification_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger pour créer les préférences à l'inscription
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_default_notification_preferences();

-- 5. CONFIGURATION DES PARAMÈTRES DE L'APPLICATION
-- ============================================================

-- Stocker l'URL Supabase pour les webhooks (à remplacer par votre vraie URL)
ALTER DATABASE postgres SET "app.settings.supabase_url" TO 'https://votre-projet.supabase.co';
-- La clé service role doit être définie via les variables d'environnement, pas ici

-- 6. NETTOYAGE AUTOMATIQUE (OPTIONNEL)
-- ============================================================

-- Fonction pour nettoyer les vieilles notifications
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS void AS $$
BEGIN
  -- Supprimer les notifications de plus de 90 jours
  DELETE FROM notification_history 
  WHERE created_at < NOW() - INTERVAL '90 days';
  
  -- Supprimer les milestones de plus de 180 jours
  DELETE FROM view_milestone_notifications 
  WHERE sent_at < NOW() - INTERVAL '180 days';
  
  -- Supprimer les reengagement de plus de 365 jours
  DELETE FROM reengagement_sent 
  WHERE sent_at < NOW() - INTERVAL '365 days';
  
  -- Supprimer les abonnements push inactifs de plus de 90 jours
  DELETE FROM push_subscriptions 
  WHERE updated_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- Planifier le nettoyage quotidien à 3h du matin
SELECT cron.schedule('daily-cleanup', '0 3 * * *', 'SELECT cleanup_old_notifications()');

-- ============================================================
-- FIN DU SCHÉMA
-- ============================================================