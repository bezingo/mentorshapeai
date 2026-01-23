import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import Image from 'next/image'
import { Star } from 'lucide-react'

export default async function PublicGoalPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const supabase = await createClient()
  const { slug } = await params
  
  const { data: goal, error } = await supabase
    .from('goals')
    .select(`
      *,
      profiles:profile_id (
        id,
        display_name,
        headline,
        avatar_url
      )
    `)
    .eq('public_slug', slug)
    .eq('status', 'active')
    .single()

  if (error || !goal) {
    notFound()
  }

  const { data: milestones } = await supabase
    .from('goal_milestones')
    .select('*')
    .eq('goal_id', goal.id)
    .order('target_date', { ascending: true })

  // Fetch profile work experiences and educations for display
  const [workExpResult, educationsResult] = await Promise.all([
    supabase
      .from('work_experiences')
      .select('company, title, start_date, end_date, is_current')
      .eq('profile_id', goal.profile_id)
      .order('start_date', { ascending: false })
      .limit(1),
    supabase
      .from('educations')
      .select('institution, degree, start_date, end_date')
      .eq('profile_id', goal.profile_id)
      .order('start_date', { ascending: false })
      .limit(1),
  ])

  const currentWork = workExpResult.data?.[0]
  const currentEducation = educationsResult.data?.[0]

  // Star rating component (placeholder - 3 stars as shown in reference)
  const StarRating = ({ rating }: { rating: number }) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating
                ? 'fill-yellow-400 text-yellow-400'
                : 'fill-gray-300 text-gray-300'
            }`}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-2xl px-4 py-12">
        {/* Goal Info Card - Top Section */}
        <Card className="p-8 mb-6">
          <div className="space-y-6">
            <div>
              <h1 className="text-4xl font-bold mb-2">{goal.title}</h1>
              {goal.description && (
                <p className="text-lg text-muted-foreground">{goal.description}</p>
              )}
              {goal.category && (
                <span className="inline-block mt-3 px-3 py-1 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 text-sm font-medium">
                  {goal.category}
                </span>
              )}
            </div>

            {goal.current_challenges && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">
                  Current Challenges
                </h3>
                <p className="text-muted-foreground">{goal.current_challenges}</p>
              </div>
            )}

            {goal.success_definition && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Target</h3>
                <p className="text-muted-foreground">{goal.success_definition}</p>
              </div>
            )}
          </div>
        </Card>

        {/* Mentee Profile Card - Middle Section */}
        <Card className="p-8 mb-6">
          <div className="flex flex-col items-center text-center">
            {goal.profiles?.avatar_url ? (
              <Image
                src={goal.profiles.avatar_url}
                alt={goal.profiles.display_name || 'Mentee'}
                width={80}
                height={80}
                className="rounded-full mb-4"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-muted mb-4 flex items-center justify-center">
                <span className="text-2xl font-bold">
                  {goal.profiles?.display_name?.[0]?.toUpperCase() || 'M'}
                </span>
              </div>
            )}

            <h1 className="text-2xl font-bold mb-1">
              {goal.profiles?.display_name || 'Anonymous'}
            </h1>

            {goal.profiles?.headline && (
              <p className="text-sm text-muted-foreground mb-3">
                {goal.profiles.headline}
              </p>
            )}

            {/* Company and University */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
              {currentWork && (
                <span>{currentWork.company}</span>
              )}
              {currentWork && currentEducation && <span>•</span>}
              {currentEducation && (
                <span>{currentEducation.institution}</span>
              )}
            </div>

            {/* Role Badge */}
            <div className="mb-3">
              <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                I am a mentee
              </span>
            </div>

            {/* Star Rating */}
            <div className="mb-6">
              <StarRating rating={3} />
            </div>
          </div>
        </Card>

        {/* Goal Details - Bottom Section */}
        <Card className="p-8">
          <div className="space-y-6">
            {milestones && milestones.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">My Goals</h3>
                  <span className="text-xs text-muted-foreground">Update 5 days ago</span>
                </div>
                <div className="space-y-2">
                  {milestones.map((milestone) => (
                    <div
                      key={milestone.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-muted"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-primary">{milestone.title}</p>
                        {milestone.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {milestone.description}
                          </p>
                        )}
                      </div>
                      <span className="text-xs px-2 py-1 rounded-full bg-background">
                        {milestone.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SWOT Summary */}
            {goal.swot_analysis && (
              <div>
                <h3 className="text-lg font-semibold mb-3">SWOT Analysis</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <h4 className="font-medium text-green-600 dark:text-green-400 mb-2">
                      Strengths
                    </h4>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                      {(goal.swot_analysis as any).strengths?.slice(0, 2).map((s: string, i: number) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-red-600 dark:text-red-400 mb-2">
                      Weaknesses
                    </h4>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                      {(goal.swot_analysis as any).weaknesses?.slice(0, 2).map((w: string, i: number) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* SMART Summary */}
            {goal.smart_framework && (
              <div>
                <h3 className="text-lg font-semibold mb-3">SMART Framework</h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium">Specific: </span>
                    <span className="text-muted-foreground">
                      {(goal.smart_framework as any).specific?.substring(0, 100)}...
                    </span>
                  </div>
                  <div>
                    <span className="font-medium">Measurable: </span>
                    <span className="text-muted-foreground">
                      {(goal.smart_framework as any).measurable?.substring(0, 100)}...
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Mentor Notes Preview */}
            {goal.mentor_notes && (
              <div>
                <h3 className="text-lg font-semibold mb-2">Mentor Notes</h3>
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {goal.mentor_notes.substring(0, 200)}...
                </p>
              </div>
            )}

            {/* CTA */}
            <div className="pt-6">
              <Button size="lg" className="w-full bg-green-600 hover:bg-green-700">
                Start Collaboration
              </Button>
              <p className="text-xs text-center text-muted-foreground mt-2">
                Sign in as a mentor to start collaborating on this goal
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
