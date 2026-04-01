'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface OnboardingWizardProps {
  userEmail: string
}

interface Rules {
  max_daily_drawdown_pct: number | string
  max_consecutive_losses: number | string
  min_time_between_entries_sec: number | string
  session_start: string
  session_end: string
  max_trades_per_session: number | string
  max_risk_per_trade_pct: number | string
}

const DEFAULTS: Rules = {
  max_daily_drawdown_pct: 3,
  max_consecutive_losses: 3,
  min_time_between_entries_sec: 120,
  session_start: '09:30',
  session_end: '16:00',
  max_trades_per_session: 10,
  max_risk_per_trade_pct: 1,
}

const inputStyle: React.CSSProperties = {
  background: '#0a0a14',
  border: '1px solid #1e1e35',
  borderRadius: 8,
  padding: '10px 14px',
  color: '#e2e8f0',
  fontSize: 15,
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
  fontFamily: 'monospace',
}

function RuleInput({
  label,
  hint,
  suffix,
  type = 'number',
  value,
  onChange,
  min,
  max,
  step,
}: {
  label: string
  hint: string
  suffix?: string
  type?: string
  value: string | number
  onChange: (v: string) => void
  min?: number
  max?: number
  step?: number
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ color: '#94a3b8', fontSize: 13, fontWeight: 500 }}>{label}</label>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          min={min}
          max={max}
          step={step}
          style={suffix ? { ...inputStyle, flex: 1 } : inputStyle}
        />
        {suffix && <span style={{ color: '#475569', fontSize: 14, flexShrink: 0 }}>{suffix}</span>}
      </div>
      <p style={{ margin: 0, color: '#374151', fontSize: 12 }}>{hint}</p>
    </div>
  )
}

export default function OnboardingWizard({ userEmail }: OnboardingWizardProps) {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [rules, setRules] = useState<Rules>(DEFAULTS)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function set(field: keyof Rules, value: string) {
    setRules(prev => ({ ...prev, [field]: value }))
  }

  async function saveAndContinue() {
    setSaving(true)
    setError('')
    const res = await fetch('/api/rules', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rules),
    })
    setSaving(false)
    if (!res.ok) {
      setError('Erreur lors de la sauvegarde. Réessayez.')
      return
    }
    setStep(3)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#08080d', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: 'system-ui, sans-serif' }}>

      {/* Progress */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 40 }}>
        {[1, 2, 3].map(n => (
          <div key={n} style={{ width: 28, height: 4, borderRadius: 2, background: n <= step ? '#e2e8f0' : '#1e1e35', transition: 'background 0.3s' }} />
        ))}
      </div>

      {/* Step 1 — Welcome */}
      {step === 1 && (
        <div style={{ maxWidth: 480, width: '100%', textAlign: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em', color: '#e2e8f0', marginBottom: 12 }}>
            caldra
          </div>
          <h1 style={{ margin: '0 0 12px', fontSize: 24, fontWeight: 700, color: '#e2e8f0', lineHeight: 1.3 }}>
            Bienvenue, {userEmail.split('@')[0]}
          </h1>
          <p style={{ margin: '0 0 32px', color: '#64748b', fontSize: 15, lineHeight: 1.7 }}>
            Caldra surveille ton comportement de trading en temps réel — revenge sizing, re-entrées impulsives, drawdown excessif. Pour fonctionner, il a besoin de tes règles personnelles.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 40, textAlign: 'left' }}>
            {[
              ['🔍', "Analyse chaque trade dès qu'il arrive"],
              ['⚡', 'Alerte en temps réel si tu dévies de tes règles'],
              ['📊', 'Score de session pour visualiser ton état émotionnel'],
            ].map(([icon, text]) => (
              <div key={text} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', color: '#94a3b8', fontSize: 14 }}>
                <span style={{ fontSize: 16 }}>{icon}</span>
                <span>{text}</span>
              </div>
            ))}
          </div>
          <button
            onClick={() => setStep(2)}
            style={{ background: '#e2e8f0', color: '#08080d', border: 'none', borderRadius: 8, padding: '13px 32px', fontSize: 15, fontWeight: 700, cursor: 'pointer', width: '100%' }}
          >
            Configurer mes règles →
          </button>
        </div>
      )}

      {/* Step 2 — Rules */}
      {step === 2 && (
        <div style={{ maxWidth: 520, width: '100%' }}>
          <h2 style={{ margin: '0 0 6px', fontSize: 20, fontWeight: 700 }}>Tes règles de trading</h2>
          <p style={{ margin: '0 0 28px', color: '#475569', fontSize: 14 }}>
            Tu pourras les modifier à tout moment dans Settings.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {/* Bloc risque */}
            <div style={{ background: '#0d0d1a', border: '1px solid #1e1e35', borderRadius: '12px 12px 0 0', padding: '16px 20px', borderBottom: 'none' }}>
              <p style={{ margin: '0 0 16px', fontSize: 11, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Risque</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <RuleInput label="Drawdown max / jour" hint="Stop de protection" suffix="%" value={rules.max_daily_drawdown_pct} onChange={v => set('max_daily_drawdown_pct', v)} min={0.1} max={20} step={0.1} />
                <RuleInput label="Risque max / trade" hint="Alerte si stop trop large" suffix="%" value={rules.max_risk_per_trade_pct} onChange={v => set('max_risk_per_trade_pct', v)} min={0.1} max={10} step={0.1} />
                <RuleInput label="Pertes consécutives" hint="Alerte après X pertes" value={rules.max_consecutive_losses} onChange={v => set('max_consecutive_losses', v)} min={1} max={20} step={1} />
                <RuleInput label="Délai entre entrées" hint="Pause obligatoire" suffix="sec" value={rules.min_time_between_entries_sec} onChange={v => set('min_time_between_entries_sec', v)} min={0} max={3600} step={10} />
              </div>
            </div>

            {/* Bloc session */}
            <div style={{ background: '#0d0d1a', border: '1px solid #1e1e35', borderRadius: '0 0 12px 12px', padding: '16px 20px', borderTop: '1px solid #13132a' }}>
              <p style={{ margin: '0 0 16px', fontSize: 11, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Session</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                <RuleInput label="Début" hint="Heure de départ" type="time" value={rules.session_start} onChange={v => set('session_start', v)} />
                <RuleInput label="Fin" hint="Heure de clôture" type="time" value={rules.session_end} onChange={v => set('session_end', v)} />
                <RuleInput label="Max trades" hint="Limite quotidienne" value={rules.max_trades_per_session} onChange={v => set('max_trades_per_session', v)} min={1} max={100} step={1} />
              </div>
            </div>
          </div>

          {error && <p style={{ color: '#ef4444', fontSize: 13, marginTop: 12 }}>{error}</p>}

          <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
            <button
              onClick={() => setStep(1)}
              style={{ background: 'none', border: '1px solid #1e1e35', borderRadius: 8, padding: '11px 20px', color: '#64748b', fontSize: 14, cursor: 'pointer' }}
            >
              ← Retour
            </button>
            <button
              onClick={saveAndContinue}
              disabled={saving}
              style={{ flex: 1, background: '#e2e8f0', color: '#08080d', border: 'none', borderRadius: 8, padding: '11px', fontSize: 14, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}
            >
              {saving ? 'Enregistrement…' : 'Enregistrer et continuer →'}
            </button>
          </div>
        </div>
      )}

      {/* Step 3 — Done */}
      {step === 3 && (
        <div style={{ maxWidth: 420, width: '100%', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✓</div>
          <h2 style={{ margin: '0 0 12px', fontSize: 22, fontWeight: 700 }}>Tout est prêt</h2>
          <p style={{ margin: '0 0 32px', color: '#64748b', fontSize: 15, lineHeight: 1.6 }}>
            Tes règles sont enregistrées. Connecte ta plateforme de trading à l'endpoint <code style={{ background: '#0d0d1a', padding: '2px 6px', borderRadius: 4, fontSize: 13, color: '#94a3b8' }}>/api/ingest</code> pour commencer.
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            style={{ background: '#e2e8f0', color: '#08080d', border: 'none', borderRadius: 8, padding: '13px 32px', fontSize: 15, fontWeight: 700, cursor: 'pointer', width: '100%' }}
          >
            Accéder au dashboard →
          </button>
        </div>
      )}
    </div>
  )
}
