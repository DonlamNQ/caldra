'use client'

import AppHeader from '@/components/AppHeader'

interface BillingClientProps {
  userEmail: string
  plan: 'free' | 'pro' | 'team'
  tradeCount: number
  alertCount: number
}

const PLANS = {
  free: { name: 'Free', color: '#64748b', limit: '50 trades / jour', price: 'Gratuit' },
  pro:  { name: 'Pro',  color: '#e2e8f0', limit: 'Illimité',          price: '29€ / mois' },
  team: { name: 'Team', color: '#f59e0b', limit: '5 traders, illimité', price: '99€ / mois' },
}

const UPGRADES = [
  {
    id: 'pro',
    name: 'Pro',
    price: '29€',
    period: '/ mois',
    features: ['Trades illimités', 'IA coaching (Claude)', 'Alertes Slack / Webhook', 'Export CSV', 'Clé API dédiée'],
    cta: 'Passer à Pro',
  },
  {
    id: 'team',
    name: 'Team',
    price: '99€',
    period: '/ mois',
    features: ['Tout Pro, jusqu\'à 5 traders', 'Dashboard consolidé', 'Rapport hebdo PDF', 'SSO'],
    cta: 'Contacter l\'équipe',
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

  return (
    <div style={{ minHeight: '100vh', background: '#08080d', color: '#e2e8f0', fontFamily: 'system-ui, sans-serif', display: 'flex', flexDirection: 'column' }}>
      <AppHeader current="billing" userEmail={userEmail} />

      <main style={{ maxWidth: 720, margin: '0 auto', padding: '32px 24px', width: '100%' }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Abonnement</h1>
        </div>

        {/* Plan actuel */}
        <div style={{ background: '#0d0d1a', border: '1px solid #1e1e35', borderRadius: 12, padding: '24px', marginBottom: 24 }}>
          <p style={{ margin: '0 0 16px', fontSize: 11, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Plan actuel
          </p>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: 22, fontWeight: 800, color: current.color }}>{current.name}</span>
              <p style={{ margin: '4px 0 0', color: '#475569', fontSize: 13 }}>{current.limit} · {current.price}</p>
            </div>
            {plan !== 'free' && (
              <button
                onClick={handleManageBilling}
                style={{ background: 'none', border: '1px solid #1e1e35', borderRadius: 8, color: '#475569', fontSize: 13, padding: '8px 16px', cursor: 'pointer' }}
              >
                Gérer la facturation
              </button>
            )}
          </div>

          {/* Usage */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 20, paddingTop: 20, borderTop: '1px solid #13132a' }}>
            <div>
              <p style={{ margin: '0 0 4px', color: '#374151', fontSize: 12 }}>Trades ce mois</p>
              <p style={{ margin: 0, color: '#e2e8f0', fontSize: 20, fontWeight: 700, fontFamily: 'monospace' }}>{tradeCount}</p>
              {plan === 'free' && (
                <div style={{ marginTop: 6, height: 4, background: '#1e1e35', borderRadius: 2 }}>
                  <div style={{ height: '100%', width: `${Math.min(100, (tradeCount / 1500) * 100)}%`, background: tradeCount > 1200 ? '#ef4444' : '#22c55e', borderRadius: 2 }} />
                </div>
              )}
            </div>
            <div>
              <p style={{ margin: '0 0 4px', color: '#374151', fontSize: 12 }}>Alertes ce mois</p>
              <p style={{ margin: 0, color: '#e2e8f0', fontSize: 20, fontWeight: 700, fontFamily: 'monospace' }}>{alertCount}</p>
            </div>
          </div>
        </div>

        {/* Upgrade options — masquées si déjà sur Team */}
        {plan !== 'team' && (
          <>
            <p style={{ margin: '0 0 16px', fontSize: 11, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Évoluer
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {UPGRADES.filter(u => u.id !== plan).map(upgrade => (
                <div key={upgrade.id} style={{ background: '#0d0d1a', border: '1px solid #1e1e35', borderRadius: 12, padding: '20px 20px' }}>
                  <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>{upgrade.name}</p>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 3, marginBottom: 14 }}>
                    <span style={{ fontSize: 22, fontWeight: 800, fontFamily: 'monospace' }}>{upgrade.price}</span>
                    <span style={{ color: '#475569', fontSize: 12 }}>{upgrade.period}</span>
                  </div>
                  <ul style={{ margin: '0 0 18px', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 7 }}>
                    {upgrade.features.map(f => (
                      <li key={f} style={{ display: 'flex', gap: 7, color: '#64748b', fontSize: 13 }}>
                        <span style={{ color: '#22c55e' }}>✓</span>{f}
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => handleUpgrade(upgrade.id)}
                    style={{
                      width: '100%', background: '#e2e8f0', color: '#08080d',
                      border: 'none', borderRadius: 8, padding: '10px',
                      fontSize: 13, fontWeight: 700, cursor: 'pointer',
                    }}
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
  )
}
