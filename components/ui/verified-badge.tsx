'use client'

import { BadgeCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useI18n } from '@/lib/i18n'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface VerifiedAffiliation {
  org_id: string
  org_name: string
  kind: string
  graduation_year?: number | null
  verified_at: string
}

interface VerifiedBadgeProps {
  affiliations: VerifiedAffiliation[]
  compact?: boolean
  showAll?: boolean
}

export function VerifiedBadge({ affiliations, compact = false, showAll = false }: VerifiedBadgeProps) {
  const { locale } = useI18n()
  const isArabic = locale === 'ar'

  if (!affiliations || affiliations.length === 0) {
    return null
  }

  const displayAffiliations = showAll ? affiliations : affiliations.slice(0, 1)

  function getKindLabel(kind: string) {
    const labels: Record<string, { en: string; ar: string }> = {
      student: { en: 'Student', ar: 'طالب' },
      alumni: { en: 'Alumni', ar: 'خريج' },
      staff: { en: 'Staff', ar: 'موظف' },
      faculty: { en: 'Faculty', ar: 'هيئة تدريس' },
    }
    return labels[kind]?.[isArabic ? 'ar' : 'en'] || kind
  }

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex items-center gap-1 text-green-600">
              <BadgeCheck className="size-4" />
              {affiliations.length > 1 && (
                <span className="text-xs">+{affiliations.length - 1}</span>
              )}
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <div className="space-y-1">
              {affiliations.map((aff, idx) => (
                <div key={idx} className="text-sm">
                  <span className="font-medium">{aff.org_name}</span>
                  <span className="text-muted-foreground">
                    {' · '}
                    {getKindLabel(aff.kind)}
                    {aff.graduation_year && ` (${aff.graduation_year})`}
                  </span>
                </div>
              ))}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return (
    <div className="flex flex-wrap gap-2">
      {displayAffiliations.map((aff, idx) => (
        <Badge
          key={idx}
          variant="secondary"
          className="gap-1.5 bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
        >
          <BadgeCheck className="size-3.5" />
          <span>{aff.org_name}</span>
          <span className="text-green-600/80">
            {getKindLabel(aff.kind)}
            {aff.graduation_year && ` '${String(aff.graduation_year).slice(-2)}`}
          </span>
        </Badge>
      ))}
      {!showAll && affiliations.length > 1 && (
        <Badge variant="outline" className="text-xs">
          +{affiliations.length - 1} {isArabic ? 'أخرى' : 'more'}
        </Badge>
      )}
    </div>
  )
}
