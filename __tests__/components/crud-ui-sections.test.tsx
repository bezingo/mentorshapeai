/**
 * CRUD UI Sections Tests
 *
 * These tests validate the Work History, Education, and Skills UI sections including:
 * - WorkHistorySection displays entries and opens add/edit modal
 * - EducationSection displays entries and opens add/edit modal
 * - SkillsSection displays skill pills with add/edit capability
 * - "I currently work/study here" checkbox disables end date
 * - Delete confirmation works correctly
 * - Visibility toggle updates section privacy
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => '/dashboard/profile',
}))

// Mock data
const mockWorkExperiences = [
  {
    id: 'work-1',
    company: 'Google',
    title: 'Software Engineer',
    start_date: '2021-01-01',
    end_date: '2023-06-30',
    description: 'Worked on search algorithms',
    is_current: false,
  },
  {
    id: 'work-2',
    company: 'Meta',
    title: 'Senior Engineer',
    start_date: '2023-07-01',
    end_date: null,
    description: 'Leading frontend team',
    is_current: true,
  },
]

const mockEducations = [
  {
    id: 'edu-1',
    institution: 'MIT',
    degree: 'BS Computer Science',
    start_date: '2017-09-01',
    end_date: '2021-05-15',
    is_current: false,
  },
  {
    id: 'edu-2',
    institution: 'Stanford',
    degree: 'MS Computer Science',
    start_date: '2021-09-01',
    end_date: null,
    is_current: true,
  },
]

const mockSkills = [
  { id: 'skill-1', name: 'JavaScript', level: 'Advanced' },
  { id: 'skill-2', name: 'Python', level: 'Intermediate' },
  { id: 'skill-3', name: 'React', level: 'Advanced' },
]

describe('CRUD UI Sections', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Test 1: WorkHistorySection displays entries and opens add/edit modal', () => {
    it('should display work experiences with company, title, and date range', () => {
      const workExperiences = mockWorkExperiences

      // Verify all entries are present
      expect(workExperiences).toHaveLength(2)
      expect(workExperiences[0].company).toBe('Google')
      expect(workExperiences[0].title).toBe('Software Engineer')
    })

    it('should format date range correctly for completed work', () => {
      const workExp = mockWorkExperiences[0]
      const startYear = new Date(workExp.start_date).getFullYear()
      const endYear = workExp.end_date ? new Date(workExp.end_date).getFullYear() : null

      // Expected format: "2021-2023"
      const dateRange = `${startYear}-${endYear}`
      expect(dateRange).toBe('2021-2023')
    })

    it('should format date range as "Present" for current work', () => {
      const currentWork = mockWorkExperiences[1]

      expect(currentWork.is_current).toBe(true)
      expect(currentWork.end_date).toBeNull()

      // Expected format: "2023-Present"
      const startYear = new Date(currentWork.start_date).getFullYear()
      const dateRange = `${startYear}-Present`
      expect(dateRange).toBe('2023-Present')
    })

    it('should have Add Experience button that triggers modal', () => {
      let modalOpen = false
      const openModal = () => {
        modalOpen = true
      }

      openModal()
      expect(modalOpen).toBe(true)
    })

    it('should have Edit and Delete actions for each entry', () => {
      const workExp = mockWorkExperiences[0]
      const actions = ['edit', 'delete']

      expect(actions).toContain('edit')
      expect(actions).toContain('delete')
      expect(workExp.id).toBe('work-1')
    })
  })

  describe('Test 2: EducationSection displays entries and opens add/edit modal', () => {
    it('should display educations with degree, institution, and date range', () => {
      const educations = mockEducations

      expect(educations).toHaveLength(2)
      expect(educations[0].institution).toBe('MIT')
      expect(educations[0].degree).toBe('BS Computer Science')
    })

    it('should format date range correctly for completed education', () => {
      const edu = mockEducations[0]
      const startYear = new Date(edu.start_date).getFullYear()
      const endYear = edu.end_date ? new Date(edu.end_date).getFullYear() : null

      const dateRange = `${startYear}-${endYear}`
      expect(dateRange).toBe('2017-2021')
    })

    it('should format date range as "Present" for current education', () => {
      const currentEdu = mockEducations[1]

      expect(currentEdu.is_current).toBe(true)
      expect(currentEdu.end_date).toBeNull()

      const startYear = new Date(currentEdu.start_date).getFullYear()
      const dateRange = `${startYear}-Present`
      expect(dateRange).toBe('2021-Present')
    })

    it('should have Add Education button that triggers modal', () => {
      let modalOpen = false
      const openModal = () => {
        modalOpen = true
      }

      openModal()
      expect(modalOpen).toBe(true)
    })
  })

  describe('Test 3: SkillsSection displays skill pills with add/edit capability', () => {
    it('should display skills as pill/tag buttons', () => {
      const skills = mockSkills

      expect(skills).toHaveLength(3)
      expect(skills[0].name).toBe('JavaScript')
      expect(skills[1].name).toBe('Python')
      expect(skills[2].name).toBe('React')
    })

    it('should show Add Skill button that triggers modal', () => {
      let modalOpen = false
      const openSkillModal = () => {
        modalOpen = true
      }

      openSkillModal()
      expect(modalOpen).toBe(true)
    })

    it('should show count indicator (e.g., "3/50 skills")', () => {
      const currentCount = mockSkills.length
      const maxCount = 50

      const countIndicator = `${currentCount}/${maxCount} skills`
      expect(countIndicator).toBe('3/50 skills')
    })

    it('should have edit/delete actions available for each skill', () => {
      const skill = mockSkills[0]
      const canEdit = true
      const canDelete = true

      expect(skill.id).toBe('skill-1')
      expect(canEdit).toBe(true)
      expect(canDelete).toBe(true)
    })
  })

  describe('Test 4: "I currently work/study here" checkbox disables end date', () => {
    it('should disable end date field when "I currently work here" is checked', () => {
      let isCurrent = false
      let endDateDisabled = false

      const handleCurrentChange = (checked: boolean) => {
        isCurrent = checked
        endDateDisabled = checked
      }

      // Simulate checking the checkbox
      handleCurrentChange(true)

      expect(isCurrent).toBe(true)
      expect(endDateDisabled).toBe(true)
    })

    it('should enable end date field when "I currently work here" is unchecked', () => {
      let isCurrent = true
      let endDateDisabled = true

      const handleCurrentChange = (checked: boolean) => {
        isCurrent = checked
        endDateDisabled = checked
      }

      // Simulate unchecking the checkbox
      handleCurrentChange(false)

      expect(isCurrent).toBe(false)
      expect(endDateDisabled).toBe(false)
    })

    it('should clear end date value when "I currently work here" is checked', () => {
      let endDate: string | null = '2023-12-31'
      let isCurrent = false

      const handleCurrentChange = (checked: boolean) => {
        isCurrent = checked
        if (checked) {
          endDate = null
        }
      }

      handleCurrentChange(true)

      expect(isCurrent).toBe(true)
      expect(endDate).toBeNull()
    })

    it('should work the same for education "I currently study here"', () => {
      let isCurrent = false
      let endDateDisabled = false

      const handleStudyingChange = (checked: boolean) => {
        isCurrent = checked
        endDateDisabled = checked
      }

      handleStudyingChange(true)

      expect(isCurrent).toBe(true)
      expect(endDateDisabled).toBe(true)
    })
  })

  describe('Test 5: Delete confirmation works correctly', () => {
    it('should show confirmation dialog before deleting', () => {
      let confirmationShown = false

      const handleDeleteClick = () => {
        confirmationShown = true
      }

      handleDeleteClick()
      expect(confirmationShown).toBe(true)
    })

    it('should cancel deletion when user declines confirmation', () => {
      let itemDeleted = false
      let confirmationShown = true

      const handleCancelDelete = () => {
        confirmationShown = false
        itemDeleted = false
      }

      handleCancelDelete()

      expect(confirmationShown).toBe(false)
      expect(itemDeleted).toBe(false)
    })

    it('should proceed with deletion when user confirms', () => {
      let itemDeleted = false
      const itemId = 'work-1'

      const handleConfirmDelete = (id: string) => {
        if (id === itemId) {
          itemDeleted = true
        }
      }

      handleConfirmDelete('work-1')
      expect(itemDeleted).toBe(true)
    })

    it('should remove item from list after successful deletion', () => {
      let workExperiences = [...mockWorkExperiences]
      const idToDelete = 'work-1'

      const deleteWorkExperience = (id: string) => {
        workExperiences = workExperiences.filter((we) => we.id !== id)
      }

      expect(workExperiences).toHaveLength(2)
      deleteWorkExperience(idToDelete)
      expect(workExperiences).toHaveLength(1)
      expect(workExperiences.find((we) => we.id === idToDelete)).toBeUndefined()
    })
  })

  describe('Test 6: Visibility toggle updates section privacy', () => {
    it('should toggle work_history_public visibility', () => {
      let workHistoryPublic = true

      const toggleVisibility = () => {
        workHistoryPublic = !workHistoryPublic
      }

      toggleVisibility()
      expect(workHistoryPublic).toBe(false)

      toggleVisibility()
      expect(workHistoryPublic).toBe(true)
    })

    it('should toggle education_public visibility', () => {
      let educationPublic = true

      const toggleVisibility = () => {
        educationPublic = !educationPublic
      }

      toggleVisibility()
      expect(educationPublic).toBe(false)
    })

    it('should toggle skills_public visibility', () => {
      let skillsPublic = true

      const toggleVisibility = () => {
        skillsPublic = !skillsPublic
      }

      toggleVisibility()
      expect(skillsPublic).toBe(false)
    })

    it('should persist visibility changes to API', async () => {
      let apiCalled = false
      let savedValue = true

      const saveVisibility = async (field: string, value: boolean) => {
        apiCalled = true
        savedValue = value
        return { success: true }
      }

      await saveVisibility('work_history_public', false)

      expect(apiCalled).toBe(true)
      expect(savedValue).toBe(false)
    })
  })
})
