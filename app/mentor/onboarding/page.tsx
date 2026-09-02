import { redirect } from 'next/navigation'
import { getCurrentProfile, getSession } from '@/lib/auth-helpers'
import { OnboardingWizard } from '@/components/mentor/onboarding/OnboardingWizard'

// Force dynamic rendering (uses cookies for auth)
export const dynamic = 'force-dynamic'

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
  const session = await getSession()
  
  if (!session) {
    redirect('/sign-in?redirect=/mentor/onboarding')
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
