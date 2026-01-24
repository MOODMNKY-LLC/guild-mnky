#!/bin/bash

# Discord Bot Setup Script
# This script helps set up the Discord bot for deployment

set -e

echo "🤖 Guild-MNKY Discord Bot Setup"
echo "================================"
echo ""

# Check if .env.bot exists
if [ ! -f ".env.bot" ]; then
    echo "📝 Creating .env.bot from example..."
    cp .env.bot.example .env.bot
    echo "✅ Created .env.bot"
    echo ""
    echo "⚠️  IMPORTANT: Please edit .env.bot and fill in your Discord and Supabase credentials"
    echo "   Run: nano .env.bot"
    echo ""
    read -p "Press Enter after you've configured .env.bot..."
else
    echo "✅ .env.bot already exists"
fi

# Check Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker compose &> /dev/null && ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

echo "✅ Docker is installed"
echo ""

# Deploy commands
echo "📡 Deploying Discord commands..."
cd discord-bot

if ! command -v pnpm &> /dev/null; then
    echo "⚠️  pnpm not found. Installing pnpm..."
    npm install -g pnpm
fi

echo "📦 Installing dependencies..."
pnpm install

echo "🚀 Deploying commands to Discord..."
pnpm run deploy-commands

cd ..
echo "✅ Commands deployed"
echo ""

# Build and start
echo "🐳 Building Docker image..."
docker compose build

echo "🚀 Starting bot container..."
docker compose up -d

echo ""
echo "✅ Bot setup complete!"
echo ""
echo "📊 View logs with: docker compose logs -f discord-bot"
echo "🛑 Stop bot with: docker compose stop discord-bot"
echo "▶️  Start bot with: docker compose start discord-bot"
echo ""
