import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentProfile, requireAuth } from '@/lib/clerk'
import { getMatchingSuggestions } from '@/lib/matching/suggestions'

const QuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).optional(),
  skills: z.string().optional(),
})

/**
 * GET /api/matching/suggestions
 * Ranked mentor matches for the authenticated mentee profile.
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
      limit: searchParams.get('limit') ?? undefined,
      skills: searchParams.get('skills') ?? undefined,
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

    const skillsFilter = parsed.data.skills
      ? parsed.data.skills.split(',').map((s) => s.trim()).filter(Boolean)
      : undefined

    const result = await getMatchingSuggestions({
      menteeProfileId: profile.id,
      limit: parsed.data.limit,
      skillsFilter,
    })

    return NextResponse.json({ data: result })
  } catch (error) {
    console.error('GET /api/matching/suggestions:', error)
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to load suggestions',
        },
      },
      { status: 500 }
    )
  }
}
