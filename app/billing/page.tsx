import Link from 'next/link'

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; canceled?: string }>
}) {
  const params = await searchParams
  const isSuccess  = params.success  === '1'
  const isCanceled = params.canceled === '1'

  if (!isSuccess && !isCanceled) {
    const { redirect } = await import('next/navigation')
    redirect('/dashboard')
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        body{background:#08080d;font-family:'DM Sans',sans-serif;color:#e2e8f0;min-height:100vh;display:flex;align-items:center;justify-content:center}
      `}</style>

      <div style={{
        width: '100%',
        maxWidth: 440,
        margin: '0 auto',
        padding: '0 24px',
      }}>
        {/* Logo */}
        <div style={{
          textAlign: 'center',
          marginBottom: 40,
          fontWeight: 300,
          fontSize: 13,
          letterSpacing: 6,
          textTransform: 'uppercase',
          color: 'rgba(226,232,240,.35)',
        }}>
          Cald<span style={{ color: '#dc503c' }}>ra</span>
        </div>

        {/* Card */}
        <div style={{
          background: '#0d0d1a',
          border: '1px solid #1e1e35',
          borderRadius: 16,
          padding: '40px 36px',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Top bar */}
          <div style={{
            position: 'absolute',
            top: 0, left: 0, right: 0,
            height: 2,
            background: isSuccess
              ? 'linear-gradient(90deg, transparent, #00c97a, transparent)'
              : 'linear-gradient(90deg, transparent, #475569, transparent)',
          }} />

          {/* Icon */}
          <div style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: isSuccess ? 'rgba(0,201,122,.1)' : 'rgba(71,85,105,.12)',
            border: `1px solid ${isSuccess ? 'rgba(0,201,122,.25)' : 'rgba(71,85,105,.3)'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px',
          }}>
            {isSuccess ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00c97a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            )}
          </div>

          {/* Title */}
          <h1 style={{
            fontSize: 22,
            fontWeight: 300,
            letterSpacing: -0.5,
            color: '#fff',
            textAlign: 'center',
            marginBottom: 10,
            lineHeight: 1.2,
          }}>
            {isSuccess ? 'Abonnement activé' : 'Paiement annulé'}
          </h1>

          {/* Subtitle */}
          <p style={{
            fontSize: 14,
            color: '#475569',
            textAlign: 'center',
            lineHeight: 1.65,
            marginBottom: 32,
            fontWeight: 300,
          }}>
            {isSuccess
              ? 'Ton accès est maintenant actif. Bonne session.'
              : 'Aucun montant n\'a été débité. Tu peux réessayer à tout moment.'}
          </p>

          {/* CTA */}
          <Link
            href={isSuccess ? '/dashboard' : '/'}
            style={{
              display: 'block',
              textAlign: 'center',
              padding: '13px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 500,
              textDecoration: 'none',
              letterSpacing: 0.3,
              background: isSuccess ? '#dc503c' : 'transparent',
              color: isSuccess ? '#fff' : '#94a3b8',
              border: isSuccess ? 'none' : '1px solid #1e1e35',
              transition: 'opacity .2s',
            }}
          >
            {isSuccess ? 'Accéder au dashboard →' : '← Retour'}
          </Link>
        </div>

        {/* Footer */}
        <p style={{
          textAlign: 'center',
          marginTop: 20,
          fontSize: 11,
          color: 'rgba(226,232,240,.18)',
          letterSpacing: 0.3,
        }}>
          {isSuccess
            ? 'Un email de confirmation Stripe a été envoyé.'
            : <>Un problème ? <a href="/support" style={{ color: 'rgba(220,80,60,.5)', textDecoration: 'none' }}>Contact</a></>}
        </p>
      </div>
    </>
  )
}
