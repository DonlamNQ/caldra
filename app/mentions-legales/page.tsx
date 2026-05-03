export default function MentionsLegales() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        body{background:#08080d;color:#e2e8f0;font-family:'DM Sans',sans-serif}
        a{color:rgba(124,58,237,.8);text-decoration:none}
        a:hover{text-decoration:underline}
        h1{font-size:clamp(1.6rem,3vw,2.2rem);font-weight:200;letter-spacing:-1px;color:#fff;margin-bottom:2rem;line-height:1.1}
        h2{font-size:1rem;font-weight:500;color:rgba(226,232,240,.75);margin:2rem 0 .75rem;letter-spacing:.5px}
        p,li{font-size:14px;color:rgba(226,232,240,.5);line-height:1.8;font-weight:300}
        li{margin-left:1.25rem;margin-bottom:.35rem}
        .tag{font-size:11px;letter-spacing:2px;text-transform:uppercase;color:rgba(124,58,237,.55);margin-bottom:1rem}
      `}</style>
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 3rem', borderBottom: '.5px solid rgba(255,255,255,.07)', backdropFilter: 'blur(16px)', background: 'rgba(8,8,13,.9)', fontFamily: "'DM Sans',sans-serif" }}>
        <a href="/" style={{ fontWeight: 300, fontSize: 14, letterSpacing: 5, textTransform: 'uppercase', color: '#fff', textDecoration: 'none' }}>
          Cald<span style={{ color: '#7c3aed' }}>ra</span>
        </a>
        <a href="/" style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: 'rgba(226,232,240,.4)', padding: '7px 16px', border: '.5px solid rgba(255,255,255,.12)', borderRadius: 4 }}>← Retour</a>
      </nav>

      <main style={{ maxWidth: 720, margin: '0 auto', padding: '9rem 2rem 5rem' }}>
        <div className="tag">Légal</div>
        <h1>Mentions légales &amp;<br />Conditions d&rsquo;utilisation</h1>

        <h2>1. Éditeur du site</h2>
        <p>Caldra est édité par Alhamdou KONE, auto-entrepreneur.<br />
        Email de contact : <a href="mailto:contact@getcaldra.com">contact@getcaldra.com</a><br />
        Site web : <a href="https://getcaldra.com">getcaldra.com</a></p>

        <h2>2. Hébergement</h2>
        <p>Le site est hébergé par Vercel Inc., 340 Pine Street, Suite 700, San Francisco, CA 94104, États-Unis.</p>

        <h2>3. Propriété intellectuelle</h2>
        <p>L'ensemble du contenu de ce site (textes, images, algorithmes, interfaces) est la propriété exclusive de Caldra. Toute reproduction, même partielle, est interdite sans autorisation écrite préalable.</p>

        <h2>4. Conditions d&rsquo;utilisation</h2>
        <p>En utilisant Caldra, vous acceptez les présentes conditions :</p>
        <ul style={{ marginTop: '.75rem' }}>
          <li>Le service est fourni à titre de <strong style={{ color: 'rgba(226,232,240,.65)' }}>surveillance comportementale</strong> et ne constitue pas un conseil financier.</li>
          <li>Caldra ne peut être tenu responsable des décisions de trading prises à partir de ses alertes.</li>
          <li>L'accès au service est réservé aux personnes majeures.</li>
          <li>Tout usage frauduleux ou malveillant entraîne la résiliation immédiate du compte.</li>
        </ul>

        <h2>5. Abonnements et résiliation</h2>
        <p>Les abonnements sont mensuels et résiliables à tout moment depuis la page Billing. La résiliation prend effet à la fin de la période en cours. Aucun remboursement n'est effectué pour une période déjà commencée.</p>

        <h2>6. Limitation de responsabilité</h2>
        <p>Caldra est un outil d'aide à la discipline de trading. Les performances passées ne préjugent pas des performances futures. L'utilisateur reste seul responsable de ses décisions d'investissement.</p>

        <h2>7. Droit applicable</h2>
        <p>Les présentes conditions sont soumises au droit français. Tout litige relève de la compétence des tribunaux français.</p>

        <div style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '.5px solid rgba(255,255,255,.07)', fontSize: 13, color: 'rgba(226,232,240,.25)' }}>
          Dernière mise à jour : mai 2026
        </div>
      </main>

      <footer style={{ borderTop: '.5px solid rgba(255,255,255,.07)', padding: '1.5rem 3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'rgba(226,232,240,.2)', fontSize: 12, fontFamily: "'DM Sans',sans-serif" }}>
        <span>© 2026 Caldra</span>
        <div style={{ display: 'flex', gap: '2rem' }}>
          <a href="/mentions-legales" style={{ color: 'rgba(226,232,240,.35)' }}>CGU</a>
          <a href="/confidentialite" style={{ color: 'rgba(226,232,240,.35)' }}>Confidentialité</a>
          <a href="/support" style={{ color: 'rgba(226,232,240,.35)' }}>Support</a>
        </div>
      </footer>
    </>
  )
}
