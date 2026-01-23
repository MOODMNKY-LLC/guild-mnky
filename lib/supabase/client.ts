import { createBrowserClient } from "@supabase/ssr";

/**
 * Creates a Supabase client for use in Client Components.
 * 
 * CRITICAL FIX: Explicitly configure cookie storage to ensure PKCE code verifier
 * is set synchronously before OAuth redirect. Without this, the async storage
 * adapter may not complete before the redirect happens, causing "code verifier
 * not found" errors.
 * 
 * This implementation ensures cookies are set immediately using document.cookie
 * with proper SameSite attributes for OAuth redirects.
 */
export function createClient() {
  // Extract project ref from Supabase URL for cookie naming
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const projectRef = supabaseUrl.split('//')[1]?.split('.')[0] || supabaseUrl.split('/').pop() || 'unknown'
  
  // Determine if we're in production (HTTPS) or development (HTTP)
  const isProduction = typeof window !== 'undefined' && window.location.protocol === 'https:'
  
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY!,
    {
      cookies: {
        getAll() {
          // Parse document.cookie into array of { name, value } objects
          const cookies: { name: string; value: string }[] = []
          if (typeof document !== 'undefined') {
            document.cookie.split(';').forEach(cookie => {
              const [name, ...valueParts] = cookie.trim().split('=')
              if (name) {
                cookies.push({
                  name: decodeURIComponent(name),
                  value: decodeURIComponent(valueParts.join('='))
                })
              }
            })
          }
          return cookies
        },
        setAll(cookiesToSet) {
          // CRITICAL: Set cookies synchronously using document.cookie
          // This ensures PKCE code verifier is set before OAuth redirect
          if (typeof document !== 'undefined') {
            cookiesToSet.forEach(({ name, value, options }) => {
              // Build cookie string with proper attributes
              let cookieString = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`
              
              // Set path (default to /)
              if (options?.path) {
                cookieString += `; path=${options.path}`
              } else {
                cookieString += '; path=/'
              }
              
              // Set SameSite attribute
              // For OAuth redirects (cross-site), we need SameSite=None; Secure
              // But SameSite=None requires Secure, which requires HTTPS
              // On localhost HTTP, we use SameSite=Lax (less secure but works)
              if (isProduction) {
                cookieString += '; SameSite=None; Secure'
              } else {
                cookieString += `; SameSite=${options?.sameSite || 'Lax'}`
              }
              
              // Set maxAge if provided
              if (options?.maxAge) {
                cookieString += `; max-age=${options.maxAge}`
              }
              
              // Set domain if provided (but not for localhost)
              if (options?.domain && !window.location.hostname.includes('localhost')) {
                cookieString += `; domain=${options.domain}`
              }
              
              // Set cookie synchronously
              document.cookie = cookieString
              
              // Log for debugging (only in development)
              if (process.env.NODE_ENV === 'development' && name.includes('code-verifier')) {
                console.log('[Supabase Client] PKCE code verifier cookie set:', {
                  name,
                  valueLength: value.length,
                  cookieString: cookieString.substring(0, 100) + '...',
                  isProduction,
                })
              }
            })
          }
        },
      },
      cookieOptions: {
        name: `sb-${projectRef}-auth-token`,
        path: '/',
        sameSite: isProduction ? 'none' : 'lax',
        secure: isProduction,
        maxAge: 400 * 24 * 60 * 60, // 400 days (default from @supabase/ssr)
      },
    }
  );
}
