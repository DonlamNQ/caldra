'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import ScoreRing from '@/components/dashboard/ScoreRing'
import AlertFeed, { AlertRow } from '@/components/dashboard/AlertFeed'
import TradeLog, { TradeRow } from '@/components/dashboard/TradeLog'

interface SessionStats {
  total_trades: number
  total_pnl: number
  wins: number
  losses: number
}

interface DashboardClientProps {
  userId: string
  userEmail: string
  initialScore: number
  initialAlerts: AlertRow[]
  initialTrades: TradeRow[]
  initialStats: SessionStats
}

function computeScore(alerts: AlertRow[]): number {
  const deductions = alerts.reduce((sum, a) => {
    const level = a.level ?? a.severity ?? 1
    if (level === 3) return sum + 18
    if (level === 2) return sum + 8
    return sum + 3
  }, 0)
  return Math.max(0, 100 - deductions)
}

function StatItem({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span style={{ color: '#475569', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </span>
      <span style={{ color: color ?? '#e2e8f0', fontSize: 20, fontWeight: 700, fontFamily: 'monospace' }}>
        {value}
      </span>
    </div>
  )
}

export default function DashboardClient({
  userId,
  userEmail,
  initialScore,
  initialAlerts,
  initialTrades,
  initialStats,
}: DashboardClientProps) {
  const [alerts, setAlerts] = useState<AlertRow[]>(initialAlerts)
  const [trades] = useState<TradeRow[]>(initialTrades)
  const [stats] = useState<SessionStats>(initialStats)
  const [connected, setConnected] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const channelRef = useRef<any>(null)
  const router = useRouter()

  const score = computeScore(alerts)
  const today = new Date().toISOString().split('T')[0]

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  useEffect(() => {
    const supabase = createClient()

    channelRef.current = supabase
      .channel('caldra-alerts-live')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'alerts' },
        (payload) => {
          const newAlert = payload.new as AlertRow & { session_date?: string }
          // Filter client-side: same user, today's session
          const isToday = newAlert.session_date === today || !newAlert.session_date
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const isCurrentUser = (newAlert as any).user_id === userId || !(newAlert as any).user_id
          if (isToday && isCurrentUser) {
            setAlerts(prev => [newAlert, ...prev])
            setLastUpdate(new Date())
          }
        }
      )
      .subscribe((status) => {
        setConnected(status === 'SUBSCRIBED')
      })

    return () => {
      channelRef.current?.unsubscribe()
    }
  }, [userId, today])

  const pnlColor = stats.total_pnl > 0 ? '#22c55e' : stats.total_pnl < 0 ? '#ef4444' : '#64748b'
  const pnlSign = stats.total_pnl >= 0 ? '+' : ''

  return (
    <div style={{ minHeight: '100vh', background: '#08080d', color: '#e2e8f0', fontFamily: 'system-ui, sans-serif' }}>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 24px',
          borderBottom: '1px solid #1e1e35',
          background: '#0a0a14',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontWeight: 800, fontSize: 20, letterSpacing: '-0.02em', color: '#e2e8f0' }}>
            caldra
          </span>
          <span style={{ color: '#334155', fontSize: 14 }}>/</span>
          <span style={{ color: '#64748b', fontSize: 14 }}>dashboard</span>
          <span style={{ color: '#334155', fontSize: 14 }}>/</span>
          <a href="/alerts" style={{ color: '#475569', fontSize: 14, textDecoration: 'none' }}>alertes</a>
          <span style={{ color: '#334155', fontSize: 14 }}>/</span>
          <a href="/settings/rules" style={{ color: '#475569', fontSize: 14, textDecoration: 'none' }}>règles</a>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ color: '#475569', fontSize: 12, fontFamily: 'monospace' }}>
            {today}
          </span>
          <span style={{ color: '#334155', fontSize: 12 }}>{userEmail}</span>
          <button
            onClick={handleSignOut}
            style={{ background: 'none', border: '1px solid #1e1e35', borderRadius: 6, color: '#475569', fontSize: 12, padding: '4px 10px', cursor: 'pointer' }}
          >
            Déconnexion
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: connected ? '#22c55e' : '#374151',
                boxShadow: connected ? '0 0 6px #22c55e' : 'none',
                transition: 'all 0.3s ease',
              }}
            />
            <span style={{ color: '#475569', fontSize: 11 }}>
              {connected ? 'live' : 'connecting…'}
            </span>
          </div>
        </div>
      </header>

      {/* ── Body ───────────────────────────────────────────────────────────── */}
      <main style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* ── Row 1: Score + Stats + Alert count pills ───────────────────── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '200px 1fr',
            gap: 20,
            alignItems: 'start',
          }}
        >
          {/* Score card */}
          <div
            style={{
              background: '#0d0d1a',
              border: '1px solid #1e1e35',
              borderRadius: 12,
              padding: '24px 16px',
              display: 'flex',
              justifyContent: 'center',
            }}
          >
            <ScoreRing score={score} />
          </div>

          {/* Stats grid */}
          <div
            style={{
              background: '#0d0d1a',
              border: '1px solid #1e1e35',
              borderRadius: 12,
              padding: '20px 24px',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
              gap: 20,
            }}
          >
            <StatItem label="PnL session" value={`${pnlSign}${stats.total_pnl.toFixed(2)}`} color={pnlColor} />
            <StatItem label="Trades" value={stats.total_trades} />
            <StatItem label="Gagnants" value={stats.wins} color="#22c55e" />
            <StatItem label="Perdants" value={stats.losses} color="#ef4444" />
            <StatItem
              label="Win rate"
              value={
                stats.total_trades > 0
                  ? `${Math.round((stats.wins / stats.total_trades) * 100)}%`
                  : '—'
              }
            />
            <StatItem label="Alertes" value={alerts.length} color={alerts.length > 0 ? '#f59e0b' : '#22c55e'} />
          </div>
        </div>

        {/* ── Row 2: Alert feed + Trade log ──────────────────────────────── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1.6fr',
            gap: 20,
            alignItems: 'start',
          }}
        >
          {/* Alert feed */}
          <div
            style={{
              background: '#0d0d1a',
              border: '1px solid #1e1e35',
              borderRadius: 12,
              padding: '20px',
              maxHeight: 460,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h2 style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Alertes du jour
              </h2>
              {lastUpdate && (
                <span style={{ color: '#374151', fontSize: 10, fontFamily: 'monospace' }}>
                  màj {lastUpdate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              )}
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <AlertFeed alerts={alerts} />
            </div>
          </div>

          {/* Trade log */}
          <div
            style={{
              background: '#0d0d1a',
              border: '1px solid #1e1e35',
              borderRadius: 12,
              padding: '20px',
              maxHeight: 460,
              overflowY: 'auto',
            }}
          >
            <h2 style={{ margin: '0 0 14px', fontSize: 13, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Trades du jour
            </h2>
            <TradeLog trades={trades} />
          </div>
        </div>
      </main>
    </div>
  )
}
