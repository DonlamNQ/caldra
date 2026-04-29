'use client'

import { useState } from 'react'
import AppHeader from '@/components/AppHeader'

interface ApiKeyClientProps { userEmail: string; existingPrefix: string|null; existingCreatedAt: string|null }

const SNIPPET = (k: string) => `curl -X POST https://getcaldra.com/api/ingest \\
  -H "x-caldra-key: ${k}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "symbol": "ES",
    "direction": "long",
    "size": 2,
    "entry_price": 5210.50,
    "exit_price": 5198.25,
    "entry_time": "2026-04-05T09:45:00Z",
    "exit_time": "2026-04-05T10:12:00Z",
    "pnl": -24.50
  }'`

export default function ApiKeyClient({ userEmail, existingPrefix, existingCreatedAt }: ApiKeyClientProps) {
  const [prefix, setPrefix] = useState(existingPrefix)
  const [createdAt, setCreatedAt] = useState(existingCreatedAt)
  const [newKey, setNewKey] = useState<string|null>(null)
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)
  const [confirming, setConfirming] = useState(false)

  async function gen() {
    setLoading(true); setNewKey(null)
    const d = await fetch('/api/api-key', { method: 'POST' }).then(r => r.json())
    setNewKey(d.key); setPrefix(d.key_prefix); setCreatedAt(new Date().toISOString()); setLoading(false); setConfirming(false)
  }

  async function revoke() {
    setLoading(true); await fetch('/api/api-key', { method: 'DELETE' })
    setPrefix(null); setCreatedAt(null); setNewKey(null); setLoading(false)
  }

  async function copy() {
    if (!newKey) return; await navigator.clipboard.writeText(newKey); setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  const CARD: React.CSSProperties = { background: '#0f0f17', border: '0.5px solid rgba(255,255,255,.065)', borderRadius: 10, padding: '1.4rem 1.6rem', marginBottom: '1rem', position: 'relative', overflow: 'hidden' }

  return (
    <>
      <style>{`
        @keyframes apFadeIn{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}
        .ak-btn{font-size:9px;padding:6px 12px;background:transparent;border:0.5px solid rgba(255,255,255,.1);border-radius:5px;color:rgba(226,224,218,.4);cursor:pointer;letter-spacing:1.5px;text-transform:uppercase;font-family:'DM Sans',sans-serif;transition:all .15s}
        .ak-btn:hover{background:rgba(255,255,255,.04);color:rgba(226,224,218,.7)}
        .ak-btn:disabled{opacity:.35;cursor:not-allowed}
        .ak-danger{border-color:rgba(244,63,94,.22)!important;color:rgba(244,63,94,.65)!important}
        .ak-danger:hover{background:rgba(244,63,94,.07)!important;color:rgba(244,63,94,.85)!important}
        .ak-primary{background:rgba(220,80,60,.85)!important;border-color:transparent!important;color:#fff!important}
        .ak-primary:hover{background:rgba(220,80,60,.7)!important}
        .ak-copy{font-size:9px;padding:6px 12px;background:rgba(16,185,129,.09);border:0.5px solid rgba(16,185,129,.22);border-radius:5px;color:rgba(16,185,129,.8);cursor:pointer;letter-spacing:1.5px;text-transform:uppercase;font-family:'DM Sans',sans-serif;transition:all .15s;flex-shrink:0}
        .ak-copy:hover{background:rgba(16,185,129,.14)}
      `}</style>
      <AppHeader current="api" userEmail={userEmail} />
      <div style={{ background: '#08080d', minHeight: '100vh', paddingTop: 52, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
        <main style={{ padding: '2rem', maxWidth: 740, animation: 'apFadeIn .4s ease both' }}>

          <div style={{ marginBottom: '1.75rem' }}>
            <div style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(220,80,60,.55)', marginBottom: '.4rem', fontFamily: "'DM Sans',sans-serif" }}>Intégration</div>
            <h1 style={{ margin: 0, fontWeight: 400, fontSize: '1.6rem', letterSpacing: -.5, color: '#fff', fontFamily: "'DM Sans',sans-serif", marginBottom: '.4rem' }}>Clé API</h1>
            <p style={{ margin: 0, color: 'rgba(226,224,218,.3)', fontSize: 13, fontFamily: "'DM Sans',sans-serif" }}>
              Authentifie les appels vers{' '}
              <code style={{ background: 'rgba(255,255,255,.06)', padding: '1px 7px', borderRadius: 4, fontSize: 11, color: 'rgba(226,224,218,.55)', fontFamily: "var(--font-geist-mono),monospace", border: '0.5px solid rgba(255,255,255,.09)' }}>/api/ingest</code>
              {' '}depuis ta plateforme.
            </p>
          </div>

          {/* Clé active */}
          <div style={CARD}>
            <div style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(226,224,218,.28)', marginBottom: '1rem', fontFamily: "'DM Sans',sans-serif" }}>Clé active</div>
            {prefix ? (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
                <div>
                  <code style={{ color: 'rgba(226,224,218,.55)', fontSize: 12.5, fontFamily: "var(--font-geist-mono),monospace", letterSpacing: '.04em' }}>
                    {prefix}<span style={{ opacity: .3 }}>{'•'.repeat(20)}</span>
                  </code>
                  <div style={{ marginTop: 5, color: 'rgba(226,224,218,.22)', fontSize: 11, fontFamily: "'DM Sans',sans-serif" }}>Créée le {new Date(createdAt!).toLocaleDateString('fr-FR')}</div>
                </div>
                <div style={{ display: 'flex', gap: 7 }}>
                  {confirming ? (
                    <>
                      <button className="ak-btn" onClick={() => setConfirming(false)}>Annuler</button>
                      <button className="ak-btn ak-danger" onClick={gen} disabled={loading}>Confirmer</button>
                    </>
                  ) : (
                    <>
                      <button className="ak-btn" onClick={revoke} disabled={loading}>Révoquer</button>
                      <button className="ak-btn" onClick={() => setConfirming(true)}>Regénérer</button>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'rgba(226,224,218,.28)', fontSize: 13, fontFamily: "'DM Sans',sans-serif" }}>Aucune clé active</span>
                <button className="ak-btn ak-primary" onClick={gen} disabled={loading}>{loading ? 'Génération…' : 'Générer une clé'}</button>
              </div>
            )}
          </div>

          {/* Nouvelle clé */}
          {newKey && (
            <div style={{ background: 'rgba(16,185,129,.05)', border: '0.5px solid rgba(16,185,129,.18)', borderRadius: 10, padding: '1.1rem 1.4rem', marginBottom: '1rem' }}>
              <div style={{ color: 'rgba(16,185,129,.75)', fontSize: 11, marginBottom: '.75rem', fontFamily: "'DM Sans',sans-serif", letterSpacing: .3 }}>⚠ Copiez maintenant — ne sera plus visible.</div>
              <div style={{ display: 'flex', gap: 9, alignItems: 'center' }}>
                <code style={{ flex: 1, color: 'rgba(134,239,172,.8)', fontSize: 11.5, fontFamily: "var(--font-geist-mono),monospace", wordBreak: 'break-all', background: 'rgba(16,185,129,.04)', padding: '8px 12px', borderRadius: 6, border: '0.5px solid rgba(16,185,129,.14)' }}>
                  {newKey}
                </code>
                <button className="ak-copy" onClick={copy}>{copied ? '✓ Copié' : 'Copier'}</button>
              </div>
            </div>
          )}

          {/* Auth header */}
          <div style={CARD}>
            <div style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(226,224,218,.28)', marginBottom: '.9rem', fontFamily: "'DM Sans',sans-serif" }}>Header d'authentification</div>
            <code style={{ color: 'rgba(226,224,218,.45)', fontSize: 12, fontFamily: "var(--font-geist-mono),monospace" }}>
              x-caldra-key: <span style={{ color: 'rgba(56,189,248,.65)' }}>{prefix ? `${prefix}••••` : 'cal_votre_clé'}</span>
            </code>
          </div>

          {/* Code example */}
          <div style={CARD}>
            <div style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(226,224,218,.28)', marginBottom: '.9rem', fontFamily: "'DM Sans',sans-serif" }}>Exemple d'intégration</div>
            <pre style={{ margin: 0, color: 'rgba(226,224,218,.38)', fontSize: 11, fontFamily: "var(--font-geist-mono),monospace", lineHeight: 1.8, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
              {SNIPPET(prefix ? `${prefix}••••` : 'cal_votre_clé')}
            </pre>
            <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '0.5px solid rgba(255,255,255,.06)', color: 'rgba(226,224,218,.25)', fontSize: 11, fontFamily: "'DM Sans',sans-serif" }}>
              Requis : <code style={{ color: 'rgba(226,224,218,.38)', fontFamily: "var(--font-geist-mono),monospace" }}>symbol, direction, size, entry_price, entry_time</code>
            </div>
          </div>
        </main>
      </div>
    </>
  )
}
