'use client'

/** HeroUI v3 does not require a root provider; passthrough for journey layout. */
export function JourneyHeroUIProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
