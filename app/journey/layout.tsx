import type { Metadata } from 'next'
import { JourneyHeroUIProvider } from '@/components/journey/heroui-provider'

export const metadata: Metadata = {
  title: 'Journey | Mentorshape',
  description: 'Your Mentorshape onboarding guide',
}

export default function JourneyLayout({ children }: { children: React.ReactNode }) {
  return (
    <JourneyHeroUIProvider>
      <div className="min-h-screen bg-background text-foreground">{children}</div>
    </JourneyHeroUIProvider>
  )
}
