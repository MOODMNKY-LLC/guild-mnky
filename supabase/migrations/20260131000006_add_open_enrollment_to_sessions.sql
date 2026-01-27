-- Migration: Add Open Enrollment Support to Sherpa Sessions
-- Purpose: Enable Sherpas to create sessions without Seekers upfront, allow Seekers to discover and join
-- Date: 2026-01-27
-- Related: SHERPA-SESSION-OPEN-ENROLLMENT-PLAN.md

-- 1. Add 'open_for_enrollment' status to sherpa_session_status enum
-- Note: Using ALTER TYPE ADD VALUE requires careful handling - cannot be rolled back easily
-- The table uses sherpa_session_status enum, not session_status
DO $$ 
BEGIN
  -- Check if value already exists before adding
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'open_for_enrollment' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'sherpa_session_status')
  ) THEN
    ALTER TYPE public.sherpa_session_status ADD VALUE 'open_for_enrollment';
  END IF;
END $$;

-- 2. Add new columns to sherpa_sessions table
ALTER TABLE public.sherpa_sessions
ADD COLUMN IF NOT EXISTS max_seekers int NOT NULL DEFAULT 5,
ADD COLUMN IF NOT EXISTS is_open_for_enrollment boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS enrollment_closes_at timestamptz,
ADD COLUMN IF NOT EXISTS description text;

-- 3. Update existing sessions: if seeker_ids is empty, set is_open_for_enrollment = true
-- This allows backward compatibility - sessions with Seekers remain closed, empty ones become open
UPDATE public.sherpa_sessions
SET is_open_for_enrollment = true
WHERE array_length(seeker_ids, 1) IS NULL OR array_length(seeker_ids, 1) = 0;

-- 4. Set max_seekers based on activity_type for existing sessions
-- Default to safe values based on activity type
UPDATE public.sherpa_sessions
SET max_seekers = CASE
  WHEN activity_type = 'raid' THEN 5  -- 6 total - 1 sherpa = 5 seekers
  WHEN activity_type = 'dungeon' THEN 2  -- 3 total - 1 sherpa = 2 seekers
  WHEN activity_type = 'nightfall' THEN 2  -- 3 total - 1 sherpa = 2 seekers
  WHEN activity_type = 'pvp' THEN 5  -- Default to 6 total (Control/Iron Banner)
  WHEN activity_type = 'gambit' THEN 3  -- 4 total - 1 sherpa = 3 seekers
  ELSE 5  -- Safe default for 'other' or unknown types
END
WHERE max_seekers = 5; -- Only update default values

-- 5. Create indexes for efficient querying
-- Index for open enrollment sessions (using text comparison in application layer)
CREATE INDEX IF NOT EXISTS idx_sherpa_sessions_open_enrollment 
ON public.sherpa_sessions(is_open_for_enrollment, scheduled_start)
WHERE is_open_for_enrollment = true;

CREATE INDEX IF NOT EXISTS idx_sherpa_sessions_activity_type 
ON public.sherpa_sessions(activity_type, status, scheduled_start);

CREATE INDEX IF NOT EXISTS idx_sherpa_sessions_enrollment_closes 
ON public.sherpa_sessions(enrollment_closes_at)
WHERE enrollment_closes_at IS NOT NULL;

-- 6. Add comments for documentation
COMMENT ON COLUMN public.sherpa_sessions.max_seekers IS 
  'Maximum number of Seekers allowed in this session. Calculated from activity_type fireteam limits (Raids: 5, Dungeons: 2, Nightfalls: 2, etc.). Total fireteam = 1 Sherpa + max_seekers Seekers.';

COMMENT ON COLUMN public.sherpa_sessions.is_open_for_enrollment IS 
  'Whether Seekers can join this session. When true, verified Seekers can discover and join the session. When false, only pre-selected Seekers (in seeker_ids) can participate.';

COMMENT ON COLUMN public.sherpa_sessions.enrollment_closes_at IS 
  'Optional timestamp when enrollment closes. If set, Seekers cannot join after this time. If null, enrollment closes when session starts or is manually closed by Sherpa.';

COMMENT ON COLUMN public.sherpa_sessions.description IS 
  'Optional detailed description of the session. Can include requirements, goals, teaching focus, etc.';
