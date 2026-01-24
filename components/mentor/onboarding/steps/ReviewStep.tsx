'use client'

import { useState } from 'react'
import {
  User,
  Briefcase,
  Languages,
  Calendar,
  Link as LinkIcon,
  Pencil,
  Check,
  Globe,
  Clock,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useOnboardingState, type StepNumber } from '@/hooks/use-onboarding-state'
import { cn } from '@/lib/utils'

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

interface ReviewStepProps {
  onEditStep?: (step: StepNumber) => void
}

/**
 * Step 6: Review and Submit
 * Shows summary of all entered data with edit options and terms acceptance
 */
export function ReviewStep({ onEditStep }: ReviewStepProps) {
  const { formData, completedSteps, canProceed } = useOnboardingState()
  const [termsAccepted, setTermsAccepted] = useState(false)

  const {
    bio,
    expertiseAreas,
    skills,
    languages,
    timezone,
    yearsOfExperience,
    availability,
    handle,
    calendarConnected,
  } = formData

  // Group availability by day
  const availabilityByDay = DAYS_OF_WEEK.map((day, index) => ({
    day,
    slots: availability.filter((slot) => slot.day_of_week === index),
  })).filter((d) => d.slots.length > 0)

  const handleEdit = (step: StepNumber) => {
    onEditStep?.(step)
  }

  // Check if all required steps are complete
  const allStepsComplete =
    canProceed(2) && canProceed(3) && canProceed(5) // Bio, Skills, Handle required

  return (
    <div className="space-y-6 py-4">
      <div>
        <h2 className="text-2xl font-semibold">Review Your Profile</h2>
        <p className="text-muted-foreground mt-1">
          Review your information before becoming a mentor. You can edit any
          section by clicking the edit button.
        </p>
      </div>

      {/* Bio & Expertise Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4" />
            Bio & Expertise
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleEdit(2)}
            className="h-8 gap-1"
          >
            <Pencil className="h-3 w-3" />
            Edit
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {bio ? (
            <>
              <p className="text-sm text-muted-foreground line-clamp-3">{bio}</p>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Expertise Areas</p>
                <div className="flex flex-wrap gap-1.5">
                  {expertiseAreas.length > 0 ? (
                    expertiseAreas.map((area) => (
                      <Badge key={area} variant="secondary" className="text-xs">
                        {area}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground italic">
                      No expertise areas added
                    </span>
                  )}
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-amber-600">
              Please add your bio and expertise areas
            </p>
          )}
        </CardContent>
      </Card>

      {/* Skills & Languages Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Briefcase className="h-4 w-4" />
            Skills & Languages
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleEdit(3)}
            className="h-8 gap-1"
          >
            <Pencil className="h-3 w-3" />
            Edit
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Skills */}
          <div>
            <p className="text-xs text-muted-foreground mb-1">Skills</p>
            <div className="flex flex-wrap gap-1.5">
              {skills.length > 0 ? (
                skills.slice(0, 10).map((skill) => (
                  <Badge key={skill} variant="outline" className="text-xs">
                    {skill}
                  </Badge>
                ))
              ) : (
                <span className="text-sm text-amber-600 italic">
                  Please add at least one skill
                </span>
              )}
              {skills.length > 10 && (
                <Badge variant="outline" className="text-xs">
                  +{skills.length - 10} more
                </Badge>
              )}
            </div>
          </div>

          {/* Languages */}
          <div>
            <p className="text-xs text-muted-foreground mb-1">Languages</p>
            <div className="flex flex-wrap gap-1.5">
              {languages.length > 0 ? (
                languages.map((lang) => (
                  <Badge key={lang} variant="outline" className="text-xs">
                    <Languages className="h-3 w-3 mr-1" />
                    {lang}
                  </Badge>
                ))
              ) : (
                <span className="text-sm text-amber-600 italic">
                  Please add at least one language
                </span>
              )}
            </div>
          </div>

          {/* Timezone & Experience */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground pt-2">
            <span className="flex items-center gap-1">
              <Globe className="h-3 w-3" />
              {timezone}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {yearsOfExperience} years experience
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Availability Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Availability
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleEdit(4)}
            className="h-8 gap-1"
          >
            <Pencil className="h-3 w-3" />
            Edit
          </Button>
        </CardHeader>
        <CardContent>
          {availability.length > 0 ? (
            <div className="space-y-2">
              {availabilityByDay.map(({ day, slots }) => (
                <div key={day} className="flex items-center gap-2 text-sm">
                  <span className="w-10 font-medium">{day}</span>
                  <div className="flex flex-wrap gap-2">
                    {slots.map((slot, i) => (
                      <span
                        key={i}
                        className="text-muted-foreground bg-muted px-2 py-0.5 rounded"
                      >
                        {slot.start_time} - {slot.end_time}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
              {calendarConnected && (
                <div className="flex items-center gap-1 text-xs text-green-600 mt-2">
                  <Check className="h-3 w-3" />
                  Google Calendar connected
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No availability set yet. You can add it later from your dashboard.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Handle Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <LinkIcon className="h-4 w-4" />
            Profile Handle
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleEdit(5)}
            className="h-8 gap-1"
          >
            <Pencil className="h-3 w-3" />
            Edit
          </Button>
        </CardHeader>
        <CardContent>
          {handle ? (
            <div className="space-y-2">
              <p className="text-sm font-medium">
                mentorshape.com/m/{handle}
              </p>
              <p className="text-xs text-muted-foreground">
                This will be your public profile URL
              </p>
            </div>
          ) : (
            <p className="text-sm text-amber-600">Please choose a handle</p>
          )}
        </CardContent>
      </Card>

      {/* Terms Acceptance */}
      <div className="border rounded-xl p-4 space-y-3">
        <Label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={termsAccepted}
            onChange={(e) => setTermsAccepted(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-input"
          />
          <span className="text-sm">
            I agree to the{' '}
            <a
              href="/legal/terms"
              target="_blank"
              className="text-primary hover:underline"
            >
              Terms of Service
            </a>{' '}
            and{' '}
            <a
              href="/legal/privacy"
              target="_blank"
              className="text-primary hover:underline"
            >
              Privacy Policy
            </a>
            . I understand that as a mentor, I&apos;m committing to help mentees
            with integrity and respect.
          </span>
        </Label>
      </div>

      {/* Status Messages */}
      <div className="space-y-2">
        {!allStepsComplete && (
          <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 text-sm">
            Please complete all required sections before submitting.
          </div>
        )}
        {allStepsComplete && !termsAccepted && (
          <div className="p-3 rounded-lg bg-muted text-muted-foreground text-sm">
            Accept the terms and conditions to complete your mentor profile.
          </div>
        )}
        {allStepsComplete && termsAccepted && (
          <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 text-sm flex items-center gap-2">
            <Check className="h-4 w-4" />
            You&apos;re all set! Click &quot;Become a Mentor&quot; to complete your profile.
          </div>
        )}
      </div>

      {/* Hidden input for form validation - used by parent to check if can proceed */}
      <input
        type="hidden"
        name="termsAccepted"
        value={termsAccepted ? 'true' : 'false'}
        data-terms-accepted={termsAccepted}
      />
    </div>
  )
}
