import { Client } from '@notionhq/client'
import { createServiceClient } from '@/lib/supabase/service'

/**
 * Notion Integration for Goal Export
 * 
 * Exports goal data to user's Notion workspace.
 */

export interface NotionExportResult {
  success: boolean
  message: string
  notionUrl?: string
  pageId?: string
}

/**
 * Export goal to Notion workspace
 * 
 * Creates a new Notion page with goal details, milestones,
 * success criteria, and other relevant information.
 */
export async function notionExport(
  goalId: string,
  pageId?: string
): Promise<NotionExportResult> {
  const notionApiKey = process.env.NOTION_API_KEY
  
  if (!notionApiKey) {
    return {
      success: false,
      message: 'Notion integration not configured. Please connect your Notion workspace in settings.'
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
    
    // Initialize Notion client
    const notion = new Client({ auth: notionApiKey })
    
    // Build page content
    const pageContent = buildNotionPageContent(goal, milestones || [])
    
    // Create page in Notion
    const response = await notion.pages.create({
      parent: pageId 
        ? { page_id: pageId }
        : { database_id: process.env.NOTION_DATABASE_ID || '' },
      properties: {
        title: {
          title: [
            {
              text: {
                content: goal.title
              }
            }
          ]
        },
        Category: goal.category ? {
          select: {
            name: goal.category
          }
        } : undefined,
        Status: {
          select: {
            name: goal.status
          }
        },
        Duration: {
          number: goal.duration_days
        }
      },
      children: pageContent
    } as any)
    
    return {
      success: true,
      message: 'Successfully exported goal to Notion',
      notionUrl: response.url,
      pageId: response.id
    }
  } catch (error) {
    console.error('Notion export error:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to export to Notion'
    }
  }
}

/**
 * Build Notion page content blocks
 */
function buildNotionPageContent(goal: any, milestones: any[]) {
  const blocks: any[] = []
  
  // Description
  if (goal.description) {
    blocks.push({
      object: 'block',
      type: 'paragraph',
      paragraph: {
        rich_text: [
          {
            text: {
              content: goal.description
            }
          }
        ]
      }
    })
  }
  
  // Refined Goal Statement
  if (goal.refined_goal_statement) {
    blocks.push({
      object: 'block',
      type: 'heading_2',
      heading_2: {
        rich_text: [
          {
            text: {
              content: 'Refined Goal Statement'
            }
          }
        ]
      }
    })
    
    blocks.push({
      object: 'block',
      type: 'quote',
      quote: {
        rich_text: [
          {
            text: {
              content: goal.refined_goal_statement
            }
          }
        ]
      }
    })
  }
  
  // Success Definition
  if (goal.success_definition) {
    blocks.push({
      object: 'block',
      type: 'heading_2',
      heading_2: {
        rich_text: [
          {
            text: {
              content: 'Success Criteria'
            }
          }
        ]
      }
    })
    
    blocks.push({
      object: 'block',
      type: 'paragraph',
      paragraph: {
        rich_text: [
          {
            text: {
              content: goal.success_definition
            }
          }
        ]
      }
    })
  }
  
  // Milestones
  if (milestones.length > 0) {
    blocks.push({
      object: 'block',
      type: 'heading_2',
      heading_2: {
        rich_text: [
          {
            text: {
              content: 'Milestones'
            }
          }
        ]
      }
    })
    
    milestones.forEach(milestone => {
      blocks.push({
        object: 'block',
        type: 'to_do',
        to_do: {
          rich_text: [
            {
              text: {
                content: `${milestone.title} - ${new Date(milestone.target_date).toLocaleDateString()}`
              }
            }
          ],
          checked: milestone.status === 'done'
        }
      })
    })
  }
  
  // Current Challenges
  if (goal.current_challenges) {
    blocks.push({
      object: 'block',
      type: 'heading_2',
      heading_2: {
        rich_text: [
          {
            text: {
              content: 'Current Challenges'
            }
          }
        ]
      }
    })
    
    blocks.push({
      object: 'block',
      type: 'paragraph',
      paragraph: {
        rich_text: [
          {
            text: {
              content: goal.current_challenges
            }
          }
        ]
      }
    })
  }
  
  return blocks
}

/**
 * Update existing Notion page with goal data
 */
export async function notionUpdate(
  goalId: string,
  notionPageId: string
): Promise<NotionExportResult> {
  // Implementation for updating existing Notion pages
  // Similar to export but uses pages.update instead of pages.create
  return {
    success: false,
    message: 'Update functionality coming soon'
  }
}
