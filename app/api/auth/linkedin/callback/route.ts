import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { getLinkedInAccessToken, fetchLinkedInProfile, getLinkedInProfileUrl } from '@/lib/linkedin'
import { scrapeLinkedInProfileWithApify, convertApifyToProfile } from '@/lib/apify'

/**
 * GET /api/auth/linkedin/callback
 * 
 * OAuth callback handler for LinkedIn profile import
 * This is a one-time import flow - it doesn't change the user's primary authentication method.
 * User must be already authenticated via Clerk (email/Google/etc) to import LinkedIn data.
 * 
 * Flow:
 * 1. User clicks "Import from LinkedIn" (already logged in)
 * 2. Redirects to LinkedIn OAuth
 * 3. User authorizes LinkedIn access
 * 4. Callback exchanges code for access token
 * 5. Fetches LinkedIn profile data
 * 6. Returns data to profile page for review/import
 */
export async function GET(request: Request) {
  try {
    // Verify user is authenticated (they should be logged in via Clerk)
    // This ensures we're importing data into the correct account
    try {
      await requireAuth()
    } catch {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/sign-in?redirect=/dashboard/profile&linkedin_error=not_authenticated`
      )
    }

    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const error = searchParams.get('error')
    const state = searchParams.get('state')

    if (error) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/profile?linkedin_error=${encodeURIComponent(error)}`
      )
    }

    if (!code) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/profile?linkedin_error=no_code`
      )
    }

    // Get redirect URI from state or use default
    const redirectUri = state 
      ? decodeURIComponent(state)
      : `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/linkedin/callback`

    // Exchange code for access token
    const accessToken = await getLinkedInAccessToken(code, redirectUri)

    // Fetch basic profile data from LinkedIn API (for name, email, etc.)
    const linkedInProfile = await fetchLinkedInProfile(accessToken)
    
    // Get LinkedIn profile URL for Apify scraping
    const profileUrl = await getLinkedInProfileUrl(accessToken, linkedInProfile)
    
    let profileData: any = {
      display_name: linkedInProfile.name || `${linkedInProfile.given_name || ''} ${linkedInProfile.family_name || ''}`.trim() || 'LinkedIn User',
      headline: linkedInProfile.headline_text || null,
      bio: linkedInProfile.summary_text || null,
      work_experiences: [],
      educations: [],
      skills: [],
    }
    
    let dataAvailability = {
      basic: true,
      positions: false,
      education: false,
      skills: false,
    }
    
    // Use Apify to scrape detailed profile data if we have a profile URL
    if (profileUrl) {
      try {
        console.log('Scraping LinkedIn profile with Apify:', profileUrl)
        const apifyData = await scrapeLinkedInProfileWithApify(profileUrl)
        
        if (apifyData) {
          // Convert Apify data to our format
          const apifyProfile = convertApifyToProfile(apifyData)
          
          // Merge Apify data with basic LinkedIn profile data
          // Apify data takes precedence for detailed fields
          profileData = {
            ...profileData,
            display_name: apifyProfile.display_name || profileData.display_name,
            headline: apifyProfile.headline || profileData.headline,
            bio: apifyProfile.bio || profileData.bio,
            work_experiences: apifyProfile.work_experiences || [],
            educations: apifyProfile.educations || [],
            skills: apifyProfile.skills || [],
          }
          
          dataAvailability.positions = (apifyProfile.work_experiences || []).length > 0
          dataAvailability.education = (apifyProfile.educations || []).length > 0
          dataAvailability.skills = (apifyProfile.skills || []).length > 0
        }
      } catch (error) {
        console.warn('Apify scraping failed, using basic LinkedIn profile data only:', error)
        // Continue with basic profile data if Apify fails
      }
    } else {
      console.warn('Could not determine LinkedIn profile URL, using basic profile data only')
    }
    
    // Add metadata about what data was successfully retrieved
    profileData._metadata = {
      available: dataAvailability,
      message: !dataAvailability.positions && !dataAvailability.education && !dataAvailability.skills
        ? 'Only basic profile information was retrieved. Detailed data could not be scraped from LinkedIn.'
        : `Successfully retrieved: ${[
            dataAvailability.positions && 'work experience',
            dataAvailability.education && 'education',
            dataAvailability.skills && 'skills',
          ].filter(Boolean).join(', ')}`,
    }

    // Store in session storage or pass via URL (we'll use URL for now)
    // In production, you might want to store this server-side temporarily
    const encodedData = encodeURIComponent(JSON.stringify(profileData))

    // Redirect back to profile page with data
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/profile?linkedin_import=${encodedData}`
    )
  } catch (error) {
    console.error('LinkedIn OAuth callback error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to import LinkedIn profile'
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/profile?linkedin_error=${encodeURIComponent(errorMessage)}`
    )
  }
}

