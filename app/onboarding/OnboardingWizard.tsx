'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { saveRulesAction } from './actions'

// ── Design tokens ──────────────────────────────────────────────────────────────
const RED  = '#7c3aed'
const BG   = '#0c0c15'
const SF   = '#12121c'
const SF2  = '#181826'
const B    = 'rgba(255,255,255,.055)'
const B2   = 'rgba(255,255,255,.10)'
const TX   = '#eae8f5'
const TD   = 'rgba(234,232,245,.65)'
const TE   = 'rgba(234,232,245,.35)'
const RD   = 'rgba(124,58,237,.09)'
const RB   = 'rgba(124,58,237,.25)'
const G    = '#00d17a'
const O    = '#ffab00'
const MONO = "var(--font-geist-mono), 'Geist Mono', monospace"
const SANS = "var(--font-geist-sans), 'Geist', sans-serif"

// ── Types ──────────────────────────────────────────────────────────────────────
type Platform = 'ctrader' | 'mt5'
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
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 0, marginBottom: 48 }}>
      {labels.map((label, i) => {
        const n = i + 1
        const isActive = n === step
        const isDone = n < step
        const dotBg = isDone ? `${G}18` : isActive ? RD : 'rgba(255,255,255,.025)'
        const dotBorder = isDone ? `${G}55` : isActive ? RB : B
        const dotColor = isDone ? G : isActive ? RED : TE
        return (
          <div key={n} style={{ display: 'flex', alignItems: 'flex-start', flex: i < labels.length - 1 ? 1 : 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                background: dotBg,
                border: `.5px solid ${dotBorder}`,
                boxShadow: isActive ? `0 0 0 3px ${RED}22` : isDone ? `0 0 0 3px ${G}14` : 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontFamily: MONO,
                color: dotColor,
                transition: 'all .35s',
              }}>{isDone ? '✓' : n}</div>
              <span style={{ fontSize: 9, letterSpacing: 1.4, textTransform: 'uppercase' as const, color: isActive ? TD : TE, whiteSpace: 'nowrap' as const, fontFamily: MONO, fontWeight: isActive ? 500 : 400 }}>{label}</span>
            </div>
            {i < labels.length - 1 && (
              <div style={{ flex: 1, position: 'relative', marginTop: 17, marginLeft: 10, marginRight: 10 }}>
                <div style={{ height: .5, background: B }} />
                <div style={{ position: 'absolute', top: 0, left: 0, height: .5, width: isDone ? '100%' : '0%', background: `linear-gradient(90deg,${RED}80,${RED}30)`, transition: 'width .5s ease' }} />
              </div>
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
  background: 'rgba(255,255,255,.035)', border: `.5px solid ${B2}`, borderRadius: 8,
  padding: '10px 13px', color: TX, fontSize: 13.5, fontFamily: MONO,
  outline: 'none', width: '100%', boxSizing: 'border-box' as const,
  transition: 'border-color .2s, background .2s',
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
export default function OnboardingWizard({ userName }: { userName: string }) {
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

  function setRule(k: keyof Rules, v: string) { setRules(p => ({ ...p, [k]: v })) }

  function applyLevel(l: Level) {
    setLevel(l)
    setRules(p => ({ ...p, ...LEVEL_PRESETS[l] }))
  }

  async function saveRules() {
    setSaving(true); setError('')
    try {
      const result = await saveRulesAction(rules as unknown as Record<string, unknown>)
      setSaving(false)
      if ('error' in result) { setError(result.error); return false }
      return true
    } catch (e: unknown) {
      setSaving(false)
      setError(e instanceof Error ? e.message : 'Erreur inconnue')
      return false
    }
  }

  async function goToStep4() {
    const ok = await saveRules()
    if (!ok) return
    setStep(4)
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

  return (
    <>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        html,body{background:${BG};font-family:${SANS};color:${TX}}
        input:focus{border-color:${RB}!important;background:rgba(124,58,237,.03)!important}
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}
        input[type=number]{-moz-appearance:textfield}
        input[type=time]::-webkit-calendar-picker-indicator{filter:invert(.4)}
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
        @keyframes shimmer{0%{opacity:.5}50%{opacity:1}100%{opacity:.5}}
        .ob-step{animation:fadeUp .3s ease}
        .ob-pill-btn{transition:all .18s;border-radius:9px!important}
        .ob-pill-btn:hover{box-shadow:0 2px 12px rgba(0,0,0,.2)}
      `}</style>

      <div style={{ minHeight: '100vh', background: BG, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', position: 'relative', overflow: 'hidden' }}>
        {/* Grid background */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: `linear-gradient(${B} 1px,transparent 1px),linear-gradient(90deg,${B} 1px,transparent 1px)`, backgroundSize: '52px 52px', opacity: .22, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '15%', left: '50%', transform: 'translateX(-50%)', width: 900, height: 900, borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,.045) 0%, transparent 55%)', pointerEvents: 'none' }} />

        {/* Logo */}
        <div style={{ marginBottom: 44, display: 'flex', alignItems: 'center', gap: 12, position: 'relative', zIndex: 1 }}>
          <div style={{ width: 2.5, height: 38, background: `linear-gradient(180deg, ${RED}, ${RED}20)`, borderRadius: 2 }} />
          <div>
            <div style={{ fontSize: 21, fontWeight: 500, letterSpacing: 8, textTransform: 'uppercase' as const, color: TX }}>Cald<span style={{ color: RED }}>ra</span></div>
            <div style={{ fontSize: 8.5, letterSpacing: 3.5, textTransform: 'uppercase' as const, color: TE, marginTop: 4, fontFamily: MONO }}>Session Monitor</div>
          </div>
        </div>

        <div style={{ width: '100%', maxWidth: 1060, position: 'relative', zIndex: 1 }}>
          <StepBar step={step} />

          {/* ── Step 1 — Bienvenue ── */}
          {step === 1 && (
            <div className="ob-step">
              <div style={{ marginBottom: 28 }}>
                <div style={{ fontSize: 10, letterSpacing: 2, color: RED, textTransform: 'uppercase' as const, fontFamily: MONO, marginBottom: 12, opacity: .75 }}>Bienvenue, {userName}</div>
                <h1 style={{ fontSize: 32, fontWeight: 200, letterSpacing: -1, lineHeight: 1.15, color: TX, marginBottom: 14 }}>
                  Tu ne vois pas<br />quand tu dérailles.
                  <span style={{ color: RED }}> Lui si.</span>
                </h1>
              </div>

              {/* Fake live alert */}
              <div style={{ background: SF, border: `.5px solid ${B}`, borderRadius: 12, padding: '16px 18px', marginBottom: 24, position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, ${RED}80, ${RED}20, transparent)` }} />
                <div style={{ fontSize: 9, letterSpacing: 1.5, color: TE, fontFamily: MONO, textTransform: 'uppercase' as const, marginBottom: 10 }}>Exemple — Alerte en temps réel</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    { lvl: 3, type: 'revenge_sizing',    msg: 'Sizing ×2.8 après une perte. Pattern de revenge trading détecté.', col: RED },
                    { lvl: 2, type: 'drawdown_alert',    msg: 'Drawdown journalier à 78% du seuil. Ralentis.',                    col: O   },
                    { lvl: 1, type: 'immediate_reentry', msg: 'Re-entrée 40s après la clôture. Délai minimum : 2 min.',           col: O   },
                  ].map((a, i) => (
                    <div key={i} style={{ padding: '9px 10px 9px 12px', borderLeft: `2px solid ${a.col}`, background: `${a.col}08`, borderRadius: '0 6px 6px 0' }}>
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
                  { n: '6',   label: 'patterns détectés',  sub: 'revenge, drawdown, overtrading…' },
                  { n: '<1s', label: 'temps de réaction',   sub: 'alerte dès la clôture du trade' },
                  { n: '100', label: 'score de session',    sub: 'ton état comportemental en live' },
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
                <p style={{ fontSize: 13, color: TD }}>Ces informations servent à pré-configurer tes règles. Tu pourras tout modifier ensuite.</p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>

                {/* Account size */}
                <Field label="Taille du compte" hint="Sert à calculer le drawdown en valeur réelle" suffix="€">
                  <input
                    type="number" min={100} max={10000000} step={100}
                    value={rules.account_size}
                    onChange={e => setRule('account_size', e.target.value)}
                    style={numInput}
                  />
                </Field>

                {/* Plateforme */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <label style={{ fontSize: 11, letterSpacing: .8, textTransform: 'uppercase' as const, color: TD, fontFamily: SANS }}>Plateforme de trading</label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
                    {([
                      { value: 'ctrader' as Platform, label: 'cTrader', sub: 'Via cBot' },
                      { value: 'mt5'     as Platform, label: 'MetaTrader 5', sub: 'Via EA' },
                    ] as { value: Platform; label: string; sub: string }[]).map(o => {
                      const active = platform === o.value
                      return (
                        <button key={o.value} onClick={() => setPlatform(o.value)} style={{ padding: '9px 18px', borderRadius: 8, cursor: 'pointer', background: active ? RD : 'transparent', border: `.5px solid ${active ? RB : B}`, color: active ? RED : TD, fontFamily: SANS, fontSize: 13, transition: 'all .18s', textAlign: 'left' as const, display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <span style={{ fontWeight: active ? 500 : 400 }}>{o.label}</span>
                          <span style={{ fontSize: 10, color: active ? `${RED}aa` : TE }}>{o.sub}</span>
                        </button>
                      )
                    })}
                    {/* Tradovate — prochainement */}
                    <div style={{ padding: '9px 18px', borderRadius: 8, background: 'transparent', border: `.5px solid ${B}`, color: TE, fontFamily: SANS, fontSize: 13, display: 'flex', flexDirection: 'column', gap: 2, opacity: .5, cursor: 'not-allowed' }}>
                      <span>Tradovate</span>
                      <span style={{ fontSize: 10, color: TE }}>Prochainement</span>
                    </div>
                  </div>
                </div>

                {/* Expérience */}
                <Field label="Expérience" hint="Pré-configure les règles — ajustables à tout moment dans Paramètres">
                  <Pills<Level>
                    value={level}
                    onChange={applyLevel}
                    options={[
                      { value: 'beginner',  label: 'Conservateur', sub: 'Règles strictes' },
                      { value: 'confirmed', label: 'Standard',     sub: 'Règles équilibrées' },
                      { value: 'expert',    label: 'Flexible',     sub: 'Règles souples' },
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
                <p style={{ fontSize: 13, color: TD }}>Pré-configurés selon ton profil. Modifiables à tout moment dans Paramètres.</p>
              </div>

              <div style={{ background: SF, border: `.5px solid ${B}`, borderRadius: 12, overflow: 'hidden' }}>

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

                <div style={{ padding: '14px 24px', background: `${RED}05` }}>
                  <div style={{ fontSize: 11, color: TD, fontFamily: MONO }}>
                    Drawdown max = <span style={{ color: TX }}>{rules.max_daily_drawdown_pct}%</span> de <span style={{ color: TX }}>{Number(rules.account_size).toLocaleString('fr-FR')}€</span> = <span style={{ color: RED, fontWeight: 500 }}>−{((Number(rules.max_daily_drawdown_pct) / 100) * Number(rules.account_size)).toFixed(0)}€</span> / jour
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
                        style={{ flex: 1, fontFamily: MONO, fontSize: 13, color: TX, background: SF2, border: `.5px solid ${B2}`, borderRadius: 7, padding: '10px 14px', filter: keyRevealed ? 'none' : 'blur(7px)', cursor: keyRevealed ? 'default' : 'pointer', userSelect: keyRevealed ? 'all' : 'none', transition: 'filter .25s', letterSpacing: .5 }}
                      >{apiKey}</div>
                      <button
                        onClick={copyKey}
                        style={{ padding: '10px 14px', background: copied ? `${G}12` : RD, border: `.5px solid ${copied ? `${G}40` : RB}`, borderRadius: 7, color: copied ? G : RED, cursor: 'pointer', fontSize: 11, fontFamily: MONO, flexShrink: 0, transition: 'all .2s', whiteSpace: 'nowrap' as const }}
                      >{copied ? '✓ Copié' : 'Copier'}</button>
                    </div>
                    {!keyRevealed && <div style={{ fontSize: 11, color: TE, fontFamily: MONO }}>Clique pour révéler · affichée une seule fois</div>}
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
                  {platform === 'ctrader' ? 'Connexion cTrader cBot' : 'Connexion MetaTrader 5 EA'}
                </div>

                {platform === 'ctrader' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {[
                      ['1', 'Dans le dashboard, onglet Intégrations, télécharge le fichier .algo.'],
                      ['2', 'Dans cTrader, va dans Automate → Manage cBots → Import, et importe le fichier.'],
                      ['3', 'Ouvre les paramètres du cBot, colle ta clé API, et active-le sur ton compte.'],
                    ].map(([n, t]) => (
                      <div key={n} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                        <div style={{ width: 22, height: 22, borderRadius: '50%', background: RD, border: `.5px solid ${RB}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: RED, fontFamily: MONO, flexShrink: 0, marginTop: 1 }}>{n}</div>
                        <div style={{ fontSize: 12.5, color: TD, lineHeight: 1.55 }}>{t}</div>
                      </div>
                    ))}
                    <div style={{ marginTop: 4, padding: '9px 12px', background: `${RED}08`, border: `.5px solid ${RED}30`, borderRadius: 7, fontSize: 11, color: TD }}>
                      Compatible avec tous les brokers cTrader : Pepperstone, IC Markets, Vantage, FP Markets…
                    </div>
                  </div>
                )}

                {platform === 'mt5' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {[
                      ['1', 'Dans le dashboard, onglet Intégrations, télécharge CaldraMT5.mq5.'],
                      ['2', 'Dans MetaEditor (F4), place le fichier dans Experts/ et compile (F7).'],
                      ['3', 'Glisse l\'EA sur un chart, colle ta clé API dans les paramètres, et active AutoTrading.'],
                    ].map(([n, t]) => (
                      <div key={n} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                        <div style={{ width: 22, height: 22, borderRadius: '50%', background: RD, border: `.5px solid ${RB}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: RED, fontFamily: MONO, flexShrink: 0, marginTop: 1 }}>{n}</div>
                        <div style={{ fontSize: 12.5, color: TD, lineHeight: 1.55 }}>{t}</div>
                      </div>
                    ))}
                    <div style={{ marginTop: 4, padding: '9px 12px', background: `${RED}08`, border: `.5px solid ${RED}30`, borderRadius: 7, fontSize: 11, color: TD }}>
                      Compatible avec tous les brokers MT5 : Vantage, IC Markets, Pepperstone, XM…
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
