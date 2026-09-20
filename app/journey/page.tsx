import { Suspense } from 'react'
import { JourneyShell } from '@/components/journey/journey-shell'

export default function JourneyPage() {
  return (
    <Suspense fallback={<div className="flex h-dvh items-center justify-center text-default-500">Loading journey…</div>}>
      <JourneyShell />
    </Suspense>
  )
}
