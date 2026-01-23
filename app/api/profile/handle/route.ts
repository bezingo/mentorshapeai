import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/clerk'
import { getProfileId } from '@/lib/clerk'
import { createClient } from '@/lib/supabase/server'
import { isValidHandle } from '@/lib/utils/slug'

export async function PUT(request: Request) {
  try {
    await requireAuth()
    const profileId = await getProfileId()

    if (!profileId) {
      return NextResponse.json(
        { error: { code: 'PROFILE_NOT_FOUND', message: 'Profile not found' } },
        { status: 404 }
      )
    }

    const { handle } = await request.json()

    // If handle is empty string, set to null (make private)
    const newHandle = handle === '' || handle === null ? null : handle

    if (newHandle !== null) {
      // Validate format
      const validation = isValidHandle(newHandle)
      if (!validation.valid) {
        return NextResponse.json(
          { error: { code: 'INVALID_HANDLE', message: validation.error } },
          { status: 400 }
        )
      }

      // Check availability
      const supabase = await createClient()
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('public_handle', newHandle)
        .neq('id', profileId)
        .single()

      if (existing) {
        return NextResponse.json(
          { error: { code: 'HANDLE_TAKEN', message: 'This handle is already taken' } },
          { status: 400 }
        )
      }
    }

    // Update profile
    const supabase = await createClient()
    const { data: profile, error } = await supabase
      .from('profiles')
      .update({ public_handle: newHandle })
      .eq('id', profileId)
      .select()
      .single()

    if (error) {
      console.error('Error updating profile handle:', error)
      return NextResponse.json(
        { error: { code: 'UPDATE_FAILED', message: error.message } },
        { status: 500 }
      )
    }

    return NextResponse.json({ data: profile })
  } catch (error: any) {
    console.error('Error updating profile handle:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to update handle' } },
      { status: 500 }
    )
  }
}





