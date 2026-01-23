import { NextResponse, NextRequest } from 'next/server'
import { requireMentee } from '@/lib/clerk'
import { ensureUserAndProfile } from '@/lib/clerk'
import { createServiceClient } from '@/lib/supabase/service'
import {
  generateSWOTAnalysis,
  generateSMARTFramework,
  generateMentorNotes,
  SWOTAnalysisInput,
  SMARTFrameworkInput,
  MentorNotesInput,
} from '@/lib/ai/goal-analysis'
import { z } from 'zod'

// Request schema
const GoalAnalysisRequestSchema = z.object({
  goal_id: z.string().uuid(),
  analysis_type: z.enum(['swot', 'smart', 'mentor_notes', 'all']),
})

/**
 * POST /api/ai/goal-analysis
 * Generate or regenerate SWOT analysis, SMART framework, or mentor notes for a goal
 */
export async function POST(request: NextRequest) {
  try {
    await requireMentee()
    const profile = await ensureUserAndProfile()

    if (!profile || !profile.id) {
      return NextResponse.json(
        { error: { code: 'PROFILE_NOT_FOUND', message: 'Profile not found' } },
        { status: 404 }
      )
    }

    const body = await request.json()
    const { goal_id, analysis_type } = GoalAnalysisRequestSchema.parse(body)

    const serviceSupabase = createServiceClient()

    // Fetch goal and verify ownership
    const { data: goal, error: goalError } = await serviceSupabase
      .from('goals')
      .select('*')
      .eq('id', goal_id)
      .eq('profile_id', profile.id)
      .single()

    if (goalError || !goal) {
      return NextResponse.json(
        { error: { code: 'GOAL_NOT_FOUND', message: 'Goal not found or unauthorized' } },
        { status: 404 }
      )
    }

    // Fetch milestones for analysis
    const { data: milestones } = await serviceSupabase
      .from('goal_milestones')
      .select('title, description')
      .eq('goal_id', goal_id)
      .order('target_date', { ascending: true })

    const results: {
      swot_analysis?: any
      smart_framework?: any
      mentor_notes?: string
    } = {}

    // Generate requested analysis types
    if (analysis_type === 'swot' || analysis_type === 'all') {
      try {
        const swotInput: SWOTAnalysisInput = {
          title: goal.title,
          description: goal.description,
          current_challenges: goal.current_challenges,
          milestones: milestones || [],
          risks_pitfalls: goal.risks_pitfalls as Array<{ risk: string; mitigation: string }> | null,
          category: goal.category,
        }

        const swotResult = await generateSWOTAnalysis(swotInput)
        results.swot_analysis = swotResult

        // Save to database
        await serviceSupabase
          .from('goals')
          .update({
            swot_analysis: swotResult,
            swot_generated_at: new Date().toISOString(),
          })
          .eq('id', goal_id)
      } catch (error: any) {
        console.error('Error generating SWOT analysis:', error)
        return NextResponse.json(
          {
            error: {
              code: 'SWOT_GENERATION_FAILED',
              message: error.message || 'Failed to generate SWOT analysis',
            },
          },
          { status: 500 }
        )
      }
    }

    if (analysis_type === 'smart' || analysis_type === 'all') {
      try {
        const smartInput: SMARTFrameworkInput = {
          title: goal.title,
          description: goal.description,
          success_definition: goal.success_definition,
          duration_days: (goal.duration_days as 30 | 60) || 30,
          category: goal.category,
        }

        const smartResult = await generateSMARTFramework(smartInput)
        results.smart_framework = smartResult

        // Save to database
        await serviceSupabase
          .from('goals')
          .update({
            smart_framework: smartResult,
            smart_generated_at: new Date().toISOString(),
          })
          .eq('id', goal_id)
      } catch (error: any) {
        console.error('Error generating SMART framework:', error)
        return NextResponse.json(
          {
            error: {
              code: 'SMART_GENERATION_FAILED',
              message: error.message || 'Failed to generate SMART framework',
            },
          },
          { status: 500 }
        )
      }
    }

    if (analysis_type === 'mentor_notes' || analysis_type === 'all') {
      try {
        // Fetch existing SWOT and SMART if generating all or if they exist
        const existingSwot = analysis_type === 'all' ? results.swot_analysis : goal.swot_analysis
        const existingSmart = analysis_type === 'all' ? results.smart_framework : goal.smart_framework

        const mentorNotesInput: MentorNotesInput = {
          title: goal.title,
          description: goal.description,
          current_challenges: goal.current_challenges,
          success_definition: goal.success_definition,
          milestones: milestones || [],
          swot_analysis: existingSwot as any,
          smart_framework: existingSmart as any,
          category: goal.category,
        }

        const mentorNotesResult = await generateMentorNotes(mentorNotesInput)
        results.mentor_notes = mentorNotesResult

        // Save to database
        await serviceSupabase
          .from('goals')
          .update({
            mentor_notes: mentorNotesResult,
            mentor_notes_generated_at: new Date().toISOString(),
          })
          .eq('id', goal_id)
      } catch (error: any) {
        console.error('Error generating mentor notes:', error)
        return NextResponse.json(
          {
            error: {
              code: 'MENTOR_NOTES_GENERATION_FAILED',
              message: error.message || 'Failed to generate mentor notes',
            },
          },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({
      data: results,
    })
  } catch (error: any) {
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

    console.error('Goal analysis API error:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
      { status: 500 }
    )
  }
}


