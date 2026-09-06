'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ProfileNavSidebar } from '@/components/profile/profile-nav-sidebar'
import { AvatarUploadSection } from '@/components/profile/avatar-upload-section'
import { PersonalInfoSection } from '@/components/profile/personal-info-section'
import { LocationSection } from '@/components/profile/location-section'
import { TraitsSection } from '@/components/profile/traits-section'
import { BioSection } from '@/components/profile/bio-section'
import { ProfileCompletionWidget } from '@/components/profile/profile-completion-widget'
import { WorkHistorySection } from '@/components/profile/work-history-section'
import { EducationSection } from '@/components/profile/education-section'
import { SkillsSection } from '@/components/profile/skills-section'
import { ProfileImportSection } from '@/components/profile/profile-import-section'
import { MentorFieldsSection } from '@/components/profile/mentor-fields-section'
import { PublicHandleSection } from '@/components/profile/public-handle-section'
import { AgentThinking } from '@/components/application/agent-thinking/agent-thinking'
import { useSession } from '@/lib/auth-client'
import type { WorkExperience } from '@/components/profile/work-history-section'
import type { Education } from '@/components/profile/education-section'
import type { Skill } from '@/components/profile/skills-section'

// Type definitions
interface Profile {
  id: string
  user_id: string
  display_name: string | null
  headline: string | null
  bio: string | null
  avatar_url: string | null
  phone: string | null
  date_of_birth: string | null
  gender: string | null
  nationality: string | null
  country: string | null
  city: string | null
  timezone: string | null
  years_of_experience: number | null
  completion_percentage: number
  public_handle: string | null
  is_mentor: boolean
  is_mentee: boolean
  traits_public: boolean
  work_history_public: boolean
  education_public: boolean
  skills_public: boolean
  languages_spoken: string[]
  can_mentor_for: string[]
  want_to_learn: string[]
  specializations: string[]
  hobbies: string[]
  expertise_areas: string[]
  languages: string[]
  work_experiences: WorkExperience[]
  educations: Education[]
  skills: Skill[]
}

// API functions
async function fetchProfile(): Promise<Profile> {
  const response = await fetch('/api/profile/me')
  if (!response.ok) {
    throw new Error('Failed to fetch profile')
  }
  const json = await response.json()
  return json.data
}

async function updateProfile(data: Partial<Profile>): Promise<Profile> {
  const response = await fetch('/api/profile/me', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || 'Failed to update profile')
  }
  const json = await response.json()
  return json.data
}

async function uploadAvatar(file: File): Promise<string> {
  // Upload file to server (server handles Supabase Storage upload)
  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch('/api/profile/avatar', {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || 'Failed to upload avatar')
  }

  const { data } = await response.json()
  return data.avatar_url
}

// Work Experience API functions
async function createWorkExperience(data: Omit<WorkExperience, 'id'>): Promise<WorkExperience> {
  const response = await fetch('/api/profile/work-experiences', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || 'Failed to create work experience')
  }
  const json = await response.json()
  return json.data
}

async function updateWorkExperience(
  id: string,
  data: Partial<WorkExperience>
): Promise<WorkExperience> {
  const response = await fetch(`/api/profile/work-experiences/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || 'Failed to update work experience')
  }
  const json = await response.json()
  return json.data
}

async function deleteWorkExperience(id: string): Promise<void> {
  const response = await fetch(`/api/profile/work-experiences/${id}`, {
    method: 'DELETE',
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || 'Failed to delete work experience')
  }
}

// Education API functions
async function createEducation(data: Omit<Education, 'id'>): Promise<Education> {
  const response = await fetch('/api/profile/educations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || 'Failed to create education')
  }
  const json = await response.json()
  return json.data
}

async function updateEducation(id: string, data: Partial<Education>): Promise<Education> {
  const response = await fetch(`/api/profile/educations/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || 'Failed to update education')
  }
  const json = await response.json()
  return json.data
}

async function deleteEducation(id: string): Promise<void> {
  const response = await fetch(`/api/profile/educations/${id}`, {
    method: 'DELETE',
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || 'Failed to delete education')
  }
}

// Skills API functions
async function createSkill(data: Omit<Skill, 'id'>): Promise<Skill> {
  const response = await fetch('/api/profile/skills', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || 'Failed to create skill')
  }
  const json = await response.json()
  return json.data
}

async function updateSkill(id: string, data: Partial<Skill>): Promise<Skill> {
  const response = await fetch(`/api/profile/skills/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || 'Failed to update skill')
  }
  const json = await response.json()
  return json.data
}

async function deleteSkill(id: string): Promise<void> {
  const response = await fetch(`/api/profile/skills/${id}`, {
    method: 'DELETE',
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || 'Failed to delete skill')
  }
}

export default function ProfileEditPage() {
  const { data: session } = useSession()
  const queryClient = useQueryClient()

  // Fetch profile data
  const {
    data: profile,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['profile'],
    queryFn: fetchProfile,
  })

  // Update profile mutation
  const updateMutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] })
    },
  })

  // Avatar upload mutation
  const avatarMutation = useMutation({
    mutationFn: uploadAvatar,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] })
    },
  })

  // Work Experience mutations
  const createWorkMutation = useMutation({
    mutationFn: createWorkExperience,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] })
    },
  })

  const updateWorkMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<WorkExperience> }) =>
      updateWorkExperience(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] })
    },
  })

  const deleteWorkMutation = useMutation({
    mutationFn: deleteWorkExperience,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] })
    },
  })

  // Education mutations
  const createEducationMutation = useMutation({
    mutationFn: createEducation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] })
    },
  })

  const updateEducationMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Education> }) =>
      updateEducation(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] })
    },
  })

  const deleteEducationMutation = useMutation({
    mutationFn: deleteEducation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] })
    },
  })

  // Skills mutations
  const createSkillMutation = useMutation({
    mutationFn: createSkill,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] })
    },
  })

  const updateSkillMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Skill> }) => updateSkill(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] })
    },
  })

  const deleteSkillMutation = useMutation({
    mutationFn: deleteSkill,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] })
    },
  })

  // Handle personal info save
  const handlePersonalInfoSave = async (data: {
    display_name: string
    headline?: string
    phone?: string | null
    date_of_birth?: string | null
    gender?: string | null
    nationality?: string | null
  }) => {
    await updateMutation.mutateAsync(data)
  }

  // Handle location save
  const handleLocationSave = async (data: { country: string | null; city: string | null }) => {
    await updateMutation.mutateAsync(data)
  }

  // Handle traits save
  const handleTraitsSave = async (data: {
    languages_spoken: string[]
    can_mentor_for: string[]
    want_to_learn: string[]
    specializations: string[]
    hobbies: string[]
    traits_public: boolean
  }) => {
    await updateMutation.mutateAsync(data)
  }

  // Handle bio save
  const handleBioSave = async (data: { bio: string | null }) => {
    await updateMutation.mutateAsync(data)
  }

  // Handle public handle save
  const handlePublicHandleSave = async (data: { public_handle: string | null }) => {
    await updateMutation.mutateAsync(data)
  }

  // Handle avatar upload
  const handleAvatarUpload = async (file: File) => {
    await avatarMutation.mutateAsync(file)
  }

  // Handle mentor fields save
  const handleMentorFieldsSave = async (data: {
    expertise_areas: string[]
    languages: string[]
    timezone: string | null
    years_of_experience: number | null
  }) => {
    await updateMutation.mutateAsync(data)
  }

  // Handle import success - refresh profile data
  const handleImportSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['profile'] })
  }

  // Work Experience handlers
  const handleAddWorkExperience = async (data: Omit<WorkExperience, 'id'>) => {
    await createWorkMutation.mutateAsync(data)
  }

  const handleEditWorkExperience = async (id: string, data: Partial<WorkExperience>) => {
    await updateWorkMutation.mutateAsync({ id, data })
  }

  const handleDeleteWorkExperience = async (id: string) => {
    await deleteWorkMutation.mutateAsync(id)
  }

  const handleWorkHistoryVisibilityChange = async (isPublic: boolean) => {
    await updateMutation.mutateAsync({ work_history_public: isPublic })
  }

  // Education handlers
  const handleAddEducation = async (data: Omit<Education, 'id'>) => {
    await createEducationMutation.mutateAsync(data)
  }

  const handleEditEducation = async (id: string, data: Partial<Education>) => {
    await updateEducationMutation.mutateAsync({ id, data })
  }

  const handleDeleteEducation = async (id: string) => {
    await deleteEducationMutation.mutateAsync(id)
  }

  const handleEducationVisibilityChange = async (isPublic: boolean) => {
    await updateMutation.mutateAsync({ education_public: isPublic })
  }

  // Skills handlers
  const handleAddSkill = async (data: Omit<Skill, 'id'>) => {
    await createSkillMutation.mutateAsync(data)
  }

  const handleEditSkill = async (id: string, data: Partial<Skill>) => {
    await updateSkillMutation.mutateAsync({ id, data })
  }

  const handleDeleteSkill = async (id: string) => {
    await deleteSkillMutation.mutateAsync(id)
  }

  const handleSkillsVisibilityChange = async (isPublic: boolean) => {
    await updateMutation.mutateAsync({ skills_public: isPublic })
  }

  // Get user email from session
  const userEmail = session?.user?.email || ''

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <AgentThinking variant="spin" label="Loading your profile" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-body-regular text-status-rose-text">
          Failed to load profile. Please try again.
        </p>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-body-regular text-text-secondary">Profile not found.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[240px_1fr_300px]">
      {/* Left: Navigation Sidebar (renders its own mobile drawer + toggle) */}
      <div>
        <ProfileNavSidebar />
      </div>

      {/* Center: Main Content */}
      <div className="space-y-6">
        {/* Page Title */}
        <h1 className="text-title-1-medium text-text-primary">Edit Profile</h1>

        {/* Import Section */}
        <ProfileImportSection onImportSuccess={handleImportSuccess} />

        {/* Avatar Section */}
        <div className="rounded-3xl border border-border-button-default bg-background-primary-default p-6 shadow-xs">
          <AvatarUploadSection avatarUrl={profile.avatar_url} onUpload={handleAvatarUpload} />
        </div>

        {/* Personal Info Section */}
        <PersonalInfoSection
          displayName={profile.display_name}
          headline={profile.headline}
          email={userEmail}
          phone={profile.phone}
          dateOfBirth={profile.date_of_birth}
          gender={profile.gender}
          nationality={profile.nationality}
          onSave={handlePersonalInfoSave}
        />

        {/* Location Section */}
        <LocationSection
          country={profile.country}
          city={profile.city}
          onSave={handleLocationSave}
        />

        {/* Traits Section */}
        <TraitsSection
          languagesSpoken={profile.languages_spoken || []}
          canMentorFor={profile.can_mentor_for || []}
          wantToLearn={profile.want_to_learn || []}
          specializations={profile.specializations || []}
          hobbies={profile.hobbies || []}
          traitsPublic={profile.traits_public}
          onSave={handleTraitsSave}
        />

        {/* Bio Section */}
        <BioSection bio={profile.bio} onSave={handleBioSave} />

        {/* Public Handle Section */}
        <PublicHandleSection
          handle={profile.public_handle}
          onSave={handlePublicHandleSave}
        />

        {/* Mentor Fields Section - Only visible when is_mentor=true */}
        {profile.is_mentor && (
          <MentorFieldsSection
            expertiseAreas={profile.expertise_areas || []}
            languages={profile.languages || []}
            timezone={profile.timezone}
            yearsOfExperience={profile.years_of_experience}
            onSave={handleMentorFieldsSave}
          />
        )}

        {/* Work History Section */}
        <WorkHistorySection
          workExperiences={profile.work_experiences || []}
          workHistoryPublic={profile.work_history_public}
          onAdd={handleAddWorkExperience}
          onEdit={handleEditWorkExperience}
          onDelete={handleDeleteWorkExperience}
          onVisibilityChange={handleWorkHistoryVisibilityChange}
        />

        {/* Education Section */}
        <EducationSection
          educations={profile.educations || []}
          educationPublic={profile.education_public}
          onAdd={handleAddEducation}
          onEdit={handleEditEducation}
          onDelete={handleDeleteEducation}
          onVisibilityChange={handleEducationVisibilityChange}
        />

        {/* Skills Section */}
        <SkillsSection
          skills={(profile.skills || []) as Skill[]}
          skillsPublic={profile.skills_public}
          onAdd={handleAddSkill}
          onEdit={handleEditSkill}
          onDelete={handleDeleteSkill}
          onVisibilityChange={handleSkillsVisibilityChange}
        />
      </div>

      {/* Right: Profile Completion Widget */}
      <div className="order-first lg:order-last">
        <ProfileCompletionWidget
          completionPercentage={profile.completion_percentage}
          profile={{
            avatar_url: profile.avatar_url,
            display_name: profile.display_name,
            headline: profile.headline,
            country: profile.country,
            city: profile.city,
            bio: profile.bio,
            date_of_birth: profile.date_of_birth,
            gender: profile.gender,
            nationality: profile.nationality,
            languages_spoken: profile.languages_spoken,
            can_mentor_for: profile.can_mentor_for,
            want_to_learn: profile.want_to_learn,
            specializations: profile.specializations,
            hobbies: profile.hobbies,
          }}
          workExperiencesCount={profile.work_experiences?.length || 0}
          educationsCount={profile.educations?.length || 0}
          skillsCount={profile.skills?.length || 0}
        />
      </div>
    </div>
  )
}
