import type { Metadata } from 'next'
import { AiChatDemo } from './ai-chat-demo'

export const metadata: Metadata = {
  title: 'BoardUI AI Chat · MentorShape AI',
  description: 'Demo of the BoardUI AI chat shell used across Mentorshape.',
}

export default function AiChatPage() {
  return <AiChatDemo />
}
