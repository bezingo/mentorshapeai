# Edge Cases & Error Handling

## Overview

This document covers edge cases, error scenarios, and how the system handles them across all major features.

---

## Collaboration Lifecycle Edge Cases

### 1. Collaboration Cancelled Mid-Way

**Scenario:** Mentor or mentee cancels an active collaboration.

**Handling:**
- Set `collaborations.status = 'cancelled'`
- Cancel all upcoming `focus_sessions` (set status to 'cancelled')
- Send notification to both parties
- If paid consultation: Process refund (see Payment Edge Cases)
- Archive goal if mentee cancels (optional: allow goal to continue with new mentor)
- Preserve session history and summaries (for reference)

**API Behavior:**
- `POST /api/collaborations/[collabId]/close` with `status: 'cancelled'`
- Returns success even if sessions are cancelled
- Log cancellation reason (optional field)

### 2. Goal Archived While Collaboration Active

**Scenario:** Mentee archives a goal that has active collaborations.

**Handling:**
- Set `goals.status = 'archived'`
- Set `goals.public_slug = null` (remove from public view)
- Keep collaborations active (mentor can still help)
- Prevent new collaborations from being created
- Notify mentor that goal is archived
- Allow mentor to close collaboration if desired

**API Behavior:**
- `PUT /api/goals/[goalId]` with `status: 'archived'` succeeds
- `POST /api/collaborations` for archived goal returns `400 Bad Request`

### 3. Mentor Becomes Unavailable

**Scenario:** Mentor disables mentor mode or deletes account while collaborations are active.

**Handling:**
- If mentor disables mode: Set all pending collaborations to 'cancelled'
- If mentor deletes account: 
  - Set `profiles.is_mentor = false` (soft delete)
  - Notify mentees of cancellation
  - Offer to match with alternative mentors (if org program)
- Preserve session history for mentee reference
- Refund any paid consultations (see Payment Edge Cases)

**API Behavior:**
- `PUT /api/profile/me` with `is_mentor: false` triggers collaboration cleanup
- Returns list of affected collaborations

### 4. Multiple Collaborations for Same Goal

**Scenario:** Mentee accepts multiple mentors for the same goal.

**Handling:**
- **Allowed**: Multiple active collaborations per goal
- Each collaboration is independent
- Sessions are collaboration-specific
- Progress tracking aggregates across all collaborations
- Mentee can close individual collaborations

**API Behavior:**
- `POST /api/collaborations` succeeds even if goal has active collaborations
- `GET /api/goals/[goalId]` returns all collaborations for goal

### 5. Collaboration Expires (End Date Passed)

**Scenario:** Collaboration `end_date` passes while status is still 'active'.

**Handling:**
- Background job checks for expired collaborations daily
- Set `status = 'completed'` if goal is completed
- Set `status = 'cancelled'` if goal is not completed
- Send notification to both parties
- Generate final summary (if not already generated)
- Request rating from mentee

**Implementation:**
- Supabase Edge Function (cron job) runs daily
- Query: `SELECT * FROM collaborations WHERE end_date < NOW() AND status = 'active'`

---

## Payment & Transaction Edge Cases

### 1. Payment Failure for Paid Consultation

**Scenario:** Stripe payment fails when booking a paid consultation.

**Handling:**
- Set `transactions.status = 'failed'`
- Do not create `focus_sessions` record
- Do not send calendar invite
- Return error to user with retry option
- Log failure reason (insufficient funds, card declined, etc.)
- Allow user to update payment method and retry

**API Behavior:**
- `POST /api/sessions` with paid consultation returns `402 Payment Required`
- Error response includes `stripe_error` field with details
- Frontend shows payment retry UI

### 2. Refund Request

**Scenario:** User requests refund for paid consultation or digital product.

**Handling:**
- **Consultation refunds:**
  - Full refund if session not started (more than 24h before)
  - 50% refund if session started but not completed
  - No refund if session completed (unless exceptional circumstances)
- **Digital product refunds:**
  - No refunds (digital products are non-refundable)
  - Exception: Technical issues (file corrupted, etc.)
- Process refund via Stripe API
- Update `transactions.status = 'refunded'`
- Notify both parties
- Update mentor payout (deduct from next payout)

**API Behavior:**
- `POST /api/transactions/[transactionId]/refund` (admin/mentor only)
- Returns refund status and amount

### 3. Mentor Payout Failure

**Scenario:** Stripe Connect payout fails (bank account issue, etc.).

**Handling:**
- Log payout failure
- Notify mentor via email
- Retry payout automatically (3 attempts over 7 days)
- If all retries fail: Hold funds, notify mentor to update bank details
- Mentor can update Stripe Connect account and retry

**Implementation:**
- Stripe webhook: `payout.paid` (success) or `payout.failed` (failure)
- Background job retries failed payouts

### 4. Platform Fee Calculation Error

**Scenario:** Platform fee calculation is incorrect.

**Handling:**
- Validate fee calculation before creating transaction
- Fee = `amount_cents * 0.10` (10%) or `amount_cents * 0.15` (15%)
- Store calculated fee in `platform_fee_cents`
- If discrepancy detected: Log error, hold transaction, manual review
- Never process transaction with incorrect fee

**Validation:**
```typescript
const platformFee = Math.round(amountCents * 0.10); // or 0.15
if (platformFee !== transaction.platform_fee_cents) {
  throw new Error('Platform fee mismatch');
}
```

### 5. Duplicate Payment Prevention

**Scenario:** User accidentally clicks "Pay" twice, creating duplicate charges.

**Handling:**
- Use Stripe idempotency keys (based on `collaboration_id` + `session_id`)
- Check for existing `transactions` record before creating
- If duplicate detected: Return existing transaction, don't charge again
- Frontend: Disable payment button after first click

**Implementation:**
```typescript
const idempotencyKey = `${collaborationId}-${sessionId}`;
const paymentIntent = await stripe.paymentIntents.create({
  amount: amountCents,
  currency: 'usd',
}, {
  idempotencyKey: idempotencyKey
});
```

---

## Calendar Integration Edge Cases

### 1. Double-Booking Prevention

**Scenario:** Mentor's calendar shows available slot, but external calendar has event.

**Handling:**
- Before creating session: Check mentor's Google/Microsoft Calendar
- Query calendar API for busy times in slot window
- If conflict detected: Return `409 Conflict` with available alternatives
- Show mentor's real-time availability (not just template)
- Allow mentor to override (mark slot as available despite external event)

**API Behavior:**
- `POST /api/sessions` validates calendar availability
- Returns `409 Conflict` if slot is busy
- Response includes `available_slots` array

### 2. Calendar Sync Failure

**Scenario:** Google/Microsoft Calendar API is down or returns error.

**Handling:**
- Log sync failure
- Fall back to mentor's availability template (if exists)
- Allow session creation with warning: "Calendar sync unavailable, please verify manually"
- Retry sync in background (exponential backoff)
- Notify mentor of sync issues

**Implementation:**
- Try-catch around calendar API calls
- Fallback to `mentor_availability` table if API fails
- Background job retries failed syncs

### 3. Timezone Mismatch

**Scenario:** Mentor in EST, mentee in PST books session.

**Handling:**
- Store all times in UTC in database
- Convert to user's timezone in UI
- Show both timezones when booking: "5:00 PM EST / 2:00 PM PST"
- Validate timezone on session creation
- Send calendar invites in both timezones

**Implementation:**
- Use `date-fns-tz` or similar for timezone conversion
- Store `timezone` in `profiles` table
- Convert `start_time` to UTC before saving

### 4. External Calendar Event Added After Session Booked

**Scenario:** Mentor adds external event that conflicts with booked session.

**Handling:**
- Background job checks for conflicts daily
- If conflict detected: Notify both parties
- Offer to reschedule session
- If not rescheduled within 48h: Auto-cancel session (refund if paid)
- Log conflict for mentor availability analysis

**Implementation:**
- Supabase Edge Function (cron) checks upcoming sessions
- Compares `focus_sessions.start_time` with calendar busy times
- Sends notification if conflict found

---

## AI Agent Failure Scenarios

### 1. AI Agent Timeout

**Scenario:** LangChain agent takes too long (>30s) or times out.

**Handling:**
- Set timeout on all AI agent calls (30s default)
- If timeout: Return partial result if available
- Log timeout for monitoring
- Retry once with shorter context (if applicable)
- If retry fails: Return error, allow manual input
- Notify user: "AI processing delayed, please try again"

**Implementation:**
```typescript
const result = await Promise.race([
  aiAgent.invoke(input),
  new Promise((_, reject) => 
    setTimeout(() => reject(new Error('Timeout')), 30000)
  )
]);
```

### 2. AI Agent Returns Invalid JSON

**Scenario:** LLM returns malformed JSON that doesn't match expected schema.

**Handling:**
- Use structured outputs (OpenAI function calling or Zod schema)
- If JSON parsing fails: Retry with stricter prompt
- If retry fails: Return error, allow manual editing
- Log malformed response for prompt improvement
- Fallback: Return empty structure, let user fill in

**Implementation:**
```typescript
try {
  const parsed = JSON.parse(aiResponse);
  const validated = schema.parse(parsed); // Zod validation
} catch (error) {
  // Retry or return error
}
```

### 3. AI Agent Rate Limit Exceeded

**Scenario:** OpenAI/Anthropic API returns rate limit error.

**Handling:**
- Implement exponential backoff retry
- Queue request for later processing
- Return `503 Service Unavailable` to user
- Show user: "AI service busy, will process shortly"
- Process queue when rate limit resets
- Monitor rate limit usage, upgrade plan if needed

**Implementation:**
- Use `p-queue` or similar for request queuing
- Retry with exponential backoff: `2^attempt * 1000ms`
- Max retries: 5

### 4. AI Agent Cost Exceeded

**Scenario:** Monthly AI budget exceeded.

**Handling:**
- Check AI usage before each agent call
- If budget exceeded: Return error, don't call API
- Notify admin to increase budget
- Allow manual input as fallback
- Show user: "AI features temporarily unavailable"

**Implementation:**
- Track AI costs in `ai_usage` table
- Check `SUM(cost)` for current month before calls
- Block calls if over budget

### 5. Profile Builder Agent Fails to Parse CV

**Scenario:** CV upload is corrupted, unreadable, or unsupported format.

**Handling:**
- Validate file type before processing (PDF, DOCX only)
- Validate file size (< 5MB)
- If parsing fails: Return error with specific reason
- Allow user to re-upload or enter manually
- Support multiple formats: PDF, DOCX, TXT
- Use OCR for image-based PDFs (optional)

**API Behavior:**
- `POST /api/profile/parse-cv` validates file first
- Returns `400 Bad Request` if file invalid
- Error message: "Unable to parse CV. Please ensure it's a valid PDF or DOCX file."

---

## Session Management Edge Cases

### 1. Session Recording Upload Fails

**Scenario:** Meeting recording file is too large or upload fails.

**Handling:**
- Validate file size before upload (< 500MB)
- If upload fails: Retry with exponential backoff (3 attempts)
- If all retries fail: Notify mentor, allow manual upload
- Store partial transcript if available
- Allow session summary without recording

**Implementation:**
- Use Supabase Storage with chunked uploads for large files
- Track upload progress
- Retry failed chunks

### 2. Transcript Generation Fails

**Scenario:** Whisper API fails or returns empty transcript.

**Handling:**
- Retry transcript generation (2 attempts)
- If fails: Allow manual transcript entry
- Use Zoom transcript if available (fallback)
- Generate summary from agenda + notes if no transcript
- Notify mentor of failure

**Implementation:**
- Try Whisper API first
- Fallback to Zoom transcript API
- Fallback to manual entry

### 3. Session Cancelled Last Minute

**Scenario:** Mentor or mentee cancels session < 24h before start.

**Handling:**
- Set `focus_sessions.status = 'cancelled'`
- Send cancellation notification
- If paid: Process refund (see Payment Edge Cases)
- Remove calendar event
- Allow rescheduling (if within collaboration window)
- Log cancellation reason

**API Behavior:**
- `PUT /api/sessions/[sessionId]` with `status: 'cancelled'`
- Validates cancellation window (24h)
- Returns refund status if applicable

---

## Organization Program Edge Cases

### 1. AI Matching Produces No Matches

**Scenario:** Matching agent returns empty results for mentee.

**Handling:**
- Return empty `matches` array
- Notify admin: "No suitable mentors found"
- Allow manual matching by admin
- Suggest expanding mentor pool or adjusting mentee criteria
- Log matching failure for analysis

**API Behavior:**
- `POST /api/programs/[programId]/match` returns `{ matches: [] }`
- Includes `warnings` array with reasons

### 2. Mentor Declines All Matches

**Scenario:** Mentor declines all proposed matches in program.

**Handling:**
- Set `matches.status = 'declined'`
- Notify admin
- Re-run matching for mentee (exclude declined mentors)
- If no alternatives: Notify mentee, offer to wait or exit program
- Track decline rate for mentor (may affect future matching)

**Implementation:**
- Query: `SELECT * FROM matches WHERE mentor_profile_id = X AND status = 'declined'`
- If count > threshold: Flag mentor for review

### 3. Program Participant Leaves Mid-Program

**Scenario:** Mentor or mentee leaves organization or program.

**Handling:**
- Set `program_participants` record to inactive (soft delete)
- If mentor leaves: Re-match mentees to new mentors
- If mentee leaves: Close collaborations, notify mentors
- Preserve program history
- Allow re-joining if within program window

**API Behavior:**
- `DELETE /api/programs/[programId]/participants/[participantId]` soft deletes
- Triggers re-matching if mentor removed

---

## Data Consistency Edge Cases

### 1. Orphaned Records

**Scenario:** Foreign key constraint violation or cascade delete issue.

**Handling:**
- Use database constraints to prevent orphans
- Background job checks for orphans weekly
- Clean up orphaned records:
  - Goals without profile (delete)
  - Sessions without collaboration (delete)
  - Collaborations without goal (set to cancelled)
- Log cleanup actions

**Implementation:**
- Supabase Edge Function (cron) runs weekly
- Query for orphans: `SELECT * FROM goals WHERE profile_id NOT IN (SELECT id FROM profiles)`
- Clean up or fix relationships

### 2. Concurrent Updates

**Scenario:** Two users update same record simultaneously.

**Handling:**
- Use optimistic locking (version field or `updated_at` timestamp)
- Return `409 Conflict` if version mismatch
- Frontend retries with latest data
- For critical updates: Use database transactions

**Implementation:**
- Add `version` integer field to critical tables
- Increment on update: `UPDATE table SET version = version + 1 WHERE id = X AND version = Y`
- If rows affected = 0: Conflict detected

---

## Error Response Format

All API errors follow this format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      "field": "Additional context"
    },
    "retryable": true,
    "retry_after": 60
  }
}
```

**Common Error Codes:**
- `VALIDATION_ERROR`: Input validation failed
- `NOT_FOUND`: Resource not found
- `UNAUTHORIZED`: Authentication required
- `FORBIDDEN`: Insufficient permissions
- `CONFLICT`: Resource conflict (e.g., double-booking)
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `SERVICE_UNAVAILABLE`: External service down
- `INTERNAL_ERROR`: Server error (log for investigation)

