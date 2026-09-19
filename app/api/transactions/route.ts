import { NextResponse, NextRequest } from 'next/server'
import { ensureUserAndProfile, requireAuth } from '@/lib/clerk'
import { createServiceClient } from '@/lib/supabase/service'

/**
 * GET /api/transactions
 * List transactions where the user is buyer or mentor.
 */
export async function GET(request: NextRequest) {
  try {
    await requireAuth()
    const profile = await ensureUserAndProfile()

    if (!profile?.id) {
      return NextResponse.json(
        { error: { code: 'PROFILE_NOT_FOUND', message: 'Profile not found' } },
        { status: 404 }
      )
    }

    const { searchParams } = new URL(request.url)
    const role = searchParams.get('role')
    const limit = Math.min(Number.parseInt(searchParams.get('limit') ?? '50', 10), 100)
    const offset = Number.parseInt(searchParams.get('offset') ?? '0', 10)

    const supabase = createServiceClient()

    let query = supabase
      .from('transactions')
      .select(
        `
        id,
        buyer_profile_id,
        mentor_profile_id,
        mentor_offer_id,
        stripe_payment_intent_id,
        amount_cents,
        platform_fee_cents,
        status,
        focus_id,
        created_at,
        mentor_offer:mentor_offers(id, title, type),
        buyer:profiles!transactions_buyer_profile_id_fkey(id, display_name),
        mentor:profiles!transactions_mentor_profile_id_fkey(id, display_name)
      `
      )
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (role === 'buyer') {
      query = query.eq('buyer_profile_id', profile.id)
    } else if (role === 'mentor') {
      query = query.eq('mentor_profile_id', profile.id)
    } else {
      query = query.or(
        `buyer_profile_id.eq.${profile.id},mentor_profile_id.eq.${profile.id}`
      )
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching transactions:', error)
      return NextResponse.json(
        { error: { code: 'FETCH_FAILED', message: 'Failed to fetch transactions' } },
        { status: 500 }
      )
    }

    return NextResponse.json({ data: data ?? [] })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }

    console.error('GET /api/transactions:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch transactions' } },
      { status: 500 }
    )
  }
}
