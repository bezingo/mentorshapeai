'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  CheckCircle2,
  XCircle,
  Play,
  MoreHorizontal,
  Loader2,
  AlertTriangle,
  Calendar,
  Video,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { type CollaborationStatus } from '@/lib/validations/collaboration'

interface CollaborationActionsProps {
  collaborationId: string
  status: CollaborationStatus
  userRole: 'mentor' | 'mentee'
}

/**
 * CollaborationActions provides action buttons for a collaboration.
 * Actions available depend on the current status and user role.
 */
export function CollaborationActions({
  collaborationId,
  status,
  userRole,
}: CollaborationActionsProps) {
  const router = useRouter()
  const { toast } = useToast()

  const [isLoading, setIsLoading] = useState(false)
  const [showAcceptDialog, setShowAcceptDialog] = useState(false)
  const [showDeclineDialog, setShowDeclineDialog] = useState(false)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [showActivateDialog, setShowActivateDialog] = useState(false)
  const [responseMessage, setResponseMessage] = useState('')
  const [cancelReason, setCancelReason] = useState('')

  const handleAccept = async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/collaborations/${collaborationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'accepted',
          response_message: responseMessage || null,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error?.message || 'Failed to accept')
      }

      toast({
        title: 'Request accepted',
        description: 'The collaboration request has been accepted.',
      })

      setShowAcceptDialog(false)
      router.refresh()
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to accept request',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDecline = async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/collaborations/${collaborationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'declined',
          response_message: responseMessage || null,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error?.message || 'Failed to decline')
      }

      toast({
        title: 'Request declined',
        description: 'The collaboration request has been declined.',
      })

      setShowDeclineDialog(false)
      router.refresh()
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to decline request',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleActivate = async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/collaborations/${collaborationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'active' }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error?.message || 'Failed to activate')
      }

      toast({
        title: 'Collaboration activated',
        description: 'The collaboration is now active. You can start scheduling focus sessions.',
      })

      setShowActivateDialog(false)
      router.refresh()
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to activate',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/collaborations/${collaborationId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: cancelReason || null }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error?.message || 'Failed to cancel')
      }

      toast({
        title: 'Collaboration cancelled',
        description: 'The collaboration has been cancelled.',
      })

      setShowCancelDialog(false)
      router.push('/dashboard/collaborations')
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to cancel',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Determine available actions based on status and role
  const canAccept = status === 'pending' && userRole === 'mentor'
  const canDecline = status === 'pending' && userRole === 'mentor'
  const canActivate = status === 'accepted' && userRole === 'mentor'
  const canCancel = ['pending', 'accepted', 'active'].includes(status)
  const canBookFocus = status === 'active' && userRole === 'mentee'
  const isTerminal = ['completed', 'cancelled', 'declined'].includes(status)

  // No actions for terminal states
  if (isTerminal) {
    return null
  }

  return (
    <>
      <div className="flex items-center gap-2">
        {/* Primary action buttons */}
        {canAccept && (
          <Button onClick={() => setShowAcceptDialog(true)}>
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Accept
          </Button>
        )}

        {canActivate && (
          <Button onClick={() => setShowActivateDialog(true)}>
            <Play className="h-4 w-4 mr-2" />
            Start Collaboration
          </Button>
        )}

        {canBookFocus && (
          <Button>
            <Video className="h-4 w-4 mr-2" />
            Book Focus
          </Button>
        )}

        {/* More actions dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {status === 'active' && (
              <>
                <DropdownMenuItem>
                  <Calendar className="h-4 w-4 mr-2" />
                  View Schedule
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            {canDecline && (
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => setShowDeclineDialog(true)}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Decline Request
              </DropdownMenuItem>
            )}
            {canCancel && (
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => setShowCancelDialog(true)}
              >
                <AlertTriangle className="h-4 w-4 mr-2" />
                Cancel Collaboration
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Accept Dialog */}
      <Dialog open={showAcceptDialog} onOpenChange={setShowAcceptDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Accept Collaboration Request</DialogTitle>
            <DialogDescription>
              You are about to accept this mentorship request. You can optionally include a welcome message.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-2">
              <Label htmlFor="accept-message">Welcome message (optional)</Label>
              <Textarea
                id="accept-message"
                placeholder="Welcome! I'm excited to work with you..."
                value={responseMessage}
                onChange={(e) => setResponseMessage(e.target.value)}
                rows={3}
                maxLength={1000}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAcceptDialog(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button onClick={handleAccept} disabled={isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Accept Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Decline Dialog */}
      <Dialog open={showDeclineDialog} onOpenChange={setShowDeclineDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Decline Collaboration Request</DialogTitle>
            <DialogDescription>
              Are you sure you want to decline this request? You can optionally include a message explaining why.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-2">
              <Label htmlFor="decline-message">Message (optional)</Label>
              <Textarea
                id="decline-message"
                placeholder="I'm currently not taking on new mentees..."
                value={responseMessage}
                onChange={(e) => setResponseMessage(e.target.value)}
                rows={3}
                maxLength={1000}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeclineDialog(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDecline} disabled={isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Decline Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Activate Dialog */}
      <Dialog open={showActivateDialog} onOpenChange={setShowActivateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start Collaboration</DialogTitle>
            <DialogDescription>
              This will mark the collaboration as active, allowing the mentee to book focus sessions with you.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowActivateDialog(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button onClick={handleActivate} disabled={isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Play className="h-4 w-4 mr-2" />
              Start Collaboration
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Collaboration</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this collaboration? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-2">
              <Label htmlFor="cancel-reason">Reason (optional)</Label>
              <Textarea
                id="cancel-reason"
                placeholder="Please provide a reason for cancelling..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={3}
                maxLength={1000}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancelDialog(false)} disabled={isLoading}>
              Keep Collaboration
            </Button>
            <Button variant="destructive" onClick={handleCancel} disabled={isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Cancel Collaboration
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
