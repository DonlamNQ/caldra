const PLANS = [
  {
    name: 'Free',
    price: 0,
    period: '',
    description: 'Pour découvrir Caldra',
    features: [
      '50 trades analysés / jour',
      '6 détecteurs comportementaux',
      'Score de session',
      'Alertes email',
      'Historique 7 jours',
    ],
    cta: 'Commencer gratuitement',
    href: '/signup',
    highlight: false,
  },
  {
    name: 'Pro',
    price: 19,
    period: '/ mois',
    description: 'Pour les traders sérieux',
    features: [
      'Trades illimités',
      '9 détecteurs + IA coaching',
      'Score de session temps réel',
      'Alertes Slack / Webhook',
      'Historique illimité',
      'Export CSV',
      'Clé API dédiée',
    ],
    cta: 'Démarrer Pro',
    href: '/signup',
    highlight: true,
  },
  {
    name: 'Team',
    price: 39,
    period: '/ mois',
    description: 'Pour les prop firms et coaches',
    features: [
      'Tout Pro, jusqu\'à 5 traders',
      'Dashboard consolidé',
      'Alertes coach en temps réel',
      'Rapport hebdomadaire PDF',
      'SSO + gestion des membres',
      'Support prioritaire',
    ],
    cta: 'Contacter l\'équipe',
    href: 'mailto:hello@caldra.app',
    highlight: false,
  },
]

export default function PricingPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#08080d', color: '#e2e8f0', fontFamily: 'system-ui, sans-serif', padding: '0 24px' }}>
      {/* Header */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 60, borderBottom: '1px solid #1e1e35', marginBottom: 64 }}>
        <a href="/" style={{ fontWeight: 800, fontSize: 20, letterSpacing: '-0.02em', color: '#e2e8f0', textDecoration: 'none' }}>caldra</a>
        <div style={{ display: 'flex', gap: 16 }}>
          <a href="/login" style={{ color: '#64748b', fontSize: 14, textDecoration: 'none' }}>Connexion</a>
          <a href="/signup" style={{ background: '#e2e8f0', color: '#08080d', fontSize: 14, fontWeight: 600, padding: '6px 16px', borderRadius: 8, textDecoration: 'none' }}>
            Essai gratuit
          </a>
        </div>
      </header>

      {/* Hero */}
      <div style={{ textAlign: 'center', marginBottom: 64 }}>
        <h1 style={{ margin: '0 0 12px', fontSize: 40, fontWeight: 800, letterSpacing: '-0.03em' }}>
          Tarifs simples et transparents
        </h1>
        <p style={{ margin: 0, color: '#475569', fontSize: 17 }}>
          Commencez gratuitement. Évoluez quand vous êtes prêt.
        </p>
      </div>

      {/* Plans */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, maxWidth: 960, margin: '0 auto 80px' }}>
        {PLANS.map(plan => (
          <div
            key={plan.name}
            style={{
              background: plan.highlight ? '#0d0d1a' : '#09090f',
              border: `1px solid ${plan.highlight ? '#3b3b6b' : '#1e1e35'}`,
              borderRadius: 16,
              padding: '28px 24px',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
              boxShadow: plan.highlight ? '0 0 40px #1e1e5540' : 'none',
            }}
          >
            {plan.highlight && (
              <span style={{
                position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
                background: '#e2e8f0', color: '#08080d', fontSize: 11, fontWeight: 700,
                padding: '3px 12px', borderRadius: 20, letterSpacing: '0.06em',
              }}>
                RECOMMANDÉ
              </span>
            )}
            <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {plan.name}
            </p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, margin: '0 0 6px' }}>
              <span style={{ fontSize: 36, fontWeight: 800, fontFamily: 'monospace' }}>
                {plan.price === 0 ? 'Gratuit' : `${plan.price}€`}
              </span>
              {plan.period && <span style={{ color: '#475569', fontSize: 14 }}>{plan.period}</span>}
            </div>
            <p style={{ margin: '0 0 24px', color: '#475569', fontSize: 13 }}>{plan.description}</p>

            <ul style={{ margin: '0 0 28px', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
              {plan.features.map(f => (
                <li key={f} style={{ display: 'flex', gap: 8, color: '#94a3b8', fontSize: 14 }}>
                  <span style={{ color: '#22c55e', flexShrink: 0 }}>✓</span>
                  {f}
                </li>
              ))}
            </ul>

            <a
              href={plan.href}
              style={{
                display: 'block', textAlign: 'center', padding: '11px',
                borderRadius: 8, fontSize: 14, fontWeight: 700, textDecoration: 'none',
                background: plan.highlight ? '#e2e8f0' : 'transparent',
                color: plan.highlight ? '#08080d' : '#64748b',
                border: plan.highlight ? 'none' : '1px solid #1e1e35',
              }}
            >
              {plan.cta}
            </a>
          </div>
        ))}
      </div>
    </div>
  )
}
