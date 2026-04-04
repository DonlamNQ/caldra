'use client'

import { useEffect, useRef, useState } from 'react'
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

const NET_JS = `(function(){
  var cv=document.getElementById('dash-net');
  if(!cv)return;
  var ctx=cv.getContext('2d');
  var RED='rgba(220,80,60,',WHT='rgba(255,255,255,';
  var W,H,pts,N_BASE=38,MAX_DIST=135,SPEED=0.2;
  function resize(){W=cv.width=window.innerWidth;H=cv.height=window.innerHeight;}
  function mkPts(){var n=Math.round(N_BASE*(W/1440));pts=Array.from({length:Math.max(22,n)},function(){return{x:Math.random()*W,y:Math.random()*H,vx:(Math.random()-.5)*SPEED,vy:(Math.random()-.5)*SPEED,r:Math.random()<.05?2:1,red:Math.random()<.05};});}
  function draw(){ctx.clearRect(0,0,W,H);for(var i=0;i<pts.length;i++){for(var j=i+1;j<pts.length;j++){var dx=pts[i].x-pts[j].x,dy=pts[i].y-pts[j].y,d=Math.sqrt(dx*dx+dy*dy);if(d<MAX_DIST){var a=(1-d/MAX_DIST)*.11;ctx.beginPath();ctx.moveTo(pts[i].x,pts[i].y);ctx.lineTo(pts[j].x,pts[j].y);ctx.strokeStyle=(pts[i].red||pts[j].red)?RED+a*.7+')':WHT+a+')';ctx.lineWidth=.5;ctx.stroke();}}}for(var k=0;k<pts.length;k++){ctx.beginPath();ctx.arc(pts[k].x,pts[k].y,pts[k].r,0,Math.PI*2);ctx.fillStyle=pts[k].red?RED+'.4)':WHT+'.15)';ctx.fill();}}
  function move(){for(var k=0;k<pts.length;k++){pts[k].x+=pts[k].vx;pts[k].y+=pts[k].vy;if(pts[k].x<0||pts[k].x>W)pts[k].vx*=-1;if(pts[k].y<0||pts[k].y>H)pts[k].vy*=-1;}}
  function loop(){move();draw();requestAnimationFrame(loop);}
  resize();mkPts();loop();
  window.addEventListener('resize',function(){resize();mkPts();});
})();`

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

  const score = computeScore(alerts)
  const today = new Date().toISOString().split('T')[0]

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  useEffect(() => {
    if (!document.getElementById('dm-sans-dash')) {
      const link = document.createElement('link')
      link.id = 'dm-sans-dash'
      link.rel = 'stylesheet'
      link.href = 'https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,200;9..40,300;9..40,400;9..40,500;9..40,700&display=swap'
      document.head.appendChild(link)
    }
    document.getElementById('dash-net-script')?.remove()
    const s = document.createElement('script')
    s.id = 'dash-net-script'
    s.textContent = NET_JS
    document.body.appendChild(s)
    return () => { document.getElementById('dash-net-script')?.remove() }
  }, [])

  useEffect(() => {
    const supabase = createClient()
    channelRef.current = supabase
      .channel('caldra-alerts-live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'alerts' }, (payload) => {
        const newAlert = payload.new as AlertRow & { session_date?: string }
        const isToday = newAlert.session_date === today || !newAlert.session_date
        const isCurrentUser = (newAlert as any).user_id === userId || !(newAlert as any).user_id
        if (isToday && isCurrentUser) {
          setAlerts(prev => [newAlert, ...prev])
          setLastUpdate(new Date())
        }
      })
      .subscribe((status) => { setConnected(status === 'SUBSCRIBED') })
    return () => { channelRef.current?.unsubscribe() }
  }, [userId, today])

  const pnlColor = stats.total_pnl > 0 ? '#22c55e' : stats.total_pnl < 0 ? '#ef4444' : 'rgba(232,230,224,.4)'
  const pnlSign = stats.total_pnl >= 0 ? '+' : ''
  const winRate = stats.total_trades > 0 ? Math.round((stats.wins / stats.total_trades) * 100) : null
  const hasCritical = alerts.some(a => (a.level ?? a.severity ?? 1) === 3)

  const CARD: React.CSSProperties = {
    background: '#0f0f16',
    border: '0.5px solid rgba(255,255,255,.07)',
    borderRadius: 16,
    position: 'relative',
    overflow: 'hidden',
  }

  const statCards = [
    {
      label: 'PnL session',
      value: `${pnlSign}${stats.total_pnl.toFixed(2)}`,
      sub: 'USD',
      color: pnlColor,
      accent: stats.total_pnl > 0 ? 'rgba(34,197,94,.07)' : stats.total_pnl < 0 ? 'rgba(220,80,60,.07)' : 'transparent',
    },
    {
      label: 'Trades',
      value: stats.total_trades,
      sub: "aujourd'hui",
      color: '#e8e6e0',
      accent: 'transparent',
    },
    {
      label: 'Gagnants',
      value: stats.wins,
      sub: 'trades positifs',
      color: '#22c55e',
      accent: 'rgba(34,197,94,.06)',
    },
    {
      label: 'Perdants',
      value: stats.losses,
      sub: 'trades négatifs',
      color: '#ef4444',
      accent: 'rgba(239,68,68,.06)',
    },
    {
      label: 'Win Rate',
      value: winRate !== null ? `${winRate}%` : '—',
      sub: 'taux de réussite',
      color: winRate !== null ? (winRate >= 50 ? '#22c55e' : '#f59e0b') : 'rgba(232,230,224,.35)',
      accent: winRate !== null && winRate >= 50 ? 'rgba(34,197,94,.06)' : 'rgba(245,158,11,.06)',
    },
    {
      label: 'Alertes',
      value: alerts.length,
      sub: 'déclenchées',
      color: alerts.length === 0 ? '#22c55e' : hasCritical ? '#ef4444' : '#f59e0b',
      accent: alerts.length === 0 ? 'rgba(34,197,94,.06)' : hasCritical ? 'rgba(220,80,60,.08)' : 'rgba(245,158,11,.06)',
    },
  ]

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,200;9..40,300;9..40,400;9..40,500;9..40,700&display=swap');
        *{box-sizing:border-box}
        body{margin:0;background:#08080d}
        ::-webkit-scrollbar{width:3px;height:3px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:rgba(255,255,255,.08);border-radius:3px}
        @keyframes dashPulse{0%,100%{opacity:1}50%{opacity:.3}}
        @keyframes dashFadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        .dsh-nav-link{font-size:10px;font-weight:400;letter-spacing:2px;text-transform:uppercase;color:rgba(232,230,224,.4);text-decoration:none;transition:color .2s;font-family:'DM Sans',sans-serif}
        .dsh-nav-link:hover{color:#fff}
        .dsh-nav-active{color:#fff!important}
        .dsh-signout{font-size:9px;padding:6px 14px;background:transparent;border:0.5px solid rgba(255,255,255,.18);border-radius:4px;color:rgba(232,230,224,.5);cursor:pointer;letter-spacing:1.5px;text-transform:uppercase;font-family:'DM Sans',sans-serif;transition:background .2s,color .2s,border-color .2s}
        .dsh-signout:hover{background:rgba(255,255,255,.06);color:#fff;border-color:rgba(255,255,255,.35)}
        .dsh-stat:hover{border-color:rgba(255,255,255,.13)!important}
        .dsh-row:hover{background:rgba(255,255,255,.02)!important}
      `}</style>

      <div style={{ minHeight: '100vh', background: '#08080d', color: '#e8e6e0', fontFamily: "'DM Sans', system-ui, sans-serif", position: 'relative' }}>

        {/* Canvas background */}
        <canvas id="dash-net" style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }} />

        {/* Gradient blobs */}
        <div style={{ position: 'fixed', width: 700, height: 700, borderRadius: '50%', background: 'radial-gradient(circle,rgba(220,80,60,.05) 0%,transparent 65%)', top: -280, left: '50%', transform: 'translateX(-50%)', pointerEvents: 'none', zIndex: 0 }} />
        <div style={{ position: 'fixed', width: 420, height: 420, borderRadius: '50%', background: 'radial-gradient(circle,rgba(80,80,220,.04) 0%,transparent 65%)', bottom: '10%', right: -100, pointerEvents: 'none', zIndex: 0 }} />

        {/* ── Fixed Header ─────────────────────────────────────────────── */}
        <header style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '1.1rem 3rem',
          borderBottom: '0.5px solid rgba(255,255,255,.07)',
          backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)',
          background: 'rgba(8,8,13,.9)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
            <a href="/" style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ fontWeight: 300, fontSize: 14, letterSpacing: 5, textTransform: 'uppercase', color: '#fff', lineHeight: 1 }}>
                Cald<span style={{ color: '#dc503c' }}>ra</span>
              </div>
              <div style={{ fontSize: 8, letterSpacing: 8, textTransform: 'uppercase', color: 'rgba(255,255,255,.45)', lineHeight: 1 }}>Session</div>
            </a>
            <div style={{ width: 0.5, height: 28, background: 'rgba(255,255,255,.1)', margin: '0 2rem', flexShrink: 0 }} />
            <nav style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
              <a className="dsh-nav-link dsh-nav-active" href="/dashboard">Dashboard</a>
              <a className="dsh-nav-link" href="/alerts">Alertes</a>
              <a className="dsh-nav-link" href="/analytics">Analytics</a>
              <a className="dsh-nav-link" href="/settings/rules">Règles</a>
              <a className="dsh-nav-link" href="/billing">Billing</a>
            </nav>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <span style={{ fontSize: 11, color: 'rgba(232,230,224,.25)', letterSpacing: 1, fontVariantNumeric: 'tabular-nums' }}>{today}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{
                width: 6, height: 6, borderRadius: '50%',
                background: connected ? '#22c55e' : 'rgba(255,255,255,.18)',
                boxShadow: connected ? '0 0 8px rgba(34,197,94,.6)' : 'none',
                animation: connected ? 'none' : 'dashPulse 2s infinite',
                transition: 'all .3s',
              }} />
              <span style={{ fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', color: connected ? 'rgba(34,197,94,.7)' : 'rgba(255,255,255,.22)' }}>
                {connected ? 'live' : 'sync…'}
              </span>
            </div>
            <span style={{ fontSize: 11, color: 'rgba(232,230,224,.28)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userEmail}</span>
            <button className="dsh-signout" onClick={handleSignOut}>Déconnexion</button>
          </div>
        </header>

        {/* ── Main ─────────────────────────────────────────────────────── */}
        <main style={{ position: 'relative', zIndex: 1, padding: '6.5rem 3rem 4rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>

          {/* Page title */}
          <div style={{ animation: 'dashFadeIn .5s ease both' }}>
            <div style={{ fontSize: 10, letterSpacing: 2.5, textTransform: 'uppercase', color: 'rgba(220,80,60,.55)', marginBottom: '.5rem' }}>Session du jour</div>
            <h1 style={{ margin: 0, fontWeight: 200, fontSize: 'clamp(1.6rem,2.8vw,2.1rem)', letterSpacing: -1, color: '#fff', lineHeight: 1.1 }}>
              Votre tableau<br />de bord
            </h1>
          </div>

          {/* ── Row 1: Score + Stat cards ──────────────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '1.5rem', alignItems: 'start', animation: 'dashFadeIn .6s ease .1s both' }}>

            {/* Score card */}
            <div style={{ ...CARD, padding: '2.25rem 1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg,transparent,rgba(255,255,255,.07),transparent)' }} />
              <div style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(232,230,224,.3)', alignSelf: 'flex-start' }}>Score comportemental</div>
              <ScoreRing score={score} size={180} />
              {lastUpdate ? (
                <div style={{ fontSize: 9, color: 'rgba(232,230,224,.22)', letterSpacing: .5, textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>
                  màj {lastUpdate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </div>
              ) : (
                <div style={{ fontSize: 9, color: 'rgba(232,230,224,.2)', letterSpacing: .5 }}>En attente de trades…</div>
              )}
            </div>

            {/* Stat cards grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '1rem' }}>
              {statCards.map((s, i) => (
                <div key={i} className="dsh-stat" style={{
                  ...CARD,
                  padding: '1.4rem 1.5rem',
                  transition: 'border-color .2s',
                  animation: `dashFadeIn .5s ease ${.1 + i * .06}s both`,
                }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg,transparent,rgba(255,255,255,.05),transparent)' }} />
                  <div style={{ position: 'absolute', inset: 0, background: s.accent, borderRadius: 16, pointerEvents: 'none' }} />
                  <div style={{ position: 'relative' }}>
                    <div style={{ fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', color: 'rgba(232,230,224,.3)', marginBottom: '.75rem' }}>{s.label}</div>
                    <div style={{ fontSize: 'clamp(1.5rem,2.2vw,1.9rem)', fontWeight: 200, color: s.color, lineHeight: 1, fontVariantNumeric: 'tabular-nums', letterSpacing: -1 }}>
                      {s.value}
                    </div>
                    <div style={{ fontSize: 10, color: 'rgba(232,230,224,.28)', marginTop: '.45rem', letterSpacing: .25 }}>{s.sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Row 2: Alerts + Trades ─────────────────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.65fr', gap: '1.5rem', alignItems: 'start', animation: 'dashFadeIn .6s ease .25s both' }}>

            {/* Alert feed */}
            <div style={{ ...CARD, padding: '1.5rem', maxHeight: 490, display: 'flex', flexDirection: 'column' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg,transparent,rgba(255,255,255,.07),transparent)' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(232,230,224,.3)' }}>Alertes du jour</div>
                {alerts.length > 0 && (
                  <div style={{
                    fontSize: 9, padding: '2px 9px',
                    background: hasCritical ? 'rgba(220,80,60,.12)' : 'rgba(245,158,11,.1)',
                    border: `0.5px solid ${hasCritical ? 'rgba(220,80,60,.28)' : 'rgba(245,158,11,.25)'}`,
                    borderRadius: 100, color: hasCritical ? 'rgba(220,80,60,.85)' : 'rgba(245,158,11,.85)',
                    letterSpacing: 1, textTransform: 'uppercase',
                  }}>
                    {alerts.length}
                  </div>
                )}
              </div>
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <AlertFeed alerts={alerts} />
              </div>
            </div>

            {/* Trade log */}
            <div style={{ ...CARD, padding: '1.5rem', maxHeight: 490, overflowY: 'auto' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg,transparent,rgba(255,255,255,.07),transparent)' }} />
              <div style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(232,230,224,.3)', marginBottom: '1rem' }}>Trades du jour</div>
              <TradeLog trades={trades} />
            </div>
          </div>
        </main>
      </div>
    </>
  )
}
