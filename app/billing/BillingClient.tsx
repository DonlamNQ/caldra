'use client'

import AppHeader from '@/components/AppHeader'

interface BillingClientProps {
  userEmail: string
  plan: 'free' | 'pro' | 'team'
  tradeCount: number
  alertCount: number
}

const PLANS = {
  free: { name: 'Free',  color: 'rgba(232,230,224,.5)', price: 'Gratuit',    limit: '50 trades / jour' },
  pro:  { name: 'Pro',   color: '#e8e6e0',               price: '29€ / mois', limit: 'Illimité + IA coaching' },
  team: { name: 'Team',  color: '#f59e0b',               price: '99€ / mois', limit: '5 traders, illimité' },
}

const UPGRADES = [
  {
    id: 'pro',
    name: 'Pro',
    price: '29€',
    period: '/ mois',
    features: ['Trades illimités', 'IA coaching (Claude)', 'Alertes Slack / Webhook', 'Export CSV', 'Clé API dédiée'],
    cta: 'Passer à Pro',
    accent: 'rgba(220,80,60,.08)',
    border: 'rgba(220,80,60,.2)',
    btnColor: '#dc503c',
  },
  {
    id: 'team',
    name: 'Team',
    price: '99€',
    period: '/ mois',
    features: ["Tout Pro, jusqu'à 5 traders", 'Dashboard consolidé', 'Rapport hebdo PDF', 'SSO'],
    cta: "Contacter l'équipe",
    accent: 'rgba(245,158,11,.06)',
    border: 'rgba(245,158,11,.18)',
    btnColor: '#f59e0b',
  },
]

export default function BillingClient({ userEmail, plan, tradeCount, alertCount }: BillingClientProps) {
  const current = PLANS[plan]

  async function handleUpgrade(planId: string) {
    if (planId === 'team') {
      window.location.href = 'mailto:hello@caldra.app?subject=Team plan'
      return
    }
    const res = await fetch('/api/billing/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan: planId }),
    })
    const data = await res.json()
    if (data.url) window.location.href = data.url
  }

  async function handleManageBilling() {
    const res = await fetch('/api/billing/portal', { method: 'POST' })
    const data = await res.json()
    if (data.url) window.location.href = data.url
  }

  const CARD: React.CSSProperties = {
    background: '#0d0d18',
    border: '0.5px solid rgba(255,255,255,.08)',
    borderRadius: 12,
    position: 'relative',
    overflow: 'hidden',
  }

  return (
    <>
      <style>{`
        *{box-sizing:border-box}body{margin:0;background:#07070e}
        ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:rgba(255,255,255,.08);border-radius:3px}
        @keyframes blFadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        .bl-manage{font-size:9px;padding:7px 14px;background:transparent;border:0.5px solid rgba(255,255,255,.13);border-radius:4px;color:rgba(232,230,224,.45);cursor:pointer;letter-spacing:1.5px;text-transform:uppercase;font-family:'DM Sans',sans-serif;transition:all .2s}
        .bl-manage:hover{background:rgba(255,255,255,.05);color:rgba(232,230,224,.8)}
      `}</style>
      <div style={{ minHeight: '100vh', background: '#07070e', color: '#e8e6e0', fontFamily: "'DM Sans', system-ui, sans-serif", display: 'flex', flexDirection: 'column' }}>
        <AppHeader current="billing" userEmail={userEmail} />

        <main style={{ maxWidth: 760, margin: '0 auto', padding: '5rem 3rem 4rem', width: '100%', animation: 'blFadeIn .4s ease both' }}>

          {/* Title */}
          <div style={{ marginBottom: '2rem' }}>
            <div style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(220,80,60,.55)', marginBottom: '.5rem' }}>Compte</div>
            <h1 style={{ margin: 0, fontWeight: 200, fontSize: 'clamp(1.4rem,2.5vw,1.9rem)', letterSpacing: -1, color: '#fff', lineHeight: 1.1 }}>
              Abonnement
            </h1>
          </div>

          {/* Plan actuel */}
          <div style={{ ...CARD, padding: '1.75rem 2rem', marginBottom: '1.5rem' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg,transparent,rgba(255,255,255,.06),transparent)' }} />
            <div style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(232,230,224,.28)', marginBottom: '1.25rem' }}>Plan actuel</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 'clamp(1.5rem,2.5vw,1.9rem)', fontWeight: 200, color: current.color, letterSpacing: -1, lineHeight: 1, marginBottom: '.4rem' }}>
                  {current.name}
                </div>
                <div style={{ fontSize: 12, color: 'rgba(232,230,224,.35)', letterSpacing: .5 }}>
                  {current.limit} · {current.price}
                </div>
              </div>
              {plan !== 'free' && (
                <button className="bl-manage" onClick={handleManageBilling}>
                  Gérer la facturation
                </button>
              )}
            </div>

            {/* Usage */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '0.5px solid rgba(255,255,255,.07)' }}>
              <div>
                <div style={{ fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', color: 'rgba(232,230,224,.28)', marginBottom: '.5rem' }}>Trades ce mois</div>
                <div style={{ fontSize: 'clamp(1.2rem,2vw,1.5rem)', fontWeight: 200, color: 'rgba(232,230,224,.8)', fontVariantNumeric: 'tabular-nums', letterSpacing: -.5 }}>
                  {tradeCount}
                </div>
                {plan === 'free' && (
                  <div style={{ marginTop: 8, height: 3, background: 'rgba(255,255,255,.06)', borderRadius: 2 }}>
                    <div style={{ height: '100%', width: `${Math.min(100, (tradeCount / 1500) * 100)}%`, background: tradeCount > 1200 ? '#ef4444' : '#22c55e', borderRadius: 2, transition: 'width .5s' }} />
                  </div>
                )}
              </div>
              <div>
                <div style={{ fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', color: 'rgba(232,230,224,.28)', marginBottom: '.5rem' }}>Alertes ce mois</div>
                <div style={{ fontSize: 'clamp(1.2rem,2vw,1.5rem)', fontWeight: 200, color: 'rgba(232,230,224,.8)', fontVariantNumeric: 'tabular-nums', letterSpacing: -.5 }}>
                  {alertCount}
                </div>
              </div>
            </div>
          </div>

          {/* Upgrade options */}
          {plan !== 'team' && (
            <>
              <div style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(232,230,224,.28)', marginBottom: '1rem' }}>Évoluer</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                {UPGRADES.filter(u => u.id !== plan).map(upgrade => (
                  <div key={upgrade.id} style={{
                    ...CARD,
                    padding: '1.75rem',
                    background: upgrade.accent,
                    border: `0.5px solid ${upgrade.border}`,
                  }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg,transparent,rgba(255,255,255,.05),transparent)' }} />
                    <div style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(232,230,224,.35)', marginBottom: '.75rem' }}>{upgrade.name}</div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: '1.25rem' }}>
                      <span style={{ fontSize: 'clamp(1.6rem,2.5vw,2rem)', fontWeight: 200, color: '#fff', letterSpacing: -1, fontVariantNumeric: 'tabular-nums' }}>{upgrade.price}</span>
                      <span style={{ color: 'rgba(232,230,224,.35)', fontSize: 11 }}>{upgrade.period}</span>
                    </div>
                    <ul style={{ margin: '0 0 1.5rem', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {upgrade.features.map(f => (
                        <li key={f} style={{ display: 'flex', gap: 8, color: 'rgba(232,230,224,.55)', fontSize: 12, lineHeight: 1.4 }}>
                          <span style={{ color: upgrade.btnColor, flexShrink: 0 }}>✓</span>{f}
                        </li>
                      ))}
                    </ul>
                    <button
                      onClick={() => handleUpgrade(upgrade.id)}
                      style={{
                        width: '100%', background: upgrade.btnColor, color: '#fff',
                        border: 'none', borderRadius: 6, padding: '10px',
                        fontSize: 10, fontWeight: 500, cursor: 'pointer',
                        letterSpacing: 1.5, textTransform: 'uppercase', fontFamily: "'DM Sans',sans-serif",
                        transition: 'opacity .2s',
                      }}
                      onMouseOver={e => (e.currentTarget.style.opacity = '.85')}
                      onMouseOut={e => (e.currentTarget.style.opacity = '1')}
                    >
                      {upgrade.cta}
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </main>
      </div>
    </>
  )
}
