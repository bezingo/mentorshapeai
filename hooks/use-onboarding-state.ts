'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { OnboardingFormData, AvailabilitySlot } from '@/lib/validations/onboarding'

/**
 * Step definitions for the onboarding wizard
 */
export const ONBOARDING_STEPS = [
  { number: 1, name: 'Welcome', description: 'Get started with mentoring' },
  { number: 2, name: 'Bio & Expertise', description: 'Share your background' },
  { number: 3, name: 'Skills & Languages', description: 'Your capabilities' },
  { number: 4, name: 'Availability', description: 'Set your schedule' },
  { number: 5, name: 'Handle', description: 'Choose your URL' },
  { number: 6, name: 'Review', description: 'Confirm your details' },
] as const

export type StepNumber = 1 | 2 | 3 | 4 | 5 | 6

/**
 * Onboarding progress from API
 */
export interface OnboardingProgress {
  id: string
  profile_id: string
  current_step: number
  completed_steps: number[]
  form_data: OnboardingFormData
  started_at: string
  completed_at: string | null
}

/**
 * Onboarding state interface
 */
interface OnboardingState {
  // Progress tracking
  currentStep: StepNumber
  completedSteps: number[]
  
  // Form data
  formData: {
    bio: string
    expertiseAreas: string[]
    skills: string[]
    languages: string[]
    timezone: string
    yearsOfExperience: number
    availability: AvailabilitySlot[]
    handle: string
    calendarConnected: boolean
  }
  
  // Loading and error states
  isLoading: boolean
  isSaving: boolean
  error: string | null
  
  // API sync status
  isInitialized: boolean
  lastSavedAt: Date | null
  
  // Actions
  setStep: (step: StepNumber) => void
  nextStep: () => void
  prevStep: () => void
  completeStep: (step: number) => void
  updateFormData: (data: Partial<OnboardingState['formData']>) => void
  setLoading: (loading: boolean) => void
  setSaving: (saving: boolean) => void
  setError: (error: string | null) => void
  reset: () => void
  
  // API sync actions
  loadProgress: () => Promise<void>
  saveProgress: () => Promise<void>
  initializeOnboarding: () => Promise<void>
  completeOnboarding: () => Promise<{ success: boolean; error?: string }>
  
  // Helpers
  isStepComplete: (step: number) => boolean
  canProceed: (step: number) => boolean
}

/**
 * Default form data
 */
const defaultFormData: OnboardingState['formData'] = {
  bio: '',
  expertiseAreas: [],
  skills: [],
  languages: [],
  timezone: 'UTC',
  yearsOfExperience: 0,
  availability: [],
  handle: '',
  calendarConnected: false,
}

/**
 * Zustand store for onboarding state management
 * Persists to localStorage and syncs with API
 */
export const useOnboardingState = create<OnboardingState>()(
  persist(
    (set, get) => ({
      // Initial state
      currentStep: 1,
      completedSteps: [],
      formData: { ...defaultFormData },
      isLoading: false,
      isSaving: false,
      error: null,
      isInitialized: false,
      lastSavedAt: null,

      // Step navigation
      setStep: (step) => set({ currentStep: step }),
      
      nextStep: () => {
        const { currentStep } = get()
        if (currentStep < 6) {
          set({ currentStep: (currentStep + 1) as StepNumber })
        }
      },
      
      prevStep: () => {
        const { currentStep } = get()
        if (currentStep > 1) {
          set({ currentStep: (currentStep - 1) as StepNumber })
        }
      },

      completeStep: (step) => {
        const { completedSteps } = get()
        if (!completedSteps.includes(step)) {
          set({ completedSteps: [...completedSteps, step].sort((a, b) => a - b) })
        }
      },

      // Form data updates
      updateFormData: (data) => {
        const { formData } = get()
        set({ formData: { ...formData, ...data } })
      },

      // Loading states
      setLoading: (loading) => set({ isLoading: loading }),
      setSaving: (saving) => set({ isSaving: saving }),
      setError: (error) => set({ error }),

      // Reset state
      reset: () =>
        set({
          currentStep: 1,
          completedSteps: [],
          formData: { ...defaultFormData },
          isLoading: false,
          isSaving: false,
          error: null,
          isInitialized: false,
          lastSavedAt: null,
        }),

      // Load progress from API
      loadProgress: async () => {
        const { setLoading, setError, reset } = get()
        setLoading(true)
        setError(null)

        try {
          const response = await fetch('/api/mentor/onboarding')
          const result = await response.json()

          if (!response.ok) {
            // If not started, that's okay - we'll initialize later
            if (result.error?.code === 'ONBOARDING_NOT_STARTED') {
              set({ isInitialized: false, isLoading: false })
              return
            }
            throw new Error(result.error?.message || 'Failed to load progress')
          }

          const progress = result.data as OnboardingProgress
          
          // Map API form_data to local formData format
          set({
            currentStep: (progress.current_step || 1) as StepNumber,
            completedSteps: progress.completed_steps || [],
            formData: {
              bio: progress.form_data?.bio || '',
              expertiseAreas: progress.form_data?.expertise_areas || [],
              skills: progress.form_data?.skills || [],
              languages: progress.form_data?.languages || [],
              timezone: progress.form_data?.timezone || 'UTC',
              yearsOfExperience: progress.form_data?.years_of_experience || 0,
              availability: progress.form_data?.availability || [],
              handle: progress.form_data?.handle || '',
              calendarConnected: progress.form_data?.calendar_connected || false,
            },
            isInitialized: true,
            isLoading: false,
          })
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to load progress'
          setError(message)
          set({ isLoading: false })
        }
      },

      // Save progress to API
      saveProgress: async () => {
        const { currentStep, completedSteps, formData, setSaving, setError } = get()
        setSaving(true)
        setError(null)

        try {
          // Map local formData to API format
          const apiFormData = {
            bio: formData.bio,
            expertise_areas: formData.expertiseAreas,
            skills: formData.skills,
            languages: formData.languages,
            timezone: formData.timezone,
            years_of_experience: formData.yearsOfExperience,
            availability: formData.availability,
            handle: formData.handle,
            calendar_connected: formData.calendarConnected,
          }

          const response = await fetch('/api/mentor/onboarding', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              current_step: currentStep,
              completed_steps: completedSteps,
              form_data: apiFormData,
            }),
          })

          const result = await response.json()

          if (!response.ok) {
            throw new Error(result.error?.message || 'Failed to save progress')
          }

          set({ lastSavedAt: new Date(), isSaving: false })
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to save progress'
          setError(message)
          set({ isSaving: false })
        }
      },

      // Initialize onboarding (POST to create record)
      initializeOnboarding: async () => {
        const { setLoading, setError, loadProgress } = get()
        setLoading(true)
        setError(null)

        try {
          const response = await fetch('/api/mentor/onboarding', {
            method: 'POST',
          })

          const result = await response.json()

          if (!response.ok) {
            // If already started, just load the existing progress
            if (result.error?.code === 'ONBOARDING_ALREADY_STARTED') {
              await loadProgress()
              return
            }
            throw new Error(result.error?.message || 'Failed to initialize onboarding')
          }

          // Load the newly created progress
          await loadProgress()
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to initialize onboarding'
          setError(message)
          set({ isLoading: false })
        }
      },

      // Complete onboarding
      completeOnboarding: async () => {
        const { setSaving, setError } = get()
        setSaving(true)
        setError(null)

        try {
          const response = await fetch('/api/mentor/onboarding/complete', {
            method: 'POST',
          })

          const result = await response.json()

          if (!response.ok) {
            throw new Error(result.error?.message || 'Failed to complete onboarding')
          }

          set({ isSaving: false })
          return { success: true }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to complete onboarding'
          setError(message)
          set({ isSaving: false })
          return { success: false, error: message }
        }
      },

      // Helper: Check if a step is complete
      isStepComplete: (step) => {
        const { completedSteps } = get()
        return completedSteps.includes(step)
      },

      // Helper: Check if user can proceed from a step
      canProceed: (step) => {
        const { formData } = get()
        
        switch (step) {
          case 1:
            // Welcome step - always can proceed
            return true
          case 2:
            // Bio & Expertise - need bio (50+ chars) and at least 1 expertise area
            return formData.bio.length >= 50 && formData.expertiseAreas.length > 0
          case 3:
            // Skills & Languages - need at least 1 skill, 1 language, timezone
            return (
              formData.skills.length > 0 &&
              formData.languages.length > 0 &&
              formData.timezone.length > 0
            )
          case 4:
            // Availability - optional, can always proceed
            return true
          case 5:
            // Handle - must have valid handle (3+ chars)
            return formData.handle.length >= 3
          case 6:
            // Review - all previous steps must be complete
            return true
          default:
            return false
        }
      },
    }),
    {
      name: 'mentor-onboarding-state',
      // Only persist form data and progress, not loading states
      partialize: (state) => ({
        currentStep: state.currentStep,
        completedSteps: state.completedSteps,
        formData: state.formData,
        isInitialized: state.isInitialized,
      }),
    }
  )
)
