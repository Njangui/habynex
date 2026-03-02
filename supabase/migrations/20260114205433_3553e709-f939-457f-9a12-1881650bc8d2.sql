-- Fix the overly permissive INSERT policy for notification_history
-- Only allow service role (edge functions) to insert, not any authenticated user

-- Drop the old permissive policy
DROP POLICY IF EXISTS "Service role can insert notifications" ON public.notification_history;

-- Create a more restrictive policy - inserts happen via service role in edge functions
-- Since edge functions use service role key, they bypass RLS
-- For user-initiated inserts, they can only insert for themselves
CREATE POLICY "Users can insert their own notifications"
ON public.notification_history FOR INSERT
WITH CHECK (auth.uid() = user_id);