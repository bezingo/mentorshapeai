'use client'

import Link from 'next/link'
import { UserButton } from '@clerk/nextjs'
import { Button } from '@heroui/react'
import { LayoutDashboard, Layers, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { Sidebar, Sheet } from '@heroui-pro/react'
import { ArtifactPanel } from '@/components/journey/artifact-panel'
import { JourneyAgent } from '@/components/journey/journey-agent'

export function JourneyShell() {
  const [mobileArtifactsOpen, setMobileArtifactsOpen] = useState(false)

  return (
    <Sidebar.Provider defaultOpen>
      <div className="flex h-dvh flex-col bg-background">
        <header className="flex h-14 shrink-0 items-center justify-between border-b px-3 md:px-4">
          <div className="flex items-center gap-2">
            <Sidebar.Trigger className="hidden md:inline-flex" />
            <Button
              isIconOnly
              variant="ghost"
              className="md:hidden"
              aria-label="Open artifacts"
              onPress={() => setMobileArtifactsOpen(true)}
            >
              <Layers className="size-4" />
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
          <Sidebar className="hidden w-[min(400px,40vw)] shrink-0 md:flex" collapsible="offcanvas">
            <Sidebar.Header>
              <Sidebar.MenuLabel className="text-base font-semibold">Artifacts</Sidebar.MenuLabel>
            </Sidebar.Header>
            <Sidebar.Content>
              <ArtifactPanel embedded />
            </Sidebar.Content>
            <Sidebar.Rail />
          </Sidebar>

          <main className="relative min-w-0 flex-1">
            <JourneyAgent />
          </main>
        </div>

        <Sheet
          isOpen={mobileArtifactsOpen}
          onOpenChange={setMobileArtifactsOpen}
          placement="bottom"
        >
          <Sheet.Content className="max-h-[85vh]">
            <Sheet.Dialog>
              <Sheet.Handle />
              <Sheet.Header>
                <Sheet.Heading>Artifacts</Sheet.Heading>
                <Sheet.CloseTrigger />
              </Sheet.Header>
              <Sheet.Body className="px-0 pb-4">
                <ArtifactPanel embedded />
              </Sheet.Body>
            </Sheet.Dialog>
          </Sheet.Content>
        </Sheet>
      </div>
    </Sidebar.Provider>
  )
}
