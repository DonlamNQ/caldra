// Caldra service worker — PWA install + push notifications
self.addEventListener('install', () => { self.skipWaiting() })
self.addEventListener('activate', e => { e.waitUntil(clients.claim()) })

// No fetch interception — let the browser and Supabase realtime work natively

self.addEventListener('push', e => {
  const data = e.data?.json() ?? {}
  e.waitUntil(
    self.registration.showNotification(data.title || 'Caldra', {
      body: data.body || '',
      icon: '/icon.svg',
      badge: '/icon.svg',
      data: { url: data.url || '/dashboard' },
      tag: 'caldra-alert',
      renotify: true,
      requireInteraction: data.level >= 3,
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
