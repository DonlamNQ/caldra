// Caldra service worker — enables PWA install only, no caching
self.addEventListener('install', () => { self.skipWaiting() })
self.addEventListener('activate', e => { e.waitUntil(clients.claim()) })

// No fetch interception — let the browser and Supabase realtime work natively

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
