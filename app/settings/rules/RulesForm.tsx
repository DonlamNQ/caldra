'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Rules {
  max_daily_drawdown_pct: number
  max_consecutive_losses: number
  min_time_between_entries_sec: number
  session_start: string
  session_end: string
  max_trades_per_session: number
  max_risk_per_trade_pct: number
}

interface RulesFormProps {
  initial: Rules
  userEmail: string
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint: string
  children: React.ReactNode
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, padding: '14px 0', borderBottom: '1px solid #13132a' }}>
      <div>
        <p style={{ margin: 0, color: '#e2e8f0', fontSize: 14, fontWeight: 500 }}>{label}</p>
        <p style={{ margin: '2px 0 0', color: '#475569', fontSize: 12 }}>{hint}</p>
      </div>
      {children}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  background: '#0a0a14',
  border: '1px solid #1e1e35',
  borderRadius: 8,
  padding: '8px 12px',
  color: '#e2e8f0',
  fontSize: 14,
  outline: 'none',
  width: 110,
  textAlign: 'right',
  fontFamily: 'monospace',
}

const timeInputStyle: React.CSSProperties = {
  ...inputStyle,
  width: 90,
  textAlign: 'center',
}

export default function RulesForm({ initial, userEmail }: RulesFormProps) {
  const router = useRouter()
  const [rules, setRules] = useState<Rules>(initial)
  const [saveState, setSaveState] = useState<SaveState>('idle')

  function set(field: keyof Rules, value: string) {
    setRules(prev => ({ ...prev, [field]: value }))
    setSaveState('idle')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaveState('saving')

    const res = await fetch('/api/rules', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rules),
    })

    if (res.ok) {
      setSaveState('saved')
      setTimeout(() => setSaveState('idle'), 3000)
    } else {
      setSaveState('error')
    }
  }

  async function handleSignOut() {
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <div style={{ minHeight: '100vh', background: '#08080d', color: '#e2e8f0', fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid #1e1e35', background: '#0a0a14' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontWeight: 800, fontSize: 20, letterSpacing: '-0.02em' }}>caldra</span>
          <span style={{ color: '#334155' }}>/</span>
          <a href="/dashboard" style={{ color: '#64748b', fontSize: 14, textDecoration: 'none' }}>dashboard</a>
          <span style={{ color: '#334155' }}>/</span>
          <span style={{ color: '#94a3b8', fontSize: 14 }}>règles</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ color: '#334155', fontSize: 12 }}>{userEmail}</span>
          <button onClick={handleSignOut} style={{ background: 'none', border: '1px solid #1e1e35', borderRadius: 6, color: '#475569', fontSize: 12, padding: '4px 10px', cursor: 'pointer' }}>
            Déconnexion
          </button>
        </div>
      </header>

      {/* Body */}
      <main style={{ maxWidth: 640, margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Mes règles de trading</h1>
          <p style={{ margin: '6px 0 0', color: '#475569', fontSize: 14 }}>
            Le moteur d'alerte surveille ces seuils en temps réel à chaque trade.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Section : Risque */}
          <div style={{ background: '#0d0d1a', border: '1px solid #1e1e35', borderRadius: 12, padding: '4px 20px 8px', marginBottom: 16 }}>
            <p style={{ margin: '14px 0 4px', fontSize: 11, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Limites de risque
            </p>
            <Field label="Drawdown journalier max" hint="Stop de protection quand la perte atteint X% du compte">
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input type="number" min={0.1} max={20} step={0.1} value={rules.max_daily_drawdown_pct} onChange={e => set('max_daily_drawdown_pct', e.target.value)} style={inputStyle} />
                <span style={{ color: '#475569', fontSize: 13 }}>%</span>
              </div>
            </Field>
            <Field label="Risque max par trade" hint="Alerte si le stop-loss dépasse X% du capital">
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input type="number" min={0.1} max={10} step={0.1} value={rules.max_risk_per_trade_pct} onChange={e => set('max_risk_per_trade_pct', e.target.value)} style={inputStyle} />
                <span style={{ color: '#475569', fontSize: 13 }}>%</span>
              </div>
            </Field>
            <Field label="Pertes consécutives max" hint="Alerte après X trades perdants d'affilée">
              <input type="number" min={1} max={20} step={1} value={rules.max_consecutive_losses} onChange={e => set('max_consecutive_losses', e.target.value)} style={inputStyle} />
            </Field>
          </div>

          {/* Section : Comportement */}
          <div style={{ background: '#0d0d1a', border: '1px solid #1e1e35', borderRadius: 12, padding: '4px 20px 8px', marginBottom: 16 }}>
            <p style={{ margin: '14px 0 4px', fontSize: 11, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Comportement
            </p>
            <Field label="Délai min entre deux entrées" hint="Pause obligatoire après chaque trade">
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input type="number" min={0} max={3600} step={10} value={rules.min_time_between_entries_sec} onChange={e => set('min_time_between_entries_sec', e.target.value)} style={inputStyle} />
                <span style={{ color: '#475569', fontSize: 13 }}>sec</span>
              </div>
            </Field>
            <Field label="Trades max par session" hint="Limite quotidienne — alerte à 80%, bloqué à 100%">
              <input type="number" min={1} max={100} step={1} value={rules.max_trades_per_session} onChange={e => set('max_trades_per_session', e.target.value)} style={inputStyle} />
            </Field>
          </div>

          {/* Section : Session */}
          <div style={{ background: '#0d0d1a', border: '1px solid #1e1e35', borderRadius: 12, padding: '4px 20px 8px', marginBottom: 28 }}>
            <p style={{ margin: '14px 0 4px', fontSize: 11, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Fenêtre de session
            </p>
            <Field label="Début de session" hint="Pas de trade autorisé avant cette heure">
              <input type="time" value={rules.session_start} onChange={e => set('session_start', e.target.value)} style={timeInputStyle} />
            </Field>
            <Field label="Fin de session" hint="Tout trade après cette heure génère une alerte">
              <input type="time" value={rules.session_end} onChange={e => set('session_end', e.target.value)} style={timeInputStyle} />
            </Field>
          </div>

          {/* Save */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              type="submit"
              disabled={saveState === 'saving'}
              style={{
                background: '#e2e8f0',
                color: '#08080d',
                border: 'none',
                borderRadius: 8,
                padding: '11px 24px',
                fontSize: 14,
                fontWeight: 700,
                cursor: saveState === 'saving' ? 'not-allowed' : 'pointer',
                opacity: saveState === 'saving' ? 0.7 : 1,
              }}
            >
              {saveState === 'saving' ? 'Enregistrement…' : 'Enregistrer'}
            </button>

            {saveState === 'saved' && (
              <span style={{ color: '#22c55e', fontSize: 13 }}>✓ Règles mises à jour</span>
            )}
            {saveState === 'error' && (
              <span style={{ color: '#ef4444', fontSize: 13 }}>Erreur — réessayez</span>
            )}
          </div>
        </form>
      </main>
    </div>
  )
}
