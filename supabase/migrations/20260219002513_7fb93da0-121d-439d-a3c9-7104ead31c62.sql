
-- Add visit_price and rental_months columns to properties
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS visit_price integer DEFAULT NULL;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS rental_months integer DEFAULT NULL;
