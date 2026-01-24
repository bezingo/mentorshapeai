import { NextResponse } from 'next/server'
import { getCurrentProfile, requireAuth } from '@/lib/clerk'
import { createServiceClient } from '@/lib/supabase/service'
import { z } from 'zod'
import {
  UpdateOnboardingSchema,
  OnboardingFormDataSchema,
  validateStep,
} from '@/lib/validations/onboarding'

/**
 * GET /api/mentor/onboarding
 * Fetch current onboarding progress for authenticated user
 * Returns 404 if not started
 */
export async function GET() {
  try {
    await requireAuth()
    const profile = await getCurrentProfile()

    if (!profile) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      )
    }

    // If user is already a mentor, return appropriate response
    if (profile.is_mentor) {
      return NextResponse.json(
        { error: { code: 'ONBOARDING_ALREADY_COMPLETE', message: 'User is already a mentor' } },
        { status: 409 }
      )
    }

    const supabase = createServiceClient()

    const { data: progress, error } = await supabase
      .from('mentor_onboarding_progress')
      .select('*')
      .eq('profile_id', profile.id)
      .single()

    if (error) {
      // PGRST116 = no rows returned
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: { code: 'ONBOARDING_NOT_STARTED', message: 'Onboarding has not been started' } },
          { status: 404 }
        )
      }
      console.error('Error fetching onboarding progress:', error)
      return NextResponse.json(
        { error: { code: 'FETCH_FAILED', message: error.message } },
        { status: 500 }
      )
    }

    return NextResponse.json({ data: progress })
  } catch (error) {
    console.error('Error in GET /api/mentor/onboarding:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch onboarding progress' } },
      { status: 500 }
    )
  }
}

/**
 * POST /api/mentor/onboarding
 * Initialize onboarding record for user
 * Pre-fills form_data from existing profile
 */
export async function POST() {
  try {
    await requireAuth()
    const profile = await getCurrentProfile()

    if (!profile) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      )
    }

    // If user is already a mentor, they can't start onboarding
    if (profile.is_mentor) {
      return NextResponse.json(
        { error: { code: 'ONBOARDING_ALREADY_COMPLETE', message: 'User is already a mentor' } },
        { status: 409 }
      )
    }

    const supabase = createServiceClient()

    // Check if onboarding already exists
    const { data: existing } = await supabase
      .from('mentor_onboarding_progress')
      .select('id')
      .eq('profile_id', profile.id)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: { code: 'ONBOARDING_ALREADY_STARTED', message: 'Onboarding has already been started' } },
        { status: 409 }
      )
    }

    // Pre-fill form_data from existing profile
    const formData: Record<string, unknown> = {}

    // Pre-fill bio if available
    if (profile.bio) {
      formData.bio = profile.bio
    }

    // Pre-fill languages_spoken as languages
    if (profile.languages_spoken && Array.isArray(profile.languages_spoken)) {
      formData.languages = profile.languages_spoken
    }

    // Pre-fill can_mentor_for as expertise_areas
    if (profile.can_mentor_for && Array.isArray(profile.can_mentor_for)) {
      formData.expertise_areas = profile.can_mentor_for
    }

    // Pre-fill specializations as skills
    if (profile.specializations && Array.isArray(profile.specializations)) {
      formData.skills = profile.specializations
    }

    // Pre-fill timezone if available
    if (profile.timezone) {
      formData.timezone = profile.timezone
    } else {
      // Default to UTC if no timezone set
      formData.timezone = 'UTC'
    }

    // Pre-fill years_of_experience if available
    if (profile.years_of_experience !== null && profile.years_of_experience !== undefined) {
      formData.years_of_experience = profile.years_of_experience
    }

    // Pre-fill handle from public_handle if available
    if (profile.public_handle) {
      formData.handle = profile.public_handle
    }

    // Fetch existing skills from skills table
    const { data: skillsData } = await supabase
      .from('skills')
      .select('name')
      .eq('profile_id', profile.id)

    if (skillsData && skillsData.length > 0) {
      // Merge with any existing skills in formData
      const existingSkills = (formData.skills as string[]) || []
      const dbSkills = skillsData.map((s) => s.name)
      formData.skills = [...new Set([...existingSkills, ...dbSkills])]
    }

    // Create onboarding record
    const { data: progress, error } = await supabase
      .from('mentor_onboarding_progress')
      .insert({
        profile_id: profile.id,
        current_step: 1,
        completed_steps: [],
        form_data: formData,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating onboarding progress:', error)
      return NextResponse.json(
        { error: { code: 'CREATE_FAILED', message: error.message } },
        { status: 500 }
      )
    }

    return NextResponse.json({ data: progress }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/mentor/onboarding:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to initialize onboarding' } },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/mentor/onboarding
 * Update current step, mark steps complete, merge form_data updates
 */
export async function PATCH(request: Request) {
  try {
    await requireAuth()
    const profile = await getCurrentProfile()

    if (!profile) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      )
    }

    // If user is already a mentor, they can't update onboarding
    if (profile.is_mentor) {
      return NextResponse.json(
        { error: { code: 'ONBOARDING_ALREADY_COMPLETE', message: 'User is already a mentor' } },
        { status: 409 }
      )
    }

    const body = await request.json()

    // Validate request body
    let validatedData
    try {
      validatedData = UpdateOnboardingSchema.parse(body)
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

    const supabase = createServiceClient()

    // Get current progress
    const { data: currentProgress, error: fetchError } = await supabase
      .from('mentor_onboarding_progress')
      .select('*')
      .eq('profile_id', profile.id)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json(
          { error: { code: 'ONBOARDING_NOT_STARTED', message: 'Onboarding has not been started' } },
          { status: 404 }
        )
      }
      console.error('Error fetching onboarding progress:', fetchError)
      return NextResponse.json(
        { error: { code: 'FETCH_FAILED', message: fetchError.message } },
        { status: 500 }
      )
    }

    // Build update object
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    // Update current_step if provided
    if (validatedData.current_step !== undefined) {
      updateData.current_step = validatedData.current_step
    }

    // Update completed_steps if provided (merge with existing)
    if (validatedData.completed_steps !== undefined) {
      const existingSteps = currentProgress.completed_steps || []
      const newSteps = validatedData.completed_steps
      // Merge and deduplicate
      const mergedSteps = [...new Set([...existingSteps, ...newSteps])].sort((a, b) => a - b)
      updateData.completed_steps = mergedSteps
    }

    // Merge form_data if provided
    if (validatedData.form_data !== undefined) {
      const existingFormData = currentProgress.form_data || {}
      const newFormData = validatedData.form_data

      // Deep merge form_data (new values override existing)
      const mergedFormData = {
        ...existingFormData,
        ...newFormData,
      }

      // Validate merged form_data
      try {
        OnboardingFormDataSchema.parse(mergedFormData)
      } catch (error) {
        if (error instanceof z.ZodError) {
          return NextResponse.json(
            {
              error: {
                code: 'VALIDATION_ERROR',
                message: 'Invalid form data: ' + error.errors[0]?.message,
                details: error.errors,
              },
            },
            { status: 400 }
          )
        }
        throw error
      }

      updateData.form_data = mergedFormData
    }

    // If marking a step as complete, validate that step's data
    if (validatedData.completed_steps !== undefined) {
      const newlyCompletedSteps = validatedData.completed_steps.filter(
        (step: number) => !(currentProgress.completed_steps || []).includes(step)
      )

      for (const step of newlyCompletedSteps) {
        const formDataToValidate = updateData.form_data || currentProgress.form_data || {}
        const stepValidation = validateStep(step, formDataToValidate as Record<string, unknown>)

        if (!stepValidation.valid) {
          return NextResponse.json(
            {
              error: {
                code: 'STEP_VALIDATION_FAILED',
                message: `Step ${step} validation failed`,
                details: stepValidation.errors,
              },
            },
            { status: 400 }
          )
        }
      }
    }

    // Update progress
    const { data: progress, error: updateError } = await supabase
      .from('mentor_onboarding_progress')
      .update(updateData)
      .eq('profile_id', profile.id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating onboarding progress:', updateError)
      return NextResponse.json(
        { error: { code: 'UPDATE_FAILED', message: updateError.message } },
        { status: 500 }
      )
    }

    return NextResponse.json({ data: progress })
  } catch (error) {
    console.error('Error in PATCH /api/mentor/onboarding:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to update onboarding progress' } },
      { status: 500 }
    )
  }
}
