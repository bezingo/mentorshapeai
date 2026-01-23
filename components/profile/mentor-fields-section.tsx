'use client'

import { useState, useEffect, KeyboardEvent } from 'react'
import { ProfileSection } from './profile-section'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { X, Plus, Clock, Award, Globe, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MentorFieldsSectionProps {
  expertiseAreas: string[]
  languages: string[]
  timezone: string | null
  yearsOfExperience: number | null
  onSave: (data: {
    expertise_areas: string[]
    languages: string[]
    timezone: string | null
    years_of_experience: number | null
  }) => Promise<void>
  className?: string
}

// IANA Timezones - comprehensive list
const IANA_TIMEZONES = [
  // Americas
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Anchorage',
  'America/Phoenix',
  'America/Toronto',
  'America/Vancouver',
  'America/Mexico_City',
  'America/Sao_Paulo',
  'America/Buenos_Aires',
  'America/Lima',
  'America/Bogota',
  'America/Santiago',
  // Europe
  'Europe/London',
  'Europe/Dublin',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Madrid',
  'Europe/Rome',
  'Europe/Amsterdam',
  'Europe/Brussels',
  'Europe/Vienna',
  'Europe/Zurich',
  'Europe/Stockholm',
  'Europe/Oslo',
  'Europe/Copenhagen',
  'Europe/Helsinki',
  'Europe/Warsaw',
  'Europe/Prague',
  'Europe/Budapest',
  'Europe/Athens',
  'Europe/Istanbul',
  'Europe/Moscow',
  'Europe/Kiev',
  // Asia
  'Asia/Dubai',
  'Asia/Riyadh',
  'Asia/Kuwait',
  'Asia/Tehran',
  'Asia/Karachi',
  'Asia/Kolkata',
  'Asia/Mumbai',
  'Asia/Dhaka',
  'Asia/Bangkok',
  'Asia/Jakarta',
  'Asia/Singapore',
  'Asia/Kuala_Lumpur',
  'Asia/Hong_Kong',
  'Asia/Shanghai',
  'Asia/Beijing',
  'Asia/Taipei',
  'Asia/Seoul',
  'Asia/Tokyo',
  'Asia/Manila',
  // Pacific
  'Pacific/Auckland',
  'Pacific/Sydney',
  'Pacific/Melbourne',
  'Pacific/Brisbane',
  'Pacific/Perth',
  'Pacific/Fiji',
  'Pacific/Honolulu',
  // Africa
  'Africa/Cairo',
  'Africa/Johannesburg',
  'Africa/Lagos',
  'Africa/Nairobi',
  'Africa/Casablanca',
]

// Predefined languages list
const PREDEFINED_LANGUAGES = [
  'English',
  'Spanish',
  'French',
  'German',
  'Italian',
  'Portuguese',
  'Dutch',
  'Russian',
  'Chinese (Mandarin)',
  'Chinese (Cantonese)',
  'Japanese',
  'Korean',
  'Arabic',
  'Hindi',
  'Bengali',
  'Urdu',
  'Turkish',
  'Vietnamese',
  'Thai',
  'Polish',
  'Ukrainian',
  'Greek',
  'Swedish',
  'Norwegian',
  'Danish',
  'Finnish',
  'Hebrew',
  'Persian',
  'Indonesian',
  'Malay',
  'Tagalog',
  'Swahili',
]

// Format timezone for display (e.g., "America/New_York" -> "New York (America)")
function formatTimezone(tz: string): string {
  const [region, city] = tz.split('/')
  const formattedCity = city?.replace(/_/g, ' ') || tz
  return `${formattedCity} (${region})`
}

export function MentorFieldsSection({
  expertiseAreas,
  languages,
  timezone,
  yearsOfExperience,
  onSave,
  className,
}: MentorFieldsSectionProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Local state for editing
  const [localExpertise, setLocalExpertise] = useState<string[]>(expertiseAreas)
  const [localLanguages, setLocalLanguages] = useState<string[]>(languages)
  const [localTimezone, setLocalTimezone] = useState<string>(timezone || '')
  const [localYears, setLocalYears] = useState<string>(
    yearsOfExperience !== null ? String(yearsOfExperience) : ''
  )

  // Timezone search state
  const [timezoneSearch, setTimezoneSearch] = useState('')

  // Reset form when props change
  useEffect(() => {
    setLocalExpertise(expertiseAreas)
    setLocalLanguages(languages)
    setLocalTimezone(timezone || '')
    setLocalYears(yearsOfExperience !== null ? String(yearsOfExperience) : '')
  }, [expertiseAreas, languages, timezone, yearsOfExperience])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const years = localYears ? parseInt(localYears, 10) : null
      // Validate years is within range
      const validYears = years !== null && years >= 0 && years <= 50 ? years : null

      await onSave({
        expertise_areas: localExpertise,
        languages: localLanguages,
        timezone: localTimezone || null,
        years_of_experience: validYears,
      })
      setIsEditing(false)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setLocalExpertise(expertiseAreas)
    setLocalLanguages(languages)
    setLocalTimezone(timezone || '')
    setLocalYears(yearsOfExperience !== null ? String(yearsOfExperience) : '')
  }

  // Filter timezones based on search
  const filteredTimezones = IANA_TIMEZONES.filter((tz) =>
    formatTimezone(tz).toLowerCase().includes(timezoneSearch.toLowerCase())
  )

  const viewContent = (
    <div className="space-y-4">
      {/* Expertise Areas */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Award className="h-4 w-4" />
          <span>Areas of Expertise</span>
        </div>
        {expertiseAreas.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {expertiseAreas.map((area) => (
              <span
                key={area}
                className="inline-flex items-center rounded-full px-3 py-1 text-sm font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
              >
                {area}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">Not specified</p>
        )}
      </div>

      {/* Languages */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Globe className="h-4 w-4" />
          <span>Languages</span>
        </div>
        {languages.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {languages.map((lang) => (
              <span
                key={lang}
                className="inline-flex items-center rounded-full px-3 py-1 text-sm font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
              >
                {lang}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">Not specified</p>
        )}
      </div>

      {/* Timezone */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>Timezone</span>
        </div>
        {timezone ? (
          <span className="inline-flex items-center rounded-full px-3 py-1 text-sm font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
            {formatTimezone(timezone)}
          </span>
        ) : (
          <p className="text-muted-foreground text-sm">Not specified</p>
        )}
      </div>

      {/* Years of Experience */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>Years of Experience</span>
        </div>
        {yearsOfExperience !== null ? (
          <span className="inline-flex items-center rounded-full px-3 py-1 text-sm font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
            {yearsOfExperience} {yearsOfExperience === 1 ? 'year' : 'years'}
          </span>
        ) : (
          <p className="text-muted-foreground text-sm">Not specified</p>
        )}
      </div>
    </div>
  )

  const editContent = (
    <div className="space-y-6">
      {/* Expertise Areas */}
      <TagInput
        label="Areas of Expertise"
        tags={localExpertise}
        onChange={setLocalExpertise}
        placeholder="e.g., Career Coaching, Leadership..."
        maxItems={20}
      />

      {/* Languages */}
      <div className="space-y-2">
        <Label>Languages</Label>
        <div className="flex flex-wrap gap-2 mb-2">
          {localLanguages.map((lang) => (
            <span
              key={lang}
              className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
            >
              {lang}
              <button
                type="button"
                onClick={() => setLocalLanguages(localLanguages.filter((l) => l !== lang))}
                className="hover:opacity-70 focus:outline-none"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
        {localLanguages.length < 20 && (
          <Select
            onValueChange={(value) => {
              if (!localLanguages.includes(value)) {
                setLocalLanguages([...localLanguages, value])
              }
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Add a language..." />
            </SelectTrigger>
            <SelectContent>
              {PREDEFINED_LANGUAGES.filter((lang) => !localLanguages.includes(lang)).map(
                (lang) => (
                  <SelectItem key={lang} value={lang}>
                    {lang}
                  </SelectItem>
                )
              )}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Timezone */}
      <div className="space-y-2">
        <Label>Timezone</Label>
        <Select value={localTimezone} onValueChange={setLocalTimezone}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select timezone..." />
          </SelectTrigger>
          <SelectContent>
            <div className="px-2 pb-2">
              <Input
                placeholder="Search timezones..."
                value={timezoneSearch}
                onChange={(e) => setTimezoneSearch(e.target.value)}
                className="h-8"
              />
            </div>
            {filteredTimezones.map((tz) => (
              <SelectItem key={tz} value={tz}>
                {formatTimezone(tz)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Years of Experience */}
      <div className="space-y-2">
        <Label htmlFor="years-experience">Years of Experience</Label>
        <Input
          id="years-experience"
          type="number"
          min={0}
          max={50}
          value={localYears}
          onChange={(e) => {
            const value = e.target.value
            if (value === '' || (parseInt(value, 10) >= 0 && parseInt(value, 10) <= 50)) {
              setLocalYears(value)
            }
          }}
          placeholder="0-50 years"
          className="w-full max-w-[200px]"
        />
        <p className="text-xs text-muted-foreground">Enter a value between 0 and 50</p>
      </div>
    </div>
  )

  return (
    <ProfileSection
      title="Mentor Information"
      viewContent={viewContent}
      editContent={editContent}
      isEditing={isEditing}
      onEditingChange={setIsEditing}
      onSave={handleSave}
      onCancel={handleCancel}
      isSaving={isSaving}
      className={className}
    />
  )
}

// Reusable Tag Input Component
interface TagInputProps {
  label: string
  tags: string[]
  onChange: (tags: string[]) => void
  placeholder?: string
  maxItems?: number
}

function TagInput({
  label,
  tags,
  onChange,
  placeholder = 'Add item...',
  maxItems = 20,
}: TagInputProps) {
  const [inputValue, setInputValue] = useState('')

  const addTag = () => {
    const value = inputValue.trim()
    if (value && !tags.includes(value) && tags.length < maxItems) {
      onChange([...tags, value])
      setInputValue('')
    }
  }

  const removeTag = (tagToRemove: string) => {
    onChange(tags.filter((tag) => tag !== tagToRemove))
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addTag()
    }
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex flex-wrap gap-2 mb-2">
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="hover:opacity-70 focus:outline-none"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
      {tags.length < maxItems && (
        <div className="flex gap-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="flex-1"
          />
          <Button type="button" variant="outline" size="icon" onClick={addTag}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      )}
      {tags.length >= maxItems && (
        <p className="text-xs text-muted-foreground">Maximum of {maxItems} items reached</p>
      )}
    </div>
  )
}
