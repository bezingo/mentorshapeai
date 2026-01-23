# AI Agents

## Overview
Mentorshape uses a graph of specialized AI agents to automate the mentoring lifecycle.  
Built using LangChain, LangGraph, and LangSmith.

---

# 1. Profile Builder Agent

### Inputs:
- LinkedIn URL (firecrawl)
- CV text / PDF

### Tasks:
- Scrape & parse profile
- Identify:
  - Work experiences
  - Education
  - Skills
  - Certifications
- Output:
  - Structured JSON
  - High-confidence flags
- Writes data to Supabase

---

# 2. Goal Shaper Agent

### Inputs:
- User-written goal
- Challenges, time horizon

### Outputs:
- Clean goal statement
- Success criteria
- Obstacles & mitigation
- Milestones (with dates)
- Key questions for mentors

**Note:** The Goal Shaper can be used as a one-shot transformation tool or accessed via the Goal Advisor conversational interface.

---

# 2.5. Goal Advisor Agent (Conversational)

### Overview:
Interactive AI mentor that provides real-time guidance through a chat interface. Combines the Goal Shaper with additional tools for comprehensive goal management.

### Location:
- Side drawer on goal detail pages
- Floating "AI Advisor" button (bottom-right)

### Features:
1. **Conversational Refinement**
   - Ask questions about the goal
   - Get mentor-like feedback and guidance
   - Iterative goal improvement

2. **File & Link Attachments**
   - Upload PDFs, documents, images
   - Paste URLs for context
   - AI extracts and uses content in responses

3. **Integrated Tools:**
   - `refineGoal`: Improve specific aspects (milestones, criteria, etc.)
   - `analyzeGoal`: Run SWOT or SMART analysis
   - `bookCalendar`: Schedule meetings via Pipedream
   - `exportToNotion`: Export goal to Notion workspace
   - `exportToGoogleDocs`: Export to Google Docs
   - `searchMemory`: Search attached files/links
   - `findMentors`: Match with mentors (coming soon)

4. **Persistent Conversations**
   - Conversations saved to database
   - Resume across sessions
   - Full history maintained

5. **Context-Aware**
   - Knows goal details and milestones
   - References attached resources
   - Aware of collaboration status

### Tech Stack:
- **Frontend:** Vercel AI SDK (streaming chat)
- **Backend:** OpenAI GPT-4o-mini + LangChain tools
- **Database:** Supabase (conversations, messages, memory)
- **Integrations:** Pipedream, Notion API, Google Docs API

### API Endpoint:
`POST /api/ai/goal-advisor`
- Streams responses using AI SDK
- Handles tool calls dynamically
- Persists messages automatically

---

# 3. Session Planner Agent

### Trigger:
- When a session is booked

### Inputs:
- Goal summary
- Milestones
- Previous session summaries

### Outputs:
- Bullet agenda
- Questions to ask
- Expectations for the mentee
- Reading/prep suggestions

---

# 4. Transcript Summarizer Agent

### Inputs:
- Meeting transcript
- Agenda

### Outputs:
- Summary
- Key decisions
- Action items for mentee & mentor
- Updated milestone statuses

---

# 5. Progress Tracker Agent

### Runs weekly.

### Inputs:
- Milestone statuses
- Completed sessions
- Check-ins
- Action items

### Outputs:
- Progress score (0–100)
- Stalled areas
- Predictions of completion risk
- Nudges for mentee/mentor

---

# 6. Matching Agent (Org-Level)

### Inputs:
- Mentor embeddings
- Mentee embeddings
- Skills, interests, goals
- Alumni or industry overlaps

### Outputs:
- Ranked match list
- Match score
- Explanation of match
- Suggestions for alternates

---

# 7. Mentor Productivity Agent (Future)

### Will generate:
- Templates for mentors
- Personalized coaching frameworks
- “What to teach next” recommendations
- Structured feedback summaries

---

# 8. Completion Agent

### When goal is marked complete:
- Reviews all sessions
- Summarizes user journey
- Creates final performance report
- Generates shareable LinkedIn post

