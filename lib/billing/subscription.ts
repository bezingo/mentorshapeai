import { auth } from '@clerk/nextjs/server'

export type SubscriptionPlanSlug = 'free' | 'pro'

export interface SubscriptionSummary {
  plan: SubscriptionPlanSlug
  has_pro: boolean
}

/**
 * Clerk Billing is the source of truth for SaaS subscriptions.
 * Plans are configured in the Clerk Dashboard; authorization uses has({ plan }).
 */
export async function getSubscriptionSummary(): Promise<SubscriptionSummary> {
  const { has, userId } = await auth()

  if (!userId) {
    return { plan: 'free', has_pro: false }
  }

  const hasProPlan = has({ plan: 'pro' })
  return {
    plan: hasProPlan ? 'pro' : 'free',
    has_pro: hasProPlan,
  }
}
