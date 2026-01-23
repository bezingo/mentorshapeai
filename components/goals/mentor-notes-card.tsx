'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Sparkles, Edit2, Save, X } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface MentorNotesCardProps {
  goalId: string
  mentorNotes: string | null
  mentorNotesGeneratedAt: string | null
  onUpdate?: () => void
}

export function MentorNotesCard({
  goalId,
  mentorNotes,
  mentorNotesGeneratedAt,
  onUpdate,
}: MentorNotesCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedNotes, setEditedNotes] = useState<string>(mentorNotes || '')
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/ai/goal-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goal_id: goalId,
          analysis_type: 'mentor_notes',
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error?.message || 'Failed to generate mentor notes')
      }

      return res.json()
    },
    onSuccess: (data) => {
      setEditedNotes(data.data.mentor_notes)
      setIsEditing(false)
      queryClient.invalidateQueries({ queryKey: ['goal', goalId] })
      toast({
        title: 'Mentor Notes Generated',
        description: 'Mentor notes have been generated successfully.',
      })
      onUpdate?.()
    },
    onError: (error: Error) => {
      toast({
        title: 'Error Generating Notes',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  const saveMutation = useMutation({
    mutationFn: async (notes: string) => {
      const res = await fetch(`/api/goals/${goalId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mentor_notes: notes,
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error?.message || 'Failed to save mentor notes')
      }

      return res.json()
    },
    onSuccess: () => {
      setIsEditing(false)
      queryClient.invalidateQueries({ queryKey: ['goal', goalId] })
      toast({
        title: 'Mentor Notes Saved',
        description: 'Your changes have been saved.',
      })
      onUpdate?.()
    },
    onError: (error: Error) => {
      toast({
        title: 'Error Saving Notes',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  if (!mentorNotes && !isEditing) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Mentor Notes</CardTitle>
          <CardDescription>
            AI-generated comprehensive notes to help mentors understand your goal and provide effective guidance
          </CardDescription>
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
                Generate Mentor Notes
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Mentor Notes</CardTitle>
            <CardDescription>
              {mentorNotesGeneratedAt &&
                `Generated ${new Date(mentorNotesGeneratedAt).toLocaleDateString()}`}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {!isEditing ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditedNotes(mentorNotes || '')
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
                    setEditedNotes(mentorNotes || '')
                  }}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={() => saveMutation.mutate(editedNotes)}
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
        {isEditing ? (
          <Textarea
            value={editedNotes}
            onChange={(e) => setEditedNotes(e.target.value)}
            className="min-h-[300px] font-mono text-sm"
            placeholder="Enter mentor notes (supports Markdown)..."
          />
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:font-semibold prose-h1:text-xl prose-h2:text-lg prose-h3:text-base prose-p:text-muted-foreground prose-li:text-muted-foreground prose-strong:text-foreground prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {mentorNotes || ''}
            </ReactMarkdown>
          </div>
        )}
      </CardContent>
    </Card>
  )
}


