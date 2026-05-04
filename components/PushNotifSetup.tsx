'use client'

import { useEffect, useState } from 'react'

function urlBase64ToUint8Array(base64: string): ArrayBuffer {
  const padding = '='.repeat((4 - base64.length % 4) % 4)
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = window.atob(b64)
  const bytes = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i)
  return bytes.buffer
}

export default function PushNotifSetup() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
    if (Notification.permission !== 'default') return

    navigator.serviceWorker.register('/sw.js').catch(() => {})

    // Show banner after 3 seconds — let the dashboard render first
    const t = setTimeout(() => setShow(true), 3000)
    return () => clearTimeout(t)
  }, [])

  // Si déjà accordé, enregistrer silencieusement sans banner
  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
    if (Notification.permission !== 'granted') return
    navigator.serviceWorker.register('/sw.js').then(() => subscribeIfNeeded()).catch(() => {})
  }, [])

  async function subscribeIfNeeded() {
    try {
      const reg = await navigator.serviceWorker.ready
      const existing = await reg.pushManager.getSubscription()
      if (existing) return

      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!vapidKey) return

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      })

      const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } }
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth }),
      })
    } catch {
      // Non-critique
    }
  }

  async function handleEnable() {
    setShow(false)
    const perm = await Notification.requestPermission()
    if (perm === 'granted') await subscribeIfNeeded()
  }

  if (!show) return null

  return (
    <div style={{
      position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
      background: '#12121c', border: '1px solid rgba(124,58,237,.4)',
      borderRadius: 12, padding: '14px 20px', display: 'flex', alignItems: 'center',
      gap: 16, zIndex: 9999, boxShadow: '0 8px 32px rgba(0,0,0,.6)',
      maxWidth: 480, width: 'calc(100vw - 48px)',
      fontFamily: "var(--font-geist-sans), sans-serif",
    }}>
      <span style={{ fontSize: 22 }}>🔔</span>
      <span style={{ flex: 1, fontSize: 13, color: '#eae8f5', lineHeight: 1.4 }}>
        Reçois les alertes critiques directement sur ton téléphone
      </span>
      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
        <button
          onClick={() => setShow(false)}
          style={{ background: 'none', border: 'none', color: 'rgba(234,232,245,.4)', cursor: 'pointer', fontSize: 13, padding: '6px 4px' }}
        >
          Plus tard
        </button>
        <button
          onClick={handleEnable}
          style={{ background: '#7c3aed', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600, padding: '6px 16px' }}
        >
          Activer
        </button>
      </div>
    </div>
  )
}
