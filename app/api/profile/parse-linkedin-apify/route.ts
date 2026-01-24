import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/clerk'
import { scrapeLinkedInProfileWithApify, convertApifyToProfile } from '@/lib/apify'

/**
 * POST /api/profile/parse-linkedin-apify
 * 
 * Scrapes a LinkedIn profile URL using Apify and returns structured data for review.
 * Does NOT auto-save to the database - returns data for user confirmation.
 * Use /api/profile/import to save confirmed data.
 * 
 * Request body:
 * {
 *   linkedin_url: string - The LinkedIn profile URL to scrape
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

    const { linkedin_url } = await request.json()

    if (!linkedin_url || typeof linkedin_url !== 'string') {
      return NextResponse.json(
        { error: { code: 'INVALID_URL', message: 'LinkedIn URL is required' } },
        { status: 400 }
      )
    }

    // Normalize LinkedIn URL
    let normalizedUrl = linkedin_url.trim()
    
    // Ensure URL contains linkedin.com/in/
    if (!normalizedUrl.includes('linkedin.com/in/')) {
      return NextResponse.json(
        { error: { code: 'INVALID_URL', message: 'Invalid LinkedIn URL. URL must contain linkedin.com/in/' } },
        { status: 400 }
      )
    }

    // Ensure URL starts with https://
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
      normalizedUrl = `https://${normalizedUrl}`
    }

    // Scrape LinkedIn profile using Apify
    const apifyData = await scrapeLinkedInProfileWithApify(normalizedUrl)

    if (!apifyData) {
      return NextResponse.json(
        {
          error: {
            code: 'SCRAPE_FAILED',
            message: 'Unable to scrape LinkedIn profile. The profile may be private or unavailable.',
          },
        },
        { status: 400 }
      )
    }

    // Log the actual structure for debugging (remove in production if needed)
    console.log('Apify response structure:', JSON.stringify(apifyData, null, 2))

    // Convert Apify data to our profile format
    let parsedData
    try {
      parsedData = convertApifyToProfile(apifyData)
      
      // Ensure parsedData is a plain object, not the raw Apify response
      if (!parsedData || typeof parsedData !== 'object' || Array.isArray(parsedData)) {
        throw new Error('Invalid parsed data structure')
      }
    } catch (conversionError) {
      console.error('Error converting Apify data:', conversionError)
      return NextResponse.json(
        {
          error: {
            code: 'CONVERSION_ERROR',
            message: 'Failed to convert scraped data to profile format',
          },
        },
        { status: 500 }
      )
    }

    // Add metadata about what data was successfully retrieved
    const hasWorkExperiences = (parsedData.work_experiences || []).length > 0
    const hasEducations = (parsedData.educations || []).length > 0
    const hasSkills = (parsedData.skills || []).length > 0

    const metadata = {
      available: {
        basic: true,
        positions: hasWorkExperiences,
        education: hasEducations,
        skills: hasSkills,
      },
      message: !hasWorkExperiences && !hasEducations && !hasSkills
        ? 'Only basic profile information was retrieved.'
        : `Successfully retrieved: ${[
            hasWorkExperiences && 'work experience',
            hasEducations && 'education',
            hasSkills && 'skills',
          ].filter(Boolean).join(', ')}`,
    }

    // Return structured data for review (NOT auto-saved)
    return NextResponse.json({
      data: {
        parsed: { ...parsedData, _metadata: metadata },
        message: 'LinkedIn profile scraped successfully. Review and select which sections to import.',
      },
    })
  } catch (error) {
    console.error('LinkedIn Apify scraping error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to scrape LinkedIn profile'
    
    return NextResponse.json(
      {
        error: {
          code: 'SCRAPE_ERROR',
          message: errorMessage,
        },
      },
      { status: 500 }
    )
  }
}

