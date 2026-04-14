'use client'

import { useState, useEffect } from 'react'
import AppShell from '@/components/AppShell'

interface Status {
  connected: boolean
  polling: boolean
  accountId: string | null
  accountName: string | null
}

interface Props {
  userEmail: string
  initialStatus: Status
  searchParams: { ctrader?: string }
}

const CARD: React.CSSProperties = {
  background: '#0f0f17',
  border: '0.5px solid rgba(255,255,255,.065)',
  borderRadius: 10,
  overflow: 'hidden',
}

export default function CTraderClient({ userEmail, initialStatus, searchParams }: Props) {
  const [status, setStatus]           = useState(initialStatus)
  const [disconnecting, setDisconnecting] = useState(false)

  useEffect(() => {
    fetch('/api/ctrader/status')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setStatus(d) })
      .catch(() => {})
  }, [])

  async function handleDisconnect() {
    setDisconnecting(true)
    await fetch('/api/ctrader/disconnect', { method: 'POST' })
    setStatus({ connected: false, polling: false, accountId: null, accountName: null })
    setDisconnecting(false)
  }

  const banner =
    searchParams.ctrader === 'error'      ? { type: 'error',   msg: 'Erreur OAuth cTrader — réessaie.' }
    : searchParams.ctrader === 'no_account' ? { type: 'error', msg: 'Aucun compte cTrader trouvé sur ce profil.' }
    : searchParams.ctrader === 'configure'  ? { type: 'ok',    msg: 'cTrader connecté avec succès.' }
    : searchParams.ctrader === 'connected'  ? { type: 'ok',    msg: 'cTrader connecté avec succès.' }
    : null

  return (
    <>
      <style>{`
        @keyframes igFadeIn{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}
        .ig-btn{font-size:9px;padding:7px 14px;background:transparent;border:0.5px solid rgba(255,255,255,.1);border-radius:5px;color:rgba(226,224,218,.4);cursor:pointer;letter-spacing:1.5px;text-transform:uppercase;font-family:'DM Sans',sans-serif;transition:all .15s;display:inline-flex;align-items:center;gap:6px}
        .ig-btn:hover{background:rgba(255,255,255,.04);color:rgba(226,224,218,.7)}
        .ig-btn:disabled{opacity:.35;cursor:not-allowed}
        .ig-primary{background:rgba(220,80,60,.85)!important;border-color:transparent!important;color:#fff!important}
        .ig-primary:hover{background:rgba(220,80,60,.7)!important}
        .ig-danger{border-color:rgba(244,63,94,.22)!important;color:rgba(244,63,94,.55)!important}
        .ig-danger:hover{background:rgba(244,63,94,.06)!important;color:rgba(244,63,94,.8)!important}
      `}</style>

      <AppShell current="intégrations" userEmail={userEmail}>
        <main style={{ padding: '2rem', animation: 'igFadeIn .4s ease both' }}>

          {/* Page header */}
          <div style={{ marginBottom: '1.75rem' }}>
            <div style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(220,80,60,.55)', marginBottom: '.4rem', fontFamily: "'DM Sans',sans-serif" }}>Connecteurs</div>
            <h1 style={{ margin: 0, fontWeight: 400, fontSize: '1.6rem', letterSpacing: -.5, color: '#fff', fontFamily: "'DM Sans',sans-serif", marginBottom: '.4rem' }}>Intégrations</h1>
            <p style={{ margin: 0, color: 'rgba(226,224,218,.3)', fontSize: 13, fontFamily: "'DM Sans',sans-serif" }}>
              Connectez vos plateformes de trading — les trades seront analysés automatiquement.
            </p>
          </div>

          {/* Banner OAuth */}
          {banner && (
            <div style={{
              marginBottom: '1.5rem', padding: '11px 15px', borderRadius: 7,
              fontSize: 12, fontFamily: "'DM Sans',sans-serif",
              background: banner.type === 'error' ? 'rgba(220,80,60,.08)' : 'rgba(16,185,129,.06)',
              border: `0.5px solid ${banner.type === 'error' ? 'rgba(220,80,60,.3)' : 'rgba(16,185,129,.22)'}`,
              color: banner.type === 'error' ? '#f87171' : '#4ade80',
            }}>
              {banner.msg}
            </div>
          )}

          {/* Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))', gap: '1.25rem' }}>

            {/* ── cTrader ── */}
            <div style={CARD}>
              <div style={{ padding: '18px 20px 14px', borderBottom: '0.5px solid rgba(255,255,255,.055)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 38, height: 38, borderRadius: 8, flexShrink: 0,
                      background: 'rgba(220,80,60,.1)', border: '0.5px solid rgba(220,80,60,.25)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, fontWeight: 700, color: '#dc503c', fontFamily: "'DM Sans',sans-serif",
                    }}>CT</div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 500, color: '#e2e8f0', fontFamily: "'DM Sans',sans-serif" }}>cTrader</div>
                      <div style={{ fontSize: 10, color: '#475569', marginTop: 2, fontFamily: "'DM Sans',sans-serif" }}>Futures · CFD · Forex · Temps réel</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0, paddingTop: 3 }}>
                    <div style={{
                      width: 6, height: 6, borderRadius: '50%',
                      background: status.connected ? '#22c55e' : 'rgba(255,255,255,.15)',
                      boxShadow: status.connected ? '0 0 6px rgba(34,197,94,.45)' : 'none',
                      transition: 'all .3s',
                    }} />
                    <span style={{
                      fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase' as const,
                      color: status.connected ? 'rgba(34,197,94,.7)' : 'rgba(255,255,255,.22)',
                      fontFamily: "'DM Sans',sans-serif", transition: 'color .3s',
                    }}>
                      {status.connected ? 'Connecté' : 'Non connecté'}
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ padding: '16px 20px 20px' }}>
                <p style={{ margin: '0 0 16px', fontSize: 12, color: 'rgba(226,224,218,.35)', lineHeight: 1.65, fontFamily: "'DM Sans',sans-serif" }}>
                  Connectez votre compte cTrader pour recevoir vos trades en temps réel automatiquement.
                </p>

                {status.connected ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 10, color: '#475569', fontFamily: "'DM Sans',sans-serif", marginBottom: 3 }}>Compte</div>
                      <div style={{ fontSize: 13, color: '#e2e8f0', fontFamily: "'JetBrains Mono',monospace", fontWeight: 500 }}>
                        {status.accountName ?? status.accountId ?? '—'}
                      </div>
                    </div>
                    <button className="ig-btn ig-danger" onClick={handleDisconnect} disabled={disconnecting}>
                      {disconnecting ? 'Déconnexion…' : 'Déconnecter'}
                    </button>
                  </div>
                ) : (
                  <button
                    className="ig-btn ig-primary"
                    onClick={() => { window.location.href = '/api/ctrader/connect' }}
                  >
                    + Connecter cTrader
                  </button>
                )}
              </div>
            </div>

            {/* ── MetaTrader 5 ── */}
            <div style={CARD}>
              <div style={{ padding: '18px 20px 14px', borderBottom: '0.5px solid rgba(255,255,255,.055)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 38, height: 38, borderRadius: 8, flexShrink: 0,
                      background: 'rgba(56,189,248,.08)', border: '0.5px solid rgba(56,189,248,.2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 700, color: '#38bdf8', fontFamily: "'DM Sans',sans-serif",
                    }}>MT5</div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 500, color: '#e2e8f0', fontFamily: "'DM Sans',sans-serif" }}>MetaTrader 5</div>
                      <div style={{ fontSize: 10, color: '#475569', marginTop: 2, fontFamily: "'DM Sans',sans-serif" }}>Futures · Forex · EA Caldra</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0, paddingTop: 3 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(255,255,255,.15)' }} />
                    <span style={{ fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase' as const, color: 'rgba(255,255,255,.22)', fontFamily: "'DM Sans',sans-serif" }}>Via API</span>
                  </div>
                </div>
              </div>

              <div style={{ padding: '16px 20px 20px' }}>
                <p style={{ margin: '0 0 16px', fontSize: 12, color: 'rgba(226,224,218,.35)', lineHeight: 1.65, fontFamily: "'DM Sans',sans-serif" }}>
                  Utilisez l'EA Caldra pour envoyer vos trades MT5 automatiquement via la clé API.
                </p>
                <a href="/settings/api" style={{ textDecoration: 'none' }}>
                  <button className="ig-btn">Configurer la clé API →</button>
                </a>
              </div>
            </div>

          </div>
        </main>
      </AppShell>
    </>
  )
}
