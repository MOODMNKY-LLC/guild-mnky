#!/bin/bash
# Bot Stop Script
# Gracefully stops all bot processes

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
PID_FILE="/tmp/discord-bot.pid"

cd "$BOT_DIR"

echo "🔍 Finding bot processes..."

# Find all bot processes
BOT_PIDS=$(pgrep -f "node.*dist/index.js" 2>/dev/null || true)

if [ -z "$BOT_PIDS" ]; then
    echo "✅ No bot processes found"
    rm -f "$PID_FILE"
    exit 0
fi

echo "📋 Found bot processes:"
for pid in $BOT_PIDS; do
    ps -p $pid -o pid,user,cmd --no-headers 2>/dev/null || true
done

echo "🛑 Stopping bot processes..."

# Try graceful shutdown first
kill $BOT_PIDS 2>/dev/null || true
sleep 3

# Check if any are still running
REMAINING=$(pgrep -f "node.*dist/index.js" 2>/dev/null || true)

if [ -n "$REMAINING" ]; then
    echo "⚠️  Some processes didn't stop gracefully, forcing shutdown..."
    kill -9 $REMAINING 2>/dev/null || true
    sleep 1
fi

# Verify all stopped
FINAL_CHECK=$(pgrep -f "node.*dist/index.js" 2>/dev/null || true)

if [ -z "$FINAL_CHECK" ]; then
    echo "✅ All bot processes stopped"
    rm -f "$PID_FILE"
    exit 0
else
    echo "⚠️  Warning: Some processes may still be running:"
    ps -p $FINAL_CHECK -o pid,user,cmd --no-headers || true
    exit 1
fi
