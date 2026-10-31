'use client'

import { useState } from 'react'
import { Building2, Mail, Key, ArrowRight, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useI18n } from '@/lib/i18n'

interface OrgJoinStepProps {
  onSubmit: (data: { inviteCode?: string; skipOrg: boolean }) => void
  userEmail?: string
  isLoading?: boolean
}

export function OrgJoinStep({ onSubmit, userEmail, isLoading = false }: OrgJoinStepProps) {
  const { locale, t, isRTL } = useI18n()
  const isArabic = locale === 'ar'

  const [inviteCode, setInviteCode] = useState('')
  const [showInviteInput, setShowInviteInput] = useState(false)

  const emailDomain = userEmail?.split('@')[1] || ''

  const handleJoinWithCode = (e: React.FormEvent) => {
    e.preventDefault()
    if (inviteCode.trim()) {
      onSubmit({ inviteCode: inviteCode.trim(), skipOrg: false })
    }
  }

  const handleSkip = () => {
    onSubmit({ skipOrg: true })
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
                disabled={isLoading}
                dir="ltr"
              />
            </div>
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
              onClick={() => setShowInviteInput(false)}
              className="flex-1 border-ms-line text-ms-ink"
              disabled={isLoading}
            >
              {t.common.back}
            </Button>
            <Button
              type="submit"
              disabled={!inviteCode.trim() || isLoading}
              className="flex-1 bg-ms-ember text-ms-on-ember hover:bg-ms-ember/90 font-semibold"
            >
              {isLoading ? (
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
