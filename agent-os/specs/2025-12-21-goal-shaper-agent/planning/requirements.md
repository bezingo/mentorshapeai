# Spec Requirements: AI Goal Shaper Agent

## Initial Description

Create an AI agent that expands user-written goals into structured milestones, success criteria, weekly breakdowns, and suggested mentor questions. This agent transforms vague aspirations into actionable, time-bound plans that power the mentoring platform.

## Requirements Discussion

### Context from Roadmap

**Roadmap Item 5:** AI Goal Shaper Agent — LangChain agent that expands user goals into structured milestones, success criteria, weekly breakdown, and suggested mentor questions.

**Dependencies:**
- Item 1: User Profile System ✅ Complete
- Item 2: LinkedIn Profile Import ✅ Complete  
- Item 3: CV Upload & Parsing ✅ Complete
- Item 4: Goal Creation Wizard ✅ Complete
- Item 6: Public Goal Pages ✅ Complete

### First Round Questions

**Q1:** Should the agent be triggered automatically when a goal is created (status='active'), or should it be manually triggered via a button in the UI?
**Answer:** Both - Auto-trigger when status changes to 'active', but also allow manual triggering for draft goals or re-shaping.

**Q2:** For milestones, should we generate a fixed number (e.g., 4-6 milestones) or vary based on the time horizon (30 days = 3-4 milestones, 60 days = 5-7 milestones)?
**Answer:** Vary based on time horizon - approximately one milestone per week for 30-day goals, and 5-7 milestones for 60-day goals.

**Q3:** Should the agent update the goal's existing `success_definition` field if the user already provided one, or only populate it if empty?
**Answer:** Only populate if empty. If user provided one, use it as context but don't overwrite.

**Q4:** For suggested mentor questions, how many should we generate? Should they be categorized (e.g., by milestone or topic)?
**Answer:** Generate 5-8 questions, categorized by milestone or key topic areas.

**Q5:** Should risks and pitfalls be stored as simple text array or structured JSON with risk + mitigation pairs?
**Answer:** Structured JSON with risk + mitigation pairs for better display and actionability.

**Q6:** What should happen if the AI agent fails (timeout, rate limit, invalid response)? Should we allow manual milestone creation as fallback?
**Answer:** Yes, always allow manual milestone creation. On AI failure, show error message and provide "Create Milestones Manually" option.

**Q7:** Should the agent consider the goal category (Career, Startup, Fitness, etc.) when generating milestones, or treat all goals generically?
**Answer:** Yes, use category to provide more relevant milestones and questions. Different categories may have different milestone patterns.

### Existing Code to Reference

**Profile Builder Agent Pattern:**
- `lib/ai/profile-builder.ts` - Shows LangChain + OpenAI structured outputs pattern
- Uses `ChatOpenAI` with `gpt-4o-mini` model
- Uses `JsonOutputParser` and Zod schema validation
- Error handling pattern for timeouts and invalid JSON

**Goal Creation Flow:**
- `app/api/goals/route.ts` - Goal creation endpoint
- `app/dashboard/mentee/goals/new/page.tsx` - Goal creation wizard
- Database schema: `goals` and `goal_milestones` tables

**AI Prompts Documentation:**
- `docs/ai-prompts.md` - Contains Goal Shaper Agent prompt template
- System prompt: "You are a coaching assistant that helps people clarify goals..."
- User prompt template with variables: goal_text, duration_days, challenges

### Follow-up Questions

**Q8:** Should milestones be automatically created in the database, or should users review and approve them first?
**Answer:** Create them automatically but allow editing/deletion. Show a review modal after shaping where users can accept, edit, or reject milestones.

**Q9:** Should the agent generate a weekly breakdown as a separate output, or is that implicit in the milestones?
**Answer:** Weekly breakdown can be implicit in milestones (one milestone per week), but we can add a `weekly_breakdown` field for more detailed week-by-week plans if needed.

**Q10:** For the refined goal statement, should this replace the original title, or be stored separately?
**Answer:** Store separately as `refined_goal_statement`. Keep original title unchanged. User can choose to use refined version or keep original.

## Visual Assets

No visual assets provided. This is a backend AI agent with API integration. UI components will be added in the integration phase (Task Group 4).

## Technical Constraints

- Must use LangChain for consistency with Profile Builder agent
- Must use OpenAI (gpt-4o-mini) for structured outputs
- Must handle rate limits and timeouts gracefully
- Must validate all outputs with Zod schemas
- Must integrate with existing `goals` and `goal_milestones` tables

## Success Metrics

- 90%+ of goals successfully expanded into valid milestones
- Milestones are realistic for time horizon (not too aggressive or too easy)
- Success criteria are measurable and specific (not vague)
- Suggested questions are relevant and actionable
- Average processing time < 10 seconds
- Error rate < 5%

## Out of Scope

- Real-time streaming of AI responses (will be synchronous)
- Multi-language support (English only for now)
- Custom milestone templates per category (will be AI-generated)
- Historical goal analysis (future feature)


