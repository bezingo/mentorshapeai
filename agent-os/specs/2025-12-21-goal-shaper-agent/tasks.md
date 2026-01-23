# Task Breakdown: AI Goal Shaper Agent

## Overview
Total Tasks: ~20 tasks across 4 task groups

This AI agent expands user-written goals into structured milestones, success criteria, weekly breakdowns, and suggested mentor questions using LangChain and OpenAI structured outputs.

## Task List

---

### Database Layer

#### Task Group 1: Schema Extensions
**Dependencies:** None
**Specialist:** Database Engineer

- [x] 1.0 Add fields to goals table for AI-generated content
  - [x] 1.1 Create migration `010_goal_shaper_fields.sql`
    - Add `refined_goal_statement text` - AI-refined version of user's goal (max 500 chars)
    - Add `suggested_mentor_questions text[] default '{}'` - Questions for mentor (max 20 items)
    - Add `risks_pitfalls jsonb` - Store structured risk-mitigation pairs: `[{ "risk": string, "mitigation": string }]`
    - Add `ai_shaped_at timestamptz` - Timestamp when AI shaping was completed
    - Add check constraint: `suggested_mentor_questions` array length <= 20
    - Add check constraint: `refined_goal_statement` length <= 500
  - [x] 1.2 Write 4 focused tests for new fields
    - Test refined_goal_statement stores and retrieves correctly (max 500 chars)
    - Test suggested_mentor_questions array stores multiple questions (max 20)
    - Test risks_pitfalls JSONB stores structured risk-mitigation pairs
    - Test ai_shaped_at timestamp updates correctly

---

### AI Agent Layer

#### Task Group 2: Goal Shaper Agent Implementation
**Dependencies:** Task Group 1
**Specialist:** AI Engineer

- [x] 2.0 Implement Goal Shaper Agent core logic
  - [x] 2.1 Create `lib/ai/goal-shaper.ts` following Profile Builder pattern
    - Import dependencies: ChatOpenAI, ChatPromptTemplate, JsonOutputParser, z from zod
    - Define `GoalShapedDataSchema` using Zod matching expected output structure
    - Create system prompt: "You are a coaching assistant that helps people clarify goals into concrete milestones..."
    - Create user prompt template with variables: goal_text, duration_days, challenges, category, description, existing_success_definition
    - Implement `shapeGoal()` function with signature: `shapeGoal(input: GoalShapingInput): Promise<GoalShapedData>`
    - Use `ChatOpenAI` with model `gpt-4o-mini`, temperature 0, structured outputs
    - Use `JsonOutputParser<GoalShapedData>()` for parsing
    - Add timeout handling (30s max)
    - Add error handling for invalid JSON (retry once with stricter prompt)
    - Add error handling for rate limits
  - [x] 2.2 Define Zod schema for agent output (`GoalShapedDataSchema`)
    ```typescript
    {
      refined_goal_statement: z.string().max(500)
      success_definition: z.string().min(1)
      milestones: z.array(z.object({
        title: z.string().max(200),
        description: z.string().max(1000),
        relative_day_offset: z.number().int().min(0).max(60)
      })).min(3).max(7)
      suggested_questions_for_mentor: z.array(z.string()).min(5).max(8)
      risks_or_pitfalls: z.array(z.object({
        risk: z.string(),
        mitigation: z.string()
      }))
    }
    ```
  - [x] 2.3 Define input interface for `shapeGoal()` function
    ```typescript
    interface GoalShapingInput {
      title: string
      duration_days: 30 | 60
      current_challenges?: string
      category?: string
      description?: string
      existing_success_definition?: string
    }
    ```
  - [x] 2.4 Write 6 focused tests for goal shaper agent
    - Test agent expands simple goal into milestones (30-day goal → 3-4 milestones)
    - Test agent expands 60-day goal into 5-7 milestones
    - Test milestones respect time horizon (relative_day_offset within duration)
    - Test agent handles missing challenges gracefully (empty string)
    - Test agent uses category to generate relevant milestones
    - Test agent returns valid JSON matching schema (Zod validation)

---

### API Layer

#### Task Group 3: Goal Shaper API Endpoint
**Dependencies:** Task Group 2
**Specialist:** API Engineer

- [ ] 3.0 Create `/api/ai/goal-shaper` endpoint
  - [ ] 3.1 Create `app/api/ai/goal-shaper/route.ts`
    - POST handler with request body validation using Zod
    - Support two modes:
      - Mode 1: `{ goal_id: string }` - Fetch goal from DB, shape, save results
      - Mode 2: `{ goal_data: {...} }` - Dry-run mode, shape without saving
    - Verify user owns the goal (if goal_id provided) using `requireMentee()` and profile check
    - Fetch goal data from database (if goal_id provided)
    - Call `shapeGoal()` with goal data (handle existing success_definition - use as context only)
    - Calculate target dates: `target_date = goal.created_at + relative_day_offset days`
    - Validate milestone dates are within goal horizon: `target_date <= created_at + duration_days`
    - Use Supabase service client for inserts (bypasses RLS)
    - Insert milestones into `goal_milestones` table (if goal_id provided)
    - Update `goals` table with: refined_goal_statement, success_definition (only if empty), suggested_mentor_questions, risks_pitfalls, ai_shaped_at
    - Return shaped data with created milestones (include milestone IDs if saved)
  - [ ] 3.2 Add comprehensive error handling
    - Handle AI timeout (30s) → Return 504 Gateway Timeout with error message
    - Handle invalid JSON → Retry once with stricter prompt, then return 500
    - Handle rate limits → Return 503 with retry-after header
    - Handle goal not found → Return 404
    - Handle user doesn't own goal → Return 403 Forbidden
    - Handle validation errors → Return 400 with error details
    - Handle concurrent shaping → Prevent multiple simultaneous requests (use status flag or lock)
  - [ ] 3.3 Add input validation schema
    ```typescript
    const GoalShaperRequestSchema = z.union([
      z.object({ goal_id: z.string().uuid() }),
      z.object({ goal_data: z.object({...}) })
    ])
    ```
  - [ ] 3.4 Write 7 focused tests for API endpoint
    - Test POST with goal_id shapes goal and creates milestones in DB
    - Test POST with goal_data shapes without saving (dry-run mode)
    - Test API handles AI timeout gracefully (504 response)
    - Test API validates user owns goal before shaping (403 if not owner)
    - Test API creates correct number of milestones (3-4 for 30 days, 5-7 for 60 days)
    - Test API only populates success_definition if empty (doesn't overwrite)
    - Test API validates milestone dates are within goal horizon

---

### Integration Layer

#### Task Group 4: Goal Creation Integration
**Dependencies:** Task Group 3
**Specialist:** Frontend Engineer

- [ ] 4.0 Integrate Goal Shaper into goal creation flow
  - [ ] 4.1 Add "Shape Goal with AI" button to goal creation wizard
    - Button appears after goal is created (draft or active status)
    - Position: In goal detail page header or action bar
    - Shows loading state during AI processing (spinner + "Shaping your goal...")
    - Disables button during processing to prevent duplicate requests
    - Opens `GoalShapingModal` with results on success
    - Shows error toast on failure with "Create Milestones Manually" option
  - [ ] 4.2 Create `GoalShapingModal` component (`components/goals/goal-shaping-modal.tsx`)
    - Modal dialog with scrollable content
    - Display refined goal statement (editable textarea, max 500 chars)
    - Show generated milestones in timeline/list view:
      - Each milestone: title, description, target date (editable date picker)
      - Allow editing milestone title, description, date
      - Allow deleting milestones
      - Allow adding new milestones manually
    - Display success criteria (editable textarea, only if empty)
    - Show suggested mentor questions (editable list, max 20):
      - Each question editable
      - Allow adding/removing questions
    - Show risks and pitfalls (expandable card):
      - Display risk-mitigation pairs
      - Allow editing risk and mitigation text
      - Allow adding/removing risk items
    - Action buttons:
      - "Accept & Save" - Saves all to database, closes modal
      - "Edit Manually" - Closes modal, allows manual milestone creation
      - "Cancel" - Discards AI-generated content, closes modal
  - [ ] 4.3 Auto-trigger shaping when goal status changes to 'active'
    - Hook into goal status update (in goal detail page or API middleware)
    - Call `/api/ai/goal-shaper` automatically when status changes to 'active'
    - Show toast notification: "AI is shaping your goal..."
    - On success: Open `GoalShapingModal` with shaped results for review
    - On error: Show error toast, allow manual milestone creation
    - Prevent auto-trigger if goal already has `ai_shaped_at` timestamp (don't re-shape)
  - [ ] 4.4 Update goal detail page to show AI-shaped content
    - Display refined goal statement (if available) alongside original title
      - Show as subtitle or in separate section
      - Allow user to toggle between original and refined
    - Show AI-generated milestones in timeline view:
      - Merge with manually created milestones
      - Distinguish AI-generated vs manual (icon or badge)
      - Show target dates and status
    - Display suggested questions in collapsible section:
      - "Suggested Questions for Your Mentor" accordion
      - Show 5-8 questions
      - Allow copying questions to clipboard
    - Display risks and pitfalls in expandable card:
      - "Potential Risks & Mitigation Strategies" card
      - Show risk-mitigation pairs
      - Visual distinction (warning icon, muted colors)
  - [ ] 4.5 Add "Re-shape Goal" functionality
    - Button in goal detail page: "Re-shape with AI"
    - Warns user: "This will replace existing AI-generated milestones. Continue?"
    - Deletes existing AI-generated milestones before re-shaping
    - Calls API and shows review modal
  - [ ] 4.6 Write 5 focused tests for integration
    - Test shaping button triggers API call and shows loading state
    - Test modal displays all shaped data correctly (refined statement, milestones, questions, risks)
    - Test modal allows editing all fields before saving
    - Test auto-shaping triggers on status change to 'active'
    - Test error handling shows fallback to manual creation

---

## Acceptance Criteria

- [ ] Agent successfully expands 90%+ of test goals into valid milestones
- [ ] Milestones are realistic for 30 and 60-day time horizons
- [ ] Success criteria are measurable and specific
- [ ] Suggested questions are relevant and actionable
- [ ] Integration with goal creation is seamless
- [ ] Error handling works for all edge cases
- [ ] All tests pass

## Dependencies

- **Phase 1 Items 1-4:** Profile system and goal creation wizard must be complete
- **Database:** Goals and goal_milestones tables must exist
- **AI Infrastructure:** OpenAI API key configured, LangChain installed

## Estimated Timeline

- Task Group 1 (Database): 2-3 hours
- Task Group 2 (AI Agent): 4-6 hours
- Task Group 3 (API): 3-4 hours
- Task Group 4 (Integration): 4-5 hours
- **Total:** ~15-18 hours (2-3 days)

