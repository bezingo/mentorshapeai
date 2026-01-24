'use client'

import { useState } from 'react'
import {
  Linkedin,
  Copy,
  Check,
  ExternalLink,
  RefreshCw,
  Loader2,
  Sparkles,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export interface LinkedInShareCardProps {
  /** The post text with emojis */
  postText?: string
  /** The clean post text without emojis */
  postTextClean?: string
  /** Hashtags array */
  hashtags?: string[]
  /** Whether the post is currently being generated */
  isGenerating?: boolean
  /** Whether to show as loading state */
  isLoading?: boolean
  /** Error message if generation failed */
  error?: string | null
  /** Callback to regenerate the post */
  onRegenerate?: () => Promise<void>
  /** Goal ID for sharing link */
  goalId?: string
}

/**
 * LinkedInShareCard - Display LinkedIn post preview with copy and share functionality
 */
export function LinkedInShareCard({
  postText,
  postTextClean,
  hashtags = [],
  isGenerating = false,
  isLoading = false,
  error = null,
  onRegenerate,
  goalId,
}: LinkedInShareCardProps) {
  const [copied, setCopied] = useState(false)
  const [showEmojis, setShowEmojis] = useState(true)
  const [isRegenerating, setIsRegenerating] = useState(false)

  const displayText = showEmojis ? postText : postTextClean

  const handleCopy = async () => {
    if (!displayText) return

    try {
      await navigator.clipboard.writeText(displayText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = displayText
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleShare = () => {
    if (!displayText) return

    // LinkedIn share URL with pre-filled text
    const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
      window.location.origin + (goalId ? `/g/${goalId}` : '')
    )}`

    window.open(linkedInUrl, '_blank', 'width=600,height=600')
  }

  const handleRegenerate = async () => {
    if (!onRegenerate) return
    setIsRegenerating(true)
    try {
      await onRegenerate()
    } finally {
      setIsRegenerating(false)
    }
  }

  if (isLoading || isGenerating) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <div className="relative">
              <Linkedin className="h-12 w-12 text-[#0077B5]" />
              <Sparkles className="h-5 w-5 text-yellow-500 absolute -top-1 -right-1 animate-pulse" />
            </div>
            <p className="text-sm font-medium">Generating your LinkedIn post...</p>
            <p className="text-xs">Crafting the perfect achievement announcement</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Linkedin className="h-5 w-5 text-[#0077B5]" />
            Share on LinkedIn
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center space-y-4 py-4">
            <p className="text-destructive font-medium">Failed to generate post</p>
            <p className="text-sm text-muted-foreground">{error}</p>
            {onRegenerate && (
              <Button variant="outline" onClick={handleRegenerate} disabled={isRegenerating}>
                {isRegenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Regenerating...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Try Again
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!postText) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Linkedin className="h-5 w-5 text-[#0077B5]" />
            Share on LinkedIn
          </CardTitle>
          <CardDescription>Share your achievement with your professional network</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <Linkedin className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">No post generated yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              A LinkedIn post will be generated when you complete the wizard
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Linkedin className="h-5 w-5 text-[#0077B5]" />
              Share on LinkedIn
            </CardTitle>
            <CardDescription>Share your achievement with your professional network</CardDescription>
          </div>
          {onRegenerate && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRegenerate}
              disabled={isRegenerating}
            >
              {isRegenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Post Preview */}
        <div className="space-y-3">
          {/* Emoji Toggle */}
          {postTextClean && postText !== postTextClean && (
            <div className="flex items-center justify-end gap-2">
              <span className="text-xs text-muted-foreground">Version:</span>
              <div className="flex rounded-lg bg-muted p-1">
                <button
                  onClick={() => setShowEmojis(true)}
                  className={cn(
                    'px-3 py-1 text-xs rounded-md transition-colors',
                    showEmojis
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  With Emojis
                </button>
                <button
                  onClick={() => setShowEmojis(false)}
                  className={cn(
                    'px-3 py-1 text-xs rounded-md transition-colors',
                    !showEmojis
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  Plain
                </button>
              </div>
            </div>
          )}

          {/* Post Text Preview */}
          <div className="relative">
            <div className="bg-muted/50 rounded-lg p-4 max-h-64 overflow-y-auto">
              <p className="text-sm whitespace-pre-line leading-relaxed">{displayText}</p>
            </div>
            <div className="absolute top-2 right-2">
              <Badge variant="outline" className="text-xs bg-background">
                Preview
              </Badge>
            </div>
          </div>

          {/* Hashtags */}
          {hashtags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {hashtags.map((tag, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="text-xs text-[#0077B5] bg-[#0077B5]/10"
                >
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Character Count */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{displayText?.length || 0} / 3,000 characters</span>
          {(displayText?.length || 0) > 3000 && (
            <span className="text-destructive">Exceeds LinkedIn limit</span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={handleCopy}
            disabled={!displayText}
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 mr-2 text-green-500" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-2" />
                Copy Text
              </>
            )}
          </Button>
          <Button
            className="flex-1 bg-[#0077B5] hover:bg-[#006097]"
            onClick={handleShare}
            disabled={!displayText}
          >
            <Linkedin className="h-4 w-4 mr-2" />
            Share on LinkedIn
            <ExternalLink className="h-3 w-3 ml-1" />
          </Button>
        </div>

        {/* Tips */}
        <div className="bg-muted/30 rounded-lg p-3 space-y-2">
          <p className="text-xs font-medium">Tips for sharing:</p>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• Personalize the post to reflect your voice</li>
            <li>• Tag your mentor to thank them publicly</li>
            <li>• Post during business hours for more visibility</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
