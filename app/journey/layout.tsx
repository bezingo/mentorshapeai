import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Journey | Mentorshape',
  description: 'Your Mentorshape onboarding guide',
}

export default function JourneyLayout({ children }: { children: React.ReactNode }) {
  return children
}
