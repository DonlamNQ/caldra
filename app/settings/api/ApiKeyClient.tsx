'use client'

import { useState } from 'react'
import AppHeader from '@/components/AppHeader'

interface ApiKeyClientProps {
  userEmail: string
  existingPrefix: string | null
  existingCreatedAt: string | null
}

const CODE_SNIPPET = (key: string) => `curl -X POST https://your-app.vercel.app/api/ingest \\
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
    setLoading(true)
    setNewKey(null)
    const res = await fetch('/api/api-key', { method: 'POST' })
    const data = await res.json()
    setNewKey(data.key)
    setPrefix(data.key_prefix)
    setCreatedAt(new Date().toISOString())
    setLoading(false)
    setConfirming(false)
  }

  async function revokeKey() {
    setLoading(true)
    await fetch('/api/api-key', { method: 'DELETE' })
    setPrefix(null)
    setCreatedAt(null)
    setNewKey(null)
    setLoading(false)
  }

  async function copyKey() {
    if (!newKey) return
    await navigator.clipboard.writeText(newKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#08080d', color: '#e2e8f0', fontFamily: 'system-ui, sans-serif', display: 'flex', flexDirection: 'column' }}>
      <AppHeader current="api" userEmail={userEmail} />

      <main style={{ maxWidth: 680, margin: '0 auto', padding: '32px 24px', width: '100%' }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Clé API</h1>
          <p style={{ margin: '6px 0 0', color: '#475569', fontSize: 14 }}>
            Authentifie les appels vers <code style={{ background: '#13132a', padding: '1px 6px', borderRadius: 4, fontSize: 12 }}>/api/ingest</code> depuis ta plateforme de trading.
          </p>
        </div>

        {/* Clé courante */}
        <div style={{ background: '#0d0d1a', border: '1px solid #1e1e35', borderRadius: 12, padding: '20px 24px', marginBottom: 16 }}>
          <p style={{ margin: '0 0 14px', fontSize: 11, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Clé active
          </p>

          {prefix ? (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
              <div>
                <code style={{ color: '#94a3b8', fontSize: 14, fontFamily: 'monospace', letterSpacing: '0.03em' }}>
                  {prefix}••••••••••••••••••••••
                </code>
                <p style={{ margin: '4px 0 0', color: '#374151', fontSize: 12 }}>
                  Créée le {new Date(createdAt!).toLocaleDateString('fr-FR')}
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {confirming ? (
                  <>
                    <button onClick={() => setConfirming(false)} style={{ background: 'none', border: '1px solid #1e1e35', borderRadius: 6, color: '#64748b', fontSize: 12, padding: '6px 12px', cursor: 'pointer' }}>
                      Annuler
                    </button>
                    <button onClick={generateKey} disabled={loading} style={{ background: '#1a0505', border: '1px solid #4d1010', borderRadius: 6, color: '#ef4444', fontSize: 12, padding: '6px 12px', cursor: 'pointer', fontWeight: 600 }}>
                      Confirmer la regénération
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={revokeKey} disabled={loading} style={{ background: 'none', border: '1px solid #1e1e35', borderRadius: 6, color: '#475569', fontSize: 12, padding: '6px 12px', cursor: 'pointer' }}>
                      Révoquer
                    </button>
                    <button onClick={() => setConfirming(true)} style={{ background: '#0d0d1a', border: '1px solid #1e1e35', borderRadius: 6, color: '#94a3b8', fontSize: 12, padding: '6px 12px', cursor: 'pointer' }}>
                      Regénérer
                    </button>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={{ margin: 0, color: '#374151', fontSize: 14 }}>Aucune clé active</p>
              <button
                onClick={generateKey}
                disabled={loading}
                style={{ background: '#e2e8f0', color: '#08080d', border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
              >
                {loading ? 'Génération…' : 'Générer une clé'}
              </button>
            </div>
          )}
        </div>

        {/* Clé générée — affichage une seule fois */}
        {newKey && (
          <div style={{ background: '#052e16', border: '1px solid #166534', borderRadius: 12, padding: '16px 20px', marginBottom: 16 }}>
            <p style={{ margin: '0 0 8px', color: '#4ade80', fontSize: 12, fontWeight: 600 }}>
              ⚠ Copiez cette clé maintenant — elle ne sera plus visible.
            </p>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <code style={{ flex: 1, color: '#86efac', fontSize: 13, fontFamily: 'monospace', wordBreak: 'break-all', background: '#041f0e', padding: '8px 12px', borderRadius: 6, border: '1px solid #166534' }}>
                {newKey}
              </code>
              <button
                onClick={copyKey}
                style={{ background: '#166534', border: 'none', borderRadius: 6, color: '#4ade80', fontSize: 12, fontWeight: 600, padding: '8px 14px', cursor: 'pointer', flexShrink: 0 }}
              >
                {copied ? '✓ Copié' : 'Copier'}
              </button>
            </div>
          </div>
        )}

        {/* Header requis */}
        <div style={{ background: '#0d0d1a', border: '1px solid #1e1e35', borderRadius: 12, padding: '20px 24px', marginBottom: 16 }}>
          <p style={{ margin: '0 0 12px', fontSize: 11, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Header d'authentification
          </p>
          <code style={{ color: '#94a3b8', fontSize: 13, fontFamily: 'monospace' }}>
            x-caldra-key: <span style={{ color: '#60a5fa' }}>{prefix ? `${prefix}••••` : 'cal_votre_clé'}</span>
          </code>
        </div>

        {/* Code example */}
        <div style={{ background: '#0d0d1a', border: '1px solid #1e1e35', borderRadius: 12, padding: '20px 24px' }}>
          <p style={{ margin: '0 0 12px', fontSize: 11, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Exemple d'intégration
          </p>
          <pre style={{ margin: 0, color: '#64748b', fontSize: 12, fontFamily: 'monospace', lineHeight: 1.7, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
            <code>{CODE_SNIPPET(prefix ? `${prefix}••••` : 'cal_votre_clé')}</code>
          </pre>
          <p style={{ margin: '14px 0 0', color: '#374151', fontSize: 12 }}>
            Champs requis : <code style={{ color: '#475569' }}>symbol, direction, size, entry_price, entry_time</code>
          </p>
        </div>
      </main>
    </div>
  )
}
