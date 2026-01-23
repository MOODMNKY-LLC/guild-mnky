# Authentication Flow Debugging Guide

## Critical Issue Found: Domain Attribute for IP Addresses

**Problem**: Browsers **DO NOT ALLOW** setting `domain` attribute for IP addresses like `127.0.0.1`. When you try to set `domain=127.0.0.1`, the browser silently rejects the cookie.

**Fix Applied**: Removed `domain` attribute from cookie options for IP addresses. Browsers automatically scope cookies to the exact origin for IP addresses.

## Testing Steps

1. **Clear All Cookies**:
   - Open DevTools → Application → Cookies
   - Delete ALL cookies for `127.0.0.1:3000` and `127.0.0.1:54321`

2. **Start Dev Servers**:
   ```bash
   # Terminal 1: Start Supabase
   supabase start
   
   # Terminal 2: Start Next.js (now runs on 127.0.0.1:3000)
   pnpm dev
   ```

3. **Access App**:
   - Navigate to `http://127.0.0.1:3000/auth/login` (NOT localhost)

4. **Monitor Console Logs**:
   - Open DevTools → Console
   - Look for `[Login Form]` and `[Supabase Client]` logs
   - Check for `[Auth Callback]` logs after Discord redirect

5. **Check Network Tab**:
   - Open DevTools → Network
   - Filter by "Fetch/XHR"
   - Look for requests to `/auth/callback` and `127.0.0.1:54321/auth/v1/token`
   - Check response headers for `Set-Cookie`

6. **Verify Cookies**:
   - After clicking "Sign in with Discord"
   - Check Application → Cookies for `127.0.0.1:3000`
   - Look for cookies starting with `sb-127-` or `sb-127.0.0.1-`

## Expected Cookie Names

For Supabase project on `127.0.0.1:54321`, cookies should be named:
- `sb-127-auth-token-code-verifier` (PKCE code verifier)
- `sb-127-auth-token` (Session token after exchange)

## Common Issues

1. **No cookies appearing**: Check that you're accessing `127.0.0.1:3000` not `localhost:3000`
2. **Code verifier missing**: Check client-side logs for cookie setting errors
3. **Session token missing**: Check callback route logs for exchange errors
4. **Redirect loop**: Check that `hasEnvVars` is true and `updateSession` runs

## Debugging Commands

```bash
# Check if Supabase is running
curl http://127.0.0.1:54321/rest/v1/

# Check environment variables
node -e "console.log(process.env.NEXT_PUBLIC_SUPABASE_URL)"

# Test cookie setting (in browser console)
document.cookie = "test=value; path=/"
console.log(document.cookie)
```
