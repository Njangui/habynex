-- Create testimonials table for user comments
CREATE TABLE public.testimonials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  rating INTEGER NOT NULL DEFAULT 5 CHECK (rating >= 1 AND rating <= 5),
  likes_count INTEGER NOT NULL DEFAULT 0,
  is_approved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create testimonial_likes table to track who liked what
CREATE TABLE public.testimonial_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  testimonial_id UUID NOT NULL REFERENCES public.testimonials(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(testimonial_id, user_id)
);

-- Enable RLS
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.testimonial_likes ENABLE ROW LEVEL SECURITY;

-- Testimonials policies
CREATE POLICY "Anyone can view approved testimonials"
ON public.testimonials
FOR SELECT
USING (is_approved = true);

CREATE POLICY "Users can view their own testimonials"
ON public.testimonials
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can create testimonials"
ON public.testimonials
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own testimonials"
ON public.testimonials
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own testimonials"
ON public.testimonials
FOR DELETE
USING (auth.uid() = user_id);

-- Testimonial likes policies
CREATE POLICY "Anyone can view likes"
ON public.testimonial_likes
FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can like"
ON public.testimonial_likes
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike their own likes"
ON public.testimonial_likes
FOR DELETE
USING (auth.uid() = user_id);

-- Function to update likes count
CREATE OR REPLACE FUNCTION public.update_testimonial_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.testimonials SET likes_count = likes_count + 1 WHERE id = NEW.testimonial_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.testimonials SET likes_count = likes_count - 1 WHERE id = OLD.testimonial_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to auto-update likes count
CREATE TRIGGER update_likes_count
AFTER INSERT OR DELETE ON public.testimonial_likes
FOR EACH ROW
EXECUTE FUNCTION public.update_testimonial_likes_count();

-- Trigger for updated_at
CREATE TRIGGER update_testimonials_updated_at
BEFORE UPDATE ON public.testimonials
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();