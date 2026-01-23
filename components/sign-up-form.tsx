'use client'

import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
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
import { useState } from 'react'
import { MessageCircle } from 'lucide-react'
import { signup } from '@/app/login/actions'

export function SignUpForm({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
  const [showEmailForm, setShowEmailForm] = useState(false)
  const router = useRouter()

  const handleDiscordSignUp = async () => {
    const supabase = createClient()

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'discord',
        options: {
          redirectTo: `${window.location.origin}/account`,
        },
      })

      if (error) throw error
    } catch (error: unknown) {
      console.error('Discord signup error:', error)
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
          {/* Discord Sign Up - Primary */}
          <div className="space-y-4">
            <Button
              type="button"
              onClick={handleDiscordSignUp}
              className="w-full bg-[#5865F2] hover:bg-[#4752C4] text-white font-medium h-11"
              size="lg"
            >
              <MessageCircle className="mr-2 h-5 w-5" />
              Sign up with Discord
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
