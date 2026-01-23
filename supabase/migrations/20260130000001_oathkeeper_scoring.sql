-- Oathkeeper Scoring Function Migration (Phase 2)
-- Implements Oathkeeper score calculation based on Destiny 2's Guided Games system

-- Function to calculate Oathkeeper score for a Sherpa
-- Formula: Weighted average of ratings over last 30 sessions
-- Weights: helpfulness (30%), patience (30%), teaching_skill (40%)
-- Score range: 0.00 to 100.00
CREATE OR REPLACE FUNCTION public.calculate_oathkeeper_score(sherpa_id_param uuid)
RETURNS numeric(5,2)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
DECLARE
  total_helpfulness numeric := 0;
  total_patience numeric := 0;
  total_teaching_skill numeric := 0;
  rating_count int := 0;
  avg_helpfulness numeric;
  avg_patience numeric;
  avg_teaching_skill numeric;
  final_score numeric(5,2);
BEGIN
  -- Get ratings from last 30 completed sessions
  SELECT 
    COALESCE(AVG(helpfulness_rating::numeric), 0),
    COALESCE(AVG(patience_rating::numeric), 0),
    COALESCE(AVG(teaching_skill_rating::numeric), 0),
    COUNT(*)
  INTO 
    avg_helpfulness,
    avg_patience,
    avg_teaching_skill,
    rating_count
  FROM public.oathkeeper_ratings otr
  INNER JOIN public.sherpa_sessions ss ON otr.session_id = ss.id
  WHERE ss.sherpa_id = sherpa_id_param
    AND ss.status = 'completed'
    AND otr.rated_profile_id IN (
      SELECT profile_id FROM public.sherpas WHERE id = sherpa_id_param
    )
  ORDER BY ss.actual_end DESC
  LIMIT 30;

  -- If no ratings, return 0
  IF rating_count = 0 THEN
    RETURN 0.00;
  END IF;

  -- Calculate weighted average
  -- helpfulness: 30%, patience: 30%, teaching_skill: 40%
  -- Convert 1-5 scale to 0-100 scale: (rating - 1) / 4 * 100
  final_score := (
    (avg_helpfulness - 1) / 4 * 100 * 0.30 +
    (avg_patience - 1) / 4 * 100 * 0.30 +
    (avg_teaching_skill - 1) / 4 * 100 * 0.40
  );

  -- Ensure score is between 0 and 100
  final_score := GREATEST(0.00, LEAST(100.00, final_score));

  RETURN ROUND(final_score, 2);
END;
$$;

-- Function to update Oathkeeper score for a Sherpa
-- Call this after a session is completed and ratings are submitted
DROP FUNCTION IF EXISTS public.update_sherpa_oathkeeper_score(uuid);
CREATE FUNCTION public.update_sherpa_oathkeeper_score(sherpa_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  new_score numeric(5,2);
BEGIN
  -- Calculate new score
  new_score := public.calculate_oathkeeper_score(sherpa_id_param);

  -- Update sherpa record
  UPDATE public.sherpas
  SET oathkeeper_score = new_score,
      updated_at = now()
  WHERE id = sherpa_id_param;
END;
$$;

-- Trigger function to auto-update Oathkeeper score when ratings are added
CREATE OR REPLACE FUNCTION public.trigger_update_oathkeeper_score()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  session_sherpa_id uuid;
BEGIN
  -- Get the sherpa_id from the session
  SELECT sherpa_id INTO session_sherpa_id
  FROM public.sherpa_sessions
  WHERE id = NEW.session_id;

  -- Update the sherpa's Oathkeeper score
  IF session_sherpa_id IS NOT NULL THEN
    PERFORM public.update_sherpa_oathkeeper_score(session_sherpa_id);
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger to auto-update score when ratings are inserted/updated
DROP TRIGGER IF EXISTS update_oathkeeper_on_rating ON public.oathkeeper_ratings;
CREATE TRIGGER update_oathkeeper_on_rating
  AFTER INSERT OR UPDATE ON public.oathkeeper_ratings
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_update_oathkeeper_score();

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.calculate_oathkeeper_score(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_sherpa_oathkeeper_score(uuid) TO authenticated;

-- Comments
COMMENT ON FUNCTION public.calculate_oathkeeper_score(uuid) IS 'Calculates Oathkeeper score (0-100) for a Sherpa based on last 30 sessions. Formula: helpfulness (30%) + patience (30%) + teaching_skill (40%).';
COMMENT ON FUNCTION public.update_sherpa_oathkeeper_score(uuid) IS 'Updates the Oathkeeper score for a Sherpa by recalculating from recent ratings.';
