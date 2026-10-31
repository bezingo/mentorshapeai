'use client'

import { useEffect, useState } from 'react'
import { BadgeCheck, Clock, XCircle, CheckCircle, Loader2, FileText, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useI18n } from '@/lib/i18n'

interface Affiliation {
  id: string
  profile_id: string
  org_id: string
  kind: 'student' | 'alumni' | 'staff' | 'faculty'
  programme_id: string | null
  graduation_year: number | null
  department: string | null
  student_id: string | null
  status: 'pending' | 'verified' | 'rejected'
  evidence_url: string | null
  evidence_notes: string | null
  verified_at: string | null
  created_at: string
  profile?: { id: string; display_name: string; avatar_url: string | null }
  programme?: { id: string; name: string }
  verified_by_profile?: { display_name: string }
}

export default function OrgAffiliationsPage() {
  const { t, locale, isRTL } = useI18n()
  const isArabic = locale === 'ar'

  const [affiliations, setAffiliations] = useState<Affiliation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    fetchAffiliations()
  }, [])

  async function fetchAffiliations(status?: string) {
    setIsLoading(true)
    try {
      const url = status
        ? `/api/org/affiliations?admin=true&status=${status}`
        : '/api/org/affiliations?admin=true'
      const response = await fetch(url)
      if (response.ok) {
        const json = await response.json()
        setAffiliations(json.data || [])
      }
    } catch (error) {
      console.error('Error fetching affiliations:', error)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleVerify(id: string, action: 'approve' | 'reject') {
    setIsProcessing(true)
    try {
      const response = await fetch(`/api/org/affiliations/${id}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })

      if (response.ok) {
        fetchAffiliations()
      }
    } catch (error) {
      console.error('Error verifying affiliation:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  async function handleBulkApprove() {
    if (selectedIds.size === 0) return

    setIsProcessing(true)
    try {
      const response = await fetch('/api/org/affiliations/bulk-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          affiliation_ids: Array.from(selectedIds),
          action: 'approve',
        }),
      })

      if (response.ok) {
        setSelectedIds(new Set())
        fetchAffiliations()
      }
    } catch (error) {
      console.error('Error bulk approving:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  function toggleSelection(id: string) {
    const newSelection = new Set(selectedIds)
    if (newSelection.has(id)) {
      newSelection.delete(id)
    } else {
      newSelection.add(id)
    }
    setSelectedIds(newSelection)
  }

  function selectAllPending() {
    const pendingIds = affiliations.filter(a => a.status === 'pending').map(a => a.id)
    setSelectedIds(new Set(pendingIds))
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString(isArabic ? 'ar-AE' : 'en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case 'verified':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="size-3 me-1" />{t.org.verified}</Badge>
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="size-3 me-1" />{t.org.rejected}</Badge>
      default:
        return <Badge variant="outline"><Clock className="size-3 me-1" />{t.org.pending}</Badge>
    }
  }

  function getKindLabel(kind: string) {
    const labels: Record<string, { en: string; ar: string }> = {
      student: { en: 'Student', ar: 'طالب' },
      alumni: { en: 'Alumni', ar: 'خريج' },
      staff: { en: 'Staff', ar: 'موظف' },
      faculty: { en: 'Faculty', ar: 'هيئة تدريس' },
    }
    return labels[kind]?.[isArabic ? 'ar' : 'en'] || kind
  }

  const pendingCount = affiliations.filter(a => a.status === 'pending').length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ms-ink">{t.org.affiliations}</h1>
          <p className="text-ms-ink-muted">
            {isArabic ? 'التحقق من انتماءات الأعضاء' : 'Verify member affiliations'}
          </p>
        </div>
        {pendingCount > 0 && (
          <Badge className="bg-amber-100 text-amber-800">
            <AlertCircle className="size-3 me-1" />
            {pendingCount} {t.org.pendingAffiliations}
          </Badge>
        )}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <BadgeCheck className="size-5" />
              {t.org.pendingAffiliations}
            </CardTitle>
            <CardDescription>
              {isArabic ? 'مراجعة طلبات التحقق من الانتماء' : 'Review affiliation verification requests'}
            </CardDescription>
          </div>
          {pendingCount > 0 && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={selectAllPending}>
                {isArabic ? 'تحديد الكل' : 'Select All'}
              </Button>
              <Button
                size="sm"
                onClick={handleBulkApprove}
                disabled={selectedIds.size === 0 || isProcessing}
                className="bg-green-600 hover:bg-green-700"
              >
                {isProcessing ? (
                  <Loader2 className="size-4 animate-spin me-2" />
                ) : (
                  <CheckCircle className="size-4 me-2" />
                )}
                {t.org.approveAll} ({selectedIds.size})
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="pending" onValueChange={(v) => fetchAffiliations(v === 'all' ? undefined : v)}>
            <TabsList className="mb-4">
              <TabsTrigger value="pending">{t.org.pending}</TabsTrigger>
              <TabsTrigger value="verified">{t.org.verified}</TabsTrigger>
              <TabsTrigger value="rejected">{t.org.rejected}</TabsTrigger>
              <TabsTrigger value="all">{t.common.all}</TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="m-0">
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="size-6 animate-spin text-ms-ink-subtle" />
                </div>
              ) : affiliations.filter(a => a.status === 'pending').length === 0 ? (
                <div className="text-center py-8 text-ms-ink-muted">
                  <CheckCircle className="size-12 mx-auto mb-3 text-green-500" />
                  <p>{isArabic ? 'لا توجد طلبات معلقة' : 'No pending requests'}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {affiliations.filter(a => a.status === 'pending').map((affiliation) => {
                    const profile = Array.isArray(affiliation.profile) ? affiliation.profile[0] : affiliation.profile
                    const programme = Array.isArray(affiliation.programme) ? affiliation.programme[0] : affiliation.programme
                    
                    return (
                      <div
                        key={affiliation.id}
                        className={`flex items-start gap-4 p-4 rounded-lg border transition-colors ${
                          selectedIds.has(affiliation.id) ? 'border-ms-ember bg-ms-ember/5' : 'border-ms-line hover:bg-ms-surface-100'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedIds.has(affiliation.id)}
                          onChange={() => toggleSelection(affiliation.id)}
                          className="mt-1 rounded border-ms-line"
                        />
                        <Avatar className="size-10">
                          <AvatarImage src={profile?.avatar_url || undefined} />
                          <AvatarFallback>
                            {profile?.display_name?.[0]?.toUpperCase() || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-ms-ink truncate">
                              {profile?.display_name || isArabic ? 'مستخدم' : 'User'}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {getKindLabel(affiliation.kind)}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-ms-ink-muted">
                            {programme && (
                              <span>{programme.name}</span>
                            )}
                            {affiliation.graduation_year && (
                              <span>{isArabic ? 'التخرج:' : 'Grad:'} {affiliation.graduation_year}</span>
                            )}
                            {affiliation.department && (
                              <span>{affiliation.department}</span>
                            )}
                            {affiliation.student_id && (
                              <span>{isArabic ? 'رقم:' : 'ID:'} {affiliation.student_id}</span>
                            )}
                          </div>
                          {affiliation.evidence_url && (
                            <a
                              href={affiliation.evidence_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 mt-2 text-sm text-ms-sky hover:underline"
                            >
                              <FileText className="size-3" />
                              {isArabic ? 'عرض الإثبات' : 'View Evidence'}
                            </a>
                          )}
                          <p className="text-xs text-ms-ink-subtle mt-1">
                            {isArabic ? 'تم الإرسال:' : 'Submitted:'} {formatDate(affiliation.created_at)}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleVerify(affiliation.id, 'reject')}
                            disabled={isProcessing}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <XCircle className="size-4" />
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleVerify(affiliation.id, 'approve')}
                            disabled={isProcessing}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="size-4 me-1" />
                            {isArabic ? 'موافقة' : 'Approve'}
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="verified" className="m-0">
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="size-6 animate-spin text-ms-ink-subtle" />
                </div>
              ) : affiliations.filter(a => a.status === 'verified').length === 0 ? (
                <div className="text-center py-8 text-ms-ink-muted">
                  {isArabic ? 'لا توجد انتماءات مُتحقق منها' : 'No verified affiliations'}
                </div>
              ) : (
                <div className="space-y-3">
                  {affiliations.filter(a => a.status === 'verified').map((affiliation) => {
                    const profile = Array.isArray(affiliation.profile) ? affiliation.profile[0] : affiliation.profile
                    
                    return (
                      <div
                        key={affiliation.id}
                        className="flex items-center gap-4 p-4 rounded-lg border border-ms-line"
                      >
                        <Avatar className="size-10">
                          <AvatarImage src={profile?.avatar_url || undefined} />
                          <AvatarFallback>
                            {profile?.display_name?.[0]?.toUpperCase() || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <span className="font-medium text-ms-ink">
                            {profile?.display_name || isArabic ? 'مستخدم' : 'User'}
                          </span>
                          <div className="flex gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {getKindLabel(affiliation.kind)}
                            </Badge>
                            {affiliation.graduation_year && (
                              <Badge variant="secondary" className="text-xs">
                                {affiliation.graduation_year}
                              </Badge>
                            )}
                          </div>
                        </div>
                        {getStatusBadge(affiliation.status)}
                      </div>
                    )
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="rejected" className="m-0">
              <div className="text-center py-8 text-ms-ink-muted">
                {isArabic ? 'لا توجد انتماءات مرفوضة' : 'No rejected affiliations'}
              </div>
            </TabsContent>

            <TabsContent value="all" className="m-0">
              {/* Show all affiliations */}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
