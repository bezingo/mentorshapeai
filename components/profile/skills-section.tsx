'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Pencil, Lightbulb, Eye, EyeOff, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SkillModal } from './skill-modal'

export interface Skill {
  id: string
  name: string
  level: 'Beginner' | 'Intermediate' | 'Advanced'
}

interface SkillsSectionProps {
  skills: Skill[]
  skillsPublic: boolean
  onAdd: (data: Omit<Skill, 'id'>) => Promise<void>
  onEdit: (id: string, data: Partial<Skill>) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onVisibilityChange: (isPublic: boolean) => Promise<void>
  className?: string
}

const MAX_SKILLS = 50

const skillLevelColors = {
  Beginner: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  Intermediate: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  Advanced: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
}

export function SkillsSection({
  skills,
  skillsPublic,
  onAdd,
  onEdit,
  onDelete,
  onVisibilityChange,
  className,
}: SkillsSectionProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isTogglingVisibility, setIsTogglingVisibility] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)

  const handleAddClick = () => {
    if (skills.length >= MAX_SKILLS) {
      return
    }
    setEditingSkill(null)
    setIsModalOpen(true)
  }

  const handleEditClick = (skill: Skill) => {
    setEditingSkill(skill)
    setIsModalOpen(true)
  }

  const handleModalClose = () => {
    setIsModalOpen(false)
    setEditingSkill(null)
  }

  const handleSave = async (data: Omit<Skill, 'id'>) => {
    setIsSaving(true)
    try {
      if (editingSkill) {
        await onEdit(editingSkill.id, data)
      } else {
        await onAdd(data)
      }
      handleModalClose()
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteClick = (skillId: string) => {
    setShowDeleteConfirm(skillId)
  }

  const handleConfirmDelete = async (skillId: string) => {
    setIsSaving(true)
    try {
      await onDelete(skillId)
      setShowDeleteConfirm(null)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancelDelete = () => {
    setShowDeleteConfirm(null)
  }

  const handleVisibilityToggle = async () => {
    setIsTogglingVisibility(true)
    try {
      await onVisibilityChange(!skillsPublic)
    } finally {
      setIsTogglingVisibility(false)
    }
  }

  const isAtLimit = skills.length >= MAX_SKILLS

  return (
    <>
      <Card className={cn('relative', className)}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Lightbulb className="h-4 w-4" />
            Skills
            <span className="text-sm font-normal text-muted-foreground">
              ({skills.length}/{MAX_SKILLS})
            </span>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleVisibilityToggle}
              disabled={isTogglingVisibility}
              className="text-muted-foreground hover:text-foreground"
              title={skillsPublic ? 'Visible on public profile' : 'Hidden from public profile'}
            >
              {skillsPublic ? (
                <Eye className="h-4 w-4" />
              ) : (
                <EyeOff className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleAddClick}
              disabled={isAtLimit}
              className="text-muted-foreground hover:text-foreground"
              title={isAtLimit ? `Maximum ${MAX_SKILLS} skills reached` : 'Add Skill'}
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Add Skill
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {skills.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Lightbulb className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>No skills added yet</p>
              <Button
                variant="link"
                onClick={handleAddClick}
                className="mt-2"
              >
                Add your first skill
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {skills.map((skill) => (
                <div
                  key={skill.id}
                  className={cn(
                    'group relative inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-all',
                    skillLevelColors[skill.level],
                    'hover:ring-2 hover:ring-offset-1 hover:ring-primary/20'
                  )}
                >
                  <span>{skill.name}</span>

                  {/* Edit/Delete actions on hover */}
                  <div className="hidden group-hover:flex items-center gap-0.5 ml-1">
                    <button
                      type="button"
                      onClick={() => handleEditClick(skill)}
                      className="p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10"
                      title="Edit skill"
                    >
                      <Pencil className="h-3 w-3" />
                      <span className="sr-only">Edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteClick(skill.id)}
                      className="p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10"
                      title="Delete skill"
                    >
                      <X className="h-3 w-3" />
                      <span className="sr-only">Delete</span>
                    </button>
                  </div>

                  {/* Delete confirmation overlay */}
                  {showDeleteConfirm === skill.id && (
                    <div className="absolute inset-0 flex items-center gap-1 bg-destructive text-destructive-foreground rounded-full px-2 animate-in fade-in duration-150">
                      <span className="text-xs whitespace-nowrap">Delete?</span>
                      <button
                        type="button"
                        onClick={() => handleConfirmDelete(skill.id)}
                        disabled={isSaving}
                        className="p-0.5 rounded bg-white/20 hover:bg-white/30 text-xs font-medium"
                      >
                        Yes
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelDelete}
                        disabled={isSaving}
                        className="p-0.5 rounded bg-white/20 hover:bg-white/30 text-xs font-medium"
                      >
                        No
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Limit warning */}
          {isAtLimit && (
            <div className="mt-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 text-sm">
              Maximum of {MAX_SKILLS} skills reached. Remove some skills to add new ones.
            </div>
          )}

          {/* Visibility indicator */}
          <div className="mt-4 pt-4 border-t flex items-center gap-2 text-sm text-muted-foreground">
            {skillsPublic ? (
              <>
                <Eye className="h-4 w-4" />
                <span>Visible on public profile (skill levels are not shown publicly)</span>
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

      <SkillModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSave={handleSave}
        skill={editingSkill}
        isSaving={isSaving}
        currentSkillCount={skills.length}
        maxSkills={MAX_SKILLS}
      />
    </>
  )
}
