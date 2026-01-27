'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/server'
import { redirect } from 'next/navigation'
import { getUserCommunity } from '@/lib/community-helpers'
import { getMaxSeekers } from '@/lib/sherpa/activity-limits'
import { checkBungieVerificationServer, getVerificationErrorMessage } from '@/lib/sherpa/verification'

// ============================================================================
// Sherpa Application Actions
// ============================================================================

export type CreateSherpaApplicationInput = {
  application_text?: string // Legacy field name
  motivation?: string // New field name (preferred)
  experience_level?: string
  specialties?: string
  availability?: string
  discord_username?: string
  preferred_activities?: string[] // Legacy field name
  bungie_profile_url?: string
}

export async function createSherpaApplication(input: CreateSherpaApplicationInput) {
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    redirect('/auth/login')
  }

  // Get user's community
  const communityId = await getUserCommunity(user.id)
  if (!communityId) {
    throw new Error('Unable to determine your community. Please ensure you are a member of a Discord guild.')
  }

  // Check if user already has an application for this community
  const { data: existing } = await supabase
    .from('sherpa_applications')
    .select('id, status')
    .eq('profile_id', user.id)
    .eq('community_id', communityId)
    .single()

  if (existing) {
    if (existing.status === 'pending') {
      throw new Error('You already have a pending application for this community.')
    }
    if (existing.status === 'approved') {
      throw new Error('You are already an approved Sherpa for this community.')
    }
    // If rejected, allow re-application
  }

  // Create application
  const { data: application, error } = await supabase
    .from('sherpa_applications')
    .insert({
      profile_id: user.id,
      community_id: communityId,
      application_text: input.application_text,
      experience_level: input.experience_level || null,
      preferred_activities: input.preferred_activities || [],
      bungie_profile_url: input.bungie_profile_url || null,
      status: 'pending',
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create application: ${error.message}`)
  }

  revalidatePath('/sherpa')
  return { success: true, application }
}

// ============================================================================
// Sherpa Request Actions
// ============================================================================

export type CreateSherpaRequestInput = {
  activity_type: string
  activity_name?: string
  difficulty?: string
  requested_slots: number
  preferred_time_window?: string // ISO 8601 datetime string
  description?: string
}

export async function createSherpaRequest(input: CreateSherpaRequestInput) {
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    redirect('/auth/login')
  }

  // Get user's community
  const communityId = await getUserCommunity(user.id)
  if (!communityId) {
    throw new Error('Unable to determine your community. Please ensure you are a member of a Discord guild.')
  }

  // Create request
  const { data: request, error } = await supabase
    .from('sherpa_requests')
    .insert({
      seeker_profile_id: user.id,
      community_id: communityId,
      activity_type: input.activity_type,
      activity_name: input.activity_name || null,
      difficulty: input.difficulty || null,
      requested_slots: input.requested_slots,
      preferred_time_window: input.preferred_time_window || null,
      description: input.description || null,
      status: 'open',
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create request: ${error.message}`)
  }

  revalidatePath('/sherpa/requests')
  return { success: true, request }
}

export async function cancelSherpaRequest(requestId: string) {
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    redirect('/auth/login')
  }

  // Verify user is the requester
  const { data: request, error: requestError } = await supabase
    .from('sherpa_requests')
    .select('seeker_profile_id, status')
    .eq('id', requestId)
    .single()

  if (requestError || !request) {
    throw new Error('Request not found')
  }

  if (request.seeker_profile_id !== user.id) {
    throw new Error('Only the requester can cancel this request')
  }

  if (request.status !== 'open') {
    throw new Error('Only open requests can be cancelled')
  }

  // Cancel request
  const { error } = await supabase
    .from('sherpa_requests')
    .update({ status: 'cancelled' })
    .eq('id', requestId)

  if (error) {
    throw new Error(`Failed to cancel request: ${error.message}`)
  }

  revalidatePath('/sherpa/requests')
  return { success: true }
}

// ============================================================================
// Oathbreaker Penalty Actions
// ============================================================================

/**
 * Check if user has active Oathbreaker penalties
 * Returns penalty info if active, null if none
 */
export async function checkActivePenalties(userId: string) {
  const supabase = await createClient()
  
  const { data: penalties, error } = await supabase
    .from('oathbreaker_penalties')
    .select('id, penalty_type, penalty_start, penalty_end, reason')
    .eq('profile_id', userId)
    .eq('is_active', true)
    .gt('penalty_end', new Date().toISOString()) // Only active penalties
    .order('penalty_end', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('Error checking penalties:', error)
    return null
  }

  return penalties || null
}

/**
 * Get time remaining until penalty expires
 * Returns milliseconds until expiration, or 0 if no active penalty
 */
export async function getPenaltyCooldown(userId: string): Promise<number> {
  const penalty = await checkActivePenalties(userId)
  
  if (!penalty) {
    return 0
  }

  const now = Date.now()
  const endTime = new Date(penalty.penalty_end).getTime()
  const remaining = endTime - now

  return remaining > 0 ? remaining : 0
}

// ============================================================================
// Sherpa Session Actions
// ============================================================================

export type CreateSherpaSessionInput = {
  request_id?: string
  activity_type: string
  activity_name?: string
  difficulty?: string
  scheduled_start: string // ISO 8601 datetime string
  scheduled_end?: string // ISO 8601 datetime string
  seeker_ids?: string[] // Array of profile IDs (OPTIONAL - can be empty for open enrollment)
  description?: string
  enrollment_closes_at?: string // ISO 8601 datetime string
  is_open_for_enrollment?: boolean // Default true
}

export async function createSherpaSession(input: CreateSherpaSessionInput) {
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    redirect('/auth/login')
  }

  // Check for active Oathbreaker penalties
  const activePenalty = await checkActivePenalties(user.id)
  if (activePenalty) {
    const endTime = new Date(activePenalty.penalty_end)
    const hoursRemaining = Math.ceil((endTime.getTime() - Date.now()) / (1000 * 60 * 60))
    throw new Error(
      `You have an active Oathbreaker penalty. You cannot create sessions until ${endTime.toLocaleString()}. ` +
      `Time remaining: ${hoursRemaining} hour${hoursRemaining !== 1 ? 's' : ''}.`
    )
  }

  // Verify user is a Sherpa
  const { data: sherpa, error: sherpaError } = await supabase
    .from('sherpas')
    .select('id, community_id, is_active')
    .eq('profile_id', user.id)
    .eq('is_active', true)
    .single()

  if (sherpaError || !sherpa) {
    throw new Error('You must be an active Sherpa to create sessions')
  }

  // Calculate max_seekers based on activity type
  const maxSeekers = getMaxSeekers(input.activity_type, input.activity_name)
  
  // Determine if session should be open for enrollment
  const seekerIds = input.seeker_ids || []
  const isOpenForEnrollment = input.is_open_for_enrollment ?? (seekerIds.length === 0)
  
  // Determine initial status
  // If open for enrollment and no Seekers, use 'open_for_enrollment' status
  // Otherwise, use 'scheduled' status
  const initialStatus = isOpenForEnrollment && seekerIds.length === 0 
    ? 'open_for_enrollment' 
    : 'scheduled'

  // Create session
  const { data: session, error } = await supabase
    .from('sherpa_sessions')
    .insert({
      sherpa_id: sherpa.id,
      community_id: sherpa.community_id,
      request_id: input.request_id || null,
      activity_type: input.activity_type,
      activity_name: input.activity_name || null,
      difficulty: input.difficulty || null,
      scheduled_start: input.scheduled_start,
      scheduled_end: input.scheduled_end || null,
      status: initialStatus,
      seeker_ids: seekerIds,
      max_seekers: maxSeekers,
      is_open_for_enrollment: isOpenForEnrollment,
      enrollment_closes_at: input.enrollment_closes_at || null,
      description: input.description || null,
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create session: ${error.message}`)
  }

  // Create participant records for pre-selected Seekers
  if (seekerIds.length > 0) {
    const participantInserts = seekerIds.map(seekerId => ({
      session_id: session.id,
      profile_id: seekerId,
      role: 'seeker' as const,
      joined_at: new Date().toISOString(),
    }))
    
    await supabase
      .from('sherpa_session_participants')
      .insert(participantInserts)
  }

  // Create participant record for Sherpa
  await supabase
    .from('sherpa_session_participants')
    .insert({
      session_id: session.id,
      profile_id: user.id,
      role: 'sherpa',
      joined_at: new Date().toISOString(),
    })

  // TODO: Create notifications for verified Seekers (Phase 3)
  // Send Discord notification
  try {
    const { notifyDiscordSessionCreated } = await import('@/lib/sherpa/discord-webhook');
    const { data: community } = await supabase
      .from('communities')
      .select('name')
      .eq('id', sherpa.community_id)
      .single();
    
    const { data: sherpaProfile } = await supabase
      .from('profiles')
      .select('display_name, username')
      .eq('id', user.id)
      .single();
    
    const sherpaName = sherpaProfile?.display_name || sherpaProfile?.username || 'A Sherpa';
    const communityName = community?.name || 'Community';
    const sessionUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/sherpa/sessions/${session.id}`;
    
    await notifyDiscordSessionCreated(
      session.id,
      input.activity_type,
      input.activity_name || null,
      input.difficulty || null,
      input.scheduled_start,
      input.enrollment_closes_at || null,
      input.description || null,
      maxSeekers,
      sherpaName,
      communityName,
      sessionUrl
    );
  } catch (error) {
    console.error('Error sending Discord notification:', error);
    // Don't fail the session creation if Discord notification fails
  }

  // If linked to a request, update request status
  if (input.request_id) {
    await supabase
      .from('sherpa_requests')
      .update({
        status: 'matched',
        matched_sherpa_id: sherpa.id,
        matched_at: new Date().toISOString(),
      })
      .eq('id', input.request_id)
  }

  revalidatePath('/sherpa/sessions')
  return { success: true, session }
}

/**
 * Join an open enrollment Sherpa session
 * Requires Bungie verification (Verified Guardian role)
 */
export async function joinSherpaSession(sessionId: string) {
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    redirect('/auth/login')
  }

  // Check Bungie verification
  const isVerified = await checkBungieVerificationServer(user.id, supabase)
  if (!isVerified) {
    throw new Error(getVerificationErrorMessage())
  }

  // Get session details
  const { data: session, error: sessionError } = await supabase
    .from('sherpa_sessions')
    .select('id, seeker_ids, max_seekers, is_open_for_enrollment, status, community_id, sherpa_id, enrollment_closes_at, activity_type, activity_name, sherpas!inner(profile_id)')
    .eq('id', sessionId)
    .single()

  if (sessionError || !session) {
    throw new Error('Session not found')
  }

  // Verify session is open for enrollment
  if (!session.is_open_for_enrollment) {
    throw new Error('This session is not open for enrollment. Only pre-selected Seekers can join.')
  }

  if (session.status !== 'open_for_enrollment' && session.status !== 'scheduled') {
    throw new Error(`Cannot join session with status: ${session.status}`)
  }

  // Check enrollment closing time
  if (session.enrollment_closes_at) {
    const closesAt = new Date(session.enrollment_closes_at)
    if (new Date() > closesAt) {
      throw new Error('Enrollment for this session has closed.')
    }
  }

  const currentSeekers = session.seeker_ids || []
  
  // Check if session is full
  if (currentSeekers.length >= session.max_seekers) {
    throw new Error(`Session is full (${session.max_seekers}/${session.max_seekers} Seekers)`)
  }

  // Check if user is already enrolled
  if (currentSeekers.includes(user.id)) {
    throw new Error('You are already enrolled in this session')
  }

  // Check if user is the Sherpa (Sherpas can't join their own session as Seekers)
  if ((session.sherpas as any).profile_id === user.id) {
    throw new Error('You cannot join your own session as a Seeker')
  }

  // Check for active penalty
  const activePenalty = await checkActivePenalties(user.id)
  if (activePenalty) {
    const endTime = new Date(activePenalty.penalty_end)
    const hoursRemaining = Math.ceil((endTime.getTime() - Date.now()) / (1000 * 60 * 60))
    throw new Error(
      `You have an active Oathbreaker penalty. You cannot join sessions until ${endTime.toLocaleString()}. ` +
      `Time remaining: ${hoursRemaining} hour${hoursRemaining !== 1 ? 's' : ''}.`
    )
  }

  // Add seeker to session
  const updatedSeekers = [...currentSeekers, user.id]
  const { error: updateError } = await supabase
    .from('sherpa_sessions')
    .update({ seeker_ids: updatedSeekers })
    .eq('id', sessionId)

  if (updateError) {
    throw new Error(`Failed to join session: ${updateError.message}`)
  }

  // Create participant record
  const { error: participantError } = await supabase
    .from('sherpa_session_participants')
    .insert({
      session_id: sessionId,
      profile_id: user.id,
      role: 'seeker',
      joined_at: new Date().toISOString(),
    })

  if (participantError) {
    // Rollback seeker_ids update if participant insert fails
    await supabase
      .from('sherpa_sessions')
      .update({ seeker_ids: currentSeekers })
      .eq('id', sessionId)
    throw new Error(`Failed to create participant record: ${participantError.message}`)
  }

  // Notify Sherpa that Seeker joined
  try {
    const { notifySeekerJoined } = await import('@/lib/sherpa/notifications');
    const { notifyDiscordSeekerJoined } = await import('@/lib/sherpa/discord-webhook');
    
    const { data: seekerProfile } = await supabase
      .from('profiles')
      .select('display_name, username')
      .eq('id', user.id)
      .single();
    
    const seekerName = seekerProfile?.display_name || seekerProfile?.username || 'A Seeker';
    const { data: sherpaData } = await supabase
      .from('sherpas')
      .select('profile_id')
      .eq('id', session.sherpa_id)
      .single();
    
    if (sherpaData?.profile_id) {
      await notifySeekerJoined(session.id, user.id, seekerName, sherpaData.profile_id);
      
      // Discord notification
      const sessionUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/sherpa/sessions/${sessionId}`;
      await notifyDiscordSeekerJoined(
        sessionId,
        session.activity_name || session.activity_type,
        seekerName,
        updatedSeekers.length,
        session.max_seekers,
        sessionUrl
      );
    }
  } catch (error) {
    console.error('Error notifying Sherpa:', error);
    // Don't fail the join if notification fails
  }

  revalidatePath('/sherpa/sessions')
  revalidatePath(`/sherpa/sessions/${sessionId}`)
  return { success: true }
}

/**
 * Leave a Sherpa session (Seeker only)
 */
export async function leaveSherpaSession(sessionId: string, reason?: string) {
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    redirect('/auth/login')
  }

  // Get session details
  const { data: session, error: sessionError } = await supabase
    .from('sherpa_sessions')
    .select('id, seeker_ids, status, sherpa_id, sherpas!inner(profile_id)')
    .eq('id', sessionId)
    .single()

  if (sessionError || !session) {
    throw new Error('Session not found')
  }

  // Check if user is the Sherpa (Sherpas can't leave their own session)
  if ((session.sherpas as any).profile_id === user.id) {
    throw new Error('You cannot leave your own session. Cancel the session instead.')
  }

  const currentSeekers = session.seeker_ids || []
  
  // Check if user is enrolled
  if (!currentSeekers.includes(user.id)) {
    throw new Error('You are not enrolled in this session')
  }

  // Check if session has already started
  if (session.status === 'in_progress' || session.status === 'completed') {
    throw new Error('Cannot leave a session that has already started or completed')
  }

  // Remove seeker from session
  const updatedSeekers = currentSeekers.filter((id: string) => id !== user.id)
  const { error: updateError } = await supabase
    .from('sherpa_sessions')
    .update({ seeker_ids: updatedSeekers })
    .eq('id', sessionId)

  if (updateError) {
    throw new Error(`Failed to leave session: ${updateError.message}`)
  }

  // Update participant record
  const { error: participantError } = await supabase
    .from('sherpa_session_participants')
    .update({
      left_at: new Date().toISOString(),
      left_reason: reason || 'voluntary',
    })
    .eq('session_id', sessionId)
    .eq('profile_id', user.id)

  if (participantError) {
    console.error('Failed to update participant record:', participantError)
    // Don't throw - the main operation succeeded
  }

  // Notify Sherpa that Seeker left
  try {
    const { notifySeekerLeft } = await import('@/lib/sherpa/notifications');
    const { data: seekerProfile } = await supabase
      .from('profiles')
      .select('display_name, username')
      .eq('id', user.id)
      .single();
    
    const seekerName = seekerProfile?.display_name || seekerProfile?.username || 'A Seeker';
    const { data: sherpaData } = await supabase
      .from('sherpas')
      .select('profile_id')
      .eq('id', session.sherpa_id)
      .single();
    
    if (sherpaData?.profile_id) {
      await notifySeekerLeft(session.id, user.id, seekerName, sherpaData.profile_id);
    }
  } catch (error) {
    console.error('Error notifying Sherpa:', error);
    // Don't fail the leave if notification fails
  }

  revalidatePath('/sherpa/sessions')
  revalidatePath(`/sherpa/sessions/${sessionId}`)
  return { success: true }
}

/**
 * Remove a Seeker from a session (Sherpa only)
 */
export async function removeSeekerFromSession(
  sessionId: string,
  seekerId: string,
  reason: string
) {
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    redirect('/auth/login')
  }

  // Get session details and verify user is the Sherpa
  const { data: session, error: sessionError } = await supabase
    .from('sherpa_sessions')
    .select('id, seeker_ids, status, sherpa_id, sherpas!inner(profile_id)')
    .eq('id', sessionId)
    .single()

  if (sessionError || !session) {
    throw new Error('Session not found')
  }

  // Verify user is the Sherpa
  if ((session.sherpas as any).profile_id !== user.id) {
    throw new Error('Only the Sherpa can remove Seekers from a session')
  }

  const currentSeekers = session.seeker_ids || []
  
  // Check if seeker is enrolled
  if (!currentSeekers.includes(seekerId)) {
    throw new Error('Seeker is not enrolled in this session')
  }

  // Remove seeker from session
  const updatedSeekers = currentSeekers.filter((id: string) => id !== seekerId)
  const { error: updateError } = await supabase
    .from('sherpa_sessions')
    .update({ seeker_ids: updatedSeekers })
    .eq('id', sessionId)

  if (updateError) {
    throw new Error(`Failed to remove Seeker: ${updateError.message}`)
  }

  // Update participant record
  const { error: participantError } = await supabase
    .from('sherpa_session_participants')
    .update({
      left_at: new Date().toISOString(),
      left_reason: reason || 'removed_by_sherpa',
    })
    .eq('session_id', sessionId)
    .eq('profile_id', seekerId)

  if (participantError) {
    console.error('Failed to update participant record:', participantError)
    // Don't throw - the main operation succeeded
  }

  // TODO: Notify removed Seeker (Phase 3)

  revalidatePath('/sherpa/sessions')
  revalidatePath(`/sherpa/sessions/${sessionId}`)
  return { success: true }
}

export async function startSherpaSession(sessionId: string) {
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    redirect('/auth/login')
  }

  // Verify user is the Sherpa for this session
  const { data: session, error: sessionError } = await supabase
    .from('sherpa_sessions')
    .select('sherpa_id, status, sherpas!inner(profile_id)')
    .eq('id', sessionId)
    .single()

  if (sessionError || !session) {
    throw new Error('Session not found')
  }

  if ((session.sherpas as any).profile_id !== user.id) {
    throw new Error('Only the Sherpa can start this session')
  }

  if (session.status !== 'scheduled') {
    throw new Error('Only scheduled sessions can be started')
  }

  // Start session
  const { error } = await supabase
    .from('sherpa_sessions')
    .update({
      status: 'in_progress',
      actual_start: new Date().toISOString(),
    })
    .eq('id', sessionId)

  if (error) {
    throw new Error(`Failed to start session: ${error.message}`)
  }

  revalidatePath('/sherpa/sessions')
  return { success: true }
}

export async function completeSherpaSession(sessionId: string, notes?: string) {
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    redirect('/auth/login')
  }

  // Verify user is the Sherpa for this session
  const { data: session, error: sessionError } = await supabase
    .from('sherpa_sessions')
    .select('sherpa_id, status, sherpas!inner(profile_id)')
    .eq('id', sessionId)
    .single()

  if (sessionError || !session) {
    throw new Error('Session not found')
  }

  if ((session.sherpas as any).profile_id !== user.id) {
    throw new Error('Only the Sherpa can complete this session')
  }

  if (session.status !== 'in_progress') {
    throw new Error('Only in-progress sessions can be completed')
  }

  // Complete session
  const { error } = await supabase
    .from('sherpa_sessions')
    .update({
      status: 'completed',
      actual_end: new Date().toISOString(),
      notes: notes || null,
    })
    .eq('id', sessionId)

  if (error) {
    throw new Error(`Failed to complete session: ${error.message}`)
  }

  // Update Sherpa stats
  await supabase.rpc('update_sherpa_oathkeeper_score', {
    sherpa_uuid: session.sherpa_id,
  })

  revalidatePath('/sherpa/sessions')
  return { success: true }
}

// ============================================================================
// Guardian Oath Actions
// ============================================================================

export async function acceptGuardianOath(sessionId: string) {
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    redirect('/auth/login')
  }

  // Verify user is a participant in this session
  const { data: session, error: sessionError } = await supabase
    .from('sherpa_sessions')
    .select('id, seeker_ids, sherpa_id, sherpas!inner(profile_id)')
    .eq('id', sessionId)
    .single()

  if (sessionError || !session) {
    throw new Error('Session not found')
  }

  const isSherpa = (session.sherpas as any).profile_id === user.id
  const isSeeker = (session.seeker_ids as string[]).includes(user.id)

  if (!isSherpa && !isSeeker) {
    throw new Error('You must be a participant in this session to accept the oath')
  }

  // Check if already accepted
  const { data: existing } = await supabase
    .from('guardian_oath_acceptances')
    .select('id')
    .eq('session_id', sessionId)
    .eq('profile_id', user.id)
    .single()

  if (existing) {
    return { success: true, alreadyAccepted: true }
  }

  // Record acceptance
  const { error } = await supabase
    .from('guardian_oath_acceptances')
    .insert({
      session_id: sessionId,
      profile_id: user.id,
    })

  if (error) {
    throw new Error(`Failed to accept oath: ${error.message}`)
  }

  revalidatePath('/sherpa/sessions')
  return { success: true }
}

// ============================================================================
// Oathkeeper Rating Actions
// ============================================================================

export type SubmitOathkeeperRatingInput = {
  session_id: string
  rated_profile_id: string
  helpfulness_rating: number // 1-5
  patience_rating: number // 1-5
  teaching_skill_rating?: number // 1-5 (for Sherpa ratings)
  overall_rating: number // 1-5
  feedback_text?: string
}

export async function submitOathkeeperRating(input: SubmitOathkeeperRatingInput) {
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    redirect('/auth/login')
  }

  // Verify user was a participant in this session
  const { data: session, error: sessionError } = await supabase
    .from('sherpa_sessions')
    .select('id, seeker_ids, sherpa_id, status, sherpas!inner(profile_id)')
    .eq('id', input.session_id)
    .single()

  if (sessionError || !session) {
    throw new Error('Session not found')
  }

  if (session.status !== 'completed') {
    throw new Error('Ratings can only be submitted for completed sessions')
  }

  const isSherpa = (session.sherpas as any).profile_id === user.id
  const isSeeker = (session.seeker_ids as string[]).includes(user.id)

  if (!isSherpa && !isSeeker) {
    throw new Error('You must be a participant in this session to submit a rating')
  }

  // Verify rated_profile_id is also a participant
  const ratedIsSherpa = (session.sherpas as any).profile_id === input.rated_profile_id
  const ratedIsSeeker = (session.seeker_ids as string[]).includes(input.rated_profile_id)

  if (!ratedIsSherpa && !ratedIsSeeker) {
    throw new Error('You can only rate participants in this session')
  }

  // Check if already rated
  const { data: existing } = await supabase
    .from('oathkeeper_ratings')
    .select('id')
    .eq('session_id', input.session_id)
    .eq('rater_profile_id', user.id)
    .eq('rated_profile_id', input.rated_profile_id)
    .single()

  if (existing) {
    throw new Error('You have already rated this participant for this session')
  }

  // Submit rating
  const { data: rating, error } = await supabase
    .from('oathkeeper_ratings')
    .insert({
      session_id: input.session_id,
      rater_profile_id: user.id,
      rated_profile_id: input.rated_profile_id,
      helpfulness_rating: input.helpfulness_rating,
      patience_rating: input.patience_rating,
      teaching_skill_rating: input.teaching_skill_rating || null,
      overall_rating: input.overall_rating,
      feedback_text: input.feedback_text || null,
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to submit rating: ${error.message}`)
  }

  // Update Oathkeeper score if rating a Sherpa
  if (ratedIsSherpa) {
    await supabase.rpc('update_sherpa_oathkeeper_score', {
      sherpa_uuid: session.sherpa_id,
    })
  }

  revalidatePath('/sherpa/sessions')
  return { success: true, rating }
}

// ============================================================================
// Admin Review Actions
// ============================================================================

export type SherpaApplicationWithProfile = {
  id: string
  profile_id: string
  community_id: string
  experience_level: string
  specialties: string
  availability: string
  motivation: string
  discord_username: string
  status: 'pending' | 'approved' | 'denied'
  reviewed_by: string | null
  bungie_verified?: boolean
  reviewed_at: string | null
  review_reason: string | null
  created_at: string
  updated_at: string
  profiles: {
    id: string
    username: string | null
    full_name: string | null
    avatar_url: string | null
  } | null
}

/**
 * Get all Sherpa applications for admin review
 * Returns applications with profile information
 */
export async function getSherpaApplicationsForAdmin() {
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    redirect('/auth/login')
  }

  // Check if user is admin or officer
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || (profile.role !== 'admin' && profile.role !== 'officer')) {
    throw new Error('Unauthorized: Admin or Officer access required')
  }

  // Fetch all applications with profile information (bungie_verified requires migration 20260131000001)
  const { data: applications, error } = await supabase
    .from('sherpa_applications')
    .select(`
      id,
      profile_id,
      community_id,
      experience_level,
      specialties,
      availability,
      motivation,
      discord_username,
      status,
      reviewed_by,
      reviewed_at,
      review_reason,
      created_at,
      updated_at,
      bungie_verified,
      profiles:profile_id (
        id,
        username,
        full_name,
        avatar_url
      )
    `)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch applications: ${error.message}`)
  }

  // Transform the data to match our type (Supabase returns profiles as array for relationships)
  const transformedApplications: SherpaApplicationWithProfile[] = (applications || []).map((app: any) => ({
    ...app,
    profiles: Array.isArray(app.profiles) && app.profiles.length > 0 ? app.profiles[0] : null,
  }))

  return { success: true, applications: transformedApplications }
}

export type UpdateSherpaApplicationStatusInput = {
  applicationId: string
  status: 'approved' | 'denied'
  reviewReason?: string
}

/**
 * Update Sherpa application status (approve or reject)
 * If approved, creates a Sherpa profile
 */
export async function updateSherpaApplicationStatus(input: UpdateSherpaApplicationStatusInput) {
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    redirect('/auth/login')
  }

  // Check if user is admin or officer
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || (profile.role !== 'admin' && profile.role !== 'officer')) {
    throw new Error('Unauthorized: Admin or Officer access required')
  }

  // Fetch the application
  const { data: application, error: appError } = await supabase
    .from('sherpa_applications')
    .select('*')
    .eq('id', input.applicationId)
    .single()

  if (appError || !application) {
    throw new Error('Application not found')
  }

  if (application.status !== 'pending') {
    throw new Error(`Application is already ${application.status}`)
  }

  // Update application status
  const { error: updateError } = await supabase
    .from('sherpa_applications')
    .update({
      status: input.status,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      review_reason: input.status === 'denied' ? input.reviewReason || null : null,
    })
    .eq('id', input.applicationId)

  if (updateError) {
    throw new Error(`Failed to update application: ${updateError.message}`)
  }

  // If approved, create Sherpa profile
  if (input.status === 'approved') {
    // Check if Sherpa profile already exists
    const { data: existingSherpa } = await supabase
      .from('sherpas')
      .select('id')
      .eq('profile_id', application.profile_id)
      .eq('community_id', application.community_id)
      .single()

    if (!existingSherpa) {
      const { error: sherpaError } = await supabase
        .from('sherpas')
        .insert({
          profile_id: application.profile_id,
          community_id: application.community_id,
          application_id: application.id,
          specialties: application.specialties,
          availability: application.availability,
          is_active: true,
        })

      if (sherpaError) {
        // Log error but don't fail the approval
        console.error('Failed to create Sherpa profile:', sherpaError)
      }
    }
  }

  revalidatePath('/protected/admin')
  revalidatePath('/sherpa')
  return { success: true }
}
