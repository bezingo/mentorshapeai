'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

type Program = {
  id: string
  name: string
  description: string | null
  start_date: string | null
  end_date: string | null
}

type OrgAdminClientProps = {
  orgId: string
  orgName: string
  isAdmin: boolean
  inviteCode: string | null
}

export function OrgAdminClient({
  orgId,
  orgName,
  isAdmin,
  inviteCode,
}: OrgAdminClientProps) {
  const [programs, setPrograms] = useState<Program[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [busy, setBusy] = useState(false)

  const loadPrograms = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/organizations/${orgId}/programs`)
      const json = await res.json()
      if (!res.ok) {
        throw new Error(json.error?.message ?? 'Failed to load programs')
      }
      setPrograms(json.data ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load programs')
    } finally {
      setLoading(false)
    }
  }, [orgId])

  useEffect(() => {
    loadPrograms()
  }, [loadPrograms])

  async function handleCreateProgram(e: React.FormEvent) {
    e.preventDefault()
    if (!isAdmin) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/organizations/${orgId}/programs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description: description || null }),
      })
      const json = await res.json()
      if (!res.ok) {
        throw new Error(json.error?.message ?? 'Failed to create program')
      }
      setName('')
      setDescription('')
      await loadPrograms()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create program')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <Link href="/dashboard/org" className="text-sm text-muted-foreground hover:underline">
          ← Organizations
        </Link>
        <h1 className="text-3xl font-bold mt-2">{orgName}</h1>
        {isAdmin && inviteCode && (
          <p className="text-sm text-muted-foreground mt-1">
            Invite code: <code className="bg-muted px-1 rounded">{inviteCode}</code>
          </p>
        )}
      </div>

      {error && (
        <Card className="border-destructive/50 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </Card>
      )}

      {isAdmin && (
        <Card className="p-6 space-y-4">
          <h2 className="text-lg font-semibold">Create program</h2>
          <form onSubmit={handleCreateProgram} className="space-y-4 max-w-lg">
            <div className="space-y-2">
              <Label htmlFor="program-name">Program name</Label>
              <Input
                id="program-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="program-desc">Description</Label>
              <Textarea
                id="program-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
            <Button type="submit" disabled={busy}>
              Create program
            </Button>
          </form>
        </Card>
      )}

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Programs</h2>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : programs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No programs yet.</p>
        ) : (
          <ul className="grid gap-4 md:grid-cols-2">
            {programs.map((program) => (
              <li key={program.id}>
                <Card className="p-5 space-y-2">
                  <h3 className="font-medium">{program.name}</h3>
                  {program.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {program.description}
                    </p>
                  )}
                  <Link
                    href={`/dashboard/org/${orgId}/programs/${program.id}`}
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    Open program →
                  </Link>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
