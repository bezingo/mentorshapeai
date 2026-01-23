
---

# 📄 **erd-diagram.md**

```md
# Mentorshape – ERD Diagram

```mermaid
erDiagram

  USERS {
    uuid id
    text clerk_user_id
    text email
    timestamptz created_at
  }

  PROFILES {
    uuid id
    uuid user_id
    text display_name
    text headline
    text bio
    text avatar_url
    text public_handle
    bool is_mentor
    bool is_mentee
    timestamptz created_at
  }

  WORK_EXPERIENCES {
    uuid id
    uuid profile_id
    text company
    text title
    date start_date
    date end_date
    text description
    bool is_public
  }

  EDUCATIONS {
    uuid id
    uuid profile_id
    text institution
    text degree
    date start_date
    date end_date
    bool is_public
  }

  SKILLS {
    uuid id
    uuid profile_id
    text name
    text level
    bool is_public
  }

  GOALS {
    uuid id
    uuid profile_id
    text title
    text description
    text category
    int duration_days
    text status
    text public_slug
    text success_definition
    text current_challenges
    timestamptz created_at
    timestamptz completed_at
  }

  GOAL_MILESTONES {
    uuid id
    uuid goal_id
    text title
    text description
    date target_date
    text status
  }

  COLLABORATIONS {
    uuid id
    uuid goal_id
    uuid mentor_profile_id
    uuid mentee_profile_id
    text status
    date start_date
    date end_date
    uuid org_id
  }

  FOCUS_SESSIONS {
    uuid id
    uuid collaboration_id
    timestamptz start_time
    timestamptz end_time
    text meeting_url
    text status
    jsonb agenda_ai
    text agenda_notes
    timestamptz created_at
  }

  FOCUS_SESSION_ARTIFACTS {
    uuid id
    uuid focus_session_id
    text recording_url
    text transcript_text
    text summary_ai
    jsonb action_items_ai
    text action_items_custom
  }

  CHECKINS {
    uuid id
    uuid collaboration_id
    uuid created_by_profile_id
    int mood
    text progress_note
    text blockers
    timestamptz created_at
  }

  MENTOR_OFFERS {
    uuid id
    uuid mentor_profile_id
    text type
    text title
    text description
    text stripe_product_id
    int price_cents
    text currency
    int duration_minutes
    bool is_active
  }

  MENTOR_BADGES {
    uuid id
    uuid mentor_profile_id
    text type
    text label
    jsonb metadata
    timestamptz awarded_at
  }

  RATINGS {
    uuid id
    uuid collaboration_id
    uuid mentor_profile_id
    uuid mentee_profile_id
    int score
    text feedback
  }

  ORGANIZATIONS {
    uuid id
    text name
    text type
    text domain
    text logo_url
    text billing_customer_id
    timestamptz created_at
  }

  ORG_MEMBERS {
    uuid id
    uuid org_id
    uuid profile_id
    text role
  }

  PROGRAMS {
    uuid id
    uuid org_id
    text name
    text description
    date start_date
    date end_date
    jsonb settings
  }

  PROGRAM_PARTICIPANTS {
    uuid id
    uuid program_id
    uuid profile_id
    text role
  }

  MATCHES {
    uuid id
    uuid program_id
    uuid mentor_profile_id
    uuid mentee_profile_id
    text status
    float match_score
  }

  SUBSCRIPTIONS {
    uuid id
    uuid user_id
    uuid org_id
    text stripe_subscription_id
    text plan
    text status
    date renewal_date
  }

  TRANSACTIONS {
    uuid id
    uuid buyer_profile_id
    uuid mentor_profile_id
    uuid mentor_offer_id
    text stripe_payment_intent_id
    int amount_cents
    int platform_fee_cents
    text status
    timestamptz created_at
  }

  USERS ||--o| PROFILES : "1-to-1"
  PROFILES ||--o{ WORK_EXPERIENCES : has
  PROFILES ||--o{ EDUCATIONS : has
  PROFILES ||--o{ SKILLS : has
  PROFILES ||--o{ GOALS : "mentee goals"
  GOALS ||--o{ GOAL_MILESTONES : has

  GOALS ||--o{ COLLABORATIONS : "spawn"
  PROFILES ||--o{ COLLABORATIONS : "mentor side" : mentor_profile_id
  PROFILES ||--o{ COLLABORATIONS : "mentee side" : mentee_profile_id

  COLLABORATIONS ||--o{ FOCUS_SESSIONS : has
  FOCUS_SESSIONS ||--o{ FOCUS_SESSION_ARTIFACTS : has
  COLLABORATIONS ||--o{ CHECKINS : has

  PROFILES ||--o{ MENTOR_OFFERS : offers
  PROFILES ||--o{ MENTOR_BADGES : badges
  COLLABORATIONS ||--o{ RATINGS : ratings

  ORGANIZATIONS ||--o{ ORG_MEMBERS : has
  ORGANIZATIONS ||--o{ PROGRAMS : has

  PROGRAMS ||--o{ PROGRAM_PARTICIPANTS : has
  PROGRAMS ||--o{ MATCHES : has

  PROFILES ||--o{ ORG_MEMBERS : memberOf
  PROFILES ||--o{ PROGRAM_PARTICIPANTS : participantOf

  USERS ||--o{ SUBSCRIPTIONS : userSubs
  ORGANIZATIONS ||--o{ SUBSCRIPTIONS : orgSubs

  PROFILES ||--o{ TRANSACTIONS : buyer
  PROFILES ||--o{ TRANSACTIONS : mentor
  MENTOR_OFFERS ||--o{ TRANSACTIONS : soldAs
