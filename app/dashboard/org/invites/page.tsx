'use client'

import { useEffect, useState } from 'react'
import { Mail, Send, AlertCircle, Clock, CheckCircle, XCircle, Loader2, RefreshCw } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useI18n } from '@/lib/i18n'

interface Invite {
  id: string
  email: string
  invite_code: string
  role: string
  status: string
  language: string
  sent_at: string | null
  bounced_at: string | null
  bounce_reason: string | null
  claimed_at: string | null
  created_at: string
  created_by_profile?: { display_name: string; avatar_url: string | null }
  claimed_by_profile?: { display_name: string; avatar_url: string | null }
}

export default function OrgInvitesPage() {
  const { t, locale, isRTL } = useI18n()
  const isArabic = locale === 'ar'

  const [invites, setInvites] = useState<Invite[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [bouncedCount, setBouncedCount] = useState(0)

  const [emailsText, setEmailsText] = useState('')
  const [inviteRole, setInviteRole] = useState('mentee')
  const [inviteLanguage, setInviteLanguage] = useState<string>(locale)
  const [sendResult, setSendResult] = useState<{ sent: number; skipped: number; errors: string[] } | null>(null)

  useEffect(() => {
    fetchInvites()
  }, [])

  async function fetchInvites(status?: string) {
    setIsLoading(true)
    try {
      const url = status ? `/api/org/invites?status=${status}` : '/api/org/invites'
      const response = await fetch(url)
      if (response.ok) {
        const json = await response.json()
        setInvites(json.data || [])
        setBouncedCount(json.stats?.bounced || 0)
      }
    } catch (error) {
      console.error('Error fetching invites:', error)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleSendInvites() {
    const emails = emailsText
      .split(/[\n,;]/)
      .map(e => e.trim())
      .filter(e => e && e.includes('@'))

    if (emails.length === 0) return

    setIsSending(true)
    setSendResult(null)

    try {
      const response = await fetch('/api/org/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emails,
          role: inviteRole,
          language: inviteLanguage,
        }),
      })

      if (response.ok) {
        const json = await response.json()
        setSendResult(json.data)
        setEmailsText('')
        fetchInvites()
      }
    } catch (error) {
      console.error('Error sending invites:', error)
    } finally {
      setIsSending(false)
    }
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString(isArabic ? 'ar-AE' : 'en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  function getStatusBadge(invite: Invite) {
    if (invite.status === 'claimed') {
      return <Badge className="bg-green-100 text-green-800"><CheckCircle className="size-3 me-1" />{isArabic ? 'تم القبول' : 'Claimed'}</Badge>
    }
    if (invite.bounced_at) {
      return <Badge variant="destructive"><AlertCircle className="size-3 me-1" />{isArabic ? 'مرتد' : 'Bounced'}</Badge>
    }
    if (invite.status === 'expired') {
      return <Badge variant="secondary"><XCircle className="size-3 me-1" />{isArabic ? 'منتهي' : 'Expired'}</Badge>
    }
    return <Badge variant="outline"><Clock className="size-3 me-1" />{isArabic ? 'معلق' : 'Pending'}</Badge>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ms-ink">{t.org.invites}</h1>
          <p className="text-ms-ink-muted">
            {isArabic ? 'إدارة دعوات المؤسسة' : 'Manage organization invitations'}
          </p>
        </div>
        {bouncedCount > 0 && (
          <Badge variant="destructive" className="gap-1">
            <AlertCircle className="size-3" />
            {bouncedCount} {t.org.bouncedEmails}
          </Badge>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Send className="size-5" />
              {t.org.sendInvites}
            </CardTitle>
            <CardDescription>
              {isArabic ? 'أدخل عناوين البريد الإلكتروني لإرسال الدعوات' : 'Enter email addresses to send invitations'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>{isArabic ? 'عناوين البريد الإلكتروني' : 'Email Addresses'}</Label>
              <Textarea
                value={emailsText}
                onChange={(e) => setEmailsText(e.target.value)}
                placeholder={t.org.emailsPlaceholder}
                rows={5}
                className="font-mono text-sm"
              />
              <p className="text-xs text-ms-ink-subtle">
                {isArabic ? 'يمكنك إدخال عدة عناوين (بريد واحد في كل سطر)' : 'One email per line, or comma/semicolon separated'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{t.org.inviteRole}</Label>
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mentee">{t.org.roles.mentee}</SelectItem>
                    <SelectItem value="mentor">{t.org.roles.mentor}</SelectItem>
                    <SelectItem value="faculty">{t.org.roles.faculty}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t.org.inviteLanguage}</Label>
                <Select value={inviteLanguage} onValueChange={setInviteLanguage}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="ar">العربية</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              onClick={handleSendInvites}
              disabled={isSending || !emailsText.trim()}
              className="w-full bg-ms-ember hover:bg-ms-ember/90"
            >
              {isSending ? (
                <Loader2 className="size-4 animate-spin me-2" />
              ) : (
                <Mail className="size-4 me-2" />
              )}
              {t.org.sendInvites}
            </Button>

            {sendResult && (
              <div className="p-3 rounded-lg bg-ms-surface-100 text-sm">
                <p className="text-green-600">{sendResult.sent} {isArabic ? 'تم إرسالها' : 'sent'}</p>
                {sendResult.skipped > 0 && (
                  <p className="text-ms-ink-muted">{sendResult.skipped} {isArabic ? 'تم تخطيها (موجودة)' : 'skipped (existing)'}</p>
                )}
                {sendResult.errors.length > 0 && (
                  <p className="text-red-600">{sendResult.errors.length} {isArabic ? 'أخطاء' : 'errors'}</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">{t.org.pendingInvites}</CardTitle>
              <CardDescription>
                {invites.length} {isArabic ? 'دعوة' : 'invitations'}
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => fetchInvites()}>
              <RefreshCw className={`size-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="all" onValueChange={(v) => fetchInvites(v === 'all' ? undefined : v)}>
              <TabsList className="mb-4">
                <TabsTrigger value="all">{t.common.all}</TabsTrigger>
                <TabsTrigger value="pending">{isArabic ? 'معلق' : 'Pending'}</TabsTrigger>
                <TabsTrigger value="claimed">{isArabic ? 'مقبول' : 'Claimed'}</TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="m-0">
                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="size-6 animate-spin text-ms-ink-subtle" />
                  </div>
                ) : invites.length === 0 ? (
                  <div className="text-center py-8 text-ms-ink-muted">
                    {isArabic ? 'لا توجد دعوات' : 'No invitations yet'}
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {invites.map((invite) => (
                      <div
                        key={invite.id}
                        className="flex items-center justify-between p-3 rounded-lg border border-ms-line hover:bg-ms-surface-100 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="size-8">
                            <AvatarImage src={invite.claimed_by_profile?.avatar_url || undefined} />
                            <AvatarFallback className="text-xs">
                              {invite.email[0].toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium text-ms-ink">
                              {invite.claimed_by_profile?.display_name || invite.email}
                            </p>
                            {invite.claimed_by_profile && (
                              <p className="text-xs text-ms-ink-muted">{invite.email}</p>
                            )}
                            <p className="text-xs text-ms-ink-subtle">
                              {formatDate(invite.created_at)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs capitalize">
                            {invite.role}
                          </Badge>
                          {getStatusBadge(invite)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
              <TabsContent value="pending" className="m-0">
                {/* Same content structure, filtered by status */}
              </TabsContent>
              <TabsContent value="claimed" className="m-0">
                {/* Same content structure, filtered by status */}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
