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
          // CRITICAL: Don't decode here - Supabase expects raw cookie values
          const cookies: { name: string; value: string }[] = []
          if (typeof document !== 'undefined') {
            document.cookie.split(';').forEach(cookie => {
              const trimmed = cookie.trim()
              if (!trimmed) return
              
              const equalIndex = trimmed.indexOf('=')
              if (equalIndex === -1) {
                // Cookie with no value
                cookies.push({ name: trimmed, value: '' })
              } else {
                const name = trimmed.substring(0, equalIndex).trim()
                const value = trimmed.substring(equalIndex + 1).trim()
                if (name) {
                  cookies.push({ name, value })
                }
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
              // Check protocol at runtime (not module load time) to avoid SSR issues
              const isProduction = typeof window !== 'undefined' && window.location.protocol === 'https:'
              
              // Build cookie string - encode name and value properly
              // Note: document.cookie expects URL-encoded values
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
                // Use the option's sameSite if provided, otherwise default to Lax
                // Handle type: sameSite can be true | "lax" | "strict" | "none"
                const sameSiteValue = options?.sameSite
                let sameSiteStr = 'Lax'
                if (typeof sameSiteValue === 'string') {
                  sameSiteStr = sameSiteValue.charAt(0).toUpperCase() + sameSiteValue.slice(1)
                } else if (sameSiteValue === true) {
                  sameSiteStr = 'Lax' // Default to Lax if true
                }
                cookieString += `; SameSite=${sameSiteStr}`
              }
              
              // Set maxAge if provided (convert to seconds)
              if (options?.maxAge !== undefined) {
                cookieString += `; max-age=${options.maxAge}`
              }
              
              // Set domain if provided (but not for localhost)
              if (options?.domain && typeof window !== 'undefined' && !window.location.hostname.includes('localhost')) {
                cookieString += `; domain=${options.domain}`
              }
              
              // Set cookie synchronously - this MUST happen before redirect
              document.cookie = cookieString
              
              // Verify cookie was set (for debugging)
              if (process.env.NODE_ENV === 'development' && name.includes('code-verifier')) {
                // Check if cookie is actually readable
                const cookieWasSet = document.cookie.includes(encodeURIComponent(name))
                console.log('[Supabase Client] PKCE code verifier cookie set:', {
                  name,
                  valueLength: value.length,
                  cookieWasSet,
                  isProduction,
                  sameSite: isProduction ? 'None' : (options?.sameSite || 'Lax'),
                  path: options?.path || '/',
                })
                
                // Also log all cookies to verify
                setTimeout(() => {
                  const allCookies = document.cookie.split(';').map(c => c.trim().split('=')[0])
                  console.log('[Supabase Client] All cookies after setting:', allCookies)
                  console.log('[Supabase Client] Code verifier cookie present:', allCookies.some(n => n.includes('code-verifier') || n.includes('verifier')))
                }, 10)
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
