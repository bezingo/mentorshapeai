import { NextResponse } from 'next/server'
import { getCurrentProfile, requireAuth } from '@/lib/auth-helpers'
import { createServiceClient } from '@/lib/supabase/service'
import { validateOnboardingComplete, OnboardingFormData } from '@/lib/validations/onboarding'
import { isValidHandle } from '@/lib/utils/slug'

/**
 * POST /api/mentor/onboarding/complete
 * Finalize onboarding:
 * - Validate all steps complete
 * - Update profile.is_mentor=true
 * - Save all form_data to appropriate tables
 * - Set mentor_onboarding_completed_at
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

    // If user is already a mentor, they can't complete onboarding again
    if (profile.is_mentor) {
      return NextResponse.json(
        { error: { code: 'ONBOARDING_ALREADY_COMPLETE', message: 'User is already a mentor' } },
        { status: 409 }
      )
    }

    const supabase = createServiceClient()

    // Get current onboarding progress
    const { data: progress, error: fetchError } = await supabase
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

    // Check if already completed
    if (progress.completed_at) {
      return NextResponse.json(
        { error: { code: 'ONBOARDING_ALREADY_COMPLETE', message: 'Onboarding has already been completed' } },
        { status: 409 }
      )
    }

    const formData = progress.form_data as OnboardingFormData
    const completedSteps = progress.completed_steps || []

    // Validate all steps are complete
    const validation = validateOnboardingComplete(completedSteps, formData)
    if (!validation.valid) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Onboarding is not complete',
            details: validation.errors,
          },
        },
        { status: 400 }
      )
    }

    // Validate handle format
    const handleValidation = isValidHandle(formData.handle!)
    if (!handleValidation.valid) {
      return NextResponse.json(
        {
          error: {
            code: 'HANDLE_INVALID',
            message: handleValidation.error || 'Invalid handle format',
          },
        },
        { status: 400 }
      )
    }

    // Check handle availability (excluding current profile)
    const { data: existingHandle } = await supabase
      .from('profiles')
      .select('id')
      .eq('public_handle', formData.handle)
      .neq('id', profile.id)
      .single()

    if (existingHandle) {
      return NextResponse.json(
        { error: { code: 'HANDLE_TAKEN', message: 'This handle is already taken' } },
        { status: 409 }
      )
    }

    // Begin transaction-like operations
    // Note: Supabase doesn't support true transactions via JS client,
    // so we'll do operations in order and handle failures gracefully

    const now = new Date().toISOString()

    // 1. Update profile with mentor data
    const profileUpdateData: Record<string, unknown> = {
      is_mentor: true,
      mentor_onboarding_completed_at: now,
      bio: formData.bio,
      public_handle: formData.handle,
      timezone: formData.timezone,
      years_of_experience: formData.years_of_experience,
      expertise_areas: formData.expertise_areas,
      languages: formData.languages,
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .update(profileUpdateData)
      .eq('id', profile.id)

    if (profileError) {
      console.error('Error updating profile:', profileError)

      // Check for unique constraint violation on public_handle
      if (profileError.code === '23505' && profileError.message?.includes('public_handle')) {
        return NextResponse.json(
          { error: { code: 'HANDLE_TAKEN', message: 'This handle is already taken' } },
          { status: 409 }
        )
      }

      return NextResponse.json(
        { error: { code: 'UPDATE_FAILED', message: 'Failed to update profile' } },
        { status: 500 }
      )
    }

    // 2. Create or update skills in skills table
    if (formData.skills && formData.skills.length > 0) {
      // Get existing skills
      const { data: existingSkills } = await supabase
        .from('skills')
        .select('name')
        .eq('profile_id', profile.id)

      const existingSkillNames = new Set((existingSkills || []).map((s) => s.name))
      const newSkills = formData.skills.filter((skill) => !existingSkillNames.has(skill))

      if (newSkills.length > 0) {
        const skillsToInsert = newSkills.map((name) => ({
          profile_id: profile.id,
          name,
          proficiency_level: 'intermediate' as const,
        }))

        const { error: skillsError } = await supabase.from('skills').insert(skillsToInsert)

        if (skillsError) {
          console.error('Error inserting skills:', skillsError)
          // Non-critical, continue
        }
      }
    }

    // 3. Create availability records
    if (formData.availability && formData.availability.length > 0) {
      const availabilityRecords = formData.availability.map((slot) => ({
        profile_id: profile.id,
        day_of_week: slot.day_of_week,
        start_time: slot.start_time,
        end_time: slot.end_time,
        timezone: formData.timezone || 'UTC',
        is_active: true,
      }))

      const { error: availabilityError } = await supabase
        .from('mentor_availability')
        .insert(availabilityRecords)

      if (availabilityError) {
        console.error('Error inserting availability:', availabilityError)
        // Non-critical, continue
      }
    }

    // 4. Mark onboarding as complete
    const { error: completeError } = await supabase
      .from('mentor_onboarding_progress')
      .update({
        completed_at: now,
        completed_steps: [1, 2, 3, 4, 5, 6], // Mark all steps complete
        updated_at: now,
      })
      .eq('profile_id', profile.id)

    if (completeError) {
      console.error('Error marking onboarding complete:', completeError)
      // Non-critical, the profile is already updated
    }

    // Fetch updated profile
    const { data: updatedProfile, error: fetchProfileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', profile.id)
      .single()

    if (fetchProfileError) {
      console.error('Error fetching updated profile:', fetchProfileError)
    }

    return NextResponse.json({
      data: {
        success: true,
        profile: updatedProfile || { id: profile.id, is_mentor: true },
        message: 'Congratulations! You are now a mentor on Mentorshape.',
      },
    })
  } catch (error) {
    console.error('Error in POST /api/mentor/onboarding/complete:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to complete onboarding' } },
      { status: 500 }
    )
  }
}
