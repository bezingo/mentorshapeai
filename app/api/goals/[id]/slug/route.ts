import { NextResponse } from 'next/server'
import { requireMentee } from '@/lib/clerk'
import { getProfileId } from '@/lib/clerk'
import { createClient } from '@/lib/supabase/server'
import { generateUniqueSlug, isValidSlug } from '@/lib/utils/slug'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireMentee()
    const profileId = await getProfileId()

    if (!profileId) {
      return NextResponse.json(
        { error: { code: 'PROFILE_NOT_FOUND', message: 'Profile not found' } },
        { status: 404 }
      )
    }

    const { slug, regenerate } = await request.json()
    const { id } = await params

    const supabase = await createClient()

    // Verify goal belongs to user
    const { data: goal, error: goalError } = await supabase
      .from('goals')
      .select('id, title, profile_id')
      .eq('id', id)
      .single()

    if (goalError || !goal) {
      return NextResponse.json(
        { error: { code: 'GOAL_NOT_FOUND', message: 'Goal not found' } },
        { status: 404 }
      )
    }

    if (goal.profile_id !== profileId) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Not authorized' } },
        { status: 403 }
      )
    }

    let newSlug: string | null = null

    if (regenerate) {
      // Auto-generate new slug
      newSlug = await generateUniqueSlug(goal.title, async (s) => {
        const { data } = await supabase
          .from('goals')
          .select('id')
          .eq('public_slug', s)
          .neq('id', id)
          .single()
        return !data
      })
    } else if (slug) {
      // Validate provided slug
      const validation = isValidSlug(slug)
      if (!validation.valid) {
        return NextResponse.json(
          { error: { code: 'INVALID_SLUG', message: validation.error } },
          { status: 400 }
        )
      }

      // Check availability
      const { data: existing } = await supabase
        .from('goals')
        .select('id')
        .eq('public_slug', slug)
        .neq('id', id)
        .single()

      if (existing) {
        return NextResponse.json(
          { error: { code: 'SLUG_TAKEN', message: 'This slug is already taken' } },
          { status: 400 }
        )
      }

      newSlug = slug
    } else {
      // Remove public slug (make private)
      newSlug = null
    }

    // Update goal
    const { data: updatedGoal, error: updateError } = await supabase
      .from('goals')
      .update({ public_slug: newSlug })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating goal slug:', updateError)
      return NextResponse.json(
        { error: { code: 'UPDATE_FAILED', message: updateError.message } },
        { status: 500 }
      )
    }

    return NextResponse.json({ data: updatedGoal })
  } catch (error: any) {
    console.error('Error updating goal slug:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to update slug' } },
      { status: 500 }
    )
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { searchParams } = new URL(request.url)
    const slug = searchParams.get('slug')

    if (!slug) {
      return NextResponse.json(
        { error: { code: 'MISSING_SLUG', message: 'Slug parameter required' } },
        { status: 400 }
      )
    }

    const { id } = await params
    const supabase = await createClient()

    // Check if slug is available (excluding current goal)
    const { data: existing } = await supabase
      .from('goals')
      .select('id')
      .eq('public_slug', slug)
      .neq('id', id)
      .single()

    return NextResponse.json({
      data: {
        available: !existing,
        slug,
      },
    })
  } catch (error) {
    console.error('Error checking slug availability:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to check availability' } },
      { status: 500 }
    )
  }
}





