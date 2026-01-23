# Database Schema (Supabase)

## USERS & PROFILES

### users
- id (pk)
- clerk_user_id
- email
- created_at

### profiles
- id (pk)
- user_id (fk)
- display_name
- headline
- bio
- avatar_url
- public_handle
- is_mentor (bool)
- is_mentee (bool)
- created_at
- updated_at
- **Personal Information (migration 004)**
- phone
- date_of_birth (date)
- gender
- nationality
- country
- city
- timezone
- years_of_experience (integer, 0-50)
- completion_percentage (integer, 0-100, auto-calculated)
- **Traits - Text Arrays (migration 005)**
- languages_spoken (text[])
- can_mentor_for (text[])
- want_to_learn (text[])
- specializations (text[])
- hobbies (text[])
- expertise_areas (text[]) - mentor-specific
- languages (text[]) - mentor-specific
- **Section Visibility (migration 006)**
- traits_public (bool, default true)
- work_history_public (bool, default true)
- education_public (bool, default true)
- skills_public (bool, default true)

### work_experiences
- id
- profile_id
- company
- title
- start_date
- end_date
- description
- is_public
- is_current (bool, default false) - added in migration 007
- created_at - added in migration 007
- updated_at - added in migration 007

### educations
- id
- profile_id
- institution
- degree
- start_date
- end_date
- is_public
- is_current (bool, default false) - added in migration 007
- created_at - added in migration 007
- updated_at - added in migration 007

### skills
- id
- profile_id
- name
- level
- is_public

---

## STORAGE BUCKETS

### avatars (migration 009)
- Bucket for user avatar images
- Path pattern: `{profile_id}/avatar.{ext}`
- File size limit: 5MB
- Allowed MIME types: image/jpeg, image/png
- Public read access for avatar display
- RLS policies:
  - Users can upload/update/delete their own avatar
  - Anyone can view avatars (public bucket)

---

## TRIGGERS & FUNCTIONS

### Profile Completion Calculation (migration 008)
- `calculate_profile_completion(profile_id)`: Calculates weighted completion percentage
- Trigger on profiles INSERT/UPDATE: Auto-calculates completion_percentage
- Trigger on work_experiences INSERT/UPDATE/DELETE: Recalculates parent profile
- Trigger on educations INSERT/UPDATE/DELETE: Recalculates parent profile
- Trigger on skills INSERT/UPDATE/DELETE: Recalculates parent profile

**Completion Weights:**
- Avatar (5%): avatar_url IS NOT NULL
- Personal Info (10%): display_name AND headline
- Location (5%): country AND city
- Bio (10%): bio IS NOT NULL
- Date of Birth (5%)
- Gender (5%)
- Nationality (5%)
- Traits (20%): 4% each for languages_spoken, can_mentor_for, want_to_learn, specializations, hobbies
- Work History (15%): At least one work_experience
- Education (10%): At least one education
- Skills (10%): At least one skill

### Updated At Timestamps (migrations 004, 007)
- `update_profiles_updated_at()`: Auto-updates profiles.updated_at on UPDATE
- `update_work_experiences_updated_at()`: Auto-updates work_experiences.updated_at on UPDATE
- `update_educations_updated_at()`: Auto-updates educations.updated_at on UPDATE

---

## GOALS & MILESTONES

### goals
- id
- profile_id (mentee)
- title
- description
- category
- duration_days
- status
- public_slug
- success_definition
- current_challenges
- created_at
- completed_at

### goal_milestones
- id
- goal_id
- title
- description
- target_date
- status

---

## COLLABORATIONS & SESSIONS

### collaborations
- id
- goal_id
- mentor_profile_id
- mentee_profile_id
- status
- start_date
- end_date
- org_id (nullable)

### focus_sessions
- id
- collaboration_id
- start_time
- end_time
- meeting_url
- status
- agenda_ai
- agenda_notes
- created_at

### focus_session_artifacts
- id
- focus_session_id
- recording_url
- transcript_text
- summary_ai
- action_items_ai
- action_items_custom

### checkins
- id
- collaboration_id
- created_by_profile_id
- mood
- progress_note
- blockers
- created_at

---

## MENTOR ECONOMY

### mentor_offers
- id
- mentor_profile_id
- type
- title
- description
- stripe_product_id
- price_cents
- currency
- duration_minutes
- is_active

### mentor_badges
- id
- mentor_profile_id
- type
- label
- metadata
- awarded_at

### ratings
- id
- collaboration_id
- mentor_profile_id
- mentee_profile_id
- score
- feedback

---

## ORGANIZATIONS

### organizations
- id
- name
- type
- domain
- logo_url
- billing_customer_id
- created_at

### org_members
- id
- org_id
- profile_id
- role

### programs
- id
- org_id
- name
- description
- start_date
- end_date
- settings

### program_participants
- id
- program_id
- profile_id
- role

### matches
- id
- program_id
- mentor_profile_id
- mentee_profile_id
- status
- match_score

---

## BILLING

### subscriptions
- id
- user_id or org_id
- stripe_subscription_id
- plan
- status
- renewal_date

### transactions
- id
- buyer_profile_id
- mentor_profile_id
- mentor_offer_id
- stripe_payment_intent_id
- amount_cents
- platform_fee_cents
- status
- created_at
