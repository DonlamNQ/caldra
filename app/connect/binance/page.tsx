'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const C = {
  bg: '#08080d', card: '#0d0d18', b: 'rgba(255,255,255,.08)', b2: 'rgba(255,255,255,.14)',
  tx: '#f4f2fb', t2: 'rgba(244,242,251,.6)', t3: 'rgba(244,242,251,.32)',
  v: '#8b5cf6', vd: '#6d28d9', va: 'rgba(139,92,246,.1)', vb: 'rgba(139,92,246,.3)',
  red: '#e0503c', sf: '#12121f',
}
const SANS = "var(--font-geist-sans), 'Geist', sans-serif"

const STEPS = [
  "Sur Binance : profil → « Gestion des API » → Créer une API (valide avec ta 2FA).",
  "IMPORTANT : garde UNIQUEMENT « Autoriser la lecture » coché. Décoche trading, marge et retraits.",
  "Copie la clé API et la clé secrète (le secret ne s'affiche qu'une seule fois).",
  "Colle les deux ci-dessous. Rien n'est jamais tradé : Caldra lit seulement.",
]

export default function ConnectBinance() {
  const router = useRouter()
  const [apiKey, setApiKey] = useState('')
  const [apiSecret, setApiSecret] = useState('')
  const [symbols, setSymbols] = useState('')
  const [showSecret, setShowSecret] = useState(false)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function submit() {
    setErr(null)
    const k = apiKey.trim(), s = apiSecret.trim()
    if (!k || !s) { setErr('Renseigne la clé API et le secret.'); return }
    setSaving(true)
    try {
      const r = await fetch('/api/binance/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: k, apiSecret: s, symbols: symbols.trim() }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) { setErr(j.error || 'Échec de la connexion'); setSaving(false); return }
      router.push('/dashboard?binance=connected')
    } catch {
      setErr('Erreur réseau, réessaie.')
      setSaving(false)
    }
  }

  const input: React.CSSProperties = {
    width: '100%', padding: '12px 14px', borderRadius: 8, fontSize: 14, fontFamily: SANS,
    background: C.sf, border: `.5px solid ${C.b}`, color: C.tx, boxSizing: 'border-box', outline: 'none',
  }
  const label: React.CSSProperties = {
    fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: C.t3, fontFamily: SANS, marginBottom: 6, display: 'block',
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.tx, fontFamily: 'system-ui, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 460 }}>
        <a href="/dashboard" style={{ fontSize: 12, color: C.t3, textDecoration: 'none', fontFamily: SANS }}>← Retour au dashboard</a>

        <div style={{ background: C.card, border: `.5px solid ${C.b}`, borderRadius: 16, padding: '28px 26px', marginTop: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
            <div style={{ width: 40, height: 40, borderRadius: 9, background: C.va, border: `.5px solid ${C.vb}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 600, color: C.v, fontFamily: SANS }}>BNB</div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 600 }}>Connecter Binance</div>
              <div style={{ fontSize: 12, color: C.t2 }}>Clé API en lecture seule. Aucun ordre passé, jamais.</div>
            </div>
          </div>

          {/* Mini-guide */}
          <div style={{ background: C.va, border: `.5px solid ${C.vb}`, borderRadius: 10, padding: '12px 14px', margin: '16px 0 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {STEPS.map((s, i) => (
              <div key={i} style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}>
                <div style={{ width: 17, height: 17, borderRadius: '50%', background: C.vb, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#fff', flexShrink: 0, marginTop: 1 }}>{i + 1}</div>
                <div style={{ fontSize: 11.5, color: C.t2, lineHeight: 1.5 }}>{s}</div>
              </div>
            ))}
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={label}>Clé API</label>
            <input value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="collée depuis Binance" style={input} autoComplete="off" spellCheck={false} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={label}>Clé secrète</label>
            <div style={{ position: 'relative' }}>
              <input value={apiSecret} onChange={e => setApiSecret(e.target.value)} type={showSecret ? 'text' : 'password'} placeholder="••••••••" style={{ ...input, paddingRight: 66 }} autoComplete="off" spellCheck={false} />
              <button type="button" onClick={() => setShowSecret(v => !v)} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: C.t2, fontSize: 11, fontFamily: SANS, cursor: 'pointer', padding: '4px 6px' }}>{showSecret ? 'Masquer' : 'Afficher'}</button>
            </div>
          </div>
          <div style={{ marginBottom: 18 }}>
            <label style={label}>Paires suivies <span style={{ textTransform: 'none', letterSpacing: 0, color: C.t3 }}>(optionnel)</span></label>
            <input value={symbols} onChange={e => setSymbols(e.target.value)} placeholder="ex. BTCUSDT,ETHUSDT" style={input} autoComplete="off" spellCheck={false} />
            <div style={{ fontSize: 11, color: C.t3, marginTop: 6, lineHeight: 1.5 }}>Laisse vide pour une détection automatique à partir de tes soldes. Renseigne tes paires pour un suivi plus précis.</div>
          </div>

          {err && <div style={{ fontSize: 12.5, color: C.red, marginBottom: 14, lineHeight: 1.5 }}>{err}</div>}

          <button
            onClick={submit}
            disabled={saving}
            style={{ width: '100%', padding: 14, borderRadius: 9, border: 'none', fontSize: 14, fontWeight: 600, fontFamily: 'system-ui, sans-serif', cursor: saving ? 'not-allowed' : 'pointer', color: '#fff', background: `linear-gradient(135deg, ${C.v}, ${C.vd})`, boxShadow: '0 6px 22px rgba(139,92,246,.32)', opacity: saving ? .6 : 1, transition: 'all .2s' }}
          >
            {saving ? 'Connexion…' : 'Connecter mon compte →'}
          </button>

          <div style={{ fontSize: 11, color: C.t3, textAlign: 'center', marginTop: 14, lineHeight: 1.5 }}>
            Clé et secret sont chiffrés (AES-256-GCM) et révocables depuis Binance à tout moment. Ne coche jamais les droits de trading ou de retrait.
          </div>
        </div>
      </div>
    </div>
  )
}
