'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  .sg-input{background:rgba(255,255,255,.04);border:0.5px solid #1e1e35;border-radius:8px;padding:13px 16px;color:#e2e8f0;font-size:14px;font-family:'DM Sans',sans-serif;width:100%;outline:none;transition:border-color .2s}
  .sg-input::placeholder{color:rgba(226,232,240,.2)}
  .sg-input:focus{border-color:rgba(124,58,237,.5)!important}
`

export default function SignupPage() {
  const [firstName, setFirstName] = useState('')
  const [lastName,  setLastName]  = useState('')
  const [phone,     setPhone]     = useState('')
  const [email,     setEmail]     = useState('')
  const [password,  setPassword]  = useState('')
  const [confirm,   setConfirm]   = useState('')
  const [error,     setError]     = useState('')
  const [loading,   setLoading]   = useState(false)
  const [sent,      setSent]      = useState(false)

  const strength = password.length === 0 ? 0
    : password.length < 8  ? 1
    : password.length < 12 ? 2
    : 3
  const strengthLabel = ['', 'Trop court', 'Correct', 'Fort']
  const strengthColor = ['', '#e05050', '#f59e0b', '#22c55e']

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!firstName.trim()) { setError('Le prénom est requis.'); return }
    if (password.length < 8) { setError('Le mot de passe doit contenir au moins 8 caractères.'); return }
    if (password !== confirm) { setError('Les mots de passe ne correspondent pas.'); return }

    setLoading(true)
    const supabase = createClient()

    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: {
          first_name: firstName.trim(),
          last_name:  lastName.trim(),
          phone:      phone.trim(),
          full_name:  `${firstName.trim()} ${lastName.trim()}`.trim(),
        },
      },
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    if (data.session) {
      window.location.href = '/onboarding'
      return
    }

    setSent(true)
    setLoading(false)
  }

  const VIO = '#7c3aed'

  if (sent) {
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: CSS }} />
        <div style={S.page}>
          <div style={{ position: 'absolute', top: '30%', left: '50%', transform: 'translate(-50%,-50%)', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,.06) 0%, transparent 65%)', pointerEvents: 'none' }} />
          <div style={{ ...S.card, position: 'relative', zIndex: 1 }}>
            <div style={S.logo}>Cald<span style={{ color: VIO }}>ra</span></div>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(34,197,94,.1)', border: '0.5px solid rgba(34,197,94,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 20 }}>✓</div>
            <div style={{ fontSize: 18, fontWeight: 300, letterSpacing: -.5, color: '#e2e8f0', marginBottom: 10, textAlign: 'center' }}>Vérifiez votre email</div>
            <p style={{ color: '#475569', fontSize: 13, lineHeight: 1.7, fontWeight: 300, textAlign: 'center' }}>
              Un lien de confirmation a été envoyé à{' '}
              <span style={{ color: '#e2e8f0' }}>{email}</span>.{' '}
              Cliquez sur le lien pour activer votre compte.
            </p>
            <div style={{ marginTop: 24, paddingTop: 20, borderTop: '0.5px solid #1e1e35', textAlign: 'center', fontSize: 13, color: '#475569' }}>
              <Link href="/login" style={{ color: 'rgba(124,58,237,.8)', textDecoration: 'none' }}>← Retour à la connexion</Link>
            </div>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div style={S.page}>
        <div style={{ position: 'absolute', top: '30%', left: '50%', transform: 'translate(-50%,-50%)', width: 700, height: 700, borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,.06) 0%, transparent 65%)', pointerEvents: 'none' }} />

        <div style={{ width: '100%', maxWidth: 460, position: 'relative', zIndex: 1 }}>

          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={S.logo}>Cald<span style={{ color: VIO }}>ra</span></div>
            <div style={{ fontSize: 12, color: '#475569', fontWeight: 300, letterSpacing: 1 }}>
              Intelligence comportementale pour traders
            </div>
          </div>

          <div style={S.card}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg,transparent,rgba(124,58,237,.5),transparent)' }} />

            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 18, fontWeight: 300, letterSpacing: -.5, color: '#e2e8f0', marginBottom: 6 }}>Créer un compte</div>
              <div style={{ fontSize: 13, color: '#475569', fontWeight: 300 }}>14 jours gratuits · Sans carte requise</div>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* Prénom + Nom */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={S.label}>Prénom <span style={{ color: 'rgba(124,58,237,.7)' }}>*</span></label>
                  <input
                    className="sg-input"
                    type="text"
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    placeholder="Jean"
                    required
                    autoComplete="given-name"
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={S.label}>Nom</label>
                  <input
                    className="sg-input"
                    type="text"
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    placeholder="Dupont"
                    autoComplete="family-name"
                  />
                </div>
              </div>

              {/* Email */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={S.label}>Email <span style={{ color: 'rgba(124,58,237,.7)' }}>*</span></label>
                <input
                  className="sg-input"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="trader@exemple.com"
                  required
                  autoComplete="email"
                />
              </div>

              {/* Téléphone */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={S.label}>Téléphone <span style={{ color: '#475569', fontWeight: 300, letterSpacing: 0 }}>(optionnel)</span></label>
                <input
                  className="sg-input"
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="+33 6 00 00 00 00"
                  autoComplete="tel"
                />
              </div>

              {/* Mot de passe */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={S.label}>Mot de passe <span style={{ color: 'rgba(124,58,237,.7)' }}>*</span></label>
                <input
                  className="sg-input"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="8 caractères minimum"
                  required
                  autoComplete="new-password"
                />
                {password.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                    <div style={{ flex: 1, height: 3, borderRadius: 2, background: 'rgba(255,255,255,.06)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${(strength / 3) * 100}%`, background: strengthColor[strength], borderRadius: 2, transition: 'width .3s, background .3s' }} />
                    </div>
                    <span style={{ fontSize: 11, color: strengthColor[strength], minWidth: 50 }}>{strengthLabel[strength]}</span>
                  </div>
                )}
              </div>

              {/* Confirmer */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={S.label}>Confirmer le mot de passe <span style={{ color: 'rgba(124,58,237,.7)' }}>*</span></label>
                <input
                  className="sg-input"
                  type="password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="Répétez votre mot de passe"
                  required
                  autoComplete="new-password"
                  style={{ borderColor: confirm.length > 0 && confirm !== password ? 'rgba(224,80,80,.5)' : undefined }}
                />
                {confirm.length > 0 && confirm !== password && (
                  <span style={{ fontSize: 11, color: '#e05050' }}>Les mots de passe ne correspondent pas</span>
                )}
              </div>

              {error && (
                <div style={{ padding: '10px 14px', background: 'rgba(224,80,80,.07)', border: '0.5px solid rgba(224,80,80,.25)', borderRadius: 7, color: '#f87171', fontSize: 13 }}>
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading} style={{ marginTop: 4, padding: '13px', background: VIO, border: 'none', borderRadius: 8, color: '#fff', fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans',sans-serif", opacity: loading ? .65 : 1, transition: 'opacity .2s', letterSpacing: .2 }}>
                {loading ? 'Création…' : 'Créer mon compte →'}
              </button>

              <p style={{ fontSize: 12, color: '#475569', lineHeight: 1.6, textAlign: 'center', marginTop: 4 }}>
                En créant un compte, vous acceptez nos{' '}
                <Link href="/mentions-legales" style={{ color: 'rgba(226,232,240,.35)', textDecoration: 'underline', textUnderlineOffset: 2 }}>CGU</Link>
                {' '}et notre{' '}
                <Link href="/confidentialite" style={{ color: 'rgba(226,232,240,.35)', textDecoration: 'underline', textUnderlineOffset: 2 }}>politique de confidentialité</Link>.
              </p>

            </form>

            <div style={{ marginTop: 20, paddingTop: 18, borderTop: '0.5px solid #1e1e35', textAlign: 'center', fontSize: 13, color: '#475569' }}>
              Déjà un compte ?{' '}
              <Link href="/login" style={{ color: 'rgba(124,58,237,.8)', textDecoration: 'none', fontWeight: 500 }}>Se connecter</Link>
            </div>
          </div>

        </div>
      </div>
    </>
  )
}

const S: Record<string, React.CSSProperties> = {
  page: {
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
  },
  card: {
    background: '#0d0d1a',
    border: '0.5px solid #1e1e35',
    borderRadius: 12,
    padding: '32px 32px',
    position: 'relative',
    overflow: 'hidden',
  },
  logo: {
    fontSize: 20,
    fontWeight: 800,
    letterSpacing: 4,
    textTransform: 'uppercase' as const,
    color: '#e2e8f0',
    lineHeight: 1,
    marginBottom: 8,
    textAlign: 'center' as const,
  },
  label: {
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase' as const,
    color: 'rgba(226,232,240,.35)',
    fontWeight: 500,
  },
}
