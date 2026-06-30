'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,200..700&display=swap');
*{margin:0;padding:0;box-sizing:border-box;scroll-behavior:smooth}
:root{--red:#7c3aed;--rd:rgba(124,58,237,.1);--rb:rgba(124,58,237,.25);--bg:#070510;--s1:#0f0d1c;--sf:#0f0f16;--b:rgba(255,255,255,.07);--b1:rgba(255,255,255,.06);--b2:rgba(255,255,255,.11);--tx:#f6f4fc;--t2:rgba(246,244,252,.6);--t3:rgba(246,244,252,.34);--tm:rgba(246,244,252,.6);--td:rgba(246,244,252,.34);--v:#8b5cf6;--v2:#a78bfa;--va:rgba(139,92,246,.1);--vb:rgba(139,92,246,.3)}
body{font-family:'DM Sans',sans-serif;background:var(--bg);color:var(--tx);min-height:100vh;overflow-x:hidden}
.promo-bar2{position:fixed;top:0;left:0;right:0;z-index:101;min-height:40px;display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:6px 12px;background:linear-gradient(90deg,#4c1d95,#7c3aed,#a78bfa,#7c3aed,#4c1d95);background-size:220% 100%;animation:promoshine 8s linear infinite;color:#fff;font-size:12.5px;padding:7px 18px;text-align:center;border-bottom:.5px solid rgba(255,255,255,.16)}
.promo-bar2 b{font-weight:700}
.promo-bar2 .pcode{font-weight:700;font-size:12px;background:rgba(255,255,255,.14);border:1px dashed rgba(255,255,255,.6);border-radius:6px;padding:2px 9px;letter-spacing:1.5px}
@keyframes promoshine{0%{background-position:0% 0}100%{background-position:220% 0}}
nav{position:fixed;top:40px;left:0;right:0;z-index:100;display:flex;justify-content:space-between;align-items:center;padding:1.25rem 3rem;border-bottom:.5px solid var(--b);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);background:rgba(7,5,16,.88)}
.logo-block{display:flex;flex-direction:column;gap:5px}
.logo{font-family:'DM Sans',sans-serif;font-weight:300;font-size:14px;letter-spacing:5px;text-transform:uppercase;color:#fff;line-height:1}
.logo span{color:var(--red)}
.logo-sub{font-size:8px;font-weight:400;letter-spacing:8.2px;text-transform:uppercase;color:rgba(255,255,255,.6);line-height:1;display:block}
.nc{font-size:10px;font-weight:500;letter-spacing:2px;text-transform:uppercase;padding:9px 20px;background:transparent;border:.5px solid rgba(255,255,255,.85);border-radius:4px;color:#fff;cursor:pointer;font-family:'DM Sans',sans-serif;transition:background .2s,color .2s;text-decoration:none}
.nc:hover{background:#fff;color:#070510}
.bp{padding:9px 20px;background:var(--red);border:none;border-radius:4px;color:#fff;font-size:10px;font-weight:500;letter-spacing:2px;text-transform:uppercase;font-family:'DM Sans',sans-serif;cursor:pointer;text-decoration:none;transition:opacity .2s}
.bp:hover{opacity:.88}
.stag{font-size:11px;letter-spacing:2px;text-transform:uppercase;color:rgba(124,58,237,.6);margin-bottom:1rem}
.stit{font-family:'DM Sans',sans-serif;font-size:clamp(1.9rem,4vw,2.9rem);font-weight:200;letter-spacing:-1px;color:#fff;margin-bottom:1rem;line-height:1.1}
.sdesc{font-size:15px;color:var(--t2);line-height:1.75;max-width:520px;margin-bottom:2.5rem;font-weight:300}
.pricing{display:grid;grid-template-columns:1fr 1fr;gap:1.3rem;max-width:880px;margin:0 auto}
.plan{border-radius:22px;padding:clamp(1.8rem,3vw,2.6rem);position:relative;overflow:hidden;transition:transform .25s}.plan:hover{transform:translateY(-4px)}
.plan-pro{background:linear-gradient(160deg,rgba(255,255,255,.045),var(--s1) 58%);border:.5px solid var(--b2)}
.plan-pro::before{content:'';position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,.22),transparent)}
.plan-pro:hover{border-color:rgba(255,255,255,.2);box-shadow:0 24px 56px rgba(0,0,0,.38),inset 0 1px 0 rgba(255,255,255,.06)}
.plan-max{background:linear-gradient(160deg,rgba(139,92,246,.15),var(--s1) 58%);border:.5px solid rgba(139,92,246,.44);box-shadow:0 0 80px rgba(139,92,246,.15),inset 0 1px 0 rgba(255,255,255,.07)}
.plan-pop{position:absolute;top:1.4rem;right:1.4rem;font-size:9px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:#fff;background:linear-gradient(135deg,#8b5cf6,#6d28d9);border-radius:100px;padding:5px 12px}
.plan-lab{font-size:11px;letter-spacing:1.8px;text-transform:uppercase;color:var(--t2);margin-bottom:1.5rem}
.plan-max .plan-lab{color:var(--v2)}
.plan-price{font-size:48px;font-weight:200;color:#fff;letter-spacing:-1.5px;line-height:1;margin-bottom:.5rem;display:flex;align-items:baseline;gap:2px;flex-wrap:wrap}
.plan-price sup{font-size:24px;vertical-align:super}
.plan-price sub{font-size:14px;font-weight:400;color:var(--t2)}
.plan-strike{font-size:21px;font-weight:300;color:var(--t3);text-decoration:line-through;margin-left:8px}
.plan-promo-tag{font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#fff;background:linear-gradient(135deg,#8b5cf6,#6d28d9);border-radius:6px;padding:4px 9px;margin-left:8px;align-self:center}
.plan-tag{font-size:13px;color:var(--t2);line-height:1.6;padding:1.2rem 0;border-top:.5px solid var(--b1);border-bottom:.5px solid var(--b1);margin:1.5rem 0}
.plan-max .plan-tag{border-color:rgba(139,92,246,.16)}
.plan-features{list-style:none;margin-bottom:2rem}
.plan-features li{font-size:13.5px;color:var(--t2);padding:.65rem 0;border-bottom:.5px solid rgba(255,255,255,.05);display:flex;align-items:center;gap:11px}.plan-features li:last-child{border-bottom:none}
.plan-hi{color:#fff!important;font-weight:500}
.pfc{width:18px;height:18px;border-radius:5px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.pfc svg{width:10px;height:10px;fill:none;stroke-width:2.5;stroke-linecap:round;stroke-linejoin:round}
.pfc-d{background:rgba(255,255,255,.07);border:.5px solid rgba(255,255,255,.13)}.pfc-d svg{stroke:var(--t2)}
.pfc-v{background:var(--va);border:.5px solid var(--vb)}.pfc-v svg{stroke:var(--v2)}
.plan-btn{width:100%;padding:14px;border-radius:10px;font-size:13px;font-weight:600;font-family:'DM Sans',sans-serif;cursor:pointer;transition:all .18s;letter-spacing:.3px;display:block;text-align:center;border:none;text-decoration:none}
.plan-btn-sec{background:transparent;border:.5px solid var(--b2);color:var(--t2)}.plan-btn-sec:hover{border-color:rgba(255,255,255,.3);color:#fff}
.plan-btn-pri{background:linear-gradient(135deg,#8b5cf6,#6d28d9);color:#fff;box-shadow:0 8px 26px rgba(139,92,246,.36)}.plan-btn-pri:hover{transform:translateY(-2px);box-shadow:0 12px 34px rgba(139,92,246,.5)}
.price-note{text-align:center;margin-top:2rem;font-size:12.5px;color:var(--t3);font-style:italic}
footer{border-top:.5px solid var(--b);padding:2rem 3rem;display:flex;justify-content:space-between;align-items:center;color:var(--td);font-size:12px}
.fl{font-family:'DM Sans',sans-serif;font-weight:300;font-size:13px;letter-spacing:3px;text-transform:uppercase;color:rgba(255,255,255,.15)}
.fl span{color:rgba(124,58,237,.3)}
@media(max-width:768px){nav{padding:1.25rem 1.5rem}.nc{display:none}.pricing{grid-template-columns:1fr}footer{flex-direction:column;gap:1rem;text-align:center}}
`

export default function PricingPage() {
  const [authed, setAuthed] = useState<boolean | null>(null)
  useEffect(() => {
    createClient().auth.getUser()
      .then(({ data }) => setAuthed(!!data.user))
      .catch(() => setAuthed(false))
  }, [])
  const proHref = authed ? '/api/billing/checkout?plan=pro' : '/signup?plan=pro'
  const maxHref = authed ? '/api/billing/checkout?plan=max' : '/signup?plan=max'
  const cta = authed ? 'Activer ce plan →' : 'Essayer 7 jours gratuitement →'
  const logout = async () => { try { await createClient().auth.signOut() } catch {} ; window.location.href = '/' }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <div className="promo-bar2">
        <span>&#10022;</span>
        <span><b>&minus;25&nbsp;% à vie</b> pour les 25 premiers inscrits</span>
        <span className="pcode">START25</span>
      </div>

      <nav>
        <a href="/" style={{ textDecoration: 'none' }} className="logo-block">
          <div className="logo">Cald<span>ra</span></div>
          <div className="logo-sub">Session</div>
        </a>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {authed
            ? <button onClick={logout} className="nc">Se déconnecter</button>
            : <>
                <a href="/login" className="nc">Connexion</a>
                <a href="/signup" className="bp">Commencer &rarr;</a>
              </>}
        </div>
      </nav>

      <section style={{ position: 'relative', zIndex: 1, maxWidth: 940, margin: '0 auto', padding: '10rem 2rem 5rem' }}>
        <div className="stag">Tarifs</div>
        <div className="stit">Simple.<br />Rentabilis&eacute; au premier trade &eacute;vit&eacute;.</div>
        <p className="sdesc">7 jours d&rsquo;essai gratuit sur les deux plans. Carte bancaire requise &mdash; d&eacute;bit automatique &agrave; J+7 sauf r&eacute;siliation.</p>

        <div className="pricing">
          <div className="plan plan-pro">
            <div className="plan-lab">Pro</div>
            <div className="plan-price"><sup>&euro;</sup>14,25<sub>/mois</sub><span className="plan-strike">19&euro;</span><span className="plan-promo-tag">&minus;25 %</span></div>
            <div className="plan-tag">Surveillance comportementale compl&egrave;te. Alertes imm&eacute;diates d&egrave;s qu&rsquo;un pattern dangereux est d&eacute;tect&eacute;.</div>
            <ul className="plan-features">
              <li><div className="pfc pfc-d"><svg viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3"/></svg></div>12 d&eacute;tecteurs comportementaux</li>
              <li><div className="pfc pfc-d"><svg viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3"/></svg></div>Dashboard temps r&eacute;el</li>
              <li><div className="pfc pfc-d"><svg viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3"/></svg></div>4 patterns r&eacute;currents</li>
              <li><div className="pfc pfc-d"><svg viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3"/></svg></div>Alertes Discord</li>
              <li><div className="pfc pfc-d"><svg viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3"/></svg></div>Personnalisation des r&egrave;gles</li>
              <li><div className="pfc pfc-d"><svg viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3"/></svg></div>Rapport mensuel</li>
              <li><div className="pfc pfc-d"><svg viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3"/></svg></div>Historique illimit&eacute;</li>
            </ul>
            <a href={proHref} className="plan-btn plan-btn-sec">{cta}</a>
          </div>

          <div className="plan plan-max">
            <div className="plan-pop">Recommand&eacute;</div>
            <div className="plan-lab">Max</div>
            <div className="plan-price"><sup>&euro;</sup>21,75<sub>/mois</sub><span className="plan-strike">29&euro;</span><span className="plan-promo-tag">&minus;25 %</span></div>
            <div className="plan-tag">Tout le plan Pro, avec la d&eacute;tection comportementale la plus pouss&eacute;e et un suivi hebdomadaire.</div>
            <ul className="plan-features">
              <li><div className="pfc pfc-d"><svg viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3"/></svg></div><span style={{ color: 'var(--t3)' }}>Tout le plan Pro inclus, plus&nbsp;:</span></li>
              <li className="plan-hi"><div className="pfc pfc-v"><svg viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3"/></svg></div>18 d&eacute;tecteurs comportementaux</li>
              <li className="plan-hi"><div className="pfc pfc-v"><svg viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3"/></svg></div>R&egrave;gles configurables (on/off + seuils)</li>
              <li className="plan-hi"><div className="pfc pfc-v"><svg viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3"/></svg></div>Mode prop firm (FTMO, FundedNext&hellip;)</li>
              <li className="plan-hi"><div className="pfc pfc-v"><svg viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3"/></svg></div>D&eacute;briefs IA : jour, semaine, mois</li>
              <li className="plan-hi"><div className="pfc pfc-v"><svg viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3"/></svg></div>Patterns r&eacute;currents complets</li>
              <li className="plan-hi"><div className="pfc pfc-v"><svg viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3"/></svg></div>Alertes Telegram</li>
              <li className="plan-hi"><div className="pfc pfc-v"><svg viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3"/></svg></div>Rapport hebdomadaire</li>
            </ul>
            <a href={maxHref} className="plan-btn plan-btn-pri">{cta}</a>
          </div>
        </div>

        <p className="price-note">7 jours d&rsquo;essai gratuit sur les deux plans &middot; Carte bancaire requise &middot; Annulable &agrave; tout moment avant J+7</p>
      </section>

      <footer>
        <div className="fl">Cald<span>ra</span></div>
        <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
          <a href="/mentions-legales" style={{ color: 'rgba(246,244,252,.2)', fontSize: 11, textDecoration: 'none', letterSpacing: '.5px' }}>CGU</a>
          <a href="/confidentialite" style={{ color: 'rgba(246,244,252,.2)', fontSize: 11, textDecoration: 'none', letterSpacing: '.5px' }}>Confidentialit&eacute;</a>
          <a href="/support" style={{ color: 'rgba(246,244,252,.2)', fontSize: 11, textDecoration: 'none', letterSpacing: '.5px' }}>Support</a>
        </div>
        <div>contact@getcaldra.com</div>
      </footer>
    </>
  )
}
