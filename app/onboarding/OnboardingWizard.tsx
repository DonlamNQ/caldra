'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

// ── Design tokens ──────────────────────────────────────────────────────────────
const RED  = '#7c3aed'
const BG   = '#08080d'
const SF   = '#0d0d1a'
const SF2  = '#12121f'
const B    = 'rgba(255,255,255,.07)'
const B2   = 'rgba(255,255,255,.12)'
const TX   = '#e2e8f0'
const TD   = 'rgba(226,232,240,.55)'
const TE   = 'rgba(226,232,240,.3)'
const RD   = 'rgba(124,58,237,.09)'
const RB   = 'rgba(124,58,237,.25)'
const G    = '#00d17a'
const O    = '#ffab00'
const MONO = "var(--font-geist-mono), 'Geist Mono', monospace"
const SANS = "var(--font-geist-sans), 'Geist', sans-serif"

// ── Types ──────────────────────────────────────────────────────────────────────
type Platform = 'ctrader' | 'mt5' | 'api'
type Level    = 'beginner' | 'confirmed' | 'expert'

interface Rules {
  max_daily_drawdown_pct: number | string
  max_consecutive_losses: number | string
  min_time_between_entries_sec: number | string
  session_start: string
  session_end: string
  max_trades_per_session: number | string
  max_risk_per_trade_pct: number | string
  account_size: number | string
  slack_webhook_url: null
}

const LEVEL_PRESETS: Record<Level, Partial<Rules>> = {
  beginner:  { max_daily_drawdown_pct: 2,  max_consecutive_losses: 2, max_trades_per_session: 5,  max_risk_per_trade_pct: 0.5, min_time_between_entries_sec: 300 },
  confirmed: { max_daily_drawdown_pct: 3,  max_consecutive_losses: 3, max_trades_per_session: 10, max_risk_per_trade_pct: 1,   min_time_between_entries_sec: 120 },
  expert:    { max_daily_drawdown_pct: 5,  max_consecutive_losses: 4, max_trades_per_session: 20, max_risk_per_trade_pct: 2,   min_time_between_entries_sec: 60  },
}

const DEFAULTS: Rules = {
  max_daily_drawdown_pct: 3, max_consecutive_losses: 3,
  min_time_between_entries_sec: 120, session_start: '09:30',
  session_end: '16:00', max_trades_per_session: 10,
  max_risk_per_trade_pct: 1, account_size: 10000, slack_webhook_url: null,
}

// ── Step indicator ─────────────────────────────────────────────────────────────
function StepBar({ step }: { step: number }) {
  const labels = ['Bienvenue', 'Profil', 'Règles', 'Connexion']
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 0, marginBottom: 44 }}>
      {labels.map((label, i) => {
        const n = i + 1
        const isActive = n === step
        const isDone = n < step
        return (
          <div key={n} style={{ display: 'flex', alignItems: 'flex-start', flex: i < labels.length - 1 ? 1 : 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <div style={{
                width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                background: isDone ? `${G}14` : isActive ? RD : 'transparent',
                border: `.5px solid ${isDone ? `${G}55` : isActive ? RB : B}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontFamily: MONO,
                color: isDone ? G : isActive ? RED : TE,
                transition: 'all .35s',
              }}>{isDone ? '✓' : n}</div>
              <span style={{ fontSize: 8.5, letterSpacing: 1.2, textTransform: 'uppercase' as const, color: isActive ? TD : TE, whiteSpace: 'nowrap' as const, fontFamily: MONO }}>{label}</span>
            </div>
            {i < labels.length - 1 && (
              <div style={{ flex: 1, height: .5, background: isDone ? `${RED}55` : B, marginTop: 15, marginLeft: 8, marginRight: 8, transition: 'background .35s' }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Shared input ───────────────────────────────────────────────────────────────
function Field({ label, hint, suffix, children }: { label: string; hint?: string; suffix?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 11, letterSpacing: .8, textTransform: 'uppercase' as const, color: TD, fontFamily: SANS }}>{label}</label>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {children}
        {suffix && <span style={{ fontSize: 12, color: TE, fontFamily: MONO, flexShrink: 0 }}>{suffix}</span>}
      </div>
      {hint && <span style={{ fontSize: 11, color: TE, lineHeight: 1.5 }}>{hint}</span>}
    </div>
  )
}

const numInput: React.CSSProperties = {
  background: SF2, border: `.5px solid ${B2}`, borderRadius: 7,
  padding: '9px 12px', color: TX, fontSize: 14, fontFamily: MONO,
  outline: 'none', width: '100%', boxSizing: 'border-box',
  transition: 'border-color .2s',
}

// ── Pill selector ──────────────────────────────────────────────────────────────
function Pills<T extends string>({ options, value, onChange }: {
  options: { value: T; label: string; sub?: string }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
      {options.map(o => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            style={{
              padding: '9px 18px', borderRadius: 8, cursor: 'pointer',
              background: active ? RD : 'transparent',
              border: `.5px solid ${active ? RB : B}`,
              color: active ? RED : TD, fontFamily: SANS, fontSize: 13,
              transition: 'all .18s', textAlign: 'left' as const,
              display: 'flex', flexDirection: 'column', gap: 2,
            }}
          >
            <span style={{ fontWeight: active ? 500 : 400 }}>{o.label}</span>
            {o.sub && <span style={{ fontSize: 10, color: active ? `${RED}aa` : TE }}>{o.sub}</span>}
          </button>
        )
      })}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function OnboardingWizard({ userEmail }: { userEmail: string }) {
  const router = useRouter()
  const [step, setStep]         = useState(1)
  const [platform, setPlatform] = useState<Platform>('ctrader')
  const [level, setLevel]       = useState<Level>('confirmed')
  const [rules, setRules]       = useState<Rules>(DEFAULTS)
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')
  const [apiKey, setApiKey]     = useState<string | null>(null)
  const [keyRevealed, setKeyRevealed] = useState(false)
  const [copied, setCopied]     = useState(false)
  const [genError, setGenError] = useState('')

  const name = userEmail.split('@')[0]

  function setRule(k: keyof Rules, v: string) { setRules(p => ({ ...p, [k]: v })) }

  function applyLevel(l: Level) {
    setLevel(l)
    setRules(p => ({ ...p, ...LEVEL_PRESETS[l] }))
  }

  async function saveRules() {
    setSaving(true); setError('')
    const res = await fetch('/api/rules', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rules),
    })
    setSaving(false)
    if (!res.ok) { setError('Erreur de sauvegarde — réessaie.'); return false }
    return true
  }

  async function goToStep4() {
    const ok = await saveRules()
    if (!ok) return
    setStep(4)
    // Auto-generate API key
    try {
      const res = await fetch('/api/api-key', { method: 'POST' })
      const data = await res.json()
      if (data.key) setApiKey(data.key)
      else setGenError('Impossible de générer la clé — réessaie.')
    } catch {
      setGenError('Erreur réseau.')
    }
  }

  function copyKey() {
    if (!apiKey) return
    navigator.clipboard.writeText(apiKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const curlSnippet = `curl -X POST https://getcaldra.com/api/ingest \\
  -H "x-caldra-key: ${apiKey ?? '<votre-clé>'}" \\
  -H "Content-Type: application/json" \\
  -d '{"symbol":"ES","direction":"long","size":1,
       "entry_price":5200,"exit_price":5195,
       "entry_time":"${new Date().toISOString()}",
       "pnl":-25}'`

  return (
    <>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        body{background:${BG};font-family:${SANS};color:${TX}}
        input:focus{border-color:${RB}!important}
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}
        input[type=number]{-moz-appearance:textfield}
        input[type=time]::-webkit-calendar-picker-indicator{filter:invert(.4)}
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
        @keyframes shimmer{0%{opacity:.5}50%{opacity:1}100%{opacity:.5}}
        .ob-step{animation:fadeUp .3s ease}
      `}</style>

      <div style={{ minHeight: '100vh', background: BG, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 20px' }}>

        {/* Logo */}
        <div style={{ marginBottom: 40, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 2, height: 28, background: `linear-gradient(180deg, ${RED}, ${RED}30)`, borderRadius: 2 }} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 500, letterSpacing: 6, textTransform: 'uppercase' as const, color: TX }}>Cald<span style={{ color: RED }}>ra</span></div>
            <div style={{ fontSize: 7, letterSpacing: 7, textTransform: 'uppercase' as const, color: TE, marginTop: 3 }}>Session</div>
          </div>
        </div>

        <div style={{ width: '100%', maxWidth: 740 }}>
          <StepBar step={step} />

          {/* ── Step 1 — Bienvenue ── */}
          {step === 1 && (
            <div className="ob-step">
              <div style={{ marginBottom: 28 }}>
                <div style={{ fontSize: 10, letterSpacing: 2, color: RED, textTransform: 'uppercase' as const, fontFamily: MONO, marginBottom: 12, opacity: .75 }}>Bienvenue, {name}</div>
                <h1 style={{ fontSize: 32, fontWeight: 200, letterSpacing: -1, lineHeight: 1.15, color: TX, marginBottom: 14 }}>
                  Tu ne vois pas<br />quand tu dérailles.
                  <span style={{ color: RED }}> Lui si.</span>
                </h1>
                <p style={{ fontSize: 14, color: TD, lineHeight: 1.75, maxWidth: 460 }}>
                  Caldra analyse chaque trade en temps réel et détecte les patterns comportementaux dangereux avant qu'ils ne coûtent cher.
                </p>
              </div>

              {/* Fake live alert */}
              <div style={{ background: SF, border: `.5px solid ${B}`, borderRadius: 12, padding: '16px 18px', marginBottom: 24, position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, ${RED}80, ${RED}20, transparent)` }} />
                <div style={{ fontSize: 9, letterSpacing: 1.5, color: TE, fontFamily: MONO, textTransform: 'uppercase' as const, marginBottom: 10 }}>Exemple — Alerte en temps réel</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    { lvl: 3, type: 'revenge_sizing',   msg: 'Sizing ×2.8 après une perte. Pattern de revenge trading détecté.', col: RED },
                    { lvl: 2, type: 'drawdown_alert',   msg: 'Drawdown journalier à 78% du seuil. Ralentis.',                    col: O   },
                    { lvl: 1, type: 'immediate_reentry',msg: 'Re-entrée 40s après la clôture. Délai minimum : 2 min.',           col: O   },
                  ].map((a, i) => (
                    <div key={i} style={{
                      padding: '9px 10px 9px 12px',
                      borderLeft: `2px solid ${a.col}`,
                      background: `${a.col}08`,
                      borderRadius: '0 6px 6px 0',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <span style={{ fontSize: 8.5, fontFamily: MONO, padding: '2px 6px', borderRadius: 3, background: `${a.col}15`, border: `.5px solid ${a.col}40`, color: a.col }}>L{a.lvl}</span>
                        <span style={{ fontSize: 10, color: TE, fontFamily: MONO, letterSpacing: .3 }}>{a.type.replace(/_/g, ' ')}</span>
                        {i === 0 && <span style={{ marginLeft: 'auto', fontSize: 8, color: a.col, fontFamily: MONO, animation: 'pulse 1.8s infinite' }}>● LIVE</span>}
                      </div>
                      <div style={{ fontSize: 12, color: TX, fontWeight: 300, lineHeight: 1.4 }}>{a.msg}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Features */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 28 }}>
                {[
                  { n: '6', label: 'patterns détectés', sub: 'revenge, drawdown, overtrading…' },
                  { n: '<1s', label: 'temps de réaction', sub: 'alerte dès la clôture du trade' },
                  { n: '100', label: 'score de session', sub: 'ton état comportemental en live' },
                ].map(f => (
                  <div key={f.label} style={{ background: SF, border: `.5px solid ${B}`, borderRadius: 9, padding: '13px 14px' }}>
                    <div style={{ fontSize: 22, fontWeight: 200, letterSpacing: -1, color: TX, fontFamily: MONO, marginBottom: 3 }}>{f.n}</div>
                    <div style={{ fontSize: 11, color: TD, marginBottom: 2, fontWeight: 500 }}>{f.label}</div>
                    <div style={{ fontSize: 10, color: TE, lineHeight: 1.4 }}>{f.sub}</div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setStep(2)}
                style={{ width: '100%', padding: '14px', background: RED, border: 'none', borderRadius: 8, color: '#fff', fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: SANS, letterSpacing: .5, transition: 'opacity .2s' }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '.88')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
              >
                Configurer mon compte →
              </button>
            </div>
          )}

          {/* ── Step 2 — Profil ── */}
          {step === 2 && (
            <div className="ob-step">
              <div style={{ marginBottom: 28 }}>
                <h2 style={{ fontSize: 24, fontWeight: 200, letterSpacing: -.5, color: TX, marginBottom: 8 }}>Ton profil de trading</h2>
                <p style={{ fontSize: 13, color: TD }}>Caldra adapte les seuils par défaut à ton niveau et ta taille de compte.</p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>

                {/* Account size */}
                <Field label="Taille du compte" hint="Sert à calculer le drawdown en % réel" suffix="€">
                  <input
                    type="number" min={100} max={10000000} step={100}
                    value={rules.account_size}
                    onChange={e => setRule('account_size', e.target.value)}
                    style={numInput}
                  />
                </Field>

                {/* Plateforme */}
                <Field label="Plateforme de trading">
                  <Pills<Platform>
                    value={platform}
                    onChange={setPlatform}
                    options={[
                      { value: 'ctrader', label: 'cTrader', sub: 'Bot automatique' },
                      { value: 'mt5',     label: 'MetaTrader 5', sub: 'EA Caldra' },
                      { value: 'api',     label: 'API directe', sub: 'Tout broker' },
                    ]}
                  />
                </Field>

                {/* Niveau */}
                <Field label="Ton niveau" hint="Pré-configure les règles — tu pourras les affiner ensuite">
                  <Pills<Level>
                    value={level}
                    onChange={applyLevel}
                    options={[
                      { value: 'beginner',  label: 'Débutant',  sub: '< 1 an' },
                      { value: 'confirmed', label: 'Confirmé',  sub: '1–3 ans' },
                      { value: 'expert',    label: 'Expert',    sub: '3+ ans' },
                    ]}
                  />
                </Field>

                {/* Session window */}
                <Field label="Fenêtre de session" hint="Alerte si tu trades en dehors de ces horaires">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <input type="time" value={rules.session_start} onChange={e => setRule('session_start', e.target.value)} style={{ ...numInput, width: 110 }} />
                    <span style={{ color: TE, fontFamily: MONO }}>–</span>
                    <input type="time" value={rules.session_end} onChange={e => setRule('session_end', e.target.value)} style={{ ...numInput, width: 110 }} />
                  </div>
                </Field>
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 30 }}>
                <button onClick={() => setStep(1)} style={{ padding: '11px 20px', background: 'transparent', border: `.5px solid ${B}`, borderRadius: 7, color: TD, cursor: 'pointer', fontFamily: SANS, fontSize: 13 }}>← Retour</button>
                <button
                  onClick={() => setStep(3)}
                  style={{ flex: 1, padding: '12px', background: RED, border: 'none', borderRadius: 8, color: '#fff', fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: SANS, transition: 'opacity .2s' }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = '.88')}
                  onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                >
                  Continuer →
                </button>
              </div>
            </div>
          )}

          {/* ── Step 3 — Règles ── */}
          {step === 3 && (
            <div className="ob-step">
              <div style={{ marginBottom: 24 }}>
                <h2 style={{ fontSize: 24, fontWeight: 200, letterSpacing: -.5, color: TX, marginBottom: 8 }}>Tes garde-fous</h2>
                <p style={{ fontSize: 13, color: TD }}>Pré-configurés pour ton niveau. Modifiables à tout moment dans Règles.</p>
              </div>

              <div style={{ background: SF, border: `.5px solid ${B}`, borderRadius: 12, overflow: 'hidden' }}>

                {/* Risk */}
                <div style={{ padding: '20px 24px', borderBottom: `.5px solid ${B}` }}>
                  <div style={{ fontSize: 10, letterSpacing: 1.2, color: TE, fontFamily: SANS, textTransform: 'uppercase' as const, marginBottom: 16 }}>Risk management</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <Field label="Drawdown max / jour" suffix="%">
                      <input type="number" min={0.1} max={20} step={0.1} value={rules.max_daily_drawdown_pct} onChange={e => setRule('max_daily_drawdown_pct', e.target.value)} style={numInput} />
                    </Field>
                    <Field label="Risk max / trade" suffix="%">
                      <input type="number" min={0.1} max={10} step={0.1} value={rules.max_risk_per_trade_pct} onChange={e => setRule('max_risk_per_trade_pct', e.target.value)} style={numInput} />
                    </Field>
                  </div>
                </div>

                {/* Discipline */}
                <div style={{ padding: '20px 24px', borderBottom: `.5px solid ${B}` }}>
                  <div style={{ fontSize: 10, letterSpacing: 1.2, color: TE, fontFamily: SANS, textTransform: 'uppercase' as const, marginBottom: 16 }}>Discipline</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                    <Field label="Max trades / session">
                      <input type="number" min={1} max={100} step={1} value={rules.max_trades_per_session} onChange={e => setRule('max_trades_per_session', e.target.value)} style={numInput} />
                    </Field>
                    <Field label="Pertes consécutives max">
                      <input type="number" min={1} max={20} step={1} value={rules.max_consecutive_losses} onChange={e => setRule('max_consecutive_losses', e.target.value)} style={numInput} />
                    </Field>
                    <Field label="Délai entre trades" suffix="sec">
                      <input type="number" min={0} max={3600} step={10} value={rules.min_time_between_entries_sec} onChange={e => setRule('min_time_between_entries_sec', e.target.value)} style={numInput} />
                    </Field>
                  </div>
                </div>

                {/* Preview */}
                <div style={{ padding: '14px 24px', background: `${RED}05` }}>
                  <div style={{ fontSize: 11, color: TD, fontFamily: MONO }}>
                    Drawdown max = <span style={{ color: TX }}>{rules.max_daily_drawdown_pct}%</span> de <span style={{ color: TX }}>{Number(rules.account_size).toLocaleString('fr-FR')}€</span> = <span style={{ color: RED, fontWeight: 500 }}>−{((Number(rules.max_daily_drawdown_pct) / 100) * Number(rules.account_size)).toFixed(0)}€</span> de perte max / jour
                  </div>
                </div>
              </div>

              {error && <p style={{ color: RED, fontSize: 12, marginTop: 10, fontFamily: MONO }}>{error}</p>}

              <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                <button onClick={() => setStep(2)} style={{ padding: '11px 20px', background: 'transparent', border: `.5px solid ${B}`, borderRadius: 7, color: TD, cursor: 'pointer', fontFamily: SANS, fontSize: 13 }}>← Retour</button>
                <button
                  onClick={goToStep4}
                  disabled={saving}
                  style={{ flex: 1, padding: '12px', background: RED, border: 'none', borderRadius: 8, color: '#fff', fontSize: 14, fontWeight: 500, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: SANS, opacity: saving ? .65 : 1, transition: 'opacity .2s' }}
                >
                  {saving ? 'Enregistrement…' : 'Enregistrer et continuer →'}
                </button>
              </div>
            </div>
          )}

          {/* ── Step 4 — Connexion ── */}
          {step === 4 && (
            <div className="ob-step">
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', background: `${G}10`, border: `.5px solid ${G}40`, borderRadius: 99, fontSize: 10, color: G, fontFamily: MONO, marginBottom: 14 }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: G, display: 'inline-block' }} />
                  Règles enregistrées
                </div>
                <h2 style={{ fontSize: 24, fontWeight: 200, letterSpacing: -.5, color: TX, marginBottom: 8 }}>Connecte ta plateforme</h2>
                <p style={{ fontSize: 13, color: TD }}>Une clé API unique a été générée. Elle identifie tous tes trades entrants.</p>
              </div>

              {/* API Key */}
              <div style={{ background: SF, border: `.5px solid ${B}`, borderRadius: 12, padding: '18px 20px', marginBottom: 16, position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, ${RED}80, ${RED}20, transparent)` }} />
                <div style={{ fontSize: 9, letterSpacing: 1.5, color: TE, fontFamily: MONO, textTransform: 'uppercase' as const, marginBottom: 10 }}>Ta clé API</div>

                {apiKey ? (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <div
                        onClick={() => setKeyRevealed(true)}
                        style={{
                          flex: 1, fontFamily: MONO, fontSize: 13, color: TX,
                          background: SF2, border: `.5px solid ${B2}`, borderRadius: 7, padding: '10px 14px',
                          filter: keyRevealed ? 'none' : 'blur(7px)',
                          cursor: keyRevealed ? 'default' : 'pointer',
                          userSelect: keyRevealed ? 'all' : 'none',
                          transition: 'filter .25s',
                          letterSpacing: .5,
                        }}
                      >{apiKey}</div>
                      <button
                        onClick={copyKey}
                        style={{ padding: '10px 14px', background: copied ? `${G}12` : RD, border: `.5px solid ${copied ? `${G}40` : RB}`, borderRadius: 7, color: copied ? G : RED, cursor: 'pointer', fontSize: 11, fontFamily: MONO, flexShrink: 0, transition: 'all .2s', whiteSpace: 'nowrap' as const }}
                      >{copied ? '✓ Copié' : 'Copier'}</button>
                    </div>
                    {!keyRevealed && (
                      <div style={{ fontSize: 11, color: TE, fontFamily: MONO }}>Clique pour révéler · affichée une seule fois</div>
                    )}
                    <div style={{ fontSize: 11, color: TE, marginTop: 6 }}>Cette clé ne sera plus affichée. Copie-la maintenant.</div>
                  </>
                ) : genError ? (
                  <div style={{ color: RED, fontSize: 13, fontFamily: MONO }}>{genError}</div>
                ) : (
                  <div style={{ color: TE, fontSize: 12, fontFamily: MONO, animation: 'shimmer 1.5s infinite' }}>Génération en cours…</div>
                )}
              </div>

              {/* Platform instructions */}
              <div style={{ background: SF, border: `.5px solid ${B}`, borderRadius: 12, padding: '18px 20px', marginBottom: 20 }}>
                <div style={{ fontSize: 9, letterSpacing: 1.5, color: TE, fontFamily: MONO, textTransform: 'uppercase' as const, marginBottom: 14 }}>
                  {platform === 'ctrader' ? 'Connexion cTrader' : platform === 'mt5' ? 'Connexion MetaTrader 5' : 'Connexion API directe'}
                </div>

                {platform === 'ctrader' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {[
                      ['1', 'Télécharge CaldraBot.algo ci-dessous et ouvre-le dans cTrader via Automate → Open.'],
                      ['2', 'Dans les paramètres du cBot, colle ta clé API Caldra dans le champ prévu.'],
                      ['3', 'Lance le cBot. Chaque position fermée sera analysée automatiquement.'],
                    ].map(([n, t]) => (
                      <div key={n} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                        <div style={{ width: 22, height: 22, borderRadius: '50%', background: RD, border: `.5px solid ${RB}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: RED, fontFamily: MONO, flexShrink: 0, marginTop: 1 }}>{n}</div>
                        <div style={{ fontSize: 12.5, color: TD, lineHeight: 1.55 }}>{t}</div>
                      </div>
                    ))}
                    <a href="/CaldraBot.algo" download="CaldraBot.algo" style={{ display: 'block', textAlign: 'center' as const, padding: '10px', background: RD, border: `.5px solid ${RB}`, borderRadius: 7, color: RED, textDecoration: 'none', fontSize: 12, marginTop: 4, fontFamily: SANS }}>↓ Télécharger CaldraBot.algo</a>
                  </div>
                )}

                {platform === 'mt5' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {[
                      ['1', 'Télécharge l\'EA Caldra pour MT5 depuis l\'onglet Intégrations du dashboard.'],
                      ['2', 'Place le fichier .ex5 dans MetaTrader → File → Open Data Folder → Experts.'],
                      ['3', 'Attache l\'EA à un graphique. Colle ta clé API dans les paramètres.'],
                    ].map(([n, t]) => (
                      <div key={n} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                        <div style={{ width: 22, height: 22, borderRadius: '50%', background: RD, border: `.5px solid ${RB}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: RED, fontFamily: MONO, flexShrink: 0, marginTop: 1 }}>{n}</div>
                        <div style={{ fontSize: 12.5, color: TD, lineHeight: 1.55 }}>{t}</div>
                      </div>
                    ))}
                  </div>
                )}

                {platform === 'api' && (
                  <div>
                    <div style={{ fontSize: 12, color: TD, marginBottom: 12 }}>Envoie un POST à chaque clôture de trade :</div>
                    <div style={{ background: BG, border: `.5px solid ${B}`, borderRadius: 8, padding: '14px 16px', fontFamily: MONO, fontSize: 11, color: TD, lineHeight: 1.7, whiteSpace: 'pre' as const, overflowX: 'auto' as const }}>
                      {curlSnippet}
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={() => router.push('/dashboard')}
                style={{ width: '100%', padding: '14px', background: RED, border: 'none', borderRadius: 8, color: '#fff', fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: SANS, letterSpacing: .5, transition: 'opacity .2s' }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '.88')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
              >
                Accéder au dashboard →
              </button>
              <div style={{ textAlign: 'center' as const, marginTop: 12, fontSize: 11, color: TE }}>
                Tu peux configurer la connexion plus tard dans l'onglet Intégrations.
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
