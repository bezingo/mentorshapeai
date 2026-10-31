'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Building2, Key, Loader2, CheckCircle, XCircle, ArrowRight } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useI18n } from '@/lib/i18n'

function JoinPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { locale, isRTL } = useI18n()
  const isArabic = locale === 'ar'

  const codeParam = searchParams.get('code')
  const orgParam = searchParams.get('org')

  const [inviteCode, setInviteCode] = useState(codeParam || '')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<{ org_name: string; role: string } | null>(null)

  useEffect(() => {
    if (codeParam) {
      handleJoin(codeParam)
    } else if (orgParam) {
      handleJoinByLink(orgParam)
    }
  }, [codeParam, orgParam])

  async function handleJoin(code: string) {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/org/invites/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invite_code: code }),
      })

      const json = await response.json()

      if (response.ok) {
        setSuccess({ org_name: json.data.org_name, role: json.data.role })
      } else {
        setError(json.error || 'Failed to join organization')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleJoinByLink(orgCode: string) {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/org/invites/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auto_domain: true }),
      })

      const json = await response.json()

      if (response.ok) {
        setSuccess({ org_name: json.data.org_name, role: json.data.role })
      } else if (response.status === 401) {
        router.push(`/sign-up?redirect=/join?org=${orgCode}`)
      } else {
        setError(json.error || 'Failed to join organization')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (inviteCode.trim()) {
      handleJoin(inviteCode.trim())
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-ms-surface-100">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="size-8 text-green-600" />
            </div>
            <CardTitle className="text-xl">
              {isArabic ? 'تم الانضمام بنجاح!' : 'Successfully Joined!'}
            </CardTitle>
            <CardDescription>
              {isArabic
                ? `أنت الآن عضو في ${success.org_name}`
                : `You are now a member of ${success.org_name}`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-ms-surface-100 rounded-lg text-center">
              <p className="text-sm text-ms-ink-muted">
                {isArabic ? 'دورك:' : 'Your role:'}
              </p>
              <p className="font-medium text-ms-ink capitalize">{success.role}</p>
            </div>
            <Button asChild className="w-full bg-ms-ember hover:bg-ms-ember/90">
              <Link href="/dashboard">
                {isArabic ? 'الذهاب للوحة التحكم' : 'Go to Dashboard'}
                <ArrowRight className={`size-4 ${isRTL ? 'rotate-180 me-2' : 'ms-2'}`} />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-ms-surface-100">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-ms-blush rounded-full flex items-center justify-center mb-4">
            <Building2 className="size-8 text-ms-on-tint" />
          </div>
          <CardTitle className="text-xl">
            {isArabic ? 'انضم إلى مؤسسة' : 'Join an Organization'}
          </CardTitle>
          <CardDescription>
            {isArabic
              ? 'أدخل رمز الدعوة الخاص بك للانضمام'
              : 'Enter your invite code to join'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">
                {isArabic ? 'رمز الدعوة' : 'Invite Code'}
              </Label>
              <div className="relative">
                <Key className={`absolute top-3 size-4 text-ms-ink-subtle ${isRTL ? 'end-3' : 'start-3'}`} />
                <Input
                  id="code"
                  type="text"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  placeholder={isArabic ? 'أدخل الرمز' : 'Enter code'}
                  className={`${isRTL ? 'pe-10' : 'ps-10'} uppercase tracking-widest font-mono`}
                  disabled={isLoading}
                  dir="ltr"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
                <XCircle className="size-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={!inviteCode.trim() || isLoading}
              className="w-full bg-ms-ember hover:bg-ms-ember/90"
            >
              {isLoading ? (
                <Loader2 className="size-4 animate-spin me-2" />
              ) : null}
              {isArabic ? 'انضم الآن' : 'Join Now'}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-ms-line text-center">
            <p className="text-sm text-ms-ink-muted mb-3">
              {isArabic ? 'ليس لديك حساب؟' : 'Don\'t have an account?'}
            </p>
            <Button variant="outline" asChild className="w-full">
              <Link href={`/sign-up${inviteCode ? `?code=${inviteCode}` : ''}`}>
                {isArabic ? 'إنشاء حساب' : 'Create Account'}
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function JoinPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="size-8 animate-spin text-ms-ink-subtle" />
      </div>
    }>
      <JoinPageContent />
    </Suspense>
  )
}
