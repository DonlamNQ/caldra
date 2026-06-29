'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

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
const SANS = "var(--font-geist-sans), 'Geist', sans-serif"
const MONO = "var(--font-geist-mono), 'Geist Mono', monospace"

const CSS = `
  *{box-sizing:border-box;margin:0;padding:0}
  html,body{background:${BG}}
  .sg-inp{background:rgba(255,255,255,.035);border:.5px solid ${B2};border-radius:8px;padding:12px 15px;color:${TX};font-size:13.5px;font-family:${SANS};width:100%;outline:none;transition:border-color .2s,background .2s}
  .sg-inp::placeholder{color:${TE}}
  .sg-inp:focus{border-color:${RB}!important;background:rgba(124,58,237,.04)!important}
  .sg-sel{appearance:none;-webkit-appearance:none;cursor:pointer;background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23eae8f5' stroke-width='2' stroke-opacity='.5'><path d='M6 9l6 6 6-6'/></svg>");background-repeat:no-repeat;background-position:right 13px center;padding-right:36px}
  .sg-btn{background:${RED};color:#fff;border:none;border-radius:8px;padding:14px;font-size:14px;font-weight:600;cursor:pointer;width:100%;font-family:${SANS};transition:opacity .18s;letter-spacing:.2px}
  .sg-btn:hover{opacity:.88}
  .sg-btn:disabled{opacity:.5;cursor:not-allowed}
  @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
  .sg-wrap{animation:fadeUp .38s ease}
`

export default function SignupPage() {
  const [firstName, setFirstName] = useState('')
  const [lastName,  setLastName]  = useState('')
  const [phone,     setPhone]     = useState('')
  const [address,   setAddress]   = useState('')
  const [postal,    setPostal]    = useState('')
  const [city,      setCity]      = useState('')
  const [country,   setCountry]   = useState('France')
  const [email,     setEmail]     = useState('')
  const [password,  setPassword]  = useState('')
  const [confirm,   setConfirm]   = useState('')
  const [error,     setError]     = useState('')
  const [loading,   setLoading]   = useState(false)
  const [sent,      setSent]      = useState(false)

  const strength = password.length === 0 ? 0 : password.length < 8 ? 1 : password.length < 12 ? 2 : 3
  const strengthLabel = ['', 'Trop court', 'Correct', 'Fort']
  const strengthColor = ['', '#e05050', '#f59e0b', '#22c55e']

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!firstName.trim()) { setError('Le prénom est requis.'); return }
    if (!address.trim()) { setError("L'adresse est requise."); return }
    if (!postal.trim()) { setError('Le code postal est requis.'); return }
    if (!city.trim()) { setError('La ville est requise.'); return }
    if (password.length < 8) { setError('Le mot de passe doit contenir au moins 8 caractères.'); return }
    if (password !== confirm) { setError('Les mots de passe ne correspondent pas.'); return }

    setLoading(true)
    // Plan choisi sur la page Tarifs (/signup?plan=pro|max). Mémorisé en
    // métadonnée pour que le checkout (et le gate après confirmation email)
    // sache quel abonnement démarrer. Défaut : pro.
    const rawPlan = new URLSearchParams(window.location.search).get('plan')
    const plan = rawPlan === 'max' || rawPlan === 'sentinel' ? 'max' : 'pro'

    const supabase = createClient()
    const { data, error: authError } = await supabase.auth.signUp({
      email, password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: {
          first_name: firstName.trim(), last_name: lastName.trim(),
          phone: phone.trim(), full_name: `${firstName.trim()} ${lastName.trim()}`.trim(),
          address: address.trim(), postal_code: postal.trim(), city: city.trim(), country,
          plan,
        },
      },
    })

    if (authError) { setError(authError.message); setLoading(false); return }
    // Session immédiate (confirmation email désactivée) → direct au checkout CB.
    // Sinon, l'utilisateur confirme par email puis le gate l'enverra au checkout.
    if (data.session) { window.location.href = `/api/billing/checkout?plan=${plan}`; return }
    setSent(true); setLoading(false)
  }

  if (sent) {
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: CSS }} />
        <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: SANS, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '30%', left: '50%', transform: 'translate(-50%,-50%)', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,.055) 0%, transparent 65%)', pointerEvents: 'none' }} />
          <div className="sg-wrap" style={{ width: '100%', maxWidth: 400, background: SF, border: `.5px solid ${B}`, borderRadius: 14, padding: '44px 36px', position: 'relative', overflow: 'hidden', textAlign: 'center' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: .5, background: `linear-gradient(90deg,transparent,${RED}60,transparent)` }} />
            <div style={{ fontSize: 20, fontWeight: 500, letterSpacing: 8, textTransform: 'uppercase' as const, color: TX, marginBottom: 28 }}>Cald<span style={{ color: RED }}>ra</span></div>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: `${RD}`, border: `.5px solid ${RB}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 22 }}>✓</div>
            <div style={{ fontSize: 22, fontWeight: 300, letterSpacing: -.5, color: TX, marginBottom: 8 }}>
              {firstName ? `Bienvenue, ${firstName} !` : 'Bienvenue sur Caldra !'}
            </div>
            <p style={{ color: TE, fontSize: 13, lineHeight: 1.75, fontWeight: 300, marginBottom: 16 }}>
              Un email de confirmation a été envoyé à{' '}<span style={{ color: TX }}>{email}</span>.{' '}
              Clique sur le lien pour activer ton compte, puis enregistre ta carte pour démarrer ton essai gratuit de 7 jours.
            </p>
            <div style={{ padding: '12px 14px', background: `${RD}`, border: `.5px solid ${RB}`, borderRadius: 8, marginBottom: 4 }}>
              <p style={{ fontSize: 12, color: TX, lineHeight: 1.6, fontWeight: 300 }}>
                Caldra surveillera chaque trade en temps réel, dès la première connexion de ta plateforme.
              </p>
            </div>
            <div style={{ marginTop: 20, paddingTop: 18, borderTop: `.5px solid ${B}`, fontSize: 13, color: TE }}>
              <Link href="/login" style={{ color: RED, textDecoration: 'none' }}>← Retour à la connexion</Link>
            </div>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', fontFamily: SANS, color: TX, position: 'relative', overflow: 'hidden' }}>

        {/* Grid background */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: `linear-gradient(${B} 1px,transparent 1px),linear-gradient(90deg,${B} 1px,transparent 1px)`, backgroundSize: '52px 52px', opacity: .25, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)', width: 700, height: 700, borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,.055) 0%, transparent 65%)', pointerEvents: 'none' }} />

        <div className="sg-wrap" style={{ width: '100%', maxWidth: 460, position: 'relative', zIndex: 1 }}>

          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div style={{ width: 2, height: 28, background: `linear-gradient(180deg, ${RED}, ${RED}20)`, borderRadius: 2 }} />
              <div style={{ fontSize: 19, fontWeight: 500, letterSpacing: 7, textTransform: 'uppercase' as const, color: TX }}>Cald<span style={{ color: RED }}>ra</span></div>
            </div>
          </div>

          {/* Card */}
          <div style={{ background: SF, border: `.5px solid ${B}`, borderRadius: 14, padding: '32px 32px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: .5, background: `linear-gradient(90deg,transparent,${RED}60,transparent)` }} />

            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 20, fontWeight: 300, letterSpacing: -.5, color: TX, marginBottom: 5 }}>Créer un compte</div>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 9.5, letterSpacing: 1.5, textTransform: 'uppercase' as const, color: TE, fontFamily: MONO }}>Prénom <span style={{ color: RED }}>*</span></label>
                  <input className="sg-inp" type="text" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Jean" required autoComplete="given-name" />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 9.5, letterSpacing: 1.5, textTransform: 'uppercase' as const, color: TE, fontFamily: MONO }}>Nom</label>
                  <input className="sg-inp" type="text" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Dupont" autoComplete="family-name" />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 9.5, letterSpacing: 1.5, textTransform: 'uppercase' as const, color: TE, fontFamily: MONO }}>Email <span style={{ color: RED }}>*</span></label>
                <input className="sg-inp" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="trader@exemple.com" required autoComplete="email" />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 9.5, letterSpacing: 1.5, textTransform: 'uppercase' as const, color: TE, fontFamily: MONO }}>Téléphone <span style={{ color: `${TE}` }}>(optionnel)</span></label>
                <input className="sg-inp" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+33 6 00 00 00 00" autoComplete="tel" />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 9.5, letterSpacing: 1.5, textTransform: 'uppercase' as const, color: TE, fontFamily: MONO }}>Adresse <span style={{ color: RED }}>*</span></label>
                <input className="sg-inp" type="text" value={address} onChange={e => setAddress(e.target.value)} placeholder="12 rue de la Bourse" required autoComplete="street-address" />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 9.5, letterSpacing: 1.5, textTransform: 'uppercase' as const, color: TE, fontFamily: MONO }}>Code postal <span style={{ color: RED }}>*</span></label>
                  <input className="sg-inp" type="text" value={postal} onChange={e => setPostal(e.target.value)} placeholder="75002" required autoComplete="postal-code" />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 9.5, letterSpacing: 1.5, textTransform: 'uppercase' as const, color: TE, fontFamily: MONO }}>Ville <span style={{ color: RED }}>*</span></label>
                  <input className="sg-inp" type="text" value={city} onChange={e => setCity(e.target.value)} placeholder="Paris" required autoComplete="address-level2" />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 9.5, letterSpacing: 1.5, textTransform: 'uppercase' as const, color: TE, fontFamily: MONO }}>Pays <span style={{ color: RED }}>*</span></label>
                <select className="sg-inp sg-sel" value={country} onChange={e => setCountry(e.target.value)} autoComplete="country-name">
                  {['France', 'Belgique', 'Suisse', 'Luxembourg', 'Monaco', 'Canada', 'Maroc', 'Tunisie', 'Algérie', 'Autre'].map(c => (
                    <option key={c} value={c} style={{ background: SF, color: TX }}>{c}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 9.5, letterSpacing: 1.5, textTransform: 'uppercase' as const, color: TE, fontFamily: MONO }}>Mot de passe <span style={{ color: RED }}>*</span></label>
                <input className="sg-inp" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="8 caractères minimum" required autoComplete="new-password" />
                {password.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ flex: 1, height: 2.5, borderRadius: 2, background: 'rgba(255,255,255,.06)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${(strength / 3) * 100}%`, background: strengthColor[strength], borderRadius: 2, transition: 'width .3s, background .3s' }} />
                    </div>
                    <span style={{ fontSize: 10.5, color: strengthColor[strength], minWidth: 50, fontFamily: MONO }}>{strengthLabel[strength]}</span>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 9.5, letterSpacing: 1.5, textTransform: 'uppercase' as const, color: TE, fontFamily: MONO }}>Confirmer <span style={{ color: RED }}>*</span></label>
                <input
                  className="sg-inp" type="password" value={confirm}
                  onChange={e => setConfirm(e.target.value)} placeholder="Répétez votre mot de passe"
                  required autoComplete="new-password"
                  style={{ borderColor: confirm.length > 0 && confirm !== password ? 'rgba(224,80,80,.5)' : undefined }}
                />
                {confirm.length > 0 && confirm !== password && (
                  <span style={{ fontSize: 11, color: '#e05050', fontFamily: MONO }}>Les mots de passe ne correspondent pas</span>
                )}
              </div>

              {error && (
                <div style={{ padding: '10px 14px', background: 'rgba(220,50,24,.07)', border: '.5px solid rgba(220,50,24,.25)', borderRadius: 7, color: '#f87171', fontSize: 12.5 }}>
                  {error}
                </div>
              )}

              <button className="sg-btn" type="submit" disabled={loading} style={{ marginTop: 4 }}>
                {loading ? 'Création…' : 'Créer mon compte →'}
              </button>

              <p style={{ fontSize: 11.5, color: TE, lineHeight: 1.6, textAlign: 'center', marginTop: 2 }}>
                En créant un compte, vous acceptez nos{' '}
                <Link href="/mentions-legales" style={{ color: `${TE}`, textDecoration: 'underline', textUnderlineOffset: 2 }}>CGU</Link>
                {' '}et notre{' '}
                <Link href="/confidentialite" style={{ color: `${TE}`, textDecoration: 'underline', textUnderlineOffset: 2 }}>politique de confidentialité</Link>.
              </p>
            </form>

            <div style={{ marginTop: 20, paddingTop: 18, borderTop: `.5px solid ${B}`, textAlign: 'center', fontSize: 13, color: TE }}>
              Déjà un compte ?{' '}
              <Link href="/login" style={{ color: RED, textDecoration: 'none', fontWeight: 500 }}>Se connecter</Link>
            </div>
          </div>

        </div>
      </div>
    </>
  )
}
