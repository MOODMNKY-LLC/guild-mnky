'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/server'
import { redirect } from 'next/navigation'
import { getUserCommunity } from '@/lib/community-helpers'

// ============================================================================
// Sherpa Application Actions
// ============================================================================

export type CreateSherpaApplicationInput = {
  application_text: string
  experience_level?: string
  preferred_activities?: string[]
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
// Sherpa Session Actions
// ============================================================================

export type CreateSherpaSessionInput = {
  request_id?: string
  activity_type: string
  activity_name?: string
  difficulty?: string
  scheduled_start: string // ISO 8601 datetime string
  scheduled_end?: string // ISO 8601 datetime string
  seeker_ids: string[] // Array of profile IDs
}

export async function createSherpaSession(input: CreateSherpaSessionInput) {
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    redirect('/auth/login')
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
      status: 'scheduled',
      seeker_ids: input.seeker_ids,
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create session: ${error.message}`)
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
  application_text: string
  experience_level: string | null
  preferred_activities: string[] | null
  bungie_profile_url: string | null
  status: 'pending' | 'approved' | 'rejected' | 'suspended'
  reviewed_by: string | null
  reviewed_at: string | null
  rejection_reason: string | null
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

  // Fetch all applications with profile information
  const { data: applications, error } = await supabase
    .from('sherpa_applications')
    .select(`
      id,
      profile_id,
      community_id,
      application_text,
      experience_level,
      preferred_activities,
      bungie_profile_url,
      status,
      reviewed_by,
      reviewed_at,
      rejection_reason,
      created_at,
      updated_at,
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
  status: 'approved' | 'rejected'
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
      rejection_reason: input.status === 'rejected' ? input.reviewReason || null : null,
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
          specialties: application.preferred_activities || [],
          bio: application.application_text,
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
