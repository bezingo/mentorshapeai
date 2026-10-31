'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Checkbox } from '@/components/ui/checkbox'
import {
  ArrowLeft,
  Sparkles,
  Check,
  X,
  Send,
  Loader2,
  UserCheck,
  RefreshCw,
} from 'lucide-react'
import { useI18n } from '@/lib/i18n'

interface MatchSuggestion {
  mentee_profile_id: string
  mentor_profile_id: string
  match_score: number
  reasons: string[]
  mentee: { display_name: string; avatar_url: string | null; locale: string | null } | null
  mentor: { display_name: string; avatar_url: string | null; locale: string | null } | null
}

export default function ProgramMatchesPage() {
  const params = useParams()
  const programId = params.id as string
  const { locale } = useI18n()
  const isArabic = locale === 'ar'

  const [suggestions, setSuggestions] = useState<MatchSuggestion[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedPairs, setSelectedPairs] = useState<Set<string>>(new Set())
  const [isApproving, setIsApproving] = useState(false)
  const [isSendingIntros, setIsSendingIntros] = useState(false)

  useEffect(() => {
    fetchSuggestions()
  }, [programId])

  async function fetchSuggestions() {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/counselor/matches/suggestions?program_id=${programId}`)
      if (response.ok) {
        const json = await response.json()
        setSuggestions(json.data || [])
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error)
    } finally {
      setIsLoading(false)
    }
  }

  function getPairKey(s: MatchSuggestion) {
    return `${s.mentee_profile_id}-${s.mentor_profile_id}`
  }

  function toggleSelection(suggestion: MatchSuggestion) {
    const key = getPairKey(suggestion)
    const newSelection = new Set(selectedPairs)
    if (newSelection.has(key)) {
      newSelection.delete(key)
    } else {
      newSelection.add(key)
    }
    setSelectedPairs(newSelection)
  }

  function selectAll() {
    setSelectedPairs(new Set(suggestions.map(getPairKey)))
  }

  async function handleApprove() {
    if (selectedPairs.size === 0) return

    setIsApproving(true)
    try {
      const selectedSuggestions = suggestions.filter(s => selectedPairs.has(getPairKey(s)))
      
      for (const s of selectedSuggestions) {
        await fetch('/api/counselor/pairs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mentor_profile_id: s.mentor_profile_id,
            mentee_profile_id: s.mentee_profile_id,
            program_id: programId,
            reasons: s.reasons,
            status: 'approved'
          }),
        })
      }

      setSelectedPairs(new Set())
      fetchSuggestions()
    } catch (error) {
      console.error('Error approving matches:', error)
    } finally {
      setIsApproving(false)
    }
  }

  function getReasonLabel(reason: string) {
    const labels: Record<string, { en: string; ar: string }> = {
      goal_match: { en: 'Goal Match', ar: 'تطابق الأهداف' },
      language_match: { en: 'Language Match', ar: 'تطابق اللغة' },
      capacity_available: { en: 'Capacity Available', ar: 'سعة متاحة' },
      programme_match: { en: 'Programme', ar: 'البرنامج' },
    }
    return labels[reason]?.[isArabic ? 'ar' : 'en'] || reason
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/counselor/programs">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-ms-ink">
              {isArabic ? 'اقتراحات المطابقة' : 'Match Suggestions'}
            </h1>
            <p className="text-ms-ink-muted">
              {isArabic ? 'مراجعة والموافقة على أزواج الإرشاد المقترحة' : 'Review and approve suggested mentoring pairs'}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchSuggestions} disabled={isLoading}>
            <RefreshCw className={`size-4 me-2 ${isLoading ? 'animate-spin' : ''}`} />
            {isArabic ? 'تحديث' : 'Refresh'}
          </Button>
          {suggestions.length > 0 && (
            <>
              <Button variant="outline" onClick={selectAll}>
                {isArabic ? 'تحديد الكل' : 'Select All'}
              </Button>
              <Button
                onClick={handleApprove}
                disabled={selectedPairs.size === 0 || isApproving}
                className="bg-green-600 hover:bg-green-700"
              >
                {isApproving ? (
                  <Loader2 className="size-4 animate-spin me-2" />
                ) : (
                  <Check className="size-4 me-2" />
                )}
                {isArabic ? 'موافقة' : 'Approve'} ({selectedPairs.size})
              </Button>
            </>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="size-8 animate-spin text-ms-ink-subtle" />
        </div>
      ) : suggestions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <UserCheck className="size-12 mx-auto mb-4 text-green-500" />
            <h3 className="text-lg font-semibold mb-2">
              {isArabic ? 'لا توجد اقتراحات جديدة' : 'No new suggestions'}
            </h3>
            <p className="text-ms-ink-muted">
              {isArabic ? 'تم مطابقة جميع المتعلمين أو لا توجد مطابقات متاحة' : 'All mentees are matched or no matches available'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {suggestions.map((suggestion) => {
            const key = getPairKey(suggestion)
            const isSelected = selectedPairs.has(key)
            const scorePercent = Math.round(suggestion.match_score * 100)

            return (
              <Card
                key={key}
                className={`transition-colors cursor-pointer ${
                  isSelected ? 'border-ms-ember bg-ms-ember/5' : 'hover:border-ms-line-strong'
                }`}
                onClick={() => toggleSelection(suggestion)}
              >
                <CardContent className="py-4">
                  <div className="flex items-center gap-4">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleSelection(suggestion)}
                      onClick={(e) => e.stopPropagation()}
                    />

                    <div className="flex items-center gap-4 flex-1">
                      <div className="flex items-center gap-3">
                        <Avatar className="size-10">
                          <AvatarImage src={suggestion.mentee?.avatar_url || undefined} />
                          <AvatarFallback>
                            {suggestion.mentee?.display_name?.[0]?.toUpperCase() || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-ms-ink">
                            {suggestion.mentee?.display_name || 'Mentee'}
                          </p>
                          <p className="text-xs text-ms-ink-muted">
                            {isArabic ? 'متعلم' : 'Mentee'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 px-4">
                        <Sparkles className="size-4 text-amber-500" />
                        <span className="text-sm font-medium text-amber-600">{scorePercent}%</span>
                      </div>

                      <div className="flex items-center gap-3">
                        <Avatar className="size-10">
                          <AvatarImage src={suggestion.mentor?.avatar_url || undefined} />
                          <AvatarFallback>
                            {suggestion.mentor?.display_name?.[0]?.toUpperCase() || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-ms-ink">
                            {suggestion.mentor?.display_name || 'Mentor'}
                          </p>
                          <p className="text-xs text-ms-ink-muted">
                            {isArabic ? 'مرشد' : 'Mentor'}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {suggestion.reasons.map((reason) => (
                        <Badge key={reason} variant="secondary" className="text-xs">
                          {getReasonLabel(reason)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
