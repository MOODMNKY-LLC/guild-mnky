/**
 * Logger Utility
 * Uses Pino for high-performance structured logging
 */

import pino from 'pino'

// Create logger instance
// In development, use pretty printing. In production, use JSON.
const isDevelopment = process.env.NODE_ENV === 'development'

export const logger = pino({
  level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
  transport: isDevelopment
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss.l',
          ignore: 'pid,hostname',
          singleLine: false,
        },
      }
    : undefined, // Production: JSON output
  base: {
    env: process.env.NODE_ENV || 'development',
  },
})

// Create child loggers for different contexts
export const createLogger = (context: string) => {
  return logger.child({ context })
}

// Convenience loggers for different modules
export const botLogger = createLogger('bot')
export const commandLogger = createLogger('commands')
export const eventLogger = createLogger('events')
export const databaseLogger = createLogger('database')
