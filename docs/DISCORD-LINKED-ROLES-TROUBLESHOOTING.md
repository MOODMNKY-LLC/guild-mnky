# Discord Linked Roles Troubleshooting Guide

**Issue**: User connected Bungie account but role isn't assigned  
**Date**: 2026-01-23

---

## 🔍 Root Cause

**Discord Linked Roles DO NOT auto-assign**. Users must manually claim the role from Server Settings.

**Key Distinction**:
- ❌ **User Settings → Connections**: Personal connections (not server-specific)
- ✅ **Server Settings → Linked Roles**: Server-specific role claiming

---

## ✅ Correct User Flow

### Step 1: Connect Bungie Account (User Settings)
1. Open Discord
2. Go to **User Settings** (gear icon)
3. Go to **Connections**
4. Click **Bungie.net**
5. Authorize connection

### Step 2: Claim Linked Role (Server Settings) ⚠️ **THIS IS THE MISSING STEP**
1. Right-click the **server name** (D2 SHERPA & LFG HUB)
2. Click **Server Settings**
3. Go to **Linked Roles** tab
4. Find **"Verified Guardian"** role
5. Click **"Connect"** or **"Claim Role"** button
6. Verify Bungie.net connection (if not already connected)
7. Role should be assigned immediately

---

## 🔧 Additional Setup Required

### 1. Verify Linked Role Metadata Registration

Linked Roles must be registered via Discord API. Check if metadata is registered:

**API Endpoint**: `PUT /applications/{application_id}/role-connections/metadata`

**Required Metadata**:
```json
[
  {
    "type": 7,  // INTEGER_LESS_THAN_OR_EQUAL
    "key": "account_age",
    "name": "Account Age",
    "description": "Bungie.net account age in days"
  }
]
```

**Check Current Registration**:
```bash
# Use Discord API to check if metadata is registered
curl -X GET "https://discord.com/api/v10/applications/{APPLICATION_ID}/role-connections/metadata" \
  -H "Authorization: Bot YOUR_BOT_TOKEN"
```

### 2. Bot Event Handler (Optional Enhancement)

While Linked Roles should work without bot intervention, we can add event handling to sync roles to database:

**File**: `discord-bot/src/events/guildMemberUpdate.ts`

**Purpose**: Sync role changes to database when Linked Role is claimed

---

## 🐛 Common Issues

### Issue 1: "No Linked Roles Available"
**Cause**: Linked Role metadata not registered via API  
**Solution**: Register metadata using Discord API (see above)

### Issue 2: "Connect Button Not Showing"
**Cause**: User hasn't connected Bungie account in User Settings  
**Solution**: Complete Step 1 above first

### Issue 3: "Role Claimed But Not Showing"
**Cause**: Bot hasn't synced roles to database  
**Solution**: 
- Check bot is running
- Check `guildMemberUpdate` event handler
- Manually sync: User needs to trigger role sync (rejoin server or bot command)

### Issue 4: "Bungie Connection Shows Wrong Account"
**Known Discord/Bungie API Issue**: Sometimes shows wrong platform ID  
**Workaround**: Disconnect and reconnect Bungie account

---

## 📋 Verification Checklist

- [ ] User connected Bungie account in **User Settings → Connections**
- [ ] User claimed role in **Server Settings → Linked Roles**
- [ ] Linked Role metadata registered via Discord API
- [ ] Bot has "Manage Roles" permission
- [ ] Role exists in server (ID: `1465601515833262081`)
- [ ] Bot is running and syncing roles

---

## 🚀 Quick Fix: Manual Role Sync

If user has claimed the role but it's not synced to database:

**Option 1: Bot Command** (if implemented)
```
/sync-roles
```

**Option 2: Manual Database Update**
```sql
-- Update user's discord_role_ids
UPDATE profiles
SET discord_role_ids = array_append(discord_role_ids, '1465601515833262081')
WHERE discord_user_id = 'USER_DISCORD_ID'
AND NOT ('1465601515833262081' = ANY(discord_role_ids));
```

**Option 3: Rejoin Server**
- User leaves and rejoins server
- Bot's `guildMemberAdd` event should sync roles

---

## 📚 References

- [Discord Linked Roles: Community Members](https://support.discord.com/hc/en-us/articles/8063233404823-Connections-Linked-Roles-Community-Members)
- [Discord Linked Roles: Admins](https://support.discord.com/hc/en-us/articles/10388356626711-Connections-Linked-Roles-Admins)
- [Discord API: Configuring App Metadata](https://discord.mintlify.app/developers/docs/tutorials/configuring-app-metadata-for-linked-roles)

---

**Status**: ⚠️ User Action Required  
**Next Step**: Guide user to Server Settings → Linked Roles to claim role
