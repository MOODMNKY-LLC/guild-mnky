# Authentication Debugging Guide

## Date: 2026-01-23

## Critical Fix Applied

### Issue: Cookie Options Not Preserved
**Problem**: When copying cookies from `cookieStore` to redirect response, we were trying to read cookie options from `cookieStore.getAll()`, but Next.js cookies API only returns `name` and `value` - it doesn't return options.

**Solution**: We now capture cookie options when they're set via `setAll()` and store them in a Map, then use those stored options when copying cookies to the redirect response.

## How to Test Authentication Flow

### Prerequisites
1. **Supabase must be running locally**:
   ```bash
   supabase start
   ```

2. **Next.js dev server must be running**:
   ```bash
   npm run dev
   ```

3. **Access via `localhost` (not `127.0.0.1`)**:
   - ✅ Correct: `http://localhost:3000`
   - ❌ Wrong: `http://127.0.0.1:3000`

### Testing Steps

1. **Clear all cookies** in your browser for `localhost:3000`

2. **Navigate to login page**:
   ```
   http://localhost:3000/auth/login
   ```

3. **Check browser console** for any errors

4. **Click "Continue with Discord"**

5. **Monitor the OAuth flow**:
   - Should redirect to Discord
   - After Discord approval, should redirect back to `/auth/callback?code=...`
   - Should then redirect to `/protected`

6. **Check terminal logs** for:
   ```
   [Auth Callback] ===== ROUTE HANDLER CALLED =====
   [Auth Callback] setAll() called with X cookies
   [Auth Callback] Set cookie: sb-localhost-auth-token.0 with options: {...}
   [Auth Callback] ===== EXCHANGE SUCCESS =====
   [Auth Callback] Auth token cookie: SET ✅ (sb-localhost-auth-token.0)
   [Auth Callback] Copying cookie to redirect: sb-localhost-auth-token.0
   ```

7. **Check browser DevTools**:
   - **Application → Cookies → http://localhost:3000**
   - Should see: `sb-localhost-auth-token.0` cookie
   - Should see: `sb-localhost-auth-token-code-verifier` (may be deleted after exchange)

8. **Verify session persists**:
   - Refresh the page
   - Should stay on `/protected` (no redirect to login)
   - Check Network tab - should see authenticated requests

## Common Issues & Solutions

### Issue: Redirect Loop
**Symptoms**: After Discord OAuth, redirects back to `/auth/login` repeatedly

**Causes**:
1. ❌ Cookie not being copied to redirect response (FIXED)
2. ❌ Proxy intercepting callback route (VERIFIED - excluded)
3. ❌ Host mismatch causing cookie name issues (FIXED - use localhost consistently)

**Debug Steps**:
1. Check terminal logs for `[Auth Callback]` messages
2. Check browser DevTools → Application → Cookies
3. Check Network tab → `/auth/callback` → Response Headers → `Set-Cookie`
4. Verify you're accessing via `localhost`, not `127.0.0.1`

### Issue: Cookie Not Set
**Symptoms**: No `sb-localhost-auth-token` cookie in browser

**Debug Steps**:
1. Check terminal logs - should see `setAll() called` and `Copying cookie to redirect`
2. Check Network tab → `/auth/callback` → Response Headers
3. Look for `Set-Cookie` headers in the redirect response
4. Verify cookie options are being logged correctly

### Issue: Host Mismatch
**Symptoms**: Cookie names like `sb-127-auth-token` vs `sb-localhost-auth-token`

**Solution**:
- Always use `http://localhost:3000` (not `127.0.0.1`)
- Ensure `.env.local` has `NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321`
- Ensure `supabase/config.toml` uses `localhost` in `site_url`

## Network Tab Debugging

### Key Requests to Monitor

1. **Initial Login Page**:
   - Request: `GET /auth/login`
   - Check: Response status, cookies set

2. **Discord OAuth Initiation**:
   - Request: `GET /auth/v1/authorize?...` (to Supabase)
   - Check: Redirect URL includes correct callback

3. **Discord Callback**:
   - Request: `GET /auth/callback?code=...`
   - **CRITICAL**: Check Response Headers → `Set-Cookie`
   - Should see: `sb-localhost-auth-token.0=...`
   - Check: Status 302 (redirect)
   - Check: `Location` header points to `/protected`

4. **Protected Page**:
   - Request: `GET /protected`
   - Check: Includes `Cookie` header with auth token
   - Check: Response status (200 = authenticated, 302 = redirect to login)

## Terminal Logging

The callback route logs extensively. Look for:

```
[Auth Callback] ===== ROUTE HANDLER CALLED =====
[Auth Callback] Code param: present
[Auth Callback] ===== COOKIES BEFORE CLIENT CREATION =====
[Auth Callback] Code verifier cookie: FOUND (sb-localhost-auth-token-code-verifier)
[Auth Callback] setAll() called with 3 cookies
[Auth Callback] Set cookie: sb-localhost-auth-token.0 with options: {"path":"/","httpOnly":true,"sameSite":"lax",...}
[Auth Callback] ===== EXCHANGE SUCCESS =====
[Auth Callback] Auth token cookie: SET ✅ (sb-localhost-auth-token.0)
[Auth Callback] Copying cookie to redirect: sb-localhost-auth-token.0
[Auth Callback] Redirecting to: /protected
```

## Production Checklist

When deploying to production:

1. ✅ Update `NEXT_PUBLIC_SUPABASE_URL` to production URL
2. ✅ Update `site_url` in Supabase dashboard
3. ✅ Add production callback URL to `additional_redirect_urls` in Supabase
4. ✅ Add production callback URL to Discord OAuth redirect URLs
5. ✅ Ensure consistent host usage (no mixing www/non-www)
6. ✅ Test OAuth flow in production environment

## Browser Tools Testing

If using browser automation tools (Playwright, Puppeteer):

1. **Clear cookies before test**:
   ```javascript
   await context.clearCookies()
   ```

2. **Monitor network requests**:
   ```javascript
   page.on('response', response => {
     if (response.url().includes('/auth/callback')) {
       console.log('Callback response headers:', response.headers())
     }
   })
   ```

3. **Check cookies after callback**:
   ```javascript
   const cookies = await context.cookies()
   const authCookie = cookies.find(c => c.name.includes('auth-token'))
   console.log('Auth cookie:', authCookie)
   ```

4. **Verify session persistence**:
   ```javascript
   await page.goto('/protected')
   // Should not redirect to /auth/login
   ```
