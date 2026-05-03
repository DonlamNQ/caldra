'use client'

const CSS = `
*{margin:0;padding:0;box-sizing:border-box;scroll-behavior:smooth}
:root{--red:#7c3aed;--rd:rgba(124,58,237,.1);--rb:rgba(124,58,237,.25);--bg:#08080d;--sf:#0f0f16;--sf2:#141420;--b:rgba(255,255,255,.07);--b2:rgba(255,255,255,.12);--tx:#e8e6e0;--tm:rgba(232,230,224,.45);--td:rgba(232,230,224,.2)}
body{font-family:'DM Sans',sans-serif;background:var(--bg);color:var(--tx);min-height:100vh;overflow-x:hidden}
nav{position:fixed;top:0;left:0;right:0;z-index:100;display:flex;justify-content:space-between;align-items:center;padding:1.25rem 3rem;border-bottom:.5px solid var(--b);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);background:rgba(8,8,13,.88)}
.logo-block{display:flex;flex-direction:column;gap:5px}
.logo{font-family:'DM Sans',sans-serif;font-weight:300;font-size:14px;letter-spacing:5px;text-transform:uppercase;color:#fff;line-height:1}
.logo span{color:var(--red)}
.logo-sub{font-size:8px;font-weight:400;letter-spacing:8.2px;text-transform:uppercase;color:rgba(255,255,255,.6);line-height:1;display:block}
.nc{font-size:10px;font-weight:500;letter-spacing:2px;text-transform:uppercase;padding:9px 20px;background:transparent;border:.5px solid rgba(255,255,255,.85);border-radius:4px;color:#fff;cursor:pointer;font-family:'DM Sans',sans-serif;transition:background .2s,color .2s;text-decoration:none}
.nc:hover{background:#fff;color:#08080d}
.bp{padding:9px 20px;background:var(--red);border:none;border-radius:4px;color:#fff;font-size:10px;font-weight:500;letter-spacing:2px;text-transform:uppercase;font-family:'DM Sans',sans-serif;cursor:pointer;text-decoration:none;transition:opacity .2s}
.bp:hover{opacity:.88}
.stag{font-size:11px;letter-spacing:2px;text-transform:uppercase;color:rgba(124,58,237,.6);margin-bottom:1rem}
.stit{font-family:'DM Sans',sans-serif;font-size:clamp(1.9rem,4vw,2.9rem);font-weight:200;letter-spacing:-1px;color:#fff;margin-bottom:1rem;line-height:1.1}
.sdesc{font-size:15px;color:var(--tm);line-height:1.75;max-width:520px;margin-bottom:3rem;font-weight:300}
.pricing-grid{display:grid;grid-template-columns:1fr 1fr;gap:1rem;max-width:780px;margin:0 auto}
.plan-card{border-radius:16px;padding:2rem;position:relative;overflow:hidden}
.plan-pro{background:var(--sf);border:.5px solid var(--b2)}
.plan-sentinel{background:linear-gradient(135deg,rgba(124,58,237,.07) 0%,var(--sf) 55%);border:.5px solid rgba(124,58,237,.35)}
.plan-shine{position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,.08),transparent)}
.plan-shine-red{background:linear-gradient(90deg,transparent,rgba(124,58,237,.6),transparent)}
.plan-label{font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:rgba(232,230,224,.3);margin-bottom:1.5rem}
.plan-label-red{color:rgba(124,58,237,.7)}
.plan-price{font-family:'DM Sans',sans-serif;font-size:42px;font-weight:200;color:#fff;letter-spacing:2px;line-height:1;margin-bottom:.25rem}
.plan-price sup{font-size:20px;vertical-align:super;letter-spacing:0}
.plan-price sub{font-size:14px;font-weight:400;color:var(--tm);letter-spacing:0}
.plan-note{font-size:12px;color:var(--td);margin-bottom:1.5rem}
.plan-tagline{font-size:13px;color:rgba(255,255,255,.5);font-style:italic;line-height:1.55;padding:1rem 0;border-top:.5px solid var(--b);border-bottom:.5px solid var(--b);margin-bottom:1.5rem}
.plan-tagline strong{font-style:normal;font-weight:500;color:rgba(255,255,255,.75)}
.plan-sentinel .plan-tagline{border-color:rgba(124,58,237,.15)}
.plan-features{list-style:none;margin-bottom:2rem}
.plan-features li{font-size:13px;color:rgba(255,255,255,.4);padding:.55rem 0;border-bottom:.5px solid rgba(255,255,255,.04);display:flex;align-items:center;gap:10px}
.plan-features li:last-child{border-bottom:none}
.plan-highlight{color:rgba(255,255,255,.75)!important}
.plan-highlight strong{font-weight:500}
.pfc{width:16px;height:16px;border-radius:4px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.pfc svg{width:9px;height:9px;fill:none;stroke-width:2.5;stroke-linecap:round;stroke-linejoin:round}
.pfc-dim{background:rgba(255,255,255,.05);border:.5px solid rgba(255,255,255,.08)}
.pfc-dim svg{stroke:rgba(255,255,255,.3)}
.pfc-red{background:var(--rd);border:.5px solid var(--rb)}
.pfc-red svg{stroke:var(--red)}
.plan-btn{width:100%;padding:12px;border-radius:8px;font-size:13px;font-weight:500;font-family:'DM Sans',sans-serif;cursor:pointer;transition:all .2s;display:block;text-align:center;text-decoration:none}
.plan-btn-secondary{background:transparent;border:.5px solid var(--b2);color:rgba(255,255,255,.55)}
.plan-btn-secondary:hover{border-color:rgba(255,255,255,.25);color:#fff}
.plan-btn-primary{background:var(--red);border:none;color:#fff}
.plan-btn-primary:hover{opacity:.88}
footer{border-top:.5px solid var(--b);padding:2rem 3rem;display:flex;justify-content:space-between;align-items:center;color:var(--td);font-size:12px}
.fl{font-family:'DM Sans',sans-serif;font-weight:300;font-size:13px;letter-spacing:3px;text-transform:uppercase;color:rgba(255,255,255,.15)}
.fl span{color:rgba(124,58,237,.3)}
@media(max-width:768px){nav{padding:1.25rem 1.5rem}.nc{display:none}.pricing-grid{grid-template-columns:1fr}footer{flex-direction:column;gap:1rem;text-align:center}}
`

export default function PricingPage() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <nav>
        <a href="/" style={{ textDecoration: 'none' }} className="logo-block">
          <div className="logo">Cald<span>ra</span></div>
          <div className="logo-sub">Session</div>
        </a>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <a href="/login" className="nc">Connexion</a>
          <a href="/signup" className="bp">Commencer &rarr;</a>
        </div>
      </nav>

      <section style={{ position: 'relative', zIndex: 1, maxWidth: 940, margin: '0 auto', padding: '9rem 2rem 5rem' }}>
        <div className="stag">Tarifs</div>
        <div className="stit">Simple.<br />Rentabilis&eacute; au premier trade &eacute;vit&eacute;.</div>
        <p className="sdesc">14 jours d&rsquo;essai gratuit. Pas de carte requise.</p>

        <div className="pricing-grid">
          <div className="plan-card plan-pro">
            <div className="plan-shine"></div>
            <div className="plan-label">Pro</div>
            <div className="plan-price"><sup>&euro;</sup>19<sub>/mois</sub></div>
            <div className="plan-note">14 jours gratuits &middot; Sans carte requise</div>
            <div className="plan-tagline">Surveillance comportementale compl&egrave;te. Alertes imm&eacute;diates d&egrave;s qu&rsquo;un pattern dangereux est d&eacute;tect&eacute;.</div>
            <ul className="plan-features">
              <li><div className="pfc pfc-dim"><svg viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3"/></svg></div>8 d&eacute;tections comportementales</li>
              <li><div className="pfc pfc-dim"><svg viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3"/></svg></div>Alertes temps r&eacute;el (push + desktop)</li>
              <li><div className="pfc pfc-dim"><svg viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3"/></svg></div>Dashboard comportemental</li>
              <li><div className="pfc pfc-dim"><svg viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3"/></svg></div>Compatible MT5 &amp; Tradovate</li>
              <li><div className="pfc pfc-dim"><svg viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3"/></svg></div>Historique &amp; analytics 30 jours</li>
              <li><div className="pfc pfc-dim"><svg viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3"/></svg></div>Seuils configurables</li>
            </ul>
            <a href="/signup" className="plan-btn plan-btn-secondary">Commencer gratuit &rarr;</a>
          </div>

          <div className="plan-card plan-sentinel">
            <div className="plan-shine plan-shine-red"></div>
            <div className="plan-label plan-label-red">Sentinel</div>
            <div className="plan-price"><sup>&euro;</sup>39<sub>/mois</sub></div>
            <div className="plan-note">14 jours gratuits &middot; Sans carte requise</div>
            <div className="plan-tagline">Tout le plan Pro, augment&eacute; d&rsquo;un coach IA actif. Analyse, recommandations et debriefing &agrave; chaque session.</div>
            <ul className="plan-features">
              <li><div className="pfc pfc-dim"><svg viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3"/></svg></div><span style={{ color: 'rgba(232,230,224,.3)' }}>Tout le plan Pro, plus&nbsp;:</span></li>
              <li className="plan-highlight"><div className="pfc pfc-red"><svg viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3"/></svg></div><strong>9e d&eacute;tection&nbsp;: Trade pendant les news</strong></li>
              <li className="plan-highlight"><div className="pfc pfc-red"><svg viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3"/></svg></div><strong>Coach IA pendant la session</strong></li>
              <li className="plan-highlight"><div className="pfc pfc-red"><svg viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3"/></svg></div><strong>Debriefing automatique post-session</strong></li>
              <li className="plan-highlight"><div className="pfc pfc-red"><svg viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3"/></svg></div><strong>Analyse des patterns r&eacute;currents</strong></li>
              <li className="plan-highlight"><div className="pfc pfc-red"><svg viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3"/></svg></div><strong>Historique &amp; analytics 180 jours</strong></li>
              <li className="plan-highlight"><div className="pfc pfc-red"><svg viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3"/></svg></div><strong>Support prioritaire</strong></li>
            </ul>
            <a href="/signup" className="plan-btn plan-btn-primary">Commencer avec Sentinel &rarr;</a>
          </div>
        </div>

        <p style={{ textAlign: 'center', marginTop: '2rem', fontSize: 13, color: 'var(--td)', fontStyle: 'italic' }}>
          14 jours d&rsquo;essai gratuit sur les deux plans &middot; Pas de carte requise &middot; Annulable &agrave; tout moment
        </p>
      </section>

      <footer>
        <div className="fl">Cald<span>ra</span></div>
        <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
          <a href="/mentions-legales" style={{ color: 'rgba(232,230,224,.2)', fontSize: 11, textDecoration: 'none', letterSpacing: '.5px' }}>CGU</a>
          <a href="/confidentialite" style={{ color: 'rgba(232,230,224,.2)', fontSize: 11, textDecoration: 'none', letterSpacing: '.5px' }}>Confidentialit&eacute;</a>
          <a href="/support" style={{ color: 'rgba(232,230,224,.2)', fontSize: 11, textDecoration: 'none', letterSpacing: '.5px' }}>Support</a>
        </div>
        <div>contact@getcaldra.com</div>
      </footer>
    </>
  )
}
