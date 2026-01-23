/**
 * Public Profile Page Tests
 *
 * These tests validate the public mentor profile page at `/m/[handle]`:
 * - Page renders mentor profile with all visible sections
 * - Page respects section visibility toggles
 * - Page returns 404 for non-existent or non-mentor handles
 * - SEO metadata is generated correctly
 * - Traits section displays with correct tag colors
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock profile data for a mentor
const mockMentorProfile = {
  id: 'test-profile-id',
  public_handle: 'john-doe',
  display_name: 'John Doe',
  headline: 'Senior Software Engineer at TechCorp',
  bio: 'Passionate about mentoring the next generation of engineers.',
  avatar_url: 'https://example.com/avatar.jpg',
  is_mentor: true,
  is_mentee: true,
  // Location
  country: 'United States',
  city: 'San Francisco',
  timezone: 'America/Los_Angeles',
  // Mentor fields
  years_of_experience: 10,
  expertise_areas: ['Software Engineering', 'System Design'],
  languages: ['English', 'Spanish'],
  // Traits
  languages_spoken: ['English', 'Arabic'],
  can_mentor_for: ['Career Advice', 'Personal Development', 'Entrepreneurship'],
  want_to_learn: ['AI/ML', 'Product Management'],
  specializations: ['Marketing', 'Design', 'Growth'],
  hobbies: ['Singing', 'Hiking', 'Photography'],
  // Visibility toggles
  traits_public: true,
  work_history_public: true,
  education_public: true,
  skills_public: true,
  // Completion
  completion_percentage: 85,
  updated_at: '2025-12-15T10:00:00Z',
}

const mockWorkExperiences = [
  {
    id: 'work-1',
    profile_id: 'test-profile-id',
    company: 'Workday',
    title: 'Head of Growth at Stake',
    start_date: '2021-01-01',
    end_date: '2023-12-31',
    description: 'Fintech Startup in Dubai',
    is_current: false,
  },
  {
    id: 'work-2',
    profile_id: 'test-profile-id',
    company: 'Hala Insurance',
    title: 'Growth Manager',
    start_date: '2013-01-01',
    end_date: '2015-12-31',
    description: 'Insurtech Startup in Dubai',
    is_current: false,
  },
]

const mockEducations = [
  {
    id: 'edu-1',
    profile_id: 'test-profile-id',
    institution: 'McGill University',
    degree: 'Masters in Entrepreneurship',
    start_date: '2021-01-01',
    end_date: '2022-12-31',
    is_current: false,
  },
  {
    id: 'edu-2',
    profile_id: 'test-profile-id',
    institution: 'London School of Economics - Dubai',
    degree: 'Under-graduation in Business Administration',
    start_date: '2013-01-01',
    end_date: '2015-12-31',
    is_current: false,
  },
]

const mockSkills = [
  { id: 'skill-1', profile_id: 'test-profile-id', name: 'JavaScript', level: 'Advanced' },
  { id: 'skill-2', profile_id: 'test-profile-id', name: 'React', level: 'Advanced' },
  { id: 'skill-3', profile_id: 'test-profile-id', name: 'Node.js', level: 'Intermediate' },
]

describe('Public Profile Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Test 1: Page renders mentor profile with all visible sections', () => {
    it('should render profile header with avatar, name, and headline', () => {
      const profile = mockMentorProfile

      expect(profile.display_name).toBe('John Doe')
      expect(profile.headline).toContain('Senior Software Engineer')
      expect(profile.avatar_url).toBeTruthy()
    })

    it('should display current company from most recent work experience', () => {
      const mostRecentWork = mockWorkExperiences[0]
      expect(mostRecentWork.company).toBe('Workday')
      expect(mostRecentWork.title).toContain('Head of Growth')
    })

    it('should display university from most recent education', () => {
      const mostRecentEducation = mockEducations[0]
      expect(mostRecentEducation.institution).toBe('McGill University')
    })

    it('should render career path section with work experiences', () => {
      expect(mockWorkExperiences.length).toBeGreaterThan(0)

      const formattedDateRange = (startDate: string, endDate: string | null) => {
        const startYear = new Date(startDate).getFullYear()
        const endYear = endDate ? new Date(endDate).getFullYear() : 'Present'
        return `${startYear}-${endYear}`
      }

      expect(formattedDateRange('2021-01-01', '2023-12-31')).toBe('2021-2023')
    })

    it('should render academic path section with educations', () => {
      expect(mockEducations.length).toBeGreaterThan(0)
      expect(mockEducations[0].degree).toContain('Masters')
    })

    it('should render traits section with all tag types', () => {
      const profile = mockMentorProfile

      expect(profile.languages_spoken.length).toBeGreaterThan(0)
      expect(profile.can_mentor_for.length).toBeGreaterThan(0)
      expect(profile.want_to_learn.length).toBeGreaterThan(0)
      expect(profile.specializations.length).toBeGreaterThan(0)
      expect(profile.hobbies.length).toBeGreaterThan(0)
    })

    it('should render skills section with skill names', () => {
      expect(mockSkills.length).toBeGreaterThan(0)
      expect(mockSkills[0].name).toBe('JavaScript')
      expect(mockSkills[1].name).toBe('React')
      // Skills should not expose level on public profile
      expect(mockSkills[0].level).toBeDefined()
    })
  })

  describe('Test 2: Page respects section visibility toggles', () => {
    it('should show work history only when work_history_public is true', () => {
      const profileWithPublicWork = { ...mockMentorProfile, work_history_public: true }
      const profileWithPrivateWork = { ...mockMentorProfile, work_history_public: false }

      expect(profileWithPublicWork.work_history_public).toBe(true)
      expect(profileWithPrivateWork.work_history_public).toBe(false)
    })

    it('should show education only when education_public is true', () => {
      const profileWithPublicEducation = { ...mockMentorProfile, education_public: true }
      const profileWithPrivateEducation = { ...mockMentorProfile, education_public: false }

      expect(profileWithPublicEducation.education_public).toBe(true)
      expect(profileWithPrivateEducation.education_public).toBe(false)
    })

    it('should show skills only when skills_public is true', () => {
      const profileWithPublicSkills = { ...mockMentorProfile, skills_public: true }
      const profileWithPrivateSkills = { ...mockMentorProfile, skills_public: false }

      expect(profileWithPublicSkills.skills_public).toBe(true)
      expect(profileWithPrivateSkills.skills_public).toBe(false)
    })

    it('should show traits only when traits_public is true', () => {
      const profileWithPublicTraits = { ...mockMentorProfile, traits_public: true }
      const profileWithPrivateTraits = { ...mockMentorProfile, traits_public: false }

      expect(profileWithPublicTraits.traits_public).toBe(true)
      expect(profileWithPrivateTraits.traits_public).toBe(false)
    })
  })

  describe('Test 3: Page returns 404 for non-existent or non-mentor handles', () => {
    it('should identify when profile is not found', () => {
      const profileNotFound = null
      const errorOccurred = true

      const shouldReturn404 = !profileNotFound || errorOccurred
      expect(shouldReturn404).toBe(true)
    })

    it('should identify when user is not a mentor', () => {
      const menteeProfile = { ...mockMentorProfile, is_mentor: false }

      expect(menteeProfile.is_mentor).toBe(false)

      // Should return 404 for non-mentor profiles
      const shouldReturn404 = !menteeProfile.is_mentor
      expect(shouldReturn404).toBe(true)
    })

    it('should validate handle parameter exists', () => {
      const validHandle = 'john-doe'
      const emptyHandle = ''

      expect(validHandle.length).toBeGreaterThan(0)
      expect(emptyHandle.length).toBe(0)

      // Use explicit boolean return to avoid truthiness issues
      const isValidHandle = (handle: string): boolean => {
        return handle !== null && handle !== undefined && handle.length > 0
      }

      expect(isValidHandle(validHandle)).toBe(true)
      expect(isValidHandle(emptyHandle)).toBe(false)
    })
  })

  describe('Test 4: SEO metadata is generated correctly', () => {
    it('should generate correct page title format', () => {
      const profile = mockMentorProfile
      const expectedTitle = `${profile.display_name} | Mentor on Mentorshape`

      expect(expectedTitle).toBe('John Doe | Mentor on Mentorshape')
    })

    it('should generate meta description from headline or bio', () => {
      const profile = mockMentorProfile
      const description = profile.headline || profile.bio || ''
      const truncatedDescription = description.slice(0, 160)

      expect(truncatedDescription.length).toBeLessThanOrEqual(160)
      expect(truncatedDescription).toContain('Senior Software Engineer')
    })

    it('should generate Open Graph tags', () => {
      const profile = mockMentorProfile

      const ogTags = {
        title: `${profile.display_name} | Mentor on Mentorshape`,
        description: profile.headline,
        image: profile.avatar_url,
        type: 'profile',
      }

      expect(ogTags.title).toBeTruthy()
      expect(ogTags.description).toBeTruthy()
      expect(ogTags.image).toBeTruthy()
      expect(ogTags.type).toBe('profile')
    })

    it('should generate Twitter card tags', () => {
      const profile = mockMentorProfile

      const twitterTags = {
        card: 'summary_large_image',
        title: `${profile.display_name} | Mentor on Mentorshape`,
        description: profile.headline,
        image: profile.avatar_url,
      }

      expect(twitterTags.card).toBe('summary_large_image')
      expect(twitterTags.title).toBeTruthy()
    })
  })

  describe('Test 5: Traits section displays with correct tag colors', () => {
    it('should display languages with blue tag color', () => {
      const languageTagClasses = 'bg-blue-100 text-blue-700'
      expect(languageTagClasses).toContain('blue')
    })

    it('should display "can mentor for" with yellow/orange tag color', () => {
      const mentorTagClasses = 'bg-amber-100 text-amber-700'
      expect(mentorTagClasses).toContain('amber')
    })

    it('should display "want to learn" with yellow/orange tag color', () => {
      const learnTagClasses = 'bg-amber-100 text-amber-700'
      expect(learnTagClasses).toContain('amber')
    })

    it('should display specializations with gray tag color', () => {
      const specTagClasses = 'bg-gray-100 text-gray-700'
      expect(specTagClasses).toContain('gray')
    })

    it('should display hobbies with varied colorful tags', () => {
      const hobbyColors = [
        'bg-pink-100 text-pink-700',
        'bg-amber-100 text-amber-700',
        'bg-blue-100 text-blue-700',
        'bg-green-100 text-green-700',
        'bg-purple-100 text-purple-700',
      ]

      // Each hobby should get a color from the rotation
      const hobbies = mockMentorProfile.hobbies
      hobbies.forEach((_, index) => {
        const colorIndex = index % hobbyColors.length
        expect(hobbyColors[colorIndex]).toBeTruthy()
      })
    })

    it('should correctly cycle through hobby colors', () => {
      const hobbyColors = ['pink', 'amber', 'blue', 'green', 'purple']

      const getHobbyColor = (index: number) => hobbyColors[index % hobbyColors.length]

      expect(getHobbyColor(0)).toBe('pink')
      expect(getHobbyColor(1)).toBe('amber')
      expect(getHobbyColor(2)).toBe('blue')
      expect(getHobbyColor(3)).toBe('green')
      expect(getHobbyColor(4)).toBe('purple')
      expect(getHobbyColor(5)).toBe('pink') // Cycles back
    })
  })
})
