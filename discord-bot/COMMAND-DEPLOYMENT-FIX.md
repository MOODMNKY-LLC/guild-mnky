# Command Deployment Fix

**Date**: January 24, 2026  
**Issue**: Commands only deployed to one guild  
**Status**: ✅ **FIXED**

---

## Issue Identified

The `deploy-commands.ts` script was only deploying commands to `SHERPA_HUB_GUILD_ID`, which meant commands were only available in the Sherpa Hub server, not in Jupiter's Girth.

---

## Solution Applied

Updated `src/deploy-commands.ts` to deploy commands to **both guilds**:

```typescript
// Deploy to Sherpa Hub
const sherpaData = await rest.put(
  Routes.applicationGuildCommands(clientId, sherpaHubGuildId),
  { body: commands }
)

// Deploy to Jupiter's Girth
const jupiterData = await rest.put(
  Routes.applicationGuildCommands(clientId, jupitersGirthGuildId),
  { body: commands }
)
```

---

## Verification

✅ Commands successfully deployed to both guilds:
- **Sherpa Hub** (1291190711919837234): 3 commands deployed
- **Jupiter's Girth** (573823015511392268): 3 commands deployed

---

## Commands Now Available in Both Servers

- `/sherpa` command group (all subcommands)
- `/sherpa-admin` command group (all subcommands)
- `/voice` command group
  - `/voice join`
  - `/voice leave`

---

## Next Steps

1. **Verify in Discord**: Check that commands appear in both servers
2. **Test Voice Commands**: Try `/voice join` in both servers
3. **Test Multi-Guild**: Verify voice sessions work independently per guild

---

## Note

The bot was already connected to both guilds (as shown in startup logs), but commands needed to be registered separately for each guild when using guild-specific command deployment. This provides instant updates without waiting for global command propagation.

**Status**: ✅ Fixed - Commands now available in both servers!
