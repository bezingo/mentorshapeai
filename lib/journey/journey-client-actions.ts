import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime'
import {
  openJourneyArtifact,
  type JourneyArtifactKind,
} from '@/lib/journey/artifact-hooks'
import type { JourneyClientAction } from '@/lib/journey/journey-server-tools'

export function applyJourneyClientAction(
  action: JourneyClientAction,
  router: AppRouterInstance
) {
  switch (action.type) {
    case 'navigateToArtifact': {
      if (action.href.startsWith('/journey')) {
        router.push(action.href)
      } else {
        router.push(action.href)
      }
      if (action.artifact === 'vision-board') {
        openJourneyArtifact('vision-board')
      } else if (action.artifact === 'matching') {
        openJourneyArtifact('matching')
      }
      break
    }
    case 'openVisionBoard': {
      const detail: Record<string, string> = {}
      if (action.visionBoardId) detail.visionBoardId = action.visionBoardId
      if (action.goalId) detail.goalId = action.goalId
      if (action.title) detail.title = action.title
      openJourneyArtifact('vision-board', detail)
      break
    }
    case 'refreshArtifacts':
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('mentorshape:refresh-artifacts', { detail: action }))
      }
      break
    default:
      break
  }
}

export function dispatchArtifactRefresh(reason = 'journey-tool') {
  if (typeof window === 'undefined') return
  window.dispatchEvent(
    new CustomEvent('mentorshape:refresh-artifacts', {
      detail: { type: 'refreshArtifacts', reason },
    })
  )
}

export function isJourneyClientAction(value: unknown): value is JourneyClientAction {
  if (!value || typeof value !== 'object') return false
  const type = (value as { type?: string }).type
  return (
    type === 'navigateToArtifact' ||
    type === 'openVisionBoard' ||
    type === 'refreshArtifacts'
  )
}

export function toolOutputNeedsArtifactRefresh(output: unknown): boolean {
  if (!output || typeof output !== 'object') return false
  const record = output as { refreshArtifacts?: boolean; success?: boolean }
  return Boolean(record.success && record.refreshArtifacts)
}

export type { JourneyArtifactKind }
