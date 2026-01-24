# Discord Bot Deployment Guide

This guide walks you through deploying the Guild-MNKY Discord bot on your VPS server.

## Prerequisites

- VPS server with Docker and Docker Compose installed
- Discord Bot Token and Client ID
- Supabase project URL and Service Role Key
- Git access to the repository

## Step 1: Clone the Repository

If you haven't already cloned the repo:

```bash
cd /home/moodmnky/apps
git clone <YOUR_REPO_URL> guild-mnky
cd guild-mnky
```

## Step 2: Configure Environment Variables

Create the `.env.bot` file from the example:

```bash
cp .env.bot.example .env.bot
nano .env.bot
```

Fill in the required values:

```env
# Discord Bot Configuration
DISCORD_BOT_TOKEN=your-actual-discord-bot-token
DISCORD_CLIENT_ID=your-actual-discord-client-id

# Guild IDs
SHERPA_HUB_GUILD_ID=1291190711919837234
JUPITERS_GIRTH_GUILD_ID=573823015511392268

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Node Environment
NODE_ENV=production
```

**Important**: Never commit `.env.bot` to git. It contains sensitive credentials.

## Step 3: Deploy Discord Commands

Before starting the bot, you need to register slash commands with Discord:

```bash
cd discord-bot
pnpm install
pnpm run deploy-commands
```

This registers all slash commands to your Discord servers. You only need to run this once (or when you add/modify commands).

## Step 4: Build and Start the Bot

From the repository root:

```bash
# Build and start the container
docker compose up -d --build

# View logs
docker compose logs -f discord-bot
```

The bot should now be running and connected to Discord!

## Step 5: Verify Bot is Running

1. Check container status:
   ```bash
   docker compose ps
   ```

2. Check logs for successful connection:
   ```bash
   docker compose logs discord-bot | grep "Bot logged in"
   ```

3. In Discord, check that the bot appears online and responds to `/sherpa` commands.

## Managing the Bot

### View Logs
```bash
docker compose logs -f discord-bot
```

### Stop the Bot
```bash
docker compose stop discord-bot
```

### Start the Bot
```bash
docker compose start discord-bot
```

### Restart the Bot
```bash
docker compose restart discord-bot
```

### Update the Bot (after code changes)
```bash
git pull
docker compose up -d --build
```

### Remove the Bot
```bash
docker compose down
```

## Troubleshooting

### Bot Not Connecting

1. **Check environment variables**:
   ```bash
   docker compose exec discord-bot env | grep DISCORD
   ```

2. **Check logs for errors**:
   ```bash
   docker compose logs discord-bot
   ```

3. **Verify Discord token is valid** - Check Discord Developer Portal

### Commands Not Appearing

1. **Re-deploy commands**:
   ```bash
   cd discord-bot
   pnpm run deploy-commands
   ```

2. **Wait a few minutes** - Guild commands sync instantly, but global commands can take up to an hour

3. **Check bot permissions** - Bot needs `applications.commands` scope

### Database Connection Issues

1. **Verify Supabase credentials**:
   ```bash
   docker compose exec discord-bot env | grep SUPABASE
   ```

2. **Check Supabase project is active** - Visit Supabase dashboard

3. **Verify migrations are applied** - Check Supabase migrations

### Container Keeps Restarting

1. **Check logs for errors**:
   ```bash
   docker compose logs discord-bot
   ```

2. **Verify all required environment variables are set**

3. **Check container resource limits**:
   ```bash
   docker stats discord-bot
   ```

## Production Considerations

### Auto-restart on Reboot

The `restart: unless-stopped` policy in docker-compose.yml ensures the bot restarts automatically if the server reboots.

### Log Rotation

Logs are configured to rotate automatically (max 10MB, keep 3 files) to prevent disk space issues.

### Monitoring

Consider setting up:
- Health check endpoint (if you add one)
- Log aggregation (e.g., Loki, ELK stack)
- Alerting for bot downtime
- Resource monitoring

### Security

- Keep `.env.bot` secure and never commit it
- Use strong Discord bot tokens
- Rotate Supabase service role keys periodically
- Keep Docker and dependencies updated
- Use firewall rules to restrict access (bot doesn't need inbound ports)

## Next Steps

- Set up monitoring and alerting
- Configure log aggregation
- Set up CI/CD for automated deployments
- Add health checks
- Configure backup strategies for database

## Support

For issues:
1. Check logs: `docker compose logs discord-bot`
2. Verify environment variables
3. Check Discord API status
4. Review Supabase logs
5. Check GitHub issues
