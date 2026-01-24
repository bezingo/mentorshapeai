# Product Roadmap

## Phase 1: Core Mentee Experience

Build the foundation for mentees to create profiles, set goals, and share them publicly.

1. [x] **User Profile System** — Complete profile management with avatar upload, bio, skills, work history, and education fields stored in Supabase with public/private visibility toggles `M`

2. [x] **LinkedIn Profile Import** — Integration with Firecrawl to scrape LinkedIn URLs and auto-populate profile fields using the Profile Builder AI agent `M`

3. [x] **CV Upload & Parsing** — Allow users to upload CV/resume (PDF/text) as alternative to LinkedIn, with AI parsing to extract work history, education, and skills `S`

4. [x] **Goal Creation Wizard** — Multi-step form for creating goals with name, category (Career, Startup, Fitness, Learning, Personal Growth), time horizon (30/60 days), desired outcome, blockers, and mentor expectations `S`

5. [x] **AI Goal Shaper Agent** — LangChain agent that expands user goals into structured milestones, success criteria, SWOT/SMART analysis, risks & mitigations, and suggested mentor questions `M`

6. [x] **Goal Advisor Chat** — Conversational AI chat interface for ongoing goal refinement with streaming responses, tool integration (refine goal, SWOT, SMART, export to Notion/Google Docs), file/link attachments, and persistent conversation history `M`

7. [x] **Goal Version History** — Automatic versioning system that tracks goal evolution over time, with timeline UI, diff view, change source tracking (user/AI), and restore functionality `S`

8. [x] **Public Goal Pages** — Shareable goal pages at `/g/[slug]` displaying mentee info, goal details, milestones, timeline, challenges, and a "Start Collaboration" CTA for mentors `S`

## Phase 2: Mentor Onboarding & Profiles

Enable mentors to create public profiles and showcase their expertise.

9. [x] **Mentor Onboarding Flow** — Wizard for becoming a mentor including bio, expertise areas, skills, languages, timezone, years of experience, and public handle selection at `/m/[handle]` `S`

10. [x] **Public Mentor Profiles** — Linktree-style pages at `/m/[handle]` showcasing mentor info, expertise, skills, testimonials, badges, consultation offerings, digital products, and "Request Mentorship" button `M`

11. [x] **Calendar Integration** — Connect Google Calendar and Microsoft Outlook APIs to sync availability and automatically block busy time slots `L`

12. [x] **Mentor Availability Management** — Weekly availability template with day/time slots that respects calendar busy times for session booking `M`

## Phase 3: Collaboration & Focuses

Enable mentor-mentee collaboration lifecycle and structured focus sessions.

13. [ ] **Collaboration Lifecycle** — Complete collab flow from request to acceptance, including notifications, status tracking (pending/active/completed), and both-party approval `M`

14. [ ] **Focus Booking System** — Mentees select available time slots from mentor calendar, creating calendar events and focus session records in database `M`

15. [ ] **AI Focus Planner Agent** — Pre-focus AI agent generating agendas with topics to cover, questions to ask, review of previous actions, and preparation suggestions based on goal and previous focuses `M`

16. [ ] **Video Meeting Integration** — Zoom API integration for creating meetings, fetching recordings, and extracting transcripts (Google Meet as alternative via Calendar) `L`

17. [ ] **AI Transcript Summarizer Agent** — Post-focus agent that processes transcripts to generate summaries, key decisions, action items for mentee & mentor, and milestone status updates `M`

18. [ ] **Milestone Progress Tracking** — Visual dashboard showing milestone completion, focus timeline, action items, blockers, and weekly check-ins (mood, progress notes) for mentees `M`

19. [ ] **AI Progress Tracker Agent** — Weekly agent that scores progress (0-100), identifies stalled areas, predicts completion risk, and sends nudges to mentee/mentor `M`

20. [ ] **Goal Completion Flow** — Mark goal complete, trigger AI Completion Agent for final summary, award mentor badge, generate shareable LinkedIn achievement post, allow mentee reflection `S`

## Phase 4: Monetization

Enable mentors to earn through consultations and digital products.

21. [ ] **Clerk Billing Integration** — Mentee subscription plans (Free/Pro) using Clerk Billing with `<PricingTable />` component, automatic subscription sync, and `has({ plan: 'pro' })` feature gating `L`

22. [ ] **Mentor Stripe Connect Onboarding** — Onboard mentors to Stripe Express accounts for receiving payouts, with `charges_enabled` and `payouts_enabled` verification via webhooks `M`

23. [ ] **Paid Consultations** — Mentors define consultation packages (type, title, description, price, duration, topic) with Stripe Payment Intents, 10-15% platform fee, and automatic session confirmation `M`

24. [ ] **Digital Products Marketplace** — Mentors upload and sell guides, templates, PDFs, courses with Supabase Storage and Stripe payment processing, RLS-protected download access `L`

25. [ ] **Mentor Ratings & Reviews** — End-of-collaboration rating system where mentees rate mentors, with feedback stored and displayed on mentor profiles `S`

## Phase 5: Organization Features

Enable universities, companies, and institutions to run structured mentorship programs.

26. [ ] **Organization Onboarding** — Org admin signup, organization creation with name, type (school/university/company), logo, domain, and billing setup `S`

27. [ ] **Program Management** — Create mentorship programs with name, description, start/end dates, mentor-to-mentee ratio, goal templates, max mentees per mentor, and optional structured tracks `M`

28. [ ] **Bulk Participant Import** — CSV upload, manual entry, and domain-based auto-enroll for adding mentors/mentees to programs with per-program role assignment `S`

29. [ ] **AI Matching Agent** — Organization-level matching using embeddings of mentor/mentee profiles (skills, interests, goals, alumni data) to generate ranked matches with scores and explanations `L`

30. [ ] **Organization Dashboards** — Admin dashboards showing active collaborations, session counts, goal completion rates, mentor performance, mentee progress, drop-off rates, and engagement timeline `M`

31. [ ] **Organization Billing** — Clerk Billing for org plans (Starter: 100 mentees, Pro: 500 mentees, Enterprise: unlimited) with add-ons like custom domain, SSO, and enhanced reporting `M`

## Phase 6: Notifications & Polish

Complete the user experience with notifications and mobile responsiveness.

32. [ ] **Email Notifications** — Resend integration for transactional emails: collab requests, session reminders, agenda delivery, summary delivery, progress updates, goal completions, and payout confirmations `M`

33. [ ] **In-App Notifications** — Real-time notification system for collaboration events, session updates, action item reminders, and check-in prompts `S`

34. [ ] **Mobile-Responsive Polish** — Ensure all core flows (goal creation, session booking, mentor profiles, dashboards) work seamlessly on mobile devices `M`

---

## Size Legend

- `XS` — A few hours of work
- `S` — Less than a day
- `M` — 1-3 days
- `L` — 3-5 days
- `XL` — More than a week

## Dependency Notes

- **Phase 1 (Items 1-8):** Unlocks core mentee experience — profiles, goals, AI advisor, public pages
- **Phase 2 (Items 9-12):** Unlocks mentor experience — profiles, availability, calendar
- **Phase 3 (Items 13-20):** Enables collaboration — requires Phase 1 & 2 complete
- **Phase 4 (Items 21-25):** Enables monetization — requires Phase 2 & 3 for context
- **Phase 5 (Items 26-31):** Organization features — can be built in parallel with Phase 4
- **Phase 6 (Items 32-34):** Polish layer — can be incrementally added throughout

## AI Agent Dependencies

The following AI agents are required for specific roadmap items:

| Agent | Required For | Inputs | Outputs |
|-------|-------------|--------|---------|
| Profile Builder | Item 2, 3 | LinkedIn URL, CV text | Structured JSON profile |
| Goal Shaper | Item 5 | User goal, challenges, time horizon | Milestones, success criteria, SWOT/SMART analysis |
| Goal Advisor | Item 6 | Conversation history, goal context, attachments | Streaming responses, tool calls, refined goals |
| Focus Planner | Item 15 | Goal summary, milestones, previous focuses | Agenda, questions, prep suggestions |
| Transcript Summarizer | Item 17 | Meeting transcript, agenda | Summary, action items, milestone updates |
| Progress Tracker | Item 19 | Milestones, focuses, check-ins | Progress score, risk predictions, nudges |
| Matching Agent | Item 29 | Mentor/mentee embeddings, skills, goals | Ranked matches with explanations |
| Completion Agent | Item 20 | All focuses, goal data | Final summary, LinkedIn post |
