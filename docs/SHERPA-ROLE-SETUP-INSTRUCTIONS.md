# Sherpa Role Setup Instructions

**Quick Setup Guide** for enabling Discord role auto-assignment

---

## ✅ What's Already Done

- ✅ Code implemented and ready
- ✅ Environment variables configured
- ✅ Role ID discovered: `1465613285251354817`
- ✅ Bot role hierarchy verified (correct)

---

## ⚠️ What Needs to Be Done

### Enable "Manage Roles" Permission

The bot needs permission to assign roles. Follow these steps:

1. **Open Discord** → Right-click server name → **Server Settings**

2. **Go to Roles** → Click **Roles** in left sidebar

3. **Find Bot's Role** ("GIRTH") → Click to edit

4. **Enable Permission**:
   - Scroll to **Permissions** section
   - Find **"Manage Roles"**
   - ✅ **Toggle ON**
   - Click **Save Changes**

5. **Verify**:
   - Bot's role should show "Manage Roles" as enabled
   - Bot's role position should be higher than "Sherpa" role

---

## 🧪 Test After Setup

1. **Approve a test application** via web admin panel
2. **Check Discord** - User should receive "Sherpa" role
3. **Check logs** - Should see success message (no 403 error)
4. **Check database** - `discord_role_ids` should include role ID

---

## 📋 Verification Commands

**Check bot permissions**:
```bash
node scripts/check-bot-permissions.js
```

**Check role assignment**:
- Approve application → Check Discord → User should have role
- Check terminal logs → Should see "✅ Assigned Sherpa role"

---

## ✅ Once Fixed

After enabling "Manage Roles" permission:
- ✅ Role assignment will work automatically
- ✅ No code changes needed
- ✅ Future approvals will assign role successfully

---

**Status**: ⚠️ Waiting for Discord Permission Fix  
**Estimated Time**: 2 minutes  
**Action**: Enable "Manage Roles" in Discord Server Settings
