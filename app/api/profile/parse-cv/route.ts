import { NextResponse } from 'next/server'
import { requireAuth, getProfileId } from '@/lib/auth-helpers'
import { extractTextFromFile, MAX_FILE_SIZE } from '@/lib/pdf-parser'
import { parseProfileText } from '@/lib/ai/profile-builder'

/**
 * POST /api/profile/parse-cv
 *
 * Parses an uploaded CV/resume file and returns structured data for review.
 * Does NOT auto-save to the database - returns data for user confirmation.
 * Use /api/profile/import to save confirmed data.
 *
 * Accepts: PDF, DOCX formats only (5MB max)
 *
 * Request: FormData with 'file' field
 *
 * Response:
 * {
 *   data: {
 *     parsed: ProfileData - Structured profile data for review
 *     source: 'cv'
 *     message: string
 *   }
 * }
 */
export async function POST(request: Request) {
  try {
    await requireAuth()
    const profileId = await getProfileId()

    if (!profileId) {
      return NextResponse.json(
        { error: { code: 'PROFILE_NOT_FOUND', message: 'Profile not found' } },
        { status: 404 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { error: { code: 'NO_FILE', message: 'No file provided' } },
        { status: 400 }
      )
    }

    // Validate file size (5MB max)
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: {
            code: 'FILE_TOO_LARGE',
            message: `File size exceeds 5MB limit. Current size: ${(file.size / (1024 * 1024)).toFixed(2)}MB`,
          },
        },
        { status: 400 }
      )
    }

    // Validate file type - only PDF and DOCX allowed (not TXT for CV)
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ]
    const allowedExtensionsCV = ['.pdf', '.docx']

    const fileName = file.name.toLowerCase()
    const isValidType =
      allowedTypes.includes(file.type) ||
      allowedExtensionsCV.some((ext) => fileName.endsWith(ext))

    if (!isValidType) {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_FILE_TYPE',
            message: 'File must be PDF or DOCX format',
          },
        },
        { status: 400 }
      )
    }

    // Extract text from file
    let cvText: string
    try {
      cvText = await extractTextFromFile(file)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to extract text from file'
      return NextResponse.json(
        {
          error: {
            code: 'EXTRACTION_FAILED',
            message,
          },
        },
        { status: 400 }
      )
    }

    if (!cvText || cvText.trim().length === 0) {
      return NextResponse.json(
        {
          error: {
            code: 'EMPTY_FILE',
            message: 'File appears to be empty or unreadable. Please upload a file with text content.',
          },
        },
        { status: 400 }
      )
    }

    // Minimum content check for meaningful parsing
    if (cvText.trim().length < 50) {
      return NextResponse.json(
        {
          error: {
            code: 'INSUFFICIENT_CONTENT',
            message: 'File content is too short. Please upload a complete CV/resume.',
          },
        },
        { status: 400 }
      )
    }

    // Parse with AI
    const parsedData = await parseProfileText(cvText)

    // Return structured data for review (NOT auto-saved)
    // User should call /api/profile/import to save selected sections
    return NextResponse.json({
      data: {
        parsed: {
          display_name: parsedData.display_name,
          headline: parsedData.headline,
          bio: parsedData.bio,
          work_experiences: parsedData.work_experiences,
          educations: parsedData.educations,
          skills: parsedData.skills,
        },
        source: 'cv',
        fileName: file.name,
        message: 'CV parsed successfully. Review the data and use the import endpoint to save.',
      },
    })
  } catch (error: unknown) {
    console.error('Error parsing CV:', error)

    const errorMessage = error instanceof Error ? error.message : 'Failed to parse CV'

    return NextResponse.json(
      {
        error: {
          code: 'PARSE_FAILED',
          message: errorMessage,
        },
      },
      { status: 500 }
    )
  }
}

