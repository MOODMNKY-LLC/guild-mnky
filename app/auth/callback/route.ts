import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  // With PKCE flow configured in the client, let the client handle the code exchange
  // Just redirect to the account page - the client will detect the code and exchange it
  if (code) {
    return NextResponse.redirect(`${origin}/account`)
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}