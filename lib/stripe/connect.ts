import { createServiceClient } from '@/lib/supabase/service'
import { getAppUrl, getStripeClient } from '@/lib/stripe/config'

export interface MentorConnectStatus {
  account_id: string | null
  charges_enabled: boolean
  payouts_enabled: boolean
  details_submitted: boolean
  ready_for_payments: boolean
}

export async function getMentorConnectStatus(
  profileId: string
): Promise<MentorConnectStatus> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('profiles')
    .select(
      'stripe_connect_account_id, stripe_connect_charges_enabled, stripe_connect_payouts_enabled, stripe_connect_details_submitted'
    )
    .eq('id', profileId)
    .single()

  const charges_enabled = data?.stripe_connect_charges_enabled ?? false
  const payouts_enabled = data?.stripe_connect_payouts_enabled ?? false
  const details_submitted = data?.stripe_connect_details_submitted ?? false

  return {
    account_id: data?.stripe_connect_account_id ?? null,
    charges_enabled,
    payouts_enabled,
    details_submitted,
    ready_for_payments: Boolean(
      data?.stripe_connect_account_id && charges_enabled && payouts_enabled
    ),
  }
}

export async function syncConnectAccountFromStripe(
  accountId: string
): Promise<MentorConnectStatus | null> {
  const stripe = getStripeClient()
  const account = await stripe.accounts.retrieve(accountId)

  const supabase = createServiceClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('stripe_connect_account_id', accountId)
    .single()

  if (!profile) {
    return null
  }

  const charges_enabled = account.charges_enabled ?? false
  const payouts_enabled = account.payouts_enabled ?? false
  const details_submitted = account.details_submitted ?? false

  await supabase
    .from('profiles')
    .update({
      stripe_connect_charges_enabled: charges_enabled,
      stripe_connect_payouts_enabled: payouts_enabled,
      stripe_connect_details_submitted: details_submitted,
    })
    .eq('id', profile.id)

  await clearPaymentRequiredForMentor(profile.id, charges_enabled && payouts_enabled)

  return {
    account_id: accountId,
    charges_enabled,
    payouts_enabled,
    details_submitted,
    ready_for_payments: charges_enabled && payouts_enabled,
  }
}

export async function clearPaymentRequiredForMentor(
  mentorProfileId: string,
  ready: boolean
): Promise<void> {
  if (!ready) return

  const supabase = createServiceClient()
  await supabase
    .from('mentor_offers')
    .update({ payment_required: false })
    .eq('mentor_profile_id', mentorProfileId)
    .eq('type', 'paid_consult')
    .eq('payment_required', true)
}

export async function createConnectOnboardingLink(
  profileId: string,
  email: string
): Promise<{ url: string; account_id: string }> {
  const stripe = getStripeClient()
  const supabase = createServiceClient()
  const appUrl = getAppUrl()

  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_connect_account_id')
    .eq('id', profileId)
    .single()

  let accountId = profile?.stripe_connect_account_id

  if (!accountId) {
    const account = await stripe.accounts.create({
      type: 'express',
      email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      metadata: {
        mentor_profile_id: profileId,
      },
    })
    accountId = account.id

    await supabase
      .from('profiles')
      .update({ stripe_connect_account_id: accountId })
      .eq('id', profileId)
  }

  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${appUrl}/dashboard/profile/payments?connect=refresh`,
    return_url: `${appUrl}/dashboard/profile/payments?connect=return`,
    type: 'account_onboarding',
  })

  return { url: accountLink.url, account_id: accountId }
}
