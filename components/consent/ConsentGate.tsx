'use client'

import { useEffect, useState, ReactNode } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { 
  Shield, 
  Loader2, 
  CheckCircle,
  AlertTriangle,
  Calendar,
} from 'lucide-react'

interface ConsentStatus {
  user_consent_given: boolean
  parent_consent_given: boolean
  is_minor: boolean
  age: number | null
  can_proceed: boolean
  blocking_reason: string | null
  requires_consent: boolean
  min_age: number
}

interface ConsentGateProps {
  children: ReactNode
  feature?: 'collab' | 'chat' | 'focus'
}

export function ConsentGate({ children, feature = 'collab' }: ConsentGateProps) {
  const [status, setStatus] = useState<ConsentStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)

  const [dateOfBirth, setDateOfBirth] = useState('')
  const [consentGiven, setConsentGiven] = useState(false)
  const [parentEmail, setParentEmail] = useState('')

  useEffect(() => {
    fetchConsentStatus()
  }, [])

  async function fetchConsentStatus() {
    try {
      const response = await fetch('/api/safeguarding/consent')
      if (response.ok) {
        const json = await response.json()
        setStatus(json.data)
        if (!json.data.can_proceed && json.data.requires_consent) {
          setShowForm(true)
        }
      }
    } catch {
      // If consent API fails, allow access (non-school org)
      setStatus({
        user_consent_given: true,
        parent_consent_given: true,
        is_minor: false,
        age: null,
        can_proceed: true,
        blocking_reason: null,
        requires_consent: false,
        min_age: 13,
      })
    } finally {
      setIsLoading(false)
    }
  }

  async function submitConsent() {
    if (!dateOfBirth || !consentGiven) return

    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/safeguarding/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date_of_birth: dateOfBirth,
          consent_given: consentGiven,
          parent_email: parentEmail || undefined,
        }),
      })

      const json = await response.json()

      if (response.ok) {
        await fetchConsentStatus()
      } else {
        setError(json.error?.message || 'Failed to submit consent')
      }
    } catch {
      setError('Failed to connect to server')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!status) {
    return <>{children}</>
  }

  if (status.can_proceed) {
    return <>{children}</>
  }

  const featureLabels = {
    collab: 'start a collaboration',
    chat: 'send messages',
    focus: 'participate in Focus sessions',
  }

  return (
    <div className="max-w-lg mx-auto py-12">
      <Card>
        <CardHeader className="text-center">
          <Shield className="h-12 w-12 mx-auto mb-4 text-primary" />
          <CardTitle>Consent Required</CardTitle>
          <CardDescription>
            {status.blocking_reason || 
              `We need your consent before you can ${featureLabels[feature]}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {status.is_minor && !status.parent_consent_given && status.user_consent_given && (
            <Alert>
              <Calendar className="h-4 w-4" />
              <AlertTitle>Parental Consent Required</AlertTitle>
              <AlertDescription>
                Since you are under {status.min_age || 18}, we&apos;ve sent a consent request 
                to your parent/guardian. Please ask them to check their email.
              </AlertDescription>
            </Alert>
          )}

          {showForm && !status.user_consent_given && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="dob">Date of Birth</Label>
                <Input
                  id="dob"
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div className="flex items-start space-x-3">
                <Checkbox
                  id="consent"
                  checked={consentGiven}
                  onCheckedChange={(checked) => setConsentGiven(checked === true)}
                />
                <div className="space-y-1 leading-none">
                  <Label htmlFor="consent" className="text-sm font-normal">
                    I agree to participate in mentorship activities and understand that 
                    my counselor may view session notes for safeguarding purposes.
                  </Label>
                </div>
              </div>

              {/* Show parent email field for minors */}
              {dateOfBirth && calculateAge(dateOfBirth) < (status.min_age || 18) && (
                <div className="space-y-2">
                  <Label htmlFor="parent">Parent/Guardian Email</Label>
                  <Input
                    id="parent"
                    type="email"
                    placeholder="parent@example.com"
                    value={parentEmail}
                    onChange={(e) => setParentEmail(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Your parent/guardian will receive a consent request
                  </p>
                </div>
              )}

              <Button 
                className="w-full" 
                onClick={submitConsent}
                disabled={!dateOfBirth || !consentGiven || isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Submit Consent
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function calculateAge(dateOfBirth: string): number {
  const today = new Date()
  const birth = new Date(dateOfBirth)
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }
  return age
}
