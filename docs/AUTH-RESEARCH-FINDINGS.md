# Deep Research: Next.js + Supabase SSR OAuth Cookie Persistence Issue

## Executive Summary

This comprehensive research investigation reveals that the authentication redirect loop issue you're experiencing is a **known problem** affecting multiple developers using Next.js App Router with Supabase SSR. The root causes are twofold: a regression in `@supabase/supabase-js` version 2.91.0 that defers cookie-setting events, and a fundamental limitation in Next.js where cookies set via the `cookies()` helper don't automatically transfer to redirect responses. The solution pattern that has worked for others involves creating the redirect response **before** calling `exchangeCodeForSession()` and having the `setAll()` callback add cookies directly to that response object during the exchange process.

## Knowledge Development Through Research

The investigation began with broad searches across GitHub issues, community discussions, and official documentation. Initial searches revealed multiple developers reporting identical symptoms: OAuth callbacks completing successfully, but authentication cookies not persisting after redirect, causing immediate redirect loops back to login pages. As the research deepened, patterns emerged connecting seemingly disparate issues into a coherent understanding of the underlying technical limitations.

The first major breakthrough came from discovering GitHub issue #2037 in the `supabase-js` repository, which documented a specific regression introduced in version 2.91.0. This issue revealed that `exchangeCodeForSession()` was modified to defer `SIGNED_IN` event notifications using `setTimeout`, causing cookies to be set asynchronously after the response had already been returned in serverless environments. This explained why some developers found that pinning to version 2.90.1 resolved their issues, while others required different workarounds.

Further investigation uncovered Next.js Discussion #48434, which explicitly documented that cookies set using the `cookies()` helper from `next/headers` don't automatically transfer to redirect responses. The discussion revealed that while `Set-Cookie` headers are sent, the cookies don't persist when the browser follows the redirect. This limitation, combined with the Supabase timing issue, creates a perfect storm where cookies are set too late and on the wrong response object.

The research then traced how various developers solved this problem, revealing a consistent pattern: creating the redirect response object before calling `exchangeCodeForSession()`, and modifying the `setAll()` callback to add cookies directly to that response object. This approach ensures cookies are set during the exchange process, not after it completes, and on the response that will actually be returned to the browser.

## Comprehensive Analysis

### The Supabase Regression (Issue #2037)

The most critical finding is a documented regression in `@supabase/supabase-js` version 2.91.0. The library changed how `exchangeCodeForSession()` handles `SIGNED_IN` event notifications. Previously, these notifications were synchronous, ensuring that cookie-setting callbacks executed before the function returned. In version 2.91.0, the library began deferring these notifications using `setTimeout(async () => { await this._notifyAllSubscribers('SIGNED_IN', data.session) }, 0)`, which pushes cookie-setting operations into the next event loop tick.

In serverless and route handler environments like Next.js App Router, this timing change is catastrophic. The route handler completes and returns the response before the deferred callback executes, meaning cookies are set after the response has already been sent to the browser. The browser never receives the authentication cookies, causing immediate redirect loops as middleware detects unauthenticated requests.

Multiple developers confirmed this regression, with one reporting that pinning to version 2.90.1 immediately resolved their authentication issues. However, downgrading isn't always feasible, especially if newer versions include security patches or required features. The research revealed that the workaround involves either adding an artificial delay after `exchangeCodeForSession()` (using `await new Promise((r) => setTimeout(r, 0))`) or, more elegantly, ensuring cookies are set on the response object during the exchange process itself.

### Next.js Redirect Cookie Limitation (Discussion #48434)

Next.js Discussion #48434 explicitly documents a fundamental limitation: cookies set using the `cookies()` helper from `next/headers` don't automatically transfer to redirect responses. When you call `cookies().set()` and then return `NextResponse.redirect()`, the `Set-Cookie` headers may be present in the response, but the cookies don't persist when the browser follows the redirect to the new URL.

This limitation exists because Next.js treats redirects differently from regular responses. The `cookies()` helper modifies an internal cookie store that's associated with the current request context, but redirect responses create a new response object that doesn't automatically inherit cookies from that store. Developers must explicitly copy cookies to the redirect response object using `response.cookies.set()`.

The discussion includes multiple developers reporting identical symptoms: cookies visible in response headers, but not persisting after redirect. One developer provided a working solution that creates the redirect response first, then sets cookies directly on that response object before returning it. This pattern has been confirmed by multiple sources as the correct approach for Next.js App Router.

### The Combined Problem

When these two issues combine—the Supabase timing regression and the Next.js redirect limitation—developers face a particularly challenging debugging scenario. The Supabase library sets cookies asynchronously after `exchangeCodeForSession()` completes, and those cookies are set in the Next.js cookie store rather than on the redirect response. Even if the timing were correct, the cookies wouldn't transfer to the redirect response automatically.

The research revealed that developers who solved this problem consistently used a pattern where they create the redirect response object before calling `exchangeCodeForSession()`, and modify the `setAll()` callback in the Supabase client configuration to add cookies directly to that response object. This ensures cookies are set during the exchange process (before the function returns) and on the correct response object (the one that will be returned to the browser).

### Community Solutions and Workarounds

GitHub issue #36 in the `supabase/ssr` repository documents cookies not setting properly, requiring users to log in twice before authentication works. The issue includes code examples showing developers manually copying cookies to response objects, confirming the pattern of creating responses before exchanges and setting cookies during the `setAll()` callback.

Issue #55 reveals similar problems with `signInWithOAuth()` not consistently setting cookies, with workarounds involving direct cookie manipulation in the callback route. Multiple Stack Overflow questions show developers struggling with the same symptoms, with solutions consistently pointing toward manual cookie copying to redirect responses.

Reddit discussions and Medium articles provide additional confirmation of the pattern, with developers sharing their successful implementations. The consistent theme across all solutions is the need to explicitly handle cookie transfer to redirect responses, rather than relying on automatic behavior.

### Official Documentation Gaps

While Supabase's official documentation provides examples of OAuth callback handlers, these examples don't explicitly address the cookie copying requirement. The "Login with Google" guide shows a simple pattern of calling `exchangeCodeForSession()` and then redirecting, but doesn't mention that cookies must be manually copied to the redirect response in Next.js App Router.

The Next.js documentation on cookies mentions that cookies can only be modified in Server Actions or Route Handlers, but doesn't explicitly warn about the redirect limitation. The `NextResponse` documentation shows how to set cookies on responses, but doesn't connect this to the OAuth callback use case.

This documentation gap has led many developers to assume their implementation follows best practices, only to discover through debugging that additional steps are required. The research suggests that clearer documentation from both Supabase and Next.js would help prevent this widespread issue.

## Practical Implications

### Immediate Solutions

The most reliable solution based on research findings is to create the redirect response object before calling `exchangeCodeForSession()`, and modify the `setAll()` callback to add cookies directly to that response. This approach works regardless of Supabase version and addresses both the timing issue and the redirect limitation.

For developers using `@supabase/supabase-js` version 2.91.0 or later, an alternative workaround is to add a small delay after `exchangeCodeForSession()` to allow deferred callbacks to execute: `await new Promise((r) => setTimeout(r, 0))`. However, this is less reliable than the response-based approach and may fail under certain timing conditions.

Developers can also pin their `@supabase/supabase-js` dependency to version 2.90.1, which doesn't have the regression. However, this prevents receiving security updates and new features, making it a temporary measure rather than a long-term solution.

### Debugging Strategies

The research revealed several effective debugging approaches used by developers who successfully resolved this issue. Monitoring terminal logs for `setAll()` callback execution timing relative to response return helps identify when cookies are being set too late. Checking browser DevTools Network tab for `Set-Cookie` headers in redirect responses confirms whether cookies are being sent but not persisting.

Comparing cookie counts before and after `exchangeCodeForSession()` helps identify when cookies are set but not copied to the response. Logging the redirect response object's cookies after exchange but before return reveals whether cookies are present on the response that will be sent to the browser.

Developers should also verify they're accessing the application via `localhost` consistently, not mixing `127.0.0.1` and `localhost`, as cookie names include the host and mismatched hosts cause cookie name mismatches that prevent authentication.

### Production Considerations

The research indicates this issue affects both development and production environments, though symptoms may differ. In production, the timing issues can be more pronounced due to serverless function cold starts and network latency. Developers should test authentication flows thoroughly in production-like environments before deploying.

The solution pattern of creating responses before exchanges and setting cookies during `setAll()` works consistently across environments. However, developers should monitor authentication success rates in production and be prepared to implement additional logging or monitoring to catch edge cases.

### Long-Term Implications

This research reveals a broader pattern of challenges when combining serverless architectures with OAuth flows and cookie-based authentication. The asynchronous nature of serverless functions, combined with library timing changes and framework limitations, creates complex debugging scenarios that require deep understanding of multiple systems.

The fact that this issue affects multiple developers suggests a need for better integration patterns between Supabase SSR and Next.js App Router. Both projects could benefit from official examples that demonstrate the correct pattern for OAuth callbacks with cookie persistence.

Future versions of `@supabase/ssr` or Next.js may address these limitations, but developers should be prepared to implement workarounds until then. The research suggests that the current workaround pattern is stable and reliable, making it a reasonable long-term solution.

## Conclusion

This investigation has revealed that the authentication redirect loop issue is a well-documented problem with multiple contributing factors. The Supabase regression in version 2.91.0, combined with Next.js's redirect cookie limitation, creates a scenario where authentication cookies aren't properly set on redirect responses. The solution pattern of creating redirect responses before exchanges and setting cookies during the `setAll()` callback has been proven effective by multiple developers and should be considered the standard approach for Next.js App Router OAuth implementations with Supabase SSR.

The research also highlights gaps in official documentation that have led many developers to implement incomplete solutions. Both Supabase and Next.js could improve their documentation to explicitly address these patterns, reducing the debugging burden on developers implementing OAuth authentication.

For your specific implementation, the fix we applied—creating the redirect response before `exchangeCodeForSession()` and having `setAll()` add cookies directly to that response—aligns with the proven solutions discovered through this research. This approach addresses both the timing issue and the redirect limitation, providing a robust solution that works across different Supabase and Next.js versions.
