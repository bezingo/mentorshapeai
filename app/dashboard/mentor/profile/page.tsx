'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { ArrowLeft, ExternalLink, Loader2, Save, X } from 'lucide-react'

interface MentorProfile {
  display_name: string
  headline: string
  bio: string
  public_handle: string
  expertise_areas: string[]
  languages: string[]
  timezone: string
  years_of_experience: number
}

const EXPERTISE_SUGGESTIONS = [
  'Career Coaching', 'Technical Mentoring', 'Leadership Development',
  'Startup Guidance', 'Product Management', 'Engineering Management',
  'UX/UI Design', 'Data Science', 'Marketing Strategy', 'Sales',
  'Business Development', 'Entrepreneurship', 'Personal Branding',
  'Interview Preparation', 'Resume Review', 'Networking'
]

export default function MentorProfilePage() {
  const [profile, setProfile] = useState<MentorProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [newExpertise, setNewExpertise] = useState('')
  const { toast } = useToast()

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/profile/me')
      if (response.ok) {
        const data = await response.json()
        setProfile({
          display_name: data.data.display_name || '',
          headline: data.data.headline || '',
          bio: data.data.bio || '',
          public_handle: data.data.public_handle || '',
          expertise_areas: data.data.expertise_areas || [],
          languages: data.data.languages || [],
          timezone: data.data.timezone || 'UTC',
          years_of_experience: data.data.years_of_experience || 0
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load profile',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    if (!profile) return

    setIsSaving(true)
    try {
      const response = await fetch('/api/profile/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: profile.display_name,
          headline: profile.headline,
          bio: profile.bio,
          expertise_areas: profile.expertise_areas,
          languages: profile.languages,
          timezone: profile.timezone,
          years_of_experience: profile.years_of_experience
        })
      })

      if (response.ok) {
        toast({
          title: 'Profile Updated',
          description: 'Your mentor profile has been saved.'
        })
      } else {
        throw new Error('Failed to save')
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save profile',
        variant: 'destructive'
      })
    } finally {
      setIsSaving(false)
    }
  }

  const addExpertise = (expertise: string) => {
    if (!profile || profile.expertise_areas.includes(expertise)) return
    setProfile({
      ...profile,
      expertise_areas: [...profile.expertise_areas, expertise]
    })
    setNewExpertise('')
  }

  const removeExpertise = (expertise: string) => {
    if (!profile) return
    setProfile({
      ...profile,
      expertise_areas: profile.expertise_areas.filter(e => e !== expertise)
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Failed to load profile</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/mentor">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Edit Mentor Profile</h1>
            <p className="text-muted-foreground">
              Update your public mentor profile information
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {profile.public_handle && (
            <Link href={`/m/${profile.public_handle}`} target="_blank">
              <Button variant="outline" size="sm">
                <ExternalLink className="h-4 w-4 mr-2" />
                View Public Profile
              </Button>
            </Link>
          )}
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Changes
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>
              Your name and headline shown on your profile
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="display_name">Display Name</Label>
              <Input
                id="display_name"
                value={profile.display_name}
                onChange={(e) => setProfile({ ...profile, display_name: e.target.value })}
                placeholder="Your name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="headline">Headline</Label>
              <Input
                id="headline"
                value={profile.headline}
                onChange={(e) => setProfile({ ...profile, headline: e.target.value })}
                placeholder="e.g., Senior Engineer at Google | Career Coach"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="years">Years of Experience</Label>
              <Input
                id="years"
                type="number"
                min={0}
                max={50}
                value={profile.years_of_experience}
                onChange={(e) => setProfile({ ...profile, years_of_experience: parseInt(e.target.value) || 0 })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Bio */}
        <Card>
          <CardHeader>
            <CardTitle>Bio</CardTitle>
            <CardDescription>
              Tell mentees about yourself and your experience
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={profile.bio}
              onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
              placeholder="Write about your background, experience, and what you can help mentees with..."
              className="min-h-[200px]"
            />
            <p className="text-xs text-muted-foreground mt-2">
              {profile.bio.length}/1000 characters
            </p>
          </CardContent>
        </Card>

        {/* Expertise Areas */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Expertise Areas</CardTitle>
            <CardDescription>
              Areas where you can mentor others
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {profile.expertise_areas.map((expertise) => (
                <Badge key={expertise} variant="secondary" className="gap-1">
                  {expertise}
                  <button
                    onClick={() => removeExpertise(expertise)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>

            <div className="flex gap-2">
              <Input
                value={newExpertise}
                onChange={(e) => setNewExpertise(e.target.value)}
                placeholder="Add custom expertise..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newExpertise.trim()) {
                    e.preventDefault()
                    addExpertise(newExpertise.trim())
                  }
                }}
              />
              <Button
                variant="outline"
                onClick={() => newExpertise.trim() && addExpertise(newExpertise.trim())}
                disabled={!newExpertise.trim()}
              >
                Add
              </Button>
            </div>

            <div>
              <p className="text-sm text-muted-foreground mb-2">Suggestions:</p>
              <div className="flex flex-wrap gap-2">
                {EXPERTISE_SUGGESTIONS
                  .filter(s => !profile.expertise_areas.includes(s))
                  .slice(0, 8)
                  .map((suggestion) => (
                    <Badge
                      key={suggestion}
                      variant="outline"
                      className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                      onClick={() => addExpertise(suggestion)}
                    >
                      + {suggestion}
                    </Badge>
                  ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
