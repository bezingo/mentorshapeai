'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Skill } from './skills-section'

// Zod schema for skill form
const skillSchema = z.object({
  name: z.string().min(1, 'Skill name is required').max(100),
  level: z.enum(['Beginner', 'Intermediate', 'Advanced']),
})

type SkillFormData = z.infer<typeof skillSchema>

interface SkillModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: Omit<Skill, 'id'>) => Promise<void>
  skill: Skill | null
  isSaving: boolean
  currentSkillCount: number
  maxSkills: number
}

const skillLevelDescriptions = {
  Beginner: 'Learning the basics',
  Intermediate: 'Can work independently',
  Advanced: 'Expert level proficiency',
}

export function SkillModal({
  isOpen,
  onClose,
  onSave,
  skill,
  isSaving,
  currentSkillCount,
  maxSkills,
}: SkillModalProps) {
  const isEditing = !!skill
  const canAddMore = isEditing || currentSkillCount < maxSkills

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<SkillFormData>({
    resolver: zodResolver(skillSchema),
    defaultValues: {
      name: '',
      level: 'Intermediate',
    },
  })

  const selectedLevel = watch('level')

  // Reset form when modal opens or skill changes
  useEffect(() => {
    if (isOpen) {
      if (skill) {
        reset({
          name: skill.name,
          level: skill.level,
        })
      } else {
        reset({
          name: '',
          level: 'Intermediate',
        })
      }
    }
  }, [isOpen, skill, reset])

  const onSubmit = async (data: SkillFormData) => {
    await onSave(data)
  }

  const handleClose = () => {
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Skill' : 'Add Skill'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update your skill details below.'
              : 'Add a new skill to your profile. Skill level is used for AI matching and is not displayed publicly.'}
          </DialogDescription>
        </DialogHeader>

        {!canAddMore ? (
          <div className="py-4 text-center text-muted-foreground">
            <p>You have reached the maximum of {maxSkills} skills.</p>
            <p className="text-sm mt-1">Remove some skills to add new ones.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">
                Skill Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                {...register('name')}
                placeholder="e.g., JavaScript, Project Management, Public Speaking"
                aria-invalid={!!errors.name}
                autoComplete="off"
              />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-3">
              <Label>
                Proficiency Level <span className="text-destructive">*</span>
              </Label>
              <p className="text-xs text-muted-foreground">
                Used for AI matching - not displayed on your public profile
              </p>
              <RadioGroup
                value={selectedLevel}
                onValueChange={(value: 'Beginner' | 'Intermediate' | 'Advanced') => setValue('level', value)}
                className="grid grid-cols-3 gap-2"
              >
                {(['Beginner', 'Intermediate', 'Advanced'] as const).map((level) => (
                  <div key={level} className="relative">
                    <RadioGroupItem
                      value={level}
                      id={`level-${level}`}
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor={`level-${level}`}
                      className={cn(
                        'flex flex-col items-center justify-center rounded-lg border-2 p-3 cursor-pointer transition-all',
                        'hover:bg-accent hover:text-accent-foreground',
                        'peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2',
                        selectedLevel === level
                          ? 'border-primary bg-primary/5'
                          : 'border-muted'
                      )}
                    >
                      <span className="text-sm font-medium">{level}</span>
                      <span className="text-xs text-muted-foreground text-center mt-1">
                        {skillLevelDescriptions[level]}
                      </span>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
              {errors.level && (
                <p className="text-xs text-destructive">{errors.level.message}</p>
              )}
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? 'Save Changes' : 'Add Skill'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
