'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  RefreshCw,
  MoreVertical,
  TrendingUp,
  MessageSquare,
  Plus,
  Loader2,
} from 'lucide-react'
import { CheckInForm, type CheckInData } from '@/components/progress/CheckInForm'

interface ProgressActionsProps {
  collaborationId: string
  userRole: 'mentor' | 'mentee'
}

export function ProgressActions({ collaborationId, userRole }: ProgressActionsProps) {
  const router = useRouter()
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [showCheckInDialog, setShowCheckInDialog] = useState(false)
  const [isSubmittingCheckIn, setIsSubmittingCheckIn] = useState(false)

  const handleAnalyzeProgress = async () => {
    setIsAnalyzing(true)
    try {
      const response = await fetch(`/api/collaborations/${collaborationId}/progress/analyze`, {
        method: 'POST',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to analyze progress')
      }

      // Refresh the page to show new score
      router.refresh()
    } catch (error) {
      console.error('Error analyzing progress:', error)
      alert(error instanceof Error ? error.message : 'Failed to analyze progress')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleSubmitCheckIn = async (data: CheckInData) => {
    setIsSubmittingCheckIn(true)
    try {
      const response = await fetch(`/api/collaborations/${collaborationId}/check-ins`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          week_start: data.weekStart,
          mood_rating: data.moodRating,
          progress_notes: data.progressNotes,
          blockers: data.blockers,
          wins: data.wins,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to submit check-in')
      }

      setShowCheckInDialog(false)
      router.refresh()
    } catch (error) {
      console.error('Error submitting check-in:', error)
      throw error
    } finally {
      setIsSubmittingCheckIn(false)
    }
  }

  return (
    <>
      <div className="flex items-center gap-2">
        {/* Analyze Progress Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleAnalyzeProgress}
          disabled={isAnalyzing}
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Update Score
            </>
          )}
        </Button>

        {/* More Actions Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {userRole === 'mentee' && (
              <>
                <DropdownMenuItem onClick={() => setShowCheckInDialog(true)}>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Submit Check-in
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem onClick={handleAnalyzeProgress} disabled={isAnalyzing}>
              <TrendingUp className="h-4 w-4 mr-2" />
              Refresh Progress Analysis
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Check-in Dialog */}
      <Dialog open={showCheckInDialog} onOpenChange={setShowCheckInDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Weekly Check-in</DialogTitle>
            <DialogDescription>
              Share your progress and how you&apos;re feeling this week.
            </DialogDescription>
          </DialogHeader>
          <CheckInForm
            collaborationId={collaborationId}
            onSubmit={handleSubmitCheckIn}
            className="border-0 shadow-none"
          />
        </DialogContent>
      </Dialog>
    </>
  )
}
