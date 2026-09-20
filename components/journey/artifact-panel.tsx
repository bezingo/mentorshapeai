'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Accordion,
  AccordionBody,
  AccordionHeading,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Chip,
  Separator,
  Spinner,
} from '@heroui/react'
import type { GoalHierarchyNode } from '@/lib/goals/hierarchy'
import { VisionBoardCanvas, type VisionBoardGraphJson } from './vision-board-canvas'
import { lockGoal } from '@/lib/agent/client-tools'

type GoalSummary = {
  id: string
  title: string
  status: string
  is_locked?: boolean
  hierarchy_level?: string | null
  plan_year?: number | null
}

type VisionBoardRow = {
  id: string
  title: string
  goal_id: string | null
  graph_json: VisionBoardGraphJson
}

function HierarchyTree({ node, depth = 0 }: { node: GoalHierarchyNode; depth?: number }) {
  return (
    <li className="list-none">
      <div className="flex items-center gap-2 py-1" style={{ paddingLeft: depth * 12 }}>
        <Chip size="sm" variant="soft">{node.hierarchy_level}</Chip>
        <span className="text-small">{node.title}</span>
      </div>
      {(node.children ?? []).map((child: GoalHierarchyNode) => (
        <HierarchyTree key={`${child.period_key ?? child.title}-${depth}`} node={child} depth={depth + 1} />
      ))}
    </li>
  )
}

export function ArtifactPanel() {
  const [goals, setGoals] = useState<GoalSummary[]>([])
  const [loadingGoals, setLoadingGoals] = useState(true)
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null)
  const [hierarchy, setHierarchy] = useState<GoalHierarchyNode | null>(null)
  const [hierarchyLoading, setHierarchyLoading] = useState(false)
  const [visionBoards, setVisionBoards] = useState<VisionBoardRow[]>([])
  const [activeBoard, setActiveBoard] = useState<VisionBoardRow | null>(null)
  const [showVisionBoard, setShowVisionBoard] = useState(false)

  const loadGoals = useCallback(async () => {
    setLoadingGoals(true)
    try {
      const res = await fetch('/api/goals')
      const json = await res.json()
      setGoals(json.data ?? [])
    } finally {
      setLoadingGoals(false)
    }
  }, [])

  const loadVisionBoards = useCallback(async () => {
    const res = await fetch('/api/vision-boards')
    const json = await res.json()
    setVisionBoards(json.data ?? [])
  }, [])

  useEffect(() => {
    loadGoals()
    loadVisionBoards()
  }, [loadGoals, loadVisionBoards])

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ visionBoardId?: string; goalId?: string }>).detail
      setShowVisionBoard(true)
      if (detail?.visionBoardId) {
        const board = visionBoards.find((b) => b.id === detail.visionBoardId)
        if (board) setActiveBoard(board)
      }
      if (detail?.goalId) setSelectedGoalId(detail.goalId)
    }
    window.addEventListener('mentorshape:open-vision-board', handler)
    return () => window.removeEventListener('mentorshape:open-vision-board', handler)
  }, [visionBoards])

  const loadHierarchy = useCallback(async (goalId: string) => {
    setHierarchyLoading(true)
    setSelectedGoalId(goalId)
    try {
      const res = await fetch(`/api/goals/${goalId}/hierarchy`)
      const json = await res.json()
      setHierarchy(json.data?.hierarchy ?? null)
    } finally {
      setHierarchyLoading(false)
    }
  }, [])

  const selectedGoal = useMemo(
    () => goals.find((g) => g.id === selectedGoalId) ?? null,
    [goals, selectedGoalId]
  )

  const handleLock = async () => {
    if (!selectedGoalId) return
    const result = await lockGoal(selectedGoalId, true)
    if (result.ok) {
      await loadGoals()
      await loadHierarchy(selectedGoalId)
    }
  }

  const ensureBoard = async () => {
    if (activeBoard) {
      setShowVisionBoard(true)
      return activeBoard
    }
    const res = await fetch('/api/vision-boards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Vision board',
        goal_id: selectedGoalId,
        graph_json: {},
      }),
    })
    const json = await res.json()
    const board = json.data as VisionBoardRow
    setVisionBoards((prev) => [board, ...prev])
    setActiveBoard(board)
    setShowVisionBoard(true)
    return board
  }

  const saveBoard = async (graph: VisionBoardGraphJson) => {
    const board = activeBoard ?? (await ensureBoard())
    const res = await fetch(`/api/vision-boards/${board.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ graph_json: graph }),
    })
    const json = await res.json()
    setActiveBoard(json.data)
  }

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-4">
      <div>
        <h2 className="text-2xl font-semibold">Artifacts</h2>
        <p className="text-small text-default-500">
          Goals, locked breakdown, and vision board for your onboarding journey.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Goals</CardTitle>
        </CardHeader>
        <CardContent className="gap-3">
          <div className="flex items-center justify-end">
            <Button size="sm" variant="ghost" onPress={loadGoals}>Refresh</Button>
          </div>
          {loadingGoals ? (
            <Spinner size="sm" />
          ) : goals.length === 0 ? (
            <p className="text-small text-default-500">No goals yet — ask the agent to create a year plan.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {goals.map((goal) => (
                <li key={goal.id}>
                  <Button
                    size="sm"
                    variant={selectedGoalId === goal.id ? 'primary' : 'secondary'}
                    className="h-auto w-full justify-start py-2"
                    onPress={() => loadHierarchy(goal.id)}
                  >
                    <span className="flex flex-col items-start gap-1 text-left">
                      <span>{goal.title}</span>
                      <span className="flex gap-1">
                        <Chip size="sm" variant="soft">{goal.status}</Chip>
                        {goal.is_locked && <Chip size="sm" color="warning" variant="soft">Locked</Chip>}
                        {goal.hierarchy_level && (
                          <Chip size="sm" variant="soft">{goal.hierarchy_level}</Chip>
                        )}
                      </span>
                    </span>
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {selectedGoal && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle>Plan breakdown</CardTitle>
            {!selectedGoal.is_locked && (
              <Button size="sm" variant="secondary" onPress={handleLock}>
                Lock goal
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {hierarchyLoading ? (
              <Spinner size="sm" />
            ) : hierarchy ? (
              <Accordion variant="surface">
                <AccordionItem id="hierarchy">
                  <AccordionHeading>
                    <AccordionTrigger>
                      {selectedGoal.title}
                      <span className="text-tiny text-default-500">
                        {selectedGoal.is_locked ? ' · Locked' : ' · Editable'}
                      </span>
                    </AccordionTrigger>
                  </AccordionHeading>
                  <AccordionPanel>
                    <AccordionBody>
                      <ul>
                        <HierarchyTree node={hierarchy} />
                      </ul>
                    </AccordionBody>
                  </AccordionPanel>
                </AccordionItem>
              </Accordion>
            ) : (
              <p className="text-small text-default-500">No hierarchy on this goal yet.</p>
            )}
          </CardContent>
        </Card>
      )}

      <Separator />

      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onPress={() => ensureBoard()}>
          {showVisionBoard ? 'Focus vision board' : 'Open vision board'}
        </Button>
        {visionBoards.length > 0 && (
          <Chip variant="soft">{visionBoards.length} board(s)</Chip>
        )}
      </div>

      {showVisionBoard && (
        <VisionBoardCanvas
          boardId={activeBoard?.id}
          initialGraph={activeBoard?.graph_json}
          onSave={saveBoard}
          readOnly={Boolean(selectedGoal?.is_locked)}
        />
      )}
    </div>
  )
}
