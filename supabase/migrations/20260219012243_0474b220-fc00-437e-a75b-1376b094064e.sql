-- Add agent and agency to user_type enum
ALTER TYPE public.user_type ADD VALUE IF NOT EXISTS 'agent';
ALTER TYPE public.user_type ADD VALUE IF NOT EXISTS 'agency';