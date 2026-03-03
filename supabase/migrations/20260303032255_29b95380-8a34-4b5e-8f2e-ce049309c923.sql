
-- Add subscription JSONB column to user_push_tokens
ALTER TABLE public.user_push_tokens ADD COLUMN IF NOT EXISTS subscription JSONB;

-- Drop old unique constraint if exists and add new one
ALTER TABLE public.user_push_tokens DROP CONSTRAINT IF EXISTS user_push_tokens_user_id_token_key;

-- Add language column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'fr';

-- Add missing push preference columns to notification_preferences
ALTER TABLE public.notification_preferences
ADD COLUMN IF NOT EXISTS push_new_review BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS push_high_views BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS push_new_property BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS push_price_drop BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS push_account BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS push_listing BOOLEAN DEFAULT true;
