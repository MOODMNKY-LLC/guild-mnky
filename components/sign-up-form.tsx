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
import { useRouter } from 'next/navigation'
import { useState, useRef } from 'react'
import { MessageCircle } from 'lucide-react'
import { signup } from '@/app/login/actions'

export function SignUpForm({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
  const [showEmailForm, setShowEmailForm] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const oauthInitiatedRef = useRef(false)

  const handleDiscordSignUp = async () => {
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
      // Sign-up redirects to /account instead of /protected
      // 
      // Navigate directly to the Route Handler - it will redirect to Discord OAuth
      // The browser will handle the redirect naturally, and cookies will be included
      window.location.href = '/api/auth/discord?next=/account'
      
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
          <CardTitle className="font-display text-2xl">Join Jupiter&apos;s Girth</CardTitle>
          <CardDescription className="text-muted-foreground">
            Create your account to get started
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Error Display */}
          {error && (
            <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
          
          {/* Discord Sign Up - Primary */}
          <div className="space-y-4">
            <Button
              type="button"
              onClick={handleDiscordSignUp}
              disabled={isLoading}
              className="w-full bg-[#5865F2] hover:bg-[#4752C4] text-white font-medium h-11"
              size="lg"
            >
              <MessageCircle className="mr-2 h-5 w-5" />
              {isLoading ? 'Connecting...' : 'Sign up with Discord'}
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
                Sign up with Email
              </Button>
            ) : (
              <form action={signup} className="space-y-4">
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
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    required
                    minLength={6}
                  />
                  <p className="text-xs text-muted-foreground">
                    Must be at least 6 characters
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="submit"
                    className="flex-1"
                  >
                    Sign up
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

          {/* Sign in link */}
          <div className="text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-primary hover:underline font-medium">
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
