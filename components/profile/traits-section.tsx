'use client'

import { useState, useEffect, KeyboardEvent } from 'react'
import { ProfileSection } from './profile-section'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { X, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TraitsSectionProps {
  languagesSpoken: string[]
  canMentorFor: string[]
  wantToLearn: string[]
  specializations: string[]
  hobbies: string[]
  traitsPublic: boolean
  onSave: (data: {
    languages_spoken: string[]
    can_mentor_for: string[]
    want_to_learn: string[]
    specializations: string[]
    hobbies: string[]
    traits_public: boolean
  }) => Promise<void>
  className?: string
}

type TagColor = 'blue' | 'yellow' | 'gray' | 'colorful'

interface TagInputProps {
  label: string
  tags: string[]
  onChange: (tags: string[]) => void
  color: TagColor
  placeholder?: string
  maxItems?: number
}

const tagColorClasses: Record<TagColor, string> = {
  blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  yellow: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  gray: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  colorful: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
}

// For hobbies, we'll cycle through different colors
const hobbyColors = [
  'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
  'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
]

function TagInput({
  label,
  tags,
  onChange,
  color,
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

  const getTagColor = (index: number) => {
    if (color === 'colorful') {
      return hobbyColors[index % hobbyColors.length]
    }
    return tagColorClasses[color]
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex flex-wrap gap-2 mb-2">
        {tags.map((tag, index) => (
          <span
            key={tag}
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium',
              getTagColor(index)
            )}
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

function TagDisplay({
  label,
  tags,
  color,
}: {
  label: string
  tags: string[]
  color: TagColor
}) {
  const getTagColor = (index: number) => {
    if (color === 'colorful') {
      return hobbyColors[index % hobbyColors.length]
    }
    return tagColorClasses[color]
  }

  if (tags.length === 0) {
    return null
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">{label}</p>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag, index) => (
          <span
            key={tag}
            className={cn(
              'inline-flex items-center rounded-full px-3 py-1 text-sm font-medium',
              getTagColor(index)
            )}
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  )
}

export function TraitsSection({
  languagesSpoken,
  canMentorFor,
  wantToLearn,
  specializations,
  hobbies,
  traitsPublic,
  onSave,
  className,
}: TraitsSectionProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Local state for editing
  const [localLanguages, setLocalLanguages] = useState(languagesSpoken)
  const [localCanMentorFor, setLocalCanMentorFor] = useState(canMentorFor)
  const [localWantToLearn, setLocalWantToLearn] = useState(wantToLearn)
  const [localSpecializations, setLocalSpecializations] = useState(specializations)
  const [localHobbies, setLocalHobbies] = useState(hobbies)
  const [localTraitsPublic, setLocalTraitsPublic] = useState(traitsPublic)

  // Reset form when props change
  useEffect(() => {
    setLocalLanguages(languagesSpoken)
    setLocalCanMentorFor(canMentorFor)
    setLocalWantToLearn(wantToLearn)
    setLocalSpecializations(specializations)
    setLocalHobbies(hobbies)
    setLocalTraitsPublic(traitsPublic)
  }, [languagesSpoken, canMentorFor, wantToLearn, specializations, hobbies, traitsPublic])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await onSave({
        languages_spoken: localLanguages,
        can_mentor_for: localCanMentorFor,
        want_to_learn: localWantToLearn,
        specializations: localSpecializations,
        hobbies: localHobbies,
        traits_public: localTraitsPublic,
      })
      setIsEditing(false)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setLocalLanguages(languagesSpoken)
    setLocalCanMentorFor(canMentorFor)
    setLocalWantToLearn(wantToLearn)
    setLocalSpecializations(specializations)
    setLocalHobbies(hobbies)
    setLocalTraitsPublic(traitsPublic)
  }

  const hasAnyTraits =
    languagesSpoken.length > 0 ||
    canMentorFor.length > 0 ||
    wantToLearn.length > 0 ||
    specializations.length > 0 ||
    hobbies.length > 0

  const viewContent = (
    <div className="space-y-4">
      {!hasAnyTraits ? (
        <p className="text-muted-foreground">No traits added yet</p>
      ) : (
        <>
          <TagDisplay label="Languages Spoken" tags={languagesSpoken} color="blue" />
          <TagDisplay label="I Can Mentor For" tags={canMentorFor} color="yellow" />
          <TagDisplay label="Want to Learn More On" tags={wantToLearn} color="yellow" />
          <TagDisplay label="I Specialize In" tags={specializations} color="gray" />
          <TagDisplay label="My Hobbies Are" tags={hobbies} color="colorful" />
        </>
      )}
    </div>
  )

  const editContent = (
    <div className="space-y-6">
      <TagInput
        label="Languages Spoken"
        tags={localLanguages}
        onChange={setLocalLanguages}
        color="blue"
        placeholder="e.g., English, Spanish..."
      />
      <TagInput
        label="I Can Mentor For"
        tags={localCanMentorFor}
        onChange={setLocalCanMentorFor}
        color="yellow"
        placeholder="e.g., Career Advice, Leadership..."
      />
      <TagInput
        label="Want to Learn More On"
        tags={localWantToLearn}
        onChange={setLocalWantToLearn}
        color="yellow"
        placeholder="e.g., Entrepreneurship, Marketing..."
      />
      <TagInput
        label="I Specialize In"
        tags={localSpecializations}
        onChange={setLocalSpecializations}
        color="gray"
        placeholder="e.g., Software Engineering, Design..."
      />
      <TagInput
        label="My Hobbies Are"
        tags={localHobbies}
        onChange={setLocalHobbies}
        color="colorful"
        placeholder="e.g., Photography, Hiking..."
      />
      <div className="flex items-center gap-2 pt-2">
        <input
          type="checkbox"
          id="traits-public"
          checked={localTraitsPublic}
          onChange={(e) => setLocalTraitsPublic(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300"
        />
        <Label htmlFor="traits-public" className="text-sm font-normal">
          Show traits on public profile
        </Label>
      </div>
    </div>
  )

  return (
    <ProfileSection
      title="Traits"
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
