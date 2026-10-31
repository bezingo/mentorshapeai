'use client'

import { useState } from 'react'
import { motion } from 'motion/react'
import { 
  Briefcase, 
  TrendingUp, 
  Sparkles, 
  Lightbulb,
  Check,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useI18n } from '@/lib/i18n'

type GoalCategory = 'finance' | 'career' | 'personal_growth' | 'entrepreneurship'

interface GoalCategoryOption {
  id: GoalCategory
  icon: typeof Briefcase
  title: string
  titleAr: string
  placeholder: string
  placeholderAr: string
  color: string
}

const goalCategories: GoalCategoryOption[] = [
  {
    id: 'career',
    icon: Briefcase,
    title: 'Career',
    titleAr: 'المهنة',
    placeholder: 'e.g., Get promoted to senior role',
    placeholderAr: 'مثال: الترقي إلى منصب أعلى',
    color: 'bg-ms-sky',
  },
  {
    id: 'finance',
    icon: TrendingUp,
    title: 'Finance',
    titleAr: 'المالية',
    placeholder: 'e.g., Save for a house deposit',
    placeholderAr: 'مثال: الادخار لشراء منزل',
    color: 'bg-ms-lime',
  },
  {
    id: 'personal_growth',
    icon: Sparkles,
    title: 'Personal Growth',
    titleAr: 'النمو الشخصي',
    placeholder: 'e.g., Improve public speaking',
    placeholderAr: 'مثال: تحسين مهارات التحدث أمام الجمهور',
    color: 'bg-ms-blush',
  },
  {
    id: 'entrepreneurship',
    icon: Lightbulb,
    title: 'Entrepreneurship',
    titleAr: 'ريادة الأعمال',
    placeholder: 'e.g., Launch my side project',
    placeholderAr: 'مثال: إطلاق مشروعي الجانبي',
    color: 'bg-ms-ember',
  },
]

interface GoalData {
  category: GoalCategory
  description: string
}

interface GoalsSetupStepProps {
  onSubmit: (goals: GoalData[]) => void
  isLoading?: boolean
}

export function GoalsSetupStep({ onSubmit, isLoading = false }: GoalsSetupStepProps) {
  const { locale, t, isRTL } = useI18n()
  const isArabic = locale === 'ar'

  const [selectedCategories, setSelectedCategories] = useState<Set<GoalCategory>>(new Set())
  const [goalDescriptions, setGoalDescriptions] = useState<Record<GoalCategory, string>>({
    career: '',
    finance: '',
    personal_growth: '',
    entrepreneurship: '',
  })

  const toggleCategory = (category: GoalCategory) => {
    const newSelected = new Set(selectedCategories)
    if (newSelected.has(category)) {
      newSelected.delete(category)
    } else {
      newSelected.add(category)
    }
    setSelectedCategories(newSelected)
  }

  const handleDescriptionChange = (category: GoalCategory, description: string) => {
    setGoalDescriptions(prev => ({
      ...prev,
      [category]: description,
    }))
  }

  const handleSubmit = () => {
    const goals: GoalData[] = Array.from(selectedCategories)
      .filter(category => goalDescriptions[category]?.trim())
      .map(category => ({
        category,
        description: goalDescriptions[category].trim(),
      }))
    
    onSubmit(goals)
  }

  const hasValidGoals = Array.from(selectedCategories).some(
    category => goalDescriptions[category]?.trim()
  )

  return (
    <div className="space-y-6">
      <p className="text-sm text-ms-ink-muted">
        {isArabic
          ? 'اختر مجالاً واحداً أو أكثر تريد التركيز عليه، ثم صف هدفك'
          : 'Select one or more areas you want to focus on, then describe your goal'}
      </p>

      <div className="space-y-4">
        {goalCategories.map((category) => {
          const Icon = category.icon
          const isSelected = selectedCategories.has(category.id)

          return (
            <div key={category.id} className="space-y-2">
              <motion.button
                type="button"
                onClick={() => toggleCategory(category.id)}
                className={`
                  w-full p-4 rounded-lg border-2 text-start transition-all
                  ${isSelected 
                    ? 'border-ms-ember bg-ms-ember/5' 
                    : 'border-ms-line hover:border-ms-line-strong hover:bg-ms-surface-200/50'
                  }
                `}
                whileTap={{ scale: 0.99 }}
              >
                <div className="flex items-center gap-3">
                  <div className={`
                    flex-shrink-0 size-10 rounded-lg ${category.color} 
                    flex items-center justify-center text-ms-on-tint
                  `}>
                    <Icon className="size-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-ms-ink">
                      {isArabic ? category.titleAr : category.title}
                    </h3>
                  </div>
                  <div className={`
                    size-5 rounded-full border-2 flex items-center justify-center transition-all
                    ${isSelected 
                      ? 'border-ms-ember bg-ms-ember' 
                      : 'border-ms-line'
                    }
                  `}>
                    {isSelected && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                      >
                        <Check className="size-3 text-ms-on-ember" />
                      </motion.div>
                    )}
                  </div>
                </div>
              </motion.button>

              {/* Goal description input */}
              {isSelected && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="ps-14"
                >
                  <Label htmlFor={`goal-${category.id}`} className="sr-only">
                    {isArabic ? category.titleAr : category.title} goal
                  </Label>
                  <Input
                    id={`goal-${category.id}`}
                    type="text"
                    placeholder={isArabic ? category.placeholderAr : category.placeholder}
                    value={goalDescriptions[category.id]}
                    onChange={(e) => handleDescriptionChange(category.id, e.target.value)}
                    className="bg-ms-surface-000 border-ms-line text-ms-ink placeholder:text-ms-ink-subtle focus:border-ms-ember focus:ring-ms-ember"
                    disabled={isLoading}
                    dir={isRTL ? 'rtl' : 'ltr'}
                  />
                </motion.div>
              )}
            </div>
          )
        })}
      </div>

      <Button
        onClick={handleSubmit}
        disabled={!hasValidGoals || isLoading}
        className="w-full bg-ms-ember text-ms-on-ember hover:bg-ms-ember/90 font-semibold"
      >
        {isLoading ? (
          <>
            <Loader2 className="me-2 h-4 w-4 animate-spin" />
            {isArabic ? 'جارٍ الحفظ...' : 'Saving...'}
          </>
        ) : (
          t.common.next
        )}
      </Button>

      <p className="text-xs text-center text-ms-ink-subtle">
        {isArabic
          ? 'يمكنك إضافة المزيد من الأهداف لاحقاً من لوحة التحكم'
          : 'You can add more goals later from your dashboard'}
      </p>
    </div>
  )
}
