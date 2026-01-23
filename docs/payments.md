# Payments & Billing Integration

## Overview

Mentorshape uses:
- **Clerk Billing**: User and organization subscriptions ([Clerk Billing Documentation](https://clerk.com/billing))
- **Stripe Connect**: Mentor payouts for consultations and digital products

**Why Clerk Billing?** Clerk Billing eliminates the need for custom Stripe integration code, webhooks, and UI work. It automatically syncs subscription status and provides built-in components for pricing pages and subscription management.

---

## Clerk Billing (Subscriptions)

### Overview

Clerk Billing provides instant, zero-integration SaaS billing. Simply define plans in Clerk's dashboard, use the `<PricingTable />` component, and let customers manage subscriptions through Clerk's profile components.

**Benefits:**
- No payment integration code to write
- No UI work required
- No webhooks to handle
- Automatic subscription status sync
- Built-in billing-aware authorization

### Mentee Subscriptions

**Plans:**
- **Free**: 1 active goal, 1 active collaboration, limited AI features
- **Pro**: Multiple goals, unlimited collaborations, unlimited AI features

**Setup:**

1. **Define plans in Clerk Dashboard:**
   - Go to Clerk Dashboard → Billing
   - Create "Free" and "Pro" plans
   - Set pricing, features, and limits

2. **Connect Stripe account:**
   - Clerk automatically handles Stripe integration
   - No need to manage Stripe Checkout Sessions manually

3. **Use Clerk's PricingTable component:**
   ```typescript
   import { PricingTable } from '@clerk/nextjs'
   
   export default function PricingPage() {
     return <PricingTable />
   }
   ```

4. **Gate features using Clerk's authorization:**
   ```typescript
   import { auth } from '@clerk/nextjs/server'
   
   export default async function ProFeature() {
     const { has } = await auth()
     const hasProPlan = has({ plan: 'pro' })
     
     if (!hasProPlan) {
       return <div>Upgrade to Pro to access this feature</div>
     }
     
     return <div>Pro feature content</div>
   }
   ```

**Subscription Flow:**

1. User visits `/pricing` page (Clerk's `<PricingTable />` component)
2. User selects plan and subscribes directly through Clerk's UI
3. Clerk handles payment processing via Stripe
4. Clerk automatically syncs subscription status to user data
5. Use `has({ plan: 'pro' })` to gate features

**No Custom Code Needed:**
- No API endpoints for subscription creation
- No webhook handlers for subscription events
- No manual subscription status syncing
- Clerk handles everything automatically

### Organization Subscriptions

**Plans:**
- **Starter**: 100 mentees ($X/month)
- **Pro**: 500 mentees ($Y/month)
- **Enterprise**: Unlimited mentees ($Z/month, custom pricing)

**Setup:**

1. **Define org plans in Clerk Dashboard:**
   - Create organization-level subscription plans
   - Set pricing and feature limits

2. **Organizations subscribe via Clerk:**
   - Use Clerk's organization billing components
   - Clerk handles subscription management automatically

3. **Gate features using organization context:**
   ```typescript
   import { auth } from '@clerk/nextjs/server'
   
   export default async function OrgFeature() {
     const { orgId, has } = await auth()
     
     if (orgId) {
       const hasOrgPlan = has({ plan: 'starter', organizationId: orgId })
       // Gate features based on org plan
     }
   }
   ```

**Billing Management:**

- Org admins manage subscriptions through Clerk's built-in profile components
- No custom billing portal needed
- Clerk syncs subscription status automatically

---

## Stripe Connect (Mentor Payouts)

### Overview

Mentors use Stripe Connect Express accounts to receive payouts for:
- Paid consultations
- Digital product sales

Platform takes 10-15% platform fee on each transaction.

### Mentor Onboarding Flow

1. **Mentor enables paid consultations:**
   - Clicks "Enable Paid Consultations" in mentor dashboard
   - Redirected to Stripe Connect onboarding

2. **Stripe Connect Express Onboarding:**
   ```
   POST /api/mentor/connect/onboard
   ```
   - Creates Stripe Connect account (if not exists)
   - Returns onboarding link
   - Mentor completes Stripe onboarding (bank details, identity verification)

3. **Onboarding Complete:**
   - Stripe webhook: `account.updated`
   - Backend checks `charges_enabled` and `payouts_enabled`
   - If both true: Mentor can create paid offers

### Creating Paid Offers

**Endpoint:**
```
POST /api/mentor/offers
```

**Request Body:**
```json
{
  "type": "paid_consult",
  "title": "1:1 PM Career Coaching - 60 min",
  "description": "Get personalized career advice...",
  "price_cents": 15000,
  "currency": "usd",
  "duration_minutes": 60
}
```

**Backend Process:**
1. Validate mentor has Stripe Connect account
2. Create Stripe Product
3. Create Stripe Price
4. Store `stripe_product_id` in `mentor_offers` table
5. Return offer details

### Booking Paid Consultation

**Flow:**

1. Mentee books session with paid consultation offer
2. Frontend calls `POST /api/sessions` with `mentor_offer_id`
3. Backend creates Stripe Payment Intent:
   ```typescript
   const paymentIntent = await stripe.paymentIntents.create({
     amount: offer.price_cents,
     currency: offer.currency,
     application_fee_amount: Math.round(offer.price_cents * 0.10), // 10% platform fee
     transfer_data: {
       destination: mentor.stripe_connect_account_id
     },
     metadata: {
       mentor_offer_id: offer.id,
       collaboration_id: collab.id,
       session_id: session.id
     }
   });
   ```
4. Frontend uses Stripe Elements to collect payment
5. After payment: Webhook `payment_intent.succeeded`
6. Backend creates `transactions` record
7. Session is confirmed

### Digital Products

**Flow:**

1. Mentor uploads digital product (PDF, Notion template, etc.)
2. Creates offer with `type: "digital_product"`
3. Mentee purchases product
4. Payment processed via Stripe Connect
5. Download link sent to mentee
6. File stored in Supabase Storage

**File Storage:**
- Bucket: `digital-products`
- Path: `{mentor_profile_id}/{offer_id}/{filename}`
- RLS: Only buyer can access

---

## Stripe Webhook Events

### Webhook Endpoint

```
POST /api/webhook/stripe
```

**Security:**
- Verify webhook signature using `STRIPE_WEBHOOK_SECRET`
- Check event idempotency (prevent duplicate processing)

### Clerk Billing Integration

**No Webhooks Needed:** Clerk Billing automatically syncs subscription status. Access subscription data directly from Clerk's user/organization objects.

**Accessing Subscription Data:**

```typescript
import { auth, clerkClient } from '@clerk/nextjs/server'

export default async function Page() {
  const { userId, orgId } = await auth()
  
  // For user subscriptions
  const user = await clerkClient.users.getUser(userId)
  // Subscription status is automatically available via Clerk's has() helper
  const hasProPlan = await auth().then(({ has }) => has({ plan: 'pro' }))
  
  // For org subscriptions
  if (orgId) {
    const org = await clerkClient.organizations.getOrganization({ organizationId: orgId })
    const hasOrgPlan = await auth().then(({ has }) => 
      has({ plan: 'starter', organizationId: orgId })
    )
  }
}
```

**Feature Gating:**

```typescript
import { Protect } from '@clerk/nextjs'

export default function ProFeature() {
  return (
    <Protect
      plan="pro"
      fallback={<div>Upgrade to Pro to access this feature</div>}
    >
      <div>Pro feature content</div>
    </Protect>
  )
}
```

**Note:** Clerk Billing handles subscription lifecycle automatically. No need to manually sync subscription status or handle webhooks for subscription events. Clerk's `has()` helper and `<Protect />` component handle all authorization checks.

#### `payment_intent.succeeded`

**Trigger:** Payment for consultation/product successful

**Processing:**
1. Extract metadata (`mentor_offer_id`, `session_id`, etc.)
2. Create `transactions` record:
   ```typescript
   await createTransaction({
     buyer_profile_id: buyerId,
     mentor_profile_id: mentorId,
     mentor_offer_id: offerId,
     stripe_payment_intent_id: paymentIntent.id,
     amount_cents: paymentIntent.amount,
     platform_fee_cents: paymentIntent.application_fee_amount,
     status: 'succeeded'
   });
   ```
3. Confirm session (if consultation)
4. Send download link (if digital product)
5. Send receipt email

#### `payment_intent.payment_failed`

**Trigger:** Payment failed

**Processing:**
1. Create `transactions` record with `status = 'failed'`
2. Do not create/confirm session
3. Send payment failed email
4. Allow retry

#### `charge.refunded`

**Trigger:** Refund processed

**Processing:**
1. Update `transactions.status = 'refunded'`
2. Cancel session (if consultation)
3. Revoke download access (if digital product)
4. Send refund confirmation email
5. Update mentor payout (deduct from next payout)

#### `account.updated` (Stripe Connect)

**Trigger:** Mentor's Stripe Connect account updated

**Processing:**
1. Check `charges_enabled` and `payouts_enabled`
2. Update mentor's account status
3. If enabled: Allow mentor to create paid offers
4. If disabled: Notify mentor to complete onboarding

#### `payout.paid`

**Trigger:** Mentor payout successful

**Processing:**
1. Log payout in `mentor_payouts` table (if exists)
2. Send payout confirmation email
3. Include payout details (amount, period)

#### `payout.failed`

**Trigger:** Mentor payout failed

**Processing:**
1. Log payout failure
2. Notry payout automatically (3 attempts)
3. Notify mentor to update bank details
4. Hold funds until resolved

---

## Payout Schedule

### Platform Fee

- **Default**: 10% of transaction amount
- **Variable**: Can be 15% for certain offer types or org programs
- Stored in `platform_fee_cents` for each transaction

### Payout Timing

- **Standard**: Payouts processed daily
- **Schedule**: Funds available 2 business days after transaction
- **Minimum**: $10 minimum payout (smaller amounts accumulate)

### Payout Calculation

```typescript
const mentorAmount = transaction.amount_cents - transaction.platform_fee_cents;
// Example: $100 transaction, 10% fee = $90 to mentor
```

### Payout Process

1. Daily job queries completed transactions
2. Groups by mentor and date range
3. Creates Stripe Transfer to mentor's Connect account
4. Updates transaction records with payout reference
5. Sends payout notification email

---

## Refund Policy

### Consultation Refunds

- **Full refund**: Session cancelled > 24h before start
- **50% refund**: Session cancelled < 24h before start
- **No refund**: Session completed (unless exceptional circumstances)

### Digital Product Refunds

- **No refunds**: Digital products are non-refundable
- **Exception**: Technical issues (file corrupted, download failed)
- **Process**: Manual review by support team

### Refund Processing

**Endpoint:**
```
POST /api/transactions/[transactionId]/refund
```

**Authorization:** Admin or mentor (for their own transactions)

**Request Body:**
```json
{
  "reason": "Session cancelled by mentee",
  "refund_amount_cents": 15000, // Optional: partial refund
  "refund_application_fee": true // Refund platform fee?
}
```

**Backend Process:**
1. Validate refund eligibility
2. Create Stripe Refund:
   ```typescript
   const refund = await stripe.refunds.create({
     payment_intent: transaction.stripe_payment_intent_id,
     amount: refundAmountCents,
     reverse_transfer: true, // Reverse transfer to mentor
     refund_application_fee: refundApplicationFee
   });
   ```
3. Update `transactions.status = 'refunded'`
4. Cancel session (if consultation)
5. Send refund confirmation emails

---

## Security & Compliance

### PCI Compliance

- **No card data stored**: Stripe handles all card data
- **PCI DSS compliant**: Using Stripe Elements for payment forms
- **Tokenization**: Payment methods tokenized by Stripe

### Webhook Security

- **Signature verification**: All webhooks verified using HMAC SHA256
- **Idempotency**: Events processed only once (check `event.id`)
- **Rate limiting**: 200 requests/minute per IP

### Fraud Prevention

- **Stripe Radar**: Built-in fraud detection
- **3D Secure**: Required for high-risk transactions
- **Manual review**: Flag suspicious transactions for review

---

## Testing

### Test Cards

**Success:**
- `4242 4242 4242 4242` (Visa)
- `5555 5555 5555 4444` (Mastercard)

**Decline:**
- `4000 0000 0000 0002` (Card declined)
- `4000 0000 0000 9995` (Insufficient funds)

**3D Secure:**
- `4000 0025 0000 3155` (Requires authentication)

### Test Mode

- Use Stripe test mode keys in development
- Test webhooks using Stripe CLI:
  ```bash
  stripe listen --forward-to localhost:3000/api/webhook/stripe
  ```
- Test Connect accounts using test mode

---

## Error Handling

### Payment Failures

- **Card declined**: Show error, allow retry
- **Insufficient funds**: Suggest different payment method
- **3D Secure required**: Redirect to authentication
- **Network error**: Retry with exponential backoff

### Webhook Failures

- **Signature invalid**: Log error, return 401
- **Duplicate event**: Return 200 (already processed)
- **Processing error**: Retry webhook (Stripe retries automatically)
- **Critical failure**: Alert admin, manual intervention

---

## Monitoring & Analytics

### Key Metrics

- **Revenue**: Total platform fees collected
- **Transaction volume**: Number of transactions per period
- **Refund rate**: Percentage of transactions refunded
- **Payout success rate**: Percentage of successful payouts
- **Average transaction value**: Mean transaction amount

### Dashboards

- **Admin dashboard**: Revenue, transactions, refunds
- **Mentor dashboard**: Earnings, pending payouts, transaction history
- **Org dashboard**: Subscription status, usage, billing

---

## Future Enhancements

- **Recurring subscriptions for mentors**: Monthly mentor subscriptions
- **Tiered platform fees**: Lower fees for high-volume mentors
- **Multi-currency support**: Support for non-USD currencies
- **Payment plans**: Installment payments for expensive consultations
- **Gift cards**: Allow users to gift consultations
- **Referral credits**: Credits for referring new users

