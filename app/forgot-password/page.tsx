'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function ForgotPasswordPage() {
  const [email,   setEmail]   = useState('')
  const [loading, setLoading] = useState(false)
  const [sent,    setSent]    = useState(false)
  const [error,   setError]   = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const supabase = createClient()
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
    })
    setLoading(false)
    if (err) {
      setError('Une erreur est survenue. Vérifie ton adresse email.')
    } else {
      setSent(true)
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,300;1,400&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        .fp-input{background:rgba(255,255,255,.04);border:0.5px solid #1e1e35;border-radius:8px;padding:14px 16px;color:#e2e8f0;font-size:14px;font-family:'DM Sans',sans-serif;width:100%;outline:none;transition:border-color .2s}
        .fp-input::placeholder{color:rgba(226,232,240,.2)}
        .fp-input:focus{border-color:rgba(124,58,237,.5)!important}
        .fp-btn{background:#7c3aed;color:#fff;border:none;border-radius:8px;padding:14px;font-size:14px;font-weight:600;cursor:pointer;width:100%;font-family:'DM Sans',sans-serif;transition:background .2s;letter-spacing:.2px}
        .fp-btn:hover{background:#6d28d9}
        .fp-btn:disabled{opacity:.55;cursor:not-allowed}
        .fp-link{color:rgba(124,58,237,.8);text-decoration:none;font-weight:500}
        .fp-link:hover{color:#7c3aed}
      `}</style>
      <div style={{
        minHeight: '100vh', background: '#08080d', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', padding: 24,
        fontFamily: "'DM Sans', system-ui, sans-serif", position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: '35%', left: '50%', transform: 'translate(-50%,-50%)',
          width: 700, height: 700, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(124,58,237,.05) 0%, transparent 65%)',
          pointerEvents: 'none',
        }} />

        <div style={{ width: '100%', maxWidth: 400, position: 'relative', zIndex: 1 }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: 4, textTransform: 'uppercase', color: '#e2e8f0', lineHeight: 1, marginBottom: 10 }}>
              Cald<span style={{ color: '#7c3aed' }}>ra</span>
            </div>
            <div style={{ fontSize: 13, fontStyle: 'italic', color: '#475569', fontWeight: 300, lineHeight: 1.5 }}>
              La discipline ne se force pas. Elle se protège.
            </div>
          </div>

          <div style={{ background: '#0d0d1a', border: '0.5px solid #1e1e35', borderRadius: 12, padding: '36px 32px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg,transparent,rgba(124,58,237,.4),transparent)' }} />

            {sent ? (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 32, marginBottom: 16 }}>✉️</div>
                <div style={{ fontSize: 17, fontWeight: 300, color: '#e2e8f0', marginBottom: 10 }}>Email envoyé</div>
                <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.6, marginBottom: 24 }}>
                  Un lien de réinitialisation a été envoyé à <strong style={{ color: '#94a3b8' }}>{email}</strong>.<br />
                  Vérifie tes spams si tu ne le vois pas.
                </div>
                <a href="/login" className="fp-link" style={{ fontSize: 13 }}>← Retour à la connexion</a>
              </div>
            ) : (
              <>
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 18, fontWeight: 300, letterSpacing: -.5, color: '#e2e8f0', marginBottom: 6 }}>Mot de passe oublié</div>
                  <div style={{ fontSize: 13, color: '#475569', fontWeight: 300 }}>On t'envoie un lien pour le réinitialiser</div>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase' as const, color: 'rgba(226,232,240,.35)', fontWeight: 500 }}>Email</label>
                    <input
                      className="fp-input"
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="trader@exemple.com"
                      required
                      autoComplete="email"
                    />
                  </div>

                  {error && (
                    <div style={{ padding: '10px 14px', background: 'rgba(224,80,80,.07)', border: '0.5px solid rgba(224,80,80,.25)', borderRadius: 7, color: '#f87171', fontSize: 13 }}>
                      {error}
                    </div>
                  )}

                  <button className="fp-btn" type="submit" disabled={loading} style={{ marginTop: 4 }}>
                    {loading ? 'Envoi…' : 'Envoyer le lien →'}
                  </button>
                </form>

                <div style={{ marginTop: 20, paddingTop: 18, borderTop: '0.5px solid #1e1e35', textAlign: 'center', fontSize: 13, color: '#475569' }}>
                  <a href="/login" className="fp-link">← Retour à la connexion</a>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
