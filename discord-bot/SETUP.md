# Discord Bot Setup Guide

Quick setup guide for getting the Discord bot running.

## Prerequisites

1. ✅ Database migrations applied (`20260129000000_sherpa_core_schema.sql`)
2. ✅ Discord Bot created in Developer Portal
3. ✅ Bot added to Discord servers
4. ✅ SERVER MEMBERS INTENT enabled

## Quick Start

### 1. Install Dependencies

```bash
cd discord-bot
pnpm install
```

### 2. Configure Environment

Environment variables are already configured in `.env` from the main project's `.env.local`.

The bot uses:
- `DISCORD_BOT_TOKEN` - Already configured
- `DISCORD_CLIENT_ID` - Already configured
- `SUPABASE_URL` - Local Supabase instance (http://localhost:54321)
- `SUPABASE_SERVICE_ROLE_KEY` - Already configured
- `SHERPA_HUB_GUILD_ID` - Already configured
- `JUPITERS_GIRTH_GUILD_ID` - Already configured

### 3. Deploy Commands

Register slash commands with Discord:

```bash
pnpm deploy-commands
```

This deploys commands to Sherpa Hub server (guild-specific for instant updates).

### 4. Run Bot

Development mode:

```bash
pnpm dev
```

Production mode:

```bash
pnpm build
pnpm start
```

## Verification

1. Bot should log in and show connected servers
2. Commands should appear in Discord (type `/` to see them)
3. Test `/sherpa oath` command
4. Check database for any test data

## Next Steps

- Configure channel IDs in `.env` (optional)
- Configure role IDs in `.env` (optional)
- Test all commands
- Set up production hosting

## Troubleshooting

**Bot won't start:**
- Check environment variables are set
- Verify bot token is correct
- Check Supabase credentials

**Commands not appearing:**
- Run `pnpm deploy-commands` again
- Check bot has `applications.commands` scope
- Verify guild ID is correct

**Database errors:**
- Ensure migrations are applied
- Check Supabase service role key
- Verify RLS policies allow service role
