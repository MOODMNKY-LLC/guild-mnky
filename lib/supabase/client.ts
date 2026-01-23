import { createBrowserClient } from "@supabase/ssr";

/**
 * Creates a Supabase client for use in Client Components.
 *
 * CRITICAL: For SSR with PKCE, the browser client MUST use cookie storage
 * so the server can access the PKCE code verifier during callback.
 */
export function createClient() {
  // Extract project ref for cookie naming
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const projectRef = supabaseUrl.split('//')[1]?.split('.')[0] || 'unknown'

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY!,
    {
      cookies: {
        getAll() {
          // Parse document.cookie into array format expected by Supabase
          const cookies: { name: string; value: string }[] = []
          if (typeof document !== 'undefined') {
            document.cookie.split(';').forEach(cookie => {
              const trimmed = cookie.trim()
              if (!trimmed) return

              const equalIndex = trimmed.indexOf('=')
              if (equalIndex === -1) {
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
          if (typeof document !== 'undefined') {
            cookiesToSet.forEach(({ name, value, options }) => {
              // CRITICAL: Set cookie SYNCHRONOUSLY before any redirect
              // Build cookie string with minimal attributes for localhost
              let cookieString = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`

              // Set path
              cookieString += '; path=/'

              // For localhost development, use SameSite=Lax (None requires HTTPS)
              cookieString += '; SameSite=Lax'

              // Set cookie IMMEDIATELY
              document.cookie = cookieString

              // Debug logging for PKCE cookies
              if (process.env.NODE_ENV === 'development' && name.includes('verifier')) {
                console.log('[Browser Client] PKCE cookie set synchronously:', {
                  name,
                  valueLength: value.length,
                  cookieString: cookieString.substring(0, 100) + '...',
                  allCookies: document.cookie.split(';').map(c => c.trim().split('=')[0])
                })
              }
            })
          }
        },
      },
      cookieOptions: {
        name: `sb-${projectRef}-auth-token`,
        path: '/',
        sameSite: 'lax',
        secure: false,
        maxAge: 400 * 24 * 60 * 60, // 400 days
      },
      auth: {
        // Enable automatic session detection from URL for PKCE flow
        detectSessionInUrl: true,
        flowType: 'pkce',
      },
    }
  );
}
