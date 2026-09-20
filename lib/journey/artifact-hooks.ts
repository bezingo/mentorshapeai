/**
 * Stubs for the next worker: JointJS vision board + mentor matching.
 */

export type JourneyArtifactKind = 'goals' | 'vision-board' | 'profile' | 'matching'

export function useVisionBoardArtifact() {
  return {
    status: 'stub' as const,
    message: 'Vision board canvas (JointJS) will mount here.',
  }
}

export function useMentorMatching() {
  return {
    status: 'stub' as const,
    message: 'Mentor scoring and outreach will be wired in a follow-up PR.',
  }
}

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
