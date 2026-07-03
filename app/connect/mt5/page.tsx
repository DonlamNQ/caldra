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

export default function ConnectMt5() {
  const router = useRouter()
  const [login, setLogin] = useState('')
  const [server, setServer] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function submit() {
    setErr(null)
    const l = login.trim(), s = server.trim(), p = password.trim()
    if (!l || !s || !p) { setErr('Remplis les trois champs.'); return }
    if (!/^[0-9]{3,20}$/.test(l)) { setErr('Le numéro de compte ne contient que des chiffres (ex. 25584260).'); return }
    if (s.includes('@')) { setErr('Le champ « Serveur » attend le nom du serveur MT5 (ex. XMGlobal-MT5 15), pas ton adresse email.'); return }
    setSaving(true)
    try {
      const r = await fetch('/api/mt5/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login: l, server: s, password: p }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) { setErr(j.error || 'Échec de la connexion'); setSaving(false); return }
      router.push('/dashboard?mt5=connected')
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
      <div style={{ width: '100%', maxWidth: 440 }}>
        <a href="/dashboard" style={{ fontSize: 12, color: C.t3, textDecoration: 'none', fontFamily: SANS }}>← Retour au dashboard</a>

        <div style={{ background: C.card, border: `.5px solid ${C.b}`, borderRadius: 16, padding: '28px 26px', marginTop: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
            <div style={{ width: 40, height: 40, borderRadius: 9, background: C.va, border: `.5px solid ${C.vb}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, color: C.v, fontFamily: SANS }}>MT5</div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 600 }}>Connecter MetaTrader 5</div>
              <div style={{ fontSize: 12, color: C.t2 }}>Tes trades remontent automatiquement, sans EA.</div>
            </div>
          </div>

          <div style={{ height: 18 }} />

          <div style={{ marginBottom: 16 }}>
            <label style={label}>Numéro de compte</label>
            <input value={login} onChange={e => setLogin(e.target.value)} placeholder="ex. 25584260" style={input} inputMode="numeric" />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={label}>Serveur</label>
            <input value={server} onChange={e => setServer(e.target.value)} placeholder="ex. XMGlobal-MT5 15" style={input} />
            <div style={{ fontSize: 11, color: C.t3, marginTop: 6, lineHeight: 1.5 }}>Le nom exact affiché dans ton MT5 (en bas à droite, ou Fichier → Se connecter à un compte). Au chiffre près. Ce n&apos;est pas ton email.</div>
          </div>
          <div style={{ marginBottom: 18 }}>
            <label style={label}>Mot de passe</label>
            <div style={{ position: 'relative' }}>
              <input value={password} onChange={e => setPassword(e.target.value)} type={showPw ? 'text' : 'password'} placeholder="••••••••" style={{ ...input, paddingRight: 66 }} />
              <button type="button" onClick={() => setShowPw(v => !v)} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: C.t2, fontSize: 11, fontFamily: SANS, cursor: 'pointer', padding: '4px 6px' }}>{showPw ? 'Masquer' : 'Afficher'}</button>
            </div>
            <div style={{ fontSize: 11, color: C.t3, marginTop: 6, lineHeight: 1.5 }}>De préférence ton mot de passe <span style={{ color: C.t2, fontWeight: 500 }}>investisseur</span> (lecture seule) — celui de <span style={{ color: C.t2, fontWeight: 500 }}>ce</span> compte précis. Clique « Afficher » pour vérifier ta saisie.</div>
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
            Ton mot de passe est chiffré et stocké de façon sécurisée. Tu peux te déconnecter à tout moment.
          </div>
        </div>
      </div>
    </div>
  )
}
