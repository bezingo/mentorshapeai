import { ArtifactPanel } from '@/components/journey/artifact-panel'
import { JourneyChatPlaceholder } from '@/components/journey/journey-chat-placeholder'

export default function JourneyPage() {
  return (
    <div className="mx-auto grid min-h-screen max-w-7xl grid-cols-1 lg:grid-cols-[1fr_400px]">
      <main className="flex flex-col border-r border-default-200">
        <header className="border-b border-default-200 px-6 py-4">
          <h1 className="text-2xl font-semibold">Mentorshape journey</h1>
          <p className="text-small text-default-500">
            Chat with the agent in the main area (HeroUI Agent embed lands in the parallel PR). Use the
            artifacts panel for goals and your vision board.
          </p>
        </header>
        <section className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
          <JourneyChatPlaceholder />
        </section>
      </main>
      <aside className="hidden bg-content1 lg:block">
        <ArtifactPanel />
      </aside>
      <div className="border-t border-default-200 bg-content1 lg:hidden">
        <ArtifactPanel />
      </div>
    </div>
  )
}
