-- Add whatsapp_enabled column to properties table
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS whatsapp_enabled boolean DEFAULT false;

-- Add whatsapp_number column to profiles for users to set their WhatsApp number
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS whatsapp_number text;

-- Add preferred_neighborhoods column to profiles for better recommendations
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS preferred_neighborhoods text[] DEFAULT '{}';

-- Add preferred_listing_types column to profiles for recommendations
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS preferred_listing_types text[] DEFAULT '{}';

-- Add preferred_amenities column to profiles for recommendations
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS preferred_amenities text[] DEFAULT '{}';

-- Add move_in_timeline column to profiles (when user wants to move)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS move_in_timeline text;