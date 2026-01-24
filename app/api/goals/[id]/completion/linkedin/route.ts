import { NextResponse, NextRequest } from 'next/server'
import { requireAuth, ensureUserAndProfile } from '@/lib/clerk'
import { createServiceClient } from '@/lib/supabase/service'
import { z } from 'zod'
import {
  generateCompletionSummary,
  generateLinkedInPost,
  saveLinkedInPost,
  type GoalCompletionSummary,
} from '@/lib/ai/completion-agent'

/**
 * Schema for LinkedIn post generation request
 */
const GenerateLinkedInSchema = z.object({
  mentee_reflection: z.string().max(2000).optional(),
  regenerate: z.boolean().optional(),
})

/**
 * POST /api/goals/[id]/completion/linkedin
 * Generate a LinkedIn achievement post for a completed goal
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

    const { id: goalId } = await params
    const supabase = createServiceClient()

    // Parse optional body
    let body: z.infer<typeof GenerateLinkedInSchema> = {}
    try {
      const rawBody = await request.json()
      body = GenerateLinkedInSchema.parse(rawBody)
    } catch {
      // Body is optional, default to empty
    }

    // Fetch goal to verify ownership
    const { data: goal, error: goalError } = await supabase
      .from('goals')
      .select('id, profile_id, status')
      .eq('id', goalId)
      .single()

    if (goalError || !goal) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Goal not found' } },
        { status: 404 }
      )
    }

    // Verify ownership - only goal owner can generate LinkedIn post
    if (goal.profile_id !== profile.id) {
      return NextResponse.json(
        {
          error: {
            code: 'FORBIDDEN',
            message: 'Only the goal owner can generate a LinkedIn post',
          },
        },
        { status: 403 }
      )
    }

    // Fetch completion record
    const { data: completion, error: completionError } = await supabase
      .from('goal_completions')
      .select('id, final_summary, linkedin_post_text, mentee_reflection')
      .eq('goal_id', goalId)
      .single()

    if (completionError || !completion) {
      if (completionError?.code === 'PGRST116') {
        return NextResponse.json(
          {
            error: {
              code: 'NOT_COMPLETED',
              message: 'Goal must be marked as complete before generating a LinkedIn post',
            },
          },
          { status: 400 }
        )
      }
      console.error('Error fetching completion:', completionError)
      return NextResponse.json(
        { error: { code: 'FETCH_FAILED', message: 'Failed to fetch completion' } },
        { status: 500 }
      )
    }

    // Check if we already have a LinkedIn post and regenerate is not requested
    if (completion.linkedin_post_text && !body.regenerate) {
      return NextResponse.json({
        data: {
          linkedin_post_text: completion.linkedin_post_text,
          is_cached: true,
          message: 'LinkedIn post retrieved from cache. Set regenerate=true to generate a new one.',
        },
      })
    }

    // Use provided reflection or existing one
    const menteeReflection = body.mentee_reflection || completion.mentee_reflection || undefined

    // Update mentee reflection if provided
    if (body.mentee_reflection && body.mentee_reflection !== completion.mentee_reflection) {
      await supabase
        .from('goal_completions')
        .update({ mentee_reflection: body.mentee_reflection })
        .eq('id', completion.id)
    }

    // Generate or use existing summary
    let summary: GoalCompletionSummary

    if (completion.final_summary) {
      // Parse existing summary or generate a simple one from stored text
      summary = {
        final_summary: completion.final_summary,
        key_achievements: [],
        skills_developed: [],
        journey_highlights: [],
        mentor_contribution: '',
        next_steps: [],
        overall_progress_rating: 4,
      }
    } else {
      // Generate new summary
      summary = await generateCompletionSummary(goalId)
    }

    // Generate LinkedIn post
    const linkedInPost = await generateLinkedInPost(goalId, summary, menteeReflection)

    // Save the LinkedIn post
    await saveLinkedInPost(completion.id, linkedInPost)

    return NextResponse.json({
      data: {
        linkedin_post_text: `${linkedInPost.emoji_version}\n\n${linkedInPost.hashtags.join(' ')}`,
        linkedin_post_clean: linkedInPost.linkedin_post_text,
        hashtags: linkedInPost.hashtags,
        is_cached: false,
        message: 'LinkedIn post generated successfully',
      },
    })
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: error.errors[0].message,
            details: error.errors,
          },
        },
        { status: 400 }
      )
    }

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }

    // Handle AI-specific errors
    if (error instanceof Error) {
      if (error.message.includes('OPENAI_API_KEY')) {
        return NextResponse.json(
          { error: { code: 'AI_CONFIG_ERROR', message: 'AI service not configured' } },
          { status: 503 }
        )
      }
      if (error.message.includes('rate limit')) {
        return NextResponse.json(
          { error: { code: 'RATE_LIMITED', message: 'AI service rate limited. Please try again later.' } },
          { status: 429 }
        )
      }
      if (error.message.includes('timeout')) {
        return NextResponse.json(
          { error: { code: 'TIMEOUT', message: 'Request timed out. Please try again.' } },
          { status: 504 }
        )
      }
    }

    console.error('Error in POST /api/goals/[id]/completion/linkedin:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to generate LinkedIn post' } },
      { status: 500 }
    )
  }
}

/**
 * GET /api/goals/[id]/completion/linkedin
 * Get the existing LinkedIn post for a completed goal
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

    const { id: goalId } = await params
    const supabase = createServiceClient()

    // Fetch goal to verify access
    const { data: goal, error: goalError } = await supabase
      .from('goals')
      .select('id, profile_id, public_slug')
      .eq('id', goalId)
      .single()

    if (goalError || !goal) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Goal not found' } },
        { status: 404 }
      )
    }

    // Verify access - must be goal owner or goal is public
    const isOwner = goal.profile_id === profile.id
    const isPublic = !!goal.public_slug

    if (!isOwner && !isPublic) {
      return NextResponse.json(
        {
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have access to this goal',
          },
        },
        { status: 403 }
      )
    }

    // Fetch completion record
    const { data: completion, error: completionError } = await supabase
      .from('goal_completions')
      .select('id, linkedin_post_text')
      .eq('goal_id', goalId)
      .single()

    if (completionError) {
      if (completionError.code === 'PGRST116') {
        return NextResponse.json(
          { error: { code: 'NOT_FOUND', message: 'No completion record found for this goal' } },
          { status: 404 }
        )
      }
      console.error('Error fetching completion:', completionError)
      return NextResponse.json(
        { error: { code: 'FETCH_FAILED', message: 'Failed to fetch completion' } },
        { status: 500 }
      )
    }

    if (!completion.linkedin_post_text) {
      return NextResponse.json(
        {
          error: {
            code: 'NOT_GENERATED',
            message: 'LinkedIn post has not been generated yet. Use POST to generate one.',
          },
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      data: {
        linkedin_post_text: completion.linkedin_post_text,
      },
    })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }

    console.error('Error in GET /api/goals/[id]/completion/linkedin:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch LinkedIn post' } },
      { status: 500 }
    )
  }
}
