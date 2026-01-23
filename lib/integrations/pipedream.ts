/**
 * Pipedream Integration for Calendar Booking
 * 
 * Uses Pipedream workflows to trigger calendar events
 * via Google Calendar or Outlook Calendar APIs.
 */

export interface PipedreamBookingParams {
  goalId: string
  mentorEmail: string
  datetime: string // ISO 8601 format
  duration: number // in minutes
}

export interface PipedreamBookingResult {
  success: boolean
  message: string
  bookingUrl?: string
  eventId?: string
}

/**
 * Book calendar event via Pipedream webhook
 * 
 * Sends booking request to Pipedream workflow which handles
 * calendar API integration (Google Calendar or Outlook).
 */
export async function pipedreamBooking(
  params: PipedreamBookingParams
): Promise<PipedreamBookingResult> {
  const webhookUrl = process.env.PIPEDREAM_WEBHOOK_URL
  
  if (!webhookUrl) {
    return {
      success: false,
      message: 'Pipedream webhook URL not configured. Please contact support to enable calendar booking.'
    }
  }
  
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'book_calendar',
        goal_id: params.goalId,
        mentor_email: params.mentorEmail,
        datetime: params.datetime,
        duration: params.duration,
        event_title: `Goal Discussion: ${params.goalId}`,
        event_description: 'Scheduled via MentorShape Goal Advisor'
      })
    })
    
    if (!response.ok) {
      throw new Error(`Pipedream webhook failed: ${response.status} ${response.statusText}`)
    }
    
    const result = await response.json()
    
    return {
      success: true,
      message: 'Calendar event successfully booked',
      bookingUrl: result.calendar_url || result.event_url,
      eventId: result.event_id
    }
  } catch (error) {
    console.error('Pipedream booking error:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to book calendar event'
    }
  }
}

/**
 * Cancel calendar event via Pipedream
 */
export async function pipedreamCancelBooking(
  eventId: string
): Promise<PipedreamBookingResult> {
  const webhookUrl = process.env.PIPEDREAM_WEBHOOK_URL
  
  if (!webhookUrl) {
    return {
      success: false,
      message: 'Pipedream webhook URL not configured'
    }
  }
  
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'cancel_calendar',
        event_id: eventId
      })
    })
    
    if (!response.ok) {
      throw new Error(`Pipedream webhook failed: ${response.status}`)
    }
    
    return {
      success: true,
      message: 'Calendar event successfully cancelled'
    }
  } catch (error) {
    console.error('Pipedream cancel error:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to cancel calendar event'
    }
  }
}

/**
 * Get available time slots via Pipedream
 * (for future mentor availability checking)
 */
export async function pipedreamGetAvailability(
  mentorEmail: string,
  startDate: string,
  endDate: string
): Promise<{
  success: boolean
  message: string
  slots?: Array<{ start: string; end: string }>
}> {
  const webhookUrl = process.env.PIPEDREAM_WEBHOOK_URL
  
  if (!webhookUrl) {
    return {
      success: false,
      message: 'Pipedream webhook URL not configured'
    }
  }
  
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'get_availability',
        mentor_email: mentorEmail,
        start_date: startDate,
        end_date: endDate
      })
    })
    
    if (!response.ok) {
      throw new Error(`Pipedream webhook failed: ${response.status}`)
    }
    
    const result = await response.json()
    
    return {
      success: true,
      message: 'Availability retrieved',
      slots: result.available_slots || []
    }
  } catch (error) {
    console.error('Pipedream availability error:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to get availability'
    }
  }
}
