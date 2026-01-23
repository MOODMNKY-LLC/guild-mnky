'use client'

interface AccountClientProps {
  children: React.ReactNode
}

/**
 * AccountClient wrapper component.
 * 
 * Note: Auth checking is handled server-side in the AccountContent component.
 * This client component exists only to provide client-side interactivity
 * for child components. Removing redundant client-side auth checks prevents
 * race conditions and multiple redirects.
 */
export function AccountClient({ children }: AccountClientProps) {
  return <>{children}</>
}