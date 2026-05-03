'use client'

import { useEffect } from 'react'

const CSS = `
*{margin:0;padding:0;box-sizing:border-box;scroll-behavior:smooth}
:root{--red:#7c3aed;--rd:rgba(124,58,237,.1);--rb:rgba(124,58,237,.25);--bg:#08080d;--sf:#0f0f16;--sf2:#141420;--b:rgba(255,255,255,.07);--b2:rgba(255,255,255,.12);--tx:#e8e6e0;--tm:rgba(232,230,224,.45);--td:rgba(232,230,224,.2)}
body{font-family:'DM Sans',sans-serif;background:var(--bg);color:var(--tx);min-height:100vh;overflow-x:hidden}
#net{position:fixed;inset:0;z-index:0;pointer-events:none}
.g1{position:fixed;width:700px;height:700px;border-radius:50%;background:radial-gradient(circle,rgba(124,58,237,.07) 0%,transparent 65%);top:-250px;left:50%;transform:translateX(-50%);pointer-events:none;z-index:0}
.g2{position:fixed;width:400px;height:400px;border-radius:50%;background:radial-gradient(circle,rgba(124,58,237,.04) 0%,transparent 65%);bottom:20%;right:-100px;pointer-events:none;z-index:0}
nav{position:fixed;top:0;left:0;right:0;z-index:100;display:flex;justify-content:space-between;align-items:center;padding:1.25rem 3rem;border-bottom:.5px solid var(--b);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);background:rgba(8,8,13,.88)}
.logo-block{display:flex;flex-direction:column;gap:5px}
.logo{font-family:'DM Sans',sans-serif;font-weight:300;font-size:14px;letter-spacing:5px;text-transform:uppercase;color:#fff;line-height:1}
.logo span{color:var(--red)}
.logo-sub{font-size:8px;font-weight:400;letter-spacing:8.2px;text-transform:uppercase;color:rgba(255,255,255,.6);line-height:1;display:block}
.nav-sep{width:.5px;height:30px;background:rgba(255,255,255,.1);margin:0 2.5rem;flex-shrink:0}
.nav-links{display:flex;align-items:center;flex:1;justify-content:space-between;max-width:540px}
.nav-link{font-size:10px;font-weight:400;letter-spacing:2.5px;text-transform:uppercase;color:rgba(232,230,224,.6);cursor:pointer;transition:color .2s;text-decoration:none;background:none;border:none;font-family:'DM Sans',sans-serif;padding:0}
.nav-link:hover{color:#fff}
.nr{display:flex;align-items:center;gap:1rem;margin-left:2.5rem}
.nb{font-size:9px;padding:4px 12px;border:.5px solid var(--rb);border-radius:100px;color:var(--red);letter-spacing:1.5px;text-transform:uppercase}
.nc{font-size:10px;font-weight:500;letter-spacing:2px;text-transform:uppercase;padding:9px 20px;background:transparent;border:.5px solid rgba(255,255,255,.85);border-radius:4px;color:#fff;cursor:pointer;font-family:'DM Sans',sans-serif;transition:background .2s,color .2s}
.nc:hover{background:#fff;color:#08080d}
.story-section{position:relative;z-index:1;max-width:940px;margin:0 auto;padding:5rem 2rem}
.story-grid{display:grid;grid-template-columns:1fr 1fr;gap:4rem;align-items:start;margin-top:3rem}
.story-entries{display:flex;flex-direction:column;gap:0}
.story-entry{display:flex;gap:1.5rem;align-items:flex-start;padding-bottom:2rem;position:relative}
.story-entry:last-child{padding-bottom:0}
.story-entry::before{content:'';position:absolute;left:49px;top:20px;bottom:0;width:.5px;background:rgba(255,255,255,.07)}
.story-entry:last-child::before{display:none}
.story-dot{width:8px;height:8px;border-radius:50%;background:var(--red);opacity:.6;flex-shrink:0;margin-top:4px}
.story-year{font-size:10px;letter-spacing:2px;color:var(--red);opacity:.7;text-transform:uppercase;min-width:32px;padding-top:2px;flex-shrink:0}
.story-content{flex:1}
.story-title{font-size:14px;font-weight:500;color:rgba(255,255,255,.85);margin-bottom:.35rem}
.story-desc{font-size:13px;color:var(--tm);line-height:1.65}
.story-card{background:var(--sf);border:.5px solid var(--b2);border-radius:16px;padding:2.5rem;position:relative;overflow:hidden}
.story-card::before{content:'';position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(124,58,237,.4),transparent)}
.story-quote{font-size:24px;font-weight:200;color:#fff;letter-spacing:-.5px;line-height:1.3;margin-bottom:2rem;font-style:italic}
.story-quote em{color:var(--red);font-style:normal}
.story-sig{display:flex;align-items:center;gap:12px;border-top:.5px solid var(--b);padding-top:1.25rem;margin-bottom:1.5rem}
.story-avatar{width:38px;height:38px;border-radius:50%;background:var(--rd);border:.5px solid var(--rb);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:500;color:var(--red);flex-shrink:0}
.story-name{font-size:13px;font-weight:500;color:rgba(255,255,255,.7)}
.story-role{font-size:11px;color:var(--td)}
.story-stats{display:grid;grid-template-columns:1fr 1fr;gap:.75rem;margin-top:0}
.story-stat{background:rgba(255,255,255,.03);border:.5px solid var(--b);border-radius:8px;padding:.875rem 1rem}
.story-stat-n{font-size:20px;font-weight:200;color:#fff;letter-spacing:-1px}
.story-stat-n span{color:var(--red)}
.story-stat-l{font-size:11px;color:var(--td);margin-top:2px}
.hero{position:relative;z-index:1;text-align:center;padding:10rem 2rem 4rem;max-width:860px;margin:0 auto}
.ey{display:inline-flex;align-items:center;gap:8px;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:rgba(124,58,237,.75);margin-bottom:2.25rem;padding:5px 14px;border:.5px solid var(--rb);border-radius:100px;background:var(--rd)}
.eyd{width:5px;height:5px;border-radius:50%;background:var(--red);animation:pulse 2s ease-in-out infinite}
@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(.7)}}
h1{font-family:'DM Sans',sans-serif;font-size:clamp(2.8rem,6.5vw,4.8rem);font-weight:200;line-height:1.06;letter-spacing:-2px;color:#fff;margin-bottom:1.5rem}
h1 em{font-style:normal;color:var(--red);font-weight:400}
.hs{font-size:17px;color:var(--tm);line-height:1.75;max-width:580px;margin:0 auto 2.5rem;font-weight:300}
.ww{max-width:480px;margin:0 auto}
.wf{display:flex;gap:8px;background:rgba(255,255,255,.04);border:.5px solid var(--b2);border-radius:10px;padding:6px}
.wf input{flex:1;padding:12px 16px;background:transparent;border:none;color:#fff;font-size:14px;font-family:'DM Sans',sans-serif;outline:none}
.wf input::placeholder{color:rgba(255,255,255,.2)}
.bp{padding:12px 22px;background:var(--red);border:none;border-radius:7px;color:#fff;font-size:13px;font-weight:500;font-family:'DM Sans',sans-serif;cursor:pointer;white-space:nowrap;transition:opacity .2s,transform .1s}
.bp:hover{opacity:.88}
.bp:active{transform:scale(.97)}
.ff{display:flex;align-items:center;justify-content:center;gap:1.5rem;margin-top:1rem}
.fn{font-size:12px;color:var(--td)}
.fs{width:1px;height:12px;background:var(--b2)}
.sm{display:none;padding:14px 20px;background:rgba(30,180,100,.08);border:.5px solid rgba(30,180,100,.25);border-radius:8px;color:rgba(80,220,140,.9);font-size:13px;text-align:center;margin-top:8px}
.ss{position:relative;z-index:1;display:flex;justify-content:center;align-items:center;gap:2rem;flex-wrap:wrap;padding:2.5rem 2rem;border-top:.5px solid var(--b);border-bottom:.5px solid var(--b);max-width:800px;margin:0 auto}
.si{display:flex;align-items:center;gap:8px;font-size:13px;color:var(--tm)}
.sag{display:flex}
.sa{width:26px;height:26px;border-radius:50%;border:1.5px solid var(--bg);margin-left:-8px;background:var(--sf2);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:500;color:rgba(255,255,255,.5)}
.sa:first-child{margin-left:0}
.ssep{width:1px;height:20px;background:var(--b2)}
.stars{color:#f5a623;font-size:13px;letter-spacing:1px}
.sr{position:relative;z-index:1;display:flex;justify-content:center;gap:4rem;padding:3.5rem 2rem;max-width:700px;margin:0 auto;border-bottom:.5px solid var(--b)}
.stat{text-align:center}
.sn{font-family:'DM Sans',sans-serif;font-size:32px;font-weight:200;color:#fff;letter-spacing:-1px;line-height:1}
.sna{color:var(--red)}
.sl{font-size:12px;color:var(--td);margin-top:5px}
section{position:relative;z-index:1;max-width:940px;margin:0 auto;padding:5rem 2rem}
.stag{font-size:11px;letter-spacing:2px;text-transform:uppercase;color:rgba(124,58,237,.6);margin-bottom:1rem}
.stit{font-family:'DM Sans',sans-serif;font-size:clamp(1.9rem,4vw,2.9rem);font-weight:200;letter-spacing:-1px;color:#fff;margin-bottom:1rem;line-height:1.1}
.sdesc{font-size:15px;color:var(--tm);line-height:1.75;max-width:520px;margin-bottom:3rem;font-weight:300}
.sdiv{width:100%;max-width:940px;margin:0 auto;height:.5px;background:var(--b)}
.scdemo{background:var(--sf);border:.5px solid var(--b2);border-radius:16px;padding:2rem;margin-bottom:3rem}
.scdh{display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem}
.scdl{font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:var(--td)}
.ssel{display:flex;gap:6px}
.sbtn{font-size:11px;padding:5px 12px;border-radius:100px;cursor:pointer;border:.5px solid var(--b2);background:transparent;color:var(--tm);font-family:'DM Sans',sans-serif;transition:all .2s}
.sbtn.active{background:var(--rd);border-color:var(--rb);color:var(--red)}
.scm{display:flex;align-items:center;gap:2.5rem;margin-bottom:1.5rem}
.scc{position:relative;flex-shrink:0}
.scc svg{transform:rotate(-90deg)}
.scv{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center}
.scn{font-family:'DM Sans',sans-serif;font-size:32px;font-weight:200;letter-spacing:-1px;line-height:1;transition:color .4s}
.scl{font-size:10px;text-transform:uppercase;letter-spacing:1px;color:var(--td);margin-top:2px}
.scb{display:flex;flex-direction:column;gap:10px;flex:1}
.sci{display:flex;align-items:center;gap:10px}
.scin{font-size:12px;color:var(--tm);width:155px;flex-shrink:0}
.scbt{flex:1;height:4px;background:rgba(255,255,255,.06);border-radius:2px;overflow:hidden}
.scbf{height:100%;border-radius:2px;transition:width .6s cubic-bezier(.4,0,.2,1),background .4s}
.sciv{font-size:11px;width:28px;text-align:right;color:var(--td)}
.scst{display:inline-flex;align-items:center;gap:6px;font-size:12px;padding:4px 12px;border-radius:100px;border:.5px solid}
.patterns-carousel-wrap{position:relative;margin-bottom:3rem}
.patterns-carousel{display:flex;gap:12px;overflow-x:auto;scroll-snap-type:x mandatory;-webkit-overflow-scrolling:touch;padding-bottom:1rem;scrollbar-width:none;cursor:grab}
.patterns-carousel.dragging{cursor:grabbing;scroll-snap-type:none}
.patterns-carousel::-webkit-scrollbar{display:none}
.patterns-carousel .bc{min-width:220px;max-width:220px;scroll-snap-align:start;background:var(--sf);border:.5px solid var(--b);border-radius:14px;padding:1.5rem;transition:background .2s;flex-shrink:0;user-select:none}
.patterns-carousel .bc:hover{background:var(--sf2)}
.carousel-fade-right{position:absolute;right:0;top:0;bottom:1rem;width:80px;background:linear-gradient(to left,var(--bg),transparent);pointer-events:none}
.bi{width:34px;height:34px;border-radius:8px;background:var(--rd);border:.5px solid var(--rb);display:flex;align-items:center;justify-content:center;margin-bottom:1rem}
.bi svg{width:15px;height:15px;stroke:var(--red);fill:none;stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round}
.bn{font-size:13px;font-weight:500;color:#fff;margin-bottom:.4rem}
.bd{font-size:12px;color:rgba(255,255,255,.28);line-height:1.55}
.dw{background:var(--sf);border:.5px solid var(--b2);border-radius:16px;overflow:hidden;margin-top:3rem}
.dtb{display:flex;align-items:center;gap:8px;padding:1rem 1.5rem;border-bottom:.5px solid var(--b);background:rgba(0,0,0,.2)}
.dd{width:10px;height:10px;border-radius:50%}
.ddr{background:#ff5f57}.ddy{background:#ffbd2e}.ddg{background:#28c840}
.dtit{flex:1;text-align:center;font-size:11px;color:var(--td);letter-spacing:.5px}
.dc{display:grid;grid-template-columns:1fr 300px;min-height:420px}
.dca{padding:1.5rem;border-right:.5px solid var(--b)}
.dcl{font-size:11px;letter-spacing:1px;text-transform:uppercase;color:var(--td);margin-bottom:1.25rem}
.pnl{display:flex;align-items:baseline;gap:8px;margin-bottom:1.5rem}
.pv{font-family:'DM Sans',sans-serif;font-size:36px;font-weight:200;letter-spacing:-1.5px;transition:color .3s}
.pc{font-size:13px;color:var(--td)}
.cc{position:relative;height:150px;margin-bottom:1rem}
.tll{font-size:11px;letter-spacing:1px;text-transform:uppercase;color:var(--td);margin-bottom:.75rem}
.ti{display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:.5px solid var(--b);font-size:12px}
.ti:last-child{border-bottom:none}
.tt{color:var(--td)}.tinst{color:var(--tm)}.tp{color:#3cc87a;font-weight:500}.tn{color:#e05050;font-weight:500}
.daa{padding:1.5rem;display:flex;flex-direction:column}
.dal{font-size:11px;letter-spacing:1px;text-transform:uppercase;color:var(--td);margin-bottom:.75rem}
.al{flex:1;display:flex;flex-direction:column;gap:.5rem}
.ai{display:flex;align-items:flex-start;gap:10px;padding:.75rem .875rem;border-radius:8px;border:.5px solid transparent;animation:sli .3s ease}
@keyframes sli{from{opacity:0;transform:translateX(6px)}to{opacity:1;transform:translateX(0)}}
.al1{background:rgba(255,200,0,.04);border-color:rgba(255,200,0,.1)}
.al2{background:rgba(220,130,0,.06);border-color:rgba(220,130,0,.15)}
.al3{background:rgba(220,50,30,.08);border-color:rgba(220,50,30,.2)}
.adot{width:7px;height:7px;border-radius:50%;margin-top:3px;flex-shrink:0}
.dl1{background:#ffc800}.dl2{background:#dc8200}.dl3{background:#dc3218;animation:blk 1s ease-in-out infinite}
@keyframes blk{0%,100%{opacity:1}50%{opacity:.35}}
.ab{flex:1}.at{font-size:12px;font-weight:500;color:#fff;margin-bottom:2px}.as{font-size:11px;color:rgba(255,255,255,.28);line-height:1.4}
.abg{font-size:9px;padding:2px 7px;border-radius:100px;letter-spacing:.5px;text-transform:uppercase;white-space:nowrap;flex-shrink:0;margin-top:1px}
.bl1{background:rgba(255,200,0,.1);color:#ffc800}.bl2{background:rgba(220,130,0,.1);color:#dc8200}.bl3{background:rgba(220,50,30,.12);color:#dc3218}
.dsb{margin-top:1rem;width:100%;padding:10px;background:transparent;border:.5px solid var(--rb);border-radius:8px;color:var(--red);font-size:12px;font-family:'DM Sans',sans-serif;cursor:pointer;letter-spacing:.5px;transition:background .2s}
.dsb:hover{background:var(--rd)}
.steps-timeline{display:flex;flex-direction:column;gap:0;margin-top:3rem;max-width:680px}
.step-tl{display:grid;grid-template-columns:56px 1fr;gap:0 2rem;position:relative;padding-bottom:3.5rem}
.step-tl:last-child{padding-bottom:0}
.step-tl-left{display:flex;flex-direction:column;align-items:center;gap:0}
.step-tl-num{width:40px;height:40px;border-radius:50%;border:.5px solid rgba(124,58,237,.3);background:rgba(124,58,237,.06);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:500;color:var(--red);flex-shrink:0;position:relative;z-index:1}
.step-tl-line{width:.5px;flex:1;background:linear-gradient(to bottom,rgba(124,58,237,.2),rgba(124,58,237,.04));margin-top:8px}
.step-tl:last-child .step-tl-line{display:none}
.step-tl-right{padding-top:8px}
.step-tl-label{font-size:10px;letter-spacing:2px;text-transform:uppercase;color:rgba(124,58,237,.5);margin-bottom:.5rem}
.step-tl-title{font-size:17px;font-weight:500;color:#fff;margin-bottom:.5rem;line-height:1.3}
.step-tl-desc{font-size:14px;color:rgba(255,255,255,.32);line-height:1.7}
.ip{display:inline-flex;align-items:center;gap:6px;padding:5px 12px;background:rgba(255,255,255,.03);border:.5px solid var(--b2);border-radius:100px;font-size:11px;color:var(--tm);margin-top:.75rem;margin-right:6px}
.idot{width:5px;height:5px;border-radius:50%;background:#3cc87a}
.tg{display:grid;grid-template-columns:repeat(3,1fr);gap:1rem;margin-top:2rem}
.test{background:var(--sf);border:.5px solid var(--b);border-radius:12px;padding:1.5rem;transition:border-color .2s}
.test:hover{border-color:var(--b2)}
.tst{color:#f5a623;font-size:12px;letter-spacing:2px;margin-bottom:1rem}
.ttx{font-size:13px;color:rgba(255,255,255,.42);line-height:1.65;margin-bottom:1.25rem;font-style:italic;font-weight:300}
.ttx strong{color:rgba(255,255,255,.7);font-style:normal;font-weight:500}
.tau{display:flex;align-items:center;gap:10px}
.tav{width:32px;height:32px;border-radius:50%;background:var(--sf2);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:500;color:rgba(255,255,255,.35);border:.5px solid var(--b2)}
.tan{font-size:13px;font-weight:500;color:rgba(255,255,255,.65)}
.tam{font-size:11px;color:var(--td)}
.fc2{position:relative;z-index:1;text-align:center;padding:6rem 2rem;border-top:.5px solid var(--b)}
.fcl{font-size:11px;letter-spacing:2px;text-transform:uppercase;color:var(--td);margin-bottom:1.5rem}
.fc2 h2{font-family:'DM Sans',sans-serif;font-size:clamp(2rem,5vw,3.5rem);font-weight:200;letter-spacing:-1.5px;color:#fff;line-height:1.08;margin-bottom:1.25rem}
.fc2 h2 em{font-style:normal;color:var(--red);font-weight:400}
.fc2 p{font-size:16px;color:var(--tm);margin-bottom:2.5rem;font-weight:300}
footer{border-top:.5px solid var(--b);padding:2rem 3rem;display:flex;justify-content:space-between;align-items:center;color:var(--td);font-size:12px}
.fl{font-family:'DM Sans',sans-serif;font-weight:300;font-size:13px;letter-spacing:3px;text-transform:uppercase;color:rgba(255,255,255,.15)}
.fl span{color:rgba(124,58,237,.3)}
@media(max-width:768px){nav{padding:1.25rem 1.5rem}.nc{display:none}.sr{gap:1.5rem}.tg{grid-template-columns:1fr}.dc{grid-template-columns:1fr}.dca{border-right:none;border-bottom:.5px solid var(--b)}.wf{flex-direction:column}footer{flex-direction:column;gap:1rem;text-align:center}.scm{flex-direction:column}.pricing-grid{grid-template-columns:1fr!important}.nav-links{display:none}.story-grid{grid-template-columns:1fr}}
@media(max-width:520px){.ssel{display:none}}
.pricing-grid{display:grid;grid-template-columns:1fr 1fr;gap:1rem;max-width:780px;margin:0 auto}
.plan-card{border-radius:16px;padding:2rem;position:relative;overflow:hidden}
.plan-pro{background:var(--sf);border:.5px solid var(--b2)}
.plan-sentinel{background:linear-gradient(135deg,rgba(124,58,237,.07) 0%,var(--sf) 55%);border:.5px solid rgba(124,58,237,.35)}
.plan-shine{position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,.08),transparent)}
.plan-shine-red{background:linear-gradient(90deg,transparent,rgba(124,58,237,.6),transparent)}
.plan-recommended{position:absolute;top:1.25rem;right:1.25rem;font-size:9px;padding:3px 9px;background:rgba(255,255,255,.05);border:.5px solid rgba(255,255,255,.1);border-radius:100px;color:rgba(255,255,255,.3);letter-spacing:1px;text-transform:uppercase}
.plan-early{display:inline-block;font-size:9px;padding:3px 9px;background:var(--rd);border:.5px solid var(--rb);border-radius:100px;color:var(--red);letter-spacing:1px;text-transform:uppercase;margin-bottom:1rem}
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
.plan-btn{width:100%;padding:12px;border-radius:8px;font-size:13px;font-weight:500;font-family:'DM Sans',sans-serif;cursor:pointer;transition:all .2s}
.plan-btn-secondary{background:transparent;border:.5px solid var(--b2);color:rgba(255,255,255,.55)}
.plan-btn-secondary:hover{border-color:rgba(255,255,255,.25);color:#fff}
.plan-btn-primary{background:var(--red);border:none;color:#fff}
.plan-btn-primary:hover{opacity:.88}
`

const HTML = `
<canvas id="net"></canvas>
<div class="g1"></div><div class="g2"></div>
<nav>
  <div style="display:flex;align-items:center;flex:1">
    <a href="#" style="text-decoration:none" class="logo-block">
      <div class="logo">Cald<span>ra</span></div>
      <div class="logo-sub">Session</div>
    </a>
    <div class="nav-sep"></div>
    <div class="nav-links">
      <a class="nav-link" href="#demo">D&eacute;mo</a>
      <a class="nav-link" href="#alertes">Alertes</a>
      <a class="nav-link" href="#comment">Comment</a>
      <a class="nav-link" href="#avis">Avis</a>
      <a class="nav-link" href="#tarifs">Tarifs</a>
      <a class="nav-link" href="#histoire">Histoire</a>
      <a class="nav-link" href="/support">Support</a>
    </div>
  </div>
  <div class="nr">
    <a href="/login" class="nc" style="text-decoration:none">Connexion</a>
    <a href="/signup" class="bp" style="text-decoration:none;padding:9px 20px;border-radius:4px;font-size:10px;letter-spacing:2px;text-transform:uppercase;font-family:'DM Sans',sans-serif">Commencer &rarr;</a>
  </div>
</nav>
<div class="hero">
  <div class="ey"><div class="eyd"></div>Intelligence comportementale &mdash; Temps r&eacute;el</div>
  <h1>Tu ne vois pas<br>quand tu d&eacute;railles.<br><em>Lui si.</em></h1>
  <p class="hs">Caldra analyse chaque trade en temps r&eacute;el et d&eacute;tecte les comportements qui d&eacute;truisent les sessions &mdash; <em>avant</em> que le tilt, le revenge trading ou l&rsquo;impulsion ne fasse les d&eacute;g&acirc;ts.</p>
  <div class="ww" style="display:flex;flex-direction:column;align-items:center;gap:14px">
    <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
      <a href="/signup" class="bp" style="text-decoration:none;padding:14px 28px;border-radius:8px;font-size:14px;display:inline-block">Commencer gratuitement &rarr;</a>
      <a href="/login" class="nc" style="text-decoration:none;padding:14px 24px;border-radius:8px;font-size:14px;display:inline-block">Se connecter</a>
    </div>
    <div class="ff">
      <span class="fn">14 jours gratuits</span><div class="fs"></div>
      <span class="fn">Sans carte requise</span><div class="fs"></div>
      <span class="fn">Annulable &agrave; tout moment</span>
    </div>
  </div>
</div>
<div class="ss">
  <div class="si">
    <div class="sag">
      <div class="sa" style="background:#1a1a28">T</div><div class="sa" style="background:#1a2018">M</div>
      <div class="sa" style="background:#201818">R</div><div class="sa" style="background:#18201a">K</div>
    </div>
    +78 traders actifs sur Caldra
  </div>
  <div class="ssep"></div>
  <div class="si"><span class="stars">&#9733;&#9733;&#9733;&#9733;&#9733;</span>Beta-testeurs &mdash; 4.9/5</div>
  <div class="ssep"></div>
  <div class="si" style="color:rgba(232,230,224,.25)">Futures &middot; CFD &middot; Forex &middot; Crypto</div>
</div>
<div class="sr">
  <div class="stat"><div class="sn">9<span class="sna">+</span></div><div class="sl">Comportements d&eacute;tect&eacute;s</div></div>
  <div class="stat"><div class="sn">3</div><div class="sl">Niveaux d&rsquo;alerte</div></div>
  <div class="stat"><div class="sn"><span class="sna">&lt;</span>1s</div><div class="sl">Temps de d&eacute;tection</div></div>
  <div class="stat"><div class="sn">100%</div><div class="sl">Automatique</div></div>
</div>

<section id="alertes">
  <div class="stag">Ce qu&rsquo;on d&eacute;tecte</div>
  <div class="stit">Ton empreinte<br>comportementale, en direct.</div>
  <p class="sdesc">Chaque trader a des patterns quand il commence &agrave; d&eacute;railler. Caldra lit les tiens &mdash; et te le dit avant que &ccedil;a co&ucirc;te.</p>
  <div class="scdemo">
    <div class="scdh">
      <div class="scdl">Score de session &middot; Live</div>
      <div class="ssel">
        <button class="sbtn active" onclick="setSess('good',this)">Bonne session</button>
        <button class="sbtn" onclick="setSess('tilting',this)">En tilt</button>
        <button class="sbtn" onclick="setSess('critical',this)">Critique</button>
      </div>
    </div>
    <div class="scm">
      <div class="scc">
        <svg width="110" height="110" viewBox="0 0 110 110">
          <circle cx="55" cy="55" r="46" fill="none" stroke="rgba(255,255,255,.05)" stroke-width="8"/>
          <circle id="sarc" cx="55" cy="55" r="46" fill="none" stroke="#3cc87a" stroke-width="8" stroke-dasharray="289" stroke-dashoffset="43" stroke-linecap="round" style="transition:stroke-dashoffset .6s,stroke .4s"/>
        </svg>
        <div class="scv"><div class="scn" id="snum" style="color:#3cc87a">85</div><div class="scl">/ 100</div></div>
      </div>
      <div class="scb">
        <div class="sci"><div class="scin">Sizing ma&icirc;tris&eacute;</div><div class="scbt"><div class="scbf" id="bs" style="width:90%;background:#3cc87a"></div></div><div class="sciv" id="vs">90</div></div>
        <div class="sci"><div class="scin">Respect du risk</div><div class="scbt"><div class="scbf" id="br" style="width:88%;background:#3cc87a"></div></div><div class="sciv" id="vr">88</div></div>
        <div class="sci"><div class="scin">Contr&ocirc;le re-entr&eacute;es</div><div class="scbt"><div class="scbf" id="be" style="width:75%;background:#ffc800"></div></div><div class="sciv" id="ve">75</div></div>
        <div class="sci"><div class="scin">Drawdown journalier</div><div class="scbt"><div class="scbf" id="bd" style="width:95%;background:#3cc87a"></div></div><div class="sciv" id="vd">95</div></div>
        <div class="sci"><div class="scin">Discipline horaire</div><div class="scbt"><div class="scbf" id="bt" style="width:82%;background:#3cc87a"></div></div><div class="sciv" id="vt">82</div></div>
        <div style="margin-top:.5rem">
          <span class="scst" id="sst" style="background:rgba(60,200,122,.08);border-color:rgba(60,200,122,.2);color:#3cc87a">
            <span id="sdot" style="width:6px;height:6px;border-radius:50%;background:#3cc87a;display:inline-block"></span>
            <span id="stxt">Session saine &mdash; continue</span>
          </span>
        </div>
      </div>
    </div>
  </div>
  <div class="patterns-carousel-wrap">
    <div class="patterns-carousel" id="pcarousel">
      <div class="bc"><div class="bi"><svg viewBox="0 0 24 24"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg></div><div class="bn">Revenge sizing</div><div class="bd">Taille qui augmente apr&egrave;s une perte &mdash; chemin le plus court pour exploser une journ&eacute;e.</div></div>
      <div class="bc"><div class="bi"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></div><div class="bn">R&egrave;gle de risque d&eacute;pass&eacute;e</div><div class="bd">D&eacute;passer ton risk par trade &mdash; tes r&egrave;gles existent pour une raison.</div></div>
      <div class="bc"><div class="bi"><svg viewBox="0 0 24 24"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.4"/></svg></div><div class="bn">Re-entr&eacute;e imm&eacute;diate</div><div class="bd">Reprendre un trade moins de 2 min apr&egrave;s la sortie &mdash; impulsion, pas analyse.</div></div>
      <div class="bc"><div class="bi"><svg viewBox="0 0 24 24"><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/></svg></div><div class="bn">S&eacute;rie de pertes</div><div class="bd">3 pertes cons&eacute;cutives &mdash; le seuil o&ugrave; l&rsquo;&eacute;motion prend le dessus.</div></div>
      <div class="bc"><div class="bi"><svg viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg></div><div class="bn">Alerte drawdown</div><div class="bd">Perte journali&egrave;re qui approche ta limite &mdash; configurable selon ton capital.</div></div>
      <div class="bc" style="position:relative"><span style="position:absolute;top:.75rem;right:.75rem;font-size:8px;padding:2px 7px;background:var(--rd);border:.5px solid var(--rb);border-radius:100px;color:var(--red);letter-spacing:.5px;text-transform:uppercase">Sentinel</span><div class="bi"><svg viewBox="0 0 24 24"><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></svg></div><div class="bn">Trade pendant les news</div><div class="bd">Entr&eacute;e dans les 5 min d&rsquo;un &eacute;v&eacute;nement macro &mdash; news + position = casino.</div></div>
      <div class="bc"><div class="bi"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div><div class="bn">Hors fen&ecirc;tre de session</div><div class="bd">Trades en dehors de tes horaires d&eacute;finis &mdash; fatigue ou ennui.</div></div>
      <div class="bc"><div class="bi"><svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg></div><div class="bn">Stop non respect&eacute;</div><div class="bd">Position tenue au-del&agrave; de ton stop habituel &mdash; l&rsquo;espoir n&rsquo;est pas une strat&eacute;gie.</div></div>
      <div class="bc"><div class="bi"><svg viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg></div><div class="bn">Suractivit&eacute; de session</div><div class="bd">Trop de trades par rapport &agrave; ta moyenne &mdash; quand tu trades plus, tu trades souvent pire.</div></div>
    </div>
    <div class="carousel-fade-right"></div>
  </div>
</section>

<div class="sdiv"></div>

<section id="demo">
  <div class="stag">D&eacute;mo interactive</div>
  <div class="stit">Vois Caldra en action<br>sur une vraie session.</div>
  <p class="sdesc">Simule un encha&icirc;nement de trades et observe comment Caldra d&eacute;tecte les patterns en temps r&eacute;el.</p>
  <div class="dw">
    <div class="dtb">
      <div class="dd ddr"></div><div class="dd ddy"></div><div class="dd ddg"></div>
      <div class="dtit">Caldra &mdash; Session NQ Futures &mdash; 30/03/2026</div>
    </div>
    <div class="dc">
      <div class="dca">
        <div class="dcl">P&amp;L de session</div>
        <div class="pnl"><div class="pv" id="dpnl" style="color:#3cc87a">+&euro;240</div><div class="pc" id="dpc">Session en cours</div></div>
        <div class="cc"><canvas id="pc"></canvas></div>
        <div class="tll">Derniers trades</div>
        <div id="tlog">
          <div class="ti"><span class="tt">09:32</span><span class="tinst">NQ Long</span><span class="tp">+&euro;140</span></div>
          <div class="ti"><span class="tt">09:51</span><span class="tinst">NQ Short</span><span class="tp">+&euro;100</span></div>
        </div>
      </div>
      <div class="daa">
        <div class="dal">Alertes Caldra</div>
        <div class="al" id="ac"><div style="font-size:12px;color:var(--td);padding:.5rem 0">Aucune alerte &mdash; session saine.</div></div>
        <button class="dsb" id="sb" onclick="sim()">&rarr; Simuler le trade suivant</button>
      </div>
    </div>
  </div>
</section>

<div class="sdiv"></div>

<section id="comment">
  <div class="stag">Comment &ccedil;a marche</div>
  <div class="stit">Configure une fois.<br>Il veille toujours.</div>
  <p class="sdesc">Aucune saisie manuelle. Aucune discipline suppl&eacute;mentaire. Caldra se connecte &agrave; ta plateforme et fait le reste.</p>
  <div class="steps-timeline">
    <div class="step-tl">
      <div class="step-tl-left"><div class="step-tl-num">01</div><div class="step-tl-line"></div></div>
      <div class="step-tl-right">
        <div class="step-tl-label">Connecte</div>
        <div class="step-tl-title">Ta plateforme de trading</div>
        <div class="step-tl-desc">Connexion directe via WebSocket. Tes trades remontent automatiquement &mdash; rien &agrave; saisir manuellement.</div>
        <div style="margin-top:.875rem"><span class="ip"><span class="idot"></span>MT5</span><span class="ip"><span class="idot"></span>Tradovate</span><span class="ip" style="opacity:.35">+ &agrave; venir</span></div>
      </div>
    </div>
    <div class="step-tl">
      <div class="step-tl-left"><div class="step-tl-num">02</div><div class="step-tl-line"></div></div>
      <div class="step-tl-right">
        <div class="step-tl-label">Configure</div>
        <div class="step-tl-title">Tes r&egrave;gles et limites</div>
        <div class="step-tl-desc">Horaires de session, risk par trade, drawdown max. Tes r&egrave;gles, tes standards &mdash; pas des valeurs g&eacute;n&eacute;riques.</div>
      </div>
    </div>
    <div class="step-tl">
      <div class="step-tl-left"><div class="step-tl-num">03</div><div class="step-tl-line"></div></div>
      <div class="step-tl-right">
        <div class="step-tl-label">Trade</div>
        <div class="step-tl-title">Alerte imm&eacute;diate si &ccedil;a d&eacute;raille</div>
        <div class="step-tl-desc">D&egrave;s qu&rsquo;un pattern dangereux est d&eacute;tect&eacute;, tu re&ccedil;ois une notification push + desktop &mdash; en moins d&rsquo;une seconde.</div>
      </div>
    </div>
  </div>
</section>

<div class="sdiv"></div>

<section id="avis">
  <div class="stag">Ce qu&rsquo;ils disent</div>
  <div class="stit">Test&eacute; par des vrais traders.</div>
  <p class="sdesc">B&ecirc;ta ferm&eacute;e &mdash; retours des premiers utilisateurs sur leurs sessions r&eacute;elles.</p>
  <div class="tg">
    <div class="test"><div class="tst">&#9733;&#9733;&#9733;&#9733;&#9733;</div><p class="ttx">&laquo;&nbsp;J&rsquo;ai claqu&eacute; trois semaines de gains en une apr&egrave;s-midi &agrave; cause du tilt. C&rsquo;est b&ecirc;te parce que je le savais, mais j&rsquo;arrivais pas &agrave; m&rsquo;arr&ecirc;ter. Ce genre d&rsquo;outil j&rsquo;en avais besoin depuis longtemps.&nbsp;&raquo;</p><div class="tau"><div class="tav">TM</div><div><div class="tan">Thomas M.</div><div class="tam">Trader Futures &middot; 3 ans</div></div></div></div>
    <div class="test"><div class="tst">&#9733;&#9733;&#9733;&#9733;&#9733;</div><p class="ttx">&laquo;&nbsp;Je savais m&ecirc;me pas que je faisais du revenge sizing. &Ccedil;a se voyait pas de l&rsquo;int&eacute;rieur. H&acirc;te que &ccedil;a sorte.&nbsp;&raquo;</p><div class="tau"><div class="tav">KF</div><div><div class="tan">KrazoliFX</div><div class="tam">Trader CFD/Forex &middot; Paris</div></div></div></div>
    <div class="test"><div class="tst">&#9733;&#9733;&#9733;&#9733;&#9734;</div><p class="ttx">&laquo;&nbsp;J&rsquo;utilise d&eacute;j&agrave; TradeZella pour analyser mes sessions mais c&rsquo;est toujours apr&egrave;s coup. Avec la b&ecirc;ta Caldra l&rsquo;alerte est arriv&eacute;e pendant ma session. C&rsquo;est pas du tout la m&ecirc;me chose.&nbsp;&raquo;</p><div class="tau"><div class="tav">KL</div><div><div class="tan">Kevin L.</div><div class="tam">Trader Futures &middot; Lyon</div></div></div></div>
  </div>
</section>

<div class="sdiv"></div>

<section id="tarifs">
  <div class="stag">Tarif</div>
  <div class="stit">Simple.<br>Rentabilis&eacute; au premier trade &eacute;vit&eacute;.</div>
  <p class="sdesc">14 jours d&rsquo;essai gratuit. Pas de carte requise.</p>

  <div class="pricing-grid">

    <div class="plan-card plan-pro">
      <div class="plan-shine"></div>
      <div class="plan-label">Pro</div>
      <div class="plan-price"><sup>&euro;</sup>19<sub>/mois</sub></div>
      <div class="plan-note">14 jours gratuits &middot; Sans carte requise</div>
      <div class="plan-tagline">Surveillance comportementale compl&egrave;te. Alertes imm&eacute;diates d&egrave;s qu&rsquo;un pattern dangereux est d&eacute;tect&eacute;.</div>
      <ul class="plan-features">
        <li><div class="pfc pfc-dim"><svg viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3"/></svg></div>8 d&eacute;tections comportementales</li>
        <li><div class="pfc pfc-dim"><svg viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3"/></svg></div>Alertes temps r&eacute;el (push + desktop)</li>
        <li><div class="pfc pfc-dim"><svg viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3"/></svg></div>Dashboard comportemental</li>
        <li><div class="pfc pfc-dim"><svg viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3"/></svg></div>Compatible MT5 &amp; Tradovate</li>
        <li><div class="pfc pfc-dim"><svg viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3"/></svg></div>Historique &amp; analytics 30 jours</li>
        <li><div class="pfc pfc-dim"><svg viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3"/></svg></div>Seuils configurables</li>
      </ul>
      <a href="/signup" class="plan-btn plan-btn-secondary" style="display:block;text-align:center;text-decoration:none;padding:12px;border-radius:8px">Commencer gratuit &rarr;</a>
    </div>

    <div class="plan-card plan-sentinel">
      <div class="plan-shine plan-shine-red"></div>
      <div class="plan-label plan-label-red">Sentinel</div>
      <div class="plan-price"><sup>&euro;</sup>39<sub>/mois</sub></div>
      <div class="plan-note">14 jours gratuits &middot; Sans carte requise</div>
      <div class="plan-tagline">Tout le plan Pro, augment&eacute; d&rsquo;un coach IA actif. Analyse, recommandations et debriefing &agrave; chaque session.</div>
      <ul class="plan-features">
        <li class="plan-divider"><div class="pfc pfc-dim"><svg viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3"/></svg></div><span style="color:rgba(232,230,224,.3)">Tout le plan Pro, plus&nbsp;:</span></li>
        <li class="plan-highlight"><div class="pfc pfc-red"><svg viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3"/></svg></div><strong>9e d&eacute;tection&nbsp;: Trade pendant les news</strong></li>
        <li class="plan-highlight"><div class="pfc pfc-red"><svg viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3"/></svg></div><strong>Coach IA pendant la session</strong></li>
        <li class="plan-highlight"><div class="pfc pfc-red"><svg viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3"/></svg></div><strong>Debriefing automatique post-session</strong></li>
        <li class="plan-highlight"><div class="pfc pfc-red"><svg viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3"/></svg></div><strong>Analyse des patterns r&eacute;currents</strong></li>
        <li class="plan-highlight"><div class="pfc pfc-red"><svg viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3"/></svg></div><strong>Historique &amp; analytics 180 jours</strong></li>
        <li class="plan-highlight"><div class="pfc pfc-red"><svg viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3"/></svg></div><strong>Support prioritaire</strong></li>
      </ul>
      <a href="/signup" class="plan-btn plan-btn-primary" style="display:block;text-align:center;text-decoration:none;padding:12px;border-radius:8px">Commencer avec Sentinel &rarr;</a>
    </div>

  </div>

  <p style="text-align:center;margin-top:2rem;font-size:13px;color:var(--td);font-style:italic">14 jours d&rsquo;essai gratuit sur les deux plans &middot; Pas de carte requise &middot; Annulable &agrave; tout moment</p>
</section>

<div class="sdiv"></div>

<section id="histoire" class="story-section">
  <div class="stag">L&rsquo;histoire de Caldra Session</div>
  <div class="stit">Une conviction.<br>Un outil.</div>

  <div style="max-width:620px;margin-top:2.5rem;display:flex;flex-direction:column;gap:1.5rem">
    <p style="font-size:16px;color:rgba(232,230,224,.75);line-height:1.9;font-weight:300">
      Caldra Session est n&eacute; d&rsquo;une certitude simple&nbsp;: la psychologie de trader ne s&rsquo;apprend pas. Elle se construit. Lentement. Sous les graphiques. Dans la pression des positions ouvertes, dans le silence des pertes encaiss&eacute;es, dans les d&eacute;cisions prises &agrave; l&rsquo;instinct quand la raison n&rsquo;a plus la main.
    </p>
    <p style="font-size:16px;color:rgba(232,230,224,.75);line-height:1.9;font-weight:300">
      On peut lire. On peut comprendre. On peut m&eacute;moriser chaque biais cognitif, chaque pattern comportemental. Et se retrouver exactement dans le m&ecirc;me &eacute;tat, la prochaine session, face au m&ecirc;me chart, &agrave; refaire exactement la m&ecirc;me chose. Parce qu&rsquo;on reste des &ecirc;tres humains, avec un syst&egrave;me &eacute;motionnel d&rsquo;une complexit&eacute; infinie, d&eacute;pendant de variables qu&rsquo;aucune lecture ne peut anticiper.
    </p>
    <p style="font-size:16px;color:rgba(232,230,224,.75);line-height:1.9;font-weight:300">
      La maturit&eacute; se construit avec les ann&eacute;es. Elle est propre &agrave; chacun. Elle prend le temps qu&rsquo;elle prend. Et vouloir aller contre cette r&eacute;alit&eacute;, tout contr&ocirc;ler, tout corriger d&rsquo;un coup, c&rsquo;est souvent ce qui co&ucirc;te le plus cher.
    </p>
    <p style="font-size:16px;color:rgba(232,230,224,.75);line-height:1.9;font-weight:300">
      Caldra Session n&rsquo;est pas l&agrave; pour changer la nature humaine. Il est l&agrave; pour ce moment pr&eacute;cis, celui o&ugrave; quelque chose d&eacute;raille, de l&rsquo;int&eacute;rieur, avant m&ecirc;me qu&rsquo;on le r&eacute;alise. Ce moment o&ugrave; un signal ext&eacute;rieur change tout.
    </p>
    <p style="font-size:18px;color:rgba(255,255,255,.9);line-height:1.5;font-weight:200;font-style:italic;letter-spacing:-.3px;margin-top:.5rem">
      La discipline ne se force pas. <em style="color:var(--red);font-style:normal">Elle se prot&egrave;ge.</em>
    </p>
  </div>
</section>

<div class="fc2">
  <div class="fcl">Prot&egrave;ge tes sessions. D&egrave;s maintenant.</div>
  <h2>Ton prochain tilt<br><em>peut &ecirc;tre le dernier.</em></h2>
  <p>14 jours gratuits. Sans carte. Annulable &agrave; tout moment.</p>
  <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-top:0">
    <a href="/signup" class="bp" style="text-decoration:none;padding:14px 32px;border-radius:8px;font-size:14px;display:inline-block;font-weight:500">Commencer gratuitement &rarr;</a>
    <a href="/login" class="nc" style="text-decoration:none;padding:14px 24px;border-radius:8px;font-size:14px;display:inline-block">D&eacute;j&agrave; un compte ?</a>
  </div>
</div>


<footer>
  <div class="fl">Cald<span>ra</span></div>
  <div style="display:flex;gap:2rem;align-items:center">
    <a href="/mentions-legales" style="color:rgba(232,230,224,.2);font-size:11px;text-decoration:none;letter-spacing:.5px">CGU</a>
    <a href="/confidentialite" style="color:rgba(232,230,224,.2);font-size:11px;text-decoration:none;letter-spacing:.5px">Confidentialit&eacute;</a>
    <a href="/support" style="color:rgba(232,230,224,.2);font-size:11px;text-decoration:none;letter-spacing:.5px">Support</a>
  </div>
  <div>contact@getcaldra.com</div>
</footer>
<script id="caldra-landing-js">
var SX={
  good:{sc:85,cl:'#3cc87a',s:90,r:88,e:75,d:95,t:82,bg:'rgba(60,200,122,.08)',bc:'rgba(60,200,122,.2)',c:'#3cc87a',tx:'Session saine \u2014 continue'},
  tilting:{sc:42,cl:'#dc8200',s:35,r:48,e:20,d:65,t:70,bg:'rgba(220,130,0,.08)',bc:'rgba(220,130,0,.2)',c:'#dc8200',tx:'Attention \u2014 signaux de tilt d\u00e9tect\u00e9s'},
  critical:{sc:12,cl:'#dc3218',s:5,r:10,e:8,d:15,t:30,bg:'rgba(220,50,30,.1)',bc:'rgba(220,50,30,.25)',c:'#dc3218',tx:'STOP \u2014 Ferme la plateforme maintenant'}
};
function bc(v){return v>=70?'#3cc87a':v>=40?'#ffc800':'#dc3218'}
function setSess(tp,btn){
  document.querySelectorAll('.sbtn').forEach(function(b){b.classList.remove('active')});
  btn.classList.add('active');
  var s=SX[tp],C=289;
  var arc=document.getElementById('sarc');
  arc.style.strokeDashoffset=C-(C*s.sc/100);arc.style.stroke=s.cl;
  var n=document.getElementById('snum');n.textContent=s.sc;n.style.color=s.cl;
  [['s',s.s],['r',s.r],['e',s.e],['d',s.d],['t',s.t]].forEach(function(pair){
    var k=pair[0],v=pair[1];
    document.getElementById('b'+k).style.width=v+'%';
    document.getElementById('b'+k).style.background=bc(v);
    document.getElementById('v'+k).textContent=v;
  });
  var st=document.getElementById('sst');
  st.style.background=s.bg;st.style.borderColor=s.bc;st.style.color=s.c;
  document.getElementById('sdot').style.background=s.c;
  document.getElementById('stxt').textContent=s.tx;
}
window.setSess=setSess;
var pd=[0,140,240],simStep=0,ch;
var SCN=[
  {time:'10:14',side:'NQ Short',pnl:-180,a:null},
  {time:'10:17',side:'NQ Long (re-entr\u00e9e)',pnl:-95,a:{l:1,ti:'Re-entr\u00e9e imm\u00e9diate d\u00e9tect\u00e9e',su:'Trade ouvert 3 min apr\u00e8s la sortie. Prends une pause.'}},
  {time:'10:31',side:'NQ Long (sizing \u00d72)',pnl:-210,a:{l:2,ti:'Revenge sizing + 3 pertes cons\u00e9cutives',su:'Taille doubl\u00e9e apr\u00e8s s\u00e9rie de pertes. Pause fortement recommand\u00e9e.'}},
  {time:'10:33',side:'NQ Long',pnl:-320,a:{l:3,ti:'STOP \u2014 Ferme la plateforme.',su:'Drawdown critique + s\u00e9rie + revenge sizing simultan\u00e9s.'}}
];
var pcCanvas=document.getElementById('pc');
if(pcCanvas){
  var cx=pcCanvas.getContext('2d');
  var existingChart=Chart.getChart(cx);
  if(existingChart)existingChart.destroy();
  ch=new Chart(cx,{type:'line',data:{labels:['Ouv.','09:32','09:51'],datasets:[{data:pd,borderColor:'#3cc87a',borderWidth:2,pointRadius:3,pointBackgroundColor:'#3cc87a',fill:true,backgroundColor:'rgba(60,200,122,.06)',tension:.3}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{grid:{color:'rgba(255,255,255,.04)'},ticks:{color:'rgba(255,255,255,.2)',font:{size:10}}},y:{grid:{color:'rgba(255,255,255,.04)'},ticks:{color:'rgba(255,255,255,.2)',font:{size:10},callback:function(v){return '\u20ac'+v}}}}}});
}
function sim(){
  if(simStep>=SCN.length){resetD();return}
  var t=SCN[simStep];
  var np=pd[pd.length-1]+t.pnl;
  pd.push(np);ch.data.labels.push(t.time);
  var col=np>=0?'#3cc87a':'#e05050';
  ch.data.datasets[0].borderColor=col;ch.data.datasets[0].pointBackgroundColor=col;
  ch.data.datasets[0].backgroundColor=np>=0?'rgba(60,200,122,.06)':'rgba(224,80,80,.06)';
  ch.data.datasets[0].data=pd;ch.update();
  var pe=document.getElementById('dpnl');
  pe.textContent=(np>=0?'+':'')+'\u20ac'+np;pe.style.color=col;
  document.getElementById('dpc').textContent=t.time+' \u2014 '+t.side;
  var log=document.getElementById('tlog');
  var el=document.createElement('div');el.className='ti';
  el.innerHTML='<span class="tt">'+t.time+'</span><span class="tinst">'+t.side+'</span><span class="'+(t.pnl>=0?'tp':'tn')+'">'+(t.pnl>=0?'+':'')+'\u20ac'+t.pnl+'</span>';
  log.appendChild(el);
  if(t.a){
    var c=document.getElementById('ac');
    if(c.querySelector('div[style]'))c.innerHTML='';
    var ae=document.createElement('div');ae.className='ai al'+t.a.l;
    ae.innerHTML='<div class="adot dl'+t.a.l+'"></div><div class="ab"><div class="at">'+t.a.ti+'</div><div class="as">'+t.a.su+'</div></div><div class="abg bl'+t.a.l+'">\u00c9ch. '+t.a.l+'</div>';
    c.appendChild(ae);
  }
  simStep++;
  if(simStep>=SCN.length)document.getElementById('sb').textContent='\u21ba Recommencer la simulation';
}
window.sim=sim;
function resetD(){
  simStep=0;pd=[0,140,240];
  ch.data.labels=['Ouv.','09:32','09:51'];
  ch.data.datasets[0].data=pd;
  ch.data.datasets[0].borderColor='#3cc87a';
  ch.data.datasets[0].pointBackgroundColor='#3cc87a';
  ch.data.datasets[0].backgroundColor='rgba(60,200,122,.06)';
  ch.update();
  document.getElementById('dpnl').textContent='+\u20ac240';document.getElementById('dpnl').style.color='#3cc87a';
  document.getElementById('dpc').textContent='Session en cours';
  document.getElementById('tlog').innerHTML='<div class="ti"><span class="tt">09:32</span><span class="tinst">NQ Long</span><span class="tp">+\u20ac140</span></div><div class="ti"><span class="tt">09:51</span><span class="tinst">NQ Short</span><span class="tp">+\u20ac100</span></div>';
  document.getElementById('ac').innerHTML='<div style="font-size:12px;color:var(--td);padding:.5rem 0">Aucune alerte \u2014 session saine.</div>';
  document.getElementById('sb').textContent='\u2192 Simuler le trade suivant';
}
async function sendContact(){
  var name=document.getElementById('c-name').value;
  var email=document.getElementById('c-email').value;
  var subject=document.getElementById('c-subject').value;
  var msg=document.getElementById('c-msg').value;
  if(!email||!msg){return;}
  var btn=document.getElementById('c-btn');
  btn.textContent='Envoi...';btn.style.opacity='.6';btn.disabled=true;
  try{
    var res=await fetch('https://formspree.io/f/mdapwkjw',{
      method:'POST',
      headers:{'Accept':'application/json','Content-Type':'application/json'},
      body:JSON.stringify({name:name,email:email,subject:subject,message:msg})
    });
    if(res.ok){
      document.getElementById('c-success').style.display='block';
      document.getElementById('c-error').style.display='none';
      document.getElementById('c-name').value='';
      document.getElementById('c-email').value='';
      document.getElementById('c-subject').value='';
      document.getElementById('c-msg').value='';
      btn.textContent='Envoy\u00e9 \u2713';
    } else {
      throw new Error();
    }
  } catch(e){
    document.getElementById('c-error').style.display='block';
    btn.textContent='Envoyer \u2192';btn.style.opacity='1';btn.disabled=false;
  }
}
window.sendContact=sendContact;
var car=document.getElementById('pcarousel');
if(car){
  var isDown=false,startX,scrollLeft;
  car.addEventListener('mousedown',function(e){isDown=true;car.classList.add('dragging');startX=e.pageX-car.offsetLeft;scrollLeft=car.scrollLeft});
  car.addEventListener('mouseleave',function(){isDown=false;car.classList.remove('dragging')});
  car.addEventListener('mouseup',function(){isDown=false;car.classList.remove('dragging')});
  car.addEventListener('mousemove',function(e){if(!isDown)return;e.preventDefault();var x=e.pageX-car.offsetLeft;car.scrollLeft=scrollLeft-(x-startX)*1.2});
  var txStart=0,tyStart=0,tsl=0;
  car.addEventListener('touchstart',function(e){txStart=e.touches[0].pageX;tyStart=e.touches[0].pageY;tsl=car.scrollLeft},{passive:true});
  car.addEventListener('touchmove',function(e){var dx=e.touches[0].pageX-txStart,dy=e.touches[0].pageY-tyStart;if(Math.abs(dx)>Math.abs(dy)){e.preventDefault();car.scrollLeft=tsl-dx;}},{passive:false});
}
</script>
`

const NET_JS = `(function(){
  var cv=document.getElementById('net');
  if(!cv)return;
  var ctx=cv.getContext('2d');
  var RED='rgba(124,58,237,',WHT='rgba(255,255,255,';
  var W,H,pts,N_BASE=55,MAX_DIST=160,SPEED=0.28;
  function resize(){W=cv.width=window.innerWidth;H=cv.height=window.innerHeight;}
  function mkPts(){var n=Math.round(N_BASE*(W/1440));pts=Array.from({length:Math.max(30,n)},function(){return{x:Math.random()*W,y:Math.random()*H,vx:(Math.random()-.5)*SPEED,vy:(Math.random()-.5)*SPEED,r:Math.random()<.06?2.2:1.1,red:Math.random()<.06};});}
  function draw(){ctx.clearRect(0,0,W,H);for(var i=0;i<pts.length;i++){for(var j=i+1;j<pts.length;j++){var dx=pts[i].x-pts[j].x,dy=pts[i].y-pts[j].y,d=Math.sqrt(dx*dx+dy*dy);if(d<MAX_DIST){var a=(1-d/MAX_DIST)*.18;ctx.beginPath();ctx.moveTo(pts[i].x,pts[i].y);ctx.lineTo(pts[j].x,pts[j].y);ctx.strokeStyle=(pts[i].red||pts[j].red)?RED+a*.7+')':WHT+a+')';ctx.lineWidth=.6;ctx.stroke();}}}for(var k=0;k<pts.length;k++){ctx.beginPath();ctx.arc(pts[k].x,pts[k].y,pts[k].r,0,Math.PI*2);ctx.fillStyle=pts[k].red?RED+'.55)':WHT+'.25)';ctx.fill();}}
  function move(){for(var k=0;k<pts.length;k++){pts[k].x+=pts[k].vx;pts[k].y+=pts[k].vy;if(pts[k].x<0||pts[k].x>W)pts[k].vx*=-1;if(pts[k].y<0||pts[k].y>H)pts[k].vy*=-1;}}
  function loop(){move();draw();requestAnimationFrame(loop);}
  resize();mkPts();loop();
  window.addEventListener('resize',function(){resize();mkPts();});
})();`

export default function Home() {
  useEffect(() => {
    // Réseau de points — démarre immédiatement, sans attendre Chart.js
    document.getElementById('caldra-net')?.remove()
    const netScript = document.createElement('script')
    netScript.id = 'caldra-net'
    netScript.textContent = NET_JS
    document.body.appendChild(netScript)

    function runInit() {
      const src = document.getElementById('caldra-landing-js')?.textContent
      if (!src) return
      document.getElementById('caldra-landing-init')?.remove()
      const s = document.createElement('script')
      s.id = 'caldra-landing-init'
      s.textContent = src
      document.body.appendChild(s)
    }

    if ((window as any).Chart) {
      runInit()
    } else {
      const chartScript = document.createElement('script')
      chartScript.id = 'caldra-chartjs'
      chartScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.0/chart.umd.min.js'
      chartScript.onload = runInit
      document.head.appendChild(chartScript)
    }

    return () => {
      document.getElementById('caldra-net')?.remove()
      document.getElementById('caldra-chartjs')?.remove()
      document.getElementById('caldra-landing-init')?.remove()
    }
  }, [])

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div dangerouslySetInnerHTML={{ __html: HTML }} />
    </>
  )
}
