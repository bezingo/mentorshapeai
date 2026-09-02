import { NextResponse } from 'next/server'
import { requireAuth, getProfileId } from '@/lib/auth-helpers'
import { scrapeLinkedInProfile } from '@/lib/firecrawl'
import { parseProfileText } from '@/lib/ai/profile-builder'

/**
 * POST /api/profile/parse-linkedin
 *
 * Parses a LinkedIn profile URL and returns structured data for review.
 * Does NOT auto-save to the database - returns data for user confirmation.
 * Use /api/profile/import to save confirmed data.
 *
 * Request body:
 * {
 *   linkedin_url: string - The LinkedIn profile URL to parse
 * }
 *
 * Response:
 * {
 *   data: {
 *     parsed: ProfileData - Structured profile data for review
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

    const { linkedin_url } = await request.json()

    if (!linkedin_url || !linkedin_url.includes('linkedin.com/in/')) {
      return NextResponse.json(
        { error: { code: 'INVALID_URL', message: 'Invalid LinkedIn URL. URL must contain linkedin.com/in/' } },
        { status: 400 }
      )
    }

    // Scrape LinkedIn profile using Firecrawl
    const scrapedText = await scrapeLinkedInProfile(linkedin_url)

    if (!scrapedText || scrapedText.trim().length === 0) {
      return NextResponse.json(
        {
          error: {
            code: 'SCRAPE_FAILED',
            message: 'Unable to extract content from LinkedIn profile. The profile may be private or unavailable.',
          },
        },
        { status: 400 }
      )
    }

    // Parse the scraped content with AI
    const parsedData = await parseProfileText(scrapedText)

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
        source: 'linkedin',
        message: 'LinkedIn profile parsed successfully. Review the data and use the import endpoint to save.',
      },
    })
  } catch (error: unknown) {
    console.error('Error parsing LinkedIn:', error)

    const errorMessage = error instanceof Error ? error.message : 'Failed to parse LinkedIn profile'

    // Handle specific error cases
    if (errorMessage.includes('FIRECRAWL_API_KEY') || errorMessage.includes('not configured')) {
      return NextResponse.json(
        {
          error: {
            code: 'CONFIG_ERROR',
            message: 'LinkedIn scraping is not configured. Please add FIRECRAWL_API_KEY to your environment variables.',
          },
        },
        { status: 500 }
      )
    }

    if (errorMessage.includes('private') || errorMessage.includes('authentication')) {
      return NextResponse.json(
        {
          error: {
            code: 'SCRAPE_FAILED',
            message: 'Unable to access LinkedIn profile. The profile may be private or require login.',
          },
        },
        { status: 400 }
      )
    }

    if (errorMessage.includes('Rate limit')) {
      return NextResponse.json(
        {
          error: {
            code: 'RATE_LIMIT',
            message: 'Too many requests. Please try again in a few minutes.',
          },
        },
        { status: 429 }
      )
    }

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
