'use client'

import { useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { OnboardingProgress } from './OnboardingProgress'
import {
  useOnboardingState,
  ONBOARDING_STEPS,
  type StepNumber,
} from '@/hooks/use-onboarding-state'
import { cn } from '@/lib/utils'

// Import step components
import { WelcomeStep } from './steps/WelcomeStep'
import { BioExpertiseStep } from './steps/BioExpertiseStep'
import { SkillsLanguagesStep } from './steps/SkillsLanguagesStep'
import { AvailabilityStep } from './steps/AvailabilityStep'
import { HandleStep } from './steps/HandleStep'
import { ReviewStep } from './steps/ReviewStep'

/**
 * Map step numbers to step components
 */
const STEP_COMPONENTS: Record<StepNumber, React.ComponentType<{ onEditStep?: (step: StepNumber) => void }>> = {
  1: WelcomeStep,
  2: BioExpertiseStep,
  3: SkillsLanguagesStep,
  4: AvailabilityStep,
  5: HandleStep,
  6: ReviewStep,
}

/**
 * Full-page onboarding wizard container
 * Renders current step, handles navigation, and manages progress
 */
export function OnboardingWizard() {
  const router = useRouter()
  const {
    currentStep,
    completedSteps,
    isLoading,
    isSaving,
    error,
    isInitialized,
    setStep,
    nextStep,
    prevStep,
    completeStep,
    loadProgress,
    saveProgress,
    initializeOnboarding,
    completeOnboarding,
    canProceed,
  } = useOnboardingState()

  // Load or initialize onboarding on mount
  useEffect(() => {
    const init = async () => {
      // First try to load existing progress
      await loadProgress()
      
      // If not initialized after loading, create new onboarding
      const state = useOnboardingState.getState()
      if (!state.isInitialized) {
        await initializeOnboarding()
      }
    }
    
    init()
  }, [loadProgress, initializeOnboarding])

  // Save progress when step changes (debounced)
  const handleSaveProgress = useCallback(async () => {
    if (isInitialized) {
      await saveProgress()
    }
  }, [isInitialized, saveProgress])

  // Handle next button click
  const handleNext = async () => {
    // Mark current step as complete
    completeStep(currentStep)
    
    // Save progress
    await handleSaveProgress()
    
    if (currentStep === 6) {
      // Final step - complete onboarding
      const result = await completeOnboarding()
      if (result.success) {
        router.push('/dashboard/mentor')
      }
    } else {
      // Go to next step
      nextStep()
    }
  }

  // Handle back button click
  const handleBack = () => {
    prevStep()
  }

  // Handle step click in progress bar
  const handleStepClick = (step: StepNumber) => {
    setStep(step)
  }

  // Get current step component
  const StepComponent = STEP_COMPONENTS[currentStep]
  const stepInfo = ONBOARDING_STEPS[currentStep - 1]

  // Handle edit step from ReviewStep
  const handleEditStep = (step: StepNumber) => {
    setStep(step)
  }

  // Loading state
  if (isLoading && !isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading your progress...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error && !isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
              <span className="text-destructive text-xl">!</span>
            </div>
            <h2 className="text-xl font-semibold">Something went wrong</h2>
            <p className="text-muted-foreground">{error}</p>
            <Button onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header with logo and exit */}
      <header className="border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <a href="/dashboard" className="text-xl font-bold">
            Mentorshape
          </a>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/dashboard')}
          >
            Save & Exit
          </Button>
        </div>
      </header>

      {/* Progress bar */}
      <div className="border-b bg-muted/30">
        <div className="container mx-auto px-4 py-6">
          <OnboardingProgress
            currentStep={currentStep}
            completedSteps={completedSteps}
            onStepClick={handleStepClick}
          />
        </div>
      </div>

      {/* Main content area */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          {/* Step content */}
          <div className="min-h-[400px]">
            <StepComponent onEditStep={handleEditStep} />
          </div>

          {/* Error message */}
          {error && (
            <div className="mt-4 p-4 rounded-lg bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          )}

          {/* Navigation buttons */}
          <div className="mt-8 flex items-center justify-between border-t pt-6">
            <div>
              {currentStep > 1 && (
                <Button
                  variant="outline"
                  onClick={handleBack}
                  disabled={isSaving}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
              )}
            </div>
            
            <div className="flex items-center gap-4">
              {/* Saving indicator */}
              {isSaving && (
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </span>
              )}
              
              {/* Next/Submit button */}
              <Button
                onClick={handleNext}
                disabled={isSaving || (currentStep < 6 && !canProceed(currentStep))}
                className={cn(
                  currentStep === 6 && 'bg-green-600 hover:bg-green-700'
                )}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {currentStep === 6 ? 'Submitting...' : 'Saving...'}
                  </>
                ) : currentStep === 6 ? (
                  'Become a Mentor'
                ) : currentStep === 1 ? (
                  'Get Started'
                ) : (
                  <>
                    Continue
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
