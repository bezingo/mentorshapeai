'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  ArrowLeft, 
  Users,
  CheckCircle,
  Loader2,
  XCircle,
} from 'lucide-react'

interface Member {
  id: string
  role: string
  status: string
  profile: {
    id: string
    display_name: string | null
    avatar_url: string | null
    consent_given: boolean
  } | null
}

export default function NewPairPage() {
  const router = useRouter()
  const [members, setMembers] = useState<Member[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [menteeId, setMenteeId] = useState<string>('')
  const [mentorId, setMentorId] = useState<string>('')

  useEffect(() => {
    async function fetchMembers() {
      try {
        const response = await fetch('/api/counselor/members?status=active')
        if (response.ok) {
          const json = await response.json()
          setMembers(json.data.members || [])
        }
      } catch {
        // Ignore errors
      } finally {
        setIsLoading(false)
      }
    }

    fetchMembers()
  }, [])

  const mentees = members.filter((m) => {
    const profile = Array.isArray(m.profile) ? m.profile[0] : m.profile
    return m.role === 'mentee' && profile
  })
  
  const mentors = members.filter((m) => {
    const profile = Array.isArray(m.profile) ? m.profile[0] : m.profile
    return m.role === 'mentor' && profile
  })

  const selectedMentee = mentees.find((m) => {
    const profile = Array.isArray(m.profile) ? m.profile[0] : m.profile
    return profile?.id === menteeId
  })
  const selectedMentor = mentors.find((m) => {
    const profile = Array.isArray(m.profile) ? m.profile[0] : m.profile
    return profile?.id === mentorId
  })

  const handleCreatePair = async () => {
    if (!menteeId || !mentorId) return

    setIsCreating(true)
    setError(null)

    try {
      const response = await fetch('/api/counselor/pairs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mentee_profile_id: menteeId,
          mentor_profile_id: mentorId,
        }),
      })

      const json = await response.json()

      if (response.ok) {
        setSuccess(true)
        setTimeout(() => {
          router.push('/dashboard/counselor/pairs')
        }, 1500)
      } else {
        setError(json.error?.message || 'Failed to create pair')
      }
    } catch {
      setError('Failed to connect to server')
    } finally {
      setIsCreating(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/counselor/pairs">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Create Mentoring Pair</h1>
          <p className="text-muted-foreground">Match a mentee with an approved mentor</p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800 dark:text-green-100">Success</AlertTitle>
          <AlertDescription className="text-green-700 dark:text-green-200">
            Mentoring pair created successfully! Redirecting...
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Select Participants</CardTitle>
          <CardDescription>
            Choose a mentee and mentor from your organization
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Mentee Selection */}
          <div className="space-y-2">
            <Label htmlFor="mentee">Mentee (Student)</Label>
            <Select value={menteeId} onValueChange={setMenteeId}>
              <SelectTrigger id="mentee">
                <SelectValue placeholder="Select a mentee" />
              </SelectTrigger>
              <SelectContent>
                {mentees.length === 0 ? (
                  <div className="px-4 py-2 text-sm text-muted-foreground">
                    No mentees available
                  </div>
                ) : (
                  mentees.map((m) => {
                    const profile = Array.isArray(m.profile) ? m.profile[0] : m.profile
                    return (
                      <SelectItem key={m.id} value={profile?.id || ''}>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={profile?.avatar_url || undefined} />
                            <AvatarFallback>
                              {profile?.display_name?.[0]?.toUpperCase() || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <span>{profile?.display_name || 'Unknown'}</span>
                          {!profile?.consent_given && (
                            <span className="text-xs text-red-500">(no consent)</span>
                          )}
                        </div>
                      </SelectItem>
                    )
                  })
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Mentor Selection */}
          <div className="space-y-2">
            <Label htmlFor="mentor">Mentor</Label>
            <Select value={mentorId} onValueChange={setMentorId}>
              <SelectTrigger id="mentor">
                <SelectValue placeholder="Select a mentor" />
              </SelectTrigger>
              <SelectContent>
                {mentors.length === 0 ? (
                  <div className="px-4 py-2 text-sm text-muted-foreground">
                    No mentors available
                  </div>
                ) : (
                  mentors.map((m) => {
                    const profile = Array.isArray(m.profile) ? m.profile[0] : m.profile
                    return (
                      <SelectItem key={m.id} value={profile?.id || ''}>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={profile?.avatar_url || undefined} />
                            <AvatarFallback>
                              {profile?.display_name?.[0]?.toUpperCase() || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <span>{profile?.display_name || 'Unknown'}</span>
                        </div>
                      </SelectItem>
                    )
                  })
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Preview */}
          {selectedMentee && selectedMentor && (
            <div className="mt-6 p-4 border rounded-lg bg-muted/50">
              <p className="text-sm font-medium mb-3">Preview</p>
              <div className="flex items-center justify-center gap-8">
                <div className="text-center">
                  <Avatar className="h-16 w-16 mx-auto mb-2">
                    <AvatarImage src={(Array.isArray(selectedMentee.profile) ? selectedMentee.profile[0] : selectedMentee.profile)?.avatar_url || undefined} />
                    <AvatarFallback>
                      {(Array.isArray(selectedMentee.profile) ? selectedMentee.profile[0] : selectedMentee.profile)?.display_name?.[0]?.toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <p className="text-sm font-medium">
                    {(Array.isArray(selectedMentee.profile) ? selectedMentee.profile[0] : selectedMentee.profile)?.display_name}
                  </p>
                  <p className="text-xs text-muted-foreground">Mentee</p>
                </div>
                <Users className="h-6 w-6 text-muted-foreground" />
                <div className="text-center">
                  <Avatar className="h-16 w-16 mx-auto mb-2">
                    <AvatarImage src={(Array.isArray(selectedMentor.profile) ? selectedMentor.profile[0] : selectedMentor.profile)?.avatar_url || undefined} />
                    <AvatarFallback>
                      {(Array.isArray(selectedMentor.profile) ? selectedMentor.profile[0] : selectedMentor.profile)?.display_name?.[0]?.toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <p className="text-sm font-medium">
                    {(Array.isArray(selectedMentor.profile) ? selectedMentor.profile[0] : selectedMentor.profile)?.display_name}
                  </p>
                  <p className="text-xs text-muted-foreground">Mentor</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-4">
        <Button variant="outline" asChild>
          <Link href="/dashboard/counselor/pairs">Cancel</Link>
        </Button>
        <Button 
          onClick={handleCreatePair}
          disabled={!menteeId || !mentorId || isCreating || success}
        >
          {isCreating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <CheckCircle className="h-4 w-4 mr-2" />
              Create Pair
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
