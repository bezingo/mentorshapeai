'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { Check, X, Loader2, Link as LinkIcon, AlertCircle } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useOnboardingState } from '@/hooks/use-onboarding-state'
import { cn } from '@/lib/utils'

/**
 * Step 5: Handle Selection
 * Allows mentors to choose their unique public profile URL
 */
export function HandleStep() {
  const { formData, updateFormData } = useOnboardingState()
  
  const [isChecking, setIsChecking] = useState(false)
  const [availability, setAvailability] = useState<{
    available: boolean
    error?: string
  } | null>(null)
  const [suggestions, setSuggestions] = useState<string[]>([])
  
  const debounceTimerRef = useRef<NodeJS.Timeout>()
  const handle = formData.handle || ''

  // Check handle availability with debounce
  const checkAvailability = useCallback(async (handleToCheck: string) => {
    if (!handleToCheck || handleToCheck.length < 3) {
      setAvailability(null)
      setSuggestions([])
      return
    }

    setIsChecking(true)

    try {
      const response = await fetch(
        `/api/profile/handle/check?handle=${encodeURIComponent(handleToCheck)}`
      )
      const data = await response.json()

      if (data.data) {
        setAvailability({
          available: data.data.available,
          error: data.data.error,
        })

        // Generate suggestions if handle is taken
        if (!data.data.available && !data.data.error) {
          const baseName = handleToCheck.replace(/\d+$/, '')
          setSuggestions([
            `${baseName}1`,
            `${baseName}-mentor`,
            `${baseName}${new Date().getFullYear()}`,
          ])
        } else {
          setSuggestions([])
        }
      }
    } catch {
      setAvailability({ available: false, error: 'Failed to check availability' })
    } finally {
      setIsChecking(false)
    }
  }, [])

  // Handle input change with debounce
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')
      updateFormData({ handle: value })
      setAvailability(null)

      // Clear existing timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }

      // Set new debounced check
      if (value.length >= 3) {
        debounceTimerRef.current = setTimeout(() => {
          checkAvailability(value)
        }, 500)
      }
    },
    [updateFormData, checkAvailability]
  )

  // Select a suggestion
  const handleSelectSuggestion = useCallback(
    (suggestion: string) => {
      updateFormData({ handle: suggestion })
      checkAvailability(suggestion)
    },
    [updateFormData, checkAvailability]
  )

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  // Check on mount if handle is already set
  useEffect(() => {
    if (handle && handle.length >= 3 && !availability) {
      checkAvailability(handle)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Validation states
  const isValid = handle.length >= 3 && availability?.available === true
  const isInvalid = handle.length >= 3 && (availability?.available === false || availability?.error)
  const needsMoreChars = handle.length > 0 && handle.length < 3

  // Full profile URL
  const profileUrl = handle ? `mentorshape.com/m/${handle}` : 'mentorshape.com/m/your-handle'

  return (
    <div className="space-y-8 py-4">
      <div>
        <h2 className="text-2xl font-semibold">Choose Your Handle</h2>
        <p className="text-muted-foreground mt-1">
          Select a unique handle for your public mentor profile URL.
        </p>
      </div>

      {/* Handle Input */}
      <div className="space-y-4">
        <Label htmlFor="handle">Your Handle</Label>
        
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-muted rounded-l-4xl px-3 h-9 border border-r-0 border-input text-muted-foreground text-sm">
            /m/
          </div>
          <div className="relative flex-1">
            <Input
              id="handle"
              value={handle}
              onChange={handleInputChange}
              placeholder="your-handle"
              className="rounded-l-none pr-10"
              maxLength={30}
            />
            {/* Status indicator */}
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {isChecking && (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              )}
              {!isChecking && isValid && (
                <Check className="h-4 w-4 text-green-600" />
              )}
              {!isChecking && isInvalid && !availability?.error && (
                <X className="h-4 w-4 text-destructive" />
              )}
              {!isChecking && availability?.error && (
                <AlertCircle className="h-4 w-4 text-amber-500" />
              )}
            </div>
          </div>
        </div>

        {/* Availability status */}
        <div className="h-6">
          {needsMoreChars && (
            <p className="text-sm text-muted-foreground">
              Handle must be at least 3 characters
            </p>
          )}
          {!isChecking && isValid && (
            <p className="text-sm text-green-600 flex items-center gap-1">
              <Check className="h-3 w-3" />
              This handle is available!
            </p>
          )}
          {!isChecking && isInvalid && !availability?.error && (
            <p className="text-sm text-destructive flex items-center gap-1">
              <X className="h-3 w-3" />
              This handle is already taken
            </p>
          )}
          {!isChecking && availability?.error && (
            <p className="text-sm text-amber-600 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {availability.error}
            </p>
          )}
        </div>

        {/* Suggestions when handle is taken */}
        {suggestions.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Try one of these instead:</p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((suggestion) => (
                <Button
                  key={suggestion}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleSelectSuggestion(suggestion)}
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* URL Preview */}
      <div className="space-y-3">
        <Label>Your Profile URL</Label>
        <div
          className={cn(
            'flex items-center gap-2 p-4 rounded-xl border-2 border-dashed transition-colors',
            isValid && 'border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/50',
            !handle && 'border-muted'
          )}
        >
          <LinkIcon className="h-5 w-5 text-muted-foreground shrink-0" />
          <span className="text-sm">
            <span className="text-muted-foreground">https://</span>
            <span className={cn(handle && 'font-medium')}>{profileUrl}</span>
          </span>
        </div>
        {isValid && (
          <p className="text-sm text-muted-foreground">
            This will be your public mentor profile URL. Share it with potential
            mentees to start connecting!
          </p>
        )}
      </div>

      {/* Guidelines */}
      <div className="space-y-2 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">Handle Guidelines:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>3-30 characters long</li>
          <li>Only lowercase letters, numbers, and hyphens</li>
          <li>Cannot start or end with a hyphen</li>
          <li>Choose something memorable and professional</li>
        </ul>
      </div>
    </div>
  )
}
