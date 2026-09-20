import { NextResponse, NextRequest } from 'next/server'
import { requireAuth, ensureUserAndProfile } from '@/lib/clerk'
import { createServiceClient } from '@/lib/supabase/service'
import {
  ListNotificationsQuerySchema,
  MarkNotificationsReadSchema,
} from '@/lib/validations/notifications'

/**
 * GET /api/notifications
 * List in-app notifications for the current user
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
    const parseResult = ListNotificationsQuerySchema.safeParse({
      unread_only: searchParams.get('unread_only') ?? undefined,
      limit: searchParams.get('limit') ?? undefined,
      offset: searchParams.get('offset') ?? undefined,
    })

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: parseResult.error.errors[0].message,
          },
        },
        { status: 400 }
      )
    }

    const { unread_only, limit, offset } = parseResult.data
    const supabase = createServiceClient()

    let query = supabase
      .from('notifications')
      .select('*', { count: 'exact' })
      .eq('profile_id', profile.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (unread_only) {
      query = query.is('read_at', null)
    }

    const { data, error, count } = await query

    if (error) {
      console.error('Error fetching notifications:', error)
      return NextResponse.json(
        { error: { code: 'FETCH_FAILED', message: error.message } },
        { status: 500 }
      )
    }

    const { count: unreadCount, error: unreadError } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('profile_id', profile.id)
      .is('read_at', null)

    if (unreadError) {
      console.error('Error counting unread notifications:', unreadError)
    }

    return NextResponse.json({
      data: data ?? [],
      meta: {
        total: count ?? 0,
        unread_count: unreadCount ?? 0,
        limit,
        offset,
      },
    })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }

    console.error('Error in GET /api/notifications:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch notifications' } },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/notifications
 * Mark notifications as read
 */
export async function PATCH(request: NextRequest) {
  try {
    await requireAuth()
    const profile = await ensureUserAndProfile()

    if (!profile?.id) {
      return NextResponse.json(
        { error: { code: 'PROFILE_NOT_FOUND', message: 'Profile not found' } },
        { status: 404 }
      )
    }

    const body = await request.json()
    const parseResult = MarkNotificationsReadSchema.safeParse(body)

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: parseResult.error.errors[0].message,
          },
        },
        { status: 400 }
      )
    }

    const { ids, all } = parseResult.data
    const supabase = createServiceClient()
    const readAt = new Date().toISOString()

    if (all) {
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: readAt })
        .eq('profile_id', profile.id)
        .is('read_at', null)

      if (error) {
        console.error('Error marking all notifications read:', error)
        return NextResponse.json(
          { error: { code: 'UPDATE_FAILED', message: error.message } },
          { status: 500 }
        )
      }

      return NextResponse.json({ data: { marked_all: true } })
    }

    const { error } = await supabase
      .from('notifications')
      .update({ read_at: readAt })
      .eq('profile_id', profile.id)
      .in('id', ids!)

    if (error) {
      console.error('Error marking notifications read:', error)
      return NextResponse.json(
        { error: { code: 'UPDATE_FAILED', message: error.message } },
        { status: 500 }
      )
    }

    return NextResponse.json({ data: { marked_ids: ids } })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }

    console.error('Error in PATCH /api/notifications:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to update notifications' } },
      { status: 500 }
    )
  }
}
