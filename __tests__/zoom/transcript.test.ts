import { describe, it, expect } from 'vitest'
import { parseWebVttToPlainText } from '@/lib/zoom/transcript'

describe('parseWebVttToPlainText', () => {
  it('strips WebVTT metadata and timestamps', () => {
    const vtt = `WEBVTT

1
00:00:01.000 --> 00:00:04.000
<v Mentor>Welcome to our focus session today.

2
00:00:05.000 --> 00:00:08.000
<v Mentee>Thanks, I wanted to discuss my career goals and next steps for the quarter ahead.
`

    const text = parseWebVttToPlainText(vtt)
    expect(text).toContain('Welcome to our focus session')
    expect(text).toContain('career goals')
    expect(text).not.toContain('WEBVTT')
    expect(text).not.toContain('-->')
  })
})
