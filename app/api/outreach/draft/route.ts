import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentProfile, requireAuth } from '@/lib/clerk'
import { createServiceClient } from '@/lib/supabase/service'
import { buildOutreachDrafts } from '@/lib/outreach/templates'
import { buildScheduleFocusHook } from '@/lib/outreach/schedule-focus'

const DraftSchema = z.object({
  mentor_profile_id: z.string().uuid(),
  goal_id: z.string().uuid().optional(),
  shared_highlights: z.array(z.string()).optional(),
  proposed_focus_at: z.string().datetime().optional(),
  duration_minutes: z.union([z.literal(30), z.literal(60)]).optional(),
})

/**
 * POST /api/outreach/draft
 * Generate LinkedIn + email drafts (stored in-process; never auto-sent).
 */
export async function POST(request: Request) {
  try {
    await requireAuth()
    const menteeProfile = await getCurrentProfile()

    if (!menteeProfile?.id) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      )
    }

    const body = await request.json()
    const parsed = DraftSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: parsed.error.errors[0]?.message ?? 'Invalid body',
          },
        },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()
    const { data: mentor, error: mentorError } = await supabase
      .from('profiles')
      .select('id, display_name, headline, public_handle, is_mentor')
      .eq('id', parsed.data.mentor_profile_id)
      .single()

    if (mentorError || !mentor || !mentor.is_mentor) {
      return NextResponse.json(
        { error: { code: 'MENTOR_NOT_FOUND', message: 'Mentor profile not found' } },
        { status: 404 }
      )
    }

    let goalTitle: string | null = null
    if (parsed.data.goal_id) {
      const { data: goal } = await supabase
        .from('goals')
        .select('title, profile_id')
        .eq('id', parsed.data.goal_id)
        .single()
      if (goal && goal.profile_id === menteeProfile.id) {
        goalTitle = goal.title
      }
    }

    const publicProfileUrl = menteeProfile.public_handle
      ? `/m/${menteeProfile.public_handle}`
      : null

    const drafts = buildOutreachDrafts({
      menteeName: menteeProfile.display_name || 'A Mentorshape member',
      mentorName: mentor.display_name || 'there',
      mentorHeadline: mentor.headline,
      sharedHighlights: parsed.data.shared_highlights,
      goalTitle,
      publicProfileUrl,
    })

    let collaborationId: string | null = null
    const { data: existingCollab } = await supabase
      .from('collaborations')
      .select('id')
      .eq('mentee_profile_id', menteeProfile.id)
      .eq('mentor_profile_id', mentor.id)
      .in('status', ['pending', 'accepted', 'active'])
      .maybeSingle()

    collaborationId = existingCollab?.id ?? null

    const scheduleHook =
      parsed.data.proposed_focus_at
        ? buildScheduleFocusHook({
            collaborationId,
            scheduledAtIso: parsed.data.proposed_focus_at,
            durationMinutes: parsed.data.duration_minutes,
          })
        : null

    return NextResponse.json({
      data: {
        drafts,
        requires_user_confirmation: true,
        schedule_focus: scheduleHook,
        mentor: {
          id: mentor.id,
          display_name: mentor.display_name,
          public_handle: mentor.public_handle,
        },
      },
    })
  } catch (error) {
    console.error('POST /api/outreach/draft:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to generate outreach drafts' } },
      { status: 500 }
    )
  }
}
