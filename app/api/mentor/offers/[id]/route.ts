import { NextResponse, NextRequest } from 'next/server'
import { ensureUserAndProfile, requireAuth } from '@/lib/clerk'
import { createServiceClient } from '@/lib/supabase/service'
import { z } from 'zod'
import { getPaymentRequiredForMentor } from '@/lib/payments/offers'
import { syncMentorOfferStripeCatalog } from '@/lib/payments/sync-offer-stripe'

/**
 * Valid mentor offer types
 */
const OfferTypes = ['free_collab', 'paid_consult', 'digital_product'] as const

/**
 * Schema for updating a mentor offer
 */
const UpdateOfferSchema = z.object({
  type: z.enum(OfferTypes, {
    errorMap: () => ({ message: `Type must be one of: ${OfferTypes.join(', ')}` }),
  }).optional(),
  title: z.string().min(1, 'Title is required').max(200, 'Title must be 200 characters or less').optional(),
  description: z.string().max(2000, 'Description must be 2000 characters or less').nullable().optional(),
  price_cents: z.number().int().min(0, 'Price cannot be negative').nullable().optional(),
  currency: z.string().length(3, 'Currency must be 3 characters (e.g., usd)').optional(),
  duration_minutes: z.number().int().min(1, 'Duration must be at least 1 minute').max(480, 'Duration cannot exceed 8 hours').nullable().optional(),
  is_active: z.boolean().optional(),
  sort_order: z.number().int().min(0).optional(),
})

/**
 * PUT /api/mentor/offers/[id]
 * Update an existing mentor offer
 */
export async function PUT(
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
    const body = await request.json()

    // Validate input
    const parseResult = UpdateOfferSchema.safeParse(body)
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: parseResult.error.errors[0].message,
            details: parseResult.error.errors,
          },
        },
        { status: 400 }
      )
    }

    const updateData = parseResult.data
    const serviceSupabase = createServiceClient()

    // Fetch the existing offer to verify ownership
    const { data: existingOffer, error: fetchError } = await serviceSupabase
      .from('mentor_offers')
      .select('*')
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

    // Determine the effective type (updated or existing)
    const effectiveType = updateData.type ?? existingOffer.type

    // Validate type-specific requirements for the merged state
    if (effectiveType === 'paid_consult') {
      const effectivePriceCents = updateData.price_cents !== undefined 
        ? updateData.price_cents 
        : existingOffer.price_cents
      const effectiveDuration = updateData.duration_minutes !== undefined 
        ? updateData.duration_minutes 
        : existingOffer.duration_minutes

      if (!effectivePriceCents || effectivePriceCents <= 0) {
        return NextResponse.json(
          { error: { code: 'VALIDATION_ERROR', message: 'Paid consultations require a price greater than 0' } },
          { status: 400 }
        )
      }
      if (!effectiveDuration || effectiveDuration <= 0) {
        return NextResponse.json(
          { error: { code: 'VALIDATION_ERROR', message: 'Paid consultations require a duration' } },
          { status: 400 }
        )
      }
    }

    // Prepare update object
    const updateFields: Record<string, unknown> = {}

    if (updateData.type !== undefined) {
      updateFields.type = updateData.type
      updateFields.payment_required = await getPaymentRequiredForMentor(
        profile.id,
        updateData.type
      )
    }
    if (updateData.title !== undefined) updateFields.title = updateData.title
    if (updateData.description !== undefined) updateFields.description = updateData.description
    if (updateData.price_cents !== undefined) updateFields.price_cents = updateData.price_cents
    if (updateData.currency !== undefined) updateFields.currency = updateData.currency.toLowerCase()
    if (updateData.duration_minutes !== undefined) updateFields.duration_minutes = updateData.duration_minutes
    if (updateData.is_active !== undefined) updateFields.is_active = updateData.is_active
    if (updateData.sort_order !== undefined) updateFields.sort_order = updateData.sort_order

    // If no fields to update, return the existing offer
    if (Object.keys(updateFields).length === 0) {
      return NextResponse.json({ data: existingOffer })
    }

    // Update the offer
    const { data: updatedOffer, error: updateError } = await serviceSupabase
      .from('mentor_offers')
      .update(updateFields)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating mentor offer:', updateError)
      return NextResponse.json(
        { error: { code: 'UPDATE_FAILED', message: updateError.message } },
        { status: 500 }
      )
    }

    const stripeSync = await syncMentorOfferStripeCatalog(profile.id, {
      id: updatedOffer.id,
      type: updatedOffer.type,
      title: updatedOffer.title,
      description: updatedOffer.description,
      price_cents: updatedOffer.price_cents,
      currency: updatedOffer.currency,
      stripe_product_id: updatedOffer.stripe_product_id,
      stripe_price_id: updatedOffer.stripe_price_id,
    })

    return NextResponse.json({
      data: {
        ...updatedOffer,
        payment_required: stripeSync.payment_required,
        stripe_product_id: stripeSync.stripe_product_id ?? updatedOffer.stripe_product_id,
        stripe_price_id: stripeSync.stripe_price_id ?? updatedOffer.stripe_price_id,
      },
    })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }

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

    console.error('Error in PUT /api/mentor/offers/[id]:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to update mentor offer' } },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/mentor/offers/[id]
 * Delete a mentor offer
 */
export async function DELETE(
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

    // Fetch the offer to verify ownership
    const { data: existingOffer, error: fetchError } = await serviceSupabase
      .from('mentor_offers')
      .select('id, mentor_profile_id')
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
        { error: { code: 'FORBIDDEN', message: 'Not authorized to delete this offer' } },
        { status: 403 }
      )
    }

    // Delete the offer
    const { error: deleteError } = await serviceSupabase
      .from('mentor_offers')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Error deleting mentor offer:', deleteError)
      return NextResponse.json(
        { error: { code: 'DELETE_FAILED', message: deleteError.message } },
        { status: 500 }
      )
    }

    return NextResponse.json({ data: { success: true, deleted_id: id } })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }

    console.error('Error in DELETE /api/mentor/offers/[id]:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to delete mentor offer' } },
      { status: 500 }
    )
  }
}
