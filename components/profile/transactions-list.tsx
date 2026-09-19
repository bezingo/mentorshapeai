'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2 } from 'lucide-react'
import { format } from 'date-fns'

interface TransactionRow {
  id: string
  amount_cents: number
  platform_fee_cents: number
  status: string
  created_at: string
  mentor_offer?: { title?: string; type?: string } | null
  buyer?: { display_name?: string } | null
  mentor?: { display_name?: string } | null
}

function formatMoney(cents: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100)
}

export function TransactionsList() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['transactions'],
    queryFn: async () => {
      const res = await fetch('/api/transactions')
      if (!res.ok) throw new Error('Failed to load transactions')
      const json = await res.json()
      return json.data as TransactionRow[]
    },
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transactions</CardTitle>
        <CardDescription>
          Payments for mentor offers, including consultations and digital products.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading transactions…
          </div>
        )}
        {error && (
          <p className="text-sm text-destructive">{(error as Error).message}</p>
        )}
        {!isLoading && !error && (!data || data.length === 0) && (
          <p className="text-sm text-muted-foreground">No transactions yet.</p>
        )}
        {data && data.length > 0 && (
          <ul className="divide-y">
            {data.map((tx) => (
              <li key={tx.id} className="py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <p className="font-medium">
                    {tx.mentor_offer?.title ?? 'Mentor offer'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(tx.created_at), 'PPp')}
                    {tx.buyer?.display_name && ` · Buyer: ${tx.buyer.display_name}`}
                    {tx.mentor?.display_name && ` · Mentor: ${tx.mentor.display_name}`}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold">{formatMoney(tx.amount_cents)}</span>
                  <Badge variant={tx.status === 'succeeded' ? 'default' : 'secondary'}>
                    {tx.status}
                  </Badge>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
