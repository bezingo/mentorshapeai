'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Loader2, Sparkles, Edit2, Save, X } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { SMARTFramework } from '@/lib/ai/goal-analysis'

interface SMARTCardProps {
  goalId: string
  smartFramework: SMARTFramework | null
  smartGeneratedAt: string | null
  onUpdate?: () => void
}

export function SMARTCard({ goalId, smartFramework, smartGeneratedAt, onUpdate }: SMARTCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedSmart, setEditedSmart] = useState<SMARTFramework | null>(smartFramework)
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/ai/goal-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goal_id: goalId,
          analysis_type: 'smart',
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error?.message || 'Failed to generate SMART framework')
      }

      return res.json()
    },
    onSuccess: (data) => {
      setEditedSmart(data.data.smart_framework)
      setIsEditing(false)
      queryClient.invalidateQueries({ queryKey: ['goal', goalId] })
      toast({
        title: 'SMART Framework Generated',
        description: 'Your SMART framework has been generated successfully.',
      })
      onUpdate?.()
    },
    onError: (error: Error) => {
      toast({
        title: 'Error Generating SMART',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  const saveMutation = useMutation({
    mutationFn: async (smart: SMARTFramework) => {
      const res = await fetch(`/api/goals/${goalId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          smart_framework: smart,
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error?.message || 'Failed to save SMART framework')
      }

      return res.json()
    },
    onSuccess: () => {
      setIsEditing(false)
      queryClient.invalidateQueries({ queryKey: ['goal', goalId] })
      toast({
        title: 'SMART Framework Saved',
        description: 'Your changes have been saved.',
      })
      onUpdate?.()
    },
    onError: (error: Error) => {
      toast({
        title: 'Error Saving SMART',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  const updateField = (field: keyof SMARTFramework, value: string) => {
    if (!editedSmart) return
    setEditedSmart({
      ...editedSmart,
      [field]: value,
    })
  }

  if (!smartFramework && !isEditing) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>SMART Framework</CardTitle>
          <CardDescription>Break down your goal into Specific, Measurable, Achievable, Relevant, Time-bound criteria</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
            className="w-full"
          >
            {generateMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate SMART Framework
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    )
  }

  const displaySmart = editedSmart || smartFramework

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>SMART Framework</CardTitle>
            <CardDescription>
              {smartGeneratedAt &&
                `Generated ${new Date(smartGeneratedAt).toLocaleDateString()}`}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {!isEditing ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditedSmart(displaySmart)
                    setIsEditing(true)
                  }}
                >
                  <Edit2 className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => generateMutation.mutate()}
                  disabled={generateMutation.isPending}
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Regenerate
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsEditing(false)
                    setEditedSmart(displaySmart)
                  }}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={() => editedSmart && saveMutation.mutate(editedSmart)}
                  disabled={saveMutation.isPending}
                >
                  {saveMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {displaySmart && (
          <div className="space-y-4">
            {/* Specific */}
            <div className="space-y-2">
              <Label className="font-semibold text-blue-600 dark:text-blue-400">
                S - Specific
              </Label>
              {isEditing ? (
                <Textarea
                  value={editedSmart?.specific || ''}
                  onChange={(e) => updateField('specific', e.target.value)}
                  className="min-h-[100px]"
                  placeholder="What exactly needs to be achieved?"
                />
              ) : (
                <p className="text-sm text-muted-foreground">{displaySmart.specific}</p>
              )}
            </div>

            {/* Measurable */}
            <div className="space-y-2">
              <Label className="font-semibold text-green-600 dark:text-green-400">
                M - Measurable
              </Label>
              {isEditing ? (
                <Textarea
                  value={editedSmart?.measurable || ''}
                  onChange={(e) => updateField('measurable', e.target.value)}
                  className="min-h-[100px]"
                  placeholder="How will success be measured?"
                />
              ) : (
                <p className="text-sm text-muted-foreground">{displaySmart.measurable}</p>
              )}
            </div>

            {/* Achievable */}
            <div className="space-y-2">
              <Label className="font-semibold text-purple-600 dark:text-purple-400">
                A - Achievable
              </Label>
              {isEditing ? (
                <Textarea
                  value={editedSmart?.achievable || ''}
                  onChange={(e) => updateField('achievable', e.target.value)}
                  className="min-h-[100px]"
                  placeholder="Is this goal realistic and attainable?"
                />
              ) : (
                <p className="text-sm text-muted-foreground">{displaySmart.achievable}</p>
              )}
            </div>

            {/* Relevant */}
            <div className="space-y-2">
              <Label className="font-semibold text-orange-600 dark:text-orange-400">
                R - Relevant
              </Label>
              {isEditing ? (
                <Textarea
                  value={editedSmart?.relevant || ''}
                  onChange={(e) => updateField('relevant', e.target.value)}
                  className="min-h-[100px]"
                  placeholder="Why does this goal matter?"
                />
              ) : (
                <p className="text-sm text-muted-foreground">{displaySmart.relevant}</p>
              )}
            </div>

            {/* Time-bound */}
            <div className="space-y-2">
              <Label className="font-semibold text-red-600 dark:text-red-400">
                T - Time-bound
              </Label>
              {isEditing ? (
                <Textarea
                  value={editedSmart?.time_bound || ''}
                  onChange={(e) => updateField('time_bound', e.target.value)}
                  className="min-h-[100px]"
                  placeholder="What is the timeline and deadline?"
                />
              ) : (
                <p className="text-sm text-muted-foreground">{displaySmart.time_bound}</p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}


