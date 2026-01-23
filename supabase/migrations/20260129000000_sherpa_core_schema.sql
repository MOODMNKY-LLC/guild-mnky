-- Sherpa Core Features Migration (Phase 2)
-- This migration creates all tables, enums, and functions needed for Sherpa functionality
-- Aligned with Discord Bot Integration Plan command specifications

-- 1. Create enums for status tracking
CREATE TYPE public.sherpa_application_status AS ENUM ('pending', 'approved', 'denied');
CREATE TYPE public.sherpa_request_status AS ENUM ('open', 'claimed', 'completed', 'cancelled', 'expired');
CREATE TYPE public.sherpa_session_status AS ENUM ('scheduled', 'in_progress', 'completed', 'cancelled', 'abandoned', 'resigned');
CREATE TYPE public.sherpa_role_type AS ENUM ('sherpa', 'seeker');

-- 2. Sherpa Applications Table
-- Matches /sherpa apply modal fields: experience_level, specialties, availability, motivation, discord_username
CREATE TABLE IF NOT EXISTS public.sherpa_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  community_id uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  
  -- Application fields (from /sherpa apply modal)
  experience_level text NOT NULL, -- e.g., "1000+ hours, multiple raid clears"
  specialties text NOT NULL, -- e.g., "Raids, Dungeons, PvP"
  availability text NOT NULL, -- e.g., "Weekends 2-8 PM EST"
  motivation text NOT NULL, -- "Why do you want to be a Sherpa?" (paragraph)
  discord_username text NOT NULL, -- Discord username#1234
  
  -- Application metadata
  status public.sherpa_application_status NOT NULL DEFAULT 'pending',
  reviewed_by uuid REFERENCES public.profiles(id),
  reviewed_at timestamptz,
  review_reason text, -- Reason for approval/denial (from /sherpa-admin review)
  
  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- Constraints
  CONSTRAINT sherpa_applications_one_per_profile_community UNIQUE (profile_id, community_id)
);

-- 3. Sherpas Table (created when application is approved)
CREATE TABLE IF NOT EXISTS public.sherpas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  community_id uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  application_id uuid REFERENCES public.sherpa_applications(id),
  
  -- Sherpa profile data (from application)
  specialties text NOT NULL, -- Copied from application
  availability text, -- Copied from application
  
  -- Oath tracking
  oath_accepted boolean NOT NULL DEFAULT false,
  oath_accepted_at timestamptz,
  
  -- Statistics
  oathkeeper_score numeric(5,2) NOT NULL DEFAULT 0.00, -- 0.00 to 100.00 (average of ratings)
  total_sessions_completed int NOT NULL DEFAULT 0,
  total_seekers_helped int NOT NULL DEFAULT 0,
  
  -- Status
  is_active boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'active', -- 'active', 'inactive', 'suspended'
  
  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- Constraints
  CONSTRAINT sherpas_one_per_profile_community UNIQUE (profile_id, community_id)
);

-- 4. Sherpa Requests Table (Seeker requests)
-- Matches /sherpa request command options: activity, difficulty, scheduled_time, notes
CREATE TABLE IF NOT EXISTS public.sherpa_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seeker_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  community_id uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  
  -- Request details (from /sherpa request command)
  activity_type text NOT NULL, -- e.g., "Last Wish Raid", "Dungeon: Prophecy"
  difficulty text, -- 'Normal', 'Master', 'Grandmaster' (nullable)
  scheduled_time timestamptz, -- ISO 8601 timestamp (nullable for "play now")
  notes text, -- Additional details (max 500 chars, nullable)
  
  -- Request metadata
  status public.sherpa_request_status NOT NULL DEFAULT 'open',
  claimed_by uuid REFERENCES public.sherpas(id), -- Sherpa who claimed the request
  claimed_at timestamptz,
  
  -- Expiration (auto-expire after 7 days if unclaimed)
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  
  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 5. Sherpa Sessions Table (actual teaching sessions)
CREATE TABLE IF NOT EXISTS public.sherpa_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sherpa_id uuid NOT NULL REFERENCES public.sherpas(id) ON DELETE CASCADE,
  request_id uuid REFERENCES public.sherpa_requests(id), -- Optional: linked to original request
  community_id uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  
  -- Session details
  activity_type text NOT NULL,
  activity_name text, -- Specific activity name
  difficulty text,
  
  -- Scheduling
  scheduled_start timestamptz NOT NULL,
  scheduled_end timestamptz, -- Optional end time
  actual_start timestamptz,
  actual_end timestamptz,
  
  -- Status tracking
  status public.sherpa_session_status NOT NULL DEFAULT 'scheduled',
  
  -- Guardian Oath tracking (session-level)
  guardian_oath_accepted boolean NOT NULL DEFAULT false,
  oath_accepted_at timestamptz,
  
  -- Resignation tracking (vote to resign)
  resigned_at timestamptz, -- Set when majority votes to resign
  resignation_vote_count int NOT NULL DEFAULT 0, -- Track votes
  
  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 6. Sherpa Session Participants Table
CREATE TABLE IF NOT EXISTS public.sherpa_session_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.sherpa_sessions(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Participant role
  role public.sherpa_role_type NOT NULL, -- 'sherpa' or 'seeker'
  
  -- Guardian Oath acceptance (per-participant)
  guardian_oath_accepted boolean NOT NULL DEFAULT false,
  oath_accepted_at timestamptz,
  
  -- Participation tracking
  joined_at timestamptz NOT NULL DEFAULT now(),
  left_at timestamptz,
  left_reason text, -- 'completed', 'vote_to_resign', 'abandoned', 'disconnected'
  
  -- Constraints
  CONSTRAINT sherpa_session_participants_unique UNIQUE (session_id, profile_id)
);

-- 7. Sherpa Session Votes Table (for vote to resign)
-- Supports /sherpa vote-resign command
CREATE TABLE IF NOT EXISTS public.sherpa_session_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.sherpa_sessions(id) ON DELETE CASCADE,
  voter_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Vote details
  vote_type text NOT NULL DEFAULT 'resign', -- 'resign' (for now, extensible)
  voted_at timestamptz NOT NULL DEFAULT now(),
  
  -- Constraints
  CONSTRAINT sherpa_session_votes_unique UNIQUE (session_id, voter_profile_id)
);

-- 8. Sherpa Ratings Table (post-session ratings)
-- Matches /sherpa rating command: rating (1-5), comments
CREATE TABLE IF NOT EXISTS public.sherpa_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.sherpa_sessions(id) ON DELETE CASCADE,
  rater_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rated_sherpa_id uuid NOT NULL REFERENCES public.sherpas(id) ON DELETE CASCADE,
  
  -- Rating details (from /sherpa rating modal)
  rating int NOT NULL CHECK (rating >= 1 AND rating <= 5), -- 1-5 scale
  comments text, -- Optional comments (paragraph)
  
  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  
  -- Constraints
  CONSTRAINT sherpa_ratings_one_per_session_rater UNIQUE (session_id, rater_profile_id)
);

-- 9. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sherpa_applications_profile ON public.sherpa_applications(profile_id);
CREATE INDEX IF NOT EXISTS idx_sherpa_applications_community ON public.sherpa_applications(community_id);
CREATE INDEX IF NOT EXISTS idx_sherpa_applications_status ON public.sherpa_applications(status);
CREATE INDEX IF NOT EXISTS idx_sherpa_applications_created_at ON public.sherpa_applications(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sherpas_profile ON public.sherpas(profile_id);
CREATE INDEX IF NOT EXISTS idx_sherpas_community ON public.sherpas(community_id);
CREATE INDEX IF NOT EXISTS idx_sherpas_active ON public.sherpas(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_sherpas_oathkeeper_score ON public.sherpas(oathkeeper_score DESC);

CREATE INDEX IF NOT EXISTS idx_sherpa_requests_seeker ON public.sherpa_requests(seeker_profile_id);
CREATE INDEX IF NOT EXISTS idx_sherpa_requests_community ON public.sherpa_requests(community_id);
CREATE INDEX IF NOT EXISTS idx_sherpa_requests_status ON public.sherpa_requests(status);
CREATE INDEX IF NOT EXISTS idx_sherpa_requests_claimed_by ON public.sherpa_requests(claimed_by) WHERE claimed_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sherpa_requests_expires_at ON public.sherpa_requests(expires_at) WHERE status = 'open';

CREATE INDEX IF NOT EXISTS idx_sherpa_sessions_sherpa ON public.sherpa_sessions(sherpa_id);
CREATE INDEX IF NOT EXISTS idx_sherpa_sessions_community ON public.sherpa_sessions(community_id);
CREATE INDEX IF NOT EXISTS idx_sherpa_sessions_status ON public.sherpa_sessions(status);
CREATE INDEX IF NOT EXISTS idx_sherpa_sessions_scheduled_start ON public.sherpa_sessions(scheduled_start);
CREATE INDEX IF NOT EXISTS idx_sherpa_sessions_request ON public.sherpa_sessions(request_id) WHERE request_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sherpa_session_participants_session ON public.sherpa_session_participants(session_id);
CREATE INDEX IF NOT EXISTS idx_sherpa_session_participants_profile ON public.sherpa_session_participants(profile_id);
CREATE INDEX IF NOT EXISTS idx_sherpa_session_participants_role ON public.sherpa_session_participants(role);

CREATE INDEX IF NOT EXISTS idx_sherpa_session_votes_session ON public.sherpa_session_votes(session_id);
CREATE INDEX IF NOT EXISTS idx_sherpa_session_votes_voter ON public.sherpa_session_votes(voter_profile_id);

CREATE INDEX IF NOT EXISTS idx_sherpa_ratings_session ON public.sherpa_ratings(session_id);
CREATE INDEX IF NOT EXISTS idx_sherpa_ratings_rated_sherpa ON public.sherpa_ratings(rated_sherpa_id);
CREATE INDEX IF NOT EXISTS idx_sherpa_ratings_rater ON public.sherpa_ratings(rater_profile_id);

-- 10. Helper function to calculate Oathkeeper Score
-- Called after rating submission to update Sherpa's score
CREATE OR REPLACE FUNCTION public.update_sherpa_oathkeeper_score(sherpa_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  avg_rating numeric(5,2);
BEGIN
  -- Calculate average rating (convert 1-5 scale to 0-100 scale: rating * 20)
  SELECT AVG(rating * 20.0) INTO avg_rating
  FROM public.sherpa_ratings
  WHERE rated_sherpa_id = (
    SELECT id FROM public.sherpas WHERE id = sherpa_uuid
  );
  
  -- Update Sherpa's Oathkeeper Score
  UPDATE public.sherpas
  SET oathkeeper_score = COALESCE(avg_rating, 0.00),
      updated_at = now()
  WHERE id = sherpa_uuid;
END;
$$;

-- 11. Helper function to check if vote to resign has majority
-- Returns true if 50%+1 of participants have voted to resign
CREATE OR REPLACE FUNCTION public.check_resignation_majority(session_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
DECLARE
  total_participants int;
  votes_count int;
BEGIN
  -- Get total participants
  SELECT COUNT(*) INTO total_participants
  FROM public.sherpa_session_participants
  WHERE session_id = session_uuid;
  
  -- Get resignation votes
  SELECT COUNT(*) INTO votes_count
  FROM public.sherpa_session_votes
  WHERE session_id = session_uuid AND vote_type = 'resign';
  
  -- Check if majority (50%+1)
  RETURN votes_count >= ((total_participants / 2) + 1);
END;
$$;

-- 12. Helper function to get session participant count
CREATE OR REPLACE FUNCTION public.get_session_participant_count(session_uuid uuid)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
DECLARE
  participant_count int;
BEGIN
  SELECT COUNT(*) INTO participant_count
  FROM public.sherpa_session_participants
  WHERE session_id = session_uuid;
  
  RETURN participant_count;
END;
$$;

-- 13. Grant execute permissions on helper functions
GRANT EXECUTE ON FUNCTION public.update_sherpa_oathkeeper_score(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_resignation_majority(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_session_participant_count(uuid) TO authenticated;

-- 14. Row Level Security (RLS) Policies
-- Enable RLS on all tables
ALTER TABLE public.sherpa_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sherpas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sherpa_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sherpa_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sherpa_session_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sherpa_session_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sherpa_ratings ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can read their own applications
CREATE POLICY "sherpa_applications_read_own"
ON public.sherpa_applications FOR SELECT
TO authenticated
USING (profile_id = auth.uid());

-- RLS Policy: Users can create their own applications
CREATE POLICY "sherpa_applications_create_own"
ON public.sherpa_applications FOR INSERT
TO authenticated
WITH CHECK (profile_id = auth.uid());

-- RLS Policy: Admins can read all applications (for review)
CREATE POLICY "sherpa_applications_read_community"
ON public.sherpa_applications FOR SELECT
TO authenticated
USING (
  community_id IN (
    SELECT community_id FROM public.profiles WHERE id = auth.uid()
  )
);

-- RLS Policy: Users can read Sherpa profiles in their community
CREATE POLICY "sherpas_read_community"
ON public.sherpas FOR SELECT
TO authenticated
USING (
  community_id IN (
    SELECT community_id FROM public.profiles WHERE id = auth.uid()
  )
);

-- RLS Policy: Users can read requests in their community
CREATE POLICY "sherpa_requests_read_community"
ON public.sherpa_requests FOR SELECT
TO authenticated
USING (
  community_id IN (
    SELECT community_id FROM public.profiles WHERE id = auth.uid()
  )
);

-- RLS Policy: Users can create requests
CREATE POLICY "sherpa_requests_create_own"
ON public.sherpa_requests FOR INSERT
TO authenticated
WITH CHECK (seeker_profile_id = auth.uid());

-- RLS Policy: Users can read sessions in their community
CREATE POLICY "sherpa_sessions_read_community"
ON public.sherpa_sessions FOR SELECT
TO authenticated
USING (
  community_id IN (
    SELECT community_id FROM public.profiles WHERE id = auth.uid()
  )
);

-- RLS Policy: Participants can read their session participants
CREATE POLICY "sherpa_session_participants_read_own"
ON public.sherpa_session_participants FOR SELECT
TO authenticated
USING (
  profile_id = auth.uid() OR
  session_id IN (
    SELECT id FROM public.sherpa_sessions WHERE sherpa_id IN (
      SELECT id FROM public.sherpas WHERE profile_id = auth.uid()
    )
  )
);

-- RLS Policy: Users can create participant records (join sessions)
CREATE POLICY "sherpa_session_participants_create_own"
ON public.sherpa_session_participants FOR INSERT
TO authenticated
WITH CHECK (profile_id = auth.uid());

-- RLS Policy: Users can read votes for sessions they're in
CREATE POLICY "sherpa_session_votes_read_own"
ON public.sherpa_session_votes FOR SELECT
TO authenticated
USING (
  voter_profile_id = auth.uid() OR
  session_id IN (
    SELECT session_id FROM public.sherpa_session_participants WHERE profile_id = auth.uid()
  )
);

-- RLS Policy: Users can create votes for sessions they're in
CREATE POLICY "sherpa_session_votes_create_own"
ON public.sherpa_session_votes FOR INSERT
TO authenticated
WITH CHECK (
  voter_profile_id = auth.uid() AND
  session_id IN (
    SELECT session_id FROM public.sherpa_session_participants WHERE profile_id = auth.uid()
  )
);

-- RLS Policy: Users can read ratings for sessions they participated in
CREATE POLICY "sherpa_ratings_read_own"
ON public.sherpa_ratings FOR SELECT
TO authenticated
USING (
  rater_profile_id = auth.uid() OR
  rated_sherpa_id IN (
    SELECT id FROM public.sherpas WHERE profile_id = auth.uid()
  )
);

-- RLS Policy: Users can create ratings for sessions they participated in
CREATE POLICY "sherpa_ratings_create_own"
ON public.sherpa_ratings FOR INSERT
TO authenticated
WITH CHECK (
  rater_profile_id = auth.uid() AND
  session_id IN (
    SELECT session_id FROM public.sherpa_session_participants WHERE profile_id = auth.uid()
  )
);

-- 15. Add comments for documentation
COMMENT ON TABLE public.sherpa_applications IS 'Sherpa applications submitted via /sherpa apply command. Fields match Discord modal inputs.';
COMMENT ON TABLE public.sherpas IS 'Approved Sherpa profiles. Created when application is approved via /sherpa-admin review.';
COMMENT ON TABLE public.sherpa_requests IS 'Seeker requests created via /sherpa request command. Auto-expires after 7 days if unclaimed.';
COMMENT ON TABLE public.sherpa_sessions IS 'Teaching sessions between Sherpas and Seekers. Tracks Guardian Oath acceptance and resignation votes.';
COMMENT ON TABLE public.sherpa_session_participants IS 'Participants in Sherpa sessions (Sherpa + Seekers). Tracks individual Guardian Oath acceptance.';
COMMENT ON TABLE public.sherpa_session_votes IS 'Votes for session resignation via /sherpa vote-resign command. Used to determine majority consensus.';
COMMENT ON TABLE public.sherpa_ratings IS 'Post-session ratings submitted via /sherpa rating command. Used to calculate Oathkeeper Score.';
COMMENT ON FUNCTION public.update_sherpa_oathkeeper_score(uuid) IS 'Updates Sherpa Oathkeeper Score based on average of all ratings (1-5 scale converted to 0-100).';
COMMENT ON FUNCTION public.check_resignation_majority(uuid) IS 'Checks if 50%+1 of session participants have voted to resign. Returns true if majority reached.';
COMMENT ON FUNCTION public.get_session_participant_count(uuid) IS 'Returns total number of participants in a session.';
