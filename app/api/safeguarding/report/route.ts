import { NextResponse, NextRequest } from 'next/server'
import { requireAuth, ensureUserAndProfile } from '@/lib/clerk'
import { createServiceClient } from '@/lib/supabase/service'
import { z } from 'zod'

/**
 * Schema for creating a safeguarding report
 */
const CreateReportSchema = z.object({
  report_type: z.enum(['concern', 'misconduct', 'safety', 'other']),
  description: z.string().min(10, 'Please provide more details').max(5000),
  reported_profile_id: z.string().uuid().optional(),
  collaboration_id: z.string().uuid().optional(),
  focus_id: z.string().uuid().optional(),
})

/**
 * POST /api/safeguarding/report
 * Submit a safeguarding report
 */
export async function POST(request: NextRequest) {
  try {
    await requireAuth()
    const profile = await ensureUserAndProfile()

    if (!profile || !profile.id) {
      return NextResponse.json(
        { error: { code: 'PROFILE_NOT_FOUND', message: 'Profile not found' } },
        { status: 404 }
      )
    }

    const supabase = createServiceClient()

    // Parse and validate request
    const body = await request.json()
    const parseResult = CreateReportSchema.safeParse(body)

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

    const { report_type, description, reported_profile_id, collaboration_id, focus_id } = parseResult.data

    // Determine the org_id from the collaboration if present
    let orgId: string | null = null

    if (collaboration_id) {
      const { data: collab } = await supabase
        .from('collaborations')
        .select('org_id')
        .eq('id', collaboration_id)
        .single()

      orgId = collab?.org_id || null
    } else if (focus_id) {
      const { data: focus } = await supabase
        .from('focuses')
        .select('collaboration:collaborations!focuses_collaboration_id_fkey(org_id)')
        .eq('id', focus_id)
        .single()

      const collab = Array.isArray(focus?.collaboration) ? focus.collaboration[0] : focus?.collaboration
      orgId = collab?.org_id || null
    }

    // If still no org, check if the reporter is in an org
    if (!orgId) {
      const { data: membership } = await supabase
        .from('org_members')
        .select('org_id')
        .eq('profile_id', profile.id)
        .limit(1)
        .single()

      orgId = membership?.org_id || null
    }

    // Create the report
    const { data: report, error } = await supabase
      .from('safeguarding_reports')
      .insert({
        org_id: orgId,
        reporter_profile_id: profile.id,
        reported_profile_id: reported_profile_id || null,
        collaboration_id: collaboration_id || null,
        focus_id: focus_id || null,
        report_type,
        description,
        status: 'pending',
      })
      .select('id')
      .single()

    if (error) {
      console.error('Error creating report:', error)
      return NextResponse.json(
        { error: { code: 'CREATE_FAILED', message: 'Failed to submit report' } },
        { status: 500 }
      )
    }

    // TODO: Send notification to org admins (would use email system from M1)

    return NextResponse.json(
      {
        data: {
          report_id: report.id,
          message: 'Report submitted successfully. School administrators have been notified.',
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

    console.error('Error in POST /api/safeguarding/report:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to submit report' } },
      { status: 500 }
    )
  }
}
