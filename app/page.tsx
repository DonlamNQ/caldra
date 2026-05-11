'use client'

import { useEffect } from 'react'

const CSS = `
*{margin:0;padding:0;box-sizing:border-box;scroll-behavior:smooth}
:root{--v:#7c3aed;--va:rgba(124,58,237,.08);--vb:rgba(124,58,237,.2);--bg:#08080d;--s1:#0d0d1a;--s2:#111119;--b1:rgba(255,255,255,.06);--b2:rgba(255,255,255,.1);--tx:#f0ede8;--t2:rgba(240,237,232,.52);--t3:rgba(240,237,232,.22)}
body{font-family:'DM Sans',sans-serif;background:var(--bg);color:var(--tx);overflow-x:hidden;line-height:1}
.glow-top{position:fixed;top:-300px;left:50%;transform:translateX(-50%);width:900px;height:600px;background:radial-gradient(ellipse,rgba(124,58,237,.055) 0%,transparent 65%);pointer-events:none;z-index:0}

/* NAV */
nav{position:fixed;top:0;left:0;right:0;z-index:100;display:flex;align-items:center;justify-content:space-between;padding:1.25rem 3.5rem;border-bottom:.5px solid var(--b1);backdrop-filter:blur(20px);background:rgba(8,8,13,.92)}
.n-logo{font-size:13px;font-weight:500;letter-spacing:5px;text-transform:uppercase;color:#fff;text-decoration:none}.n-logo span{color:var(--v)}
.n-links{display:flex;gap:2.5rem}
.n-lk{font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--t2);text-decoration:none;transition:color .15s}.n-lk:hover{color:#fff}
.n-r{display:flex;gap:.625rem;align-items:center}
.n-login{font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:var(--t2);text-decoration:none;padding:7px 14px;border:.5px solid var(--b1);border-radius:3px;transition:all .15s}.n-login:hover{color:#fff;border-color:var(--b2)}

/* HERO */
.hero{display:grid;grid-template-columns:1fr 1fr;min-height:100vh;position:relative;z-index:1;border-bottom:.5px solid var(--b1)}
.hero-l{display:flex;flex-direction:column;justify-content:center;padding:9rem 3.5rem 5rem;border-right:.5px solid var(--b1)}
.hero-r{display:flex;align-items:center;justify-content:center;padding:9rem 3rem 5rem;gap:1.5rem;position:relative;overflow:hidden}
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

/* PHONE MOCKUP */
.phone-scene{position:relative;display:flex;flex-direction:column;align-items:center}
.phone-frame{width:230px;height:470px;border-radius:40px;background:#06060f;border:6px solid #16162a;box-shadow:0 0 0 1px rgba(255,255,255,.04),0 40px 80px rgba(0,0,0,.75),0 12px 30px rgba(0,0,0,.5);overflow:hidden;position:relative;flex-shrink:0}
.ph-notch-area{height:42px;background:#06060f;position:relative;display:flex;align-items:flex-start;justify-content:center}
.ph-notch{width:90px;height:26px;background:#16162a;border-radius:0 0 18px 18px}
.ph-status{position:absolute;top:9px;left:16px;right:16px;display:flex;justify-content:space-between;font-size:10px;font-weight:600;color:rgba(255,255,255,.7)}
.ph-date{text-align:center;padding:.5rem 0 .25rem;font-size:10px;color:rgba(255,255,255,.25);letter-spacing:.5px}
.ph-notifs{padding:0 8px;display:flex;flex-direction:column;gap:6px}
.ios-notif{background:rgba(14,14,28,.97);border-radius:14px;padding:11px 12px;display:flex;align-items:flex-start;gap:9px;border:.5px solid rgba(255,255,255,.07)}
.ios-notif-icon{width:34px;height:34px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0}
.ios-n-body{flex:1;min-width:0}
.ios-n-app{font-size:9px;font-weight:600;color:rgba(255,255,255,.35);text-transform:uppercase;letter-spacing:.5px;margin-bottom:2px}
.ios-n-title{font-size:12px;font-weight:600;color:#fff;margin-bottom:2px;line-height:1.25}
.ios-n-msg{font-size:11px;color:rgba(255,255,255,.4);line-height:1.4}
.ios-n-time{font-size:10px;color:rgba(255,255,255,.25);flex-shrink:0}
/* floating alert card next to phone */
.float-alert{position:absolute;right:-10px;top:60px;background:var(--s1);border:.5px solid rgba(124,58,237,.35);border-radius:10px;padding:.875rem 1rem;width:165px;box-shadow:0 16px 40px rgba(0,0,0,.5);animation:floatup 3s ease-in-out infinite}
@keyframes floatup{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
.fa-dot{width:6px;height:6px;border-radius:50%;background:#dc8200;display:inline-block;margin-right:6px;animation:blk 1.2s ease-in-out infinite}
@keyframes blk{0%,100%{opacity:1}50%{opacity:.3}}
.fa-title{font-size:11px;font-weight:600;color:#fff;margin-bottom:3px}
.fa-msg{font-size:10px;color:rgba(255,255,255,.4);line-height:1.4}

/* STATS BAR */
.stats-bar{display:grid;grid-template-columns:repeat(4,1fr);border-bottom:.5px solid var(--b1);position:relative;z-index:1}
.sb-item{padding:2rem 3.5rem;border-right:.5px solid var(--b1)}
.sb-item:last-child{border-right:none}
.sb-n{font-size:32px;font-weight:200;letter-spacing:-1.5px;color:#fff;line-height:1;margin-bottom:.4rem}
.sb-n span{color:var(--v)}
.sb-l{font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:var(--t3)}

/* PRODUCT PREVIEW (browser) */
.preview-sec{padding:5rem 3.5rem;border-bottom:.5px solid var(--b1);position:relative;z-index:1}
.preview-label{font-size:10px;letter-spacing:3px;text-transform:uppercase;color:var(--t3);text-align:center;margin-bottom:2rem;display:flex;align-items:center;justify-content:center;gap:.75rem}
.preview-label::before,.preview-label::after{content:'';flex:1;max-width:200px;height:.5px;background:var(--b1)}
.browser-wrap{position:relative}
.browser-glow{position:absolute;top:20px;left:50%;transform:translateX(-50%);width:60%;height:200px;background:radial-gradient(ellipse,rgba(124,58,237,.1) 0%,transparent 65%);pointer-events:none}
.browser{position:relative;z-index:1;border:.5px solid rgba(255,255,255,.1);border-radius:12px;overflow:hidden;box-shadow:0 40px 100px rgba(0,0,0,.65)}
.browser-bar{background:#06060c;border-bottom:.5px solid rgba(255,255,255,.07);padding:10px 14px;display:flex;align-items:center;gap:8px}
.bd-r{width:10px;height:10px;border-radius:50%;background:#ff5f57}
.bd-y{width:10px;height:10px;border-radius:50%;background:#ffbd2e}
.bd-g{width:10px;height:10px;border-radius:50%;background:#28c840}
.browser-url{flex:1;margin:0 1rem;background:rgba(255,255,255,.04);border:.5px solid rgba(255,255,255,.06);border-radius:4px;padding:4px 10px;font-size:10px;color:rgba(255,255,255,.3);letter-spacing:.3px;text-align:center}
/* dashboard inside browser */
.db-body{display:grid;grid-template-columns:170px 1fr;background:#08080d}
.db-side{background:#07070c;border-right:.5px solid rgba(255,255,255,.06);padding:1.25rem 0;display:flex;flex-direction:column;gap:2px}
.db-s-logo{padding:.25rem 1rem 1rem;font-size:9px;font-weight:500;letter-spacing:4px;text-transform:uppercase;color:#fff;border-bottom:.5px solid rgba(255,255,255,.06);margin-bottom:.5rem}.db-s-logo span{color:#7c3aed}
.db-s-sub{font-size:7px;letter-spacing:3px;text-transform:uppercase;color:rgba(255,255,255,.25);padding:.125rem 1rem .75rem}
.db-nav{display:flex;align-items:center;gap:8px;padding:.5rem 1rem;font-size:11px;color:rgba(255,255,255,.35);cursor:pointer;position:relative}
.db-nav.act{color:#fff;background:rgba(255,255,255,.04)}.db-nav.act::before{content:'';position:absolute;left:0;top:0;bottom:0;width:2px;background:#7c3aed}
.db-nav-ic{width:12px;height:12px;opacity:.5;flex-shrink:0}
.db-main{padding:1.25rem;display:flex;flex-direction:column;gap:.875rem}
.db-header{display:flex;align-items:center;justify-content:space-between;padding-bottom:.75rem;border-bottom:.5px solid rgba(255,255,255,.06)}
.db-h-title{font-size:8px;letter-spacing:5px;text-transform:uppercase;color:rgba(255,255,255,.4)}
.db-h-date{font-size:10px;color:rgba(255,255,255,.25)}
.db-session-bar{height:2px;background:rgba(255,255,255,.04);border-radius:1px;overflow:hidden}
.db-session-fill{height:100%;background:linear-gradient(90deg,#7c3aed,rgba(124,58,237,.3));width:62%;border-radius:1px}
.db-top{display:grid;grid-template-columns:auto 1fr 1fr;gap:.75rem;align-items:stretch}
.db-score-card{background:#0d0d1a;border:.5px solid rgba(255,255,255,.07);border-radius:10px;padding:.875rem;display:flex;align-items:center;gap:.875rem}
.db-score-num{font-size:26px;font-weight:200;letter-spacing:-2px;color:#e2e8f0;line-height:1}
.db-score-lbl{font-size:8px;letter-spacing:1px;text-transform:uppercase;color:rgba(255,255,255,.3);margin-top:2px}
.db-kpi{background:#0d0d1a;border:.5px solid rgba(255,255,255,.07);border-radius:10px;padding:.875rem}
.db-kpi-lbl{font-size:8px;letter-spacing:1px;text-transform:uppercase;color:rgba(255,255,255,.3);margin-bottom:.375rem}
.db-kpi-val{font-size:22px;font-weight:200;letter-spacing:-1px;color:#e2e8f0;line-height:1}
.db-kpi-sub{font-size:9px;color:rgba(255,255,255,.25);margin-top:2px}
.db-bottom{display:grid;grid-template-columns:1fr 1fr;gap:.75rem}
.db-card{background:#0d0d1a;border:.5px solid rgba(255,255,255,.07);border-radius:10px;padding:.875rem}
.db-card-lbl{font-size:8px;letter-spacing:1px;text-transform:uppercase;color:rgba(255,255,255,.3);margin-bottom:.625rem}
.db-al{display:flex;align-items:flex-start;gap:7px;padding:.4rem .5rem;border-radius:5px;margin-bottom:4px}
.db-al-1{background:rgba(255,200,0,.05);border:.5px solid rgba(255,200,0,.12)}
.db-al-2{background:rgba(220,130,0,.07);border:.5px solid rgba(220,130,0,.18)}
.db-al-dot{width:5px;height:5px;border-radius:50%;flex-shrink:0;margin-top:2px}
.db-dot-1{background:#ffc800}.db-dot-2{background:#dc8200}
.db-al-t{font-size:10px;color:rgba(255,255,255,.7);line-height:1.35}
.db-al-s{font-size:9px;color:rgba(255,255,255,.28);margin-top:1px}
.db-tr{display:flex;justify-content:space-between;align-items:center;padding:.3rem 0;border-bottom:.5px solid rgba(255,255,255,.04);font-size:10px}.db-tr:last-child{border-bottom:none}
.db-tr-t{color:rgba(255,255,255,.3)}.db-tr-n{color:rgba(255,255,255,.55)}.db-tr-p{color:#3cc87a;font-weight:500}.db-tr-n2{color:#e05050;font-weight:500}

/* SPLIT FEATURE (notifications) */
.split-sec{padding:6rem 3.5rem;border-bottom:.5px solid var(--b1);position:relative;z-index:1}
.split-grid{display:grid;grid-template-columns:1fr 1fr;gap:5rem;align-items:center;max-width:1080px;margin:0 auto}
.notif-stack{position:relative;display:flex;flex-direction:column;gap:.75rem;padding:1.5rem}
.notif-card{background:var(--s1);border:.5px solid var(--b2);border-radius:12px;padding:1rem 1.25rem;display:flex;align-items:flex-start;gap:12px;transition:transform .2s}
.notif-card:hover{transform:translateX(4px)}
.nc-icon{width:38px;height:38px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0}
.nc-body{flex:1}
.nc-app{font-size:9px;font-weight:600;color:rgba(255,255,255,.35);text-transform:uppercase;letter-spacing:.5px;margin-bottom:3px}
.nc-title{font-size:13px;font-weight:600;color:#fff;margin-bottom:3px;line-height:1.3}
.nc-msg{font-size:12px;color:rgba(255,255,255,.4);line-height:1.45}
.nc-time{font-size:10px;color:rgba(255,255,255,.25);flex-shrink:0;white-space:nowrap}
.nc-l2{border-color:rgba(220,130,0,.25);background:rgba(220,130,0,.04)}
.nc-l3{border-color:rgba(220,50,30,.3);background:rgba(220,50,30,.05)}
.notif-device{display:flex;align-items:center;gap:6px;margin-top:.5rem;padding:0 .5rem}
.nd-dot{width:5px;height:5px;border-radius:50%;background:#3cc87a}
.nd-txt{font-size:10px;color:var(--t3);letter-spacing:.5px}

/* SECTION GENERIC */
.sec{padding:6rem 3.5rem;position:relative;z-index:1;border-bottom:.5px solid var(--b1)}
.sec-in{max-width:1080px;margin:0 auto}
.sec-tag{font-size:10px;letter-spacing:3px;text-transform:uppercase;color:var(--v);display:flex;align-items:center;gap:1rem;margin-bottom:3rem}
.sec-tag::after{content:'';flex:1;max-width:260px;height:.5px;background:var(--b1)}
.sec-h{font-size:clamp(1.9rem,3.5vw,3rem);font-weight:200;letter-spacing:-1.5px;color:#fff;line-height:1.1;margin-bottom:1.25rem}
.sec-d{font-size:15px;color:var(--t2);line-height:1.8;max-width:500px;font-weight:300}

/* DETECTORS */
.det-wrap{display:grid;grid-template-columns:1fr 1fr;gap:4rem;margin-top:3.5rem;align-items:start}
.det-layout{border:.5px solid var(--b1);border-radius:12px;overflow:hidden}
.det-item{display:flex;align-items:center;gap:.875rem;padding:1rem 1.25rem;border-bottom:.5px solid var(--b1);cursor:pointer;transition:background .15s;user-select:none}
.det-item:last-child{border-bottom:none}
.det-item:hover{background:rgba(255,255,255,.02)}
.det-item.act{background:var(--s1)}.det-item.act .di-n{color:var(--v);border-color:var(--vb)}
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

/* HOW */
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
.testi-q{font-size:13px;color:rgba(255,255,255,.42);line-height:1.65;margin-bottom:1.25rem;font-style:italic}.testi-q strong{color:rgba(255,255,255,.7);font-style:normal}
.testi-au{display:flex;align-items:center;gap:10px}
.testi-av{width:32px;height:32px;border-radius:50%;background:var(--s2);border:.5px solid var(--b2);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:500;color:rgba(255,255,255,.35)}
.testi-name{font-size:13px;font-weight:500;color:rgba(255,255,255,.65)}.testi-role{font-size:11px;color:var(--t3)}

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
.plan-btn-sec{background:transparent;border:.5px solid var(--b2)!important;color:rgba(255,255,255,.5)}.plan-btn-sec:hover{border-color:rgba(255,255,255,.25)!important;color:#fff}
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

/* FOOTER */
footer{padding:1.75rem 3.5rem;display:flex;justify-content:space-between;align-items:center;border-top:.5px solid var(--b1);position:relative;z-index:1}
.foot-logo{font-size:12px;letter-spacing:4px;text-transform:uppercase;color:rgba(255,255,255,.15);font-weight:500}.foot-logo span{color:rgba(124,58,237,.3)}
.foot-links{display:flex;gap:2rem}
.foot-lk{font-size:11px;color:var(--t3);text-decoration:none;letter-spacing:.5px;transition:color .15s}.foot-lk:hover{color:var(--t2)}
.foot-email{font-size:11px;color:var(--t3)}

/* RESPONSIVE */
@media(max-width:1024px){
  .hero{grid-template-columns:1fr}.hero-r{display:none}
  .det-wrap{grid-template-columns:1fr}.det-detail{display:none}
  .split-grid{grid-template-columns:1fr}
  .steps-grid{grid-template-columns:1fr}.step-c:not(:last-child){border-right:none;border-bottom:.5px solid var(--b1)}
  .pricing-grid{grid-template-columns:1fr}
  .testi-grid{grid-template-columns:1fr}
  .stats-bar{grid-template-columns:1fr 1fr}.sb-item:nth-child(2){border-right:none}.sb-item:nth-child(3){border-top:.5px solid var(--b1)}.sb-item:nth-child(4){border-right:none;border-top:.5px solid var(--b1)}
  nav{padding:1.25rem 1.5rem}.n-links{display:none}
  .sec,.split-sec,.story-sec,.cta-sec,.preview-sec{padding:4rem 1.5rem}
  .hero-l{padding:8rem 1.5rem 4rem}
  footer{padding:1.5rem;flex-direction:column;gap:.875rem;text-align:center}
  .demo-body{grid-template-columns:1fr}
  .db-body{grid-template-columns:1fr}.db-side{display:none}
}
@media(max-width:600px){
  .wf,.cta-wf{max-width:100%}
  .stats-bar{grid-template-columns:1fr 1fr}
}
`

const DETECTORS = [
  {n:'01',name:'Revenge sizing',icon:'<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>',desc:'La taille de position augmente après une perte — chemin le plus court pour exploser une journée. Caldra compare chaque nouvelle ouverture aux positions précédentes.',lv:2,s:false},
  {n:'02',name:'Re-entrée immédiate',icon:'<polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.4"/>',desc:"Reprendre un trade moins de 2 minutes après la sortie. L'impulsion, pas l'analyse. Caldra mesure l'intervalle exact entre exit et nouvel entry.",lv:1,s:false},
  {n:'03',name:'Série de pertes',icon:'<line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/>',desc:"3 pertes consécutives — seuil où l'émotion prend le dessus. Configurable selon ton historique.",lv:2,s:false},
  {n:'04',name:'Alerte drawdown',icon:'<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',desc:'Perte journalière approchant ou dépassant ta limite. Deux niveaux : préventive à 80%, stop forcé à 100%. Capital configurable.',lv:3,s:false},
  {n:'05',name:'Hors session',icon:'<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',desc:'Trade en dehors de tes horaires définis. Fatigue, ennui, ou opportunisme — rarement de bons états pour entrer en marché.',lv:1,s:false},
  {n:'06',name:'Suractivité',icon:'<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>',desc:'Nombre de trades dépassant ta limite de session. Plus tu trades, plus tu trades souvent pire.',lv:2,s:false},
  {n:'07',name:'Trade pendant news',icon:'<path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/>',desc:"Entrée dans les 5 minutes d'un événement macro. News + position ouverte = casino. Caldra croise les timestamps avec le calendrier économique.",lv:2,s:true},
  {n:'08',name:'Stop non respecté',icon:'<line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/>',desc:"Position tenue au-delà de ton stop habituel. L'espoir n'est pas une stratégie.",lv:2,s:false},
  {n:'09',name:'Risk dépassé',icon:'<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>',desc:'Sizing dépassant ton risk par trade défini. Tes règles existent pour une raison.',lv:2,s:false},
]

const HTML = `
<div class="glow-top"></div>
<nav>
  <a href="#" class="n-logo" style="text-decoration:none">Cald<span>ra</span></a>
  <div class="n-links">
    <a class="n-lk" href="#dashboard">Dashboard</a>
    <a class="n-lk" href="#detecteurs">Détecteurs</a>
    <a class="n-lk" href="#demo">Démo</a>
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
    <div class="eyebrow"><div class="eydot"></div>Intelligence comportementale &mdash; Temps réel</div>
    <h1>Tu ne vois pas<br>quand tu dérailles.<br><em>Lui si.</em></h1>
    <p class="hero-sub">Caldra analyse chaque trade et détecte les comportements qui détruisent les sessions &mdash; avant que le tilt, le revenge trading ou l'impulsion ne fasse les dégâts.</p>
    <div class="wf">
      <input type="email" id="wf-email" placeholder="ton@email.com" />
      <button class="wf-btn" onclick="joinWaitlist('wf-email','wf-sm')">Rejoindre →</button>
    </div>
    <div class="wf-sm" id="wf-sm">Place réservée. On te contacte à l'ouverture.</div>
    <div class="hero-fn">
      <span class="hfn">Lancement 13/05</span><div class="hfs"></div>
      <span class="hfn">14 jours d'essai</span><div class="hfs"></div>
      <span class="hfn">Sans carte</span>
    </div>
  </div>
  <div class="hero-r">
    <!-- Phone mockup -->
    <div class="phone-scene">
      <div class="phone-frame">
        <div class="ph-notch-area">
          <div class="ph-notch"></div>
          <div class="ph-status"><span>9:41</span><span>●●● 5G ⬡</span></div>
        </div>
        <div class="ph-date">LUNDI 12 MAI 2026</div>
        <div class="ph-notifs">
          <div class="ios-notif" style="border-color:rgba(220,50,30,.25);background:rgba(220,50,30,.05)">
            <div class="ios-notif-icon" style="background:rgba(220,50,30,.12)">🔴</div>
            <div class="ios-n-body">
              <div class="ios-n-app">Caldra Session</div>
              <div class="ios-n-title">STOP — Drawdown max atteint</div>
              <div class="ios-n-msg">PnL session : −€420. Ferme la plateforme.</div>
            </div>
            <div class="ios-n-time">à l'instant</div>
          </div>
          <div class="ios-notif" style="border-color:rgba(220,130,0,.2);background:rgba(220,130,0,.04)">
            <div class="ios-notif-icon" style="background:rgba(220,130,0,.1)">⚠️</div>
            <div class="ios-n-body">
              <div class="ios-n-app">Caldra Session</div>
              <div class="ios-n-title">Revenge sizing détecté</div>
              <div class="ios-n-msg">Sizing ×2.1 après une perte de −€140</div>
            </div>
            <div class="ios-n-time">3 min</div>
          </div>
          <div class="ios-notif">
            <div class="ios-notif-icon" style="background:rgba(255,200,0,.1)">⚡</div>
            <div class="ios-n-body">
              <div class="ios-n-app">Caldra Session</div>
              <div class="ios-n-title">Re-entrée rapide</div>
              <div class="ios-n-msg">87s après la dernière sortie. Délai min : 120s.</div>
            </div>
            <div class="ios-n-time">11 min</div>
          </div>
        </div>
      </div>
      <!-- floating card -->
      <div class="float-alert" style="right:-20px;top:55px">
        <div style="font-size:9px;color:var(--t3);letter-spacing:.5px;text-transform:uppercase;margin-bottom:5px;display:flex;align-items:center;gap:5px"><span class="fa-dot"></span>Desktop</div>
        <div class="fa-title">⚠️ Revenge sizing</div>
        <div class="fa-msg">Sizing ×2.1 — 1.4 lots vs 0.67</div>
      </div>
    </div>
  </div>
</div>

<!-- STATS BAR -->
<div class="stats-bar">
  <div class="sb-item"><div class="sb-n">9<span>+</span></div><div class="sb-l">Comportements détectés</div></div>
  <div class="sb-item"><div class="sb-n">3</div><div class="sb-l">Niveaux d'alerte</div></div>
  <div class="sb-item"><div class="sb-n"><span>&lt;</span>1s</div><div class="sb-l">Temps de détection</div></div>
  <div class="sb-item"><div class="sb-n">100%</div><div class="sb-l">Automatique</div></div>
</div>

<!-- DASHBOARD PREVIEW -->
<div class="preview-sec" id="dashboard">
  <div class="preview-label">Le dashboard en temps réel</div>
  <div class="browser-wrap">
    <div class="browser-glow"></div>
    <div class="browser">
      <div class="browser-bar">
        <div class="bd-r"></div><div class="bd-y"></div><div class="bd-g"></div>
        <div class="browser-url">app.getcaldra.com/dashboard</div>
      </div>
      <div class="db-body">
        <!-- Sidebar -->
        <div class="db-side">
          <div class="db-s-logo">Cald<span>ra</span></div>
          <div class="db-s-sub">Session</div>
          <div class="db-nav act">
            <svg class="db-nav-ic" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="1" y="1" width="6" height="6" rx="1"/><rect x="9" y="1" width="6" height="6" rx="1"/><rect x="1" y="9" width="6" height="6" rx="1"/><rect x="9" y="9" width="6" height="6" rx="1"/></svg>
            Dashboard
          </div>
          <div class="db-nav">
            <svg class="db-nav-ic" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="8" cy="8" r="2"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2"/></svg>
            Alertes
          </div>
          <div class="db-nav">
            <svg class="db-nav-ic" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="2,12 5,8 8,10 11,5 14,7"/></svg>
            Analytics
          </div>
          <div class="db-nav" style="margin-top:auto">
            <svg class="db-nav-ic" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="8" cy="6" r="2.5"/><path d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6"/></svg>
            Règles
          </div>
          <div class="db-nav">
            <svg class="db-nav-ic" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="1" y="3" width="14" height="10" rx="1.5"/><path d="M1 6h14"/></svg>
            API
          </div>
        </div>
        <!-- Main -->
        <div class="db-main">
          <div class="db-header">
            <div class="db-h-title">CALDRA &nbsp;SESSION</div>
            <div class="db-h-date">Lun 12 mai 2026 · 10:33</div>
          </div>
          <div class="db-session-bar"><div class="db-session-fill"></div></div>
          <div class="db-top">
            <!-- Score ring -->
            <div class="db-score-card">
              <svg width="56" height="56" viewBox="0 0 56 56">
                <circle cx="28" cy="28" r="22" fill="none" stroke="rgba(255,255,255,.05)" stroke-width="5"/>
                <circle cx="28" cy="28" r="22" fill="none" stroke="#dc8200" stroke-width="5"
                  stroke-dasharray="138" stroke-dashoffset="55" stroke-linecap="round"
                  style="transform:rotate(-90deg);transform-origin:28px 28px"/>
              </svg>
              <div class="db-score-text">
                <div class="db-score-num" style="color:#dc8200">62</div>
                <div class="db-score-lbl">Score / 100</div>
              </div>
            </div>
            <!-- PnL -->
            <div class="db-kpi">
              <div class="db-kpi-lbl">P&amp;L session</div>
              <div class="db-kpi-val" style="color:#e2e8f0">−€180</div>
              <div class="db-kpi-sub">en cours</div>
            </div>
            <!-- Win rate -->
            <div class="db-kpi">
              <div class="db-kpi-lbl">Win rate</div>
              <div class="db-kpi-val" style="color:#e2e8f0">43%</div>
              <div class="db-kpi-sub">3W · 4L</div>
            </div>
          </div>
          <div class="db-bottom">
            <!-- Alerts -->
            <div class="db-card">
              <div class="db-card-lbl">Alertes Caldra</div>
              <div class="db-al db-al-2">
                <div class="db-al-dot db-dot-2"></div>
                <div><div class="db-al-t">Revenge sizing détecté</div><div class="db-al-s">Sizing ×2.1 après −€140</div></div>
              </div>
              <div class="db-al db-al-1">
                <div class="db-al-dot db-dot-1"></div>
                <div><div class="db-al-t">Re-entrée immédiate</div><div class="db-al-s">87s après la sortie</div></div>
              </div>
              <div class="db-al db-al-2">
                <div class="db-al-dot db-dot-2"></div>
                <div><div class="db-al-t">3 pertes consécutives</div><div class="db-al-s">Pause recommandée</div></div>
              </div>
            </div>
            <!-- Trades -->
            <div class="db-card">
              <div class="db-card-lbl">Trades du jour</div>
              <div class="db-tr"><span class="db-tr-t">09:32</span><span class="db-tr-n">NQ Long</span><span class="db-tr-p">+€140</span></div>
              <div class="db-tr"><span class="db-tr-t">09:51</span><span class="db-tr-n">NQ Short</span><span class="db-tr-p">+€100</span></div>
              <div class="db-tr"><span class="db-tr-t">10:14</span><span class="db-tr-n">NQ Short</span><span class="db-tr-n2">−€180</span></div>
              <div class="db-tr"><span class="db-tr-t">10:17</span><span class="db-tr-n">NQ Long</span><span class="db-tr-n2">−€95</span></div>
              <div class="db-tr"><span class="db-tr-t">10:31</span><span class="db-tr-n">NQ Long ×2</span><span class="db-tr-n2">−€210</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- SPLIT: NOTIFICATIONS -->
<div class="split-sec">
  <div class="split-grid">
    <div>
      <div class="sec-tag" style="max-width:none">Alertes en temps réel</div>
      <div class="sec-h">Push. Desktop.<br>En moins d'une seconde.</div>
      <p class="sec-d" style="margin-top:1.25rem">Dès qu'un pattern dangereux est détecté, tu reçois une notification push sur ton téléphone ET une alerte desktop — sur iOS, Android et navigateur. Aucune action requise de ta part.</p>
      <div style="margin-top:2rem;display:flex;flex-direction:column;gap:.75rem">
        <div style="display:flex;align-items:center;gap:.875rem">
          <div style="width:32px;height:32px;border-radius:8px;background:rgba(60,200,122,.08);border:.5px solid rgba(60,200,122,.2);display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0">📱</div>
          <div style="font-size:13px;color:var(--t2)">Push iOS &amp; Android via Web Push (VAPID)</div>
        </div>
        <div style="display:flex;align-items:center;gap:.875rem">
          <div style="width:32px;height:32px;border-radius:8px;background:rgba(60,200,122,.08);border:.5px solid rgba(60,200,122,.2);display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0">💻</div>
          <div style="font-size:13px;color:var(--t2)">Notification desktop (Chrome, Safari, Firefox)</div>
        </div>
        <div style="display:flex;align-items:center;gap:.875rem">
          <div style="width:32px;height:32px;border-radius:8px;background:rgba(60,200,122,.08);border:.5px solid rgba(60,200,122,.2);display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0">💬</div>
          <div style="font-size:13px;color:var(--t2)">Webhook Slack / Discord configurable</div>
        </div>
      </div>
    </div>
    <div class="notif-stack">
      <div class="notif-card nc-l3">
        <div class="nc-icon" style="background:rgba(220,50,30,.12)">🔴</div>
        <div class="nc-body">
          <div class="nc-app">Caldra Session</div>
          <div class="nc-title">STOP — Drawdown max atteint</div>
          <div class="nc-msg">PnL session : −€420 (−4.2%). Ferme la plateforme maintenant.</div>
        </div>
        <div class="nc-time">maintenant</div>
      </div>
      <div class="notif-card nc-l2">
        <div class="nc-icon" style="background:rgba(220,130,0,.1)">⚠️</div>
        <div class="nc-body">
          <div class="nc-app">Caldra Session</div>
          <div class="nc-title">Revenge sizing détecté</div>
          <div class="nc-msg">Sizing ×2.1 après une perte — 1.4 lots vs 0.67 lots</div>
        </div>
        <div class="nc-time">3 min</div>
      </div>
      <div class="notif-card">
        <div class="nc-icon" style="background:rgba(255,200,0,.08)">⚡</div>
        <div class="nc-body">
          <div class="nc-app">Caldra Session</div>
          <div class="nc-title">Re-entrée rapide</div>
          <div class="nc-msg">87 secondes après la clôture. Délai minimum : 120s.</div>
        </div>
        <div class="nc-time">11 min</div>
      </div>
      <div class="notif-device">
        <div class="nd-dot"></div>
        <span class="nd-txt">Push actif · iOS 16.4+ · Android · Desktop</span>
      </div>
    </div>
  </div>
</div>

<!-- DÉTECTEURS -->
<div class="sec" id="detecteurs">
  <div class="sec-in">
    <div class="sec-tag">Ce qu'on détecte</div>
    <div class="det-wrap">
      <div>
        <div class="sec-h">Ton empreinte<br>comportementale, en direct.</div>
        <p class="sec-d" style="margin-bottom:2rem">Chaque trader a des patterns quand il commence à dérailler. Caldra lit les tiens — et te le dit avant que ça coûte.</p>
        <div class="det-layout" id="det-list"></div>
      </div>
      <div class="det-detail" id="det-detail">
        <div class="dd-ghost" id="dd-ghost">01</div>
        <div class="dd-ic"><svg viewBox="0 0 24 24" id="dd-svg"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg></div>
        <div class="dd-h" id="dd-h">Revenge sizing</div>
        <div class="dd-d" id="dd-d">La taille de position augmente après une perte — chemin le plus court pour exploser une journée. Caldra compare chaque nouvelle ouverture aux positions précédentes.</div>
        <div class="dd-lv dd-l2" id="dd-lv">Niveau 2 — Alerte orange</div>
      </div>
    </div>
  </div>
</div>

<!-- DEMO -->
<div class="sec" id="demo">
  <div class="sec-in">
    <div class="sec-tag">Démo interactive</div>
    <div class="sec-h">Vois Caldra en action<br>sur une vraie session.</div>
    <p class="sec-d">Simule un enchaînement de trades et observe comment Caldra détecte les patterns en temps réel.</p>
    <div class="demo-wrap">
      <div class="demo-tb">
        <div class="bd-r"></div><div class="bd-y"></div><div class="bd-g"></div>
        <div class="demo-ttl">Caldra — Session NQ Futures — 30/03/2026</div>
      </div>
      <div class="demo-body">
        <div class="demo-lp">
          <div class="demo-llab">P&amp;L de session</div>
          <div class="demo-pnl"><div class="demo-pv" id="dpnl" style="color:#3cc87a">+€240</div><div class="demo-pc" id="dpc">Session en cours</div></div>
          <div class="demo-chart"><canvas id="pc"></canvas></div>
          <div class="demo-tlab">Derniers trades</div>
          <div id="tlog">
            <div class="demo-tr"><span class="dtt">09:32</span><span class="dtins">NQ Long</span><span class="dtp">+€140</span></div>
            <div class="demo-tr"><span class="dtt">09:51</span><span class="dtins">NQ Short</span><span class="dtp">+€100</span></div>
          </div>
        </div>
        <div class="demo-rp">
          <div class="demo-rlab">Alertes Caldra</div>
          <div class="demo-als" id="ac"><div style="font-size:12px;color:var(--t3);padding:.5rem 0">Aucune alerte — session saine.</div></div>
          <button class="demo-sbtn" id="sb" onclick="sim()">→ Simuler le trade suivant</button>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- COMMENT -->
<div class="sec" id="comment">
  <div class="sec-in">
    <div class="sec-tag">Comment ça marche</div>
    <div class="sec-h">Configure une fois.<br>Il veille toujours.</div>
    <p class="sec-d">Aucune saisie manuelle. Caldra se connecte à ta plateforme et fait le reste.</p>
    <div class="steps-grid">
      <div class="step-c">
        <div class="step-n">01 — Connecte</div>
        <div class="step-h">Ta plateforme de trading</div>
        <div class="step-d">Connexion directe via API. Tes trades remontent automatiquement — rien à saisir manuellement.</div>
        <div class="step-tags">
          <span class="stag-pill"><span class="stag-dot"></span>cTrader</span>
          <span class="stag-pill"><span class="stag-dot"></span>MT5 EA</span>
          <span class="stag-pill" style="opacity:.4">+ à venir</span>
        </div>
      </div>
      <div class="step-c">
        <div class="step-n">02 — Configure</div>
        <div class="step-h">Tes règles et limites</div>
        <div class="step-d">Horaires de session, risk par trade, drawdown max. Tes règles, tes standards — pas des valeurs génériques imposées.</div>
      </div>
      <div class="step-c">
        <div class="step-n">03 — Trade</div>
        <div class="step-h">Alerte immédiate si ça déraille</div>
        <div class="step-d">Dès qu'un pattern dangereux est détecté, tu reçois une notification push + desktop en moins d'une seconde.</div>
      </div>
    </div>
  </div>
</div>

<!-- AVIS -->
<div class="sec" id="avis">
  <div class="sec-in">
    <div class="sec-tag">Ce qu'ils disent</div>
    <div class="sec-h">Testé par des vrais traders.</div>
    <p class="sec-d">Bêta fermée — retours des premiers utilisateurs sur leurs sessions réelles.</p>
    <div class="testi-grid">
      <div class="testi-c"><div class="testi-stars">★★★★★</div><p class="testi-q">« J'ai claqué trois semaines de gains en une après-midi à cause du tilt. <strong>Ce genre d'outil j'en avais besoin depuis longtemps.</strong> »</p><div class="testi-au"><div class="testi-av">TM</div><div><div class="testi-name">Thomas M.</div><div class="testi-role">Trader Futures · 3 ans</div></div></div></div>
      <div class="testi-c"><div class="testi-stars">★★★★★</div><p class="testi-q">« <strong>Je savais même pas que je faisais du revenge sizing.</strong> Ça se voyait pas de l'intérieur. Hâte que ça sorte. »</p><div class="testi-au"><div class="testi-av">KF</div><div><div class="testi-name">KrazoliFX</div><div class="testi-role">Trader CFD/Forex · Paris</div></div></div></div>
      <div class="testi-c"><div class="testi-stars">★★★★☆</div><p class="testi-q">« J'utilise TradeZella mais c'est toujours après coup. <strong>Avec Caldra l'alerte est arrivée pendant ma session. C'est pas du tout la même chose.</strong> »</p><div class="testi-au"><div class="testi-av">KL</div><div><div class="testi-name">Kevin L.</div><div class="testi-role">Trader Futures · Lyon</div></div></div></div>
    </div>
  </div>
</div>

<!-- TARIFS -->
<div class="sec" id="tarifs">
  <div class="sec-in">
    <div class="sec-tag">Tarifs</div>
    <div class="sec-h" style="text-align:center">Simple.<br>Rentabilisé au premier trade évité.</div>
    <div class="pricing-grid">
      <div class="plan plan-pro">
        <div class="plan-shine plan-sw"></div>
        <div class="plan-lab">Pro</div>
        <div class="plan-price"><sup>€</sup>19<sub>/mois</sub></div>
        <div class="plan-note">14 jours gratuits · Sans carte requise</div>
        <div class="plan-tag">Surveillance comportementale complète. Alertes immédiates dès qu'un pattern dangereux est détecté.</div>
        <ul class="plan-features">
          <li><div class="pfc pfc-d"><svg viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3"/></svg></div>8 détections comportementales</li>
          <li><div class="pfc pfc-d"><svg viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3"/></svg></div>Alertes temps réel (push + desktop)</li>
          <li><div class="pfc pfc-d"><svg viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3"/></svg></div>Dashboard comportemental</li>
          <li><div class="pfc pfc-d"><svg viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3"/></svg></div>Connexion cTrader &amp; MT5</li>
          <li><div class="pfc pfc-d"><svg viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3"/></svg></div>Analytics 30 jours</li>
          <li><div class="pfc pfc-d"><svg viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3"/></svg></div>Seuils configurables</li>
        </ul>
        <button class="plan-btn plan-btn-sec" onclick="joinWaitlistPlan()">Rejoindre la liste →</button>
      </div>
      <div class="plan plan-sent">
        <div class="plan-shine plan-sv"></div>
        <div class="plan-lab plan-lab-v">Sentinel</div>
        <div class="plan-price"><sup>€</sup>39<sub>/mois</sub></div>
        <div class="plan-note">14 jours gratuits · Sans carte requise</div>
        <div class="plan-tag">Tout le plan Pro, augmenté d'un coach IA actif. Analyse, recommandations et debriefing à chaque session.</div>
        <ul class="plan-features">
          <li><div class="pfc pfc-d"><svg viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3"/></svg></div><span style="color:rgba(240,237,232,.3)">Tout le plan Pro, plus :</span></li>
          <li class="plan-hi"><div class="pfc pfc-v"><svg viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3"/></svg></div><strong>9e détection : Trade pendant les news</strong></li>
          <li class="plan-hi"><div class="pfc pfc-v"><svg viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3"/></svg></div><strong>Coach IA pendant la session</strong></li>
          <li class="plan-hi"><div class="pfc pfc-v"><svg viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3"/></svg></div><strong>Debriefing automatique post-session</strong></li>
          <li class="plan-hi"><div class="pfc pfc-v"><svg viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3"/></svg></div><strong>Analyse des patterns récurrents</strong></li>
          <li class="plan-hi"><div class="pfc pfc-v"><svg viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3"/></svg></div><strong>Analytics 180 jours</strong></li>
        </ul>
        <button class="plan-btn plan-btn-pri" onclick="joinWaitlistPlan()">Rejoindre la liste →</button>
      </div>
    </div>
    <p style="text-align:center;margin-top:2rem;font-size:13px;color:var(--t3);font-style:italic">14 jours d'essai gratuit · Pas de carte · Annulable à tout moment</p>
  </div>
</div>

<!-- HISTOIRE -->
<div class="story-sec" id="histoire">
  <div class="sec-in">
    <div class="sec-tag">L'histoire</div>
    <div class="sec-h">Une conviction.<br>Un outil.</div>
    <div class="story-in" style="margin-top:2.5rem">
      <p class="story-p">Caldra Session est né d'une certitude simple : la psychologie de trader ne s'apprend pas. Elle se construit. Lentement. Sous les graphiques. Dans la pression des positions ouvertes, dans le silence des pertes encaissées, dans les décisions prises à l'instinct quand la raison n'a plus la main.</p>
      <p class="story-p">On peut lire. On peut comprendre. On peut mémoriser chaque biais cognitif. Et se retrouver exactement dans le même état, la prochaine session, face au même chart, à refaire exactement la même chose.</p>
      <p class="story-p">Caldra Session n'est pas là pour changer la nature humaine. Il est là pour ce moment précis — celui où un signal extérieur change tout.</p>
      <div class="story-end">La discipline ne se force pas. <em>Elle se protège.</em></div>
    </div>
  </div>
</div>

<!-- CTA -->
<div class="cta-sec">
  <div style="max-width:640px;margin:0 auto">
    <div class="sec-tag" style="justify-content:center;max-width:none">Disponible le 13 mai 2026</div>
    <div class="cta-h">Ton prochain tilt<br><em>peut être le dernier.</em></div>
    <p class="cta-sub">14 jours d'essai gratuit. Pas de carte requise.</p>
    <div class="cta-wf">
      <input type="email" id="cta-email" placeholder="ton@email.com" style="flex:1;padding:11px 14px;background:transparent;border:none;color:#fff;font-size:13px;font-family:'DM Sans',sans-serif;outline:none" />
      <button class="wf-btn" onclick="joinWaitlist('cta-email','cta-sm')">Rejoindre →</button>
    </div>
    <div class="wf-sm" id="cta-sm" style="max-width:380px;margin:6px auto 0">Place réservée. On te contacte à l'ouverture.</div>
    <p style="margin-top:1.25rem;font-size:12px;color:var(--t3)"><a href="/login" style="color:var(--t3);text-decoration:none">Déjà un compte ? <span style="color:var(--v)">Connexion →</span></a></p>
  </div>
</div>

<footer>
  <div class="foot-logo">Cald<span>ra</span></div>
  <div class="foot-links">
    <a href="/mentions-legales" class="foot-lk">CGU</a>
    <a href="/confidentialite" class="foot-lk">Confidentialité</a>
    <a href="/support" class="foot-lk">Support</a>
  </div>
  <div class="foot-email">contact@getcaldra.com</div>
</footer>

<script id="caldra-main-js">
(function(){
var DETS=${JSON.stringify(DETECTORS)};

async function joinWaitlist(inputId,smId){
  var email=document.getElementById(inputId).value.trim();
  if(!email||!email.includes('@'))return;
  try{await fetch('/api/waitlist',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email})});}catch(e){}
  document.getElementById(smId).style.display='block';
  document.getElementById(inputId).value='';
}
window.joinWaitlist=joinWaitlist;
window.joinWaitlistPlan=function(){
  var el=document.getElementById('wf-email');
  if(el){el.focus();el.scrollIntoView({behavior:'smooth',block:'center'});}
};

function lvClass(l){return l===1?'dd-l1':l===2?'dd-l2':'dd-l3';}
function lvLabel(l){return l===1?'Niveau 1 — Info':l===2?'Niveau 2 — Alerte':'Niveau 3 — Critique';}

function renderDets(){
  var list=document.getElementById('det-list');if(!list)return;
  list.innerHTML='';
  DETS.forEach(function(d,i){
    var el=document.createElement('div');
    el.className='det-item'+(i===0?' act':'');
    el.innerHTML='<div class="di-n">'+d.n+'</div><span class="di-t">'+d.name+'</span>'+(d.s?'<span class="di-badge">Sentinel</span>':'');
    el.addEventListener('click',function(){
      document.querySelectorAll('.det-item').forEach(function(x){x.classList.remove('act')});
      el.classList.add('act');
      var g=document.getElementById('dd-ghost');if(g)g.textContent=d.n;
      var sv=document.getElementById('dd-svg');if(sv)sv.innerHTML=d.icon;
      var h=document.getElementById('dd-h');if(h)h.textContent=d.name;
      var dd=document.getElementById('dd-d');if(dd)dd.textContent=d.desc;
      var lv=document.getElementById('dd-lv');if(lv){lv.textContent=lvLabel(d.lv);lv.className='dd-lv '+lvClass(d.lv);}
    });
    list.appendChild(el);
  });
}
renderDets();

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
  ch=new Chart(cx,{type:'line',data:{labels:['Ouv.','09:32','09:51'],datasets:[{data:pd,borderColor:'#3cc87a',borderWidth:2,pointRadius:3,pointBackgroundColor:'#3cc87a',fill:true,backgroundColor:'rgba(60,200,122,.06)',tension:.3}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{grid:{color:'rgba(255,255,255,.04)'},ticks:{color:'rgba(255,255,255,.2)',font:{size:10}}},y:{grid:{color:'rgba(255,255,255,.04)'},ticks:{color:'rgba(255,255,255,.2)',font:{size:10},callback:function(v){return '€'+v}}}}}});
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
