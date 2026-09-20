export type JourneyArtifactKind = 'goals' | 'vision-board' | 'profile' | 'matching'

export function getArtifactRoute(kind: JourneyArtifactKind): string {
  switch (kind) {
    case 'goals':
      return '/dashboard/mentee/goals'
    case 'vision-board':
      return '/journey?artifact=vision-board'
    case 'profile':
      return '/dashboard/settings/profile'
    case 'matching':
      return '/journey?artifact=matching'
    default:
      return '/journey'
  }
}

/** Dispatch browser events so the journey artifact sidebar opens the right panel. */
export function openJourneyArtifact(kind: JourneyArtifactKind, detail?: Record<string, string>) {
  if (typeof window === 'undefined') return
  if (kind === 'vision-board') {
    window.dispatchEvent(
      new CustomEvent('mentorshape:open-vision-board', {
        detail,
      })
    )
  } else if (kind === 'matching') {
    window.dispatchEvent(new CustomEvent('mentorshape:open-matching'))
  }
}
