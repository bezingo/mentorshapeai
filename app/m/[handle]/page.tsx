import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { Metadata } from 'next'
import { PublicProfileContent } from './public-profile-content'

interface PageProps {
  params: Promise<{ handle: string }>
}

// Define the profile type for better type safety
interface Profile {
  id: string
  user_id: string
  public_handle: string
  display_name: string | null
  headline: string | null
  bio: string | null
  avatar_url: string | null
  is_mentor: boolean
  is_mentee: boolean
  // Location
  country: string | null
  city: string | null
  timezone: string | null
  // Mentor fields
  years_of_experience: number | null
  expertise_areas: string[]
  languages: string[]
  // Traits
  languages_spoken: string[]
  can_mentor_for: string[]
  want_to_learn: string[]
  specializations: string[]
  hobbies: string[]
  // Visibility toggles
  traits_public: boolean
  work_history_public: boolean
  education_public: boolean
  skills_public: boolean
  // Mentor settings
  invite_only: boolean
  // Timestamps
  updated_at: string | null
}

interface WorkExperience {
  id: string
  profile_id: string
  company: string
  title: string
  start_date: string
  end_date: string | null
  description: string | null
  is_current: boolean
}

interface Education {
  id: string
  profile_id: string
  institution: string
  degree: string
  start_date: string
  end_date: string | null
  is_current: boolean
}

interface Skill {
  id: string
  profile_id: string
  name: string
  level: string
}

// Generate SEO metadata dynamically
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { handle } = await params
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, headline, bio, avatar_url')
    .eq('public_handle', handle)
    .single()

  if (!profile) {
    return {
      title: 'Mentor Not Found | Mentorshape',
      description: 'This mentor profile could not be found.',
    }
  }

  const title = `${profile.display_name || 'Mentor'} | Mentor on Mentorshape`
  const description = (profile.headline || profile.bio || 'Connect with this mentor on Mentorshape').slice(0, 160)

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'profile',
      images: profile.avatar_url ? [{ url: profile.avatar_url, width: 400, height: 400 }] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: profile.avatar_url ? [profile.avatar_url] : [],
    },
  }
}

export default async function PublicMentorPage({ params }: PageProps) {
  const { handle } = await params
  const supabase = await createClient()

  // Fetch profile with all new fields
  // Allow both mentors and mentees to have public pages
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('public_handle', handle)
    .single()

  // Return 404 if handle not found
  if (error || !profile) {
    notFound()
  }

  // Cast profile to typed interface
  const typedProfile = profile as Profile

  // Check if this is the current user's own profile
  const { userId: clerkUserId } = await auth()
  let isOwnProfile = false

  if (clerkUserId) {
    const { data: currentUser } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_user_id', clerkUserId)
      .single()

    if (currentUser) {
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', currentUser.id)
        .single()

      isOwnProfile = currentProfile?.id === typedProfile.id
    }
  }

  // Query work_experiences, educations, skills based on visibility flags
  const [workExpResult, educationsResult, skillsResult] = await Promise.all([
    typedProfile.work_history_public
      ? supabase
          .from('work_experiences')
          .select('*')
          .eq('profile_id', typedProfile.id)
          .order('start_date', { ascending: false })
      : Promise.resolve({ data: null, error: null }),
    typedProfile.education_public
      ? supabase
          .from('educations')
          .select('*')
          .eq('profile_id', typedProfile.id)
          .order('start_date', { ascending: false })
      : Promise.resolve({ data: null, error: null }),
    typedProfile.skills_public
      ? supabase
          .from('skills')
          .select('*')
          .eq('profile_id', typedProfile.id)
      : Promise.resolve({ data: null, error: null }),
  ])

  const workExperiences = (workExpResult.data || []) as WorkExperience[]
  const educations = (educationsResult.data || []) as Education[]
  const skills = (skillsResult.data || []) as Skill[]

  // Get most recent work and education for header display
  const currentCompany = workExperiences.length > 0 ? workExperiences[0].company : null
  const currentUniversity = educations.length > 0 ? educations[0].institution : null

  return (
    <PublicProfileContent
      profile={typedProfile}
      workExperiences={workExperiences}
      educations={educations}
      skills={skills}
      currentCompany={currentCompany}
      currentUniversity={currentUniversity}
      isOwnProfile={isOwnProfile}
    />
  )
}
