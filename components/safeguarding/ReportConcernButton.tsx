'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Flag, 
  Loader2, 
  CheckCircle,
  AlertTriangle,
} from 'lucide-react'

interface ReportConcernButtonProps {
  collaborationId?: string
  focusId?: string
  reportedProfileId?: string
  variant?: 'default' | 'outline' | 'ghost' | 'destructive'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  className?: string
}

const REPORT_TYPES = [
  { value: 'inappropriate_behavior', label: 'Inappropriate Behavior' },
  { value: 'harassment', label: 'Harassment or Bullying' },
  { value: 'safety_concern', label: 'Safety Concern' },
  { value: 'boundary_violation', label: 'Professional Boundary Violation' },
  { value: 'no_show', label: 'Repeated No-Shows' },
  { value: 'other', label: 'Other Concern' },
]

export function ReportConcernButton({
  collaborationId,
  focusId,
  reportedProfileId,
  variant = 'outline',
  size = 'sm',
  className = '',
}: ReportConcernButtonProps) {
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [reportType, setReportType] = useState('')
  const [description, setDescription] = useState('')

  const handleSubmit = async () => {
    if (!reportType || !description.trim()) return

    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/safeguarding/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          report_type: reportType,
          description: description.trim(),
          collaboration_id: collaborationId,
          focus_id: focusId,
          reported_profile_id: reportedProfileId,
        }),
      })

      const json = await response.json()

      if (response.ok) {
        setSuccess(true)
        setTimeout(() => {
          setOpen(false)
          setSuccess(false)
          setReportType('')
          setDescription('')
        }, 2000)
      } else {
        setError(json.error?.message || 'Failed to submit report')
      }
    } catch {
      setError('Failed to connect to server')
    } finally {
      setIsSubmitting(false)
    }
  }

  const reset = () => {
    setReportType('')
    setDescription('')
    setError(null)
    setSuccess(false)
  }

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      setOpen(newOpen)
      if (!newOpen) reset()
    }}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size} className={className}>
          <Flag className="h-4 w-4 mr-2" />
          Report Concern
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Report a Concern</DialogTitle>
          <DialogDescription>
            Your report will be reviewed by school administrators. 
            All reports are confidential.
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="py-8 text-center">
            <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
            <p className="text-lg font-medium">Report Submitted</p>
            <p className="text-sm text-muted-foreground">
              Your school administrator will review this report.
            </p>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="type">Type of Concern</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger id="type">
                  <SelectValue placeholder="Select a concern type" />
                </SelectTrigger>
                <SelectContent>
                  {REPORT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Please describe your concern in detail..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                Include specific details such as dates, times, and what happened.
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          {!success && (
            <>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!reportType || !description.trim() || isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Report'
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
