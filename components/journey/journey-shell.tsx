'use client'

import Link from 'next/link'
import { UserButton } from '@clerk/nextjs'
import { Button, ScrollShadow, Surface } from '@heroui/react'
import { LayoutDashboard, PanelLeftClose, PanelLeftOpen, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { JourneyAgent } from '@/components/journey/journey-agent'
import { useMentorMatching, useVisionBoardArtifact } from '@/lib/journey/artifact-hooks'

const ARTIFACT_ITEMS = [
  { id: 'goals', label: 'Goals', hint: 'Year → quarter → week' },
  { id: 'vision-board', label: 'Vision board', hint: 'Canvas (coming soon)' },
  { id: 'profile', label: 'One-link profile', hint: 'Education & work' },
  { id: 'matching', label: 'Mentor match', hint: 'Scoring (coming soon)' },
] as const

export function JourneyShell() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const visionBoard = useVisionBoardArtifact()
  const matching = useMentorMatching()

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

      <div className="flex min-h-0 flex-1">
        {sidebarOpen && (
          <aside className="hidden w-72 shrink-0 border-r md:flex md:flex-col">
            <div className="border-b px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Artifacts
              </p>
              <p className="text-sm text-muted-foreground">
                Your onboarding outputs appear here as you progress.
              </p>
            </div>
            <ScrollShadow className="flex-1 p-3">
              <ul className="flex flex-col gap-2">
                {ARTIFACT_ITEMS.map((item) => (
                  <li key={item.id}>
                    <Surface className="rounded-lg border p-3">
                      <p className="font-medium">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.hint}</p>
                    </Surface>
                  </li>
                ))}
              </ul>
              <p className="mt-4 px-1 text-xs text-muted-foreground">
                {visionBoard.message} {matching.message}
              </p>
            </ScrollShadow>
          </aside>
        )}

        <main className="relative min-w-0 flex-1">
          <JourneyAgent />
        </main>
      </div>
    </div>
  )
}
