'use client'

import { useState, useEffect } from 'react'
import AppHeader from '@/components/AppHeader'

interface Status {
  connected: boolean
  polling: boolean
  accountId: string | null
  accountName: string | null
  lastPolledAt?: string | null
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

const STEP: React.CSSProperties = {
  display: 'flex',
  gap: 12,
  alignItems: 'flex-start',
  marginBottom: 14,
}

const STEP_NUM: React.CSSProperties = {
  width: 22,
  height: 22,
  borderRadius: '50%',
  background: 'rgba(220,80,60,.12)',
  border: '0.5px solid rgba(220,80,60,.3)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 10,
  color: '#dc503c',
  flexShrink: 0,
  fontFamily: "'DM Sans',sans-serif",
  fontWeight: 600,
  marginTop: 2,
}

export default function CTraderClient({ userEmail, initialStatus, searchParams }: Props) {
  const [status, setStatus]               = useState(initialStatus)
  const [disconnecting, setDisconnecting] = useState(false)
  const [apiKey, setApiKey]               = useState<string | null>(null)
  const [copied, setCopied]               = useState(false)

  useEffect(() => {
    fetch('/api/ctrader/status')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setStatus(d) })
      .catch(() => {})

    fetch('/api/api-key')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.keys?.length) setApiKey(d.keys[0].prefix + '…') })
      .catch(() => {})
  }, [])

  async function handleDisconnect() {
    setDisconnecting(true)
    await fetch('/api/ctrader/disconnect', { method: 'POST' })
    setStatus({ connected: false, polling: false, accountId: null, accountName: null })
    setDisconnecting(false)
  }

  function copyCode() {
    fetch('/CaldraBot.algo')
      .then(r => r.text())
      .then(code => {
        navigator.clipboard.writeText(code)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      })
      .catch(() => {})
  }

  const banner =
    searchParams.ctrader === 'error'         ? { type: 'error', msg: 'Erreur OAuth cTrader — réessaie.' }
    : searchParams.ctrader === 'no_account'  ? { type: 'error', msg: 'Aucun compte cTrader trouvé sur ce profil.' }
    : searchParams.ctrader === 'connected'   ? { type: 'ok',    msg: 'cTrader connecté avec succès.' }
    : searchParams.ctrader === 'configure'   ? { type: 'ok',    msg: 'cTrader connecté avec succès.' }
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
        .ig-green{border-color:rgba(34,197,94,.22)!important;color:rgba(34,197,94,.7)!important}
      `}</style>

      <AppHeader current="intégrations" userEmail={userEmail} />
      <div style={{ background: '#08080d', minHeight: '100vh', paddingTop: 52, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
        <main style={{ padding: '2rem', animation: 'igFadeIn .4s ease both', maxWidth: 900 }}>

          {/* Header */}
          <div style={{ marginBottom: '1.75rem' }}>
            <div style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(220,80,60,.55)', marginBottom: '.4rem' }}>Connecteurs</div>
            <h1 style={{ margin: 0, fontWeight: 400, fontSize: '1.6rem', letterSpacing: -.5, color: '#fff', marginBottom: '.4rem' }}>Intégrations</h1>
            <p style={{ margin: 0, color: 'rgba(226,224,218,.3)', fontSize: 13 }}>
              Connectez vos plateformes de trading — les trades seront analysés automatiquement.
            </p>
          </div>

          {/* Banner OAuth */}
          {banner && (
            <div style={{
              marginBottom: '1.5rem', padding: '11px 15px', borderRadius: 7, fontSize: 12,
              background: banner.type === 'error' ? 'rgba(220,80,60,.08)' : 'rgba(16,185,129,.06)',
              border: `0.5px solid ${banner.type === 'error' ? 'rgba(220,80,60,.3)' : 'rgba(16,185,129,.22)'}`,
              color: banner.type === 'error' ? '#f87171' : '#4ade80',
            }}>
              {banner.msg}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '1.25rem' }}>

            {/* ── cTrader ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

              {/* Étape 1 : OAuth */}
              <div style={CARD}>
                <div style={{ padding: '14px 18px 12px', borderBottom: '0.5px solid rgba(255,255,255,.055)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 34, height: 34, borderRadius: 7, flexShrink: 0,
                        background: 'rgba(220,80,60,.1)', border: '0.5px solid rgba(220,80,60,.25)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 700, color: '#dc503c',
                      }}>CT</div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 500, color: '#e2e8f0' }}>cTrader</div>
                        <div style={{ fontSize: 10, color: '#475569', marginTop: 1 }}>Étape 1 — Connexion OAuth</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <div style={{
                        width: 6, height: 6, borderRadius: '50%',
                        background: status.connected ? '#22c55e' : 'rgba(255,255,255,.15)',
                        boxShadow: status.connected ? '0 0 6px rgba(34,197,94,.45)' : 'none',
                        transition: 'all .3s',
                      }} />
                      <span style={{
                        fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase' as const,
                        color: status.connected ? 'rgba(34,197,94,.7)' : 'rgba(255,255,255,.22)',
                      }}>
                        {status.connected ? 'Connecté' : 'Non connecté'}
                      </span>
                    </div>
                  </div>
                </div>
                <div style={{ padding: '14px 18px 16px' }}>
                  {status.connected ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontSize: 10, color: '#475569', marginBottom: 3 }}>Compte autorisé</div>
                        <div style={{ fontSize: 13, color: '#e2e8f0', fontFamily: "'JetBrains Mono',monospace" }}>
                          {status.accountName ?? status.accountId ?? '—'}
                        </div>
                      </div>
                      <button className="ig-btn ig-danger" onClick={handleDisconnect} disabled={disconnecting}>
                        {disconnecting ? 'Déconnexion…' : 'Déconnecter'}
                      </button>
                    </div>
                  ) : (
                    <div>
                      <p style={{ margin: '0 0 12px', fontSize: 12, color: 'rgba(226,224,218,.35)', lineHeight: 1.6 }}>
                        Autorisez Caldra sur votre compte cTrader.
                      </p>
                      <button className="ig-btn ig-primary" onClick={() => { window.location.href = '/api/ctrader/connect' }}>
                        + Connecter cTrader
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Étape 2 : cBot */}
              <div style={CARD}>
                <div style={{ padding: '14px 18px 12px', borderBottom: '0.5px solid rgba(255,255,255,.055)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: '#e2e8f0' }}>CaldraBot</div>
                      <div style={{ fontSize: 10, color: '#475569', marginTop: 1 }}>Étape 2 — Envoi automatique des trades</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <div style={{
                        width: 6, height: 6, borderRadius: '50%',
                        background: status.polling ? '#22c55e' : 'rgba(255,255,255,.15)',
                        boxShadow: status.polling ? '0 0 6px rgba(34,197,94,.45)' : 'none',
                      }} />
                      <span style={{
                        fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase' as const,
                        color: status.polling ? 'rgba(34,197,94,.7)' : 'rgba(255,255,255,.22)',
                      }}>
                        {status.polling ? 'Actif' : 'Inactif'}
                      </span>
                    </div>
                  </div>
                </div>
                <div style={{ padding: '16px 18px 18px' }}>
                  <p style={{ margin: '0 0 16px', fontSize: 12, color: 'rgba(226,224,218,.35)', lineHeight: 1.65 }}>
                    Installez le cBot dans cTrader pour envoyer vos trades en temps réel à Caldra dès qu'une position se ferme.
                  </p>

                  <div style={{ marginBottom: 16 }}>
                    <div style={STEP}>
                      <div style={STEP_NUM}>1</div>
                      <div style={{ fontSize: 12, color: 'rgba(226,224,218,.5)', lineHeight: 1.6 }}>
                        Téléchargez le fichier <span style={{ color: '#e2e8f0', fontFamily: "'JetBrains Mono',monospace" }}>CaldraBot.algo</span> ci-dessous et ouvrez-le dans cTrader via <span style={{ color: '#e2e8f0' }}>Automate → Open</span>.
                      </div>
                    </div>
                    <div style={STEP}>
                      <div style={STEP_NUM}>2</div>
                      <div style={{ fontSize: 12, color: 'rgba(226,224,218,.5)', lineHeight: 1.6 }}>
                        Récupérez votre clé API depuis{' '}
                        <a href="/settings/api" style={{ color: '#dc503c', textDecoration: 'none' }}>/settings/api</a>
                        {apiKey && <span style={{ color: 'rgba(226,224,218,.3)' }}> (actuelle : <span style={{ fontFamily: "'JetBrains Mono',monospace" }}>{apiKey}</span>)</span>}
                      </div>
                    </div>
                    <div style={STEP}>
                      <div style={STEP_NUM}>3</div>
                      <div style={{ fontSize: 12, color: 'rgba(226,224,218,.5)', lineHeight: 1.6 }}>
                        Démarrez le cBot sur n'importe quel graphique et collez votre clé dans le paramètre <span style={{ color: '#e2e8f0' }}>Caldra API Key</span>.
                      </div>
                    </div>
                    <div style={{ ...STEP, marginBottom: 0 }}>
                      <div style={STEP_NUM}>4</div>
                      <div style={{ fontSize: 12, color: 'rgba(226,224,218,.5)', lineHeight: 1.6 }}>
                        Chaque position fermée sera automatiquement analysée dans votre dashboard.
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8 }}>
                    <a href="/CaldraBot.algo" download="CaldraBot.algo" style={{ textDecoration: 'none' }}>
                      <button className="ig-btn ig-primary">
                        ↓ Télécharger CaldraBot.algo
                      </button>
                    </a>
                    <button className="ig-btn ig-green" onClick={copyCode}>
                      {copied ? '✓ Copié' : 'Copier le code'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* ── MetaTrader 5 ── */}
            <div style={CARD}>
              <div style={{ padding: '14px 18px 12px', borderBottom: '0.5px solid rgba(255,255,255,.055)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 34, height: 34, borderRadius: 7, flexShrink: 0,
                      background: 'rgba(56,189,248,.08)', border: '0.5px solid rgba(56,189,248,.2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 700, color: '#38bdf8',
                    }}>MT5</div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: '#e2e8f0' }}>MetaTrader 5</div>
                      <div style={{ fontSize: 10, color: '#475569', marginTop: 1 }}>Futures · Forex · EA Caldra</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(255,255,255,.15)' }} />
                    <span style={{ fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase' as const, color: 'rgba(255,255,255,.22)' }}>Via API</span>
                  </div>
                </div>
              </div>
              <div style={{ padding: '14px 18px 16px' }}>
                <p style={{ margin: '0 0 12px', fontSize: 12, color: 'rgba(226,224,218,.35)', lineHeight: 1.65 }}>
                  Utilisez l'EA Caldra pour envoyer vos trades MT5 automatiquement via la clé API.
                </p>
                <a href="/settings/api" style={{ textDecoration: 'none' }}>
                  <button className="ig-btn">Configurer la clé API →</button>
                </a>
              </div>
            </div>

          </div>
        </main>
      </div>
    </>
  )
}
