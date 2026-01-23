# Specification: AI Goal Shaper Agent

## Goal

Build an AI agent that expands user-written goals into structured milestones, success criteria, weekly breakdowns, and suggested mentor questions. This agent transforms vague aspirations into actionable, time-bound plans that power the mentoring platform.

## User Stories

- As a mentee, I want my rough goal automatically expanded into clear milestones and success criteria so that I can track progress and know what success looks like.
- As a mentee, I want suggested questions to ask my mentor so that I can make the most of our sessions.
- As a mentor, I want to see structured milestones and success criteria for mentee goals so that I can provide targeted guidance.
- As a mentee, I want to review and edit AI-generated milestones before accepting them so that I have control over my goal plan.

## Specific Requirements

### Agent Inputs

**Required Fields:**
- User-written goal text (`title` from goal creation form) - string, max 200 chars
- Time horizon (`duration_days`: 30 or 60 days) - integer
- Current challenges (`current_challenges` from goal form) - string, can be empty

**Optional Fields:**
- Category (Career, Startup, Fitness, Learning, Personal Growth) - string
- Description (additional context) - string
- Existing success definition (if user provided one) - string, used as context only

**Input Validation:**
- Goal title must be non-empty
- Duration must be 30 or 60 (enforced at form level)
- Challenges can be empty string (agent handles gracefully)

### Agent Outputs

**Refined Goal Statement:**
- Cleaned and clarified version of the user's original goal
- More specific and actionable than original
- Stored in `goals.refined_goal_statement` (text field)
- Original title remains unchanged

**Success Definition:**
- Measurable criteria for goal completion
- Specific, quantifiable outcomes
- Only populated if `goals.success_definition` is empty (doesn't overwrite user input)
- Stored in `goals.success_definition` (text field)

**Milestones:**
- Array of milestones with realistic timing for the time horizon
- For 30-day goals: 3-4 milestones (approximately one per week)
- For 60-day goals: 5-7 milestones (approximately one per week)
- Each milestone contains:
  - `title`: Short, descriptive milestone name (string, max 200 chars)
  - `description`: Detailed explanation of what needs to be achieved (string, max 1000 chars)
  - `relative_day_offset`: Days from goal creation date (integer, 0-60)
  - `target_date`: Calculated as `goal.created_at + relative_day_offset` (date)
  - `status`: Default 'pending' (milestone_status enum)
- Milestones are created as records in `goal_milestones` table
- Ordered by `target_date` ascending

**Suggested Questions for Mentor:**
- Array of 5-8 questions mentee should ask their mentor
- Categorized by milestone or key topic areas
- Relevant to the specific goal and challenges
- Stored in `goals.suggested_mentor_questions` (text[] array)

**Risks & Pitfalls:**
- Array of risk-mitigation pairs
- Each item contains:
  - `risk`: Potential obstacle or challenge (string)
  - `mitigation`: How to address or prevent the risk (string)
- Stored in `goals.risks_pitfalls` (jsonb field)
- Format: `[{ "risk": "...", "mitigation": "..." }, ...]`

### Triggering the Agent

**Automatic Trigger:**
- When goal status changes from 'draft' to 'active'
- Called automatically via API middleware or database trigger
- Shows loading state: "AI is shaping your goal..."

**Manual Trigger:**
- "Shape Goal with AI" button in goal detail page
- Available for draft goals or to re-shape existing goals
- User can trigger multiple times (replaces previous milestones)

**API Endpoint:**
- `POST /api/ai/goal-shaper`
- Accepts: `{ goal_id: string }` or `{ goal_data: {...} }` (dry-run mode)
- Returns: `{ data: { milestones: [...], success_definition: string, ... } }`
- Creates milestones in database (if goal_id provided)
- Updates goal with refined statement and success definition

### User Review Flow

**After AI Shaping:**
1. Show `GoalShapingModal` component with shaped results
2. Display refined goal statement (editable)
3. Show generated milestones with dates (editable/deletable)
4. Display success criteria (editable)
5. Show suggested mentor questions (editable)
6. Show risks and pitfalls (editable)
7. "Accept & Save" button - saves all to database
8. "Edit Manually" button - allows manual milestone creation
9. "Cancel" button - discards AI-generated content

**Editing Capabilities:**
- Users can edit any AI-generated content before saving
- Users can add/remove milestones
- Users can modify dates and descriptions
- Original goal title always preserved

### Technical Requirements

**AI Implementation:**
- Use LangChain with OpenAI (structured outputs)
- Model: `gpt-4o-mini` (same as Profile Builder agent)
- Temperature: 0 (for consistency)
- Follow same pattern as `lib/ai/profile-builder.ts`
- Use `ChatOpenAI` with `JsonOutputParser`
- Use Zod schema for validation (`GoalShapedDataSchema`)

**Error Handling:**
- **Timeout (30s)**: Return 504 Gateway Timeout, allow manual creation
- **Invalid JSON**: Retry once with stricter prompt, then return error
- **Rate Limit**: Return 503 with retry-after header, queue for later
- **Goal Not Found**: Return 404
- **Validation Error**: Return 400 with error details
- Always provide fallback to manual milestone creation

**Performance:**
- Target processing time: < 10 seconds
- Success rate: 90%+ of goals successfully shaped
- Error rate: < 5%

**Database Integration:**
- Use Supabase service client for inserts (bypasses RLS)
- Verify user owns goal before shaping (authorization check)
- Calculate target dates from `relative_day_offset` + `goals.created_at`
- Store `ai_shaped_at` timestamp when shaping completes

## Database Schema

### Existing Tables

**`goals` table:**
- `id` (uuid, primary key)
- `profile_id` (uuid, foreign key)
- `title` (text, required)
- `description` (text, optional)
- `category` (text, optional)
- `duration_days` (integer, 30 or 60)
- `status` (goal_status enum: 'draft', 'active', 'completed')
- `success_definition` (text, optional) - Can be user-provided or AI-generated
- `current_challenges` (text, optional)
- `created_at` (timestamptz)
- `completed_at` (timestamptz, nullable)

**`goal_milestones` table:**
- `id` (uuid, primary key)
- `goal_id` (uuid, foreign key to goals)
- `title` (text, required)
- `description` (text, optional)
- `target_date` (date, required)
- `status` (milestone_status enum: 'pending', 'in_progress', 'done')

### New Fields Required

**Migration: `010_goal_shaper_fields.sql`**
- `goals.refined_goal_statement` (text, nullable) - AI-refined version of goal
- `goals.suggested_mentor_questions` (text[], default '{}') - Array of suggested questions
- `goals.risks_pitfalls` (jsonb, nullable) - Structured risk-mitigation pairs
- `goals.ai_shaped_at` (timestamptz, nullable) - Timestamp when AI shaping completed

### Schema Constraints

- `suggested_mentor_questions` array max length: 20 questions
- `risks_pitfalls` JSONB structure: `[{ "risk": string, "mitigation": string }]`
- `refined_goal_statement` max length: 500 characters
- Milestones must have `target_date` >= `goals.created_at`
- Milestones must have `target_date` <= `goals.created_at + duration_days`

## API Specification

### POST `/api/ai/goal-shaper`

**Request Body (Option 1 - With goal_id):**
```json
{
  "goal_id": "uuid-string"
}
```

**Request Body (Option 2 - Dry-run mode):**
```json
{
  "goal_data": {
    "title": "Learn React",
    "duration_days": 30,
    "current_challenges": "No prior JavaScript experience",
    "category": "Learning",
    "description": "Want to build a portfolio project"
  }
}
```

**Success Response (200):**
```json
{
  "data": {
    "refined_goal_statement": "Master React fundamentals and build a portfolio project within 30 days",
    "success_definition": "Complete a React portfolio project with 3+ components, state management, and API integration",
    "milestones": [
      {
        "id": "uuid",
        "title": "Complete React Basics",
        "description": "Finish React fundamentals course and understand JSX, components, and props",
        "target_date": "2025-01-07",
        "relative_day_offset": 7,
        "status": "pending"
      }
    ],
    "suggested_mentor_questions": [
      "What are the most important React concepts to focus on first?",
      "How should I structure my portfolio project?"
    ],
    "risks_pitfalls": [
      {
        "risk": "Overwhelmed by too many concepts at once",
        "mitigation": "Focus on one concept per day, practice with small exercises"
      }
    ],
    "ai_shaped_at": "2025-12-21T10:30:00Z"
  }
}
```

**Error Responses:**
- `400 Bad Request`: Invalid input, validation error
- `404 Not Found`: Goal not found or user doesn't own goal
- `500 Internal Server Error`: AI processing failed
- `503 Service Unavailable`: Rate limit exceeded (with retry-after header)
- `504 Gateway Timeout`: AI timeout after 30 seconds

## Edge Cases & Error Handling

### Input Edge Cases

- **Goal with no challenges**: Use empty string, agent handles gracefully
- **Goal with very vague description**: Agent makes reasonable assumptions based on title and category
- **Goal with existing success_definition**: Use as context, don't overwrite (only populate if empty)
- **Goal with very short time horizon (< 30 days)**: Still generate milestones, adjust spacing accordingly

### AI Processing Edge Cases

- **AI Timeout (30s)**: Return 504 Gateway Timeout, show error message, allow manual creation
- **Invalid JSON from AI**: Retry once with stricter prompt, if still fails return error
- **Rate Limit Exceeded**: Return 503 with retry-after header, queue for later processing
- **Partial Response**: If some milestones generated but process interrupted, return partial results
- **Empty Milestones Array**: Should not happen, but handle gracefully by allowing manual creation

### Database Edge Cases

- **Concurrent Shaping**: Prevent multiple simultaneous shaping requests for same goal (use lock or status flag)
- **Goal Deleted During Shaping**: Check goal exists before saving milestones
- **Milestone Date Outside Horizon**: Validate `target_date` <= `created_at + duration_days`
- **User Doesn't Own Goal**: Verify authorization before shaping

## UI Integration Points

### Goal Creation Flow

**After Goal Created:**
- If status='active': Auto-trigger shaping, show loading toast
- Show `GoalShapingModal` with results
- User can accept, edit, or reject AI-generated content

### Goal Detail Page

**"Shape Goal with AI" Button:**
- Available for draft goals or to re-shape
- Shows loading state during processing
- Opens review modal with shaped results

**Display Shaped Content:**
- Show refined goal statement (if available) alongside original title
- Display AI-generated milestones in timeline view
- Show suggested questions in collapsible section
- Display risks and pitfalls in expandable card

## Success Criteria

### Functional Requirements

- ✅ Agent successfully expands 90%+ of test goals into valid milestones
- ✅ Milestones are realistic for the given time horizon (not too aggressive or too easy)
- ✅ Success criteria are measurable and specific (not vague)
- ✅ Suggested questions are relevant and actionable
- ✅ Integration with goal creation flow is seamless
- ✅ Error handling works for all edge cases
- ✅ User can review and edit AI-generated content before saving

### Performance Requirements

- ✅ Average processing time < 10 seconds
- ✅ Error rate < 5%
- ✅ 90%+ success rate for valid goal inputs

### Quality Requirements

- ✅ Milestones respect time horizon (3-4 for 30 days, 5-7 for 60 days)
- ✅ Target dates are realistic and evenly spaced
- ✅ Questions are categorized and relevant to milestones
- ✅ Risks include actionable mitigation strategies

