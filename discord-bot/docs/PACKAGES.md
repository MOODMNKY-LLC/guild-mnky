# Discord Bot Packages Documentation

This document explains the supplementary packages used in the Discord bot and how they enhance functionality.

## Installed Packages

### Core Packages

#### 1. **pino** (v10.3.0)
**Purpose**: High-performance structured JSON logger

**Why Pino?**
- **5x faster** than alternatives like Winston
- **Low overhead** - Minimal performance impact on bot operations
- **Structured logging** - JSON format perfect for log aggregation tools
- **Production-ready** - Used by major Node.js applications

**Usage in Bot**:
```typescript
import { logger, botLogger, commandLogger } from './utils/logger.js'

// General logging
logger.info('Bot starting up')

// Context-specific logging
botLogger.info({ guildId, memberCount }, 'Guild connected')
commandLogger.warn({ userId, commandName }, 'Rate limit exceeded')
```

**Benefits**:
- All logs are structured JSON (machine-readable)
- Easy to filter and search logs
- Integrates with log management tools (Datadog, CloudWatch, etc.)
- Performance optimized for high-volume logging

**Log Levels**:
- `fatal` - Critical errors that cause bot shutdown
- `error` - Application errors
- `warn` - Warnings that need attention
- `info` - General information
- `debug` - Debugging information (development only)
- `trace` - Detailed execution tracing

---

#### 2. **pino-pretty** (v13.1.3)
**Purpose**: Pretty-print Pino logs for human readability in development

**Why pino-pretty?**
- Makes logs readable during development
- Colorized output for easier scanning
- Automatically disabled in production (JSON output)

**Usage**:
Automatically configured in `src/utils/logger.ts`:
- **Development**: Pretty-printed, colorized logs
- **Production**: JSON logs (for log aggregation tools)

**Example Output** (Development):
```
[22:15:30.123] INFO (bot): Bot logged in successfully
    botTag: "Guild-MNKY Bot#1234"
    botId: "1184206315690676315"
    guildCount: 2
```

**Example Output** (Production):
```json
{"level":30,"time":1706051730123,"botTag":"Guild-MNKY Bot#1234","botId":"1184206315690676315","guildCount":2,"msg":"Bot logged in successfully"}
```

---

#### 3. **discord.js-rate-limiter** (v1.3.2)
**Purpose**: User-level rate limiting to prevent command spam and abuse

**Why discord.js-rate-limiter?**
- Prevents users from spamming commands
- Protects bot from abuse
- Lightweight and easy to use
- Works alongside Discord's API rate limits

**Usage in Bot**:
```typescript
import { checkRateLimit, generalRateLimiter, applicationRateLimiter } from './utils/rateLimiter.js'

// Check rate limit before processing command
if (checkRateLimit(userId, generalRateLimiter, 'sherpa sessions')) {
  return // User is rate limited
}

// Process command normally
```

**Rate Limiters Configured**:
1. **General Rate Limiter**: 5 commands per 10 seconds
   - Used for: `/sherpa sessions`, `/sherpa profile`, `/sherpa oath`
   
2. **Application Rate Limiter**: 1 application per 60 seconds
   - Used for: `/sherpa apply`
   - Prevents spam applications

3. **Rating Rate Limiter**: 1 rating per 30 seconds
   - Used for: `/sherpa rating`
   - Prevents rating spam

4. **Vote Rate Limiter**: 1 vote per 10 seconds
   - Used for: `/sherpa vote-resign`
   - Prevents vote manipulation

**Benefits**:
- Prevents command spam
- Protects bot resources
- Improves user experience (prevents accidental spam)
- Logs rate limit violations for monitoring

---

## Package Integration

### Logger Integration

**Files Updated**:
- `src/index.ts` - Bot startup, error handling
- `src/events/interactionCreate.ts` - Interaction logging
- `src/events/guildMemberAdd.ts` - Member join logging
- `src/utils/database.ts` - Database operation logging

**Logging Strategy**:
- **Structured Logging**: All logs include context (userId, guildId, commandName, etc.)
- **Log Levels**: Appropriate levels for different scenarios
- **Error Logging**: Full error objects with stack traces
- **Performance**: Minimal overhead, async logging

### Rate Limiter Integration

**Files Updated**:
- `src/events/interactionCreate.ts` - Rate limit checks before command execution

**Rate Limiting Strategy**:
- **Per-User**: Each user has their own rate limit bucket
- **Per-Command-Type**: Different limits for different command types
- **User-Friendly**: Clear error messages when rate limited
- **Logged**: All rate limit violations are logged for monitoring

---

## Configuration

### Environment Variables

Add to `.env` for advanced configuration:

```bash
# Logging
LOG_LEVEL=info  # Options: fatal, error, warn, info, debug, trace
NODE_ENV=development  # development = pretty logs, production = JSON logs
```

### Rate Limiter Configuration

Edit `src/utils/rateLimiter.ts` to adjust limits:

```typescript
// Example: Allow 10 commands per 5 seconds
export const generalRateLimiter = new RateLimiter(10, 5000)
```

---

## Best Practices

### Logging

1. **Use Appropriate Log Levels**:
   - `fatal` - Bot crashes
   - `error` - Command failures, API errors
   - `warn` - Rate limits, missing data
   - `info` - Normal operations (bot ready, commands executed)
   - `debug` - Detailed debugging (development only)

2. **Include Context**:
   ```typescript
   // Good
   logger.info({ userId, guildId, commandName }, 'Command executed')
   
   // Bad
   logger.info('Command executed')
   ```

3. **Log Errors Properly**:
   ```typescript
   // Good - includes full error object
   logger.error({ error }, 'Database query failed')
   
   // Bad - only logs message
   logger.error('Database query failed')
   ```

### Rate Limiting

1. **Choose Appropriate Limits**:
   - Too strict: Frustrates legitimate users
   - Too loose: Doesn't prevent abuse
   - Balance: Based on command complexity and user needs

2. **Different Limits for Different Commands**:
   - Expensive operations (database writes): Stricter limits
   - Read-only operations: More lenient limits
   - Critical operations (applications): Very strict limits

3. **User-Friendly Messages**:
   - Clear explanation of rate limit
   - Suggestion to wait and try again
   - Not accusatory or aggressive

---

## Monitoring & Analytics

### Log Analysis

With structured JSON logs, you can:

1. **Filter by Log Level**:
   ```bash
   # Find all errors
   grep '"level":50' logs/bot.log
   ```

2. **Filter by Context**:
   ```bash
   # Find all command logs
   grep '"context":"commands"' logs/bot.log
   ```

3. **Filter by User**:
   ```bash
   # Find logs for specific user
   grep '"userId":"123456789"' logs/bot.log
   ```

### Rate Limit Monitoring

Rate limit violations are logged with:
- `userId` - Who was rate limited
- `commandName` - Which command
- `limiterType` - Which rate limiter triggered

Monitor these logs to:
- Identify abuse patterns
- Adjust rate limits if needed
- Track user behavior

---

## Future Package Considerations

### Potential Additions

1. **@sentry/node** - Error tracking and monitoring
   - Automatic error reporting
   - Performance monitoring
   - Release tracking

2. **ioredis** - Redis client for caching
   - Cache frequently accessed data
   - Session storage
   - Rate limit persistence across restarts

3. **node-cron** - Scheduled tasks
   - Session reminders
   - Cleanup jobs
   - Statistics updates

4. **zod** - Runtime type validation
   - Validate command inputs
   - Type-safe environment variables
   - API response validation

---

## Troubleshooting

### Logs Not Appearing

1. Check `LOG_LEVEL` environment variable
2. Verify `NODE_ENV` is set correctly
3. Check file permissions for log files (if configured)

### Rate Limits Too Strict/Loose

1. Adjust limits in `src/utils/rateLimiter.ts`
2. Monitor rate limit violation logs
3. Test with real usage patterns

### Performance Issues

1. Check log volume (too many debug logs?)
2. Verify pino is using async logging
3. Consider log rotation for file transports

---

## References

- [Pino Documentation](https://getpino.io/)
- [pino-pretty Documentation](https://github.com/pinojs/pino-pretty)
- [discord.js-rate-limiter GitHub](https://github.com/KevinNovak/discord.js-Rate-Limiter)
- [Discord.js Rate Limits Guide](https://discordjs.guide/popular-topics/rate-limits.html)
