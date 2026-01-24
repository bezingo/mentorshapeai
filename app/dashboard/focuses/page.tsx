import { redirect } from 'next/navigation'

export const metadata = {
  title: 'Focus Sessions | MentorShape',
  description: 'View and manage your mentoring focus sessions',
}

/**
 * Focuses landing page - redirects to collaborations
 * Focus sessions are accessed through individual collaborations
 */
export default function FocusesPage() {
  // Redirect to collaborations since focuses are accessed per-collaboration
  redirect('/dashboard/collaborations')
}
