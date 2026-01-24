'use client'

import { useState, useEffect } from 'react'
import { Award, Sparkles, Star, PartyPopper } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { type BadgeType, BADGE_DEFINITIONS } from '@/lib/utils/badges'

export interface BadgeData {
  id: string
  type: BadgeType
  label: string
  earned_at: string
  metadata?: Record<string, unknown>
}

export interface BadgeAwardCardProps {
  /** The badge that was awarded */
  badge: BadgeData | null
  /** Mentor's display name */
  mentorName?: string
  /** Whether to show the celebration animation */
  showAnimation?: boolean
  /** Whether the card is loading */
  isLoading?: boolean
  /** Callback when user acknowledges the badge */
  onAcknowledge?: () => void
}

/**
 * Confetti particle component for animation
 */
function Confetti() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {[...Array(20)].map((_, i) => (
        <div
          key={i}
          className="absolute animate-confetti"
          style={{
            left: `${Math.random() * 100}%`,
            top: '-10%',
            animationDelay: `${Math.random() * 2}s`,
            animationDuration: `${2 + Math.random() * 2}s`,
          }}
        >
          <div
            className={cn(
              'w-2 h-2 rounded-sm',
              ['bg-yellow-400', 'bg-blue-400', 'bg-green-400', 'bg-purple-400', 'bg-pink-400'][
                Math.floor(Math.random() * 5)
              ]
            )}
          />
        </div>
      ))}
    </div>
  )
}

/**
 * BadgeAwardCard - Display awarded badge with celebration animation
 */
export function BadgeAwardCard({
  badge,
  mentorName,
  showAnimation = true,
  isLoading = false,
  onAcknowledge,
}: BadgeAwardCardProps) {
  const [isAnimating, setIsAnimating] = useState(showAnimation)
  const [showConfetti, setShowConfetti] = useState(false)

  useEffect(() => {
    if (showAnimation && badge) {
      // Start confetti after a short delay
      const confettiTimer = setTimeout(() => setShowConfetti(true), 500)
      // Stop animation after 4 seconds
      const animationTimer = setTimeout(() => {
        setIsAnimating(false)
        setShowConfetti(false)
      }, 4000)

      return () => {
        clearTimeout(confettiTimer)
        clearTimeout(animationTimer)
      }
    }
  }, [showAnimation, badge])

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <div className="h-20 w-20 rounded-full bg-muted animate-pulse" />
            <div className="h-4 w-32 bg-muted rounded animate-pulse" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!badge) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-yellow-500" />
            Mentor Badge
          </CardTitle>
          <CardDescription>Badges earned by your mentor through this collaboration</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <Award className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">No badge awarded yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Once the mentor confirms goal completion, they may earn a badge
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const badgeDefinition = BADGE_DEFINITIONS[badge.type]

  return (
    <Card className="relative overflow-hidden">
      {/* Confetti Animation */}
      {showConfetti && <Confetti />}

      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2">
          <PartyPopper className="h-5 w-5 text-yellow-500" />
          Badge Earned!
          <PartyPopper className="h-5 w-5 text-yellow-500 scale-x-[-1]" />
        </CardTitle>
        <CardDescription>
          {mentorName
            ? `${mentorName} earned a badge for helping you achieve your goal!`
            : 'Your mentor earned a badge for this collaboration!'}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Badge Display */}
        <div className="flex flex-col items-center gap-4">
          {/* Animated Badge Icon */}
          <div
            className={cn(
              'relative flex items-center justify-center',
              isAnimating && 'animate-bounce-slow'
            )}
          >
            {/* Glow Effect */}
            <div
              className={cn(
                'absolute inset-0 rounded-full',
                isAnimating && 'animate-pulse-glow'
              )}
              style={{
                background: 'radial-gradient(circle, rgba(234,179,8,0.3) 0%, transparent 70%)',
                transform: 'scale(1.5)',
              }}
            />

            {/* Badge Circle */}
            <div className="relative h-28 w-28 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center shadow-lg">
              <span className="text-5xl">{badgeDefinition.icon}</span>

              {/* Sparkle Effects */}
              {isAnimating && (
                <>
                  <Sparkles className="absolute -top-2 -right-2 h-6 w-6 text-yellow-400 animate-ping" />
                  <Star className="absolute -bottom-1 -left-1 h-5 w-5 text-yellow-400 animate-pulse" />
                  <Sparkles className="absolute top-0 -left-3 h-4 w-4 text-yellow-400 animate-ping delay-300" />
                </>
              )}
            </div>
          </div>

          {/* Badge Name */}
          <div className="text-center space-y-1">
            <h3 className="text-xl font-bold">{badge.label}</h3>
            <p className="text-sm text-muted-foreground">{badgeDefinition.description}</p>
          </div>

          {/* Badge Details */}
          <div className="w-full max-w-xs bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Badge Type</span>
              <span className="font-medium capitalize">{badge.type.replace(/_/g, ' ')}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Earned</span>
              <span className="font-medium">
                {new Date(badge.earned_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            </div>
          </div>
        </div>

        {/* Acknowledge Button */}
        {onAcknowledge && (
          <Button onClick={onAcknowledge} className="w-full" size="lg">
            <Sparkles className="h-4 w-4 mr-2" />
            Awesome!
          </Button>
        )}
      </CardContent>

      {/* CSS for animations */}
      <style jsx global>{`
        @keyframes confetti {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(400px) rotate(720deg);
            opacity: 0;
          }
        }

        @keyframes bounce-slow {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        @keyframes pulse-glow {
          0%,
          100% {
            opacity: 0.5;
            transform: scale(1.5);
          }
          50% {
            opacity: 0.8;
            transform: scale(1.8);
          }
        }

        .animate-confetti {
          animation: confetti linear forwards;
        }

        .animate-bounce-slow {
          animation: bounce-slow 1s ease-in-out infinite;
        }

        .animate-pulse-glow {
          animation: pulse-glow 2s ease-in-out infinite;
        }
      `}</style>
    </Card>
  )
}
