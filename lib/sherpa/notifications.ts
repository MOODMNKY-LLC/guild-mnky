/**
 * Notification Helper Functions
 * 
 * Functions to create and manage in-app notifications for Sherpa sessions
 */

import { getAdminClient } from '@/lib/supabase/admin';

export type NotificationType = 
  | 'session_created'
  | 'session_joined'
  | 'session_starting'
  | 'session_cancelled'
  | 'seeker_joined'
  | 'seeker_left'
  | 'session_reminder'
  | 'session_completed';

export interface CreateNotificationInput {
  profileId: string;
  type: NotificationType;
  title: string;
  message: string;
  linkUrl?: string;
  communityId?: string;
  sessionId?: string;
  metadata?: Record<string, any>;
}

/**
 * Create a notification for a user
 * Uses admin client to bypass RLS
 */
export async function createNotification(input: CreateNotificationInput) {
  const supabase = getAdminClient();

  const notificationData: any = {
    profile_id: input.profileId,
    type: input.type,
    title: input.title,
    message: input.message,
    link_url: input.linkUrl || null,
    community_id: input.communityId || null,
    session_id: input.sessionId || null,
    metadata: input.metadata || {},
  };

  const { data, error } = await supabase
    .from('notifications')
    .insert(notificationData)
    .select()
    .single();

  if (error) {
    console.error('Error creating notification:', error);
    throw new Error(`Failed to create notification: ${error.message}`);
  }

  return data;
}

/**
 * Create notifications for verified Seekers when a new session is created
 */
export async function notifySessionCreated(
  sessionId: string,
  communityId: string,
  activityType: string,
  activityName?: string,
  scheduledStart?: string
) {
  const supabase = getAdminClient();

  // Get all verified Seekers in the community
  const VERIFIED_GUARDIAN_ROLE_ID = process.env.NEXT_PUBLIC_VERIFIED_GUARDIAN_ROLE_ID;
  
  let query = supabase
    .from('profiles')
    .select('id')
    .eq('community_id', communityId);

  // Filter to only verified Seekers if role ID is configured
  if (VERIFIED_GUARDIAN_ROLE_ID) {
    query = query.contains('discord_role_ids', [VERIFIED_GUARDIAN_ROLE_ID]);
  }

  const { data: verifiedSeekers } = await query;

  if (!verifiedSeekers || verifiedSeekers.length === 0) {
    return;
  }

  const activityDisplay = activityName || activityType;
  const startTime = scheduledStart 
    ? new Date(scheduledStart).toLocaleString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : 'TBD';

  // Create notifications for all verified Seekers
  const notifications = (verifiedSeekers || []).map((seeker: any) => ({
    profile_id: seeker.id,
    type: 'session_created' as NotificationType,
    title: `New Sherpa Session: ${activityDisplay}`,
    message: `A new ${activityType} session has been created${scheduledStart ? ` starting ${startTime}` : ''}. Join now to learn from an experienced Sherpa!`,
    link_url: `/sherpa/sessions/${sessionId}`,
    community_id: communityId,
    session_id: sessionId,
    metadata: {
      activity_type: activityType,
      activity_name: activityName,
      scheduled_start: scheduledStart,
    },
  }));

  const { error } = await supabase
    .from('notifications')
    .insert(notifications as any);

  if (error) {
    console.error('Error creating session notifications:', error);
  }
}

/**
 * Notify Sherpa when a Seeker joins their session
 */
export async function notifySeekerJoined(
  sessionId: string,
  seekerId: string,
  seekerName: string,
  sherpaId: string
) {
  await createNotification({
    profileId: sherpaId,
    type: 'seeker_joined',
    title: 'Seeker Joined Session',
    message: `${seekerName} has joined your session.`,
    linkUrl: `/sherpa/sessions/${sessionId}`,
    sessionId,
    metadata: {
      seeker_id: seekerId,
      seeker_name: seekerName,
    },
  });
}

/**
 * Notify Sherpa when a Seeker leaves their session
 */
export async function notifySeekerLeft(
  sessionId: string,
  seekerId: string,
  seekerName: string,
  sherpaId: string
) {
  await createNotification({
    profileId: sherpaId,
    type: 'seeker_left',
    title: 'Seeker Left Session',
    message: `${seekerName} has left your session.`,
    linkUrl: `/sherpa/sessions/${sessionId}`,
    sessionId,
    metadata: {
      seeker_id: seekerId,
      seeker_name: seekerName,
    },
  });
}
