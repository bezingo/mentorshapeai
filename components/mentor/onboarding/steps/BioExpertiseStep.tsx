'use client'

import { useState, useCallback } from 'react'
import { X } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useOnboardingState } from '@/hooks/use-onboarding-state'
import { cn } from '@/lib/utils'

/**
 * Common expertise area suggestions
 */
const EXPERTISE_SUGGESTIONS = [
  'Career Coaching',
  'Technical Mentoring',
  'Leadership Development',
  'Product Management',
  'Software Engineering',
  'Data Science',
  'UX/UI Design',
  'Marketing Strategy',
  'Business Development',
  'Startup Guidance',
  'Interview Preparation',
  'Resume Review',
  'Networking Skills',
  'Public Speaking',
  'Project Management',
  'Agile Methodologies',
  'Cloud Architecture',
  'Machine Learning',
  'Frontend Development',
  'Backend Development',
]

const BIO_MIN_LENGTH = 50
const BIO_MAX_LENGTH = 1000
const MAX_EXPERTISE_AREAS = 10

/**
 * Step 2: Bio and Expertise Areas
 * Captures mentor's bio and areas of expertise
 */
export function BioExpertiseStep() {
  const { formData, updateFormData } = useOnboardingState()
  const [expertiseInput, setExpertiseInput] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)

  const bio = formData.bio || ''
  const expertiseAreas = formData.expertiseAreas || []

  const handleBioChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value
      if (value.length <= BIO_MAX_LENGTH) {
        updateFormData({ bio: value })
      }
    },
    [updateFormData]
  )

  const handleAddExpertise = useCallback(
    (expertise: string) => {
      const trimmed = expertise.trim()
      if (
        trimmed &&
        !expertiseAreas.includes(trimmed) &&
        expertiseAreas.length < MAX_EXPERTISE_AREAS
      ) {
        updateFormData({ expertiseAreas: [...expertiseAreas, trimmed] })
      }
      setExpertiseInput('')
      setShowSuggestions(false)
    },
    [expertiseAreas, updateFormData]
  )

  const handleRemoveExpertise = useCallback(
    (expertise: string) => {
      updateFormData({
        expertiseAreas: expertiseAreas.filter((e) => e !== expertise),
      })
    },
    [expertiseAreas, updateFormData]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        handleAddExpertise(expertiseInput)
      }
    },
    [expertiseInput, handleAddExpertise]
  )

  // Filter suggestions based on input
  const filteredSuggestions = EXPERTISE_SUGGESTIONS.filter(
    (s) =>
      s.toLowerCase().includes(expertiseInput.toLowerCase()) &&
      !expertiseAreas.includes(s)
  ).slice(0, 6)

  const bioCharCount = bio.length
  const bioIsValid = bioCharCount >= BIO_MIN_LENGTH
  const bioProgress = Math.min((bioCharCount / BIO_MIN_LENGTH) * 100, 100)

  return (
    <div className="space-y-8 py-4">
      <div>
        <h2 className="text-2xl font-semibold">Bio & Expertise</h2>
        <p className="text-muted-foreground mt-1">
          Tell potential mentees about yourself and your areas of expertise.
        </p>
      </div>

      {/* Bio Section */}
      <div className="space-y-3">
        <div className="flex justify-between items-baseline">
          <Label htmlFor="bio">Your Bio</Label>
          <span
            className={cn(
              'text-xs',
              bioIsValid ? 'text-muted-foreground' : 'text-amber-600'
            )}
          >
            {bioCharCount}/{BIO_MAX_LENGTH} characters
            {!bioIsValid && ` (minimum ${BIO_MIN_LENGTH})`}
          </span>
        </div>
        <Textarea
          id="bio"
          value={bio}
          onChange={handleBioChange}
          placeholder="Share your background, experience, and what drives your passion for mentoring. What unique perspective do you bring? What can mentees expect when working with you?"
          className="min-h-[160px] resize-y"
        />
        {/* Progress bar for minimum length */}
        {!bioIsValid && (
          <div className="space-y-1">
            <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 transition-all duration-300"
                style={{ width: `${bioProgress}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Write at least {BIO_MIN_LENGTH - bioCharCount} more characters
            </p>
          </div>
        )}
      </div>

      {/* Expertise Areas Section */}
      <div className="space-y-3">
        <div className="flex justify-between items-baseline">
          <Label htmlFor="expertise">Expertise Areas</Label>
          <span className="text-xs text-muted-foreground">
            {expertiseAreas.length}/{MAX_EXPERTISE_AREAS} selected
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          Add the areas where you can provide mentorship. Type to search or select
          from suggestions.
        </p>

        {/* Selected expertise tags */}
        {expertiseAreas.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {expertiseAreas.map((expertise) => (
              <Badge
                key={expertise}
                variant="secondary"
                className="gap-1 pr-1.5 text-sm"
              >
                {expertise}
                <button
                  type="button"
                  onClick={() => handleRemoveExpertise(expertise)}
                  className="ml-1 rounded-full hover:bg-muted-foreground/20 p-0.5"
                  aria-label={`Remove ${expertise}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}

        {/* Input for adding expertise */}
        {expertiseAreas.length < MAX_EXPERTISE_AREAS && (
          <div className="relative">
            <Input
              id="expertise"
              value={expertiseInput}
              onChange={(e) => {
                setExpertiseInput(e.target.value)
                setShowSuggestions(true)
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              onKeyDown={handleKeyDown}
              placeholder="Type to add an expertise area..."
              className="pr-20"
            />
            {expertiseInput && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleAddExpertise(expertiseInput)}
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7"
              >
                Add
              </Button>
            )}

            {/* Suggestions dropdown */}
            {showSuggestions && filteredSuggestions.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-popover border rounded-xl shadow-lg overflow-hidden">
                {filteredSuggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => handleAddExpertise(suggestion)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Quick suggestions */}
        {expertiseAreas.length === 0 && !expertiseInput && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Popular areas:</p>
            <div className="flex flex-wrap gap-2">
              {EXPERTISE_SUGGESTIONS.slice(0, 8).map((suggestion) => (
                <Button
                  key={suggestion}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleAddExpertise(suggestion)}
                  className="h-7 text-xs"
                >
                  + {suggestion}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
