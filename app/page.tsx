'use client'

import { useEffect, useRef } from 'react'

/* ─────────────────────────────────────────────────────────────
   CALDRA — Landing originale "La Ligne"
   Concept : une seule onde vivante qui réagit au curseur du
   visiteur. Plus il s'agite, plus la ligne dérape et vire au
   rouge — un compteur de discipline chute en direct. Il ressent
   le produit avant de s'inscrire.
   ───────────────────────────────────────────────────────────── */

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500&family=Instrument+Serif:ital@0;1&display=swap');
*{margin:0;padding:0;box-sizing:border-box}
html{scroll-behavior:smooth}
:root{
  --v:#8b5cf6;--v2:#a78bfa;--vd:#6d28d9;--amber:#f0a23c;--red:#e0503c;--green:#3cc87a;
  --va:rgba(139,92,246,.1);--vb:rgba(139,92,246,.3);
  --bg:#06060d;--s1:#0c0c16;--s2:#11111d;
  --b1:rgba(255,255,255,.07);--b2:rgba(255,255,255,.13);
  --tx:#f5f3fb;--t2:rgba(245,243,251,.58);--t3:rgba(245,243,251,.3);
  --serif:'Instrument Serif',Georgia,serif;--sans:'DM Sans',-apple-system,sans-serif;
  --mono:var(--font-geist-mono),ui-monospace,monospace;
}
.cd{font-family:var(--sans);background:var(--bg);color:var(--tx);overflow-x:hidden;line-height:1;-webkit-font-smoothing:antialiased}
.cd ::selection{background:rgba(139,92,246,.3);color:#fff}
.cd a{text-decoration:none;color:inherit}
.mono{font-family:var(--mono)}

/* ambient */
.amb{position:fixed;inset:0;z-index:0;pointer-events:none;overflow:hidden}
.amb-grid{position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.018) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.018) 1px,transparent 1px);background-size:74px 74px;-webkit-mask-image:radial-gradient(ellipse 100% 55% at 50% 0%,#000,transparent 78%);mask-image:radial-gradient(ellipse 100% 55% at 50% 0%,#000,transparent 78%)}
.amb-b{position:absolute;border-radius:50%;filter:blur(90px)}
.amb-1{top:-24%;left:50%;width:1100px;height:740px;transform:translateX(-50%);background:radial-gradient(ellipse,rgba(139,92,246,.2),transparent 62%);animation:dr1 22s ease-in-out infinite}
.amb-2{bottom:-32%;right:-14%;width:780px;height:680px;background:radial-gradient(ellipse,rgba(91,33,182,.18),transparent 64%);animation:dr2 28s ease-in-out infinite}
@keyframes dr1{0%,100%{transform:translateX(-50%) translateY(0)}50%{transform:translateX(-46%) translateY(34px)}}
@keyframes dr2{0%,100%{transform:translate(0,0)}50%{transform:translate(-46px,-36px)}}

.reveal{opacity:0;transform:translateY(32px);transition:opacity 1s cubic-bezier(.16,1,.3,1),transform 1s cubic-bezier(.16,1,.3,1)}
.reveal.in{opacity:1;transform:none}

/* nav */
.nav{position:fixed;top:0;left:0;right:0;z-index:100;display:flex;align-items:center;justify-content:space-between;padding:1.15rem 3.5rem;border-bottom:.5px solid var(--b1);backdrop-filter:blur(26px) saturate(150%);background:linear-gradient(180deg,rgba(6,6,13,.85),rgba(6,6,13,.5))}
.logo{font-family:var(--mono);font-size:13px;font-weight:500;letter-spacing:6px;text-transform:uppercase;color:#fff}.logo b{color:var(--v);font-weight:500}
.nav-links{display:flex;gap:2.5rem}
.nav-lk{font-family:var(--mono);font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:var(--t2);transition:color .15s}.nav-lk:hover{color:#fff}
.nav-r{display:flex;gap:.6rem;align-items:center}
.btn-ghost{font-family:var(--mono);font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:var(--t2);padding:8px 15px;border:.5px solid var(--b1);border-radius:5px;transition:all .15s}.btn-ghost:hover{color:#fff;border-color:var(--b2)}
.btn-v{font-family:var(--mono);font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:#fff;padding:8px 16px;border:.5px solid rgba(139,92,246,.5);border-radius:6px;background:linear-gradient(135deg,#8b5cf6,#6d28d9);box-shadow:0 4px 18px rgba(139,92,246,.34);transition:all .18s}.btn-v:hover{box-shadow:0 6px 28px rgba(139,92,246,.55);transform:translateY(-1px)}

/* HERO */
.hero{position:relative;z-index:1;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:9rem 2rem 0;overflow:hidden;border-bottom:.5px solid var(--b1)}
.hero-canvas{position:absolute;left:0;right:0;bottom:0;height:46%;z-index:0;width:100%;display:block}
.hero-inner{position:relative;z-index:2;display:flex;flex-direction:column;align-items:center}
.eyebrow{font-family:var(--mono);font-size:10px;letter-spacing:3px;text-transform:uppercase;color:var(--v2);margin-bottom:2.25rem;display:inline-flex;align-items:center;gap:9px;padding:8px 16px;border:.5px solid var(--vb);border-radius:100px;background:var(--va);backdrop-filter:blur(8px)}
.eydot{width:5px;height:5px;border-radius:50%;background:var(--v);box-shadow:0 0 10px var(--v);animation:pulse 2s ease-in-out infinite}
@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.35;transform:scale(.6)}}
.hero h1{font-family:var(--serif);font-size:clamp(3rem,7vw,6rem);font-weight:400;line-height:1;letter-spacing:-1.5px;margin-bottom:1.75rem;max-width:13ch}
.hero h1 em{font-style:italic;background:linear-gradient(115deg,#c4b5fd,#8b5cf6);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 0 30px rgba(139,92,246,.5))}
.hero-sub{font-size:16.5px;color:var(--t2);line-height:1.75;max-width:520px;margin-bottom:2.5rem;font-weight:300}
.ctas{display:flex;gap:12px;align-items:center;justify-content:center;flex-wrap:wrap}
.cta-main{display:inline-flex;align-items:center;gap:8px;padding:14px 28px;background:linear-gradient(135deg,#8b5cf6,#6d28d9);border-radius:9px;color:#fff;font-size:14px;font-weight:500;transition:all .22s;box-shadow:0 8px 30px rgba(139,92,246,.36),inset 0 1px 0 rgba(255,255,255,.2)}
.cta-main:hover{transform:translateY(-2px);box-shadow:0 14px 44px rgba(139,92,246,.55)}
.cta-ghost{font-size:13.5px;color:var(--t2);padding:13px 20px;border:.5px solid var(--b1);border-radius:9px;transition:all .15s}.cta-ghost:hover{color:#fff;border-color:var(--b2)}

/* live discipline readout */
.readout{position:absolute;left:50%;bottom:calc(46% - 18px);transform:translateX(-50%);z-index:3;display:flex;align-items:center;gap:18px;padding:11px 20px;border-radius:100px;background:rgba(12,12,22,.7);border:.5px solid var(--b2);backdrop-filter:blur(14px);box-shadow:0 14px 44px rgba(0,0,0,.5)}
.ro-block{display:flex;align-items:baseline;gap:8px}
.ro-num{font-family:var(--serif);font-size:30px;font-weight:400;letter-spacing:-1px;line-height:1;transition:color .4s}
.ro-lbl{font-family:var(--mono);font-size:8.5px;letter-spacing:1.5px;text-transform:uppercase;color:var(--t3)}
.ro-div{width:1px;height:22px;background:var(--b2)}
.ro-mood{font-family:var(--mono);font-size:10px;letter-spacing:1.5px;text-transform:uppercase;transition:color .4s;min-width:130px;text-align:left}
.hero-hint{font-family:var(--mono);font-size:9.5px;letter-spacing:2px;text-transform:uppercase;color:var(--t3);position:absolute;bottom:1.5rem;left:50%;transform:translateX(-50%);z-index:3;display:flex;align-items:center;gap:8px;opacity:.7}
.hint-arrow{animation:bob 1.8s ease-in-out infinite}
@keyframes bob{0%,100%{transform:translateX(0)}50%{transform:translateX(5px)}}

/* sections */
.sec{position:relative;z-index:1;padding:7rem 3.5rem;border-bottom:.5px solid var(--b1)}
.wrap{max-width:1080px;margin:0 auto}
.tag{font-family:var(--mono);font-size:10px;letter-spacing:3px;text-transform:uppercase;color:var(--v);display:flex;align-items:center;gap:1rem;margin-bottom:2.5rem}
.tag::after{content:'';flex:1;max-width:230px;height:.5px;background:linear-gradient(90deg,var(--vb),transparent)}
.h2{font-family:var(--serif);font-size:clamp(2.1rem,4.2vw,3.4rem);font-weight:400;letter-spacing:-1px;line-height:1.06;margin-bottom:1.25rem}
.h2 em{font-style:italic;color:var(--v2)}
.lead{font-size:15.5px;color:var(--t2);line-height:1.8;max-width:560px;font-weight:300}

/* ANATOMY timeline */
.ana-grid{margin-top:3.5rem;position:relative}
.ana-grid::before{content:'';position:absolute;left:11px;top:8px;bottom:8px;width:1.5px;background:linear-gradient(180deg,var(--green),var(--amber) 55%,var(--red))}
.beat{position:relative;padding:0 0 2.25rem 3rem}
.beat:last-child{padding-bottom:0}
.beat-dot{position:absolute;left:3px;top:3px;width:18px;height:18px;border-radius:50%;border:2px solid var(--bg);background:var(--v);box-shadow:0 0 0 3px rgba(139,92,246,.12)}
.beat-row{display:flex;align-items:baseline;gap:14px;flex-wrap:wrap;margin-bottom:.5rem}
.beat-time{font-family:var(--mono);font-size:12px;color:var(--t2);letter-spacing:1px}
.beat-act{font-size:15px;color:#fff;font-weight:500}
.beat-pnl{font-family:var(--mono);font-size:13px;font-weight:500}
.beat-note{font-size:13.5px;color:var(--t2);line-height:1.6;font-weight:300;max-width:540px}
.beat-flag{display:inline-flex;align-items:center;gap:8px;margin-top:.7rem;padding:7px 13px;border-radius:9px;font-size:12.5px;line-height:1.4}
.flag-lab{font-family:var(--mono);font-size:8.5px;letter-spacing:.5px;text-transform:uppercase;padding:2px 7px;border-radius:100px;flex-shrink:0}
.fl1{background:rgba(255,200,0,.06);border:.5px solid rgba(255,200,0,.16);color:rgba(255,221,120,.9)}.fl1 .flag-lab{background:rgba(255,200,0,.14);color:#ffc800}
.fl2{background:rgba(240,162,60,.07);border:.5px solid rgba(240,162,60,.18);color:rgba(245,190,130,.92)}.fl2 .flag-lab{background:rgba(240,162,60,.16);color:var(--amber)}
.fl3{background:rgba(224,80,60,.09);border:.5px solid rgba(224,80,60,.24);color:rgba(245,160,150,.95)}.fl3 .flag-lab{background:rgba(224,80,60,.18);color:var(--red)}

/* DETECTORS — living grid */
.dets{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;margin-top:3.5rem;background:var(--b1);border:.5px solid var(--b1);border-radius:16px;overflow:hidden}
.det{background:var(--s1);padding:1.6rem;transition:background .25s;position:relative;overflow:hidden}
.det:hover{background:var(--s2)}
.det::before{content:'';position:absolute;left:0;top:0;bottom:0;width:2px;background:var(--v);opacity:0;transition:opacity .25s}
.det:hover::before{opacity:1}
.det-n{font-family:var(--mono);font-size:10px;color:var(--t3);letter-spacing:1px;margin-bottom:1rem;display:flex;justify-content:space-between;align-items:center}
.det-lvl{font-family:var(--mono);font-size:8px;letter-spacing:.5px;text-transform:uppercase;padding:2px 7px;border-radius:100px}
.lv1{background:rgba(255,200,0,.1);color:#ffc800}.lv2{background:rgba(240,162,60,.12);color:var(--amber)}.lv3{background:rgba(224,80,60,.14);color:var(--red)}
.det-name{font-size:15px;color:#fff;font-weight:500;margin-bottom:.5rem}
.det-desc{font-size:12.5px;color:var(--t2);line-height:1.6;font-weight:300}
.det-sent{font-family:var(--mono);font-size:8px;letter-spacing:.5px;text-transform:uppercase;color:var(--v);margin-top:.7rem;display:inline-block;padding:2px 8px;border:.5px solid var(--vb);border-radius:100px;background:var(--va)}

/* ALERTS */
.split{display:grid;grid-template-columns:1fr 1fr;gap:5rem;align-items:center}
.notif-stack{display:flex;flex-direction:column;gap:.85rem}
.notif{background:linear-gradient(180deg,rgba(255,255,255,.035),rgba(255,255,255,.008));border:.5px solid var(--b2);border-radius:15px;padding:1.05rem 1.3rem;display:flex;align-items:flex-start;gap:13px;transition:all .25s;backdrop-filter:blur(8px)}.notif:hover{transform:translateX(6px);box-shadow:0 16px 40px rgba(0,0,0,.4)}
.notif-ic{width:40px;height:40px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:17px;flex-shrink:0}
.notif-app{font-family:var(--mono);font-size:9px;color:var(--t3);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px}
.notif-t{font-size:13.5px;font-weight:500;color:#fff;margin-bottom:3px;line-height:1.3}
.notif-m{font-size:12.5px;color:var(--t2);line-height:1.45;font-weight:300}
.notif-time{font-family:var(--mono);font-size:9.5px;color:var(--t3);flex-shrink:0}
.n2{border-color:rgba(240,162,60,.28);background:rgba(240,162,60,.05)}
.n3{border-color:rgba(224,80,60,.32);background:rgba(224,80,60,.06)}
.chans{margin-top:2rem;display:flex;flex-direction:column;gap:.85rem}
.chan{display:flex;align-items:center;gap:.9rem}
.chan-ic{width:34px;height:34px;border-radius:9px;background:rgba(60,200,122,.08);border:.5px solid rgba(60,200,122,.2);display:flex;align-items:center;justify-content:center;font-size:15px;flex-shrink:0}
.chan-t{font-size:13px;color:var(--t2);font-weight:300}

/* steps */
.steps{display:grid;grid-template-columns:repeat(3,1fr);margin-top:3.5rem;border:.5px solid var(--b1);border-radius:16px;overflow:hidden}
.step{padding:2.5rem;background:var(--s1);transition:background .22s}.step:hover{background:var(--s2)}.step:not(:last-child){border-right:.5px solid var(--b1)}
.step-n{font-family:var(--mono);font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--v);margin-bottom:2rem}
.step-h{font-family:var(--serif);font-size:20px;font-weight:400;color:#fff;margin-bottom:.75rem;line-height:1.3}
.step-d{font-size:13px;color:var(--t2);line-height:1.7;font-weight:300}
.step-tags{display:flex;flex-wrap:wrap;gap:5px;margin-top:1.25rem}
.pill{font-family:var(--mono);font-size:9.5px;padding:4px 10px;background:rgba(255,255,255,.04);border:.5px solid var(--b1);border-radius:100px;color:var(--t2);display:flex;align-items:center;gap:5px}
.pill-dot{width:4px;height:4px;border-radius:50%;background:var(--green)}

/* stat strip */
.stats{display:grid;grid-template-columns:repeat(4,1fr);border-bottom:.5px solid var(--b1);position:relative;z-index:1}
.stat{padding:2.25rem 3.5rem;border-right:.5px solid var(--b1)}.stat:last-child{border-right:none}
.stat-n{font-family:var(--serif);font-size:38px;font-weight:400;letter-spacing:-1px;color:#fff;line-height:1;margin-bottom:.5rem}.stat-n span{color:var(--v)}
.stat-l{font-family:var(--mono);font-size:9.5px;letter-spacing:1.5px;text-transform:uppercase;color:var(--t3)}

/* pricing */
.prices{display:grid;grid-template-columns:1fr 1fr;gap:1rem;max-width:820px;margin:3.5rem auto 0}
.plan{border-radius:18px;padding:2.25rem;position:relative;overflow:hidden;transition:transform .25s}.plan:hover{transform:translateY(-4px)}
.plan-pro{background:var(--s1);border:.5px solid var(--b2)}
.plan-sent{background:linear-gradient(150deg,rgba(139,92,246,.14),var(--s1) 56%);border:.5px solid rgba(139,92,246,.45);box-shadow:0 0 80px rgba(139,92,246,.15)}
.plan-shine{position:absolute;top:0;left:0;right:0;height:1px}
.sw{background:linear-gradient(90deg,transparent,rgba(255,255,255,.08),transparent)}.sv{background:linear-gradient(90deg,transparent,rgba(124,58,237,.55),transparent)}
.plan-lab{font-family:var(--mono);font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--t3);margin-bottom:1.5rem}.plan-lab.v{color:var(--v2)}
.plan-price{font-family:var(--serif);font-size:50px;font-weight:400;color:#fff;letter-spacing:-1px;line-height:1;margin-bottom:.4rem}
.plan-price sup{font-size:24px;vertical-align:super}.plan-price sub{font-family:var(--mono);font-size:13px;color:var(--t2)}
.plan-note{font-family:var(--mono);font-size:11px;color:var(--t3);margin-bottom:1.5rem}
.plan-tag{font-size:13.5px;color:var(--t2);line-height:1.6;padding:1.1rem 0;border-top:.5px solid var(--b1);border-bottom:.5px solid var(--b1);margin-bottom:1.5rem;font-weight:300}
.feats{list-style:none;margin-bottom:2rem}
.feats li{font-size:13px;color:var(--t2);padding:.6rem 0;border-bottom:.5px solid rgba(255,255,255,.04);display:flex;align-items:center;gap:10px;font-weight:300}.feats li:last-child{border-bottom:none}
.feats .hi{color:#fff}
.fc{width:17px;height:17px;border-radius:5px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.fc svg{width:9px;height:9px;fill:none;stroke-width:2.5;stroke-linecap:round;stroke-linejoin:round}
.fc-d{background:rgba(255,255,255,.05);border:.5px solid rgba(255,255,255,.08)}.fc-d svg{stroke:var(--t3)}
.fc-v{background:var(--va);border:.5px solid var(--vb)}.fc-v svg{stroke:var(--v)}
.plan-btn{width:100%;padding:13px;border-radius:8px;font-size:12.5px;font-weight:500;font-family:var(--sans);cursor:pointer;transition:all .15s;display:block;text-align:center;border:none}
.pb-sec{background:transparent;border:.5px solid var(--b2);color:var(--t2)}.pb-sec:hover{border-color:rgba(255,255,255,.25);color:#fff}
.pb-pri{background:linear-gradient(135deg,#8b5cf6,#6d28d9);color:#fff;box-shadow:0 6px 24px rgba(139,92,246,.34)}.pb-pri:hover{transform:translateY(-2px);box-shadow:0 12px 34px rgba(139,92,246,.5)}

/* story */
.story{max-width:660px}
.story p{font-size:16.5px;color:var(--t2);line-height:1.95;font-weight:300;margin-bottom:1.5rem}
.story-end{font-family:var(--serif);font-size:24px;color:#fff;line-height:1.4;margin-top:.5rem}
.story-end em{font-style:italic;color:var(--v2)}

/* cta */
.cta-sec{padding:9rem 3.5rem;text-align:center;position:relative;z-index:1}
.cta-h{font-family:var(--serif);font-size:clamp(3rem,7vw,6rem);font-weight:400;letter-spacing:-2px;line-height:1.02;margin-bottom:1.5rem}
.cta-h em{font-style:italic;background:linear-gradient(115deg,#c4b5fd,#8b5cf6);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 0 32px rgba(139,92,246,.5))}
.cta-sub{font-size:17px;color:var(--t2);margin-bottom:2.5rem;font-weight:300}

/* footer */
.foot{padding:2rem 3.5rem;display:flex;justify-content:space-between;align-items:center;border-top:.5px solid var(--b1);position:relative;z-index:1}
.foot-logo{font-family:var(--mono);font-size:12px;letter-spacing:5px;text-transform:uppercase;color:rgba(255,255,255,.18)}.foot-logo b{color:rgba(124,58,237,.4);font-weight:500}
.foot-links{display:flex;gap:2rem}
.foot-lk{font-family:var(--mono);font-size:10px;color:var(--t3);letter-spacing:.5px;text-transform:uppercase;transition:color .15s}.foot-lk:hover{color:var(--t2)}
.foot-mail{font-family:var(--mono);font-size:10.5px;color:var(--t3)}

@media(max-width:1024px){
  .split{grid-template-columns:1fr;gap:3rem}
  .dets{grid-template-columns:1fr 1fr}
  .steps{grid-template-columns:1fr}.step:not(:last-child){border-right:none;border-bottom:.5px solid var(--b1)}
  .prices{grid-template-columns:1fr}
  .stats{grid-template-columns:1fr 1fr}.stat:nth-child(2){border-right:none}.stat:nth-child(3),.stat:nth-child(4){border-top:.5px solid var(--b1)}.stat:nth-child(4){border-right:none}
  .nav{padding:1.25rem 1.5rem}.nav-links{display:none}
  .sec,.cta-sec{padding:4.5rem 1.5rem}
  .ro-mood{min-width:auto}
  .foot{padding:1.5rem;flex-direction:column;gap:1rem;text-align:center}
}
@media(max-width:600px){
  .dets{grid-template-columns:1fr}
  .stats{grid-template-columns:1fr}.stat{border-right:none;border-top:.5px solid var(--b1)}.stat:first-child{border-top:none}
  .readout{gap:12px;padding:9px 14px}.ro-num{font-size:24px}
}
@media(max-width:480px){
  .cd{font-size:15px}
  .hero{padding:7rem 1.25rem 0}
  .hero h1{font-size:clamp(2.6rem,12vw,3.6rem)}
  .ctas{flex-direction:column;width:100%}
  .cta-main,.cta-ghost{width:100%;justify-content:center;text-align:center}
  .sec,.cta-sec{padding:3.5rem 1.25rem}
  .nav{padding:1rem 1.25rem}
}
`

type Det = { n: string; name: string; desc: string; lv: 1 | 2 | 3; sentinel?: boolean }
const DETECTORS: Det[] = [
  { n: '01', name: 'Revenge sizing', desc: "La taille grimpe après une perte. Le chemin le plus court pour exploser une journée.", lv: 2 },
  { n: '02', name: 'Re-entrée immédiate', desc: "Reprendre un trade moins de 2 minutes après la sortie. L'impulsion, pas l'analyse.", lv: 1 },
  { n: '03', name: 'Série de pertes', desc: "Pertes consécutives au-delà de ton seuil — là où l'émotion prend la main.", lv: 2 },
  { n: '04', name: 'Alerte drawdown', desc: "Perte journalière qui approche ou dépasse ta limite. Préventive à 80%, stop à 100%.", lv: 3 },
  { n: '05', name: 'Hors session', desc: "Trade en dehors de tes horaires. Fatigue, ennui — rarement un bon état pour entrer.", lv: 1 },
  { n: '06', name: 'Suractivité', desc: "Trop de trades sur la session. Plus tu trades, plus tu trades souvent pire.", lv: 2 },
  { n: '07', name: 'Trade pendant news', desc: "Entrée à ±5 min d'un événement macro. News + position = casino.", lv: 2, sentinel: true },
  { n: '08', name: 'Stop non respecté', desc: "Position tenue au-delà de ton stop. L'espoir n'est pas une stratégie.", lv: 2 },
  { n: '09', name: 'Risk dépassé', desc: "Sizing au-delà de ton risk par trade défini. Tes règles existent pour une raison.", lv: 2 },
]

type Beat = {
  time: string; act: string; pnl: string; color: string; glow: string; note: string
  flag?: { lvl: 1 | 2 | 3; lab: string; txt: string }
}
const BEATS: Beat[] = [
  { time: '09:32', act: 'NQ Long', pnl: '+€140', color: '#3cc87a', glow: 'rgba(60,200,122,.18)', note: "Plan respecté. Sizing nominal. La ligne est calme." },
  { time: '09:51', act: 'NQ Short', pnl: '+€100', color: '#3cc87a', glow: 'rgba(60,200,122,.18)', note: "Toujours dans le vert, toujours dans les clous." },
  { time: '10:14', act: 'NQ Short', pnl: '−€180', color: '#f0a23c', glow: 'rgba(240,162,60,.18)', note: "Première perte de la session. Rien d'anormal — pour l'instant." },
  { time: '10:17', act: 'NQ Long', pnl: '−€95', color: '#f0a23c', glow: 'rgba(240,162,60,.18)', note: "Re-entrée 3 minutes après la sortie. L'analyse a laissé place au réflexe.", flag: { lvl: 1, lab: 'Niveau 1', txt: 'Re-entrée immédiate détectée — prends une pause.' } },
  { time: '10:31', act: 'NQ Long ×2', pnl: '−€210', color: '#e0503c', glow: 'rgba(224,80,60,.2)', note: "Taille doublée après 3 pertes. Le revenge sizing est enclenché.", flag: { lvl: 2, lab: 'Niveau 2', txt: 'Revenge sizing + série de pertes — alerte poussée sur ton téléphone.' } },
  { time: '10:33', act: 'NQ Long', pnl: '−€320', color: '#e0503c', glow: 'rgba(224,80,60,.2)', note: "Drawdown critique. Trois patterns dangereux en même temps.", flag: { lvl: 3, lab: 'Niveau 3', txt: 'STOP — ferme la plateforme maintenant.' } },
]

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const scoreRef = useRef<HTMLSpanElement | null>(null)
  const moodRef = useRef<HTMLSpanElement | null>(null)

  /* ── interactive signal canvas ── */
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const coarse = window.matchMedia?.('(pointer: coarse)').matches

    let W = 0, H = 0, dpr = 1
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      const r = canvas.getBoundingClientRect()
      W = r.width; H = r.height
      canvas.width = Math.max(1, W * dpr); canvas.height = Math.max(1, H * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)

    // agitation driven by cursor velocity
    let agitation = 0
    let energy = 0
    let lastX = 0, lastY = 0, lastT = 0
    let lastMove = -9999
    let score = 100
    let moodPrev = ''

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t
    const color = (s: number) => {
      const v = [139, 92, 246], am = [240, 162, 60], rd = [224, 80, 60]
      let c1, c2, t
      if (s < 0.5) { c1 = v; c2 = am; t = s / 0.5 } else { c1 = am; c2 = rd; t = (s - 0.5) / 0.5 }
      return [Math.round(lerp(c1[0], c2[0], t)), Math.round(lerp(c1[1], c2[1], t)), Math.round(lerp(c1[2], c2[2], t))]
    }

    const onMove = (e: PointerEvent) => {
      const now = performance.now()
      const dt = Math.max(1, now - lastT)
      const dx = e.clientX - lastX, dy = e.clientY - lastY
      const speed = Math.sqrt(dx * dx + dy * dy) / dt // px/ms
      if (lastT) energy = Math.min(1, energy + Math.min(speed * 0.18, 0.5))
      lastX = e.clientX; lastY = e.clientY; lastT = now; lastMove = now
    }
    if (!coarse) window.addEventListener('pointermove', onMove)

    const start = performance.now()
    let raf = 0

    const draw = (now: number) => {
      const t = (now - start) / 1000

      // coarse / touch: auto-breathing stress cycle so it lives without a cursor
      if (coarse) {
        const phase = ((now - start) % 9000) / 9000
        const d = (phase - 0.5) / 0.16
        energy = Math.exp(-d * d)
      } else {
        if (now - lastMove > 120) energy *= 0.93 // decay when still
      }
      agitation += (energy - agitation) * 0.09
      const s = Math.max(0, Math.min(1, agitation))

      // discipline score follows agitation
      score += s > 0.25 ? -(s * 0.9) : 0.5
      score = Math.max(0, Math.min(100, score))

      ctx.clearRect(0, 0, W, H)
      const mid = H * 0.5
      const c = color(s)
      const rgb = `rgba(${c[0]},${c[1]},${c[2]},`
      const pts: [number, number][] = []
      for (let x = 0; x <= W; x += 2) {
        const nx = x / W
        const calm = Math.sin(nx * 7 + t * 1.5) * 8 + Math.sin(nx * 3 - t * 0.9) * 5
        const env = Math.exp(-Math.pow((nx - 0.5) / 0.42, 2))
        const chaosAmp = lerp(0, H * 0.36, s)
        const chaos = (Math.sin(nx * 52 + t * 9) * 0.6 + Math.sin(nx * 118 - t * 15) * 0.4 + Math.sin(nx * 28 + t * 5) * 0.5) * chaosAmp * env
        pts.push([x, mid + calm * (1 + s * 0.6) + chaos])
      }
      ctx.lineJoin = 'round'; ctx.lineCap = 'round'
      // glow
      ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))
      ctx.strokeStyle = rgb + (0.1 + s * 0.12) + ')'; ctx.lineWidth = 10 + s * 9
      ctx.shadowColor = rgb + '0.7)'; ctx.shadowBlur = 26 + s * 34; ctx.stroke()
      // crisp
      ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))
      ctx.strokeStyle = rgb + '0.92)'; ctx.lineWidth = 1.7; ctx.shadowBlur = 10 + s * 22; ctx.stroke()
      ctx.shadowBlur = 0
      // leading pulse
      const last = pts[pts.length - 1]
      if (last) {
        ctx.beginPath(); ctx.arc(last[0], last[1], 2.4 + s * 2.4, 0, 7)
        ctx.fillStyle = rgb + '1)'; ctx.shadowColor = rgb + '0.9)'; ctx.shadowBlur = 18; ctx.fill(); ctx.shadowBlur = 0
      }

      // readouts
      if (scoreRef.current) { scoreRef.current.textContent = String(Math.round(score)); scoreRef.current.style.color = `rgb(${c[0]},${c[1]},${c[2]})` }
      if (moodRef.current) {
        const mood = s < 0.22 ? 'Sous contrôle' : s < 0.6 ? 'Ça dérive…' : 'Tu dérailles'
        if (mood !== moodPrev) { moodPrev = mood; moodRef.current.textContent = mood; moodRef.current.style.color = `rgb(${c[0]},${c[1]},${c[2]})` }
      }

      raf = requestAnimationFrame(draw)
    }

    if (reduce) {
      // static calm render
      const c = color(0); const rgb = `rgba(${c[0]},${c[1]},${c[2]},`
      ctx.clearRect(0, 0, W, H); ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.beginPath()
      for (let x = 0; x <= W; x += 2) { const y = H * 0.5 + Math.sin((x / W) * 7) * 7; x ? ctx.lineTo(x, y) : ctx.moveTo(x, y) }
      ctx.strokeStyle = rgb + '0.9)'; ctx.lineWidth = 1.7; ctx.stroke()
      if (scoreRef.current) scoreRef.current.textContent = '100'
      if (moodRef.current) moodRef.current.textContent = 'Sous contrôle'
    } else {
      raf = requestAnimationFrame(draw)
    }

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', onMove)
    }
  }, [])

  /* ── reveal on scroll ── */
  useEffect(() => {
    const els = Array.from(document.querySelectorAll('.reveal'))
    if (!('IntersectionObserver' in window)) { els.forEach(e => e.classList.add('in')); return }
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target) } })
    }, { threshold: 0.12 })
    els.forEach(e => io.observe(e))
    return () => io.disconnect()
  }, [])

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="cd">
        <div className="amb">
          <div className="amb-grid" />
          <div className="amb-b amb-1" />
          <div className="amb-b amb-2" />
        </div>

        <nav className="nav">
          <a href="#" className="logo">Cald<b>ra</b></a>
          <div className="nav-links">
            <a className="nav-lk" href="#anatomie">Anatomie</a>
            <a className="nav-lk" href="#detecteurs">Détecteurs</a>
            <a className="nav-lk" href="#alertes">Alertes</a>
            <a className="nav-lk" href="#tarifs">Tarifs</a>
          </div>
          <div className="nav-r">
            <a href="/login" className="btn-ghost">Connexion</a>
            <a href="/signup" className="btn-v">S'inscrire</a>
          </div>
        </nav>

        {/* HERO */}
        <header className="hero">
          <canvas ref={canvasRef} className="hero-canvas" />
          <div className="readout">
            <div className="ro-block">
              <span ref={scoreRef} className="ro-num">100</span>
              <span className="ro-lbl">Discipline</span>
            </div>
            <div className="ro-div" />
            <span ref={moodRef} className="ro-mood">Sous contrôle</span>
          </div>
          <div className="hero-inner">
            <div className="eyebrow"><span className="eydot" />Intelligence comportementale — Temps réel</div>
            <h1>Tu ne vois pas quand tu dérailles. <em>Lui si.</em></h1>
            <p className="hero-sub">Caldra lit le signal de chaque session et détecte ce qui la détruit — revenge trading, re-entrées impulsives, tilt — avant que les dégâts ne soient faits.</p>
            <div className="ctas">
              <a href="/signup" className="cta-main">Commencer gratuitement <span>→</span></a>
              <a href="/login" className="cta-ghost">J'ai déjà un compte</a>
            </div>
          </div>
          <div className="hero-hint"><span className="hint-arrow mono">↜</span>Bouge ta souris sur la ligne</div>
        </header>

        {/* STATS */}
        <div className="stats">
          <div className="stat"><div className="stat-n">9<span>+</span></div><div className="stat-l">Comportements détectés</div></div>
          <div className="stat"><div className="stat-n">3</div><div className="stat-l">Niveaux d'alerte</div></div>
          <div className="stat"><div className="stat-n"><span>&lt;</span>1s</div><div className="stat-l">Temps de détection</div></div>
          <div className="stat"><div className="stat-n">100<span>%</span></div><div className="stat-l">Automatique</div></div>
        </div>

        {/* ANATOMIE D'UN TILT */}
        <section className="sec" id="anatomie">
          <div className="wrap reveal">
            <div className="tag">Anatomie d'un tilt</div>
            <h2 className="h2">Une bonne session bascule<br /><em>en six trades.</em></h2>
            <p className="lead">Voici une vraie spirale, minute par minute. À chaque dérapage, ce que Caldra voit — et te dit — en temps réel.</p>
            <div className="ana-grid">
              {BEATS.map((b, i) => (
                <div className="beat" key={i}>
                  <div className="beat-dot" style={{ background: b.color, boxShadow: `0 0 0 3px ${b.glow}` }} />
                  <div className="beat-row">
                    <span className="beat-time mono">{b.time}</span>
                    <span className="beat-act">{b.act}</span>
                    <span className="beat-pnl mono" style={{ color: b.color }}>{b.pnl}</span>
                  </div>
                  <div className="beat-note">{b.note}</div>
                  {b.flag && (
                    <div className={`beat-flag fl${b.flag.lvl}`}>
                      <span className="flag-lab">{b.flag.lab}</span>{b.flag.txt}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* DÉTECTEURS */}
        <section className="sec" id="detecteurs">
          <div className="wrap reveal">
            <div className="tag">Ce qu'on détecte</div>
            <h2 className="h2">Ton empreinte<br /><em>comportementale,</em> en direct.</h2>
            <p className="lead">Chaque trader a une signature quand il commence à dérailler. Caldra lit la tienne et te le dit avant que ça coûte.</p>
            <div className="dets">
              {DETECTORS.map(d => (
                <div className="det" key={d.n}>
                  <div className="det-n mono"><span>{d.n}</span><span className={`det-lvl lv${d.lv}`}>Niv. {d.lv}</span></div>
                  <div className="det-name">{d.name}</div>
                  <div className="det-desc">{d.desc}</div>
                  {d.sentinel && <span className="det-sent mono">Sentinel</span>}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ALERTES */}
        <section className="sec" id="alertes">
          <div className="wrap reveal">
            <div className="split">
              <div>
                <div className="tag" style={{ maxWidth: 'none' }}>Alertes en temps réel</div>
                <h2 className="h2">Push. Desktop.<br /><em>En moins d'une seconde.</em></h2>
                <p className="lead" style={{ marginTop: '1.25rem' }}>Dès qu'un pattern dangereux est détecté, l'alerte tombe sur ton téléphone ET sur ton bureau. Au moment où ça compte.</p>
                <div className="chans">
                  <div className="chan"><div className="chan-ic">📱</div><div className="chan-t">Push iOS &amp; Android via Web Push (VAPID)</div></div>
                  <div className="chan"><div className="chan-ic">💻</div><div className="chan-t">Notification desktop (Chrome, Safari, Firefox)</div></div>
                  <div className="chan"><div className="chan-ic">💬</div><div className="chan-t">Webhook Slack / Discord configurable</div></div>
                </div>
              </div>
              <div className="notif-stack">
                <div className="notif n3"><div className="notif-ic" style={{ background: 'rgba(224,80,60,.14)' }}>🔴</div><div><div className="notif-app mono">Caldra Session</div><div className="notif-t">STOP — Drawdown max atteint</div><div className="notif-m">PnL session : −€420 (−4.2%). Ferme la plateforme maintenant.</div></div><div className="notif-time mono">maintenant</div></div>
                <div className="notif n2"><div className="notif-ic" style={{ background: 'rgba(240,162,60,.12)' }}>⚠️</div><div><div className="notif-app mono">Caldra Session</div><div className="notif-t">Revenge sizing détecté</div><div className="notif-m">Sizing ×2.1 après une perte — 1.4 lots vs 0.67 lots</div></div><div className="notif-time mono">3 min</div></div>
                <div className="notif"><div className="notif-ic" style={{ background: 'rgba(255,200,0,.1)' }}>⚡</div><div><div className="notif-app mono">Caldra Session</div><div className="notif-t">Re-entrée rapide</div><div className="notif-m">87 secondes après la clôture. Délai minimum : 120s.</div></div><div className="notif-time mono">11 min</div></div>
              </div>
            </div>
          </div>
        </section>

        {/* COMMENT */}
        <section className="sec" id="comment">
          <div className="wrap reveal">
            <div className="tag">Comment ça marche</div>
            <h2 className="h2">Configure une fois.<br /><em>Il veille toujours.</em></h2>
            <p className="lead">Aucune saisie manuelle. Caldra se connecte à ta plateforme et fait le reste.</p>
            <div className="steps">
              <div className="step"><div className="step-n mono">01 — Connecte</div><div className="step-h">Ta plateforme de trading</div><div className="step-d">Connexion directe via API. Tes trades remontent automatiquement — rien à saisir.</div><div className="step-tags"><span className="pill mono"><span className="pill-dot" />cTrader</span><span className="pill mono"><span className="pill-dot" />MT5 EA</span><span className="pill mono" style={{ opacity: .4 }}>+ à venir</span></div></div>
              <div className="step"><div className="step-n mono">02 — Configure</div><div className="step-h">Tes règles et limites</div><div className="step-d">Horaires, risk par trade, drawdown max. Tes standards — pas des valeurs génériques imposées.</div></div>
              <div className="step"><div className="step-n mono">03 — Trade</div><div className="step-h">Alerte immédiate si ça déraille</div><div className="step-d">Dès qu'un pattern dangereux apparaît, notification push + desktop en moins d'une seconde.</div></div>
            </div>
          </div>
        </section>

        {/* TARIFS */}
        <section className="sec" id="tarifs">
          <div className="wrap reveal">
            <div className="tag" style={{ justifyContent: 'center', maxWidth: 'none' }}>Tarifs</div>
            <h2 className="h2" style={{ textAlign: 'center' }}>Simple.<br /><em>Rentabilisé au premier trade évité.</em></h2>
            <div className="prices">
              <div className="plan plan-pro">
                <div className="plan-shine sw" />
                <div className="plan-lab mono">Pro</div>
                <div className="plan-price"><sup>€</sup>19<sub>/mois</sub></div>
                <div className="plan-note mono">14 jours gratuits · Sans carte</div>
                <div className="plan-tag">Surveillance comportementale complète. Alertes immédiates dès qu'un pattern dangereux est détecté.</div>
                <ul className="feats">
                  {['8 détections comportementales', 'Alertes temps réel (push + desktop)', 'Dashboard comportemental', 'Connexion cTrader & MT5', 'Analytics 30 jours', 'Seuils configurables'].map(f => (
                    <li key={f}><span className="fc fc-d"><svg viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3" /></svg></span>{f}</li>
                  ))}
                </ul>
                <a href="/signup" className="plan-btn pb-sec">Commencer gratuitement →</a>
              </div>
              <div className="plan plan-sent">
                <div className="plan-shine sv" />
                <div className="plan-lab v mono">Sentinel</div>
                <div className="plan-price"><sup>€</sup>39<sub>/mois</sub></div>
                <div className="plan-note mono">14 jours gratuits · Sans carte</div>
                <div className="plan-tag">Tout le plan Pro, augmenté d'un coach IA actif. Analyse, recommandations et debrief à chaque session.</div>
                <ul className="feats">
                  <li><span className="fc fc-d"><svg viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3" /></svg></span><span style={{ color: 'var(--t3)' }}>Tout le plan Pro, plus :</span></li>
                  {['9e détection : Trade pendant les news', 'Coach IA pendant la session', 'Debriefing automatique post-session', 'Analyse des patterns récurrents', 'Analytics 180 jours'].map(f => (
                    <li className="hi" key={f}><span className="fc fc-v"><svg viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3" /></svg></span><strong style={{ fontWeight: 500 }}>{f}</strong></li>
                  ))}
                </ul>
                <a href="/signup" className="plan-btn pb-pri">Commencer gratuitement →</a>
              </div>
            </div>
            <p style={{ textAlign: 'center', marginTop: '2rem', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--t3)' }}>14 jours d'essai gratuit · Pas de carte · Annulable à tout moment</p>
          </div>
        </section>

        {/* HISTOIRE */}
        <section className="sec" id="histoire">
          <div className="wrap reveal">
            <div className="tag">L'histoire</div>
            <h2 className="h2">Une conviction.<br /><em>Un outil.</em></h2>
            <div className="story" style={{ marginTop: '2.5rem' }}>
              <p>Caldra est né d'une certitude simple : la psychologie de trader ne s'apprend pas. Elle se construit. Lentement. Sous les graphiques. Dans la pression des positions ouvertes, dans le silence des pertes encaissées, dans les décisions prises à l'instinct quand la raison n'a plus la main.</p>
              <p>On peut lire, comprendre, mémoriser chaque biais cognitif. Et se retrouver exactement dans le même état, la prochaine session, face au même chart, à refaire exactement la même chose.</p>
              <p>Caldra n'est pas là pour changer la nature humaine. Il est là pour ce moment précis — celui où un signal extérieur change tout.</p>
              <div className="story-end">La discipline ne se force pas. <em>Elle se protège.</em></div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="cta-sec">
          <div style={{ maxWidth: 680, margin: '0 auto' }} className="reveal">
            <div className="tag" style={{ justifyContent: 'center', maxWidth: 'none' }}>Disponible maintenant</div>
            <div className="cta-h">Ton prochain tilt<br /><em>peut être le dernier.</em></div>
            <p className="cta-sub">14 jours d'essai gratuit. Pas de carte requise.</p>
            <div className="ctas">
              <a href="/signup" className="cta-main">Commencer gratuitement <span>→</span></a>
              <a href="/login" className="cta-ghost">J'ai déjà un compte</a>
            </div>
          </div>
        </section>

        <footer className="foot">
          <div className="foot-logo">Cald<b>ra</b></div>
          <div className="foot-links">
            <a href="/mentions-legales" className="foot-lk">CGU</a>
            <a href="/confidentialite" className="foot-lk">Confidentialité</a>
            <a href="/support" className="foot-lk">Support</a>
          </div>
          <div className="foot-mail">contact@getcaldra.com</div>
        </footer>
      </div>
    </>
  )
}
