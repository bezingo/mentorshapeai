/**
 * Parse and extract content from URLs using Firecrawl REST API
 * 
 * Used when users paste links in the Goal Advisor chat
 * to extract relevant context for the conversation.
 */

export interface ParsedLink {
  url: string
  title: string
  content: string
  excerpt?: string
  metadata: {
    author?: string
    publishedDate?: string
    siteName?: string
    description?: string
  }
}

/**
 * Parse a URL and extract its content
 */
export async function parseLink(url: string): Promise<ParsedLink> {
  const apiKey = process.env.FIRECRAWL_API_KEY
  
  if (!apiKey) {
    throw new Error('FIRECRAWL_API_KEY environment variable is not set')
  }
  
  // Validate URL format
  try {
    new URL(url)
  } catch (error) {
    throw new Error('Invalid URL format')
  }
  
  try {
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
            url: url,
            formats: ['markdown'],
            onlyMainContent: true,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          const errorMessage = errorData.error || errorData.message || 'Failed to scrape URL'
          
          if (response.status === 401) {
            throw new Error('Invalid Firecrawl API key')
          }
          if (response.status === 429) {
            throw new Error('Rate limit exceeded')
          }
          
          throw new Error(errorMessage)
        }

        const data = await response.json()
        const content = data.data?.markdown || data.data?.content || ''
        const metadata = data.data?.metadata || {}
        
        if (!content || content.trim().length === 0) {
          throw new Error('No content extracted from URL')
        }
        
        // Extract title
        const title = metadata.title || 
                     metadata.ogTitle || 
                     extractTitleFromContent(content) ||
                     'Untitled'
        
        // Create excerpt (first 500 characters)
        const excerpt = content.length > 500 
          ? content.substring(0, 500) + '...'
          : content
        
        return {
          url,
          title,
          content,
          excerpt,
          metadata: {
            author: metadata.author,
            publishedDate: metadata.publishDate,
            siteName: metadata.siteName || metadata.ogSiteName,
            description: metadata.description || metadata.ogDescription
          }
        }
      } catch (error) {
        // If this is a 401, don't try the next endpoint
        if (error instanceof Error && error.message.includes('401')) {
          throw error
        }
        lastError = error instanceof Error ? error : new Error('Unknown error')
        // Try next endpoint
        continue
      }
    }

    // If we get here, all endpoints failed
    if (lastError) {
      throw lastError
    }
    
    throw new Error('Failed to scrape URL: All API endpoints failed')
  } catch (error) {
    console.error('Error parsing link:', error)
    
    // Fallback: return basic info if Firecrawl fails
    return {
      url,
      title: 'Link (parsing failed)',
      content: `Link: ${url}`,
      metadata: {}
    }
  }
}

/**
 * Extract title from markdown content
 */
function extractTitleFromContent(markdown: string): string | null {
  // Look for first H1 heading
  const h1Match = markdown.match(/^#\s+(.+)$/m)
  if (h1Match) {
    return h1Match[1].trim()
  }
  
  // Look for first H2 heading
  const h2Match = markdown.match(/^##\s+(.+)$/m)
  if (h2Match) {
    return h2Match[1].trim()
  }
  
  return null
}

/**
 * Detect if a string is a URL
 */
export function isUrl(text: string): boolean {
  try {
    const url = new URL(text)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

/**
 * Extract URLs from text
 */
export function extractUrls(text: string): string[] {
  const urlRegex = /(https?:\/\/[^\s]+)/g
  const matches = text.match(urlRegex)
  return matches || []
}

/**
 * Parse multiple URLs in parallel
 */
export async function parseMultipleLinks(urls: string[]): Promise<ParsedLink[]> {
  const results = await Promise.allSettled(
    urls.map(url => parseLink(url))
  )
  
  return results
    .filter((result): result is PromiseFulfilledResult<ParsedLink> => 
      result.status === 'fulfilled'
    )
    .map(result => result.value)
}

/**
 * Format parsed link for display in chat
 */
export function formatLinkForChat(parsed: ParsedLink): string {
  let formatted = `**${parsed.title}**\n`
  formatted += `🔗 ${parsed.url}\n\n`
  
  if (parsed.metadata.description) {
    formatted += `${parsed.metadata.description}\n\n`
  }
  
  if (parsed.excerpt) {
    formatted += `> ${parsed.excerpt}\n`
  }
  
  return formatted
}
