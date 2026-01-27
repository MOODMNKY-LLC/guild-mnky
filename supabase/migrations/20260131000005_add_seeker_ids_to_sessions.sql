-- Migration: Add seeker_ids column to sherpa_sessions table
-- Purpose: Add the seeker_ids array column that was defined in the schema but not applied
--          due to CREATE TABLE IF NOT EXISTS not adding columns to existing tables
-- Affected Tables: sherpa_sessions
-- Date: 2026-01-27

-- Add seeker_ids column to track which seekers are participating in the session
-- This is an array of profile IDs (UUIDs) representing the seekers in the session
-- The column defaults to an empty array, allowing sessions to be created without seekers initially
-- but the application logic requires at least one seeker for a valid session
ALTER TABLE public.sherpa_sessions
ADD COLUMN IF NOT EXISTS seeker_ids uuid[] NOT NULL DEFAULT '{}';

-- Add comment explaining the column's purpose and relationship to sherpa_session_participants
COMMENT ON COLUMN public.sherpa_sessions.seeker_ids IS 
  'Array of profile IDs representing seekers participating in this session. '
  'This is a denormalized field for quick access; detailed participant tracking '
  'is handled by the sherpa_session_participants table.';
