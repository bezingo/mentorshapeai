'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence } from 'motion/react'
import { Loader2 } from 'lucide-react'
import { useSession } from '@/lib/auth-client'
import { useI18n } from '@/lib/i18n'
import { StepWrapper } from '@/components/onboarding/step-wrapper'
import { RoleSelectionStep } from '@/components/onboarding/role-selection-step'
import { ProfileSetupStep } from '@/components/onboarding/profile-setup-step'
import { OrgJoinStep } from '@/components/onboarding/org-join-step'
import { GoalsSetupStep } from '@/components/onboarding/goals-setup-step'
import { ConsentStep } from '@/components/onboarding/consent-step'

type Step = 'role' | 'profile' | 'org' | 'goals' | 'consent'
type Role = 'mentee' | 'mentor' | 'org_admin'
type GoalCategory = 'finance' | 'career' | 'personal_growth' | 'entrepreneurship'

interface OnboardingData {
  role: Role | null
  displayName: string
  avatarUrl?: string
  orgInviteCode?: string
  skipOrg: boolean
  goals: Array<{ category: GoalCategory; description: string }>
  dateOfBirth?: string
  guardianEmail?: string
  consented: boolean
}

const TOTAL_STEPS = 5

export default function OnboardingPage() {
  const router = useRouter()
  const { data: session, isPending } = useSession()
  const { locale } = useI18n()
  const isArabic = locale === 'ar'

  const [currentStep, setCurrentStep] = useState<Step>('role')
  const [isLoading, setIsLoading] = useState(false)
  const [data, setData] = useState<OnboardingData>({
    role: null,
    displayName: '',
    skipOrg: false,
    goals: [],
    consented: false,
  })

  // Redirect to sign-in if not authenticated
  useEffect(() => {
    if (!isPending && !session) {
      router.push('/sign-in?redirect=/onboarding')
    }
  }, [session, isPending, router])

  // Get step number for progress indicator
  const getStepNumber = (step: Step): number => {
    const steps: Step[] = ['role', 'profile', 'org', 'goals', 'consent']
    return steps.indexOf(step) + 1
  }

  // Get step titles
  const getStepTitle = (step: Step): string => {
    const titles: Record<Step, { en: string; ar: string }> = {
      role: { en: 'Choose your role', ar: 'اختر دورك' },
      profile: { en: 'Set up your profile', ar: 'أنشئ ملفك الشخصي' },
      org: { en: 'Join your organization', ar: 'انضم إلى مؤسستك' },
      goals: { en: 'Set your goals', ar: 'حدد أهدافك' },
      consent: { en: 'Confirm and start', ar: 'تأكيد والبدء' },
    }
    return isArabic ? titles[step].ar : titles[step].en
  }

  const getStepDescription = (step: Step): string | undefined => {
    const descriptions: Partial<Record<Step, { en: string; ar: string }>> = {
      role: { 
        en: 'This helps us personalize your experience',
        ar: 'هذا يساعدنا على تخصيص تجربتك'
      },
      profile: { 
        en: 'Let mentors know who you are',
        ar: 'دع المرشدين يعرفون من أنت'
      },
      goals: { 
        en: 'What do you want to achieve?',
        ar: 'ماذا تريد أن تحقق؟'
      },
    }
    const desc = descriptions[step]
    return desc ? (isArabic ? desc.ar : desc.en) : undefined
  }

  // Navigate between steps
  const goBack = useCallback(() => {
    const stepOrder: Step[] = ['role', 'profile', 'org', 'goals', 'consent']
    const currentIndex = stepOrder.indexOf(currentStep)
    if (currentIndex > 0) {
      setCurrentStep(stepOrder[currentIndex - 1])
    }
  }, [currentStep])

  const goNext = useCallback((nextStep: Step) => {
    setCurrentStep(nextStep)
  }, [])

  // Handle role selection
  const handleRoleSelect = (role: Role) => {
    setData(prev => ({ ...prev, role }))
    goNext('profile')
  }

  // Handle profile setup
  const handleProfileSubmit = async (profileData: { displayName: string; avatarFile?: File }) => {
    setIsLoading(true)
    try {
      let avatarUrl: string | undefined

      // Upload avatar if provided
      if (profileData.avatarFile) {
        const formData = new FormData()
        formData.append('file', profileData.avatarFile)
        const res = await fetch('/api/upload/avatar', {
          method: 'POST',
          body: formData,
        })
        if (res.ok) {
          const result = await res.json()
          avatarUrl = result.url
        }
      }

      setData(prev => ({
        ...prev,
        displayName: profileData.displayName,
        avatarUrl,
      }))

      goNext('org')
    } catch (error) {
      console.error('Error uploading avatar:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Handle org join
  const handleOrgJoin = (orgData: { inviteCode?: string; skipOrg: boolean }) => {
    setData(prev => ({
      ...prev,
      orgInviteCode: orgData.inviteCode,
      skipOrg: orgData.skipOrg,
    }))
    
    // Skip goals step for org_admin role
    if (data.role === 'org_admin') {
      goNext('consent')
    } else {
      goNext('goals')
    }
  }

  // Handle goals setup
  const handleGoalsSubmit = (goals: Array<{ category: GoalCategory; description: string }>) => {
    setData(prev => ({ ...prev, goals }))
    goNext('consent')
  }

  // Handle consent and complete onboarding
  const handleConsentSubmit = async (consentData: {
    consented: boolean
    dateOfBirth?: string
    guardianEmail?: string
  }) => {
    setIsLoading(true)
    try {
      // Save all onboarding data
      const response = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          ...consentData,
        }),
      })

      if (response.ok) {
        // Redirect to dashboard based on role
        const dashboardPath = data.role === 'org_admin' 
          ? '/dashboard/counselor'
          : data.role === 'mentor'
          ? '/dashboard/mentor'
          : '/dashboard'
        
        router.push(dashboardPath)
        router.refresh()
      } else {
        const error = await response.json()
        console.error('Onboarding failed:', error)
      }
    } catch (error) {
      console.error('Error completing onboarding:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Check if user is potentially a minor (for consent step)
  const isMinor = data.dateOfBirth 
    ? new Date().getFullYear() - new Date(data.dateOfBirth).getFullYear() < 18
    : false

  // Show loading while checking auth
  if (isPending) {
    return (
      <div className="flex items-center justify-center">
        <Loader2 className="size-8 animate-spin text-ms-ember" />
      </div>
    )
  }

  return (
    <div className="w-full max-w-lg px-4">
      <AnimatePresence mode="wait">
        {currentStep === 'role' && (
          <StepWrapper
            key="role"
            title={getStepTitle('role')}
            description={getStepDescription('role')}
            currentStep={getStepNumber('role')}
            totalSteps={TOTAL_STEPS}
            showBackButton={false}
          >
            <RoleSelectionStep
              onSelect={handleRoleSelect}
              defaultValue={data.role || undefined}
            />
          </StepWrapper>
        )}

        {currentStep === 'profile' && (
          <StepWrapper
            key="profile"
            title={getStepTitle('profile')}
            description={getStepDescription('profile')}
            currentStep={getStepNumber('profile')}
            totalSteps={TOTAL_STEPS}
            onBack={goBack}
          >
            <ProfileSetupStep
              onSubmit={handleProfileSubmit}
              defaultName={session?.user?.name || data.displayName}
              defaultAvatarUrl={session?.user?.image || data.avatarUrl}
              isLoading={isLoading}
            />
          </StepWrapper>
        )}

        {currentStep === 'org' && (
          <StepWrapper
            key="org"
            title={getStepTitle('org')}
            currentStep={getStepNumber('org')}
            totalSteps={TOTAL_STEPS}
            onBack={goBack}
          >
            <OrgJoinStep
              onSubmit={handleOrgJoin}
              userEmail={session?.user?.email}
              isLoading={isLoading}
            />
          </StepWrapper>
        )}

        {currentStep === 'goals' && (
          <StepWrapper
            key="goals"
            title={getStepTitle('goals')}
            description={getStepDescription('goals')}
            currentStep={getStepNumber('goals')}
            totalSteps={TOTAL_STEPS}
            onBack={goBack}
          >
            <GoalsSetupStep
              onSubmit={handleGoalsSubmit}
              isLoading={isLoading}
            />
          </StepWrapper>
        )}

        {currentStep === 'consent' && (
          <StepWrapper
            key="consent"
            title={getStepTitle('consent')}
            currentStep={getStepNumber('consent')}
            totalSteps={TOTAL_STEPS}
            onBack={goBack}
          >
            <ConsentStep
              onSubmit={handleConsentSubmit}
              isMinor={isMinor}
              isLoading={isLoading}
            />
          </StepWrapper>
        )}
      </AnimatePresence>
    </div>
  )
}
