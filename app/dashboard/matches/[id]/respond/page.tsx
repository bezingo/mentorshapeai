'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, XCircle, Loader2, Sparkles, Clock } from 'lucide-react'
import { useI18n } from '@/lib/i18n'

interface Match {
  id: string
  status: string
  reasons: string[]
  your_role: 'mentor' | 'mentee'
  your_response: boolean | null
  partner_response: boolean | null
  mentor: { display_name: string; avatar_url: string | null; headline: string | null }
  mentee: { display_name: string; avatar_url: string | null; headline: string | null }
  program: { name: string; description: string | null }
}

export default function MatchRespondPage() {
  const params = useParams()
  const router = useRouter()
  const matchId = params.id as string
  const { locale } = useI18n()
  const isArabic = locale === 'ar'

  const [match, setMatch] = useState<Match | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isResponding, setIsResponding] = useState(false)
  const [declineReason, setDeclineReason] = useState('')
  const [showDeclineForm, setShowDeclineForm] = useState(false)
  const [responded, setResponded] = useState(false)

  useEffect(() => {
    fetchMatch()
  }, [matchId])

  async function fetchMatch() {
    try {
      const response = await fetch(`/api/matches/${matchId}/respond`)
      if (response.ok) {
        const json = await response.json()
        setMatch(json.data)
        if (json.data.your_response !== null) {
          setResponded(true)
        }
      }
    } catch (error) {
      console.error('Error fetching match:', error)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleRespond(accept: boolean) {
    setIsResponding(true)

    try {
      const response = await fetch(`/api/matches/${matchId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accept,
          reason: !accept ? declineReason : undefined
        }),
      })

      if (response.ok) {
        setResponded(true)
        setMatch(prev => prev ? { ...prev, your_response: accept } : null)
      }
    } catch (error) {
      console.error('Error responding to match:', error)
    } finally {
      setIsResponding(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="size-8 animate-spin text-ms-ink-subtle" />
      </div>
    )
  }

  if (!match) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="py-8 text-center">
            <XCircle className="size-12 mx-auto mb-4 text-red-500" />
            <h2 className="text-lg font-semibold">
              {isArabic ? 'المطابقة غير موجودة' : 'Match Not Found'}
            </h2>
            <p className="text-ms-ink-muted mt-2">
              {isArabic ? 'قد تكون هذه المطابقة قد انتهت صلاحيتها أو تم إلغاؤها' : 'This match may have expired or been cancelled'}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const mentor = Array.isArray(match.mentor) ? match.mentor[0] : match.mentor
  const mentee = Array.isArray(match.mentee) ? match.mentee[0] : match.mentee
  const program = Array.isArray(match.program) ? match.program[0] : match.program
  const partner = match.your_role === 'mentor' ? mentee : mentor

  if (responded || match.your_response !== null) {
    const accepted = match.your_response === true

    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="py-8 text-center">
            {accepted ? (
              <>
                <CheckCircle className="size-16 mx-auto mb-4 text-green-500" />
                <h2 className="text-xl font-semibold text-ms-ink">
                  {isArabic ? 'تم قبول المطابقة!' : 'Match Accepted!'}
                </h2>
                {match.partner_response === true ? (
                  <p className="text-ms-ink-muted mt-2">
                    {isArabic
                      ? 'كلاكما قبل المطابقة. ستبدأ التعاون قريباً!'
                      : 'Both of you have accepted. Your collaboration will begin soon!'}
                  </p>
                ) : match.partner_response === null ? (
                  <div className="mt-4">
                    <Badge variant="outline" className="gap-1">
                      <Clock className="size-3" />
                      {isArabic ? 'في انتظار رد الطرف الآخر' : 'Waiting for partner response'}
                    </Badge>
                  </div>
                ) : null}
              </>
            ) : (
              <>
                <XCircle className="size-16 mx-auto mb-4 text-ms-ink-subtle" />
                <h2 className="text-xl font-semibold text-ms-ink">
                  {isArabic ? 'تم رفض المطابقة' : 'Match Declined'}
                </h2>
                <p className="text-ms-ink-muted mt-2">
                  {isArabic
                    ? 'سيتم إرجاعك إلى مجموعة المطابقات المتاحة'
                    : 'You will be returned to the matching pool'}
                </p>
              </>
            )}
            <Button
              className="mt-6"
              onClick={() => router.push('/dashboard')}
            >
              {isArabic ? 'الذهاب للوحة التحكم' : 'Go to Dashboard'}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-ms-surface-100">
      <Card className="max-w-lg w-full">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">
            {isArabic ? 'اقتراح إرشاد جديد' : 'New Mentorship Match'}
          </CardTitle>
          <CardDescription>
            {program?.name}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-center gap-6">
            <div className="text-center">
              <Avatar className="size-16 mx-auto mb-2">
                <AvatarImage src={mentor?.avatar_url || undefined} />
                <AvatarFallback className="text-lg">
                  {mentor?.display_name?.[0]?.toUpperCase() || 'M'}
                </AvatarFallback>
              </Avatar>
              <p className="font-medium">{mentor?.display_name}</p>
              <p className="text-sm text-ms-ink-muted">
                {isArabic ? 'المرشد' : 'Mentor'}
              </p>
            </div>

            <Sparkles className="size-8 text-amber-500" />

            <div className="text-center">
              <Avatar className="size-16 mx-auto mb-2">
                <AvatarImage src={mentee?.avatar_url || undefined} />
                <AvatarFallback className="text-lg">
                  {mentee?.display_name?.[0]?.toUpperCase() || 'M'}
                </AvatarFallback>
              </Avatar>
              <p className="font-medium">{mentee?.display_name}</p>
              <p className="text-sm text-ms-ink-muted">
                {isArabic ? 'المتعلم' : 'Mentee'}
              </p>
            </div>
          </div>

          {match.reasons && match.reasons.length > 0 && (
            <div className="flex flex-wrap justify-center gap-2">
              {match.reasons.map((reason) => (
                <Badge key={reason} variant="secondary">
                  {reason.replace('_', ' ')}
                </Badge>
              ))}
            </div>
          )}

          <div className="p-4 bg-ms-surface-100 rounded-lg">
            <p className="text-sm text-center text-ms-ink-muted">
              {isArabic
                ? `أنت ${match.your_role === 'mentor' ? 'المرشد' : 'المتعلم'} في هذه المطابقة. هل تقبل العمل مع ${partner?.display_name}?`
                : `You are the ${match.your_role} in this match. Do you accept working with ${partner?.display_name}?`}
            </p>
          </div>

          {showDeclineForm ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{isArabic ? 'سبب الرفض (اختياري)' : 'Reason for declining (optional)'}</Label>
                <Textarea
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  placeholder={isArabic ? 'أخبرنا لماذا...' : 'Tell us why...'}
                  rows={3}
                />
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowDeclineForm(false)}
                  className="flex-1"
                >
                  {isArabic ? 'رجوع' : 'Back'}
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleRespond(false)}
                  disabled={isResponding}
                  className="flex-1"
                >
                  {isResponding && <Loader2 className="size-4 animate-spin me-2" />}
                  {isArabic ? 'تأكيد الرفض' : 'Confirm Decline'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowDeclineForm(true)}
                className="flex-1"
              >
                <XCircle className="size-4 me-2" />
                {isArabic ? 'رفض' : 'Decline'}
              </Button>
              <Button
                onClick={() => handleRespond(true)}
                disabled={isResponding}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {isResponding ? (
                  <Loader2 className="size-4 animate-spin me-2" />
                ) : (
                  <CheckCircle className="size-4 me-2" />
                )}
                {isArabic ? 'قبول' : 'Accept'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
