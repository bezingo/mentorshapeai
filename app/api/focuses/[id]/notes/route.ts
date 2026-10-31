import { NextResponse, NextRequest } from 'next/server'
import { getSession, ensureUserAndProfile } from '@/lib/auth-helpers'
import { createServiceClient } from '@/lib/supabase/service'
import { z } from 'zod'

const CreateNoteSchema = z.object({
  note_type: z.enum(['general', 'preparation', 'action_item', 'followup']).optional(),
  content: z.string().min(1).max(5000),
  is_private: z.boolean().optional(),
})

const UpdateNoteSchema = z.object({
  content: z.string().min(1).max(5000).optional(),
  is_private: z.boolean().optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { id: focusId } = await params
    const supabase = createServiceClient()

    const { data: focus, error: focusError } = await supabase
      .from('focuses')
      .select(`
        id,
        collaboration:collaborations!inner(
          id, mentor_profile_id, mentee_profile_id
        )
      `)
      .eq('id', focusId)
      .single()

    if (focusError || !focus) {
      return NextResponse.json({ error: 'Focus not found' }, { status: 404 })
    }

    const collab = focus.collaboration as unknown as { 
      id: string
      mentor_profile_id: string
      mentee_profile_id: string
    }
    
    const isMentor = collab.mentor_profile_id === profile.id
    const isMentee = collab.mentee_profile_id === profile.id

    if (!isMentor && !isMentee) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const { data: notes, error } = await supabase
      .from('focus_notes')
      .select('*')
      .eq('focus_id', focusId)
      .or(`profile_id.eq.${profile.id},is_private.eq.false`)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching notes:', error)
      return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 })
    }

    const notesWithOwnership = notes?.map(note => ({
      ...note,
      is_own: note.profile_id === profile.id
    })) || []

    return NextResponse.json({
      data: notesWithOwnership,
      user_role: isMentor ? 'mentor' : 'mentee'
    })
  } catch (error) {
    console.error('Error in GET /api/focuses/[id]/notes:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { id: focusId } = await params
    const body = await request.json()
    const parsed = CreateNoteSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ 
        error: 'Validation failed',
        details: parsed.error.errors 
      }, { status: 400 })
    }

    const supabase = createServiceClient()

    const { data: focus, error: focusError } = await supabase
      .from('focuses')
      .select(`
        id,
        collaboration:collaborations!inner(
          id, mentor_profile_id, mentee_profile_id
        )
      `)
      .eq('id', focusId)
      .single()

    if (focusError || !focus) {
      return NextResponse.json({ error: 'Focus not found' }, { status: 404 })
    }

    const collab = focus.collaboration as unknown as { 
      id: string
      mentor_profile_id: string
      mentee_profile_id: string
    }
    
    const isMentor = collab.mentor_profile_id === profile.id
    const isMentee = collab.mentee_profile_id === profile.id

    if (!isMentor && !isMentee) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const { data: note, error } = await supabase
      .from('focus_notes')
      .insert({
        focus_id: focusId,
        profile_id: profile.id,
        note_type: parsed.data.note_type || 'general',
        content: parsed.data.content,
        is_private: parsed.data.is_private ?? true
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating note:', error)
      return NextResponse.json({ error: 'Failed to create note' }, { status: 500 })
    }

    return NextResponse.json({ 
      data: { ...note, is_own: true }
    }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/focuses/[id]/notes:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
