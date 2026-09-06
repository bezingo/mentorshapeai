import { NextResponse, NextRequest } from 'next/server'
import { requireMentee } from '@/lib/auth-helpers'
import { ensureUserAndProfile } from '@/lib/auth-helpers'
import { createServiceClient } from '@/lib/supabase/service'
import { shapeGoal, GoalShapingInput } from '@/lib/ai/goal-shaper'
import { z } from 'zod'

// Input validation schema - supports two modes
const GoalShaperRequestSchema = z.union([
  z.object({
    goal_id: z.string().uuid(),
  }),
  z.object({
    goal_data: z.object({
      title: z.string().min(1).max(200),
      duration_days: z.union([z.literal(30), z.literal(60)]),
      current_challenges: z.string().optional(),
      category: z.string().optional(),
      description: z.string().optional(),
      existing_success_definition: z.string().optional(),
    }),
  }),
])

export async function POST(request: NextRequest) {
  try {
    // Require mentee authentication
    await requireMentee()
    const profile = await ensureUserAndProfile()

    if (!profile || !profile.id) {
      return NextResponse.json(
        { error: { code: 'PROFILE_NOT_FOUND', message: 'Profile not found' } },
        { status: 404 }
      )
    }

    const body = await request.json()
    const validatedRequest = GoalShaperRequestSchema.parse(body)

    let serviceSupabase
    try {
      serviceSupabase = createServiceClient()
    } catch (error: any) {
      console.error('Failed to create Supabase service client:', error)
      return NextResponse.json(
        { error: { code: 'SUPABASE_ERROR', message: `Failed to connect to Supabase: ${error.message}` } },
        { status: 500 }
      )
    }

    let goalData: GoalShapingInput
    let goalId: string | null = null
    let goalCreatedAt: Date | null = null
    let existingSuccessDefinition: string | null = null

    // Mode 1: goal_id - Fetch goal from DB
    if ('goal_id' in validatedRequest) {
      goalId = validatedRequest.goal_id

      // Fetch goal and verify ownership
      const { data: goal, error: goalError } = await serviceSupabase
        .from('goals')
        .select('*')
        .eq('id', goalId)
        .single()

      if (goalError) {
        console.error('Error fetching goal:', goalError)
        return NextResponse.json(
          { error: { code: 'GOAL_FETCH_ERROR', message: `Failed to fetch goal: ${goalError.message}` } },
          { status: 500 }
        )
      }

      if (!goal) {
        return NextResponse.json(
          { error: { code: 'GOAL_NOT_FOUND', message: 'Goal not found' } },
          { status: 404 }
        )
      }

      // Verify user owns the goal
      if (goal.profile_id !== profile.id) {
        return NextResponse.json(
          { error: { code: 'FORBIDDEN', message: 'You do not have permission to shape this goal' } },
          { status: 403 }
        )
      }

      // Check if goal is already being shaped (prevent concurrent requests)
      if (goal.ai_shaped_at) {
        // Allow re-shaping, but log it
        console.log(`Re-shaping goal ${goalId} (previously shaped at ${goal.ai_shaped_at})`)
      }

      goalData = {
        title: goal.title,
        duration_days: (goal.duration_days as 30 | 60) || 30,
        current_challenges: goal.current_challenges || undefined,
        category: goal.category || undefined,
        description: goal.description || undefined,
        existing_success_definition: goal.success_definition || undefined,
      }

      goalCreatedAt = new Date(goal.created_at)
      existingSuccessDefinition = goal.success_definition || null
    } else {
      // Mode 2: goal_data - Dry-run mode (no DB save)
      goalData = {
        title: validatedRequest.goal_data.title,
        duration_days: validatedRequest.goal_data.duration_days,
        current_challenges: validatedRequest.goal_data.current_challenges,
        category: validatedRequest.goal_data.category,
        description: validatedRequest.goal_data.description,
        existing_success_definition: validatedRequest.goal_data.existing_success_definition,
      }
    }

    // Call AI agent to shape the goal
    let shapedData
    try {
      shapedData = await shapeGoal(goalData)
    } catch (error: any) {
      // Handle AI-specific errors
      if (error.message?.includes('Timeout')) {
        return NextResponse.json(
          { error: { code: 'AI_TIMEOUT', message: 'AI request timed out. Please try again.' } },
          { status: 504 }
        )
      }

      if (error.message?.includes('rate limit') || error.message?.includes('429')) {
        return NextResponse.json(
          { error: { code: 'RATE_LIMIT', message: 'Rate limit exceeded. Please try again later.' } },
          { status: 503, headers: { 'Retry-After': '60' } }
        )
      }

      if (error.message?.includes('JSON') || error.message?.includes('parse')) {
        // Retry once with stricter prompt (could be implemented)
        return NextResponse.json(
          { error: { code: 'AI_INVALID_RESPONSE', message: 'AI returned invalid response. Please try again.' } },
          { status: 500 }
        )
      }

      // Generic AI error - include more details
      console.error('Error shaping goal:', error)
      const errorMessage = error.message || 'Failed to shape goal. Please try again.'
      return NextResponse.json(
        { error: { code: 'AI_ERROR', message: errorMessage, details: error.stack } },
        { status: 500 }
      )
    }

    // Calculate target dates for milestones
    const milestonesWithDates = shapedData.milestones.map((milestone) => {
      if (!goalCreatedAt) {
        // Dry-run mode: use current date as goal creation date
        goalCreatedAt = new Date()
      }

      const targetDate = new Date(goalCreatedAt)
      targetDate.setDate(targetDate.getDate() + milestone.relative_day_offset)

      // Validate milestone date is within goal horizon
      const goalEndDate = new Date(goalCreatedAt)
      goalEndDate.setDate(goalEndDate.getDate() + goalData.duration_days)

      if (targetDate > goalEndDate) {
        throw new Error(
          `Milestone "${milestone.title}" has target_date beyond goal horizon (day ${milestone.relative_day_offset} > ${goalData.duration_days} days)`
        )
      }

      return {
        ...milestone,
        target_date: targetDate.toISOString().split('T')[0], // Format as YYYY-MM-DD
      }
    })

    // If goal_id provided, save to database
    if (goalId) {
      // Insert milestones
      const milestonesToInsert = milestonesWithDates.map((m) => ({
        goal_id: goalId,
        title: m.title,
        description: m.description,
        target_date: m.target_date,
        status: 'pending' as const,
      }))

      const { error: milestonesError } = await serviceSupabase
        .from('goal_milestones')
        .insert(milestonesToInsert)

      if (milestonesError) {
        console.error('Error inserting milestones:', milestonesError)
        return NextResponse.json(
          { error: { code: 'MILESTONES_INSERT_FAILED', message: 'Failed to save milestones' } },
          { status: 500 }
        )
      }

      // Fetch inserted milestones with IDs
      const { data: insertedMilestones } = await serviceSupabase
        .from('goal_milestones')
        .select('id, title, description, target_date, status')
        .eq('goal_id', goalId)
        .order('target_date', { ascending: true })

      // Update goal with AI-shaped data
      const updateData: any = {
        refined_goal_statement: shapedData.refined_goal_statement,
        suggested_mentor_questions: shapedData.suggested_questions_for_mentor,
        risks_pitfalls: shapedData.risks_or_pitfalls,
        ai_shaped_at: new Date().toISOString(),
      }

      // Only update success_definition if it was empty
      if (!existingSuccessDefinition && shapedData.success_definition) {
        updateData.success_definition = shapedData.success_definition
      }

      const { error: updateError } = await serviceSupabase
        .from('goals')
        .update(updateData)
        .eq('id', goalId)

      if (updateError) {
        console.error('Error updating goal:', updateError)
        return NextResponse.json(
          { error: { code: 'GOAL_UPDATE_FAILED', message: 'Failed to update goal with AI data' } },
          { status: 500 }
        )
      }

      return NextResponse.json({
        data: {
          refined_goal_statement: shapedData.refined_goal_statement,
          success_definition: updateData.success_definition || existingSuccessDefinition,
          milestones: insertedMilestones || [],
          suggested_mentor_questions: shapedData.suggested_questions_for_mentor,
          risks_or_pitfalls: shapedData.risks_or_pitfalls,
          ai_shaped_at: updateData.ai_shaped_at,
        },
      })
    } else {
      // Dry-run mode: return shaped data without saving
      return NextResponse.json({
        data: {
          refined_goal_statement: shapedData.refined_goal_statement,
          success_definition: shapedData.success_definition,
          milestones: milestonesWithDates.map((m) => ({
            title: m.title,
            description: m.description,
            target_date: m.target_date,
            relative_day_offset: m.relative_day_offset,
          })),
          suggested_mentor_questions: shapedData.suggested_questions_for_mentor,
          risks_or_pitfalls: shapedData.risks_or_pitfalls,
        },
      })
    }
  } catch (error: any) {
    // Handle validation errors
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

    // Handle milestone date validation errors
    if (error.message?.includes('target_date beyond goal horizon')) {
      return NextResponse.json(
        { error: { code: 'INVALID_MILESTONE_DATE', message: error.message } },
        { status: 400 }
      )
    }

    console.error('Error in goal shaper API:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to shape goal' } },
      { status: 500 }
    )
  }
}


