import { redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { getCurrentProfile } from '@/lib/clerk'
import { OnboardingWizard } from '@/components/mentor/onboarding/OnboardingWizard'

/**
 * Mentor Onboarding Page
 * Full-page wizard experience (no dashboard chrome)
 * 
 * - Redirects to /dashboard/mentor if user is already a mentor
 * - Requires authentication
 * - Hosts the OnboardingWizard component
 */
export default async function MentorOnboardingPage() {
  // Check authentication
  const { userId } = await auth()
  
  if (!userId) {
    redirect('/sign-in?redirect_url=/mentor/onboarding')
  }

  // Get user profile
  const profile = await getCurrentProfile()
  
  if (!profile) {
    // If no profile exists, redirect to dashboard to create one
    redirect('/dashboard')
  }

  // If user is already a mentor, redirect to mentor dashboard
  if (profile.is_mentor) {
    redirect('/dashboard/mentor')
  }

  return <OnboardingWizard />
}

/**
 * Page metadata
 */
export const metadata = {
  title: 'Become a Mentor | Mentorshape',
  description: 'Complete your mentor profile and start sharing your expertise with others.',
}
