/**
 * Service Worker for MentorShape PWA
 * Minimal implementation for installability only
 * Does NOT cache audio or voice data
 */

const CACHE_NAME = 'mentorshape-v1'

// Install event - cache minimal assets for installability
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/offline.html',
      ])
    })
  )
  self.skipWaiting()
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    })
  )
  self.clients.claim()
})

// Fetch event - network first, fallback to cache
// IMPORTANT: Never cache audio blobs or voice data
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  
  // Never intercept audio/voice requests - must not be cached or stored
  if (
    url.pathname.includes('/api/voice') ||
    event.request.headers.get('content-type')?.includes('audio') ||
    url.pathname.endsWith('.wav') ||
    url.pathname.endsWith('.mp3') ||
    url.pathname.endsWith('.webm') ||
    url.pathname.endsWith('.ogg')
  ) {
    return
  }

  // For navigation requests, try network first
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match('/offline.html')
      })
    )
    return
  }

  // For other requests, just use network (no caching for now)
  // This keeps the PWA minimal and focused on installability
})
