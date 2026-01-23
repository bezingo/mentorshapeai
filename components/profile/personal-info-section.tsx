'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ProfileSection } from './profile-section'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

// Zod schema for personal info
const personalInfoSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  headline: z.string().max(200).optional(),
  phone: z
    .string()
    .regex(/^\+[1-9]\d{1,14}$/, 'Phone must be in international format (e.g., +1234567890)')
    .optional()
    .nullable()
    .or(z.literal('')),
  dateOfBirth: z
    .string()
    .optional()
    .nullable()
    .refine(
      (date) => {
        if (!date) return true
        const d = new Date(date)
        const now = new Date()
        return d <= now
      },
      { message: 'Date of birth cannot be in the future' }
    ),
  gender: z.enum(['Male', 'Female', 'Non-binary', 'Prefer not to say']).optional().nullable(),
  nationality: z.string().max(100).optional().nullable(),
})

type PersonalInfoFormData = z.infer<typeof personalInfoSchema>

interface PersonalInfoSectionProps {
  displayName: string | null
  headline: string | null
  email: string
  phone: string | null
  dateOfBirth: string | null
  gender: string | null
  nationality: string | null
  onSave: (data: {
    display_name: string
    headline?: string
    phone?: string | null
    date_of_birth?: string | null
    gender?: string | null
    nationality?: string | null
  }) => Promise<void>
  className?: string
}

// Common nationalities list (subset for demo, can be expanded)
const NATIONALITIES = [
  'Afghan',
  'Albanian',
  'Algerian',
  'American',
  'Andorran',
  'Angolan',
  'Argentine',
  'Armenian',
  'Australian',
  'Austrian',
  'Azerbaijani',
  'Bahamian',
  'Bahraini',
  'Bangladeshi',
  'Belgian',
  'Brazilian',
  'British',
  'Bulgarian',
  'Cambodian',
  'Cameroonian',
  'Canadian',
  'Chilean',
  'Chinese',
  'Colombian',
  'Croatian',
  'Cuban',
  'Czech',
  'Danish',
  'Dutch',
  'Egyptian',
  'Emirati',
  'Estonian',
  'Ethiopian',
  'Filipino',
  'Finnish',
  'French',
  'German',
  'Ghanaian',
  'Greek',
  'Hungarian',
  'Icelandic',
  'Indian',
  'Indonesian',
  'Iranian',
  'Iraqi',
  'Irish',
  'Israeli',
  'Italian',
  'Jamaican',
  'Japanese',
  'Jordanian',
  'Kazakh',
  'Kenyan',
  'Korean',
  'Kuwaiti',
  'Lebanese',
  'Libyan',
  'Lithuanian',
  'Malaysian',
  'Mexican',
  'Moroccan',
  'Nepalese',
  'New Zealander',
  'Nigerian',
  'Norwegian',
  'Omani',
  'Pakistani',
  'Palestinian',
  'Panamanian',
  'Peruvian',
  'Polish',
  'Portuguese',
  'Qatari',
  'Romanian',
  'Russian',
  'Saudi',
  'Serbian',
  'Singaporean',
  'Slovak',
  'Slovenian',
  'South African',
  'Spanish',
  'Sri Lankan',
  'Sudanese',
  'Swedish',
  'Swiss',
  'Syrian',
  'Taiwanese',
  'Thai',
  'Tunisian',
  'Turkish',
  'Ukrainian',
  'Venezuelan',
  'Vietnamese',
  'Yemeni',
  'Zambian',
  'Zimbabwean',
]

const GENDERS = ['Male', 'Female', 'Non-binary', 'Prefer not to say']

// Simple Badge component
function Badge({
  children,
  variant = 'default',
  className,
}: {
  children: React.ReactNode
  variant?: 'default' | 'secondary'
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        variant === 'secondary'
          ? 'bg-secondary text-secondary-foreground'
          : 'bg-primary text-primary-foreground',
        className
      )}
    >
      {children}
    </span>
  )
}

export function PersonalInfoSection({
  displayName,
  headline,
  email,
  phone,
  dateOfBirth,
  gender,
  nationality,
  onSave,
  className,
}: PersonalInfoSectionProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Split display name into first and last name
  const [firstName, ...lastNameParts] = (displayName || '').split(' ')
  const lastName = lastNameParts.join(' ')

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<PersonalInfoFormData>({
    resolver: zodResolver(personalInfoSchema),
    defaultValues: {
      firstName: firstName || '',
      lastName: lastName || '',
      headline: headline || '',
      phone: phone || '',
      dateOfBirth: dateOfBirth || '',
      gender: (gender as PersonalInfoFormData['gender']) || undefined,
      nationality: nationality || '',
    },
  })

  // Reset form when props change
  useEffect(() => {
    const [fn, ...ln] = (displayName || '').split(' ')
    reset({
      firstName: fn || '',
      lastName: ln.join(' ') || '',
      headline: headline || '',
      phone: phone || '',
      dateOfBirth: dateOfBirth || '',
      gender: (gender as PersonalInfoFormData['gender']) || undefined,
      nationality: nationality || '',
    })
  }, [displayName, headline, phone, dateOfBirth, gender, nationality, reset])

  const handleSave = async () => {
    handleSubmit(async (data) => {
      setIsSaving(true)
      try {
        await onSave({
          display_name: `${data.firstName} ${data.lastName}`.trim(),
          headline: data.headline || undefined,
          phone: data.phone || null,
          date_of_birth: data.dateOfBirth || null,
          gender: data.gender || null,
          nationality: data.nationality || null,
        })
        setIsEditing(false)
      } finally {
        setIsSaving(false)
      }
    })()
  }

  const handleCancel = () => {
    const [fn, ...ln] = (displayName || '').split(' ')
    reset({
      firstName: fn || '',
      lastName: ln.join(' ') || '',
      headline: headline || '',
      phone: phone || '',
      dateOfBirth: dateOfBirth || '',
      gender: (gender as PersonalInfoFormData['gender']) || undefined,
      nationality: nationality || '',
    })
  }

  const viewContent = (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <div>
        <p className="text-sm text-muted-foreground mb-1">Full Name</p>
        <p className="font-medium">{displayName || 'Not set'}</p>
      </div>
      <div>
        <p className="text-sm text-muted-foreground mb-1">Email</p>
        <div className="flex items-center gap-2">
          <p className="font-medium">{email}</p>
          <Badge variant="secondary" className="text-xs">
            Verified
          </Badge>
        </div>
      </div>
      <div>
        <p className="text-sm text-muted-foreground mb-1">Phone</p>
        <p className="font-medium">{phone || 'Not set'}</p>
      </div>
      {headline && (
        <div className="sm:col-span-2 lg:col-span-3">
          <p className="text-sm text-muted-foreground mb-1">Headline</p>
          <p className="font-medium">{headline}</p>
        </div>
      )}
    </div>
  )

  const editContent = (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName">First Name</Label>
          <Input
            id="firstName"
            {...register('firstName')}
            placeholder="Enter first name"
            aria-invalid={!!errors.firstName}
          />
          {errors.firstName && (
            <p className="text-xs text-destructive">{errors.firstName.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">Last Name</Label>
          <Input
            id="lastName"
            {...register('lastName')}
            placeholder="Enter last name"
            aria-invalid={!!errors.lastName}
          />
          {errors.lastName && (
            <p className="text-xs text-destructive">{errors.lastName.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="headline">Headline</Label>
        <Input
          id="headline"
          {...register('headline')}
          placeholder="e.g., Software Engineer at Google"
        />
        {errors.headline && (
          <p className="text-xs text-destructive">{errors.headline.message}</p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" value={email} disabled className="bg-muted" />
          <p className="text-xs text-muted-foreground">Email is managed by your account</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            {...register('phone')}
            placeholder="+1234567890"
            aria-invalid={!!errors.phone}
          />
          {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="dateOfBirth">Date of Birth</Label>
          <Input
            id="dateOfBirth"
            type="date"
            {...register('dateOfBirth')}
            max={new Date().toISOString().split('T')[0]}
            aria-invalid={!!errors.dateOfBirth}
          />
          {errors.dateOfBirth && (
            <p className="text-xs text-destructive">{errors.dateOfBirth.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="gender">Gender</Label>
          <Select
            value={watch('gender') || ''}
            onValueChange={(value) =>
              setValue('gender', value as PersonalInfoFormData['gender'])
            }
          >
            <SelectTrigger id="gender" className="w-full">
              <SelectValue placeholder="Select gender" />
            </SelectTrigger>
            <SelectContent>
              {GENDERS.map((g) => (
                <SelectItem key={g} value={g}>
                  {g}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.gender && (
            <p className="text-xs text-destructive">{errors.gender.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="nationality">Nationality</Label>
          <Select
            value={watch('nationality') || ''}
            onValueChange={(value) => setValue('nationality', value)}
          >
            <SelectTrigger id="nationality" className="w-full">
              <SelectValue placeholder="Select nationality" />
            </SelectTrigger>
            <SelectContent>
              {NATIONALITIES.map((n) => (
                <SelectItem key={n} value={n}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.nationality && (
            <p className="text-xs text-destructive">{errors.nationality.message}</p>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <ProfileSection
      title="Personal Info"
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
