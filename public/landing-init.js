const SX={
  good:{sc:85,cl:'#3cc87a',s:90,r:88,e:75,d:95,t:82,bg:'rgba(60,200,122,.08)',bc:'rgba(60,200,122,.2)',c:'#3cc87a',tx:'Session saine — continue'},
  tilting:{sc:42,cl:'#dc8200',s:35,r:48,e:20,d:65,t:70,bg:'rgba(220,130,0,.08)',bc:'rgba(220,130,0,.2)',c:'#dc8200',tx:'Attention — signaux de tilt détectés'},
  critical:{sc:12,cl:'#dc3218',s:5,r:10,e:8,d:15,t:30,bg:'rgba(220,50,30,.1)',bc:'rgba(220,50,30,.25)',c:'#dc3218',tx:'STOP — Ferme la plateforme maintenant'}
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
window.setSess = setSess;

var pd=[0,140,240],simStep=0,ch;
var SCN=[
  {time:'10:14',side:'NQ Short',pnl:-180,a:null},
  {time:'10:17',side:'NQ Long (re-entrée)',pnl:-95,a:{l:1,ti:'Re-entrée immédiate détectée',su:'Trade ouvert 3 min après la sortie. Prends une pause.'}},
  {time:'10:31',side:'NQ Long (sizing ×2)',pnl:-210,a:{l:2,ti:'Revenge sizing + 3 pertes consécutives',su:'Taille doublée après série de pertes. Pause fortement recommandée.'}},
  {time:'10:33',side:'NQ Long',pnl:-320,a:{l:3,ti:'STOP — Ferme la plateforme.',su:'Drawdown critique + série + revenge sizing simultanés.'}}
];
var pcCanvas=document.getElementById('pc');
if(pcCanvas){
  var cx=pcCanvas.getContext('2d');
  ch=new Chart(cx,{type:'line',data:{labels:['Ouv.','09:32','09:51'],datasets:[{data:pd,borderColor:'#3cc87a',borderWidth:2,pointRadius:3,pointBackgroundColor:'#3cc87a',fill:true,backgroundColor:'rgba(60,200,122,.06)',tension:.3}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{grid:{color:'rgba(255,255,255,.04)'},ticks:{color:'rgba(255,255,255,.2)',font:{size:10}}},y:{grid:{color:'rgba(255,255,255,.04)'},ticks:{color:'rgba(255,255,255,.2)',font:{size:10},callback:function(v){return '€'+v}}}}}});
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
  pe.textContent=(np>=0?'+':'')+'€'+np;pe.style.color=col;
  document.getElementById('dpc').textContent=t.time+' — '+t.side;
  var log=document.getElementById('tlog');
  var el=document.createElement('div');el.className='ti';
  el.innerHTML='<span class="tt">'+t.time+'</span><span class="tinst">'+t.side+'</span><span class="'+(t.pnl>=0?'tp':'tn')+'">'+(t.pnl>=0?'+':'')+'€'+t.pnl+'</span>';
  log.appendChild(el);
  if(t.a){
    var c=document.getElementById('ac');
    if(c.querySelector('div[style]'))c.innerHTML='';
    var ae=document.createElement('div');ae.className='ai al'+t.a.l;
    ae.innerHTML='<div class="adot dl'+t.a.l+'"></div><div class="ab"><div class="at">'+t.a.ti+'</div><div class="as">'+t.a.su+'</div></div><div class="abg bl'+t.a.l+'">Niv. '+t.a.l+'</div>';
    c.appendChild(ae);
  }
  simStep++;
  if(simStep>=SCN.length)document.getElementById('sb').textContent='↺ Recommencer la simulation';
}
window.sim = sim;

function resetD(){
  simStep=0;pd=[0,140,240];
  ch.data.labels=['Ouv.','09:32','09:51'];
  ch.data.datasets[0].data=pd;
  ch.data.datasets[0].borderColor='#3cc87a';
  ch.data.datasets[0].pointBackgroundColor='#3cc87a';
  ch.data.datasets[0].backgroundColor='rgba(60,200,122,.06)';
  ch.update();
  document.getElementById('dpnl').textContent='+€240';document.getElementById('dpnl').style.color='#3cc87a';
  document.getElementById('dpc').textContent='Session en cours';
  document.getElementById('tlog').innerHTML='<div class="ti"><span class="tt">09:32</span><span class="tinst">NQ Long</span><span class="tp">+€140</span></div><div class="ti"><span class="tt">09:51</span><span class="tinst">NQ Short</span><span class="tp">+€100</span></div>';
  document.getElementById('ac').innerHTML='<div style="font-size:12px;color:var(--td);padding:.5rem 0">Aucune alerte — session saine.</div>';
  document.getElementById('sb').textContent='→ Simuler le trade suivant';
}

var form=document.getElementById('sf');
if(form){
  form.addEventListener('submit',function(e){
    e.preventDefault();
    var em=document.getElementById('EM').value;
    if(!em)return;
    fetch(form.action,{method:'POST',body:new FormData(form),mode:'no-cors'}).finally(function(){
      form.style.display='none';
      document.getElementById('smsg').style.display='block';
    });
  });
}

var car=document.getElementById('pcarousel');
if(car){
  var isDown=false,startX,scrollLeft;
  car.addEventListener('mousedown',function(e){isDown=true;car.classList.add('dragging');startX=e.pageX-car.offsetLeft;scrollLeft=car.scrollLeft});
  car.addEventListener('mouseleave',function(){isDown=false;car.classList.remove('dragging')});
  car.addEventListener('mouseup',function(){isDown=false;car.classList.remove('dragging')});
  car.addEventListener('mousemove',function(e){if(!isDown)return;e.preventDefault();var x=e.pageX-car.offsetLeft;car.scrollLeft=scrollLeft-(x-startX)*1.2});
}
