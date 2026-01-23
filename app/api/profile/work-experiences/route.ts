import { NextResponse } from 'next/server'
import { getCurrentProfile } from '@/lib/clerk'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

// Work experience schema
const WorkExperienceSchema = z.object({
  company: z.string().min(1).max(200),
  title: z.string().min(1).max(200),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  is_current: z.boolean().optional().default(false),
})

/**
 * GET /api/profile/work-experiences
 * List work experiences for current user (ordered by start_date desc)
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
      .from('work_experiences')
      .select('*')
      .eq('profile_id', profile.id)
      .order('start_date', { ascending: false })

    if (error) {
      console.error('Error fetching work experiences:', error)
      return NextResponse.json(
        { error: { code: 'FETCH_FAILED', message: error.message } },
        { status: 500 }
      )
    }

    return NextResponse.json({ data: data || [] })
  } catch (error) {
    console.error('Error fetching work experiences:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch work experiences' } },
      { status: 500 }
    )
  }
}

/**
 * POST /api/profile/work-experiences
 * Create new work experience
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
      validatedData = WorkExperienceSchema.parse(body)
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
      .from('work_experiences')
      .insert({
        profile_id: profile.id,
        company: validatedData.company,
        title: validatedData.title,
        start_date: validatedData.start_date,
        end_date: validatedData.end_date,
        description: validatedData.description,
        is_current: validatedData.is_current,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating work experience:', error)
      return NextResponse.json(
        { error: { code: 'CREATE_FAILED', message: error.message } },
        { status: 500 }
      )
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    console.error('Error creating work experience:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to create work experience' } },
      { status: 500 }
    )
  }
}


