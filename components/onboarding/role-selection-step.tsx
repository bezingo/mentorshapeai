'use client'

import { useState } from 'react'
import { motion } from 'motion/react'
import { 
  GraduationCap, 
  Users, 
  Building2, 
  Check 
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/lib/i18n'

type Role = 'mentee' | 'mentor' | 'org_admin'

interface RoleOption {
  id: Role
  icon: typeof GraduationCap
  title: string
  titleAr: string
  description: string
  descriptionAr: string
  color: string
}

const roleOptions: RoleOption[] = [
  {
    id: 'mentee',
    icon: GraduationCap,
    title: 'I want a mentor',
    titleAr: 'أريد مرشداً',
    description: 'Get guidance to achieve your goals from someone who\'s done it',
    descriptionAr: 'احصل على إرشاد لتحقيق أهدافك من شخص حققها سابقاً',
    color: 'bg-ms-lime',
  },
  {
    id: 'mentor',
    icon: Users,
    title: 'I want to mentor',
    titleAr: 'أريد أن أكون مرشداً',
    description: 'Share your experience and help others grow',
    descriptionAr: 'شارك خبرتك وساعد الآخرين على النمو',
    color: 'bg-ms-sky',
  },
  {
    id: 'org_admin',
    icon: Building2,
    title: 'I manage a programme',
    titleAr: 'أدير برنامجاً',
    description: 'Run a mentorship programme for your organization',
    descriptionAr: 'قم بإدارة برنامج إرشاد لمؤسستك',
    color: 'bg-ms-blush',
  },
]

interface RoleSelectionStepProps {
  onSelect: (role: Role) => void
  defaultValue?: Role
}

export function RoleSelectionStep({ onSelect, defaultValue }: RoleSelectionStepProps) {
  const [selected, setSelected] = useState<Role | null>(defaultValue || null)
  const { locale, t } = useI18n()
  const isArabic = locale === 'ar'

  const handleContinue = () => {
    if (selected) {
      onSelect(selected)
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {roleOptions.map((role) => {
          const Icon = role.icon
          const isSelected = selected === role.id

          return (
            <motion.button
              key={role.id}
              type="button"
              onClick={() => setSelected(role.id)}
              className={`
                w-full p-4 rounded-lg border-2 text-start transition-all
                ${isSelected 
                  ? 'border-ms-ember bg-ms-ember/5' 
                  : 'border-ms-line hover:border-ms-line-strong hover:bg-ms-surface-200/50'
                }
              `}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              <div className="flex items-start gap-4">
                <div className={`
                  flex-shrink-0 size-12 rounded-lg ${role.color} 
                  flex items-center justify-center text-ms-on-tint
                `}>
                  <Icon className="size-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-ms-ink">
                      {isArabic ? role.titleAr : role.title}
                    </h3>
                    {isSelected && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="flex-shrink-0 size-5 rounded-full bg-ms-ember flex items-center justify-center"
                      >
                        <Check className="size-3 text-ms-on-ember" />
                      </motion.div>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-ms-ink-muted">
                    {isArabic ? role.descriptionAr : role.description}
                  </p>
                </div>
              </div>
            </motion.button>
          )
        })}
      </div>

      <Button
        onClick={handleContinue}
        disabled={!selected}
        className="w-full mt-6 bg-ms-ember text-ms-on-ember hover:bg-ms-ember/90 font-semibold"
      >
        {t.common.next}
      </Button>
    </div>
  )
}
