import { Suspense } from 'react'
import { LoginForm } from '@/components/login-form'

// NOTE: This route is automatically dynamic because it uses cookies() via the proxy
// The cache warning is expected and harmless - auth routes should not be cached
// Using cookies() makes routes dynamic by default, which is correct for auth

function LoginFormWrapper() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center p-4 md:p-6">
      <div className="w-full max-w-sm">
        <LoginForm />
      </div>
    </div>
  )
}

export default function Page() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen w-full items-center justify-center p-4 md:p-6">
        <div className="w-full max-w-sm">
          <div className="text-center">Loading...</div>
        </div>
      </div>
    }>
      <LoginFormWrapper />
    </Suspense>
  )
}
