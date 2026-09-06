import { redirect } from 'next/navigation'
import { getCurrentProfile, requireMentee } from '@/lib/auth-helpers'
import { createServiceClient } from '@/lib/supabase/service'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { PublicLinkManager } from '@/components/sharing/public-link-manager'
import { GoalDetailClient } from '@/components/goals/goal-detail-client'
import { SWOTCard } from '@/components/goals/swot-card'
import { SMARTCard } from '@/components/goals/smart-card'
import { MentorNotesCard } from '@/components/goals/mentor-notes-card'
import { DeleteGoalButton } from '@/components/goals/delete-goal-button'
import { GoalAdvisorDrawer } from '@/components/goals/goal-advisor-drawer'
import { GoalVersionHistory } from '@/components/goals/goal-version-history'
import Link from 'next/link'
import { ArrowLeft, Edit, Share2 } from 'lucide-react'

export default async function GoalDetailPage({
  params,
}: {
  params: Promise<{ goalId: string }>
}) {
  await requireMentee()
  const profile = await getCurrentProfile()

  if (!profile) {
    redirect('/sign-in')
  }

  const { goalId } = await params

  // Use service client to bypass RLS since we've already verified authorization
  const supabase = createServiceClient()
  const { data: goal, error } = await supabase
    .from('goals')
    .select('*')
    .eq('id', goalId)
    .eq('profile_id', profile.id)
    .single()

  if (error || !goal) {
    redirect('/dashboard/mentee/goals')
  }

  // Fetch milestones
  const { data: milestones } = await supabase
    .from('goal_milestones')
    .select('*')
    .eq('goal_id', goal.id)
    .order('target_date', { ascending: true })

  // Fetch collaborations
  const { data: collaborations } = await supabase
    .from('collaborations')
    .select('*')
    .eq('goal_id', goal.id)

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://mentorshape.com'
  const publicUrl = goal.public_slug
    ? `${baseUrl}/g/${goal.public_slug}`
    : null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/dashboard/mentee/goals">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Goals
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <GoalDetailClient
            goalId={goal.id}
            goalStatus={goal.status}
            aiShapedAt={goal.ai_shaped_at}
          />
          {goal.public_slug && (
            <Link href={`/g/${goal.public_slug}`} target="_blank">
              <Button variant="outline" size="sm" className="gap-2">
                <Share2 className="h-4 w-4" />
                Share Goal Page
              </Button>
            </Link>
          )}
          <Button variant="outline" size="sm" className="gap-2">
            <Edit className="h-4 w-4" />
            Edit Goal
          </Button>
          <DeleteGoalButton
            goalId={goal.id}
            hasActiveCollaborations={Boolean(
              collaborations && collaborations.some((c: any) => c.status === 'pending' || c.status === 'active')
            )}
          />
        </div>
      </div>

      <Card className="p-6">
        <div className="space-y-6">
          <div>
            <div className="flex items-start justify-between mb-2">
              <h1 className="text-3xl font-bold">{goal.title}</h1>
              <span className="text-xs px-3 py-1 rounded-full bg-muted">
                {goal.status}
              </span>
            </div>
            {goal.refined_goal_statement && (
              <p className="text-lg text-muted-foreground mt-2 font-medium">
                {goal.refined_goal_statement}
              </p>
            )}
            {goal.description && (
              <p className="text-lg text-muted-foreground mt-2">{goal.description}</p>
            )}
          </div>

          <Separator />

          {/* Public Link Management */}
          <div>
            <PublicLinkManager
              type="goal"
              currentSlug={goal.public_slug}
              entityId={goal.id}
              entityTitle={goal.title}
            />
          </div>

          <Separator />

          {/* Goal Details */}
          <div className="grid gap-6 md:grid-cols-2">
            {goal.category && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">
                  Category
                </h3>
                <p className="text-sm">{goal.category}</p>
              </div>
            )}

            {goal.duration_days && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">
                  Duration
                </h3>
                <p className="text-sm">{goal.duration_days} days</p>
              </div>
            )}
          </div>

          {goal.success_definition && (
            <div>
              <h3 className="text-lg font-semibold mb-2">Success Definition</h3>
              <p className="text-muted-foreground">{goal.success_definition}</p>
            </div>
          )}

          {/* Target (Success Definition) */}
          {goal.success_definition && (
            <div>
              <h3 className="text-lg font-semibold mb-2">Target</h3>
              <p className="text-muted-foreground">{goal.success_definition}</p>
            </div>
          )}

          {/* Challenges */}
          {goal.current_challenges && (
            <div>
              <h3 className="text-lg font-semibold mb-2">Current Challenges</h3>
              <p className="text-muted-foreground">{goal.current_challenges}</p>
            </div>
          )}

          {/* AI-Generated Mentor Questions */}
          {goal.suggested_mentor_questions && goal.suggested_mentor_questions.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-2">Suggested Mentor Questions</h3>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                {goal.suggested_mentor_questions.map((question: string, index: number) => (
                  <li key={index}>{question}</li>
                ))}
              </ul>
            </div>
          )}

          {/* AI-Generated Risks & Pitfalls */}
          {goal.risks_pitfalls && Array.isArray(goal.risks_pitfalls) && goal.risks_pitfalls.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-2">Risks & Pitfalls</h3>
              <div className="space-y-3">
                {goal.risks_pitfalls.map((risk: { risk: string; mitigation: string }, index: number) => (
                  <div key={index} className="p-3 rounded-lg border">
                    <p className="font-medium text-sm mb-1">Risk: {risk.risk}</p>
                    <p className="text-sm text-muted-foreground">Mitigation: {risk.mitigation}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Milestones */}
          {milestones && milestones.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Milestones</h3>
              <div className="space-y-2">
                {milestones.map((milestone) => (
                  <div
                    key={milestone.id}
                    className="flex items-center gap-3 p-3 rounded-lg border"
                  >
                    <div className="flex-1">
                      <p className="font-medium">{milestone.title}</p>
                      {milestone.description && (
                        <p className="text-sm text-muted-foreground">
                          {milestone.description}
                        </p>
                      )}
                      {milestone.target_date && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Target: {new Date(milestone.target_date).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <span className="text-xs px-2 py-1 rounded-full bg-muted">
                      {milestone.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Collaborations */}
          {collaborations && collaborations.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Collaborations</h3>
              <div className="space-y-2">
                {collaborations.map((collab) => (
                  <div
                    key={collab.id}
                    className="p-3 rounded-lg border flex items-center justify-between"
                  >
                    <div>
                      <p className="font-medium">Collaboration #{collab.id.slice(0, 8)}</p>
                      <p className="text-sm text-muted-foreground">
                        Status: {collab.status}
                      </p>
                    </div>
                    <Link href={`/dashboard/collaborations/${collab.id}`}>
                      <Button variant="ghost" size="sm">
                        View →
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* SWOT Analysis */}
      <SWOTCard
        goalId={goal.id}
        swotAnalysis={goal.swot_analysis as any}
        swotGeneratedAt={goal.swot_generated_at}
      />

      {/* SMART Framework */}
      <SMARTCard
        goalId={goal.id}
        smartFramework={goal.smart_framework as any}
        smartGeneratedAt={goal.smart_generated_at}
      />

      {/* Mentor Notes */}
      <MentorNotesCard
        goalId={goal.id}
        mentorNotes={goal.mentor_notes}
        mentorNotesGeneratedAt={goal.mentor_notes_generated_at}
      />
      
      {/* Version History */}
      <GoalVersionHistory goalId={goal.id} />
      
      {/* Goal Advisor Drawer - Floating Chat Button */}
      <GoalAdvisorDrawer 
        goalId={goal.id}
        goalTitle={goal.title}
      />
    </div>
  )
}

