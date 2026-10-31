'use client'

import { useState } from 'react'
import { Share2, Copy, Check, QrCode, Link2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useI18n } from '@/lib/i18n'

interface ShareButtonProps {
  profileId: string
  handle: string
}

export function ShareButton({ profileId, handle }: ShareButtonProps) {
  const { locale } = useI18n()
  const isArabic = locale === 'ar'

  const [copied, setCopied] = useState(false)
  const [showQR, setShowQR] = useState(false)
  const [isCreatingLink, setIsCreatingLink] = useState(false)

  const profileUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/m/${handle}`

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(profileUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)

      fetch('/api/onelink/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile_id: profileId, event_type: 'copy_link' })
      })
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  async function shareNative() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: isArabic ? 'ملفي الشخصي على Mentorshape' : 'My Mentorshape Profile',
          url: profileUrl
        })
        
        fetch('/api/onelink/event', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ profile_id: profileId, event_type: 'share' })
        })
      } catch {
        // User cancelled
      }
    } else {
      copyLink()
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Share2 className="size-4" />
            <span className="hidden sm:inline">{isArabic ? 'مشاركة' : 'Share'}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={copyLink} className="gap-2 cursor-pointer">
            {copied ? (
              <Check className="size-4 text-green-500" />
            ) : (
              <Copy className="size-4" />
            )}
            {copied ? (isArabic ? 'تم النسخ!' : 'Copied!') : (isArabic ? 'نسخ الرابط' : 'Copy Link')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={shareNative} className="gap-2 cursor-pointer">
            <Share2 className="size-4" />
            {isArabic ? 'مشاركة' : 'Share'}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setShowQR(true)} className="gap-2 cursor-pointer">
            <QrCode className="size-4" />
            {isArabic ? 'رمز QR' : 'QR Code'}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={showQR} onOpenChange={setShowQR}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center">
              {isArabic ? 'امسح للزيارة' : 'Scan to Visit'}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 p-4">
            <div className="bg-white p-4 rounded-lg">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(profileUrl)}`}
                alt="QR Code"
                className="w-48 h-48"
              />
            </div>
            <p className="text-sm text-center text-ms-ink-muted break-all">
              {profileUrl}
            </p>
            <Button onClick={copyLink} variant="outline" className="gap-2">
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              {copied ? (isArabic ? 'تم النسخ!' : 'Copied!') : (isArabic ? 'نسخ الرابط' : 'Copy Link')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
