'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/server'
import { redirect } from 'next/navigation'

/**
 * Get notifications for the current user
 */
export async function getNotifications(limit: number = 20) {
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { notifications: [], unreadCount: 0 }
  }

  const { data: notifications, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('profile_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching notifications:', error)
    return { notifications: [], unreadCount: 0 }
  }

  const unreadCount = notifications?.filter(n => !n.read).length || 0

  return {
    notifications: notifications || [],
    unreadCount,
  }
}

/**
 * Mark a notification as read
 */
export async function markNotificationRead(notificationId: string) {
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    redirect('/auth/login')
  }

  const { error } = await supabase
    .from('notifications')
    .update({ 
      read: true,
      read_at: new Date().toISOString(),
    })
    .eq('id', notificationId)
    .eq('profile_id', user.id)

  if (error) {
    throw new Error(`Failed to mark notification as read: ${error.message}`)
  }

  revalidatePath('/sherpa')
  return { success: true }
}

/**
 * Mark all notifications as read for the current user
 */
export async function markAllNotificationsRead() {
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    redirect('/auth/login')
  }

  const { error } = await supabase
    .from('notifications')
    .update({ 
      read: true,
      read_at: new Date().toISOString(),
    })
    .eq('profile_id', user.id)
    .eq('read', false)

  if (error) {
    throw new Error(`Failed to mark all notifications as read: ${error.message}`)
  }

  revalidatePath('/sherpa')
  return { success: true }
}
