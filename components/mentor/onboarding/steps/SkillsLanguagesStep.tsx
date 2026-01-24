'use client'

import { useState, useCallback, useEffect } from 'react'
import { X, Globe } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useOnboardingState } from '@/hooks/use-onboarding-state'
import {
  COMMON_TIMEZONES,
  getDetectedTimezone,
  getTimezoneLabel,
} from '@/lib/utils/timezone'

/**
 * Common skills suggestions
 */
const SKILLS_SUGGESTIONS = [
  'JavaScript',
  'TypeScript',
  'React',
  'Node.js',
  'Python',
  'Java',
  'Go',
  'Rust',
  'SQL',
  'PostgreSQL',
  'MongoDB',
  'AWS',
  'Docker',
  'Kubernetes',
  'Git',
  'CI/CD',
  'System Design',
  'API Design',
  'Testing',
  'Agile',
  'Scrum',
  'Product Strategy',
  'User Research',
  'Figma',
  'Data Analysis',
  'Machine Learning',
  'Communication',
  'Team Leadership',
  'Project Planning',
  'Stakeholder Management',
]

/**
 * Common languages list
 */
const COMMON_LANGUAGES = [
  'English',
  'Spanish',
  'Mandarin Chinese',
  'Hindi',
  'Arabic',
  'Portuguese',
  'French',
  'German',
  'Japanese',
  'Korean',
  'Italian',
  'Dutch',
  'Russian',
  'Turkish',
  'Polish',
  'Vietnamese',
  'Thai',
  'Indonesian',
  'Swedish',
  'Norwegian',
  'Danish',
  'Finnish',
  'Greek',
  'Hebrew',
  'Czech',
  'Romanian',
  'Hungarian',
  'Ukrainian',
]

const MAX_SKILLS = 20
const MAX_LANGUAGES = 10

/**
 * Step 3: Skills, Languages, Timezone, and Experience
 * Captures mentor's capabilities and preferences
 */
export function SkillsLanguagesStep() {
  const { formData, updateFormData } = useOnboardingState()
  const [skillInput, setSkillInput] = useState('')
  const [showSkillSuggestions, setShowSkillSuggestions] = useState(false)

  const skills = formData.skills || []
  const languages = formData.languages || []
  const timezone = formData.timezone || 'UTC'
  const yearsOfExperience = formData.yearsOfExperience || 0

  // Auto-detect timezone on mount if not already set
  useEffect(() => {
    if (!formData.timezone || formData.timezone === 'UTC') {
      const detected = getDetectedTimezone()
      if (detected && detected !== 'UTC') {
        updateFormData({ timezone: detected })
      }
    }
  }, [formData.timezone, updateFormData])

  // Skills handlers
  const handleAddSkill = useCallback(
    (skill: string) => {
      const trimmed = skill.trim()
      if (trimmed && !skills.includes(trimmed) && skills.length < MAX_SKILLS) {
        updateFormData({ skills: [...skills, trimmed] })
      }
      setSkillInput('')
      setShowSkillSuggestions(false)
    },
    [skills, updateFormData]
  )

  const handleRemoveSkill = useCallback(
    (skill: string) => {
      updateFormData({
        skills: skills.filter((s) => s !== skill),
      })
    },
    [skills, updateFormData]
  )

  const handleSkillKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        handleAddSkill(skillInput)
      }
    },
    [skillInput, handleAddSkill]
  )

  // Language handlers
  const handleAddLanguage = useCallback(
    (language: string) => {
      if (!languages.includes(language) && languages.length < MAX_LANGUAGES) {
        updateFormData({ languages: [...languages, language] })
      }
    },
    [languages, updateFormData]
  )

  const handleRemoveLanguage = useCallback(
    (language: string) => {
      updateFormData({
        languages: languages.filter((l) => l !== language),
      })
    },
    [languages, updateFormData]
  )

  // Filter suggestions
  const filteredSkillSuggestions = SKILLS_SUGGESTIONS.filter(
    (s) =>
      s.toLowerCase().includes(skillInput.toLowerCase()) && !skills.includes(s)
  ).slice(0, 6)

  const availableLanguages = COMMON_LANGUAGES.filter(
    (l) => !languages.includes(l)
  )

  return (
    <div className="space-y-8 py-4">
      <div>
        <h2 className="text-2xl font-semibold">Skills & Languages</h2>
        <p className="text-muted-foreground mt-1">
          Share your skills, languages you speak, and mentoring experience.
        </p>
      </div>

      {/* Skills Section */}
      <div className="space-y-3">
        <div className="flex justify-between items-baseline">
          <Label htmlFor="skills">Skills</Label>
          <span className="text-xs text-muted-foreground">
            {skills.length}/{MAX_SKILLS} selected
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          Add your technical and soft skills that you can help mentees develop.
        </p>

        {/* Selected skills */}
        {skills.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {skills.map((skill) => (
              <Badge key={skill} variant="secondary" className="gap-1 pr-1.5 text-sm">
                {skill}
                <button
                  type="button"
                  onClick={() => handleRemoveSkill(skill)}
                  className="ml-1 rounded-full hover:bg-muted-foreground/20 p-0.5"
                  aria-label={`Remove ${skill}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}

        {/* Input for adding skills */}
        {skills.length < MAX_SKILLS && (
          <div className="relative">
            <Input
              id="skills"
              value={skillInput}
              onChange={(e) => {
                setSkillInput(e.target.value)
                setShowSkillSuggestions(true)
              }}
              onFocus={() => setShowSkillSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSkillSuggestions(false), 200)}
              onKeyDown={handleSkillKeyDown}
              placeholder="Type to add a skill..."
              className="pr-20"
            />
            {skillInput && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleAddSkill(skillInput)}
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7"
              >
                Add
              </Button>
            )}

            {/* Suggestions dropdown */}
            {showSkillSuggestions && filteredSkillSuggestions.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-popover border rounded-xl shadow-lg overflow-hidden">
                {filteredSkillSuggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => handleAddSkill(suggestion)}
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
        {skills.length === 0 && !skillInput && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Popular skills:</p>
            <div className="flex flex-wrap gap-2">
              {SKILLS_SUGGESTIONS.slice(0, 10).map((suggestion) => (
                <Button
                  key={suggestion}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleAddSkill(suggestion)}
                  className="h-7 text-xs"
                >
                  + {suggestion}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Languages Section */}
      <div className="space-y-3">
        <div className="flex justify-between items-baseline">
          <Label>Languages You Speak</Label>
          <span className="text-xs text-muted-foreground">
            {languages.length}/{MAX_LANGUAGES} selected
          </span>
        </div>

        {/* Selected languages */}
        {languages.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {languages.map((language) => (
              <Badge
                key={language}
                variant="secondary"
                className="gap-1 pr-1.5 text-sm"
              >
                {language}
                <button
                  type="button"
                  onClick={() => handleRemoveLanguage(language)}
                  className="ml-1 rounded-full hover:bg-muted-foreground/20 p-0.5"
                  aria-label={`Remove ${language}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}

        {/* Language selector */}
        {languages.length < MAX_LANGUAGES && (
          <Select onValueChange={handleAddLanguage}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a language..." />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Languages</SelectLabel>
                {availableLanguages.map((language) => (
                  <SelectItem key={language} value={language}>
                    {language}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Timezone Section */}
      <div className="space-y-3">
        <Label htmlFor="timezone">
          <span className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Your Timezone
          </span>
        </Label>
        <p className="text-sm text-muted-foreground">
          This helps mentees find you at the right time.
        </p>
        <Select
          value={timezone}
          onValueChange={(value) => updateFormData({ timezone: value })}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select timezone..." />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(COMMON_TIMEZONES).map(([region, zones]) => (
              <SelectGroup key={region}>
                <SelectLabel>{region}</SelectLabel>
                {zones.map((tz) => (
                  <SelectItem key={tz} value={tz}>
                    {getTimezoneLabel(tz)}
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Years of Experience Section */}
      <div className="space-y-3">
        <Label htmlFor="experience">Years of Experience</Label>
        <p className="text-sm text-muted-foreground">
          How many years of professional experience do you have?
        </p>
        <div className="flex items-center gap-4">
          <Input
            id="experience"
            type="number"
            min={0}
            max={50}
            value={yearsOfExperience}
            onChange={(e) => {
              const value = Math.min(50, Math.max(0, parseInt(e.target.value) || 0))
              updateFormData({ yearsOfExperience: value })
            }}
            className="w-24"
          />
          <span className="text-sm text-muted-foreground">
            {yearsOfExperience === 1 ? 'year' : 'years'}
          </span>

          {/* Quick select buttons */}
          <div className="flex gap-2 ml-4">
            {[1, 3, 5, 10, 15, 20].map((years) => (
              <Button
                key={years}
                type="button"
                variant={yearsOfExperience === years ? 'default' : 'outline'}
                size="sm"
                onClick={() => updateFormData({ yearsOfExperience: years })}
                className="h-8 w-10"
              >
                {years}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
