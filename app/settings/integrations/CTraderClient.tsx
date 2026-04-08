'use client'

import { useState } from 'react'

interface CTraderClientProps {
  userEmail: string
  status: {
    connected: boolean
    polling: boolean
    accountId: string | null
    accountName: string | null
    needsActivation: boolean
    hasApiKey: boolean
  }
  searchParams: { ctrader?: string }
}

const ACCENT  = '#dc503c'
const BG      = '#08080d'
const CARD    = '#0d0d1a'
const BORDER  = '#1e1e35'
const TEXT    = '#e2e8f0'
const MUTED   = '#475569'

export default function CTraderClient({ userEmail, status, searchParams }: CTraderClientProps) {
  const [caldraApiKey, setCaldraApiKey] = useState('')
  const [activating, setActivating]     = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [localStatus, setLocalStatus]   = useState(status)
  const [error, setError]               = useState<string | null>(null)
  const [success, setSuccess]           = useState<string | null>(
    searchParams.ctrader === 'connected' || searchParams.ctrader === 'configure'
      ? 'cTrader connecté. Entre ta clé API Caldra pour activer le polling.'
      : null
  )

  async function handleActivate() {
    setActivating(true)
    setError(null)
    setSuccess(null)
    try {
      const res  = await fetch('/api/ctrader/activate', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ caldraApiKey }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Erreur activation')
      } else {
        setSuccess(`Polling activé — compte "${data.accountName}"`)
        setLocalStatus(s => ({ ...s, connected: true, polling: true, accountName: data.accountName, needsActivation: false }))
        setCaldraApiKey('')
      }
    } catch (e) {
      setError('Erreur réseau')
    } finally {
      setActivating(false)
    }
  }

  async function handleDisconnect() {
    setDisconnecting(true)
    setError(null)
    try {
      await fetch('/api/ctrader/disconnect', { method: 'POST' })
      setLocalStatus({ connected: false, polling: false, accountId: null, accountName: null, needsActivation: false, hasApiKey: false })
      setSuccess(null)
    } catch {
      setError('Erreur déconnexion')
    } finally {
      setDisconnecting(false)
    }
  }

  const oauthError = searchParams.ctrader === 'error'
    ? 'Erreur OAuth cTrader — réessaie.'
    : searchParams.ctrader === 'no_account'
    ? 'Aucun compte cTrader trouvé sur ce profil.'
    : searchParams.ctrader === 'no_api_key'
    ? 'Génère une clé API Caldra depuis Settings → API d\'abord.'
    : null

  return (
    <>
      <style>{`
        .ct-btn{font-family:'DM Sans',system-ui,sans-serif;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;cursor:pointer;border-radius:5px;padding:9px 18px;border:none;transition:all .2s}
        .ct-btn:disabled{opacity:.45;cursor:not-allowed}
        .ct-input{background:#0a0a16;border:0.5px solid ${BORDER};border-radius:5px;color:${TEXT};font-size:12px;font-family:'DM Sans',system-ui,sans-serif;padding:10px 14px;width:100%;box-sizing:border-box;outline:none;transition:border-color .2s}
        .ct-input:focus{border-color:rgba(220,80,60,.4)}
        .ct-input::placeholder{color:${MUTED}}
      `}</style>

      {/* Header page */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 3rem', height: 52,
        borderBottom: `0.5px solid rgba(255,255,255,.07)`,
        backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)',
        background: 'rgba(7,7,14,.92)',
        fontFamily: "'DM Sans', system-ui, sans-serif",
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
          <a href="/dashboard" style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', gap: 3, marginRight: '2rem' }}>
            <span style={{ fontWeight: 300, fontSize: 13, letterSpacing: 5, textTransform: 'uppercase', color: '#fff', lineHeight: 1 }}>
              Cald<span style={{ color: ACCENT }}>ra</span>
            </span>
            <span style={{ fontSize: 7, letterSpacing: 7, textTransform: 'uppercase', color: 'rgba(255,255,255,.3)', lineHeight: 1 }}>Session</span>
          </a>
          <div style={{ width: 0.5, height: 22, background: 'rgba(255,255,255,.08)', marginRight: '2rem' }} />
          <nav style={{ display: 'flex', alignItems: 'center', gap: '1.75rem' }}>
            {[
              { href: '/dashboard',              label: 'Dashboard' },
              { href: '/alerts',                 label: 'Alertes' },
              { href: '/analytics',              label: 'Analytics' },
              { href: '/settings/rules',         label: 'Règles' },
              { href: '/settings/api',           label: 'API' },
              { href: '/settings/integrations',  label: 'Intégrations' },
              { href: '/billing',                label: 'Billing' },
            ].map(item => (
              <a key={item.href} href={item.href} style={{
                fontSize: 9, fontWeight: 400, letterSpacing: 2, textTransform: 'uppercase',
                color: item.href === '/settings/integrations' ? '#fff' : 'rgba(232,230,224,.35)',
                textDecoration: 'none', padding: '5px 0',
                fontFamily: "'DM Sans',sans-serif",
              }}>
                {item.label}
              </a>
            ))}
          </nav>
        </div>
        <span style={{ fontSize: 11, color: 'rgba(232,230,224,.25)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {userEmail}
        </span>
      </div>

      <main style={{
        minHeight: '100vh', background: BG, paddingTop: 52,
        fontFamily: "'DM Sans', system-ui, sans-serif", color: TEXT,
      }}>
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '3rem 2rem' }}>

          {/* Page title */}
          <div style={{ marginBottom: '2.5rem' }}>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 300, letterSpacing: 2, textTransform: 'uppercase', color: TEXT }}>
              Intégrations
            </h1>
            <p style={{ margin: '0.5rem 0 0', fontSize: 12, color: MUTED, letterSpacing: 0.5 }}>
              Connecte tes plateformes de trading — les trades seront analysés automatiquement.
            </p>
          </div>

          {/* Banners */}
          {(oauthError || error) && (
            <div style={{
              background: 'rgba(220,80,60,.08)', border: `0.5px solid rgba(220,80,60,.3)`,
              borderRadius: 6, padding: '12px 16px', marginBottom: '1.5rem',
              fontSize: 12, color: '#f87171',
            }}>
              {oauthError ?? error}
            </div>
          )}
          {success && (
            <div style={{
              background: 'rgba(34,197,94,.07)', border: `0.5px solid rgba(34,197,94,.25)`,
              borderRadius: 6, padding: '12px 16px', marginBottom: '1.5rem',
              fontSize: 12, color: '#4ade80',
            }}>
              {success}
            </div>
          )}

          {/* cTrader card */}
          <div style={{
            background: CARD, border: `0.5px solid ${BORDER}`,
            borderRadius: 8, overflow: 'hidden',
          }}>
            {/* Card header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '18px 22px',
              borderBottom: `0.5px solid ${BORDER}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                {/* cTrader logo placeholder */}
                <div style={{
                  width: 38, height: 38, borderRadius: 8,
                  background: 'rgba(220,80,60,.1)', border: `0.5px solid rgba(220,80,60,.25)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, fontWeight: 700, color: ACCENT, letterSpacing: -1,
                }}>cT</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: TEXT, letterSpacing: 0.5 }}>cTrader</div>
                  <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>
                    IC Markets · Pepperstone · FxPro et plus
                  </div>
                </div>
              </div>

              {/* Status badge */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: localStatus.connected && localStatus.polling
                    ? '#22c55e'
                    : localStatus.connected
                    ? '#f59e0b'
                    : 'rgba(255,255,255,.15)',
                  boxShadow: localStatus.connected && localStatus.polling
                    ? '0 0 7px rgba(34,197,94,.5)'
                    : 'none',
                }} />
                <span style={{
                  fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase',
                  color: localStatus.connected && localStatus.polling
                    ? 'rgba(34,197,94,.7)'
                    : localStatus.connected
                    ? 'rgba(245,158,11,.7)'
                    : 'rgba(255,255,255,.2)',
                }}>
                  {localStatus.connected && localStatus.polling
                    ? 'Live'
                    : localStatus.connected
                    ? 'En attente'
                    : 'Déconnecté'}
                </span>
              </div>
            </div>

            {/* Card body */}
            <div style={{ padding: '22px' }}>
              {!localStatus.connected && !localStatus.needsActivation ? (
                /* État: pas connecté du tout */
                <div>
                  <p style={{ margin: '0 0 1.25rem', fontSize: 12, color: MUTED, lineHeight: 1.6 }}>
                    Autorise Caldra à lire tes trades fermés depuis ta plateforme cTrader via OAuth2.
                    Un polling toutes les 10 secondes détectera chaque nouveau trade et déclenchera
                    les alertes comportementales en temps réel.
                  </p>
                  <a href="/api/ctrader/connect">
                    <button className="ct-btn" style={{
                      background: ACCENT, color: '#fff',
                      boxShadow: '0 0 20px rgba(220,80,60,.25)',
                    }}>
                      Connecter cTrader →
                    </button>
                  </a>
                </div>
              ) : (localStatus.needsActivation || (localStatus.connected && !localStatus.polling)) ? (
                /* État: tokens reçus, en attente de la clé Caldra */
                <div>
                  <div style={{ marginBottom: '1.25rem' }}>
                    {localStatus.accountName && (
                      <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: 8,
                        background: 'rgba(34,197,94,.07)', border: '0.5px solid rgba(34,197,94,.2)',
                        borderRadius: 5, padding: '6px 12px', marginBottom: '1rem',
                        fontSize: 11, color: '#4ade80',
                      }}>
                        <span>✓</span>
                        <span>Compte OAuth vérifié : {localStatus.accountName}</span>
                      </div>
                    )}
                    <p style={{ margin: 0, fontSize: 12, color: MUTED, lineHeight: 1.6 }}>
                      Dernière étape — entre ta clé API Caldra (depuis{' '}
                      <a href="/settings/api" style={{ color: ACCENT, textDecoration: 'none' }}>Settings → API</a>)
                      pour activer le polling de tes trades.
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <input
                      className="ct-input"
                      type="password"
                      placeholder="cal_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                      value={caldraApiKey}
                      onChange={e => setCaldraApiKey(e.target.value)}
                      style={{ flex: 1 }}
                    />
                    <button
                      className="ct-btn"
                      onClick={handleActivate}
                      disabled={activating || !caldraApiKey.startsWith('cal_')}
                      style={{ background: ACCENT, color: '#fff', whiteSpace: 'nowrap' }}
                    >
                      {activating ? 'Activation…' : 'Activer →'}
                    </button>
                  </div>
                </div>
              ) : (
                /* État: connecté et polling actif */
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: 12, color: MUTED, marginBottom: 4 }}>Compte connecté</div>
                      <div style={{ fontSize: 14, color: TEXT, fontWeight: 500 }}>
                        {localStatus.accountName ?? localStatus.accountId}
                      </div>
                      <div style={{
                        marginTop: 8, fontSize: 10, color: 'rgba(34,197,94,.6)',
                        letterSpacing: 1, textTransform: 'uppercase',
                      }}>
                        ● Polling actif — vérif. toutes les 10s
                      </div>
                    </div>
                    <button
                      className="ct-btn"
                      onClick={handleDisconnect}
                      disabled={disconnecting}
                      style={{
                        background: 'transparent', color: MUTED,
                        border: `0.5px solid ${BORDER}`,
                      }}
                    >
                      {disconnecting ? 'Déconnexion…' : 'Déconnecter'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Card footer — flow description */}
            {!localStatus.connected && (
              <div style={{
                padding: '14px 22px',
                borderTop: `0.5px solid ${BORDER}`,
                display: 'flex', gap: '2rem',
              }}>
                {['OAuth2 sécurisé', 'Polling 10s', 'Alertes temps réel'].map((step, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{
                      width: 16, height: 16, borderRadius: '50%',
                      background: 'rgba(220,80,60,.1)', border: `0.5px solid rgba(220,80,60,.2)`,
                      fontSize: 8, color: ACCENT, display: 'flex', alignItems: 'center',
                      justifyContent: 'center', flexShrink: 0,
                    }}>{i + 1}</div>
                    <span style={{ fontSize: 10, color: MUTED, letterSpacing: 0.5 }}>{step}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Info note */}
          <div style={{
            marginTop: '1.5rem', padding: '12px 16px',
            background: 'rgba(255,255,255,.02)', border: `0.5px solid rgba(255,255,255,.05)`,
            borderRadius: 6, fontSize: 11, color: MUTED, lineHeight: 1.7,
          }}>
            <strong style={{ color: 'rgba(232,230,224,.5)', fontWeight: 500 }}>Comment ça marche</strong>
            <br />
            Une fois connecté, Caldra interroge l'API cTrader toutes les 10 secondes pour détecter les deals
            fermés (FULLY_FILLED). Chaque nouveau trade est analysé par le moteur comportemental et génère
            des alertes visibles dans ton <a href="/dashboard" style={{ color: ACCENT, textDecoration: 'none' }}>dashboard</a>.
          </div>

        </div>
      </main>
    </>
  )
}
