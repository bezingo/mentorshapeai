# Mentor Flows

## Overview
Mentors can:
- Create public mentor pages
- Showcase expertise
- Accept collab invitations
- Run mentoring sessions
- Set availability globally
- Charge for consultations
- Sell digital products
- Earn badges and reviews

---

## 1. Mentor Onboarding Flow

### Triggered when:
- User clicks "Become a Mentor"
- Or user tries to start a collab from a mentee's goal link

### Steps:
1. Mentor selects "I want to mentor others"
2. Fills in required onboarding:
   - Bio
   - Areas of expertise
   - Years of experience
   - Skills they can help with
   - Languages
   - Time zone
3. Connects Google or Microsoft Calendar
4. Sets weekly availability template
5. Chooses public handle (for `/m/handle`)
6. Optionally sets up paid consultations:
   - Connect Stripe Express (for payouts)
   - Add pricing, duration, copy

---

## 2. Public Mentor Page

Accessible at: `/m/[handle]`

Includes:
- Avatar, name, role, bio
- Areas of mentorship
- Skills they teach
- Testimonials
- Badges
- Paid consultation links
- Digital products (Notion templates, PDFs)
- Button: "Request Mentorship" → creates collab

---

## 3. Accepting a Collaboration (Collab)

### Path:
- Mentor receives notification → “New Collaboration Request”
- Opens Goal Page
- Reviews:
  - Mentee profile
  - Goal details
  - Timeline (30 or 60 days)
  - Challenges
  - Milestones
- Mentor clicks “Start Collaboration”
- Mentee approves

---

## 4. Running Sessions (Focuses)

### Before Session:
- AI generates agenda:
  - Items to cover
  - Key questions
  - Review of previous actions

### During Session:
- Meeting takes place via:
  - Zoom API
  - Google Meet API
  - Or manual link (MVP)

### After Session:
- Recording is uploaded
- Transcription is generated (via Whisper or Zoom transcript)
- AI summarizes:
  - Action items
  - Key highlights
  - Blockers raised
- Mentor can edit before sharing

---

## 5. Managing Availability

Mentor maintains weekly availability:
- Example:
  - Tue 5–7pm
  - Thu 7–9pm
- System automatically books around busy calendar events
- Mentees can only book sessions in free, available slots

---

## 6. End of Collaboration

At end:
- Mentor leaves final notes
- AI final progress summary
- Mentee rates mentor
- Mentor receives badge if goal completed

---

## 7. Monetization Options for Mentors

### A. Paid Consultations
- Mentor defines:
  - Price
  - Duration
  - Topic specialty

### B. Digital Products
- Upload guides, templates, frameworks
- Connected to Stripe for payout

### C. Organizations
- Mentors can participate in org programs
- Get rated by orgs
- Earn badges for institutional mentoring

