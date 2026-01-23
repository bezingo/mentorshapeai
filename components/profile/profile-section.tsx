'use client'

import { useState, ReactNode } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Pencil, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ProfileSectionProps {
  title: string
  viewContent: ReactNode
  editContent: ReactNode
  onSave: () => Promise<void> | void
  onCancel?: () => void
  isEditing?: boolean
  onEditingChange?: (isEditing: boolean) => void
  isSaving?: boolean
  className?: string
  hideEditButton?: boolean
}

export function ProfileSection({
  title,
  viewContent,
  editContent,
  onSave,
  onCancel,
  isEditing: externalIsEditing,
  onEditingChange,
  isSaving = false,
  className,
  hideEditButton = false,
}: ProfileSectionProps) {
  const [internalIsEditing, setInternalIsEditing] = useState(false)

  // Use external control if provided, otherwise use internal state
  const isEditing = externalIsEditing ?? internalIsEditing
  const setIsEditing = onEditingChange ?? setInternalIsEditing

  const handleEdit = () => {
    setIsEditing(true)
  }

  const handleCancel = () => {
    setIsEditing(false)
    onCancel?.()
  }

  const handleSave = async () => {
    await onSave()
    setIsEditing(false)
  }

  return (
    <Card className={cn('relative', className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
        {!isEditing && !hideEditButton && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleEdit}
            className="text-muted-foreground hover:text-foreground"
          >
            <Pencil className="mr-1.5 h-4 w-4" />
            Edit
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <div className="space-y-4">
            {editContent}
            <div className="flex items-center justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save changes
              </Button>
            </div>
          </div>
        ) : (
          viewContent
        )}
      </CardContent>
    </Card>
  )
}
