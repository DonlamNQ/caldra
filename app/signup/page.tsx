'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function SignupPage() {
  const [email,     setEmail]     = useState('')
  const [password,  setPassword]  = useState('')
  const [error,     setError]     = useState('')
  const [loading,   setLoading]   = useState(false)
  const [confirmed, setConfirmed] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères')
      return
    }

    setLoading(true)
    const supabase = createClient()

    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // createBrowserClient (PKCE) stocke le code-verifier dans document.cookie
        // AVANT que cette ligne s'exécute — pas de race condition
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    // Session immédiate (email confirm désactivé dans Supabase)
    if (data.session) {
      window.location.href = '/onboarding'
      return
    }

    // Email de confirmation envoyé
    setConfirmed(true)
    setLoading(false)
  }

  if (confirmed) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={styles.logo}>caldra</div>
          <div style={{ ...styles.errorBox, color: '#22c55e', background: '#052e16', borderColor: '#166534', marginTop: 8 }}>
            <strong>Vérifiez votre email.</strong><br />
            Un lien de confirmation a été envoyé à <strong>{email}</strong>.
          </div>
          <p style={{ ...styles.footer, marginTop: 12 }}>
            <Link href="/login" style={styles.link}>Retour à la connexion</Link>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logo}>caldra</div>
        <p style={styles.subtitle}>Créez votre compte</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
              style={styles.input}
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="8 caractères minimum"
              required
              autoComplete="new-password"
              style={styles.input}
            />
          </div>

          {error && <p style={styles.errorBox}>{error}</p>}

          <button type="submit" disabled={loading} style={styles.button}>
            {loading ? 'Création…' : 'Créer mon compte'}
          </button>
        </form>

        <p style={styles.footer}>
          Déjà un compte ?{' '}
          <Link href="/login" style={styles.link}>Se connecter</Link>
        </p>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: '#08080d',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    fontFamily: 'system-ui, sans-serif',
  },
  card: {
    width: '100%',
    maxWidth: 380,
    background: '#0d0d1a',
    border: '1px solid #1e1e35',
    borderRadius: 16,
    padding: '36px 32px',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  logo: {
    fontSize: 24,
    fontWeight: 800,
    letterSpacing: '-0.03em',
    color: '#e2e8f0',
    marginBottom: 4,
  },
  subtitle: {
    margin: '0 0 20px',
    color: '#475569',
    fontSize: 14,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  label: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: 500,
  },
  input: {
    background: '#0a0a14',
    border: '1px solid #1e1e35',
    borderRadius: 8,
    padding: '10px 12px',
    color: '#e2e8f0',
    fontSize: 14,
    outline: 'none',
  },
  errorBox: {
    margin: 0,
    color: '#ef4444',
    fontSize: 13,
    background: '#1a0505',
    border: '1px solid #4d1010',
    borderRadius: 6,
    padding: '8px 12px',
  },
  button: {
    background: '#e2e8f0',
    color: '#08080d',
    border: 'none',
    borderRadius: 8,
    padding: '11px',
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
    marginTop: 4,
  },
  footer: {
    margin: '16px 0 0',
    color: '#475569',
    fontSize: 13,
    textAlign: 'center',
  },
  link: {
    color: '#94a3b8',
    textDecoration: 'underline',
    textUnderlineOffset: 3,
  },
}
