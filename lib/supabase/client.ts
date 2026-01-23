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
              // Check protocol at runtime (not module load time) to avoid SSR issues
              const isProduction = typeof window !== 'undefined' && window.location.protocol === 'https:'
              if (isProduction) {
                cookieString += '; SameSite=None; Secure'
              } else {
                cookieString += `; SameSite=${options?.sameSite || 'Lax'}`
              }
              
              // Set maxAge if provided
              if (options?.maxAge) {
                cookieString += `; max-age=${options.maxAge}`
              }
              
              // Set domain if provided (but NOT for localhost or IP addresses)
              // Browsers don't allow domain attribute for IP addresses (127.0.0.1)
              // and localhost cookies work without explicit domain
              const isIPAddress = /^\d+\.\d+\.\d+\.\d+$/.test(window.location.hostname)
              const isLocalhost = window.location.hostname.includes('localhost')
              if (options?.domain && !isLocalhost && !isIPAddress) {
                cookieString += `; domain=${options.domain}`
              }
              
              // Set cookie synchronously
              document.cookie = cookieString
              
              // Log for debugging (only in development)
              if (process.env.NODE_ENV === 'development' && name.includes('code-verifier')) {
                const isProduction = typeof window !== 'undefined' && window.location.protocol === 'https:'
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
        // Use 'lax' as default - will be overridden to 'none' in setAll for HTTPS
        sameSite: 'lax',
        secure: false, // Will be set to true in setAll for HTTPS
        maxAge: 400 * 24 * 60 * 60, // 400 days (default from @supabase/ssr)
      },
    }
  );
}
