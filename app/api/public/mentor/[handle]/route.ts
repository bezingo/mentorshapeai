import { NextResponse, NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

/**
 * GET /api/public/mentor/[handle]
 * Fetch enhanced public mentor data including expertise, badges, offers, stats
 * 
 * This is a PUBLIC endpoint - no authentication required
 * Returns mentor profile data for public viewing
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ handle: string }> }
) {
  try {
    const { handle } = await params

    if (!handle || handle.trim() === '') {
      return NextResponse.json(
        { error: { code: 'HANDLE_REQUIRED', message: 'Mentor handle is required' } },
        { status: 400 }
      )
    }

    const serviceSupabase = createServiceClient()

    // Fetch the mentor profile by public handle
    const { data: profile, error: profileError } = await serviceSupabase
      .from('profiles')
      .select(`
        id,
        display_name,
        headline,
        bio,
        avatar_url,
        public_handle,
        is_mentor,
        country,
        city,
        timezone,
        years_of_experience,
        expertise_areas,
        languages,
        languages_spoken,
        can_mentor_for,
        specializations,
        mentor_onboarding_completed_at,
        created_at
      `)
      .eq('public_handle', handle)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: { code: 'MENTOR_NOT_FOUND', message: 'Mentor not found' } },
        { status: 404 }
      )
    }

    // Verify this is actually a mentor with a completed profile
    if (!profile.is_mentor) {
      return NextResponse.json(
        { error: { code: 'NOT_A_MENTOR', message: 'This user is not a mentor' } },
        { status: 404 }
      )
    }

    // Fetch active mentor offers (is_active=true only)
    const { data: offers, error: offersError } = await serviceSupabase
      .from('mentor_offers')
      .select(`
        id,
        type,
        title,
        description,
        price_cents,
        currency,
        duration_minutes,
        sort_order
      `)
      .eq('mentor_profile_id', profile.id)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (offersError) {
      console.error('Error fetching mentor offers:', offersError)
      // Non-fatal - continue without offers
    }

    // Fetch mentor badges
    const { data: badges, error: badgesError } = await serviceSupabase
      .from('mentor_badges')
      .select(`
        id,
        type,
        label,
        metadata,
        awarded_at
      `)
      .eq('mentor_profile_id', profile.id)
      .order('awarded_at', { ascending: false })

    if (badgesError) {
      console.error('Error fetching mentor badges:', badgesError)
      // Non-fatal - continue without badges
    }

    // Fetch mentor skills
    const { data: skills, error: skillsError } = await serviceSupabase
      .from('skills')
      .select(`
        id,
        name,
        level
      `)
      .eq('profile_id', profile.id)
      .eq('is_public', true)

    if (skillsError) {
      console.error('Error fetching mentor skills:', skillsError)
      // Non-fatal - continue without skills
    }

    // Fetch work experiences (public only)
    const { data: workExperiences, error: workError } = await serviceSupabase
      .from('work_experiences')
      .select(`
        id,
        company,
        title,
        start_date,
        end_date,
        description,
        is_current
      `)
      .eq('profile_id', profile.id)
      .eq('is_public', true)
      .order('start_date', { ascending: false })

    if (workError) {
      console.error('Error fetching work experiences:', workError)
      // Non-fatal - continue without work experiences
    }

    // Fetch education (public only)
    const { data: education, error: eduError } = await serviceSupabase
      .from('educations')
      .select(`
        id,
        institution,
        degree,
        start_date,
        end_date,
        is_current
      `)
      .eq('profile_id', profile.id)
      .eq('is_public', true)
      .order('start_date', { ascending: false })

    if (eduError) {
      console.error('Error fetching education:', eduError)
      // Non-fatal - continue without education
    }

    // Calculate stats from ratings table
    const { data: ratingsStats, error: ratingsError } = await serviceSupabase
      .from('ratings')
      .select('score')
      .eq('mentor_profile_id', profile.id)

    let stats = {
      total_ratings: 0,
      average_rating: null as number | null,
      total_collaborations: 0,
    }

    if (!ratingsError && ratingsStats && ratingsStats.length > 0) {
      const totalRatings = ratingsStats.length
      const avgRating = ratingsStats.reduce((sum, r) => sum + r.score, 0) / totalRatings
      stats = {
        ...stats,
        total_ratings: totalRatings,
        average_rating: Math.round(avgRating * 10) / 10, // Round to 1 decimal
      }
    }

    // Count total collaborations
    const { count: collabCount } = await serviceSupabase
      .from('collaborations')
      .select('id', { count: 'exact', head: true })
      .eq('mentor_profile_id', profile.id)
      .eq('status', 'completed')

    stats.total_collaborations = collabCount || 0

    // Build the public mentor response
    const mentorData = {
      id: profile.id,
      display_name: profile.display_name,
      headline: profile.headline,
      bio: profile.bio,
      avatar_url: profile.avatar_url,
      public_handle: profile.public_handle,
      location: profile.city && profile.country 
        ? `${profile.city}, ${profile.country}` 
        : profile.city || profile.country || null,
      timezone: profile.timezone,
      years_of_experience: profile.years_of_experience,
      expertise_areas: profile.expertise_areas || [],
      languages: profile.languages || profile.languages_spoken || [],
      can_mentor_for: profile.can_mentor_for || [],
      specializations: profile.specializations || [],
      member_since: profile.created_at,
      mentor_since: profile.mentor_onboarding_completed_at,
      skills: skills || [],
      work_experiences: workExperiences || [],
      education: education || [],
      offers: offers || [],
      badges: badges || [],
      stats,
    }

    return NextResponse.json({ data: mentorData })
  } catch (error) {
    console.error('Error in GET /api/public/mentor/[handle]:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch mentor profile' } },
      { status: 500 }
    )
  }
}
