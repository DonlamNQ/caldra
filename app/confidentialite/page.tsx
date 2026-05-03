export default function Confidentialite() {
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
        <div className="tag">RGPD</div>
        <h1>Politique de<br />confidentialité</h1>

        <h2>1. Données collectées</h2>
        <p>Caldra collecte uniquement les données nécessaires au fonctionnement du service :</p>
        <ul style={{ marginTop: '.75rem' }}>
          <li><strong style={{ color: 'rgba(226,232,240,.65)' }}>Email</strong> — pour l'authentification et les notifications</li>
          <li><strong style={{ color: 'rgba(226,232,240,.65)' }}>Données de trading</strong> — symbole, direction, taille, prix, PnL, horodatage (envoyées via l'API)</li>
          <li><strong style={{ color: 'rgba(226,232,240,.65)' }}>Règles de session</strong> — drawdown max, horaires, seuils de risque configurés par l'utilisateur</li>
        </ul>

        <h2>2. Finalités du traitement</h2>
        <p>Les données sont utilisées exclusivement pour :</p>
        <ul style={{ marginTop: '.75rem' }}>
          <li>Analyser le comportement de trading en temps réel</li>
          <li>Générer des alertes comportementales personnalisées</li>
          <li>Calculer le score de session</li>
          <li>Produire des analytics de performance</li>
        </ul>

        <h2>3. Base légale</h2>
        <p>Le traitement est fondé sur l'exécution du contrat d'abonnement (Art. 6.1.b RGPD).</p>

        <h2>4. Durée de conservation</h2>
        <p>Les données de trading sont conservées 12 mois. Les données de compte sont supprimées dans les 30 jours suivant la résiliation, sur demande.</p>

        <h2>5. Sous-traitants</h2>
        <ul style={{ marginTop: '.75rem' }}>
          <li><strong style={{ color: 'rgba(226,232,240,.65)' }}>Supabase</strong> — base de données (hébergement UE disponible)</li>
          <li><strong style={{ color: 'rgba(226,232,240,.65)' }}>Vercel</strong> — hébergement de l'application</li>
          <li><strong style={{ color: 'rgba(226,232,240,.65)' }}>Stripe</strong> — traitement des paiements (données de carte jamais stockées)</li>
          <li><strong style={{ color: 'rgba(226,232,240,.65)' }}>Anthropic</strong> — analyse IA (plan Sentinel uniquement, données anonymisées)</li>
        </ul>

        <h2>6. Vos droits</h2>
        <p>Conformément au RGPD, vous disposez des droits d'accès, de rectification, d'effacement, de portabilité et d'opposition. Pour exercer ces droits : <a href="mailto:contact@getcaldra.com">contact@getcaldra.com</a></p>

        <h2>7. Cookies</h2>
        <p>Caldra utilise uniquement des cookies de session strictement nécessaires à l'authentification (Supabase Auth). Aucun cookie publicitaire ou de tracking tiers.</p>

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
