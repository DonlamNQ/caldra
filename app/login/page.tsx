'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail]     = useState('')
  const [sent, setSent]       = useState(false)
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createClient()
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    setLoading(false)

    if (otpError) {
      setError(otpError.message)
    } else {
      setSent(true)
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500&display=swap');
        *{box-sizing:border-box}
        .lg-input::placeholder{color:rgba(226,232,240,.2)}
        .lg-input:focus{border-color:rgba(220,80,60,.4)!important;outline:none}
        .lg-btn:hover{background:#c94535!important}
        .lg-btn:disabled{opacity:.55;cursor:not-allowed}
      `}</style>
      <div style={{
        minHeight: '100vh',
        background: '#08080d',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        fontFamily: "'DM Sans', system-ui, sans-serif",
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Subtle radial glow */}
        <div style={{
          position: 'absolute', top: '30%', left: '50%', transform: 'translate(-50%,-50%)',
          width: 600, height: 600, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(220,80,60,.06) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{
          width: '100%',
          maxWidth: 400,
          background: '#0d0d1a',
          border: '0.5px solid #1e1e35',
          borderRadius: 12,
          padding: '40px 36px',
          display: 'flex',
          flexDirection: 'column',
          gap: 0,
          position: 'relative',
          zIndex: 1,
        }}>
          {/* Top accent line */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, borderRadius: '12px 12px 0 0', background: 'linear-gradient(90deg,transparent,rgba(220,80,60,.4),transparent)' }} />

          {/* Logo */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 14, fontWeight: 300, letterSpacing: 8, textTransform: 'uppercase', color: '#fff', lineHeight: 1 }}>
              Cald<span style={{ color: '#dc503c' }}>ra</span>
            </div>
            <div style={{ fontSize: 7, letterSpacing: 3, textTransform: 'uppercase', color: 'rgba(255,255,255,.3)', lineHeight: 1, marginTop: 5 }}>Session</div>
          </div>

          {sent ? (
            <>
              <div style={{ fontSize: 18, fontWeight: 300, letterSpacing: -.5, color: '#e2e8f0', marginBottom: 10 }}>
                Vérifiez votre email
              </div>
              <p style={{ margin: 0, color: '#475569', fontSize: 14, lineHeight: 1.65, fontWeight: 300 }}>
                Un lien de connexion a été envoyé à{' '}
                <span style={{ color: '#e2e8f0' }}>{email}</span>.
                Cliquez sur le lien pour accéder à votre espace.
              </p>
            </>
          ) : (
            <>
              <div style={{ fontSize: 22, fontWeight: 300, letterSpacing: -.5, color: '#e2e8f0', marginBottom: 6 }}>
                Connexion
              </div>
              <p style={{ margin: '0 0 24px', color: '#475569', fontSize: 13, fontWeight: 300 }}>
                Lien magique — aucun mot de passe
              </p>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  <label style={{ color: 'rgba(226,232,240,.5)', fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', fontFamily: "'DM Sans', sans-serif" }}>
                    Email
                  </label>
                  <input
                    className="lg-input"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    autoComplete="email"
                    style={{
                      background: '#08080d',
                      border: '0.5px solid #1e1e35',
                      borderRadius: 6,
                      padding: '12px 16px',
                      color: '#e2e8f0',
                      fontSize: 14,
                      fontFamily: "'DM Sans', sans-serif",
                      transition: 'border-color .2s',
                    }}
                  />
                </div>

                {error && (
                  <div style={{
                    color: '#dc503c', fontSize: 12, background: 'rgba(220,80,60,.07)',
                    border: '0.5px solid rgba(220,80,60,.2)', borderRadius: 6, padding: '9px 12px',
                  }}>
                    {error}
                  </div>
                )}

                <button
                  className="lg-btn"
                  type="submit"
                  disabled={loading}
                  style={{
                    background: '#dc503c',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 6,
                    padding: '12px',
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: 'pointer',
                    letterSpacing: .5,
                    fontFamily: "'DM Sans', sans-serif",
                    transition: 'background .2s',
                    marginTop: 4,
                    width: '100%',
                  }}
                >
                  {loading ? 'Envoi en cours…' : 'Envoyer le lien'}
                </button>
              </form>

              <div style={{ marginTop: 24, textAlign: 'center', fontSize: 13, color: '#475569', fontWeight: 300 }}>
                Pas de compte ?{' '}
                <a href="/signup" style={{ color: 'rgba(226,232,240,.4)', textDecoration: 'none', transition: 'color .2s' }}>
                  S'inscrire
                </a>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
