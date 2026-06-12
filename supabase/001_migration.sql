-- ================================================================
-- MIGRATION 001 — FAQ + Chat intelligent
-- Exécuter dans Supabase SQL Editor
-- ================================================================

-- 1. Table listing_faqs
CREATE TABLE IF NOT EXISTS listing_faqs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id   uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  questions    jsonb NOT NULL DEFAULT '[]',
  generated_by text NOT NULL DEFAULT 'ai',
  generated_at timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE(listing_id)
);
CREATE INDEX IF NOT EXISTS idx_listing_faqs_listing_id ON listing_faqs(listing_id);

-- 2. Nouvelles colonnes conversations
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS admin_notified_at timestamptz,
  ADD COLUMN IF NOT EXISTS claimed_by        uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS claimed_at        timestamptz,
  ADD COLUMN IF NOT EXISTS pending_ai_reply  boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_user_msg_at  timestamptz;

-- 3. Metadata sur messages (carte annonce)
ALTER TABLE messages ADD COLUMN IF NOT EXISTS metadata jsonb;

-- 4. RLS listing_faqs
ALTER TABLE listing_faqs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "faq_select" ON listing_faqs FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "faq_admin_all" ON listing_faqs FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin','super_admin'))
);

-- 5. Trigger updated_at
CREATE OR REPLACE FUNCTION update_listing_faq_ts()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
DROP TRIGGER IF EXISTS trg_listing_faq_ts ON listing_faqs;
CREATE TRIGGER trg_listing_faq_ts
  BEFORE UPDATE ON listing_faqs FOR EACH ROW EXECUTE FUNCTION update_listing_faq_ts();

-- 6. Super admin voit toutes les conversations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='conversations' AND policyname='superadmin_all_convs'
  ) THEN
    CREATE POLICY "superadmin_all_convs" ON conversations FOR ALL USING (
      EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
    );
  END IF;
END $$;
