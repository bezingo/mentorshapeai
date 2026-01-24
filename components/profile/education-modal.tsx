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
import { Loader2, AlertTriangle } from 'lucide-react'
import type { Education } from './education-section'

// Zod schema for education form
const educationSchema = z.object({
  institution: z.string().min(1, 'Institution name is required').max(200),
  degree: z.string().min(1, 'Degree/Field of study is required').max(200),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().optional().nullable(),
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

type EducationFormData = z.infer<typeof educationSchema>

interface EducationModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: Omit<Education, 'id'>) => Promise<void>
  onDelete?: () => Promise<void>
  education: Education | null
  isSaving: boolean
}

export function EducationModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  education,
  isSaving,
}: EducationModalProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const isEditing = !!education

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<EducationFormData>({
    resolver: zodResolver(educationSchema),
    defaultValues: {
      institution: '',
      degree: '',
      start_date: '',
      end_date: '',
      is_current: false,
    },
  })

  const isCurrent = watch('is_current')

  // Reset form when modal opens or education changes
  useEffect(() => {
    if (isOpen) {
      if (education) {
        reset({
          institution: education.institution,
          degree: education.degree,
          start_date: education.start_date.substring(0, 7), // Convert to YYYY-MM for month input
          end_date: education.end_date ? education.end_date.substring(0, 7) : '',
          is_current: education.is_current,
        })
      } else {
        reset({
          institution: '',
          degree: '',
          start_date: '',
          end_date: '',
          is_current: false,
        })
      }
      setShowDeleteConfirm(false)
    }
  }, [isOpen, education, reset])

  // Clear end date when "currently study here" is checked
  useEffect(() => {
    if (isCurrent) {
      setValue('end_date', null)
    }
  }, [isCurrent, setValue])

  const onSubmit = async (data: EducationFormData) => {
    // Convert month format (YYYY-MM) to full date format (YYYY-MM-DD)
    const formattedData = {
      institution: data.institution,
      degree: data.degree,
      start_date: `${data.start_date}-01`,
      end_date: data.is_current || !data.end_date ? null : `${data.end_date}-01`,
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
            {isEditing ? 'Edit Education' : 'Add Education'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update your education details below.'
              : 'Add a new education entry to your profile.'}
          </DialogDescription>
        </DialogHeader>

        {showDeleteConfirm ? (
          <div className="py-4">
            <div className="flex items-center gap-3 p-4 rounded-lg bg-destructive/10 text-destructive">
              <AlertTriangle className="h-5 w-5 flex-shrink-0" />
              <div>
                <p className="font-medium">Delete this education?</p>
                <p className="text-sm opacity-90">
                  This action cannot be undone. This will permanently delete your education at{' '}
                  <strong>{education?.institution}</strong>.
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
              <Label htmlFor="institution">
                Institution Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="institution"
                {...register('institution')}
                placeholder="e.g., MIT, Stanford University"
                aria-invalid={!!errors.institution}
              />
              {errors.institution && (
                <p className="text-xs text-destructive">{errors.institution.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="degree">
                Degree / Field of Study <span className="text-destructive">*</span>
              </Label>
              <Input
                id="degree"
                {...register('degree')}
                placeholder="e.g., BS Computer Science, MBA"
                aria-invalid={!!errors.degree}
              />
              {errors.degree && (
                <p className="text-xs text-destructive">{errors.degree.message}</p>
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
                I currently study here
              </Label>
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
                {isEditing ? 'Save Changes' : 'Add Education'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
