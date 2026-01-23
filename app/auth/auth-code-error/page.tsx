'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

function ErrorContent() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')
  
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 md:p-6">
      <div className="w-full max-w-md space-y-4 rounded-lg border border-destructive/20 bg-destructive/5 p-6 text-center">
        <div className="space-y-1.5">
          <h1 className="text-2xl font-bold text-destructive">OAuth Error</h1>
          <p className="text-muted-foreground">
            There was a problem completing the OAuth authentication. Please try again.
          </p>
          {error && (
            <div className="mt-4 rounded-md bg-destructive/10 p-3 text-left">
              <p className="text-xs font-mono text-destructive">
                Error: {error}
              </p>
            </div>
          )}
        </div>
        <div className="space-y-2">
          <a
            href="/auth/login"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Back to Login
          </a>
        </div>
      </div>
    </div>
  )
}

export default function AuthCodeErrorPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen flex-col items-center justify-center p-4 md:p-6">
        <div className="w-full max-w-md space-y-4 rounded-lg border border-destructive/20 bg-destructive/5 p-6 text-center">
          <h1 className="text-2xl font-bold text-destructive">Loading...</h1>
        </div>
      </div>
    }>
      <ErrorContent />
    </Suspense>
  )
}
