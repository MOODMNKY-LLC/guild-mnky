'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/server'
import { redirect } from 'next/navigation'
import { getUserCommunity } from '@/lib/community-helpers'

export type CreateEventInput = {
  title: string
  description?: string
  starts_at: string // ISO 8601 datetime string
  ends_at?: string // ISO 8601 datetime string
  capacity?: number
  roles?: string[]
}

export async function createEvent(input: CreateEventInput) {
  const supabase = await createClient()
  
  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    redirect('/auth/login')
  }

  // Get user's community using helper function (supports multi-community)
  const communityId = await getUserCommunity(user.id)

  if (!communityId) {
    throw new Error(
      'Unable to determine your community. Please ensure you are a member of a Discord guild ' +
      'or contact an administrator. If running locally, ensure migrations are up to date: ' +
      'npx supabase migration up --local'
    )
  }

  // Create the event
  const { data: event, error } = await supabase
    .from('events')
    .insert({
      community_id: communityId,
      title: input.title,
      description: input.description || null,
      starts_at: input.starts_at,
      ends_at: input.ends_at || null,
      capacity: input.capacity || null,
      roles: input.roles || [],
      created_by: user.id,
      slots_total: input.capacity || null,
      slots_filled: 0,
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create event: ${error.message}`)
  }

  revalidatePath('/events')
  return { success: true, event }
}

export type RSVPInput = {
  event_id: string
  status: 'going' | 'maybe' | 'declined'
  note?: string
}

export async function rsvpToEvent(input: RSVPInput) {
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    redirect('/auth/login')
  }

  // Upsert RSVP
  const { error } = await supabase
    .from('event_rsvps')
    .upsert({
      event_id: input.event_id,
      profile_id: user.id,
      status: input.status,
      note: input.note || null,
    }, {
      onConflict: 'event_id,profile_id'
    })

  if (error) {
    throw new Error(`Failed to RSVP: ${error.message}`)
  }

  // Update event slots_filled count
  const { data: rsvpCount } = await supabase
    .from('event_rsvps')
    .select('id', { count: 'exact', head: true })
    .eq('event_id', input.event_id)
    .eq('status', 'going')

  if (rsvpCount !== null) {
    await supabase
      .from('events')
      .update({ slots_filled: rsvpCount })
      .eq('id', input.event_id)
  }

  revalidatePath('/events')
  return { success: true }
}

export async function removeRSVP(event_id: string) {
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    redirect('/auth/login')
  }

  const { error } = await supabase
    .from('event_rsvps')
    .delete()
    .eq('event_id', event_id)
    .eq('profile_id', user.id)

  if (error) {
    throw new Error(`Failed to remove RSVP: ${error.message}`)
  }

  // Update event slots_filled count
  const { data: rsvpCount } = await supabase
    .from('event_rsvps')
    .select('id', { count: 'exact', head: true })
    .eq('event_id', event_id)
    .eq('status', 'going')

  await supabase
    .from('events')
    .update({ slots_filled: rsvpCount || 0 })
    .eq('id', event_id)

  revalidatePath('/events')
  return { success: true }
}
