import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireMentee, ensureUserAndProfile } from '@/lib/clerk'
import { createServiceClient } from '@/lib/supabase/service'

const CreateVisionBoardSchema = z.object({
  title: z.string().min(1).max(120).default('Vision board'),
  goal_id: z.string().uuid().optional().nullable(),
  graph_json: z.record(z.unknown()).default({}),
})

export async function GET() {
  try {
    await requireMentee()
    const profile = await ensureUserAndProfile()
    if (!profile?.id) {
      return NextResponse.json(
        { error: { code: 'PROFILE_NOT_FOUND', message: 'Profile not found' } },
        { status: 404 }
      )
    }

    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from('vision_boards')
      .select('*')
      .eq('profile_id', profile.id)
      .order('updated_at', { ascending: false })

    if (error) {
      return NextResponse.json(
        { error: { code: 'FETCH_FAILED', message: error.message } },
        { status: 500 }
      )
    }

    return NextResponse.json({ data: data ?? [] })
  } catch (error) {
    console.error('List vision boards error:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to list vision boards' } },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireMentee()
    const profile = await ensureUserAndProfile()
    if (!profile?.id) {
      return NextResponse.json(
        { error: { code: 'PROFILE_NOT_FOUND', message: 'Profile not found' } },
        { status: 404 }
      )
    }

    const body = CreateVisionBoardSchema.parse(await request.json())
    const supabase = createServiceClient()

    const { data, error } = await supabase
      .from('vision_boards')
      .insert({
        profile_id: profile.id,
        goal_id: body.goal_id ?? null,
        title: body.title,
        graph_json: body.graph_json,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: { code: 'CREATE_FAILED', message: error.message } },
        { status: 500 }
      )
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: error.errors[0].message } },
        { status: 400 }
      )
    }
    console.error('Create vision board error:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to create vision board' } },
      { status: 500 }
    )
  }
}
