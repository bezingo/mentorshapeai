# Mentor & Mentee User Toggling

## Why Toggling Is Needed
Users can both learn (mentee role) and teach (mentor role).  
The platform must allow switching contexts seamlessly.

---

## System Design

### Every user has:
- One account
- One profile
- Two role capabilities:
  - `is_mentee = true` (default)
  - `is_mentor = false` (can be enabled anytime)

---

## UI Design

At the top of dashboard:

[ Mentor Mode ] | [ Mentee Mode ]


### When in Mentee Mode:
- Show: My Goals, My Collaborations, Create Goal
- Hide: Mentor earnings, mentor availability, mentor products

### When in Mentor Mode:
- Show: Incoming collab requests, availability, offerings
- Hide: Goal creation views

---

## Role Activation

### Becoming a Mentor:
User clicks “Become a Mentor”
Steps:
1. Fill mentor profile
2. Add expertise
3. Connect calendar
4. Set availability
5. Publish mentor link `/m/handle`

### Stopping Mentoring:
User can disable mentor mode, hiding mentor page & offers.

---

## DB Logic

In `profiles` table:

is_mentee BOOLEAN DEFAULT true
is_mentor BOOLEAN DEFAULT false


In `collaborations`:

mentor_profile_id
mentee_profile_id


Even if same user appears as mentor and mentee in different collabs, it never conflicts.

---

## Edge Cases

### If user tries to start collab as mentor but mentor mode is off:
→ Prompt: “Activate Mentor Mode to start mentoring.”

### If user is both mentor and mentee in org programs:
→ Allowed, roles stored per-program.

