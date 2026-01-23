import { LoginForm } from '@/components/login-form'

export default function Page() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center p-4 md:p-6">
      <div className="w-full max-w-sm">
        <LoginForm />
      </div>
    </div>
  )
}
