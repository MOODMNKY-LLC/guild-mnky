/**
 * Browser Console Debugging Script for Authentication Flow
 * 
 * Run this in the browser console (F12 → Console tab) to debug auth issues
 * 
 * Usage:
 * 1. Open http://127.0.0.1:3000/auth/login
 * 2. Open DevTools Console (F12)
 * 3. Paste this entire script and press Enter
 * 4. Click "Sign in with Discord"
 * 5. Watch the console output
 */

(function debugAuthFlow() {
  console.log('🔍 Authentication Flow Debugger Started');
  console.log('==========================================');
  
  // Helper to parse cookies
  function parseCookies() {
    const cookies = {};
    document.cookie.split(';').forEach(cookie => {
      const [name, ...valueParts] = cookie.trim().split('=');
      if (name) {
        cookies[name] = decodeURIComponent(valueParts.join('='));
      }
    });
    return cookies;
  }
  
  // Check initial state
  function checkInitialState() {
    console.log('\n📋 Initial State Check');
    console.log('------------------------');
    const cookies = parseCookies();
    // Determine Supabase URL based on current origin (browser doesn't have process.env)
    const supabaseUrl = window.location.hostname === '127.0.0.1'
      ? 'http://127.0.0.1:54321'
      : window.location.hostname.includes('localhost')
      ? 'http://localhost:54321'
      : 'https://your-project.supabase.co'; // Fallback for production
    
    console.log('Current URL:', window.location.href);
    console.log('Origin:', window.location.origin);
    console.log('Protocol:', window.location.protocol);
    console.log('Total cookies:', Object.keys(cookies).length);
    console.log('All cookies:', Object.keys(cookies));
    
    // Check for Supabase cookies
    const supabaseCookies = Object.keys(cookies).filter(name => 
      name.includes('sb-') || 
      name.includes('auth-token') || 
      name.includes('code-verifier') ||
      name.includes('supabase')
    );
    
    console.log('Supabase-related cookies:', supabaseCookies);
    
    if (supabaseCookies.length > 0) {
      console.warn('⚠️ Found existing Supabase cookies - these may interfere with testing');
      supabaseCookies.forEach(name => {
        const cookie = document.cookie.split(';').find(c => c.trim().startsWith(name + '='));
        console.log(`  - ${name}:`, cookie ? 'EXISTS' : 'NOT FOUND');
      });
    } else {
      console.log('✅ No existing Supabase cookies (clean state)');
    }
    
    // Check environment
    console.log('\n🔧 Environment Check');
    console.log('---------------------');
    console.log('Supabase URL (expected):', supabaseUrl);
    console.log('Is HTTPS:', window.location.protocol === 'https:');
    console.log('Is localhost:', window.location.hostname.includes('localhost'));
    console.log('Is 127.0.0.1:', window.location.hostname === '127.0.0.1');
  }
  
  // Monitor cookie changes
  let lastCookieState = parseCookies();
  
  function checkCookieChanges() {
    const currentCookies = parseCookies();
    const newCookies = Object.keys(currentCookies).filter(name => !lastCookieState[name]);
    const removedCookies = Object.keys(lastCookieState).filter(name => !currentCookies[name]);
    
    if (newCookies.length > 0) {
      console.log('\n➕ New Cookies Detected:');
      newCookies.forEach(name => {
        console.log(`  - ${name}`);
        if (name.includes('code-verifier')) {
          console.log('    ✅ PKCE Code Verifier Cookie Set!');
        }
        if (name.includes('auth-token') && !name.includes('code-verifier')) {
          console.log('    ✅ Session Auth Token Cookie Set!');
        }
      });
    }
    
    if (removedCookies.length > 0) {
      console.log('\n➖ Cookies Removed:');
      removedCookies.forEach(name => {
        console.log(`  - ${name}`);
      });
    }
    
    lastCookieState = currentCookies;
  }
  
  // Monitor network requests
  const originalFetch = window.fetch;
  window.fetch = function(...args) {
    const url = args[0];
    
    // Log Supabase-related requests
    if (typeof url === 'string' && (url.includes('supabase') || url.includes('auth/v1') || url.includes('/auth/callback'))) {
      console.log('\n🌐 Network Request:', url);
      console.log('   Method:', args[1]?.method || 'GET');
      
      if (args[1]?.headers) {
        const cookieHeader = args[1].headers.get?.('Cookie') || args[1].headers['Cookie'];
        if (cookieHeader) {
          const cookies = cookieHeader.split(';').map(c => c.trim().split('=')[0]);
          console.log('   Cookies in request:', cookies);
          const hasVerifier = cookieHeader.includes('code-verifier');
          console.log('   Has code verifier:', hasVerifier ? '✅ YES' : '❌ NO');
        }
      }
      
      // Monitor response
      return originalFetch.apply(this, args).then(response => {
        if (url.includes('auth/v1/token')) {
          console.log('\n📥 Token Exchange Response:');
          console.log('   Status:', response.status, response.statusText);
          console.log('   OK:', response.ok);
          
          // Check for Set-Cookie headers
          response.headers.forEach((value, key) => {
            if (key.toLowerCase() === 'set-cookie') {
              console.log('   Set-Cookie:', value);
              if (value.includes('auth-token') && !value.includes('code-verifier')) {
                console.log('   ✅ Session cookie should be set!');
              }
            }
          });
          
          if (!response.ok) {
            response.clone().text().then(text => {
              console.error('   Error response:', text);
            });
          }
        }
        return response;
      });
    }
    
    return originalFetch.apply(this, args);
  };
  
  // Check state periodically
  const intervalId = setInterval(() => {
    checkCookieChanges();
  }, 500);
  
  // Initial check
  checkInitialState();
  
  console.log('\n✅ Debugger active - monitoring cookies and network requests');
  console.log('   Click "Sign in with Discord" to start the flow');
  console.log('   Run stopDebugger() to stop monitoring\n');
  
  // Provide stop function
  window.stopDebugger = function() {
    clearInterval(intervalId);
    window.fetch = originalFetch;
    console.log('🛑 Debugger stopped');
  };
  
  // Auto-check on page visibility change (handles redirects)
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      setTimeout(() => {
        console.log('\n🔄 Page Visible - Checking State After Redirect');
        checkCookieChanges();
        checkInitialState();
      }, 100);
    }
  });
})();
