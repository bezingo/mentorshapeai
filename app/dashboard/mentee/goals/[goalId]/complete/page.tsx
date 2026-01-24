'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Target,
  PenLine,
  Star,
  FileText,
  Share2,
  PartyPopper,
  Home,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  MentorRatingForm,
  CompletionSummaryCard,
  LinkedInShareCard,
  BadgeAwardCard,
  type CompletionSummaryData,
  type BadgeData,
} from '@/components/completion'

/**
 * Wizard step definition
 */
interface WizardStep {
  id: number
  title: string
  description: string
  icon: React.ElementType
}

const WIZARD_STEPS: WizardStep[] = [
  { id: 1, title: 'Confirm', description: 'Confirm goal completion', icon: CheckCircle2 },
  { id: 2, title: 'Reflect', description: 'Write your reflection', icon: PenLine },
  { id: 3, title: 'Rate', description: 'Rate your mentor', icon: Star },
  { id: 4, title: 'Summary', description: 'View your journey', icon: FileText },
  { id: 5, title: 'Share', description: 'Share your achievement', icon: Share2 },
]

/**
 * Goal data structure
 */
interface GoalData {
  id: string
  title: string
  description: string | null
  status: string
  category: string | null
  success_definition: string | null
  duration_days: number | null
}

/**
 * Collaboration data structure
 */
interface CollaborationData {
  id: string
  mentor_profile_id: string
  mentor_profile: {
    id: string
    display_name: string | null
    avatar_url: string | null
  } | null
}

/**
 * Completion data structure
 */
interface CompletionData {
  id: string
  mentee_reflection: string | null
  rating: number | null
  completed_at: string | null
  confirmed_at: string | null
  final_summary: string | null
  linkedin_post_text: string | null
}

/**
 * GoalCompletionWizard - 5-step wizard for completing a goal
 */
export default function GoalCompletionWizardPage({
  params,
}: {
  params: Promise<{ goalId: string }>
}) {
  const router = useRouter()
  const [goalId, setGoalId] = useState<string | null>(null)
  const [currentStep, setCurrentStep] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Goal and collaboration data
  const [goal, setGoal] = useState<GoalData | null>(null)
  const [collaboration, setCollaboration] = useState<CollaborationData | null>(null)
  const [completion, setCompletion] = useState<CompletionData | null>(null)

  // Form data
  const [reflection, setReflection] = useState('')
  const [rating, setRating] = useState(0)
  const [feedback, setFeedback] = useState('')

  // Generated content
  const [summary, setSummary] = useState<CompletionSummaryData | null>(null)
  const [linkedInPost, setLinkedInPost] = useState<{
    postText: string
    postTextClean: string
    hashtags: string[]
  } | null>(null)
  const [badge, setBadge] = useState<BadgeData | null>(null)

  // Loading states for async operations
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false)
  const [isGeneratingLinkedIn, setIsGeneratingLinkedIn] = useState(false)

  // Extract goalId from params
  useEffect(() => {
    params.then(({ goalId }) => setGoalId(goalId))
  }, [params])

  // Load goal data
  const loadGoalData = useCallback(async () => {
    if (!goalId) return

    setIsLoading(true)
    setError(null)

    try {
      // Fetch goal details
      const goalResponse = await fetch(`/api/goals/${goalId}`)
      if (!goalResponse.ok) {
        const errorData = await goalResponse.json()
        throw new Error(errorData.error?.message || 'Failed to load goal')
      }
      const goalData = await goalResponse.json()
      setGoal(goalData.data)

      // Check if goal is already completed (has completion record)
      try {
        const completionResponse = await fetch(`/api/goals/${goalId}/complete`)
        if (completionResponse.ok) {
          const completionData = await completionResponse.json()
          setCompletion(completionData.data)
          if (completionData.data.mentee_reflection) {
            setReflection(completionData.data.mentee_reflection)
          }
          if (completionData.data.rating) {
            setRating(completionData.data.rating)
          }
        }
      } catch {
        // Completion doesn't exist yet, that's fine
      }

      // Try to fetch collaboration
      try {
        const collabResponse = await fetch(`/api/collaborations?goal_id=${goalId}&status=active,accepted`)
        if (collabResponse.ok) {
          const collabData = await collabResponse.json()
          if (collabData.data?.length > 0) {
            setCollaboration(collabData.data[0])
          }
        }
      } catch {
        // No collaboration, that's fine
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load goal data')
    } finally {
      setIsLoading(false)
    }
  }, [goalId])

  useEffect(() => {
    if (goalId) {
      loadGoalData()
    }
  }, [goalId, loadGoalData])

  // Step 1: Confirm completion
  const handleConfirmCompletion = async () => {
    if (!goalId) return

    setIsSaving(true)
    setError(null)

    try {
      const response = await fetch(`/api/goals/${goalId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      if (!response.ok) {
        const errorData = await response.json()
        // If already completed, just continue
        if (errorData.error?.code === 'COMPLETION_EXISTS' || errorData.error?.code === 'ALREADY_COMPLETED') {
          setCurrentStep(2)
          return
        }
        throw new Error(errorData.error?.message || 'Failed to complete goal')
      }

      const data = await response.json()
      setCompletion(data.data)
      setCurrentStep(2)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete goal')
    } finally {
      setIsSaving(false)
    }
  }

  // Step 2: Save reflection
  const handleSaveReflection = async () => {
    if (!goalId) return

    setIsSaving(true)
    setError(null)

    try {
      // Save reflection via PATCH to completion
      const response = await fetch(`/api/goals/${goalId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mentee_reflection: reflection }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        // If already exists, that's fine - just continue
        if (errorData.error?.code !== 'COMPLETION_EXISTS' && errorData.error?.code !== 'ALREADY_COMPLETED') {
          throw new Error(errorData.error?.message || 'Failed to save reflection')
        }
      }

      setCurrentStep(3)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save reflection')
    } finally {
      setIsSaving(false)
    }
  }

  // Step 3: Save rating
  const handleSaveRating = async () => {
    if (!goalId) return

    setIsSaving(true)
    setError(null)

    try {
      const response = await fetch(`/api/goals/${goalId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mentee_reflection: reflection,
          rating: rating,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        if (errorData.error?.code !== 'COMPLETION_EXISTS' && errorData.error?.code !== 'ALREADY_COMPLETED') {
          throw new Error(errorData.error?.message || 'Failed to save rating')
        }
      }

      // Move to summary step and trigger summary generation
      setCurrentStep(4)
      generateSummary()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save rating')
    } finally {
      setIsSaving(false)
    }
  }

  // Generate AI summary
  const generateSummary = async () => {
    if (!goalId) return

    setIsGeneratingSummary(true)

    try {
      // For now, we'll create a mock summary since we need to fetch it from the completion record
      // In production, this would fetch from /api/goals/[id]/completion/summary
      const completionResponse = await fetch(`/api/goals/${goalId}/complete`)
      if (completionResponse.ok) {
        const completionData = await completionResponse.json()
        if (completionData.data.final_summary) {
          // Parse the summary if it exists
          setSummary({
            final_summary: completionData.data.final_summary,
            key_achievements: [],
            skills_developed: [],
            journey_highlights: [],
            mentor_contribution: '',
            next_steps: [],
            overall_progress_rating: 4,
          })
        }
      }
    } catch {
      // Summary generation failed, but don't block progress
      console.error('Failed to generate summary')
    } finally {
      setIsGeneratingSummary(false)
    }
  }

  // Generate LinkedIn post
  const generateLinkedInPost = async () => {
    if (!goalId) return

    setIsGeneratingLinkedIn(true)

    try {
      const response = await fetch(`/api/goals/${goalId}/completion/linkedin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mentee_reflection: reflection }),
      })

      if (response.ok) {
        const data = await response.json()
        setLinkedInPost({
          postText: data.data.linkedin_post_text,
          postTextClean: data.data.linkedin_post_clean || data.data.linkedin_post_text,
          hashtags: data.data.hashtags || [],
        })
      }
    } catch {
      console.error('Failed to generate LinkedIn post')
    } finally {
      setIsGeneratingLinkedIn(false)
    }
  }

  // Handle moving to share step
  const handleGoToShare = () => {
    setCurrentStep(5)
    generateLinkedInPost()
  }

  // Regenerate LinkedIn post
  const handleRegenerateLinkedIn = async () => {
    await generateLinkedInPost()
  }

  // Navigation
  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSkipRating = () => {
    setCurrentStep(4)
    generateSummary()
  }

  // Render progress bar
  const renderProgressBar = () => (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        {WIZARD_STEPS.map((step, index) => {
          const StepIcon = step.icon
          const isCompleted = currentStep > step.id
          const isCurrent = currentStep === step.id

          return (
            <div key={step.id} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center transition-colors',
                    isCompleted && 'bg-green-500 text-white',
                    isCurrent && 'bg-primary text-primary-foreground',
                    !isCompleted && !isCurrent && 'bg-muted text-muted-foreground'
                  )}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    <StepIcon className="h-5 w-5" />
                  )}
                </div>
                <span
                  className={cn(
                    'text-xs mt-1 font-medium',
                    isCurrent ? 'text-foreground' : 'text-muted-foreground'
                  )}
                >
                  {step.title}
                </span>
              </div>
              {index < WIZARD_STEPS.length - 1 && (
                <div
                  className={cn(
                    'h-0.5 w-12 mx-2 transition-colors',
                    currentStep > step.id ? 'bg-green-500' : 'bg-muted'
                  )}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )

  // Render Step 1: Confirm
  const renderConfirmStep = () => (
    <Card>
      <CardHeader className="text-center">
        <div className="mx-auto mb-4">
          <div className="h-20 w-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto">
            <Target className="h-10 w-10 text-green-600 dark:text-green-400" />
          </div>
        </div>
        <CardTitle className="text-2xl">Ready to Complete Your Goal?</CardTitle>
        <CardDescription className="text-base">
          Congratulations on reaching this milestone! Let&apos;s mark your goal as complete.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Goal Summary */}
        <div className="bg-muted/50 rounded-lg p-4 space-y-2">
          <h3 className="font-semibold text-lg">{goal?.title}</h3>
          {goal?.description && (
            <p className="text-sm text-muted-foreground">{goal.description}</p>
          )}
          <div className="flex flex-wrap gap-2 pt-2">
            {goal?.category && (
              <Badge variant="secondary">{goal.category}</Badge>
            )}
            {goal?.duration_days && (
              <Badge variant="outline">{goal.duration_days} days</Badge>
            )}
          </div>
        </div>

        {/* Success Definition */}
        {goal?.success_definition && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">Success Definition</h4>
            <p className="text-sm p-3 bg-muted/30 rounded-lg">{goal.success_definition}</p>
          </div>
        )}

        {/* Collaboration Info */}
        {collaboration && (
          <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
              <Star className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-medium">
                Mentored by {collaboration.mentor_profile?.display_name || 'Your Mentor'}
              </p>
              <p className="text-xs text-muted-foreground">
                Your mentor will be notified of your completion
              </p>
            </div>
          </div>
        )}

        {/* Confirm Button */}
        <Button
          onClick={handleConfirmCompletion}
          disabled={isSaving}
          className="w-full"
          size="lg"
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Completing...
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Yes, Mark as Complete
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )

  // Render Step 2: Reflect
  const renderReflectStep = () => (
    <Card>
      <CardHeader className="text-center">
        <div className="mx-auto mb-4">
          <div className="h-20 w-20 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mx-auto">
            <PenLine className="h-10 w-10 text-purple-600 dark:text-purple-400" />
          </div>
        </div>
        <CardTitle className="text-2xl">Reflect on Your Journey</CardTitle>
        <CardDescription className="text-base">
          Take a moment to reflect on what you&apos;ve learned and accomplished
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <label htmlFor="reflection" className="text-sm font-medium">
            Your Reflection
          </label>
          <Textarea
            id="reflection"
            placeholder="What were your biggest takeaways? What challenges did you overcome? How have you grown?"
            value={reflection}
            onChange={(e) => setReflection(e.target.value)}
            rows={6}
            maxLength={2000}
            className="resize-none"
          />
          <p className="text-xs text-muted-foreground text-right">
            {reflection.length}/2000 characters
          </p>
        </div>

        {/* Prompts */}
        <div className="bg-muted/30 rounded-lg p-4 space-y-3">
          <p className="text-sm font-medium">Some things to consider:</p>
          <ul className="text-sm text-muted-foreground space-y-1.5">
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              What was the most valuable thing you learned?
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              How did your mentor help you succeed?
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              What would you do differently next time?
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              What are you most proud of?
            </li>
          </ul>
        </div>

        {/* Navigation */}
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleBack} className="flex-1">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Button
            onClick={handleSaveReflection}
            disabled={isSaving}
            className="flex-1"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                Continue
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )

  // Render Step 3: Rate
  const renderRateStep = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <div className="h-20 w-20 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center mx-auto">
              <Star className="h-10 w-10 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
          <CardTitle className="text-2xl">Rate Your Mentor</CardTitle>
          <CardDescription className="text-base">
            {collaboration?.mentor_profile?.display_name
              ? `How was your experience working with ${collaboration.mentor_profile.display_name}?`
              : 'Share your mentorship experience'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MentorRatingForm
            rating={rating}
            feedback={feedback}
            mentorName={collaboration?.mentor_profile?.display_name || undefined}
            onChange={({ rating: r, feedback: f }) => {
              setRating(r)
              setFeedback(f)
            }}
            compact
          />
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex gap-3">
        <Button variant="outline" onClick={handleBack} className="flex-1">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        {!collaboration && (
          <Button variant="ghost" onClick={handleSkipRating}>
            Skip
          </Button>
        )}
        <Button
          onClick={handleSaveRating}
          disabled={isSaving || Boolean(collaboration && rating === 0)}
          className="flex-1"
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              Continue
              <ArrowRight className="h-4 w-4 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  )

  // Render Step 4: Summary
  const renderSummaryStep = () => (
    <div className="space-y-6">
      <CompletionSummaryCard
        summary={summary}
        goalTitle={goal?.title}
        isLoading={isGeneratingSummary}
        compact
      />

      {/* Navigation */}
      <div className="flex gap-3">
        <Button variant="outline" onClick={handleBack} className="flex-1">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Button onClick={handleGoToShare} className="flex-1">
          Continue
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  )

  // Render Step 5: Share
  const renderShareStep = () => (
    <div className="space-y-6">
      {/* Celebration Header */}
      <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
        <CardContent className="py-8">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-2">
              <PartyPopper className="h-8 w-8 text-yellow-500" />
              <h2 className="text-2xl font-bold">Congratulations!</h2>
              <PartyPopper className="h-8 w-8 text-yellow-500 scale-x-[-1]" />
            </div>
            <p className="text-muted-foreground">
              You&apos;ve successfully completed your goal. Share your achievement with the world!
            </p>
          </div>
        </CardContent>
      </Card>

      {/* LinkedIn Share */}
      <LinkedInShareCard
        postText={linkedInPost?.postText}
        postTextClean={linkedInPost?.postTextClean}
        hashtags={linkedInPost?.hashtags}
        isGenerating={isGeneratingLinkedIn}
        onRegenerate={handleRegenerateLinkedIn}
        goalId={goalId || undefined}
      />

      {/* Badge (if awarded) */}
      {badge && (
        <BadgeAwardCard
          badge={badge}
          mentorName={collaboration?.mentor_profile?.display_name || undefined}
        />
      )}

      {/* Finish Button */}
      <div className="flex gap-3">
        <Button variant="outline" onClick={handleBack} className="flex-1">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Link href="/dashboard/mentee/goals" className="flex-1">
          <Button className="w-full bg-green-600 hover:bg-green-700">
            <Home className="h-4 w-4 mr-2" />
            Return to Goals
          </Button>
        </Link>
      </div>
    </div>
  )

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading your goal...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error && !goal) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
              <span className="text-destructive text-xl">!</span>
            </div>
            <h2 className="text-xl font-semibold">Something went wrong</h2>
            <p className="text-muted-foreground">{error}</p>
            <div className="flex gap-3 justify-center">
              <Link href="/dashboard/mentee/goals">
                <Button variant="outline">Back to Goals</Button>
              </Link>
              <Button onClick={loadGoalData}>Try Again</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href={`/dashboard/mentee/goals/${goalId}`}>
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Goal
            </Button>
          </Link>
          <span className="text-sm text-muted-foreground">
            Goal Completion Wizard
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Progress Bar */}
          {renderProgressBar()}

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 rounded-lg bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          )}

          {/* Step Content */}
          {currentStep === 1 && renderConfirmStep()}
          {currentStep === 2 && renderReflectStep()}
          {currentStep === 3 && renderRateStep()}
          {currentStep === 4 && renderSummaryStep()}
          {currentStep === 5 && renderShareStep()}
        </div>
      </main>
    </div>
  )
}
