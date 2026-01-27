-- Migration: Create Notifications Table
-- Purpose: Support in-app notifications for session events (creation, joins, reminders, etc.)
-- Date: 2026-01-27
-- Related: SHERPA-SESSION-OPEN-ENROLLMENT-PLAN.md

-- 1. Create notification type enum
DO $$ 
BEGIN
  CREATE TYPE public.notification_type AS ENUM (
    'session_created',
    'session_joined',
    'session_starting',
    'session_cancelled',
    'seeker_joined',
    'seeker_left',
    'session_reminder',
    'session_completed'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type public.notification_type NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  link_url text, -- Link to session detail page or related resource
  read boolean NOT NULL DEFAULT false,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  
  -- Metadata for filtering and context
  community_id uuid REFERENCES public.communities(id) ON DELETE SET NULL,
  session_id uuid REFERENCES public.sherpa_sessions(id) ON DELETE SET NULL,
  
  -- Additional metadata as JSONB for flexibility
  metadata jsonb DEFAULT '{}'::jsonb
);

-- 3. Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_notifications_profile_unread 
ON public.notifications(profile_id, read, created_at DESC)
WHERE read = false;

CREATE INDEX IF NOT EXISTS idx_notifications_profile_all 
ON public.notifications(profile_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_session 
ON public.notifications(session_id, created_at DESC)
WHERE session_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_community 
ON public.notifications(community_id, created_at DESC)
WHERE community_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_type 
ON public.notifications(type, created_at DESC);

-- 4. Add RLS policies
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can only view their own notifications
CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = profile_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

-- System can create notifications (via service role)
-- Note: This will be handled via service role key in server actions
-- No policy needed as service role bypasses RLS

-- 5. Add comments
COMMENT ON TABLE public.notifications IS 
  'In-app notifications for users. Tracks session events, reminders, and other important updates.';

COMMENT ON COLUMN public.notifications.type IS 
  'Type of notification: session_created, session_joined, session_starting, etc.';

COMMENT ON COLUMN public.notifications.metadata IS 
  'Additional context data as JSON. Can include user IDs, activity details, etc.';

-- 6. Create function to mark notifications as read
CREATE OR REPLACE FUNCTION public.mark_notification_read(notification_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.notifications
  SET read = true, read_at = now()
  WHERE id = notification_id AND profile_id = auth.uid();
END;
$$;

COMMENT ON FUNCTION public.mark_notification_read IS 
  'Marks a notification as read for the current user.';

-- 7. Create function to mark all notifications as read for a user
CREATE OR REPLACE FUNCTION public.mark_all_notifications_read()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.notifications
  SET read = true, read_at = now()
  WHERE profile_id = auth.uid() AND read = false;
END;
$$;

COMMENT ON FUNCTION public.mark_all_notifications_read IS 
  'Marks all unread notifications as read for the current user.';
