#!/bin/bash
# Bot Restart Script
# Stops and starts the bot with cleanup

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$BOT_DIR"

echo "🔄 Restarting bot..."

# Stop bot
"$SCRIPT_DIR/stop-bot.sh"

# Build if needed
if [ ! -f "dist/index.js" ]; then
    echo "🔨 Building bot..."
    pnpm build
fi

# Start bot
"$SCRIPT_DIR/start-bot.sh"

echo "✅ Bot restarted successfully"
