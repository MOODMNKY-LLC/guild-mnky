# Sherpa Role Auto-Assignment - Implementation Summary

**Status**: ✅ Configured and Ready  
**Date**: 2026-01-23

---

## ✅ What Was Implemented

### 1. Discord Role Assignment Library (`lib/discord-role-assignment.ts`)
- `assignDiscordRole()` - Assigns Discord role via REST API
- `removeDiscordRole()` - Removes Discord role via REST API  
- `syncRoleToDatabase()` - Updates `discord_role_ids` array in profiles table

### 2. Web Admin Panel Integration (`app/(site)/sherpa/actions.ts`)
- When approving application:
  - ✅ Creates Sherpa record in database
  - ✅ Assigns "Sherpa" Discord role via API
  - ✅ Syncs role to `discord_role_ids` array in profiles table
  - ✅ Logs success/failure (doesn't fail approval if role assignment fails)

### 3. Discord Bot Integration (`discord-bot/src/commands/sherpa-admin/review.ts`)
- When approving via `/sherpa-admin review`:
  - ✅ Creates Sherpa record in database
  - ✅ Assigns "Sherpa" Discord role via Discord.js
  - ✅ Syncs roles to database via `syncDiscordRoles()`

### 4. Role Discovery Script (`scripts/get-sherpa-role-id.js`)
- Script to find Sherpa role ID from Discord guild
- Outputs role details and environment variable format

---

## 🔧 Configuration

### Environment Variables Added

```env
# Sherpa Role Auto-Assignment
SHERPA_ROLE_ID=1465613285251354817
NEXT_PUBLIC_SHERPA_ROLE_ID=1465613285251354817
```

### Role Details

- **Role Name**: Sherpa
- **Role ID**: `1465613285251354817`
- **Guild**: D2 SHERPA & LFG HUB (`1291190711919837234`)
- **Color**: #9b59b6 (Purple)

---

## 🎯 How It Works

### Approval Flow

1. **Admin approves application** (web or Discord)
2. **System creates Sherpa record** in database
3. **System assigns Discord role** via API/bot
4. **System syncs role to database** (`discord_role_ids` array)
5. **User now has "Sherpa" role** in Discord and database

### Database Storage

- **Table**: `profiles`
- **Column**: `discord_role_ids` (text array)
- **Format**: `['1465613285251354817', 'other_role_id', ...]`
- **Updated**: `roles_synced_at` timestamp

---

## ✅ Testing Checklist

- [ ] Approve a test application via web admin panel
- [ ] Verify user receives "Sherpa" role in Discord
- [ ] Check `profiles.discord_role_ids` includes role ID
- [ ] Check `profiles.roles_synced_at` is updated
- [ ] Test approval via Discord bot command
- [ ] Verify role persists after user refresh

---

## 📝 Next Steps

1. **Test the implementation**:
   - Approve a test application
   - Verify role assignment works
   - Check database sync

2. **Monitor logs**:
   - Watch for role assignment errors
   - Check if users are in server
   - Verify bot permissions

3. **Future enhancements**:
   - Remove role on denial (if user had it)
   - Remove role on Sherpa deactivation
   - Add role removal API endpoint

---

**Status**: ✅ Ready for Testing  
**Action Required**: Test with a real approval to verify everything works
