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

  const BG   = '#08080d'
  const SF   = '#0d0d1a'
  const BORD = 'rgba(255,255,255,.07)'
  const TX   = '#eae8f5'
  const TE   = 'rgba(234,232,245,.35)'
  const VIO  = '#7c3aed'
  const GRN  = '#00d17a'

  return (
    <>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        body{background:${BG};font-family:var(--font-geist-sans),'Geist',sans-serif;color:${TX};min-height:100vh;display:flex;align-items:center;justify-content:center}
      `}</style>

      <div style={{ width: '100%', maxWidth: 480, margin: '0 auto', padding: '0 24px' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 44 }}>
          <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: 8, textTransform: 'uppercase', color: TX, display: 'inline-block' }}>
            Cald<span style={{ color: VIO }}>ra</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 7, textTransform: 'uppercase', color: TE, marginTop: 4, letterSpacing: 0 }}>
            {'SESSION'.split('').map((c, i) => <span key={i}>{c}</span>)}
          </div>
        </div>

        {/* Card */}
        <div style={{ background: SF, border: `1px solid ${BORD}`, borderRadius: 16, padding: '52px 44px', position: 'relative', overflow: 'hidden' }}>

          {/* Top accent bar */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 1,
            background: isSuccess
              ? `linear-gradient(90deg, transparent, ${GRN}80, transparent)`
              : `linear-gradient(90deg, transparent, ${BORD}, transparent)`,
          }} />

          {/* Icon */}
          <div style={{
            width: 52, height: 52, borderRadius: '50%', margin: '0 auto 24px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: isSuccess ? `${GRN}12` : 'rgba(255,255,255,.04)',
            border: `1px solid ${isSuccess ? `${GRN}33` : BORD}`,
          }}>
            {isSuccess ? (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={GRN} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={TE} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            )}
          </div>

          {/* Title */}
          <div style={{ fontSize: 20, fontWeight: 600, color: TX, textAlign: 'center', marginBottom: 8 }}>
            {isSuccess ? 'Abonnement activé' : 'Paiement annulé'}
          </div>

          {/* Subtitle */}
          <div style={{ fontSize: 13, color: TE, textAlign: 'center', lineHeight: 1.6, marginBottom: 32 }}>
            {isSuccess
              ? 'Ton accès est maintenant actif. Bonne session.'
              : "Aucun montant n'a été débité. Tu peux réessayer à tout moment."}
          </div>

          {/* CTA */}
          <Link
            href={isSuccess ? '/dashboard' : '/dashboard'}
            style={{
              display: 'block', textAlign: 'center', padding: '11px',
              borderRadius: 8, fontSize: 13, fontWeight: 500, textDecoration: 'none',
              background: isSuccess ? VIO : 'transparent',
              color: isSuccess ? '#fff' : TE,
              border: isSuccess ? 'none' : `1px solid ${BORD}`,
            }}
          >
            {isSuccess ? 'Accéder au dashboard →' : '← Retour au dashboard'}
          </Link>
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: 16, fontSize: 10.5, color: TE, letterSpacing: 0.3 }}>
          {isSuccess ? 'Un email de confirmation Stripe a été envoyé.' : ''}
        </div>
      </div>
    </>
  )
}
