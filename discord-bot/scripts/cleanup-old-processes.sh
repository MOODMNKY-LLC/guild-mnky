#!/bin/bash
# Cleanup Old Bot Processes
# Can be run manually or via cron to clean up orphaned processes

set -e

echo "🧹 Cleaning up old bot processes..."

# Find all bot processes
BOT_PIDS=$(pgrep -f "node.*dist/index.js" 2>/dev/null || true)

if [ -z "$BOT_PIDS" ]; then
    echo "✅ No bot processes found"
    exit 0
fi

echo "📋 Found processes:"
for pid in $BOT_PIDS; do
    ps -p $pid -o pid,user,etime,cmd --no-headers 2>/dev/null || true
done

# Kill all processes
echo "🛑 Stopping all bot processes..."
kill $BOT_PIDS 2>/dev/null || true
sleep 2

# Force kill any remaining
REMAINING=$(pgrep -f "node.*dist/index.js" 2>/dev/null || true)
if [ -n "$REMAINING" ]; then
    echo "⚠️  Force killing remaining processes..."
    kill -9 $REMAINING 2>/dev/null || true
    sleep 1
fi

# Verify cleanup
FINAL=$(pgrep -f "node.*dist/index.js" 2>/dev/null || true)
if [ -z "$FINAL" ]; then
    echo "✅ All bot processes cleaned up"
    rm -f /tmp/discord-bot.pid
    exit 0
else
    echo "⚠️  Warning: Some processes may still be running"
    ps -p $FINAL -o pid,user,cmd --no-headers || true
    exit 1
fi
