/**
 * Bungie Verification Helpers
 * 
 * Functions to check if users have verified their Bungie accounts
 * via Discord Linked Roles (Verified Guardian role).
 */

import { createClient } from '@/lib/supabase/client';

/**
 * Check if a user has verified their Bungie account
 * 
 * Verification is determined by checking if the user has the "Verified Guardian"
 * Discord role, which is assigned automatically when they link their Bungie account
 * via Discord Linked Roles.
 * 
 * @param userId - The user's profile ID (UUID)
 * @returns True if user has Verified Guardian role, false otherwise
 */
export async function checkBungieVerification(userId: string): Promise<boolean> {
  const VERIFIED_GUARDIAN_ROLE_ID = process.env.NEXT_PUBLIC_VERIFIED_GUARDIAN_ROLE_ID;
  
  // If role ID not configured, allow access (backward compatibility)
  if (!VERIFIED_GUARDIAN_ROLE_ID) {
    return true;
  }
  
  try {
    const supabase = await createClient();
    
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('discord_role_ids')
      .eq('id', userId)
      .single();
    
    if (error || !profile) {
      console.error('Error checking Bungie verification:', error);
      return false;
    }
    
    const hasVerifiedGuardian = profile.discord_role_ids?.includes(VERIFIED_GUARDIAN_ROLE_ID) ?? false;
    return hasVerifiedGuardian;
  } catch (error) {
    console.error('Error checking Bungie verification:', error);
    return false;
  }
}

/**
 * Check Bungie verification (server-side version)
 * Uses server-side Supabase client
 * 
 * @param userId - The user's profile ID (UUID)
 * @param supabase - Server-side Supabase client
 * @returns True if user has Verified Guardian role, false otherwise
 */
export async function checkBungieVerificationServer(
  userId: string,
  supabase: any
): Promise<boolean> {
  const VERIFIED_GUARDIAN_ROLE_ID = process.env.NEXT_PUBLIC_VERIFIED_GUARDIAN_ROLE_ID;
  
  // If role ID not configured, allow access (backward compatibility)
  if (!VERIFIED_GUARDIAN_ROLE_ID) {
    return true;
  }
  
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('discord_role_ids')
      .eq('id', userId)
      .single();
    
    if (error || !profile) {
      console.error('Error checking Bungie verification:', error);
      return false;
    }
    
    const hasVerifiedGuardian = profile.discord_role_ids?.includes(VERIFIED_GUARDIAN_ROLE_ID) ?? false;
    return hasVerifiedGuardian;
  } catch (error) {
    console.error('Error checking Bungie verification:', error);
    return false;
  }
}

/**
 * Get verification error message for UI display
 * 
 * @returns Error message explaining verification requirement
 */
export function getVerificationErrorMessage(): string {
  return 'You must have a verified Bungie account to join sessions. Link your account in Discord Server Settings → Linked Roles → Verified Guardian.';
}
