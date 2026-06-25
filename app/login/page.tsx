'use client'

import { useState } from 'react'
import { loginAction } from './actions'

const BG   = '#0c0c15'
const SF   = '#12121c'
const B    = 'rgba(255,255,255,.055)'
const B2   = 'rgba(255,255,255,.10)'
const TX   = '#eae8f5'
const TD   = 'rgba(234,232,245,.65)'
const TE   = 'rgba(234,232,245,.35)'
const RED  = '#7c3aed'
const RD   = 'rgba(124,58,237,.09)'
const RB   = 'rgba(124,58,237,.25)'
const G    = '#00d17a'
const SANS = "var(--font-geist-sans), 'Geist', sans-serif"
const MONO = "var(--font-geist-mono), 'Geist Mono', monospace"

const FEATURES = [
  { icon: '◈', title: '6 patterns comportementaux', desc: 'Revenge sizing, drawdown, re-entrées, overtrading…' },
  { icon: '◉', title: 'Score de session en temps réel', desc: 'Ton état mental traduit en données exploitables.' },
  { icon: '◆', title: 'Alertes en temps réel', desc: 'Notifié dès qu\'un schéma à risque se déclenche, à l\'ouverture comme à la clôture.' },
]

export default function LoginPage() {
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const fd = new FormData(e.currentTarget)
    const result = await loginAction(fd)
    if (result && 'error' in result) {
      setError(result.error)
      setLoading(false)
    }
  }

  return (
    <>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        html,body{height:100%;background:${BG}}
        .lg-inp{background:rgba(255,255,255,.035);border:.5px solid ${B2};border-radius:8px;padding:13px 15px;color:${TX};font-size:13.5px;font-family:${SANS};width:100%;outline:none;transition:border-color .2s,background .2s}
        .lg-inp::placeholder{color:${TE}}
        .lg-inp:focus{border-color:${RB}!important;background:rgba(124,58,237,.04)!important}
        .lg-btn{background:${RED};color:#fff;border:none;border-radius:8px;padding:14px;font-size:14px;font-weight:600;cursor:pointer;width:100%;font-family:${SANS};transition:opacity .18s;letter-spacing:.2px}
        .lg-btn:hover{opacity:.88}
        .lg-btn:disabled{opacity:.5;cursor:not-allowed}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.2}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
        .lg-right{animation:fadeUp .38s ease}
        @media(max-width:800px){.lg-left{display:none!important}.lg-right{padding:32px 24px!important}}
      `}</style>

      <div style={{ minHeight: '100vh', background: BG, display: 'flex', fontFamily: SANS, color: TX, position: 'relative', overflow: 'hidden' }}>

        {/* Grid background */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: `linear-gradient(${B} 1px,transparent 1px),linear-gradient(90deg,${B} 1px,transparent 1px)`, backgroundSize: '52px 52px', opacity: .28, pointerEvents: 'none' }} />
        {/* Ambient glow */}
        <div style={{ position: 'absolute', top: '10%', left: '25%', width: 800, height: 800, borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,.055) 0%, transparent 60%)', pointerEvents: 'none' }} />

        {/* ── Left panel ── */}
        <div className="lg-left" style={{ flex: '0 0 54%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '64px 72px', position: 'relative', borderRight: `.5px solid ${B}` }}>

          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 52 }}>
            <div style={{ width: 2.5, height: 40, background: `linear-gradient(180deg, ${RED}, ${RED}20)`, borderRadius: 2 }} />
            <div>
              <div style={{ fontSize: 21, fontWeight: 500, letterSpacing: 8, textTransform: 'uppercase' as const, color: TX }}>Cald<span style={{ color: RED }}>ra</span></div>
              <div style={{ fontSize: 8.5, letterSpacing: 3.5, textTransform: 'uppercase' as const, color: TE, marginTop: 4, fontFamily: MONO }}>Session Monitor</div>
            </div>
          </div>

          {/* Headline */}
          <div style={{ marginBottom: 48 }}>
            <h1 style={{ fontSize: 44, fontWeight: 200, letterSpacing: -1.8, lineHeight: 1.1, color: TX, marginBottom: 18 }}>
              Tu ne vois pas<br />quand tu dérailles.<br /><span style={{ color: RED }}>Lui si.</span>
            </h1>
            <p style={{ fontSize: 15, color: TD, lineHeight: 1.65, fontWeight: 300, maxWidth: 400 }}>
              Caldra analyse chaque trade en temps réel et détecte les comportements qui détruisent ta performance avant qu'ils s'installent.
            </p>
          </div>

          {/* Features */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 48 }}>
            {FEATURES.map(f => (
              <div key={f.title} style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: RD, border: `.5px solid ${RB}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: RED, fontSize: 12, flexShrink: 0, fontFamily: MONO }}>
                  {f.icon}
                </div>
                <div>
                  <div style={{ fontSize: 13.5, color: TX, fontWeight: 500, marginBottom: 2 }}>{f.title}</div>
                  <div style={{ fontSize: 12, color: TE, lineHeight: 1.5 }}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Mini live preview */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 14, background: SF, border: `.5px solid ${B}`, borderRadius: 12, padding: '12px 18px', alignSelf: 'flex-start', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: .5, background: `linear-gradient(90deg,transparent,${G}60,transparent)` }} />
            <div style={{ position: 'relative', width: 42, height: 42, flexShrink: 0 }}>
              <svg width="42" height="42" viewBox="0 0 42 42" style={{ transform: 'rotate(-90deg)', filter: `drop-shadow(0 0 8px ${G}55)` }}>
                <circle cx="21" cy="21" r="17" fill="none" stroke="rgba(255,255,255,.06)" strokeWidth="3.5" />
                <circle cx="21" cy="21" r="17" fill="none" stroke={G} strokeWidth="3.5" strokeDasharray="107" strokeDashoffset="24" strokeLinecap="round" style={{ transition: 'stroke-dashoffset .6s' }} />
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, color: G, fontFamily: MONO }}>78</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: TX, fontWeight: 500, marginBottom: 3 }}>Score de session</div>
              <div style={{ fontSize: 10.5, color: TE, fontFamily: MONO }}>Contrôlé · 3 trades · +€124</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 9px', background: 'rgba(0,209,122,.06)', border: '.5px solid rgba(0,209,122,.2)', borderRadius: 99 }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: G, animation: 'pulse 1.8s infinite' }} />
              <span style={{ fontSize: 9, color: G, fontFamily: MONO, letterSpacing: 1.2 }}>LIVE</span>
            </div>
          </div>
        </div>

        {/* ── Right panel — form ── */}
        <div className="lg-right" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 56px' }}>
          <div style={{ width: '100%', maxWidth: 360 }}>

            <div style={{ marginBottom: 34 }}>
              <div style={{ fontSize: 26, fontWeight: 300, letterSpacing: -.6, color: TX, marginBottom: 7 }}>Connexion</div>
              <div style={{ fontSize: 13, color: TE }}>Accède à ton espace Caldra</div>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 9.5, letterSpacing: 1.5, textTransform: 'uppercase' as const, color: TE, fontFamily: MONO }}>Email</label>
                <input className="lg-inp" type="email" name="email" placeholder="trader@exemple.com" required autoComplete="email" />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 9.5, letterSpacing: 1.5, textTransform: 'uppercase' as const, color: TE, fontFamily: MONO }}>Mot de passe</label>
                <input className="lg-inp" type="password" name="password" placeholder="••••••••" required autoComplete="current-password" />
              </div>

              {error && (
                <div style={{ padding: '10px 14px', background: 'rgba(220,50,24,.07)', border: '.5px solid rgba(220,50,24,.25)', borderRadius: 7, color: '#f87171', fontSize: 12.5 }}>
                  {error}
                </div>
              )}

              <button className="lg-btn" type="submit" disabled={loading} style={{ marginTop: 6 }}>
                {loading ? 'Connexion…' : 'Se connecter →'}
              </button>

              <div style={{ textAlign: 'right', marginTop: 2 }}>
                <a href="/forgot-password" style={{ fontSize: 12, color: `${RED}bb`, textDecoration: 'none' }}>Mot de passe oublié ?</a>
              </div>

            </form>

            <div style={{ marginTop: 28, paddingTop: 22, borderTop: `.5px solid ${B}`, textAlign: 'center', fontSize: 13, color: TE }}>
              Pas de compte ?{' '}
              <a href="/signup" style={{ color: RED, textDecoration: 'none', fontWeight: 500 }}>Créer un compte</a>
            </div>

          </div>
        </div>
      </div>
    </>
  )
}
