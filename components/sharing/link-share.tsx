'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Copy, Share2, Twitter, Mail, Check } from 'lucide-react'
import { BrandfetchLogo } from '@/components/ui/brandfetch-logo'

interface LinkShareProps {
  url: string
  title?: string
  description?: string
}

export function LinkShare({ url, title, description }: LinkShareProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  const shareText = title || 'Check this out'
  const shareUrl = encodeURIComponent(url)
  const shareDescription = encodeURIComponent(description || '')

  const shareLinks = {
    twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${shareUrl}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}`,
    email: `mailto:?subject=${encodeURIComponent(shareText)}&body=${shareDescription}%0A%0A${shareUrl}`,
    whatsapp: `https://wa.me/?text=${encodeURIComponent(`${shareText} ${url}`)}`,
  }

  const handleShare = async (platform: keyof typeof shareLinks) => {
    if (platform === 'whatsapp') {
      window.open(shareLinks[platform], '_blank')
      return
    }

    if (navigator.share && platform !== 'email') {
      try {
        await navigator.share({
          title: shareText,
          text: description,
          url: url,
        })
        return
      } catch (error) {
        // User cancelled or share failed, fall through to window.open
      }
    }

    window.open(shareLinks[platform], '_blank')
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleCopy}
        className="gap-2"
      >
        {copied ? (
          <>
            <Check className="h-4 w-4" />
            Copied!
          </>
        ) : (
          <>
            <Copy className="h-4 w-4" />
            Copy Link
          </>
        )}
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Share2 className="h-4 w-4" />
            Share
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => handleShare('twitter')}>
            <Twitter className="mr-2 h-4 w-4" />
            Twitter
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleShare('linkedin')}>
            <BrandfetchLogo 
              identifier="linkedin.com" 
              type="icon" 
              width={16} 
              height={16} 
              alt="LinkedIn"
              useNextImage={false}
              className="mr-2 flex-shrink-0"
            />
            LinkedIn
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleShare('whatsapp')}>
            <Share2 className="mr-2 h-4 w-4" />
            WhatsApp
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleShare('email')}>
            <Mail className="mr-2 h-4 w-4" />
            Email
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

