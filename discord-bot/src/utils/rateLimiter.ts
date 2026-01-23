/**
 * Rate Limiter Utility
 * Prevents command spam and abuse
 */

import { RateLimiter } from 'discord.js-rate-limiter'
import { commandLogger } from './logger.js'

// Create rate limiters for different command types
// Format: RateLimiter(maxCommands, timeWindowMs)

// General commands: 5 commands per 10 seconds
export const generalRateLimiter = new RateLimiter(5, 10000)

// Application commands: 1 application per 60 seconds
export const applicationRateLimiter = new RateLimiter(1, 60000)

// Rating commands: 1 rating per 30 seconds
export const ratingRateLimiter = new RateLimiter(1, 30000)

// Vote commands: 1 vote per 10 seconds
export const voteRateLimiter = new RateLimiter(1, 10000)

/**
 * Check if a user is rate limited
 * Returns true if rate limited, false if allowed
 */
export function checkRateLimit(
  userId: string,
  limiter: RateLimiter,
  commandName: string
): boolean {
  const limited = limiter.take(userId)
  
  if (limited) {
    commandLogger.warn(
      {
        userId,
        commandName,
        limiterType: limiter.constructor.name,
      },
      'User rate limited'
    )
    return true
  }
  
  return false
}
