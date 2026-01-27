# Discord Linked Roles Setup - Complete Guide

**Date**: 2026-01-23  
**Status**: ✅ Implementation Complete + User Guide Created

---

## ✅ What Was Fixed

### Issue Identified
**Linked Roles don't auto-assign** - Users must manually claim them from Server Settings → Linked Roles.

### Solution Implemented

1. **Updated Verification Component** (`components/sherpa/bungie-verification-check.tsx`)
   - Clearer instructions distinguishing User Settings vs Server Settings
   - Emphasis on manual claiming requirement
   - Step-by-step guide with visual indicators

2. **Created User Guide** (`docs/LINKED-ROLES-USER-GUIDE.md`)
   - Complete step-by-step instructions
   - Troubleshooting section
   - Visual guide for finding Linked Roles

3. **Added Bot Event Handler** (`discord-bot/src/events/guildMemberUpdate.ts`)
   - Syncs role changes to database automatically
   - Logs when Verified Guardian role is assigned
   - Handles role updates gracefully

4. **Registered Event Handler** (`discord-bot/src/index.ts`)
   - Bot now listens for role changes
   - Automatically syncs to database

---

## 📋 Correct User Flow

### Step 1: Connect Bungie Account (User Settings)
1. Discord → ⚙️ User Settings → Connections
2. Click Bungie.net → Authorize
3. ✅ Account connected

### Step 2: Claim Linked Role (Server Settings) ⚠️ **REQUIRED**
1. Right-click server name → Server Settings
2. Go to **Linked Roles** tab (left sidebar)
3. Find "Verified Guardian" → Click "Connect" or "Claim Role"
4. ✅ Role assigned immediately

---

## 🔧 Bot Configuration

**Event Handler**: `guildMemberUpdate`
- Automatically syncs role changes to database
- Logs Verified Guardian role assignments
- Updates `profiles.discord_role_ids` array

**Environment Variables**:
```env
VERIFIED_GUARDIAN_ROLE_ID=1465601515833262081
# Or use NEXT_PUBLIC_VERIFIED_GUARDIAN_ROLE_ID (bot reads both)
```

---

## 🧪 Testing Checklist

- [ ] User connects Bungie account in User Settings
- [ ] User goes to Server Settings → Linked Roles
- [ ] User claims "Verified Guardian" role
- [ ] Role appears in Discord immediately
- [ ] Bot syncs role to database (`guildMemberUpdate` event)
- [ ] User refreshes `/sherpa/apply` page
- [ ] Application form appears (verification check passes)

---

## 📚 Documentation Created

1. **`docs/LINKED-ROLES-USER-GUIDE.md`** - User-facing guide
2. **`docs/DISCORD-LINKED-ROLES-TROUBLESHOOTING.md`** - Troubleshooting guide
3. **`docs/LINKED-ROLES-SETUP-COMPLETE.md`** - This file

---

## 🚀 Next Steps

1. **Test the flow yourself**:
   - Follow the user guide steps
   - Verify role assignment works
   - Check database sync

2. **Share user guide**:
   - Link to `docs/LINKED-ROLES-USER-GUIDE.md` in Discord
   - Pin in #announcements or #help channel

3. **Monitor bot logs**:
   - Check `guildMemberUpdate` events are firing
   - Verify role syncs are working

---

**Status**: ✅ Ready for Testing  
**User Action Required**: Claim role from Server Settings → Linked Roles
