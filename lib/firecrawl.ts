/**
 * Firecrawl client for scraping LinkedIn profiles
 * Docs: https://docs.firecrawl.dev
 */

export async function scrapeLinkedInProfile(linkedInUrl: string): Promise<string> {
  try {
    const apiKey = process.env.FIRECRAWL_API_KEY
    
    if (!apiKey) {
      throw new Error('FIRECRAWL_API_KEY is not set. Please configure Firecrawl API key in your environment variables.')
    }

    // Validate API key format
    if (!apiKey.startsWith('fc-')) {
      console.warn('Firecrawl API key should start with "fc-". Please verify your API key.')
    }

    // Validate LinkedIn URL
    if (!linkedInUrl.includes('linkedin.com/in/')) {
      throw new Error('Invalid LinkedIn URL')
    }

    // Try v2 API first (newer), fallback to v1 if needed
    const apiEndpoints = [
      'https://api.firecrawl.dev/v2/scrape',
      'https://api.firecrawl.dev/v1/scrape',
    ]

    let lastError: Error | null = null

    for (const endpoint of apiEndpoints) {
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            url: linkedInUrl,
            formats: ['markdown'],
            onlyMainContent: true,
          }),
        })

        if (!response.ok) {
          let errorMessage = 'Failed to scrape LinkedIn profile'
          let errorDetails: any = null
          
          try {
            const errorData = await response.json()
            errorDetails = errorData
            
            // Log full error for debugging
            console.error('Firecrawl API Error Response:', {
              status: response.status,
              statusText: response.statusText,
              error: errorData,
              endpoint,
            })
            
            if (errorData.error) {
              errorMessage = typeof errorData.error === 'string' 
                ? errorData.error 
                : errorData.error.message || JSON.stringify(errorData.error)
            } else if (errorData.message) {
              errorMessage = errorData.message
            } else if (errorData.detail) {
              errorMessage = errorData.detail
            }
          } catch {
            // If error response is not JSON, use status text
            const errorText = await response.text()
            console.error('Firecrawl API Error (non-JSON):', {
              status: response.status,
              statusText: response.statusText,
              body: errorText,
              endpoint,
            })
            errorMessage = `Firecrawl API error: ${response.status} ${response.statusText}`
            if (errorText) {
              errorMessage += ` - ${errorText}`
            }
          }
          
          // Provide more specific error messages
          if (response.status === 401) {
            throw new Error('Invalid Firecrawl API key. Please verify your API key is correct and has no extra spaces.')
          }
          if (response.status === 403) {
            // Check if it's a plan/billing issue
            if (errorDetails?.message?.toLowerCase().includes('plan') || 
                errorDetails?.message?.toLowerCase().includes('subscription') ||
                errorDetails?.message?.toLowerCase().includes('upgrade')) {
              throw new Error('Your Firecrawl plan may not include scraping. Please check your plan limits or upgrade your account.')
            }
            throw new Error(`Firecrawl API access denied: ${errorMessage}. Please check your API key permissions and plan limits.`)
          }
          if (response.status === 429) {
            throw new Error('Rate limit exceeded. Please try again later or upgrade your Firecrawl plan.')
          }
          
          throw new Error(errorMessage)
        }

        const data = await response.json()
        const content = data.data?.markdown || data.data?.content || ''
        
        if (!content || content.trim().length === 0) {
          throw new Error('No content extracted from LinkedIn profile. The profile may be private or require authentication.')
        }
        
        return content
      } catch (error) {
        // If this is a 403 or 401, don't try the next endpoint
        if (error instanceof Error) {
          if (error.message.includes('403') || error.message.includes('401')) {
            throw error
          }
          lastError = error
        }
        // Try next endpoint
        continue
      }
    }

    // If we get here, all endpoints failed
    if (lastError) {
      throw lastError
    }
    
    throw new Error('Failed to scrape LinkedIn profile: All API endpoints failed')
  } catch (error) {
    // Re-throw if it's already a formatted error
    if (error instanceof Error && error.message.includes('FIRECRAWL_API_KEY')) {
      throw error
    }
    if (error instanceof Error && error.message.includes('No content extracted')) {
      throw error
    }
    if (error instanceof Error && (error.message.includes('403') || error.message.includes('401'))) {
      throw error
    }
    
    console.error('Error scraping LinkedIn:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to scrape LinkedIn profile'
    throw new Error(`Failed to scrape LinkedIn profile: ${errorMessage}`)
  }
}




