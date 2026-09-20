'use client'

import { useQuery } from '@tanstack/react-query'
import { Badge } from '@/components/ui/badge'

export function SubscriptionBadge() {
  const { data, isLoading } = useQuery({
    queryKey: ['billing-subscription'],
    queryFn: async () => {
      const res = await fetch('/api/billing/subscription')
      if (!res.ok) throw new Error('Failed to load subscription')
      const json = await res.json()
      return json.data as { plan: string; has_pro: boolean }
    },
  })

  if (isLoading) {
    return <Badge variant="outline">Plan…</Badge>
  }

  const label = data?.has_pro ? 'Pro' : 'Free'
  return <Badge variant={data?.has_pro ? 'default' : 'secondary'}>{label}</Badge>
}
