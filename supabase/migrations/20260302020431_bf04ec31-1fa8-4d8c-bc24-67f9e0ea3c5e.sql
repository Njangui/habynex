-- Fix testimonials RLS so admin can see ALL testimonials (not just approved ones)
CREATE POLICY "Admins can manage all testimonials"
ON public.testimonials
FOR ALL
TO authenticated
USING (public.current_user_has_role('admin'::app_role))
WITH CHECK (public.current_user_has_role('admin'::app_role));