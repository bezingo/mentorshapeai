/**
 * Apify LinkedIn Profile Scraper integration
 * Uses Apify Actor to scrape comprehensive LinkedIn profile data
 */

import { ApifyClient } from 'apify-client'

// Apify LinkedIn Profile Scraper actual response structure
interface ApifyLinkedInProfile {
  firstName?: string
  lastName?: string
  headline?: string
  about?: string
  summary?: string // Some profiles might have this
  location?: {
    linkedinText?: string
    parsed?: {
      city?: string
      state?: string
      country?: string
    }
  }
  linkedinUrl?: string
  profileUrl?: string
  experience?: Array<{
    position?: string // This is the job title
    title?: string // Alternative field name
    companyName?: string
    company?: string // Alternative field name
    description?: string
    location?: string
    startDate?: {
      year?: number
      month?: number
      text?: string
    }
    endDate?: {
      year?: number
      month?: number
      text?: string // Can be "Present" or a year string
    }
    isCurrent?: boolean
  }>
  education?: Array<{
    schoolName?: string
    school?: string // Alternative field name
    degree?: string
    fieldOfStudy?: string
    startDate?: {
      year?: number
      month?: number
      text?: string
    }
    endDate?: {
      year?: number
      month?: number
      text?: string
    }
  }>
  skills?: string[] | Array<{
    name?: string
    [key: string]: any
  }>
  languages?: string[]
  certifications?: Array<{
    name?: string
    issuer?: string
    issueDate?: {
      year?: number
      month?: number
    }
  }>
  [key: string]: any // Allow for additional fields
}

/**
 * Scrape LinkedIn profile using Apify Actor
 * @param profileUrl LinkedIn profile URL (e.g., https://www.linkedin.com/in/username)
 * @returns Scraped profile data
 */
export async function scrapeLinkedInProfileWithApify(profileUrl: string): Promise<ApifyLinkedInProfile | null> {
  const apiToken = process.env.APIFY_API_TOKEN

  if (!apiToken) {
    throw new Error('APIFY_API_TOKEN is not configured')
  }

  // Initialize Apify client
  const client = new ApifyClient({ token: apiToken })

  // Prepare Actor input
  const input = {
    profileScraperMode: 'Profile details no email ($4 per 1k)',
    queries: [profileUrl],
  }

  try {
    // Run the Actor and wait for it to finish
    const run = await client.actor('harvestapi/linkedin-profile-scraper').call(input)

    // Fetch results from the run's dataset
    const { items } = await client.dataset(run.defaultDatasetId).listItems()

    if (!items || items.length === 0) {
      console.warn('Apify scraper returned no results')
      return null
    }

    // Return the first result (we only queried one profile)
    return items[0] as ApifyLinkedInProfile
  } catch (error) {
    console.error('Apify LinkedIn scraper error:', error)
    throw new Error(`Failed to scrape LinkedIn profile: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Convert Apify LinkedIn profile data to our profile format
 */
export function convertApifyToProfile(apifyData: ApifyLinkedInProfile) {
  // Build full name from firstName and lastName
  const fullName = apifyData.firstName && apifyData.lastName
    ? `${apifyData.firstName} ${apifyData.lastName}`.trim()
    : null

  // Handle experience array (Apify uses 'experience', not 'positions')
  const experiences = apifyData.experience || []
  
  const workExperiences = experiences.map((exp) => {
    // Apify uses 'position' for job title, 'companyName' for company
    const title = exp.position || exp.title || 'Unknown Title'
    const company = exp.companyName || exp.company || 'Unknown Company'
    
    // Handle start date - Apify provides year in startDate.year
    const startDate = exp.startDate?.year
      ? `${exp.startDate.year}-${String(exp.startDate.month || 1).padStart(2, '0')}-01`
      : null
    
    // Handle end date - Apify uses endDate.text which can be "Present" or a year
    const isCurrent = exp.endDate?.text === 'Present' || exp.isCurrent === true
    const endDate = isCurrent
      ? null // Current position has no end date
      : exp.endDate?.year
      ? `${exp.endDate.year}-${String(exp.endDate.month || 12).padStart(2, '0')}-01`
      : null

    return {
      company,
      title,
      description: exp.description || null,
      start_date: startDate,
      end_date: endDate,
      is_current: isCurrent,
    }
  })

  // Handle education array
  const educationsData = (apifyData.education || []).map((edu) => {
    const institution = edu.schoolName || edu.school || 'Unknown Institution'
    const degree = edu.degree || edu.fieldOfStudy || null
    
    // Handle start date
    const startDate = edu.startDate?.year
      ? `${edu.startDate.year}-${String(edu.startDate.month || 1).padStart(2, '0')}-01`
      : null
    
    // Handle end date
    const endDate = edu.endDate?.year
      ? `${edu.endDate.year}-${String(edu.endDate.month || 12).padStart(2, '0')}-01`
      : null

    return {
      institution,
      degree,
      start_date: startDate,
      end_date: endDate,
    }
  })

  // Handle skills - Apify returns an array that can be empty or contain strings/objects
  const skillsData = Array.isArray(apifyData.skills)
    ? apifyData.skills
        .map((skill) => {
          if (typeof skill === 'string') {
            return skill
          }
          if (typeof skill === 'object' && skill !== null && 'name' in skill) {
            return skill.name
          }
          return null
        })
        .filter((skill): skill is string => typeof skill === 'string' && skill.length > 0)
    : []

  // Return only the fields we need, ensuring all values are serializable
  return {
    display_name: fullName,
    headline: apifyData.headline || null,
    bio: apifyData.about || apifyData.summary || null,
    work_experiences: workExperiences,
    educations: educationsData,
    skills: skillsData,
  }
}

