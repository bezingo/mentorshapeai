'use client'

import Link from 'next/link'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import {
  ArrowRight,
  Calendar,
  Target,
  User,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Hourglass,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'
import { type CollaborationStatus } from '@/lib/validations/collaboration'

export interface CollaborationProfile {
  id: string
  display_name: string | null
  avatar_url: string | null
  handle: string | null
}

export interface CollaborationGoal {
  id: string
  title: string
  description: string | null
  status: string
  category: string | null
}

export interface CollaborationOffer {
  id: string
  title: string
  type: string
  duration_minutes: number | null
}

export interface Collaboration {
  id: string
  status: CollaborationStatus
  request_message: string | null
  response_message: string | null
  created_at: string
  started_at: string | null
  completed_at: string | null
  cancelled_at: string | null
  user_role: 'mentor' | 'mentee' | null
  mentor_profile: CollaborationProfile | null
  mentee_profile: CollaborationProfile | null
  goal: CollaborationGoal | null
  offer: CollaborationOffer | null
}

interface CollaborationCardProps {
  collaboration: Collaboration
  /** Show action buttons for accept/decline (for mentor pending requests) */
  showActions?: boolean
  /** Callback for accept action */
  onAccept?: () => void
  /** Callback for decline action */
  onDecline?: () => void
  /** Is an action in progress */
  isLoading?: boolean
}

/** Status badge configuration */
const statusConfig: Record<
  CollaborationStatus,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ElementType }
> = {
  pending: { label: 'Pending', variant: 'secondary', icon: Hourglass },
  accepted: { label: 'Accepted', variant: 'default', icon: CheckCircle2 },
  active: { label: 'Active', variant: 'default', icon: Target },
  completed: { label: 'Completed', variant: 'outline', icon: CheckCircle2 },
  cancelled: { label: 'Cancelled', variant: 'destructive', icon: XCircle },
  declined: { label: 'Declined', variant: 'destructive', icon: AlertCircle },
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
 * CollaborationCard displays a summary of a collaboration relationship.
 * Shows mentor/mentee info, goal title, status, and optional actions.
 */
export function CollaborationCard({
  collaboration,
  showActions = false,
  onAccept,
  onDecline,
  isLoading = false,
}: CollaborationCardProps) {
  const { status, user_role, mentor_profile, mentee_profile, goal, offer, created_at } = collaboration
  const statusInfo = statusConfig[status]
  const StatusIcon = statusInfo.icon

  // Determine the "other" person based on user's role
  const otherPerson = user_role === 'mentor' ? mentee_profile : mentor_profile
  const roleLabel = user_role === 'mentor' ? 'Mentee' : 'Mentor'

  return (
    <Card className="hover:ring-primary/20 hover:ring-2 transition-all">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          {/* Other person info */}
          <div className="flex items-center gap-3 min-w-0">
            <Avatar className="h-10 w-10 shrink-0">
              {otherPerson?.avatar_url && (
                <AvatarImage src={otherPerson.avatar_url} alt={otherPerson.display_name || ''} />
              )}
              <AvatarFallback>{getInitials(otherPerson?.display_name)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="font-medium truncate">{otherPerson?.display_name || 'Unknown User'}</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <User className="h-3 w-3" />
                {roleLabel}
                {otherPerson?.handle && (
                  <span className="text-muted-foreground/70">@{otherPerson.handle}</span>
                )}
              </p>
            </div>
          </div>

          {/* Status badge */}
          <Badge variant={statusInfo.variant} className="shrink-0">
            <StatusIcon className="h-3 w-3 mr-1" />
            {statusInfo.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Goal info */}
        {goal && (
          <div className="bg-muted/50 rounded-lg p-3 space-y-1">
            <div className="flex items-start gap-2">
              <Target className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="font-medium text-sm line-clamp-1">{goal.title}</p>
                {goal.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                    {goal.description}
                  </p>
                )}
              </div>
            </div>
            {goal.category && (
              <Badge variant="outline" className="text-xs mt-2">
                {goal.category}
              </Badge>
            )}
          </div>
        )}

        {/* Offer info (if present) */}
        {offer && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>{offer.title}</span>
            {offer.duration_minutes && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {offer.duration_minutes} min
              </span>
            )}
          </div>
        )}

        {/* Request message preview */}
        {collaboration.request_message && status === 'pending' && user_role === 'mentor' && (
          <div className="bg-muted/30 rounded-lg p-3 text-sm">
            <p className="text-xs font-medium text-muted-foreground mb-1">Request message:</p>
            <p className="text-muted-foreground line-clamp-2">{collaboration.request_message}</p>
          </div>
        )}

        {/* Timestamps */}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatDistanceToNow(new Date(created_at), { addSuffix: true })}
          </span>
          <span
            className={cn(
              'px-2 py-0.5 rounded-full text-xs',
              user_role === 'mentor' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
            )}
          >
            {user_role === 'mentor' ? 'As Mentor' : 'As Mentee'}
          </span>
        </div>

        {/* Action buttons */}
        {showActions && status === 'pending' && user_role === 'mentor' ? (
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={onDecline}
              disabled={isLoading}
            >
              <XCircle className="h-4 w-4 mr-1" />
              Decline
            </Button>
            <Button size="sm" className="flex-1" onClick={onAccept} disabled={isLoading}>
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Accept
            </Button>
          </div>
        ) : (
          <Link href={`/dashboard/collaborations/${collaboration.id}`} className="block">
            <Button variant="ghost" size="sm" className="w-full">
              View Details
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
        )}
      </CardContent>
    </Card>
  )
}
