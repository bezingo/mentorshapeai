# Notifications & Communication

## Overview

Mentorshape uses a multi-channel notification system to keep users informed about important events. Notifications are sent via email, in-app notifications, and optionally SMS.

---

## Notification Channels

### 1. Email Notifications

**Provider:** Resend, SendGrid, or similar transactional email service

**Email Types:**
- Transactional (required): Account verification, password reset, collaboration requests
- Engagement: Session reminders, goal milestones, weekly summaries
- Marketing (opt-in): Product updates, tips, success stories

**Email Templates:**
- HTML templates with plain text fallback
- Branded with Mentorshape logo and colors
- Responsive design (mobile-friendly)
- Unsubscribe link in footer

### 2. In-App Notifications

**Storage:** `notifications` table in Supabase

**Features:**
- Real-time updates via Supabase Realtime
- Notification center in dashboard
- Mark as read/unread
- Grouped by type (collaborations, sessions, goals)
- Badge count in navigation

**Notification Types:**
- Collaboration requests
- Session reminders
- Goal milestones
- Messages from mentors/mentees
- System updates

### 3. SMS Notifications (Optional)

**Provider:** Twilio or similar

**Use Cases:**
- Critical: Session starting in 15 minutes
- Urgent: Payment failed, account locked
- Opt-in only: Weekly progress summary

---

## Email Notification Triggers

### Authentication & Account

#### User Created
- **Trigger:** Clerk webhook `user.created`
- **Recipient:** New user
- **Template:** `welcome-email`
- **Content:**
  - Welcome message
  - Getting started guide
  - Link to create first goal
- **Timing:** Immediate

#### Email Verification
- **Trigger:** Clerk email verification
- **Recipient:** User
- **Template:** `verify-email`
- **Content:** Verification link
- **Timing:** Immediate

#### Password Reset
- **Trigger:** Clerk password reset request
- **Recipient:** User
- **Template:** `reset-password`
- **Content:** Reset link (expires in 1 hour)
- **Timing:** Immediate

---

### Goals & Milestones

#### Goal Created
- **Trigger:** `POST /api/goals` succeeds
- **Recipient:** Goal creator (mentee)
- **Template:** `goal-created`
- **Content:**
  - Goal title and description
  - Share link (`/g/[slug]`)
  - Next steps (find mentor, set milestones)
- **Timing:** Immediate

#### Milestone Completed
- **Trigger:** Milestone status changes to `done`
- **Recipient:** Goal creator (mentee)
- **Template:** `milestone-completed`
- **Content:**
  - Milestone title
  - Progress percentage
  - Next milestone preview
- **Timing:** Immediate

#### Goal Completed
- **Trigger:** Goal status changes to `completed`
- **Recipient:** Goal creator (mentee) + all mentors
- **Template:** `goal-completed`
- **Content:**
  - Goal summary
  - Achievement highlights
  - Shareable completion summary (LinkedIn post)
  - Next goal suggestions
- **Timing:** Immediate

---

### Collaborations

#### Collaboration Request Received
- **Trigger:** `POST /api/collaborations` creates pending collaboration
- **Recipient:** Mentee
- **Template:** `collab-request-received`
- **Content:**
  - Mentor name and profile
  - Goal title
  - Mentor's message (if any)
  - Accept/decline buttons
- **Timing:** Immediate

#### Collaboration Accepted
- **Trigger:** `POST /api/collaborations/[id]/accept` succeeds
- **Recipient:** Mentor
- **Template:** `collab-accepted`
- **Content:**
  - Mentee name
  - Goal details
  - Next steps (set availability, schedule first session)
- **Timing:** Immediate

#### Collaboration Declined
- **Trigger:** Collaboration status changes to `cancelled` (by mentee)
- **Recipient:** Mentor
- **Template:** `collab-declined`
- **Content:**
  - Mentee name
  - Goal title
  - Encouragement message
- **Timing:** Immediate

#### Collaboration Cancelled
- **Trigger:** Collaboration status changes to `cancelled` (by either party)
- **Recipient:** Both mentor and mentee
- **Template:** `collab-cancelled`
- **Content:**
  - Cancellation reason (if provided)
  - Session history summary
  - Feedback request
- **Timing:** Immediate

---

### Sessions (Focus Sessions)

#### Session Scheduled
- **Trigger:** `POST /api/sessions` succeeds
- **Recipient:** Both mentor and mentee
- **Template:** `session-scheduled`
- **Content:**
  - Session date/time (both timezones)
  - Meeting link
  - Calendar attachment (.ics)
  - Session agenda preview
- **Timing:** Immediate

#### Session Reminder (24h Before)
- **Trigger:** Background job runs daily, finds sessions starting in 24h
- **Recipient:** Both mentor and mentee
- **Template:** `session-reminder-24h`
- **Content:**
  - Session date/time
  - Meeting link
  - Preparation checklist
  - Agenda items
- **Timing:** 24 hours before session

#### Session Reminder (15m Before)
- **Trigger:** Background job runs every 5 minutes, finds sessions starting in 15m
- **Recipient:** Both mentor and mentee
- **Template:** `session-reminder-15m`
- **Content:**
  - Session starting soon
  - Meeting link (prominent)
  - Quick agenda reminder
- **Timing:** 15 minutes before session
- **Channel:** Email + SMS (if enabled)

#### Session Completed
- **Trigger:** Session status changes to `completed` or recording uploaded
- **Recipient:** Both mentor and mentee
- **Template:** `session-completed`
- **Content:**
  - Session summary (AI-generated)
  - Action items
  - Recording link (if available)
  - Next session preview
- **Timing:** Immediate (or when summary ready)

#### Session Cancelled
- **Trigger:** Session status changes to `cancelled`
- **Recipient:** Both mentor and mentee
- **Template:** `session-cancelled`
- **Content:**
  - Cancellation reason
  - Reschedule option
  - Refund status (if paid)
- **Timing:** Immediate

---

### Payments & Transactions

#### Payment Successful
- **Trigger:** Stripe webhook `payment_intent.succeeded`
- **Recipient:** Buyer (mentee)
- **Template:** `payment-successful`
- **Content:**
  - Transaction details
  - Receipt PDF link
  - Session details (if consultation)
  - Download link (if digital product)
- **Timing:** Immediate

#### Payment Failed
- **Trigger:** Stripe webhook `payment_intent.payment_failed`
- **Recipient:** Buyer (mentee)
- **Template:** `payment-failed`
- **Content:**
  - Failure reason
  - Retry payment button
  - Update payment method link
- **Timing:** Immediate

#### Refund Processed
- **Trigger:** Stripe webhook `charge.refunded`
- **Recipient:** Buyer (mentee) + Mentor
- **Template:** `refund-processed`
- **Content:**
  - Refund amount
  - Refund reason
  - Expected processing time
- **Timing:** Immediate

#### Payout Received (Mentor)
- **Trigger:** Stripe webhook `payout.paid`
- **Recipient:** Mentor
- **Template:** `payout-received`
- **Content:**
  - Payout amount
  - Period covered
  - Bank account details (last 4 digits)
- **Timing:** Immediate

---

### Organization Programs

#### Program Invitation
- **Trigger:** Admin adds user to program
- **Recipient:** Invited user
- **Template:** `program-invitation`
- **Content:**
  - Organization name
  - Program details
  - Accept invitation button
- **Timing:** Immediate

#### Match Proposed
- **Trigger:** AI matching creates match with status `proposed`
- **Recipient:** Mentor + Mentee
- **Template:** `match-proposed`
- **Content:**
  - Match partner details
  - Match score and reasons
  - Accept/decline buttons
- **Timing:** Immediate

#### Match Confirmed
- **Trigger:** Both parties accept match
- **Recipient:** Mentor + Mentee
- **Template:** `match-confirmed`
- **Content:**
  - Partner introduction
  - Program details
  - Next steps
- **Timing:** Immediate

---

## In-App Notification Schema

### Database Table

```sql
create table public.notifications (
  id uuid primary key default uuid_generate_v4(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  type text not null, -- 'collab_request', 'session_reminder', 'milestone', etc.
  title text not null,
  message text,
  action_url text, -- Link to relevant page
  metadata jsonb, -- Additional context
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_notifications_profile_unread on public.notifications(profile_id, read_at) where read_at is null;
```

### Notification Types

- `collab_request`: New collaboration request
- `collab_accepted`: Collaboration accepted
- `collab_declined`: Collaboration declined
- `session_scheduled`: Session booked
- `session_reminder`: Session reminder
- `session_completed`: Session completed
- `milestone_completed`: Milestone achieved
- `goal_completed`: Goal completed
- `payment_success`: Payment successful
- `payment_failed`: Payment failed
- `match_proposed`: Match proposed (org programs)
- `system_update`: System notification

---

## User Notification Preferences

### Database Table

```sql
create table public.notification_preferences (
  id uuid primary key default uuid_generate_v4(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  channel text not null, -- 'email', 'in_app', 'sms'
  type text not null, -- Notification type
  enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  unique(profile_id, channel, type)
);
```

### Default Preferences

**Email:**
- All notifications enabled by default
- User can disable non-critical notifications
- Critical notifications (payment, security) always enabled

**In-App:**
- All notifications enabled by default
- User can disable specific types

**SMS:**
- Disabled by default
- User must opt-in
- Only critical notifications (session reminders, payment failures)

### Preference Management

- Settings page: `/settings/notifications`
- Toggle per notification type
- Preview notification examples
- Test notification button

---

## Notification Delivery Logic

### Delivery Flow

1. **Event Occurs:** API endpoint or background job triggers notification
2. **Check Preferences:** Query `notification_preferences` for user
3. **Create In-App:** Always create in-app notification (unless disabled)
4. **Send Email:** Send email if enabled and not recently sent (rate limiting)
5. **Send SMS:** Send SMS if enabled and critical/urgent
6. **Log Delivery:** Record in `notification_logs` table

### Rate Limiting

**Email:**
- Max 5 emails per user per day (prevents spam)
- Critical emails (payment, security) bypass limit
- Batch non-critical emails into digest (daily/weekly)

**SMS:**
- Max 3 SMS per user per day
- Only critical notifications
- Charge user for SMS (optional)

### Batching

**Daily Digest:**
- Non-critical notifications batched into daily email
- Sent at user's preferred time (default: 9 AM local time)
- Includes:
  - Unread in-app notifications summary
  - Goal progress updates
  - Upcoming sessions (next 7 days)

**Weekly Summary:**
- Opt-in weekly email
- Includes:
  - Goals completed this week
  - Sessions completed
  - Progress highlights
  - Next week preview

---

## Email Templates

### Template Structure

```
templates/
├── auth/
│   ├── welcome-email.html
│   ├── verify-email.html
│   └── reset-password.html
├── goals/
│   ├── goal-created.html
│   ├── milestone-completed.html
│   └── goal-completed.html
├── collaborations/
│   ├── collab-request-received.html
│   ├── collab-accepted.html
│   ├── collab-declined.html
│   └── collab-cancelled.html
├── sessions/
│   ├── session-scheduled.html
│   ├── session-reminder-24h.html
│   ├── session-reminder-15m.html
│   ├── session-completed.html
│   └── session-cancelled.html
├── payments/
│   ├── payment-successful.html
│   ├── payment-failed.html
│   ├── refund-processed.html
│   └── payout-received.html
└── programs/
    ├── program-invitation.html
    ├── match-proposed.html
    └── match-confirmed.html
```

### Template Variables

Common variables available in all templates:
- `{{user_name}}`: User's display name
- `{{user_email}}`: User's email
- `{{unsubscribe_url}}`: Unsubscribe link
- `{{preferences_url}}`: Notification preferences link
- `{{support_url}}`: Support contact link

Type-specific variables documented per template.

---

## Implementation Notes

### Email Service Integration

**Resend Example:**
```typescript
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

await resend.emails.send({
  from: 'Mentorshape <notifications@mentorshape.com>',
  to: userEmail,
  subject: 'New Collaboration Request',
  html: renderTemplate('collab-request-received', variables),
});
```

### In-App Notification Creation

```typescript
await supabase.from('notifications').insert({
  profile_id: menteeProfileId,
  type: 'collab_request',
  title: 'New Collaboration Request',
  message: `${mentorName} wants to mentor you on "${goalTitle}"`,
  action_url: `/collaborations/${collabId}`,
  metadata: { collaboration_id: collabId, mentor_id: mentorId }
});
```

### Background Jobs

**Session Reminders:**
- Supabase Edge Function (cron) runs every 5 minutes
- Query: `SELECT * FROM focus_sessions WHERE start_time BETWEEN NOW() + INTERVAL '15 minutes' AND NOW() + INTERVAL '16 minutes' AND status = 'scheduled'`
- Send reminders for matching sessions

**Daily Digest:**
- Supabase Edge Function (cron) runs daily at 9 AM UTC
- Query users with unread notifications
- Batch and send digest email

---

## Testing Notifications

### Test Checklist

- [ ] All email templates render correctly
- [ ] In-app notifications appear in real-time
- [ ] Notification preferences work correctly
- [ ] Rate limiting prevents spam
- [ ] Unsubscribe links work
- [ ] SMS delivery (if enabled)
- [ ] Background jobs run on schedule
- [ ] Error handling (email service down)

### Test Emails

- Use test email service (Mailtrap, etc.) in development
- Test all templates with sample data
- Verify mobile rendering
- Check spam score (use Mail-Tester)

---

## Future Enhancements

- Push notifications (browser + mobile apps)
- Slack integration for org admins
- WhatsApp notifications (international users)
- Notification scheduling (send at user's preferred time)
- Rich notifications (images, action buttons)
- Notification analytics (open rates, click rates)

