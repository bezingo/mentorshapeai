'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Sparkles, Edit2, Save, X } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { SWOTAnalysis } from '@/lib/ai/goal-analysis'

interface SWOTCardProps {
  goalId: string
  swotAnalysis: SWOTAnalysis | null
  swotGeneratedAt: string | null
  onUpdate?: () => void
}

export function SWOTCard({ goalId, swotAnalysis, swotGeneratedAt, onUpdate }: SWOTCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedSwot, setEditedSwot] = useState<SWOTAnalysis | null>(swotAnalysis)
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/ai/goal-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goal_id: goalId,
          analysis_type: 'swot',
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error?.message || 'Failed to generate SWOT analysis')
      }

      return res.json()
    },
    onSuccess: (data) => {
      setEditedSwot(data.data.swot_analysis)
      setIsEditing(false)
      queryClient.invalidateQueries({ queryKey: ['goal', goalId] })
      toast({
        title: 'SWOT Analysis Generated',
        description: 'Your SWOT analysis has been generated successfully.',
      })
      onUpdate?.()
    },
    onError: (error: Error) => {
      toast({
        title: 'Error Generating SWOT',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  const saveMutation = useMutation({
    mutationFn: async (swot: SWOTAnalysis) => {
      const res = await fetch(`/api/goals/${goalId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          swot_analysis: swot,
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error?.message || 'Failed to save SWOT analysis')
      }

      return res.json()
    },
    onSuccess: () => {
      setIsEditing(false)
      queryClient.invalidateQueries({ queryKey: ['goal', goalId] })
      toast({
        title: 'SWOT Analysis Saved',
        description: 'Your changes have been saved.',
      })
      onUpdate?.()
    },
    onError: (error: Error) => {
      toast({
        title: 'Error Saving SWOT',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  const updateCategory = (category: keyof SWOTAnalysis, index: number, value: string) => {
    if (!editedSwot) return
    setEditedSwot({
      ...editedSwot,
      [category]: editedSwot[category].map((item, i) => (i === index ? value : item)),
    })
  }

  const addItem = (category: keyof SWOTAnalysis) => {
    if (!editedSwot) return
    setEditedSwot({
      ...editedSwot,
      [category]: [...editedSwot[category], ''],
    })
  }

  const removeItem = (category: keyof SWOTAnalysis, index: number) => {
    if (!editedSwot) return
    setEditedSwot({
      ...editedSwot,
      [category]: editedSwot[category].filter((_, i) => i !== index),
    })
  }

  if (!swotAnalysis && !isEditing) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>SWOT Analysis</CardTitle>
          <CardDescription>Analyze strengths, weaknesses, opportunities, and threats</CardDescription>
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
                Generate SWOT Analysis
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    )
  }

  const displaySwot = editedSwot || swotAnalysis

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>SWOT Analysis</CardTitle>
            <CardDescription>
              {swotGeneratedAt &&
                `Generated ${new Date(swotGeneratedAt).toLocaleDateString()}`}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {!isEditing ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditedSwot(displaySwot)
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
                    setEditedSwot(displaySwot)
                  }}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={() => editedSwot && saveMutation.mutate(editedSwot)}
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
        {displaySwot && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Strengths */}
            <div className="space-y-2">
              <h3 className="font-semibold text-green-600 dark:text-green-400">Strengths</h3>
              {isEditing ? (
                <div className="space-y-2">
                  {editedSwot?.strengths.map((item, index) => (
                    <div key={index} className="flex gap-2">
                      <Textarea
                        value={item}
                        onChange={(e) => updateCategory('strengths', index, e.target.value)}
                        className="min-h-[60px]"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem('strengths', index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={() => addItem('strengths')}>
                    + Add Strength
                  </Button>
                </div>
              ) : (
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  {displaySwot.strengths.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              )}
            </div>

            {/* Weaknesses */}
            <div className="space-y-2">
              <h3 className="font-semibold text-red-600 dark:text-red-400">Weaknesses</h3>
              {isEditing ? (
                <div className="space-y-2">
                  {editedSwot?.weaknesses.map((item, index) => (
                    <div key={index} className="flex gap-2">
                      <Textarea
                        value={item}
                        onChange={(e) => updateCategory('weaknesses', index, e.target.value)}
                        className="min-h-[60px]"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem('weaknesses', index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={() => addItem('weaknesses')}>
                    + Add Weakness
                  </Button>
                </div>
              ) : (
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  {displaySwot.weaknesses.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              )}
            </div>

            {/* Opportunities */}
            <div className="space-y-2">
              <h3 className="font-semibold text-blue-600 dark:text-blue-400">Opportunities</h3>
              {isEditing ? (
                <div className="space-y-2">
                  {editedSwot?.opportunities.map((item, index) => (
                    <div key={index} className="flex gap-2">
                      <Textarea
                        value={item}
                        onChange={(e) => updateCategory('opportunities', index, e.target.value)}
                        className="min-h-[60px]"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem('opportunities', index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={() => addItem('opportunities')}>
                    + Add Opportunity
                  </Button>
                </div>
              ) : (
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  {displaySwot.opportunities.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              )}
            </div>

            {/* Threats */}
            <div className="space-y-2">
              <h3 className="font-semibold text-orange-600 dark:text-orange-400">Threats</h3>
              {isEditing ? (
                <div className="space-y-2">
                  {editedSwot?.threats.map((item, index) => (
                    <div key={index} className="flex gap-2">
                      <Textarea
                        value={item}
                        onChange={(e) => updateCategory('threats', index, e.target.value)}
                        className="min-h-[60px]"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem('threats', index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={() => addItem('threats')}>
                    + Add Threat
                  </Button>
                </div>
              ) : (
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  {displaySwot.threats.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}


