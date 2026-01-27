'use client'

import { useEffect } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { AlertCircle } from 'lucide-react'
import Link from 'next/link'

/**
 * Error boundary for the Sherpa apply page.
 * Catches Server Component and client errors so we show a clear message
 * instead of the generic production "digest omitted" screen.
 */
export default function ApplyError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Sherpa apply page error:', error.message, error.digest)
  }, [error])

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4">
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Something went wrong</AlertTitle>
        <AlertDescription>
          We couldn&apos;t load the application form. This may be a temporary issue.
          Try again or return to the Sherpa hub.
          {process.env.NODE_ENV === 'development' && (
            <pre className="mt-2 overflow-auto rounded bg-black/20 p-2 text-xs">
              {error.message}
            </pre>
          )}
        </AlertDescription>
      </Alert>
      <div className="flex gap-2">
        <Button onClick={reset} variant="outline">
          Try again
        </Button>
        <Button asChild variant="outline">
          <Link href="/sherpa">Back to Sherpa hub</Link>
        </Button>
      </div>
    </div>
  )
}
