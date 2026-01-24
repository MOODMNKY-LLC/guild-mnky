# Guild-MNKY Discord Bot

Discord bot for the Guild-MNKY multi-community ecosystem, supporting Jupiter's Girth and Sherpa Hub communities.

## Features

- **Multi-Guild Support**: Single bot instance serving multiple Discord servers
- **Sherpa Program**: Complete mentorship system with applications, requests, sessions, and ratings
- **Guardian Oath**: Oath acceptance and Oathkeeper Score tracking
- **Vote to Resign**: Group consensus mechanism for session termination
- **Admin Tools**: Application review, statistics, and management commands

## Prerequisites

- Node.js 18+ 
- Discord Bot Token
- Supabase Project (with migrations applied)
- Discord Server with bot added

## Setup

### 1. Install Dependencies

```bash
cd discord-bot
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Required variables:
- `DISCORD_BOT_TOKEN` - Your Discord bot token
- `DISCORD_CLIENT_ID` - Your Discord application client ID
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key
- `SHERPA_HUB_GUILD_ID` - Sherpa Hub Discord server ID
- `JUPITERS_GIRTH_GUILD_ID` - Jupiter's Girth Discord server ID

Optional variables:
- `SHERPA_APPLICATIONS_CHANNEL_ID` - Channel for posting applications
- `SHERPA_REQUESTS_CHANNEL_ID` - Channel for posting requests
- `SHERPA_SESSIONS_CHANNEL_ID` - Channel for session updates
- `SHERPA_ROLE_ID` - Role ID for Sherpas
- `SHERPA_ADMIN_ROLE_ID` - Role ID for Sherpa admins
- `OATHKEEPER_ROLE_ID` - Role ID for Oathkeepers
- `WELCOME_CHANNEL_ID` - Channel for welcome messages

### 3. Deploy Commands

Register slash commands with Discord:

```bash
npm run deploy-commands
```

This will deploy commands to Sherpa Hub server. Commands update instantly for guild-specific commands.

### 4. Run the Bot

**Development mode** (with auto-reload):

```bash
pnpm run dev
```

**Production mode** (with automatic cleanup of old processes):

```bash
pnpm build
pnpm run start:clean
```

**Restart bot** (stops old processes, rebuilds if needed, starts fresh):

```bash
pnpm run restart
```

**Stop bot**:

```bash
pnpm run stop
```

> **Note**: Always use `start:clean` or `restart` instead of `start` to prevent accumulation of old bot processes. See `README-PROCESS-MANAGEMENT.md` for details.

## Bot Permissions

The bot requires the following permissions:

- **Gateway Intents**:
  - ✅ SERVER MEMBERS INTENT (Required)
  - ❌ MESSAGE CONTENT INTENT (Not needed for slash commands)
  - ❌ PRESENCE INTENT (Optional)

- **Bot Permissions** (268445696 decimal):
  - Send Messages
  - Manage Messages
  - Read Message History
  - Add Reactions
  - Embed Links
  - Attach Files
  - Manage Roles
  - Manage Channels (Optional)

## Commands

### Public Commands

- `/sherpa apply` - Start Sherpa application process
- `/sherpa request [activity] [difficulty] [scheduled_time] [notes]` - Create a Sherpa request
- `/sherpa sessions [filter]` - List upcoming or past sessions
- `/sherpa profile [user]` - View Sherpa profile and statistics
- `/sherpa oath` - Display Guardian Oath principles
- `/sherpa rating [session_id]` - Rate a completed session
- `/sherpa vote-resign [session_id]` - Vote to end session without penalty

### Admin Commands

- `/sherpa-admin review [application_id] [action] [reason]` - Review and approve/deny applications
- `/sherpa-admin list [status]` - List applications by status
- `/sherpa-admin stats` - Display program statistics

## Project Structure

```
discord-bot/
├── src/
│   ├── index.ts                 # Main entry point
│   ├── deploy-commands.ts       # Command registration script
│   ├── commands/
│   │   ├── sherpa/              # Public Sherpa commands
│   │   └── sherpa-admin/        # Admin commands
│   ├── events/
│   │   ├── guildMemberAdd.ts    # Member join handler
│   │   └── interactionCreate.ts # Interaction router
│   ├── utils/
│   │   ├── database.ts          # Supabase helpers
│   │   └── embeds.ts            # Embed builders
│   └── config/
│       └── constants.ts         # Configuration constants
├── package.json
├── tsconfig.json
└── README.md
```

## Development

### Adding New Commands

1. Create command handler in `src/commands/[group]/[command].ts`
2. Export handler function
3. Import and route in `src/events/interactionCreate.ts`
4. Add command definition to `src/deploy-commands.ts`
5. Run `pnpm deploy-commands`

### Database Integration

The bot uses Supabase for all data operations. Ensure:
- Migrations are applied (`supabase/migrations/20260129000000_sherpa_core_schema.sql`)
- RLS policies allow service role access
- Helper functions are available (`get_community_by_guild_id`, etc.)

### Testing

1. Create a test Discord server
2. Add bot with test token
3. Deploy commands to test server
4. Test commands and interactions
5. Check database for data persistence

## Troubleshooting

### Commands Not Appearing

- Ensure `deploy-commands.ts` ran successfully
- Check bot has `applications.commands` scope
- Verify guild ID is correct
- Wait a few minutes for Discord to sync (guild commands are instant)

### Database Errors

- Verify Supabase credentials are correct
- Check migrations are applied
- Ensure RLS policies allow service role access
- Check database logs for detailed errors

### Permission Errors

- Verify bot has required permissions in server
- Check SERVER MEMBERS INTENT is enabled in Developer Portal
- Ensure bot role is above roles it needs to assign

## Deployment

### Production Checklist

- [ ] Environment variables configured
- [ ] Commands deployed
- [ ] Bot added to servers
- [ ] Permissions configured
- [ ] Intents enabled
- [ ] Database migrations applied
- [ ] Channel IDs configured (optional)
- [ ] Role IDs configured (optional)
- [ ] Monitoring/logging set up

### Hosting Options

- **VPS**: Run with PM2 or systemd
- **Docker**: Containerize bot
- **Cloud Functions**: Serverless deployment
- **Discord Bot Hosting**: Use specialized hosting services

## Support

For issues or questions:
1. Check logs in console
2. Review error messages
3. Verify configuration
4. Check Discord API status
5. Review Supabase logs

## License

MIT
