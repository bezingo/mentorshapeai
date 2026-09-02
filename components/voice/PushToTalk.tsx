'use client'

import { useState, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { useTranslation } from '@/lib/i18n'
import { Mic, MicOff, Loader2, X } from 'lucide-react'
import { cn } from '@/lib/utils'

// Web Speech API types
interface SpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  start(): void
  stop(): void
  abort(): void
  onstart: ((this: SpeechRecognition, ev: Event) => void) | null
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => void) | null
  onend: ((this: SpeechRecognition, ev: Event) => void) | null
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => void) | null
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList
}

interface SpeechRecognitionResultList {
  length: number
  [index: number]: SpeechRecognitionResult
}

interface SpeechRecognitionResult {
  [index: number]: SpeechRecognitionAlternative
  isFinal: boolean
  length: number
}

interface SpeechRecognitionAlternative {
  transcript: string
  confidence: number
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string
  message: string
}

declare global {
  interface Window {
    SpeechRecognition: { new (): SpeechRecognition }
    webkitSpeechRecognition: { new (): SpeechRecognition }
  }
}

interface PushToTalkProps {
  onMessage: (text: string) => Promise<string>
  disabled?: boolean
  className?: string
}

type VoiceState = 'idle' | 'listening' | 'processing' | 'speaking'

export function PushToTalk({ onMessage, disabled, className }: PushToTalkProps) {
  const { t, locale } = useTranslation()
  const [state, setState] = useState<VoiceState>('idle')
  const [transcript, setTranscript] = useState('')
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null)

  const startListening = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.error('Speech recognition not supported')
      return
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SpeechRecognition()
    recognitionRef.current = recognition

    recognition.continuous = false
    recognition.interimResults = true
    recognition.lang = locale === 'ar' ? 'ar-SA' : 'en-US'

    recognition.onstart = () => {
      setState('listening')
      setTranscript('')
    }

    recognition.onresult = (event) => {
      const result = event.results[event.results.length - 1]
      setTranscript(result[0].transcript)
    }

    recognition.onend = async () => {
      if (transcript.trim()) {
        setState('processing')
        try {
          const response = await onMessage(transcript)
          speak(response)
        } catch (error) {
          console.error('Error processing message:', error)
          setState('idle')
        }
      } else {
        setState('idle')
      }
    }

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error)
      setState('idle')
    }

    recognition.start()
  }, [locale, onMessage, transcript])

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }
  }, [])

  const speak = useCallback((text: string) => {
    if (!('speechSynthesis' in window)) {
      console.error('Speech synthesis not supported')
      setState('idle')
      return
    }

    setState('speaking')
    const utterance = new SpeechSynthesisUtterance(text)
    synthRef.current = utterance

    utterance.lang = locale === 'ar' ? 'ar-SA' : 'en-US'
    utterance.rate = 1.0
    utterance.pitch = 1.0

    // Try to find a voice for the locale
    const voices = speechSynthesis.getVoices()
    const langPrefix = locale === 'ar' ? 'ar' : 'en'
    const voice = voices.find((v) => v.lang.startsWith(langPrefix))
    if (voice) {
      utterance.voice = voice
    }

    utterance.onend = () => {
      setState('idle')
      setTranscript('')
    }

    utterance.onerror = () => {
      setState('idle')
      setTranscript('')
    }

    speechSynthesis.speak(utterance)
  }, [locale])

  const cancel = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.abort()
    }
    if (speechSynthesis.speaking) {
      speechSynthesis.cancel()
    }
    setState('idle')
    setTranscript('')
  }, [])

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault()
    if (state === 'idle' && !disabled) {
      startListening()
    }
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    e.preventDefault()
    if (state === 'listening') {
      stopListening()
    }
  }

  const getStateText = () => {
    switch (state) {
      case 'listening':
        return transcript || t.voice.listening
      case 'processing':
        return t.voice.processing
      case 'speaking':
        return transcript
      default:
        return t.voice.holdToTalk
    }
  }

  const isActive = state !== 'idle'

  return (
    <div className={cn('flex flex-col items-center gap-3', className)}>
      {isActive && (
        <div className="text-center max-w-xs">
          <p className="text-sm text-muted-foreground truncate">
            {getStateText()}
          </p>
          {state === 'listening' && (
            <p className="text-xs text-muted-foreground mt-1">
              {t.voice.release}
            </p>
          )}
        </div>
      )}

      <div className="relative">
        <Button
          variant={isActive ? 'default' : 'outline'}
          size="lg"
          className={cn(
            'w-16 h-16 rounded-full transition-all',
            state === 'listening' && 'bg-red-500 hover:bg-red-600 scale-110',
            state === 'processing' && 'animate-pulse',
            state === 'speaking' && 'bg-green-500 hover:bg-green-600'
          )}
          disabled={disabled || state === 'processing'}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          {state === 'processing' ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : state === 'speaking' ? (
            <Mic className="h-6 w-6" />
          ) : state === 'listening' ? (
            <Mic className="h-6 w-6" />
          ) : (
            <MicOff className="h-6 w-6" />
          )}
        </Button>

        {isActive && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-muted"
            onClick={cancel}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      {!isActive && (
        <p className="text-xs text-muted-foreground">
          {t.voice.holdToTalk}
        </p>
      )}
    </div>
  )
}

