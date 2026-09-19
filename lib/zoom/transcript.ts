import type { ZoomClient } from '@/lib/zoom/client'

const MIN_TRANSCRIPT_LENGTH = 100

/**
 * Strip WebVTT cues/timestamps and return plain text suitable for summarization.
 */
export function parseWebVttToPlainText(vtt: string): string {
  const lines = vtt.split(/\r?\n/)
  const textLines: string[] = []

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed === 'WEBVTT' || trimmed.startsWith('NOTE')) {
      continue
    }
    if (/^\d+$/.test(trimmed)) {
      continue
    }
    if (trimmed.includes('-->')) {
      continue
    }
    if (/^\d{2}:\d{2}:\d{2}/.test(trimmed)) {
      continue
    }

    const withoutTags = trimmed.replace(/<[^>]+>/g, '').trim()
    if (withoutTags) {
      textLines.push(withoutTags)
    }
  }

  return textLines.join(' ').replace(/\s+/g, ' ').trim()
}

/**
 * Download a Zoom cloud recording transcript (WebVTT) using the mentor OAuth token.
 */
export async function downloadZoomTranscript(
  client: ZoomClient,
  downloadUrl: string
): Promise<string> {
  const response = await fetch(downloadUrl, {
    headers: {
      Authorization: `Bearer ${client.accessToken}`,
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('Failed to download Zoom transcript:', response.status, errorText)
    throw new Error('Failed to download Zoom transcript')
  }

  const raw = await response.text()
  const plain = parseWebVttToPlainText(raw)

  if (plain.length < MIN_TRANSCRIPT_LENGTH) {
    throw new Error('Downloaded transcript is too short for summarization')
  }

  return plain
}

export { MIN_TRANSCRIPT_LENGTH }
