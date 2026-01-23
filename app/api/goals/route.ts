import { NextResponse } from 'next/server'
import { requireMentee } from '@/lib/clerk'
import { ensureUserAndProfile } from '@/lib/clerk'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { generateUniqueSlug, isValidSlug } from '@/lib/utils/slug'
import { z } from 'zod'

const CreateGoalSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  category: z.string().optional(),
  duration_days: z.number().int().positive().optional(),
  success_definition: z.string().optional(),
  current_challenges: z.string().optional(),
  motivation: z.string().optional(),
  suggested_approach: z.string().optional(),
  public_slug: z.string().optional(),
  status: z.enum(['draft', 'active']).default('draft'),
})

export async function POST(request: Request) {
  try {
    await requireMentee()
    // Ensure user and profile exist (creates if missing)
    const profile = await ensureUserAndProfile()

    if (!profile || !profile.id) {
      return NextResponse.json(
        { error: { code: 'PROFILE_NOT_FOUND', message: 'Profile not found' } },
        { status: 404 }
      )
    }

    const profileId = profile.id

    const body = await request.json()
    const validatedData = CreateGoalSchema.parse(body)

    const supabase = await createClient()
    // Use service client for insert to bypass RLS
    // We've already verified authorization at API level (requireMentee + ensureUserAndProfile)
    const serviceSupabase = createServiceClient()

    // Generate public_slug if not provided
    let publicSlug = validatedData.public_slug

    if (!publicSlug && validatedData.status === 'active') {
      // Auto-generate slug from title
      publicSlug = await generateUniqueSlug(validatedData.title, async (slug) => {
        const { data } = await serviceSupabase
          .from('goals')
          .select('id')
          .eq('public_slug', slug)
          .single()
        return !data
      })
    } else if (publicSlug) {
      // Validate provided slug
      const validation = isValidSlug(publicSlug)
      if (!validation.valid) {
        return NextResponse.json(
          { error: { code: 'INVALID_SLUG', message: validation.error } },
          { status: 400 }
        )
      }

      // Check availability
      const { data: existing } = await serviceSupabase
        .from('goals')
        .select('id')
        .eq('public_slug', publicSlug)
        .single()

      if (existing) {
        return NextResponse.json(
          { error: { code: 'SLUG_TAKEN', message: 'This slug is already taken' } },
          { status: 400 }
        )
      }
    }

    // Create goal using service client
    // Authorization is enforced at API level, not RLS level
    // This is necessary because Clerk JWT claims aren't automatically passed to Supabase
    const { data: goal, error } = await serviceSupabase
      .from('goals')
      .insert({
        profile_id: profileId,
        title: validatedData.title,
        description: validatedData.description,
        category: validatedData.category,
        duration_days: validatedData.duration_days,
        success_definition: validatedData.success_definition,
        current_challenges: validatedData.current_challenges,
        motivation: validatedData.motivation,
        suggested_approach: validatedData.suggested_approach,
        status: validatedData.status,
        public_slug: publicSlug || null,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating goal:', error)
      return NextResponse.json(
        { error: { code: 'CREATE_FAILED', message: error.message } },
        { status: 500 }
      )
    }

    return NextResponse.json({ data: goal }, { status: 201 })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: error.errors[0].message } },
        { status: 400 }
      )
    }

    console.error('Error creating goal:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to create goal' } },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  try {
    await requireMentee()
    // Ensure user and profile exist (creates if missing)
    const profile = await ensureUserAndProfile()

    if (!profile || !profile.id) {
      return NextResponse.json(
        { error: { code: 'PROFILE_NOT_FOUND', message: 'Profile not found' } },
        { status: 404 }
      )
    }

    const profileId = profile.id

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    const supabase = await createClient()
    let query = supabase.from('goals').select('*').eq('profile_id', profileId)

    if (status) {
      query = query.eq('status', status)
    }

    const { data: goals, error } = await query.order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching goals:', error)
      return NextResponse.json(
        { error: { code: 'FETCH_FAILED', message: error.message } },
        { status: 500 }
      )
    }

    return NextResponse.json({ data: goals || [] })
  } catch (error) {
    console.error('Error fetching goals:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch goals' } },
      { status: 500 }
    )
  }
}

