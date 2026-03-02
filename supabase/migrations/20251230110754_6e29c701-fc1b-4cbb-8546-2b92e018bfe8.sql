-- Drop the overly permissive profiles policy
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Create a more restrictive policy that allows viewing only relevant profiles
CREATE POLICY "Users can view relevant profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    -- Own profile
    auth.uid() = user_id
    OR
    -- Property owners of published listings (for displaying owner info on property pages)
    user_id IN (
      SELECT DISTINCT owner_id 
      FROM properties 
      WHERE is_published = true
    )
    OR
    -- Conversation participants (for messaging)
    user_id IN (
      SELECT tenant_id FROM conversations WHERE owner_id = auth.uid()
      UNION
      SELECT owner_id FROM conversations WHERE tenant_id = auth.uid()
    )
    OR
    -- Users who sent inquiries about properties owned by current user
    user_id IN (
      SELECT pi.sender_id FROM property_inquiries pi
      JOIN properties p ON p.id = pi.property_id
      WHERE p.owner_id = auth.uid() AND pi.sender_id IS NOT NULL
    )
    OR
    -- Property owners for properties the current user inquired about
    user_id IN (
      SELECT p.owner_id FROM property_inquiries pi
      JOIN properties p ON p.id = pi.property_id
      WHERE pi.sender_id = auth.uid()
    )
  );