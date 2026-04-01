'use client'

import { useEffect, useRef } from 'react'

const CSS = `
*{margin:0;padding:0;box-sizing:border-box}
:root{--red:#dc503c;--rd:rgba(220,80,60,.1);--rb:rgba(220,80,60,.25);--bg:#08080d;--sf:#0f0f16;--sf2:#141420;--b:rgba(255,255,255,.07);--b2:rgba(255,255,255,.12);--tx:#e8e6e0;--tm:rgba(232,230,224,.45);--td:rgba(232,230,224,.2)}
body{font-family:'DM Sans',sans-serif;background:var(--bg);color:var(--tx);min-height:100vh;overflow-x:hidden}
body::before{content:'';position:fixed;inset:0;background-image:linear-gradient(rgba(255,255,255,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.025) 1px,transparent 1px);background-size:64px 64px;pointer-events:none;z-index:0}
.g1{position:fixed;width:700px;height:700px;border-radius:50%;background:radial-gradient(circle,rgba(220,80,60,.07) 0%,transparent 65%);top:-250px;left:50%;transform:translateX(-50%);pointer-events:none;z-index:0}
.g2{position:fixed;width:400px;height:400px;border-radius:50%;background:radial-gradient(circle,rgba(180,50,220,.04) 0%,transparent 65%);bottom:20%;right:-100px;pointer-events:none;z-index:0}
nav{position:relative;z-index:10;display:flex;justify-content:space-between;align-items:center;padding:1.5rem 3rem;border-bottom:.5px solid var(--b)}
.logo{font-family:'Syne',sans-serif;font-weight:800;font-size:18px;letter-spacing:-.5px;color:#fff}
.logo span{color:var(--red)}
.nr{display:flex;align-items:center;gap:1rem}
.nb{font-size:10px;padding:4px 12px;border:.5px solid var(--rb);border-radius:100px;color:var(--red);letter-spacing:1.5px;text-transform:uppercase}
.nc{font-size:13px;font-weight:500;padding:8px 18px;background:var(--red);border:none;border-radius:6px;color:#fff;cursor:pointer;font-family:'DM Sans',sans-serif;transition:opacity .2s}
.nc:hover{opacity:.85}
.hero{position:relative;z-index:1;text-align:center;padding:7rem 2rem 4rem;max-width:860px;margin:0 auto}
.ey{display:inline-flex;align-items:center;gap:8px;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:rgba(220,80,60,.75);margin-bottom:2.25rem;padding:5px 14px;border:.5px solid var(--rb);border-radius:100px;background:var(--rd)}
.eyd{width:5px;height:5px;border-radius:50%;background:var(--red);animation:pulse 2s ease-in-out infinite}
@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(.7)}}
h1{font-family:'Syne',sans-serif;font-size:clamp(2.8rem,6.5vw,4.8rem);font-weight:800;line-height:1.04;letter-spacing:-2.5px;color:#fff;margin-bottom:1.5rem}
h1 em{font-style:normal;color:var(--red)}
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
.sn{font-family:'Syne',sans-serif;font-size:32px;font-weight:800;color:#fff;letter-spacing:-1.5px;line-height:1}
.sna{color:var(--red)}
.sl{font-size:12px;color:var(--td);margin-top:5px}
section{position:relative;z-index:1;max-width:940px;margin:0 auto;padding:5rem 2rem}
.stag{font-size:11px;letter-spacing:2px;text-transform:uppercase;color:rgba(220,80,60,.6);margin-bottom:1rem}
.stit{font-family:'Syne',sans-serif;font-size:clamp(1.9rem,4vw,2.9rem);font-weight:700;letter-spacing:-1.5px;color:#fff;margin-bottom:1rem;line-height:1.08}
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
.scn{font-family:'Syne',sans-serif;font-size:32px;font-weight:800;letter-spacing:-1px;line-height:1;transition:color .4s}
.scl{font-size:10px;text-transform:uppercase;letter-spacing:1px;color:var(--td);margin-top:2px}
.scb{display:flex;flex-direction:column;gap:10px;flex:1}
.sci{display:flex;align-items:center;gap:10px}
.scin{font-size:12px;color:var(--tm);width:155px;flex-shrink:0}
.scbt{flex:1;height:4px;background:rgba(255,255,255,.06);border-radius:2px;overflow:hidden}
.scbf{height:100%;border-radius:2px;transition:width .6s cubic-bezier(.4,0,.2,1),background .4s}
.sciv{font-size:11px;width:28px;text-align:right;color:var(--td)}
.scst{display:inline-flex;align-items:center;gap:6px;font-size:12px;padding:4px 12px;border-radius:100px;border:.5px solid}
.bg{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:var(--b);border:.5px solid var(--b);border-radius:14px;overflow:hidden}
.bc{background:var(--sf);padding:1.5rem;transition:background .2s}
.bc:hover{background:var(--sf2)}
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
.pv{font-family:'Syne',sans-serif;font-size:36px;font-weight:700;letter-spacing:-1.5px;transition:color .3s}
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
.hg{display:grid;grid-template-columns:repeat(3,1fr);gap:1rem;margin-top:2rem}
.step{padding:1.5rem;background:var(--sf);border:.5px solid var(--b);border-radius:12px;transition:border-color .2s}
.step:hover{border-color:var(--b2)}
.stn{font-family:'Syne',sans-serif;font-size:11px;font-weight:700;color:var(--red);letter-spacing:1px;margin-bottom:1.25rem;opacity:.7;text-transform:uppercase}
.stt{font-size:15px;font-weight:500;color:#fff;margin-bottom:.5rem}
.std{font-size:13px;color:rgba(255,255,255,.28);line-height:1.65}
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
.pc2{background:linear-gradient(135deg,rgba(220,80,60,.04) 0%,var(--sf) 60%);border:.5px solid rgba(220,80,60,.3);border-radius:16px;padding:2.5rem;max-width:440px;margin:0 auto;position:relative;overflow:hidden}
.pc2::before{content:'';position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(220,80,60,.5),transparent)}
.pbg{display:inline-block;padding:3px 10px;background:var(--rd);border:.5px solid var(--rb);border-radius:100px;font-size:10px;color:var(--red);letter-spacing:1px;text-transform:uppercase;margin-bottom:1.5rem}
.pp{font-family:'Syne',sans-serif;font-size:48px;font-weight:800;color:#fff;letter-spacing:-2px;line-height:1;margin-bottom:.25rem}
.pp sup{font-size:22px;vertical-align:super;letter-spacing:0}
.pp sub{font-size:15px;font-weight:400;color:var(--tm);letter-spacing:0}
.pn{font-size:12px;color:var(--td);margin-bottom:2rem}
.pf{list-style:none;margin-bottom:2rem}
.pf li{font-size:13px;color:rgba(255,255,255,.45);padding:.6rem 0;border-bottom:.5px solid rgba(255,255,255,.04);display:flex;align-items:center;gap:10px}
.pf li:last-child{border-bottom:none}
.fc{width:16px;height:16px;border-radius:4px;background:var(--rd);border:.5px solid var(--rb);display:flex;align-items:center;justify-content:center;flex-shrink:0}
.fc svg{width:9px;height:9px;stroke:var(--red);fill:none;stroke-width:2.5;stroke-linecap:round;stroke-linejoin:round}
.bcp{width:100%;padding:13px;background:var(--red);border:none;border-radius:8px;color:#fff;font-size:14px;font-weight:500;font-family:'DM Sans',sans-serif;cursor:pointer;transition:opacity .2s}
.bcp:hover{opacity:.88}
.fc2{position:relative;z-index:1;text-align:center;padding:6rem 2rem;border-top:.5px solid var(--b)}
.fcl{font-size:11px;letter-spacing:2px;text-transform:uppercase;color:var(--td);margin-bottom:1.5rem}
.fc2 h2{font-family:'Syne',sans-serif;font-size:clamp(2rem,5vw,3.5rem);font-weight:800;letter-spacing:-2px;color:#fff;line-height:1.06;margin-bottom:1.25rem}
.fc2 h2 em{font-style:normal;color:var(--red)}
.fc2 p{font-size:16px;color:var(--tm);margin-bottom:2.5rem;font-weight:300}
footer{border-top:.5px solid var(--b);padding:2rem 3rem;display:flex;justify-content:space-between;align-items:center;color:var(--td);font-size:12px}
.fl{font-family:'Syne',sans-serif;font-weight:800;font-size:15px;color:rgba(255,255,255,.15)}
.fl span{color:rgba(220,80,60,.3)}
@media(max-width:768px){nav{padding:1.25rem 1.5rem}.nc{display:none}.sr{gap:1.5rem}.bg{grid-template-columns:1fr 1fr}.hg{grid-template-columns:1fr}.tg{grid-template-columns:1fr}.dc{grid-template-columns:1fr}.dca{border-right:none;border-bottom:.5px solid var(--b)}.wf{flex-direction:column}footer{flex-direction:column;gap:1rem;text-align:center}.scm{flex-direction:column}}
@media(max-width:520px){.bg{grid-template-columns:1fr}.ssel{display:none}}
`

const SX = {
  good:     { sc: 85, cl: '#3cc87a', s: 90, r: 88, e: 75, d: 95, t: 82, bg: 'rgba(60,200,122,.08)',  bc: 'rgba(60,200,122,.2)',   c: '#3cc87a', tx: 'Session saine — continue' },
  tilting:  { sc: 42, cl: '#dc8200', s: 35, r: 48, e: 20, d: 65, t: 70, bg: 'rgba(220,130,0,.08)',   bc: 'rgba(220,130,0,.2)',    c: '#dc8200', tx: 'Attention — signaux de tilt détectés' },
  critical: { sc: 12, cl: '#dc3218', s: 5,  r: 10, e: 8,  d: 15, t: 30, bg: 'rgba(220,50,30,.1)',   bc: 'rgba(220,50,30,.25)',   c: '#dc3218', tx: 'STOP — Ferme la plateforme maintenant' },
}

function barColor(v: number) { return v >= 70 ? '#3cc87a' : v >= 40 ? '#ffc800' : '#dc3218' }

const SCN = [
  { time: '10:14', side: 'NQ Short',           pnl: -180, a: null },
  { time: '10:17', side: 'NQ Long (re-entrée)', pnl: -95,  a: { l: 1, ti: 'Re-entrée immédiate détectée',         su: 'Trade ouvert 3 min après la sortie. Prends une pause.' } },
  { time: '10:31', side: 'NQ Long (sizing ×2)', pnl: -210, a: { l: 2, ti: 'Revenge sizing + 3 pertes consécutives', su: 'Taille doublée après série de pertes. Pause fortement recommandée.' } },
  { time: '10:33', side: 'NQ Long',             pnl: -320, a: { l: 3, ti: 'STOP — Ferme la plateforme.',           su: 'Drawdown critique + série + revenge sizing simultanés.' } },
]

export default function LandingPage() {
  const chartRef = useRef<HTMLCanvasElement>(null)
  const chRef    = useRef<any>(null)
  const pdRef    = useRef([0, 140, 240])
  const stepRef  = useRef(0)

  useEffect(() => {
    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.0/chart.umd.min.js'
    script.onload = () => {
      const Chart = (window as any).Chart
      const ctx = chartRef.current?.getContext('2d')
      if (!ctx) return
      chRef.current = new Chart(ctx, {
        type: 'line',
        data: {
          labels: ['Ouv.', '09:32', '09:51'],
          datasets: [{ data: pdRef.current, borderColor: '#3cc87a', borderWidth: 2, pointRadius: 3, pointBackgroundColor: '#3cc87a', fill: true, backgroundColor: 'rgba(60,200,122,.06)', tension: .3 }],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { color: 'rgba(255,255,255,.04)' }, ticks: { color: 'rgba(255,255,255,.2)', font: { size: 10 } } },
            y: { grid: { color: 'rgba(255,255,255,.04)' }, ticks: { color: 'rgba(255,255,255,.2)', font: { size: 10 }, callback: (v: number) => '€' + v } },
          },
        },
      })
    }
    document.head.appendChild(script)
    return () => { if (document.head.contains(script)) document.head.removeChild(script) }
  }, [])

  function scrollToEmail() {
    const em = document.getElementById('EM') as HTMLInputElement | null
    em?.focus(); em?.scrollIntoView({ behavior: 'smooth' })
  }

  function setSess(tp: string, btn: HTMLButtonElement) {
    document.querySelectorAll<HTMLElement>('.sbtn').forEach(b => b.classList.remove('active'))
    btn.classList.add('active')
    const s = SX[tp as keyof typeof SX]
    const C = 289
    const arc = document.getElementById('sarc') as unknown as SVGCircleElement | null
    if (arc) { arc.style.strokeDashoffset = String(C - (C * s.sc / 100)); arc.style.stroke = s.cl }
    const num = document.getElementById('snum') as HTMLElement | null
    if (num) { num.textContent = String(s.sc); num.style.color = s.cl }
    ;(['s', 'r', 'e', 'd', 't'] as const).forEach((k, i) => {
      const vals = [s.s, s.r, s.e, s.d, s.t]
      const v = vals[i]
      const bar = document.getElementById('b' + k) as HTMLElement | null
      const val = document.getElementById('v' + k) as HTMLElement | null
      if (bar) { bar.style.width = v + '%'; bar.style.background = barColor(v) }
      if (val) val.textContent = String(v)
    })
    const st = document.getElementById('sst') as HTMLElement | null
    if (st) { st.style.background = s.bg; st.style.borderColor = s.bc; st.style.color = s.c }
    const dot = document.getElementById('sdot') as HTMLElement | null
    if (dot) dot.style.background = s.c
    const txt = document.getElementById('stxt') as HTMLElement | null
    if (txt) txt.textContent = s.tx
  }

  function sim() {
    if (stepRef.current >= SCN.length) { resetD(); return }
    const t = SCN[stepRef.current]
    const np = pdRef.current[pdRef.current.length - 1] + t.pnl
    pdRef.current.push(np)
    const ch = chRef.current
    if (ch) {
      ch.data.labels.push(t.time)
      const col = np >= 0 ? '#3cc87a' : '#e05050'
      ch.data.datasets[0].borderColor = col
      ch.data.datasets[0].pointBackgroundColor = col
      ch.data.datasets[0].backgroundColor = np >= 0 ? 'rgba(60,200,122,.06)' : 'rgba(224,80,80,.06)'
      ch.data.datasets[0].data = pdRef.current
      ch.update()
    }
    const pe = document.getElementById('dpnl') as HTMLElement | null
    if (pe) { pe.textContent = (np >= 0 ? '+' : '') + '€' + np; pe.style.color = np >= 0 ? '#3cc87a' : '#e05050' }
    const dpc = document.getElementById('dpc') as HTMLElement | null
    if (dpc) dpc.textContent = t.time + ' — ' + t.side
    const log = document.getElementById('tlog')
    if (log) {
      const el = document.createElement('div'); el.className = 'ti'
      el.innerHTML = `<span class="tt">${t.time}</span><span class="tinst">${t.side}</span><span class="${t.pnl >= 0 ? 'tp' : 'tn'}">${t.pnl >= 0 ? '+' : ''}€${t.pnl}</span>`
      log.appendChild(el)
    }
    if (t.a) {
      const ac = document.getElementById('ac')
      if (ac) {
        if (ac.querySelector('[data-empty]')) ac.innerHTML = ''
        const ae = document.createElement('div'); ae.className = `ai al${t.a.l}`
        ae.innerHTML = `<div class="adot dl${t.a.l}"></div><div class="ab"><div class="at">${t.a.ti}</div><div class="as">${t.a.su}</div></div><div class="abg bl${t.a.l}">Niv. ${t.a.l}</div>`
        ac.appendChild(ae)
      }
    }
    stepRef.current++
    const sb = document.getElementById('sb') as HTMLButtonElement | null
    if (sb && stepRef.current >= SCN.length) sb.textContent = '↺ Recommencer la simulation'
  }

  function resetD() {
    stepRef.current = 0; pdRef.current = [0, 140, 240]
    const ch = chRef.current
    if (ch) {
      ch.data.labels = ['Ouv.', '09:32', '09:51']
      ch.data.datasets[0] = { ...ch.data.datasets[0], data: pdRef.current, borderColor: '#3cc87a', pointBackgroundColor: '#3cc87a', backgroundColor: 'rgba(60,200,122,.06)' }
      ch.update()
    }
    const dpnl = document.getElementById('dpnl') as HTMLElement | null
    if (dpnl) { dpnl.textContent = '+€240'; dpnl.style.color = '#3cc87a' }
    const dpc = document.getElementById('dpc') as HTMLElement | null
    if (dpc) dpc.textContent = 'Session en cours'
    const tlog = document.getElementById('tlog')
    if (tlog) tlog.innerHTML = '<div class="ti"><span class="tt">09:32</span><span class="tinst">NQ Long</span><span class="tp">+€140</span></div><div class="ti"><span class="tt">09:51</span><span class="tinst">NQ Short</span><span class="tp">+€100</span></div>'
    const ac = document.getElementById('ac')
    if (ac) ac.innerHTML = '<div data-empty style="font-size:12px;color:var(--td);padding:.5rem 0">Aucune alerte — session saine.</div>'
    const sb = document.getElementById('sb') as HTMLButtonElement | null
    if (sb) sb.textContent = '→ Simuler le trade suivant'
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    fetch(form.action, { method: 'POST', body: new FormData(form), mode: 'no-cors' })
      .finally(() => {
        form.style.display = 'none'
        const msg = document.getElementById('smsg') as HTMLElement | null
        if (msg) msg.style.display = 'block'
      })
  }

  const BREVO_URL = 'https://a806dab9.sibforms.com/serve/MUIFANoJA13XoDD-YU3gz-iJOwWo-c9SqObOFk1Qa9n60DzwU189XDDxTThw0He7q94l9Q8HxA9ONRpQkCJ1H6RSu8t2tfqa0qQ3pCYb8fl5Z4sOm160PnRRimX972hYp2NFf9ivyszl0PkR8Osor-V3Sb1uKEopust0j4-ntBN7aV9lgtMLIVf64TtwNyvf3ACh7UNRAYn6xoe8MQ=='

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="g1" /><div className="g2" />

      <nav>
        <div className="logo">Cald<span>ra</span></div>
        <div className="nr">
          <div className="nb">Accès anticipé</div>
          <button className="nc" onClick={scrollToEmail}>Rejoindre la liste</button>
        </div>
      </nav>

      <div className="hero">
        <div className="ey"><div className="eyd" />Intelligence comportementale — Temps réel</div>
        <h1>Tu ne vois pas<br />quand tu dérailles.<br /><em>Lui si.</em></h1>
        <p className="hs">Caldra analyse chaque trade en temps réel et détecte les comportements qui détruisent les sessions — <em>avant</em> que le tilt, le revenge trading ou l&apos;impulsion ne fasse les dégâts.</p>
        <div className="ww">
          <form id="sf" onSubmit={handleSubmit} action={BREVO_URL}>
            <div className="wf">
              <input type="email" id="EM" name="EMAIL" autoComplete="off" placeholder="ton@email.com" required />
              <button type="submit" className="bp">Rejoindre →</button>
            </div>
            <input type="text" name="email_address_check" defaultValue="" style={{ display: 'none' }} />
            <input type="hidden" name="locale" defaultValue="fr" />
            <input type="hidden" name="html_type" defaultValue="simple" />
          </form>
          <div className="sm" id="smsg">✓ Tu es sur la liste. Prix accès anticipé garanti.</div>
          <div className="ff">
            <span className="fn">Pas de spam</span><div className="fs" /><span className="fn">19€/mois · Prix bloqué à vie</span><div className="fs" /><span className="fn">Annulable à tout moment</span>
          </div>
        </div>
      </div>

      <div className="ss">
        <div className="si">
          <div className="sag">
            <div className="sa" style={{ background: '#1a1a28' }}>T</div>
            <div className="sa" style={{ background: '#1a2018' }}>M</div>
            <div className="sa" style={{ background: '#201818' }}>R</div>
            <div className="sa" style={{ background: '#18201a' }}>K</div>
          </div>
          +240 traders sur la liste d&apos;attente
        </div>
        <div className="ssep" />
        <div className="si"><span className="stars">★★★★★</span>Beta-testeurs — 4.9/5</div>
        <div className="ssep" />
        <div className="si" style={{ color: 'rgba(232,230,224,.25)' }}>Futures · CFD · Forex · Crypto</div>
      </div>

      <div className="sr">
        <div className="stat"><div className="sn">9<span className="sna">+</span></div><div className="sl">Comportements détectés</div></div>
        <div className="stat"><div className="sn">3</div><div className="sl">Niveaux d&apos;alerte</div></div>
        <div className="stat"><div className="sn"><span className="sna">&lt;</span>1s</div><div className="sl">Temps de détection</div></div>
        <div className="stat"><div className="sn">100%</div><div className="sl">Automatique</div></div>
      </div>

      {/* ── Section : Ce qu'on détecte ── */}
      <section>
        <div className="stag">Ce qu&apos;on détecte</div>
        <div className="stit">Ton empreinte<br />comportementale, en direct.</div>
        <p className="sdesc">Chaque trader a des patterns quand il commence à dérailler. Caldra lit les tiens — et te le dit avant que ça coûte.</p>
        <div className="scdemo">
          <div className="scdh">
            <div className="scdl">Score de session · Live</div>
            <div className="ssel">
              <button className="sbtn active" onClick={e => setSess('good', e.currentTarget)}>Bonne session</button>
              <button className="sbtn" onClick={e => setSess('tilting', e.currentTarget)}>En tilt</button>
              <button className="sbtn" onClick={e => setSess('critical', e.currentTarget)}>Critique</button>
            </div>
          </div>
          <div className="scm">
            <div className="scc">
              <svg width="110" height="110" viewBox="0 0 110 110">
                <circle cx="55" cy="55" r="46" fill="none" stroke="rgba(255,255,255,.05)" strokeWidth="8" />
                <circle id="sarc" cx="55" cy="55" r="46" fill="none" stroke="#3cc87a" strokeWidth="8" strokeDasharray="289" strokeDashoffset="43" strokeLinecap="round" style={{ transition: 'stroke-dashoffset .6s,stroke .4s' }} />
              </svg>
              <div className="scv"><div className="scn" id="snum" style={{ color: '#3cc87a' }}>85</div><div className="scl">/ 100</div></div>
            </div>
            <div className="scb">
              <div className="sci"><div className="scin">Sizing maîtrisé</div><div className="scbt"><div className="scbf" id="bs" style={{ width: '90%', background: '#3cc87a' }} /></div><div className="sciv" id="vs">90</div></div>
              <div className="sci"><div className="scin">Respect du risk</div><div className="scbt"><div className="scbf" id="br" style={{ width: '88%', background: '#3cc87a' }} /></div><div className="sciv" id="vr">88</div></div>
              <div className="sci"><div className="scin">Contrôle re-entrées</div><div className="scbt"><div className="scbf" id="be" style={{ width: '75%', background: '#ffc800' }} /></div><div className="sciv" id="ve">75</div></div>
              <div className="sci"><div className="scin">Drawdown journalier</div><div className="scbt"><div className="scbf" id="bd" style={{ width: '95%', background: '#3cc87a' }} /></div><div className="sciv" id="vd">95</div></div>
              <div className="sci"><div className="scin">Discipline horaire</div><div className="scbt"><div className="scbf" id="bt" style={{ width: '82%', background: '#3cc87a' }} /></div><div className="sciv" id="vt">82</div></div>
              <div style={{ marginTop: '.5rem' }}>
                <span className="scst" id="sst" style={{ background: 'rgba(60,200,122,.08)', borderColor: 'rgba(60,200,122,.2)', color: '#3cc87a' }}>
                  <span id="sdot" style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#3cc87a', display: 'inline-block' }} />
                  <span id="stxt"> Session saine — continue</span>
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="bg">
          <div className="bc"><div className="bi"><svg viewBox="0 0 24 24"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg></div><div className="bn">Revenge sizing</div><div className="bd">Taille qui augmente après une perte — chemin le plus court pour exploser une journée.</div></div>
          <div className="bc"><div className="bi"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg></div><div className="bn">Règle de risque dépassée</div><div className="bd">Dépasser ton risk par trade — tes règles existent pour une raison.</div></div>
          <div className="bc"><div className="bi"><svg viewBox="0 0 24 24"><polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 .49-3.4" /></svg></div><div className="bn">Re-entrée immédiate</div><div className="bd">Reprendre un trade moins de 2 min après la sortie — impulsion, pas analyse.</div></div>
          <div className="bc"><div className="bi"><svg viewBox="0 0 24 24"><line x1="12" y1="2" x2="12" y2="6" /><line x1="12" y1="18" x2="12" y2="22" /><line x1="4.93" y1="4.93" x2="7.76" y2="7.76" /><line x1="16.24" y1="16.24" x2="19.07" y2="19.07" /><line x1="2" y1="12" x2="6" y2="12" /><line x1="18" y1="12" x2="22" y2="12" /></svg></div><div className="bn">Série de pertes</div><div className="bd">3 pertes consécutives — le seuil où l&apos;émotion prend le dessus.</div></div>
          <div className="bc"><div className="bi"><svg viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg></div><div className="bn">Alerte drawdown</div><div className="bd">Perte journalière qui approche ta limite — configurable selon ton capital.</div></div>
          <div className="bc"><div className="bi"><svg viewBox="0 0 24 24"><path d="M18 20V10" /><path d="M12 20V4" /><path d="M6 20v-6" /></svg></div><div className="bn">Trade pendant les news</div><div className="bd">Entrée dans les 5 min d&apos;un événement macro — news + position = casino.</div></div>
          <div className="bc"><div className="bi"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg></div><div className="bn">Hors fenêtre de session</div><div className="bd">Trades en dehors de tes horaires définis — fatigue ou ennui.</div></div>
          <div className="bc"><div className="bi"><svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19" /><polyline points="19 12 12 19 5 12" /></svg></div><div className="bn">Stop non respecté</div><div className="bd">Position tenue au-delà de ton stop habituel — l&apos;espoir n&apos;est pas une stratégie.</div></div>
          <div className="bc"><div className="bi"><svg viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg></div><div className="bn">Suractivité de session</div><div className="bd">Trop de trades par rapport à ta moyenne — quand tu trades plus, tu trades souvent pire.</div></div>
        </div>
      </section>

      <div className="sdiv" />

      {/* ── Section : Démo interactive ── */}
      <section>
        <div className="stag">Démo interactive</div>
        <div className="stit">Vois Caldra en action<br />sur une vraie session.</div>
        <p className="sdesc">Simule un enchaînement de trades et observe comment Caldra détecte les patterns en temps réel.</p>
        <div className="dw">
          <div className="dtb">
            <div className="dd ddr" /><div className="dd ddy" /><div className="dd ddg" />
            <div className="dtit">Caldra — Session NQ Futures — 30/03/2026</div>
          </div>
          <div className="dc">
            <div className="dca">
              <div className="dcl">P&amp;L de session</div>
              <div className="pnl"><div className="pv" id="dpnl" style={{ color: '#3cc87a' }}>+€240</div><div className="pc" id="dpc">Session en cours</div></div>
              <div className="cc"><canvas id="pc" ref={chartRef} /></div>
              <div className="tll">Derniers trades</div>
              <div id="tlog">
                <div className="ti"><span className="tt">09:32</span><span className="tinst">NQ Long</span><span className="tp">+€140</span></div>
                <div className="ti"><span className="tt">09:51</span><span className="tinst">NQ Short</span><span className="tp">+€100</span></div>
              </div>
            </div>
            <div className="daa">
              <div className="dal">Alertes Caldra</div>
              <div className="al" id="ac"><div data-empty="" style={{ fontSize: '12px', color: 'var(--td)', padding: '.5rem 0' }}>Aucune alerte — session saine.</div></div>
              <button className="dsb" id="sb" onClick={sim}>→ Simuler le trade suivant</button>
            </div>
          </div>
        </div>
      </section>

      <div className="sdiv" />

      {/* ── Section : Comment ça marche ── */}
      <section>
        <div className="stag">Comment ça marche</div>
        <div className="stit">Configure une fois.<br />Il veille toujours.</div>
        <p className="sdesc">Aucune saisie manuelle. Aucune discipline supplémentaire. Caldra se connecte à ta plateforme et fait le reste.</p>
        <div className="hg">
          <div className="step"><div className="stn">01 — Connecte</div><div className="stt">Ta plateforme de trading</div><div className="std">Connexion directe via WebSocket. Tes trades remontent automatiquement — rien à saisir manuellement.</div><div><span className="ip"><span className="idot" />MT5</span><span className="ip"><span className="idot" />Tradovate</span><span className="ip" style={{ opacity: .35 }}>+ à venir</span></div></div>
          <div className="step"><div className="stn">02 — Configure</div><div className="stt">Tes règles et limites</div><div className="std">Horaires de session, risk par trade, drawdown max. Tes règles, tes standards — pas des valeurs génériques.</div></div>
          <div className="step"><div className="stn">03 — Trade</div><div className="stt">Alerte immédiate si ça déraille</div><div className="std">Dès qu&apos;un pattern dangereux est détecté, tu reçois une notification push + desktop — en moins d&apos;une seconde.</div></div>
        </div>
      </section>

      <div className="sdiv" />

      {/* ── Section : Témoignages ── */}
      <section>
        <div className="stag">Ce qu&apos;ils disent</div>
        <div className="stit">Testé par des vrais traders.</div>
        <p className="sdesc">Bêta fermée — retours des premiers utilisateurs sur leurs sessions réelles.</p>
        <div className="tg">
          <div className="test"><div className="tst">★★★★★</div><p className="ttx">&ldquo;J&apos;ai perdu 3 semaines de gains en une après-midi à cause du tilt. Avec Caldra, <strong>l&apos;alerte niveau 2 m&apos;a stoppé</strong> au 3e trade perdant. Je me suis levé. La session suivante était positive.&rdquo;</p><div className="tau"><div className="tav">TM</div><div><div className="tan">Thomas M.</div><div className="tam">Trader Futures · 3 ans</div></div></div></div>
          <div className="test"><div className="tst">★★★★★</div><p className="ttx">&ldquo;Le revenge sizing, c&apos;était mon pattern principal sans m&apos;en rendre compte. <strong>Caldra l&apos;a détecté au 2e trade</strong> après une perte. Choquant de voir à quel point c&apos;était automatique.&rdquo;</p><div className="tau"><div className="tav">RA</div><div><div className="tan">Romain A.</div><div className="tam">Trader CFD/Forex · Paris</div></div></div></div>
          <div className="test"><div className="tst">★★★★☆</div><p className="ttx">&ldquo;La différence avec TradeZella : <strong>Caldra agit pendant la session</strong>, pas après. À ce stade c&apos;est trop tard — les dégâts sont déjà faits.&rdquo;</p><div className="tau"><div className="tav">KL</div><div><div className="tan">Kevin L.</div><div className="tam">Trader Crypto · Lyon</div></div></div></div>
        </div>
      </section>

      <div className="sdiv" />

      {/* ── Section : Tarif ── */}
      <section>
        <div className="stag">Tarif</div>
        <div className="stit">Simple.<br />Rentabilisé au premier trade évité.</div>
        <p className="sdesc">Un seul mauvais trade évité = des mois de Caldra payés.</p>
        <div className="pc2">
          <div className="pbg">Accès anticipé · Places limitées</div>
          <div className="pp"><sup>€</sup>19<sub>/mois</sub></div>
          <div className="pn">Prix garanti à vie pour les premiers inscrits</div>
          <ul className="pf">
            <li><div className="fc"><svg viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3" /></svg></div>Les 9 détections comportementales</li>
            <li><div className="fc"><svg viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3" /></svg></div>Alertes temps réel (push + desktop)</li>
            <li><div className="fc"><svg viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3" /></svg></div>Compatible MT5 &amp; Tradovate</li>
            <li><div className="fc"><svg viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3" /></svg></div>Seuils configurables selon tes règles</li>
            <li><div className="fc"><svg viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3" /></svg></div>Support multi-comptes</li>
            <li><div className="fc"><svg viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3" /></svg></div>Dashboard comportemental de session</li>
            <li><div className="fc"><svg viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3" /></svg></div>Coaching IA sur alertes niveau 3</li>
          </ul>
          <button className="bcp" onClick={scrollToEmail}>Rejoindre la liste d&apos;attente</button>
        </div>
        <p style={{ textAlign: 'center', marginTop: '2rem', fontSize: '13px', color: 'var(--td)', fontStyle: 'italic' }}>Caldra ne remplace pas l&apos;expérience. Il te protège pendant que tu la construis.</p>
      </section>

      {/* ── CTA final ── */}
      <div className="fc2">
        <div className="fcl">Rejoindre l&apos;accès anticipé</div>
        <h2>Ton prochain tilt<br /><em>peut être le dernier.</em></h2>
        <p>240 traders déjà sur la liste. Prix garanti à vie à l&apos;inscription.</p>
        <div className="ww">
          <form method="POST" action={BREVO_URL}>
            <div className="wf">
              <input type="email" name="EMAIL" autoComplete="off" placeholder="ton@email.com" required />
              <button type="submit" className="bp">Rejoindre →</button>
            </div>
            <input type="text" name="email_address_check" defaultValue="" style={{ display: 'none' }} />
            <input type="hidden" name="locale" defaultValue="fr" />
            <input type="hidden" name="html_type" defaultValue="simple" />
          </form>
          <div className="ff" style={{ marginTop: '.75rem' }}><span className="fn">19€/mois · Prix bloqué à vie · Annulable à tout moment</span></div>
        </div>
      </div>

      <footer>
        <div className="fl">Cald<span>ra</span></div>
        <div>© 2026 Caldra — Tous droits réservés</div>
        <div>contact@getcaldra.com</div>
      </footer>
    </>
  )
}
