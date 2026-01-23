'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Pencil, Trash2, GraduationCap, Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import { EducationModal } from './education-modal'

export interface Education {
  id: string
  institution: string
  degree: string
  start_date: string
  end_date: string | null
  is_current: boolean
}

interface EducationSectionProps {
  educations: Education[]
  educationPublic: boolean
  onAdd: (data: Omit<Education, 'id'>) => Promise<void>
  onEdit: (id: string, data: Partial<Education>) => Promise<void>
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

export function EducationSection({
  educations,
  educationPublic,
  onAdd,
  onEdit,
  onDelete,
  onVisibilityChange,
  className,
}: EducationSectionProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingEducation, setEditingEducation] = useState<Education | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isTogglingVisibility, setIsTogglingVisibility] = useState(false)

  const handleAddClick = () => {
    setEditingEducation(null)
    setIsModalOpen(true)
  }

  const handleEditClick = (education: Education) => {
    setEditingEducation(education)
    setIsModalOpen(true)
  }

  const handleModalClose = () => {
    setIsModalOpen(false)
    setEditingEducation(null)
  }

  const handleSave = async (data: Omit<Education, 'id'>) => {
    setIsSaving(true)
    try {
      if (editingEducation) {
        await onEdit(editingEducation.id, data)
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
      await onVisibilityChange(!educationPublic)
    } finally {
      setIsTogglingVisibility(false)
    }
  }

  return (
    <>
      <Card className={cn('relative', className)}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <GraduationCap className="h-4 w-4" />
            Education
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleVisibilityToggle}
              disabled={isTogglingVisibility}
              className="text-muted-foreground hover:text-foreground"
              title={educationPublic ? 'Visible on public profile' : 'Hidden from public profile'}
            >
              {educationPublic ? (
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
              Add Education
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {educations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <GraduationCap className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>No education added yet</p>
              <Button
                variant="link"
                onClick={handleAddClick}
                className="mt-2"
              >
                Add your first education
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {educations.map((education) => (
                <div
                  key={education.id}
                  className="flex items-start justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{education.degree}</h4>
                      {education.is_current && (
                        <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                          Current
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{education.institution}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDateRange(education.start_date, education.end_date, education.is_current)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 ml-4">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEditClick(education)}
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    >
                      <Pencil className="h-4 w-4" />
                      <span className="sr-only">Edit</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditingEducation(education)
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
            {educationPublic ? (
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

      <EducationModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSave={handleSave}
        onDelete={editingEducation ? () => handleDelete(editingEducation.id) : undefined}
        education={editingEducation}
        isSaving={isSaving}
      />
    </>
  )
}
