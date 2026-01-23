'use client'

import { useState, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Upload, Loader2, FileText, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ImportReviewModal, ParsedProfileData, SectionSelections } from './import-review-modal'
import { BrandfetchLogo } from '@/components/ui/brandfetch-logo'

interface ProfileImportSectionProps {
  onImportSuccess: () => void
  className?: string
}

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ACCEPTED_FILE_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]
const ACCEPTED_EXTENSIONS = ['.pdf', '.docx']

export function ProfileImportSection({ onImportSuccess, className }: ProfileImportSectionProps) {
  const [isLinkedInLoading, setIsLinkedInLoading] = useState(false)
  const [isCVLoading, setIsCVLoading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false)
  const [parsedData, setParsedData] = useState<ParsedProfileData | null>(null)
  const [importSource, setImportSource] = useState<'linkedin' | 'cv'>('linkedin')
  const [isImporting, setIsImporting] = useState(false)
  const [isLinkedInUrlDialogOpen, setIsLinkedInUrlDialogOpen] = useState(false)
  const [linkedInUrl, setLinkedInUrl] = useState('')

  const fileInputRef = useRef<HTMLInputElement>(null)

  // LinkedIn Import Flow - Direct Apify fetching
  // User enters their LinkedIn profile URL, we fetch it with Apify
  const handleLinkedInImport = () => {
    setError(null)
    setLinkedInUrl('')
    setIsLinkedInUrlDialogOpen(true)
  }

  const handleLinkedInUrlSubmit = async () => {
    if (!linkedInUrl.trim()) {
      setError('Please enter a LinkedIn profile URL')
      return
    }

    // Validate URL format
    if (!linkedInUrl.includes('linkedin.com/in/')) {
      setError('Invalid LinkedIn URL. URL must contain linkedin.com/in/')
      return
    }

    setIsLinkedInLoading(true)
    setError(null)

    try {
      // Call the Apify fetching API
      const response = await fetch('/api/profile/parse-linkedin-apify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ linkedin_url: linkedInUrl.trim() }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error?.message || 'Failed to fetch LinkedIn profile')
      }

      // Validate that we have parsed data
      if (!result.data?.parsed) {
        throw new Error('Invalid response: missing parsed data')
      }

      // Ensure parsedData is a valid object (not the raw Apify response)
      const parsed = result.data.parsed
      if (typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('Invalid response: parsed data must be an object')
      }

      // Close URL dialog and open review modal with parsed data
      setIsLinkedInUrlDialogOpen(false)
      setParsedData(parsed)
      setImportSource('linkedin')
      setIsReviewModalOpen(true)
      setLinkedInUrl('')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch LinkedIn profile'
      setError(message)
    } finally {
      setIsLinkedInLoading(false)
    }
  }

  // CV Upload Flow
  const handleCVUpload = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Reset input
    event.target.value = ''

    setError(null)

    // Validate file type
    const fileName = file.name.toLowerCase()
    const isValidType =
      ACCEPTED_FILE_TYPES.includes(file.type) ||
      ACCEPTED_EXTENSIONS.some((ext) => fileName.endsWith(ext))

    if (!isValidType) {
      setError('Please upload a PDF or DOCX file')
      return
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      setError(`File size exceeds 5MB limit (${(file.size / (1024 * 1024)).toFixed(2)}MB)`)
      return
    }

    setIsCVLoading(true)
    setUploadProgress(0)

    try {
      // Create FormData for file upload
      const formData = new FormData()
      formData.append('file', file)

      // Simulate progress (actual progress would need XMLHttpRequest or fetch with ReadableStream)
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 10
        })
      }, 200)

      // Call the parse-cv API
      const response = await fetch('/api/profile/parse-cv', {
        method: 'POST',
        body: formData,
      })

      clearInterval(progressInterval)
      setUploadProgress(100)

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error?.message || 'Failed to parse CV')
      }

      // Open review modal with parsed data
      setParsedData(result.data.parsed)
      setImportSource('cv')
      setIsReviewModalOpen(true)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to parse CV'
      setError(message)
    } finally {
      setIsCVLoading(false)
      setUploadProgress(0)
    }
  }

  // Import confirmed data
  const handleImport = async (sections: SectionSelections, data: ParsedProfileData) => {
    setIsImporting(true)

    try {
      const response = await fetch('/api/profile/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sections, data }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error?.message || 'Failed to import profile data')
      }

      // Close modal and trigger refresh
      setIsReviewModalOpen(false)
      setParsedData(null)
      onImportSuccess()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to import profile data'
      setError(message)
    } finally {
      setIsImporting(false)
    }
  }

  const handleCloseModal = () => {
    setIsReviewModalOpen(false)
    setParsedData(null)
  }

  const isLoading = isLinkedInLoading || isCVLoading

  return (
    <>
      <Card className={cn('', className)}>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-semibold text-base">Quick Import</h3>
              <p className="text-sm text-muted-foreground">
                Import your profile information from LinkedIn or upload your CV. Enter your LinkedIn profile URL to fetch comprehensive data including work experience, education, and skills.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={handleLinkedInImport}
                disabled={isLoading}
                className="gap-2"
              >
                {isLinkedInLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="hidden sm:inline">Fetching...</span>
                  </>
                ) : (
                  <BrandfetchLogo 
                    identifier="linkedin.com" 
                    type="icon" 
                    width={16} 
                    height={16} 
                    alt="LinkedIn"
                    useNextImage={false}
                    className="flex-shrink-0"
                  />
                )}
                Import from LinkedIn
              </Button>

              <Button
                variant="outline"
                onClick={handleCVUpload}
                disabled={isLoading}
                className="gap-2"
              >
                {isCVLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="hidden sm:inline">
                      {uploadProgress > 0 && uploadProgress < 100
                        ? `Uploading ${uploadProgress}%`
                        : 'Parsing your CV...'}
                    </span>
                    <span className="sm:hidden">
                      {uploadProgress > 0 ? `${uploadProgress}%` : '...'}
                    </span>
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Upload CV
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={handleFileChange}
            className="hidden"
          />

          {/* Error message */}
          {error && (
            <div className="mt-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
              <button
                onClick={() => setError(null)}
                className="ml-auto text-destructive/70 hover:text-destructive"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Helper text */}
          <p className="mt-3 text-xs text-muted-foreground">
            Supported formats: PDF, DOCX (max 5MB). Your existing data will be replaced for
            selected sections.
          </p>
        </CardContent>
      </Card>

      {/* LinkedIn URL Input Dialog */}
      <Dialog
        open={isLinkedInUrlDialogOpen}
        onOpenChange={(open) => {
          setIsLinkedInUrlDialogOpen(open)
          if (!open) {
            setLinkedInUrl('')
            setError(null)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BrandfetchLogo 
                identifier="linkedin.com" 
                type="icon" 
                width={20} 
                height={20} 
                alt="LinkedIn"
                useNextImage={false}
                className="flex-shrink-0"
              />
              Import from LinkedIn
            </DialogTitle>
            <DialogDescription>
              Enter your LinkedIn profile URL. We'll fetch your profile to get comprehensive data including work experience, education, and skills.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="linkedin-url">
                LinkedIn Profile URL <span className="text-destructive">*</span>
              </Label>
              <Input
                id="linkedin-url"
                type="url"
                placeholder="https://www.linkedin.com/in/your-profile"
                value={linkedInUrl}
                onChange={(e) => {
                  setLinkedInUrl(e.target.value)
                  setError(null) // Clear error when user types
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isLinkedInLoading) {
                    e.preventDefault()
                    handleLinkedInUrlSubmit()
                  }
                }}
                disabled={isLinkedInLoading}
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Example: https://www.linkedin.com/in/john-doe
              </p>
              {error && (
                <div className="p-2 rounded-lg bg-destructive/10 text-destructive text-sm flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  {error}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsLinkedInUrlDialogOpen(false)
                setLinkedInUrl('')
                setError(null)
              }}
              disabled={isLinkedInLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleLinkedInUrlSubmit}
              disabled={!linkedInUrl.trim() || isLinkedInLoading}
              className="gap-2"
            >
              {isLinkedInLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Fetching...
                </>
              ) : (
                <>
                  <BrandfetchLogo 
                    identifier="linkedin.com" 
                    type="icon" 
                    width={16} 
                    height={16} 
                    alt="LinkedIn"
                    useNextImage={false}
                    className="flex-shrink-0"
                  />
                  Import Profile
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Review Modal */}
      <ImportReviewModal
        isOpen={isReviewModalOpen}
        onClose={handleCloseModal}
        parsedData={parsedData}
        source={importSource}
        onImport={handleImport}
        isImporting={isImporting}
      />
    </>
  )
}
