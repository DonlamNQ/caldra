'use client'

import { useEffect } from 'react'

const CSS = `
*{margin:0;padding:0;box-sizing:border-box;scroll-behavior:smooth}
:root{--v:#8b5cf6;--v2:#a78bfa;--va:rgba(139,92,246,.1);--vb:rgba(139,92,246,.28);--bg:#06060c;--s1:#0e0e18;--s2:#13131f;--b1:rgba(255,255,255,.07);--b2:rgba(255,255,255,.12);--tx:#f4f2fb;--t2:rgba(244,242,251,.56);--t3:rgba(244,242,251,.28)}
body{font-family:'DM Sans',sans-serif;background:var(--bg);color:var(--tx);overflow-x:hidden;line-height:1;position:relative}
body::before{content:'';position:fixed;inset:0;background-image:linear-gradient(rgba(255,255,255,.022) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.022) 1px,transparent 1px);background-size:64px 64px;-webkit-mask-image:radial-gradient(ellipse 90% 55% at 50% -5%,#000,transparent 72%);mask-image:radial-gradient(ellipse 90% 55% at 50% -5%,#000,transparent 72%);pointer-events:none;z-index:0}
body::after{content:'';position:fixed;bottom:-320px;right:-160px;width:820px;height:720px;background:radial-gradient(ellipse,rgba(91,33,182,.13) 0%,transparent 62%);pointer-events:none;z-index:0;animation:auroraDrift2 22s ease-in-out infinite}
.glow-top{position:fixed;top:-360px;left:50%;width:1120px;height:780px;background:radial-gradient(ellipse,rgba(139,92,246,.15) 0%,transparent 60%);pointer-events:none;z-index:0;animation:auroraDrift 18s ease-in-out infinite}
@keyframes auroraDrift{0%,100%{transform:translateX(-50%) translateY(0) scale(1)}50%{transform:translateX(-44%) translateY(26px) scale(1.07)}}
@keyframes auroraDrift2{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(-44px,-32px) scale(1.1)}}
.reveal{opacity:0;transform:translateY(26px);transition:opacity .75s cubic-bezier(.16,1,.3,1),transform .75s cubic-bezier(.16,1,.3,1)}
.reveal.in{opacity:1;transform:none}

/* NAV */
nav{position:fixed;top:0;left:0;right:0;z-index:100;display:flex;align-items:center;justify-content:space-between;padding:1.1rem 3.5rem;border-bottom:.5px solid var(--b1);backdrop-filter:blur(24px) saturate(150%);background:linear-gradient(180deg,rgba(6,6,12,.82),rgba(6,6,12,.55))}
.n-logo{font-size:13px;font-weight:500;letter-spacing:5px;text-transform:uppercase;color:#fff;text-decoration:none}.n-logo span{color:var(--v)}
.n-links{display:flex;gap:2.5rem}
.n-lk{font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--t2);text-decoration:none;transition:color .15s}.n-lk:hover{color:#fff}
.n-r{display:flex;gap:.625rem;align-items:center}
.n-login{font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:var(--t2);text-decoration:none;padding:7px 14px;border:.5px solid var(--b1);border-radius:3px;transition:all .15s}.n-login:hover{color:#fff;border-color:var(--b2)}
.n-signup{font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:#fff;text-decoration:none;padding:7px 15px;border:.5px solid rgba(139,92,246,.5);border-radius:6px;background:linear-gradient(135deg,#8b5cf6,#6d28d9);box-shadow:0 4px 18px rgba(139,92,246,.32);transition:all .18s}.n-signup:hover{box-shadow:0 6px 26px rgba(139,92,246,.5);transform:translateY(-1px)}

/* HERO — centered headline + devices below */
.hero{min-height:100vh;position:relative;z-index:1;border-bottom:.5px solid var(--b1);overflow:hidden;display:flex;flex-direction:column;align-items:center}
.hero-top{text-align:center;max-width:660px;margin:0 auto;padding:8.5rem 2rem 0;display:flex;flex-direction:column;align-items:center}
.hero-devices{display:flex;align-items:flex-end;justify-content:center;gap:2.5rem;margin-top:3.5rem;padding:0 2rem}
.eyebrow{font-size:10px;letter-spacing:3px;text-transform:uppercase;color:var(--v2);margin-bottom:2rem;display:inline-flex;align-items:center;gap:8px;padding:7px 15px;border:.5px solid var(--vb);border-radius:100px;background:var(--va);backdrop-filter:blur(8px)}
.eydot{width:4px;height:4px;border-radius:50%;background:var(--v);animation:pulse 2s ease-in-out infinite}
@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.3;transform:scale(.7)}}
h1{font-size:clamp(2.9rem,5.4vw,4.7rem);font-weight:200;line-height:1.05;letter-spacing:-2.8px;margin-bottom:1.5rem;background:linear-gradient(180deg,#fff 28%,rgba(244,242,251,.68));-webkit-background-clip:text;background-clip:text;color:transparent}
h1 em{font-style:normal;background:linear-gradient(120deg,#a78bfa,#7c3aed);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 0 24px rgba(139,92,246,.42))}
.hero-sub{font-size:16px;color:var(--t2);line-height:1.8;max-width:500px;margin-bottom:2.5rem;font-weight:300}
.wf{display:flex;gap:5px;background:var(--s1);border:.5px solid var(--b2);border-radius:6px;padding:4px;width:100%;max-width:380px}
.wf input{flex:1;padding:11px 14px;background:transparent;border:none;color:#fff;font-size:13px;font-family:'DM Sans',sans-serif;outline:none}.wf input::placeholder{color:var(--t3)}
.wf-btn{padding:10px 18px;background:var(--v);border:none;border-radius:4px;color:#fff;font-size:12px;font-weight:500;font-family:'DM Sans',sans-serif;cursor:pointer;white-space:nowrap;transition:opacity .15s}.wf-btn:hover{opacity:.85}
.wf-sm{display:none;margin-top:6px;padding:10px 14px;background:rgba(30,180,100,.07);border:.5px solid rgba(30,180,100,.2);border-radius:6px;color:rgba(80,220,140,.9);font-size:12px;text-align:center;width:100%;max-width:380px}
.hero-fn{display:flex;align-items:center;gap:1rem;margin-top:.875rem}
.hfn{font-size:11px;color:var(--t3)}.hfs{width:1px;height:10px;background:var(--b2)}
.hero-ctas{display:flex;gap:10px;align-items:center;width:100%;max-width:380px}
.cta-main-btn{display:inline-flex;align-items:center;justify-content:center;padding:13px 26px;background:linear-gradient(135deg,#8b5cf6,#6d28d9);border-radius:8px;color:#fff;font-size:13px;font-weight:600;font-family:'DM Sans',sans-serif;white-space:nowrap;transition:all .2s;text-decoration:none;flex:1;box-shadow:0 6px 24px rgba(139,92,246,.34),inset 0 1px 0 rgba(255,255,255,.18)}.cta-main-btn:hover{transform:translateY(-2px);box-shadow:0 10px 34px rgba(139,92,246,.5),inset 0 1px 0 rgba(255,255,255,.25)}
.cta-login-lk{font-size:12px;color:var(--t3);text-decoration:none;padding:8px 12px;border:.5px solid var(--b1);border-radius:4px;white-space:nowrap;transition:all .15s;flex-shrink:0}.cta-login-lk:hover{color:#fff;border-color:var(--b2)}

/* PHONE MOCKUP */
.phone-scene{position:relative;display:flex;flex-direction:column;align-items:center;flex-shrink:0}
.phone-frame{width:210px;height:430px;border-radius:38px;background:#06060f;border:6px solid #16162a;box-shadow:0 0 0 1px rgba(255,255,255,.04),0 40px 80px rgba(0,0,0,.75),0 12px 30px rgba(0,0,0,.5);overflow:hidden;position:relative}
.ph-notch-area{height:40px;background:#06060f;position:relative;display:flex;align-items:flex-start;justify-content:center}
.ph-notch{width:84px;height:24px;background:#16162a;border-radius:0 0 16px 16px}
.ph-status{position:absolute;top:8px;left:14px;right:14px;display:flex;justify-content:space-between;font-size:9px;font-weight:600;color:rgba(255,255,255,.7)}
.ph-date{text-align:center;padding:.4rem 0 .2rem;font-size:9px;color:rgba(255,255,255,.25);letter-spacing:.5px}
.ph-notifs{padding:0 7px;display:flex;flex-direction:column;gap:6px}
.ios-notif{background:rgba(14,14,28,.97);border-radius:13px;padding:10px 11px;display:flex;align-items:flex-start;gap:8px;border:.5px solid rgba(255,255,255,.07)}
.ios-notif-icon{width:32px;height:32px;border-radius:7px;display:flex;align-items:center;justify-content:center;font-size:13px;flex-shrink:0}
.ios-n-body{flex:1;min-width:0}
.ios-n-app{font-size:8px;font-weight:600;color:rgba(255,255,255,.35);text-transform:uppercase;letter-spacing:.5px;margin-bottom:2px}
.ios-n-title{font-size:11px;font-weight:600;color:#fff;margin-bottom:2px;line-height:1.25}
.ios-n-msg{font-size:10px;color:rgba(255,255,255,.4);line-height:1.4}
.ios-n-time{font-size:9px;color:rgba(255,255,255,.25);flex-shrink:0}

/* LAPTOP MOCKUP */
.laptop-scene{display:flex;flex-direction:column;align-items:center;flex-shrink:0}
.laptop-screen{width:440px;height:275px;background:#05050d;border-radius:10px 10px 0 0;border:5px solid #181828;border-bottom:2px solid #0d0d1e;box-shadow:0 0 0 1px rgba(255,255,255,.04),0 40px 80px rgba(0,0,0,.65);overflow:hidden;position:relative}
.laptop-base{width:480px;height:13px;background:linear-gradient(to bottom,#181828,#0e0e1a);border-radius:0 0 6px 6px}
.laptop-foot{width:60px;height:3px;background:#0a0a14;margin:0 auto}
/* browser bar inside laptop */
.ls-bar{height:24px;background:#04040a;border-bottom:.5px solid rgba(255,255,255,.06);display:flex;align-items:center;gap:5px;padding:0 10px;flex-shrink:0}
.ls-dot{width:8px;height:8px;border-radius:50%}
.ls-url{flex:1;margin:0 8px;background:rgba(255,255,255,.04);border:.5px solid rgba(255,255,255,.05);border-radius:3px;height:13px;display:flex;align-items:center;justify-content:center;font-size:7px;color:rgba(255,255,255,.25);letter-spacing:.3px}
/* app layout inside */
.ls-app{display:grid;grid-template-columns:96px 1fr;height:calc(100% - 24px)}
.ls-side{background:#04040a;border-right:.5px solid rgba(255,255,255,.05);padding:.5rem 0;display:flex;flex-direction:column;gap:1px}
.ls-logo{font-size:6px;letter-spacing:3px;font-weight:600;text-transform:uppercase;color:rgba(255,255,255,.5);padding:.25rem .625rem .5rem;border-bottom:.5px solid rgba(255,255,255,.05);margin-bottom:.25rem}.ls-logo span{color:#7c3aed}
.ls-logo-sub{font-size:4.5px;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,.2);padding:.125rem .625rem .375rem}
.ls-nav-item{display:flex;align-items:center;gap:5px;padding:.3rem .625rem;font-size:8px;color:rgba(255,255,255,.3);position:relative;cursor:pointer}
.ls-nav-item.act{color:rgba(255,255,255,.8);background:rgba(255,255,255,.04)}.ls-nav-item.act::before{content:'';position:absolute;left:0;top:0;bottom:0;width:1.5px;background:#7c3aed}
.ls-nav-ic{width:8px;height:8px;flex-shrink:0;opacity:.5}
.ls-main{padding:.625rem;display:flex;flex-direction:column;gap:.5rem;overflow:hidden;position:relative}
/* score + kpis row */
.ls-top{display:grid;grid-template-columns:auto 1fr 1fr;gap:.4rem}
.ls-score-card{background:#0d0d1a;border:.5px solid rgba(255,255,255,.06);border-radius:6px;padding:.5rem;display:flex;align-items:center;gap:.5rem}
.ls-score-num{font-size:18px;font-weight:200;letter-spacing:-1.5px;color:#dc8200;line-height:1}
.ls-score-lbl{font-size:6px;letter-spacing:.5px;text-transform:uppercase;color:rgba(255,255,255,.3)}
.ls-kpi{background:#0d0d1a;border:.5px solid rgba(255,255,255,.06);border-radius:6px;padding:.4rem .5rem}
.ls-kpi-l{font-size:6px;letter-spacing:.5px;text-transform:uppercase;color:rgba(255,255,255,.28);margin-bottom:2px}
.ls-kpi-v{font-size:14px;font-weight:200;letter-spacing:-1px;color:#e2e8f0;line-height:1}
.ls-kpi-s{font-size:6px;color:rgba(255,255,255,.25);margin-top:1px}
/* bottom grid */
.ls-bottom{display:grid;grid-template-columns:1fr 1fr;gap:.4rem;flex:1}
.ls-card{background:#0d0d1a;border:.5px solid rgba(255,255,255,.06);border-radius:6px;padding:.4rem .5rem;overflow:hidden}
.ls-card-l{font-size:6px;letter-spacing:.5px;text-transform:uppercase;color:rgba(255,255,255,.28);margin-bottom:.35rem}
.ls-alert{display:flex;align-items:flex-start;gap:4px;padding:.2rem .3rem;border-radius:3px;margin-bottom:3px}
.ls-a2{background:rgba(220,130,0,.07);border:.5px solid rgba(220,130,0,.18)}
.ls-a1{background:rgba(255,200,0,.05);border:.5px solid rgba(255,200,0,.12)}
.ls-adot{width:4px;height:4px;border-radius:50%;flex-shrink:0;margin-top:2px}
.ls-adot-1{background:#ffc800}.ls-adot-2{background:#dc8200}
.ls-at{font-size:7px;color:rgba(255,255,255,.65);line-height:1.35}
.ls-tr{display:flex;justify-content:space-between;font-size:7px;padding:2px 0;border-bottom:.5px solid rgba(255,255,255,.04)}.ls-tr:last-child{border-bottom:none}
.ls-tt{color:rgba(255,255,255,.3)}.ls-tn{color:rgba(255,255,255,.5)}.ls-tp{color:#3cc87a}.ls-tneg{color:#e05050}
/* macOS notification popup */
.mac-notif{position:absolute;top:8px;right:8px;width:175px;background:rgba(18,18,32,.98);border-radius:10px;padding:10px 11px;border:.5px solid rgba(255,255,255,.1);box-shadow:0 10px 30px rgba(0,0,0,.5);animation:macslide .7s ease,floatup 3s ease-in-out .7s infinite;z-index:10}
@keyframes macslide{from{opacity:0;transform:translateX(16px)}to{opacity:1;transform:translateX(0)}}
@keyframes floatup{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
.mac-hd{display:flex;align-items:center;gap:6px;margin-bottom:6px}
.mac-icon{width:20px;height:20px;border-radius:5px;background:linear-gradient(135deg,#7c3aed,#5b21b6);display:flex;align-items:center;justify-content:center;font-size:10px;flex-shrink:0}
.mac-app{font-size:9px;font-weight:600;color:rgba(255,255,255,.45);flex:1}
.mac-time{font-size:8px;color:rgba(255,255,255,.3)}
.mac-title{font-size:11px;font-weight:600;color:#fff;margin-bottom:3px;line-height:1.3}
.mac-body{font-size:9px;color:rgba(255,255,255,.45);line-height:1.5}

@keyframes blk{0%,100%{opacity:1}50%{opacity:.3}}

/* STATS BAR */
.stats-bar{display:grid;grid-template-columns:repeat(4,1fr);border-bottom:.5px solid var(--b1);position:relative;z-index:1}
.sb-item{padding:2rem 3.5rem;border-right:.5px solid var(--b1)}
.sb-item:last-child{border-right:none}
.sb-n{font-size:32px;font-weight:200;letter-spacing:-1.5px;color:#fff;line-height:1;margin-bottom:.4rem}
.sb-n span{color:var(--v)}
.sb-l{font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:var(--t3)}

/* SPLIT FEATURE (notifications) */
.split-sec{padding:6rem 3.5rem;border-bottom:.5px solid var(--b1);position:relative;z-index:1}
.split-grid{display:grid;grid-template-columns:1fr 1fr;gap:5rem;align-items:center;max-width:1080px;margin:0 auto}
.notif-stack{position:relative;display:flex;flex-direction:column;gap:.75rem;padding:1rem}
.notif-card{background:linear-gradient(180deg,rgba(255,255,255,.03),rgba(255,255,255,.008));border:.5px solid var(--b2);border-radius:14px;padding:1rem 1.25rem;display:flex;align-items:flex-start;gap:12px;transition:all .2s;backdrop-filter:blur(6px)}.notif-card:hover{transform:translateX(5px);box-shadow:0 14px 34px rgba(0,0,0,.34)}
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
.sec-h{font-size:clamp(2rem,3.6vw,3.1rem);font-weight:200;letter-spacing:-1.8px;line-height:1.08;margin-bottom:1.25rem;background:linear-gradient(180deg,#fff,rgba(244,242,251,.7));-webkit-background-clip:text;background-clip:text;color:transparent}
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
.ab{flex:1}.at{font-size:12px;font-weight:500;color:#fff;margin-bottom:2px}.as{font-size:11px;color:rgba(255,255,255,.28);line-height:1.4}
.abg{font-size:9px;padding:2px 7px;border-radius:100px;letter-spacing:.5px;text-transform:uppercase;white-space:nowrap;flex-shrink:0;margin-top:1px}
.bl1{background:rgba(255,200,0,.1);color:#ffc800}.bl2{background:rgba(220,130,0,.1);color:#dc8200}.bl3{background:rgba(220,50,30,.12);color:#dc3218}
.demo-sbtn{margin-top:1rem;width:100%;padding:10px;background:transparent;border:.5px solid var(--vb);border-radius:6px;color:var(--v);font-size:12px;font-family:'DM Sans',sans-serif;cursor:pointer;letter-spacing:.5px;transition:background .2s}.demo-sbtn:hover{background:var(--va)}

/* HOW */
.steps-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:0;margin-top:3.5rem;border:.5px solid var(--b1);border-radius:12px;overflow:hidden}
.step-c{padding:2.5rem;background:var(--s1);transition:background .22s}.step-c:hover{background:var(--s2)}.step-c:not(:last-child){border-right:.5px solid var(--b1)}
.step-n{font-size:10px;letter-spacing:2.5px;text-transform:uppercase;color:var(--v);margin-bottom:2rem}
.step-h{font-size:18px;font-weight:500;color:#fff;margin-bottom:.75rem;line-height:1.35}
.step-d{font-size:13px;color:var(--t2);line-height:1.7}
.step-tags{display:flex;flex-wrap:wrap;gap:5px;margin-top:1rem}
.stag-pill{font-size:10px;padding:3px 9px;background:rgba(255,255,255,.04);border:.5px solid var(--b1);border-radius:100px;color:var(--t2);display:flex;align-items:center;gap:4px}
.stag-dot{width:4px;height:4px;border-radius:50%;background:#3cc87a}

/* TESTIMONIALS */
.testi-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1rem;margin-top:3.5rem}
.testi-c{padding:1.75rem;background:linear-gradient(180deg,rgba(255,255,255,.025),rgba(255,255,255,.006));border:.5px solid var(--b1);border-radius:16px;transition:all .25s;backdrop-filter:blur(6px)}.testi-c:hover{border-color:var(--b2);transform:translateY(-3px);box-shadow:0 18px 42px rgba(0,0,0,.36)}
.testi-stars{color:#f5a623;font-size:11px;letter-spacing:2px;margin-bottom:1rem}
.testi-q{font-size:13px;color:rgba(255,255,255,.42);line-height:1.65;margin-bottom:1.25rem;font-style:italic}.testi-q strong{color:rgba(255,255,255,.7);font-style:normal}
.testi-au{display:flex;align-items:center;gap:10px}
.testi-av{width:32px;height:32px;border-radius:50%;background:var(--s2);border:.5px solid var(--b2);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:500;color:rgba(255,255,255,.35)}
.testi-name{font-size:13px;font-weight:500;color:rgba(255,255,255,.65)}.testi-role{font-size:11px;color:var(--t3)}

/* PRICING */
.pricing-grid{display:grid;grid-template-columns:1fr 1fr;gap:1rem;max-width:800px;margin:3.5rem auto 0}
.plan{border-radius:18px;padding:2rem;position:relative;overflow:hidden;transition:transform .25s}.plan:hover{transform:translateY(-3px)}
.plan-pro{background:var(--s1);border:.5px solid var(--b2)}
.plan-sent{background:linear-gradient(150deg,rgba(139,92,246,.13) 0%,var(--s1) 56%);border:.5px solid rgba(139,92,246,.42);box-shadow:0 0 70px rgba(139,92,246,.14),inset 0 1px 0 rgba(255,255,255,.06)}
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
.plan-btn-pri{background:linear-gradient(135deg,#8b5cf6,#6d28d9);color:#fff;box-shadow:0 6px 22px rgba(139,92,246,.32)}.plan-btn-pri:hover{transform:translateY(-2px);box-shadow:0 10px 30px rgba(139,92,246,.48)}

/* STORY */
.story-sec{padding:6rem 3.5rem;position:relative;z-index:1;border-bottom:.5px solid var(--b1)}
.story-in{max-width:640px}
.story-p{font-size:16px;color:rgba(240,237,232,.65);line-height:1.9;font-weight:300;margin-bottom:1.5rem}
.story-end{font-size:20px;color:#fff;line-height:1.5;font-weight:200;font-style:italic;letter-spacing:-.3px;margin-top:.5rem}
.story-end em{font-style:normal;color:var(--v)}

/* CTA */
.cta-sec{padding:8rem 3.5rem;text-align:center;position:relative;z-index:1}
.cta-h{font-size:clamp(2.9rem,6.2vw,5.6rem);font-weight:200;letter-spacing:-3px;line-height:1.01;margin-bottom:1.5rem;background:linear-gradient(180deg,#fff,rgba(244,242,251,.66));-webkit-background-clip:text;background-clip:text;color:transparent}
.cta-h em{font-style:normal;background:linear-gradient(120deg,#a78bfa,#7c3aed);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 0 26px rgba(139,92,246,.45))}
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
  .hero-devices{flex-direction:column;align-items:center;gap:2rem}
  .laptop-screen{width:340px;height:212px}.laptop-base{width:370px}
  .split-grid{grid-template-columns:1fr}
  .det-wrap{grid-template-columns:1fr}.det-detail{display:none}
  .steps-grid{grid-template-columns:1fr}.step-c:not(:last-child){border-right:none;border-bottom:.5px solid var(--b1)}
  .pricing-grid{grid-template-columns:1fr}
  .testi-grid{grid-template-columns:1fr}
  .stats-bar{grid-template-columns:1fr 1fr}.sb-item:nth-child(2){border-right:none}.sb-item:nth-child(3){border-top:.5px solid var(--b1)}.sb-item:nth-child(4){border-right:none;border-top:.5px solid var(--b1)}
  nav{padding:1.25rem 1.5rem}.n-links{display:none}
  .sec,.split-sec,.story-sec,.cta-sec{padding:4rem 1.5rem}
  footer{padding:1.5rem;flex-direction:column;gap:.875rem;text-align:center}
  .demo-body{grid-template-columns:1fr}
  .ls-side{display:none}.ls-app{grid-template-columns:1fr}
}
@media(max-width:600px){
  .wf,.cta-wf{max-width:100%}
  .stats-bar{grid-template-columns:1fr 1fr}
  .laptop-screen{width:280px;height:175px}.laptop-base{width:310px}
  h1{letter-spacing:-1.5px}
}
@media(max-width:480px){
  html{font-size:14px}
  h1{font-size:clamp(2rem,10vw,3rem);letter-spacing:-1px;line-height:1.1}
  .hero-top{padding:5rem 1.25rem 0}
  .hero-sub{font-size:14px}
  .hero-ctas{flex-direction:column;max-width:100%}
  .cta-main-btn{width:100%;border-radius:6px;padding:14px}
  .cta-login-lk{text-align:center;padding:10px}
  .sec,.split-sec,.story-sec,.cta-sec{padding:3rem 1.25rem}
  .sec-in{padding:0}
  .det-wrap{grid-template-columns:1fr!important}
  .steps-grid{grid-template-columns:1fr!important}
  .pricing-grid{grid-template-columns:1fr!important}
  .testi-grid{grid-template-columns:1fr!important}
  .stats-bar{grid-template-columns:1fr!important}
  .sb-item{border-right:none!important;border-top:.5px solid var(--b1)}
  .sb-item:first-child{border-top:none}
  nav{padding:1rem 1.25rem}
  .hero-devices{display:none}
  footer{padding:1.25rem;font-size:12px}
  .ls-app{padding:1rem}
  .n-r a{font-size:12px;padding:6px 12px}
  .eyebrow{font-size:11px}
  .story-in{padding:0}
  .sec-d{font-size:14px}
}
`

const DETECTORS = [
  {n:'01',name:'Revenge sizing',icon:'<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>',desc:"La taille de position augmente après une perte — chemin le plus court pour exploser une journée. Caldra compare chaque nouvelle ouverture aux positions précédentes.",lv:2,s:true},
  {n:'02',name:'Re-entrée immédiate',icon:'<polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.4"/>',desc:"Reprendre un trade moins de 2 minutes après la sortie. L'impulsion, pas l'analyse. Caldra mesure l'intervalle exact entre exit et nouvel entry.",lv:1,s:false},
  {n:'03',name:'Série de pertes',icon:'<line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/>',desc:"3 pertes consécutives — seuil où l'émotion prend le dessus. Configurable selon ton historique.",lv:2,s:false},
  {n:'04',name:'Alerte drawdown',icon:'<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',desc:"Perte journalière approchant ou dépassant ta limite. Deux niveaux : préventive à 80%, stop forcé à 100%. Capital configurable.",lv:3,s:false},
  {n:'05',name:'Hors session',icon:'<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',desc:"Trade en dehors de tes horaires définis. Fatigue, ennui, ou opportunisme — rarement de bons états pour entrer en marché.",lv:1,s:false},
  {n:'06',name:'Suractivité',icon:'<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>',desc:"Nombre de trades dépassant ta limite de session. Plus tu trades, plus tu trades souvent pire.",lv:2,s:false},
  {n:'07',name:'Trade pendant news',icon:'<path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/>',desc:"Entrée dans les 5 minutes d'un événement macro. News + position ouverte = casino. Caldra croise les timestamps avec le calendrier économique.",lv:2,s:true},
  {n:'08',name:'Stop non respecté',icon:'<line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/>',desc:"Position tenue au-delà de ton stop habituel. L'espoir n'est pas une stratégie.",lv:2,s:false},
  {n:'09',name:'Risk dépassé',icon:'<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>',desc:"Sizing dépassant ton risk par trade défini. Tes règles existent pour une raison.",lv:2,s:false},
]

const HTML = `
<div class="glow-top"></div>
<nav>
  <a href="#" class="n-logo" style="text-decoration:none">Cald<span>ra</span></a>
  <div class="n-links">
    <a class="n-lk" href="#alertes">Alertes</a>
    <a class="n-lk" href="#detecteurs">Détecteurs</a>
    <a class="n-lk" href="#demo">Démo</a>
    <a class="n-lk" href="#tarifs">Tarifs</a>
    <a class="n-lk" href="#histoire">Histoire</a>
  </div>
  <div class="n-r">
    <a href="/login" class="n-login">Connexion</a>
    <a href="/signup" class="n-signup">S'inscrire</a>
  </div>
</nav>

<!-- HERO centré -->
<div class="hero">
  <div class="hero-top">
    <div class="eyebrow"><div class="eydot"></div>Intelligence comportementale &mdash; Temps réel</div>
    <h1>Tu ne vois pas<br>quand tu dérailles.<br><em>Lui si.</em></h1>
    <p class="hero-sub">Caldra analyse chaque trade et détecte les comportements qui détruisent les sessions &mdash; avant que le tilt, le revenge trading ou l'impulsion ne fasse les dégâts.</p>
    <div class="hero-ctas">
      <a href="/signup" class="cta-main-btn">Commencer gratuitement →</a>
      <a href="/login" class="cta-login-lk">Connexion</a>
    </div>
    <div class="hero-fn">
      <span class="hfn">7 jours d'essai</span><div class="hfs"></div>
      <span class="hfn">−25 % early adopter</span><div class="hfs"></div>
      <span class="hfn">Disponible maintenant</span>
    </div>
  </div>

  <!-- Phone + Laptop côte à côte -->
  <div class="hero-devices">
    <!-- PHONE -->
    <div class="phone-scene">
      <div class="phone-frame">
        <div class="ph-notch-area">
          <div class="ph-notch"></div>
          <div class="ph-status"><span>9:41</span><span>●●● 5G</span></div>
        </div>
        <div class="ph-date">LUNDI 12 MAI 2026</div>
        <div class="ph-notifs">
          <div class="ios-notif" style="border-color:rgba(220,50,30,.25);background:rgba(220,50,30,.05)">
            <div class="ios-notif-icon" style="background:rgba(220,50,30,.12)">🔴</div>
            <div class="ios-n-body">
              <div class="ios-n-app">Caldra Session</div>
              <div class="ios-n-title">STOP — Drawdown max</div>
              <div class="ios-n-msg">PnL : −€420. Ferme maintenant.</div>
            </div>
            <div class="ios-n-time">now</div>
          </div>
          <div class="ios-notif" style="border-color:rgba(220,130,0,.2);background:rgba(220,130,0,.04)">
            <div class="ios-notif-icon" style="background:rgba(220,130,0,.1)">⚠️</div>
            <div class="ios-n-body">
              <div class="ios-n-app">Caldra Session</div>
              <div class="ios-n-title">Revenge sizing détecté</div>
              <div class="ios-n-msg">Sizing ×2.1 après −€140</div>
            </div>
            <div class="ios-n-time">3 min</div>
          </div>
          <div class="ios-notif">
            <div class="ios-notif-icon" style="background:rgba(255,200,0,.08)">⚡</div>
            <div class="ios-n-body">
              <div class="ios-n-app">Caldra Session</div>
              <div class="ios-n-title">Re-entrée rapide</div>
              <div class="ios-n-msg">87s après la clôture. Min : 120s.</div>
            </div>
            <div class="ios-n-time">11 min</div>
          </div>
        </div>
      </div>
    </div>

    <!-- LAPTOP -->
    <div class="laptop-scene">
      <div class="laptop-screen">
        <!-- browser bar -->
        <div class="ls-bar">
          <div class="ls-dot" style="background:#ff5f57"></div>
          <div class="ls-dot" style="background:#ffbd2e"></div>
          <div class="ls-dot" style="background:#28c840"></div>
          <div class="ls-url">app.getcaldra.com/dashboard</div>
        </div>
        <!-- app -->
        <div class="ls-app">
          <div class="ls-side">
            <div class="ls-logo">Cald<span>ra</span></div>
            <div class="ls-logo-sub">Session</div>
            <div class="ls-nav-item act">
              <svg class="ls-nav-ic" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="0.5" y="0.5" width="4" height="4" rx=".5"/><rect x="7.5" y="0.5" width="4" height="4" rx=".5"/><rect x="0.5" y="7.5" width="4" height="4" rx=".5"/><rect x="7.5" y="7.5" width="4" height="4" rx=".5"/></svg>
              Dashboard
            </div>
            <div class="ls-nav-item">
              <svg class="ls-nav-ic" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="6" cy="6" r="1.5"/><path d="M6 1v1.5M6 9.5V11M1 6h1.5M9.5 6H11"/></svg>
              Alertes
            </div>
            <div class="ls-nav-item">
              <svg class="ls-nav-ic" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="1,9 3.5,5 6,7 8.5,3 11,5"/></svg>
              Analytics
            </div>
            <div class="ls-nav-item" style="margin-top:auto">
              <svg class="ls-nav-ic" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="6" cy="4" r="1.75"/><path d="M1 10.5c0-2.5 2.2-4.5 5-4.5s5 2 5 4.5"/></svg>
              Règles
            </div>
          </div>
          <div class="ls-main">
            <div class="ls-top">
              <!-- score ring -->
              <div class="ls-score-card">
                <svg width="34" height="34" viewBox="0 0 34 34">
                  <circle cx="17" cy="17" r="13" fill="none" stroke="rgba(255,255,255,.05)" stroke-width="4"/>
                  <circle cx="17" cy="17" r="13" fill="none" stroke="#dc8200" stroke-width="4"
                    stroke-dasharray="82" stroke-dashoffset="33" stroke-linecap="round"
                    style="transform:rotate(-90deg);transform-origin:17px 17px"/>
                </svg>
                <div><div class="ls-score-num">62</div><div class="ls-score-lbl">/ 100</div></div>
              </div>
              <div class="ls-kpi">
                <div class="ls-kpi-l">P&amp;L session</div>
                <div class="ls-kpi-v" style="color:#e2e8f0">−€180</div>
                <div class="ls-kpi-s">en cours</div>
              </div>
              <div class="ls-kpi">
                <div class="ls-kpi-l">Win rate</div>
                <div class="ls-kpi-v" style="color:#e2e8f0">43%</div>
                <div class="ls-kpi-s">3W · 4L</div>
              </div>
            </div>
            <div class="ls-bottom">
              <div class="ls-card">
                <div class="ls-card-l">Alertes</div>
                <div class="ls-alert ls-a2"><div class="ls-adot ls-adot-2"></div><div class="ls-at">Revenge sizing ×2.1</div></div>
                <div class="ls-alert ls-a1"><div class="ls-adot ls-adot-1"></div><div class="ls-at">Re-entrée rapide (87s)</div></div>
                <div class="ls-alert ls-a2"><div class="ls-adot ls-adot-2"></div><div class="ls-at">3 pertes consécutives</div></div>
              </div>
              <div class="ls-card">
                <div class="ls-card-l">Trades du jour</div>
                <div class="ls-tr"><span class="ls-tt">09:32</span><span class="ls-tn">EUR/USD Long</span><span class="ls-tp">+140</span></div>
                <div class="ls-tr"><span class="ls-tt">09:51</span><span class="ls-tn">EUR/USD Short</span><span class="ls-tp">+100</span></div>
                <div class="ls-tr"><span class="ls-tt">10:14</span><span class="ls-tn">EUR/USD Short</span><span class="ls-tneg">−180</span></div>
                <div class="ls-tr"><span class="ls-tt">10:31</span><span class="ls-tn">EUR/USD Long</span><span class="ls-tneg">−210</span></div>
              </div>
            </div>
            <!-- macOS notification -->
            <div class="mac-notif">
              <div class="mac-hd">
                <div class="mac-icon">C</div>
                <div class="mac-app">Caldra Session</div>
                <div class="mac-time">maintenant</div>
              </div>
              <div class="mac-title">⚠️ Revenge sizing</div>
              <div class="mac-body">Sizing ×2.1 après −€140. 1.4 lots vs 0.67 lots.</div>
            </div>
          </div>
        </div>
      </div>
      <div class="laptop-base"><div class="laptop-foot"></div></div>
    </div>
  </div>
</div>

<!-- STATS BAR -->
<div class="stats-bar">
  <div class="sb-item"><div class="sb-n">17</div><div class="sb-l">Comportements détectés</div></div>
  <div class="sb-item"><div class="sb-n">3</div><div class="sb-l">Niveaux d'alerte</div></div>
  <div class="sb-item"><div class="sb-n"><span>&lt;</span>1s</div><div class="sb-l">Temps de détection</div></div>
  <div class="sb-item"><div class="sb-n">100%</div><div class="sb-l">Automatique</div></div>
</div>

<!-- SPLIT: NOTIFICATIONS -->
<div class="split-sec" id="alertes">
  <div class="split-grid">
    <div>
      <div class="sec-tag" style="max-width:none">Alertes en temps réel</div>
      <div class="sec-h">Push. Desktop.<br>En moins d'une seconde.</div>
      <p class="sec-d" style="margin-top:1.25rem">Dès qu'un pattern dangereux est détecté, tu reçois une notification push sur ton téléphone ET une alerte desktop. Sur iOS, Android et navigateur.</p>
      <div style="margin-top:2rem;display:flex;flex-direction:column;gap:.75rem">
        <div style="display:flex;align-items:center;gap:.875rem"><div style="width:32px;height:32px;border-radius:8px;background:rgba(60,200,122,.08);border:.5px solid rgba(60,200,122,.2);display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0">📱</div><div style="font-size:13px;color:var(--t2)">Push iOS &amp; Android via Web Push (VAPID)</div></div>
        <div style="display:flex;align-items:center;gap:.875rem"><div style="width:32px;height:32px;border-radius:8px;background:rgba(60,200,122,.08);border:.5px solid rgba(60,200,122,.2);display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0">💻</div><div style="font-size:13px;color:var(--t2)">Notification desktop (Chrome, Safari, Firefox)</div></div>
        <div style="display:flex;align-items:center;gap:.875rem"><div style="width:32px;height:32px;border-radius:8px;background:rgba(60,200,122,.08);border:.5px solid rgba(60,200,122,.2);display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0">💬</div><div style="font-size:13px;color:var(--t2)">Webhook Slack / Discord configurable</div></div>
      </div>
    </div>
    <div class="notif-stack">
      <div class="notif-card nc-l3"><div class="nc-icon" style="background:rgba(220,50,30,.12)">🔴</div><div class="nc-body"><div class="nc-app">Caldra Session</div><div class="nc-title">STOP — Drawdown max atteint</div><div class="nc-msg">PnL session : −€420 (−4.2%). Ferme la plateforme maintenant.</div></div><div class="nc-time">maintenant</div></div>
      <div class="notif-card nc-l2"><div class="nc-icon" style="background:rgba(220,130,0,.1)">⚠️</div><div class="nc-body"><div class="nc-app">Caldra Session</div><div class="nc-title">Revenge sizing détecté</div><div class="nc-msg">Sizing ×2.1 après une perte — 1.4 lots vs 0.67 lots</div></div><div class="nc-time">3 min</div></div>
      <div class="notif-card"><div class="nc-icon" style="background:rgba(255,200,0,.08)">⚡</div><div class="nc-body"><div class="nc-app">Caldra Session</div><div class="nc-title">Re-entrée rapide</div><div class="nc-msg">87 secondes après la clôture. Délai minimum : 120s.</div></div><div class="nc-time">11 min</div></div>
      <div class="notif-device"><div class="nd-dot"></div><span class="nd-txt">Push actif · iOS 16.4+ · Android · Desktop</span></div>
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
        <p class="sec-d" style="margin-bottom:2rem">Chaque trader a des patterns quand il commence à dérailler. Caldra en surveille <strong style="color:var(--tx);font-weight:500">17</strong> — voici les plus parlants.</p>
        <div class="det-layout" id="det-list"></div>
        <p style="margin-top:1.25rem;font-size:12px;color:var(--t3);line-height:1.7">+ 8 autres : sizing d'euphorie, acharnement directionnel, sur-exposition, désespoir de fin de session, cadence qui s'emballe, tu coupes tes gains…</p>
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
        <div style="width:10px;height:10px;border-radius:50%;background:#ff5f57"></div>
        <div style="width:10px;height:10px;border-radius:50%;background:#ffbd2e"></div>
        <div style="width:10px;height:10px;border-radius:50%;background:#28c840"></div>
        <div class="demo-ttl">Caldra — Session EUR/USD — 30/03/2026</div>
      </div>
      <div class="demo-body">
        <div class="demo-lp">
          <div class="demo-llab">P&amp;L de session</div>
          <div class="demo-pnl"><div class="demo-pv" id="dpnl" style="color:#3cc87a">+€240</div><div class="demo-pc" id="dpc">Session en cours</div></div>
          <div class="demo-chart"><canvas id="pc"></canvas></div>
          <div class="demo-tlab">Derniers trades</div>
          <div id="tlog">
            <div class="demo-tr"><span class="dtt">09:32</span><span class="dtins">EUR/USD Long</span><span class="dtp">+€140</span></div>
            <div class="demo-tr"><span class="dtt">09:51</span><span class="dtins">EUR/USD Short</span><span class="dtp">+€100</span></div>
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
      <div class="step-c"><div class="step-n">01 — Connecte</div><div class="step-h">Ta plateforme de trading</div><div class="step-d">Connexion directe via API. Tes trades remontent automatiquement — rien à saisir manuellement.</div><div class="step-tags"><span class="stag-pill"><span class="stag-dot"></span>cTrader</span><span class="stag-pill"><span class="stag-dot"></span>MetaTrader 5</span><span class="stag-pill" style="opacity:.4">+ à venir</span></div></div>
      <div class="step-c"><div class="step-n">02 — Configure</div><div class="step-h">Tes règles et limites</div><div class="step-d">Horaires de session, risk par trade, drawdown max. Tes règles, tes standards — pas des valeurs génériques imposées.</div></div>
      <div class="step-c"><div class="step-n">03 — Trade</div><div class="step-h">Alerte immédiate si ça déraille</div><div class="step-d">Dès qu'un pattern dangereux est détecté, tu reçois une notification push + desktop en moins d'une seconde.</div></div>
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
      <div class="testi-c"><div class="testi-stars">★★★★★</div><p class="testi-q">« J'ai claqué trois semaines de gains en une après-midi à cause du tilt. <strong>Ce genre d'outil j'en avais besoin depuis longtemps.</strong> »</p><div class="testi-au"><div class="testi-av">TM</div><div><div class="testi-name">Thomas M.</div><div class="testi-role">Trader Forex · 3 ans</div></div></div></div>
      <div class="testi-c"><div class="testi-stars">★★★★★</div><p class="testi-q">« <strong>Je savais même pas que je faisais du revenge sizing.</strong> Ça se voyait pas de l'intérieur. Hâte que ça sorte. »</p><div class="testi-au"><div class="testi-av">KF</div><div><div class="testi-name">KrazoliFX</div><div class="testi-role">Trader CFD/Forex · Paris</div></div></div></div>
      <div class="testi-c"><div class="testi-stars">★★★★☆</div><p class="testi-q">« J'utilise TradeZella mais c'est toujours après coup. <strong>Avec Caldra l'alerte est arrivée pendant ma session.</strong> C'est pas du tout la même chose. »</p><div class="testi-au"><div class="testi-av">KL</div><div><div class="testi-name">Kevin L.</div><div class="testi-role">Trader Forex · Lyon</div></div></div></div>
    </div>
  </div>
</div>

<!-- TARIFS -->
<div class="sec" id="tarifs">
  <div class="sec-in">
    <div class="sec-tag">Tarifs</div>
    <div class="sec-h" style="text-align:center">Simple.<br>Rentabilisé au premier trade évité.</div>
    <p style="text-align:center;font-size:13px;color:var(--t2);margin:-.5rem auto 1.75rem;max-width:560px"><span style="display:inline-block;background:linear-gradient(135deg,#8b5cf6,#6d28d9);color:#fff;font-size:9px;letter-spacing:1.5px;text-transform:uppercase;border-radius:4px;padding:4px 8px;font-weight:600;margin-right:8px">Lancement</span><strong style="color:var(--tx)">−25 % à vie</strong> pour les 100 premiers · Pro à <strong style="color:var(--tx)">14€</strong> · Max à <strong style="color:var(--tx)">29€</strong></p>
    <div class="pricing-grid">
      <div class="plan plan-pro"><div class="plan-shine plan-sw"></div><div class="plan-lab">Pro</div><div class="plan-price"><sup>€</sup>19<sub>/mois</sub></div><div class="plan-note">7 jours gratuits · Carte bancaire requise</div><div class="plan-tag">Surveillance comportementale complète. Alertes immédiates dès qu'un pattern dangereux est détecté.</div><ul class="plan-features"><li><div class="pfc pfc-d"><svg viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3"/></svg></div>11 détecteurs comportementaux</li><li><div class="pfc pfc-d"><svg viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3"/></svg></div>Dashboard temps réel</li><li><div class="pfc pfc-d"><svg viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3"/></svg></div>Personnalisation des règles</li><li><div class="pfc pfc-d"><svg viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3"/></svg></div>Rapport mensuel</li><li><div class="pfc pfc-d"><svg viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3"/></svg></div>Historique 30 jours</li></ul><a href="/signup" class="plan-btn plan-btn-sec">Essayer 7 jours →</a></div>
      <div class="plan plan-sent"><div class="plan-shine plan-sv"></div><div class="plan-lab plan-lab-v">Max</div><div class="plan-price"><sup>€</sup>39<sub>/mois</sub></div><div class="plan-note">7 jours gratuits · Carte bancaire requise</div><div class="plan-tag">Tout le plan Pro, augmenté d'un coach IA actif. Analyse, recommandations et debriefing à chaque session.</div><ul class="plan-features"><li class="plan-hi"><div class="pfc pfc-v"><svg viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3"/></svg></div><strong>18 détecteurs complets</strong></li><li><div class="pfc pfc-d"><svg viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3"/></svg></div><span style="color:rgba(240,237,232,.3)">Tout le plan Pro, plus :</span></li><li class="plan-hi"><div class="pfc pfc-v"><svg viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3"/></svg></div><strong>Rapport de fin de session IA</strong></li><li class="plan-hi"><div class="pfc pfc-v"><svg viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3"/></svg></div><strong>Rapport hebdomadaire IA</strong></li><li class="plan-hi"><div class="pfc pfc-v"><svg viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3"/></svg></div><strong>Historique 6 mois</strong></li></ul><a href="/signup" class="plan-btn plan-btn-pri">Essayer 7 jours →</a></div>
    </div>
    <p style="text-align:center;margin-top:2rem;font-size:13px;color:var(--t3);font-style:italic">7 jours d'essai gratuit · Carte bancaire requise · Débit automatique à J+7 sauf résiliation</p>
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
    <div class="sec-tag" style="justify-content:center;max-width:none">Disponible maintenant</div>
    <div class="cta-h">Ton prochain tilt<br><em>peut être le dernier.</em></div>
    <p class="cta-sub">7 jours d'essai gratuit. Carte bancaire requise, débit automatique à J+7 sauf résiliation.</p>
    <a href="/signup" class="cta-main-btn" style="display:inline-flex;max-width:340px;padding:14px 32px;font-size:14px;border-radius:7px;letter-spacing:.3px;margin-bottom:14px">Commencer l'essai — 7 jours →</a>
    <p style="margin-top:.25rem;font-size:12px;color:var(--t3)"><a href="/login" style="color:var(--t3);text-decoration:none">Déjà un compte ? <span style="color:var(--v)">Connexion →</span></a></p>
  </div>
</div>

<footer>
  <div class="foot-logo">Cald<span>ra</span></div>
  <div class="foot-links"><a href="/mentions-legales" class="foot-lk">CGU</a><a href="/confidentialite" class="foot-lk">Confidentialité</a><a href="/support" class="foot-lk">Support</a></div>
  <div class="foot-email">contact@getcaldra.com</div>
</footer>

<script id="caldra-main-js">
(function(){
var DETS=${JSON.stringify(DETECTORS)};
function lvClass(l){return l===1?'dd-l1':l===2?'dd-l2':'dd-l3';}
function lvLabel(l){return l===1?'Niveau 1 — Info':l===2?'Niveau 2 — Alerte':'Niveau 3 — Critique';}
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
  {time:'10:33',side:'EUR/USD Long',pnl:-320,a:{l:3,ti:'STOP — Ferme la plateforme.',su:'Drawdown critique + série + revenge sizing simultanés.'}}
];
function initChart(){
  var canvas=document.getElementById('pc');if(!canvas)return;
  var cx=canvas.getContext('2d');var ex=window.Chart&&Chart.getChart&&Chart.getChart(cx);if(ex)ex.destroy();
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
  simStep++;if(simStep>=SCN.length)document.getElementById('sb').textContent='↺ Recommencer';
}
window.sim=sim;
function resetD(){
  simStep=0;pd=[0,140,240];ch.data.labels=['Ouv.','09:32','09:51'];ch.data.datasets[0].data=pd;
  ch.data.datasets[0].borderColor='#3cc87a';ch.data.datasets[0].pointBackgroundColor='#3cc87a';ch.data.datasets[0].backgroundColor='rgba(60,200,122,.06)';ch.update();
  document.getElementById('dpnl').textContent='+€240';document.getElementById('dpnl').style.color='#3cc87a';
  document.getElementById('dpc').textContent='Session en cours';
  document.getElementById('tlog').innerHTML='<div class="demo-tr"><span class="dtt">09:32</span><span class="dtins">EUR/USD Long</span><span class="dtp">+€140</span></div><div class="demo-tr"><span class="dtt">09:51</span><span class="dtins">EUR/USD Short</span><span class="dtp">+€100</span></div>';
  document.getElementById('ac').innerHTML='<div style="font-size:12px;color:var(--t3);padding:.5rem 0">Aucune alerte — session saine.</div>';
  document.getElementById('sb').textContent='→ Simuler le trade suivant';
}
if(window.Chart){initChart();}else{var s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.0/chart.umd.min.js';s.onload=initChart;document.head.appendChild(s);}
try{var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target);}});},{threshold:.1});document.querySelectorAll('.split-sec,.sec,.story-sec,.cta-sec').forEach(function(el){el.classList.add('reveal');io.observe(el);});}catch(e){}
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
