'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Pencil, Trash2, Briefcase, Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import { WorkExperienceModal } from './work-experience-modal'

export interface WorkExperience {
  id: string
  company: string
  title: string
  start_date: string
  end_date: string | null
  description: string | null
  is_current: boolean
}

interface WorkHistorySectionProps {
  workExperiences: WorkExperience[]
  workHistoryPublic: boolean
  onAdd: (data: Omit<WorkExperience, 'id'>) => Promise<void>
  onEdit: (id: string, data: Partial<WorkExperience>) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onVisibilityChange: (isPublic: boolean) => Promise<void>
  className?: string
}

function formatDateRange(startDate: string, endDate: string | null, isCurrent: boolean): string {
  const startYear = new Date(startDate).getFullYear()

  if (isCurrent || !endDate) {
    return `${startYear}-Present`
  }

  const endYear = new Date(endDate).getFullYear()
  return `${startYear}-${endYear}`
}

export function WorkHistorySection({
  workExperiences,
  workHistoryPublic,
  onAdd,
  onEdit,
  onDelete,
  onVisibilityChange,
  className,
}: WorkHistorySectionProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingExperience, setEditingExperience] = useState<WorkExperience | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isTogglingVisibility, setIsTogglingVisibility] = useState(false)

  const handleAddClick = () => {
    setEditingExperience(null)
    setIsModalOpen(true)
  }

  const handleEditClick = (experience: WorkExperience) => {
    setEditingExperience(experience)
    setIsModalOpen(true)
  }

  const handleModalClose = () => {
    setIsModalOpen(false)
    setEditingExperience(null)
  }

  const handleSave = async (data: Omit<WorkExperience, 'id'>) => {
    setIsSaving(true)
    try {
      if (editingExperience) {
        await onEdit(editingExperience.id, data)
      } else {
        await onAdd(data)
      }
      handleModalClose()
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    setIsSaving(true)
    try {
      await onDelete(id)
      handleModalClose()
    } finally {
      setIsSaving(false)
    }
  }

  const handleVisibilityToggle = async () => {
    setIsTogglingVisibility(true)
    try {
      await onVisibilityChange(!workHistoryPublic)
    } finally {
      setIsTogglingVisibility(false)
    }
  }

  return (
    <>
      <Card className={cn('relative', className)}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Briefcase className="h-4 w-4" />
            Work History
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleVisibilityToggle}
              disabled={isTogglingVisibility}
              className="text-muted-foreground hover:text-foreground"
              title={workHistoryPublic ? 'Visible on public profile' : 'Hidden from public profile'}
            >
              {workHistoryPublic ? (
                <Eye className="h-4 w-4" />
              ) : (
                <EyeOff className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleAddClick}
              className="text-muted-foreground hover:text-foreground"
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Add Experience
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {workExperiences.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Briefcase className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>No work experience added yet</p>
              <Button
                variant="link"
                onClick={handleAddClick}
                className="mt-2"
              >
                Add your first experience
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {workExperiences.map((experience) => (
                <div
                  key={experience.id}
                  className="flex items-start justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{experience.title}</h4>
                      {experience.is_current && (
                        <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-300">
                          Current
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{experience.company}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDateRange(experience.start_date, experience.end_date, experience.is_current)}
                    </p>
                    {experience.description && (
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                        {experience.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 ml-4">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEditClick(experience)}
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    >
                      <Pencil className="h-4 w-4" />
                      <span className="sr-only">Edit</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditingExperience(experience)
                        setIsModalOpen(true)
                      }}
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Delete</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Visibility indicator */}
          <div className="mt-4 pt-4 border-t flex items-center gap-2 text-sm text-muted-foreground">
            {workHistoryPublic ? (
              <>
                <Eye className="h-4 w-4" />
                <span>Visible on public profile</span>
              </>
            ) : (
              <>
                <EyeOff className="h-4 w-4" />
                <span>Hidden from public profile</span>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <WorkExperienceModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSave={handleSave}
        onDelete={editingExperience ? () => handleDelete(editingExperience.id) : undefined}
        experience={editingExperience}
        isSaving={isSaving}
      />
    </>
  )
}
