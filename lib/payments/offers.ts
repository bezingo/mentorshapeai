import { getMentorConnectStatus } from '@/lib/stripe/connect'

export function resolvePaymentRequired(
  offerType: string,
  connectReady: boolean
): boolean {
  if (offerType !== 'paid_consult' && offerType !== 'digital_product') {
    return false
  }
  return !connectReady
}

export async function getPaymentRequiredForMentor(
  mentorProfileId: string,
  offerType: string
): Promise<boolean> {
  const connect = await getMentorConnectStatus(mentorProfileId)
  return resolvePaymentRequired(offerType, connect.ready_for_payments)
}
