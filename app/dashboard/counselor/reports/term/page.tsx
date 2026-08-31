'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  ArrowLeft, 
  Download,
  Calendar,
  Users,
  Star,
  CheckCircle,
  Loader2,
  TrendingUp,
} from 'lucide-react'

interface TermReport {
  period: {
    start_date: string
    end_date: string
  }
  stats: {
    sessions_held: number
    sessions_with_both_grades: number
    total_action_items: number
    completed_action_items: number
    mentors_in_roster: number
    mentors_external: number
    avg_usefulness_mentor: number | null
    avg_usefulness_mentee: number | null
    avg_honesty_mentor: number | null
    avg_honesty_mentee: number | null
  }
  collaborations: Array<{
    id: string
    status: string
    mentor: { display_name: string } | null
    mentee: { display_name: string } | null
    goal: { title: string; category: string } | null
    focuses_count: number
    action_items_count: number
    completed_items_count: number
  }>
}

export default function TermReportPage() {
  const [report, setReport] = useState<TermReport | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [startDate, setStartDate] = useState(() => {
    const date = new Date()
    date.setMonth(date.getMonth() - 3)
    return date.toISOString().split('T')[0]
  })
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0]
  })

  useEffect(() => {
    fetchReport()
  }, [startDate, endDate])

  async function fetchReport() {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        start_date: startDate,
        end_date: endDate,
      })
      const response = await fetch(`/api/counselor/reports/term?${params}`)
      if (response.ok) {
        const json = await response.json()
        setReport(json.data)
      }
    } catch {
      // Ignore errors
    } finally {
      setIsLoading(false)
    }
  }

  const downloadCSV = async () => {
    const params = new URLSearchParams({
      start_date: startDate,
      end_date: endDate,
      format: 'csv',
    })
    window.open(`/api/counselor/reports/term?${params}`, '_blank')
  }

  const formatRating = (value: number | null) => {
    if (value === null) return '-'
    return value.toFixed(1)
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
            <h1 className="text-3xl font-bold">Term Report</h1>
            <p className="text-muted-foreground">Mentorship program performance summary</p>
          </div>
        </div>
        <Button onClick={downloadCSV}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Date Range */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Report Period</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="space-y-2">
              <Label htmlFor="start">Start Date</Label>
              <Input
                id="start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end">End Date</Label>
              <Input
                id="end"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <Button variant="outline" onClick={fetchReport}>
              <Calendar className="h-4 w-4 mr-2" />
              Update
            </Button>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex items-center justify-center min-h-[200px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : report ? (
        <>
          {/* Key Metrics */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Sessions Held</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{report.stats.sessions_held}</div>
                <p className="text-xs text-muted-foreground">
                  {report.stats.sessions_with_both_grades} with both grades
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Action Items</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {report.stats.completed_action_items}/{report.stats.total_action_items}
                </div>
                <p className="text-xs text-muted-foreground">
                  {report.stats.total_action_items > 0 
                    ? Math.round((report.stats.completed_action_items / report.stats.total_action_items) * 100)
                    : 0}% completion rate
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Mentor Source</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{report.stats.mentors_in_roster}</div>
                <p className="text-xs text-muted-foreground">
                  in-roster ({report.stats.mentors_external} external)
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Collaborations</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{report.collaborations.length}</div>
                <p className="text-xs text-muted-foreground">
                  active in period
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Ratings */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Star className="h-4 w-4" />
                  Average Usefulness Rating
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-3xl font-bold">{formatRating(report.stats.avg_usefulness_mentor)}</div>
                    <p className="text-sm text-muted-foreground">by Mentors</p>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-3xl font-bold">{formatRating(report.stats.avg_usefulness_mentee)}</div>
                    <p className="text-sm text-muted-foreground">by Mentees</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Star className="h-4 w-4" />
                  Average Honesty Rating
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-3xl font-bold">{formatRating(report.stats.avg_honesty_mentor)}</div>
                    <p className="text-sm text-muted-foreground">by Mentors</p>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-3xl font-bold">{formatRating(report.stats.avg_honesty_mentee)}</div>
                    <p className="text-sm text-muted-foreground">by Mentees</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Collaboration Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Collaboration Details</CardTitle>
              <CardDescription>
                Performance by mentoring pair
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium">Mentee</th>
                      <th className="px-4 py-2 text-left font-medium">Mentor</th>
                      <th className="px-4 py-2 text-left font-medium">Goal</th>
                      <th className="px-4 py-2 text-center font-medium">Focuses</th>
                      <th className="px-4 py-2 text-center font-medium">Tasks Done</th>
                      <th className="px-4 py-2 text-left font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {report.collaborations.map((collab) => {
                      const mentor = Array.isArray(collab.mentor) ? collab.mentor[0] : collab.mentor
                      const mentee = Array.isArray(collab.mentee) ? collab.mentee[0] : collab.mentee
                      const goal = Array.isArray(collab.goal) ? collab.goal[0] : collab.goal
                      return (
                        <tr key={collab.id} className="hover:bg-muted/50">
                          <td className="px-4 py-2">{mentee?.display_name || '-'}</td>
                          <td className="px-4 py-2">{mentor?.display_name || '-'}</td>
                          <td className="px-4 py-2">
                            <div>
                              <span className="font-medium">{goal?.title || '-'}</span>
                              {goal?.category && (
                                <span className="text-xs text-muted-foreground ml-2">
                                  ({goal.category})
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-2 text-center">{collab.focuses_count}</td>
                          <td className="px-4 py-2 text-center">
                            {collab.completed_items_count}/{collab.action_items_count}
                          </td>
                          <td className="px-4 py-2 capitalize">{collab.status}</td>
                        </tr>
                      )
                    })}
                    {report.collaborations.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                          No collaborations in this period
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Failed to load report</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
