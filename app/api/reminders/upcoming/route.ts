import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentProfile, requireAuth } from '@/lib/clerk'
import { getUpcomingRemindersForProfile } from '@/lib/reminders/upcoming'

const QuerySchema = z.object({
  within_days: z.coerce.number().int().min(1).max(60).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
})

/**
 * GET /api/reminders/upcoming
 * In-app reminder payload for upcoming focuses and pending collabs.
 */
export async function GET(request: NextRequest) {
  try {
    await requireAuth()
    const profile = await getCurrentProfile()

    if (!profile?.id) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const parsed = QuerySchema.safeParse({
      within_days: searchParams.get('within_days') ?? undefined,
      limit: searchParams.get('limit') ?? undefined,
    })

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: parsed.error.errors[0]?.message ?? 'Invalid query',
          },
        },
        { status: 400 }
      )
    }

    const data = await getUpcomingRemindersForProfile(profile.id, {
      withinDays: parsed.data.within_days,
      focusLimit: parsed.data.limit,
    })

    return NextResponse.json({ data })
  } catch (error) {
    console.error('GET /api/reminders/upcoming:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to load reminders' } },
      { status: 500 }
    )
  }
}
