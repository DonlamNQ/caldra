'use client'

import { useState } from 'react'
import AppShell from '@/components/AppShell'

interface Rules { max_daily_drawdown_pct: number; max_consecutive_losses: number; min_time_between_entries_sec: number; session_start: string; session_end: string; max_trades_per_session: number; max_risk_per_trade_pct: number }
interface RulesFormProps { initial: Rules; userEmail: string }
type SaveState = 'idle'|'saving'|'saved'|'error'

const INPUT: React.CSSProperties = {
  background: 'rgba(255,255,255,.04)', border: '0.5px solid rgba(255,255,255,.1)', borderRadius: 6,
  padding: '7px 11px', color: '#e2e0da', fontSize: 13, outline: 'none', width: 95,
  textAlign: 'right', fontFamily: "'JetBrains Mono',monospace", transition: 'border-color .2s',
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#0f0f17', border: '0.5px solid rgba(255,255,255,.065)', borderRadius: 10, overflow: 'hidden', marginBottom: '1rem' }}>
      <div style={{ padding: '12px 18px', borderBottom: '0.5px solid rgba(255,255,255,.07)', fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(226,224,218,.28)', fontFamily: "'DM Sans',sans-serif" }}>{title}</div>
      <div style={{ padding: '0 18px .5rem' }}>{children}</div>
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, padding: '11px 0', borderBottom: '0.5px solid rgba(255,255,255,.05)' }}>
      <div>
        <div style={{ color: 'rgba(226,224,218,.75)', fontSize: 13, fontFamily: "'DM Sans',sans-serif", marginBottom: 2 }}>{label}</div>
        <div style={{ color: 'rgba(226,224,218,.28)', fontSize: 11, fontFamily: "'DM Sans',sans-serif", lineHeight: 1.4 }}>{hint}</div>
      </div>
      {children}
    </div>
  )
}

export default function RulesForm({ initial, userEmail }: RulesFormProps) {
  const [rules, setRules] = useState<Rules>(initial)
  const [save, setSave] = useState<SaveState>('idle')

  function set(k: keyof Rules, v: string) { setRules(p => ({ ...p, [k]: v })); setSave('idle') }

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setSave('saving')
    const res = await fetch('/api/rules', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(rules) })
    if (res.ok) { setSave('saved'); setTimeout(() => setSave('idle'), 3000) } else setSave('error')
  }

  return (
    <>
      <style>{`
        @keyframes rlFadeIn{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}
        .rl-in:focus{border-color:rgba(56,189,248,.3)!important}
        .rl-in::-webkit-inner-spin-button{opacity:.25}
        input[type=time]::-webkit-calendar-picker-indicator{filter:invert(.3)}
      `}</style>
      <AppShell current="règles" userEmail={userEmail}>
        <main style={{ padding: '2rem', maxWidth: 700, animation: 'rlFadeIn .4s ease both' }}>

          <div style={{ marginBottom: '1.75rem' }}>
            <div style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(220,80,60,.55)', marginBottom: '.4rem', fontFamily: "'DM Sans',sans-serif" }}>Configuration</div>
            <h1 style={{ margin: 0, fontWeight: 400, fontSize: '1.6rem', letterSpacing: -.5, color: '#fff', fontFamily: "'DM Sans',sans-serif", marginBottom: '.4rem' }}>Règles de trading</h1>
            <p style={{ margin: 0, color: 'rgba(226,224,218,.3)', fontSize: 13, fontFamily: "'DM Sans',sans-serif" }}>Le moteur surveille ces seuils en temps réel à chaque trade.</p>
          </div>

          <form onSubmit={submit}>
            <Section title="Limites de risque">
              <Field label="Drawdown journalier max" hint="Stop de protection quand la perte atteint X% du compte">
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input className="rl-in" style={INPUT} type="number" min={0.1} max={20} step={0.1} value={rules.max_daily_drawdown_pct} onChange={e => set('max_daily_drawdown_pct', e.target.value)} />
                  <span style={{ color: 'rgba(226,224,218,.3)', fontSize: 12, fontFamily: "'DM Sans',sans-serif" }}>%</span>
                </div>
              </Field>
              <Field label="Risque max par trade" hint="Alerte si le stop-loss dépasse X% du capital">
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input className="rl-in" style={INPUT} type="number" min={0.1} max={10} step={0.1} value={rules.max_risk_per_trade_pct} onChange={e => set('max_risk_per_trade_pct', e.target.value)} />
                  <span style={{ color: 'rgba(226,224,218,.3)', fontSize: 12, fontFamily: "'DM Sans',sans-serif" }}>%</span>
                </div>
              </Field>
              <Field label="Pertes consécutives max" hint="Alerte après X trades perdants d'affilée">
                <input className="rl-in" style={{ ...INPUT, borderBottom: 'none' }} type="number" min={1} max={20} step={1} value={rules.max_consecutive_losses} onChange={e => set('max_consecutive_losses', e.target.value)} />
              </Field>
            </Section>

            <Section title="Comportement">
              <Field label="Délai min entre deux entrées" hint="Pause obligatoire après chaque sortie">
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input className="rl-in" style={INPUT} type="number" min={0} max={3600} step={10} value={rules.min_time_between_entries_sec} onChange={e => set('min_time_between_entries_sec', e.target.value)} />
                  <span style={{ color: 'rgba(226,224,218,.3)', fontSize: 12, fontFamily: "'DM Sans',sans-serif" }}>sec</span>
                </div>
              </Field>
              <Field label="Trades max par session" hint="Alerte à 80%, bloqué à 100%">
                <input className="rl-in" style={{ ...INPUT, borderBottom: 'none' }} type="number" min={1} max={100} step={1} value={rules.max_trades_per_session} onChange={e => set('max_trades_per_session', e.target.value)} />
              </Field>
            </Section>

            <Section title="Fenêtre de session">
              <Field label="Début de session" hint="Aucun trade autorisé avant cette heure">
                <input className="rl-in" style={{ ...INPUT, width: 88, textAlign: 'center' }} type="time" value={rules.session_start} onChange={e => set('session_start', e.target.value)} />
              </Field>
              <Field label="Fin de session" hint="Tout trade après cette heure génère une alerte">
                <input className="rl-in" style={{ ...INPUT, width: 88, textAlign: 'center', borderBottom: 'none' }} type="time" value={rules.session_end} onChange={e => set('session_end', e.target.value)} />
              </Field>
            </Section>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '1.5rem' }}>
              <button type="submit" disabled={save === 'saving'} style={{
                background: save === 'saving' ? 'rgba(220,80,60,.5)' : '#dc503c', color: '#fff', border: 'none', borderRadius: 6,
                padding: '9px 22px', fontSize: 10, fontWeight: 500, cursor: save === 'saving' ? 'not-allowed' : 'pointer',
                letterSpacing: 1.5, textTransform: 'uppercase', fontFamily: "'DM Sans',sans-serif", transition: 'all .2s',
              }}>
                {save === 'saving' ? 'Enregistrement…' : 'Enregistrer'}
              </button>
              {save === 'saved' && <span style={{ color: '#10b981', fontSize: 12, fontFamily: "'DM Sans',sans-serif" }}>✓ Règles mises à jour</span>}
              {save === 'error'  && <span style={{ color: '#f43f5e', fontSize: 12, fontFamily: "'DM Sans',sans-serif" }}>Erreur — réessayez</span>}
            </div>
          </form>
        </main>
      </AppShell>
    </>
  )
}
