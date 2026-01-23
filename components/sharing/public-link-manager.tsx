'use client'

import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LinkShare } from './link-share'
import { Copy, RefreshCw, Lock, Globe, CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { isValidSlug } from '@/lib/utils/slug'

interface PublicLinkManagerProps {
  type: 'goal' | 'profile'
  currentSlug: string | null
  entityId: string
  entityTitle: string
  onSlugChange?: (slug: string | null) => void
}

export function PublicLinkManager({
  type,
  currentSlug,
  entityId,
  entityTitle,
  onSlugChange,
}: PublicLinkManagerProps) {
  const [slug, setSlug] = useState(currentSlug || '')
  const [isEditing, setIsEditing] = useState(false)
  const [validation, setValidation] = useState<{
    valid: boolean
    error?: string
  } | null>(null)
  const [isChecking, setIsChecking] = useState(false)
  const [mounted, setMounted] = useState(false)
  const queryClient = useQueryClient()

  // Wait for client-side hydration to get the actual origin
  useEffect(() => {
    setMounted(true)
  }, [])

  const baseUrl = mounted ? window.location.origin : ''
  const publicUrl = mounted && currentSlug
    ? `${baseUrl}/${type === 'goal' ? 'g' : 'm'}/${currentSlug}`
    : null

  // Check slug availability
  const checkAvailability = async (slugToCheck: string) => {
    if (!slugToCheck) return

    setIsChecking(true)
    try {
      const endpoint =
        type === 'goal'
          ? `/api/goals/${entityId}/slug?slug=${encodeURIComponent(slugToCheck)}`
          : `/api/profile/handle/check?handle=${encodeURIComponent(slugToCheck)}`

      const res = await fetch(endpoint)
      const data = await res.json()

      if (data.data?.available === false) {
        setValidation({ valid: false, error: 'This slug is already taken' })
      } else {
        setValidation({ valid: true })
      }
    } catch (error) {
      setValidation({ valid: false, error: 'Failed to check availability' })
    } finally {
      setIsChecking(false)
    }
  }

  // Update slug mutation
  const updateSlugMutation = useMutation({
    mutationFn: async ({
      slug: newSlug,
      regenerate,
    }: {
      slug?: string | null
      regenerate?: boolean
    }) => {
      const endpoint =
        type === 'goal'
          ? `/api/goals/${entityId}/slug`
          : `/api/profile/handle`

      const body =
        type === 'goal'
          ? { slug: newSlug, regenerate }
          : { handle: newSlug }

      const res = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error?.message || 'Failed to update')
      }

      return res.json()
    },
    onSuccess: (data) => {
      const newSlug = type === 'goal' ? data.data.public_slug : data.data.public_handle
      setSlug(newSlug || '')
      setIsEditing(false)
      setValidation(null)
      onSlugChange?.(newSlug)
      queryClient.invalidateQueries({
        queryKey: type === 'goal' ? ['goal', entityId] : ['profile'],
      })
    },
  })

  // Validate slug format
  useEffect(() => {
    if (!slug || slug === currentSlug) {
      setValidation(null)
      return
    }

    const result = isValidSlug(slug)
    setValidation(result)

    if (result.valid) {
      // Debounce availability check
      const timer = setTimeout(() => {
        checkAvailability(slug)
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [slug, currentSlug])

  const handleSave = () => {
    if (!validation?.valid) return
    updateSlugMutation.mutate({ slug: slug || null })
  }

  const handleRegenerate = () => {
    if (type === 'goal') {
      updateSlugMutation.mutate({ regenerate: true })
    } else {
      // For profiles, generate from display name
      const baseSlug = entityTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-')
      setSlug(baseSlug)
      setIsEditing(true)
    }
  }

  const handleMakePrivate = () => {
    updateSlugMutation.mutate({ slug: null })
  }

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-sm font-medium">Public Link</Label>
        <p className="text-xs text-muted-foreground mb-2">
          {type === 'goal'
            ? 'Share this link to let mentors discover your goal'
            : 'Your public mentor profile URL'}
        </p>

        {publicUrl ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="flex-1 flex items-center gap-2 p-2 rounded-md border bg-muted">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-mono flex-1 truncate">{publicUrl}</span>
              </div>
              <LinkShare url={publicUrl} title={entityTitle} />
            </div>

            {isEditing ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <Input
                      value={slug}
                      onChange={(e) => setSlug(e.target.value)}
                      placeholder="your-slug"
                      className="font-mono"
                    />
                    {validation && (
                      <div className="flex items-center gap-1 mt-1">
                        {validation.valid ? (
                          <>
                            <CheckCircle2 className="h-3 w-3 text-green-600" />
                            <span className="text-xs text-green-600">Available</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="h-3 w-3 text-red-600" />
                            <span className="text-xs text-red-600">
                              {validation.error}
                            </span>
                          </>
                        )}
                        {isChecking && (
                          <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                        )}
                      </div>
                    )}
                  </div>
                  <Button
                    onClick={handleSave}
                    disabled={!validation?.valid || updateSlugMutation.isPending}
                    size="sm"
                  >
                    Save
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsEditing(false)
                      setSlug(currentSlug || '')
                      setValidation(null)
                    }}
                    size="sm"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  className="gap-2"
                >
                  <Copy className="h-4 w-4" />
                  Edit Slug
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRegenerate}
                  disabled={updateSlugMutation.isPending}
                  className="gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Regenerate
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleMakePrivate}
                  disabled={updateSlugMutation.isPending}
                  className="gap-2"
                >
                  <Lock className="h-4 w-4" />
                  Make Private
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              This {type === 'goal' ? 'goal' : 'profile'} is currently private.
            </p>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => {
                  const baseSlug = entityTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-')
                  setSlug(baseSlug)
                  setIsEditing(true)
                }}
                size="sm"
                className="gap-2"
              >
                <Globe className="h-4 w-4" />
                Create Public Link
              </Button>
              <Button
                variant="outline"
                onClick={handleRegenerate}
                disabled={updateSlugMutation.isPending}
                size="sm"
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Auto-generate
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}





