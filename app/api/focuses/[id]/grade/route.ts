import { NextResponse, NextRequest } from 'next/server'
import { requireAuth, ensureUserAndProfile } from '@/lib/clerk'
import { createServiceClient } from '@/lib/supabase/service'
import { z } from 'zod'

/**
 * Schema for submitting a focus grade
 */
const GradeSchema = z.object({
  usefulness_rating: z.number().int().min(1).max(5),
  honesty_rating: z.number().int().min(1).max(5),
  feedback: z.string().max(2000).optional().nullable(),
})

/**
 * GET /api/focuses/[id]/grade
 * Get grades for a focus (both mentor and mentee grades if submitted)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth()
    const profile = await ensureUserAndProfile()

    if (!profile || !profile.id) {
      return NextResponse.json(
        { error: { code: 'PROFILE_NOT_FOUND', message: 'Profile not found' } },
        { status: 404 }
      )
    }

    const { id: focusId } = await params
    const supabase = createServiceClient()

    // Fetch focus to verify access
    const { data: focus, error: focusError } = await supabase
      .from('focuses')
      .select(`
        id,
        status,
        collaboration:collaborations!focuses_collaboration_id_fkey(
          id,
          mentor_profile_id,
          mentee_profile_id
        )
      `)
      .eq('id', focusId)
      .single()

    if (focusError || !focus) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Focus not found' } },
        { status: 404 }
      )
    }

    const collaboration = Array.isArray(focus.collaboration)
      ? focus.collaboration[0]
      : focus.collaboration

    if (!collaboration) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Collaboration not found' } },
        { status: 404 }
      )
    }

    const isMentor = collaboration.mentor_profile_id === profile.id
    const isMentee = collaboration.mentee_profile_id === profile.id

    if (!isMentor && !isMentee) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'You do not have access to this focus' } },
        { status: 403 }
      )
    }

    // Fetch all grades for this focus
    const { data: grades, error: gradesError } = await supabase
      .from('focus_grades')
      .select('*')
      .eq('focus_id', focusId)

    if (gradesError) {
      console.error('Error fetching grades:', gradesError)
      return NextResponse.json(
        { error: { code: 'FETCH_FAILED', message: 'Failed to fetch grades' } },
        { status: 500 }
      )
    }

    const mentorGrade = grades?.find((g) => g.grader_role === 'mentor') || null
    const menteeGrade = grades?.find((g) => g.grader_role === 'mentee') || null

    const userRole = isMentor ? 'mentor' : 'mentee'
    const userGrade = isMentor ? mentorGrade : menteeGrade
    const otherGrade = isMentor ? menteeGrade : mentorGrade

    return NextResponse.json({
      data: {
        focus_id: focusId,
        focus_status: focus.status,
        user_role: userRole,
        user_grade: userGrade,
        other_grade_pending: !otherGrade,
        mentor_grade: mentorGrade,
        mentee_grade: menteeGrade,
        both_graded: !!mentorGrade && !!menteeGrade,
      },
    })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }

    console.error('Error in GET /api/focuses/[id]/grade:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch grades' } },
      { status: 500 }
    )
  }
}

/**
 * POST /api/focuses/[id]/grade
 * Submit a grade for a focus (mentor or mentee)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth()
    const profile = await ensureUserAndProfile()

    if (!profile || !profile.id) {
      return NextResponse.json(
        { error: { code: 'PROFILE_NOT_FOUND', message: 'Profile not found' } },
        { status: 404 }
      )
    }

    const { id: focusId } = await params
    const body = await request.json()

    // Validate input
    const parseResult = GradeSchema.safeParse(body)
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: parseResult.error.errors[0].message,
            details: parseResult.error.errors,
          },
        },
        { status: 400 }
      )
    }

    const { usefulness_rating, honesty_rating, feedback } = parseResult.data
    const supabase = createServiceClient()

    // Fetch focus to verify access and status
    const { data: focus, error: focusError } = await supabase
      .from('focuses')
      .select(`
        id,
        status,
        collaboration:collaborations!focuses_collaboration_id_fkey(
          id,
          mentor_profile_id,
          mentee_profile_id
        )
      `)
      .eq('id', focusId)
      .single()

    if (focusError || !focus) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Focus not found' } },
        { status: 404 }
      )
    }

    // Focus must be completed to grade
    if (focus.status !== 'completed') {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_STATUS',
            message: `Cannot grade a ${focus.status} focus. Focus must be completed first.`,
          },
        },
        { status: 400 }
      )
    }

    const collaboration = Array.isArray(focus.collaboration)
      ? focus.collaboration[0]
      : focus.collaboration

    if (!collaboration) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Collaboration not found' } },
        { status: 404 }
      )
    }

    const isMentor = collaboration.mentor_profile_id === profile.id
    const isMentee = collaboration.mentee_profile_id === profile.id

    if (!isMentor && !isMentee) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'You do not have access to this focus' } },
        { status: 403 }
      )
    }

    const graderRole = isMentor ? 'mentor' : 'mentee'

    // Check if user has already graded
    const { data: existingGrade } = await supabase
      .from('focus_grades')
      .select('id')
      .eq('focus_id', focusId)
      .eq('grader_role', graderRole)
      .single()

    if (existingGrade) {
      // Update existing grade
      const { data: updatedGrade, error: updateError } = await supabase
        .from('focus_grades')
        .update({
          usefulness_rating,
          honesty_rating,
          feedback: feedback || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingGrade.id)
        .select()
        .single()

      if (updateError) {
        console.error('Error updating grade:', updateError)
        return NextResponse.json(
          { error: { code: 'UPDATE_FAILED', message: 'Failed to update grade' } },
          { status: 500 }
        )
      }

      // Check if both grades now exist
      const { data: allGrades } = await supabase
        .from('focus_grades')
        .select('grader_role')
        .eq('focus_id', focusId)

      const bothGraded = allGrades?.length === 2

      return NextResponse.json({
        data: {
          ...updatedGrade,
          both_graded: bothGraded,
          message: 'Grade updated successfully',
        },
      })
    }

    // Create new grade
    const { data: newGrade, error: createError } = await supabase
      .from('focus_grades')
      .insert({
        focus_id: focusId,
        grader_profile_id: profile.id,
        grader_role: graderRole,
        usefulness_rating,
        honesty_rating,
        feedback: feedback || null,
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating grade:', createError)
      return NextResponse.json(
        { error: { code: 'CREATE_FAILED', message: 'Failed to submit grade' } },
        { status: 500 }
      )
    }

    // Check if both grades now exist
    const { data: allGrades } = await supabase
      .from('focus_grades')
      .select('grader_role')
      .eq('focus_id', focusId)

    const bothGraded = allGrades?.length === 2

    return NextResponse.json(
      {
        data: {
          ...newGrade,
          both_graded: bothGraded,
          message: 'Grade submitted successfully',
        },
      },
      { status: 201 }
    )
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }

    console.error('Error in POST /api/focuses/[id]/grade:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to submit grade' } },
      { status: 500 }
    )
  }
}
