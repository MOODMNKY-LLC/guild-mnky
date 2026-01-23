'use client'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
import { useState, useRef, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { MessageCircle } from 'lucide-react'
import { login, signup } from '@/app/login/actions'

export function LoginForm({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
  const searchParams = useSearchParams()
  const [showEmailForm, setShowEmailForm] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const oauthInitiatedRef = useRef(false)

  // Check for error messages from URL (e.g., stale_session)
  useEffect(() => {
    const urlError = searchParams.get('error')
    const urlMessage = searchParams.get('message')
    if (urlError === 'stale_session' && urlMessage) {
      setError(urlMessage)
    } else if (urlError) {
      setError('An authentication error occurred. Please try again.')
    }
  }, [searchParams])

  const handleDiscordLogin = async () => {
    // Prevent multiple simultaneous OAuth initiations
    if (oauthInitiatedRef.current || isLoading) {
      return
    }

    setIsLoading(true)
    setError(null)
    oauthInitiatedRef.current = true

    try {
      // Use Route Handler to initiate OAuth server-side
      // This bypasses the browser client bug where createBrowserClient
      // doesn't consistently set the PKCE code verifier cookie
      // The Route Handler uses createServerClient with explicit cookie handling
      // which ensures the code verifier cookie is set on the response
      // 
      // Navigate directly to the Route Handler - it will redirect to Discord OAuth
      // The browser will handle the redirect naturally, and cookies will be included
      window.location.href = '/api/auth/discord?next=/protected'
      
      // Note: The redirect happens immediately, so this code won't execute
      // If there's an error, the Route Handler will redirect to /auth/login with error params
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'An error occurred')
      setIsLoading(false)
      oauthInitiatedRef.current = false
    }
  }


  return (
    <div className={cn('flex w-full flex-col gap-3', className)} {...props}>
      <Card className="border-border/60 bg-card/80 backdrop-blur-sm">
        <CardHeader className="space-y-1.5">
          <CardTitle className="font-display text-2xl">Welcome back, Guardian</CardTitle>
          <CardDescription className="text-muted-foreground">
            Sign in to access Jupiter&apos;s Girth HQ
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Error Display */}
          {error && (
            <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
          
          {/* Discord Login - Primary */}
          <div className="space-y-4">
            <Button
              type="button"
              onClick={handleDiscordLogin}
              disabled={isLoading}
              className="w-full bg-[#5865F2] hover:bg-[#4752C4] text-white font-medium h-11"
              size="lg"
            >
              <MessageCircle className="mr-2 h-5 w-5" />
              {isLoading ? 'Connecting...' : 'Continue with Discord'}
            </Button>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border/60" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or</span>
              </div>
            </div>

            {/* Email/Password Toggle */}
            {!showEmailForm ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowEmailForm(true)}
                className="w-full"
              >
                Sign in with Email
              </Button>
            ) : (
              <form action={login} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="guardian@example.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    <Link
                      href="/auth/forgot-password"
                      className="text-xs text-primary hover:underline"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    required
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    type="submit"
                    className="flex-1"
                  >
                    Sign in
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowEmailForm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            )}
          </div>

          {/* Sign up link */}
          <div className="text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{' '}
            <Link href="/auth/sign-up" className="text-primary hover:underline font-medium">
              Sign up
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
