'use client'

import Link from 'next/link'
import { UserButton } from '@clerk/nextjs'
import { Button } from '@heroui/react'
import { LayoutDashboard, PanelLeftClose, PanelLeftOpen, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { ArtifactPanel } from '@/components/journey/artifact-panel'
import { JourneyAgent } from '@/components/journey/journey-agent'
import { UpcomingRemindersBanner } from '@/components/journey/upcoming-reminders-banner'
import { openJourneyArtifact } from '@/lib/journey/artifact-hooks'

export function JourneyShell() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const searchParams = useSearchParams()

  useEffect(() => {
    const artifact = searchParams.get('artifact')
    if (artifact === 'vision-board') {
      openJourneyArtifact('vision-board')
    } else if (artifact === 'matching') {
      openJourneyArtifact('matching')
    }
  }, [searchParams])

  return (
    <div className="flex h-dvh flex-col bg-background">
      <header className="flex h-14 shrink-0 items-center justify-between border-b px-3 md:px-4">
        <div className="flex items-center gap-2">
          <Button
            isIconOnly
            variant="ghost"
            aria-label={sidebarOpen ? 'Collapse artifacts' : 'Expand artifacts'}
            onPress={() => setSidebarOpen((open) => !open)}
          >
            {sidebarOpen ? (
              <PanelLeftClose className="size-4" />
            ) : (
              <PanelLeftOpen className="size-4" />
            )}
          </Button>
          <Sparkles className="size-4 text-primary" />
          <span className="font-semibold">Mentorshape Journey</span>
        </div>
        <nav className="flex items-center gap-2">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm">
              <LayoutDashboard className="mr-1 size-4" />
              Dashboard
            </Button>
          </Link>
          <UserButton
            appearance={{
              elements: { avatarBox: 'h-8 w-8' },
            }}
          />
        </nav>
      </header>

      <UpcomingRemindersBanner />

      <div className="flex min-h-0 flex-1">
        {sidebarOpen && (
          <aside className="hidden w-[400px] shrink-0 border-r md:flex md:flex-col overflow-hidden">
            <ArtifactPanel />
          </aside>
        )}

        <main className="relative min-w-0 flex-1">
          <JourneyAgent />
        </main>
      </div>

      {sidebarOpen && (
        <div className="border-t md:hidden max-h-[45vh] overflow-auto">
          <ArtifactPanel />
        </div>
      )}
    </div>
  )
}
