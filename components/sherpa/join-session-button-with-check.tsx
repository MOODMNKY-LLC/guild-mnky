'use client'

import { BungieVerificationCheck } from '@/components/sherpa/bungie-verification-check'
import { JoinSessionButton } from '@/components/sherpa/join-session-button'

export function JoinSessionButtonWithCheck({ sessionId }: { sessionId: string }) {
  return (
    <>
      <BungieVerificationCheck required={true} />
      <JoinSessionButton sessionId={sessionId} />
    </>
  )
}
