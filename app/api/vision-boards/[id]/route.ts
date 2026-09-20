import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireMentee, ensureUserAndProfile } from '@/lib/clerk'
import { createServiceClient } from '@/lib/supabase/service'

const UpdateVisionBoardSchema = z.object({
  title: z.string().min(1).max(120).optional(),
  graph_json: z.record(z.unknown()).optional(),
  goal_id: z.string().uuid().optional().nullable(),
})

async function loadOwnedBoard(id: string, profileId: string) {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('vision_boards')
    .select('*')
    .eq('id', id)
    .eq('profile_id', profileId)
    .single()
  return data
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireMentee()
    const profile = await ensureUserAndProfile()
    if (!profile?.id) {
      return NextResponse.json(
        { error: { code: 'PROFILE_NOT_FOUND', message: 'Profile not found' } },
        { status: 404 }
      )
    }

    const { id } = await params
    const board = await loadOwnedBoard(id, profile.id)
    if (!board) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Vision board not found' } },
        { status: 404 }
      )
    }

    return NextResponse.json({ data: board })
  } catch (error) {
    console.error('Get vision board error:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to load vision board' } },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireMentee()
    const profile = await ensureUserAndProfile()
    if (!profile?.id) {
      return NextResponse.json(
        { error: { code: 'PROFILE_NOT_FOUND', message: 'Profile not found' } },
        { status: 404 }
      )
    }

    const { id } = await params
    const board = await loadOwnedBoard(id, profile.id)
    if (!board) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Vision board not found' } },
        { status: 404 }
      )
    }

    const body = UpdateVisionBoardSchema.parse(await request.json())
    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from('vision_boards')
      .update({
        ...body,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: { code: 'UPDATE_FAILED', message: error.message } },
        { status: 500 }
      )
    }

    return NextResponse.json({ data })
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: error.errors[0].message } },
        { status: 400 }
      )
    }
    console.error('Update vision board error:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to update vision board' } },
      { status: 500 }
    )
  }
}
