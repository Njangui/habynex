-- Ajuster le système de vérification: niveaux accessibles à tout moment + recalcul Trust Score

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

  /* Niveau 1 (score progressif)
     - Email vérifié: +5
     - Photo réelle: +10
     - Téléphone vérifié: +5 (si SMS disponible)
     => Le "compte confirmé" est considéré atteint dès Email + Photo.
  */
  IF COALESCE(v_verification.email_verified, false) THEN
    v_score := v_score + 5;
  END IF;

  IF COALESCE(v_verification.has_real_photo, false) THEN
    v_score := v_score + 10;
  END IF;

  IF COALESCE(v_verification.phone_verified, false) THEN
    v_score := v_score + 5;
  END IF;

  -- Niveau 2: +25 points
  IF v_verification.level_2_status = 'approved' THEN
    v_score := v_score + 25;
  END IF;

  -- Niveau 3: +30 points
  IF v_verification.level_3_status = 'approved' THEN
    v_score := v_score + 30;
  END IF;

  /* Niveau 4: +40 points
     - Agents / Agences: via level_4_status = approved
     - Propriétaires: bonus +40 quand Niveau 2 + Niveau 3 sont approuvés
       (équivalent "profil premium fiable" sans certification pro)
  */
  IF v_verification.account_type IN ('agent', 'agency') THEN
    IF v_verification.level_4_status = 'approved' THEN
      v_score := v_score + 40;
    END IF;
  ELSE
    IF v_verification.level_2_status = 'approved' AND v_verification.level_3_status = 'approved' THEN
      v_score := v_score + 40;
    END IF;
  END IF;

  -- Avis positifs: +2 par avis (max +20)
  v_score := v_score + LEAST(COALESCE(v_verification.positive_reviews_count, 0) * 2, 20);

  -- Avis négatifs: -5 par avis
  v_score := v_score - (COALESCE(v_verification.negative_reviews_count, 0) * 5);

  -- Taux de réponse: bonus si >= 90%
  IF COALESCE(v_verification.response_rate, 0) >= 90 THEN
    v_score := v_score + 5;
  END IF;

  -- Annulations: -10 par annulation
  v_score := v_score - (COALESCE(v_verification.cancellation_count, 0) * 10);

  -- Signalements: -15 par signalement
  v_score := v_score - (COALESCE(v_verification.reports_count, 0) * 15);

  RETURN GREATEST(0, LEAST(100, v_score));
END;
$$;

CREATE OR REPLACE FUNCTION public.check_level_eligibility(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_verification RECORD;
BEGIN
  SELECT * INTO v_verification FROM public.user_verifications WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('eligible', false, 'message', 'No verification record found');
  END IF;

  -- Tous les niveaux sont accessibles à tout moment (progressif ou d'un coup).
  RETURN jsonb_build_object(
    'level_1_eligible', true,
    'level_2_eligible', true,
    'level_2_eligible_at', NULL,
    'level_3_eligible', true,
    'level_3_eligible_at', NULL,
    'level_4_eligible', true,
    'level_4_eligible_at', NULL,
    'current_level', v_verification.current_level
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.init_user_verification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_verifications (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;