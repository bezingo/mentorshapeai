'use client'

import { useState, useRef, useCallback } from 'react'
import { User, Upload, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface AvatarUploadSectionProps {
  avatarUrl: string | null
  onUpload: (file: File) => Promise<void>
  className?: string
}

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ACCEPTED_TYPES = ['image/jpeg', 'image/png']

export function AvatarUploadSection({ avatarUrl, onUpload, className }: AvatarUploadSectionProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) return

      setError(null)

      // Validate file type
      if (!ACCEPTED_TYPES.includes(file.type)) {
        setError('Please upload a JPG or PNG file')
        return
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        setError('File size must be less than 5MB')
        return
      }

      // Create preview
      const reader = new FileReader()
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string)
      }
      reader.readAsDataURL(file)

      // Upload file
      setIsUploading(true)
      try {
        await onUpload(file)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to upload image')
        setPreviewUrl(null)
      } finally {
        setIsUploading(false)
      }
    },
    [onUpload]
  )

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  const displayUrl = previewUrl || avatarUrl

  return (
    <div className={cn('flex items-start gap-6', className)}>
      {/* Avatar display */}
      <div className="relative">
        <div
          className={cn(
            'relative h-24 w-24 rounded-full overflow-hidden bg-muted flex items-center justify-center',
            'ring-4 ring-background shadow-lg'
          )}
        >
          {displayUrl ? (
            <img
              src={displayUrl}
              alt="Profile avatar"
              className="h-full w-full object-cover"
            />
          ) : (
            <User className="h-10 w-10 text-muted-foreground" />
          )}

          {/* Upload overlay on hover */}
          <button
            onClick={handleClick}
            disabled={isUploading}
            className={cn(
              'absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 hover:opacity-100 transition-opacity cursor-pointer',
              isUploading && 'opacity-100'
            )}
          >
            {isUploading ? (
              <Loader2 className="h-6 w-6 text-white animate-spin" />
            ) : (
              <Upload className="h-6 w-6 text-white" />
            )}
          </button>
        </div>
      </div>

      {/* Upload controls */}
      <div className="flex flex-col gap-2">
        <Button
          variant="link"
          className="h-auto p-0 text-primary font-medium"
          onClick={handleClick}
          disabled={isUploading}
        >
          {isUploading ? 'Uploading...' : 'Upload new photo'}
        </Button>
        <p className="text-xs text-muted-foreground">
          At least 800x800 px recommended.
          <br />
          JPG or PNG is allowed
        </p>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".jpg,.jpeg,.png,image/jpeg,image/png"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  )
}
