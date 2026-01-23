'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Loader2, User, Briefcase, GraduationCap, Lightbulb, Check, X, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import { BrandfetchLogo } from '@/components/ui/brandfetch-logo'

export interface ParsedProfileData {
  display_name: string | null
  headline: string | null
  bio: string | null
  work_experiences: Array<{
    company: string
    title: string
    start_date: string | null
    end_date: string | null
    description: string | null
  }>
  educations: Array<{
    institution: string
    degree: string | null
    start_date: string | null
    end_date: string | null
  }>
  skills: string[]
  _metadata?: {
    available: {
      basic: boolean
      positions: boolean
      education: boolean
      skills: boolean
    }
    message?: string
  }
}

export interface SectionSelections {
  personal: boolean
  work: boolean
  education: boolean
  skills: boolean
}

interface ImportReviewModalProps {
  isOpen: boolean
  onClose: () => void
  parsedData: ParsedProfileData | null
  source: 'linkedin' | 'cv'
  onImport: (sections: SectionSelections, data: ParsedProfileData) => Promise<void>
  isImporting?: boolean
}

export function ImportReviewModal({
  isOpen,
  onClose,
  parsedData,
  source,
  onImport,
  isImporting = false,
}: ImportReviewModalProps) {
  const [selections, setSelections] = useState<SectionSelections>({
    personal: true,
    work: true,
    education: true,
    skills: true,
  })

  const toggleSection = (section: keyof SectionSelections) => {
    setSelections((prev) => ({ ...prev, [section]: !prev[section] }))
  }

  const handleImport = async () => {
    if (!parsedData) return
    await onImport(selections, parsedData)
  }

  const handleClose = () => {
    // Reset selections when closing
    setSelections({
      personal: true,
      work: true,
      education: true,
      skills: true,
    })
    onClose()
  }

  const hasPersonalInfo = parsedData?.display_name || parsedData?.headline || parsedData?.bio
  const hasWorkExperiences = parsedData?.work_experiences && parsedData.work_experiences.length > 0
  const hasEducations = parsedData?.educations && parsedData.educations.length > 0
  const hasSkills = parsedData?.skills && parsedData.skills.length > 0

  const selectedCount = Object.values(selections).filter(Boolean).length
  const hasAnyData = hasPersonalInfo || hasWorkExperiences || hasEducations || hasSkills

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {source === 'linkedin' ? (
              <BrandfetchLogo 
                identifier="linkedin.com" 
                type="icon" 
                width={20} 
                height={20} 
                alt="LinkedIn"
                useNextImage={false}
                className="flex-shrink-0"
              />
            ) : (
              <FileText className="h-5 w-5" />
            )}
            Review Imported Data
          </DialogTitle>
          <DialogDescription>
            Select which sections you want to import from your {source === 'linkedin' ? 'LinkedIn profile' : 'CV'}.
            Importing will replace existing data in the selected sections.
          </DialogDescription>
        </DialogHeader>

        {!parsedData || !hasAnyData ? (
          <div className="py-8 text-center text-muted-foreground">
            <p>No data found to import.</p>
            {parsedData?._metadata?.message && (
              <p className="mt-2 text-sm text-muted-foreground">{parsedData._metadata.message}</p>
            )}
          </div>
        ) : (
          <div className="space-y-4 py-4">
            {/* Show data availability message for LinkedIn imports */}
            {source === 'linkedin' && parsedData._metadata?.message && (
              <div className="rounded-lg bg-muted p-3 text-sm">
                <p className="font-medium mb-1">Data Retrieved:</p>
                <p className="text-muted-foreground">{parsedData._metadata.message}</p>
                {(!parsedData._metadata.available.positions || 
                  !parsedData._metadata.available.education || 
                  !parsedData._metadata.available.skills) && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Note: Some data may not be available due to LinkedIn API restrictions. 
                    You can manually add missing information after importing.
                  </p>
                )}
              </div>
            )}
            {/* Personal Info Section */}
            {hasPersonalInfo && (
              <SectionCard
                title="Personal Info"
                icon={<User className="h-4 w-4" />}
                selected={selections.personal}
                onToggle={() => toggleSection('personal')}
              >
                <div className="space-y-2 text-sm">
                  {parsedData.display_name && (
                    <div>
                      <span className="text-muted-foreground">Name:</span>{' '}
                      <span className="font-medium">{parsedData.display_name}</span>
                    </div>
                  )}
                  {parsedData.headline && (
                    <div>
                      <span className="text-muted-foreground">Headline:</span>{' '}
                      <span className="font-medium">{parsedData.headline}</span>
                    </div>
                  )}
                  {parsedData.bio && (
                    <div>
                      <span className="text-muted-foreground">Bio:</span>{' '}
                      <span className="font-medium line-clamp-2">{parsedData.bio}</span>
                    </div>
                  )}
                </div>
              </SectionCard>
            )}

            {/* Work History Section */}
            {hasWorkExperiences && (
              <SectionCard
                title="Work History"
                icon={<Briefcase className="h-4 w-4" />}
                selected={selections.work}
                onToggle={() => toggleSection('work')}
                count={parsedData.work_experiences.length}
              >
                <div className="space-y-3">
                  {parsedData.work_experiences.slice(0, 3).map((exp, index) => (
                    <div key={index} className="text-sm border-l-2 border-muted pl-3">
                      <div className="font-medium">{exp.title}</div>
                      <div className="text-muted-foreground">{exp.company}</div>
                      {exp.start_date && (
                        <div className="text-xs text-muted-foreground">
                          {formatDateRange(exp.start_date, exp.end_date)}
                        </div>
                      )}
                    </div>
                  ))}
                  {parsedData.work_experiences.length > 3 && (
                    <p className="text-xs text-muted-foreground">
                      +{parsedData.work_experiences.length - 3} more
                    </p>
                  )}
                </div>
              </SectionCard>
            )}

            {/* Education Section */}
            {hasEducations && (
              <SectionCard
                title="Education"
                icon={<GraduationCap className="h-4 w-4" />}
                selected={selections.education}
                onToggle={() => toggleSection('education')}
                count={parsedData.educations.length}
              >
                <div className="space-y-3">
                  {parsedData.educations.slice(0, 3).map((edu, index) => (
                    <div key={index} className="text-sm border-l-2 border-muted pl-3">
                      <div className="font-medium">{edu.degree || 'Degree not specified'}</div>
                      <div className="text-muted-foreground">{edu.institution}</div>
                      {edu.start_date && (
                        <div className="text-xs text-muted-foreground">
                          {formatDateRange(edu.start_date, edu.end_date)}
                        </div>
                      )}
                    </div>
                  ))}
                  {parsedData.educations.length > 3 && (
                    <p className="text-xs text-muted-foreground">
                      +{parsedData.educations.length - 3} more
                    </p>
                  )}
                </div>
              </SectionCard>
            )}

            {/* Skills Section */}
            {hasSkills && (
              <SectionCard
                title="Skills"
                icon={<Lightbulb className="h-4 w-4" />}
                selected={selections.skills}
                onToggle={() => toggleSection('skills')}
                count={parsedData.skills.length}
              >
                <div className="flex flex-wrap gap-1.5">
                  {parsedData.skills.slice(0, 10).map((skill, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-primary/10 text-primary"
                    >
                      {skill}
                    </span>
                  ))}
                  {parsedData.skills.length > 10 && (
                    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-muted text-muted-foreground">
                      +{parsedData.skills.length - 10} more
                    </span>
                  )}
                </div>
              </SectionCard>
            )}
          </div>
        )}

        <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
          <Button variant="outline" onClick={handleClose} disabled={isImporting}>
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={isImporting || selectedCount === 0 || !hasAnyData}
          >
            {isImporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Import Selected ({selectedCount})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface SectionCardProps {
  title: string
  icon: React.ReactNode
  selected: boolean
  onToggle: () => void
  count?: number
  children: React.ReactNode
}

function SectionCard({ title, icon, selected, onToggle, count, children }: SectionCardProps) {
  return (
    <div
      className={cn(
        'rounded-lg border p-4 transition-colors cursor-pointer',
        selected ? 'border-primary bg-primary/5' : 'border-muted bg-muted/30 opacity-60'
      )}
      onClick={onToggle}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              'flex items-center justify-center w-8 h-8 rounded-full',
              selected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            )}
          >
            {icon}
          </div>
          <div>
            <Label className="font-medium cursor-pointer">{title}</Label>
            {count !== undefined && (
              <span className="ml-2 text-xs text-muted-foreground">({count} items)</span>
            )}
          </div>
        </div>
        <div
          className={cn(
            'flex items-center justify-center w-6 h-6 rounded-full border-2 transition-colors',
            selected
              ? 'bg-primary border-primary text-primary-foreground'
              : 'border-muted-foreground/30'
          )}
        >
          {selected && <Check className="h-4 w-4" />}
        </div>
      </div>
      <div className={cn('pl-10', !selected && 'opacity-50')}>{children}</div>
    </div>
  )
}

function formatDateRange(startDate: string | null, endDate: string | null): string {
  if (!startDate) return ''

  const startYear = new Date(startDate).getFullYear()
  if (!endDate) {
    return `${startYear} - Present`
  }
  const endYear = new Date(endDate).getFullYear()
  return `${startYear} - ${endYear}`
}
