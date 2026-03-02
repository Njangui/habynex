-- Create or replace the function to calculate Trust Score automatically
CREATE OR REPLACE FUNCTION public.recalculate_trust_score(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_score integer := 0;
  v_verification record;
  v_positive_reviews integer := 0;
  v_negative_reviews integer := 0;
  v_validated_reports integer := 0;
  v_response_rate numeric := 100;
  v_level1_bonus integer := 0;
  v_review_bonus integer := 0;
  v_report_penalty integer := 0;
  v_response_bonus integer := 0;
BEGIN
  -- Get verification data
  SELECT * INTO v_verification FROM user_verifications WHERE user_id = p_user_id;
  
  IF v_verification IS NULL THEN
    RETURN 0;
  END IF;
  
  -- Level 1 verification bonus (+30 points)
  IF v_verification.level_1_status = 'approved' THEN
    v_level1_bonus := 30;
  END IF;
  
  -- Count positive and negative reviews for this user's properties
  SELECT 
    COALESCE(SUM(CASE WHEN r.rating >= 4 THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN r.rating <= 2 THEN 1 ELSE 0 END), 0)
  INTO v_positive_reviews, v_negative_reviews
  FROM property_reviews r
  INNER JOIN properties p ON p.id = r.property_id
  WHERE p.owner_id = p_user_id;
  
  -- Review bonuses/penalties (+5 for positive, -10 for negative)
  v_review_bonus := (v_positive_reviews * 5) - (v_negative_reviews * 10);
  
  -- Count validated reports against this user (-15 each)
  SELECT COALESCE(COUNT(*), 0) INTO v_validated_reports
  FROM user_reports
  WHERE reported_user_id = p_user_id AND status = 'approved';
  
  v_report_penalty := v_validated_reports * 15;
  
  -- Response rate bonus (up to 20 points based on response rate)
  v_response_rate := COALESCE(v_verification.response_rate, 100);
  v_response_bonus := FLOOR(v_response_rate / 5)::integer;
  
  -- Calculate total score
  v_score := v_level1_bonus + v_review_bonus - v_report_penalty + v_response_bonus;
  
  -- Ensure score is between 0 and 100
  v_score := GREATEST(0, LEAST(100, v_score));
  
  -- Update the user_verifications table
  UPDATE user_verifications
  SET 
    trust_score = v_score,
    positive_reviews_count = v_positive_reviews,
    negative_reviews_count = v_negative_reviews,
    reports_count = v_validated_reports,
    updated_at = now()
  WHERE user_id = p_user_id;
  
  RETURN v_score;
END;
$$;

-- Create trigger function to auto-update trust score
CREATE OR REPLACE FUNCTION public.trigger_recalculate_trust_score()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_id uuid;
BEGIN
  -- For property_reviews, find the owner of the property
  IF TG_TABLE_NAME = 'property_reviews' THEN
    SELECT owner_id INTO v_owner_id FROM properties WHERE id = COALESCE(NEW.property_id, OLD.property_id);
    IF v_owner_id IS NOT NULL THEN
      PERFORM recalculate_trust_score(v_owner_id);
    END IF;
  END IF;
  
  -- For user_reports, recalculate for the reported user
  IF TG_TABLE_NAME = 'user_reports' THEN
    IF COALESCE(NEW.reported_user_id, OLD.reported_user_id) IS NOT NULL THEN
      PERFORM recalculate_trust_score(COALESCE(NEW.reported_user_id, OLD.reported_user_id));
    END IF;
  END IF;
  
  -- For user_verifications level 1 status changes
  IF TG_TABLE_NAME = 'user_verifications' THEN
    IF NEW.level_1_status IS DISTINCT FROM OLD.level_1_status OR 
       NEW.response_rate IS DISTINCT FROM OLD.response_rate THEN
      PERFORM recalculate_trust_score(NEW.user_id);
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trigger_recalc_trust_on_review ON property_reviews;
DROP TRIGGER IF EXISTS trigger_recalc_trust_on_report ON user_reports;
DROP TRIGGER IF EXISTS trigger_recalc_trust_on_verification ON user_verifications;

-- Create triggers
CREATE TRIGGER trigger_recalc_trust_on_review
AFTER INSERT OR UPDATE OR DELETE ON property_reviews
FOR EACH ROW
EXECUTE FUNCTION trigger_recalculate_trust_score();

CREATE TRIGGER trigger_recalc_trust_on_report
AFTER INSERT OR UPDATE ON user_reports
FOR EACH ROW
EXECUTE FUNCTION trigger_recalculate_trust_score();

CREATE TRIGGER trigger_recalc_trust_on_verification
AFTER UPDATE ON user_verifications
FOR EACH ROW
EXECUTE FUNCTION trigger_recalculate_trust_score();