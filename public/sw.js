// HABYNEX — Service Worker v3
// Stratégie : Cache First pour assets, Network First pour pages

const STATIC_CACHE = 'habynex-static-v3'
const RUNTIME_CACHE = 'habynex-runtime-v3'

const PRECACHE_URLS = ['/', '/offline.html', '/manifest.json', '/icons/icon-192.png', '/icons/icon-512.png']

// ── INSTALL ──────────────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(PRECACHE_URLS).catch(() => {}))
      .then(() => self.skipWaiting())
  )
})

// ── ACTIVATE ─────────────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== STATIC_CACHE && k !== RUNTIME_CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  )
})

// ── FETCH ────────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event
  const url = new URL(request.url)

  if (
    url.pathname.startsWith('/api/') ||
    url.hostname.includes('supabase') ||
    url.hostname.includes('anthropic') ||
    request.method !== 'GET'
  ) return

  // Tuiles carte — Cache First
  if (url.hostname.includes('tile.openstreetmap.org')) {
    event.respondWith(cacheFirst(request))
    return
  }

  // Images Supabase — Stale While Revalidate
  if (url.hostname.includes('supabase.co') && url.pathname.includes('/storage/')) {
    event.respondWith(staleWhileRevalidate(request))
    return
  }

  // Icônes et manifest — Cache First
  if (url.pathname.startsWith('/icons/') || url.pathname === '/manifest.json' || url.pathname === '/favicon.ico') {
    event.respondWith(cacheFirst(request))
    return
  }

  // Pages — Network First avec fallback
  event.respondWith(networkFirst(request))
})

async function cacheFirst(request) {
  const cache = await caches.open(RUNTIME_CACHE)
  const cached = await cache.match(request)
  if (cached) return cached
  const response = await fetch(request)
  if (response.ok) cache.put(request, response.clone())
  return response
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME_CACHE)
  const cached = await cache.match(request)
  const networkFetch = fetch(request).then(r => { if (r.ok) cache.put(request, r.clone()); return r }).catch(() => null)
  return cached ?? await networkFetch
}

async function networkFirst(request) {
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(RUNTIME_CACHE)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    const cached = await caches.match(request)
    return cached ?? caches.match('/offline.html')
  }
}

// ── PUSH NOTIFICATIONS ───────────────────────────────────────────
self.addEventListener('push', event => {
  if (!event.data) return

  let data = {}
  try { data = event.data.json() } catch { data = { title: 'Habynex', body: event.data.text() } }

  const options = {
    body: data.body ?? 'Nouvelle notification Habynex',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-96.png',
    image: data.image ?? null,
    data: { url: data.url ?? '/' },
    tag: data.tag ?? 'habynex-default',
    renotify: true,
    requireInteraction: data.requireInteraction ?? false,
    vibrate: [100, 50, 100, 50, 100],
    actions: data.actions ?? [],
  }

  event.waitUntil(
    self.registration.showNotification(data.title ?? 'Habynex', options)
  )
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  const url = event.notification.data?.url ?? '/'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      for (const client of windowClients) {
        if (client.url.includes(url) && 'focus' in client) return client.focus()
      }
      return clients.openWindow(url)
    })
  )
})

self.addEventListener('notificationclose', event => {
  // Analytics — notification fermée sans clic
  console.log('[SW] Notification fermée:', event.notification.tag)
})

// ── BACKGROUND SYNC (messages en attente) ────────────────────────
self.addEventListener('sync', event => {
  if (event.tag === 'sync-messages') {
    event.waitUntil(syncPendingMessages())
  }
})

async function syncPendingMessages() {
  // Synchroniser les messages envoyés hors-ligne
  const cache = await caches.open('habynex-pending')
  const keys = await cache.keys()
  for (const key of keys) {
    const request = await cache.match(key)
    if (request) {
      try {
        await fetch(request)
        await cache.delete(key)
      } catch {}
    }
  }
}
