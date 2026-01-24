# Quick Start Guide

## 🚀 Fast Setup (Automated)

Run the setup script:

```bash
cd /home/moodmnky/apps/guild-mnky
./setup-bot.sh
```

The script will:
1. Create `.env.bot` from example (if needed)
2. Prompt you to fill in credentials
3. Deploy Discord commands
4. Build and start the Docker container

## 📝 Manual Setup

### 1. Create Environment File

```bash
cp .env.bot.example .env.bot
nano .env.bot
```

Fill in:
- `DISCORD_BOT_TOKEN` - From Discord Developer Portal
- `DISCORD_CLIENT_ID` - From Discord Developer Portal  
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key

### 2. Deploy Commands

```bash
cd discord-bot
pnpm install
pnpm run deploy-commands
cd ..
```

### 3. Start Bot

```bash
docker compose up -d --build
```

### 4. Check Status

```bash
docker compose logs -f discord-bot
```

You should see: `Bot logged in successfully`

## ✅ Verification

1. Bot appears online in Discord
2. `/sherpa` command works
3. No errors in logs

## 🔧 Common Commands

```bash
# View logs
docker compose logs -f discord-bot

# Stop bot
docker compose stop discord-bot

# Start bot  
docker compose start discord-bot

# Restart bot
docker compose restart discord-bot

# Update after code changes
git pull && docker compose up -d --build
```

## 📚 Full Documentation

See `DISCORD-BOT-DEPLOYMENT.md` for detailed information.
