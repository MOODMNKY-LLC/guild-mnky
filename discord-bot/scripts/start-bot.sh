#!/bin/bash
# Bot Startup Script with Automatic Cleanup
# Kills old bot processes before starting a new one

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
LOG_FILE="/tmp/discord-bot.log"
PID_FILE="/tmp/discord-bot.pid"

cd "$BOT_DIR"

echo "🔍 Checking for existing bot processes..."

# Find all bot processes (both root and user-owned)
BOT_PIDS=$(pgrep -f "node.*dist/index.js" 2>/dev/null || true)

if [ -n "$BOT_PIDS" ]; then
    echo "⚠️  Found existing bot processes:"
    for pid in $BOT_PIDS; do
        ps -p $pid -o pid,user,cmd --no-headers 2>/dev/null || true
    done
    
    echo "🧹 Cleaning up old processes..."
    
    # Try to kill gracefully first (only processes we own)
    for pid in $BOT_PIDS; do
        # Check if we can kill this process (not root-owned if we're not root)
        if kill -0 $pid 2>/dev/null; then
            kill $pid 2>/dev/null || true
        fi
    done
    sleep 2
    
    # Force kill any remaining processes we can access
    REMAINING=$(pgrep -f "node.*dist/index.js" 2>/dev/null || true)
    if [ -n "$REMAINING" ]; then
        for pid in $REMAINING; do
            if kill -0 $pid 2>/dev/null; then
                kill -9 $pid 2>/dev/null || true
            fi
        done
        sleep 1
    fi
    
    # Check for root-owned processes we couldn't kill
    ROOT_PROCESSES=$(pgrep -f "node.*dist/index.js" 2>/dev/null | xargs -I {} sh -c 'ps -p {} -o user --no-headers 2>/dev/null | grep -q "^root$" && echo {}' || true)
    if [ -n "$ROOT_PROCESSES" ]; then
        echo "⚠️  Warning: Root-owned processes still running (may need sudo to kill):"
        for pid in $ROOT_PROCESSES; do
            ps -p $pid -o pid,user,cmd --no-headers 2>/dev/null || true
        done
        echo "💡 To kill root processes: sudo pkill -9 -f 'node.*dist/index.js'"
    else
        echo "✅ Old processes cleaned up"
    fi
else
    echo "✅ No existing bot processes found"
fi

# Remove old PID file if it exists
rm -f "$PID_FILE"

echo "🚀 Starting bot..."
echo "📝 Logs will be written to: $LOG_FILE"

# Start bot in background and save PID
nohup node dist/index.js > "$LOG_FILE" 2>&1 &
BOT_PID=$!

# Save PID to file
echo $BOT_PID > "$PID_FILE"

# Wait a moment to check if it started successfully
sleep 2

if ps -p $BOT_PID > /dev/null 2>&1; then
    echo "✅ Bot started successfully (PID: $BOT_PID)"
    echo "📋 View logs: tail -f $LOG_FILE"
    echo "🛑 Stop bot: kill $BOT_PID"
    exit 0
else
    echo "❌ Bot failed to start. Check logs: $LOG_FILE"
    tail -20 "$LOG_FILE"
    exit 1
fi
