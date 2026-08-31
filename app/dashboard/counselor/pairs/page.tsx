'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  UserPlus, 
  ArrowLeft, 
  Users,
  Calendar,
  Loader2,
} from 'lucide-react'

interface Pair {
  id: string
  status: string
  created_at: string
  mentor: {
    display_name: string
    avatar_url: string | null
  } | null
  mentee: {
    display_name: string
    avatar_url: string | null
  } | null
  goal: {
    title: string
    category: string
  } | null
  collaboration: {
    id: string
    status: string
    total_focuses: number
    last_focus_at: string | null
  } | null
}

export default function PairsPage() {
  const [pairs, setPairs] = useState<Pair[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')

  useEffect(() => {
    async function fetchPairs() {
      try {
        const params = new URLSearchParams()
        if (statusFilter !== 'all') {
          params.set('status', statusFilter)
        }
        const response = await fetch(`/api/counselor/pairs?${params}`)
        if (response.ok) {
          const json = await response.json()
          setPairs(json.data.pairs || [])
        }
      } catch {
        // Ignore errors
      } finally {
        setIsLoading(false)
      }
    }

    fetchPairs()
  }, [statusFilter])

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/counselor">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Mentoring Pairs</h1>
            <p className="text-muted-foreground">View and manage mentor-mentee relationships</p>
          </div>
        </div>
        <Button asChild>
          <Link href="/dashboard/counselor/pairs/new">
            <UserPlus className="h-4 w-4 mr-2" />
            Create Pair
          </Link>
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center min-h-[200px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : pairs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No pairs yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first mentor-mentee pairing
            </p>
            <Button asChild>
              <Link href="/dashboard/counselor/pairs/new">
                <UserPlus className="h-4 w-4 mr-2" />
                Create Pair
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {pairs.map((pair) => {
            const mentor = Array.isArray(pair.mentor) ? pair.mentor[0] : pair.mentor
            const mentee = Array.isArray(pair.mentee) ? pair.mentee[0] : pair.mentee
            const goal = Array.isArray(pair.goal) ? pair.goal[0] : pair.goal
            const collaboration = Array.isArray(pair.collaboration) ? pair.collaboration[0] : pair.collaboration
            
            return (
              <Card key={pair.id}>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-6">
                      {/* Mentee */}
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={mentee?.avatar_url || undefined} />
                          <AvatarFallback>
                            {mentee?.display_name?.[0]?.toUpperCase() || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{mentee?.display_name || 'Unknown'}</p>
                          <p className="text-xs text-muted-foreground">Mentee</p>
                        </div>
                      </div>

                      <span className="text-muted-foreground">↔</span>

                      {/* Mentor */}
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={mentor?.avatar_url || undefined} />
                          <AvatarFallback>
                            {mentor?.display_name?.[0]?.toUpperCase() || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{mentor?.display_name || 'Unknown'}</p>
                          <p className="text-xs text-muted-foreground">Mentor</p>
                        </div>
                      </div>

                      {goal && (
                        <div className="ml-6 pl-6 border-l">
                          <p className="text-sm font-medium">{goal.title}</p>
                          <Badge variant="outline" className="text-xs">
                            {goal.category}
                          </Badge>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-4">
                      {collaboration && (
                        <div className="text-right">
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {collaboration.total_focuses} focus{collaboration.total_focuses !== 1 ? 'es' : ''}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Last: {formatDate(collaboration.last_focus_at)}
                          </p>
                        </div>
                      )}
                      <Badge 
                        variant={
                          collaboration?.status === 'active' ? 'default' : 
                          collaboration?.status === 'completed' ? 'secondary' : 
                          'outline'
                        }
                      >
                        {collaboration?.status || pair.status}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
