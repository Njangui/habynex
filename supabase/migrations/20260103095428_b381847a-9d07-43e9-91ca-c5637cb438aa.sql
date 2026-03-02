-- Enum pour les niveaux de vérification
CREATE TYPE verification_level AS ENUM ('level_1', 'level_2', 'level_3', 'level_4');

-- Enum pour le statut de vérification
CREATE TYPE verification_status AS ENUM ('pending', 'approved', 'rejected', 'expired');

-- Enum pour le type de document
CREATE TYPE document_type AS ENUM (
  'id_card', 
  'passport', 
  'selfie_with_id', 
  'digital_signature',
  'property_photo',
  'property_video',
  'utility_bill',
  'business_register',
  'management_mandate',
  'other'
);

-- Enum pour le type de compte
CREATE TYPE account_type AS ENUM ('owner', 'agent', 'agency');

-- Table principale des vérifications utilisateur
CREATE TABLE public.user_verifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_type account_type NOT NULL DEFAULT 'owner',
  current_level verification_level NOT NULL DEFAULT 'level_1',
  
  -- Niveau 1 - Vérification de base
  level_1_status verification_status DEFAULT 'pending',
  level_1_completed_at TIMESTAMP WITH TIME ZONE,
  email_verified BOOLEAN DEFAULT false,
  phone_verified BOOLEAN DEFAULT false,
  has_real_photo BOOLEAN DEFAULT false,
  
  -- Niveau 2 - Identité
  level_2_status verification_status DEFAULT 'pending',
  level_2_completed_at TIMESTAMP WITH TIME ZONE,
  level_2_eligible_at TIMESTAMP WITH TIME ZONE,
  identity_document_verified BOOLEAN DEFAULT false,
  selfie_verified BOOLEAN DEFAULT false,
  signature_verified BOOLEAN DEFAULT false,
  
  -- Niveau 3 - Logement (pour propriétaires)
  level_3_status verification_status DEFAULT 'pending',
  level_3_completed_at TIMESTAMP WITH TIME ZONE,
  level_3_eligible_at TIMESTAMP WITH TIME ZONE,
  
  -- Niveau 4 - Certification agent/agence
  level_4_status verification_status DEFAULT 'pending',
  level_4_completed_at TIMESTAMP WITH TIME ZONE,
  level_4_eligible_at TIMESTAMP WITH TIME ZONE,
  business_verified BOOLEAN DEFAULT false,
  interview_completed BOOLEAN DEFAULT false,
  
  -- Trust Score
  trust_score INTEGER NOT NULL DEFAULT 0 CHECK (trust_score >= 0 AND trust_score <= 100),
  
  -- Métadonnées
  is_suspended BOOLEAN DEFAULT false,
  suspension_reason TEXT,
  suspended_at TIMESTAMP WITH TIME ZONE,
  reports_count INTEGER DEFAULT 0,
  response_rate DECIMAL(5,2) DEFAULT 100.00,
  cancellation_count INTEGER DEFAULT 0,
  positive_reviews_count INTEGER DEFAULT 0,
  negative_reviews_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(user_id)
);

-- Table des documents de vérification
CREATE TABLE public.verification_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  verification_id UUID NOT NULL REFERENCES public.user_verifications(id) ON DELETE CASCADE,
  document_type document_type NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT,
  status verification_status DEFAULT 'pending',
  verification_level verification_level NOT NULL,
  
  -- Métadonnées de vérification
  verified_by UUID REFERENCES auth.users(id),
  verified_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  
  -- Analyse automatique
  auto_analysis_result JSONB,
  duplicate_detected BOOLEAN DEFAULT false,
  face_match_score DECIMAL(5,2),
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table des vérifications de propriétés
CREATE TABLE public.property_verifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status verification_status DEFAULT 'pending',
  
  -- Méthodes de vérification
  has_original_photos BOOLEAN DEFAULT false,
  has_video BOOLEAN DEFAULT false,
  has_gps_location BOOLEAN DEFAULT false,
  has_utility_bill BOOLEAN DEFAULT false,
  has_field_visit BOOLEAN DEFAULT false,
  
  -- Résultats d'analyse
  duplicate_images_found BOOLEAN DEFAULT false,
  address_verified BOOLEAN DEFAULT false,
  verification_report JSONB,
  
  -- Vérification par agent
  verified_by UUID REFERENCES auth.users(id),
  verified_at TIMESTAMP WITH TIME ZONE,
  field_visit_date TIMESTAMP WITH TIME ZONE,
  field_visit_agent UUID REFERENCES auth.users(id),
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(property_id)
);

-- Table des signalements
CREATE TABLE public.user_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reported_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  reported_property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
  
  reason TEXT NOT NULL,
  description TEXT,
  evidence_urls TEXT[],
  
  status verification_status DEFAULT 'pending',
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  resolution_notes TEXT,
  
  -- Actions prises
  action_taken TEXT,
  trust_score_impact INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  CONSTRAINT report_target CHECK (reported_user_id IS NOT NULL OR reported_property_id IS NOT NULL)
);

-- Table historique du Trust Score
CREATE TABLE public.trust_score_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  previous_score INTEGER NOT NULL,
  new_score INTEGER NOT NULL,
  change_reason TEXT NOT NULL,
  change_amount INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table blacklist
CREATE TABLE public.user_blacklist (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  phone TEXT,
  reason TEXT NOT NULL,
  added_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.user_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trust_score_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_blacklist ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_verifications
CREATE POLICY "Users can view their own verification"
ON public.user_verifications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own verification"
ON public.user_verifications FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own verification"
ON public.user_verifications FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all verifications"
ON public.user_verifications FOR ALL
USING (public.current_user_has_role('admin'));

CREATE POLICY "Anyone can view trust scores of published property owners"
ON public.user_verifications FOR SELECT
USING (
  user_id IN (
    SELECT DISTINCT owner_id FROM public.properties WHERE is_published = true
  )
);

-- RLS Policies for verification_documents
CREATE POLICY "Users can view their own documents"
ON public.verification_documents FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can upload their own documents"
ON public.verification_documents FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all documents"
ON public.verification_documents FOR ALL
USING (public.current_user_has_role('admin'));

-- RLS Policies for property_verifications
CREATE POLICY "Users can view their property verifications"
ON public.property_verifications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create property verifications"
ON public.property_verifications FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their property verifications"
ON public.property_verifications FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all property verifications"
ON public.property_verifications FOR ALL
USING (public.current_user_has_role('admin'));

CREATE POLICY "Anyone can view verified properties"
ON public.property_verifications FOR SELECT
USING (status = 'approved');

-- RLS Policies for user_reports
CREATE POLICY "Users can create reports"
ON public.user_reports FOR INSERT
WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Users can view their own reports"
ON public.user_reports FOR SELECT
USING (auth.uid() = reporter_id);

CREATE POLICY "Admins can manage all reports"
ON public.user_reports FOR ALL
USING (public.current_user_has_role('admin'));

-- RLS Policies for trust_score_history
CREATE POLICY "Users can view their own score history"
ON public.trust_score_history FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage score history"
ON public.trust_score_history FOR ALL
USING (public.current_user_has_role('admin'));

-- RLS Policies for user_blacklist
CREATE POLICY "Admins can manage blacklist"
ON public.user_blacklist FOR ALL
USING (public.current_user_has_role('admin'));

-- Function to calculate trust score
CREATE OR REPLACE FUNCTION public.calculate_trust_score(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_score INTEGER := 0;
  v_verification RECORD;
BEGIN
  SELECT * INTO v_verification FROM public.user_verifications WHERE user_id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN 0;
  END IF;
  
  -- Niveau 1: +15 points
  IF v_verification.level_1_status = 'approved' THEN
    v_score := v_score + 15;
  END IF;
  
  -- Niveau 2: +25 points
  IF v_verification.level_2_status = 'approved' THEN
    v_score := v_score + 25;
  END IF;
  
  -- Niveau 3: +30 points
  IF v_verification.level_3_status = 'approved' THEN
    v_score := v_score + 30;
  END IF;
  
  -- Niveau 4: +40 points (agents/agences)
  IF v_verification.level_4_status = 'approved' THEN
    v_score := v_score + 40;
  END IF;
  
  -- Avis positifs: +2 par avis (max +20)
  v_score := v_score + LEAST(v_verification.positive_reviews_count * 2, 20);
  
  -- Avis négatifs: -5 par avis
  v_score := v_score - (v_verification.negative_reviews_count * 5);
  
  -- Taux de réponse: bonus si > 90%
  IF v_verification.response_rate >= 90 THEN
    v_score := v_score + 5;
  END IF;
  
  -- Annulations: -10 par annulation
  v_score := v_score - (v_verification.cancellation_count * 10);
  
  -- Signalements: -15 par signalement
  v_score := v_score - (v_verification.reports_count * 15);
  
  -- Limiter entre 0 et 100
  RETURN GREATEST(0, LEAST(100, v_score));
END;
$$;

-- Function to update trust score
CREATE OR REPLACE FUNCTION public.update_trust_score()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_score INTEGER;
  v_old_score INTEGER;
BEGIN
  v_old_score := OLD.trust_score;
  v_new_score := public.calculate_trust_score(NEW.user_id);
  
  IF v_new_score != v_old_score THEN
    NEW.trust_score := v_new_score;
    
    -- Log the change
    INSERT INTO public.trust_score_history (user_id, previous_score, new_score, change_reason, change_amount)
    VALUES (NEW.user_id, v_old_score, v_new_score, 'Automatic recalculation', v_new_score - v_old_score);
    
    -- Auto-suspend if score < 25
    IF v_new_score < 25 AND NOT NEW.is_suspended THEN
      NEW.is_suspended := true;
      NEW.suspension_reason := 'Trust score below threshold';
      NEW.suspended_at := now();
    END IF;
  END IF;
  
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- Trigger for trust score update
CREATE TRIGGER update_user_trust_score
BEFORE UPDATE ON public.user_verifications
FOR EACH ROW
EXECUTE FUNCTION public.update_trust_score();

-- Function to initialize verification for new users
CREATE OR REPLACE FUNCTION public.init_user_verification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_verifications (user_id, level_2_eligible_at)
  VALUES (NEW.id, now() + INTERVAL '14 days')
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Trigger to auto-create verification record
CREATE TRIGGER on_user_created_init_verification
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.init_user_verification();

-- Function to check level eligibility based on time
CREATE OR REPLACE FUNCTION public.check_level_eligibility(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_verification RECORD;
  v_result JSONB;
BEGIN
  SELECT * INTO v_verification FROM public.user_verifications WHERE user_id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('eligible', false, 'message', 'No verification record found');
  END IF;
  
  v_result := jsonb_build_object(
    'level_1_eligible', true,
    'level_2_eligible', now() >= COALESCE(v_verification.level_2_eligible_at, now() + INTERVAL '14 days'),
    'level_2_eligible_at', v_verification.level_2_eligible_at,
    'level_3_eligible', now() >= COALESCE(v_verification.level_3_eligible_at, now() + INTERVAL '28 days'),
    'level_3_eligible_at', v_verification.level_3_eligible_at,
    'level_4_eligible', now() >= COALESCE(v_verification.level_4_eligible_at, now() + INTERVAL '42 days'),
    'level_4_eligible_at', v_verification.level_4_eligible_at,
    'current_level', v_verification.current_level
  );
  
  RETURN v_result;
END;
$$;

-- Add storage bucket for verification documents
INSERT INTO storage.buckets (id, name, public) 
VALUES ('verification-documents', 'verification-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for verification documents
CREATE POLICY "Users can upload verification documents"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'verification-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their verification documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'verification-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins can view all verification documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'verification-documents' AND public.current_user_has_role('admin'));

CREATE POLICY "Admins can delete verification documents"
ON storage.objects FOR DELETE
USING (bucket_id = 'verification-documents' AND public.current_user_has_role('admin'));