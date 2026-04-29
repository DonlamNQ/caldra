'use client'

import AppShell from '@/components/AppShell'

type Plan = 'pro' | 'sentinel'

interface BillingClientProps {
  userEmail: string
  plan: Plan
  tradeCount: number
  alertCount: number
  hasSubscription: boolean
}

const PLAN_INFO: Record<Plan, { name: string; color: string; price: string; desc: string }> = {
  pro:      { name: 'Pro',      color: '#e2e0da',  price: '19€ / mois', desc: 'Surveillance comportementale complète' },
  sentinel: { name: 'Sentinel', color: '#dc503c',  price: '39€ / mois', desc: 'Pro + IA coaching & debriefing' },
}

const SENTINEL_FEATURES = [
  '9e détecteur : Trade pendant les news',
  'Coach IA pendant la session',
  'Debriefing automatique post-session',
  'Analyse des patterns récurrents',
  'Historique & analytics 180 jours',
  'Support prioritaire',
]

export default function BillingClient({ userEmail, plan, tradeCount, alertCount, hasSubscription }: BillingClientProps) {
  const cur = PLAN_INFO[plan]

  async function manage() {
    const res = await fetch('/api/billing/portal', { method: 'POST' })
    const d = await res.json()
    if (d.url) window.location.href = d.url
  }

  const CARD: React.CSSProperties = {
    background: '#0f0f17',
    border: '0.5px solid rgba(255,255,255,.065)',
    borderRadius: 10,
    position: 'relative',
    overflow: 'hidden',
  }

  return (
    <>
      <style>{`
        @keyframes blFadeIn{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}
        .bl-manage{font-size:9px;padding:6px 12px;background:transparent;border:0.5px solid rgba(255,255,255,.1);border-radius:5px;color:rgba(226,224,218,.4);cursor:pointer;letter-spacing:1.5px;text-transform:uppercase;font-family:'DM Sans',sans-serif;transition:all .15s}
        .bl-manage:hover{background:rgba(255,255,255,.04);color:rgba(226,224,218,.7)}
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
                <div style={{ fontSize: 11, color: 'rgba(226,224,218,.3)', fontFamily: "'DM Sans',sans-serif" }}>{cur.desc} · {cur.price}</div>
              </div>
              {hasSubscription && <button className="bl-manage" onClick={manage}>Gérer la facturation</button>}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginTop: '1.4rem', paddingTop: '1.4rem', borderTop: '0.5px solid rgba(255,255,255,.07)' }}>
              {[
                { label: 'Trades ce mois', value: tradeCount },
                { label: 'Alertes ce mois', value: alertCount },
              ].map((item, i) => (
                <div key={i}>
                  <div style={{ fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', color: 'rgba(226,224,218,.25)', marginBottom: '.5rem', fontFamily: "'DM Sans',sans-serif" }}>{item.label}</div>
                  <div style={{ fontSize: 'clamp(1.2rem,2vw,1.5rem)', fontWeight: 500, color: 'rgba(226,224,218,.75)', fontVariantNumeric: 'tabular-nums', fontFamily: "'JetBrains Mono',monospace", letterSpacing: -.5 }}>
                    {item.value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Upgrade vers Sentinel */}
          {plan === 'pro' && (
            <>
              <div style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(226,224,218,.25)', marginBottom: '1rem', fontFamily: "'DM Sans',sans-serif" }}>Passer au niveau supérieur</div>
              <div style={{ ...CARD, padding: '1.5rem', borderLeft: '2px solid rgba(220,80,60,.35)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.1rem' }}>
                  <div>
                    <div style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(220,80,60,.6)', marginBottom: '.5rem', fontFamily: "'DM Sans',sans-serif" }}>Sentinel</div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
                      <span style={{ fontSize: 'clamp(1.4rem,2.2vw,1.8rem)', fontWeight: 500, color: '#fff', fontFamily: "'JetBrains Mono',monospace", letterSpacing: -1, fontVariantNumeric: 'tabular-nums' }}>39€</span>
                      <span style={{ color: 'rgba(226,224,218,.3)', fontSize: 11, fontFamily: "'DM Sans',sans-serif" }}>/mois</span>
                    </div>
                  </div>
                  <div style={{ fontSize: 9, padding: '3px 10px', background: 'rgba(220,80,60,.07)', border: '0.5px solid rgba(220,80,60,.22)', borderRadius: 100, color: 'rgba(220,80,60,.55)', letterSpacing: 1, textTransform: 'uppercase', fontFamily: "'DM Sans',sans-serif", whiteSpace: 'nowrap' }}>
                    Bientôt disponible
                  </div>
                </div>
                <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {SENTINEL_FEATURES.map(f => (
                    <li key={f} style={{ display: 'flex', gap: 8, color: 'rgba(226,224,218,.42)', fontSize: 12, fontFamily: "'DM Sans',sans-serif", lineHeight: 1.4 }}>
                      <span style={{ color: '#dc503c', flexShrink: 0, marginTop: 1 }}>✓</span>{f}
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}

        </main>
      </AppShell>
    </>
  )
}
