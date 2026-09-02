import { NextResponse } from 'next/server'
import { getCurrentProfile } from '@/lib/auth-helpers'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

// Skill schema
const SkillSchema = z.object({
  name: z.string().min(1).max(100),
  level: z.enum(['Beginner', 'Intermediate', 'Advanced']),
})

/**
 * GET /api/profile/skills
 * List skills for current user
 */
export async function GET() {
  try {
    const profile = await getCurrentProfile()

    if (!profile) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      )
    }

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('skills')
      .select('*')
      .eq('profile_id', profile.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching skills:', error)
      return NextResponse.json(
        { error: { code: 'FETCH_FAILED', message: error.message } },
        { status: 500 }
      )
    }

    return NextResponse.json({ data: data || [] })
  } catch (error) {
    console.error('Error fetching skills:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch skills' } },
      { status: 500 }
    )
  }
}

/**
 * POST /api/profile/skills
 * Create new skill
 */
export async function POST(request: Request) {
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
      validatedData = SkillSchema.parse(body)
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

    const supabase = await createClient()

    // Check current skill count (max 50)
    const { count, error: countError } = await supabase
      .from('skills')
      .select('*', { count: 'exact', head: true })
      .eq('profile_id', profile.id)

    if (countError) {
      console.error('Error counting skills:', countError)
      return NextResponse.json(
        { error: { code: 'COUNT_FAILED', message: countError.message } },
        { status: 500 }
      )
    }

    if ((count || 0) >= 50) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Maximum of 50 skills allowed per profile',
          },
        },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('skills')
      .insert({
        profile_id: profile.id,
        name: validatedData.name,
        level: validatedData.level,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating skill:', error)
      return NextResponse.json(
        { error: { code: 'CREATE_FAILED', message: error.message } },
        { status: 500 }
      )
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    console.error('Error creating skill:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to create skill' } },
      { status: 500 }
    )
  }
}


