/**
 * API Route: Update Discord User ID
 * 
 * Extracts Discord user ID from auth session and updates profile
 * Called after OAuth login to ensure discord_user_id is set
 */

import { createClient } from '@/lib/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user's current profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('discord_user_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      )
    }

    // If already set, return success
    if (profile.discord_user_id) {
      return NextResponse.json({
        success: true,
        discordUserId: profile.discord_user_id,
        alreadySet: true,
      })
    }

    // Extract Discord user ID from user metadata or identities
    // Discord OAuth stores provider_id in user metadata
    let discordUserId = user.user_metadata?.provider_id || 
                       user.user_metadata?.sub ||
                       user.user_metadata?.id

    // If not in metadata, check if user has Discord identity
    // Note: We can't directly query auth.identities from client, but Supabase
    // should include provider info in user metadata for OAuth providers
    if (!discordUserId && user.app_metadata?.provider === 'discord') {
      // Try to extract from email or other metadata
      // Discord user ID might be in the email format or other fields
      discordUserId = user.user_metadata?.preferred_username || 
                     user.user_metadata?.username
    }

    if (!discordUserId) {
      // Last resort: Check if we can get it from the session
      // For Discord OAuth, the provider_id should be in the identity
      return NextResponse.json(
        { 
          error: 'Could not extract Discord user ID from session. Please sign out and sign in again.',
          needsReauth: true
        },
        { status: 400 }
      )
    }

    // Update profile with Discord user ID
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ discord_user_id: discordUserId })
      .eq('id', user.id)

    if (updateError) {
      return NextResponse.json(
        { error: `Failed to update Discord user ID: ${updateError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      discordUserId,
      updated: true,
    })

  } catch (error: any) {
    console.error('Error updating Discord user ID:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
