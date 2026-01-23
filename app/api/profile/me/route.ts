import { NextResponse } from 'next/server'
import { getCurrentProfile } from '@/lib/clerk'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { z } from 'zod'

// Phone validation: international format (e.g., +1234567890)
const phoneRegex = /^\+[1-9]\d{1,14}$/

// IANA timezone validation (basic check - can be enhanced)
const timezoneRegex = /^[A-Za-z_]+\/[A-Za-z_]+$/

// Gender enum
const GenderEnum = z.enum(['Male', 'Female', 'Non-binary', 'Prefer not to say'])

// Text array validation: max 20 items, each item is a non-empty string
const textArraySchema = z
  .array(z.string().min(1).max(100))
  .max(20)
  .optional()

// Profile update schema
const ProfileUpdateSchema = z
  .object({
    // Existing fields
    display_name: z.string().min(1).max(200).optional(),
    headline: z.string().max(200).optional(),
    bio: z.string().max(1000).optional(),
    avatar_url: z.string().url().optional().nullable(),
    is_mentor: z.boolean().optional(),
    is_mentee: z.boolean().optional(),
    public_handle: z.string().max(50).optional().nullable(),

    // Personal info fields
    phone: z.string().regex(phoneRegex).optional().nullable(),
    date_of_birth: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .refine((date) => {
        const d = new Date(date)
        const now = new Date()
        const minDate = new Date('1900-01-01')
        return d <= now && d >= minDate
      }, 'Date must be valid and not in the future')
      .optional()
      .nullable(),
    gender: GenderEnum.optional().nullable(),
    nationality: z.string().max(100).optional().nullable(),

    // Location fields
    country: z.string().max(100).optional().nullable(),
    city: z.string().max(100).optional().nullable(),

    // Text array fields
    languages_spoken: textArraySchema,
    can_mentor_for: textArraySchema,
    want_to_learn: textArraySchema,
    specializations: textArraySchema,
    hobbies: textArraySchema,

    // Visibility toggles
    traits_public: z.boolean().optional(),
    work_history_public: z.boolean().optional(),
    education_public: z.boolean().optional(),
    skills_public: z.boolean().optional(),

    // Mentor-specific fields (only valid when is_mentor=true)
    expertise_areas: textArraySchema,
    languages: textArraySchema,
    timezone: z.string().regex(timezoneRegex).optional().nullable(),
    years_of_experience: z.number().int().min(0).max(50).optional().nullable(),
  })
  .refine(
    (data) => {
      // If mentor-specific fields are provided, is_mentor should be true
      const hasMentorFields =
        data.expertise_areas !== undefined ||
        data.languages !== undefined ||
        data.timezone !== undefined ||
        data.years_of_experience !== undefined

      if (hasMentorFields && data.is_mentor === false) {
        return false
      }
      return true
    },
    {
      message: 'Mentor-specific fields can only be updated when is_mentor is true',
    }
  )

export async function GET() {
  try {
    const profile = await getCurrentProfile()

    if (!profile) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      )
    }

    // Use service client since RLS policies expect Clerk JWT claims
    // which Supabase doesn't receive when using Clerk authentication
    // Authentication is already verified via getCurrentProfile() above
    const supabase = createServiceClient()

    // Fetch related data
    const [workExperiences, educations, skills] = await Promise.all([
      supabase
        .from('work_experiences')
        .select('*')
        .eq('profile_id', profile.id)
        .order('start_date', { ascending: false }),
      supabase
        .from('educations')
        .select('*')
        .eq('profile_id', profile.id)
        .order('start_date', { ascending: false }),
      supabase.from('skills').select('*').eq('profile_id', profile.id),
    ])

    return NextResponse.json({
      data: {
        ...profile,
        work_experiences: workExperiences.data || [],
        educations: educations.data || [],
        skills: skills.data || [],
      },
    })
  } catch (error) {
    console.error('Error fetching profile:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch profile' } },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request) {
  try {
    const profile = await getCurrentProfile()

    if (!profile) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      )
    }

    const body = await request.json()

    // Validate with Zod
    let validatedData
    try {
      validatedData = ProfileUpdateSchema.parse(body)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          {
            error: {
              code: 'VALIDATION_ERROR',
              message: error.errors[0]?.message || 'Validation failed',
              details: error.errors,
            },
          },
          { status: 400 }
        )
      }
      throw error
    }

    // Check mentor-specific fields restriction
    const hasMentorFields =
      validatedData.expertise_areas !== undefined ||
      validatedData.languages !== undefined ||
      validatedData.timezone !== undefined ||
      validatedData.years_of_experience !== undefined

    const isMentor = validatedData.is_mentor ?? profile.is_mentor

    if (hasMentorFields && !isMentor) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Mentor-specific fields can only be updated when is_mentor is true',
          },
        },
        { status: 400 }
      )
    }

    // Build update object (only include defined fields)
    const updateData: Record<string, any> = {}

    // Existing fields
    if (validatedData.display_name !== undefined) updateData.display_name = validatedData.display_name
    if (validatedData.headline !== undefined) updateData.headline = validatedData.headline
    if (validatedData.bio !== undefined) updateData.bio = validatedData.bio
    if (validatedData.avatar_url !== undefined) updateData.avatar_url = validatedData.avatar_url
    if (validatedData.is_mentor !== undefined) updateData.is_mentor = validatedData.is_mentor
    if (validatedData.is_mentee !== undefined) updateData.is_mentee = validatedData.is_mentee
    if (validatedData.public_handle !== undefined)
      updateData.public_handle = validatedData.public_handle

    // Personal info fields
    if (validatedData.phone !== undefined) updateData.phone = validatedData.phone
    if (validatedData.date_of_birth !== undefined)
      updateData.date_of_birth = validatedData.date_of_birth
    if (validatedData.gender !== undefined) updateData.gender = validatedData.gender
    if (validatedData.nationality !== undefined) updateData.nationality = validatedData.nationality

    // Location fields
    if (validatedData.country !== undefined) updateData.country = validatedData.country
    if (validatedData.city !== undefined) updateData.city = validatedData.city

    // Text array fields
    if (validatedData.languages_spoken !== undefined)
      updateData.languages_spoken = validatedData.languages_spoken
    if (validatedData.can_mentor_for !== undefined)
      updateData.can_mentor_for = validatedData.can_mentor_for
    if (validatedData.want_to_learn !== undefined)
      updateData.want_to_learn = validatedData.want_to_learn
    if (validatedData.specializations !== undefined)
      updateData.specializations = validatedData.specializations
    if (validatedData.hobbies !== undefined) updateData.hobbies = validatedData.hobbies

    // Visibility toggles
    if (validatedData.traits_public !== undefined)
      updateData.traits_public = validatedData.traits_public
    if (validatedData.work_history_public !== undefined)
      updateData.work_history_public = validatedData.work_history_public
    if (validatedData.education_public !== undefined)
      updateData.education_public = validatedData.education_public
    if (validatedData.skills_public !== undefined)
      updateData.skills_public = validatedData.skills_public

    // Mentor-specific fields (only if is_mentor is true)
    if (isMentor) {
      if (validatedData.expertise_areas !== undefined)
        updateData.expertise_areas = validatedData.expertise_areas
      if (validatedData.languages !== undefined) updateData.languages = validatedData.languages
      if (validatedData.timezone !== undefined) updateData.timezone = validatedData.timezone
      if (validatedData.years_of_experience !== undefined)
        updateData.years_of_experience = validatedData.years_of_experience
    }

    // Use service client since RLS policies expect Clerk JWT claims
    // which Supabase doesn't receive when using Clerk authentication
    // Authentication is already verified via getCurrentProfile() above
    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', profile.id)
      .select()

    if (error) {
      console.error('Error updating profile:', error)

      // Check for unique constraint violation on public_handle
      if (error.code === '23505' && error.message?.includes('public_handle')) {
        return NextResponse.json(
          { error: { code: 'HANDLE_TAKEN', message: 'This handle is already taken. Please choose a different one.' } },
          { status: 409 }
        )
      }

      return NextResponse.json(
        { error: { code: 'UPDATE_FAILED', message: error.message } },
        { status: 500 }
      )
    }

    // data is an array, return first element
    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: { code: 'UPDATE_FAILED', message: 'Profile not found' } },
        { status: 404 }
      )
    }

    return NextResponse.json({ data: data[0] })
  } catch (error) {
    console.error('Error updating profile:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to update profile' } },
      { status: 500 }
    )
  }
}




