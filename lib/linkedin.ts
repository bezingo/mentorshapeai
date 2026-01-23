/**
 * LinkedIn API client for fetching profile data
 * Uses LinkedIn API v2 with OAuth 2.0
 */

interface LinkedInProfileResponse {
  id: string
  firstName: {
    localized: { [locale: string]: string }
    preferredLocale: { country: string; language: string }
  }
  lastName: {
    localized: { [locale: string]: string }
    preferredLocale: { country: string; language: string }
  }
  headline?: {
    localized: { [locale: string]: string }
    preferredLocale: { country: string; language: string }
  }
  summary?: {
    localized: { [locale: string]: string }
    preferredLocale: { country: string; language: string }
  }
  profilePicture?: {
    displayImage: string
  }
}

interface LinkedInPosition {
  id: number
  title: string
  companyName: string
  description?: string
  location?: {
    country: string
    geographicArea?: string
  }
  timePeriod: {
    startDate: {
      year: number
      month?: number
    }
    endDate?: {
      year: number
      month?: number
    }
  }
}

interface LinkedInEducation {
  id: number
  school: {
    name: string
  }
  degreeName?: string
  fieldOfStudy?: string
  timePeriod: {
    startDate: {
      year: number
      month?: number
    }
    endDate?: {
      year: number
      month?: number
    }
  }
}

interface LinkedInSkill {
  name: string
}

/**
 * Exchange authorization code for access token
 */
export async function getLinkedInAccessToken(code: string, redirectUri: string): Promise<string> {
  const clientId = process.env.NEXT_PUBLIC_LINKEDIN_CLIENT_ID
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error('LinkedIn OAuth credentials are not configured')
  }

  const response = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to get LinkedIn access token: ${error}`)
  }

  const data = await response.json()
  return data.access_token
}

/**
 * Fetch LinkedIn profile data using access token
 * Uses OpenID Connect userinfo endpoint for basic info
 * Also tries to fetch additional profile fields if r_liteprofile is available
 */
export async function fetchLinkedInProfile(accessToken: string): Promise<any> {
  // First get basic profile from OpenID Connect
  const userInfoResponse = await fetch(
    'https://api.linkedin.com/v2/userinfo',
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  )

  if (!userInfoResponse.ok) {
    const error = await userInfoResponse.text()
    throw new Error(`Failed to fetch LinkedIn profile: ${error}`)
  }

  const userInfo = await userInfoResponse.json()

  // Try to get additional profile fields (headline, summary) if r_liteprofile is available
  try {
    const profileResponse = await fetch(
      'https://api.linkedin.com/v2/me?projection=(id,firstName,lastName,headline,summary,profilePicture(displayImage~:playableStreams))',
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'X-Restli-Protocol-Version': '2.0.0',
        },
      }
    )

    if (profileResponse.ok) {
      const profileData = await profileResponse.json()
      
      // Merge additional fields if available
      return {
        ...userInfo,
        headline: profileData.headline || null,
        summary: profileData.summary || null,
        // Extract localized values if present
        headline_text: profileData.headline?.localized?.[Object.keys(profileData.headline.localized)[0]] || null,
        summary_text: profileData.summary?.localized?.[Object.keys(profileData.summary.localized)[0]] || null,
      }
    }
  } catch (error) {
    // If additional profile fetch fails, continue with basic userinfo
    console.warn('Could not fetch additional LinkedIn profile fields. Using basic profile only.')
  }

  return userInfo
}

/**
 * Extract LinkedIn profile URL from OAuth response
 * Tries multiple methods to get the profile URL:
 * 1. Check userinfo response for profile URL
 * 2. Fetch vanityName from LinkedIn People API
 * 3. Fall back to constructing URL from user ID (may not work)
 */
export async function getLinkedInProfileUrl(accessToken: string, userInfo?: any): Promise<string | null> {
  // First, check if userinfo includes a profile URL
  if (userInfo?.profile) {
    return userInfo.profile
  }

  try {
    // Try to get profile URL from LinkedIn People API
    // The profile endpoint might include vanityName
    const response = await fetch(
      'https://api.linkedin.com/v2/me?projection=(id,vanityName)',
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'X-Restli-Protocol-Version': '2.0.0',
        },
      }
    )

    if (response.ok) {
      const data = await response.json()
      const vanityName = data.vanityName
      
      if (vanityName) {
        return `https://www.linkedin.com/in/${vanityName}`
      }
      
      // If no vanity name, try to use the ID (though this might not work)
      // LinkedIn profile URLs typically use vanity names, not IDs
      if (data.id && userInfo?.sub === data.id) {
        // Note: This might not work as LinkedIn URLs use vanity names
        // But we'll try it as a fallback
        console.warn('Using LinkedIn user ID as fallback for profile URL (may not work)')
        return `https://www.linkedin.com/in/${data.id}`
      }
    }
  } catch (error) {
    console.warn('Could not fetch LinkedIn profile URL from People API:', error)
  }

  return null
}

/**
 * Fetch LinkedIn profile positions (work experience)
 * Uses People API with proper projection
 * Requires r_liteprofile scope (deprecated but may still work for existing apps)
 */
export async function fetchLinkedInPositions(accessToken: string): Promise<LinkedInPosition[]> {
  try {
    // Try the v2 People API endpoint with positions projection
    const response = await fetch(
      'https://api.linkedin.com/v2/me?projection=(id,positions~(id,title,companyName,description,location,timePeriod))',
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'X-Restli-Protocol-Version': '2.0.0',
        },
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.warn('LinkedIn positions API failed:', response.status, errorText)
      
      // If 403 Forbidden, likely missing r_liteprofile scope
      if (response.status === 403) {
        console.warn('LinkedIn positions require r_liteprofile scope. This scope may not be available for your app.')
      }
      
      return []
    }

    const data = await response.json()
    return data.positions?.elements || []
  } catch (error) {
    console.warn('Error fetching LinkedIn positions:', error)
    return []
  }
}

/**
 * Fetch LinkedIn education
 * Requires r_liteprofile scope (deprecated but may still work for existing apps)
 */
export async function fetchLinkedInEducation(accessToken: string): Promise<LinkedInEducation[]> {
  try {
    const response = await fetch(
      'https://api.linkedin.com/v2/me?projection=(id,educations~(id,school,degreeName,fieldOfStudy,timePeriod))',
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'X-Restli-Protocol-Version': '2.0.0',
        },
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.warn('LinkedIn education API failed:', response.status, errorText)
      
      // If 403 Forbidden, likely missing r_liteprofile scope
      if (response.status === 403) {
        console.warn('LinkedIn education requires r_liteprofile scope. This scope may not be available for your app.')
      }
      
      return []
    }

    const data = await response.json()
    return data.educations?.elements || []
  } catch (error) {
    console.warn('Error fetching LinkedIn education:', error)
    return []
  }
}

/**
 * Fetch LinkedIn skills
 * Requires r_liteprofile scope (deprecated but may still work for existing apps)
 */
export async function fetchLinkedInSkills(accessToken: string): Promise<LinkedInSkill[]> {
  try {
    const response = await fetch(
      'https://api.linkedin.com/v2/me?projection=(id,skills~(elements*(name)))',
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'X-Restli-Protocol-Version': '2.0.0',
        },
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.warn('LinkedIn skills API failed:', response.status, errorText)
      
      // If 403 Forbidden, likely missing r_liteprofile scope
      if (response.status === 403) {
        console.warn('LinkedIn skills require r_liteprofile scope. This scope may not be available for your app.')
      }
      
      return []
    }

    const data = await response.json()
    return data.skills?.elements || []
  } catch (error) {
    console.warn('Error fetching LinkedIn skills:', error)
    return []
  }
}

/**
 * Convert LinkedIn API data to our profile format
 */
export function convertLinkedInToProfile(profile: any, positions: LinkedInPosition[], educations: LinkedInEducation[], skills: LinkedInSkill[]) {
  // LinkedIn OpenID Connect userinfo returns: given_name, family_name, name, email, picture
  const displayName = profile.name || `${profile.given_name || ''} ${profile.family_name || ''}`.trim() || 'LinkedIn User'
  
  // Try to get headline and summary from merged profile data
  const headline = profile.headline_text || profile.headline?.localized?.[Object.keys(profile.headline?.localized || {})[0]] || null
  const bio = profile.summary_text || profile.summary?.localized?.[Object.keys(profile.summary?.localized || {})[0]] || null

  const workExperiences = positions.map((pos) => ({
    company: pos.companyName || 'Unknown Company',
    title: pos.title || 'Unknown Title',
    description: pos.description || null,
    start_date: pos.timePeriod?.startDate
      ? `${pos.timePeriod.startDate.year}-${String(pos.timePeriod.startDate.month || 1).padStart(2, '0')}-01`
      : null,
    end_date: pos.timePeriod?.endDate
      ? `${pos.timePeriod.endDate.year}-${String(pos.timePeriod.endDate.month || 12).padStart(2, '0')}-01`
      : null,
  }))

  const educationsData = educations.map((edu) => ({
    institution: edu.school?.name || 'Unknown Institution',
    degree: edu.degreeName || edu.fieldOfStudy || null,
    start_date: edu.timePeriod?.startDate
      ? `${edu.timePeriod.startDate.year}-${String(edu.timePeriod.startDate.month || 1).padStart(2, '0')}-01`
      : null,
    end_date: edu.timePeriod?.endDate
      ? `${edu.timePeriod.endDate.year}-${String(edu.timePeriod.endDate.month || 12).padStart(2, '0')}-01`
      : null,
  }))

  const skillsData = skills.map((skill) => skill.name || skill).filter(Boolean)

  return {
    display_name: displayName,
    headline,
    bio,
    work_experiences: workExperiences,
    educations: educationsData,
    skills: skillsData,
  }
}

