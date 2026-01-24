# Bot Process Management

This document describes how to manage bot processes and prevent accumulation of old processes.

## Problem

When restarting the bot manually, old processes can accumulate, causing:
- Multiple bot instances running simultaneously
- Conflicting behavior
- Resource waste
- "Unknown command" errors

## Solution

We've added automated cleanup scripts that ensure only one bot instance runs at a time.

## Available Scripts

### Start Bot (with cleanup)
```bash
pnpm run start:clean
# or directly:
./scripts/start-bot.sh
```

This script:
1. Finds and kills all existing bot processes
2. Starts a new bot instance
3. Saves PID to `/tmp/discord-bot.pid`
4. Logs to `/tmp/discord-bot.log`

### Stop Bot
```bash
pnpm run stop
# or directly:
./scripts/stop-bot.sh
```

This script:
1. Finds all bot processes
2. Attempts graceful shutdown (SIGTERM)
3. Force kills if needed (SIGKILL)
4. Removes PID file

### Restart Bot
```bash
pnpm run restart
# or directly:
./scripts/restart-bot.sh
```

This script:
1. Stops all bot processes
2. Builds if needed
3. Starts a new instance

### Cleanup Old Processes (Manual)
```bash
./scripts/cleanup-old-processes.sh
```

Useful for cleaning up orphaned processes without starting a new bot.

## Recommended Usage

### Development
```bash
# Use the dev script (auto-reloads on changes)
pnpm run dev
```

### Production
```bash
# Build first
pnpm build

# Start with automatic cleanup
pnpm run start:clean
```

### Restart After Code Changes
```bash
# This handles everything: stop, build, start
pnpm run restart
```

## Automatic Cleanup (Optional)

You can set up a cron job to periodically clean up orphaned processes:

```bash
# Edit crontab
crontab -e

# Add this line to run cleanup every hour
0 * * * * /home/moodmnky/apps/guild-mnky/discord-bot/scripts/cleanup-old-processes.sh >> /tmp/bot-cleanup.log 2>&1
```

## Process Files

- **PID File**: `/tmp/discord-bot.pid` - Contains the current bot process ID
- **Log File**: `/tmp/discord-bot.log` - Bot output and error logs

## Troubleshooting

### Multiple Processes Still Running

If you see multiple processes after using the scripts:

```bash
# Check what's running
ps aux | grep "node.*dist/index.js"

# Manual cleanup
./scripts/cleanup-old-processes.sh

# Or kill specific PIDs
kill -9 <PID>
```

### Root-Owned Processes

If you see root-owned processes that won't die:

```bash
# Try with sudo (if you have permission)
sudo pkill -9 -f "node.*dist/index.js"

# Or kill specific root PID
sudo kill -9 <PID>
```

### Bot Won't Start

Check logs:
```bash
tail -50 /tmp/discord-bot.log
```

Common issues:
- Port already in use (unlikely for Discord bot)
- Missing environment variables
- Build errors (run `pnpm build` first)

## Best Practices

1. **Always use `start:clean`** instead of `start` to prevent process accumulation
2. **Use `restart`** when deploying code changes
3. **Check logs** if something seems wrong: `tail -f /tmp/discord-bot.log`
4. **Set up cron cleanup** if running in production for extended periods
