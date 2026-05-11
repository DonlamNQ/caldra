'use client'

import { useEffect } from 'react'

const CSS = `
*{margin:0;padding:0;box-sizing:border-box;scroll-behavior:smooth}
:root{--v:#7c3aed;--va:rgba(124,58,237,.08);--vb:rgba(124,58,237,.2);--bg:#08080d;--s1:#0d0d16;--s2:#111119;--b1:rgba(255,255,255,.06);--b2:rgba(255,255,255,.1);--tx:#f0ede8;--t2:rgba(240,237,232,.52);--t3:rgba(240,237,232,.22)}
body{font-family:'DM Sans',sans-serif;background:var(--bg);color:var(--tx);overflow-x:hidden;line-height:1}
.glow{position:fixed;top:-280px;left:50%;transform:translateX(-50%);width:800px;height:560px;background:radial-gradient(ellipse,rgba(124,58,237,.055) 0%,transparent 65%);pointer-events:none;z-index:0}

/* NAV */
nav{position:fixed;top:0;left:0;right:0;z-index:100;display:flex;align-items:center;justify-content:space-between;padding:1.25rem 3.5rem;border-bottom:.5px solid var(--b1);backdrop-filter:blur(20px);background:rgba(8,8,13,.92)}
.n-logo{font-size:13px;font-weight:500;letter-spacing:5px;text-transform:uppercase;color:#fff;text-decoration:none}.n-logo span{color:var(--v)}
.n-links{display:flex;gap:2.5rem;align-items:center}
.n-lk{font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--t2);text-decoration:none;transition:color .15s}.n-lk:hover{color:#fff}
.n-r{display:flex;gap:.625rem;align-items:center}
.n-login{font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:var(--t2);text-decoration:none;padding:7px 14px;border:.5px solid var(--b1);border-radius:3px;transition:all .15s}.n-login:hover{color:#fff;border-color:var(--b2)}

/* HERO — split */
.hero{display:grid;grid-template-columns:1fr 1fr;min-height:100vh;position:relative;z-index:1;border-bottom:.5px solid var(--b1)}
.hero-l{display:flex;flex-direction:column;justify-content:center;padding:9rem 3.5rem 5rem;border-right:.5px solid var(--b1)}
.hero-r{display:flex;flex-direction:column;justify-content:center;align-items:flex-start;padding:9rem 3.5rem 5rem;gap:1rem}
.eyebrow{font-size:10px;letter-spacing:3px;text-transform:uppercase;color:var(--v);margin-bottom:2rem;display:flex;align-items:center;gap:8px}
.eydot{width:4px;height:4px;border-radius:50%;background:var(--v);animation:pulse 2s ease-in-out infinite}
@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.3;transform:scale(.7)}}
h1{font-size:clamp(2.6rem,4.2vw,3.6rem);font-weight:200;line-height:1.07;letter-spacing:-2px;color:#fff;margin-bottom:1.5rem}
h1 em{font-style:normal;color:var(--v)}
.hero-sub{font-size:16px;color:var(--t2);line-height:1.8;max-width:420px;margin-bottom:2.5rem;font-weight:300}
.wf{display:flex;gap:5px;background:var(--s1);border:.5px solid var(--b2);border-radius:6px;padding:4px;max-width:380px}
.wf input{flex:1;padding:11px 14px;background:transparent;border:none;color:#fff;font-size:13px;font-family:'DM Sans',sans-serif;outline:none}.wf input::placeholder{color:var(--t3)}
.wf-btn{padding:10px 18px;background:var(--v);border:none;border-radius:4px;color:#fff;font-size:12px;font-weight:500;font-family:'DM Sans',sans-serif;cursor:pointer;white-space:nowrap;transition:opacity .15s}.wf-btn:hover{opacity:.85}
.wf-sm{display:none;margin-top:6px;padding:10px 14px;background:rgba(30,180,100,.07);border:.5px solid rgba(30,180,100,.2);border-radius:6px;color:rgba(80,220,140,.9);font-size:12px;text-align:center}
.hero-fn{display:flex;align-items:center;gap:1rem;margin-top:.875rem}
.hfn{font-size:11px;color:var(--t3)}.hfs{width:1px;height:10px;background:var(--b2)}

/* alert mockup */
.am{background:var(--s1);border:.5px solid var(--b2);border-radius:12px;padding:1.75rem;width:100%;max-width:380px;position:relative}
.am::before{content:'';position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(124,58,237,.4),transparent);border-radius:12px 12px 0 0}
.am-hd{display:flex;align-items:center;justify-content:space-between;margin-bottom:1.5rem}
.am-lab{font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--t3)}
.am-live{display:flex;align-items:center;gap:5px;font-size:10px;color:rgba(60,200,122,.8);letter-spacing:.5px}
.am-live-dot{width:5px;height:5px;border-radius:50%;background:#3cc87a;animation:pulse 1.5s ease-in-out infinite}
.am-score-row{display:flex;align-items:baseline;gap:.5rem;margin-bottom:1.5rem}
.am-sn{font-size:56px;font-weight:200;letter-spacing:-4px;color:#fff;line-height:1}
.am-ss{font-size:13px;color:var(--t3);margin-top:4px;align-self:flex-end}
.am-bars{display:flex;flex-direction:column;gap:9px;margin-bottom:1.5rem;padding-bottom:1.5rem;border-bottom:.5px solid var(--b1)}
.am-br{display:flex;align-items:center;gap:10px}
.am-bl{font-size:11px;color:var(--t2);width:130px;flex-shrink:0}
.am-bt{flex:1;height:3px;background:rgba(255,255,255,.05);border-radius:2px;overflow:hidden}
.am-bf{height:100%;border-radius:2px}
.am-alerts{display:flex;flex-direction:column;gap:6px}
.am-alert{display:flex;align-items:flex-start;gap:8px;padding:.625rem .75rem;border-radius:6px}
.am-a1{background:rgba(255,200,0,.05);border:.5px solid rgba(255,200,0,.12)}
.am-a2{background:rgba(220,130,0,.07);border:.5px solid rgba(220,130,0,.18)}
.am-adot{width:6px;height:6px;border-radius:50%;flex-shrink:0;margin-top:3px}
.am-adot-1{background:#ffc800}.am-adot-2{background:#dc8200}
.am-atx{font-size:12px;color:var(--tx);line-height:1.45}
.am-asx{font-size:11px;color:var(--t3);margin-top:1px}

/* second mockup card — coach */
.coach-card{background:var(--s1);border:.5px solid var(--b1);border-radius:12px;padding:1.25rem;width:100%;max-width:380px}
.coach-hd{font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--t3);margin-bottom:.875rem}
.coach-msg{font-size:13px;color:var(--t2);line-height:1.65;font-style:italic}
.coach-msg strong{color:var(--tx);font-style:normal}

/* STATS BAR */
.stats-bar{display:grid;grid-template-columns:repeat(4,1fr);border-bottom:.5px solid var(--b1);position:relative;z-index:1}
.sb-item{padding:2rem 3.5rem;border-right:.5px solid var(--b1)}
.sb-item:last-child{border-right:none}
.sb-n{font-size:32px;font-weight:200;letter-spacing:-1.5px;color:#fff;line-height:1;margin-bottom:.4rem}
.sb-n span{color:var(--v)}
.sb-l{font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:var(--t3)}

/* SECTION */
.sec{padding:6rem 3.5rem;position:relative;z-index:1;border-bottom:.5px solid var(--b1)}
.sec-in{max-width:1080px;margin:0 auto}
.sec-tag{font-size:10px;letter-spacing:3px;text-transform:uppercase;color:var(--v);display:flex;align-items:center;gap:1rem;margin-bottom:3rem}
.sec-tag::after{content:'';flex:1;max-width:260px;height:.5px;background:var(--b1)}
.sec-h{font-size:clamp(1.9rem,3.5vw,3rem);font-weight:200;letter-spacing:-1.5px;color:#fff;line-height:1.1;margin-bottom:1.25rem}
.sec-d{font-size:15px;color:var(--t2);line-height:1.8;max-width:500px;font-weight:300}

/* DETECTOR */
.det-wrap{display:grid;grid-template-columns:1fr 1fr;gap:4rem;margin-top:3.5rem;align-items:start}
.det-layout{border:.5px solid var(--b1);border-radius:12px;overflow:hidden}
.det-item{display:flex;align-items:center;gap:.875rem;padding:1rem 1.25rem;border-bottom:.5px solid var(--b1);cursor:pointer;transition:background .15s;user-select:none}
.det-item:last-child{border-bottom:none}
.det-item:hover{background:rgba(255,255,255,.02)}
.det-item.act{background:var(--s1)}
.det-item.act .di-n{color:var(--v);border-color:var(--vb)}
.di-n{width:24px;height:24px;border-radius:50%;border:.5px solid var(--b1);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:600;color:var(--t3);flex-shrink:0;transition:all .15s}
.di-t{font-size:13px;color:var(--tx);flex:1}
.di-badge{font-size:8px;padding:2px 7px;background:var(--va);border:.5px solid var(--vb);border-radius:100px;color:var(--v);letter-spacing:.5px;text-transform:uppercase;flex-shrink:0}
.det-detail{background:var(--s1);border:.5px solid var(--b1);border-radius:12px;padding:2.5rem;position:sticky;top:7rem}
.dd-ghost{font-size:80px;font-weight:200;letter-spacing:-5px;color:rgba(255,255,255,.03);line-height:1;margin-bottom:1.5rem;user-select:none}
.dd-ic{width:42px;height:42px;border-radius:8px;background:var(--va);border:.5px solid var(--vb);display:flex;align-items:center;justify-content:center;margin-bottom:1.5rem}
.dd-ic svg{width:18px;height:18px;stroke:var(--v);fill:none;stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round}
.dd-h{font-size:22px;font-weight:500;color:#fff;margin-bottom:.875rem;line-height:1.3}
.dd-d{font-size:14px;color:var(--t2);line-height:1.8}
.dd-lv{display:inline-flex;align-items:center;gap:6px;font-size:10px;padding:4px 10px;border-radius:100px;margin-top:1.75rem;letter-spacing:.5px;text-transform:uppercase}
.dd-l1{background:rgba(255,200,0,.07);border:.5px solid rgba(255,200,0,.18);color:#ffc800}
.dd-l2{background:rgba(220,130,0,.08);border:.5px solid rgba(220,130,0,.2);color:#dc8200}
.dd-l3{background:rgba(220,50,30,.08);border:.5px solid rgba(220,50,30,.2);color:#dc3218}

/* DEMO */
.demo-wrap{background:var(--s1);border:.5px solid var(--b2);border-radius:12px;overflow:hidden;margin-top:3.5rem}
.demo-tb{display:flex;align-items:center;gap:8px;padding:.875rem 1.5rem;border-bottom:.5px solid var(--b1);background:rgba(0,0,0,.15)}
.dd-r{width:10px;height:10px;border-radius:50%;background:#ff5f57}
.dd-y{width:10px;height:10px;border-radius:50%;background:#ffbd2e}
.dd-g{width:10px;height:10px;border-radius:50%;background:#28c840}
.demo-ttl{flex:1;text-align:center;font-size:11px;color:var(--t3);letter-spacing:.5px}
.demo-body{display:grid;grid-template-columns:1fr 300px;min-height:400px}
.demo-lp{padding:1.5rem;border-right:.5px solid var(--b1)}
.demo-llab{font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:var(--t3);margin-bottom:1.25rem}
.demo-pnl{display:flex;align-items:baseline;gap:8px;margin-bottom:1.5rem}
.demo-pv{font-size:38px;font-weight:200;letter-spacing:-2px;transition:color .3s}
.demo-pc{font-size:12px;color:var(--t3)}
.demo-chart{position:relative;height:140px;margin-bottom:1rem}
.demo-tlab{font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:var(--t3);margin-bottom:.75rem}
.demo-tr{display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:.5px solid var(--b1);font-size:12px}.demo-tr:last-child{border-bottom:none}
.dtt{color:var(--t3)}.dtins{color:var(--t2)}.dtp{color:#3cc87a;font-weight:500}.dtn{color:#e05050;font-weight:500}
.demo-rp{padding:1.5rem;display:flex;flex-direction:column}
.demo-rlab{font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:var(--t3);margin-bottom:.75rem}
.demo-als{flex:1;display:flex;flex-direction:column;gap:.5rem}
.ai{display:flex;align-items:flex-start;gap:10px;padding:.75rem .875rem;border-radius:8px;border:.5px solid transparent;animation:sli .3s ease}
@keyframes sli{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}
.al1{background:rgba(255,200,0,.04);border-color:rgba(255,200,0,.1)}
.al2{background:rgba(220,130,0,.06);border-color:rgba(220,130,0,.15)}
.al3{background:rgba(220,50,30,.08);border-color:rgba(220,50,30,.2)}
.adot{width:7px;height:7px;border-radius:50%;margin-top:3px;flex-shrink:0}
.dl1{background:#ffc800}.dl2{background:#dc8200}.dl3{background:#dc3218;animation:blk 1s ease-in-out infinite}
@keyframes blk{0%,100%{opacity:1}50%{opacity:.35}}
.ab{flex:1}.at{font-size:12px;font-weight:500;color:#fff;margin-bottom:2px}.as{font-size:11px;color:rgba(255,255,255,.28);line-height:1.4}
.abg{font-size:9px;padding:2px 7px;border-radius:100px;letter-spacing:.5px;text-transform:uppercase;white-space:nowrap;flex-shrink:0;margin-top:1px}
.bl1{background:rgba(255,200,0,.1);color:#ffc800}.bl2{background:rgba(220,130,0,.1);color:#dc8200}.bl3{background:rgba(220,50,30,.12);color:#dc3218}
.demo-sbtn{margin-top:1rem;width:100%;padding:10px;background:transparent;border:.5px solid var(--vb);border-radius:6px;color:var(--v);font-size:12px;font-family:'DM Sans',sans-serif;cursor:pointer;letter-spacing:.5px;transition:background .2s}.demo-sbtn:hover{background:var(--va)}

/* HOW IT WORKS */
.steps-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:0;margin-top:3.5rem;border:.5px solid var(--b1);border-radius:12px;overflow:hidden}
.step-c{padding:2.5rem;background:var(--s1)}.step-c:not(:last-child){border-right:.5px solid var(--b1)}
.step-n{font-size:10px;letter-spacing:2.5px;text-transform:uppercase;color:var(--v);margin-bottom:2rem}
.step-h{font-size:18px;font-weight:500;color:#fff;margin-bottom:.75rem;line-height:1.35}
.step-d{font-size:13px;color:var(--t2);line-height:1.7}
.step-tags{display:flex;flex-wrap:wrap;gap:5px;margin-top:1rem}
.stag-pill{font-size:10px;padding:3px 9px;background:rgba(255,255,255,.04);border:.5px solid var(--b1);border-radius:100px;color:var(--t2);display:flex;align-items:center;gap:4px}
.stag-dot{width:4px;height:4px;border-radius:50%;background:#3cc87a}

/* TESTIMONIALS */
.testi-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1rem;margin-top:3.5rem}
.testi-c{padding:1.75rem;background:var(--s1);border:.5px solid var(--b1);border-radius:12px;transition:border-color .2s}.testi-c:hover{border-color:var(--b2)}
.testi-stars{color:#f5a623;font-size:11px;letter-spacing:2px;margin-bottom:1rem}
.testi-q{font-size:13px;color:rgba(255,255,255,.42);line-height:1.65;margin-bottom:1.25rem;font-style:italic}
.testi-q strong{color:rgba(255,255,255,.7);font-style:normal}
.testi-au{display:flex;align-items:center;gap:10px}
.testi-av{width:32px;height:32px;border-radius:50%;background:var(--s2);border:.5px solid var(--b2);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:500;color:rgba(255,255,255,.35)}
.testi-name{font-size:13px;font-weight:500;color:rgba(255,255,255,.65)}
.testi-role{font-size:11px;color:var(--t3)}

/* PRICING */
.pricing-grid{display:grid;grid-template-columns:1fr 1fr;gap:1rem;max-width:800px;margin:3.5rem auto 0}
.plan{border-radius:12px;padding:2rem;position:relative;overflow:hidden}
.plan-pro{background:var(--s1);border:.5px solid var(--b2)}
.plan-sent{background:linear-gradient(135deg,rgba(124,58,237,.07) 0%,var(--s1) 55%);border:.5px solid rgba(124,58,237,.3)}
.plan-shine{position:absolute;top:0;left:0;right:0;height:1px}
.plan-sw{background:linear-gradient(90deg,transparent,rgba(255,255,255,.07),transparent)}
.plan-sv{background:linear-gradient(90deg,transparent,rgba(124,58,237,.5),transparent)}
.plan-lab{font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:var(--t3);margin-bottom:1.5rem}
.plan-lab-v{color:rgba(124,58,237,.7)}
.plan-price{font-size:44px;font-weight:200;color:#fff;letter-spacing:-1px;line-height:1;margin-bottom:.25rem}
.plan-price sup{font-size:22px;vertical-align:super;letter-spacing:0}
.plan-price sub{font-size:14px;font-weight:400;color:var(--t2);letter-spacing:0}
.plan-note{font-size:12px;color:var(--t3);margin-bottom:1.5rem}
.plan-tag{font-size:13px;color:rgba(255,255,255,.45);font-style:italic;line-height:1.6;padding:1rem 0;border-top:.5px solid var(--b1);border-bottom:.5px solid var(--b1);margin-bottom:1.5rem}
.plan-sent .plan-tag{border-color:rgba(124,58,237,.12)}
.plan-features{list-style:none;margin-bottom:2rem}
.plan-features li{font-size:13px;color:rgba(255,255,255,.38);padding:.55rem 0;border-bottom:.5px solid rgba(255,255,255,.04);display:flex;align-items:center;gap:10px}.plan-features li:last-child{border-bottom:none}
.plan-hi{color:rgba(255,255,255,.72)!important}
.pfc{width:16px;height:16px;border-radius:4px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.pfc svg{width:9px;height:9px;fill:none;stroke-width:2.5;stroke-linecap:round;stroke-linejoin:round}
.pfc-d{background:rgba(255,255,255,.05);border:.5px solid rgba(255,255,255,.08)}.pfc-d svg{stroke:rgba(255,255,255,.28)}
.pfc-v{background:var(--va);border:.5px solid var(--vb)}.pfc-v svg{stroke:var(--v)}
.plan-btn{width:100%;padding:12px;border-radius:6px;font-size:12px;font-weight:500;font-family:'DM Sans',sans-serif;cursor:pointer;transition:all .15s;letter-spacing:.5px;display:block;text-align:center;text-decoration:none;border:none}
.plan-btn-sec{background:transparent;border:.5px solid var(--b2) !important;color:rgba(255,255,255,.5)}.plan-btn-sec:hover{border-color:rgba(255,255,255,.25)!important;color:#fff}
.plan-btn-pri{background:var(--v);color:#fff}.plan-btn-pri:hover{opacity:.85}

/* STORY */
.story-sec{padding:6rem 3.5rem;position:relative;z-index:1;border-bottom:.5px solid var(--b1)}
.story-in{max-width:640px}
.story-p{font-size:16px;color:rgba(240,237,232,.65);line-height:1.9;font-weight:300;margin-bottom:1.5rem}
.story-end{font-size:20px;color:#fff;line-height:1.5;font-weight:200;font-style:italic;letter-spacing:-.3px;margin-top:.5rem}
.story-end em{font-style:normal;color:var(--v)}

/* CTA */
.cta-sec{padding:8rem 3.5rem;text-align:center;position:relative;z-index:1}
.cta-h{font-size:clamp(2.8rem,6vw,5.5rem);font-weight:200;letter-spacing:-3px;color:#fff;line-height:1.02;margin-bottom:1.5rem}
.cta-h em{font-style:normal;color:var(--v)}
.cta-sub{font-size:17px;color:var(--t2);margin-bottom:2.5rem;font-weight:300}
.cta-wf{display:flex;gap:5px;background:var(--s1);border:.5px solid var(--b2);border-radius:6px;padding:4px;max-width:380px;margin:0 auto}
.cta-wf-sm{display:none;margin-top:6px;padding:10px 14px;background:rgba(30,180,100,.07);border:.5px solid rgba(30,180,100,.2);border-radius:6px;color:rgba(80,220,140,.9);font-size:12px;text-align:center;max-width:380px;margin:6px auto 0}
.cta-fn{font-size:12px;color:var(--t3);margin-top:1.25rem}

/* FOOTER */
footer{padding:1.75rem 3.5rem;display:flex;justify-content:space-between;align-items:center;border-top:.5px solid var(--b1);position:relative;z-index:1}
.foot-logo{font-size:12px;letter-spacing:4px;text-transform:uppercase;color:rgba(255,255,255,.15);font-weight:500}
.foot-logo span{color:rgba(124,58,237,.3)}
.foot-links{display:flex;gap:2rem}
.foot-lk{font-size:11px;color:var(--t3);text-decoration:none;letter-spacing:.5px;transition:color .15s}.foot-lk:hover{color:var(--t2)}
.foot-email{font-size:11px;color:var(--t3)}

/* RESPONSIVE */
@media(max-width:960px){
  .hero{grid-template-columns:1fr}.hero-r{display:none}
  .det-wrap{grid-template-columns:1fr}.det-detail{display:none}
  .steps-grid{grid-template-columns:1fr}.step-c:not(:last-child){border-right:none;border-bottom:.5px solid var(--b1)}
  .pricing-grid{grid-template-columns:1fr}
  .testi-grid{grid-template-columns:1fr}
  .stats-bar{grid-template-columns:1fr 1fr}.sb-item:nth-child(2){border-right:none}.sb-item:nth-child(3){border-top:.5px solid var(--b1)}.sb-item:nth-child(4){border-right:none;border-top:.5px solid var(--b1)}
  nav{padding:1.25rem 1.5rem}.n-links{display:none}
  .sec{padding:4rem 1.5rem}.story-sec{padding:4rem 1.5rem}.cta-sec{padding:5rem 1.5rem}
  .hero-l{padding:8rem 1.5rem 4rem}
  footer{padding:1.5rem;flex-direction:column;gap:.875rem;text-align:center}
  .demo-body{grid-template-columns:1fr}
}
@media(max-width:520px){
  .wf{max-width:100%}.cta-wf{max-width:100%}
  .stats-bar{grid-template-columns:1fr 1fr}
}
`

const DETECTORS = [
  { n:'01', name:'Revenge sizing',      icon:'<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>',                         desc:'La taille de position augmente après une perte — chemin le plus court pour exploser une journée. Caldra compare chaque nouvelle ouverture aux positions précédentes.',                              lv:2, s:false },
  { n:'02', name:'Re-entrée immédiate', icon:'<polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.4"/>',                                      desc:'Reprendre un trade moins de 2 minutes après la sortie. L\'impulsion, pas l\'analyse. Caldra mesure l\'intervalle exact entre exit et nouvel entry.',                                               lv:1, s:false },
  { n:'03', name:'Série de pertes',     icon:'<line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/>',  desc:'3 pertes consécutives — seuil où l\'émotion prend le dessus. Configurable selon ton historique et ta tolérance.',                                                                                 lv:2, s:false },
  { n:'04', name:'Alerte drawdown',     icon:'<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',                                                                         desc:'Perte journalière approchant ou dépassant ta limite. Deux niveaux : alerte préventive à 80%, stop forcé à 100%. Capital configurable.',                                                              lv:3, s:false },
  { n:'05', name:'Hors session',        icon:'<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',                                          desc:'Trade en dehors de tes horaires définis. Fatigue, ennui, ou opportunisme — rarement de bons états pour entrer en marché.',                                                                             lv:1, s:false },
  { n:'06', name:'Suractivité',         icon:'<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>',                                                           desc:'Nombre de trades dépassant ta limite de session. Plus tu trades, plus tu trades souvent pire — surtout en fin de journée.',                                                                           lv:2, s:false },
  { n:'07', name:'Trade pendant news',  icon:'<path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/>',                                                  desc:'Entrée dans les 5 minutes d\'un événement macro. News + position ouverte = casino. Caldra croise les timestamps avec le calendrier économique.',                                                    lv:2, s:true  },
  { n:'08', name:'Stop non respecté',   icon:'<line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/>',                                    desc:'Position tenue au-delà de ton stop habituel. L\'espoir n\'est pas une stratégie. Caldra compare l\'exit réel à ton stop théorique.',                                                               lv:2, s:false },
  { n:'09', name:'Risk dépassé',        icon:'<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>',desc:'Sizing dépassant ton risk par trade défini. Tes règles existent pour une raison — Caldra les fait respecter à chaque ouverture.',                                                                     lv:2, s:false },
]

const HTML = `
<div class="glow"></div>
<nav>
  <a href="#" class="n-logo" style="text-decoration:none">Cald<span>ra</span></a>
  <div class="n-links">
    <a class="n-lk" href="#detecteurs">D&eacute;tecteurs</a>
    <a class="n-lk" href="#demo">D&eacute;mo</a>
    <a class="n-lk" href="#comment">Comment</a>
    <a class="n-lk" href="#tarifs">Tarifs</a>
    <a class="n-lk" href="#histoire">Histoire</a>
  </div>
  <div class="n-r">
    <a href="/login" class="n-login">Connexion</a>
  </div>
</nav>

<!-- HERO -->
<div class="hero">
  <div class="hero-l">
    <div class="eyebrow"><div class="eydot"></div>Intelligence comportementale &mdash; Temps r&eacute;el</div>
    <h1>Tu ne vois pas<br>quand tu d&eacute;railles.<br><em>Lui si.</em></h1>
    <p class="hero-sub">Caldra analyse chaque trade et d&eacute;tecte les comportements qui d&eacute;truisent les sessions &mdash; avant que le tilt, le revenge trading ou l&rsquo;impulsion ne fasse les d&eacute;g&acirc;ts.</p>
    <div class="wf">
      <input type="email" id="wf-email" placeholder="ton@email.com" />
      <button class="wf-btn" onclick="joinWaitlist('wf-email','wf-sm')">Rejoindre &rarr;</button>
    </div>
    <div class="wf-sm" id="wf-sm">Place r&eacute;serv&eacute;e. On te contacte &agrave; l&rsquo;ouverture.</div>
    <div class="hero-fn">
      <span class="hfn">Lancement le 13/05</span><div class="hfs"></div>
      <span class="hfn">14 jours d&rsquo;essai</span><div class="hfs"></div>
      <span class="hfn">Sans carte</span>
    </div>
  </div>
  <div class="hero-r">
    <div class="am">
      <div class="am-hd">
        <span class="am-lab">Session en cours</span>
        <span class="am-live"><span class="am-live-dot"></span>Live</span>
      </div>
      <div class="am-score-row">
        <div class="am-sn" id="hero-score">72</div>
        <div class="am-ss">/ 100</div>
      </div>
      <div class="am-bars">
        <div class="am-br"><span class="am-bl">Sizing ma&icirc;tris&eacute;</span><div class="am-bt"><div class="am-bf" style="width:60%;background:#ffc800"></div></div></div>
        <div class="am-br"><span class="am-bl">Contr&ocirc;le drawdown</span><div class="am-bt"><div class="am-bf" style="width:88%;background:#3cc87a"></div></div></div>
        <div class="am-br"><span class="am-bl">Discipline horaire</span><div class="am-bt"><div class="am-bf" style="width:95%;background:#3cc87a"></div></div></div>
        <div class="am-br"><span class="am-bl">Re-entr&eacute;es</span><div class="am-bt"><div class="am-bf" style="width:40%;background:#dc8200"></div></div></div>
      </div>
      <div class="am-alerts">
        <div class="am-alert am-a2">
          <div class="am-adot am-adot-2"></div>
          <div><div class="am-atx">Revenge sizing d&eacute;tect&eacute;</div><div class="am-asx">Sizing &times;2.1 apr&egrave;s une perte de &minus;&euro;140</div></div>
        </div>
        <div class="am-alert am-a1">
          <div class="am-adot am-adot-1"></div>
          <div><div class="am-atx">Re-entr&eacute;e rapide</div><div class="am-asx">87s apr&egrave;s la derni&egrave;re sortie</div></div>
        </div>
      </div>
    </div>
    <div class="coach-card">
      <div class="coach-hd">Coach Sentinel &mdash; Analyse en cours</div>
      <p class="coach-msg">&laquo;&nbsp;Tu as repris position 87 secondes apr&egrave;s une perte. <strong>Ferme le terminal 5 minutes avant de r&eacute;-entrer.</strong>&nbsp;&raquo;</p>
    </div>
  </div>
</div>

<!-- STATS BAR -->
<div class="stats-bar">
  <div class="sb-item"><div class="sb-n">9<span>+</span></div><div class="sb-l">Comportements d&eacute;tect&eacute;s</div></div>
  <div class="sb-item"><div class="sb-n">3</div><div class="sb-l">Niveaux d&rsquo;alerte</div></div>
  <div class="sb-item"><div class="sb-n"><span>&lt;</span>1s</div><div class="sb-l">Temps de d&eacute;tection</div></div>
  <div class="sb-item"><div class="sb-n">100%</div><div class="sb-l">Automatique</div></div>
</div>

<!-- DÉTECTEURS -->
<div class="sec" id="detecteurs">
  <div class="sec-in">
    <div class="sec-tag">01 &mdash; Ce qu&rsquo;on d&eacute;tecte</div>
    <div class="det-wrap">
      <div>
        <div class="sec-h">Ton empreinte<br>comportementale, en direct.</div>
        <p class="sec-d" style="margin-bottom:2rem">Chaque trader a des patterns quand il commence &agrave; d&eacute;railler. Caldra lit les tiens &mdash; et te le dit avant que &ccedil;a co&ucirc;te.</p>
        <div class="det-layout" id="det-list"></div>
      </div>
      <div class="det-detail" id="det-detail">
        <div class="dd-ghost" id="dd-ghost">01</div>
        <div class="dd-ic"><svg viewBox="0 0 24 24" id="dd-svg"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg></div>
        <div class="dd-h" id="dd-h">Revenge sizing</div>
        <div class="dd-d" id="dd-d">La taille de position augmente apr&egrave;s une perte &mdash; chemin le plus court pour exploser une journ&eacute;e. Caldra compare chaque nouvelle ouverture aux positions pr&eacute;c&eacute;dentes.</div>
        <div class="dd-lv dd-l2" id="dd-lv">Niveau 2 &mdash; Alerte orange</div>
      </div>
    </div>
  </div>
</div>

<!-- DEMO -->
<div class="sec" id="demo">
  <div class="sec-in">
    <div class="sec-tag">02 &mdash; D&eacute;mo interactive</div>
    <div class="sec-h">Vois Caldra en action<br>sur une vraie session.</div>
    <p class="sec-d">Simule un encha&icirc;nement de trades et observe comment Caldra d&eacute;tecte les patterns en temps r&eacute;el.</p>
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
</div>

<!-- COMMENT -->
<div class="sec" id="comment">
  <div class="sec-in">
    <div class="sec-tag">03 &mdash; Comment &ccedil;a marche</div>
    <div class="sec-h">Configure une fois.<br>Il veille toujours.</div>
    <p class="sec-d">Aucune saisie manuelle. Aucune discipline suppl&eacute;mentaire &agrave; exercer. Caldra se connecte &agrave; ta plateforme et fait le reste.</p>
    <div class="steps-grid">
      <div class="step-c">
        <div class="step-n">01 &mdash; Connecte</div>
        <div class="step-h">Ta plateforme de trading</div>
        <div class="step-d">Connexion directe via API. Tes trades remontent automatiquement &mdash; rien &agrave; saisir manuellement.</div>
        <div class="step-tags">
          <span class="stag-pill"><span class="stag-dot"></span>cTrader</span>
          <span class="stag-pill"><span class="stag-dot"></span>MT5 EA</span>
          <span class="stag-pill" style="opacity:.4">+ &agrave; venir</span>
        </div>
      </div>
      <div class="step-c">
        <div class="step-n">02 &mdash; Configure</div>
        <div class="step-h">Tes r&egrave;gles et limites</div>
        <div class="step-d">Horaires de session, risk par trade, drawdown max. Tes r&egrave;gles, tes standards &mdash; pas des valeurs g&eacute;n&eacute;riques impos&eacute;es.</div>
      </div>
      <div class="step-c">
        <div class="step-n">03 &mdash; Trade</div>
        <div class="step-h">Alerte imm&eacute;diate si &ccedil;a d&eacute;raille</div>
        <div class="step-d">D&egrave;s qu&rsquo;un pattern dangereux est d&eacute;tect&eacute;, tu re&ccedil;ois une notification push + desktop en moins d&rsquo;une seconde.</div>
      </div>
    </div>
  </div>
</div>

<!-- TEMOIGNAGES -->
<div class="sec" id="avis">
  <div class="sec-in">
    <div class="sec-tag">04 &mdash; Ce qu&rsquo;ils disent</div>
    <div class="sec-h">Test&eacute; par des vrais traders.</div>
    <p class="sec-d">B&ecirc;ta ferm&eacute;e &mdash; retours des premiers utilisateurs sur leurs sessions r&eacute;elles.</p>
    <div class="testi-grid">
      <div class="testi-c"><div class="testi-stars">&#9733;&#9733;&#9733;&#9733;&#9733;</div><p class="testi-q">&laquo;&nbsp;J&rsquo;ai claqu&eacute; trois semaines de gains en une apr&egrave;s-midi &agrave; cause du tilt. <strong>Ce genre d&rsquo;outil j&rsquo;en avais besoin depuis longtemps.</strong>&nbsp;&raquo;</p><div class="testi-au"><div class="testi-av">TM</div><div><div class="testi-name">Thomas M.</div><div class="testi-role">Trader Futures &middot; 3 ans</div></div></div></div>
      <div class="testi-c"><div class="testi-stars">&#9733;&#9733;&#9733;&#9733;&#9733;</div><p class="testi-q">&laquo;&nbsp;<strong>Je savais m&ecirc;me pas que je faisais du revenge sizing.</strong> &Ccedil;a se voyait pas de l&rsquo;int&eacute;rieur. H&acirc;te que &ccedil;a sorte.&nbsp;&raquo;</p><div class="testi-au"><div class="testi-av">KF</div><div><div class="testi-name">KrazoliFX</div><div class="testi-role">Trader CFD/Forex &middot; Paris</div></div></div></div>
      <div class="testi-c"><div class="testi-stars">&#9733;&#9733;&#9733;&#9733;&#9734;</div><p class="testi-q">&laquo;&nbsp;J&rsquo;utilise TradeZella pour analyser mes sessions mais c&rsquo;est toujours apr&egrave;s coup. <strong>Avec Caldra l&rsquo;alerte est arriv&eacute;e pendant ma session.</strong> C&rsquo;est pas du tout la m&ecirc;me chose.&nbsp;&raquo;</p><div class="testi-au"><div class="testi-av">KL</div><div><div class="testi-name">Kevin L.</div><div class="testi-role">Trader Futures &middot; Lyon</div></div></div></div>
    </div>
  </div>
</div>

<!-- TARIFS -->
<div class="sec" id="tarifs">
  <div class="sec-in">
    <div class="sec-tag">05 &mdash; Tarifs</div>
    <div class="sec-h" style="text-align:center">Simple.<br>Rentabilis&eacute; au premier trade &eacute;vit&eacute;.</div>
    <div class="pricing-grid">
      <div class="plan plan-pro">
        <div class="plan-shine plan-sw"></div>
        <div class="plan-lab">Pro</div>
        <div class="plan-price"><sup>&euro;</sup>19<sub>/mois</sub></div>
        <div class="plan-note">14 jours gratuits &middot; Sans carte requise</div>
        <div class="plan-tag">Surveillance comportementale compl&egrave;te. Alertes imm&eacute;diates d&egrave;s qu&rsquo;un pattern dangereux est d&eacute;tect&eacute;.</div>
        <ul class="plan-features">
          <li><div class="pfc pfc-d"><svg viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3"/></svg></div>8 d&eacute;tections comportementales</li>
          <li><div class="pfc pfc-d"><svg viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3"/></svg></div>Alertes temps r&eacute;el (push + desktop)</li>
          <li><div class="pfc pfc-d"><svg viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3"/></svg></div>Dashboard comportemental</li>
          <li><div class="pfc pfc-d"><svg viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3"/></svg></div>Connexion cTrader &amp; MT5</li>
          <li><div class="pfc pfc-d"><svg viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3"/></svg></div>Historique &amp; analytics 30 jours</li>
          <li><div class="pfc pfc-d"><svg viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3"/></svg></div>Seuils configurables</li>
        </ul>
        <button class="plan-btn plan-btn-sec" onclick="joinWaitlistPlan()">Rejoindre la liste &rarr;</button>
      </div>
      <div class="plan plan-sent">
        <div class="plan-shine plan-sv"></div>
        <div class="plan-lab plan-lab-v">Sentinel</div>
        <div class="plan-price"><sup>&euro;</sup>39<sub>/mois</sub></div>
        <div class="plan-note">14 jours gratuits &middot; Sans carte requise</div>
        <div class="plan-tag">Tout le plan Pro, augment&eacute; d&rsquo;un coach IA actif. Analyse, recommandations et debriefing &agrave; chaque session.</div>
        <ul class="plan-features">
          <li><div class="pfc pfc-d"><svg viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3"/></svg></div><span style="color:rgba(240,237,232,.3)">Tout le plan Pro, plus&nbsp;:</span></li>
          <li class="plan-hi"><div class="pfc pfc-v"><svg viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3"/></svg></div><strong>9e d&eacute;tection&nbsp;: Trade pendant les news</strong></li>
          <li class="plan-hi"><div class="pfc pfc-v"><svg viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3"/></svg></div><strong>Coach IA pendant la session</strong></li>
          <li class="plan-hi"><div class="pfc pfc-v"><svg viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3"/></svg></div><strong>Debriefing automatique post-session</strong></li>
          <li class="plan-hi"><div class="pfc pfc-v"><svg viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3"/></svg></div><strong>Analyse des patterns r&eacute;currents</strong></li>
          <li class="plan-hi"><div class="pfc pfc-v"><svg viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3"/></svg></div><strong>Historique &amp; analytics 180 jours</strong></li>
        </ul>
        <button class="plan-btn plan-btn-pri" onclick="joinWaitlistPlan()">Rejoindre la liste &rarr;</button>
      </div>
    </div>
    <p style="text-align:center;margin-top:2rem;font-size:13px;color:var(--t3);font-style:italic">14 jours d&rsquo;essai gratuit sur les deux plans &middot; Pas de carte requise &middot; Annulable &agrave; tout moment</p>
  </div>
</div>

<!-- HISTOIRE -->
<div class="story-sec" id="histoire">
  <div class="sec-in">
    <div class="sec-tag">06 &mdash; L&rsquo;histoire</div>
    <div class="sec-h">Une conviction.<br>Un outil.</div>
    <div class="story-in" style="margin-top:2.5rem">
      <p class="story-p">Caldra Session est n&eacute; d&rsquo;une certitude simple&nbsp;: la psychologie de trader ne s&rsquo;apprend pas. Elle se construit. Lentement. Sous les graphiques. Dans la pression des positions ouvertes, dans le silence des pertes encaiss&eacute;es, dans les d&eacute;cisions prises &agrave; l&rsquo;instinct quand la raison n&rsquo;a plus la main.</p>
      <p class="story-p">On peut lire. On peut comprendre. On peut m&eacute;moriser chaque biais cognitif, chaque pattern comportemental. Et se retrouver exactement dans le m&ecirc;me &eacute;tat, la prochaine session, face au m&ecirc;me chart, &agrave; refaire exactement la m&ecirc;me chose. Parce qu&rsquo;on reste des &ecirc;tres humains, avec un syst&egrave;me &eacute;motionnel d&rsquo;une complexit&eacute; infinie.</p>
      <p class="story-p">Caldra Session n&rsquo;est pas l&agrave; pour changer la nature humaine. Il est l&agrave; pour ce moment pr&eacute;cis, celui o&ugrave; quelque chose d&eacute;raille, de l&rsquo;int&eacute;rieur, avant m&ecirc;me qu&rsquo;on le r&eacute;alise. Ce moment o&ugrave; un signal ext&eacute;rieur change tout.</p>
      <p class="story-end">La discipline ne se force pas. <em>Elle se prot&egrave;ge.</em></p>
    </div>
  </div>
</div>

<!-- CTA -->
<div class="cta-sec">
  <div style="max-width:640px;margin:0 auto">
    <div class="sec-tag" style="justify-content:center;max-width:none">Disponible le 13 mai 2026</div>
    <div class="cta-h">Ton prochain tilt<br><em>peut &ecirc;tre le dernier.</em></div>
    <p class="cta-sub">14 jours d&rsquo;essai gratuit. Pas de carte requise.</p>
    <div class="cta-wf">
      <input type="email" id="cta-email" placeholder="ton@email.com" style="flex:1;padding:11px 14px;background:transparent;border:none;color:#fff;font-size:13px;font-family:'DM Sans',sans-serif;outline:none" />
      <button class="wf-btn" onclick="joinWaitlist('cta-email','cta-wf-sm')">Rejoindre &rarr;</button>
    </div>
    <div class="wf-sm cta-wf-sm" id="cta-wf-sm">Place r&eacute;serv&eacute;e. On te contacte &agrave; l&rsquo;ouverture.</div>
    <p class="cta-fn"><a href="/login" style="color:var(--t3);text-decoration:none">D&eacute;j&agrave; un compte ? <span style="color:var(--v)">Connexion &rarr;</span></a></p>
  </div>
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

/* ── Waitlist ── */
async function joinWaitlist(inputId, smId) {
  var email = document.getElementById(inputId).value.trim();
  if (!email || !email.includes('@')) return;
  var sm = document.getElementById(smId);
  try {
    await fetch('/api/waitlist', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email }) });
  } catch(e) {}
  sm.style.display = 'block';
  document.getElementById(inputId).value = '';
}
window.joinWaitlist = joinWaitlist;
window.joinWaitlistPlan = function() {
  var el = document.getElementById('wf-email');
  if (el) { el.focus(); el.scrollIntoView({ behavior:'smooth', block:'center' }); }
};

/* ── Detector list ── */
var DETS = ${JSON.stringify(DETECTORS)};
var lvClass = function(l) { return l===1?'dd-l1':l===2?'dd-l2':'dd-l3'; };
var lvLabel = function(l) { return l===1?'Niveau 1 — Info':l===2?'Niveau 2 — Alerte':'Niveau 3 — Critique'; };

function renderDets() {
  var list = document.getElementById('det-list');
  if (!list) return;
  list.innerHTML = '';
  DETS.forEach(function(d, i) {
    var el = document.createElement('div');
    el.className = 'det-item' + (i===0?' act':'');
    el.innerHTML = '<div class="di-n">'+d.n+'</div><span class="di-t">'+d.name+'</span>'+(d.s?'<span class="di-badge">Sentinel</span>':'');
    el.addEventListener('click', function() {
      document.querySelectorAll('.det-item').forEach(function(x){x.classList.remove('act')});
      el.classList.add('act');
      updateDetail(d);
    });
    list.appendChild(el);
  });
}

function updateDetail(d) {
  var g=document.getElementById('dd-ghost'); if(g) g.textContent=d.n;
  var sv=document.getElementById('dd-svg'); if(sv) sv.innerHTML=d.icon;
  var h=document.getElementById('dd-h'); if(h) h.textContent=d.name;
  var dd=document.getElementById('dd-d'); if(dd) dd.textContent=d.desc;
  var lv=document.getElementById('dd-lv');
  if(lv) { lv.textContent=lvLabel(d.lv); lv.className='dd-lv '+lvClass(d.lv); }
}

renderDets();

/* ── Demo simulation ── */
var pd=[0,140,240], simStep=0, ch;
var SCN=[
  {time:'10:14',side:'NQ Short',pnl:-180,a:null},
  {time:'10:17',side:'NQ Long (re-entrée)',pnl:-95,a:{l:1,ti:'Re-entrée immédiate détectée',su:'Trade ouvert 3 min après la sortie. Prends une pause.'}},
  {time:'10:31',side:'NQ Long (sizing ×2)',pnl:-210,a:{l:2,ti:'Revenge sizing + 3 pertes consécutives',su:'Taille doublée après série de pertes. Pause fortement recommandée.'}},
  {time:'10:33',side:'NQ Long',pnl:-320,a:{l:3,ti:'STOP — Ferme la plateforme.',su:'Drawdown critique + série + revenge sizing simultanés.'}}
];

function initChart() {
  var canvas = document.getElementById('pc');
  if (!canvas) return;
  var cx = canvas.getContext('2d');
  var existing = window.Chart && Chart.getChart && Chart.getChart(cx);
  if (existing) existing.destroy();
  ch = new Chart(cx, {
    type:'line',
    data:{
      labels:['Ouv.','09:32','09:51'],
      datasets:[{data:pd,borderColor:'#3cc87a',borderWidth:2,pointRadius:3,pointBackgroundColor:'#3cc87a',fill:true,backgroundColor:'rgba(60,200,122,.06)',tension:.3}]
    },
    options:{
      responsive:true,maintainAspectRatio:false,
      plugins:{legend:{display:false}},
      scales:{
        x:{grid:{color:'rgba(255,255,255,.04)'},ticks:{color:'rgba(255,255,255,.2)',font:{size:10}}},
        y:{grid:{color:'rgba(255,255,255,.04)'},ticks:{color:'rgba(255,255,255,.2)',font:{size:10},callback:function(v){return '€'+v}}}
      }
    }
  });
}

function sim(){
  if(simStep>=SCN.length){resetD();return;}
  var t=SCN[simStep];
  var np=pd[pd.length-1]+t.pnl;
  pd.push(np);ch.data.labels.push(t.time);
  var col=np>=0?'#3cc87a':'#e05050';
  ch.data.datasets[0].borderColor=col;ch.data.datasets[0].pointBackgroundColor=col;
  ch.data.datasets[0].backgroundColor=np>=0?'rgba(60,200,122,.06)':'rgba(224,80,80,.06)';
  ch.data.datasets[0].data=pd;ch.update();
  var pe=document.getElementById('dpnl');
  pe.textContent=(np>=0?'+':'')+'€'+np;pe.style.color=col;
  document.getElementById('dpc').textContent=t.time+' — '+t.side;
  var log=document.getElementById('tlog');
  var el=document.createElement('div');el.className='demo-tr';
  el.innerHTML='<span class="dtt">'+t.time+'</span><span class="dtins">'+t.side+'</span><span class="'+(t.pnl>=0?'dtp':'dtn')+'">'+(t.pnl>=0?'+':'')+'€'+t.pnl+'</span>';
  log.appendChild(el);
  if(t.a){
    var c=document.getElementById('ac');
    if(c.querySelector('div[style]'))c.innerHTML='';
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
  ch.data.labels=['Ouv.','09:32','09:51'];
  ch.data.datasets[0].data=pd;ch.data.datasets[0].borderColor='#3cc87a';
  ch.data.datasets[0].pointBackgroundColor='#3cc87a';ch.data.datasets[0].backgroundColor='rgba(60,200,122,.06)';
  ch.update();
  document.getElementById('dpnl').textContent='+€240';document.getElementById('dpnl').style.color='#3cc87a';
  document.getElementById('dpc').textContent='Session en cours';
  document.getElementById('tlog').innerHTML='<div class="demo-tr"><span class="dtt">09:32</span><span class="dtins">NQ Long</span><span class="dtp">+€140</span></div><div class="demo-tr"><span class="dtt">09:51</span><span class="dtins">NQ Short</span><span class="dtp">+€100</span></div>';
  document.getElementById('ac').innerHTML='<div style="font-size:12px;color:var(--t3);padding:.5rem 0">Aucune alerte — session saine.</div>';
  document.getElementById('sb').textContent='→ Simuler le trade suivant';
}

if (window.Chart) { initChart(); }
else {
  var s=document.createElement('script');
  s.src='https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.0/chart.umd.min.js';
  s.onload=initChart;document.head.appendChild(s);
}

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

    return () => {
      document.getElementById('caldra-main-init')?.remove()
    }
  }, [])

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div dangerouslySetInnerHTML={{ __html: HTML }} />
    </>
  )
}
