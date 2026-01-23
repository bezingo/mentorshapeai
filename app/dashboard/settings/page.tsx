import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Settings as SettingsIcon, User, Bell, CreditCard } from 'lucide-react'

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account settings and preferences.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Link href="/dashboard/settings/profile">
          <Card className="p-6 hover:bg-muted/50 transition-colors cursor-pointer">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <User className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold">Profile</h2>
                <p className="text-sm text-muted-foreground">
                  Manage your profile information and import data
                </p>
              </div>
            </div>
          </Card>
        </Link>

        <Card className="p-6 opacity-50">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-muted">
              <Bell className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold">Notifications</h2>
              <p className="text-sm text-muted-foreground">
                Coming soon...
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6 opacity-50">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-muted">
              <CreditCard className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold">Billing</h2>
              <p className="text-sm text-muted-foreground">
                Coming soon...
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

