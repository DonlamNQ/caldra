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
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,300;1,400&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        .lg-input{background:rgba(255,255,255,.04);border:0.5px solid #1e1e35;border-radius:8px;padding:14px 16px;color:#e2e8f0;font-size:14px;font-family:'DM Sans',sans-serif;width:100%;outline:none;transition:border-color .2s}
        .lg-input::placeholder{color:rgba(226,232,240,.2)}
        .lg-input:focus{border-color:rgba(124,58,237,.5)!important}
        .lg-btn{background:#7c3aed;color:#fff;border:none;border-radius:8px;padding:14px;font-size:14px;font-weight:600;cursor:pointer;width:100%;font-family:'DM Sans',sans-serif;transition:background .2s;letter-spacing:.2px}
        .lg-btn:hover{background:#6d28d9}
        .lg-btn:disabled{opacity:.55;cursor:not-allowed}
        .lg-signup-link{color:rgba(226,232,240,.4);text-decoration:none;transition:color .2s}
        .lg-signup-link:hover{color:rgba(226,232,240,.75)}
      `}</style>
      <div style={{
        minHeight: '100vh',
        background: '#08080d',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        fontFamily: "'DM Sans', system-ui, sans-serif",
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Background glow */}
        <div style={{
          position: 'absolute', top: '35%', left: '50%', transform: 'translate(-50%,-50%)',
          width: 700, height: 700, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(124,58,237,.05) 0%, transparent 65%)',
          pointerEvents: 'none',
        }} />

        {/* Form container */}
        <div style={{
          width: '100%',
          maxWidth: 400,
          display: 'flex',
          flexDirection: 'column',
          gap: 0,
          position: 'relative',
          zIndex: 1,
        }}>
          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div style={{
              fontSize: 20, fontWeight: 800, letterSpacing: 4,
              textTransform: 'uppercase', color: '#e2e8f0', lineHeight: 1,
              marginBottom: 10,
            }}>
              Cald<span style={{ color: '#7c3aed' }}>ra</span>
            </div>
            <div style={{
              fontSize: 13, fontStyle: 'italic', color: '#475569', fontWeight: 300, lineHeight: 1.5,
            }}>
              La discipline ne se force pas. Elle se protège.
            </div>
          </div>

          {/* Card */}
          <div style={{
            background: '#0d0d1a',
            border: '0.5px solid #1e1e35',
            borderRadius: 12,
            padding: '36px 32px',
            position: 'relative',
            overflow: 'hidden',
          }}>
            {/* Top accent */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg,transparent,rgba(124,58,237,.4),transparent)' }} />

            {sent ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ fontSize: 18, fontWeight: 300, letterSpacing: -.5, color: '#e2e8f0' }}>
                  Vérifiez votre email
                </div>
                <p style={{ color: '#475569', fontSize: 14, lineHeight: 1.65, fontWeight: 300 }}>
                  Un lien de connexion a été envoyé à{' '}
                  <span style={{ color: '#e2e8f0' }}>{email}</span>.{' '}
                  Cliquez sur le lien pour accéder à votre espace.
                </p>
              </div>
            ) : (
              <>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <input
                    className="lg-input"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="votre@email.com"
                    required
                    autoComplete="email"
                  />

                  {error && (
                    <div style={{
                      color: '#7c3aed', fontSize: 12,
                      background: 'rgba(124,58,237,.07)',
                      border: '0.5px solid rgba(124,58,237,.2)',
                      borderRadius: 6, padding: '9px 12px',
                    }}>
                      {error}
                    </div>
                  )}

                  <button
                    className="lg-btn"
                    type="submit"
                    disabled={loading}
                  >
                    {loading ? 'Envoi en cours…' : 'Accéder'}
                  </button>
                </form>

                <div style={{ marginTop: 22, textAlign: 'center' as const, fontSize: 13, color: '#475569', fontWeight: 300 }}>
                  Pas de compte ?{' '}
                  <a href="/signup" className="lg-signup-link">
                    S'inscrire
                  </a>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
