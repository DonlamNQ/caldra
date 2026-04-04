'use client'

import { useState } from 'react'
import AppHeader from '@/components/AppHeader'

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

const INPUT: React.CSSProperties = {
  background: 'rgba(255,255,255,.04)',
  border: '0.5px solid rgba(255,255,255,.12)',
  borderRadius: 6,
  padding: '8px 12px',
  color: '#e8e6e0',
  fontSize: 13,
  outline: 'none',
  width: 100,
  textAlign: 'right',
  fontFamily: "'DM Sans', monospace",
  transition: 'border-color .2s',
}

const TIME_INPUT: React.CSSProperties = {
  ...INPUT,
  width: 88,
  textAlign: 'center',
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: '#0d0d18',
      border: '0.5px solid rgba(255,255,255,.08)',
      borderRadius: 12,
      padding: '0 1.75rem 1rem',
      marginBottom: '1rem',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg,transparent,rgba(255,255,255,.06),transparent)' }} />
      <div style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(232,230,224,.28)', padding: '1.1rem 0 .75rem', borderBottom: '0.5px solid rgba(255,255,255,.06)', marginBottom: '.25rem' }}>
        {title}
      </div>
      {children}
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, padding: '12px 0', borderBottom: '0.5px solid rgba(255,255,255,.05)' }}>
      <div>
        <div style={{ color: 'rgba(232,230,224,.8)', fontSize: 13, fontWeight: 400, marginBottom: 2 }}>{label}</div>
        <div style={{ color: 'rgba(232,230,224,.28)', fontSize: 11, lineHeight: 1.4 }}>{hint}</div>
      </div>
      {children}
    </div>
  )
}

export default function RulesForm({ initial, userEmail }: RulesFormProps) {
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
    if (res.ok) { setSaveState('saved'); setTimeout(() => setSaveState('idle'), 3000) }
    else setSaveState('error')
  }

  return (
    <>
      <style>{`
        *{box-sizing:border-box}body{margin:0;background:#07070e}
        ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:rgba(255,255,255,.08);border-radius:3px}
        @keyframes rlFadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        .rl-input:focus{border-color:rgba(220,80,60,.35)!important}
        .rl-input::-webkit-inner-spin-button{opacity:.3}
      `}</style>
      <div style={{ minHeight: '100vh', background: '#07070e', color: '#e8e6e0', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
        <AppHeader current="règles" userEmail={userEmail} />

        <main style={{ maxWidth: 680, margin: '0 auto', padding: '5rem 3rem 4rem', animation: 'rlFadeIn .4s ease both' }}>

          {/* Title */}
          <div style={{ marginBottom: '2rem' }}>
            <div style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(220,80,60,.55)', marginBottom: '.5rem' }}>Configuration</div>
            <h1 style={{ margin: 0, fontWeight: 200, fontSize: 'clamp(1.4rem,2.5vw,1.9rem)', letterSpacing: -1, color: '#fff', lineHeight: 1.1 }}>
              Mes règles de trading
            </h1>
            <p style={{ margin: '.5rem 0 0', color: 'rgba(232,230,224,.3)', fontSize: 13, fontWeight: 300 }}>
              Le moteur surveille ces seuils en temps réel à chaque trade.
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <Section title="Limites de risque">
              <Field label="Drawdown journalier max" hint="Stop de protection quand la perte atteint X% du compte">
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input className="rl-input" type="number" min={0.1} max={20} step={0.1} value={rules.max_daily_drawdown_pct} onChange={e => set('max_daily_drawdown_pct', e.target.value)} style={INPUT} />
                  <span style={{ color: 'rgba(232,230,224,.35)', fontSize: 12 }}>%</span>
                </div>
              </Field>
              <Field label="Risque max par trade" hint="Alerte si le stop-loss dépasse X% du capital">
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input className="rl-input" type="number" min={0.1} max={10} step={0.1} value={rules.max_risk_per_trade_pct} onChange={e => set('max_risk_per_trade_pct', e.target.value)} style={INPUT} />
                  <span style={{ color: 'rgba(232,230,224,.35)', fontSize: 12 }}>%</span>
                </div>
              </Field>
              <Field label="Pertes consécutives max" hint="Alerte après X trades perdants d'affilée">
                <input className="rl-input" type="number" min={1} max={20} step={1} value={rules.max_consecutive_losses} onChange={e => set('max_consecutive_losses', e.target.value)} style={{ ...INPUT, borderBottom: 'none' }} />
              </Field>
            </Section>

            <Section title="Comportement">
              <Field label="Délai min entre deux entrées" hint="Pause obligatoire après chaque trade">
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input className="rl-input" type="number" min={0} max={3600} step={10} value={rules.min_time_between_entries_sec} onChange={e => set('min_time_between_entries_sec', e.target.value)} style={INPUT} />
                  <span style={{ color: 'rgba(232,230,224,.35)', fontSize: 12 }}>sec</span>
                </div>
              </Field>
              <Field label="Trades max par session" hint="Alerte à 80%, bloqué à 100%">
                <input className="rl-input" type="number" min={1} max={100} step={1} value={rules.max_trades_per_session} onChange={e => set('max_trades_per_session', e.target.value)} style={{ ...INPUT, borderBottom: 'none' }} />
              </Field>
            </Section>

            <Section title="Fenêtre de session">
              <Field label="Début de session" hint="Aucun trade autorisé avant cette heure">
                <input className="rl-input" type="time" value={rules.session_start} onChange={e => set('session_start', e.target.value)} style={TIME_INPUT} />
              </Field>
              <Field label="Fin de session" hint="Tout trade après cette heure génère une alerte">
                <input className="rl-input" type="time" value={rules.session_end} onChange={e => set('session_end', e.target.value)} style={{ ...TIME_INPUT, borderBottom: 'none' }} />
              </Field>
            </Section>

            {/* Save */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '1.5rem' }}>
              <button
                type="submit"
                disabled={saveState === 'saving'}
                style={{
                  background: saveState === 'saving' ? 'rgba(220,80,60,.5)' : '#dc503c',
                  color: '#fff', border: 'none', borderRadius: 6,
                  padding: '10px 24px', fontSize: 10, fontWeight: 500,
                  cursor: saveState === 'saving' ? 'not-allowed' : 'pointer',
                  letterSpacing: 1.5, textTransform: 'uppercase', fontFamily: "'DM Sans',sans-serif",
                  transition: 'all .2s',
                }}
              >
                {saveState === 'saving' ? 'Enregistrement…' : 'Enregistrer'}
              </button>
              {saveState === 'saved' && (
                <span style={{ color: '#22c55e', fontSize: 12, letterSpacing: .5 }}>✓ Règles mises à jour</span>
              )}
              {saveState === 'error' && (
                <span style={{ color: '#ef4444', fontSize: 12, letterSpacing: .5 }}>Erreur — réessayez</span>
              )}
            </div>
          </form>
        </main>
      </div>
    </>
  )
}
