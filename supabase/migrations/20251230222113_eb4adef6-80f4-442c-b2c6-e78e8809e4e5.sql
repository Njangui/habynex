-- Create property_views table to track user views
CREATE TABLE public.property_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  user_id UUID,
  session_id TEXT,
  viewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  view_duration_seconds INTEGER DEFAULT 0,
  source TEXT DEFAULT 'direct'
);

-- Create index for faster queries
CREATE INDEX idx_property_views_property_id ON public.property_views(property_id);
CREATE INDEX idx_property_views_user_id ON public.property_views(user_id);
CREATE INDEX idx_property_views_viewed_at ON public.property_views(viewed_at DESC);

-- Enable RLS
ALTER TABLE public.property_views ENABLE ROW LEVEL SECURITY;

-- Anyone can insert views (even anonymous)
CREATE POLICY "Anyone can track views"
ON public.property_views
FOR INSERT
WITH CHECK (true);

-- Users can view their own history
CREATE POLICY "Users can view their own history"
ON public.property_views
FOR SELECT
USING (user_id = auth.uid() OR user_id IS NULL);

-- Property owners can see views on their properties
CREATE POLICY "Owners can view property analytics"
ON public.property_views
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM properties p 
    WHERE p.id = property_views.property_id 
    AND p.owner_id = auth.uid()
  )
);

-- Function to increment view count on properties table
CREATE OR REPLACE FUNCTION public.increment_property_view_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.properties 
  SET view_count = COALESCE(view_count, 0) + 1 
  WHERE id = NEW.property_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to auto-increment view count
CREATE TRIGGER increment_view_count
AFTER INSERT ON public.property_views
FOR EACH ROW
EXECUTE FUNCTION public.increment_property_view_count();