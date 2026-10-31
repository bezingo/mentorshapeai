'use client'

import { useState, useEffect } from 'react'
import { Building2, Mail, Key, ArrowRight, Loader2, CheckCircle, Globe } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useI18n } from '@/lib/i18n'

interface OrgJoinStepProps {
  onSubmit: (data: { inviteCode?: string; skipOrg: boolean; orgJoined?: { org_id: string; org_name: string; role: string } }) => void
  userEmail?: string
  isLoading?: boolean
}

interface DomainOrg {
  id: string
  name: string
  crest_url: string | null
}

export function OrgJoinStep({ onSubmit, userEmail, isLoading = false }: OrgJoinStepProps) {
  const { locale, t, isRTL } = useI18n()
  const isArabic = locale === 'ar'

  const [inviteCode, setInviteCode] = useState('')
  const [showInviteInput, setShowInviteInput] = useState(false)
  const [isJoining, setIsJoining] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [domainOrg, setDomainOrg] = useState<DomainOrg | null>(null)
  const [checkingDomain, setCheckingDomain] = useState(true)

  const emailDomain = userEmail?.split('@')[1] || ''

  useEffect(() => {
    if (emailDomain) {
      checkDomainOrg()
    } else {
      setCheckingDomain(false)
    }
  }, [emailDomain])

  async function checkDomainOrg() {
    try {
      const response = await fetch('/api/org/invites/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auto_domain: true }),
      })
      
      if (response.ok) {
        const json = await response.json()
        setDomainOrg({
          id: json.data.org_id,
          name: json.data.org_name,
          crest_url: null
        })
        onSubmit({ skipOrg: false, orgJoined: json.data })
        return
      }
    } catch {
      // Domain org check failed, continue with manual flow
    }
    setCheckingDomain(false)
  }

  const handleJoinWithCode = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteCode.trim()) return

    setIsJoining(true)
    setError(null)

    try {
      const response = await fetch('/api/org/invites/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invite_code: inviteCode.trim() }),
      })

      const json = await response.json()

      if (response.ok) {
        onSubmit({ inviteCode: inviteCode.trim(), skipOrg: false, orgJoined: json.data })
      } else {
        setError(json.error || (isArabic ? 'رمز غير صالح' : 'Invalid code'))
      }
    } catch {
      setError(isArabic ? 'خطأ في الشبكة' : 'Network error')
    } finally {
      setIsJoining(false)
    }
  }

  const handleSkip = () => {
    onSubmit({ skipOrg: true })
  }

  if (checkingDomain) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="size-8 animate-spin text-ms-ember mb-4" />
        <p className="text-sm text-ms-ink-muted">
          {isArabic ? 'جاري التحقق من نطاق البريد...' : 'Checking email domain...'}
        </p>
      </div>
    )
  }

  if (domainOrg) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <div className="size-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <CheckCircle className="size-8 text-green-600" />
        </div>
        <h3 className="text-lg font-semibold text-ms-ink mb-2">
          {isArabic ? 'تم الانضمام تلقائياً!' : 'Auto-joined!'}
        </h3>
        <p className="text-ms-ink-muted">
          {isArabic
            ? `تم إضافتك تلقائياً إلى ${domainOrg.name}`
            : `You've been automatically added to ${domainOrg.name}`}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Email domain info */}
      {emailDomain && (
        <div className="p-4 rounded-lg bg-ms-surface-200/50 border border-ms-line">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 size-10 rounded-lg bg-ms-sky flex items-center justify-center text-ms-on-tint">
              <Mail className="size-5" />
            </div>
            <div>
              <p className="text-sm text-ms-ink">
                {isArabic ? 'البريد الإلكتروني الخاص بك:' : 'Your email:'}
              </p>
              <p className="font-medium text-ms-ink">
                {userEmail}
              </p>
              <p className="mt-1 text-xs text-ms-ink-subtle">
                {isArabic
                  ? 'إذا كانت مؤسستك قد سجلت هذا النطاق، ستتم إضافتك تلقائياً'
                  : 'If your organization has registered this domain, you\'ll be added automatically'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Invite code section */}
      {showInviteInput ? (
        <form onSubmit={handleJoinWithCode} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="inviteCode" className="text-ms-ink-muted">
              {isArabic ? 'رمز الدعوة' : 'Invite Code'}
            </Label>
            <div className="relative">
              <Key className={`absolute top-3 h-4 w-4 text-ms-ink-subtle ${isRTL ? 'end-3' : 'start-3'}`} />
              <Input
                id="inviteCode"
                type="text"
                placeholder={isArabic ? 'أدخل رمز الدعوة' : 'Enter invite code'}
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                className={`${isRTL ? 'pe-9 ps-3' : 'ps-9 pe-3'} bg-ms-surface-000 border-ms-line text-ms-ink placeholder:text-ms-ink-subtle focus:border-ms-ember focus:ring-ms-ember uppercase tracking-wider`}
                disabled={isLoading || isJoining}
                dir="ltr"
              />
            </div>
            {error && (
              <p className="text-xs text-red-500">{error}</p>
            )}
            <p className="text-xs text-ms-ink-subtle">
              {isArabic
                ? 'يمكنك الحصول على رمز الدعوة من مسؤول مؤسستك'
                : 'You can get an invite code from your organization administrator'}
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => { setShowInviteInput(false); setError(null) }}
              className="flex-1 border-ms-line text-ms-ink"
              disabled={isLoading || isJoining}
            >
              {t.common.back}
            </Button>
            <Button
              type="submit"
              disabled={!inviteCode.trim() || isLoading || isJoining}
              className="flex-1 bg-ms-ember text-ms-on-ember hover:bg-ms-ember/90 font-semibold"
            >
              {(isLoading || isJoining) ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                isArabic ? 'انضم' : 'Join'
              )}
            </Button>
          </div>
        </form>
      ) : (
        <div className="space-y-3">
          {/* Have invite code button */}
          <button
            type="button"
            onClick={() => setShowInviteInput(true)}
            className="w-full p-4 rounded-lg border-2 border-ms-line hover:border-ms-line-strong hover:bg-ms-surface-200/50 text-start transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0 size-12 rounded-lg bg-ms-blush flex items-center justify-center text-ms-on-tint">
                <Building2 className="size-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-ms-ink">
                  {isArabic ? 'لدي رمز دعوة' : 'I have an invite code'}
                </h3>
                <p className="mt-0.5 text-sm text-ms-ink-muted">
                  {isArabic
                    ? 'انضم إلى مؤسستك باستخدام رمز الدعوة'
                    : 'Join your organization with an invite code'}
                </p>
              </div>
              <ArrowRight className={`size-5 text-ms-ink-subtle ${isRTL ? 'rotate-180' : ''}`} />
            </div>
          </button>
        </div>
      )}

      {/* Skip option */}
      {!showInviteInput && (
        <div className="pt-4 border-t border-ms-line">
          <Button
            variant="ghost"
            onClick={handleSkip}
            className="w-full text-ms-ink-muted hover:text-ms-ink"
            disabled={isLoading}
          >
            {isArabic ? 'تخطي - سأنضم لاحقاً' : 'Skip - I\'ll join later'}
          </Button>
        </div>
      )}
    </div>
  )
}
