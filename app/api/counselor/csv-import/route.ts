import { NextResponse, NextRequest } from 'next/server'
import { requireAuth, ensureUserAndProfile } from '@/lib/auth-helpers'
import { createServiceClient } from '@/lib/supabase/service'
import { parseParticipantCSV, generateCSVTemplate } from '@/lib/csv/participant-parser'

/**
 * GET /api/counselor/csv-import
 * Get CSV template for download
 */
export async function GET() {
  const template = generateCSVTemplate()
  
  return new NextResponse(template, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="mentorshape-import-template.csv"',
    },
  })
}

/**
 * POST /api/counselor/csv-import
 * Import participants from CSV
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

    const supabase = createServiceClient()

    // Check if user is an org admin
    const { data: adminMembership, error: memberError } = await supabase
      .from('org_members')
      .select('id, org_id, role, org:organizations!org_members_org_id_fkey(*)')
      .eq('profile_id', profile.id)
      .eq('role', 'admin')
      .single()

    if (memberError || !adminMembership) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Only school administrators can import participants' } },
        { status: 403 }
      )
    }

    const orgId = adminMembership.org_id

    // Parse request body
    const body = await request.json()
    const { csv_content, program_id, dry_run = false } = body

    if (!csv_content || typeof csv_content !== 'string') {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'csv_content is required' } },
        { status: 400 }
      )
    }

    // Parse the CSV
    const parseResult = parseParticipantCSV(csv_content)

    // If dry_run or errors exist, return parse result without importing
    if (dry_run || parseResult.errors.length > 0) {
      return NextResponse.json({
        data: {
          dry_run: true,
          parse_result: parseResult,
        },
      })
    }

    // Import participants
    const imported: Array<{ email: string; name: string; role: string; status: string; org_member_id?: string }> = []
    const skipped: Array<{ email: string; reason: string }> = []

    for (const participant of parseResult.participants) {
      // Check if already a member by email
      const { data: existingMember } = await supabase
        .from('org_members')
        .select('id, profile_id, invited_email')
        .eq('org_id', orgId)
        .or(`invited_email.eq.${participant.email}`)
        .single()

      // Also check if user exists with this email
      const { data: existingUser } = await supabase
        .from('users')
        .select('id, profiles!profiles_user_id_fkey(id)')
        .eq('email', participant.email)
        .single()

      if (existingMember) {
        skipped.push({ email: participant.email, reason: 'Already a member or invited' })
        continue
      }

      // If user exists, add them directly as a member
      if (existingUser && existingUser.profiles) {
        const profiles = Array.isArray(existingUser.profiles) ? existingUser.profiles : [existingUser.profiles]
        const userProfile = profiles[0]

        if (userProfile) {
          const { data: newMember, error: createError } = await supabase
            .from('org_members')
            .insert({
              org_id: orgId,
              profile_id: userProfile.id,
              role: participant.role,
              status: 'active',
              year_grade: participant.year_grade,
              joined_at: new Date().toISOString(),
            })
            .select('id')
            .single()

          if (createError) {
            skipped.push({ email: participant.email, reason: createError.message })
          } else {
            imported.push({
              email: participant.email,
              name: participant.name,
              role: participant.role,
              status: 'active',
              org_member_id: newMember.id,
            })
          }

          // Add to program if specified
          if (program_id && newMember) {
            await supabase.from('program_participants').insert({
              program_id,
              profile_id: userProfile.id,
              role: participant.role,
            })
          }

          continue
        }
      }

      // User doesn't exist - create pending invite
      const { data: newMember, error: createError } = await supabase
        .from('org_members')
        .insert({
          org_id: orgId,
          profile_id: null, // Will be linked when user signs up
          role: participant.role,
          status: 'pending',
          invited_email: participant.email,
          invited_at: new Date().toISOString(),
          year_grade: participant.year_grade,
          metadata: { imported_name: participant.name },
        })
        .select('id')
        .single()

      if (createError) {
        skipped.push({ email: participant.email, reason: createError.message })
      } else {
        imported.push({
          email: participant.email,
          name: participant.name,
          role: participant.role,
          status: 'pending',
          org_member_id: newMember.id,
        })
      }
    }

    return NextResponse.json({
      data: {
        dry_run: false,
        imported,
        skipped,
        stats: {
          total_processed: parseResult.participants.length,
          imported_count: imported.length,
          skipped_count: skipped.length,
          active_count: imported.filter(i => i.status === 'active').length,
          pending_count: imported.filter(i => i.status === 'pending').length,
        },
      },
    })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }

    console.error('Error in POST /api/counselor/csv-import:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to import participants' } },
      { status: 500 }
    )
  }
}
