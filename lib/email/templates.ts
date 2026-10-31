/**
 * Email templates for Mentorshape
 * 
 * M1 Email Types:
 * 1. Digest: Due tasks, next Focus, unanswered collab requests
 * 2. Session Reminder: Upcoming Focus reminder
 * 3. Collab Request: New collaboration request notification
 */

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.mentorshape.ai'

/**
 * Common email wrapper with styling
 */
function emailWrapper(content: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mentorshape</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #f8fafc; border-radius: 12px; padding: 32px;">
    <div style="text-align: center; margin-bottom: 24px;">
      <h1 style="font-size: 24px; font-weight: 700; margin: 0; color: #0f172a;">Mentorshape</h1>
    </div>
    ${content}
    <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e2e8f0; text-align: center; color: #64748b; font-size: 12px;">
      <p>You're receiving this because you have a Mentorshape account.</p>
      <p><a href="${BASE_URL}/dashboard/settings" style="color: #3b82f6;">Manage email preferences</a></p>
    </div>
  </div>
</body>
</html>
  `.trim()
}

/**
 * Format date for display
 */
function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

/**
 * Format time for display
 */
function formatTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

// ============================================================
// DIGEST EMAIL
// ============================================================

export interface DigestEmailData {
  recipientName: string
  dueTasks: Array<{
    title: string
    dueDate: string
    collaborationTitle: string
  }>
  nextFocus: {
    scheduledAt: string
    mentorName?: string
    menteeName?: string
    goalTitle: string
  } | null
  pendingRequests: Array<{
    requesterName: string
    goalTitle: string
    requestedAt: string
  }>
}

export function digestEmailTemplate(data: DigestEmailData): { subject: string; html: string; text: string } {
  const { recipientName, dueTasks, nextFocus, pendingRequests } = data
  
  let content = `
    <h2 style="font-size: 20px; margin: 0 0 16px;">Hi ${recipientName},</h2>
    <p style="margin: 0 0 24px; color: #475569;">Here's your Mentorshape update:</p>
  `

  // Due Tasks Section
  if (dueTasks.length > 0) {
    content += `
      <div style="background: #fff; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
        <h3 style="font-size: 16px; margin: 0 0 12px; color: #dc2626;">📋 Tasks Due Soon (${dueTasks.length})</h3>
        <ul style="margin: 0; padding-left: 20px;">
          ${dueTasks.map(task => `
            <li style="margin-bottom: 8px;">
              <strong>${task.title}</strong><br>
              <span style="color: #64748b; font-size: 14px;">Due ${formatDate(task.dueDate)} • ${task.collaborationTitle}</span>
            </li>
          `).join('')}
        </ul>
      </div>
    `
  }

  // Next Focus Section
  if (nextFocus) {
    const otherPerson = nextFocus.mentorName || nextFocus.menteeName || 'your partner'
    content += `
      <div style="background: #fff; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
        <h3 style="font-size: 16px; margin: 0 0 12px; color: #2563eb;">📅 Next Focus Session</h3>
        <p style="margin: 0;">
          <strong>${formatDate(nextFocus.scheduledAt)}</strong> at <strong>${formatTime(nextFocus.scheduledAt)}</strong><br>
          <span style="color: #64748b;">with ${otherPerson} • ${nextFocus.goalTitle}</span>
        </p>
        <a href="${BASE_URL}/dashboard/focuses" style="display: inline-block; margin-top: 12px; padding: 8px 16px; background: #2563eb; color: #fff; text-decoration: none; border-radius: 6px; font-size: 14px;">View Details</a>
      </div>
    `
  }

  // Pending Requests Section
  if (pendingRequests.length > 0) {
    content += `
      <div style="background: #fff; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
        <h3 style="font-size: 16px; margin: 0 0 12px; color: #f59e0b;">⏳ Pending Requests (${pendingRequests.length})</h3>
        <ul style="margin: 0; padding-left: 20px;">
          ${pendingRequests.map(req => `
            <li style="margin-bottom: 8px;">
              <strong>${req.requesterName}</strong> requested mentorship<br>
              <span style="color: #64748b; font-size: 14px;">${req.goalTitle} • ${formatDate(req.requestedAt)}</span>
            </li>
          `).join('')}
        </ul>
        <a href="${BASE_URL}/dashboard/collaborations" style="display: inline-block; margin-top: 12px; padding: 8px 16px; background: #f59e0b; color: #fff; text-decoration: none; border-radius: 6px; font-size: 14px;">Review Requests</a>
      </div>
    `
  }

  // Empty state
  if (dueTasks.length === 0 && !nextFocus && pendingRequests.length === 0) {
    content += `
      <div style="background: #fff; border-radius: 8px; padding: 24px; text-align: center;">
        <p style="margin: 0; color: #64748b;">✨ You're all caught up! No pending items.</p>
        <a href="${BASE_URL}/dashboard" style="display: inline-block; margin-top: 12px; padding: 8px 16px; background: #0f172a; color: #fff; text-decoration: none; border-radius: 6px; font-size: 14px;">Go to Dashboard</a>
      </div>
    `
  }

  // Text version
  const text = `
Hi ${recipientName},

Here's your Mentorshape update:

${dueTasks.length > 0 ? `TASKS DUE SOON (${dueTasks.length}):\n${dueTasks.map(t => `- ${t.title} (due ${formatDate(t.dueDate)})`).join('\n')}\n` : ''}
${nextFocus ? `NEXT FOCUS:\n${formatDate(nextFocus.scheduledAt)} at ${formatTime(nextFocus.scheduledAt)} - ${nextFocus.goalTitle}\n` : ''}
${pendingRequests.length > 0 ? `PENDING REQUESTS (${pendingRequests.length}):\n${pendingRequests.map(r => `- ${r.requesterName}: ${r.goalTitle}`).join('\n')}\n` : ''}

View your dashboard: ${BASE_URL}/dashboard
  `.trim()

  return {
    subject: `Your Mentorshape Update${dueTasks.length > 0 ? ` - ${dueTasks.length} task(s) due` : ''}`,
    html: emailWrapper(content),
    text,
  }
}

// ============================================================
// SESSION REMINDER EMAIL
// ============================================================

export interface SessionReminderData {
  recipientName: string
  recipientRole: 'mentor' | 'mentee'
  partnerName: string
  goalTitle: string
  scheduledAt: string
  durationMinutes: number
  meetingUrl?: string
  focusId: string
}

export function sessionReminderTemplate(data: SessionReminderData): { subject: string; html: string; text: string } {
  const { recipientName, recipientRole, partnerName, goalTitle, scheduledAt, durationMinutes, meetingUrl, focusId } = data
  
  const roleLabel = recipientRole === 'mentor' ? 'mentee' : 'mentor'
  const date = formatDate(scheduledAt)
  const time = formatTime(scheduledAt)

  const content = `
    <h2 style="font-size: 20px; margin: 0 0 16px;">Hi ${recipientName},</h2>
    <p style="margin: 0 0 24px; color: #475569;">You have an upcoming Focus session:</p>
    
    <div style="background: #fff; border-radius: 8px; padding: 24px; margin-bottom: 16px;">
      <div style="display: flex; align-items: center; margin-bottom: 16px;">
        <div style="width: 48px; height: 48px; background: #dbeafe; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 16px;">
          <span style="font-size: 24px;">📅</span>
        </div>
        <div>
          <h3 style="font-size: 18px; margin: 0;">${goalTitle}</h3>
          <p style="margin: 4px 0 0; color: #64748b;">with ${partnerName} (${roleLabel})</p>
        </div>
      </div>
      
      <div style="border-top: 1px solid #e2e8f0; padding-top: 16px;">
        <p style="margin: 0 0 8px;">
          <strong>Date:</strong> ${date}
        </p>
        <p style="margin: 0 0 8px;">
          <strong>Time:</strong> ${time}
        </p>
        <p style="margin: 0;">
          <strong>Duration:</strong> ${durationMinutes} minutes
        </p>
      </div>
      
      <div style="margin-top: 24px; display: flex; gap: 12px;">
        ${meetingUrl ? `
          <a href="${meetingUrl}" style="display: inline-block; padding: 12px 24px; background: #2563eb; color: #fff; text-decoration: none; border-radius: 6px; font-weight: 500;">Join Meeting</a>
        ` : ''}
        <a href="${BASE_URL}/focuses/${focusId}" style="display: inline-block; padding: 12px 24px; background: ${meetingUrl ? '#f1f5f9' : '#2563eb'}; color: ${meetingUrl ? '#1e293b' : '#fff'}; text-decoration: none; border-radius: 6px; font-weight: 500;">View Details</a>
      </div>
    </div>
    
    <p style="margin: 0; color: #64748b; font-size: 14px;">
      💡 Tip: Review your agenda and prepare any materials before the session.
    </p>
  `

  const text = `
Hi ${recipientName},

You have an upcoming Focus session:

${goalTitle}
with ${partnerName} (${roleLabel})

Date: ${date}
Time: ${time}
Duration: ${durationMinutes} minutes

${meetingUrl ? `Join Meeting: ${meetingUrl}\n` : ''}
View Details: ${BASE_URL}/focuses/${focusId}

Tip: Review your agenda and prepare any materials before the session.
  `.trim()

  return {
    subject: `Reminder: Focus session with ${partnerName} - ${date}`,
    html: emailWrapper(content),
    text,
  }
}

// ============================================================
// COLLABORATION REQUEST EMAIL
// ============================================================

export interface CollabRequestData {
  mentorName: string
  menteeName: string
  goalTitle: string
  goalDescription?: string
  requestMessage?: string
  collaborationId: string
}

export function collabRequestTemplate(data: CollabRequestData): { subject: string; html: string; text: string } {
  const { mentorName, menteeName, goalTitle, goalDescription, requestMessage, collaborationId } = data

  const content = `
    <h2 style="font-size: 20px; margin: 0 0 16px;">Hi ${mentorName},</h2>
    <p style="margin: 0 0 24px; color: #475569;">You have a new mentorship request!</p>
    
    <div style="background: #fff; border-radius: 8px; padding: 24px; margin-bottom: 16px;">
      <div style="display: flex; align-items: center; margin-bottom: 16px;">
        <div style="width: 48px; height: 48px; background: #fef3c7; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 16px;">
          <span style="font-size: 24px;">🎯</span>
        </div>
        <div>
          <h3 style="font-size: 18px; margin: 0;">${menteeName}</h3>
          <p style="margin: 4px 0 0; color: #64748b;">wants to work with you</p>
        </div>
      </div>
      
      <div style="border-top: 1px solid #e2e8f0; padding-top: 16px;">
        <h4 style="font-size: 16px; margin: 0 0 8px;">Goal: ${goalTitle}</h4>
        ${goalDescription ? `<p style="margin: 0 0 16px; color: #64748b;">${goalDescription}</p>` : ''}
        
        ${requestMessage ? `
          <div style="background: #f8fafc; border-radius: 6px; padding: 12px; margin-top: 12px;">
            <p style="margin: 0; font-style: italic; color: #475569;">"${requestMessage}"</p>
          </div>
        ` : ''}
      </div>
      
      <div style="margin-top: 24px; display: flex; gap: 12px;">
        <a href="${BASE_URL}/dashboard/collaborations/${collaborationId}" style="display: inline-block; padding: 12px 24px; background: #16a34a; color: #fff; text-decoration: none; border-radius: 6px; font-weight: 500;">Review Request</a>
      </div>
    </div>
    
    <p style="margin: 0; color: #64748b; font-size: 14px;">
      You can accept, decline, or ask questions about this request.
    </p>
  `

  const text = `
Hi ${mentorName},

You have a new mentorship request!

${menteeName} wants to work with you on:
"${goalTitle}"
${goalDescription ? `\n${goalDescription}\n` : ''}
${requestMessage ? `\nTheir message: "${requestMessage}"\n` : ''}

Review this request: ${BASE_URL}/dashboard/collaborations/${collaborationId}

You can accept, decline, or ask questions about this request.
  `.trim()

  return {
    subject: `New mentorship request from ${menteeName}`,
    html: emailWrapper(content),
    text,
  }
}

// ============================================================
// ORG INVITE EMAIL
// ============================================================

export interface OrgInviteData {
  orgName: string
  inviteCode: string
  inviteUrl: string
  language: string
  crestUrl?: string | null
}

export function orgInviteTemplate(data: OrgInviteData): string {
  const { orgName, inviteCode, inviteUrl, language, crestUrl } = data
  const isArabic = language === 'ar'
  const dir = isArabic ? 'rtl' : 'ltr'

  const translations = {
    en: {
      subject: `Invitation to join ${orgName}`,
      heading: `You're invited to join ${orgName}`,
      body: `You've been invited to join ${orgName} on Mentorshape, a platform for meaningful mentorship connections.`,
      codeLabel: 'Your invite code:',
      buttonText: 'Accept Invitation',
      orText: 'Or enter this code when signing up:',
      expiry: 'This invitation expires in 7 days.',
      footer: 'If you didn\'t expect this invitation, you can ignore this email.',
    },
    ar: {
      subject: `دعوة للانضمام إلى ${orgName}`,
      heading: `تمت دعوتك للانضمام إلى ${orgName}`,
      body: `لقد تمت دعوتك للانضمام إلى ${orgName} على منصة Mentorshape، منصة للإرشاد الهادف.`,
      codeLabel: 'رمز الدعوة الخاص بك:',
      buttonText: 'قبول الدعوة',
      orText: 'أو أدخل هذا الرمز عند التسجيل:',
      expiry: 'تنتهي صلاحية هذه الدعوة خلال 7 أيام.',
      footer: 'إذا لم تكن تتوقع هذه الدعوة، يمكنك تجاهل هذا البريد الإلكتروني.',
    }
  }

  const t = translations[isArabic ? 'ar' : 'en']

  return `
<!DOCTYPE html>
<html dir="${dir}" lang="${language}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${t.subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 20px; direction: ${dir};">
  <div style="background: #f8fafc; border-radius: 12px; padding: 32px;">
    <div style="text-align: center; margin-bottom: 24px;">
      ${crestUrl ? `<img src="${crestUrl}" alt="${orgName}" style="height: 64px; margin-bottom: 16px;">` : ''}
      <h1 style="font-size: 24px; font-weight: 700; margin: 0; color: #0f172a;">${t.heading}</h1>
    </div>
    
    <div style="background: #fff; border-radius: 8px; padding: 24px; margin-bottom: 16px; text-align: center;">
      <p style="margin: 0 0 24px; color: #475569;">${t.body}</p>
      
      <a href="${inviteUrl}" style="display: inline-block; padding: 14px 32px; background: #E05D31; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
        ${t.buttonText}
      </a>
      
      <div style="margin-top: 24px; padding-top: 24px; border-top: 1px solid #e2e8f0;">
        <p style="margin: 0 0 8px; color: #64748b; font-size: 14px;">${t.orText}</p>
        <div style="background: #f1f5f9; padding: 12px 24px; border-radius: 6px; display: inline-block;">
          <code style="font-size: 20px; font-weight: 700; letter-spacing: 2px; color: #0f172a;">${inviteCode}</code>
        </div>
      </div>
    </div>
    
    <p style="text-align: center; margin: 0 0 16px; color: #94a3b8; font-size: 14px;">${t.expiry}</p>
    <p style="text-align: center; margin: 0; color: #94a3b8; font-size: 12px;">${t.footer}</p>
  </div>
</body>
</html>
  `.trim()
}

// ============================================================
// GUARDIAN CONSENT EMAIL
// ============================================================

export interface GuardianConsentData {
  guardianName?: string
  studentName: string
  orgName: string
  consentUrl: string
  language: string
}

export function guardianConsentTemplate(data: GuardianConsentData): string {
  const { guardianName, studentName, orgName, consentUrl, language } = data
  const isArabic = language === 'ar'
  const dir = isArabic ? 'rtl' : 'ltr'

  const translations = {
    en: {
      subject: `Parental consent required for ${studentName}`,
      heading: 'Parental Consent Required',
      greeting: guardianName ? `Dear ${guardianName},` : 'Dear Parent/Guardian,',
      body: `${studentName} has signed up for Mentorshape through ${orgName} and requires your consent to participate in mentorship activities.`,
      whatIs: 'What is Mentorshape?',
      whatIsBody: 'Mentorshape is a safe, school-supervised mentorship platform that connects students with mentors to help them achieve their academic and career goals.',
      safety: 'Safety Features:',
      safetyItems: [
        'All mentors are verified by the school',
        'Sessions can be monitored by counselors',
        'No personal contact information is shared',
        'All communications are logged for safety'
      ],
      buttonText: 'Review & Provide Consent',
      footer: 'If you have questions, please contact your school\'s counselor.',
    },
    ar: {
      subject: `موافقة ولي الأمر مطلوبة لـ ${studentName}`,
      heading: 'موافقة ولي الأمر مطلوبة',
      greeting: guardianName ? `عزيزي/عزيزتي ${guardianName}،` : 'عزيزي ولي الأمر،',
      body: `قام/قامت ${studentName} بالتسجيل في منصة Mentorshape من خلال ${orgName} ويحتاج إلى موافقتك للمشاركة في أنشطة الإرشاد.`,
      whatIs: 'ما هي منصة Mentorshape؟',
      whatIsBody: 'Mentorshape هي منصة إرشاد آمنة تحت إشراف المدرسة تربط الطلاب بالمرشدين لمساعدتهم في تحقيق أهدافهم الأكاديمية والمهنية.',
      safety: 'ميزات السلامة:',
      safetyItems: [
        'يتم التحقق من جميع المرشدين من قبل المدرسة',
        'يمكن للمستشارين مراقبة الجلسات',
        'لا يتم مشاركة معلومات الاتصال الشخصية',
        'يتم تسجيل جميع الاتصالات للسلامة'
      ],
      buttonText: 'مراجعة وتقديم الموافقة',
      footer: 'إذا كانت لديك أسئلة، يرجى الاتصال بمستشار المدرسة.',
    }
  }

  const t = translations[isArabic ? 'ar' : 'en']

  return `
<!DOCTYPE html>
<html dir="${dir}" lang="${language}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${t.subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 20px; direction: ${dir};">
  <div style="background: #f8fafc; border-radius: 12px; padding: 32px;">
    <div style="text-align: center; margin-bottom: 24px;">
      <h1 style="font-size: 24px; font-weight: 700; margin: 0; color: #0f172a;">${t.heading}</h1>
    </div>
    
    <div style="background: #fff; border-radius: 8px; padding: 24px; margin-bottom: 16px;">
      <p style="margin: 0 0 16px; font-weight: 500;">${t.greeting}</p>
      <p style="margin: 0 0 24px; color: #475569;">${t.body}</p>
      
      <div style="background: #f0fdf4; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
        <h3 style="margin: 0 0 8px; font-size: 16px; color: #166534;">${t.whatIs}</h3>
        <p style="margin: 0; color: #166534; font-size: 14px;">${t.whatIsBody}</p>
      </div>
      
      <div style="margin-bottom: 24px;">
        <h4 style="margin: 0 0 12px; font-size: 14px; color: #0f172a;">${t.safety}</h4>
        <ul style="margin: 0; padding-${isArabic ? 'right' : 'left'}: 20px;">
          ${t.safetyItems.map(item => `<li style="margin-bottom: 8px; color: #475569; font-size: 14px;">${item}</li>`).join('')}
        </ul>
      </div>
      
      <div style="text-align: center;">
        <a href="${consentUrl}" style="display: inline-block; padding: 14px 32px; background: #16a34a; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
          ${t.buttonText}
        </a>
      </div>
    </div>
    
    <p style="text-align: center; margin: 0; color: #94a3b8; font-size: 12px;">${t.footer}</p>
  </div>
</body>
</html>
  `.trim()
}
