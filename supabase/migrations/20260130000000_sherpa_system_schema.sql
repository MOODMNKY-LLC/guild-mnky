-- Sherpa System Schema Migration (Phase 2)
-- This migration creates the database schema for the Sherpa Hub system
-- Based on Destiny 2's Guided Games and Fireteam Finder concepts

-- 1. Create Enums

-- Sherpa application status
DO $$ BEGIN
  CREATE TYPE public.sherpa_status AS ENUM ('pending', 'approved', 'rejected', 'suspended');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Session status
DO $$ BEGIN
  CREATE TYPE public.session_status AS ENUM ('scheduled', 'in_progress', 'completed', 'cancelled', 'abandoned');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Sherpa Applications Table
-- Members apply to become Sherpas with experience details
CREATE TABLE IF NOT EXISTS public.sherpa_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  community_id uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  application_text text NOT NULL,
  experience_level text, -- e.g., "experienced", "veteran", "expert"
  preferred_activities text[], -- e.g., ["raids", "dungeons", "nightfalls"]
  bungie_profile_url text,
  status public.sherpa_status NOT NULL DEFAULT 'pending',
  reviewed_by uuid REFERENCES public.profiles(id),
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sherpa_applications_one_per_profile_community UNIQUE (profile_id, community_id)
);

-- 3. Sherpas Table
-- Created when application is approved, tracks Sherpa stats
CREATE TABLE IF NOT EXISTS public.sherpas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  community_id uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  application_id uuid REFERENCES public.sherpa_applications(id),
  oathkeeper_score numeric(5,2) NOT NULL DEFAULT 0.00, -- 0.00 to 100.00
  total_sessions_completed int NOT NULL DEFAULT 0,
  total_seekers_helped int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  bio text,
  specialties text[], -- Activity types they specialize in
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sherpas_one_per_profile_community UNIQUE (profile_id, community_id)
);

-- 4. Sherpa Requests Table
-- Seekers request help from Sherpas
CREATE TABLE IF NOT EXISTS public.sherpa_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seeker_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  community_id uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  activity_type text NOT NULL, -- e.g., "raid", "dungeon", "nightfall"
  activity_name text, -- e.g., "Vault of Glass", "Prophecy"
  difficulty text, -- e.g., "normal", "master", "grandmaster"
  requested_slots int NOT NULL DEFAULT 1, -- How many players need help
  preferred_time_window timestamptz, -- When they want to play
  description text,
  status text NOT NULL DEFAULT 'open', -- 'open', 'matched', 'completed', 'cancelled'
  matched_sherpa_id uuid REFERENCES public.sherpas(id),
  matched_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 5. Sherpa Sessions Table
-- Tracks actual Sherpa sessions (matches between Sherpa and Seekers)
CREATE TABLE IF NOT EXISTS public.sherpa_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sherpa_id uuid NOT NULL REFERENCES public.sherpas(id) ON DELETE CASCADE,
  community_id uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  request_id uuid REFERENCES public.sherpa_requests(id),
  activity_type text NOT NULL,
  activity_name text,
  difficulty text,
  scheduled_start timestamptz NOT NULL,
  scheduled_end timestamptz,
  actual_start timestamptz,
  actual_end timestamptz,
  status public.session_status NOT NULL DEFAULT 'scheduled',
  seeker_ids uuid[] NOT NULL DEFAULT '{}', -- Array of profile IDs
  guardian_oath_accepted_by uuid[] NOT NULL DEFAULT '{}', -- Profile IDs who accepted oath
  notes text, -- Post-session notes from Sherpa
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 6. Oathkeeper Ratings Table
-- Post-session ratings from Seekers to Sherpas (and vice versa)
CREATE TABLE IF NOT EXISTS public.oathkeeper_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.sherpa_sessions(id) ON DELETE CASCADE,
  rater_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rated_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  helpfulness_rating int CHECK (helpfulness_rating >= 1 AND helpfulness_rating <= 5),
  patience_rating int CHECK (patience_rating >= 1 AND patience_rating <= 5),
  teaching_skill_rating int CHECK (teaching_skill_rating >= 1 AND teaching_skill_rating <= 5),
  overall_rating int CHECK (overall_rating >= 1 AND overall_rating <= 5),
  feedback_text text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT oathkeeper_ratings_one_per_session_rater UNIQUE (session_id, rater_profile_id, rated_profile_id)
);

-- 7. Guardian Oath Acceptances Table
-- Tracks who has accepted the Guardian Oath for each session
CREATE TABLE IF NOT EXISTS public.guardian_oath_acceptances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.sherpa_sessions(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  accepted_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT guardian_oath_one_per_session_profile UNIQUE (session_id, profile_id)
);

-- 8. Oathbreaker Penalties Table
-- Tracks penalties for abandoning sessions without consensus
CREATE TABLE IF NOT EXISTS public.oathbreaker_penalties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  session_id uuid REFERENCES public.sherpa_sessions(id),
  penalty_type text NOT NULL, -- 'abandoned_session', 'repeated_offense'
  penalty_start timestamptz NOT NULL DEFAULT now(),
  penalty_end timestamptz NOT NULL, -- When penalty expires
  is_active boolean NOT NULL DEFAULT true,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 9. Create Indexes for Performance

-- Sherpa applications
CREATE INDEX IF NOT EXISTS idx_sherpa_applications_profile ON public.sherpa_applications(profile_id);
CREATE INDEX IF NOT EXISTS idx_sherpa_applications_community ON public.sherpa_applications(community_id);
CREATE INDEX IF NOT EXISTS idx_sherpa_applications_status ON public.sherpa_applications(status);

-- Sherpas
CREATE INDEX IF NOT EXISTS idx_sherpas_profile ON public.sherpas(profile_id);
CREATE INDEX IF NOT EXISTS idx_sherpas_community ON public.sherpas(community_id);
CREATE INDEX IF NOT EXISTS idx_sherpas_active ON public.sherpas(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_sherpas_oathkeeper_score ON public.sherpas(oathkeeper_score DESC);

-- Sherpa requests
CREATE INDEX IF NOT EXISTS idx_sherpa_requests_seeker ON public.sherpa_requests(seeker_profile_id);
CREATE INDEX IF NOT EXISTS idx_sherpa_requests_community ON public.sherpa_requests(community_id);
CREATE INDEX IF NOT EXISTS idx_sherpa_requests_status ON public.sherpa_requests(status);
CREATE INDEX IF NOT EXISTS idx_sherpa_requests_activity ON public.sherpa_requests(activity_type);

-- Sherpa sessions
CREATE INDEX IF NOT EXISTS idx_sherpa_sessions_sherpa ON public.sherpa_sessions(sherpa_id);
CREATE INDEX IF NOT EXISTS idx_sherpa_sessions_community ON public.sherpa_sessions(community_id);
CREATE INDEX IF NOT EXISTS idx_sherpa_sessions_status ON public.sherpa_sessions(status);
CREATE INDEX IF NOT EXISTS idx_sherpa_sessions_scheduled_start ON public.sherpa_sessions(scheduled_start);

-- Oathkeeper ratings
CREATE INDEX IF NOT EXISTS idx_oathkeeper_ratings_session ON public.oathkeeper_ratings(session_id);
CREATE INDEX IF NOT EXISTS idx_oathkeeper_ratings_rated ON public.oathkeeper_ratings(rated_profile_id);

-- Oathbreaker penalties
CREATE INDEX IF NOT EXISTS idx_oathbreaker_penalties_profile_active ON public.oathbreaker_penalties(profile_id, is_active) WHERE is_active = true;

-- 10. Create Updated At Triggers

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to tables with updated_at
CREATE TRIGGER update_sherpa_applications_updated_at
  BEFORE UPDATE ON public.sherpa_applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sherpas_updated_at
  BEFORE UPDATE ON public.sherpas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sherpa_requests_updated_at
  BEFORE UPDATE ON public.sherpa_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sherpa_sessions_updated_at
  BEFORE UPDATE ON public.sherpa_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 11. Enable Row Level Security

ALTER TABLE public.sherpa_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sherpas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sherpa_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sherpa_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oathkeeper_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guardian_oath_acceptances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oathbreaker_penalties ENABLE ROW LEVEL SECURITY;

-- 12. RLS Policies (Basic - will be expanded in future migrations)

-- Sherpa applications: Users can read all, create their own, update their own
CREATE POLICY "Users can view all sherpa applications"
  ON public.sherpa_applications FOR SELECT
  USING (true);

CREATE POLICY "Users can create their own sherpa application"
  ON public.sherpa_applications FOR INSERT
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Users can update their own sherpa application"
  ON public.sherpa_applications FOR UPDATE
  USING (auth.uid() = profile_id);

-- Sherpas: Users can read all active sherpas
CREATE POLICY "Users can view all sherpas"
  ON public.sherpas FOR SELECT
  USING (true);

-- Sherpa requests: Users can read all, create their own, update their own
CREATE POLICY "Users can view all sherpa requests"
  ON public.sherpa_requests FOR SELECT
  USING (true);

CREATE POLICY "Users can create their own sherpa request"
  ON public.sherpa_requests FOR INSERT
  WITH CHECK (auth.uid() = seeker_profile_id);

CREATE POLICY "Users can update their own sherpa request"
  ON public.sherpa_requests FOR UPDATE
  USING (auth.uid() = seeker_profile_id);

-- Sherpa sessions: Users can read all, create/update if they're the sherpa or a seeker
CREATE POLICY "Users can view all sherpa sessions"
  ON public.sherpa_sessions FOR SELECT
  USING (true);

CREATE POLICY "Sherpas can create sessions"
  ON public.sherpa_sessions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sherpas
      WHERE id = sherpa_id AND profile_id = auth.uid()
    )
  );

CREATE POLICY "Sherpas can update their sessions"
  ON public.sherpa_sessions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.sherpas
      WHERE id = sherpa_id AND profile_id = auth.uid()
    )
  );

-- Oathkeeper ratings: Users can read all, create their own
CREATE POLICY "Users can view all oathkeeper ratings"
  ON public.oathkeeper_ratings FOR SELECT
  USING (true);

CREATE POLICY "Users can create their own oathkeeper rating"
  ON public.oathkeeper_ratings FOR INSERT
  WITH CHECK (auth.uid() = rater_profile_id);

-- Guardian oath acceptances: Users can read all, create their own
CREATE POLICY "Users can view all guardian oath acceptances"
  ON public.guardian_oath_acceptances FOR SELECT
  USING (true);

CREATE POLICY "Users can create their own guardian oath acceptance"
  ON public.guardian_oath_acceptances FOR INSERT
  WITH CHECK (auth.uid() = profile_id);

-- Oathbreaker penalties: Users can read their own
CREATE POLICY "Users can view their own oathbreaker penalties"
  ON public.oathbreaker_penalties FOR SELECT
  USING (auth.uid() = profile_id);

-- 13. Comments for Documentation

COMMENT ON TABLE public.sherpa_applications IS 'Applications from members to become Sherpas. One application per profile per community.';
COMMENT ON TABLE public.sherpas IS 'Approved Sherpas with Oathkeeper scores and session statistics.';
COMMENT ON TABLE public.sherpa_requests IS 'Requests from Seekers for help with activities. Can be matched to Sherpas.';
COMMENT ON TABLE public.sherpa_sessions IS 'Actual Sherpa sessions tracking scheduled and completed teaching runs.';
COMMENT ON TABLE public.oathkeeper_ratings IS 'Post-session ratings from Seekers to Sherpas (and vice versa) for Oathkeeper score calculation.';
COMMENT ON TABLE public.guardian_oath_acceptances IS 'Tracks who has accepted the Guardian Oath for each session.';
COMMENT ON TABLE public.oathbreaker_penalties IS 'Penalties for abandoning sessions without consensus. Prevents joining new sessions until penalty expires.';

COMMENT ON COLUMN public.sherpas.oathkeeper_score IS 'Weighted average rating (0-100) based on last 30 sessions. Formula: helpfulness (30%) + patience (30%) + teaching_skill (40%).';
-- Note: seeker_ids and guardian_oath_accepted_by are tracked via sherpa_session_participants table
