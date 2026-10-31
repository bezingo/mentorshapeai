import { NextResponse, NextRequest } from 'next/server'
import { getSession, ensureUserAndProfile } from '@/lib/auth-helpers'
import { createServiceClient } from '@/lib/supabase/service'
import { z } from 'zod'

const UpdateNoteSchema = z.object({
  content: z.string().min(1).max(5000).optional(),
  is_private: z.boolean().optional(),
  note_type: z.enum(['general', 'preparation', 'action_item', 'followup']).optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; noteId: string }> }
) {
  try {
    const session = await getSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const profile = await ensureUserAndProfile()
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const { id: focusId, noteId } = await params
    const body = await request.json()
    const parsed = UpdateNoteSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ 
        error: 'Validation failed',
        details: parsed.error.errors 
      }, { status: 400 })
    }

    const supabase = createServiceClient()

    const { data: existingNote } = await supabase
      .from('focus_notes')
      .select('id, profile_id, focus_id')
      .eq('id', noteId)
      .eq('focus_id', focusId)
      .single()

    if (!existingNote) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 })
    }

    if (existingNote.profile_id !== profile.id) {
      return NextResponse.json({ error: 'Cannot edit others notes' }, { status: 403 })
    }

    const updateData: Record<string, unknown> = {}
    if (parsed.data.content !== undefined) updateData.content = parsed.data.content
    if (parsed.data.is_private !== undefined) updateData.is_private = parsed.data.is_private
    if (parsed.data.note_type !== undefined) updateData.note_type = parsed.data.note_type

    const { data: note, error } = await supabase
      .from('focus_notes')
      .update(updateData)
      .eq('id', noteId)
      .select()
      .single()

    if (error) {
      console.error('Error updating note:', error)
      return NextResponse.json({ error: 'Failed to update note' }, { status: 500 })
    }

    return NextResponse.json({ 
      data: { ...note, is_own: true }
    })
  } catch (error) {
    console.error('Error in PATCH /api/focuses/[id]/notes/[noteId]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; noteId: string }> }
) {
  try {
    const session = await getSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const profile = await ensureUserAndProfile()
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const { id: focusId, noteId } = await params
    const supabase = createServiceClient()

    const { data: existingNote } = await supabase
      .from('focus_notes')
      .select('id, profile_id, focus_id')
      .eq('id', noteId)
      .eq('focus_id', focusId)
      .single()

    if (!existingNote) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 })
    }

    if (existingNote.profile_id !== profile.id) {
      return NextResponse.json({ error: 'Cannot delete others notes' }, { status: 403 })
    }

    const { error } = await supabase
      .from('focus_notes')
      .delete()
      .eq('id', noteId)

    if (error) {
      console.error('Error deleting note:', error)
      return NextResponse.json({ error: 'Failed to delete note' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/focuses/[id]/notes/[noteId]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
