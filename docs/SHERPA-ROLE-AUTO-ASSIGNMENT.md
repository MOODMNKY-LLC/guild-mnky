# Sherpa Role Auto-Assignment

**Feature**: Automatically assign Discord "Sherpa" role when application is approved  
**Date**: 2026-01-23  
**Status**: ✅ Configured

---

## Overview

When a Sherpa application is approved (via web admin panel or Discord bot), the system will:
1. ✅ Create Sherpa record in database
2. ✅ Assign "Sherpa" Discord role to the user
3. ✅ Sync role to database (`discord_role_ids` array in profiles table)

---

## Configuration

### Environment Variables

Add to `.env.local`:
```env
# Discord Sherpa Role (auto-assigned on approval)
SHERPA_ROLE_ID=1465613285251354817
NEXT_PUBLIC_SHERPA_ROLE_ID=1465613285251354817

# Discord Guild ID (Sherpa Hub)
SHERPA_HUB_GUILD_ID=1291190711919837234
NEXT_PUBLIC_DISCORD_GUILD_ID=1291190711919837234

# Discord Bot Token (required for role assignment)
DISCORD_BOT_TOKEN=your_bot_token_here
```

### Role Details

- **Role Name**: Sherpa
- **Role ID**: `1465613285251354817`
- **Guild**: D2 SHERPA & LFG HUB (`1291190711919837234`)
- **Color**: #9b59b6 (Purple)
- **Position**: 1

---

## Implementation

### 1. Web Admin Panel (`app/(site)/sherpa/actions.ts`)

When approving via web admin panel:
- Creates Sherpa record in database
- Calls `assignDiscordRole()` to assign Discord role via API
- Calls `syncRoleToDatabase()` to update `discord_role_ids` array
- Logs success/failure (doesn't fail approval if role assignment fails)

### 2. Discord Bot Command (`discord-bot/src/commands/sherpa-admin/review.ts`)

When approving via `/sherpa-admin review`:
- Creates Sherpa record in database
- Uses Discord.js `member.roles.add()` to assign role
- Calls `syncDiscordRoles()` to sync to database
- Logs success/failure

### 3. Role Assignment Library (`lib/discord-role-assignment.ts`)

**Functions**:
- `assignDiscordRole()` - Assigns role via Discord REST API
- `removeDiscordRole()` - Removes role via Discord REST API
- `syncRoleToDatabase()` - Updates `discord_role_ids` in profiles table

---

## Database Storage

The Sherpa role is stored in:
- **Table**: `profiles`
- **Column**: `discord_role_ids` (text array)
- **Format**: `['1465613285251354817', 'other_role_id', ...]`
- **Sync Timestamp**: `roles_synced_at` (updated when roles change)

---

## Error Handling

### If Role Assignment Fails

- **Approval still succeeds** - Application is approved and Sherpa record is created
- **Error is logged** - Check server logs for details
- **Common causes**:
  - User not in Discord server
  - Bot doesn't have permission to assign roles
  - Role ID incorrect
  - Bot token invalid

### Manual Role Assignment

If auto-assignment fails, admins can:
1. Manually assign role in Discord
2. Use `/api/sync-discord-roles` endpoint to sync roles to database
3. Or wait for `guildMemberUpdate` event to auto-sync

---

## Testing

### Test Role Assignment

1. **Approve a test application** via web admin panel
2. **Check Discord** - User should have "Sherpa" role
3. **Check Database**:
   ```sql
   SELECT discord_role_ids, roles_synced_at 
   FROM profiles 
   WHERE id = 'user_profile_id';
   ```
   Should include `1465613285251354817` in `discord_role_ids` array

### Verify Role Sync

After role is assigned:
- Check `profiles.discord_role_ids` includes Sherpa role ID
- Check `profiles.roles_synced_at` is updated
- Role should persist even if user leaves/rejoins server (until manually removed)

---

## Future Enhancements

### Role Removal on Denial

Currently, role is only assigned on approval. Future enhancement:
- Remove role if application is denied (if user had role from previous approval)
- Add `removeDiscordRole()` call in denial flow

### Role Removal on Deactivation

When a Sherpa is deactivated:
- Remove "Sherpa" Discord role
- Update `discord_role_ids` array
- Log role removal

---

## Troubleshooting

### Role Not Assigned

1. **Check environment variables**:
   ```bash
   echo $SHERPA_ROLE_ID
   echo $DISCORD_BOT_TOKEN
   ```

2. **Check bot permissions**:
   - Bot needs "Manage Roles" permission
   - Bot's role must be higher than "Sherpa" role in hierarchy

3. **Check user is in server**:
   - User must be a member of the Discord server
   - Bot can't assign roles to users not in server

4. **Check logs**:
   - Look for "Failed to assign Discord role" warnings
   - Check Discord API error messages

### Role Not Synced to Database

1. **Check `discord_user_id`**:
   ```sql
   SELECT discord_user_id FROM profiles WHERE id = 'user_id';
   ```
   Must not be NULL

2. **Manually sync**:
   - Use `/api/sync-discord-roles` endpoint
   - Or wait for `guildMemberUpdate` event

---

**Status**: ✅ Configured and Ready  
**Next Step**: Add environment variables and test with a real approval
