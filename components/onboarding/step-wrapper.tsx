'use client'

import { ReactNode } from 'react'
import { motion } from 'motion/react'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/lib/i18n'

interface StepWrapperProps {
  title: string
  description?: string
  children: ReactNode
  onBack?: () => void
  showBackButton?: boolean
  currentStep: number
  totalSteps: number
}

export function StepWrapper({
  title,
  description,
  children,
  onBack,
  showBackButton = true,
  currentStep,
  totalSteps,
}: StepWrapperProps) {
  const { t, isRTL } = useI18n()

  return (
    <motion.div
      initial={{ opacity: 0, x: isRTL ? -20 : 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: isRTL ? 20 : -20 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="w-full max-w-lg mx-auto"
    >
      {/* Progress indicator */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-ms-ink-muted">
            Step {currentStep} of {totalSteps}
          </span>
          {showBackButton && onBack && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="text-ms-ink-muted hover:text-ms-ink"
            >
              <ArrowLeft className={`h-4 w-4 ${isRTL ? 'ms-1 rotate-180' : 'me-1'}`} />
              {t.common.back}
            </Button>
          )}
        </div>
        <div className="h-1.5 bg-ms-surface-200 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-ms-ember rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${(currentStep / totalSteps) * 100}%` }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Card */}
      <div className="bg-ms-surface-000 rounded-xl border border-ms-line shadow-ms-float p-6 sm:p-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-ms-ink tracking-tight">
            {title}
          </h1>
          {description && (
            <p className="mt-2 text-ms-ink-muted">{description}</p>
          )}
        </div>

        {/* Content */}
        {children}
      </div>
    </motion.div>
  )
}
