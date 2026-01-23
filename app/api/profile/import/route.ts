import { NextResponse } from 'next/server'
import { getCurrentProfile } from '@/lib/clerk'
import { createServiceClient } from '@/lib/supabase/service'
import { z } from 'zod'

/**
 * Schema for section confirmation flags
 */
const SectionsSchema = z.object({
  personal: z.boolean().default(false),
  work: z.boolean().default(false),
  education: z.boolean().default(false),
  skills: z.boolean().default(false),
})

/**
 * Schema for parsed profile data to import
 */
const ParsedProfileSchema = z.object({
  display_name: z.string().nullable().optional(),
  headline: z.string().nullable().optional(),
  bio: z.string().nullable().optional(),
  work_experiences: z
    .array(
      z.object({
        company: z.string(),
        title: z.string(),
        start_date: z.string().nullable().optional(),
        end_date: z.string().nullable().optional(),
        description: z.string().nullable().optional(),
      })
    )
    .optional()
    .default([]),
  educations: z
    .array(
      z.object({
        institution: z.string(),
        degree: z.string().nullable().optional(),
        start_date: z.string().nullable().optional(),
        end_date: z.string().nullable().optional(),
      })
    )
    .optional()
    .default([]),
  skills: z.array(z.string()).optional().default([]),
})

/**
 * Schema for import request body
 */
const ImportRequestSchema = z.object({
  sections: SectionsSchema,
  data: ParsedProfileSchema,
})

export type ImportRequest = z.infer<typeof ImportRequestSchema>

/**
 * POST /api/profile/import
 *
 * Saves parsed profile data to the database with section-level confirmation.
 * Only sections where confirmation=true will be saved.
 *
 * Request body:
 * {
 *   sections: {
 *     personal: boolean,  // display_name, headline, bio
 *     work: boolean,      // work_experiences
 *     education: boolean, // educations
 *     skills: boolean     // skills
 *   },
 *   data: ParsedProfile   // The parsed data from LinkedIn or CV
 * }
 *
 * Response:
 * {
 *   data: {
 *     profile: Profile,
 *     imported: { personal: boolean, work: boolean, education: boolean, skills: boolean },
 *     message: string
 *   }
 * }
 */
export async function POST(request: Request) {
  try {
    const profile = await getCurrentProfile()

    if (!profile) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      )
    }

    const body = await request.json()

    // Validate request body
    let validatedData: ImportRequest
    try {
      validatedData = ImportRequestSchema.parse(body)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          {
            error: {
              code: 'VALIDATION_ERROR',
              message: error.errors[0]?.message || 'Invalid request body',
              details: error.errors,
            },
          },
          { status: 400 }
        )
      }
      throw error
    }

    const { sections, data } = validatedData
    // Use service client since RLS policies expect Clerk JWT claims
    // which Supabase doesn't receive when using Clerk authentication
    // Authentication is already verified via getCurrentProfile() above
    const supabase = createServiceClient()
    const imported = { personal: false, work: false, education: false, skills: false }

    // Track what was actually imported
    const importResults: string[] = []

    // Import personal section (display_name, headline, bio)
    if (sections.personal) {
      const personalUpdate: Record<string, string | null> = {}

      if (data.display_name) {
        personalUpdate.display_name = data.display_name
      }
      if (data.headline !== undefined) {
        personalUpdate.headline = data.headline
      }
      if (data.bio !== undefined) {
        personalUpdate.bio = data.bio
      }

      if (Object.keys(personalUpdate).length > 0) {
        const { error } = await supabase
          .from('profiles')
          .update(personalUpdate)
          .eq('id', profile.id)

        if (error) {
          console.error('Error updating personal info:', error)
          return NextResponse.json(
            { error: { code: 'UPDATE_FAILED', message: 'Failed to update personal information' } },
            { status: 500 }
          )
        }

        imported.personal = true
        importResults.push('personal info')
      }
    }

    // Import work experiences
    if (sections.work && data.work_experiences && data.work_experiences.length > 0) {
      // Delete existing work experiences for this profile
      await supabase.from('work_experiences').delete().eq('profile_id', profile.id)

      // Insert new work experiences
      const workExpsToInsert = data.work_experiences.map((exp) => ({
        profile_id: profile.id,
        company: exp.company,
        title: exp.title,
        start_date: exp.start_date || null,
        end_date: exp.end_date || null,
        description: exp.description || null,
        is_current: exp.end_date === null,
      }))

      const { error } = await supabase.from('work_experiences').insert(workExpsToInsert)

      if (error) {
        console.error('Error inserting work experiences:', error)
        return NextResponse.json(
          { error: { code: 'INSERT_FAILED', message: 'Failed to import work experiences' } },
          { status: 500 }
        )
      }

      imported.work = true
      importResults.push(`${data.work_experiences.length} work experience(s)`)
    }

    // Import educations
    if (sections.education && data.educations && data.educations.length > 0) {
      // Delete existing educations for this profile
      await supabase.from('educations').delete().eq('profile_id', profile.id)

      // Insert new educations
      const educationsToInsert = data.educations.map((edu) => ({
        profile_id: profile.id,
        institution: edu.institution,
        degree: edu.degree || null,
        start_date: edu.start_date || null,
        end_date: edu.end_date || null,
        is_current: edu.end_date === null,
      }))

      const { error } = await supabase.from('educations').insert(educationsToInsert)

      if (error) {
        console.error('Error inserting educations:', error)
        return NextResponse.json(
          { error: { code: 'INSERT_FAILED', message: 'Failed to import education' } },
          { status: 500 }
        )
      }

      imported.education = true
      importResults.push(`${data.educations.length} education(s)`)
    }

    // Import skills
    if (sections.skills && data.skills && data.skills.length > 0) {
      // Delete existing skills for this profile
      await supabase.from('skills').delete().eq('profile_id', profile.id)

      // Insert new skills (limit to 50 as per requirements)
      const skillsToInsert = data.skills.slice(0, 50).map((skill) => ({
        profile_id: profile.id,
        name: skill,
        level: null, // Default level, user can update later
      }))

      const { error } = await supabase.from('skills').insert(skillsToInsert)

      if (error) {
        console.error('Error inserting skills:', error)
        return NextResponse.json(
          { error: { code: 'INSERT_FAILED', message: 'Failed to import skills' } },
          { status: 500 }
        )
      }

      imported.skills = true
      importResults.push(`${Math.min(data.skills.length, 50)} skill(s)`)
    }

    // Fetch updated profile with completion percentage
    const { data: updatedProfile, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', profile.id)
      .single()

    if (fetchError) {
      console.error('Error fetching updated profile:', fetchError)
      return NextResponse.json(
        { error: { code: 'FETCH_FAILED', message: 'Failed to fetch updated profile' } },
        { status: 500 }
      )
    }

    // Build success message
    const importedSections = importResults.length > 0 ? importResults.join(', ') : 'nothing'
    const message =
      importResults.length > 0
        ? `Successfully imported: ${importedSections}`
        : 'No sections were selected for import'

    return NextResponse.json({
      data: {
        profile: updatedProfile,
        imported,
        message,
      },
    })
  } catch (error: unknown) {
    console.error('Error importing profile:', error)

    const errorMessage = error instanceof Error ? error.message : 'Failed to import profile'

    return NextResponse.json(
      {
        error: {
          code: 'IMPORT_FAILED',
          message: errorMessage,
        },
      },
      { status: 500 }
    )
  }
}
