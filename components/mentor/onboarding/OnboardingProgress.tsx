'use client'

import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ONBOARDING_STEPS, type StepNumber } from '@/hooks/use-onboarding-state'

interface OnboardingProgressProps {
  currentStep: StepNumber
  completedSteps: number[]
  onStepClick?: (step: StepNumber) => void
}

/**
 * Visual progress bar showing 6 onboarding steps
 * Shows completed, current, and upcoming states
 */
export function OnboardingProgress({
  currentStep,
  completedSteps,
  onStepClick,
}: OnboardingProgressProps) {
  const getStepStatus = (stepNumber: number): 'completed' | 'current' | 'upcoming' => {
    if (completedSteps.includes(stepNumber)) return 'completed'
    if (stepNumber === currentStep) return 'current'
    return 'upcoming'
  }

  const isClickable = (stepNumber: number): boolean => {
    // Can click on completed steps or the next step after current
    return (
      completedSteps.includes(stepNumber) ||
      stepNumber <= Math.max(...completedSteps, 0) + 1
    )
  }

  return (
    <div className="w-full">
      {/* Desktop view - horizontal progress bar */}
      <div className="hidden md:block">
        <div className="flex items-center justify-between">
          {ONBOARDING_STEPS.map((step, index) => {
            const status = getStepStatus(step.number)
            const clickable = isClickable(step.number) && onStepClick

            return (
              <div key={step.number} className="flex items-center flex-1">
                {/* Step indicator */}
                <div className="flex flex-col items-center">
                  <button
                    type="button"
                    onClick={() => clickable && onStepClick?.(step.number as StepNumber)}
                    disabled={!clickable}
                    className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all',
                      status === 'completed' &&
                        'border-primary bg-primary text-primary-foreground',
                      status === 'current' &&
                        'border-primary bg-background text-primary ring-4 ring-primary/20',
                      status === 'upcoming' &&
                        'border-muted-foreground/30 bg-background text-muted-foreground',
                      clickable && 'cursor-pointer hover:ring-2 hover:ring-primary/30',
                      !clickable && 'cursor-default'
                    )}
                    aria-current={status === 'current' ? 'step' : undefined}
                  >
                    {status === 'completed' ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      <span className="text-sm font-semibold">{step.number}</span>
                    )}
                  </button>
                  <span
                    className={cn(
                      'mt-2 text-xs font-medium text-center max-w-[80px]',
                      status === 'current' && 'text-primary',
                      status === 'completed' && 'text-foreground',
                      status === 'upcoming' && 'text-muted-foreground'
                    )}
                  >
                    {step.name}
                  </span>
                </div>

                {/* Connector line (not after last step) */}
                {index < ONBOARDING_STEPS.length - 1 && (
                  <div
                    className={cn(
                      'flex-1 h-0.5 mx-2',
                      completedSteps.includes(step.number)
                        ? 'bg-primary'
                        : 'bg-muted-foreground/20'
                    )}
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Mobile view - vertical progress with current step highlighted */}
      <div className="md:hidden">
        <div className="flex items-center gap-3 mb-4">
          {/* Step dots */}
          <div className="flex gap-1.5">
            {ONBOARDING_STEPS.map((step) => {
              const status = getStepStatus(step.number)
              return (
                <div
                  key={step.number}
                  className={cn(
                    'h-2 w-2 rounded-full transition-all',
                    status === 'completed' && 'bg-primary',
                    status === 'current' && 'bg-primary w-6',
                    status === 'upcoming' && 'bg-muted-foreground/30'
                  )}
                />
              )
            })}
          </div>
          {/* Step count */}
          <span className="text-sm text-muted-foreground">
            Step {currentStep} of {ONBOARDING_STEPS.length}
          </span>
        </div>
        {/* Current step info */}
        <div>
          <h3 className="text-lg font-semibold">
            {ONBOARDING_STEPS[currentStep - 1]?.name}
          </h3>
          <p className="text-sm text-muted-foreground">
            {ONBOARDING_STEPS[currentStep - 1]?.description}
          </p>
        </div>
      </div>
    </div>
  )
}
