import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentProfile, requireAuth } from '@/lib/clerk'
import { createServiceClient } from '@/lib/supabase/service'
import { generateHandle, isValidHandle } from '@/lib/utils/slug'

const PublishLinkSchema = z.object({
  handle: z.string().min(3).max(50).optional(),
  /** When true, suggest handle from display name + onboarding data if omitted */
  from_onboarding: z.boolean().optional().default(true),
  /** Publish as mentor one-link (sets is_mentor when user completed mentor fields) */
  as_mentor: z.boolean().optional(),
})

async function isHandleAvailable(handle: string, profileId: string): Promise<boolean> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('profiles')
    .select('id')
    .eq('public_handle', handle)
    .neq('id', profileId)
    .maybeSingle()
  return !data
}

async function suggestHandle(profileId: string, displayName: string | null): Promise<string> {
  const supabase = createServiceClient()
  const base =
    generateHandle(displayName || 'mentor') ||
    `user-${profileId.slice(0, 8)}`

  let candidate = base
  let counter = 0
  while (!(await isHandleAvailable(candidate, profileId)) && counter < 50) {
    counter++
    candidate = `${base}-${counter}`
  }
  return candidate
}

/**
 * POST /api/profile/publish-link
 * Publish or update the user's public one-link slug from onboarding/profile data.
 */
export async function POST(request: Request) {
  try {
    await requireAuth()
    const profile = await getCurrentProfile()

    if (!profile?.id) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      )
    }

    const body = await request.json()
    const parsed = PublishLinkSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: parsed.error.errors[0]?.message ?? 'Invalid body',
          },
        },
        { status: 400 }
      )
    }

    let handle = parsed.data.handle?.trim().toLowerCase()

    if (!handle && parsed.data.from_onboarding) {
      if (profile.public_handle) {
        handle = profile.public_handle
      } else {
        handle = await suggestHandle(profile.id, profile.display_name)
      }
    }

    if (!handle) {
      return NextResponse.json(
        {
          error: {
            code: 'HANDLE_REQUIRED',
            message: 'Provide a handle or enable from_onboarding to auto-generate',
          },
        },
        { status: 400 }
      )
    }

    const validation = isValidHandle(handle)
    if (!validation.valid) {
      return NextResponse.json(
        { error: { code: 'INVALID_HANDLE', message: validation.error } },
        { status: 400 }
      )
    }

    if (!(await isHandleAvailable(handle, profile.id))) {
      return NextResponse.json(
        { error: { code: 'HANDLE_TAKEN', message: 'This handle is already taken' } },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()
    const updates: Record<string, unknown> = {
      public_handle: handle,
    }

    if (parsed.data.as_mentor === true) {
      updates.is_mentor = true
    }

    const { data: updated, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', profile.id)
      .select('id, public_handle, is_mentor, display_name, headline, bio')
      .single()

    if (error) {
      return NextResponse.json(
        { error: { code: 'UPDATE_FAILED', message: error.message } },
        { status: 500 }
      )
    }

    const publicUrl = `/m/${updated.public_handle}`

    return NextResponse.json({
      data: {
        profile: updated,
        public_url: publicUrl,
        absolute_url: publicUrl,
      },
    })
  } catch (error) {
    console.error('POST /api/profile/publish-link:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to publish profile link' } },
      { status: 500 }
    )
  }
}
