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
  pro:      { name: 'Pro',      color: '#e2e0da',  price: '29€ / mois', desc: 'Surveillance comportementale complète' },
  sentinel: { name: 'Sentinel', color: '#7c3aed',  price: '39€ / mois', desc: 'Pro + IA coaching & debriefing' },
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

  async function checkout(planKey: 'pro' | 'sentinel') {
    const res = await fetch('/api/billing/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan: planKey }),
    })
    const d = await res.json()
    if (d.url) window.location.href = d.url
  }

  const CARD: React.CSSProperties = {
    background: '#0d0d1a',
    border: '0.5px solid rgba(255,255,255,.07)',
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
            <div style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(124,58,237,.55)', marginBottom: '.4rem', fontFamily: "'DM Sans',sans-serif" }}>Compte</div>
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
                  <div style={{ fontSize: 'clamp(1.2rem,2vw,1.5rem)', fontWeight: 500, color: 'rgba(226,224,218,.75)', fontVariantNumeric: 'tabular-nums', fontFamily: "var(--font-geist-mono),monospace", letterSpacing: -.5 }}>
                    {item.value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Upgrade / subscribe */}
          {!hasSubscription && (
            <>
              <div style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(226,224,218,.25)', marginBottom: '1rem', fontFamily: "'DM Sans',sans-serif" }}>Choisir un plan</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                {/* Pro */}
                <div style={{ ...CARD, padding: '1.5rem' }}>
                  <div style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(226,224,218,.35)', marginBottom: '.5rem', fontFamily: "'DM Sans',sans-serif" }}>Pro</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, marginBottom: '1rem' }}>
                    <span style={{ fontSize: '1.7rem', fontWeight: 500, color: '#fff', fontFamily: "var(--font-geist-mono),monospace", letterSpacing: -1 }}>29€</span>
                    <span style={{ color: 'rgba(226,224,218,.3)', fontSize: 11, fontFamily: "'DM Sans',sans-serif" }}>/mois</span>
                  </div>
                  <button onClick={() => checkout('pro')} style={{ width: '100%', padding: '10px', background: 'transparent', border: '0.5px solid rgba(255,255,255,.15)', borderRadius: 7, color: 'rgba(226,224,218,.7)', fontSize: 12, fontFamily: "'DM Sans',sans-serif", cursor: 'pointer', letterSpacing: .5, transition: 'all .15s' }}>
                    Commencer avec Pro →
                  </button>
                </div>
                {/* Sentinel */}
                <div style={{ ...CARD, padding: '1.5rem', borderLeft: '2px solid rgba(124,58,237,.4)' }}>
                  <div style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(124,58,237,.6)', marginBottom: '.5rem', fontFamily: "'DM Sans',sans-serif" }}>Sentinel</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, marginBottom: '1rem' }}>
                    <span style={{ fontSize: '1.7rem', fontWeight: 500, color: '#fff', fontFamily: "var(--font-geist-mono),monospace", letterSpacing: -1 }}>39€</span>
                    <span style={{ color: 'rgba(226,224,218,.3)', fontSize: 11, fontFamily: "'DM Sans',sans-serif" }}>/mois</span>
                  </div>
                  <ul style={{ margin: '0 0 1rem', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {SENTINEL_FEATURES.map(f => (
                      <li key={f} style={{ display: 'flex', gap: 8, color: 'rgba(226,224,218,.35)', fontSize: 11, fontFamily: "'DM Sans',sans-serif", lineHeight: 1.4 }}>
                        <span style={{ color: '#7c3aed', flexShrink: 0 }}>✓</span>{f}
                      </li>
                    ))}
                  </ul>
                  <button onClick={() => checkout('sentinel')} style={{ width: '100%', padding: '10px', background: 'rgba(124,58,237,.12)', border: '0.5px solid rgba(124,58,237,.35)', borderRadius: 7, color: '#c4b5fd', fontSize: 12, fontFamily: "'DM Sans',sans-serif", cursor: 'pointer', letterSpacing: .5, transition: 'all .15s' }}>
                    Commencer avec Sentinel →
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Upgrade Pro → Sentinel */}
          {hasSubscription && plan === 'pro' && (
            <>
              <div style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(226,224,218,.25)', marginBottom: '1rem', fontFamily: "'DM Sans',sans-serif" }}>Passer au niveau supérieur</div>
              <div style={{ ...CARD, padding: '1.5rem', borderLeft: '2px solid rgba(124,58,237,.35)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.1rem' }}>
                  <div>
                    <div style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(124,58,237,.6)', marginBottom: '.5rem', fontFamily: "'DM Sans',sans-serif" }}>Sentinel</div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
                      <span style={{ fontSize: 'clamp(1.4rem,2.2vw,1.8rem)', fontWeight: 500, color: '#fff', fontFamily: "var(--font-geist-mono),monospace", letterSpacing: -1, fontVariantNumeric: 'tabular-nums' }}>39€</span>
                      <span style={{ color: 'rgba(226,224,218,.3)', fontSize: 11, fontFamily: "'DM Sans',sans-serif" }}>/mois</span>
                    </div>
                  </div>
                </div>
                <ul style={{ margin: '0 0 1.25rem', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {SENTINEL_FEATURES.map(f => (
                    <li key={f} style={{ display: 'flex', gap: 8, color: 'rgba(226,224,218,.42)', fontSize: 12, fontFamily: "'DM Sans',sans-serif", lineHeight: 1.4 }}>
                      <span style={{ color: '#7c3aed', flexShrink: 0, marginTop: 1 }}>✓</span>{f}
                    </li>
                  ))}
                </ul>
                <button onClick={() => checkout('sentinel')} style={{ width: '100%', padding: '10px', background: 'rgba(124,58,237,.12)', border: '0.5px solid rgba(124,58,237,.35)', borderRadius: 7, color: '#c4b5fd', fontSize: 13, fontFamily: "'DM Sans',sans-serif", cursor: 'pointer', letterSpacing: .5 }}>
                  Passer à Sentinel →
                </button>
              </div>
            </>
          )}

        </main>
      </AppShell>
    </>
  )
}
