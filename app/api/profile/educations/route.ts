import { NextResponse } from 'next/server'
import { getCurrentProfile } from '@/lib/auth-helpers'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

// Education schema
const EducationSchema = z.object({
  institution: z.string().min(1).max(200),
  degree: z.string().min(1).max(200),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  is_current: z.boolean().optional().default(false),
})

/**
 * GET /api/profile/educations
 * List educations for current user (ordered by start_date desc)
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
      .from('educations')
      .select('*')
      .eq('profile_id', profile.id)
      .order('start_date', { ascending: false })

    if (error) {
      console.error('Error fetching educations:', error)
      return NextResponse.json(
        { error: { code: 'FETCH_FAILED', message: error.message } },
        { status: 500 }
      )
    }

    return NextResponse.json({ data: data || [] })
  } catch (error) {
    console.error('Error fetching educations:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch educations' } },
      { status: 500 }
    )
  }
}

/**
 * POST /api/profile/educations
 * Create new education
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
      validatedData = EducationSchema.parse(body)
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
    if (validatedData.is_current) {
      validatedData.end_date = null
    }

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('educations')
      .insert({
        profile_id: profile.id,
        institution: validatedData.institution,
        degree: validatedData.degree,
        start_date: validatedData.start_date,
        end_date: validatedData.end_date,
        is_current: validatedData.is_current,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating education:', error)
      return NextResponse.json(
        { error: { code: 'CREATE_FAILED', message: error.message } },
        { status: 500 }
      )
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    console.error('Error creating education:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to create education' } },
      { status: 500 }
    )
  }
}


