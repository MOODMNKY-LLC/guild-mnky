/**
 * Activity Fireteam Limits
 * 
 * Defines maximum fireteam sizes for different Destiny 2 activity types.
 * These limits are based on Bungie's official fireteam size restrictions.
 * 
 * Total fireteam = 1 Sherpa + max_seekers Seekers
 */

export const ACTIVITY_FIRETEAM_LIMITS = {
  raid: 6,        // Raids support 6 players total (1 Sherpa + 5 Seekers)
  dungeon: 3,     // Dungeons support 3 players total (1 Sherpa + 2 Seekers)
  nightfall: 3,   // Nightfalls support 3 players total (1 Sherpa + 2 Seekers)
  pvp: 6,         // Default for Control/Iron Banner (1 Sherpa + 5 Seekers)
  gambit: 4,      // Gambit supports 4 players total (1 Sherpa + 3 Seekers)
  other: 6,       // Safe default for unknown types (1 Sherpa + 5 Seekers)
} as const;

export type ActivityType = keyof typeof ACTIVITY_FIRETEAM_LIMITS;

/**
 * PvP-specific activity names that have different limits
 */
const PVP_3_PLAYER_MODES = [
  'trials',
  'competitive',
  'survival',
  'elimination',
  'countdown',
];

/**
 * Calculate maximum number of Seekers allowed for an activity
 * 
 * @param activityType - The type of activity (raid, dungeon, nightfall, etc.)
 * @param activityName - Optional specific activity name (for PvP mode detection)
 * @returns Maximum number of Seekers (total fireteam - 1 Sherpa)
 */
export function getMaxSeekers(activityType: string, activityName?: string): number {
  // Normalize activity type to lowercase
  const normalizedType = activityType.toLowerCase() as ActivityType;
  
  // Get base limit from activity type
  const baseLimit = ACTIVITY_FIRETEAM_LIMITS[normalizedType] || ACTIVITY_FIRETEAM_LIMITS.other;
  
  // Special handling for PvP modes
  if (normalizedType === 'pvp' && activityName) {
    const normalizedName = activityName.toLowerCase();
    // Check if this is a 3v3 mode
    const is3v3Mode = PVP_3_PLAYER_MODES.some(mode => normalizedName.includes(mode));
    if (is3v3Mode) {
      return 2; // 3 total - 1 Sherpa = 2 Seekers
    }
  }
  
  // Return max Seekers (total - 1 for Sherpa)
  return baseLimit - 1;
}

/**
 * Get total fireteam size for an activity
 * 
 * @param activityType - The type of activity
 * @param activityName - Optional specific activity name
 * @returns Total fireteam size including Sherpa
 */
export function getTotalFireteamSize(activityType: string, activityName?: string): number {
  return getMaxSeekers(activityType, activityName) + 1; // +1 for Sherpa
}

/**
 * Check if a session has available slots for Seekers
 * 
 * @param currentSeekers - Current number of Seekers enrolled
 * @param maxSeekers - Maximum allowed Seekers
 * @returns True if slots are available
 */
export function hasAvailableSlots(currentSeekers: number, maxSeekers: number): boolean {
  return currentSeekers < maxSeekers;
}

/**
 * Get activity limit description for UI display
 * 
 * @param activityType - The type of activity
 * @param activityName - Optional specific activity name
 * @returns Human-readable description of fireteam limits
 */
export function getActivityLimitDescription(activityType: string, activityName?: string): string {
  const maxSeekers = getMaxSeekers(activityType, activityName);
  const total = getTotalFireteamSize(activityType, activityName);
  
  return `${activityType.charAt(0).toUpperCase() + activityType.slice(1)} supports up to ${total} players (1 Sherpa + ${maxSeekers} Seeker${maxSeekers !== 1 ? 's' : ''})`;
}
