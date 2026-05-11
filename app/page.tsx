'use client'

import { useEffect } from 'react'

const CSS = `
*{margin:0;padding:0;box-sizing:border-box;scroll-behavior:smooth}
:root{--v:#7c3aed;--bg:#040408;--s1:#08080f;--b1:rgba(255,255,255,.07);--b2:rgba(255,255,255,.12);--tx:#f2ede8;--t2:rgba(242,237,232,.5);--t3:rgba(242,237,232,.2)}
html{font-size:16px}
body{font-family:'DM Sans',sans-serif;background:var(--bg);color:var(--tx);overflow-x:hidden;line-height:1}

/* NAV */
nav{position:fixed;top:0;left:0;right:0;z-index:100;display:flex;align-items:center;justify-content:space-between;padding:1.5rem 3.5rem;backdrop-filter:blur(20px);background:rgba(4,4,8,.85)}
.n-logo{font-size:12px;font-weight:600;letter-spacing:6px;text-transform:uppercase;color:#fff;text-decoration:none}.n-logo span{color:var(--v)}
.n-links{display:flex;gap:2.5rem}
.n-lk{font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--t2);text-decoration:none;transition:color .15s}.n-lk:hover{color:#fff}
.n-login{font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--t3);text-decoration:none;transition:color .15s;padding:6px 0;border-bottom:.5px solid var(--b1)}.n-login:hover{color:#fff;border-color:rgba(255,255,255,.3)}

/* HERO */
.hero{min-height:100vh;display:flex;flex-direction:column;justify-content:flex-end;padding:0 3.5rem 5rem;position:relative;overflow:hidden;border-bottom:.5px solid var(--b1)}
.hero-bg{position:absolute;inset:0;background:radial-gradient(ellipse at 30% 60%,rgba(124,58,237,.09) 0%,transparent 55%),radial-gradient(ellipse at 80% 20%,rgba(124,58,237,.04) 0%,transparent 40%);z-index:0}
.hero-eyebrow{position:absolute;top:9rem;left:3.5rem;font-size:10px;letter-spacing:4px;text-transform:uppercase;color:var(--t3);display:flex;align-items:center;gap:10px}
.hero-eye-dot{width:3px;height:3px;border-radius:50%;background:var(--v);animation:blink 2s ease-in-out infinite}
@keyframes blink{0%,100%{opacity:1}50%{opacity:.2}}
.hero-counter{position:absolute;top:9rem;right:3.5rem;font-size:10px;letter-spacing:2px;color:var(--t3);font-variant-numeric:tabular-nums}
h1{position:relative;z-index:1;font-size:clamp(3.5rem,9vw,8.5rem);font-weight:200;line-height:.96;letter-spacing:-4px;color:#fff;margin-bottom:4rem}
h1 em{font-style:normal;color:var(--v);font-weight:700;display:block;letter-spacing:-6px}
.hero-bottom{position:relative;z-index:1;display:grid;grid-template-columns:1fr 1fr;gap:4rem;align-items:end;border-top:.5px solid var(--b1);padding-top:2.5rem}
.hero-desc{font-size:17px;color:var(--t2);line-height:1.75;max-width:480px;font-weight:300}
.hero-cta{display:flex;flex-direction:column;align-items:flex-end;gap:1rem}
.wf{display:flex;gap:5px;background:rgba(255,255,255,.04);border:.5px solid var(--b2);border-radius:5px;padding:4px;width:360px}
.wf input{flex:1;padding:11px 14px;background:transparent;border:none;color:#fff;font-size:13px;font-family:'DM Sans',sans-serif;outline:none}.wf input::placeholder{color:var(--t3)}
.wf-btn{padding:10px 18px;background:var(--v);border:none;border-radius:3px;color:#fff;font-size:12px;font-weight:500;font-family:'DM Sans',sans-serif;cursor:pointer;white-space:nowrap;transition:opacity .15s}.wf-btn:hover{opacity:.85}
.wf-sm{display:none;font-size:12px;color:rgba(80,220,140,.8);text-align:right;letter-spacing:.5px}
.hero-fn{font-size:11px;color:var(--t3);display:flex;gap:1rem}
.hfs{width:1px;height:10px;background:var(--b1);align-self:center}

/* NUMBERS BAND */
.nb{border-bottom:.5px solid var(--b1);display:grid;grid-template-columns:repeat(4,1fr)}
.nb-item{padding:2.5rem 3.5rem;border-right:.5px solid var(--b1);position:relative}
.nb-item:last-child{border-right:none}
.nb-n{font-size:clamp(2.8rem,4vw,4.5rem);font-weight:200;letter-spacing:-3px;color:#fff;line-height:1;margin-bottom:.5rem}
.nb-n span{color:var(--v)}
.nb-l{font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--t3)}
.nb-line{position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,var(--v),transparent)}

/* SCENE GENERIC */
.scene{padding:7rem 3.5rem;border-bottom:.5px solid var(--b1);position:relative}
.scene-tag{font-size:10px;letter-spacing:4px;text-transform:uppercase;color:var(--t3);margin-bottom:4rem}
.scene-h{font-size:clamp(2.4rem,5vw,5rem);font-weight:200;letter-spacing:-3px;color:#fff;line-height:.96;margin-bottom:0}

/* MANIFESTO */
.manifesto{padding:8rem 3.5rem;border-bottom:.5px solid var(--b1);max-width:none}
.manifesto-line{font-size:clamp(1.8rem,3.5vw,3.2rem);font-weight:200;letter-spacing:-1.5px;color:rgba(255,255,255,.15);line-height:1.15;padding:1.5rem 0;border-bottom:.5px solid rgba(255,255,255,.05);transition:color .3s;cursor:default}
.manifesto-line:last-child{border-bottom:none}
.manifesto-line:hover{color:rgba(255,255,255,.9)}
.manifesto-line em{font-style:normal;color:var(--v)}

/* DETECTORS — cinematic list */
.det-scene{padding:7rem 3.5rem;border-bottom:.5px solid var(--b1)}
.det-header{display:grid;grid-template-columns:1fr 1fr;gap:4rem;margin-bottom:5rem;align-items:end}
.det-rows{display:flex;flex-direction:column}
.det-row{display:grid;grid-template-columns:60px 1fr auto auto;align-items:center;gap:2rem;padding:1.75rem 0;border-bottom:.5px solid var(--b1);cursor:pointer;transition:background .15s;margin:0 -3.5rem;padding-left:3.5rem;padding-right:3.5rem}
.det-row:first-child{border-top:.5px solid var(--b1)}
.det-row:hover .dr-name{color:#fff}
.dr-num{font-size:11px;font-weight:600;letter-spacing:2px;color:var(--t3)}
.dr-name{font-size:clamp(1.1rem,2vw,1.5rem);font-weight:200;letter-spacing:-0.5px;color:rgba(255,255,255,.55);transition:color .2s}
.dr-badge{font-size:9px;padding:3px 8px;background:rgba(124,58,237,.08);border:.5px solid rgba(124,58,237,.2);border-radius:100px;color:rgba(124,58,237,.7);letter-spacing:.5px;text-transform:uppercase;white-space:nowrap}
.dr-lv{font-size:11px;color:var(--t3);white-space:nowrap}
.dr-lv-2{color:rgba(220,130,0,.6)}
.dr-lv-3{color:rgba(220,50,30,.7)}

/* DEMO */
.demo-scene{padding:7rem 3.5rem;border-bottom:.5px solid var(--b1)}
.demo-wrap{border:.5px solid var(--b1);border-radius:0;overflow:hidden;margin-top:4rem}
.demo-tb{display:flex;align-items:center;gap:8px;padding:.875rem 1.5rem;border-bottom:.5px solid var(--b1);background:rgba(0,0,0,.3)}
.dd-r{width:10px;height:10px;border-radius:50%;background:#ff5f57}
.dd-y{width:10px;height:10px;border-radius:50%;background:#ffbd2e}
.dd-g{width:10px;height:10px;border-radius:50%;background:#28c840}
.demo-ttl{flex:1;text-align:center;font-size:11px;color:var(--t3);letter-spacing:.5px}
.demo-body{display:grid;grid-template-columns:1fr 300px;min-height:400px}
.demo-lp{padding:2rem;border-right:.5px solid var(--b1)}
.demo-llab{font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--t3);margin-bottom:1.25rem}
.demo-pnl{display:flex;align-items:baseline;gap:8px;margin-bottom:1.5rem}
.demo-pv{font-size:38px;font-weight:200;letter-spacing:-2px;transition:color .3s}
.demo-pc{font-size:12px;color:var(--t3)}
.demo-chart{position:relative;height:140px;margin-bottom:1rem}
.demo-tlab{font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--t3);margin-bottom:.75rem}
.demo-tr{display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:.5px solid var(--b1);font-size:12px}.demo-tr:last-child{border-bottom:none}
.dtt{color:var(--t3)}.dtins{color:var(--t2)}.dtp{color:#3cc87a;font-weight:500}.dtn{color:#e05050;font-weight:500}
.demo-rp{padding:2rem;display:flex;flex-direction:column}
.demo-rlab{font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--t3);margin-bottom:.75rem}
.demo-als{flex:1;display:flex;flex-direction:column;gap:.5rem}
.ai{display:flex;align-items:flex-start;gap:10px;padding:.75rem .875rem;border-radius:4px;border:.5px solid transparent;animation:fadein .3s ease}
@keyframes fadein{from{opacity:0;transform:translateY(-3px)}to{opacity:1;transform:translateY(0)}}
.al1{background:rgba(255,200,0,.04);border-color:rgba(255,200,0,.1)}
.al2{background:rgba(220,130,0,.06);border-color:rgba(220,130,0,.15)}
.al3{background:rgba(220,50,30,.08);border-color:rgba(220,50,30,.2)}
.adot{width:7px;height:7px;border-radius:50%;margin-top:3px;flex-shrink:0}
.dl1{background:#ffc800}.dl2{background:#dc8200}.dl3{background:#dc3218;animation:blk 1s ease-in-out infinite}
@keyframes blk{0%,100%{opacity:1}50%{opacity:.3}}
.ab{flex:1}.at{font-size:12px;font-weight:500;color:#fff;margin-bottom:2px}.as{font-size:11px;color:rgba(255,255,255,.25);line-height:1.4}
.abg{font-size:9px;padding:2px 7px;border-radius:100px;letter-spacing:.5px;text-transform:uppercase;white-space:nowrap;flex-shrink:0;margin-top:1px}
.bl1{background:rgba(255,200,0,.1);color:#ffc800}.bl2{background:rgba(220,130,0,.1);color:#dc8200}.bl3{background:rgba(220,50,30,.12);color:#dc3218}
.demo-sbtn{margin-top:1rem;width:100%;padding:10px;background:transparent;border:.5px solid rgba(124,58,237,.3);border-radius:3px;color:rgba(124,58,237,.8);font-size:12px;font-family:'DM Sans',sans-serif;cursor:pointer;letter-spacing:.5px;transition:all .2s}.demo-sbtn:hover{background:rgba(124,58,237,.07);border-color:rgba(124,58,237,.5)}

/* HOW */
.how-scene{padding:7rem 3.5rem;border-bottom:.5px solid var(--b1)}
.how-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:4rem;margin-top:4rem}
.how-item{}
.how-n{font-size:clamp(3rem,6vw,6rem);font-weight:200;letter-spacing:-4px;color:rgba(255,255,255,.06);line-height:1;margin-bottom:1.5rem}
.how-h{font-size:18px;font-weight:500;color:#fff;margin-bottom:.75rem;line-height:1.3}
.how-d{font-size:13px;color:var(--t2);line-height:1.75}
.how-tags{display:flex;flex-wrap:wrap;gap:5px;margin-top:1rem}
.how-tag{font-size:10px;padding:3px 9px;border:.5px solid var(--b1);border-radius:2px;color:var(--t3);display:flex;align-items:center;gap:5px}
.htdot{width:4px;height:4px;border-radius:50%;background:#3cc87a}

/* PULL QUOTE */
.quote-scene{padding:9rem 3.5rem;border-bottom:.5px solid var(--b1);text-align:center}
.pq{font-size:clamp(1.5rem,3.5vw,3rem);font-weight:200;color:rgba(255,255,255,.18);line-height:1.4;letter-spacing:-1px;max-width:900px;margin:0 auto 3rem;font-style:italic}
.pq strong{color:#fff;font-style:normal;font-weight:500}
.pq-au{display:flex;align-items:center;justify-content:center;gap:12px}
.pq-av{width:36px;height:36px;border-radius:50%;border:.5px solid var(--b2);background:var(--s1);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:500;color:var(--t2)}
.pq-name{font-size:13px;font-weight:500;color:var(--t2)}
.pq-role{font-size:11px;color:var(--t3)}
.pq-sep{width:1px;height:16px;background:var(--b2)}
.testi-more{display:grid;grid-template-columns:repeat(2,1fr);gap:1rem;max-width:800px;margin:4rem auto 0}
.tm-c{padding:1.5rem;border:.5px solid var(--b1);border-radius:0}
.tm-stars{color:#f5a623;font-size:11px;letter-spacing:2px;margin-bottom:.875rem}
.tm-q{font-size:13px;color:rgba(255,255,255,.35);line-height:1.65;margin-bottom:1rem;font-style:italic}.tm-q strong{color:rgba(255,255,255,.65);font-style:normal}
.tm-au{display:flex;align-items:center;gap:8px}
.tm-av{width:28px;height:28px;border-radius:50%;border:.5px solid var(--b1);background:var(--s1);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:500;color:var(--t3)}
.tm-name{font-size:12px;color:var(--t2)}.tm-role{font-size:11px;color:var(--t3)}

/* PRICING */
.price-scene{padding:7rem 3.5rem;border-bottom:.5px solid var(--b1)}
.pricing-grid{display:grid;grid-template-columns:1fr 1fr;gap:.5px;margin-top:4rem;border:.5px solid var(--b1);background:var(--b1)}
.plan{background:var(--bg);padding:2.5rem;position:relative}
.plan-sent{background:rgba(124,58,237,.025)}
.plan-shine{position:absolute;top:0;left:0;right:0;height:1px}
.plan-sw{background:linear-gradient(90deg,transparent,rgba(255,255,255,.06),transparent)}
.plan-sv{background:linear-gradient(90deg,transparent,rgba(124,58,237,.45),transparent)}
.plan-lab{font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--t3);margin-bottom:1.5rem}
.plan-lab-v{color:rgba(124,58,237,.65)}
.plan-price{font-size:52px;font-weight:200;color:#fff;letter-spacing:-2px;line-height:1;margin-bottom:.35rem}
.plan-price sup{font-size:24px;vertical-align:super;letter-spacing:0}
.plan-price sub{font-size:14px;font-weight:400;color:var(--t3);letter-spacing:0}
.plan-note{font-size:12px;color:var(--t3);margin-bottom:1.75rem}
.plan-features{list-style:none;margin-bottom:2rem;border-top:.5px solid var(--b1);padding-top:1.5rem}
.plan-features li{font-size:13px;color:rgba(255,255,255,.35);padding:.5rem 0;display:flex;align-items:center;gap:10px;border-bottom:.5px solid rgba(255,255,255,.03)}.plan-features li:last-child{border-bottom:none}
.plan-hi{color:rgba(255,255,255,.7)!important}
.pfc{width:14px;height:14px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.pfc svg{width:9px;height:9px;fill:none;stroke-width:2.5;stroke-linecap:round;stroke-linejoin:round}
.pfc-d svg{stroke:rgba(255,255,255,.2)}.pfc-v svg{stroke:var(--v)}
.plan-btn{width:100%;padding:13px;border-radius:2px;font-size:11px;font-weight:500;font-family:'DM Sans',sans-serif;cursor:pointer;transition:all .15s;letter-spacing:2px;text-transform:uppercase;display:block;text-align:center;text-decoration:none;border:none}
.plan-btn-sec{background:transparent;border:.5px solid var(--b2)!important;color:rgba(255,255,255,.4)}.plan-btn-sec:hover{color:#fff;border-color:rgba(255,255,255,.3)!important}
.plan-btn-pri{background:var(--v);color:#fff}.plan-btn-pri:hover{opacity:.85}

/* STORY */
.story-scene{padding:7rem 3.5rem;border-bottom:.5px solid var(--b1)}
.story-layout{display:grid;grid-template-columns:1fr 1fr;gap:6rem;margin-top:4rem}
.story-p{font-size:16px;color:rgba(242,237,232,.55);line-height:2;font-weight:300;margin-bottom:1.5rem}
.story-aside{display:flex;flex-direction:column;justify-content:flex-end;gap:2rem}
.story-fact{padding:1.5rem 0;border-top:.5px solid var(--b1)}
.story-fact-n{font-size:2.5rem;font-weight:200;letter-spacing:-2px;color:#fff;margin-bottom:.25rem}
.story-fact-n span{color:var(--v)}
.story-fact-l{font-size:12px;color:var(--t3)}
.story-closing{font-size:22px;color:#fff;font-weight:200;font-style:italic;letter-spacing:-1px;line-height:1.4;border-top:.5px solid var(--b1);padding-top:2rem}
.story-closing em{font-style:normal;color:var(--v)}

/* CTA FINALE */
.cta-scene{padding:10rem 3.5rem;text-align:center;position:relative;overflow:hidden}
.cta-bg{position:absolute;inset:0;background:radial-gradient(ellipse at 50% 100%,rgba(124,58,237,.1) 0%,transparent 60%);z-index:0}
.cta-tag{font-size:10px;letter-spacing:4px;text-transform:uppercase;color:var(--t3);margin-bottom:3rem;position:relative;z-index:1}
.cta-h{font-size:clamp(3.5rem,9vw,9rem);font-weight:200;letter-spacing:-5px;color:#fff;line-height:.94;margin-bottom:3rem;position:relative;z-index:1}
.cta-h em{font-style:normal;color:var(--v);font-weight:700;display:block}
.cta-sub{font-size:17px;color:var(--t2);margin-bottom:2.5rem;font-weight:300;position:relative;z-index:1}
.cta-wf{display:flex;gap:5px;background:rgba(255,255,255,.04);border:.5px solid var(--b2);border-radius:4px;padding:4px;max-width:380px;margin:0 auto;position:relative;z-index:1}
.cta-wf-sm{display:none;font-size:12px;color:rgba(80,220,140,.8);text-align:center;letter-spacing:.5px;margin-top:.875rem;position:relative;z-index:1}
.cta-fn{font-size:12px;color:var(--t3);margin-top:1.25rem;position:relative;z-index:1}

/* FOOTER */
footer{padding:2rem 3.5rem;display:flex;justify-content:space-between;align-items:center;border-top:.5px solid var(--b1)}
.foot-logo{font-size:11px;letter-spacing:5px;text-transform:uppercase;color:rgba(255,255,255,.12);font-weight:600}
.foot-logo span{color:rgba(124,58,237,.25)}
.foot-links{display:flex;gap:2rem}
.foot-lk{font-size:11px;color:var(--t3);text-decoration:none;letter-spacing:.5px;transition:color .15s}.foot-lk:hover{color:var(--t2)}
.foot-email{font-size:11px;color:var(--t3)}

/* RESPONSIVE */
@media(max-width:960px){
  nav{padding:1.25rem 1.5rem}.n-links{display:none}
  .hero{padding:0 1.5rem 4rem}.hero-eyebrow{left:1.5rem;top:8rem}.hero-counter{right:1.5rem;top:8rem}
  h1{font-size:clamp(2.8rem,12vw,6rem);letter-spacing:-3px}
  .hero-bottom{grid-template-columns:1fr;gap:2rem}.hero-cta{align-items:flex-start}.wf{width:100%;max-width:380px}
  .nb{grid-template-columns:1fr 1fr}.nb-item:nth-child(2){border-right:none}.nb-item:nth-child(3){border-top:.5px solid var(--b1)}.nb-item:nth-child(4){border-right:none;border-top:.5px solid var(--b1)}
  .scene,.manifesto,.det-scene,.demo-scene,.how-scene,.quote-scene,.price-scene,.story-scene,.cta-scene{padding:5rem 1.5rem}
  .det-header{grid-template-columns:1fr;gap:2rem}
  .det-row{grid-template-columns:40px 1fr auto;gap:1rem}.dr-lv{display:none}
  .how-grid{grid-template-columns:1fr;gap:2.5rem}
  .pricing-grid{grid-template-columns:1fr}
  .story-layout{grid-template-columns:1fr}
  .story-aside{display:none}
  .testi-more{grid-template-columns:1fr}
  .cta-h{font-size:clamp(2.8rem,12vw,6rem);letter-spacing:-3px}
  footer{padding:1.5rem;flex-direction:column;gap:.875rem;text-align:center}
  .demo-body{grid-template-columns:1fr}
  .manifesto-line{font-size:clamp(1.3rem,5vw,2rem)}
}
`

const HTML = `
<nav>
  <a href="#" class="n-logo" style="text-decoration:none">Cald<span>ra</span></a>
  <div class="n-links">
    <a class="n-lk" href="#detecteurs">D&eacute;tecteurs</a>
    <a class="n-lk" href="#demo">D&eacute;mo</a>
    <a class="n-lk" href="#tarifs">Tarifs</a>
    <a class="n-lk" href="#histoire">Histoire</a>
  </div>
  <a href="/login" class="n-login">Connexion</a>
</nav>

<!-- HERO -->
<div class="hero">
  <div class="hero-bg"></div>
  <div class="hero-eyebrow"><div class="hero-eye-dot"></div>Intelligence comportementale &mdash; Caldra Session</div>
  <div class="hero-counter">2026 &mdash; Early access</div>
  <h1>Tu ne vois pas<br>quand tu d&eacute;railles.<br><em>Lui si.</em></h1>
  <div class="hero-bottom">
    <p class="hero-desc">Caldra analyse chaque trade et d&eacute;tecte les comportements qui d&eacute;truisent les sessions &mdash; <em style="font-style:italic;color:rgba(242,237,232,.7)">avant</em> que le tilt, le revenge trading ou l&rsquo;impulsion ne fasse les d&eacute;g&acirc;ts.</p>
    <div class="hero-cta">
      <div class="wf">
        <input type="email" id="wf-email" placeholder="ton@email.com" />
        <button class="wf-btn" onclick="joinWaitlist('wf-email','wf-sm')">Rejoindre &rarr;</button>
      </div>
      <div class="wf-sm" id="wf-sm">Place r&eacute;serv&eacute;e. On te contacte &agrave; l&rsquo;ouverture.</div>
      <div class="hero-fn">
        <span>Lancement 13/05</span>
        <div class="hfs"></div>
        <span>14 jours d&rsquo;essai</span>
        <div class="hfs"></div>
        <span>Sans carte</span>
      </div>
    </div>
  </div>
</div>

<!-- NUMBERS -->
<div class="nb">
  <div class="nb-item"><div class="nb-line"></div><div class="nb-n">9<span>+</span></div><div class="nb-l">Comportements d&eacute;tect&eacute;s</div></div>
  <div class="nb-item"><div class="nb-line"></div><div class="nb-n">3</div><div class="nb-l">Niveaux d&rsquo;alerte</div></div>
  <div class="nb-item"><div class="nb-line"></div><div class="nb-n"><span>&lt;</span>1s</div><div class="nb-l">Temps de d&eacute;tection</div></div>
  <div class="nb-item"><div class="nb-line"></div><div class="nb-n">100%</div><div class="nb-l">Automatique</div></div>
</div>

<!-- MANIFESTO -->
<div class="manifesto">
  <div class="manifesto-line">Chaque trader perd de l&rsquo;argent <em>qu&rsquo;il ne devrait pas perdre.</em></div>
  <div class="manifesto-line">Pas par manque de technique. Par manque de <em>contr&ocirc;le.</em></div>
  <div class="manifesto-line">Le tilt, le revenge sizing, l&rsquo;impulsion &mdash; tu les connais. <em>Tu les refais quand m&ecirc;me.</em></div>
  <div class="manifesto-line">Pas parce que tu es faible. Parce que tu es <em>humain.</em></div>
  <div class="manifesto-line">Caldra est l&rsquo;&oelig;il qui voit ce que tu ne vois pas <em>quand tu tradis.</em></div>
</div>

<!-- DÉTECTEURS -->
<div class="det-scene" id="detecteurs">
  <div class="scene-tag">01 &mdash; Ce qu&rsquo;on d&eacute;tecte</div>
  <div class="det-header">
    <div class="scene-h">Ton empreinte<br>comportementale.</div>
    <p style="font-size:15px;color:var(--t2);line-height:1.8;font-weight:300;max-width:440px;align-self:end">Neuf comportements que Caldra surveille en continu. Chacun correspond &agrave; un moment pr&eacute;cis de la d&eacute;raillance &mdash; configur&eacute; selon tes r&egrave;gles propres.</p>
  </div>
  <div class="det-rows">
    <div class="det-row"><span class="dr-num">01</span><span class="dr-name">Revenge sizing</span><span class="dr-lv dr-lv-2">Niveau 2</span></div>
    <div class="det-row"><span class="dr-num">02</span><span class="dr-name">Re-entr&eacute;e imm&eacute;diate</span><span class="dr-lv">Niveau 1</span></div>
    <div class="det-row"><span class="dr-num">03</span><span class="dr-name">S&eacute;rie de pertes cons&eacute;cutives</span><span class="dr-lv dr-lv-2">Niveau 2</span></div>
    <div class="det-row"><span class="dr-num">04</span><span class="dr-name">Drawdown journalier critique</span><span class="dr-lv dr-lv-3">Niveau 3</span></div>
    <div class="det-row"><span class="dr-num">05</span><span class="dr-name">Trade hors session</span><span class="dr-lv">Niveau 1</span></div>
    <div class="det-row"><span class="dr-num">06</span><span class="dr-name">Suractivit&eacute; de session</span><span class="dr-lv dr-lv-2">Niveau 2</span></div>
    <div class="det-row"><span class="dr-num">07</span><span class="dr-name">Trade pendant les news <span class="dr-badge">Sentinel</span></span><span class="dr-lv dr-lv-2">Niveau 2</span></div>
    <div class="det-row"><span class="dr-num">08</span><span class="dr-name">Stop non respect&eacute;</span><span class="dr-lv dr-lv-2">Niveau 2</span></div>
    <div class="det-row"><span class="dr-num">09</span><span class="dr-name">R&egrave;gle de risk d&eacute;pass&eacute;e</span><span class="dr-lv dr-lv-2">Niveau 2</span></div>
  </div>
</div>

<!-- DEMO -->
<div class="demo-scene" id="demo">
  <div class="scene-tag">02 &mdash; D&eacute;mo interactive</div>
  <div class="scene-h">Vois Caldra<br>en action.</div>
  <div class="demo-wrap">
    <div class="demo-tb">
      <div class="dd-r"></div><div class="dd-y"></div><div class="dd-g"></div>
      <div class="demo-ttl">Caldra &mdash; Session NQ Futures &mdash; 30/03/2026</div>
    </div>
    <div class="demo-body">
      <div class="demo-lp">
        <div class="demo-llab">P&amp;L de session</div>
        <div class="demo-pnl"><div class="demo-pv" id="dpnl" style="color:#3cc87a">+&euro;240</div><div class="demo-pc" id="dpc">Session en cours</div></div>
        <div class="demo-chart"><canvas id="pc"></canvas></div>
        <div class="demo-tlab">Derniers trades</div>
        <div id="tlog">
          <div class="demo-tr"><span class="dtt">09:32</span><span class="dtins">NQ Long</span><span class="dtp">+&euro;140</span></div>
          <div class="demo-tr"><span class="dtt">09:51</span><span class="dtins">NQ Short</span><span class="dtp">+&euro;100</span></div>
        </div>
      </div>
      <div class="demo-rp">
        <div class="demo-rlab">Alertes Caldra</div>
        <div class="demo-als" id="ac"><div style="font-size:12px;color:var(--t3);padding:.5rem 0">Aucune alerte &mdash; session saine.</div></div>
        <button class="demo-sbtn" id="sb" onclick="sim()">&rarr; Simuler le trade suivant</button>
      </div>
    </div>
  </div>
</div>

<!-- COMMENT -->
<div class="how-scene" id="comment">
  <div class="scene-tag">03 &mdash; Comment &ccedil;a marche</div>
  <div class="scene-h">Configure une fois.<br>Il veille toujours.</div>
  <div class="how-grid">
    <div class="how-item">
      <div class="how-n">01</div>
      <div class="how-h">Connecte ta plateforme</div>
      <div class="how-d">Connexion directe via API. Tes trades remontent automatiquement &mdash; rien &agrave; saisir manuellement.</div>
      <div class="how-tags">
        <span class="how-tag"><span class="htdot"></span>cTrader</span>
        <span class="how-tag"><span class="htdot"></span>MT5 EA</span>
        <span class="how-tag" style="opacity:.4">+ &agrave; venir</span>
      </div>
    </div>
    <div class="how-item">
      <div class="how-n">02</div>
      <div class="how-h">D&eacute;finis tes r&egrave;gles</div>
      <div class="how-d">Horaires de session, risk par trade, drawdown max, nombre de trades. Tes r&egrave;gles &mdash; pas des valeurs g&eacute;n&eacute;riques impos&eacute;es.</div>
    </div>
    <div class="how-item">
      <div class="how-n">03</div>
      <div class="how-h">Re&ccedil;ois l&rsquo;alerte avant le d&eacute;g&acirc;t</div>
      <div class="how-d">D&egrave;s qu&rsquo;un pattern dangereux est d&eacute;tect&eacute;, tu re&ccedil;ois une notification push + desktop en moins d&rsquo;une seconde.</div>
    </div>
  </div>
</div>

<!-- PULL QUOTE -->
<div class="quote-scene" id="avis">
  <div class="scene-tag" style="text-align:center;justify-content:center">04 &mdash; Ce qu&rsquo;ils disent</div>
  <blockquote class="pq">&laquo;&nbsp;J&rsquo;utilise TradeZella pour analyser mes sessions mais c&rsquo;est toujours apr&egrave;s coup. Avec la b&ecirc;ta Caldra, <strong>l&rsquo;alerte est arriv&eacute;e pendant ma session. C&rsquo;est pas du tout la m&ecirc;me chose.</strong>&nbsp;&raquo;</blockquote>
  <div class="pq-au">
    <div class="pq-av">KL</div>
    <div><div class="pq-name">Kevin L.</div><div class="pq-role">Trader Futures &middot; Lyon</div></div>
    <div class="pq-sep"></div>
    <div><div class="pq-name">KrazoliFX</div><div class="pq-role">Trader CFD/Forex &middot; Paris</div></div>
    <div class="pq-sep"></div>
    <div><div class="pq-name">Thomas M.</div><div class="pq-role">Trader Futures &middot; 3 ans</div></div>
  </div>
  <div class="testi-more">
    <div class="tm-c">
      <div class="tm-stars">&#9733;&#9733;&#9733;&#9733;&#9733;</div>
      <p class="tm-q">&laquo;&nbsp;J&rsquo;ai claqu&eacute; trois semaines de gains en une apr&egrave;s-midi &agrave; cause du tilt. <strong>Ce genre d&rsquo;outil j&rsquo;en avais besoin depuis longtemps.</strong>&nbsp;&raquo;</p>
      <div class="tm-au"><div class="tm-av">TM</div><div><div class="tm-name">Thomas M.</div><div class="tm-role">Futures &middot; 3 ans</div></div></div>
    </div>
    <div class="tm-c">
      <div class="tm-stars">&#9733;&#9733;&#9733;&#9733;&#9733;</div>
      <p class="tm-q">&laquo;&nbsp;<strong>Je savais m&ecirc;me pas que je faisais du revenge sizing.</strong> &Ccedil;a se voyait pas de l&rsquo;int&eacute;rieur. H&acirc;te que &ccedil;a sorte.&nbsp;&raquo;</p>
      <div class="tm-au"><div class="tm-av">KF</div><div><div class="tm-name">KrazoliFX</div><div class="tm-role">CFD/Forex &middot; Paris</div></div></div>
    </div>
  </div>
</div>

<!-- TARIFS -->
<div class="price-scene" id="tarifs">
  <div class="scene-tag">05 &mdash; Tarifs</div>
  <div class="scene-h">Rentabilis&eacute;<br>au premier trade &eacute;vit&eacute;.</div>
  <div class="pricing-grid">
    <div class="plan">
      <div class="plan-shine plan-sw"></div>
      <div class="plan-lab">Pro</div>
      <div class="plan-price"><sup>&euro;</sup>19<sub>/mois</sub></div>
      <div class="plan-note">14 jours gratuits &middot; Sans carte requise</div>
      <ul class="plan-features">
        <li><div class="pfc pfc-d"><svg viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3"/></svg></div>8 d&eacute;tections comportementales</li>
        <li><div class="pfc pfc-d"><svg viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3"/></svg></div>Alertes temps r&eacute;el (push + desktop)</li>
        <li><div class="pfc pfc-d"><svg viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3"/></svg></div>Dashboard comportemental</li>
        <li><div class="pfc pfc-d"><svg viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3"/></svg></div>Connexion cTrader &amp; MT5</li>
        <li><div class="pfc pfc-d"><svg viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3"/></svg></div>Analytics 30 jours</li>
        <li><div class="pfc pfc-d"><svg viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3"/></svg></div>Seuils configurables</li>
      </ul>
      <button class="plan-btn plan-btn-sec" onclick="joinWaitlistPlan()">Rejoindre la liste &rarr;</button>
    </div>
    <div class="plan plan-sent">
      <div class="plan-shine plan-sv"></div>
      <div class="plan-lab plan-lab-v">Sentinel</div>
      <div class="plan-price"><sup>&euro;</sup>39<sub>/mois</sub></div>
      <div class="plan-note">14 jours gratuits &middot; Sans carte requise</div>
      <ul class="plan-features">
        <li><div class="pfc pfc-d"><svg viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3"/></svg></div><span style="color:rgba(242,237,232,.25)">Tout le plan Pro, plus&nbsp;:</span></li>
        <li class="plan-hi"><div class="pfc pfc-v"><svg viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3"/></svg></div><strong>9e d&eacute;tection : Trade pendant les news</strong></li>
        <li class="plan-hi"><div class="pfc pfc-v"><svg viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3"/></svg></div><strong>Coach IA pendant la session</strong></li>
        <li class="plan-hi"><div class="pfc pfc-v"><svg viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3"/></svg></div><strong>Debriefing automatique post-session</strong></li>
        <li class="plan-hi"><div class="pfc pfc-v"><svg viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3"/></svg></div><strong>Analyse des patterns r&eacute;currents</strong></li>
        <li class="plan-hi"><div class="pfc pfc-v"><svg viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3"/></svg></div><strong>Analytics 180 jours</strong></li>
      </ul>
      <button class="plan-btn plan-btn-pri" onclick="joinWaitlistPlan()">Rejoindre la liste &rarr;</button>
    </div>
  </div>
  <p style="text-align:center;margin-top:1.5rem;font-size:12px;color:var(--t3)">14 jours d&rsquo;essai gratuit &middot; Pas de carte &middot; Annulable &agrave; tout moment</p>
</div>

<!-- HISTOIRE -->
<div class="story-scene" id="histoire">
  <div class="scene-tag">06 &mdash; L&rsquo;histoire</div>
  <div class="scene-h">Une conviction.<br>Un outil.</div>
  <div class="story-layout">
    <div>
      <div style="margin-top:3rem">
        <p class="story-p">Caldra Session est n&eacute; d&rsquo;une certitude simple&nbsp;: la psychologie de trader ne s&rsquo;apprend pas. Elle se construit. Lentement. Sous les graphiques. Dans la pression des positions ouvertes, dans le silence des pertes encaiss&eacute;es, dans les d&eacute;cisions prises &agrave; l&rsquo;instinct quand la raison n&rsquo;a plus la main.</p>
        <p class="story-p">On peut lire. On peut comprendre. On peut m&eacute;moriser chaque biais cognitif, chaque pattern comportemental. Et se retrouver exactement dans le m&ecirc;me &eacute;tat, la prochaine session, face au m&ecirc;me chart, &agrave; refaire exactement la m&ecirc;me chose.</p>
        <p class="story-p">Caldra Session n&rsquo;est pas l&agrave; pour changer la nature humaine. Il est l&agrave; pour ce moment pr&eacute;cis &mdash; celui o&ugrave; quelque chose d&eacute;raille, de l&rsquo;int&eacute;rieur, avant m&ecirc;me qu&rsquo;on le r&eacute;alise.</p>
        <div class="story-closing">La discipline ne se force pas. <em>Elle se prot&egrave;ge.</em></div>
      </div>
    </div>
    <div class="story-aside">
      <div class="story-fact"><div class="story-fact-n">2026<span>.</span></div><div class="story-fact-l">Ann&eacute;e de lancement</div></div>
      <div class="story-fact"><div class="story-fact-n">6<span>+</span></div><div class="story-fact-l">Mois de b&ecirc;ta priv&eacute;e</div></div>
      <div class="story-fact"><div class="story-fact-n">9<span>+</span></div><div class="story-fact-l">Comportements en surveillance</div></div>
    </div>
  </div>
</div>

<!-- CTA -->
<div class="cta-scene">
  <div class="cta-bg"></div>
  <div class="cta-tag">Disponible le 13 mai 2026</div>
  <div class="cta-h">Ton prochain tilt<br><em>peut &ecirc;tre le dernier.</em></div>
  <p class="cta-sub">14 jours d&rsquo;essai gratuit. Pas de carte requise.</p>
  <div class="cta-wf">
    <input type="email" id="cta-email" placeholder="ton@email.com" style="flex:1;padding:11px 14px;background:transparent;border:none;color:#fff;font-size:13px;font-family:'DM Sans',sans-serif;outline:none" />
    <button class="wf-btn" onclick="joinWaitlist('cta-email','cta-wf-sm')">Rejoindre &rarr;</button>
  </div>
  <div class="wf-sm cta-wf-sm" id="cta-wf-sm">Place r&eacute;serv&eacute;e. On te contacte &agrave; l&rsquo;ouverture.</div>
  <p class="cta-fn"><a href="/login" style="color:var(--t3);text-decoration:none">D&eacute;j&agrave; un compte ? <span style="color:var(--v)">Connexion &rarr;</span></a></p>
</div>

<footer>
  <div class="foot-logo">Cald<span>ra</span></div>
  <div class="foot-links">
    <a href="/mentions-legales" class="foot-lk">CGU</a>
    <a href="/confidentialite" class="foot-lk">Confidentialit&eacute;</a>
    <a href="/support" class="foot-lk">Support</a>
  </div>
  <div class="foot-email">contact@getcaldra.com</div>
</footer>

<script id="caldra-main-js">
(function(){

async function joinWaitlist(inputId, smId) {
  var email = document.getElementById(inputId).value.trim();
  if (!email || !email.includes('@')) return;
  try { await fetch('/api/waitlist',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email})}); } catch(e){}
  document.getElementById(smId).style.display='block';
  document.getElementById(inputId).value='';
}
window.joinWaitlist = joinWaitlist;
window.joinWaitlistPlan = function(){
  var el=document.getElementById('wf-email');
  if(el){el.focus();el.scrollIntoView({behavior:'smooth',block:'center'});}
};

/* Demo */
var pd=[0,140,240],simStep=0,ch;
var SCN=[
  {time:'10:14',side:'NQ Short',pnl:-180,a:null},
  {time:'10:17',side:'NQ Long (re-entrée)',pnl:-95,a:{l:1,ti:'Re-entrée immédiate détectée',su:'Trade ouvert 3 min après la sortie. Prends une pause.'}},
  {time:'10:31',side:'NQ Long (sizing ×2)',pnl:-210,a:{l:2,ti:'Revenge sizing + 3 pertes consécutives',su:'Taille doublée après série de pertes. Pause recommandée.'}},
  {time:'10:33',side:'NQ Long',pnl:-320,a:{l:3,ti:'STOP — Ferme la plateforme.',su:'Drawdown critique + série + revenge sizing simultanés.'}}
];
function initChart(){
  var canvas=document.getElementById('pc');if(!canvas)return;
  var cx=canvas.getContext('2d');
  var ex=window.Chart&&Chart.getChart&&Chart.getChart(cx);if(ex)ex.destroy();
  ch=new Chart(cx,{type:'line',data:{labels:['Ouv.','09:32','09:51'],datasets:[{data:pd,borderColor:'#3cc87a',borderWidth:2,pointRadius:3,pointBackgroundColor:'#3cc87a',fill:true,backgroundColor:'rgba(60,200,122,.06)',tension:.3}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{grid:{color:'rgba(255,255,255,.04)'},ticks:{color:'rgba(255,255,255,.18)',font:{size:10}}},y:{grid:{color:'rgba(255,255,255,.04)'},ticks:{color:'rgba(255,255,255,.18)',font:{size:10},callback:function(v){return '€'+v}}}}}});
}
function sim(){
  if(simStep>=SCN.length){resetD();return;}
  var t=SCN[simStep],np=pd[pd.length-1]+t.pnl,col=np>=0?'#3cc87a':'#e05050';
  pd.push(np);ch.data.labels.push(t.time);
  ch.data.datasets[0].borderColor=col;ch.data.datasets[0].pointBackgroundColor=col;
  ch.data.datasets[0].backgroundColor=np>=0?'rgba(60,200,122,.06)':'rgba(224,80,80,.06)';
  ch.data.datasets[0].data=pd;ch.update();
  document.getElementById('dpnl').textContent=(np>=0?'+':'')+'€'+np;document.getElementById('dpnl').style.color=col;
  document.getElementById('dpc').textContent=t.time+' — '+t.side;
  var log=document.getElementById('tlog'),el=document.createElement('div');el.className='demo-tr';
  el.innerHTML='<span class="dtt">'+t.time+'</span><span class="dtins">'+t.side+'</span><span class="'+(t.pnl>=0?'dtp':'dtn')+'">'+(t.pnl>=0?'+':'')+'€'+t.pnl+'</span>';
  log.appendChild(el);
  if(t.a){
    var c=document.getElementById('ac');if(c.querySelector('div[style]'))c.innerHTML='';
    var ae=document.createElement('div');ae.className='ai al'+t.a.l;
    ae.innerHTML='<div class="adot dl'+t.a.l+'"></div><div class="ab"><div class="at">'+t.a.ti+'</div><div class="as">'+t.a.su+'</div></div><div class="abg bl'+t.a.l+'">Niv. '+t.a.l+'</div>';
    c.appendChild(ae);
  }
  simStep++;
  if(simStep>=SCN.length)document.getElementById('sb').textContent='↺ Recommencer';
}
window.sim=sim;
function resetD(){
  simStep=0;pd=[0,140,240];
  ch.data.labels=['Ouv.','09:32','09:51'];ch.data.datasets[0].data=pd;
  ch.data.datasets[0].borderColor='#3cc87a';ch.data.datasets[0].pointBackgroundColor='#3cc87a';
  ch.data.datasets[0].backgroundColor='rgba(60,200,122,.06)';ch.update();
  document.getElementById('dpnl').textContent='+€240';document.getElementById('dpnl').style.color='#3cc87a';
  document.getElementById('dpc').textContent='Session en cours';
  document.getElementById('tlog').innerHTML='<div class="demo-tr"><span class="dtt">09:32</span><span class="dtins">NQ Long</span><span class="dtp">+€140</span></div><div class="demo-tr"><span class="dtt">09:51</span><span class="dtins">NQ Short</span><span class="dtp">+€100</span></div>';
  document.getElementById('ac').innerHTML='<div style="font-size:12px;color:var(--t3);padding:.5rem 0">Aucune alerte — session saine.</div>';
  document.getElementById('sb').textContent='→ Simuler le trade suivant';
}
if(window.Chart){initChart();}
else{var s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.0/chart.umd.min.js';s.onload=initChart;document.head.appendChild(s);}

})();
</script>
`

export default function Home() {
  useEffect(() => {
    const src = document.getElementById('caldra-main-js')?.textContent
    if (!src) return
    document.getElementById('caldra-main-init')?.remove()
    const s = document.createElement('script')
    s.id = 'caldra-main-init'
    s.textContent = src
    document.body.appendChild(s)
    return () => { document.getElementById('caldra-main-init')?.remove() }
  }, [])

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div dangerouslySetInnerHTML={{ __html: HTML }} />
    </>
  )
}
