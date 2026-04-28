// Caldra service worker — enables PWA install + background push notifications
const CACHE = 'caldra-v1'

self.addEventListener('install', () => { self.skipWaiting() })
self.addEventListener('activate', e => { e.waitUntil(clients.claim()) })

self.addEventListener('fetch', e => {
  // Pass-through — no aggressive caching, Supabase realtime must stay live
  if (e.request.method !== 'GET') return
  if (e.request.url.includes('supabase') || e.request.url.includes('realtime')) return
  e.respondWith(fetch(e.request).catch(() => caches.match(e.request)))
})

// Native push notification handler (fired when page is closed)
self.addEventListener('push', e => {
  if (!e.data) return
  const data = e.data.json()
  e.waitUntil(
    self.registration.showNotification(data.title ?? 'Caldra Alert', {
      body: data.body ?? '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: data.tag ?? 'caldra',
      data: { url: '/dashboard' },
    })
  )
})

self.addEventListener('notificationclick', e => {
  e.notification.close()
  const target = (e.notification.data && e.notification.data.url) || '/dashboard'
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) {
        if (c.url.includes('/dashboard') && 'focus' in c) return c.focus()
      }
      return clients.openWindow(target)
    })
  )
})
