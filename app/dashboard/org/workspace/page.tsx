'use client'

import { useEffect, useState } from 'react'
import { Building2, Globe, Link2, Copy, Check, Loader2, Upload } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useI18n } from '@/lib/i18n'

interface OrgWorkspace {
  id: string
  name: string
  crest_url: string | null
  allowed_domains: string[]
  verified_domains: string[]
  invite_link_code: string | null
  invite_link_enabled: boolean
  is_school: boolean
  org_type: string
  member_count: number
  user_role: string
}

export default function OrgWorkspacePage() {
  const { t, locale, isRTL } = useI18n()
  const isArabic = locale === 'ar'

  const [workspace, setWorkspace] = useState<OrgWorkspace | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [newDomain, setNewDomain] = useState('')

  const [formData, setFormData] = useState({
    name: '',
    allowed_domains: [] as string[],
    invite_link_enabled: true,
  })

  useEffect(() => {
    fetchWorkspace()
  }, [])

  async function fetchWorkspace() {
    try {
      const response = await fetch('/api/org/workspace')
      if (response.ok) {
        const json = await response.json()
        setWorkspace(json.data)
        setFormData({
          name: json.data.name,
          allowed_domains: json.data.allowed_domains || [],
          invite_link_enabled: json.data.invite_link_enabled,
        })
      } else if (response.status === 404) {
        setError('no_org')
      } else {
        setError('Failed to load workspace')
      }
    } catch {
      setError('Failed to load workspace')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleSave() {
    setIsSaving(true)
    try {
      const response = await fetch('/api/org/workspace', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        const json = await response.json()
        setWorkspace(prev => prev ? { ...prev, ...json.data } : null)
      } else {
        const json = await response.json()
        setError(json.error)
      }
    } catch {
      setError('Failed to save changes')
    } finally {
      setIsSaving(false)
    }
  }

  function handleAddDomain() {
    const domain = newDomain.trim().toLowerCase()
    if (domain && !formData.allowed_domains.includes(domain)) {
      setFormData(prev => ({
        ...prev,
        allowed_domains: [...prev.allowed_domains, domain],
      }))
      setNewDomain('')
    }
  }

  function handleRemoveDomain(domain: string) {
    setFormData(prev => ({
      ...prev,
      allowed_domains: prev.allowed_domains.filter(d => d !== domain),
    }))
  }

  function copyInviteLink() {
    if (workspace?.invite_link_code) {
      const url = `${window.location.origin}/join?org=${workspace.invite_link_code}`
      navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-ms-ink-subtle" />
      </div>
    )
  }

  if (error === 'no_org') {
    return (
      <Card className="max-w-lg mx-auto">
        <CardHeader className="text-center">
          <Building2 className="h-12 w-12 mx-auto text-ms-ink-subtle mb-4" />
          <CardTitle>{isArabic ? 'لا توجد مؤسسة' : 'No Organization'}</CardTitle>
          <CardDescription>
            {isArabic
              ? 'ليس لديك صلاحيات إدارية في أي مؤسسة'
              : 'You don\'t have admin permissions for any organization'}
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (!workspace) {
    return (
      <div className="text-center py-12">
        <p className="text-ms-ink-muted">{error || 'No workspace found'}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ms-ink">{t.org.workspace}</h1>
          <p className="text-ms-ink-muted">
            {isArabic ? 'إدارة إعدادات المؤسسة' : 'Manage organization settings'}
          </p>
        </div>
        <Badge variant="secondary" className="capitalize">
          {workspace.user_role}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{isArabic ? 'معلومات المؤسسة' : 'Organization Info'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t.org.workspaceName}</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder={isArabic ? 'أدخل اسم المؤسسة' : 'Enter organization name'}
            />
          </div>

          <div className="flex items-center gap-4 p-4 bg-ms-surface-100 rounded-lg">
            <div className="size-16 bg-ms-surface-200 rounded-lg flex items-center justify-center">
              {workspace.crest_url ? (
                <img src={workspace.crest_url} alt="" className="size-full object-contain rounded-lg" />
              ) : (
                <Building2 className="size-8 text-ms-ink-subtle" />
              )}
            </div>
            <div className="flex-1">
              <p className="font-medium text-ms-ink">{t.org.crest}</p>
              <p className="text-sm text-ms-ink-muted">{isArabic ? 'يظهر في الدعوات والملفات الشخصية' : 'Shown on invites and profiles'}</p>
            </div>
            <Button variant="outline" size="sm">
              <Upload className="size-4 me-2" />
              {t.org.uploadCrest}
            </Button>
          </div>

          <div className="flex items-center gap-4">
            <Badge variant="outline" className="gap-1">
              {workspace.is_school ? t.org.school : t.org.university}
            </Badge>
            <span className="text-sm text-ms-ink-muted">
              {workspace.member_count} {t.org.members}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Globe className="size-5" />
            {t.org.domains}
          </CardTitle>
          <CardDescription>{t.org.domainsHelp}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              placeholder={isArabic ? 'مثال: school.edu' : 'e.g., school.edu'}
              onKeyDown={(e) => e.key === 'Enter' && handleAddDomain()}
            />
            <Button onClick={handleAddDomain} variant="outline">
              {t.org.addDomain}
            </Button>
          </div>

          {formData.allowed_domains.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {formData.allowed_domains.map((domain) => (
                <Badge key={domain} variant="secondary" className="gap-1 ps-3">
                  @{domain}
                  <button
                    onClick={() => handleRemoveDomain(domain)}
                    className="ms-1 hover:text-red-500"
                  >
                    ×
                  </button>
                </Badge>
              ))}
            </div>
          )}

          {workspace.verified_domains && workspace.verified_domains.length > 0 && (
            <div className="pt-4 border-t border-ms-line">
              <p className="text-sm font-medium text-ms-ink mb-2">{t.org.verifiedDomains}</p>
              <div className="flex flex-wrap gap-2">
                {workspace.verified_domains.map((domain) => (
                  <Badge key={domain} className="gap-1 bg-green-100 text-green-800">
                    <Check className="size-3" />
                    @{domain}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Link2 className="size-5" />
            {t.org.inviteLink}
          </CardTitle>
          <CardDescription>
            {isArabic
              ? 'شارك هذا الرابط للسماح للأشخاص بالانضمام إلى مؤسستك'
              : 'Share this link to let people join your organization'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {workspace.invite_link_code && (
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={`${typeof window !== 'undefined' ? window.location.origin : ''}/join?org=${workspace.invite_link_code}`}
                className="font-mono text-sm"
              />
              <Button onClick={copyInviteLink} variant="outline" size="icon">
                {copied ? <Check className="size-4 text-green-500" /> : <Copy className="size-4" />}
              </Button>
            </div>
          )}

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="linkEnabled"
              checked={formData.invite_link_enabled}
              onChange={(e) => setFormData(prev => ({ ...prev, invite_link_enabled: e.target.checked }))}
              className="rounded border-ms-line"
            />
            <Label htmlFor="linkEnabled" className="text-sm text-ms-ink-muted cursor-pointer">
              {isArabic ? 'تفعيل رابط الدعوة' : 'Enable invite link'}
            </Label>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving} className="bg-ms-ember hover:bg-ms-ember/90">
          {isSaving && <Loader2 className="size-4 animate-spin me-2" />}
          {t.common.save}
        </Button>
      </div>
    </div>
  )
}
