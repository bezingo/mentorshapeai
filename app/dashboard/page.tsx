import { redirect } from 'next/navigation'
import { getCurrentProfile, getSession } from '@/lib/auth-helpers'
import { getOrgMembership } from '@/lib/auth/org-access'
import { FeatureHub, type FeatureCardData } from '@/components/dashboard/feature-hub'
import { BecomeMentorCard } from '@/components/mentor/BecomeMentorCard'

export default async function DashboardPage() {
  // Check authentication first
  const session = await getSession()

  if (!session) {
    redirect('/sign-in')
  }

  // Get profile (auto-creates users + profiles rows with mentee defaults on first login)
  const profile = await getCurrentProfile()

  // If profile still doesn't exist after ensuring, show error
  if (!profile) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-title-1-medium text-text-primary">Error setting up profile</h1>
          <p className="mt-1 text-body-regular text-text-secondary">
            We couldn&apos;t create your profile. Please try refreshing the page.
          </p>
        </div>
        <div className="rounded-3xl border border-border-button-default bg-background-primary-default p-6 shadow-xs">
          <p className="text-body-regular text-text-secondary">
            If this issue persists, please contact support.
          </p>
        </div>
      </div>
    )
  }

  // Counselor/admin access is determined by org membership role
  const orgMembership = await getOrgMembership(profile.id)
  const isCounselor = orgMembership?.role === 'admin'

  const features: FeatureCardData[] = []

  if (profile.is_mentee) {
    features.push({
      title: 'My Goals',
      description: 'Set, track, and achieve your personal and professional goals.',
      icon: 'target',
      links: [
        { label: 'View Goals', href: '/dashboard/mentee/goals', icon: 'target' },
        { label: 'Create New Goal', href: '/dashboard/mentee/goals/new', icon: 'plus' },
      ],
    })
  }

  features.push({
    title: 'Collaborations',
    description: 'Your mentoring relationships and shared progress.',
    icon: 'users',
    links: [{ label: 'View Collaborations', href: '/dashboard/collaborations', icon: 'users' }],
  })

  features.push({
    title: 'Focuses',
    description: 'Focus sessions and areas you are working on with mentors.',
    icon: 'calendar',
    links: [{ label: 'View Focuses', href: '/dashboard/focuses', icon: 'calendar' }],
  })

  if (profile.is_mentor) {
    features.push({
      title: 'Mentor Area',
      description: 'Manage your mentees, availability, and mentoring offers.',
      icon: 'users',
      links: [
        { label: 'Mentor Dashboard', href: '/dashboard/mentor', icon: 'users' },
        { label: 'Availability', href: '/dashboard/mentor/availability', icon: 'clock' },
        { label: 'Offers', href: '/dashboard/mentor/offers', icon: 'package' },
      ],
    })
  }

  if (isCounselor) {
    features.push({
      title: 'Counselor Area',
      description: `School tools for ${orgMembership?.org.name ?? 'your organization'}: rosters, pairs, and reports.`,
      icon: 'graduation',
      links: [
        { label: 'Counselor Dashboard', href: '/dashboard/counselor', icon: 'graduation' },
        { label: 'Mentor–Mentee Pairs', href: '/dashboard/counselor/pairs', icon: 'users' },
        { label: 'Import Roster (CSV)', href: '/dashboard/counselor/import', icon: 'plus' },
      ],
    })
  }

  features.push({
    title: 'Profile & Settings',
    description: 'Update your public profile and account preferences.',
    icon: 'user',
    links: [
      { label: 'My Profile', href: '/dashboard/profile', icon: 'user' },
      { label: 'Settings', href: '/dashboard/settings', icon: 'settings' },
    ],
  })

  const displayName = profile.display_name || session.user.name || session.user.email

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-title-1-medium text-text-primary">Welcome back, {displayName}!</h1>
        <p className="mt-1 text-body-regular text-text-secondary">
          Everything Mentorshape offers, in one place. Pick up where you left off.
        </p>
      </div>

      <FeatureHub features={features} />

      {profile.is_mentee && !profile.is_mentor && <BecomeMentorCard compact />}
    </div>
  )
}
