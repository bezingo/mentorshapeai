'use client'

import { useState } from 'react'
import { AnimatePresence } from 'motion/react'
import { useI18n } from '@/lib/i18n'
import { StepWrapper } from '@/components/onboarding/step-wrapper'
import { RoleSelectionStep } from '@/components/onboarding/role-selection-step'
import { ProfileSetupStep } from '@/components/onboarding/profile-setup-step'
import { OrgJoinStep } from '@/components/onboarding/org-join-step'
import { GoalsSetupStep } from '@/components/onboarding/goals-setup-step'
import { ConsentStep } from '@/components/onboarding/consent-step'

type Step = 'role' | 'profile' | 'org' | 'goals' | 'consent'
const TOTAL_STEPS = 5

export default function OnboardingDemoPage() {
  const { locale } = useI18n()
  const isArabic = locale === 'ar'
  const [currentStep, setCurrentStep] = useState<Step>('role')

  const getStepNumber = (step: Step): number => {
    const steps: Step[] = ['role', 'profile', 'org', 'goals', 'consent']
    return steps.indexOf(step) + 1
  }

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

  const steps: Step[] = ['role', 'profile', 'org', 'goals', 'consent']
  const currentIndex = steps.indexOf(currentStep)

  const goBack = () => {
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1])
    }
  }

  const goNext = () => {
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1])
    }
  }

  return (
    <div className="w-full max-w-lg px-4">
      {/* Demo step switcher */}
      <div className="mb-6 flex flex-wrap gap-2 justify-center">
        {steps.map((step) => (
          <button
            key={step}
            onClick={() => setCurrentStep(step)}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              currentStep === step
                ? 'bg-ms-ember text-ms-on-ember'
                : 'bg-ms-surface-200 text-ms-ink hover:bg-ms-surface-200/80'
            }`}
          >
            {step}
          </button>
        ))}
      </div>

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
            <RoleSelectionStep onSelect={() => goNext()} />
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
              onSubmit={() => goNext()}
              defaultName="Demo User"
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
              onSubmit={() => goNext()}
              userEmail="demo@mentorshape.com"
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
            <GoalsSetupStep onSubmit={() => goNext()} />
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
              onSubmit={() => alert('Onboarding complete!')}
              isMinor={false}
            />
          </StepWrapper>
        )}
      </AnimatePresence>
    </div>
  )
}
