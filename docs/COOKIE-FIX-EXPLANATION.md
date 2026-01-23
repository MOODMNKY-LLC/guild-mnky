# Cookie Fix Explanation

## Problem Identified

From the logs, we can see:
1. ✅ Code verifier cookie is FOUND: `sb-127-auth-token-code-verifier`
2. ✅ Exchange succeeds: `===== EXCHANGE SUCCESS =====`
3. ❌ Auth token cookie is MISSING after exchange in cookieStore
4. ⚠️ Cookies ARE being set later (in proxy), but after redirect

## Root Cause

The issue is that `cookies()` from `next/headers` sets cookies in the cookie store, but when you return a `NextResponse.redirect()`, those cookies are **NOT automatically included** in the redirect response. The browser never receives the cookies!

## The Fix

We now explicitly copy all cookies from `cookieStore` to the redirect response:

```typescript
const redirectResponse = NextResponse.redirect(new URL(nextPath, url.origin))

// Copy all cookies from cookieStore to the redirect response
const cookiesAfter = cookieStore.getAll()
cookiesAfter.forEach((cookie) => {
  redirectResponse.cookies.set(cookie.name, cookie.value, {
    path: cookie.path || '/',
    sameSite: cookie.sameSite as 'lax' | 'strict' | 'none' | undefined,
    httpOnly: cookie.httpOnly,
    secure: cookie.secure,
    maxAge: cookie.maxAge,
  })
})

return redirectResponse
```

## Additional Issue: Cookie Name Mismatch

The logs show:
- Code verifier: `sb-127-auth-token-code-verifier` (from 127.0.0.1 origin)
- Auth tokens: `sb-localhost-auth-token.0` (from localhost origin)

This indicates you're accessing via `127.0.0.1:3000` but Supabase is configured for `localhost`.

**Solution**: Access via `http://localhost:3000` (not `127.0.0.1:3000`)

## Testing

After this fix:
1. Clear all cookies
2. Access via `http://localhost:3000/auth/login`
3. Sign in with Discord
4. Check terminal logs - should see:
   - `Auth token cookie: SET ✅ (sb-localhost-auth-token.0)`
   - `Cookies copied to redirect response: 3`
5. Should redirect to `/protected` and **stay there** (no redirect loop)
