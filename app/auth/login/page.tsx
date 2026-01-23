import { Suspense } from 'react'
import { LoginForm } from '@/components/login-form'

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
