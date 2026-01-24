import { NextResponse, NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { z } from 'zod'

/**
 * Query params schema for testimonials endpoint
 */
const TestimonialsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(10),
  offset: z.coerce.number().int().min(0).default(0),
})

/**
 * GET /api/public/mentor/[handle]/testimonials
 * Fetch paginated testimonials/ratings for a mentor
 * 
 * This is a PUBLIC endpoint - no authentication required
 * Returns testimonials with mentee attribution
 * 
 * Query params:
 * - limit: Number of testimonials to return (default 10, max 50)
 * - offset: Number of testimonials to skip (for pagination)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ handle: string }> }
) {
  try {
    const { handle } = await params

    if (!handle || handle.trim() === '') {
      return NextResponse.json(
        { error: { code: 'HANDLE_REQUIRED', message: 'Mentor handle is required' } },
        { status: 400 }
      )
    }

    // Parse query params
    const searchParams = request.nextUrl.searchParams
    const queryParams = {
      limit: searchParams.get('limit') ?? 10,
      offset: searchParams.get('offset') ?? 0,
    }

    const parseResult = TestimonialsQuerySchema.safeParse(queryParams)
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

    const { limit, offset } = parseResult.data

    const serviceSupabase = createServiceClient()

    // First, find the mentor profile by handle
    const { data: profile, error: profileError } = await serviceSupabase
      .from('profiles')
      .select('id, is_mentor, public_handle')
      .eq('public_handle', handle)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: { code: 'MENTOR_NOT_FOUND', message: 'Mentor not found' } },
        { status: 404 }
      )
    }

    if (!profile.is_mentor) {
      return NextResponse.json(
        { error: { code: 'NOT_A_MENTOR', message: 'This user is not a mentor' } },
        { status: 404 }
      )
    }

    // Fetch total count of testimonials
    const { count: totalCount, error: countError } = await serviceSupabase
      .from('ratings')
      .select('id', { count: 'exact', head: true })
      .eq('mentor_profile_id', profile.id)

    if (countError) {
      console.error('Error counting testimonials:', countError)
    }

    // Fetch paginated testimonials with mentee profile info
    // We need to join with profiles to get mentee display name and avatar
    const { data: ratings, error: ratingsError } = await serviceSupabase
      .from('ratings')
      .select(`
        id,
        score,
        feedback,
        collaboration_id,
        mentee_profile_id,
        mentee:profiles!ratings_mentee_profile_id_fkey (
          id,
          display_name,
          avatar_url,
          headline
        ),
        collaboration:collaborations!ratings_collaboration_id_fkey (
          id,
          goal:goals!collaborations_goal_id_fkey (
            id,
            title,
            category
          ),
          end_date
        )
      `)
      .eq('mentor_profile_id', profile.id)
      .order('collaboration_id', { ascending: false })
      .range(offset, offset + limit - 1)

    if (ratingsError) {
      console.error('Error fetching testimonials:', ratingsError)
      return NextResponse.json(
        { error: { code: 'FETCH_FAILED', message: 'Failed to fetch testimonials' } },
        { status: 500 }
      )
    }

    // Calculate average rating
    const { data: avgData } = await serviceSupabase
      .from('ratings')
      .select('score')
      .eq('mentor_profile_id', profile.id)

    let averageRating = null
    if (avgData && avgData.length > 0) {
      const sum = avgData.reduce((acc, r) => acc + r.score, 0)
      averageRating = Math.round((sum / avgData.length) * 10) / 10
    }

    // Format testimonials for response
    const testimonials = (ratings || []).map((rating) => {
      const mentee = Array.isArray(rating.mentee) ? rating.mentee[0] : rating.mentee
      const collaboration = Array.isArray(rating.collaboration) 
        ? rating.collaboration[0] 
        : rating.collaboration
      const goal = collaboration?.goal
        ? (Array.isArray(collaboration.goal) ? collaboration.goal[0] : collaboration.goal)
        : null

      return {
        id: rating.id,
        score: rating.score,
        feedback: rating.feedback,
        mentee: mentee ? {
          id: mentee.id,
          display_name: mentee.display_name,
          avatar_url: mentee.avatar_url,
          headline: mentee.headline,
        } : null,
        goal: goal ? {
          title: goal.title,
          category: goal.category,
        } : null,
        collaboration_end_date: collaboration?.end_date || null,
      }
    })

    return NextResponse.json({
      data: {
        testimonials,
        meta: {
          total: totalCount || 0,
          limit,
          offset,
          has_more: (totalCount || 0) > offset + limit,
          average_rating: averageRating,
        },
      },
    })
  } catch (error) {
    console.error('Error in GET /api/public/mentor/[handle]/testimonials:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch testimonials' } },
      { status: 500 }
    )
  }
}
