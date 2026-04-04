'use client'

import { useState } from 'react'
import AppHeader from '@/components/AppHeader'

interface ApiKeyClientProps {
  userEmail: string
  existingPrefix: string | null
  existingCreatedAt: string | null
}

const CODE_SNIPPET = (key: string) => `curl -X POST https://getcaldra.com/api/ingest \\
  -H "x-caldra-key: ${key}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "symbol": "ES",
    "direction": "long",
    "size": 2,
    "entry_price": 5210.50,
    "exit_price": 5198.25,
    "entry_time": "2026-03-31T09:45:00Z",
    "exit_time": "2026-03-31T10:12:00Z",
    "pnl": -24.50
  }'`

export default function ApiKeyClient({ userEmail, existingPrefix, existingCreatedAt }: ApiKeyClientProps) {
  const [prefix, setPrefix] = useState(existingPrefix)
  const [createdAt, setCreatedAt] = useState(existingCreatedAt)
  const [newKey, setNewKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)
  const [confirming, setConfirming] = useState(false)

  async function generateKey() {
    setLoading(true); setNewKey(null)
    const res = await fetch('/api/api-key', { method: 'POST' })
    const data = await res.json()
    setNewKey(data.key); setPrefix(data.key_prefix); setCreatedAt(new Date().toISOString())
    setLoading(false); setConfirming(false)
  }

  async function revokeKey() {
    setLoading(true)
    await fetch('/api/api-key', { method: 'DELETE' })
    setPrefix(null); setCreatedAt(null); setNewKey(null); setLoading(false)
  }

  async function copyKey() {
    if (!newKey) return
    await navigator.clipboard.writeText(newKey)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  const CARD: React.CSSProperties = {
    background: '#0d0d18',
    border: '0.5px solid rgba(255,255,255,.08)',
    borderRadius: 12,
    padding: '1.5rem 1.75rem',
    marginBottom: '1rem',
    position: 'relative',
    overflow: 'hidden',
  }

  return (
    <>
      <style>{`
        *{box-sizing:border-box}body{margin:0;background:#07070e}
        ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:rgba(255,255,255,.08);border-radius:3px}
        @keyframes apFadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        .ak-btn{font-size:9px;padding:7px 13px;background:transparent;border:0.5px solid rgba(255,255,255,.13);border-radius:4px;color:rgba(232,230,224,.45);cursor:pointer;letter-spacing:1.5px;text-transform:uppercase;font-family:'DM Sans',sans-serif;transition:all .2s}
        .ak-btn:hover{background:rgba(255,255,255,.05);color:rgba(232,230,224,.8)}
        .ak-btn:disabled{opacity:.4;cursor:not-allowed}
        .ak-btn-danger{border-color:rgba(220,80,60,.25)!important;color:rgba(220,80,60,.7)!important}
        .ak-btn-danger:hover{background:rgba(220,80,60,.08)!important;color:rgba(220,80,60,.9)!important}
        .ak-btn-primary{background:rgba(220,80,60,.85)!important;border-color:transparent!important;color:#fff!important}
        .ak-btn-primary:hover{background:rgba(220,80,60,.7)!important}
        .ak-copy{font-size:9px;padding:7px 13px;background:rgba(34,197,94,.1);border:0.5px solid rgba(34,197,94,.25);border-radius:4px;color:rgba(34,197,94,.85);cursor:pointer;letter-spacing:1.5px;text-transform:uppercase;font-family:'DM Sans',sans-serif;transition:all .2s;flex-shrink:0}
        .ak-copy:hover{background:rgba(34,197,94,.15)}
      `}</style>
      <div style={{ minHeight: '100vh', background: '#07070e', color: '#e8e6e0', fontFamily: "'DM Sans', system-ui, sans-serif", display: 'flex', flexDirection: 'column' }}>
        <AppHeader current="api" userEmail={userEmail} />

        <main style={{ maxWidth: 720, margin: '0 auto', padding: '5rem 3rem 4rem', width: '100%', animation: 'apFadeIn .4s ease both' }}>

          {/* Title */}
          <div style={{ marginBottom: '2rem' }}>
            <div style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(220,80,60,.55)', marginBottom: '.5rem' }}>Intégration</div>
            <h1 style={{ margin: 0, fontWeight: 200, fontSize: 'clamp(1.4rem,2.5vw,1.9rem)', letterSpacing: -1, color: '#fff', lineHeight: 1.1 }}>
              Clé API
            </h1>
            <p style={{ margin: '.5rem 0 0', color: 'rgba(232,230,224,.3)', fontSize: 13, fontWeight: 300 }}>
              Authentifie les appels vers{' '}
              <code style={{ background: 'rgba(255,255,255,.06)', padding: '1px 7px', borderRadius: 4, fontSize: 11, color: 'rgba(232,230,224,.6)', border: '0.5px solid rgba(255,255,255,.1)' }}>/api/ingest</code>
              {' '}depuis ta plateforme.
            </p>
          </div>

          {/* Clé active */}
          <div style={CARD}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg,transparent,rgba(255,255,255,.06),transparent)' }} />
            <div style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(232,230,224,.28)', marginBottom: '1.1rem' }}>Clé active</div>

            {prefix ? (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
                <div>
                  <code style={{ color: 'rgba(232,230,224,.6)', fontSize: 13, fontFamily: 'monospace', letterSpacing: '.04em' }}>
                    {prefix}<span style={{ opacity: .4 }}>{'•'.repeat(22)}</span>
                  </code>
                  <div style={{ marginTop: 5, color: 'rgba(232,230,224,.25)', fontSize: 11 }}>
                    Créée le {new Date(createdAt!).toLocaleDateString('fr-FR')}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {confirming ? (
                    <>
                      <button className="ak-btn" onClick={() => setConfirming(false)}>Annuler</button>
                      <button className="ak-btn ak-btn-danger" onClick={generateKey} disabled={loading}>
                        Confirmer la regénération
                      </button>
                    </>
                  ) : (
                    <>
                      <button className="ak-btn" onClick={revokeKey} disabled={loading}>Révoquer</button>
                      <button className="ak-btn" onClick={() => setConfirming(true)}>Regénérer</button>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'rgba(232,230,224,.3)', fontSize: 13 }}>Aucune clé active</span>
                <button className="ak-btn ak-btn-primary" onClick={generateKey} disabled={loading}>
                  {loading ? 'Génération…' : 'Générer une clé'}
                </button>
              </div>
            )}
          </div>

          {/* Nouvelle clé — affichage unique */}
          {newKey && (
            <div style={{
              background: 'rgba(34,197,94,.05)',
              border: '0.5px solid rgba(34,197,94,.2)',
              borderRadius: 12, padding: '1.25rem 1.5rem', marginBottom: '1rem',
            }}>
              <div style={{ color: 'rgba(34,197,94,.8)', fontSize: 11, letterSpacing: .5, marginBottom: '.75rem' }}>
                ⚠ Copiez cette clé maintenant — elle ne sera plus visible.
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <code style={{ flex: 1, color: 'rgba(134,239,172,.85)', fontSize: 12, fontFamily: 'monospace', wordBreak: 'break-all', background: 'rgba(34,197,94,.04)', padding: '8px 12px', borderRadius: 6, border: '0.5px solid rgba(34,197,94,.15)' }}>
                  {newKey}
                </code>
                <button className="ak-copy" onClick={copyKey}>
                  {copied ? '✓ Copié' : 'Copier'}
                </button>
              </div>
            </div>
          )}

          {/* Auth header */}
          <div style={CARD}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg,transparent,rgba(255,255,255,.06),transparent)' }} />
            <div style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(232,230,224,.28)', marginBottom: '.9rem' }}>Header d'authentification</div>
            <code style={{ color: 'rgba(232,230,224,.5)', fontSize: 12, fontFamily: 'monospace' }}>
              x-caldra-key: <span style={{ color: 'rgba(147,197,253,.75)' }}>{prefix ? `${prefix}••••` : 'cal_votre_clé'}</span>
            </code>
          </div>

          {/* Code example */}
          <div style={CARD}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg,transparent,rgba(255,255,255,.06),transparent)' }} />
            <div style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(232,230,224,.28)', marginBottom: '.9rem' }}>Exemple d'intégration</div>
            <pre style={{ margin: 0, color: 'rgba(232,230,224,.4)', fontSize: 11, fontFamily: 'monospace', lineHeight: 1.75, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
              <code>{CODE_SNIPPET(prefix ? `${prefix}••••` : 'cal_votre_clé')}</code>
            </pre>
            <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '0.5px solid rgba(255,255,255,.06)', color: 'rgba(232,230,224,.28)', fontSize: 11 }}>
              Champs requis :{' '}
              <code style={{ color: 'rgba(232,230,224,.4)', fontSize: 11 }}>symbol, direction, size, entry_price, entry_time</code>
            </div>
          </div>
        </main>
      </div>
    </>
  )
}
