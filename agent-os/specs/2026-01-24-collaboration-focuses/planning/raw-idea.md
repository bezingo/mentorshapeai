# Phase 3: Collaboration & Focuses

Enable mentor-mentee collaboration lifecycle and structured focuses.

## Roadmap Items

### 13. Collaboration Lifecycle `M`
Complete collab flow from request to acceptance, including notifications, status tracking (pending/active/completed), and both-party approval.

### 14. Focus Booking System `M`
Mentees select available time slots from mentor calendar, creating calendar events and focus focus records in database.

### 15. AI Focus Planner Agent `M`
Pre-focus AI agent generating agendas with topics to cover, questions to ask, review of previous actions, and preparation suggestions based on goal and previous focuses.

### 16. Video Meeting Integration `L`
Zoom API integration for creating meetings, fetching recordings, and extracting transcripts (Google Meet as alternative via Calendar).

### 17. AI Transcript Summarizer Agent `M`
Post-focus agent that processes transcripts to generate summaries, key decisions, action items for mentee & mentor, and milestone status updates.

### 18. Milestone Progress Tracking `M`
Visual dashboard showing milestone completion, focus timeline, action items, blockers, and weekly check-ins (mood, progress notes) for mentees.

### 19. AI Progress Tracker Agent `M`
Weekly agent that scores progress (0-100), identifies stalled areas, predicts completion risk, and sends nudges to mentee/mentor.

### 20. Goal Completion Flow `S`
Mark goal complete, trigger AI Completion Agent for final summary, award mentor badge, generate shareable LinkedIn achievement post, allow mentee reflection.

## Dependencies

- Requires Phase 1 complete (Goal system, AI Goal Advisor)
- Requires Phase 2 complete (Mentor profiles, availability, calendar integration)

## Existing Infrastructure

### Database Tables (already exist)
- `profiles` - User profiles with mentor/mentee info
- `goals` - Mentee goals with milestones
- `mentor_offers` - Mentor consultation offerings
- `mentor_availability` - Weekly availability patterns
- `calendar_busy_blocks` - Synced calendar busy times
- `goal_conversations` - AI chat history

### APIs (already exist)
- `/api/mentor/availability/slots` - Get available booking slots
- `/api/public/mentor/[handle]` - Public mentor profile
- `/api/goals/[id]` - Goal CRUD

## Key Considerations

1. **Collaboration States**: pending → accepted → active → completed/cancelled
2. **Focus Types**: Focus focuses (scheduled), async check-ins
3. **Calendar Events**: Create events in both mentor and mentee calendars
4. **AI Agents**: Focus Planner, Transcript Summarizer, Progress Tracker, Completion Agent
5. **Video Integration**: Start with Zoom, consider Google Meet alternative
6. **Progress Metrics**: Track milestone completion, focus attendance, action item completion
