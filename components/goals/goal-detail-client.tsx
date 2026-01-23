'use client'

import { useEffect, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { GoalShapeButton } from './goal-shape-button'
import { GoalShapingModal } from './goal-shaping-modal'

interface GoalDetailClientProps {
  goalId: string
  goalStatus: string
  aiShapedAt: string | null
  onStatusChange?: () => void
}

export function GoalDetailClient({
  goalId,
  goalStatus,
  aiShapedAt,
  onStatusChange,
}: GoalDetailClientProps) {
  const router = useRouter()
  const hasAiShaped = !!aiShapedAt
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [shapedData, setShapedData] = useState<any>(null)

  // Auto-trigger shaping when goal status changes to 'active'
  const autoShapeMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/ai/goal-shaper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal_id: goalId }),
      })

      if (!res.ok) {
        let errorMessage = 'Failed to shape goal'
        try {
          const error = await res.json()
          errorMessage = error.error?.message || error.message || `HTTP ${res.status}: ${res.statusText}`
          console.error('Goal shaper API error:', {
            status: res.status,
            statusText: res.statusText,
            error: error.error || error,
          })
        } catch (e) {
          // If response isn't JSON, use status text
          errorMessage = `HTTP ${res.status}: ${res.statusText || 'Unknown error'}`
          console.error('Failed to parse error response:', e)
        }
        throw new Error(errorMessage)
      }

      return res.json()
    },
    onSuccess: (data) => {
      // Open modal with shaped data for user review
      setShapedData(data.data)
      setIsModalOpen(true)
      router.refresh()
      onStatusChange?.()
    },
    onError: (error: Error) => {
      console.error('Auto-shape failed:', error)
      // Log full error details for debugging
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
      })
      // Silently fail for auto-trigger - user can manually trigger if needed
    },
  })

  useEffect(() => {
    // Auto-trigger shaping when status changes to 'active' and hasn't been shaped yet
    if (goalStatus === 'active' && !hasAiShaped && !autoShapeMutation.isPending) {
      autoShapeMutation.mutate()
    }
  }, [goalStatus, hasAiShaped]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleModalSuccess = () => {
    router.refresh()
    onStatusChange?.()
  }

  return (
    <>
      <GoalShapeButton
        goalId={goalId}
        goalStatus={goalStatus}
        hasAiShaped={hasAiShaped}
      />

      {/* Auto-triggered modal - opens when goal is auto-shaped */}
      {shapedData && (
        <GoalShapingModal
          open={isModalOpen}
          onOpenChange={setIsModalOpen}
          goalId={goalId}
          initialData={shapedData}
          onSuccess={handleModalSuccess}
        />
      )}
    </>
  )
}

