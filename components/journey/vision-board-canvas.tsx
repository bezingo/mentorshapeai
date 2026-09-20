'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Spinner } from '@heroui/react'
import { dia, shapes } from '@joint/core'

export type VisionBoardGraphJson = {
  cells?: unknown[]
}

type VisionBoardCanvasProps = {
  boardId?: string
  initialGraph?: VisionBoardGraphJson
  onSave?: (graph: VisionBoardGraphJson) => Promise<void>
  readOnly?: boolean
}

export function VisionBoardCanvas({
  boardId,
  initialGraph,
  onSave,
  readOnly = false,
}: VisionBoardCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const graphRef = useRef<dia.Graph | null>(null)
  const paperRef = useRef<dia.Paper | null>(null)
  const [noteText, setNoteText] = useState('New idea')
  const [saving, setSaving] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!containerRef.current || paperRef.current) return

    const graph = new dia.Graph({}, { cellNamespace: shapes })
    const paper = new dia.Paper({
      el: containerRef.current,
      model: graph,
      width: 800,
      height: 480,
      gridSize: 10,
      drawGrid: true,
      background: { color: '#fafafa' },
      cellViewNamespace: shapes,
      interactive: !readOnly,
    })

    if (initialGraph?.cells?.length) {
      graph.fromJSON(initialGraph as dia.Graph.JSON)
    } else {
      const note = new shapes.standard.Rectangle({
        position: { x: 40, y: 40 },
        size: { width: 160, height: 100 },
        attrs: {
          body: { fill: '#fef3c7', stroke: '#f59e0b', rx: 8, ry: 8 },
          label: { text: 'Your vision', fill: '#78350f', fontSize: 14 },
        },
      })
      graph.addCell(note)
    }

    graphRef.current = graph
    paperRef.current = paper
    setReady(true)

    return () => {
      paper.remove()
      graphRef.current = null
      paperRef.current = null
    }
  }, [initialGraph, readOnly])

  const addStickyNote = useCallback(() => {
    const graph = graphRef.current
    if (!graph || readOnly) return
    const note = new shapes.standard.Rectangle({
      position: { x: 60 + Math.random() * 120, y: 60 + Math.random() * 120 },
      size: { width: 180, height: 110 },
      attrs: {
        body: { fill: '#e0f2fe', stroke: '#0284c7', rx: 8, ry: 8 },
        label: { text: noteText || 'Note', fill: '#0c4a6e', fontSize: 13 },
      },
    })
    graph.addCell(note)
  }, [noteText, readOnly])

  const handleSave = async () => {
    const graph = graphRef.current
    if (!graph || !onSave) return
    setSaving(true)
    try {
      await onSave(graph.toJSON() as VisionBoardGraphJson)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="w-full border border-default-200 shadow-sm">
      <CardHeader className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Vision board</CardTitle>
          {boardId ? (
            <p className="text-tiny text-default-500">ID: {boardId}</p>
          ) : (
            <p className="text-tiny text-default-500">Drag notes on the canvas</p>
          )}
        </div>
        {!readOnly && (
          <div className="flex flex-wrap items-center gap-2">
            <Input
              className="max-w-[200px]"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Note label"
            />
            <Button size="sm" variant="secondary" onPress={addStickyNote} isDisabled={!ready}>
              Add note
            </Button>
            {onSave && (
              <Button size="sm" variant="primary" onPress={handleSave} isDisabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </Button>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent className="relative min-h-[500px] p-2">
        {!ready && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Spinner size="lg" />
          </div>
        )}
        <div ref={containerRef} className="h-[480px] w-full rounded-medium border border-default-100" />
      </CardContent>
    </Card>
  )
}
