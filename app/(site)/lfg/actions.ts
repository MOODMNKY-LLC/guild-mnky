'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/server'
import { redirect } from 'next/navigation'
import { getUserCommunity } from '@/lib/community-helpers'

export type CreateLfgPostInput = {
  title: string
  description?: string
  starts_at?: string // ISO 8601 datetime string
  slots_total: number
}

export async function createLfgPost(input: CreateLfgPostInput) {
  const supabase = await createClient()
  
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

  // Create the LFG post
  const { data: post, error } = await supabase
    .from('lfg_posts')
    .insert({
      community_id: communityId,
      title: input.title,
      description: input.description || null,
      starts_at: input.starts_at || null,
      slots_total: input.slots_total,
      slots_filled: 0,
      status: 'open',
      created_by: user.id,
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create LFG post: ${error.message}`)
  }

  revalidatePath('/lfg')
  return { success: true, post }
}

export async function joinLfgPost(lfg_post_id: string) {
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    redirect('/auth/login')
  }

  // Check if post exists and is open
  const { data: post, error: postError } = await supabase
    .from('lfg_posts')
    .select('id, slots_total, slots_filled, status')
    .eq('id', lfg_post_id)
    .single()

  if (postError || !post) {
    throw new Error('LFG post not found')
  }

  if (post.status !== 'open') {
    throw new Error('This LFG post is no longer open')
  }

  // Check if already joined
  const { data: existing } = await supabase
    .from('lfg_members')
    .select('id')
    .eq('lfg_post_id', lfg_post_id)
    .eq('profile_id', user.id)
    .single()

  if (existing) {
    throw new Error('You have already joined this LFG post')
  }

  // Check if full
  if (post.slots_filled >= post.slots_total) {
    throw new Error('This LFG post is full')
  }

  // Add member
  const { error: joinError } = await supabase
    .from('lfg_members')
    .insert({
      lfg_post_id,
      profile_id: user.id,
    })

  if (joinError) {
    throw new Error(`Failed to join: ${joinError.message}`)
  }

  // Update slots_filled
  const newSlotsFilled = post.slots_filled + 1
  const newStatus = newSlotsFilled >= post.slots_total ? 'full' : 'open'

  await supabase
    .from('lfg_posts')
    .update({
      slots_filled: newSlotsFilled,
      status: newStatus,
    })
    .eq('id', lfg_post_id)

  revalidatePath('/lfg')
  return { success: true }
}

export async function leaveLfgPost(lfg_post_id: string) {
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    redirect('/auth/login')
  }

  // Remove member
  const { error } = await supabase
    .from('lfg_members')
    .delete()
    .eq('lfg_post_id', lfg_post_id)
    .eq('profile_id', user.id)

  if (error) {
    throw new Error(`Failed to leave: ${error.message}`)
  }

  // Update slots_filled and status
  const { data: post } = await supabase
    .from('lfg_posts')
    .select('slots_total, slots_filled')
    .eq('id', lfg_post_id)
    .single()

  if (post) {
    const newSlotsFilled = Math.max(0, post.slots_filled - 1)
    const newStatus = newSlotsFilled >= post.slots_total ? 'full' : 'open'

    await supabase
      .from('lfg_posts')
      .update({
        slots_filled: newSlotsFilled,
        status: newStatus,
      })
      .eq('id', lfg_post_id)
  }

  revalidatePath('/lfg')
  return { success: true }
}

export async function closeLfgPost(lfg_post_id: string) {
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    redirect('/auth/login')
  }

  // Verify user is the creator
  const { data: post, error: postError } = await supabase
    .from('lfg_posts')
    .select('created_by')
    .eq('id', lfg_post_id)
    .single()

  if (postError || !post) {
    throw new Error('LFG post not found')
  }

  if (post.created_by !== user.id) {
    throw new Error('Only the creator can close this LFG post')
  }

  // Close the post
  const { error } = await supabase
    .from('lfg_posts')
    .update({ status: 'closed' })
    .eq('id', lfg_post_id)

  if (error) {
    throw new Error(`Failed to close post: ${error.message}`)
  }

  revalidatePath('/lfg')
  return { success: true }
}

export async function deleteLfgPost(lfg_post_id: string) {
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    redirect('/auth/login')
  }

  // Verify user is the creator
  const { data: post, error: postError } = await supabase
    .from('lfg_posts')
    .select('created_by')
    .eq('id', lfg_post_id)
    .single()

  if (postError || !post) {
    throw new Error('LFG post not found')
  }

  if (post.created_by !== user.id) {
    throw new Error('Only the creator can delete this LFG post')
  }

  // Delete the post
  // Note: lfg_members will be automatically deleted due to CASCADE constraint
  const { error } = await supabase
    .from('lfg_posts')
    .delete()
    .eq('id', lfg_post_id)

  if (error) {
    throw new Error(`Failed to delete post: ${error.message}`)
  }

  revalidatePath('/lfg')
  return { success: true }
}
