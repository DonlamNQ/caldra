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
  "Dans IBKR (Gestion du compte) → Paramètres → « Flex Web Service » : active-le.",
  "Crée une requête Flex de type « Trade Confirmation Flex » (inclus : exécutions/trades).",
  "Note l'ID de cette requête (Query ID), puis génère un Token Flex.",
  "Colle le Token et l'ID de requête ci-dessous.",
]

export default function ConnectIbkr() {
  const router = useRouter()
  const [token, setToken] = useState('')
  const [queryId, setQueryId] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function submit() {
    setErr(null)
    if (!token || !queryId) { setErr('Renseigne le token et l\'ID de requête.'); return }
    setSaving(true)
    try {
      const r = await fetch('/api/ibkr/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token.trim(), queryId: queryId.trim() }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) { setErr(j.error || 'Échec de la connexion'); setSaving(false); return }
      router.push('/dashboard?ibkr=connected')
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
            <div style={{ width: 40, height: 40, borderRadius: 9, background: C.va, border: `.5px solid ${C.vb}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, color: C.v, fontFamily: SANS }}>IBKR</div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 600 }}>Connecter Interactive Brokers</div>
              <div style={{ fontSize: 12, color: C.t2 }}>Via le Flex Web Service. Gratuit, aucun logiciel à installer.</div>
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
            <label style={label}>Token Flex</label>
            <input value={token} onChange={e => setToken(e.target.value)} placeholder="ex. 123456789012345678" style={input} inputMode="numeric" />
          </div>
          <div style={{ marginBottom: 18 }}>
            <label style={label}>ID de requête (Query ID)</label>
            <input value={queryId} onChange={e => setQueryId(e.target.value)} placeholder="ex. 987654" style={input} inputMode="numeric" />
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
            Le token est en lecture seule, chiffré, et révocable depuis IBKR à tout moment.
          </div>
        </div>
      </div>
    </div>
  )
}
