'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { 
  CheckCircle2, 
  XCircle, 
  Target, 
  Clock, 
  MessageSquare,
  Loader2,
  Inbox,
  User,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useToast } from '@/hooks/use-toast'
import { type Collaboration } from './CollaborationCard'

interface MentorRequestsListProps {
  /** Initial list of pending collaboration requests */
  requests: Collaboration[]
  /** Callback when requests list changes (after accept/decline) */
  onUpdate?: () => void
}

/** Get initials from display name */
function getInitials(name: string | null): string {
  if (!name) return '?'
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

/**
 * MentorRequestsList displays pending collaboration requests for a mentor.
 * Allows accepting or declining requests with optional response messages.
 */
export function MentorRequestsList({ requests: initialRequests, onUpdate }: MentorRequestsListProps) {
  const { toast } = useToast()
  const [requests, setRequests] = useState(initialRequests)
  const [selectedRequest, setSelectedRequest] = useState<Collaboration | null>(null)
  const [responseMessage, setResponseMessage] = useState('')
  const [isAccepting, setIsAccepting] = useState(false)
  const [isDeclining, setIsDeclining] = useState(false)
  const [showDeclineDialog, setShowDeclineDialog] = useState(false)

  const handleAccept = async (collaboration: Collaboration) => {
    setIsAccepting(true)
    try {
      const res = await fetch(`/api/collaborations/${collaboration.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'accepted' }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error?.message || 'Failed to accept request')
      }

      // Remove from list
      setRequests((prev) => prev.filter((r) => r.id !== collaboration.id))
      
      toast({
        title: 'Request accepted',
        description: `You are now mentoring ${collaboration.mentee_profile?.display_name || 'this mentee'}.`,
      })

      onUpdate?.()
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to accept request',
        variant: 'destructive',
      })
    } finally {
      setIsAccepting(false)
    }
  }

  const handleDecline = async () => {
    if (!selectedRequest) return
    
    setIsDeclining(true)
    try {
      const res = await fetch(`/api/collaborations/${selectedRequest.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'declined',
          response_message: responseMessage || null,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error?.message || 'Failed to decline request')
      }

      // Remove from list
      setRequests((prev) => prev.filter((r) => r.id !== selectedRequest.id))
      setShowDeclineDialog(false)
      setSelectedRequest(null)
      setResponseMessage('')

      toast({
        title: 'Request declined',
        description: 'The mentorship request has been declined.',
      })

      onUpdate?.()
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to decline request',
        variant: 'destructive',
      })
    } finally {
      setIsDeclining(false)
    }
  }

  const openDeclineDialog = (collaboration: Collaboration) => {
    setSelectedRequest(collaboration)
    setResponseMessage('')
    setShowDeclineDialog(true)
  }

  if (requests.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Inbox className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="font-medium mb-1">No pending requests</h3>
          <p className="text-sm text-muted-foreground">
            New mentorship requests will appear here.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <div className="space-y-4">
        {requests.map((request) => (
          <Card key={request.id} className="overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    {request.mentee_profile?.avatar_url && (
                      <AvatarImage
                        src={request.mentee_profile.avatar_url}
                        alt={request.mentee_profile.display_name || ''}
                      />
                    )}
                    <AvatarFallback className="text-sm">
                      {getInitials(request.mentee_profile?.display_name ?? null)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-base">
                      {request.mentee_profile?.display_name || 'Unknown User'}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {request.mentee_profile?.handle ? `@${request.mentee_profile.handle}` : 'No handle'}
                    </CardDescription>
                  </div>
                </div>
                <Badge variant="secondary">
                  <Clock className="h-3 w-3 mr-1" />
                  {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Goal info */}
              {request.goal && (
                <div className="bg-muted/50 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <Target className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium text-sm">{request.goal.title}</p>
                      {request.goal.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {request.goal.description}
                        </p>
                      )}
                      {request.goal.category && (
                        <Badge variant="outline" className="text-xs mt-2">
                          {request.goal.category}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Request message */}
              {request.request_message && (
                <div className="bg-primary/5 rounded-lg p-3 border-l-2 border-primary">
                  <div className="flex items-start gap-2">
                    <MessageSquare className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Message from mentee:</p>
                      <p className="text-sm">{request.request_message}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => openDeclineDialog(request)}
                  disabled={isAccepting}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Decline
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => handleAccept(request)}
                  disabled={isAccepting}
                >
                  {isAccepting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                  )}
                  Accept
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Decline Dialog */}
      <Dialog open={showDeclineDialog} onOpenChange={setShowDeclineDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Decline Request</DialogTitle>
            <DialogDescription>
              Are you sure you want to decline this mentorship request from{' '}
              {selectedRequest?.mentee_profile?.display_name || 'this mentee'}? You can optionally
              include a message explaining why.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="decline-message">Message (optional)</Label>
              <Textarea
                id="decline-message"
                placeholder="e.g., I'm currently not taking on new mentees..."
                value={responseMessage}
                onChange={(e) => setResponseMessage(e.target.value)}
                rows={3}
                maxLength={1000}
              />
              <p className="text-xs text-muted-foreground text-right">
                {responseMessage.length}/1000
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeclineDialog(false)}
              disabled={isDeclining}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDecline} disabled={isDeclining}>
              {isDeclining ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <XCircle className="h-4 w-4 mr-2" />
              )}
              Decline Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
