'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type Participant = {
  id: string
  role: string
  profile: {
    id: string
    display_name: string | null
    handle: string | null
  } | null
}

type MentorSuggestion = {
  mentorProfileId: string
  score: number
  reasons: string[]
}

type ProgramAdminClientProps = {
  orgId: string
  programId: string
  programName: string
  isAdmin: boolean
}

export function ProgramAdminClient({
  orgId,
  programId,
  programName,
  isAdmin,
}: ProgramAdminClientProps) {
  const [participants, setParticipants] = useState<Participant[]>([])
  const [suggestions, setSuggestions] = useState<MentorSuggestion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'mentee' | 'mentor'>('mentee')
  const [selfRole, setSelfRole] = useState<'mentee' | 'mentor'>('mentee')
  const [busy, setBusy] = useState(false)

  const loadParticipants = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/organizations/${orgId}/programs/${programId}/participants`
      )
      const json = await res.json()
      if (!res.ok) {
        throw new Error(json.error?.message ?? 'Failed to load participants')
      }
      setParticipants(json.data ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load participants')
    } finally {
      setLoading(false)
    }
  }, [orgId, programId])

  const loadSuggestions = useCallback(async () => {
    try {
      const res = await fetch(`/api/programs/${programId}/suggestions?limit=5`)
      const json = await res.json()
      if (res.ok) {
        setSuggestions(json.data ?? [])
      }
    } catch {
      // non-fatal for mentees without mentor pool
    }
  }, [programId])

  useEffect(() => {
    loadParticipants()
    loadSuggestions()
  }, [loadParticipants, loadSuggestions])

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!isAdmin) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/organizations/${orgId}/programs/${programId}/participants`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
        }
      )
      const json = await res.json()
      if (!res.ok) {
        throw new Error(json.error?.message ?? 'Failed to invite participant')
      }
      setInviteEmail('')
      await loadParticipants()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to invite participant')
    } finally {
      setBusy(false)
    }
  }

  async function handleSelfEnroll() {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/programs/${programId}/enroll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: selfRole }),
      })
      const json = await res.json()
      if (!res.ok) {
        throw new Error(json.error?.message ?? 'Failed to enroll')
      }
      await loadParticipants()
      await loadSuggestions()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to enroll')
    } finally {
      setBusy(false)
    }
  }

  async function handleRunMatching() {
    if (!isAdmin) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/programs/${programId}/match`, { method: 'POST' })
      const json = await res.json()
      if (!res.ok) {
        throw new Error(json.error?.message ?? 'Matching failed')
      }
      alert(
        `Matching complete: ${json.data?.summary?.created ?? 0} proposed, ${json.data?.summary?.skipped ?? 0} skipped.`
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Matching failed')
    } finally {
      setBusy(false)
    }
  }

  const mentors = participants.filter((p) => p.role === 'mentor')
  const mentees = participants.filter((p) => p.role === 'mentee')

  return (
    <div className="space-y-8">
      <div>
        <Link
          href={`/dashboard/org/${orgId}`}
          className="text-sm text-muted-foreground hover:underline"
        >
          ← {programName}
        </Link>
        <h1 className="text-3xl font-bold mt-2">{programName}</h1>
      </div>

      {error && (
        <Card className="border-destructive/50 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </Card>
      )}

      <Card className="p-6 space-y-4">
        <h2 className="text-lg font-semibold">Enroll in this program</h2>
        <div className="flex flex-wrap items-end gap-4">
          <div className="space-y-2">
            <Label>Role</Label>
            <Select
              value={selfRole}
              onValueChange={(v) => setSelfRole(v as 'mentee' | 'mentor')}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mentee">Mentee</SelectItem>
                <SelectItem value="mentor">Mentor</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="button" onClick={handleSelfEnroll} disabled={busy}>
            Enroll me
          </Button>
        </div>
      </Card>

      {isAdmin && (
        <Card className="p-6 space-y-4">
          <h2 className="text-lg font-semibold">Invite participant</h2>
          <form onSubmit={handleInvite} className="flex flex-wrap items-end gap-4">
            <div className="space-y-2 flex-1 min-w-[200px]">
              <Label htmlFor="invite-email">Email</Label>
              <Input
                id="invite-email"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                value={inviteRole}
                onValueChange={(v) => setInviteRole(v as 'mentee' | 'mentor')}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mentee">Mentee</SelectItem>
                  <SelectItem value="mentor">Mentor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={busy}>Invite</Button>
          </form>
          <Button variant="secondary" onClick={handleRunMatching} disabled={busy}>
            Run AI matching
          </Button>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="font-semibold mb-3">Mentors ({mentors.length})</h2>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <ul className="text-sm space-y-2">
              {mentors.map((p) => (
                <li key={p.id}>{p.profile?.display_name ?? p.profile?.id}</li>
              ))}
            </ul>
          )}
        </Card>
        <Card className="p-6">
          <h2 className="font-semibold mb-3">Mentees ({mentees.length})</h2>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <ul className="text-sm space-y-2">
              {mentees.map((p) => (
                <li key={p.id}>{p.profile?.display_name ?? p.profile?.id}</li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {suggestions.length > 0 && (
        <Card className="p-6 space-y-3">
          <h2 className="font-semibold">Suggested mentors (for you)</h2>
          <ul className="space-y-3 text-sm">
            {suggestions.map((s) => (
              <li key={s.mentorProfileId} className="border-b pb-2 last:border-0">
                <span className="font-medium">Score {s.score}</span>
                <span className="text-muted-foreground"> · {s.mentorProfileId.slice(0, 8)}…</span>
                <p className="text-muted-foreground">{s.reasons.join(' · ')}</p>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}
