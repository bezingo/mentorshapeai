import { NextResponse } from 'next/server'
import { getCurrentProfile } from '@/lib/auth-helpers'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

// Skill update schema (all fields optional)
const SkillUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  level: z.enum(['Beginner', 'Intermediate', 'Advanced']).optional(),
})

/**
 * GET /api/profile/skills/[id]
 * Fetch single skill (verify ownership)
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
      .from('skills')
      .select('*')
      .eq('id', id)
      .eq('profile_id', profile.id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: { code: 'NOT_FOUND', message: 'Skill not found' } },
          { status: 404 }
        )
      }
      console.error('Error fetching skill:', error)
      return NextResponse.json(
        { error: { code: 'FETCH_FAILED', message: error.message } },
        { status: 500 }
      )
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error fetching skill:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch skill' } },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/profile/skills/[id]
 * Update skill
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
      .from('skills')
      .select('*')
      .eq('id', id)
      .eq('profile_id', profile.id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Skill not found' } },
        { status: 404 }
      )
    }

    const body = await request.json()

    // Validate with Zod
    let validatedData
    try {
      validatedData = SkillUpdateSchema.parse(body)
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

    const { data, error } = await supabase
      .from('skills')
      .update(validatedData)
      .eq('id', id)
      .eq('profile_id', profile.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating skill:', error)
      return NextResponse.json(
        { error: { code: 'UPDATE_FAILED', message: error.message } },
        { status: 500 }
      )
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error updating skill:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to update skill' } },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/profile/skills/[id]
 * Remove skill
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
      .from('skills')
      .select('*')
      .eq('id', id)
      .eq('profile_id', profile.id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Skill not found' } },
        { status: 404 }
      )
    }

    const { error } = await supabase
      .from('skills')
      .delete()
      .eq('id', id)
      .eq('profile_id', profile.id)

    if (error) {
      console.error('Error deleting skill:', error)
      return NextResponse.json(
        { error: { code: 'DELETE_FAILED', message: error.message } },
        { status: 500 }
      )
    }

    return NextResponse.json({ data: { success: true } })
  } catch (error) {
    console.error('Error deleting skill:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to delete skill' } },
      { status: 500 }
    )
  }
}


