'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from '@/components/ui/collapsible'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import {
  ChevronDown,
  ChevronRight,
  History,
  Pencil,
  MessageCircle,
  Sparkles,
  LayoutGrid,
  Target,
  RotateCcw,
  Loader2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  type GoalVersion,
  type ChangeSource,
  getGoalVersionDiff,
  getChangeSourceLabel
} from '@/lib/utils/goal-versioning'

interface GoalVersionHistoryProps {
  goalId: string
  className?: string
  onRestore?: () => void
}

const changeSourceIcons: Record<ChangeSource, React.ReactNode> = {
  user: <Pencil className="h-4 w-4" />,
  ai_advisor: <MessageCircle className="h-4 w-4" />,
  ai_shaper: <Sparkles className="h-4 w-4" />,
  ai_swot: <LayoutGrid className="h-4 w-4" />,
  ai_smart: <Target className="h-4 w-4" />
}

const changeSourceColors: Record<ChangeSource, string> = {
  user: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  ai_advisor: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  ai_shaper: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  ai_swot: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  ai_smart: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200'
}

export function GoalVersionHistory({ goalId, className, onRestore }: GoalVersionHistoryProps) {
  const [versions, setVersions] = useState<GoalVersion[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isOpen, setIsOpen] = useState(false)
  const [expandedVersions, setExpandedVersions] = useState<Set<string>>(new Set())
  const [restoreVersion, setRestoreVersion] = useState<GoalVersion | null>(null)
  const [isRestoring, setIsRestoring] = useState(false)
  
  // Fetch versions
  useEffect(() => {
    async function fetchVersions() {
      try {
        const response = await fetch(`/api/goals/${goalId}/versions`)
        if (response.ok) {
          const data = await response.json()
          setVersions(data.data || [])
        }
      } catch (error) {
        console.error('Failed to fetch versions:', error)
      } finally {
        setIsLoading(false)
      }
    }
    
    if (isOpen) {
      fetchVersions()
    }
  }, [goalId, isOpen])
  
  const toggleVersion = (versionId: string) => {
    setExpandedVersions(prev => {
      const next = new Set(prev)
      if (next.has(versionId)) {
        next.delete(versionId)
      } else {
        next.add(versionId)
      }
      return next
    })
  }
  
  const handleRestore = async () => {
    if (!restoreVersion) return
    
    setIsRestoring(true)
    try {
      const response = await fetch(`/api/goals/${goalId}/versions/${restoreVersion.id}/restore`, {
        method: 'POST'
      })
      
      if (response.ok) {
        setRestoreVersion(null)
        onRestore?.()
        // Refresh the page to show updated data
        window.location.reload()
      }
    } catch (error) {
      console.error('Failed to restore version:', error)
    } finally {
      setIsRestoring(false)
    }
  }
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
  }
  
  // Get diff between consecutive versions
  const getVersionChanges = (index: number) => {
    if (index >= versions.length - 1) return []
    const newerVersion = versions[index]
    const olderVersion = versions[index + 1]
    return getGoalVersionDiff(olderVersion, newerVersion)
  }
  
  if (versions.length === 0 && !isLoading && isOpen) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <History className="h-4 w-4" />
            Version History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No version history yet. Changes will be tracked as you refine your goal.
          </p>
        </CardContent>
      </Card>
    )
  }
  
  return (
    <>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <Card className={className}>
          <CollapsibleTrigger asChild>
            <CardHeader className="pb-3 cursor-pointer hover:bg-muted/50 transition-colors">
              <CardTitle className="text-sm font-medium flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <History className="h-4 w-4" />
                  Version History
                  {versions.length > 0 && (
                    <Badge variant="secondary" className="ml-1">
                      {versions.length}
                    </Badge>
                  )}
                </span>
                {isOpen ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          
          <CollapsibleContent>
            <CardContent className="pt-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="relative">
                  {/* Timeline line */}
                  <div className="absolute left-[11px] top-3 bottom-3 w-0.5 bg-border" />
                  
                  {/* Version entries */}
                  <div className="space-y-4">
                    {versions.map((version, index) => {
                      const changes = getVersionChanges(index)
                      const isExpanded = expandedVersions.has(version.id)
                      const isLatest = index === 0
                      
                      return (
                        <div key={version.id} className="relative pl-8">
                          {/* Timeline dot */}
                          <div
                            className={cn(
                              'absolute left-0 top-1 w-6 h-6 rounded-full flex items-center justify-center',
                              changeSourceColors[version.changed_by]
                            )}
                          >
                            {changeSourceIcons[version.changed_by]}
                          </div>
                          
                          {/* Version content */}
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium">
                                v{version.version_number}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {getChangeSourceLabel(version.changed_by)}
                              </Badge>
                              {isLatest && (
                                <Badge className="text-xs">Current</Badge>
                              )}
                            </div>
                            
                            <p className="text-xs text-muted-foreground">
                              {formatDate(version.created_at)}
                            </p>
                            
                            {version.change_summary && (
                              <p className="text-sm text-muted-foreground">
                                {version.change_summary}
                              </p>
                            )}
                            
                            {/* Expandable changes */}
                            {changes.length > 0 && (
                              <Collapsible
                                open={isExpanded}
                                onOpenChange={() => toggleVersion(version.id)}
                              >
                                <CollapsibleTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-2 text-xs"
                                  >
                                    {isExpanded ? 'Hide' : 'Show'} {changes.length} change{changes.length !== 1 ? 's' : ''}
                                    {isExpanded ? (
                                      <ChevronDown className="ml-1 h-3 w-3" />
                                    ) : (
                                      <ChevronRight className="ml-1 h-3 w-3" />
                                    )}
                                  </Button>
                                </CollapsibleTrigger>
                                
                                <CollapsibleContent className="mt-2 space-y-2">
                                  {changes.map((change, i) => (
                                    <div
                                      key={i}
                                      className="text-xs p-2 bg-muted rounded-md"
                                    >
                                      <p className="font-medium mb-1">{change.label}</p>
                                      {change.type === 'text' ? (
                                        <div className="space-y-1">
                                          {change.before && (
                                            <p className="text-red-600 dark:text-red-400 line-through">
                                              {truncateText(change.before, 100)}
                                            </p>
                                          )}
                                          {change.after && (
                                            <p className="text-green-600 dark:text-green-400">
                                              {truncateText(change.after, 100)}
                                            </p>
                                          )}
                                        </div>
                                      ) : (
                                        <p className="text-muted-foreground">
                                          {change.type === 'array'
                                            ? `${(change.before || []).length} → ${(change.after || []).length} items`
                                            : 'Updated'}
                                        </p>
                                      )}
                                    </div>
                                  ))}
                                </CollapsibleContent>
                              </Collapsible>
                            )}
                            
                            {/* Restore button (not for current version) */}
                            {!isLatest && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs mt-1"
                                onClick={() => setRestoreVersion(version)}
                              >
                                <RotateCcw className="mr-1 h-3 w-3" />
                                Restore
                              </Button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
      
      {/* Restore confirmation dialog */}
      <Dialog open={!!restoreVersion} onOpenChange={() => setRestoreVersion(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restore to Version {restoreVersion?.version_number}?</DialogTitle>
            <DialogDescription>
              This will restore your goal to how it was on{' '}
              {restoreVersion && formatDate(restoreVersion.created_at)}.
              A new version snapshot will be created before restoring.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRestoreVersion(null)}>
              Cancel
            </Button>
            <Button onClick={handleRestore} disabled={isRestoring}>
              {isRestoring && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Restore
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}
