'use client'

import { useEffect, useState } from 'react'
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
import { Textarea } from '@/components/ui/textarea'
import { Loader2, AlertTriangle } from 'lucide-react'
import type { WorkExperience } from './work-history-section'

// Zod schema for work experience form
const workExperienceSchema = z.object({
  company: z.string().min(1, 'Company name is required').max(200),
  title: z.string().min(1, 'Job title is required').max(200),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  is_current: z.boolean(),
}).refine(
  (data) => {
    if (data.is_current) return true
    if (!data.end_date) return true
    return new Date(data.end_date) >= new Date(data.start_date)
  },
  {
    message: 'End date must be after start date',
    path: ['end_date'],
  }
)

type WorkExperienceFormData = z.infer<typeof workExperienceSchema>

interface WorkExperienceModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: Omit<WorkExperience, 'id'>) => Promise<void>
  onDelete?: () => Promise<void>
  experience: WorkExperience | null
  isSaving: boolean
}

export function WorkExperienceModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  experience,
  isSaving,
}: WorkExperienceModalProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const isEditing = !!experience

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<WorkExperienceFormData>({
    resolver: zodResolver(workExperienceSchema),
    defaultValues: {
      company: '',
      title: '',
      start_date: '',
      end_date: '',
      description: '',
      is_current: false,
    },
  })

  const isCurrent = watch('is_current')

  // Reset form when modal opens or experience changes
  useEffect(() => {
    if (isOpen) {
      if (experience) {
        reset({
          company: experience.company,
          title: experience.title,
          start_date: experience.start_date.substring(0, 7), // Convert to YYYY-MM for month input
          end_date: experience.end_date ? experience.end_date.substring(0, 7) : '',
          description: experience.description || '',
          is_current: experience.is_current,
        })
      } else {
        reset({
          company: '',
          title: '',
          start_date: '',
          end_date: '',
          description: '',
          is_current: false,
        })
      }
      setShowDeleteConfirm(false)
    }
  }, [isOpen, experience, reset])

  // Clear end date when "currently work here" is checked
  useEffect(() => {
    if (isCurrent) {
      setValue('end_date', null)
    }
  }, [isCurrent, setValue])

  const onSubmit = async (data: WorkExperienceFormData) => {
    // Convert month format (YYYY-MM) to full date format (YYYY-MM-DD)
    const formattedData = {
      company: data.company,
      title: data.title,
      start_date: `${data.start_date}-01`,
      end_date: data.is_current || !data.end_date ? null : `${data.end_date}-01`,
      description: data.description || null,
      is_current: data.is_current,
    }
    await onSave(formattedData)
  }

  const handleDelete = async () => {
    if (onDelete) {
      await onDelete()
    }
  }

  const handleClose = () => {
    setShowDeleteConfirm(false)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Work Experience' : 'Add Work Experience'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update your work experience details below.'
              : 'Add a new work experience to your profile.'}
          </DialogDescription>
        </DialogHeader>

        {showDeleteConfirm ? (
          <div className="py-4">
            <div className="flex items-center gap-3 p-4 rounded-lg bg-destructive/10 text-destructive">
              <AlertTriangle className="h-5 w-5 flex-shrink-0" />
              <div>
                <p className="font-medium">Delete this experience?</p>
                <p className="text-sm opacity-90">
                  This action cannot be undone. This will permanently delete your work experience at{' '}
                  <strong>{experience?.company}</strong>.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={isSaving}
              >
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Delete
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="company">
                Company Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="company"
                {...register('company')}
                placeholder="e.g., Google"
                aria-invalid={!!errors.company}
              />
              {errors.company && (
                <p className="text-xs text-destructive">{errors.company.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">
                Job Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                {...register('title')}
                placeholder="e.g., Software Engineer"
                aria-invalid={!!errors.title}
              />
              {errors.title && (
                <p className="text-xs text-destructive">{errors.title.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_date">
                  Start Date <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="start_date"
                  type="month"
                  {...register('start_date')}
                  aria-invalid={!!errors.start_date}
                />
                {errors.start_date && (
                  <p className="text-xs text-destructive">{errors.start_date.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="end_date">End Date</Label>
                <Input
                  id="end_date"
                  type="month"
                  {...register('end_date')}
                  disabled={isCurrent}
                  className={isCurrent ? 'opacity-50 cursor-not-allowed' : ''}
                  aria-invalid={!!errors.end_date}
                />
                {errors.end_date && (
                  <p className="text-xs text-destructive">{errors.end_date.message}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_current"
                {...register('is_current')}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="is_current" className="text-sm font-normal cursor-pointer">
                I currently work here
              </Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                {...register('description')}
                placeholder="Describe your responsibilities and achievements..."
                rows={4}
                className="resize-none"
              />
              {errors.description && (
                <p className="text-xs text-destructive">{errors.description.message}</p>
              )}
            </div>

            <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
              {isEditing && onDelete && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={isSaving}
                  className="sm:mr-auto"
                >
                  Delete
                </Button>
              )}
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
                {isEditing ? 'Save Changes' : 'Add Experience'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
