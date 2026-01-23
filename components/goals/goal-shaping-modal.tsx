'use client'

import { useState, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Loader2, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react'

interface Milestone {
  id?: string
  title: string
  description: string
  target_date: string
  relative_day_offset?: number
}

interface RiskPitfall {
  risk: string
  mitigation: string
}

interface GoalShapedData {
  refined_goal_statement: string
  success_definition?: string
  milestones: Milestone[]
  suggested_mentor_questions: string[]
  risks_or_pitfalls: RiskPitfall[]
  ai_shaped_at?: string
}

interface GoalShapingModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  goalId: string
  initialData?: GoalShapedData
  onSuccess?: () => void
}

export function GoalShapingModal({
  open,
  onOpenChange,
  goalId,
  initialData,
  onSuccess,
}: GoalShapingModalProps) {
  const [refinedGoalStatement, setRefinedGoalStatement] = useState('')
  const [successDefinition, setSuccessDefinition] = useState('')
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([])
  const [risksPitfalls, setRisksPitfalls] = useState<RiskPitfall[]>([])
  const [expandedSections, setExpandedSections] = useState({
    milestones: true,
    questions: true,
    risks: false,
  })

  // Initialize with initialData if provided
  useEffect(() => {
    if (initialData) {
      setRefinedGoalStatement(initialData.refined_goal_statement || '')
      setSuccessDefinition(initialData.success_definition || '')
      setMilestones(initialData.milestones || [])
      setSuggestedQuestions(initialData.suggested_mentor_questions || [])
      setRisksPitfalls(initialData.risks_or_pitfalls || [])
    }
  }, [initialData])

  const saveMutation = useMutation({
    mutationFn: async () => {
      // Update goal with refined statement and questions
      const goalRes = await fetch(`/api/goals/${goalId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          refined_goal_statement: refinedGoalStatement,
          success_definition: successDefinition || undefined,
          suggested_mentor_questions: suggestedQuestions,
          risks_pitfalls: risksPitfalls,
        }),
      })

      if (!goalRes.ok) {
        const errorData = await goalRes.json()
        throw new Error(errorData.error?.message || 'Failed to update goal')
      }

      // Update milestones using bulk update endpoint
      const milestonesRes = await fetch(`/api/goals/${goalId}/milestones`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          milestones: milestones.map((m) => ({
            id: m.id,
            title: m.title,
            description: m.description || null,
            target_date: m.target_date,
            status: 'pending', // Default status for AI-generated milestones
          })),
        }),
      })

      if (!milestonesRes.ok) {
        const errorData = await milestonesRes.json()
        throw new Error(errorData.error?.message || 'Failed to update milestones')
      }
    },
    onSuccess: () => {
      alert('Goal shaped successfully! Your goal has been updated with AI-generated content.')
      onOpenChange(false)
      onSuccess?.()
    },
    onError: (error: Error) => {
      alert(`Error saving goal: ${error.message || 'Failed to save changes'}`)
    },
  })

  const updateMilestone = (index: number, field: keyof Milestone, value: string) => {
    setMilestones((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
  }

  const deleteMilestone = (index: number) => {
    setMilestones((prev) => prev.filter((_, i) => i !== index))
  }

  const addMilestone = () => {
    setMilestones((prev) => [
      ...prev,
      {
        title: '',
        description: '',
        target_date: new Date().toISOString().split('T')[0],
      },
    ])
  }

  const updateQuestion = (index: number, value: string) => {
    setSuggestedQuestions((prev) => {
      const updated = [...prev]
      updated[index] = value
      return updated
    })
  }

  const deleteQuestion = (index: number) => {
    setSuggestedQuestions((prev) => prev.filter((_, i) => i !== index))
  }

  const addQuestion = () => {
    setSuggestedQuestions((prev) => [...prev, ''])
  }

  const updateRisk = (index: number, field: 'risk' | 'mitigation', value: string) => {
    setRisksPitfalls((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
  }

  const deleteRisk = (index: number) => {
    setRisksPitfalls((prev) => prev.filter((_, i) => i !== index))
  }

  const addRisk = () => {
    setRisksPitfalls((prev) => [...prev, { risk: '', mitigation: '' }])
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Review AI-Shaped Goal</DialogTitle>
          <DialogDescription>
            Review and edit the AI-generated content for your goal. You can modify any field before
            saving.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Refined Goal Statement */}
          <div>
            <Label htmlFor="refined-goal">Refined Goal Statement</Label>
            <Textarea
              id="refined-goal"
              value={refinedGoalStatement}
              onChange={(e) => setRefinedGoalStatement(e.target.value)}
              placeholder="AI-generated refined goal statement..."
              maxLength={500}
              className="mt-2 min-h-[100px]"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {refinedGoalStatement.length}/500 characters
            </p>
          </div>

          {/* Success Definition */}
          {successDefinition && (
            <div>
              <Label htmlFor="success-definition">Success Definition</Label>
              <Textarea
                id="success-definition"
                value={successDefinition}
                onChange={(e) => setSuccessDefinition(e.target.value)}
                placeholder="How will you know you've achieved this goal?"
                className="mt-2 min-h-[80px]"
              />
            </div>
          )}

          <Separator />

          {/* Milestones */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Milestones</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setExpandedSections((prev) => ({ ...prev, milestones: !prev.milestones }))
                  }
                >
                  {expandedSections.milestones ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </CardHeader>
            {expandedSections.milestones && (
              <CardContent className="space-y-4">
                {milestones.map((milestone, index) => (
                  <div key={index} className="p-4 border rounded-lg space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-3">
                        <div>
                          <Label>Title</Label>
                          <Input
                            value={milestone.title}
                            onChange={(e) => updateMilestone(index, 'title', e.target.value)}
                            placeholder="Milestone title"
                            maxLength={200}
                          />
                        </div>
                        <div>
                          <Label>Description</Label>
                          <Textarea
                            value={milestone.description}
                            onChange={(e) => updateMilestone(index, 'description', e.target.value)}
                            placeholder="What needs to be achieved?"
                            maxLength={1000}
                            className="min-h-[80px]"
                          />
                        </div>
                        <div>
                          <Label>Target Date</Label>
                          <Input
                            type="date"
                            value={milestone.target_date}
                            onChange={(e) => updateMilestone(index, 'target_date', e.target.value)}
                          />
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteMilestone(index)}
                        className="ml-2"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                <Button variant="outline" onClick={addMilestone} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Milestone
                </Button>
              </CardContent>
            )}
          </Card>

          {/* Suggested Mentor Questions */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Suggested Mentor Questions</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setExpandedSections((prev) => ({ ...prev, questions: !prev.questions }))
                  }
                >
                  {expandedSections.questions ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </CardHeader>
            {expandedSections.questions && (
              <CardContent className="space-y-3">
                {suggestedQuestions.map((question, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <Textarea
                      value={question}
                      onChange={(e) => updateQuestion(index, e.target.value)}
                      placeholder="Question to ask your mentor..."
                      className="flex-1 min-h-[60px]"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteQuestion(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                {suggestedQuestions.length < 20 && (
                  <Button variant="outline" onClick={addQuestion} className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Question
                  </Button>
                )}
              </CardContent>
            )}
          </Card>

          {/* Risks and Pitfalls */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Risks & Pitfalls</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setExpandedSections((prev) => ({ ...prev, risks: !prev.risks }))
                  }
                >
                  {expandedSections.risks ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </CardHeader>
            {expandedSections.risks && (
              <CardContent className="space-y-4">
                {risksPitfalls.map((risk, index) => (
                  <div key={index} className="p-4 border rounded-lg space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-3">
                        <div>
                          <Label>Risk</Label>
                          <Textarea
                            value={risk.risk}
                            onChange={(e) => updateRisk(index, 'risk', e.target.value)}
                            placeholder="Potential obstacle or challenge"
                            className="min-h-[60px]"
                          />
                        </div>
                        <div>
                          <Label>Mitigation</Label>
                          <Textarea
                            value={risk.mitigation}
                            onChange={(e) => updateRisk(index, 'mitigation', e.target.value)}
                            placeholder="How to address or prevent this risk"
                            className="min-h-[60px]"
                          />
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteRisk(index)}
                        className="ml-2"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                <Button variant="outline" onClick={addRisk} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Risk
                </Button>
              </CardContent>
            )}
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Edit Manually
          </Button>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Accept & Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

