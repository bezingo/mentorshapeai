'use client'

import Link from 'next/link'
import { useState } from 'react'
import { UserProfile } from '@clerk/nextjs'
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Separator,
} from '@heroui/react'
import { CellSwitch, Sheet } from '@heroui-pro/react'
import { SubscriptionBadge } from '@/components/billing/subscription-badge'

export function BillingSettingsPanel() {
  const [emailReceipts, setEmailReceipts] = useState(true)
  const [renewalReminders, setRenewalReminders] = useState(true)
  const [clerkSheetOpen, setClerkSheetOpen] = useState(false)

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Billing</h1>
          <p className="text-default-500">
            Manage your Mentorshape subscription through Clerk Billing.
          </p>
        </div>
        <SubscriptionBadge />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Subscription plans</CardTitle>
          <CardDescription>
            Upgrade to Pro for unlimited goals, collaborations, and AI features. Plans are
            configured in the Clerk Dashboard and synced automatically.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Link href="/pricing">
            <Button variant="primary">View pricing</Button>
          </Link>
          <Link href="/dashboard/profile/transactions">
            <Button variant="secondary">Mentor transactions</Button>
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Billing preferences</CardTitle>
          <CardDescription>
            In-app toggles for notifications; subscription changes still happen in Clerk.
          </CardDescription>
        </CardHeader>
        <CardContent className="gap-0 p-0">
          <CellSwitch isSelected={emailReceipts} onChange={setEmailReceipts} variant="secondary">
            <CellSwitch.Trigger>
              <CellSwitch.Label>
                <span className="font-medium">Email payment receipts</span>
                <span className="text-tiny text-default-500">
                  Mentor payouts and focus purchases
                </span>
              </CellSwitch.Label>
              <CellSwitch.Control />
            </CellSwitch.Trigger>
          </CellSwitch>
          <Separator />
          <CellSwitch
            isSelected={renewalReminders}
            onChange={setRenewalReminders}
            variant="secondary"
          >
            <CellSwitch.Trigger>
              <CellSwitch.Label>
                <span className="font-medium">Subscription renewal reminders</span>
                <span className="text-tiny text-default-500">
                  Notify before your plan renews
                </span>
              </CellSwitch.Label>
              <CellSwitch.Control />
            </CellSwitch.Trigger>
          </CellSwitch>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>Clerk account & billing portal</CardTitle>
            <CardDescription>
              Update payment method, invoices, and subscription tier.
            </CardDescription>
          </div>
          <Button variant="secondary" onPress={() => setClerkSheetOpen(true)}>
            Manage in Clerk
          </Button>
        </CardHeader>
      </Card>

      <Sheet isOpen={clerkSheetOpen} onOpenChange={setClerkSheetOpen} placement="right">
        <Sheet.Content className="w-full max-w-lg">
          <Sheet.Dialog>
            <Sheet.Header>
              <Sheet.Heading>Account & billing</Sheet.Heading>
              <Sheet.CloseTrigger />
            </Sheet.Header>
            <Sheet.Body className="flex justify-center p-4">
              <UserProfile routing="hash" />
            </Sheet.Body>
          </Sheet.Dialog>
        </Sheet.Content>
      </Sheet>
    </div>
  )
}
