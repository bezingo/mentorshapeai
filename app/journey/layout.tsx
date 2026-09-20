import { JourneyHeroUIProvider } from '@/components/journey/heroui-provider'

export default function JourneyLayout({ children }: { children: React.ReactNode }) {
  return (
    <JourneyHeroUIProvider>
      <div className="min-h-screen bg-background text-foreground">{children}</div>
    </JourneyHeroUIProvider>
  )
}
