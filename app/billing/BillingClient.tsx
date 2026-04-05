'use client'

import AppShell from '@/components/AppShell'

interface BillingClientProps { userEmail: string; plan: 'free'|'pro'|'team'; tradeCount: number; alertCount: number }

const PLANS = {
  free: { name: 'Free',  color: 'rgba(226,224,218,.5)', price: 'Gratuit',    limit: '50 trades / jour' },
  pro:  { name: 'Pro',   color: '#e2e0da',              price: '29€ / mois', limit: 'Illimité + IA coaching' },
  team: { name: 'Team',  color: '#fbbf24',              price: '99€ / mois', limit: '5 traders, illimité' },
}

const UPGRADES = [
  { id: 'pro',  name: 'Pro',  price: '29€', period: '/mois', cta: 'Passer à Pro',      dot: '#dc503c', features: ['Trades illimités', 'IA coaching (Claude)', 'Alertes Slack/Webhook', 'Export CSV', 'Clé API dédiée'] },
  { id: 'team', name: 'Team', price: '99€', period: '/mois', cta: "Contacter l'équipe", dot: '#fbbf24', features: ["Tout Pro, 5 traders", 'Dashboard consolidé', 'Rapport hebdo PDF', 'SSO'] },
]

export default function BillingClient({ userEmail, plan, tradeCount, alertCount }: BillingClientProps) {
  const cur = PLANS[plan]

  async function upgrade(planId: string) {
    if (planId === 'team') { window.location.href = 'mailto:hello@caldra.app?subject=Team plan'; return }
    const res = await fetch('/api/billing/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ plan: planId }) })
    const d = await res.json(); if (d.url) window.location.href = d.url
  }

  async function manage() {
    const res = await fetch('/api/billing/portal', { method: 'POST' })
    const d = await res.json(); if (d.url) window.location.href = d.url
  }

  const CARD: React.CSSProperties = { background: '#0f0f17', border: '0.5px solid rgba(255,255,255,.065)', borderRadius: 10, position: 'relative', overflow: 'hidden' }

  return (
    <>
      <style>{`
        @keyframes blFadeIn{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}
        .bl-manage{font-size:9px;padding:6px 12px;background:transparent;border:0.5px solid rgba(255,255,255,.1);border-radius:5px;color:rgba(226,224,218,.4);cursor:pointer;letter-spacing:1.5px;text-transform:uppercase;font-family:'DM Sans',sans-serif;transition:all .15s}
        .bl-manage:hover{background:rgba(255,255,255,.04);color:rgba(226,224,218,.7)}
        .bl-cta{width:100%;padding:9px;border:none;border-radius:6px;font-size:10px;font-weight:500;cursor:pointer;letter-spacing:1.5px;text-transform:uppercase;font-family:'DM Sans',sans-serif;transition:opacity .2s}
        .bl-cta:hover{opacity:.82}
      `}</style>
      <AppShell current="billing" userEmail={userEmail}>
        <main style={{ padding: '2rem', maxWidth: 780, animation: 'blFadeIn .4s ease both' }}>

          <div style={{ marginBottom: '1.75rem' }}>
            <div style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(220,80,60,.55)', marginBottom: '.4rem', fontFamily: "'DM Sans',sans-serif" }}>Compte</div>
            <h1 style={{ margin: 0, fontWeight: 400, fontSize: '1.6rem', letterSpacing: -.5, color: '#fff', fontFamily: "'DM Sans',sans-serif" }}>Abonnement</h1>
          </div>

          {/* Plan actuel */}
          <div style={{ ...CARD, padding: '1.5rem 1.75rem', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(226,224,218,.28)', marginBottom: '.6rem', fontFamily: "'DM Sans',sans-serif" }}>Plan actuel</div>
                <div style={{ fontSize: 'clamp(1.3rem,2.2vw,1.7rem)', fontWeight: 500, color: cur.color, letterSpacing: -.5, lineHeight: 1, fontFamily: "'DM Sans',sans-serif", marginBottom: '.3rem' }}>{cur.name}</div>
                <div style={{ fontSize: 11, color: 'rgba(226,224,218,.3)', fontFamily: "'DM Sans',sans-serif" }}>{cur.limit} · {cur.price}</div>
              </div>
              {plan !== 'free' && <button className="bl-manage" onClick={manage}>Gérer la facturation</button>}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginTop: '1.4rem', paddingTop: '1.4rem', borderTop: '0.5px solid rgba(255,255,255,.07)' }}>
              {[
                { label: 'Trades ce mois', value: tradeCount, showBar: plan === 'free', barPct: (tradeCount / 1500) * 100, barColor: tradeCount > 1200 ? '#f43f5e' : '#10b981' },
                { label: 'Alertes ce mois', value: alertCount, showBar: false, barPct: 0, barColor: '' },
              ].map((item, i) => (
                <div key={i}>
                  <div style={{ fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', color: 'rgba(226,224,218,.25)', marginBottom: '.5rem', fontFamily: "'DM Sans',sans-serif" }}>{item.label}</div>
                  <div style={{ fontSize: 'clamp(1.2rem,2vw,1.5rem)', fontWeight: 500, color: 'rgba(226,224,218,.75)', fontVariantNumeric: 'tabular-nums', fontFamily: "'JetBrains Mono',monospace", letterSpacing: -.5, marginBottom: item.showBar ? '.5rem' : 0 }}>
                    {item.value}
                  </div>
                  {item.showBar && (
                    <div style={{ height: 3, background: 'rgba(255,255,255,.06)', borderRadius: 2 }}>
                      <div style={{ height: '100%', width: `${Math.min(100, item.barPct)}%`, background: item.barColor, borderRadius: 2, transition: 'width .5s' }} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Upgrades */}
          {plan !== 'team' && (
            <>
              <div style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(226,224,218,.25)', marginBottom: '1rem', fontFamily: "'DM Sans',sans-serif" }}>Évoluer</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                {UPGRADES.filter(u => u.id !== plan).map(u => (
                  <div key={u.id} style={{ ...CARD, padding: '1.5rem', borderLeft: `2px solid ${u.dot}44` }}>
                    <div style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(226,224,218,.3)', marginBottom: '.6rem', fontFamily: "'DM Sans',sans-serif" }}>{u.name}</div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, marginBottom: '1.1rem' }}>
                      <span style={{ fontSize: 'clamp(1.4rem,2.2vw,1.8rem)', fontWeight: 500, color: '#fff', fontFamily: "'JetBrains Mono',monospace", letterSpacing: -1, fontVariantNumeric: 'tabular-nums' }}>{u.price}</span>
                      <span style={{ color: 'rgba(226,224,218,.3)', fontSize: 11, fontFamily: "'DM Sans',sans-serif" }}>{u.period}</span>
                    </div>
                    <ul style={{ margin: '0 0 1.25rem', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 7 }}>
                      {u.features.map(f => (
                        <li key={f} style={{ display: 'flex', gap: 7, color: 'rgba(226,224,218,.5)', fontSize: 12, fontFamily: "'DM Sans',sans-serif", lineHeight: 1.4 }}>
                          <span style={{ color: u.dot, flexShrink: 0, marginTop: 1 }}>✓</span>{f}
                        </li>
                      ))}
                    </ul>
                    <button className="bl-cta" onClick={() => upgrade(u.id)} style={{ background: u.dot, color: '#fff' }}>{u.cta}</button>
                  </div>
                ))}
              </div>
            </>
          )}
        </main>
      </AppShell>
    </>
  )
}
