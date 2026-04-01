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
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logo}>caldra</div>

        {sent ? (
          <>
            <p style={styles.sentTitle}>Vérifiez votre email</p>
            <p style={styles.sentBody}>
              Un lien de connexion a été envoyé à <strong style={{ color: '#e2e8f0' }}>{email}</strong>.
              Cliquez sur le lien pour accéder à votre espace.
            </p>
          </>
        ) : (
          <>
            <p style={styles.subtitle}>Connexion par lien magique</p>

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

              {error && <p style={styles.error}>{error}</p>}

              <button type="submit" disabled={loading} style={styles.button}>
                {loading ? 'Envoi…' : 'Envoyer le lien'}
              </button>
            </form>
          </>
        )}
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
  sentTitle: {
    margin: '8px 0 12px',
    color: '#e2e8f0',
    fontSize: 18,
    fontWeight: 700,
  },
  sentBody: {
    margin: 0,
    color: '#475569',
    fontSize: 14,
    lineHeight: 1.6,
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
  error: {
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
}
