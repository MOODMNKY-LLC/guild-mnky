# Discord Bot Packages - Quick Reference

## Installed Packages

### 1. **pino** (v10.3.0)
**Purpose**: High-performance structured JSON logger

**Key Features**:
- 5x faster than alternatives
- Structured JSON logging
- Low overhead
- Production-ready

**Usage**:
```typescript
import { logger, botLogger, commandLogger } from './utils/logger.js'

logger.info('General message')
botLogger.info({ guildId, memberCount }, 'Guild connected')
commandLogger.error({ error, userId }, 'Command failed')
```

**Benefits**:
- All logs are structured (easy to query/filter)
- Fast performance (minimal overhead)
- Integrates with log management tools
- Context-aware logging (bot, commands, events, database)

---

### 2. **pino-pretty** (v13.1.3)
**Purpose**: Pretty-print logs for development

**Key Features**:
- Colorized output
- Human-readable format
- Auto-disabled in production (JSON output)

**Configuration**:
- **Development**: Pretty-printed, colorized logs
- **Production**: JSON logs (for log aggregation)

**Example Output** (Dev):
```
[22:15:30.123] INFO (bot): Bot logged in successfully
    botTag: "Guild-MNKY Bot#1234"
    guildCount: 2
```

---

### 3. **discord.js-rate-limiter** (v1.3.2)
**Purpose**: User-level rate limiting

**Key Features**:
- Prevents command spam
- Per-user rate limiting
- Lightweight and efficient

**Rate Limiters Configured**:
1. **General**: 5 commands / 10 seconds
2. **Applications**: 1 application / 60 seconds
3. **Ratings**: 1 rating / 30 seconds
4. **Votes**: 1 vote / 10 seconds

**Usage**:
```typescript
import { checkRateLimit, generalRateLimiter } from './utils/rateLimiter.js'

if (checkRateLimit(userId, generalRateLimiter, 'sherpa sessions')) {
  // User is rate limited
  return
}
```

**Benefits**:
- Prevents abuse
- Protects bot resources
- Improves user experience
- Logs violations for monitoring

---

## Integration Status

✅ **Logger**: Integrated into all files
- `src/index.ts` - Bot startup, errors
- `src/events/*.ts` - Event handlers
- `src/commands/*.ts` - Command handlers
- `src/utils/database.ts` - Database operations

✅ **Rate Limiter**: Integrated into interaction handler
- Checks before command execution
- Different limits per command type
- User-friendly error messages

---

## Configuration

### Environment Variables

```bash
LOG_LEVEL=info  # fatal, error, warn, info, debug, trace
NODE_ENV=development  # development = pretty logs, production = JSON
```

### Adjusting Rate Limits

Edit `src/utils/rateLimiter.ts`:

```typescript
// Example: Allow 10 commands per 5 seconds
export const generalRateLimiter = new RateLimiter(10, 5000)
```

---

## Monitoring

### View Logs

**Development** (Pretty):
```bash
pnpm dev
# Logs appear in console with colors
```

**Production** (JSON):
```bash
pnpm start | jq  # Use jq to pretty-print JSON
```

### Filter Logs

```bash
# Find all errors
grep '"level":50' logs/bot.log

# Find command logs
grep '"context":"commands"' logs/bot.log

# Find rate limit violations
grep 'rate limited' logs/bot.log
```

---

## Troubleshooting

**Bot not logging?**
- Check `LOG_LEVEL` environment variable
- Verify `NODE_ENV` is set correctly
- Check console output (logs go to stdout)

**Rate limits too strict?**
- Adjust limits in `src/utils/rateLimiter.ts`
- Monitor rate limit violation logs
- Test with real usage patterns

---

For detailed documentation, see `docs/PACKAGES.md`
