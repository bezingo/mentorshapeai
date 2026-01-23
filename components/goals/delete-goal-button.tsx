'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Trash2, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface DeleteGoalButtonProps {
  goalId: string
  hasActiveCollaborations?: boolean
}

export function DeleteGoalButton({ goalId, hasActiveCollaborations }: DeleteGoalButtonProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/goals/${goalId}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error?.message || 'Failed to delete goal')
      }

      return res.json()
    },
    onSuccess: () => {
      toast({
        title: 'Goal Deleted',
        description: 'Your goal has been successfully deleted.',
      })
      setOpen(false)
      router.push('/dashboard/mentee/goals')
      router.refresh()
    },
    onError: (error: Error) => {
      toast({
        title: 'Error Deleting Goal',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 text-destructive hover:text-destructive">
          <Trash2 className="h-4 w-4" />
          Delete
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure you want to delete this goal?</AlertDialogTitle>
          <AlertDialogDescription>
            {hasActiveCollaborations ? (
              <>
                This goal has active collaborations. You cannot delete it until all collaborations are cancelled or completed.
                <br />
                <br />
                This action cannot be undone. All milestones and related data will be permanently deleted.
              </>
            ) : (
              <>
                This action cannot be undone. This will permanently delete your goal, all milestones, and any related data.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => deleteMutation.mutate()}
            disabled={deleteMutation.isPending || hasActiveCollaborations}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleteMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Deleting...
              </>
            ) : (
              'Delete Goal'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}


