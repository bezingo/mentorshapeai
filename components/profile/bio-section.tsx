'use client'

import { useState, useEffect } from 'react'
import { ProfileSection } from './profile-section'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

interface BioSectionProps {
  bio: string | null
  onSave: (data: { bio: string | null }) => Promise<void>
  className?: string
}

const MAX_BIO_LENGTH = 1000

export function BioSection({ bio, onSave, className }: BioSectionProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [localBio, setLocalBio] = useState(bio || '')
  const [isExpanded, setIsExpanded] = useState(false)

  // Reset form when props change
  useEffect(() => {
    setLocalBio(bio || '')
  }, [bio])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await onSave({
        bio: localBio.trim() || null,
      })
      setIsEditing(false)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setLocalBio(bio || '')
  }

  const remainingChars = MAX_BIO_LENGTH - localBio.length
  const isOverLimit = remainingChars < 0

  // Truncate bio for view mode if too long
  const truncateLength = 300
  const shouldTruncate = (bio?.length || 0) > truncateLength && !isExpanded
  const displayBio = shouldTruncate ? bio?.slice(0, truncateLength) + '...' : bio

  const viewContent = (
    <div className="space-y-2">
      {bio ? (
        <>
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{displayBio}</p>
          {(bio?.length || 0) > truncateLength && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-sm text-primary hover:underline focus:outline-none"
            >
              {isExpanded ? 'Show less' : 'Read more'}
            </button>
          )}
        </>
      ) : (
        <p className="text-muted-foreground">No biography added yet</p>
      )}
    </div>
  )

  const editContent = (
    <div className="space-y-3">
      <Label htmlFor="bio">Biography</Label>
      <Textarea
        id="bio"
        value={localBio}
        onChange={(e) => setLocalBio(e.target.value)}
        placeholder="Tell us about yourself..."
        className={cn('min-h-[150px] resize-none', isOverLimit && 'border-destructive')}
        maxLength={MAX_BIO_LENGTH + 100} // Allow slight overflow for typing, validation will handle it
      />
      <div className="flex justify-end">
        <span
          className={cn(
            'text-xs',
            isOverLimit ? 'text-destructive' : 'text-muted-foreground',
            remainingChars <= 50 && !isOverLimit && 'text-amber-500'
          )}
        >
          {remainingChars} characters remaining
        </span>
      </div>
    </div>
  )

  return (
    <ProfileSection
      title="Bio"
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
