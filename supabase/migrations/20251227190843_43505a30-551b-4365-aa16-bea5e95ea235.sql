-- Create property type enum
CREATE TYPE public.property_type AS ENUM ('studio', 'apartment', 'house', 'room', 'villa');

-- Create listing type enum  
CREATE TYPE public.listing_type AS ENUM ('rent', 'sale', 'colocation', 'short_term');

-- Create properties table
CREATE TABLE public.properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  property_type property_type NOT NULL DEFAULT 'apartment',
  listing_type listing_type NOT NULL DEFAULT 'rent',
  
  -- Location
  address TEXT,
  city TEXT NOT NULL,
  neighborhood TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  
  -- Pricing
  price INTEGER NOT NULL,
  price_unit TEXT NOT NULL DEFAULT 'month', -- month, day, sale
  deposit INTEGER,
  
  -- Features
  bedrooms INTEGER DEFAULT 1,
  bathrooms INTEGER DEFAULT 1,
  area INTEGER, -- in m²
  floor_number INTEGER,
  total_floors INTEGER,
  
  -- Amenities (stored as array)
  amenities TEXT[],
  
  -- Rules
  rules TEXT[],
  min_stay_days INTEGER,
  
  -- Images
  images TEXT[], -- Array of image URLs
  
  -- Availability
  available_from DATE,
  available_to DATE,
  is_available BOOLEAN DEFAULT TRUE,
  
  -- Status
  is_verified BOOLEAN DEFAULT FALSE,
  is_published BOOLEAN DEFAULT TRUE,
  view_count INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

-- RLS Policies for properties
CREATE POLICY "Anyone can view published properties"
  ON public.properties FOR SELECT
  USING (is_published = TRUE);

CREATE POLICY "Owners can manage their properties"
  ON public.properties FOR ALL
  TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- Create property inquiries table for contact form
CREATE TABLE public.property_inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  sender_name TEXT NOT NULL,
  sender_email TEXT NOT NULL,
  sender_phone TEXT,
  message TEXT NOT NULL,
  move_in_date DATE,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.property_inquiries ENABLE ROW LEVEL SECURITY;

-- RLS Policies for inquiries
CREATE POLICY "Users can create inquiries"
  ON public.property_inquiries FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = sender_id OR sender_id IS NULL);

CREATE POLICY "Owners can view inquiries for their properties"
  ON public.property_inquiries FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.properties 
      WHERE properties.id = property_inquiries.property_id 
      AND properties.owner_id = auth.uid()
    )
    OR sender_id = auth.uid()
  );

-- Create property favorites table
CREATE TABLE public.property_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, property_id)
);

-- Enable RLS
ALTER TABLE public.property_favorites ENABLE ROW LEVEL SECURITY;

-- RLS Policies for favorites
CREATE POLICY "Users can manage their favorites"
  ON public.property_favorites FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create property reviews table
CREATE TABLE public.property_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(property_id, reviewer_id)
);

-- Enable RLS
ALTER TABLE public.property_reviews ENABLE ROW LEVEL SECURITY;

-- RLS Policies for reviews
CREATE POLICY "Anyone can view reviews"
  ON public.property_reviews FOR SELECT
  USING (TRUE);

CREATE POLICY "Authenticated users can create reviews"
  ON public.property_reviews FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = reviewer_id);

CREATE POLICY "Users can update their reviews"
  ON public.property_reviews FOR UPDATE
  TO authenticated
  USING (auth.uid() = reviewer_id);

-- Add trigger for updated_at on properties
CREATE TRIGGER update_properties_updated_at
  BEFORE UPDATE ON public.properties
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_properties_city ON public.properties(city);
CREATE INDEX idx_properties_listing_type ON public.properties(listing_type);
CREATE INDEX idx_properties_price ON public.properties(price);
CREATE INDEX idx_properties_owner ON public.properties(owner_id);