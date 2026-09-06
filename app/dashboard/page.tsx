import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  Target,
  Users,
  Calendar,
  UserCircle,
  Settings,
  Clock,
  Package,
  GraduationCap,
  Plus,
  ArrowRight,
} from 'lucide-react'
import { getCurrentProfile, getSession } from '@/lib/auth-helpers'
import { getOrgMembership } from '@/lib/auth/org-access'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BecomeMentorCard } from '@/components/mentor/BecomeMentorCard'

interface FeatureLink {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}

interface FeatureCard {
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  links: FeatureLink[]
}

function FeatureHubCard({ feature }: { feature: FeatureCard }) {
  const Icon = feature.icon
  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg">{feature.title}</CardTitle>
          </div>
        </div>
        <CardDescription>{feature.description}</CardDescription>
      </CardHeader>
      <CardContent className="mt-auto space-y-2">
        {feature.links.map((link) => {
          const LinkIcon = link.icon
          return (
            <Button
              key={link.href}
              asChild
              variant="outline"
              className="w-full justify-between"
            >
              <Link href={link.href}>
                <span className="flex items-center gap-2">
                  <LinkIcon className="h-4 w-4" />
                  {link.label}
                </span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          )
        })}
      </CardContent>
    </Card>
  )
}

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
          <h1 className="text-3xl font-bold">Error setting up profile</h1>
          <p className="text-muted-foreground">
            We couldn&apos;t create your profile. Please try refreshing the page.
          </p>
        </div>
        <Card className="p-6">
          <p className="text-sm text-muted-foreground">
            If this issue persists, please contact support.
          </p>
        </Card>
      </div>
    )
  }

  // Counselor/admin access is determined by org membership role
  const orgMembership = await getOrgMembership(profile.id)
  const isCounselor = orgMembership?.role === 'admin'

  const features: FeatureCard[] = []

  if (profile.is_mentee) {
    features.push({
      title: 'My Goals',
      description: 'Set, track, and achieve your personal and professional goals.',
      icon: Target,
      links: [
        { label: 'View Goals', href: '/dashboard/mentee/goals', icon: Target },
        { label: 'Create New Goal', href: '/dashboard/mentee/goals/new', icon: Plus },
      ],
    })
  }

  features.push({
    title: 'Collaborations',
    description: 'Your mentoring relationships and shared progress.',
    icon: Users,
    links: [
      { label: 'View Collaborations', href: '/dashboard/collaborations', icon: Users },
    ],
  })

  features.push({
    title: 'Focuses',
    description: 'Focus sessions and areas you are working on with mentors.',
    icon: Calendar,
    links: [{ label: 'View Focuses', href: '/dashboard/focuses', icon: Calendar }],
  })

  if (profile.is_mentor) {
    features.push({
      title: 'Mentor Area',
      description: 'Manage your mentees, availability, and mentoring offers.',
      icon: Users,
      links: [
        { label: 'Mentor Dashboard', href: '/dashboard/mentor', icon: Users },
        { label: 'Availability', href: '/dashboard/mentor/availability', icon: Clock },
        { label: 'Offers', href: '/dashboard/mentor/offers', icon: Package },
      ],
    })
  }

  if (isCounselor) {
    features.push({
      title: 'Counselor Area',
      description: `School tools for ${orgMembership?.org.name ?? 'your organization'}: rosters, pairs, and reports.`,
      icon: GraduationCap,
      links: [
        { label: 'Counselor Dashboard', href: '/dashboard/counselor', icon: GraduationCap },
        { label: 'Mentor–Mentee Pairs', href: '/dashboard/counselor/pairs', icon: Users },
        { label: 'Import Roster (CSV)', href: '/dashboard/counselor/import', icon: Plus },
      ],
    })
  }

  features.push({
    title: 'Profile & Settings',
    description: 'Update your public profile and account preferences.',
    icon: UserCircle,
    links: [
      { label: 'My Profile', href: '/dashboard/profile', icon: UserCircle },
      { label: 'Settings', href: '/dashboard/settings', icon: Settings },
    ],
  })

  const displayName = profile.display_name || session.user.name || session.user.email

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Welcome back, {displayName}!</h1>
        <p className="text-muted-foreground">
          Everything Mentorshape offers, in one place. Pick up where you left off.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {features.map((feature) => (
          <FeatureHubCard key={feature.title} feature={feature} />
        ))}
      </div>

      {profile.is_mentee && !profile.is_mentor && (
        <BecomeMentorCard compact />
      )}
    </div>
  )
}
