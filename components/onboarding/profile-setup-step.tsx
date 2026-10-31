'use client'

import { useState, useRef } from 'react'
import { Camera, User, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useI18n } from '@/lib/i18n'

interface ProfileSetupStepProps {
  onSubmit: (data: { displayName: string; avatarFile?: File }) => void
  defaultName?: string
  defaultAvatarUrl?: string
  isLoading?: boolean
}

export function ProfileSetupStep({
  onSubmit,
  defaultName = '',
  defaultAvatarUrl,
  isLoading = false,
}: ProfileSetupStepProps) {
  const { t, locale, isRTL } = useI18n()
  const isArabic = locale === 'ar'
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [displayName, setDisplayName] = useState(defaultName)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(defaultAvatarUrl || null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setAvatarFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (displayName.trim()) {
      onSubmit({
        displayName: displayName.trim(),
        avatarFile: avatarFile || undefined,
      })
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Avatar */}
      <div className="flex flex-col items-center">
        <div className="relative">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="relative size-24 rounded-full overflow-hidden bg-ms-surface-200 border-2 border-ms-line hover:border-ms-ember transition-colors group"
          >
            {avatarPreview ? (
              <img
                src={avatarPreview}
                alt="Avatar preview"
                className="size-full object-cover"
              />
            ) : (
              <div className="size-full flex items-center justify-center text-ms-ink-subtle">
                <User className="size-10" />
              </div>
            )}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Camera className="size-6 text-white" />
            </div>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarChange}
            className="hidden"
          />
        </div>
        <p className="mt-2 text-sm text-ms-ink-subtle">
          {isArabic ? 'انقر لإضافة صورة' : 'Click to add a photo'}
        </p>
      </div>

      {/* Display name */}
      <div className="space-y-2">
        <Label htmlFor="displayName" className="text-ms-ink-muted">
          {isArabic ? 'الاسم المعروض' : 'Display Name'}
        </Label>
        <Input
          id="displayName"
          type="text"
          placeholder={isArabic ? 'كيف تريد أن يعرفك الآخرون؟' : 'How would you like to be known?'}
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="bg-ms-surface-000 border-ms-line text-ms-ink placeholder:text-ms-ink-subtle focus:border-ms-ember focus:ring-ms-ember"
          required
          disabled={isLoading}
          dir={isRTL ? 'rtl' : 'ltr'}
        />
        <p className="text-xs text-ms-ink-subtle">
          {isArabic
            ? 'هذا هو الاسم الذي سيظهر على ملفك الشخصي'
            : 'This is the name that will appear on your profile'}
        </p>
      </div>

      <Button
        type="submit"
        disabled={!displayName.trim() || isLoading}
        className="w-full bg-ms-ember text-ms-on-ember hover:bg-ms-ember/90 font-semibold"
      >
        {isLoading ? (
          <>
            <Loader2 className="me-2 h-4 w-4 animate-spin" />
            {isArabic ? 'جارٍ الحفظ...' : 'Saving...'}
          </>
        ) : (
          t.common.next
        )}
      </Button>
    </form>
  )
}
