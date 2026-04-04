'use client'

import { useEffect } from 'react'

const CSS = `
*{margin:0;padding:0;box-sizing:border-box;scroll-behavior:smooth}
:root{--red:#dc503c;--rd:rgba(220,80,60,.1);--rb:rgba(220,80,60,.25);--bg:#08080d;--sf:#0f0f16;--sf2:#141420;--b:rgba(255,255,255,.07);--b2:rgba(255,255,255,.12);--tx:#e8e6e0;--tm:rgba(232,230,224,.45);--td:rgba(232,230,224,.2)}
body{font-family:'DM Sans',sans-serif;background:var(--bg);color:var(--tx);min-height:100vh;overflow-x:hidden}
#net{position:fixed;inset:0;z-index:0;pointer-events:none}
.g1{position:fixed;width:700px;height:700px;border-radius:50%;background:radial-gradient(circle,rgba(220,80,60,.07) 0%,transparent 65%);top:-250px;left:50%;transform:translateX(-50%);pointer-events:none;z-index:0}
.g2{position:fixed;width:400px;height:400px;border-radius:50%;background:radial-gradient(circle,rgba(180,50,220,.04) 0%,transparent 65%);bottom:20%;right:-100px;pointer-events:none;z-index:0}
nav{position:fixed;top:0;left:0;right:0;z-index:100;display:flex;justify-content:space-between;align-items:center;padding:1.25rem 3rem;border-bottom:.5px solid var(--b);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);background:rgba(8,8,13,.88)}
.logo-block{display:flex;flex-direction:column;gap:5px}
.logo{font-family:'DM Sans',sans-serif;font-weight:300;font-size:14px;letter-spacing:5px;text-transform:uppercase;color:#fff;line-height:1}
.logo span{color:var(--red)}
.logo-sub{font-size:8px;font-weight:400;letter-spacing:8.2px;text-transform:uppercase;color:rgba(255,255,255,.6);line-height:1;display:block}
.nav-sep{width:.5px;height:30px;background:rgba(255,255,255,.1);margin:0 2.5rem;flex-shrink:0}
.nav-links{display:flex;align-items:center;flex:1;justify-content:space-between;max-width:540px}
.nav-link{font-size:10px;font-weight:400;letter-spacing:2.5px;text-transform:uppercase;color:rgba(232,230,224,.6);cursor:pointer;transition:color .2s;text-decoration:none;background:none;border:none;font-family:'DM Sans',sans-serif;padding:0}
.nav-link:hover{color:#fff}
.nav-link-active{color:#fff!important}
.nr{display:flex;align-items:center;gap:1rem;margin-left:2.5rem}
.nb{font-size:9px;padding:4px 12px;border:.5px solid var(--rb);border-radius:100px;color:var(--red);letter-spacing:1.5px;text-transform:uppercase}
.nc{font-size:10px;font-weight:500;letter-spacing:2px;text-transform:uppercase;padding:9px 20px;background:transparent;border:.5px solid rgba(255,255,255,.85);border-radius:4px;color:#fff;cursor:pointer;font-family:'DM Sans',sans-serif;transition:background .2s,color .2s;text-decoration:none}
.nc:hover{background:#fff;color:#08080d}
.stag{font-size:11px;letter-spacing:2px;text-transform:uppercase;color:rgba(220,80,60,.6);margin-bottom:1rem}
.stit{font-family:'DM Sans',sans-serif;font-size:clamp(1.9rem,4vw,2.9rem);font-weight:200;letter-spacing:-1px;color:#fff;margin-bottom:1rem;line-height:1.1}
.sdesc{font-size:15px;color:var(--tm);line-height:1.75;max-width:520px;margin-bottom:3rem;font-weight:300}
footer{border-top:.5px solid var(--b);padding:2rem 3rem;display:flex;justify-content:space-between;align-items:center;color:var(--td);font-size:12px}
.fl{font-family:'DM Sans',sans-serif;font-weight:300;font-size:13px;letter-spacing:3px;text-transform:uppercase;color:rgba(255,255,255,.15)}
.fl span{color:rgba(220,80,60,.3)}
@media(max-width:768px){nav{padding:1.25rem 1.5rem}.nc{display:none}footer{flex-direction:column;gap:1rem;text-align:center}.nav-links{display:none}}
`

const HTML = `
<canvas id="net"></canvas>
<div class="g1"></div><div class="g2"></div>
<nav>
  <div style="display:flex;align-items:center;flex:1">
    <a href="/" style="text-decoration:none" class="logo-block">
      <div class="logo">Cald<span>ra</span></div>
      <div class="logo-sub">Session</div>
    </a>
    <div class="nav-sep"></div>
    <div class="nav-links">
      <a class="nav-link" href="/#demo">D&eacute;mo</a>
      <a class="nav-link" href="/#alertes">Alertes</a>
      <a class="nav-link" href="/#comment">Comment</a>
      <a class="nav-link" href="/#avis">Avis</a>
      <a class="nav-link" href="/#tarifs">Tarifs</a>
      <a class="nav-link" href="/#histoire">Histoire</a>
      <a class="nav-link nav-link-active" href="/support">Support</a>
    </div>
  </div>
  <div class="nr">
    <div class="nb">Acc&egrave;s anticip&eacute;</div>
    <a class="nc" href="/">Rejoindre la liste</a>
  </div>
</nav>

<section style="position:relative;z-index:1;max-width:680px;margin:0 auto;padding:10rem 2rem 5rem">
  <div class="stag">Support</div>
  <div class="stit">Une question&nbsp;?<br>On r&eacute;pond.</div>
  <p class="sdesc">Un bug, une suggestion, une question sur Caldra. &Eacute;cris-nous directement.</p>
  <div style="background:var(--sf);border:.5px solid var(--b2);border-radius:16px;padding:2rem;position:relative;overflow:hidden">
    <div style="position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,.06),transparent)"></div>
    <div style="display:flex;flex-direction:column;gap:1rem">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">
        <div>
          <label style="font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:var(--td);display:block;margin-bottom:.5rem">Pr&eacute;nom</label>
          <input id="c-name" name="name" type="text" placeholder="Pr&eacute;nom" style="width:100%;padding:11px 14px;background:rgba(255,255,255,.04);border:.5px solid var(--b2);border-radius:8px;color:#fff;font-size:14px;font-family:'DM Sans',sans-serif;outline:none;transition:border-color .2s" onfocus="this.style.borderColor='rgba(220,80,60,.4)'" onblur="this.style.borderColor='rgba(255,255,255,.12)'"/>
        </div>
        <div>
          <label style="font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:var(--td);display:block;margin-bottom:.5rem">Email</label>
          <input id="c-email" name="email" type="email" placeholder="Email" style="width:100%;padding:11px 14px;background:rgba(255,255,255,.04);border:.5px solid var(--b2);border-radius:8px;color:#fff;font-size:14px;font-family:'DM Sans',sans-serif;outline:none;transition:border-color .2s" onfocus="this.style.borderColor='rgba(220,80,60,.4)'" onblur="this.style.borderColor='rgba(255,255,255,.12)'"/>
        </div>
      </div>
      <div>
        <label style="font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:var(--td);display:block;margin-bottom:.5rem">Sujet</label>
        <input id="c-subject" name="subject" type="text" placeholder="Sujet" style="width:100%;padding:11px 14px;background:rgba(255,255,255,.04);border:.5px solid var(--b2);border-radius:8px;color:#fff;font-size:14px;font-family:'DM Sans',sans-serif;outline:none;transition:border-color .2s" onfocus="this.style.borderColor='rgba(220,80,60,.4)'" onblur="this.style.borderColor='rgba(255,255,255,.12)'"/>
      </div>
      <div>
        <label style="font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:var(--td);display:block;margin-bottom:.5rem">Message</label>
        <textarea id="c-msg" name="message" rows="5" placeholder="Message" style="width:100%;padding:11px 14px;background:rgba(255,255,255,.04);border:.5px solid var(--b2);border-radius:8px;color:#fff;font-size:14px;font-family:'DM Sans',sans-serif;outline:none;resize:vertical;transition:border-color .2s" onfocus="this.style.borderColor='rgba(220,80,60,.4)'" onblur="this.style.borderColor='rgba(255,255,255,.12)'"></textarea>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;gap:1rem">
        <span style="font-size:12px;color:var(--td)">R&eacute;ponse sous 24h</span>
        <button id="c-btn" onclick="sendContact()" style="padding:11px 24px;background:var(--red);border:none;border-radius:8px;color:#fff;font-size:12px;font-weight:500;letter-spacing:1.5px;text-transform:uppercase;font-family:'DM Sans',sans-serif;cursor:pointer;transition:opacity .2s;white-space:nowrap" onmouseover="this.style.opacity='.85'" onmouseout="this.style.opacity='1'">Envoyer &rarr;</button>
      </div>
      <div id="c-success" style="display:none;padding:12px 16px;background:rgba(30,180,100,.08);border:.5px solid rgba(30,180,100,.25);border-radius:8px;color:rgba(80,220,140,.9);font-size:13px;text-align:center">
        &#10003; Message envoy&eacute;. On revient vers toi sous 24h.
      </div>
      <div id="c-error" style="display:none;padding:12px 16px;background:rgba(220,80,60,.08);border:.5px solid rgba(220,80,60,.25);border-radius:8px;color:rgba(220,80,60,.9);font-size:13px;text-align:center">
        Une erreur s&rsquo;est produite. R&eacute;essaie ou &eacute;cris &agrave; contact@getcaldra.com
      </div>
    </div>
  </div>
</section>

<footer>
  <div class="fl">Cald<span>ra</span></div>
  <div>&copy; 2026 Caldra &mdash; Tous droits r&eacute;serv&eacute;s</div>
  <div>contact@getcaldra.com</div>
</footer>
<script id="caldra-support-js">
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
    } else { throw new Error(); }
  } catch(e){
    document.getElementById('c-error').style.display='block';
    btn.textContent='Envoyer \u2192';btn.style.opacity='1';btn.disabled=false;
  }
}
window.sendContact=sendContact;
</script>
`

const NET_JS = `(function(){
  var cv=document.getElementById('net');
  if(!cv)return;
  var ctx=cv.getContext('2d');
  var RED='rgba(220,80,60,',WHT='rgba(255,255,255,';
  var W,H,pts,N_BASE=55,MAX_DIST=160,SPEED=0.28;
  function resize(){W=cv.width=window.innerWidth;H=cv.height=window.innerHeight;}
  function mkPts(){var n=Math.round(N_BASE*(W/1440));pts=Array.from({length:Math.max(30,n)},function(){return{x:Math.random()*W,y:Math.random()*H,vx:(Math.random()-.5)*SPEED,vy:(Math.random()-.5)*SPEED,r:Math.random()<.06?2.2:1.1,red:Math.random()<.06};});}
  function draw(){ctx.clearRect(0,0,W,H);for(var i=0;i<pts.length;i++){for(var j=i+1;j<pts.length;j++){var dx=pts[i].x-pts[j].x,dy=pts[i].y-pts[j].y,d=Math.sqrt(dx*dx+dy*dy);if(d<MAX_DIST){var a=(1-d/MAX_DIST)*.18;ctx.beginPath();ctx.moveTo(pts[i].x,pts[i].y);ctx.lineTo(pts[j].x,pts[j].y);ctx.strokeStyle=(pts[i].red||pts[j].red)?RED+a*.7+')':WHT+a+')';ctx.lineWidth=.6;ctx.stroke();}}}for(var k=0;k<pts.length;k++){ctx.beginPath();ctx.arc(pts[k].x,pts[k].y,pts[k].r,0,Math.PI*2);ctx.fillStyle=pts[k].red?RED+'.55)':WHT+'.25)';ctx.fill();}}
  function move(){for(var k=0;k<pts.length;k++){pts[k].x+=pts[k].vx;pts[k].y+=pts[k].vy;if(pts[k].x<0||pts[k].x>W)pts[k].vx*=-1;if(pts[k].y<0||pts[k].y>H)pts[k].vy*=-1;}}
  function loop(){move();draw();requestAnimationFrame(loop);}
  resize();mkPts();loop();
  window.addEventListener('resize',function(){resize();mkPts();});
})();`

export default function Support() {
  useEffect(() => {
    document.getElementById('caldra-net')?.remove()
    const netScript = document.createElement('script')
    netScript.id = 'caldra-net'
    netScript.textContent = NET_JS
    document.body.appendChild(netScript)

    const src = document.getElementById('caldra-support-js')?.textContent
    if (src) {
      document.getElementById('caldra-support-init')?.remove()
      const s = document.createElement('script')
      s.id = 'caldra-support-init'
      s.textContent = src
      document.body.appendChild(s)
    }

    return () => {
      document.getElementById('caldra-net')?.remove()
      document.getElementById('caldra-support-init')?.remove()
    }
  }, [])

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div dangerouslySetInnerHTML={{ __html: HTML }} />
    </>
  )
}
