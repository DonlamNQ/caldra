import Link from 'next/link'

export default function NotFound() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        body{background:#08080d;font-family:'DM Sans',sans-serif;color:#e2e8f0;min-height:100vh;display:flex;align-items:center;justify-content:center}
      `}</style>

      <div style={{ width: '100%', maxWidth: 420, margin: '0 auto', padding: '0 24px', textAlign: 'center' }}>

        <div style={{ fontSize: 11, letterSpacing: 6, textTransform: 'uppercase', color: 'rgba(226,232,240,.2)', marginBottom: 40, fontWeight: 300 }}>
          Cald<span style={{ color: 'rgba(124,58,237,.5)' }}>ra</span>
        </div>

        <div style={{
          fontSize: 96, fontWeight: 200, letterSpacing: -6, color: 'rgba(255,255,255,.06)',
          lineHeight: 1, marginBottom: 32, fontFamily: "'DM Sans', sans-serif",
          userSelect: 'none',
        }}>
          404
        </div>

        <h1 style={{ fontSize: 22, fontWeight: 300, letterSpacing: -0.5, color: '#fff', marginBottom: 12, lineHeight: 1.2 }}>
          Cette page n&rsquo;existe pas.
        </h1>
        <p style={{ fontSize: 14, color: '#475569', lineHeight: 1.65, marginBottom: 36, fontWeight: 300 }}>
          Tu t&rsquo;es perdu entre deux trades. Ça arrive.
        </p>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/" style={{
            padding: '11px 24px', background: 'rgba(124,58,237,.1)', border: '0.5px solid rgba(124,58,237,.3)',
            borderRadius: 8, color: '#7c3aed', fontSize: 13, fontWeight: 500, textDecoration: 'none',
            letterSpacing: 0.3, transition: 'all .2s',
          }}>
            ← Accueil
          </Link>
          <Link href="/dashboard" style={{
            padding: '11px 24px', background: 'transparent', border: '0.5px solid #1e1e35',
            borderRadius: 8, color: '#475569', fontSize: 13, textDecoration: 'none',
            letterSpacing: 0.3,
          }}>
            Dashboard
          </Link>
        </div>

      </div>
    </>
  )
}
