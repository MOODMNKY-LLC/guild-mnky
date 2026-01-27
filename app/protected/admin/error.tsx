'use client'

import { useEffect } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { AlertCircle } from 'lucide-react'

/**
 * Error boundary for the admin panel.
 * Catches Server Component and client errors so we show a clear message
 * instead of the generic production "digest omitted" screen.
 */
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log in dev; in production you can send digest to your logging service
    console.error('Admin panel error:', error.message, error.digest)
  }, [error])

  const isLoadError =
    error.message?.toLowerCase().includes('applications') ||
    error.message?.toLowerCase().includes('fetch') ||
    error.digest

  return (
    <div className="space-y-6 p-4">
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>
          {isLoadError ? 'Failed to load applications' : 'Something went wrong'}
        </AlertTitle>
        <AlertDescription>
          {isLoadError
            ? 'The Sherpa applications could not be loaded. This may be a temporary issue or a configuration problem. Please try again or contact an administrator.'
            : 'An error occurred in the admin panel. Please try again.'}
          {process.env.NODE_ENV === 'development' && (
            <pre className="mt-2 overflow-auto rounded bg-black/20 p-2 text-xs">
              {error.message}
            </pre>
          )}
        </AlertDescription>
      </Alert>
      <Button onClick={reset} variant="outline">
        Try again
      </Button>
    </div>
  )
}
