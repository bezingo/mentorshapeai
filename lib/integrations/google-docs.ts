import { google } from 'googleapis'
import { createServiceClient } from '@/lib/supabase/service'

/**
 * Google Docs Integration for Goal Export
 * 
 * Exports goal data to Google Docs with formatting.
 */

export interface GoogleDocsExportResult {
  success: boolean
  message: string
  docUrl?: string
  docId?: string
}

/**
 * Export goal to Google Docs
 * 
 * Creates a new Google Doc with goal details, milestones,
 * success criteria, and other relevant information.
 */
export async function googleDocsExport(
  goalId: string,
  folderId?: string
): Promise<GoogleDocsExportResult> {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET
  const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI
  
  if (!clientId || !clientSecret) {
    return {
      success: false,
      message: 'Google Docs integration not configured. Please connect your Google account in settings.'
    }
  }
  
  try {
    // Load goal data
    const supabase = createServiceClient()
    const { data: goal, error: goalError } = await supabase
      .from('goals')
      .select('*')
      .eq('id', goalId)
      .single()
    
    if (goalError || !goal) {
      throw new Error('Failed to load goal data')
    }
    
    // Load milestones
    const { data: milestones } = await supabase
      .from('goal_milestones')
      .select('*')
      .eq('goal_id', goalId)
      .order('target_date', { ascending: true })
    
    // Initialize OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    )
    
    // Note: In production, you would fetch user's OAuth tokens from database
    // For now, we'll use a service account or require user OAuth flow
    const accessToken = process.env.GOOGLE_ACCESS_TOKEN
    
    if (!accessToken) {
      return {
        success: false,
        message: 'Please connect your Google account to enable document export'
      }
    }
    
    oauth2Client.setCredentials({
      access_token: accessToken
    })
    
    const docs = google.docs({ version: 'v1', auth: oauth2Client })
    const drive = google.drive({ version: 'v3', auth: oauth2Client })
    
    // Create new document
    const createResponse = await docs.documents.create({
      requestBody: {
        title: `Goal: ${goal.title}`
      }
    })
    
    const docId = createResponse.data.documentId
    
    if (!docId) {
      throw new Error('Failed to create document')
    }
    
    // Build document content
    const requests = buildGoogleDocsRequests(goal, milestones || [])
    
    // Update document with content
    await docs.documents.batchUpdate({
      documentId: docId,
      requestBody: {
        requests
      }
    })
    
    // Move to folder if specified
    if (folderId) {
      await drive.files.update({
        fileId: docId,
        addParents: folderId,
        fields: 'id, parents'
      })
    }
    
    const docUrl = `https://docs.google.com/document/d/${docId}/edit`
    
    return {
      success: true,
      message: 'Successfully exported goal to Google Docs',
      docUrl,
      docId
    }
  } catch (error) {
    console.error('Google Docs export error:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to export to Google Docs'
    }
  }
}

/**
 * Build Google Docs batch update requests
 */
function buildGoogleDocsRequests(goal: any, milestones: any[]) {
  const requests: any[] = []
  let index = 1
  
  // Helper to insert text
  const insertText = (text: string) => {
    requests.push({
      insertText: {
        location: { index },
        text
      }
    })
    index += text.length
  }
  
  // Helper to insert styled text
  const insertStyledText = (text: string, style: any) => {
    const startIndex = index
    insertText(text)
    requests.push({
      updateTextStyle: {
        range: {
          startIndex,
          endIndex: index
        },
        textStyle: style,
        fields: Object.keys(style).join(',')
      }
    })
  }
  
  // Title (already set in document title, but add as heading)
  insertStyledText(`${goal.title}\n\n`, {
    fontSize: { magnitude: 20, unit: 'PT' },
    bold: true
  })
  
  // Description
  if (goal.description) {
    insertText(`${goal.description}\n\n`)
  }
  
  // Refined Goal Statement
  if (goal.refined_goal_statement) {
    insertStyledText('Refined Goal Statement\n', {
      fontSize: { magnitude: 14, unit: 'PT' },
      bold: true
    })
    insertText(`${goal.refined_goal_statement}\n\n`)
  }
  
  // Goal Details
  insertStyledText('Goal Details\n', {
    fontSize: { magnitude: 14, unit: 'PT' },
    bold: true
  })
  insertText(`Duration: ${goal.duration_days} days\n`)
  if (goal.category) {
    insertText(`Category: ${goal.category}\n`)
  }
  insertText(`Status: ${goal.status}\n\n`)
  
  // Success Definition
  if (goal.success_definition) {
    insertStyledText('Success Criteria\n', {
      fontSize: { magnitude: 14, unit: 'PT' },
      bold: true
    })
    insertText(`${goal.success_definition}\n\n`)
  }
  
  // Milestones
  if (milestones.length > 0) {
    insertStyledText('Milestones\n', {
      fontSize: { magnitude: 14, unit: 'PT' },
      bold: true
    })
    milestones.forEach((milestone, idx) => {
      insertText(`${idx + 1}. ${milestone.title}\n`)
      if (milestone.description) {
        insertText(`   ${milestone.description}\n`)
      }
      insertText(`   Target Date: ${new Date(milestone.target_date).toLocaleDateString()}\n`)
      insertText(`   Status: ${milestone.status}\n\n`)
    })
  }
  
  // Current Challenges
  if (goal.current_challenges) {
    insertStyledText('Current Challenges\n', {
      fontSize: { magnitude: 14, unit: 'PT' },
      bold: true
    })
    insertText(`${goal.current_challenges}\n\n`)
  }
  
  // Suggested Questions
  if (goal.suggested_mentor_questions && goal.suggested_mentor_questions.length > 0) {
    insertStyledText('Questions to Ask Mentor\n', {
      fontSize: { magnitude: 14, unit: 'PT' },
      bold: true
    })
    goal.suggested_mentor_questions.forEach((question: string, idx: number) => {
      insertText(`${idx + 1}. ${question}\n`)
    })
    insertText('\n')
  }
  
  // Risks & Pitfalls
  if (goal.risks_pitfalls && Array.isArray(goal.risks_pitfalls) && goal.risks_pitfalls.length > 0) {
    insertStyledText('Risks & Mitigation Strategies\n', {
      fontSize: { magnitude: 14, unit: 'PT' },
      bold: true
    })
    goal.risks_pitfalls.forEach((item: any, idx: number) => {
      insertStyledText(`Risk ${idx + 1}: `, { bold: true })
      insertText(`${item.risk}\n`)
      insertStyledText('Mitigation: ', { italic: true })
      insertText(`${item.mitigation}\n\n`)
    })
  }
  
  return requests
}

/**
 * Generate OAuth URL for Google authentication
 */
export function getGoogleOAuthUrl(state?: string): string {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID
  const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI
  
  if (!clientId || !redirectUri) {
    throw new Error('Google OAuth not configured')
  }
  
  const oauth2Client = new google.auth.OAuth2(
    clientId,
    process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    redirectUri
  )
  
  const scopes = [
    'https://www.googleapis.com/auth/documents',
    'https://www.googleapis.com/auth/drive.file'
  ]
  
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    state: state || ''
  })
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeGoogleOAuthCode(code: string) {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET
  const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI
  
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('Google OAuth not configured')
  }
  
  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    redirectUri
  )
  
  const { tokens } = await oauth2Client.getToken(code)
  return tokens
}
