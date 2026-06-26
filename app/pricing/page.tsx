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
.plan-pro{background:linear-gradient(135deg,rgba(255,255,255,.035) 0%,var(--sf) 55%);border:.5px solid rgba(255,255,255,.16)}
.plan-max{background:linear-gradient(135deg,rgba(124,58,237,.07) 0%,var(--sf) 55%);border:.5px solid rgba(124,58,237,.35)}
.plan-shine{position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,.08),transparent)}
.plan-shine-red{background:linear-gradient(90deg,transparent,rgba(124,58,237,.6),transparent)}
.plan-label{font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:rgba(232,230,224,.55);margin-bottom:1.5rem}
.plan-label-red{color:rgba(124,58,237,.7)}
.plan-price{font-family:'DM Sans',sans-serif;font-size:42px;font-weight:200;color:#fff;letter-spacing:2px;line-height:1;margin-bottom:1.75rem}
.plan-price sup{font-size:20px;vertical-align:super;letter-spacing:0}
.plan-price sub{font-size:14px;font-weight:400;color:var(--tm);letter-spacing:0}
.plan-note{font-size:12px;color:var(--td);margin-bottom:1.5rem}
.plan-tagline{font-size:13px;color:rgba(255,255,255,.5);font-style:italic;line-height:1.55;padding:1rem 0;border-top:.5px solid var(--b);border-bottom:.5px solid var(--b);margin-bottom:1.5rem}
.plan-tagline strong{font-style:normal;font-weight:500;color:rgba(255,255,255,.75)}
.plan-max .plan-tagline{border-color:rgba(124,58,237,.15)}
.ea-banner{max-width:780px;margin:0 auto 1rem;border-radius:12px;padding:.85rem 1.25rem;background:linear-gradient(135deg,rgba(124,58,237,.12),rgba(124,58,237,.04));border:.5px solid rgba(124,58,237,.3);display:flex;align-items:center;gap:.75rem;flex-wrap:wrap}
.ea-tag{font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:#fff;background:var(--red);border-radius:4px;padding:4px 8px;font-weight:600}
.ea-text{font-size:13px;color:rgba(255,255,255,.7)}
.ea-text strong{color:#fff;font-weight:600}
.plan-was{font-size:12px;color:var(--td);text-decoration:line-through;margin-bottom:.25rem}
.plan-strike{font-size:20px;font-weight:300;color:var(--td);text-decoration:line-through;letter-spacing:0;margin-left:10px;vertical-align:middle}
.plan-promo-tag{display:inline-block;font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#fff;background:var(--red);border-radius:5px;padding:3px 8px;vertical-align:middle;margin-left:10px}
.plan-ea{font-size:12px;color:var(--red);margin-bottom:1.5rem}
.plan-ea strong{font-weight:700}
.plan-features{list-style:none;margin-bottom:2rem}
.plan-features li{font-size:13px;color:rgba(255,255,255,.58);padding:.55rem 0;border-bottom:.5px solid rgba(255,255,255,.06);display:flex;align-items:center;gap:10px}
.plan-features li:last-child{border-bottom:none}
.plan-highlight{color:rgba(255,255,255,.75)!important}
.plan-highlight strong{font-weight:500}
.pfc{width:16px;height:16px;border-radius:4px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.pfc svg{width:9px;height:9px;fill:none;stroke-width:2.5;stroke-linecap:round;stroke-linejoin:round}
.pfc-dim{background:rgba(255,255,255,.08);border:.5px solid rgba(255,255,255,.14)}
.pfc-dim svg{stroke:rgba(255,255,255,.55)}
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
        <p className="sdesc">7 jours d&rsquo;essai gratuit sur les deux plans. Carte bancaire requise &mdash; d&eacute;bit automatique &agrave; J+7 sauf r&eacute;siliation.</p>

        <div className="ea-banner">
          <span className="ea-tag">Lancement</span>
          <span className="ea-text"><strong>&minus;25&nbsp;% &agrave; vie</strong> pour les 25 premiers inscrits &middot; Pro &agrave; <strong>14,25&euro;</strong> &middot; Max &agrave; <strong>25,50&euro;</strong> &middot; code <strong>START25</strong> au paiement</span>
        </div>

        <div className="pricing-grid">
          <div className="plan-card plan-pro">
            <div className="plan-shine"></div>
            <div className="plan-label">Pro</div>
            <div className="plan-price"><sup>&euro;</sup>14,25<sub>/mois</sub><span className="plan-strike">19&euro;</span><span className="plan-promo-tag">&minus;25&nbsp;%</span></div>
            <div className="plan-tagline">Surveillance comportementale compl&egrave;te. Alertes imm&eacute;diates d&egrave;s qu&rsquo;un pattern dangereux est d&eacute;tect&eacute;.</div>
            <ul className="plan-features">
              <li><div className="pfc pfc-dim"><svg viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3"/></svg></div>11 d&eacute;tecteurs comportementaux</li>
              <li><div className="pfc pfc-dim"><svg viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3"/></svg></div>Dashboard temps r&eacute;el</li>
              <li><div className="pfc pfc-dim"><svg viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3"/></svg></div>Personnalisation des r&egrave;gles</li>
              <li><div className="pfc pfc-dim"><svg viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3"/></svg></div>Rapport mensuel</li>
              <li><div className="pfc pfc-dim"><svg viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3"/></svg></div>Historique illimité</li>
            </ul>
            <a href="/signup?plan=pro" className="plan-btn plan-btn-secondary">Essayer 7 jours gratuitement &rarr;</a>
          </div>

          <div className="plan-card plan-max">
            <div className="plan-shine plan-shine-red"></div>
            <div className="plan-label plan-label-red">Max</div>
            <div className="plan-price"><sup>&euro;</sup>25,50<sub>/mois</sub><span className="plan-strike">34&euro;</span><span className="plan-promo-tag">&minus;25&nbsp;%</span></div>
            <div className="plan-tagline">Tout le plan Pro, avec la d&eacute;tection comportementale la plus pouss&eacute;e et un suivi hebdomadaire.</div>
            <ul className="plan-features">
              <li><div className="pfc pfc-dim"><svg viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3"/></svg></div><span style={{ color: 'rgba(232,230,224,.3)' }}>Tout le plan Pro inclus, plus&nbsp;:</span></li>
              <li className="plan-highlight"><div className="pfc pfc-red"><svg viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3"/></svg></div><strong>18 d&eacute;tecteurs comportementaux</strong></li>
              <li className="plan-highlight"><div className="pfc pfc-red"><svg viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3"/></svg></div><strong>Mode prop firm (FTMO, FundedNext&hellip;)</strong></li>
              <li className="plan-highlight"><div className="pfc pfc-red"><svg viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3"/></svg></div><strong>D&eacute;briefs IA : jour, semaine, mois</strong></li>
              <li className="plan-highlight"><div className="pfc pfc-red"><svg viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3"/></svg></div><strong>Patterns r&eacute;currents complets</strong></li>
              <li className="plan-highlight"><div className="pfc pfc-red"><svg viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3"/></svg></div><strong>Alertes Slack, Discord et Telegram</strong></li>
              <li className="plan-highlight"><div className="pfc pfc-red"><svg viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3"/></svg></div><strong>Rapport hebdomadaire</strong></li>
            </ul>
            <a href="/signup?plan=max" className="plan-btn plan-btn-primary">Essayer 7 jours gratuitement &rarr;</a>
          </div>
        </div>

        <p style={{ textAlign: 'center', marginTop: '2rem', fontSize: 13, color: 'var(--td)', fontStyle: 'italic' }}>
          7 jours d&rsquo;essai gratuit sur les deux plans &middot; Carte bancaire requise &middot; Annulable &agrave; tout moment avant J+7
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
