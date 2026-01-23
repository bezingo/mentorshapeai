'use client'

import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Loader2, Sparkles } from 'lucide-react'
import { GoalShapingModal } from './goal-shaping-modal'
import { useRouter } from 'next/navigation'

interface GoalShapeButtonProps {
  goalId: string
  goalStatus: string
  hasAiShaped: boolean
}

export function GoalShapeButton({ goalId, goalStatus, hasAiShaped }: GoalShapeButtonProps) {
  const router = useRouter()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isWarningOpen, setIsWarningOpen] = useState(false)
  const [shapedData, setShapedData] = useState<any>(null)

  const shapeMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/ai/goal-shaper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal_id: goalId }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error?.message || 'Failed to shape goal')
      }

      return res.json()
    },
    onSuccess: (data) => {
      setShapedData(data.data)
      setIsModalOpen(true)
      setIsWarningOpen(false)
    },
    onError: (error: Error) => {
      alert(`Error shaping goal: ${error.message || 'Failed to shape goal. Please try again.'}`)
      setIsWarningOpen(false)
    },
  })

  const handleShape = () => {
    if (hasAiShaped) {
      setIsWarningOpen(true)
    } else {
      shapeMutation.mutate()
    }
  }

  const handleConfirmReshape = () => {
    shapeMutation.mutate()
  }

  const handleModalSuccess = () => {
    router.refresh() // Refresh the page to show updated goal data
  }

  return (
    <>
      <Button
        onClick={handleShape}
        disabled={shapeMutation.isPending}
        variant="outline"
        className="gap-2"
      >
        {shapeMutation.isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Shaping your goal...
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" />
            {hasAiShaped ? 'Re-shape Goal with AI' : 'Shape Goal with AI'}
          </>
        )}
      </Button>

      {/* Re-shape Warning Dialog */}
      <AlertDialog open={isWarningOpen} onOpenChange={setIsWarningOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Re-shape Goal?</AlertDialogTitle>
            <AlertDialogDescription>
              This will replace your existing AI-generated milestones, success criteria, and suggested
              questions. Any manual edits you've made will be lost. Do you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmReshape}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Goal Shaping Modal */}
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

