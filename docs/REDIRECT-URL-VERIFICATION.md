# Redirect URL Configuration Verification

## Date: 2026-01-23

## Current Configuration

### Supabase Config (`supabase/config.toml`)

**Site URL** (line 152):
```toml
site_url = "http://localhost:3000"
```
✅ **CORRECT** - Matches Next.js app URL

**Additional Redirect URLs** (lines 156-161):
```toml
additional_redirect_urls = [
  "http://localhost:3000",
  "https://localhost:3000",
  "http://localhost:3000/auth/callback",
  "https://localhost:3000/auth/callback"
]
```
✅ **CORRECT** - Includes callback URL

**Discord OAuth Redirect URI** (line 336):
```toml
redirect_uri = "http://localhost:54321/auth/v1/callback"
```
✅ **CORRECT** - This is Supabase's internal callback URL (not your app's callback)

### Login Form (`components/login-form.tsx`)

**Redirect URL Used** (line 52):
```typescript
const redirectUrl = `${currentOrigin}/auth/callback?next=/protected`
// Results in: http://localhost:3000/auth/callback?next=/protected
```

## Analysis

### ✅ What's Correct

1. **Site URL**: Matches your Next.js app (`http://localhost:3000`)
2. **Callback URL Base**: `http://localhost:3000/auth/callback` is in the allow list
3. **Host Consistency**: All URLs use `localhost` (not `127.0.0.1`)
4. **Discord Redirect URI**: Points to Supabase's internal callback (correct)

### ⚠️ Potential Issue: Query Parameters

The login form redirects to: `http://localhost:3000/auth/callback?next=/protected`

Supabase's `additional_redirect_urls` includes: `http://localhost:3000/auth/callback`

**Question**: Does Supabase match redirect URLs with query parameters?

**Answer**: According to Supabase documentation, redirect URL matching is typically done on the **base URL** (without query parameters). Query parameters like `?next=/protected` are usually allowed and don't need to be explicitly listed.

However, to be **100% certain**, we should verify this works, or add the full URL with query params to be safe.

## Recommendations

### Option 1: Test Current Configuration (Recommended First)
Test the current setup. Supabase should accept `http://localhost:3000/auth/callback?next=/protected` if `http://localhost:3000/auth/callback` is in the allow list.

### Option 2: Add Query Parameter Variants (If Option 1 Fails)
If you encounter redirect errors, add these to `additional_redirect_urls`:

```toml
additional_redirect_urls = [
  "http://localhost:3000",
  "https://localhost:3000",
  "http://localhost:3000/auth/callback",
  "https://localhost:3000/auth/callback",
  "http://localhost:3000/auth/callback?next=/protected",
  "https://localhost:3000/auth/callback?next=/protected",
  # Add other common next paths if needed
  "http://localhost:3000/auth/callback?next=/",
  "https://localhost:3000/auth/callback?next=/",
]
```

### Option 3: Use Wildcard Pattern (If Supported)
Some Supabase configurations support wildcards, but this needs verification for your version.

## Verification Steps

1. **Check Supabase Logs**: When OAuth fails, check Supabase logs for redirect URL mismatch errors
2. **Test OAuth Flow**: Try logging in and watch for any "redirect URL not allowed" errors
3. **Check Browser Console**: Look for OAuth errors in browser DevTools
4. **Check Terminal**: Look for Supabase auth errors in your Next.js terminal

## Expected Behavior

When Discord redirects back after OAuth:
1. Discord → `http://localhost:54321/auth/v1/callback` (Supabase internal)
2. Supabase → `http://localhost:3000/auth/callback?next=/protected` (your app)
3. Your app → `/protected` (after code exchange)

## Current Status

✅ **Configuration appears correct** - The base callback URL is in the allow list, and Supabase should accept query parameters.

⚠️ **Monitor for errors** - If you see "redirect URL not allowed" errors, add the full URL with query params to `additional_redirect_urls`.

## Production Considerations

When deploying to production, update:

1. **Site URL**: Change to your production domain
2. **Additional Redirect URLs**: Add production callback URLs
3. **Discord Redirect URI**: Update in Discord Developer Portal to production Supabase callback URL

Example production config:
```toml
site_url = "https://yourdomain.com"
additional_redirect_urls = [
  "https://yourdomain.com",
  "https://yourdomain.com/auth/callback",
  # Add any other production URLs
]
```
