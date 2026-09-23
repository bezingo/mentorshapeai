'use client'

import { Card, CardContent } from '@heroui/react'

export function JourneyChatPlaceholder() {
  return (
    <Card className="max-w-lg">
      <CardContent>
        <p className="text-default-600">
          Agent chat shell placeholder — wire <code className="text-tiny">@heroui/agent</code> from the
          companion PR. Client tools are exported from{' '}
          <code className="text-tiny">lib/agent/client-tools.ts</code>.
        </p>
      </CardContent>
    </Card>
  )
}
