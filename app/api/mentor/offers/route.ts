import { NextResponse, NextRequest } from 'next/server'
import { ensureUserAndProfile, requireAuth } from '@/lib/clerk'
import { createServiceClient } from '@/lib/supabase/service'
import { z } from 'zod'

/**
 * Valid mentor offer types
 */
const OfferTypes = ['free_collab', 'paid_consult', 'digital_product'] as const

/**
 * Schema for creating a new mentor offer
 */
const CreateOfferSchema = z.object({
  type: z.enum(OfferTypes, {
    errorMap: () => ({ message: `Type must be one of: ${OfferTypes.join(', ')}` }),
  }),
  title: z.string().min(1, 'Title is required').max(200, 'Title must be 200 characters or less'),
  description: z.string().max(2000, 'Description must be 2000 characters or less').nullable().optional(),
  price_cents: z.number().int().min(0, 'Price cannot be negative').nullable().optional(),
  currency: z.string().length(3, 'Currency must be 3 characters (e.g., usd)').default('usd'),
  duration_minutes: z.number().int().min(1, 'Duration must be at least 1 minute').max(480, 'Duration cannot exceed 8 hours').nullable().optional(),
  is_active: z.boolean().default(true),
  sort_order: z.number().int().min(0).default(0),
})

/**
 * GET /api/mentor/offers
 * Fetch all offers for the authenticated mentor, ordered by sort_order
 */
export async function GET() {
  try {
    await requireAuth()
    const profile = await ensureUserAndProfile()

    if (!profile || !profile.id) {
      return NextResponse.json(
        { error: { code: 'PROFILE_NOT_FOUND', message: 'Profile not found' } },
        { status: 404 }
      )
    }

    const serviceSupabase = createServiceClient()

    // Fetch all offers for this mentor, ordered by sort_order
    const { data: offers, error } = await serviceSupabase
      .from('mentor_offers')
      .select('id, mentor_profile_id, type, title, description, price_cents, currency, duration_minutes, is_active, payment_required, sort_order')
      .eq('mentor_profile_id', profile.id)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching mentor offers:', error)
      return NextResponse.json(
        { error: { code: 'FETCH_FAILED', message: 'Failed to fetch mentor offers' } },
        { status: 500 }
      )
    }

    return NextResponse.json({ data: offers })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }

    console.error('Error in GET /api/mentor/offers:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch mentor offers' } },
      { status: 500 }
    )
  }
}

/**
 * POST /api/mentor/offers
 * Create a new mentor offer with validation
 */
export async function POST(request: NextRequest) {
  try {
    await requireAuth()
    const profile = await ensureUserAndProfile()

    if (!profile || !profile.id) {
      return NextResponse.json(
        { error: { code: 'PROFILE_NOT_FOUND', message: 'Profile not found' } },
        { status: 404 }
      )
    }

    const body = await request.json()

    // Validate input
    const parseResult = CreateOfferSchema.safeParse(body)
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

    const {
      type,
      title,
      description,
      price_cents,
      currency,
      duration_minutes,
      is_active,
      sort_order,
    } = parseResult.data

    // Validate type-specific requirements
    if (type === 'paid_consult') {
      if (!price_cents || price_cents <= 0) {
        return NextResponse.json(
          { error: { code: 'VALIDATION_ERROR', message: 'Paid consultations require a price greater than 0' } },
          { status: 400 }
        )
      }
      if (!duration_minutes || duration_minutes <= 0) {
        return NextResponse.json(
          { error: { code: 'VALIDATION_ERROR', message: 'Paid consultations require a duration' } },
          { status: 400 }
        )
      }
    }

    // For paid offers, set payment_required=true since Stripe Connect is deferred to Phase 4
    const payment_required = type === 'paid_consult'

    const serviceSupabase = createServiceClient()

    // Get the next sort_order if not explicitly provided and default is used
    let effectiveSortOrder = sort_order
    if (sort_order === 0 && !body.sort_order) {
      // Get the max sort_order for this mentor and add 1
      const { data: maxOrderResult } = await serviceSupabase
        .from('mentor_offers')
        .select('sort_order')
        .eq('mentor_profile_id', profile.id)
        .order('sort_order', { ascending: false })
        .limit(1)
        .single()

      if (maxOrderResult) {
        effectiveSortOrder = maxOrderResult.sort_order + 1
      }
    }

    // Create the offer
    const { data: newOffer, error: createError } = await serviceSupabase
      .from('mentor_offers')
      .insert({
        mentor_profile_id: profile.id,
        type,
        title,
        description: description || null,
        price_cents: price_cents || null,
        currency: currency.toLowerCase(),
        duration_minutes: duration_minutes || null,
        is_active,
        payment_required,
        sort_order: effectiveSortOrder,
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating mentor offer:', createError)
      return NextResponse.json(
        { error: { code: 'CREATE_FAILED', message: createError.message } },
        { status: 500 }
      )
    }

    return NextResponse.json({ data: newOffer }, { status: 201 })
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

    console.error('Error in POST /api/mentor/offers:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to create mentor offer' } },
      { status: 500 }
    )
  }
}
