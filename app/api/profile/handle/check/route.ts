import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/clerk'
import { getProfileId } from '@/lib/clerk'
import { createClient } from '@/lib/supabase/server'
import { isValidHandle } from '@/lib/utils/slug'

export async function GET(request: Request) {
  try {
    await requireAuth()
    const profileId = await getProfileId()

    const { searchParams } = new URL(request.url)
    const handle = searchParams.get('handle')

    if (!handle) {
      return NextResponse.json(
        { error: { code: 'MISSING_HANDLE', message: 'Handle parameter required' } },
        { status: 400 }
      )
    }

    // Validate format
    const validation = isValidHandle(handle)
    if (!validation.valid) {
      return NextResponse.json({
        data: {
          available: false,
          handle,
          error: validation.error,
        },
      })
    }

    const supabase = await createClient()

    // Check if handle is available (excluding current profile)
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('public_handle', handle)
      .neq('id', profileId || '')
      .single()

    return NextResponse.json({
      data: {
        available: !existing,
        handle,
      },
    })
  } catch (error) {
    console.error('Error checking handle availability:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to check availability' } },
      { status: 500 }
    )
  }
}





