'use client'

import { useEffect } from 'react'

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,200..700&display=swap');
*{margin:0;padding:0;box-sizing:border-box}
html{scroll-behavior:smooth}
:root{
  --v:#8b5cf6;--v2:#a78bfa;--v3:#c4b5fd;--va:rgba(139,92,246,.1);--vb:rgba(139,92,246,.3);
  --bg:#070510;--s1:#0f0d1c;--s2:#161327;--b1:rgba(255,255,255,.06);--b2:rgba(255,255,255,.11);
  --tx:#f6f4fc;--t2:rgba(246,244,252,.6);--t3:rgba(246,244,252,.34);--t4:rgba(246,244,252,.18);
  --green:#3ecf8e;--amber:#e0a02e;--orange:#dc7e2e;--red:#e2503c;
  --maxw:1200px;
}
body{font-family:'DM Sans',system-ui,sans-serif;background:var(--bg);color:var(--tx);overflow-x:hidden;line-height:1.5;-webkit-font-smoothing:antialiased}
a{color:inherit;text-decoration:none}
::selection{background:rgba(139,92,246,.32);color:#fff}

/* ambient background */
.bg-grid{position:fixed;inset:0;z-index:0;pointer-events:none;background-image:linear-gradient(rgba(255,255,255,.02) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.02) 1px,transparent 1px);background-size:72px 72px;-webkit-mask-image:radial-gradient(ellipse 80% 50% at 50% 0%,#000,transparent 70%);mask-image:radial-gradient(ellipse 80% 50% at 50% 0%,#000,transparent 70%)}
.bg-aura{position:fixed;z-index:0;pointer-events:none;border-radius:50%;filter:blur(20px)}
.aura-1{top:-420px;left:50%;width:1300px;height:900px;transform:translateX(-50%);background:radial-gradient(ellipse,rgba(139,92,246,.16),transparent 62%);animation:drift1 20s ease-in-out infinite}
.aura-2{bottom:-360px;right:-220px;width:900px;height:800px;background:radial-gradient(ellipse,rgba(91,33,182,.13),transparent 64%);animation:drift2 24s ease-in-out infinite}
@keyframes drift1{0%,100%{transform:translateX(-50%) translateY(0) scale(1)}50%{transform:translateX(-46%) translateY(30px) scale(1.08)}}
@keyframes drift2{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(-50px,-36px) scale(1.1)}}

/* reveal */
[data-reveal]{opacity:0;transform:translateY(34px);transition:opacity .9s cubic-bezier(.16,1,.3,1),transform .9s cubic-bezier(.16,1,.3,1)}
[data-reveal].in{opacity:1;transform:none}

/* PROMO BAR */
.promo-bar{position:fixed;top:0;left:0;right:0;z-index:101;min-height:40px;display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:7px 14px;background:linear-gradient(90deg,#4c1d95,#7c3aed,#a78bfa,#7c3aed,#4c1d95);background-size:220% 100%;animation:shine 8s linear infinite;color:#fff;font-size:12.5px;letter-spacing:.2px;padding:7px 18px;text-align:center;border-bottom:.5px solid rgba(255,255,255,.16)}
@keyframes shine{0%{background-position:0 0}100%{background-position:220% 0}}
.promo-spark{display:inline-block;animation:spin 4s ease-in-out infinite}
@keyframes spin{0%,100%{transform:rotate(0) scale(1);opacity:.9}50%{transform:rotate(180deg) scale(1.25);opacity:1}}
.promo-badge{font-size:9px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;background:rgba(255,255,255,.16);border:.5px solid rgba(255,255,255,.34);border-radius:100px;padding:3px 10px}
.promo-bar b{font-weight:800}.promo-xtra{opacity:.82;font-weight:400}
.promo-code{cursor:pointer;font-family:'DM Sans',sans-serif;font-weight:700;font-size:12px;color:#fff;background:rgba(255,255,255,.14);border:1px dashed rgba(255,255,255,.6);border-radius:6px;padding:3px 10px;letter-spacing:1.5px;display:inline-flex;align-items:center;gap:6px;transition:all .15s}
.promo-code:hover{background:rgba(255,255,255,.26);transform:translateY(-1px)}
.promo-code.copied{background:var(--green);border-color:var(--green)}
.promo-code svg{width:11px;height:11px;opacity:.85}
.promo-cta{font-weight:700;font-size:12px;background:#fff;color:#6d28d9;border-radius:6px;padding:4px 13px;transition:all .15s}
.promo-cta:hover{transform:translateY(-1px)}

/* NAV */
nav{position:fixed;top:40px;left:0;right:0;z-index:100;display:flex;align-items:center;justify-content:space-between;padding:1.1rem clamp(1.5rem,4vw,3.5rem);border-bottom:.5px solid var(--b1);backdrop-filter:blur(26px) saturate(150%);background:linear-gradient(180deg,rgba(7,5,16,.84),rgba(7,5,16,.5));transition:transform .42s cubic-bezier(.16,1,.3,1)}
nav.nav-hidden{transform:translateY(-130px)}
.n-logo{font-size:14px;font-weight:600;letter-spacing:5px;text-transform:uppercase;color:#fff}.n-logo span{color:var(--v)}
.n-links{display:flex;gap:2.5rem}
.n-lk{font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--t2);transition:color .15s}.n-lk:hover{color:#fff}
.n-r{display:flex;gap:.7rem;align-items:center}
.n-login{font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:var(--t2);padding:8px 15px;border:.5px solid var(--b1);border-radius:6px;transition:all .15s}.n-login:hover{color:#fff;border-color:var(--b2)}
.n-signup{font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:#fff;padding:8px 16px;border-radius:6px;background:linear-gradient(135deg,#8b5cf6,#6d28d9);box-shadow:0 4px 18px rgba(139,92,246,.34);transition:all .18s}.n-signup:hover{box-shadow:0 6px 28px rgba(139,92,246,.52);transform:translateY(-1px)}

/* shared */
.wrap{max-width:var(--maxw);margin:0 auto;padding:0 clamp(1.5rem,4vw,3.5rem)}
.sec{position:relative;z-index:1;padding:clamp(3.4rem,7vw,6.2rem) 0}
.divider{height:.5px;background:linear-gradient(90deg,transparent,var(--b1) 18%,var(--b1) 82%,transparent);position:relative;z-index:1}
.tag{font-size:10px;letter-spacing:3px;text-transform:uppercase;color:var(--v2);display:inline-flex;align-items:center;gap:9px;padding:7px 16px;border:.5px solid var(--vb);border-radius:100px;background:var(--va);backdrop-filter:blur(8px);margin-bottom:1.75rem}
.tag::before{content:'';width:5px;height:5px;border-radius:50%;background:var(--v);box-shadow:0 0 10px var(--v)}
.h2{font-size:clamp(1.75rem,3.2vw,2.65rem);font-weight:200;letter-spacing:-1.5px;line-height:1.09;background:linear-gradient(180deg,#fff 40%,rgba(246,244,252,.66));-webkit-background-clip:text;background-clip:text;color:transparent}
.h2 em{font-style:normal;background:linear-gradient(120deg,#a78bfa,#7c3aed);-webkit-background-clip:text;background-clip:text;color:transparent}
.lead{font-size:clamp(15px,1.5vw,17px);color:var(--t2);line-height:1.8;font-weight:300;max-width:560px;margin-top:1.4rem}
.center{text-align:center}.center .tag{margin-left:auto;margin-right:auto}.center .lead{margin-left:auto;margin-right:auto}

/* HERO */
.hero{position:relative;z-index:1;padding-top:clamp(6.5rem,12vw,9.8rem);padding-bottom:clamp(2.6rem,5vw,5rem);text-align:center;display:flex;flex-direction:column;align-items:center}
.hero-eyebrow{font-size:10px;letter-spacing:3px;text-transform:uppercase;color:var(--v2);display:inline-flex;align-items:center;gap:9px;padding:8px 18px;border:.5px solid var(--vb);border-radius:100px;background:var(--va);backdrop-filter:blur(8px);margin-bottom:2.2rem}
.hero-eyebrow .dot{width:5px;height:5px;border-radius:50%;background:var(--v);animation:pulse 2s ease-in-out infinite;box-shadow:0 0 10px var(--v)}
@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.35;transform:scale(.65)}}
.hero h1{font-size:clamp(2.4rem,5vw,4.6rem);font-weight:200;line-height:1.05;letter-spacing:-2.5px;max-width:15ch;margin-bottom:1.5rem;background:linear-gradient(180deg,#fff 32%,rgba(246,244,252,.62));-webkit-background-clip:text;background-clip:text;color:transparent}
.hero h1 em{font-style:normal;background:linear-gradient(120deg,#c4b5fd,#7c3aed);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 0 32px rgba(139,92,246,.5))}
.hero-sub{font-size:clamp(15px,1.7vw,19px);color:var(--t2);line-height:1.7;max-width:600px;margin-bottom:2.6rem;font-weight:300}
.hero-ctas{display:flex;gap:14px;align-items:center;flex-wrap:wrap;justify-content:center}
.btn-pri{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:16px 30px;background:linear-gradient(135deg,#8b5cf6,#6d28d9);border-radius:11px;color:#fff;font-size:14px;font-weight:600;transition:all .22s;box-shadow:0 8px 30px rgba(139,92,246,.36),inset 0 1px 0 rgba(255,255,255,.2)}
.btn-pri:hover{transform:translateY(-2px);box-shadow:0 14px 42px rgba(139,92,246,.54),inset 0 1px 0 rgba(255,255,255,.28)}
.btn-sec{display:inline-flex;align-items:center;gap:7px;padding:16px 26px;border:.5px solid var(--b2);border-radius:11px;color:var(--t2);font-size:14px;font-weight:500;transition:all .18s}
.btn-sec:hover{color:#fff;border-color:rgba(255,255,255,.28);background:rgba(255,255,255,.03)}
.hero-trust{display:flex;align-items:center;gap:1.1rem;margin-top:1.9rem;flex-wrap:wrap;justify-content:center}
.htrust{font-size:12px;color:var(--t3);display:inline-flex;align-items:center;gap:7px}
.htrust svg{width:13px;height:13px;stroke:var(--green);fill:none;stroke-width:2.2}
.htrust-sep{width:1px;height:11px;background:var(--b2)}

/* HERO PREVIEW (no device frame) */
.preview{position:relative;z-index:1;margin-top:clamp(3.5rem,7vw,6rem);width:100%;display:flex;justify-content:center}
.preview-glow{position:absolute;top:-8%;left:50%;transform:translateX(-50%);width:80%;height:120%;background:radial-gradient(ellipse,rgba(139,92,246,.22),transparent 60%);filter:blur(36px);pointer-events:none}
.panel{position:relative;width:min(960px,100%);background:linear-gradient(180deg,rgba(22,19,39,.94),rgba(12,10,24,.96));border:.5px solid var(--b2);border-radius:20px;box-shadow:0 40px 120px rgba(0,0,0,.6),0 0 0 1px rgba(255,255,255,.03),inset 0 1px 0 rgba(255,255,255,.05);overflow:hidden;backdrop-filter:blur(10px)}
.panel-bar{display:flex;align-items:center;gap:.7rem;padding:.95rem 1.3rem;border-bottom:.5px solid var(--b1);background:rgba(0,0,0,.2)}
.pb-live{margin-left:auto;display:inline-flex;align-items:center;gap:7px;font-size:10px;letter-spacing:1px;text-transform:uppercase;color:var(--green)}
.pb-live .lvdot{width:6px;height:6px;border-radius:50%;background:var(--green);box-shadow:0 0 8px var(--green);animation:pulse 1.6s ease-in-out infinite}
.pb-name{font-size:11px;letter-spacing:3px;text-transform:uppercase;color:var(--t2);font-weight:600}.pb-name span{color:var(--v)}
.panel-body{display:flex;flex-direction:column;gap:1.1rem;padding:1.4rem}
.pv-grid{display:grid;grid-template-columns:1.15fr 1fr;gap:1.1rem}
.pv-kpis{display:flex;flex-direction:column;gap:1.1rem}
.pv-score{display:flex;align-items:center;gap:1.3rem;padding:1.3rem;background:rgba(255,255,255,.02);border:.5px solid var(--b1);border-radius:14px}
.pv-score-num{font-size:46px;font-weight:200;letter-spacing:-2px;line-height:1;color:var(--orange)}
.pv-score-lbl{font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:var(--t3);margin-top:5px}
.pv-row{display:grid;grid-template-columns:1fr 1fr;gap:1.1rem}
.pv-kpi{padding:1.05rem 1.2rem;background:rgba(255,255,255,.02);border:.5px solid var(--b1);border-radius:14px}
.pv-kpi-l{font-size:9px;letter-spacing:1.2px;text-transform:uppercase;color:var(--t3);margin-bottom:8px}
.pv-kpi-v{font-size:26px;font-weight:200;letter-spacing:-1.2px;color:#eceaf6;line-height:1}
.pv-kpi-s{font-size:10px;color:var(--t3);margin-top:6px}
.pv-alerts{padding:1.2rem;background:rgba(255,255,255,.02);border:.5px solid var(--b1);border-radius:14px;display:flex;flex-direction:column}
.pv-alerts-l{font-size:9px;letter-spacing:1.2px;text-transform:uppercase;color:var(--t3);margin-bottom:1rem}
.pv-al{display:flex;align-items:flex-start;gap:10px;padding:.7rem .8rem;border-radius:10px;margin-bottom:.6rem}
.pv-al:last-child{margin-bottom:0}
.pv-al-3{background:rgba(226,80,60,.08);border:.5px solid rgba(226,80,60,.22)}
.pv-al-2{background:rgba(220,126,46,.07);border:.5px solid rgba(220,126,46,.2)}
.pv-al-1{background:rgba(224,160,46,.06);border:.5px solid rgba(224,160,46,.16)}
.pv-al-dot{width:7px;height:7px;border-radius:50%;flex-shrink:0;margin-top:4px}
.d-3{background:var(--red);box-shadow:0 0 8px var(--red)}.d-2{background:var(--orange)}.d-1{background:var(--amber)}
.pv-al-t{font-size:12.5px;color:#eceaf6;font-weight:500;line-height:1.4}
.pv-al-s{font-size:11px;color:var(--t3);margin-top:2px;line-height:1.4}
/* floating toasts */
.toast{position:absolute;z-index:3;width:230px;background:rgba(20,17,36,.97);border:.5px solid var(--b2);border-radius:13px;padding:.85rem .95rem;box-shadow:0 20px 50px rgba(0,0,0,.55);backdrop-filter:blur(12px)}
.toast-1{top:14%;left:-30px;animation:floaty 5s ease-in-out infinite}
.toast-2{bottom:16%;right:-26px;animation:floaty 5.5s ease-in-out .6s infinite}
@keyframes floaty{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}
.toast-hd{display:flex;align-items:center;gap:7px;margin-bottom:6px}
.toast-ic{width:22px;height:22px;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:11px}
.toast-app{font-size:9px;letter-spacing:.5px;text-transform:uppercase;color:var(--t3);font-weight:600}
.toast-t{font-size:12px;font-weight:600;color:#fff;line-height:1.3;margin-bottom:2px}
.toast-m{font-size:10.5px;color:var(--t3);line-height:1.4}

/* LOGOS / INTEGRATIONS STRIP */
.logos{display:flex;align-items:center;justify-content:center;gap:clamp(1.5rem,4vw,3.5rem);flex-wrap:wrap;padding:2.6rem 0}
.logos-lbl{font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--t4)}
.logo-item{display:inline-flex;align-items:center;gap:9px;font-size:15px;font-weight:500;color:var(--t2);letter-spacing:.3px}
.logo-item .lg-dot{width:7px;height:7px;border-radius:50%;background:var(--green)}
.logo-item.soon{color:var(--t4)}.logo-item.soon .lg-dot{background:var(--t4)}

/* STATS */
.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:clamp(1.5rem,4vw,4rem)}
.stat{text-align:center}
.stat-n{font-size:clamp(2.6rem,5vw,3.8rem);font-weight:200;letter-spacing:-2px;line-height:1;background:linear-gradient(180deg,#fff,rgba(246,244,252,.6));-webkit-background-clip:text;background-clip:text;color:transparent}
.stat-n span{background:linear-gradient(120deg,#a78bfa,#7c3aed);-webkit-background-clip:text;background-clip:text;color:transparent}
.stat-l{font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:var(--t3);margin-top:.9rem}

/* SPLIT (alertes) */
.split{display:grid;grid-template-columns:1fr 1fr;gap:clamp(2.5rem,6vw,6rem);align-items:center}
.notif-stack{display:flex;flex-direction:column;gap:.85rem}
.notif{background:linear-gradient(180deg,rgba(255,255,255,.035),rgba(255,255,255,.008));border:.5px solid var(--b2);border-radius:16px;padding:1.15rem 1.3rem;display:flex;align-items:flex-start;gap:13px;transition:all .25s;backdrop-filter:blur(6px)}
.notif:hover{transform:translateX(6px);box-shadow:0 18px 42px rgba(0,0,0,.34);border-color:rgba(255,255,255,.18)}
.notif-ic{width:40px;height:40px;border-radius:11px;display:flex;align-items:center;justify-content:center;font-size:17px;flex-shrink:0}
.notif-b{flex:1}
.notif-app{font-size:9px;font-weight:600;color:var(--t3);text-transform:uppercase;letter-spacing:.6px;margin-bottom:4px}
.notif-t{font-size:14px;font-weight:600;color:#fff;margin-bottom:3px;line-height:1.3}
.notif-m{font-size:12.5px;color:var(--t3);line-height:1.5}
.notif-time{font-size:10px;color:var(--t4);flex-shrink:0;white-space:nowrap}
.notif-3{border-color:rgba(226,80,60,.3);background:rgba(226,80,60,.05)}
.notif-2{border-color:rgba(220,126,46,.26);background:rgba(220,126,46,.04)}
.chan-list{margin-top:2rem;display:flex;flex-direction:column;gap:.85rem}
.chan{display:flex;align-items:center;gap:13px}
.chan-ic{width:36px;height:36px;border-radius:10px;background:rgba(62,207,142,.08);border:.5px solid rgba(62,207,142,.2);display:flex;align-items:center;justify-content:center;font-size:15px;flex-shrink:0}
.chan-t{font-size:13.5px;color:var(--t2)}

/* DETECTORS */
.det-grid{display:grid;grid-template-columns:1fr 1fr;gap:clamp(2.5rem,5vw,4rem);align-items:start;margin-top:3.5rem}
.det-layout{border:.5px solid var(--b1);border-radius:16px;overflow:hidden;background:rgba(255,255,255,.012)}
.det-item{display:flex;align-items:center;gap:1rem;padding:1.15rem 1.35rem;border-bottom:.5px solid var(--b1);cursor:pointer;transition:background .15s;user-select:none}
.det-item:last-child{border-bottom:none}.det-item:hover{background:rgba(255,255,255,.025)}
.det-item.act{background:var(--s1)}.det-item.act .di-n{color:var(--v);border-color:var(--vb);background:var(--va)}
.di-n{width:28px;height:28px;border-radius:50%;border:.5px solid var(--b1);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;color:var(--t3);flex-shrink:0;transition:all .15s;font-family:'DM Sans',sans-serif}
.di-t{font-size:14px;color:var(--tx);flex:1}
.di-badge{font-size:8px;padding:3px 9px;background:var(--va);border:.5px solid var(--vb);border-radius:100px;color:var(--v2);letter-spacing:.5px;text-transform:uppercase;flex-shrink:0}
.det-detail{background:linear-gradient(180deg,var(--s1),rgba(15,13,28,.6));border:.5px solid var(--b2);border-radius:18px;padding:clamp(1.8rem,3vw,2.8rem);position:sticky;top:7rem;overflow:hidden}
.dd-ghost{font-size:96px;font-weight:200;letter-spacing:-6px;color:rgba(255,255,255,.035);line-height:1;margin-bottom:1.2rem;font-family:'DM Sans',sans-serif}
.dd-ic{width:48px;height:48px;border-radius:12px;background:var(--va);border:.5px solid var(--vb);display:flex;align-items:center;justify-content:center;margin-bottom:1.6rem}
.dd-ic svg{width:21px;height:21px;stroke:var(--v2);fill:none;stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round}
.dd-h{font-size:24px;font-weight:500;color:#fff;margin-bottom:1rem;line-height:1.25}
.dd-d{font-size:14.5px;color:var(--t2);line-height:1.8}
.dd-lv{display:inline-flex;align-items:center;gap:7px;font-size:10px;padding:5px 12px;border-radius:100px;margin-top:1.9rem;letter-spacing:.5px;text-transform:uppercase}
.dd-l1{background:rgba(224,160,46,.08);border:.5px solid rgba(224,160,46,.2);color:var(--amber)}
.dd-l2{background:rgba(220,126,46,.08);border:.5px solid rgba(220,126,46,.2);color:var(--orange)}
.dd-l3{background:rgba(226,80,60,.08);border:.5px solid rgba(226,80,60,.2);color:var(--red)}
.det-more{margin-top:1.4rem;font-size:12.5px;color:var(--t3);line-height:1.7}

/* DEMO */
.demo-wrap{background:linear-gradient(180deg,var(--s1),rgba(12,10,24,.7));border:.5px solid var(--b2);border-radius:18px;overflow:hidden;margin-top:3.5rem;box-shadow:0 30px 80px rgba(0,0,0,.4)}
.demo-tb{display:flex;align-items:center;gap:8px;padding:1rem 1.6rem;border-bottom:.5px solid var(--b1);background:rgba(0,0,0,.18)}
.demo-ttl{flex:1;text-align:center;font-size:11px;color:var(--t3);letter-spacing:.5px}
.demo-body{display:grid;grid-template-columns:1fr 320px;min-height:420px}
.demo-lp{padding:1.8rem;border-right:.5px solid var(--b1)}
.demo-llab{font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:var(--t3);margin-bottom:1.3rem}
.demo-pnl{display:flex;align-items:baseline;gap:9px;margin-bottom:1.6rem}
.demo-pv{font-size:42px;font-weight:200;letter-spacing:-2px;transition:color .3s}
.demo-pc{font-size:12px;color:var(--t3)}
.demo-chart{position:relative;height:150px;margin-bottom:1.4rem}
.demo-tlab{font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:var(--t3);margin-bottom:.9rem}
.demo-tr{display:flex;justify-content:space-between;align-items:center;padding:9px 0;border-bottom:.5px solid var(--b1);font-size:12.5px}.demo-tr:last-child{border-bottom:none}
.dtt{color:var(--t3)}.dtins{color:var(--t2)}.dtp{color:var(--green);font-weight:500}.dtn{color:var(--red);font-weight:500}
.demo-rp{padding:1.8rem;display:flex;flex-direction:column;background:rgba(0,0,0,.12)}
.demo-rlab{font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:var(--t3);margin-bottom:.9rem}
.demo-als{flex:1;display:flex;flex-direction:column;gap:.6rem}
.ai{display:flex;align-items:flex-start;gap:11px;padding:.85rem 1rem;border-radius:11px;border:.5px solid transparent;animation:sli .3s ease}
@keyframes sli{from{opacity:0;transform:translateY(-5px)}to{opacity:1;transform:translateY(0)}}
.al1{background:rgba(224,160,46,.05);border-color:rgba(224,160,46,.12)}
.al2{background:rgba(220,126,46,.06);border-color:rgba(220,126,46,.16)}
.al3{background:rgba(226,80,60,.08);border-color:rgba(226,80,60,.22)}
.adot{width:8px;height:8px;border-radius:50%;margin-top:4px;flex-shrink:0}
.dl1{background:var(--amber)}.dl2{background:var(--orange)}.dl3{background:var(--red);animation:blk 1s ease-in-out infinite}
@keyframes blk{0%,100%{opacity:1}50%{opacity:.3}}
.ab{flex:1}.at{font-size:12.5px;font-weight:500;color:#fff;margin-bottom:3px}.as{font-size:11.5px;color:var(--t3);line-height:1.45}
.abg{font-size:9px;padding:3px 8px;border-radius:100px;letter-spacing:.5px;text-transform:uppercase;white-space:nowrap;flex-shrink:0;margin-top:1px}
.bl1{background:rgba(224,160,46,.12);color:var(--amber)}.bl2{background:rgba(220,126,46,.12);color:var(--orange)}.bl3{background:rgba(226,80,60,.14);color:var(--red)}
.demo-sbtn{margin-top:1.2rem;width:100%;padding:13px;background:var(--va);border:.5px solid var(--vb);border-radius:10px;color:var(--v2);font-size:12.5px;font-family:'DM Sans',sans-serif;cursor:pointer;letter-spacing:.5px;transition:all .2s;font-weight:500}.demo-sbtn:hover{background:rgba(139,92,246,.16)}

/* STEPS */
.steps{display:grid;grid-template-columns:repeat(3,1fr);gap:1.2rem;margin-top:3.5rem}
.step{padding:clamp(1.8rem,3vw,2.6rem);background:linear-gradient(180deg,rgba(255,255,255,.03),rgba(255,255,255,.006));border:.5px solid var(--b1);border-radius:18px;transition:all .25s}
.step:hover{border-color:var(--b2);transform:translateY(-4px);box-shadow:0 22px 50px rgba(0,0,0,.34)}
.step-n{display:inline-flex;align-items:center;justify-content:center;width:38px;height:38px;border-radius:10px;background:var(--va);border:.5px solid var(--vb);color:var(--v2);font-family:'DM Sans',sans-serif;font-size:13px;font-weight:500;margin-bottom:1.6rem}
.step-h{font-size:19px;font-weight:500;color:#fff;margin-bottom:.8rem;line-height:1.3}
.step-d{font-size:13.5px;color:var(--t2);line-height:1.75}
.step-tags{display:flex;flex-wrap:wrap;gap:6px;margin-top:1.3rem}
.stag{font-size:10px;padding:4px 11px;background:rgba(255,255,255,.04);border:.5px solid var(--b1);border-radius:100px;color:var(--t2);display:inline-flex;align-items:center;gap:5px}
.stag .sd{width:4px;height:4px;border-radius:50%;background:var(--green)}.stag.soon{opacity:.45}

/* TESTIMONIALS */
.testi{display:grid;grid-template-columns:repeat(3,1fr);gap:1.2rem;margin-top:3.5rem}
.tcard{padding:2rem;background:linear-gradient(180deg,rgba(255,255,255,.028),rgba(255,255,255,.006));border:.5px solid var(--b1);border-radius:18px;transition:all .25s;backdrop-filter:blur(6px)}
.tcard:hover{border-color:var(--b2);transform:translateY(-4px);box-shadow:0 22px 50px rgba(0,0,0,.36)}
.tstars{color:#f5a623;font-size:12px;letter-spacing:2px;margin-bottom:1.2rem}
.tq{font-size:14px;color:var(--t2);line-height:1.7;margin-bottom:1.5rem}.tq strong{color:#fff;font-weight:600}
.tau{display:flex;align-items:center;gap:12px}
.tav{width:38px;height:38px;border-radius:50%;background:var(--s2);border:.5px solid var(--b2);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;color:var(--t2)}
.tname{font-size:13.5px;font-weight:500;color:#fff}.trole{font-size:11.5px;color:var(--t3)}

/* PRICING */
.pricing{display:grid;grid-template-columns:1fr 1fr;gap:1.3rem;max-width:880px;margin:3.5rem auto 0}
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
.plan-btn{width:100%;padding:14px;border-radius:10px;font-size:13px;font-weight:600;font-family:'DM Sans',sans-serif;cursor:pointer;transition:all .18s;letter-spacing:.3px;display:block;text-align:center;border:none}
.plan-btn-sec{background:transparent;border:.5px solid var(--b2);color:var(--t2)}.plan-btn-sec:hover{border-color:rgba(255,255,255,.3);color:#fff}
.plan-btn-pri{background:linear-gradient(135deg,#8b5cf6,#6d28d9);color:#fff;box-shadow:0 8px 26px rgba(139,92,246,.36)}.plan-btn-pri:hover{transform:translateY(-2px);box-shadow:0 12px 34px rgba(139,92,246,.5)}
.price-note{text-align:center;margin-top:2rem;font-size:12.5px;color:var(--t3);font-style:italic}

/* STORY */
.story{max-width:680px;margin:0 auto}
.story-p{font-size:16px;color:var(--t2);line-height:1.95;font-weight:300;margin-bottom:1.5rem}
.story-end{font-size:clamp(20px,2.4vw,26px);color:#fff;line-height:1.45;font-weight:200;font-style:italic;letter-spacing:-.3px;margin-top:1rem}
.story-end em{font-style:normal;background:linear-gradient(120deg,#a78bfa,#7c3aed);-webkit-background-clip:text;background-clip:text;color:transparent}

/* FINAL CTA */
.fcta{text-align:center;position:relative;z-index:1;padding:clamp(6rem,12vw,10rem) 0}
.fcta-h{font-size:clamp(2.1rem,5vw,4.1rem);font-weight:200;letter-spacing:-2px;line-height:1.05;margin-bottom:1.4rem;background:linear-gradient(180deg,#fff,rgba(246,244,252,.62));-webkit-background-clip:text;background-clip:text;color:transparent}
.fcta-h em{font-style:normal;background:linear-gradient(120deg,#c4b5fd,#7c3aed);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 0 30px rgba(139,92,246,.5))}
.fcta-sub{font-size:16px;color:var(--t2);margin-bottom:2.5rem;font-weight:300;max-width:520px;margin-left:auto;margin-right:auto;line-height:1.7}
.fcta-login{margin-top:1.4rem;font-size:13px;color:var(--t3)}.fcta-login a span{color:var(--v2)}

/* FOOTER */
footer{padding:2.2rem 0;border-top:.5px solid var(--b1);position:relative;z-index:1}
.foot-in{max-width:var(--maxw);margin:0 auto;padding:0 clamp(1.5rem,4vw,3.5rem);display:flex;justify-content:space-between;align-items:center;gap:1.2rem;flex-wrap:wrap}
.foot-logo{font-size:13px;letter-spacing:4px;text-transform:uppercase;color:var(--t4);font-weight:600}.foot-logo span{color:rgba(124,58,237,.4)}
.foot-links{display:flex;gap:2rem}
.foot-lk{font-size:11.5px;color:var(--t3);letter-spacing:.5px;transition:color .15s}.foot-lk:hover{color:var(--t2)}
.foot-email{font-size:11.5px;color:var(--t3)}

/* JOURNAL */
.jrn-card{background:linear-gradient(180deg,rgba(22,19,39,.92),rgba(12,10,24,.95));border:.5px solid var(--b2);border-radius:18px;padding:1.3rem;box-shadow:0 30px 80px rgba(0,0,0,.4)}
.jrn-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:.7rem;margin-bottom:1rem}
.jrn-kpi{padding:.95rem;background:rgba(255,255,255,.02);border:.5px solid var(--b1);border-radius:12px}
.jrn-kl{font-size:9px;letter-spacing:1px;text-transform:uppercase;color:var(--t3);margin-bottom:8px}
.jrn-kv{font-size:22px;font-weight:200;letter-spacing:-1px;color:#eceaf6;line-height:1}
.jrn-eq{background:rgba(255,255,255,.02);border:.5px solid var(--b1);border-radius:12px;padding:1rem 1.1rem 1.1rem}
.jrn-eq-l{font-size:9px;letter-spacing:1px;text-transform:uppercase;color:var(--t3);margin-bottom:1rem;display:flex;justify-content:space-between;align-items:center}

/* COMPARE */
.cmp{display:grid;grid-template-columns:1fr 1fr;gap:1.2rem;margin-top:3.2rem;text-align:left}
.cmp-col{padding:clamp(1.6rem,3vw,2.3rem);border-radius:18px;border:.5px solid var(--b1)}
.cmp-old{background:rgba(255,255,255,.014)}
.cmp-new{background:linear-gradient(160deg,rgba(139,92,246,.13),var(--s1) 60%);border-color:rgba(139,92,246,.4);box-shadow:0 0 60px rgba(139,92,246,.1)}
.cmp-lbl{font-size:11px;letter-spacing:1.8px;text-transform:uppercase;color:var(--t3);margin-bottom:1.1rem}
.cmp-new .cmp-lbl{color:var(--v2)}
.cmp-li{font-size:13.5px;color:var(--t2);padding:.7rem 0;border-bottom:.5px solid rgba(255,255,255,.05);display:flex;align-items:center;gap:11px}
.cmp-li:last-child{border-bottom:none}
.cmp-li::before{content:'';width:6px;height:6px;border-radius:50%;background:var(--t4);flex-shrink:0}
.cmp-new .cmp-li{color:#e9e6f5}
.cmp-new .cmp-li::before{background:var(--v);box-shadow:0 0 8px var(--v)}

/* RESPONSIVE */
@media(max-width:980px){
  .n-links{display:none}
  .pv-grid{grid-template-columns:1fr}
  .jrn-grid{grid-template-columns:1fr 1fr}
  .cmp{grid-template-columns:1fr}
  .toast{display:none}
  .split{grid-template-columns:1fr}
  .det-grid{grid-template-columns:1fr}.det-detail{display:none}
  .steps{grid-template-columns:1fr}
  .testi{grid-template-columns:1fr}
  .pricing{grid-template-columns:1fr}
  .demo-body{grid-template-columns:1fr}.demo-lp{border-right:none;border-bottom:.5px solid var(--b1)}
  .stats{grid-template-columns:1fr 1fr;gap:2.5rem}
}
@media(max-width:560px){
  .hero h1{letter-spacing:-1.5px}
  .promo-badge,.promo-xtra,.promo-cta{display:none}
  .hero-ctas{flex-direction:column;width:100%;max-width:340px}
  .btn-pri,.btn-sec{width:100%}
  .stats{grid-template-columns:1fr;gap:2.2rem}
  .foot-in{flex-direction:column;text-align:center}
}
`

const DETECTORS = [
  {n:'01',name:'Revenge sizing',icon:'<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>',desc:"La taille de position augmente après une perte, le chemin le plus court pour exploser une journée. Caldra compare chaque nouvelle ouverture aux positions précédentes.",lv:2,s:true},
  {n:'02',name:'Re-entrée immédiate',icon:'<polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.4"/>',desc:"Reprendre un trade moins de 2 minutes après la sortie. L'impulsion, pas l'analyse. Caldra mesure l'intervalle exact entre exit et nouvel entry.",lv:1,s:false},
  {n:'03',name:'Série de pertes',icon:'<line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/>',desc:"3 pertes consécutives, le seuil où l'émotion prend le dessus. Configurable selon ton historique.",lv:2,s:false},
  {n:'04',name:'Alerte drawdown',icon:'<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',desc:"Perte journalière approchant ou dépassant ta limite. Deux niveaux : préventive à 80%, stop forcé à 100%. Capital configurable.",lv:3,s:false},
  {n:'05',name:'Hors session',icon:'<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',desc:"Trade en dehors de tes horaires définis. Fatigue, ennui, ou opportunisme, rarement de bons états pour entrer en marché.",lv:1,s:false},
  {n:'06',name:'Suractivité',icon:'<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>',desc:"Nombre de trades dépassant ta limite de session. Plus tu trades, plus tu trades souvent pire.",lv:2,s:false},
  {n:'07',name:'Trade pendant news',icon:'<path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/>',desc:"Entrée dans les 5 minutes d'un événement macro. News + position ouverte = casino. Caldra croise les timestamps avec le calendrier économique.",lv:2,s:true},
  {n:'08',name:'Stop non respecté',icon:'<line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/>',desc:"Position tenue au-delà de ton stop habituel. L'espoir n'est pas une stratégie.",lv:2,s:false},
  {n:'09',name:'Risk dépassé',icon:'<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>',desc:"Sizing dépassant ton risk par trade défini. Tes règles existent pour une raison.",lv:2,s:false},
]

const HTML = `
<div class="bg-grid"></div>
<div class="bg-aura aura-1"></div>
<div class="bg-aura aura-2"></div>

<div class="promo-bar">
  <span class="promo-spark">✦</span>
  <span class="promo-badge">Offre de lancement</span>
  <span><b>&minus;25 % à vie</b> <span class="promo-xtra">pour les 25 premiers inscrits</span></span>
  <button type="button" class="promo-code" onclick="if(navigator.clipboard)navigator.clipboard.writeText('START25');var l=this.querySelector('.pc-l'),b=this;this.classList.add('copied');l.textContent='Copié ✓';setTimeout(function(){b.classList.remove('copied');l.textContent='START25'},1500)">
    <span class="pc-l">START25</span>
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
  </button>
  <a href="/signup" class="promo-cta">J'en profite →</a>
</div>

<nav>
  <a href="#" class="n-logo">Cald<span>ra</span></a>
  <div class="n-links">
    <a class="n-lk" href="#journal">Journal</a>
    <a class="n-lk" href="#alertes">Alertes</a>
    <a class="n-lk" href="#detecteurs">Détecteurs</a>
    <a class="n-lk" href="#demo">Démo</a>
    <a class="n-lk" href="#tarifs">Tarifs</a>
  </div>
  <div class="n-r">
    <a href="/login" class="n-login">Connexion</a>
    <a href="/signup" class="n-signup">S'inscrire</a>
  </div>
</nav>

<!-- HERO -->
<header class="hero wrap">
  <div class="hero-eyebrow"><span class="dot"></span>Journal de trading · Alerte comportementale en temps réel</div>
  <h1>Bien plus qu'un <em>journal de trading.</em></h1>
  <p class="hero-sub">Caldra fait tout ce qu'un journal de trading fait, stats, win rate, profit factor, débriefs IA, puis va plus loin : il t'alerte en temps réel quand ton comportement déraille. Pendant la session, pas le soir une fois le mal fait.</p>
  <div class="hero-ctas">
    <a href="/signup" class="btn-pri">Essayer 7 jours gratuitement →</a>
    <a href="/login" class="btn-sec">J'ai déjà un compte</a>
  </div>
  <div class="hero-trust">
    <span class="htrust"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>7 jours d'essai</span>
    <span class="htrust-sep"></span>
    <span class="htrust"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>&minus;25 % early adopter</span>
    <span class="htrust-sep"></span>
    <span class="htrust"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>Disponible maintenant</span>
  </div>

  <!-- PRODUCT PREVIEW (no device frame) -->
  <div class="preview">
    <div class="preview-glow"></div>
    <div class="toast toast-1">
      <div class="toast-hd"><div class="toast-ic" style="background:rgba(220,126,46,.14)">⚠️</div><div class="toast-app">Caldra Session</div></div>
      <div class="toast-t">Revenge sizing détecté</div>
      <div class="toast-m">Sizing ×2.1 après &minus;€140</div>
    </div>
    <div class="toast toast-2">
      <div class="toast-hd"><div class="toast-ic" style="background:rgba(62,207,142,.14)">⚡</div><div class="toast-app">Push · Mobile</div></div>
      <div class="toast-t">Re-entrée rapide</div>
      <div class="toast-m">87s après la clôture. Min : 120s.</div>
    </div>
    <div class="panel">
      <div class="panel-bar">
        <span class="pb-name">Cald<span>ra</span> Session</span>
        <span class="pb-live"><span class="lvdot"></span>Live</span>
      </div>
      <div class="panel-body">
        <div class="pv-grid">
          <div class="pv-kpis">
            <div class="pv-score">
              <svg width="64" height="64" viewBox="0 0 64 64">
                <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(255,255,255,.06)" stroke-width="6"/>
                <circle cx="32" cy="32" r="26" fill="none" stroke="#dc7e2e" stroke-width="6" stroke-dasharray="163" stroke-dashoffset="62" stroke-linecap="round" style="transform:rotate(-90deg);transform-origin:32px 32px"/>
              </svg>
              <div><div class="pv-score-num">62</div><div class="pv-score-lbl">Score / 100</div></div>
            </div>
            <div class="pv-row">
              <div class="pv-kpi"><div class="pv-kpi-l">P&amp;L session</div><div class="pv-kpi-v">&minus;€180</div><div class="pv-kpi-s">en cours</div></div>
              <div class="pv-kpi"><div class="pv-kpi-l">Win rate</div><div class="pv-kpi-v">43%</div><div class="pv-kpi-s">3W · 4L</div></div>
            </div>
          </div>
          <div class="pv-alerts">
            <div class="pv-alerts-l">Alertes en direct</div>
            <div class="pv-al pv-al-3"><div class="pv-al-dot d-3"></div><div><div class="pv-al-t">STOP · Drawdown max</div><div class="pv-al-s">Ferme la plateforme maintenant.</div></div></div>
            <div class="pv-al pv-al-2"><div class="pv-al-dot d-2"></div><div><div class="pv-al-t">Revenge sizing ×2.1</div><div class="pv-al-s">1.4 lots vs 0.67 lots.</div></div></div>
            <div class="pv-al pv-al-1"><div class="pv-al-dot d-1"></div><div><div class="pv-al-t">Re-entrée rapide (87s)</div><div class="pv-al-s">Délai minimum : 120s.</div></div></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</header>

<!-- INTEGRATIONS STRIP -->
<div class="wrap" data-reveal>
  <div class="logos">
    <span class="logos-lbl">S'intègre à ta plateforme</span>
    <span class="logo-item"><span class="lg-dot"></span>cTrader</span>
    <span class="logo-item"><span class="lg-dot"></span>MetaTrader 5</span>
    <span class="logo-item"><span class="lg-dot"></span>Interactive Brokers</span>
    <span class="logo-item soon"><span class="lg-dot"></span>+ d'autres à venir</span>
  </div>
</div>
<div class="divider"></div>

<!-- STATS -->
<section class="sec wrap" data-reveal>
  <div class="stats">
    <div class="stat"><div class="stat-n">18</div><div class="stat-l">Comportements détectés</div></div>
    <div class="stat"><div class="stat-n"><span>&lt;</span>1s</div><div class="stat-l">Temps de détection</div></div>
    <div class="stat"><div class="stat-n"><span>∞</span></div><div class="stat-l">Historique illimité</div></div>
    <div class="stat"><div class="stat-n">100%</div><div class="stat-l">Automatique</div></div>
  </div>
</section>
<div class="divider"></div>

<!-- JOURNAL -->
<section class="sec wrap" id="journal" data-reveal>
  <div class="split">
    <div>
      <div class="tag">Journal complet</div>
      <div class="h2">Toutes les stats d'un journal pro.<br><em>Sans rien saisir.</em></div>
      <p class="lead">Win rate, profit factor, expectancy, courbe de capital, performance par symbole, par jour, par heure. Tes trades remontent tout seuls de ta plateforme, les statistiques se construisent en direct. Avec, en plus, les débriefs IA qui analysent tes sessions.</p>
      <div class="chan-list">
        <div class="chan"><div class="chan-ic">📊</div><div class="chan-t">Win rate, profit factor, expectancy, R moyen</div></div>
        <div class="chan"><div class="chan-ic">📈</div><div class="chan-t">Courbe de capital, perf par symbole, jour et heure</div></div>
        <div class="chan"><div class="chan-ic">🧠</div><div class="chan-t">Débriefs IA : jour, semaine, mois</div></div>
      </div>
    </div>
    <div class="jrn-card">
      <div class="jrn-grid">
        <div class="jrn-kpi"><div class="jrn-kl">Win rate</div><div class="jrn-kv">58%</div></div>
        <div class="jrn-kpi"><div class="jrn-kl">Profit factor</div><div class="jrn-kv">1.84</div></div>
        <div class="jrn-kpi"><div class="jrn-kl">Expectancy</div><div class="jrn-kv">€27</div></div>
        <div class="jrn-kpi"><div class="jrn-kl">Trades</div><div class="jrn-kv">142</div></div>
        <div class="jrn-kpi"><div class="jrn-kl">R moyen</div><div class="jrn-kv">1.6R</div></div>
        <div class="jrn-kpi"><div class="jrn-kl">Meilleur jour</div><div class="jrn-kv">€640</div></div>
      </div>
      <div class="jrn-eq">
        <div class="jrn-eq-l"><span>Courbe de capital</span><span style="color:var(--green)">+€3 820</span></div>
        <svg viewBox="0 0 320 90" preserveAspectRatio="none" style="width:100%;height:90px;display:block">
          <defs><linearGradient id="eqg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="rgba(62,207,142,.22)"/><stop offset="1" stop-color="rgba(62,207,142,0)"/></linearGradient></defs>
          <path d="M0,74 L40,68 L80,72 L120,54 L160,58 L200,40 L240,30 L280,20 L320,10 L320,90 L0,90 Z" fill="url(#eqg)"/>
          <path d="M0,74 L40,68 L80,72 L120,54 L160,58 L200,40 L240,30 L280,20 L320,10" fill="none" stroke="#3ecf8e" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linejoin="round"/>
        </svg>
      </div>
    </div>
  </div>
</section>
<div class="divider"></div>

<!-- COMPARE -->
<section class="sec wrap center" id="compare" data-reveal>
  <div class="tag" style="margin-left:auto;margin-right:auto">Journal classique vs Caldra</div>
  <div class="h2">Le journal regarde en arrière.<br>Caldra veille <em>pendant.</em></div>
  <p class="lead" style="margin-left:auto;margin-right:auto">Les journaux classiques t'expliquent tes erreurs le soir, une fois la session finie et le mal fait. Caldra fait le même travail d'analyse, en direct, et t'alerte avant que le trade de trop parte.</p>
  <div class="cmp">
    <div class="cmp-col cmp-old">
      <div class="cmp-lbl">Journal classique</div>
      <div class="cmp-li">Tu saisis tes trades à la main</div>
      <div class="cmp-li">Tu relis ta session le soir</div>
      <div class="cmp-li">Tu comprends l'erreur après coup</div>
      <div class="cmp-li">Aucun garde-fou pendant le trade</div>
    </div>
    <div class="cmp-col cmp-new">
      <div class="cmp-lbl">Caldra</div>
      <div class="cmp-li">Tes trades remontent automatiquement</div>
      <div class="cmp-li">Les stats se construisent en direct</div>
      <div class="cmp-li">L'alerte arrive pendant la session</div>
      <div class="cmp-li">Un signal t'arrête avant les dégâts</div>
    </div>
  </div>
</section>
<div class="divider"></div>

<!-- ALERTES -->
<section class="sec wrap" id="alertes" data-reveal>
  <div class="split">
    <div>
      <div class="tag">Le vrai différenciateur</div>
      <div class="h2">L'alerte que personne d'autre n'a.<br>En moins d'une seconde.</div>
      <p class="lead">C'est ce qu'aucun autre journal ne fait : dès qu'un pattern dangereux est détecté, tu reçois une notification push sur ton téléphone ET une alerte desktop. Sur iOS, Android et navigateur.</p>
      <div class="chan-list">
        <div class="chan"><div class="chan-ic">📱</div><div class="chan-t">Push iOS &amp; Android via Web Push (VAPID)</div></div>
        <div class="chan"><div class="chan-ic">💻</div><div class="chan-t">Notification desktop (Chrome, Safari, Firefox)</div></div>
        <div class="chan"><div class="chan-ic">💬</div><div class="chan-t">Webhook Discord configurable</div></div>
      </div>
    </div>
    <div class="notif-stack">
      <div class="notif notif-3"><div class="notif-ic" style="background:rgba(226,80,60,.12)">🔴</div><div class="notif-b"><div class="notif-app">Caldra Session</div><div class="notif-t">STOP · Drawdown max atteint</div><div class="notif-m">PnL session : &minus;€420 (&minus;4.2%). Ferme la plateforme maintenant.</div></div><div class="notif-time">maintenant</div></div>
      <div class="notif notif-2"><div class="notif-ic" style="background:rgba(220,126,46,.1)">⚠️</div><div class="notif-b"><div class="notif-app">Caldra Session</div><div class="notif-t">Revenge sizing détecté</div><div class="notif-m">Sizing ×2.1 après une perte, 1.4 lots vs 0.67 lots</div></div><div class="notif-time">3 min</div></div>
      <div class="notif"><div class="notif-ic" style="background:rgba(224,160,46,.08)">⚡</div><div class="notif-b"><div class="notif-app">Caldra Session</div><div class="notif-t">Re-entrée rapide</div><div class="notif-m">87 secondes après la clôture. Délai minimum : 120s.</div></div><div class="notif-time">11 min</div></div>
    </div>
  </div>
</section>
<div class="divider"></div>

<!-- DÉTECTEURS -->
<section class="sec wrap" id="detecteurs" data-reveal>
  <div class="tag">Ce qu'on détecte</div>
  <div class="h2">Ton empreinte comportementale,<br><em>en direct.</em></div>
  <p class="lead">Chaque trader a des patterns quand il commence à dérailler. Caldra en surveille <strong style="color:var(--tx);font-weight:500">18</strong>, voici les plus parlants.</p>
  <div class="det-grid">
    <div>
      <div class="det-layout" id="det-list"></div>
      <p class="det-more">+ 9 autres : sizing d'euphorie, acharnement directionnel, sur-exposition, désespoir de fin de session, cadence qui s'emballe, tu coupes tes gains et laisses courir tes pertes…</p>
    </div>
    <div class="det-detail" id="det-detail">
      <div class="dd-ghost" id="dd-ghost">01</div>
      <div class="dd-ic"><svg viewBox="0 0 24 24" id="dd-svg"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg></div>
      <div class="dd-h" id="dd-h">Revenge sizing</div>
      <div class="dd-d" id="dd-d">La taille de position augmente après une perte, le chemin le plus court pour exploser une journée. Caldra compare chaque nouvelle ouverture aux positions précédentes.</div>
      <div class="dd-lv dd-l2" id="dd-lv">Niveau 2 · Alerte</div>
    </div>
  </div>
</section>
<div class="divider"></div>

<!-- DEMO -->
<section class="sec wrap" id="demo" data-reveal>
  <div class="tag">Démo interactive</div>
  <div class="h2">Vois Caldra en action<br><em>sur une vraie session.</em></div>
  <p class="lead">Simule un enchaînement de trades et observe comment Caldra détecte les patterns en temps réel.</p>
  <div class="demo-wrap">
    <div class="demo-tb">
      <div style="width:10px;height:10px;border-radius:50%;background:#ff5f57"></div>
      <div style="width:10px;height:10px;border-radius:50%;background:#ffbd2e"></div>
      <div style="width:10px;height:10px;border-radius:50%;background:#28c840"></div>
      <div class="demo-ttl">Caldra · Session EUR/USD</div>
    </div>
    <div class="demo-body">
      <div class="demo-lp">
        <div class="demo-llab">P&amp;L de session</div>
        <div class="demo-pnl"><div class="demo-pv" id="dpnl" style="color:var(--green)">+€240</div><div class="demo-pc" id="dpc">Session en cours</div></div>
        <div class="demo-chart"><canvas id="pc"></canvas></div>
        <div class="demo-tlab">Derniers trades</div>
        <div id="tlog">
          <div class="demo-tr"><span class="dtt">09:32</span><span class="dtins">EUR/USD Long</span><span class="dtp">+€140</span></div>
          <div class="demo-tr"><span class="dtt">09:51</span><span class="dtins">EUR/USD Short</span><span class="dtp">+€100</span></div>
        </div>
      </div>
      <div class="demo-rp">
        <div class="demo-rlab">Alertes Caldra</div>
        <div class="demo-als" id="ac"><div style="font-size:12px;color:var(--t3);padding:.5rem 0">Aucune alerte · session saine.</div></div>
        <button class="demo-sbtn" id="sb" onclick="sim()">→ Simuler le trade suivant</button>
      </div>
    </div>
  </div>
</section>
<div class="divider"></div>

<!-- COMMENT -->
<section class="sec wrap" id="comment" data-reveal>
  <div class="tag">Comment ça marche</div>
  <div class="h2">Configure une fois.<br><em>Il veille toujours.</em></div>
  <p class="lead">Aucune saisie manuelle. Caldra se connecte à ta plateforme et fait le reste.</p>
  <div class="steps">
    <div class="step"><div class="step-n">01</div><div class="step-h">Connecte ta plateforme</div><div class="step-d">Connexion directe via API. Tes trades remontent automatiquement, rien à saisir manuellement.</div><div class="step-tags"><span class="stag"><span class="sd"></span>cTrader</span><span class="stag"><span class="sd"></span>MetaTrader 5</span><span class="stag"><span class="sd"></span>Interactive Brokers</span><span class="stag soon">+ à venir</span></div></div>
    <div class="step"><div class="step-n">02</div><div class="step-h">Configure tes règles</div><div class="step-d">Horaires de session, risk par trade, drawdown max. Tes règles, tes standards, pas des valeurs génériques imposées.</div></div>
    <div class="step"><div class="step-n">03</div><div class="step-h">Trade, on veille</div><div class="step-d">Dès qu'un pattern dangereux est détecté, tu reçois une notification push + desktop en moins d'une seconde.</div></div>
  </div>
</section>
<div class="divider"></div>

<!-- AVIS -->
<section class="sec wrap" id="avis" data-reveal>
  <div class="tag">Ce qu'ils disent</div>
  <div class="h2">Testé par de vrais traders.</div>
  <p class="lead">Bêta fermée, retours des premiers utilisateurs sur leurs sessions réelles.</p>
  <div class="testi">
    <div class="tcard"><div class="tstars">★★★★★</div><p class="tq">« J'ai claqué trois semaines de gains en une après-midi à cause du tilt. <strong>Ce genre d'outil j'en avais besoin depuis longtemps.</strong> »</p><div class="tau"><div class="tav">TM</div><div><div class="tname">Thomas M.</div><div class="trole">Trader Forex · 3 ans</div></div></div></div>
    <div class="tcard"><div class="tstars">★★★★★</div><p class="tq">« <strong>Je savais même pas que je faisais du revenge sizing.</strong> Ça se voyait pas de l'intérieur. Hâte que ça sorte. »</p><div class="tau"><div class="tav">KF</div><div><div class="tname">KrazoliFX</div><div class="trole">Trader CFD/Forex · Paris</div></div></div></div>
    <div class="tcard"><div class="tstars">★★★★☆</div><p class="tq">« J'utilise TradeZella mais c'est toujours après coup. <strong>Avec Caldra l'alerte est arrivée pendant ma session.</strong> C'est pas du tout la même chose. »</p><div class="tau"><div class="tav">KL</div><div><div class="tname">Kevin L.</div><div class="trole">Trader Forex · Lyon</div></div></div></div>
  </div>
</section>
<div class="divider"></div>

<!-- TARIFS -->
<section class="sec wrap center" id="tarifs" data-reveal>
  <div class="tag">Tarifs</div>
  <div class="h2">Simple.<br>Rentabilisé au <em>premier trade évité.</em></div>
  <p class="lead"><strong style="color:var(--tx)">&minus;25 % à vie</strong> pour les 25 premiers inscrits · Pro à <strong style="color:var(--tx)">14,25€</strong> · Max à <strong style="color:var(--tx)">21,75€</strong></p>
  <div class="pricing">
    <div class="plan plan-pro">
      <div class="plan-lab">Pro</div>
      <div class="plan-price"><sup>€</sup>14,25<sub>/mois</sub><span class="plan-strike">19€</span><span class="plan-promo-tag">&minus;25 %</span></div>
      <div class="plan-tag">Surveillance comportementale complète. Alertes immédiates dès qu'un pattern dangereux est détecté.</div>
      <ul class="plan-features">
        <li><div class="pfc pfc-d"><svg viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3"/></svg></div>12 détecteurs comportementaux</li>
        <li><div class="pfc pfc-d"><svg viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3"/></svg></div>Dashboard temps réel</li>
        <li><div class="pfc pfc-d"><svg viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3"/></svg></div>4 patterns récurrents</li>
        <li><div class="pfc pfc-d"><svg viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3"/></svg></div>Alertes Discord</li>
        <li><div class="pfc pfc-d"><svg viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3"/></svg></div>Personnalisation des règles</li>
        <li><div class="pfc pfc-d"><svg viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3"/></svg></div>Rapport mensuel</li>
        <li><div class="pfc pfc-d"><svg viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3"/></svg></div>Historique illimité</li>
      </ul>
      <a href="/signup?plan=pro" class="plan-btn plan-btn-sec">Essayer 7 jours gratuitement →</a>
    </div>
    <div class="plan plan-max">
      <div class="plan-pop">Recommandé</div>
      <div class="plan-lab">Max</div>
      <div class="plan-price"><sup>€</sup>21,75<sub>/mois</sub><span class="plan-strike">29€</span><span class="plan-promo-tag">&minus;25 %</span></div>
      <div class="plan-tag">Tout le plan Pro, avec la détection comportementale la plus poussée et un suivi hebdomadaire.</div>
      <ul class="plan-features">
        <li><div class="pfc pfc-d"><svg viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3"/></svg></div><span style="color:var(--t3)">Tout le plan Pro inclus, plus :</span></li>
        <li class="plan-hi"><div class="pfc pfc-v"><svg viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3"/></svg></div>18 détecteurs comportementaux</li>
        <li class="plan-hi"><div class="pfc pfc-v"><svg viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3"/></svg></div>Règles configurables (on/off + seuils)</li>
        <li class="plan-hi"><div class="pfc pfc-v"><svg viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3"/></svg></div>Mode prop firm (FTMO, FundedNext…)</li>
        <li class="plan-hi"><div class="pfc pfc-v"><svg viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3"/></svg></div>Débriefs IA : jour, semaine, mois</li>
        <li class="plan-hi"><div class="pfc pfc-v"><svg viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3"/></svg></div>Patterns récurrents complets</li>
        <li class="plan-hi"><div class="pfc pfc-v"><svg viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3"/></svg></div>Alertes Telegram</li>
        <li class="plan-hi"><div class="pfc pfc-v"><svg viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3"/></svg></div>Rapport hebdomadaire</li>
      </ul>
      <a href="/signup?plan=max" class="plan-btn plan-btn-pri">Essayer 7 jours gratuitement →</a>
    </div>
  </div>
  <p class="price-note">7 jours d'essai gratuit · Carte bancaire requise · Débit automatique à J+7 sauf résiliation</p>
</section>
<div class="divider"></div>

<!-- HISTOIRE -->
<section class="sec wrap" id="histoire" data-reveal>
  <div class="tag">L'histoire</div>
  <div class="h2">Une conviction.<br><em>Un outil.</em></div>
  <div class="story" style="margin-top:2.6rem">
    <p class="story-p">Caldra Session est né d'une certitude simple : la psychologie de trader ne s'apprend pas. Elle se construit. Lentement. Sous les graphiques. Dans la pression des positions ouvertes, dans le silence des pertes encaissées, dans les décisions prises à l'instinct quand la raison n'a plus la main.</p>
    <p class="story-p">On peut lire. On peut comprendre. On peut mémoriser chaque biais cognitif. Et se retrouver exactement dans le même état, la prochaine session, face au même chart, à refaire exactement la même chose.</p>
    <p class="story-p">Caldra Session n'est pas là pour changer la nature humaine. Il est là pour ce moment précis, celui où un signal extérieur change tout.</p>
    <div class="story-end">La discipline ne se force pas. <em>Elle se protège.</em></div>
  </div>
</section>
<div class="divider"></div>

<!-- FINAL CTA -->
<section class="fcta wrap">
  <div class="tag" style="margin-left:auto;margin-right:auto">Disponible maintenant</div>
  <div class="fcta-h">Ton prochain tilt<br><em>peut être le dernier.</em></div>
  <p class="fcta-sub">7 jours d'essai gratuit. Carte bancaire requise, débit automatique à J+7 sauf résiliation.</p>
  <a href="/signup" class="btn-pri" style="padding:17px 34px;font-size:15px">Commencer l'essai · 7 jours →</a>
  <p class="fcta-login"><a href="/login">Déjà un compte ? <span>Connexion →</span></a></p>
</section>

<footer>
  <div class="foot-in">
    <div class="foot-logo">Cald<span>ra</span></div>
    <div class="foot-links"><a href="/mentions-legales" class="foot-lk">CGU</a><a href="/confidentialite" class="foot-lk">Confidentialité</a><a href="/support" class="foot-lk">Support</a></div>
    <div class="foot-email">contact@getcaldra.com</div>
  </div>
</footer>

<script id="caldra-main-js">
(function(){
var DETS=${JSON.stringify(DETECTORS)};
function lvClass(l){return l===1?'dd-l1':l===2?'dd-l2':'dd-l3';}
function lvLabel(l){return l===1?'Niveau 1 · Info':l===2?'Niveau 2 · Alerte':'Niveau 3 · Critique';}
function renderDets(){
  var list=document.getElementById('det-list');if(!list)return;list.innerHTML='';
  DETS.forEach(function(d,i){
    var el=document.createElement('div');el.className='det-item'+(i===0?' act':'');
    el.innerHTML='<div class="di-n">'+d.n+'</div><span class="di-t">'+d.name+'</span>'+(d.s?'<span class="di-badge">Max</span>':'');
    el.addEventListener('click',function(){
      document.querySelectorAll('.det-item').forEach(function(x){x.classList.remove('act')});el.classList.add('act');
      var g=document.getElementById('dd-ghost');if(g)g.textContent=d.n;
      var sv=document.getElementById('dd-svg');if(sv)sv.innerHTML=d.icon;
      var h=document.getElementById('dd-h');if(h)h.textContent=d.name;
      var dd=document.getElementById('dd-d');if(dd)dd.textContent=d.desc;
      var lv=document.getElementById('dd-lv');if(lv){lv.textContent=lvLabel(d.lv);lv.className='dd-lv '+lvClass(d.lv);}
    });list.appendChild(el);
  });
}
renderDets();
var pd=[0,140,240],simStep=0,ch;
var SCN=[
  {time:'10:14',side:'EUR/USD Short',pnl:-180,a:null},
  {time:'10:17',side:'EUR/USD Long (re-entrée)',pnl:-95,a:{l:1,ti:'Re-entrée immédiate détectée',su:'Trade ouvert 3 min après la sortie. Prends une pause.'}},
  {time:'10:31',side:'EUR/USD Long (sizing ×2)',pnl:-210,a:{l:2,ti:'Revenge sizing + 3 pertes consécutives',su:'Taille doublée après série de pertes. Pause recommandée.'}},
  {time:'10:33',side:'EUR/USD Long',pnl:-320,a:{l:3,ti:'STOP · Ferme la plateforme.',su:'Drawdown critique + série + revenge sizing simultanés.'}}
];
function initChart(){
  var canvas=document.getElementById('pc');if(!canvas)return;
  var cx=canvas.getContext('2d');var ex=window.Chart&&Chart.getChart&&Chart.getChart(cx);if(ex)ex.destroy();
  ch=new Chart(cx,{type:'line',data:{labels:['Ouv.','09:32','09:51'],datasets:[{data:pd,borderColor:'#3ecf8e',borderWidth:2,pointRadius:3,pointBackgroundColor:'#3ecf8e',fill:true,backgroundColor:'rgba(62,207,142,.06)',tension:.3}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{grid:{color:'rgba(255,255,255,.04)'},ticks:{color:'rgba(255,255,255,.2)',font:{size:10}}},y:{grid:{color:'rgba(255,255,255,.04)'},ticks:{color:'rgba(255,255,255,.2)',font:{size:10},callback:function(v){return '€'+v}}}}}});
}
function sim(){
  if(simStep>=SCN.length){resetD();return;}
  var t=SCN[simStep],np=pd[pd.length-1]+t.pnl,col=np>=0?'#3ecf8e':'#e2503c';
  pd.push(np);ch.data.labels.push(t.time);
  ch.data.datasets[0].borderColor=col;ch.data.datasets[0].pointBackgroundColor=col;
  ch.data.datasets[0].backgroundColor=np>=0?'rgba(62,207,142,.06)':'rgba(226,80,60,.06)';
  ch.data.datasets[0].data=pd;ch.update();
  document.getElementById('dpnl').textContent=(np>=0?'+':'')+'€'+np;document.getElementById('dpnl').style.color=col;
  document.getElementById('dpc').textContent=t.time+' · '+t.side;
  var log=document.getElementById('tlog'),el=document.createElement('div');el.className='demo-tr';
  el.innerHTML='<span class="dtt">'+t.time+'</span><span class="dtins">'+t.side+'</span><span class="'+(t.pnl>=0?'dtp':'dtn')+'">'+(t.pnl>=0?'+':'')+'€'+t.pnl+'</span>';
  log.appendChild(el);
  if(t.a){
    var c=document.getElementById('ac');if(c.querySelector('div[style]'))c.innerHTML='';
    var ae=document.createElement('div');ae.className='ai al'+t.a.l;
    ae.innerHTML='<div class="adot dl'+t.a.l+'"></div><div class="ab"><div class="at">'+t.a.ti+'</div><div class="as">'+t.a.su+'</div></div><div class="abg bl'+t.a.l+'">Niv. '+t.a.l+'</div>';
    c.appendChild(ae);
  }
  simStep++;if(simStep>=SCN.length)document.getElementById('sb').textContent='↺ Recommencer';
}
window.sim=sim;
function resetD(){
  simStep=0;pd=[0,140,240];ch.data.labels=['Ouv.','09:32','09:51'];ch.data.datasets[0].data=pd;
  ch.data.datasets[0].borderColor='#3ecf8e';ch.data.datasets[0].pointBackgroundColor='#3ecf8e';ch.data.datasets[0].backgroundColor='rgba(62,207,142,.06)';ch.update();
  document.getElementById('dpnl').textContent='+€240';document.getElementById('dpnl').style.color='#3ecf8e';
  document.getElementById('dpc').textContent='Session en cours';
  document.getElementById('tlog').innerHTML='<div class="demo-tr"><span class="dtt">09:32</span><span class="dtins">EUR/USD Long</span><span class="dtp">+€140</span></div><div class="demo-tr"><span class="dtt">09:51</span><span class="dtins">EUR/USD Short</span><span class="dtp">+€100</span></div>';
  document.getElementById('ac').innerHTML='<div style="font-size:12px;color:var(--t3);padding:.5rem 0">Aucune alerte · session saine.</div>';
  document.getElementById('sb').textContent='→ Simuler le trade suivant';
}
if(window.Chart){initChart();}else{var s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.0/chart.umd.min.js';s.onload=initChart;document.head.appendChild(s);}
try{var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target);}});},{threshold:.12});document.querySelectorAll('[data-reveal]').forEach(function(el){io.observe(el);});}catch(e){document.querySelectorAll('[data-reveal]').forEach(function(el){el.classList.add('in');});}
(function(){var navEl=document.querySelector('nav');if(!navEl)return;var last=window.pageYOffset||0,tick=false;
function upd(){var y=window.pageYOffset||document.documentElement.scrollTop||0;
  if(y>last&&y>140){navEl.classList.add('nav-hidden');}else{navEl.classList.remove('nav-hidden');}
  last=y<0?0:y;tick=false;}
window.addEventListener('scroll',function(){if(!tick){window.requestAnimationFrame(upd);tick=true;}},{passive:true});})();
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
