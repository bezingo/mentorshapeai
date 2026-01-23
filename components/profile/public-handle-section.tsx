'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ProfileSection } from './profile-section'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ExternalLink, Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'

// Zod schema for public handle
const publicHandleSchema = z.object({
  handle: z
    .string()
    .min(3, 'Handle must be at least 3 characters')
    .max(50, 'Handle must be at most 50 characters')
    .regex(
      /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/,
      'Handle can only contain lowercase letters, numbers, and hyphens (cannot start or end with hyphen)'
    )
    .optional()
    .nullable()
    .or(z.literal('')),
})

type PublicHandleFormData = z.infer<typeof publicHandleSchema>

interface PublicHandleSectionProps {
  handle: string | null
  onSave: (data: { public_handle: string | null }) => Promise<void>
  className?: string
}

export function PublicHandleSection({ handle, onSave, className }: PublicHandleSectionProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [copied, setCopied] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<PublicHandleFormData>({
    resolver: zodResolver(publicHandleSchema),
    defaultValues: {
      handle: handle || '',
    },
  })

  // Reset form when props change
  useEffect(() => {
    reset({ handle: handle || '' })
  }, [handle, reset])

  const handleSave = async () => {
    handleSubmit(async (data) => {
      setIsSaving(true)
      try {
        await onSave({
          public_handle: data.handle || null,
        })
        setIsEditing(false)
      } finally {
        setIsSaving(false)
      }
    })()
  }

  const handleCancel = () => {
    reset({ handle: handle || '' })
  }

  const currentHandle = watch('handle')
  const profileUrl = handle
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/m/${handle}`
    : null

  const copyToClipboard = async () => {
    if (profileUrl) {
      await navigator.clipboard.writeText(profileUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const viewContent = (
    <div className="space-y-3">
      <div>
        <p className="text-sm text-muted-foreground mb-1">Your Public Handle</p>
        <p className="font-medium font-mono">{handle || 'Not set'}</p>
      </div>
      {handle && (
        <div>
          <p className="text-sm text-muted-foreground mb-2">Your Public Profile URL</p>
          <div className="flex items-center gap-2 flex-wrap">
            <code className="text-sm bg-muted px-2 py-1 rounded font-mono">/m/{handle}</code>
            <Button variant="outline" size="sm" onClick={copyToClipboard} className="h-7">
              {copied ? (
                <>
                  <Check className="h-3 w-3 mr-1" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3 mr-1" />
                  Copy Link
                </>
              )}
            </Button>
            <Button variant="outline" size="sm" asChild className="h-7">
              <a href={`/m/${handle}`} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3 w-3 mr-1" />
                View Profile
              </a>
            </Button>
          </div>
        </div>
      )}
    </div>
  )

  const editContent = (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="handle">Public Handle</Label>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">/m/</span>
          <Input
            id="handle"
            {...register('handle')}
            placeholder="your-handle"
            className="font-mono"
            aria-invalid={!!errors.handle}
          />
        </div>
        {errors.handle && <p className="text-xs text-destructive">{errors.handle.message}</p>}
        <p className="text-xs text-muted-foreground">
          This will be your public profile URL. Use lowercase letters, numbers, and hyphens only.
        </p>
      </div>
      {currentHandle && (
        <div className="p-3 bg-muted rounded-md">
          <p className="text-sm text-muted-foreground">Preview URL:</p>
          <p className="font-mono text-sm">
            {typeof window !== 'undefined' ? window.location.origin : ''}/m/{currentHandle}
          </p>
        </div>
      )}
    </div>
  )

  return (
    <ProfileSection
      title="Public Profile"
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
