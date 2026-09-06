import type { Metadata } from 'next'
import { AiProfileDemo } from './ai-profile-demo'

export const metadata: Metadata = {
  title: 'BoardUI Profile · MentorShape AI',
  description: 'Demo of BoardUI profile patterns used across Mentorshape.',
}

export default function AiProfilePage() {
  return <AiProfileDemo />
}
