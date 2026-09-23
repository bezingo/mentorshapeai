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

type OrganizationRow = {
  id: string
  name: string
  type: string | null
  domain: string | null
  invite_code: string | null
  member_role: string
}

export function OrgHubClient() {
  const [organizations, setOrganizations] = useState<OrganizationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [createName, setCreateName] = useState('')
  const [createDomain, setCreateDomain] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [joinRole, setJoinRole] = useState<'mentee' | 'mentor'>('mentee')
  const [busy, setBusy] = useState(false)

  const loadOrgs = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/organizations')
      const json = await res.json()
      if (!res.ok) {
        throw new Error(json.error?.message ?? 'Failed to load organizations')
      }
      setOrganizations(json.data ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load organizations')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadOrgs()
  }, [loadOrgs])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: createName,
          domain: createDomain || null,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        throw new Error(json.error?.message ?? 'Failed to create organization')
      }
      setCreateName('')
      setCreateDomain('')
      await loadOrgs()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create organization')
    } finally {
      setBusy(false)
    }
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/organizations/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invite_code: joinCode, role: joinRole }),
      })
      const json = await res.json()
      if (!res.ok) {
        throw new Error(json.error?.message ?? 'Failed to join organization')
      }
      setJoinCode('')
      await loadOrgs()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to join organization')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-8">
      {error && (
        <Card className="border-destructive/50 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6 space-y-4">
          <h2 className="text-lg font-semibold">Create organization</h2>
          <p className="text-sm text-muted-foreground">
            You become the org admin. Share the invite code with mentors and mentees.
          </p>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="org-name">Name</Label>
              <Input
                id="org-name"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="Acme University"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="org-domain">Email domain (optional)</Label>
              <Input
                id="org-domain"
                value={createDomain}
                onChange={(e) => setCreateDomain(e.target.value)}
                placeholder="university.edu"
              />
            </div>
            <Button type="submit" disabled={busy}>
              Create
            </Button>
          </form>
        </Card>

        <Card className="p-6 space-y-4">
          <h2 className="text-lg font-semibold">Join with invite code</h2>
          <form onSubmit={handleJoin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invite-code">Invite code</Label>
              <Input
                id="invite-code"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                placeholder="abc123"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Your org role</Label>
              <Select
                value={joinRole}
                onValueChange={(v) => setJoinRole(v as 'mentee' | 'mentor')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mentee">Mentee</SelectItem>
                  <SelectItem value="mentor">Mentor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" variant="secondary" disabled={busy}>
              Join
            </Button>
          </form>
        </Card>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Your organizations</h2>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : organizations.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No organizations yet. Create one or join with an invite code.
          </p>
        ) : (
          <ul className="grid gap-4 md:grid-cols-2">
            {organizations.map((org) => (
              <li key={org.id}>
                <Card className="p-5 flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-medium">{org.name}</h3>
                      <p className="text-xs text-muted-foreground capitalize">
                        {org.member_role}
                        {org.domain ? ` · @${org.domain}` : ''}
                      </p>
                    </div>
                    {org.invite_code && org.member_role === 'admin' && (
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {org.invite_code}
                      </code>
                    )}
                  </div>
                  <Link
                    href={`/dashboard/org/${org.id}`}
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    Manage programs →
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
