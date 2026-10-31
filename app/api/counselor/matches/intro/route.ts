import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { getOrgAdminAccess } from '@/lib/auth/org-access'
import { sendEmail } from '@/lib/email/client'

interface MatchIntroData {
  mentorName: string
  menteeName: string
  programName: string
  orgName: string
  acceptUrl: string
  language: string
}

function matchIntroTemplate(data: MatchIntroData): string {
  const isArabic = data.language === 'ar'
  const dir = isArabic ? 'rtl' : 'ltr'

  const t = isArabic ? {
    subject: `تم اقتراح إرشاد جديد في ${data.programName}`,
    heading: 'تم اقتراح إرشاد جديد!',
    body: `تم اقتراحك كمرشد/متعلم ضمن برنامج ${data.programName} في ${data.orgName}.`,
    mentor: 'المرشد',
    mentee: 'المتعلم',
    buttonText: 'قبول أو رفض الاقتراح',
    note: 'يرجى الرد على هذا الاقتراح في أقرب وقت ممكن.',
  } : {
    subject: `New mentorship match proposed in ${data.programName}`,
    heading: 'New Mentorship Match Proposed!',
    body: `You have been proposed as a mentor/mentee in the ${data.programName} program at ${data.orgName}.`,
    mentor: 'Mentor',
    mentee: 'Mentee',
    buttonText: 'Accept or Decline',
    note: 'Please respond to this proposal as soon as possible.',
  }

  return `
<!DOCTYPE html>
<html dir="${dir}" lang="${data.language}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${t.subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 20px; direction: ${dir};">
  <div style="background: #f8fafc; border-radius: 12px; padding: 32px;">
    <div style="text-align: center; margin-bottom: 24px;">
      <h1 style="font-size: 24px; font-weight: 700; margin: 0; color: #0f172a;">${t.heading}</h1>
    </div>
    
    <div style="background: #fff; border-radius: 8px; padding: 24px; margin-bottom: 16px;">
      <p style="margin: 0 0 24px; color: #475569;">${t.body}</p>
      
      <div style="display: flex; justify-content: space-around; margin-bottom: 24px;">
        <div style="text-align: center;">
          <p style="margin: 0; color: #64748b; font-size: 14px;">${t.mentor}</p>
          <p style="margin: 4px 0 0; font-weight: 600;">${data.mentorName}</p>
        </div>
        <div style="text-align: center;">
          <p style="margin: 0; color: #64748b; font-size: 14px;">${t.mentee}</p>
          <p style="margin: 4px 0 0; font-weight: 600;">${data.menteeName}</p>
        </div>
      </div>
      
      <div style="text-align: center;">
        <a href="${data.acceptUrl}" style="display: inline-block; padding: 14px 32px; background: #E05D31; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
          ${t.buttonText}
        </a>
      </div>
    </div>
    
    <p style="text-align: center; margin: 0; color: #94a3b8; font-size: 12px;">${t.note}</p>
  </div>
</body>
</html>
  `.trim()
}

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { match_ids } = body

    if (!match_ids || !Array.isArray(match_ids) || match_ids.length === 0) {
      return NextResponse.json({ error: 'match_ids array is required' }, { status: 400 })
    }

    const supabase = await createClient()
    const access = await getOrgAdminAccess(supabase, session.user.id)

    if (!access) {
      return NextResponse.json({ error: 'No admin access' }, { status: 403 })
    }

    const { data: matches } = await supabase
      .from('matches')
      .select(`
        id,
        mentor_profile_id,
        mentee_profile_id,
        program:programs!matches_program_id_fkey(
          id,
          name,
          org_id,
          org:organizations!programs_org_id_fkey(name)
        ),
        mentor:profiles!matches_mentor_profile_id_fkey(display_name, locale, user:users!profiles_user_id_fkey(email)),
        mentee:profiles!matches_mentee_profile_id_fkey(display_name, locale, user:users!profiles_user_id_fkey(email))
      `)
      .in('id', match_ids)
      .eq('status', 'approved')

    if (!matches || matches.length === 0) {
      return NextResponse.json({ error: 'No approved matches found' }, { status: 404 })
    }

    const results = { sent: 0, errors: [] as string[] }

    for (const match of matches) {
      const program = Array.isArray(match.program) ? match.program[0] : match.program
      const org = program?.org ? (Array.isArray(program.org) ? program.org[0] : program.org) : null
      const mentor = Array.isArray(match.mentor) ? match.mentor[0] : match.mentor
      const mentee = Array.isArray(match.mentee) ? match.mentee[0] : match.mentee

      if (program?.org_id !== access.orgId) continue

      const acceptUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/matches/${match.id}/respond`

      const mentorUser = mentor?.user ? (Array.isArray(mentor.user) ? mentor.user[0] : mentor.user) : null
      const menteeUser = mentee?.user ? (Array.isArray(mentee.user) ? mentee.user[0] : mentee.user) : null

      if (mentorUser?.email) {
        try {
          const html = matchIntroTemplate({
            mentorName: mentor?.display_name || 'Mentor',
            menteeName: mentee?.display_name || 'Mentee',
            programName: program?.name || 'Program',
            orgName: org?.name || 'Organization',
            acceptUrl,
            language: mentor?.locale || 'en'
          })

          await sendEmail({
            to: mentorUser.email,
            subject: mentor?.locale === 'ar'
              ? `تم اقتراح إرشاد جديد في ${program?.name}`
              : `New mentorship match proposed in ${program?.name}`,
            html
          })

          await supabase.from('match_intros').insert({
            match_id: match.id,
            sent_to: mentorUser.email,
            language: mentor?.locale || 'en'
          })
        } catch (err) {
          results.errors.push(`Failed to send to mentor: ${mentorUser.email}`)
        }
      }

      if (menteeUser?.email) {
        try {
          const html = matchIntroTemplate({
            mentorName: mentor?.display_name || 'Mentor',
            menteeName: mentee?.display_name || 'Mentee',
            programName: program?.name || 'Program',
            orgName: org?.name || 'Organization',
            acceptUrl,
            language: mentee?.locale || 'en'
          })

          await sendEmail({
            to: menteeUser.email,
            subject: mentee?.locale === 'ar'
              ? `تم اقتراح إرشاد جديد في ${program?.name}`
              : `New mentorship match proposed in ${program?.name}`,
            html
          })

          await supabase.from('match_intros').insert({
            match_id: match.id,
            sent_to: menteeUser.email,
            language: mentee?.locale || 'en'
          })
        } catch (err) {
          results.errors.push(`Failed to send to mentee: ${menteeUser.email}`)
        }
      }

      await supabase
        .from('matches')
        .update({
          status: 'intro_sent',
          intro_sent_at: new Date().toISOString()
        })
        .eq('id', match.id)

      results.sent++
    }

    return NextResponse.json({ data: results })
  } catch (error) {
    console.error('Error sending intros:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
