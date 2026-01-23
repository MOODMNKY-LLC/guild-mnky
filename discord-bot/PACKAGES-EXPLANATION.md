# Discord Bot Supplementary Packages - Explanation

## Overview

Three supplementary packages have been installed to enhance the Discord bot's functionality, reliability, and observability.

---

## 1. Pino - High-Performance Logger

### What It Does
Pino is a **blazingly fast** JSON logger for Node.js applications. It's designed for production use with minimal performance overhead.

### Why We Need It
- **Performance**: 5x faster than alternatives like Winston
- **Structured Logging**: All logs are JSON (machine-readable, easy to query)
- **Low Overhead**: Minimal impact on bot performance
- **Production-Ready**: Used by major Node.js applications

### How It's Used in Our Bot

**Before** (console.log):
```typescript
console.log(`User ${userId} executed command ${commandName}`)
console.error('Error:', error)
```

**After** (Pino):
```typescript
commandLogger.info({ userId, commandName }, 'Command executed')
logger.error({ error, userId }, 'Command failed')
```

### Benefits
1. **Structured Data**: Logs include context (userId, guildId, commandName, etc.)
2. **Easy Filtering**: Query logs by user, command, error type, etc.
3. **Log Aggregation**: Works with Datadog, CloudWatch, Elasticsearch, etc.
4. **Performance**: Fast enough for high-volume logging

### Example Log Output
```json
{
  "level": 30,
  "time": 1706051730123,
  "context": "commands",
  "userId": "123456789",
  "commandName": "sherpa apply",
  "guildId": "1291190711919837234",
  "msg": "Command executed"
}
```

---

## 2. pino-pretty - Development Log Formatter

### What It Does
Makes Pino logs **human-readable** during development by pretty-printing and colorizing them.

### Why We Need It
- **Readability**: JSON logs are hard to read during development
- **Colorization**: Makes it easier to spot errors, warnings, info
- **Auto-Disabled**: Automatically uses JSON in production

### How It Works

**Development Mode** (`NODE_ENV=development`):
```
[22:15:30.123] INFO (bot): Bot logged in successfully
    botTag: "GIRTH#7057"
    botId: "1184206315690676315"
    guildCount: 2
```

**Production Mode** (`NODE_ENV=production`):
```json
{"level":30,"time":1706051730123,"botTag":"GIRTH#7057","guildCount":2,"msg":"Bot logged in successfully"}
```

### Configuration
Automatically configured in `src/utils/logger.ts`:
- Development: Pretty-printed, colorized
- Production: JSON (for log aggregation tools)

---

## 3. discord.js-rate-limiter - User Rate Limiting

### What It Does
Prevents users from **spamming commands** by limiting how often they can execute commands.

### Why We Need It
- **Prevents Abuse**: Stops users from flooding the bot with commands
- **Protects Resources**: Reduces database load and API calls
- **Better UX**: Prevents accidental spam
- **Security**: Protects against malicious users

### How It Works

**Rate Limiter Configuration**:
```typescript
// Allows 5 commands per 10 seconds
const limiter = new RateLimiter(5, 10000)

// Check before processing command
if (limiter.take(userId)) {
  // User is rate limited
  return
}
```

### Rate Limits Configured

1. **General Commands** (5 per 10 seconds)
   - `/sherpa sessions`
   - `/sherpa profile`
   - `/sherpa oath`
   - General purpose commands

2. **Application Commands** (1 per 60 seconds)
   - `/sherpa apply`
   - Prevents spam applications

3. **Rating Commands** (1 per 30 seconds)
   - `/sherpa rating`
   - Prevents rating spam

4. **Vote Commands** (1 per 10 seconds)
   - `/sherpa vote-resign`
   - Prevents vote manipulation

### User Experience

When rate limited, users see:
```
⏳ You're using commands too quickly. Please wait a moment and try again.
```

### Monitoring

Rate limit violations are logged:
```json
{
  "level": 40,
  "context": "commands",
  "userId": "123456789",
  "commandName": "sherpa apply",
  "msg": "User rate limited"
}
```

---

## Integration Summary

### Files Updated

**Logger Integration**:
- ✅ `src/index.ts` - Bot startup, errors
- ✅ `src/events/interactionCreate.ts` - Interaction logging
- ✅ `src/events/guildMemberAdd.ts` - Member join logging
- ✅ `src/utils/database.ts` - Database operation logging
- ✅ All command handlers - Command execution logging

**Rate Limiter Integration**:
- ✅ `src/events/interactionCreate.ts` - Rate limit checks before commands

### Benefits Achieved

1. **Observability**: All bot operations are logged with context
2. **Debugging**: Easy to trace issues with structured logs
3. **Performance**: Fast logging with minimal overhead
4. **Protection**: Rate limiting prevents abuse
5. **Monitoring**: Logs can be aggregated and analyzed

---

## Usage Examples

### Logging a Command Execution

```typescript
import { commandLogger } from '../utils/logger.js'

commandLogger.info(
  {
    userId: interaction.user.id,
    commandName: 'sherpa apply',
    guildId: interaction.guildId,
  },
  'Command executed successfully'
)
```

### Logging an Error

```typescript
import { logger } from '../utils/logger.js'

try {
  // Some operation
} catch (error) {
  logger.error(
    {
      error,
      userId: interaction.user.id,
      operation: 'createApplication',
    },
    'Failed to create application'
  )
}
```

### Checking Rate Limits

```typescript
import { checkRateLimit, applicationRateLimiter } from '../utils/rateLimiter.js'

if (checkRateLimit(interaction.user.id, applicationRateLimiter, 'sherpa apply')) {
  await interaction.reply({
    content: '⏳ You\'re using commands too quickly. Please wait a moment.',
    ephemeral: true,
  })
  return
}
```

---

## Configuration

### Environment Variables

```bash
# Logging
LOG_LEVEL=info  # Options: fatal, error, warn, info, debug, trace
NODE_ENV=development  # development = pretty logs, production = JSON
```

### Adjusting Rate Limits

Edit `src/utils/rateLimiter.ts`:

```typescript
// More lenient: 10 commands per 5 seconds
export const generalRateLimiter = new RateLimiter(10, 5000)

// Stricter: 1 command per 30 seconds
export const generalRateLimiter = new RateLimiter(1, 30000)
```

---

## Monitoring & Analytics

### View Logs in Development

```bash
pnpm dev
# Pretty-printed logs appear in console
```

### Filter Logs

```bash
# Find all errors
grep '"level":50' logs/bot.log

# Find logs for specific user
grep '"userId":"123456789"' logs/bot.log

# Find rate limit violations
grep 'rate limited' logs/bot.log
```

### Production Logging

In production, logs are JSON format and can be:
- Sent to log aggregation services (Datadog, CloudWatch, etc.)
- Parsed and analyzed
- Filtered by any field (userId, commandName, error type, etc.)

---

## Performance Impact

**Pino**:
- Minimal overhead (~1-2% CPU)
- Async logging (non-blocking)
- Optimized for high-volume logging

**Rate Limiter**:
- In-memory storage (very fast)
- O(1) lookup time
- Negligible performance impact

**Overall**: These packages add minimal overhead while providing significant benefits.

---

## Future Enhancements

### Potential Additional Packages

1. **@sentry/node** - Error tracking and monitoring
2. **ioredis** - Redis for caching and rate limit persistence
3. **node-cron** - Scheduled tasks (session reminders, cleanup)
4. **zod** - Runtime validation for command inputs

---

## References

- [Pino Documentation](https://getpino.io/)
- [pino-pretty GitHub](https://github.com/pinojs/pino-pretty)
- [discord.js-rate-limiter GitHub](https://github.com/KevinNovak/discord.js-Rate-Limiter)

---

**Status**: ✅ All packages installed, integrated, and working
