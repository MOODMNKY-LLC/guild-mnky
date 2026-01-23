# Browser-Based Authentication Debugging Guide

## Prerequisites

1. **Start your dev servers**:
   ```bash
   # Terminal 1: Start Supabase
   supabase start
   
   # Terminal 2: Start Next.js (runs on 127.0.0.1:3000)
   pnpm dev
   ```

2. **Open Browser DevTools**:
   - Press `F12` or `Ctrl+Shift+I` (Windows/Linux) / `Cmd+Option+I` (Mac)
   - Keep DevTools open during the entire debugging session

## Step-by-Step Debugging Process

### Step 1: Clear Everything First

1. **Clear All Cookies**:
   - DevTools → Application tab → Cookies
   - Select `http://127.0.0.1:3000`
   - Click "Clear All" or delete individual cookies
   - Also clear cookies for `http://127.0.0.1:54321` if present

2. **Clear Console**:
   - DevTools → Console tab
   - Right-click → "Clear console" or press `Ctrl+L`

3. **Clear Network Log**:
   - DevTools → Network tab
   - Click the "Clear" button (🚫 icon)

### Step 2: Navigate to Login Page

1. Navigate to: `http://127.0.0.1:3000/auth/login` (NOT localhost)
2. **Check Console** for any errors
3. **Check Network tab** - filter by "Fetch/XHR" or "All"
4. Look for initial page load requests

### Step 3: Monitor Before Clicking Login

**Console Tab - Look for**:
- `[Login Form] Supabase client created:` - Should show URL, keys, origin, protocol
- `[Login Form] Cookies before OAuth:` - Should show existing cookies
- Any errors or warnings

**Application Tab - Cookies**:
- Check `http://127.0.0.1:3000` cookies
- Should see minimal cookies (maybe just Next.js HMR cookie)
- **Note**: No Supabase cookies should exist yet

**Network Tab**:
- Should be mostly idle
- Watch for any failed requests

### Step 4: Click "Sign in with Discord"

**Immediately After Click**:

1. **Console Tab** - Look for:
   ```
   [Login Form] Cookies immediately after signInWithOAuth: {...}
   [Login Form] Cookie count: X
   [Login Form] Supabase-related cookies found: [...]
   [Supabase Client] PKCE code verifier cookie set: {...}
   ```

2. **Application Tab - Cookies**:
   - Check `http://127.0.0.1:3000` cookies
   - **CRITICAL**: Look for `sb-127-auth-token-code-verifier` cookie
   - Should appear immediately after clicking
   - Check its attributes:
     - `Path`: Should be `/`
     - `SameSite`: Should be `Lax` (for HTTP)
     - `Domain`: Should be empty (NOT `127.0.0.1`)

3. **Network Tab**:
   - Should see redirect to Discord OAuth
   - Look for request to `discord.com/oauth2/authorize`
   - Check request headers for `Cookie` header
   - Verify the code verifier cookie is being sent

### Step 5: After Discord Authorization

**When Redirected Back**:

1. **Network Tab** - Look for:
   - Request to `/auth/callback?code=...`
   - Request to `127.0.0.1:54321/auth/v1/token?grant_type=pkce`
   - Check the token exchange request:
     - **Request Headers**: Should include cookies
     - **Response Headers**: Look for `Set-Cookie` headers
     - **Status**: Should be `200 OK` (not `400 Bad Request`)

2. **Console Tab** - Look for:
   ```
   [Auth Callback] ===== AUTH CALLBACK DEBUG =====
   [Auth Callback] Code parameter: present
   [Auth Callback] Cookies available: [...]
   [Auth Callback] Code verifier cookie: FOUND or MISSING
   [Auth Callback] Auth token cookie before exchange: MISSING (expected)
   ```

3. **If Exchange Succeeds**:
   ```
   [Auth Callback] ===== EXCHANGE SUCCESS =====
   [Auth Callback] Auth token cookie after exchange: SET
   ```

4. **If Exchange Fails**:
   ```
   [Auth Callback] ===== EXCHANGE ERROR =====
   [Auth Callback] Error message: ...
   ```

### Step 6: Check Final State

**Application Tab - Cookies**:
- Check `http://127.0.0.1:3000` cookies
- **Should see**:
  - `sb-127-auth-token` (session cookie) - **THIS IS THE KEY ONE**
  - `sb-127-auth-token-code-verifier` (may still exist or be cleared)

**Console Tab**:
- Should NOT see redirect loops
- Should NOT see "code verifier not found" errors

## Common Issues to Check

### Issue 1: Code Verifier Cookie Not Set

**Symptoms**:
- No `sb-127-auth-token-code-verifier` cookie after clicking login
- Console shows `[Login Form] Supabase-related cookies found: []`

**Check**:
- Console for `[Supabase Client] PKCE code verifier cookie set:` log
- Network tab - check if cookies are being set in request headers
- Application tab - verify cookie isn't being blocked

### Issue 2: Code Verifier Cookie Not Sent to Callback

**Symptoms**:
- Cookie exists before OAuth redirect
- `[Auth Callback] Code verifier cookie: MISSING`

**Check**:
- Cookie `Domain` attribute - should be empty (not `127.0.0.1`)
- Cookie `Path` - should be `/`
- Cookie `SameSite` - should be `Lax` for HTTP
- Network tab - check if cookie is in request headers to callback

### Issue 3: Session Token Not Set After Exchange

**Symptoms**:
- Exchange succeeds (200 OK)
- `[Auth Callback] Auth token cookie after exchange: MISSING`
- No `sb-127-auth-token` cookie in Application tab

**Check**:
- Network tab - token exchange response headers
- Look for `Set-Cookie: sb-127-auth-token=...` in response
- Check if cookie attributes are correct (no domain for IP address)

### Issue 4: Redirect Loop

**Symptoms**:
- After callback, redirected back to `/auth/login`
- Console shows repeated redirects

**Check**:
- Application tab - verify `sb-127-auth-token` cookie exists
- Console - check for `[Auth Callback]` logs
- Network tab - check redirect chain

## Debugging Commands (Browser Console)

Run these in the browser console to check state:

```javascript
// Check all cookies
console.log('All cookies:', document.cookie.split(';').map(c => c.trim()))

// Check Supabase cookies specifically
const supabaseCookies = document.cookie.split(';').filter(c => 
  c.includes('sb-') || c.includes('auth-token') || c.includes('code-verifier')
)
console.log('Supabase cookies:', supabaseCookies)

// Check if code verifier exists
const hasVerifier = document.cookie.includes('code-verifier')
console.log('Has code verifier:', hasVerifier)

// Check if auth token exists
const hasAuthToken = document.cookie.includes('auth-token') && 
                     !document.cookie.includes('code-verifier')
console.log('Has auth token:', hasAuthToken)

// Parse cookies into object
const cookies = {}
document.cookie.split(';').forEach(cookie => {
  const [name, ...valueParts] = cookie.trim().split('=')
  if (name) cookies[name] = decodeURIComponent(valueParts.join('='))
})
console.log('Parsed cookies:', cookies)
```

## Network Tab Filters

Use these filters in Network tab:

- **All**: See everything
- **Fetch/XHR**: See API calls (auth callback, token exchange)
- **Doc**: See page navigations
- **WS**: See WebSocket connections (if any)

## What to Screenshot/Share

If you need help, capture:

1. **Console Tab**: Full console output (especially `[Auth Callback]` logs)
2. **Network Tab**: 
   - The `/auth/callback` request (headers and response)
   - The `127.0.0.1:54321/auth/v1/token` request (headers and response)
3. **Application Tab**: Cookies for `127.0.0.1:3000` (showing all cookies and their attributes)

## Expected Flow Summary

1. ✅ Click login → Code verifier cookie set (`sb-127-auth-token-code-verifier`)
2. ✅ Redirect to Discord → Cookie sent in request
3. ✅ Discord redirects back → Cookie still present
4. ✅ Callback receives code → Code verifier found
5. ✅ Exchange code for session → Session cookie set (`sb-127-auth-token`)
6. ✅ Redirect to `/account` → Session cookie present → Success!

If any step fails, use the debugging steps above to identify where it breaks.
