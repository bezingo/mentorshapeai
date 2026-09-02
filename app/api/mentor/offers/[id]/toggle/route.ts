import { NextResponse, NextRequest } from 'next/server'
import { ensureUserAndProfile, requireAuth } from '@/lib/auth-helpers'
import { createServiceClient } from '@/lib/supabase/service'

/**
 * PATCH /api/mentor/offers/[id]/toggle
 * Toggle the active status of a mentor offer
 */
export async function PATCH(
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

    const { id } = await params
    const serviceSupabase = createServiceClient()

    // Fetch the existing offer to verify ownership and get current status
    const { data: existingOffer, error: fetchError } = await serviceSupabase
      .from('mentor_offers')
      .select('id, mentor_profile_id, is_active')
      .eq('id', id)
      .single()

    if (fetchError || !existingOffer) {
      return NextResponse.json(
        { error: { code: 'OFFER_NOT_FOUND', message: 'Mentor offer not found' } },
        { status: 404 }
      )
    }

    // Verify ownership
    if (existingOffer.mentor_profile_id !== profile.id) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Not authorized to update this offer' } },
        { status: 403 }
      )
    }

    // Toggle the is_active status
    const newActiveStatus = !existingOffer.is_active

    // Update the offer
    const { data: updatedOffer, error: updateError } = await serviceSupabase
      .from('mentor_offers')
      .update({ is_active: newActiveStatus })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Error toggling mentor offer:', updateError)
      return NextResponse.json(
        { error: { code: 'UPDATE_FAILED', message: updateError.message } },
        { status: 500 }
      )
    }

    return NextResponse.json({ data: updatedOffer })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }

    console.error('Error in PATCH /api/mentor/offers/[id]/toggle:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to toggle mentor offer' } },
      { status: 500 }
    )
  }
}
