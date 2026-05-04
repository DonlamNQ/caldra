'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { AlertRow } from '@/components/dashboard/AlertFeed'

const BG   = '#08080d'
const SF   = '#0d0d1a'
const SF2  = '#12121c'
const TX   = '#eae8f5'
const TD   = 'rgba(234,232,245,.6)'
const TE   = 'rgba(234,232,245,.35)'
const BORD = 'rgba(255,255,255,.07)'
const VIO  = '#7c3aed'
const GRN  = '#00d17a'
const ORG  = '#ffab00'
const RED  = '#ff5a3d'
const SANS = "var(--font-geist-sans), 'Geist', sans-serif"
const MONO = "var(--font-geist-mono), 'Geist Mono', monospace"

function computeScore(alerts: AlertRow[]): number {
  const d = alerts.reduce((s, a) => {
    const l = a.level ?? 1
    return s + (l === 3 ? 18 : l === 2 ? 8 : 3)
  }, 0)
  return Math.max(0, 100 - d)
}

function scoreCol(s: number) { return s >= 70 ? GRN : s >= 40 ? ORG : RED }

function ScoreRing({ score }: { score: number }) {
  const R = 56, CIRC = 2 * Math.PI * R
  const offset = CIRC - (CIRC * score / 100)
  const col = scoreCol(score)
  return (
    <div style={{ position: 'relative', width: 140, height: 140, flexShrink: 0 }}>
      <svg width="140" height="140" viewBox="0 0 140 140" style={{ transform: 'rotate(-90deg)', filter: `drop-shadow(0 0 14px ${col}55)` }}>
        <circle cx="70" cy="70" r={R} fill="none" stroke={BORD} strokeWidth="8" />
        <circle cx="70" cy="70" r={R} fill="none" stroke={col} strokeWidth="8"
          strokeDasharray={CIRC} strokeDashoffset={offset}
          strokeLinecap="round" style={{ transition: 'stroke-dashoffset .6s ease, stroke .4s' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 36, fontWeight: 700, color: col, fontFamily: MONO, lineHeight: 1 }}>{score}</span>
        <span style={{ fontSize: 9, color: TD, letterSpacing: 2, textTransform: 'uppercase', marginTop: 3, fontFamily: SANS }}>Score</span>
      </div>
    </div>
  )
}

const LVL_COLOR: Record<number, { bg: string; border: string; dot: string; label: string }> = {
  3: { bg: 'rgba(255,90,61,.08)',   border: '#ff5a3d88', dot: '#ff5a3d', label: 'Critique' },
  2: { bg: 'rgba(255,171,0,.07)',   border: '#ffab0066', dot: '#ffab00', label: 'Attention' },
  1: { bg: 'rgba(124,58,237,.06)', border: '#7c3aed44', dot: '#7c3aed', label: 'Info' },
}

function AlertItem({ a }: { a: AlertRow }) {
  const lvl = a.level ?? 1
  const c = LVL_COLOR[lvl] ?? LVL_COLOR[1]
  const time = new Date(a.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', background: c.bg, border: `1px solid ${c.border}`, borderRadius: 10, marginBottom: 8 }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: c.dot, flexShrink: 0, marginTop: 4 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, color: TX, fontWeight: 500, lineHeight: 1.3 }}>{a.message}</div>
        <div style={{ fontSize: 11, color: TE, marginTop: 3, fontFamily: MONO }}>{c.label} · {time}</div>
      </div>
    </div>
  )
}

function urlBase64ToUint8Array(base64: string): ArrayBuffer {
  const padding = '='.repeat((4 - base64.length % 4) % 4)
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = window.atob(b64)
  const bytes = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i)
  return bytes.buffer
}

interface Props {
  userId: string
  userEmail: string
  initialScore: number
  initialAlerts: AlertRow[]
  totalPnl: number
  tradeCount: number
}

export default function MobileClient({ userId, initialScore, initialAlerts, totalPnl, tradeCount }: Props) {
  const [alerts, setAlerts] = useState<AlertRow[]>(initialAlerts)
  const [score, setScore] = useState(initialScore)
  const [pnl, setPnl] = useState(totalPnl)
  const [trades, setTrades] = useState(tradeCount)
  const [connected, setConnected] = useState(false)
  const [pushStatus, setPushStatus] = useState<'idle' | 'granted' | 'denied' | 'unsupported' | 'loading'>('idle')
  const channelRef = useRef<ReturnType<typeof createClient>['channel'] extends (a: string) => infer R ? R : never | null>(null)

  // Realtime
  useEffect(() => {
    const supabase = createClient()
    const today = new Date().toISOString().split('T')[0]
    const ch = supabase.channel(`mobile-${userId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'alerts', filter: `user_id=eq.${userId}` }, payload => {
        if (payload.new.session_date !== today) return
        const newAlert = payload.new as AlertRow
        setAlerts(prev => [newAlert, ...prev].slice(0, 20))
        setScore(computeScore([newAlert, ...alerts]))
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'trades', filter: `user_id=eq.${userId}` }, payload => {
        const t = payload.new as { entry_time: string; pnl: number }
        if (!t.entry_time.startsWith(today)) return
        setPnl(p => p + (t.pnl ?? 0))
        setTrades(c => c + 1)
      })
      .subscribe(s => setConnected(s === 'SUBSCRIBED'))

    channelRef.current = ch as typeof channelRef.current
    return () => { ch.unsubscribe() }
  }, [userId])

  // SW + push status
  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) { setPushStatus('unsupported'); return }
    navigator.serviceWorker.register('/sw.js').catch(() => {})
    const p = Notification.permission
    setPushStatus(p === 'granted' ? 'granted' : p === 'denied' ? 'denied' : 'idle')
    if (p === 'granted') subscribeIfNeeded()
  }, [])

  async function subscribeIfNeeded() {
    try {
      const reg = await navigator.serviceWorker.ready
      const existing = await reg.pushManager.getSubscription()
      if (existing) return
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!vapidKey) return
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(vapidKey) })
      const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } }
      await fetch('/api/push/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth }) })
    } catch {}
  }

  async function enablePush() {
    setPushStatus('loading')
    const perm = await Notification.requestPermission()
    if (perm === 'granted') { setPushStatus('granted'); await subscribeIfNeeded() }
    else setPushStatus('denied')
  }

  const pnlColor = pnl > 0 ? GRN : pnl < 0 ? RED : TX

  return (
    <div style={{ minHeight: '100dvh', background: BG, fontFamily: SANS, color: TX, display: 'flex', flexDirection: 'column' }}>
      <style>{`*{box-sizing:border-box;margin:0;padding:0}::-webkit-scrollbar{display:none}@keyframes pulse{0%,100%{opacity:1}50%{opacity:.2}}`}</style>

      {/* Header */}
      <div style={{ padding: '16px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: 5, textTransform: 'uppercase', color: TX }}>
            Cald<span style={{ color: VIO }}>ra</span>
          </div>
          <div style={{ fontSize: 9, letterSpacing: 3, textTransform: 'uppercase', color: TE, marginTop: 2 }}>Session</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', background: connected ? 'rgba(0,209,122,.06)' : 'rgba(124,58,237,.06)', border: `1px solid ${connected ? 'rgba(0,209,122,.2)' : 'rgba(124,58,237,.15)'}`, borderRadius: 99 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: connected ? GRN : VIO, animation: 'pulse 1.8s infinite' }} />
          <span style={{ fontSize: 10, color: connected ? GRN : TE, letterSpacing: 1, textTransform: 'uppercase', fontFamily: MONO }}>{connected ? 'Live' : 'Sync'}</span>
        </div>
      </div>

      {/* Score + stats */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '28px 20px 20px' }}>
        <ScoreRing score={score} />
        <div style={{ display: 'flex', gap: 32, marginTop: 22 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 18, fontWeight: 600, color: pnlColor, fontFamily: MONO }}>{pnl >= 0 ? '+' : ''}{pnl.toFixed(0)}€</div>
            <div style={{ fontSize: 10, color: TE, marginTop: 3, letterSpacing: .5 }}>PnL session</div>
          </div>
          <div style={{ width: 1, background: BORD }} />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 18, fontWeight: 600, color: TX, fontFamily: MONO }}>{trades}</div>
            <div style={{ fontSize: 10, color: TE, marginTop: 3, letterSpacing: .5 }}>Trades</div>
          </div>
          <div style={{ width: 1, background: BORD }} />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 18, fontWeight: 600, color: TX, fontFamily: MONO }}>{alerts.length}</div>
            <div style={{ fontSize: 10, color: TE, marginTop: 3, letterSpacing: .5 }}>Alertes</div>
          </div>
        </div>
      </div>

      {/* Push notif banner */}
      {pushStatus === 'idle' && (
        <div style={{ margin: '0 16px 16px', padding: '14px 16px', background: SF, border: `1px solid ${VIO}44`, borderRadius: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 20 }}>🔔</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, color: TX, fontWeight: 500 }}>Activer les alertes push</div>
            <div style={{ fontSize: 11, color: TD, marginTop: 2 }}>Reçois les alertes critiques même quand l'app est fermée</div>
          </div>
          <button onClick={enablePush} style={{ background: VIO, border: 'none', borderRadius: 8, color: '#fff', fontSize: 12, fontWeight: 600, padding: '8px 14px', cursor: 'pointer', flexShrink: 0 }}>
            Activer
          </button>
        </div>
      )}
      {pushStatus === 'loading' && (
        <div style={{ margin: '0 16px 16px', padding: '12px 16px', background: SF, border: `1px solid ${BORD}`, borderRadius: 12, fontSize: 13, color: TD, textAlign: 'center' }}>
          Autorisation en cours…
        </div>
      )}
      {pushStatus === 'granted' && (
        <div style={{ margin: '0 16px 16px', padding: '10px 16px', background: 'rgba(0,209,122,.06)', border: `1px solid rgba(0,209,122,.2)`, borderRadius: 12, fontSize: 12, color: GRN, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>✓</span> Alertes push activées
        </div>
      )}

      {/* Alerts */}
      <div style={{ flex: 1, padding: '0 16px', overflowY: 'auto' }}>
        <div style={{ fontSize: 11, color: TE, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12, fontFamily: MONO }}>
          Alertes du jour
        </div>
        {alerts.length === 0 ? (
          <div style={{ textAlign: 'center', color: TE, fontSize: 13, padding: '32px 0', background: SF, borderRadius: 12, border: `1px solid ${BORD}` }}>
            Aucune alerte — bonne session 🟢
          </div>
        ) : (
          alerts.map((a, i) => <AlertItem key={a.id ?? i} a={a} />)
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: '16px 20px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `1px solid ${BORD}`, marginTop: 16 }}>
        <a href="/dashboard" style={{ fontSize: 12, color: TD, textDecoration: 'none' }}>
          Dashboard complet →
        </a>
        <button
          onClick={() => { window.location.href = '/login' }}
          style={{ fontSize: 12, color: TE, background: 'none', border: 'none', cursor: 'pointer', fontFamily: SANS }}
        >
          Déconnexion
        </button>
      </div>
    </div>
  )
}
