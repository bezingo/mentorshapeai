import { NextResponse } from 'next/server'
import { getCurrentProfile } from '@/lib/auth-helpers'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

// Education update schema (all fields optional)
const EducationUpdateSchema = z.object({
  institution: z.string().min(1).max(200).optional(),
  degree: z.string().min(1).max(200).optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  is_current: z.boolean().optional(),
})

/**
 * GET /api/profile/educations/[id]
 * Fetch single education (verify ownership)
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const profile = await getCurrentProfile()

    if (!profile) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      )
    }

    const { id } = await params
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('educations')
      .select('*')
      .eq('id', id)
      .eq('profile_id', profile.id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: { code: 'NOT_FOUND', message: 'Education not found' } },
          { status: 404 }
        )
      }
      console.error('Error fetching education:', error)
      return NextResponse.json(
        { error: { code: 'FETCH_FAILED', message: error.message } },
        { status: 500 }
      )
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error fetching education:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch education' } },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/profile/educations/[id]
 * Update education
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const profile = await getCurrentProfile()

    if (!profile) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      )
    }

    const { id } = await params

    // Verify ownership first
    const supabase = await createClient()
    const { data: existing, error: fetchError } = await supabase
      .from('educations')
      .select('*')
      .eq('id', id)
      .eq('profile_id', profile.id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Education not found' } },
        { status: 404 }
      )
    }

    const body = await request.json()

    // Validate with Zod
    let validatedData
    try {
      validatedData = EducationUpdateSchema.parse(body)
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

    // If is_current is true, set end_date to null
    const updateData: Record<string, any> = { ...validatedData }
    if (validatedData.is_current === true) {
      updateData.end_date = null
    }

    const { data, error } = await supabase
      .from('educations')
      .update(updateData)
      .eq('id', id)
      .eq('profile_id', profile.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating education:', error)
      return NextResponse.json(
        { error: { code: 'UPDATE_FAILED', message: error.message } },
        { status: 500 }
      )
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error updating education:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to update education' } },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/profile/educations/[id]
 * Remove education
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const profile = await getCurrentProfile()

    if (!profile) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      )
    }

    const { id } = await params

    // Verify ownership first
    const supabase = await createClient()
    const { data: existing, error: fetchError } = await supabase
      .from('educations')
      .select('*')
      .eq('id', id)
      .eq('profile_id', profile.id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Education not found' } },
        { status: 404 }
      )
    }

    const { error } = await supabase
      .from('educations')
      .delete()
      .eq('id', id)
      .eq('profile_id', profile.id)

    if (error) {
      console.error('Error deleting education:', error)
      return NextResponse.json(
        { error: { code: 'DELETE_FAILED', message: error.message } },
        { status: 500 }
      )
    }

    return NextResponse.json({ data: { success: true } })
  } catch (error) {
    console.error('Error deleting education:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to delete education' } },
      { status: 500 }
    )
  }
}


