
(()=>{
'use strict';
const $=id=>document.getElementById(id);
try{localStorage.removeItem('arcade_photo');localStorage.removeItem('arcade_photo_ok')}catch(e){}
const cv=$('c'),ctx=cv.getContext('2d');
const W=480,H=640;
const FA=n=>Math.round(n).toLocaleString('fa-IR');
const FONT='Vazirmatn,Tahoma,"Segoe UI",sans-serif';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
/* ================= prefs + graphics ================= */
const FUN=['⚠️','🗿','😈','💀','🤡','🦁','🦄','🐷','🐸','👾'];
const OSR=matchMedia('(prefers-reduced-motion: reduce)').matches;
const Pref=(()=>{
  const K='arcade_pref',p={gfx:OSR?'low':'med',snd:1,av:'👾',diff:1,lag:0,bench:null,bloom:1,particles:1,shadows:1,scan:0,background:1,shake:1,render:1.5,fx:1};
  try{Object.assign(p,JSON.parse(localStorage.getItem(K)||'{}')||{})}catch(e){}
  if(!['low','med','high','pro'].includes(p.gfx))p.gfx='med';
  if(!FUN.includes(p.av))p.av='👾';
  if(![0,1,2].includes(+p.diff))p.diff=1;
  p.lag=p.lag?1:0;
  if(!p.bench||typeof p.bench!=='object')p.bench=null;
  p.snd=p.snd?1:0;
  return{
    get:k=>p[k],
    set(k,v){p[k]=v;try{localStorage.setItem(K,JSON.stringify(p))}catch(e){}}
  };
})();
const rankMilestoneCache=Object.create(null);
const TTL=[['t1','👑 لجند'],['t2','💎 گرند مستر'],['t3','🔥 مستر']];
function ttlEl(i){const e=document.createElement('span');e.className='ttl '+TTL[i][0];e.textContent=TTL[i][1];return e}
function okPhoto(u){return typeof u==='string'&&u.length<40000&&/^data:image\/jpeg;base64,[A-Za-z0-9+\/=]+$/.test(u)}
function photoToJpeg(file){return new Promise((res,rej)=>{const url=URL.createObjectURL(file);const im=new Image();
  im.onload=()=>{try{const S=160,c=document.createElement('canvas');c.width=c.height=S;const x=c.getContext('2d');
    const m=Math.min(im.naturalWidth,im.naturalHeight),sx=(im.naturalWidth-m)/2,sy=(im.naturalHeight-m)/2;
    x.fillStyle='#000';x.fillRect(0,0,S,S);x.drawImage(im,sx,sy,m,m,0,0,S,S);URL.revokeObjectURL(url);
    let q=.82,d=c.toDataURL('image/jpeg',q);while(d.length>30000&&q>.3){q-=.1;d=c.toDataURL('image/jpeg',q)}res(d)}catch(e){rej(e)}};
  im.onerror=()=>{URL.revokeObjectURL(url);rej(new Error('bad image'))};im.src=url})}
function showPlayer(r){document.querySelectorAll('.royalProfile').forEach(x=>x.remove());const mine=!!(r.pid&&r.pid===Store.pid());const o=document.createElement('div');o.className='royalProfile';o.setAttribute('role','dialog');o.setAttribute('aria-label','پروفایل بازیکن');
  const crown=document.createElement('div');crown.className='royalCrown';crown.textContent='👑';
  const b=document.createElement('div');b.className='royalFrame';b.textContent='♛';if(!mine)b.classList.add('loading');
  const setPhoto=u=>{if(!okPhoto(u))return;const im=document.createElement('img');im.alt='';im.style.cssText='width:100%;height:100%;object-fit:cover;display:block';im.onload=()=>b.classList.remove('loading');im.src=u;b.textContent='';b.appendChild(im);b.classList.remove('loading')};
  if(mine&&Pref.get('photo'))setPhoto(Pref.get('photo'));
  const n=document.createElement('div');n.className='royalName';n.textContent=r.n||'بازیکن';
  const sc=document.createElement('div');sc.className='royalScore';sc.textContent=FA(r.s)+' امتیاز';
  const badges=document.createElement('div');badges.className='royalBadges';
  const specs=[['legendary','👑','لجند'],['grand_master','💎','گرند مستر'],['master','🔥','مستر']];const countNodes={};
  for(const [key,icon,label] of specs){const d=document.createElement('div');d.className='royalBadge';const i=document.createElement('span');i.className='ri';i.textContent=icon;const v=document.createElement('b');v.textContent=FA(Number(rankMilestoneCache[r.pid]?.[key])||0);const t=document.createElement('small');t.textContent='بار '+label+' · مجموع';d.append(i,v,t);badges.appendChild(d);countNodes[key]=v}
  const bio=document.createElement('div');bio.className='royalBio';bio.hidden=true;const hint=document.createElement('div');hint.className='royalCloseHint';hint.textContent='برای بستن پروفایل لمس کن';
  if(mine&&Pref.get('bio')){bio.textContent=Pref.get('bio');bio.hidden=false}
  if(Net.on&&r.pid){Net.rpc('arcade_rank_milestone_stats',{p_pid:r.pid}).then(st=>{if(Array.isArray(st))st=st[0];if(!st||typeof st!=='object')return;const cached=rankMilestoneCache[r.pid]||(rankMilestoneCache[r.pid]={});for(const [key] of specs){cached[key]=Math.max(Number(cached[key])||0,Number(st[key])||0);countNodes[key].textContent=FA(cached[key])}}).catch(()=>{});
    fetchT(`${SB_URL}/rest/v1/arcade_profiles?select=bio,photo,last_seen,online&pid=eq.${encodeURIComponent(r.pid)}`,{headers:{apikey:SB_KEY}},6000).then(x=>x.ok?x.json():fetchT(`${SB_URL}/rest/v1/arcade_profiles?select=bio,photo&pid=eq.${encodeURIComponent(r.pid)}`,{headers:{apikey:SB_KEY}},6000).then(y=>y.ok?y.json():[])).then(j=>{const p=j&&j[0];if(p&&p.bio&&!mine){bio.textContent=p.bio;bio.hidden=false}if(p&&p.photo)setPhoto(p.photo);if(p&&p.last_seen!==undefined){const t=Presence.parseTime(p.last_seen);Presence.mark(String(r.pid),String(p.online)==='true'||p.online===true,t||Date.now());paintStat()}}).catch(()=>{}).finally(()=>b.classList.remove('loading'));
  }else for(const [key] of specs)countNodes[key].textContent=FA(Number(rankMilestoneCache[r.pid]?.[key])||0);
  const stat=document.createElement('div');stat.className='royalStat';
  function paintStat(){stat.textContent='';
    if(mine){const pb=document.createElement('span');Ping.paint(pb);const pi=Ping.info();pb.className='pingBadge '+pi.cls;pb.textContent='پینگ تو: '+pi.txt.replace('📶 ','📶 ');stat.append(pb)}
    else{const on=Presence.isOnline(r.pid)||r.online;const ls=Presence.seen(r.pid)||r.lastSeen||0;const sp=document.createElement('span');sp.className='pingBadge'+(on?'':' off');sp.textContent=on?'🟢 آنلاین':(ls?'⚪ آخرین بازدید: '+agoFa(ls):'⚪ آفلاین');stat.append(sp)}}
  paintStat();const unsub=mine?Ping.sub(paintStat):null;if(mine)Ping.once();
  const closeBtn=document.createElement('button');closeBtn.type='button';closeBtn.className='royalClose';closeBtn.disabled=true;closeBtn.setAttribute('aria-label','بستن');
  o.append(closeBtn,crown,b,n);if(typeof r.rk==='number'&&r.rk<3){const t=ttlEl(r.rk);t.style.cssText='margin-top:-5px';o.append(t)}o.append(stat,sc,badges,bio,hint);
  const WAIT=5;let left=WAIT,ready=false;
  const close=()=>{if(!ready)return;clearInterval(tk);if(unsub)unsub();o.remove()};
  const tick=()=>{if(left>0){closeBtn.textContent=FA(left);hint.textContent='تا '+FA(left)+' ثانیه دیگه می‌تونی ببندی…'}else{ready=true;clearInterval(tk);closeBtn.disabled=false;closeBtn.textContent='✕';hint.textContent='برای بستن پروفایل لمس کن';hint.classList.add('ready')}};
  tick();const tk=setInterval(()=>{left--;tick()},1000);
  o.onclick=close;closeBtn.onclick=e=>{e.stopPropagation();close()};document.body.appendChild(o)}
function rankWeekKey(){const d=new Date();const days=(d.getDay()+2)%7;d.setHours(0,0,0,0);d.setDate(d.getDate()-days);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
async function recordRankMilestone(L){
  if(!Net.on||!Array.isArray(L))return;
  const keys=['legendary','grand_master','master'];
  const jobs=[];
  for(let i=0;i<Math.min(3,L.length);i++){
    const player=L[i];if(!player||!player.pid)continue;
    jobs.push((async()=>{
      const st=await Net.rpc('arcade_rank_milestone_tick',{p_pid:String(player.pid),p_name:String(player.n||'بازیکن'),p_rank:keys[i],p_week:rankWeekKey()});
      if(!st||typeof st!=='object')return;
      const cached=rankMilestoneCache[player.pid]||(rankMilestoneCache[player.pid]={});
      for(const key of keys)cached[key]=Math.max(Number(cached[key])||0,Number(st[key])||0);
    })());
  }
  await Promise.all(jobs);
}
function syncProfile(){
  try{if(Net&&Net.on&&Store.name())Net.rpc('arcade_profile_upsert',{p_pid:Store.pid(),p_name:Store.name(),p_avatar:'👾'})}catch(e){}
}
/* dpr: سقف وضوح بوم | p: ضریب ذرات | shake: لرزش | fx: نورپردازی و افکت (۰ تا ۲) */
const LEVELS={low:{dpr:1,p:.35,shake:0,fx:0},med:{dpr:1.5,p:.7,shake:1,fx:.7},high:{dpr:2,p:1,shake:1,fx:1.35},pro:{dpr:3,p:1.5,shake:1,fx:2}};
const GFX={k:'med',dpr:1.5,p:.7,shake:1,fx:.7,bloom:1,particles:1,shadows:1,scan:0,background:1};
let reduce=OSR,DPR=1;
function fit(){DPR=Math.min(window.devicePixelRatio||1,GFX.dpr);cv.width=W*DPR;cv.height=H*DPR}
function floaters(){
  const box=$('floaters');box.textContent='';
  if(!GFX.background)return;
  const n=Math.round(({low:0,med:5,high:9,pro:14}[GFX.k]||0)*GFX.particles);
  for(let i=0;i<n;i++){
    const s=document.createElement('span');s.className='fl';s.textContent=FUN[i%FUN.length];
    s.style.cssText=`left:${(Math.random()*92).toFixed(1)}%;--s:${(22+Math.random()*26)|0}px;--d:${(14+Math.random()*16)|0}s;--dl:-${(Math.random()*20)|0}s`;
    box.appendChild(s);
  }
}
function applyGfx(){
  const base=Pref.get('gfx');
  const k=Pref.get('lag')?'low':base;
  Object.assign(GFX,LEVELS[k]);GFX.k=k;GFX.base=base;GFX.lag=!!Pref.get('lag');
  GFX.bloom=!!Pref.get('bloom')&&!GFX.lag;
  GFX.particles=!!Pref.get('particles')&&!GFX.lag;
  GFX.shadows=!!Pref.get('shadows')&&!GFX.lag;
  GFX.scan=!!Pref.get('scan')&&!GFX.lag;
  GFX.background=!!Pref.get('background')&&!GFX.lag;
  GFX.shake=!!Pref.get('shake')&&!GFX.lag;
  GFX.dpr=Math.min(GFX.dpr,Number(Pref.get('render'))||GFX.dpr);
  GFX.fx=Math.min(GFX.fx,Number(Pref.get('fx'))||0);
  document.body.dataset.gfx=k;
  document.body.dataset.noBloom=GFX.bloom?'0':'1';
  document.body.dataset.noShadows=GFX.shadows?'0':'1';
  reduce=OSR||!GFX.shake;
  fit();floaters();
}
applyGfx();addEventListener('resize',fit);
/* ================= helpers ================= */
function rr(x,y,w,h,r){ctx.beginPath();if(ctx.roundRect)ctx.roundRect(x,y,w,h,r);else ctx.rect(x,y,w,h)}
function txt(s,x,y,size,color,weight='700',align='center'){
  ctx.font=`${weight} ${size}px ${FONT}`;ctx.textAlign=align;ctx.fillStyle=color;ctx.fillText(s,x,y);
}
function dim(a){ctx.fillStyle=`rgba(18,12,34,${a})`;ctx.fillRect(0,0,W,H)}
const hex=h=>[1,3,5].map(i=>parseInt(h.substr(i,2),16));
const mix=(a,b,t)=>{const A=hex(a),B=hex(b);return `rgb(${A.map((v,i)=>Math.round(v+(B[i]-v)*t)).join(',')})`};
const rot=(x,y,a)=>[x*Math.cos(a)-y*Math.sin(a),x*Math.sin(a)+y*Math.cos(a)];
const In={x:W/2};
const keys={};
/* ================= audio ================= */
let AC=null,muted=!Pref.get('snd'),noiseBuf=null;
function audio(){
  if(!AC){try{AC=new(window.AudioContext||window.webkitAudioContext)()}catch(e){}}
  if(AC&&AC.state==='suspended')AC.resume();
  return AC;
}
function tone(f,d,type='square',vol=.1,slide=0,delay=0){
  if(muted)return;const a=audio();if(!a)return;
  const t0=a.currentTime+delay,o=a.createOscillator(),g=a.createGain();
  o.type=type;o.frequency.setValueAtTime(f,t0);
  if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(30,f+slide),t0+d);
  g.gain.setValueAtTime(vol,t0);g.gain.exponentialRampToValueAtTime(.0001,t0+d);
  o.connect(g);g.connect(a.destination);o.start(t0);o.stop(t0+d+.02);
}
function noise(d,vol,freq=2500){
  if(muted)return;const a=audio();if(!a)return;
  if(!noiseBuf){noiseBuf=a.createBuffer(1,a.sampleRate*.3,a.sampleRate);const c=noiseBuf.getChannelData(0);for(let i=0;i<c.length;i++)c[i]=Math.random()*2-1}
  const s=a.createBufferSource(),f=a.createBiquadFilter(),g=a.createGain(),t0=a.currentTime;
  s.buffer=noiseBuf;f.type='lowpass';f.frequency.value=freq;
  g.gain.setValueAtTime(vol,t0);g.gain.exponentialRampToValueAtTime(.0001,t0+d);
  s.connect(f);f.connect(g);g.connect(a.destination);s.start(t0);s.stop(t0+d);
}
const sfx={
  ui(){tone(620,.05,'square',.04)},
  wall(){tone(300,.05,'square',.04)},
  paddle(){tone(190,.09,'triangle',.22,70)},
  hit(r){tone(260+r*18,.06,'square',.06)},
  metal(){tone(1100,.07,'sawtooth',.035,-500)},
  pop(r,c){tone(420+r*38+Math.min(c,14)*22,.12,'square',.08,260);noise(.06,.05,3200)},
  power(){[523,659,784,1047].forEach((f,i)=>tone(f,.09,'square',.06,0,i*.06))},
  lose(){tone(320,.5,'sawtooth',.1,-260);noise(.25,.09,700)},
  clear(){[523,659,784,1047,1319].forEach((f,i)=>tone(f,.15,'triangle',.12,0,i*.09))},
  over(){[392,330,262,196].forEach((f,i)=>tone(f,.25,'sawtooth',.09,-20,i*.2))},
  laser(){tone(1000,.09,'sawtooth',.03,-700)},
  launch(){tone(260,.12,'sine',.12,360)},
  pHit(){tone(330,.07,'triangle',.2,120)},
  bHit(){tone(250,.07,'triangle',.15,80)},
  point(){tone(523,.08,'square',.07);tone(784,.12,'square',.07,0,.08)},
  miss(){tone(220,.35,'sawtooth',.09,-150)},
  jump(){tone(360,.14,'square',.06,320)},
  die(){tone(260,.35,'square',.09,-200);noise(.2,.09,900)},
  mile(){tone(880,.06,'square',.05);tone(1175,.09,'square',.05,0,.07)},
  land(){noise(.05,.03,1200)},
  slice(){noise(.09,.1,6000);tone(1100,.08,'sawtooth',.03,-700)},
  bomb(){noise(.6,.22,700);tone(140,.55,'sawtooth',.14,-100)},
  whoosh(){tone(220,.18,'sine',.025,240)},
  flip(){tone(700,.05,'square',.04,260)},
  nope(){tone(210,.14,'sawtooth',.06,-90)},
  seq0(){tone(262,.16,'sine',.09,55)},
  seq1(){tone(330,.16,'triangle',.09,70)},
  seq2(){tone(392,.16,'square',.075,90)},
  seq3(){tone(523,.16,'sine',.09,110)},
  seqStart(){[262,330,392,523].forEach((f,i)=>tone(f,.09,'triangle',.055,35,i*.065))},
  seqGood(){[523,659,784].forEach((f,i)=>tone(f,.085,'sine',.06,55,i*.055))},
  seqBad(){tone(170,.22,'sawtooth',.09,-90);tone(110,.28,'triangle',.05,-40,.08)},
  godWin(){[523,659,784,1047,1319].forEach((f,i)=>tone(f,.13,'triangle',.075,45,i*.075));tone(1568,.34,'sine',.045,-260,.38)},
  godLose(){tone(180,.34,'sawtooth',.11,-100);tone(120,.45,'triangle',.07,-45,.09);noise(.22,.10,850)}
};
/* پخش صدای اختصاصی تیرام فقط وقتی حریف در پینگ‌پنگ امتیاز می‌گیرد */
const PONG_HIT_AUDIO_SRC='data:audio/mpeg;base64,AAAAIGZ0eXBpc29tAAACAGlzb21pc28yYXZjMW1wNDEAAAAIZnJlZQAAtf5tZGF0ISFFABRQAUb/8QpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpd/+IUtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0u//EKWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaXeqCFLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS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0jEWTgSpWhVAOUTVOsgiBQssnRqEoTiFWLXb8fAiGQQH31Yj8dqhnF9d2i1q4yNr5jpGV9u/GZcrZWChtdcoMrVb/kBXSCVvGAABL9kjNlAABdDSUVYAAcdRj1gAAZWPa4gAAIpddgiS0T+QAAAAAohMN6isEAAAAA+F/jvW/7qAdR8+7XyPpXfgAfbfGfavO/GfcgAPav431j+xe5/nIAHu31L8D5T+7el/tviAAA9a/FelbQAACMvOqKkUBuM1oG27DgPh7dJZ8gabPb17ARQjKihQHCtAzNQJgAQgw61cStAs8e2kIhyaAUMrU+ml13opaleabh3cQanx1wZS6DcBN5Ou6yBRsB09UG6b72jvsTrzY4x+Zz5GM99wTvsQ5MG/UMvWfHucfMqPh7+2NbWp66nmJ06YuLQVy1Dm86VNqsAVsAQhwiWeMTkRcnq+5cXUyX9mLHVR5tEAOPBYrJjHbyfX2hQEQzCOGyIAAEcJCJDjAAASjOrIgAAAfY/uh2Xb/w9YAb/8QpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpd4oIUtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS8hcUUAFFABRv/xClpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpa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';
const pongHitAudio=new Audio(PONG_HIT_AUDIO_SRC);
pongHitAudio.preload='auto';
pongHitAudio.setAttribute('playsinline','');
function pongHitSound(){
  if(muted)return;
  try{
    pongHitAudio.pause();
    pongHitAudio.currentTime=0;
    const p=pongHitAudio.play();
    if(p&&p.catch)p.catch(()=>{});
  }catch(e){}
}
/* ================= storage ================= */
/* Supabase: آدرس پروژه و کلید publishable/anon (نه secret). اگه یکی‌شون خالی باشه رتبه‌بندی فقط روی همین دستگاه می‌مونه */
const SB_URL='https://sabxzrwdqhxfdzxonwmw.supabase.co';
const SB_KEY='sb_publishable_vpVUe8xUxnxSgY1fiv3p9A_eQBWY3Hp';
const Store=(()=>{
  const KEY='arcade_v1';
  const blank=()=>({breakout:{best:0,last:0,plays:0},pong:{best:0,last:0,plays:0,wins:0,losses:0},dino:{best:0,last:0,plays:0},ninja:{best:0,last:0,plays:0},memory:{best:0,last:0,plays:0},flappy:{best:0,last:0,plays:0},snake:{best:0,last:0,plays:0},soccer:{best:0,last:0,plays:0},pancake:{best:0,last:0,plays:0},traffic:{best:0,last:0,plays:0},pacman:{best:0,last:0,plays:0},doodle:{best:0,last:0,plays:0},markhor:{best:0,last:0,plays:0},amirshahi:{best:0,last:0,plays:0},cityrun:{best:0,last:0,plays:0},hokm:{best:0,last:0,plays:0},chaharbarg:{best:0,last:0,plays:0},colorseq:{best:0,last:0,plays:0}});
  let g=blank(),ok=true,dirty=false;
  const startBest={};
  try{
    const raw=localStorage.getItem(KEY);
    if(raw){const p=JSON.parse(raw)||{};for(const k in g)if(p[k])for(const f in g[k])g[k][f]=+p[k][f]||0}
    localStorage.setItem('arc_t','1');localStorage.removeItem('arc_t');
  }catch(e){ok=false}
  function flush(){if(!dirty)return;dirty=false;try{localStorage.setItem(KEY,JSON.stringify(g))}catch(e){ok=false}}
  setInterval(flush,1500);
  const NK='arcade_name',RK='arcade_rank',SKK='arcade_skins_v1',SELK='arcade_skin_selected_v1',MAXR=20;
  const savedSkins={dino:0,snake:0},selectedSkins={dino:0,snake:0};
  try{
    const sr=JSON.parse(localStorage.getItem(SKK)||'{}')||{};
    for(const k of Object.keys(savedSkins))savedSkins[k]=Math.max(0,Math.floor(Number(sr[k])||0));
    const ss=JSON.parse(localStorage.getItem(SELK)||'{}')||{};
    for(const k of Object.keys(selectedSkins))selectedSkins[k]=Math.max(0,Math.floor(Number(ss[k])||0));
    for(const k of Object.keys(selectedSkins))if(selectedSkins[k]>savedSkins[k])selectedSkins[k]=savedSkins[k];
  }catch(e){}
  const saveSkins=()=>{try{localStorage.setItem(SKK,JSON.stringify(savedSkins))}catch(e){}};
  const saveSelectedSkins=()=>{try{localStorage.setItem(SELK,JSON.stringify(selectedSkins))}catch(e){}};
  const rank={breakout:[],pong:[],dino:[],ninja:[],memory:[],flappy:[],snake:[],soccer:[],pancake:[],traffic:[],pacman:[],doodle:[],markhor:[],amirshahi:[],cityrun:[],colorseq:[],hokm:[],chaharbarg:[]};
  let name='',pid='';
  try{
    name=localStorage.getItem(NK)||'';
    pid=localStorage.getItem('arcade_pid')||'';
    if(!pid){pid=Math.random().toString(36).slice(2,10)+Date.now().toString(36);localStorage.setItem('arcade_pid',pid)}
    const r=JSON.parse(localStorage.getItem(RK)||'{}');
    for(const k in rank)if(Array.isArray(r[k]))rank[k]=r[k].filter(x=>x&&x.s>0).slice(0,MAXR).map(x=>({pid:String(x.pid||''),n:String(x.n||'').slice(0,20),s:+x.s}));
  }catch(e){}
  return{
    isOk:()=>ok,
    get:id=>g[id],
    best:id=>g[id].best,
    begin(id){startBest[id]=g[id].best},
    live(id,s){return false},
    finish(id,s){
      const x=g[id],add=Math.max(0,Math.floor(Number(s)||0)),old=Math.max(0,Math.floor(Number(x.best)||0)),total=old+add;
      x.last=add;x.plays++;if(add>0)x.best=total;dirty=true;flush();
      if(add>0){
        const L=rank[id];
        for(let i=L.length-1;i>=0;i--){
          const samePid=L[i]&&L[i].pid&&L[i].pid===pid;
          const legacyName=L[i]&&!L[i].pid&&L[i].n===name;
          if(samePid||legacyName)L.splice(i,1);
        }
        if(name)L.push({pid:pid,n:name,s:total});
        L.sort((a,b)=>b.s-a.s);if(L.length>MAXR)L.length=MAXR;
        try{localStorage.setItem(RK,JSON.stringify(rank))}catch(e){ok=false}
        Net.put(id,total);
      }
      return add>0;
    },
    add(id,f){g[id][f]=(g[id][f]||0)+1;dirty=true},
    name:()=>name,
    pid:()=>pid||'anon',
    setName(n){name=n;try{localStorage.setItem(NK,n)}catch(e){ok=false};setTimeout(syncProfile,0)},
    rank:id=>rank[id],
    skinIndex:id=>savedSkins[id]||0,
    skinUnlocked(id,i){return i===0||i<=(savedSkins[id]||0)},
    unlockSkin(id,i){
      i=Math.max(0,Math.floor(Number(i)||0));
      if(i>(savedSkins[id]||0)){savedSkins[id]=i;saveSkins();if((selectedSkins[id]||0)>i){selectedSkins[id]=i;saveSelectedSkins()}return true}
      return false;
    },
    selectedSkin:id=>selectedSkins[id]||0,
    setSkin(id,i){
      i=Math.max(0,Math.floor(Number(i)||0));
      if(!this.skinUnlocked(id,i))return false;
      selectedSkins[id]=i;saveSelectedSkins();return true;
    },
    factory(){
      dirty=false;
      try{['arcade_v1','arcade_name','arcade_rank','arcade_pid','arcade_epoch','arcade_pref','arcade_skins_v1','arcade_skin_selected_v1'].forEach(k=>localStorage.removeItem(k))}catch(e){}
      savedSkins.dino=0;savedSkins.snake=0;selectedSkins.dino=0;selectedSkins.snake=0;
      location.reload();
    },
    epoch:()=>{try{return localStorage.getItem('arcade_epoch')||'0'}catch(e){return'0'}},
    wipe(ep){
      for(const k in g)g[k].best=0;
      for(const k in rank)rank[k]=[];
      try{localStorage.setItem(RK,JSON.stringify(rank));localStorage.setItem('arcade_epoch',String(ep))}catch(e){ok=false}
      dirty=true;flush();
    },
    week:()=>{try{return localStorage.getItem('arcade_week')||''}catch(e){return''}},
    wipeWeek(wk,doWipe){
      if(doWipe){for(const k in g)g[k].best=0;for(const k in rank)rank[k]=[];try{localStorage.setItem(RK,JSON.stringify(rank))}catch(e){ok=false}}
      try{localStorage.setItem('arcade_week',String(wk))}catch(e){ok=false}
      dirty=true;flush();
    },
    repair(){
      let n=0;
      try{
        for(const k of[KEY,RK]){const raw=localStorage.getItem(k);if(raw){try{JSON.parse(raw)}catch(e){localStorage.removeItem(k);n++}}}
      }catch(e){ok=false;return -1}
      for(const k in g)for(const f in g[k]){const v=g[k][f];if(!Number.isFinite(v)||v<0){g[k][f]=0;n++}}
      for(const k in rank){const a=rank[k].filter(x=>x&&Number.isFinite(x.s)&&x.s>0);n+=rank[k].length-a.length;rank[k]=a}
      try{localStorage.setItem(KEY,JSON.stringify(g));localStorage.setItem(RK,JSON.stringify(rank));ok=true}catch(e){ok=false;return -1}
      dirty=false;return n;
    },
    flush
  };
})();
/* ================= online rank ================= */
function fetchT(url,opt,ms=7000){
  const c=new AbortController(),id=setTimeout(()=>c.abort(),ms);
  return fetch(url,Object.assign({},opt,{signal:c.signal})).finally(()=>clearTimeout(id));
}
const Presence=(()=>{
  const online=new Set(), lastSeen=new Map();
  const CACHE='arcade_presence_cache_v2';
  let loaded=false;
  function load(){
    if(loaded)return; loaded=true;
    try{
      const x=JSON.parse(localStorage.getItem(CACHE)||'{}')||{};
      for(const [pid,ts] of Object.entries(x)){const n=Number(ts);if(pid&&Number.isFinite(n)&&n>0)lastSeen.set(pid,n)}
    }catch(e){}
  }
  function save(pid,ts){
    load();
    try{
      const x=JSON.parse(localStorage.getItem(CACHE)||'{}')||{};
      x[pid]=ts;
      const keys=Object.keys(x).sort((a,b)=>(Number(x[b])||0)-(Number(x[a])||0)).slice(0,300);
      const y={};keys.forEach(k=>y[k]=x[k]);
      localStorage.setItem(CACHE,JSON.stringify(y));
    }catch(e){}
  }
  function mark(pid,on=true,ts=Date.now()){
    if(!pid)return;
    load();
    const t=Number(ts)||Date.now();
    if(on)online.add(pid); else online.delete(pid);
    lastSeen.set(pid,t); save(pid,t);
  }
  function parseTime(v){
    if(v===null||v===undefined||v==='')return 0;
    if(typeof v==='number')return v>1e12?v: v*1000;
    const n=Number(v); if(Number.isFinite(n)&&n>0)return n>1e12?n:n*1000;
    const t=Date.parse(String(v)); return Number.isFinite(t)?t:0;
  }
  function isOnline(pid){load();return !!pid && online.has(pid)}
  function seen(pid){load();return lastSeen.get(pid)||0}
  return {online,lastSeen,mark,isOnline,seen,load,save,parseTime};
})();
const Net={
  on:!!(SB_URL&&SB_KEY),
  async put(id,v){
    if(!Net.on||!Store.name())return false;
    try{
      const r=await fetchT(`${SB_URL}/rest/v1/rpc/submit_score`,{method:'POST',keepalive:true,
        headers:{apikey:SB_KEY,'Content-Type':'application/json'},
        body:JSON.stringify({g:id,p:Store.pid(),n:Store.name(),s:v})});
      return r.ok;
    }catch(e){return false}
  },
  async top(id){
    const r=await fetchT(`${SB_URL}/rest/v1/scores?game=eq.${id}&select=pid,name,score&order=score.desc&limit=20`,{headers:{apikey:SB_KEY}});
    if(!r.ok)throw 0;
    const a=await r.json();
    let prof=[];
    try{
      let pr=await fetchT(`${SB_URL}/rest/v1/arcade_profiles?select=pid,last_seen,online&limit=1000`,{headers:{apikey:SB_KEY}});
      if(!pr.ok) pr=await fetchT(`${SB_URL}/rest/v1/arcade_profiles?select=pid&limit=1000`,{headers:{apikey:SB_KEY}});
      if(pr.ok)prof=await pr.json();
    }catch(e){}
    const pm=Object.fromEntries(prof.map(x=>{
      const parsed=Presence.parseTime(x.last_seen);
      if(x.pid&&parsed)Presence.mark(String(x.pid),String(x.online)==='true'||x.online===true,parsed);
      return [x.pid,x];
    }));
    return a.map(x=>{
      const p=pm[x.pid]||{};
      const ls=Presence.parseTime(p.last_seen)||Presence.seen(x.pid)||0;
      return {pid:x.pid,n:String(x.name||'').slice(0,14),s:+x.score||0,online:Presence.isOnline(x.pid)||String(p.online)==='true'||p.online===true,lastSeen:ls};
    }).filter(x=>x.s>0);
  },
  async presence(on=true){
    if(!Net.on||!Store.name()||!navigator.onLine)return false;
    const pid=Store.pid(), now=new Date().toISOString();
    Presence.mark(pid,!!on,Date.now());
    const body={pid:pid,name:Store.name(),avatar:'👾',last_seen:now,online:!!on};
    try{
      let r=await fetchT(`${SB_URL}/rest/v1/arcade_profiles?on_conflict=pid`,{method:'POST',keepalive:true,headers:{apikey:SB_KEY,'Content-Type':'application/json','Prefer':'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(body)},4500);
      if(r.ok)return true;
      r=await fetchT(`${SB_URL}/rest/v1/arcade_profiles?pid=eq.${encodeURIComponent(pid)}`,{method:'PATCH',keepalive:true,headers:{apikey:SB_KEY,'Content-Type':'application/json','Prefer':'return=minimal'},body:JSON.stringify({last_seen:now,online:!!on})},4500);
      if(r.ok)return true;
    }catch(e){}
    try{
      const r=await fetchT(`${SB_URL}/rest/v1/rpc/arcade_presence_upsert`,{method:'POST',keepalive:true,headers:{apikey:SB_KEY,'Content-Type':'application/json'},body:JSON.stringify({p_pid:pid,p_name:Store.name(),p_avatar:'👾',p_last_seen:now,p_online:!!on})},4500);
      return r.ok;
    }catch(e){return false}
  },
  async rpc(fn,args){
    try{
      const r=await fetchT(`${SB_URL}/rest/v1/rpc/${fn}`,{method:'POST',
        headers:{apikey:SB_KEY,'Content-Type':'application/json'},body:JSON.stringify(args||{})});
      if(!r.ok)return null;
      return await r.json();
    }catch(e){return null}
  },
  async total(){
    const r=await fetchT(`${SB_URL}/rest/v1/scores?select=pid,name,game,score&order=score.desc&limit=1000`,{headers:{apikey:SB_KEY}});
    if(!r.ok)throw 0;
    const a=await r.json(),m={};
    let prof=[];try{
      let pr=await fetchT(`${SB_URL}/rest/v1/arcade_profiles?select=pid,last_seen,online&limit=1000`,{headers:{apikey:SB_KEY}});
      if(!pr.ok)pr=await fetchT(`${SB_URL}/rest/v1/arcade_profiles?select=pid&limit=1000`,{headers:{apikey:SB_KEY}});
      if(pr.ok)prof=await pr.json();
    }catch(e){}
    const pm=Object.fromEntries(prof.map(x=>{
      const parsed=Presence.parseTime(x.last_seen);
      if(x.pid&&parsed)Presence.mark(String(x.pid),String(x.online)==='true'||x.online===true,parsed);
      return [x.pid,x];
    }));
    for(const x of a){
      if(!IDS.includes(x.game))continue;
      const o=m[x.pid]||(m[x.pid]={pid:x.pid,n:'',g:{}}),v=+x.score||0;
      if(!o.n&&x.name)o.n=String(x.name).slice(0,14);
      if(v>(o.g[x.game]||0))o.g[x.game]=v;
    }
    return Object.values(m).map(o=>{
      const p=pm[o.pid]||{};
      return {pid:o.pid,n:o.n,s:Object.values(o.g).reduce((p,q)=>p+q,0),
        online:Presence.isOnline(o.pid)||String(p.online)==='true'||p.online===true,
        lastSeen:Presence.parseTime(p.last_seen)||Presence.seen(o.pid)||0};
    })
      .filter(x=>x.s>0).sort((p,q)=>q.s-p.s).slice(0,20);
  }
};
let adminCode='';
/* ================= admin badge ================= */
const AdmSet=new Set();let admLoadedAt=0;
function admBadge(){const e=document.createElement('span');e.className='admBadge';e.textContent='✦ ادمین';return e}
function decorateChat(){
  try{document.querySelectorAll('#chatMsgs .chatMsg').forEach(row=>{
    const nm=row.querySelector('.chatName span');if(!nm)return;
    const has=row.querySelector('.admBadge'),is=AdmSet.has(row.dataset.pid||'');
    if(is&&!has)nm.after(admBadge());else if(!is&&has)has.remove();
  })}catch(e){}
}
async function loadAdmins(force){
  if(!Net.on)return;
  if(!force&&Date.now()-admLoadedAt<8000)return;
  admLoadedAt=Date.now();
  try{
    const r=await fetchT(`${SB_URL}/rest/v1/arcade_profiles?select=pid&is_admin=eq.true&limit=200`,{headers:{apikey:SB_KEY}},5000);
    if(!r.ok)return;
    const a=await r.json();
    AdmSet.clear();a.forEach(x=>x&&x.pid&&AdmSet.add(String(x.pid)));
    decorateChat();
  }catch(e){}
}
setTimeout(()=>loadAdmins(true),1500);
setInterval(()=>loadAdmins(true),30000);
/* ================= ban / kick ================= */
const Ban=(()=>{
  const LK='arcade_banned_v1';let banned=false,busy=false,started=false;
  const flagPid=()=>{try{const v=localStorage.getItem(LK);if(v)return v}catch(e){}try{const m=document.cookie.match(/(?:^|;\s*)arcade_banned=([^;]+)/);if(m)return decodeURIComponent(m[1])}catch(e){}return ''};
  const mark=pid=>{pid=String(pid||Store.pid());try{localStorage.setItem(LK,pid)}catch(e){}try{document.cookie='arcade_banned='+encodeURIComponent(pid)+';max-age=315360000;path=/;SameSite=Lax'}catch(e){}};
  const unmark=()=>{try{localStorage.removeItem(LK)}catch(e){}try{document.cookie='arcade_banned=;max-age=0;path=/'}catch(e){}};
  function lock(){
    if(banned)return;banned=true;Net.on=false;
    try{Store.flush()}catch(e){}
    try{const gf=$('gameFrame');if(gf)gf.src='about:blank'}catch(e){}
    try{document.querySelectorAll('audio,video').forEach(x=>{try{x.pause()}catch(e){}})}catch(e){}
    ['app','splash'].forEach(id=>{const el=$(id);if(el)el.style.display='none'});
    document.body.classList.remove('playing','mkfs');
    const d=document.createElement('div');d.id='banScreen';d.setAttribute('role','alertdialog');
    d.innerHTML='<div><div class="bi">🚫</div><h2>دسترسی تو مسدود شده</h2><p>ادمین تو رو از بازی بیرون انداخته؛<br>دیگه نمی‌تونی وارد بازی بشی.</p></div>';
    document.body.appendChild(d);
    try{Chat.stop()}catch(e){}
  }
  async function check(){
    if(busy)return;busy=true;
    try{
      const fp=flagPid();if(fp&&!banned)lock();
      if(!navigator.onLine)return;
      const r=await Net.rpc('arcade_is_banned',{p_pid:fp||Store.pid(),p_name:fp?'':(Store.name()||'')});
      if(r===true){mark(fp||Store.pid());lock()}
      else if(r===false&&fp){unmark();location.reload()}
    }catch(e){}finally{busy=false}
  }
  function start(){
    if(started)return;started=true;
    if(flagPid())lock();
    setTimeout(check,400);setInterval(check,25000);
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)check()});
    addEventListener('online',check);
  }
  async function checkName(v){
    if(!Net.on)return false;
    const r=await Net.rpc('arcade_is_banned',{p_pid:Store.pid(),p_name:v});
    if(r===true){mark(Store.pid());lock();return true}
    return false;
  }
  return{start,check,checkName,isBanned:()=>banned};
})();
/* ================= ping / latency ================= */
const Ping=(()=>{
  let samples=[],ms=null,timer=0,busy=false;const subs=new Set();
  const median=a=>{const b=[...a].sort((x,y)=>x-y);return b[Math.floor(b.length/2)]};
  function info(v=ms){
    if(!navigator.onLine)return{cls:'off',txt:'📴 آفلاین'};
    if(v===null)return{cls:'off',txt:'📶 …'};
    if(v<0)return{cls:'bad',txt:'🔴 بدون پاسخ'};
    return{cls:v<90?'':(v<220?'mid':'bad'),txt:'📶 '+FA(v)+' ms'};
  }
  function paint(el){if(!el)return;const i=info();el.className='pingBadge '+i.cls;el.textContent=i.txt}
  function emit(){subs.forEach(f=>{try{f(ms)}catch(e){}})}
  async function once(){
    if(busy)return;busy=true;
    try{
      if(!Net.on||!navigator.onLine){ms=null;return}
      const t0=performance.now();
      try{
        const r=await fetchT(`${SB_URL}/rest/v1/arcade_profiles?select=pid&limit=1`,{method:'HEAD',cache:'no-store',headers:{apikey:SB_KEY}},5000);
        if(r.status>=500)throw 0;
        samples.push(Math.round(performance.now()-t0));if(samples.length>5)samples.shift();ms=median(samples);
      }catch(e){samples=[];ms=-1}
    }finally{busy=false;emit()}
  }
  function start(){if(timer)return;once();timer=setInterval(()=>{if(!document.hidden)once()},8000)}
  function sub(f){subs.add(f);return()=>subs.delete(f)}
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)once()});
  addEventListener('online',once);addEventListener('offline',()=>{ms=null;emit()});
  sub(()=>paint(document.getElementById('chatPing')));
  return{start,once,sub,info,paint,get ms(){return ms}};
})();
function agoFa(ts){
  if(!ts)return'';const d=Math.max(0,Date.now()-ts),m=Math.floor(d/60000);
  if(m<1)return'چند لحظه پیش';if(m<60)return FA(m)+' دقیقه پیش';
  const h=Math.floor(m/60);if(h<24)return FA(h)+' ساعت پیش';return FA(Math.floor(h/24))+' روز پیش';
}
/* ================= live neon chat ================= */
const Chat=(()=>{
  const TOPIC='realtime:nova-arcade-chat-v1', KEY='nova_arcade_chat_history_v2', HKEY='nova_arcade_chat_hidden_v1';
  let stopped=false,ws=null,ref=0,heartbeat=0,retryTimer=0,retry=0,joined=false,lastSend=0,replyTo=null;
  let history=[],srvIds=new Set(),hidden=new Set(),deleted=new Set(),loading=false;
  try{const a=JSON.parse(localStorage.getItem(HKEY)||'[]');if(Array.isArray(a))hidden=new Set(a.slice(-300))}catch(_){}
  const saveHidden=()=>{try{localStorage.setItem(HKEY,JSON.stringify([...hidden].slice(-300)))}catch(_){}};
  const isHidden=m=>m&&(hidden.has(m.id)||deleted.has(m.id));
  function scrollEnd(){const box=$('chatMsgs');if(!box)return;const go=()=>{box.style.scrollBehavior='auto';box.scrollTop=box.scrollHeight};go();requestAnimationFrame(()=>{go();requestAnimationFrame(go)});setTimeout(go,120)}
  function emptyBox(){const box=$('chatMsgs');if(box&&!box.querySelector('.chatMsg')&&!$('chatEmpty'))box.innerHTML='<div class="chatEmpty" id="chatEmpty">هنوز پیامی نیست ✨<br>اولین پیام نئونی رو تو بفرست!</div>'}
  function removeMsg(id,persist=true){
    history=history.filter(h=>h.id!==id);
    const box=$('chatMsgs');
    if(box){const row=[...box.querySelectorAll('.chatMsg')].find(r=>r.dataset.id===id);if(row){row.classList.add('gone');setTimeout(()=>{row.remove();emptyBox()},200)}}
    if(replyTo&&replyTo.id===id)clearReply();
    if(persist)save();
  }
  function hideForMe(id){hidden.add(id);saveHidden();removeMsg(id)}
  async function serverDelete(m){
    const pid=Store.pid();let ok=false;
    try{const r=await Net.rpc('arcade_chat_delete',{p_pid:pid,p_id:m.id});if(r===true)ok=true}catch(e){}
    if(!ok){try{
      const r=await fetchT(`${SB_URL}/rest/v1/arcade_chat?id=eq.${encodeURIComponent(m.id)}&pid=eq.${encodeURIComponent(pid)}`,{method:'DELETE',keepalive:true,headers:{apikey:SB_KEY,'Prefer':'return=representation'}},5000);
      if(r.ok){const j=await r.json().catch(()=>[]);ok=Array.isArray(j)&&j.length>0}
    }catch(e){}}
    return ok;
  }
  async function deleteForAll(m){
    if(m.pid!==Store.pid())return;
    deleted.add(m.id);removeMsg(m.id);
    send({topic:TOPIC,event:'broadcast',payload:{type:'broadcast',event:'chat_delete',payload:{id:m.id,pid:m.pid}}});
    const ok=await serverDelete(m);
    if(!ok)setStatus('⚠️ از چت همه پاک شد، ولی از سرور حذف نشد (فایل chat_delete.sql رو اجرا کن)','bad');
  }

  const escName=n=>String(n||'بازیکن').slice(0,14);
  function setStatus(msg,kind=''){const el=$('chatStatus');if(el){el.textContent=msg;el.className='chatStatus '+kind}}
  function load(){try{const a=JSON.parse(localStorage.getItem(KEY)||'[]');if(Array.isArray(a))history=a.slice(-60)}catch(_){history=[]}}
  function save(){try{localStorage.setItem(KEY,JSON.stringify(history.slice(-60)))}catch(_){}
    updatePeople();
  }
  function updatePeople(){
    const ids=new Set(history.map(x=>x.pid).filter(Boolean));
    ids.add(Store.pid()||'anon');
    const pe=$('chatPeople');if(pe)pe.textContent='👥 '+FA(ids.size);
  }
  function setReply(m){replyTo=m;const r=$('chatReplying'),l=$('chatReplyLabel');if(r&&l){r.classList.add('show');l.textContent='↩️ پاسخ به '+escName(m.n)+': '+String(m.t||'').slice(0,55)}const i=$('chatInput');if(i)i.focus()}
  function clearReply(){replyTo=null;const r=$('chatReplying');if(r)r.classList.remove('show')}
  function addMsg(m,saveIt=true){
    const box=$('chatMsgs');if(!box)return;
    if(isHidden(m))return;
    if([...box.children].some(r=>r.dataset&&r.dataset.id===m.id))return;
    const empty=$('chatEmpty');if(empty)empty.remove();
    const mine=m.pid===Store.pid();
    const wasNear=box.scrollHeight-box.scrollTop-box.clientHeight<90;
    const row=document.createElement('div');row.className='chatMsg'+(mine?' me':'');row.dataset.id=m.id;row.dataset.pid=m.pid||'';
    const av=document.createElement('div');av.className='chatAv';av.textContent=String(m.av||'👾').slice(0,2);
    const bubble=document.createElement('div');bubble.className='chatBubble';
    const name=document.createElement('div');name.className='chatName';
    const nm=document.createElement('span');nm.textContent=escName(m.n);
    const tm=document.createElement('span');tm.className='chatTime';
    const d=new Date(Number(m.at)||Date.now());tm.textContent=d.toLocaleTimeString('fa-IR',{hour:'2-digit',minute:'2-digit'});
    name.append(nm,tm);if(AdmSet.has(String(m.pid||'')))nm.after(admBadge());bubble.append(name);
    if(m.reply){const rp=document.createElement('div');rp.className='chatReply';rp.textContent='↩️ '+escName(m.reply.n)+': '+String(m.reply.t||'').slice(0,70);bubble.append(rp)}
    const txt=document.createElement('div');txt.className='chatText';txt.textContent=String(m.t||'').slice(0,120);bubble.append(txt);
    const actions=document.createElement('div');actions.className='chatActions';const rb=document.createElement('button');rb.className='chatReplyBtn';rb.textContent='↩ پاسخ';rb.onclick=()=>setReply(m);actions.append(rb);
    const db=document.createElement('button');db.className='chatDelBtn';db.textContent='🗑 حذف';
    db.onclick=()=>{
      actions.textContent='';
      const me=document.createElement('button');me.className='chatDelOpt alt';me.textContent='فقط برای من';me.onclick=()=>hideForMe(m.id);actions.append(me);
      if(mine){const all=document.createElement('button');all.className='chatDelOpt';all.textContent='برای همه';all.onclick=()=>deleteForAll(m);actions.append(all)}
      const no=document.createElement('button');no.className='chatReplyBtn';no.textContent='✕';no.onclick=()=>{actions.textContent='';actions.append(rb,db)};actions.append(no);
    };
    actions.append(db);
    bubble.append(actions);
    row.append(av,bubble);box.appendChild(row);
    while(box.children.length>65)box.removeChild(box.firstElementChild);
    if(saveIt){if(!history.some(h=>h.id===m.id))history.push(m);history=history.slice(-60);save();if(wasNear||mine)box.scrollTo({top:box.scrollHeight,behavior:'smooth'})}
  }
  function renderHistory(){const box=$('chatMsgs');if(!box)return;box.innerHTML='';history=history.filter(m=>!isHidden(m));if(!history.length){box.innerHTML='<div class="chatEmpty" id="chatEmpty">هنوز پیامی نیست ✨<br>اولین پیام نئونی رو تو بفرست!</div>';updatePeople();return}history.forEach(m=>addMsg(m,false));updatePeople();scrollEnd()}
  function notify(event,payload){return send({topic:TOPIC,event:'broadcast',payload:{type:'broadcast',event,payload}})}
  function stop(){stopped=true;clearTimeout(retryTimer);clearInterval(heartbeat);try{ws&&ws.close()}catch(e){}ws=null}
  function send(o){if(ws&&ws.readyState===1){o.ref=String(++ref);ws.send(JSON.stringify(o));return true}return false}
  function join(){joined=false;send({topic:TOPIC,event:'phx_join',payload:{config:{broadcast:{self:false,ack:true},presence:{key:Store.pid()||'anon'}}}})}
  const dbRow=r=>({id:String(r.id),pid:String(r.pid||''),n:String(r.name||'بازیکن').slice(0,14),av:String(r.avatar||'👾').slice(0,4),t:String(r.text||'').slice(0,120),at:Presence.parseTime(r.created_at)||Date.now(),reply:r.reply_to||null});
  async function loadServer(){
    if(loading)return false;loading=true;
    try{
      const r=await fetchT(`${SB_URL}/rest/v1/arcade_chat?select=id,pid,name,avatar,text,reply_to,created_at&order=created_at.desc&limit=60`,{headers:{apikey:SB_KEY}},6000);
      if(!r.ok)return false;
      const rows=await r.json();if(!Array.isArray(rows))return false;
      const srv=rows.reverse().map(dbRow);srvIds=new Set(srv.map(x=>x.id));
      const fresh=history.filter(h=>!srvIds.has(h.id)&&Date.now()-(Number(h.at)||0)<15000);
      const keepScroll=false;history=srv.concat(fresh).filter(m=>!isHidden(m)).slice(-60);save();renderHistory();return true;
    }catch(e){return false}finally{loading=false}
  }
  async function saveServer(m){
    try{
      await fetchT(`${SB_URL}/rest/v1/arcade_chat`,{method:'POST',keepalive:true,headers:{apikey:SB_KEY,'Content-Type':'application/json','Prefer':'return=minimal'},
        body:JSON.stringify({id:m.id,pid:m.pid,name:m.n,avatar:m.av,text:m.t,reply_to:m.reply||null})},5000);
    }catch(e){}
  }
  function url(){return `wss://${new URL(SB_URL).host}/realtime/v1/websocket?apikey=${encodeURIComponent(SB_KEY)}&vsn=1.0.0`}
  function connect(){
    if(stopped)return;
    if(!SB_URL||!SB_KEY){setStatus('چت آنلاین تنظیم نشده','bad');return}
    if(!navigator.onLine){setStatus('آفلاینی؛ چت منتظر اینترنت است','bad');return}
    if(ws&&(ws.readyState===0||ws.readyState===1))return;
    clearTimeout(retryTimer);clearInterval(heartbeat);ws=null;setStatus('⚡ در حال اتصال به چت نئونی...');
    try{ws=new WebSocket(url())}catch(e){schedule();return}
    ws.onopen=()=>{retry=0;Presence.mark(Store.pid(),true);setStatus('🟢 چت آنلاین وصله','ok');join();heartbeat=setInterval(()=>send({topic:'phoenix',event:'heartbeat',payload:{}}),25000)};
    ws.onmessage=e=>{
      let x=null;try{x=JSON.parse(e.data)}catch(_){return}
      if(x.event==='phx_reply'&&x.payload&&x.payload.status==='ok'&&x.topic===TOPIC){joined=true;Presence.mark(Store.pid(),true);loadServer();send({topic:TOPIC,event:'presence',payload:{type:'presence',event:'track',payload:{pid:Store.pid()||'anon',name:String(Store.name()||'بازیکن').slice(0,14),at:Date.now()}}});setStatus('🟢 چت آنلاین وصله','ok');return}
      if(x.topic===TOPIC&&x.event==='presence_state'){const st=x.payload||{};Object.entries(st).forEach(([pid,v])=>{const meta=v&&Array.isArray(v.metas)?v.metas[v.metas.length-1]||{}:{};Presence.mark(pid,true,Presence.parseTime(meta.at)||Date.now())});updatePeople();return}
      if(x.topic===TOPIC&&x.event==='presence_diff'){const joins=x.payload&&x.payload.joins||{},leaves=x.payload&&x.payload.leaves||{};Object.entries(joins).forEach(([pid,v])=>{const meta=v&&Array.isArray(v.metas)?v.metas[v.metas.length-1]||{}:{};Presence.mark(pid,true,Presence.parseTime(meta.at)||Date.now())});Object.keys(leaves).forEach(pid=>Presence.mark(pid,false,Date.now()));updatePeople();return}
      if(x.event==='broadcast'&&x.topic===TOPIC){const ev=x.payload&&x.payload.event,p=x.payload&&x.payload.payload;
        if(ev==='ban_kick'){if(p&&p.pid===Store.pid())Ban.check();return}
        if(ev==='chat_delete'){if(p&&p.id){const m=history.find(h=>h.id===p.id);if(!m||m.pid===p.pid){deleted.add(p.id);removeMsg(p.id)}}return}
        if(p&&p.t&&p.n&&p.id&&!history.some(h=>h.id===p.id)&&!isHidden(p)){addMsg(p,true)}}
    };
    ws.onerror=()=>setStatus('🟠 اتصال چت ناپایدار شد');
    ws.onclose=()=>{joined=false;Presence.mark(Store.pid(),false);clearInterval(heartbeat);setStatus('🔴 اتصال چت قطع شد','bad');schedule()};
  }
  function schedule(){clearTimeout(retryTimer);retry=Math.min(retry+1,6);retryTimer=setTimeout(connect,Math.min(12000,900*Math.pow(1.45,retry)))}
  function sendText(){
    const input=$('chatInput');if(!input)return;let t=String(input.value||'').replace(/\s+/g,' ').trim();if(!t)return;
    if(!joined||!ws||ws.readyState!==1){setStatus('⏳ هنوز به چت وصل نشده؛ چند ثانیه صبر کن','bad');connect();return}
    const now=Date.now();if(now-lastSend<900)return;lastSend=now;t=t.slice(0,120);
    const m={id:(crypto.randomUUID?crypto.randomUUID():(now+'-'+Math.random())),pid:Store.pid()||'anon',n:escName(Store.name()),av:'👾',t,at:now,reply:replyTo?{pid:replyTo.pid,n:replyTo.n,t:replyTo.t}:null};
    addMsg(m,true);saveServer(m);send({topic:TOPIC,event:'broadcast',payload:{type:'broadcast',event:'chat_message',payload:m}});input.value='';clearReply();input.focus();audio();sfx.ui();
  }
  function init(){
    load();renderHistory();loadServer();
    const sendBtn=$('chatSend'),input=$('chatInput'),cancel=$('chatReplyCancel');
    if(sendBtn)sendBtn.onclick=sendText;if(cancel)cancel.onclick=clearReply;
    if(input)input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();sendText()}});
    addEventListener('online',()=>{connect();loadServer()});addEventListener('offline',()=>setStatus('🔴 اینترنت قطع شد','bad'));setTimeout(connect,700);
    document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!stopped){connect();loadServer()}});
    setInterval(()=>{const pg=$('chatPage');if(!document.hidden&&pg&&!pg.hidden&&!stopped)loadServer()},20000);
    Ping.start();Ping.paint($('chatPing'));
  }
  function enter(){renderHistory();scrollEnd();connect();loadServer()}
  return{init,stop,notify,refresh:renderHistory,scrollEnd,enter};
})();
Chat.init();Ban.start();
setTimeout(()=>Net.presence(true).catch(()=>{}),1400);

/* ================= shared result effects ================= */

const lifeFX={
  el:null,timer:0,
  clear(){
    if(!this.el)return;
    clearTimeout(this.timer);
    this.el.className='';
    this.el.setAttribute('aria-hidden','true');
    const b=this.el.querySelector('.lfBurst');if(b)b.textContent='';
  },
  show(){
    const el=this.el||$('lifeFX');this.el=el;if(!el)return;
    clearTimeout(this.timer);
    el.className='show';
    el.setAttribute('aria-hidden','false');
    const b=el.querySelector('.lfBurst');
    if(b){
      b.textContent='';
      for(let i=0;i<18;i++){
        const q=document.createElement('i');q.className='lfBit';
        const a=Math.random()*Math.PI*2,dist=70+Math.random()*145;
        q.style.setProperty('--dx',Math.cos(a)*dist+'px');
        q.style.setProperty('--dy',(Math.sin(a)*dist-26)+'px');
        q.style.setProperty('--r',(Math.random()*360-180)+'deg');
        q.style.setProperty('--rr',(Math.random()*720-360)+'deg');
        q.style.setProperty('--dl',(Math.random()*.12)+'s');
        b.appendChild(q);
      }
    }
    this.timer=setTimeout(()=>this.clear(),1300);
  }
};

const resultFX={
  el:null,timer:0,
  clear(){
    if(!this.el)return;
    clearTimeout(this.timer);
    this.el.className='';
    this.el.setAttribute('aria-hidden','true');
    const b=this.el.querySelector('.rfBurst');if(b)b.textContent='';
  },
  show(kind='lose'){
    const el=this.el||$('resultFX');this.el=el;if(!el)return;
    clearTimeout(this.timer);
    const win=kind==='win';
    el.className='show '+(win?'win':'lose');
    el.setAttribute('aria-hidden','false');
    const title=el.querySelector('.rfTitle'),sub=el.querySelector('.rfSub'),icon=el.querySelector('.rfIcon');
    if(title)title.textContent=win?'GOD!':'GAME OVER';
    if(sub)sub.textContent=win?'برد خفن! رکوردت رو قفل کردی':'این راند تموم شد؛ دوباره بزن';
    if(icon)icon.textContent=win?'👑':'💀';
    const b=el.querySelector('.rfBurst');
    if(b){
      b.textContent='';
      const n=win?28:22;
      for(let i=0;i<n;i++){
        const q=document.createElement('i');q.className='rfBit';
        const a=Math.random()*Math.PI*2,dist=(win?90:75)+Math.random()*(win?210:170);
        q.style.setProperty('--dx',Math.cos(a)*dist+'px');
        q.style.setProperty('--dy',(Math.sin(a)*dist-35)+'px');
        q.style.setProperty('--r',(Math.random()*360-180)+'deg');
        q.style.setProperty('--rr',(Math.random()*720-360)+'deg');
        q.style.setProperty('--dl',(Math.random()*.22)+'s');
        b.appendChild(q);
      }
    }
    this.timer=setTimeout(()=>this.clear(),2200);
    if(win){audio();sfx.godWin()}else{audio();sfx.godLose()}
  }
};

/* ================= embedded arcade games ================= */
const GAME_V=1; /* هر بار بازی رو آپدیت کردی این عدد رو یکی زیاد کن تا کش مرورگر پاک بشه */
const gameFrame=$('gameFrame');
let embedRunStarted=false;
window.addEventListener('message',e=>{
  const d=e&&e.data;
  if(!d||d.source!=='nova-arcade-embed'||!cur||!cur.embed||d.game!==cur.id)return;
  if(e.source!==gameFrame.contentWindow)return;
  const n=Math.max(0,Math.floor(Number(d.score)||0));
  if(d.type==='start'){
    if(!embedRunStarted){embedRunStarted=true;Shell.begin();}
    Shell.score(0);
  }else if(d.type==='score'){
    if(!embedRunStarted){embedRunStarted=true;Shell.begin();}
    Shell.score(n);
  }else if(d.type==='lifeLost'){
    if(cur.id==='pacman')lifeFX.show();
  }else if(d.type==='home'){
    goHome();
  }else if(d.type==='finish'){
    if(!embedRunStarted){embedRunStarted=true;Shell.begin();}
    Shell.finish(n,(cur.id==='markhor'||cur.id==='amirshahi'||cur.id==='cityrun')?'none':(d.won===true?'win':'lose'));embedRunStarted=false;
  }
});

/* ================= shell ================= */
const Games={};
let cur=null,paused=false,runActive=false,runScore=0,lastShown=-1;
const Shell={
  score(n){
    n=Math.floor(n);runScore=n;
    if(n!==lastShown){lastShown=n;$('sc').textContent=FA(n)}
    if(!cur.norec&&Store.live(cur.id,n))$('bs').textContent=FA(n);
  },
  hud(n){n=Math.floor(n);if(n!==lastShown){lastShown=n;$('sc').textContent=FA(n)}},
  info(s){$('info').textContent=s},
  begin(){Store.begin(cur.id);runActive=true;runScore=0},
  finish(n,kind='lose'){runActive=false;const r=Store.finish(cur.id,n);$('bs').textContent=FA(Store.best(cur.id));if(kind!=='none')resultFX.show(kind);return r},
  leave(){if(runActive&&cur){runActive=false;if(runScore>0)Store.finish(cur.id,runScore)}}
};
const META=[
  {id:'breakout',icon:'🧱',name:'بریک‌اوت',desc:'آجرها رو بشکن و پاورآپ بگیر',color:'#ff9f43'},
  {id:'pong',icon:'🏓',name:'پینگ‌پنگ',desc:'مقابل بات؛ هرچی سخت‌تر ببری، امتیاز بیشتر',color:'#48dbfb'},
  {id:'dino',icon:'🦖',name:'دایناسور',desc:'از روی کاکتوس‌ها بپر',color:'#1dd1a1'},
  {id:'ninja',icon:'🍉',name:'نینجای میوه',desc:'میوه‌ها رو ببر، مراقب بمب باش',color:'#ff4d6d'},
  {id:'memory',icon:'🃏',name:'کارت بازی',desc:'کارت‌ها رو برگردون و جفت‌های مثل هم رو پیدا کن',color:'#c77dff'},
  {id:'colorseq',icon:'🎨',name:'حافظه رنگی',desc:'رنگ‌ها رو حفظ کن و دقیقاً به همون ترتیب بزن',color:'#ff6bcb'},
  {id:'flappy',icon:'🐦',name:'فلپی‌برد',desc:'پرنده رو بالا نگه دار و از لوله‌ها رد شو',color:'#48dbfb'},
  {id:'snake',icon:'🐍',name:'مار',desc:'سیب بخور، بلندتر شو و به خودت نخور',color:'#7dffb0'},
  {id:'soccer',icon:'⚽',name:'ساکر استار',desc:'شوت بزن، از دفاع و دروازه‌بان رد شو و گل بزن',color:'#2ecc71'},
  {id:'pancake',icon:'🥞',name:'پنکیک تاور',desc:'پنکیک‌ها رو دقیق روی هم بنداز و تا بی‌نهایت بالا برو',color:'#ffb347'},
  {id:'traffic',icon:'🚗',name:'Neon Traffic',desc:'بین ماشین‌ها جاخالی بده؛ سرعت مدام بیشتر می‌شه',color:'#35f2ff'},
  {id:'pacman',icon:'🟡',name:'پک‌من',desc:'نقطه‌ها رو بخور و از روح‌ها فرار کن',color:'#ffe14a',embed:true},
  {id:'doodle',icon:'🪂',name:'پرش دودل',desc:'بپر بالا و تا جایی که می‌تونی رکورد بزن',color:'#9bda76',embed:true},
  {id:'amirshahi',icon:'👑',name:'امیر شاهی',desc:'ساکر استار با فروشگاه، دو نفره، آنلاین با کد اتاق و شرط سکه‌ای',color:'#ffd23f',embed:true},
  {id:'markhor',icon:'🩸',name:'مارخور',desc:'مار بخور، بزرگ شو و با اسکین‌های اسطوره‌ای خون به پا کن',color:'#ff4d6d',embed:true},
  {id:'cityrun',icon:'🏙️',name:'سیتی ران',desc:'دونده‌ی بی‌پایان در بیش از ۱۰۰ شهر؛ با سکه اسکین بخر',color:'#ff9f43',embed:true},
  {id:'hokm',icon:'🃏',name:'پاسور',tabName:'حکم',tabIcon:'♠️',desc:'حکم و چهار برگ؛ دو نفره آنلاین با کد اتاق، بدون تأخیر',color:'#e8c26a',embed:true,pick:true},
  {id:'chaharbarg',icon:'🃏',name:'چهار برگ',desc:'چهار برگ (پاسور) دو نفره با کد اتاق؛ رکورد بردها در لیدربورد',color:'#e8c26a',embed:true,hide:true},
];
let tab='total',rk=0;
const IDS=META.filter(m=>!m.norec).map(m=>m.id);
const TABS=[{id:'total',icon:'👑',name:'مجموع'},...META.filter(m=>!m.norec).map(m=>Object.assign({},m,{name:m.tabName||m.name,icon:m.tabIcon||m.icon}))];
function weekLeftText(){const T=12600000,n=Date.now()+T,d=Math.floor(n/864e5),nx=((Math.floor((d-1)/7)+1)*7+1)*864e5-T,m=Math.max(0,nx-Date.now()),dd=Math.floor(m/864e5),hh=Math.floor(m%864e5/36e5);return '⏳ ریست هفتگی رتبه‌ها (جمعه): '+(dd?FA(dd)+' روز و ':'')+FA(hh)+' ساعت دیگر'}
const TOTAL_NOTE='مجموع بهترین امتیاز هر نفر توی همه‌ی بازی‌ها';
const GAME_CATEGORY={
  breakout:'classic',pong:'sports',dino:'runner',ninja:'action',memory:'puzzle',colorseq:'puzzle',
  flappy:'runner',snake:'classic',soccer:'sports',pancake:'runner',traffic:'runner',pacman:'action',
  doodle:'runner',amirshahi:'sports',markhor:'action',cityrun:'runner',hokm:'classic',chaharbarg:'classic'
};
function localTotal(){
  const v=IDS.reduce((a,k)=>a+Store.best(k),0);
  return v>0?[{pid:Store.pid(),n:Store.name(),s:v}]:[];
}
const localRank=t=>t==='total'?localTotal():Store.rank(t);
function arm(btn,label,run){
  if(btn._t){clearTimeout(btn._t);btn._t=0;btn.textContent=btn._o;btn.classList.remove('arm');run();return}
  btn._o=btn.textContent;btn.textContent=label;btn.classList.add('arm');
  btn._t=setTimeout(()=>{btn._t=0;btn.textContent=btn._o;btn.classList.remove('arm')},3000);
}
const admErr=m=>{$('admErr').textContent=m||''};
function profileCard(box,L){
  const mine=tab==='total'?localTotal().reduce((a,x)=>a+x.s,0):Store.best(tab);
  const i=L.findIndex(x=>x.pid&&x.pid===Store.pid());
  const val=i>=0?L[i].s:mine;
  let sub;
  if(i>=0)sub='رتبه‌ی '+FA(i+1);
  else if(mine>0)sub=L.length>=20?'خارج از ۲۰ نفر برتر':'هنوز وارد ۲۰ نفر برتر نشدی';
  else sub='هنوز رکوردی نداری';
  const mk=(c,t)=>{const e=document.createElement('span');e.className=c;e.textContent=t;return e};
  const d=document.createElement('div');d.className='pf';
  const nm=document.createElement('span');nm.className='pn';
  nm.appendChild(mk('pt',Store.name()));nm.appendChild(mk('pr',sub));
  d.appendChild(mk('pa','👑'));d.appendChild(nm);d.appendChild(mk('sc',val>0?FA(val):'—'));
  box.appendChild(d);
}
function rankFX(){
  const box=$('rank');
  box.classList.remove('rankFxPulse');
  void box.offsetWidth;
  box.classList.add('rankFxPulse');
}
function drawRank(L,note){
  const box=$('rank');box.textContent='';
  const top=L.slice(0,3);
  const podium=document.createElement('div');podium.className='rankPodium';
  const order=[1,0,2];
  order.forEach(idx=>{
    const r=top[idx],d=document.createElement('div');d.className='rankHero r'+(idx+1)+(r?'':' empty');
    if(r){
      const symbol=['👑','💎','🔥'][idx];
      d.innerHTML=`<div class="medal">${['🥇','🥈','🥉'][idx]}</div><div class="avatar">${symbol}</div><span class="heroName"></span><b class="heroScore">${FA(r.s)}</b><div class="heroLabel">امتیاز تجمعی</div>`;
      d.querySelector('.heroName').textContent=r.n;d.insertBefore(ttlEl(idx),d.querySelector('.heroName'));if(AdmSet.has(String(r.pid||'')))d.querySelector('.heroName').after(admBadge());d.style.cursor='pointer';d.onclick=()=>showPlayer(Object.assign({},r,{rk:idx}));
      if(idx===0){d.classList.add('legendCard');for(let k=0;k<7;k++){const sp=document.createElement('i');sp.className='spk';sp.style.cssText='--x:'+(6+k*14)+'%;--d:'+(1.6+k*.3)+'s;--dl:'+(k*.35)+'s';d.appendChild(sp)}}
    }else d.innerHTML=`<div class="medal">${['🥇','🥈','🥉'][idx]}</div><div class="avatar">✦</div><span class="heroName">منتظر قهرمان</span><div class="heroLabel">هنوز رکوردی ثبت نشده</div>`;
    podium.appendChild(d);
  });
  box.appendChild(podium);
  const myBest=tab==='total'?localTotal().reduce((a,x)=>a+x.s,0):Store.best(tab);
  const myIdx=L.findIndex(x=>x.pid&&x.pid===Store.pid());
  const your=document.createElement('div');your.className='rankYour';
  your.innerHTML=`<span>⚡ رکورد تو</span><b>${myBest>0?FA(myBest):'—'}</b><small>${myIdx>=0?'رتبه '+FA(myIdx+1):'هنوز وارد ۲۰ نفر برتر نشدی'}</small>`;
  box.appendChild(your);
  if(note){const p=document.createElement('p');p.className='ds';p.style.marginBottom='6px';p.textContent=note;box.appendChild(p)}
  if(!L.length){const p=document.createElement('p');p.className='ds';p.textContent='هنوز رکوردی ثبت نشده. اولین رکورد رو بزن و تاج رو بگیر 👑';box.appendChild(p);rankFX();return}
  const head=document.createElement('div');head.className='rankListHead';head.innerHTML='<span>⚔️ جنگ رتبه‌ها</span><span>امتیاز</span>';box.appendChild(head);
  L.forEach((r,i)=>{
    const d=document.createElement('div');d.className='rk rank-'+i+(r.pid&&r.pid===Store.pid()?' me':'');
    d.innerHTML=`<span class="n">${i<3?['🥇','🥈','🥉'][i]:FA(i+1)}</span><span class="rn"></span><b class="sc">${FA(r.s)}</b>`;
    const playerName=document.createElement('span');playerName.textContent=r.n;playerName.style.cursor='pointer';playerName.onclick=e=>{e.stopPropagation();showPlayer(Object.assign({},r,{rk:i}))};
    d.children[1].append(playerName);if(i<3)d.children[1].append(ttlEl(i));if(AdmSet.has(String(r.pid||'')))d.children[1].append(admBadge());
    if(adminCode&&r.pid){
      const x=document.createElement('button');x.className='del';x.textContent='🗑';x.setAttribute('aria-label','حذف');
      x.onclick=()=>arm(x,'مطمئنی؟',async()=>{
        const ok=await Net.rpc('arcade_admin_delete',{p_code:adminCode,p_pid:r.pid,p_kick:$('admKick').checked});
        admErr(ok===true?'':'حذف انجام نشد.');
        renderRank();
      });
      d.appendChild(x);
      const bb=document.createElement('button');bb.className='del';bb.textContent='🚫';bb.setAttribute('aria-label','بن');
      bb.onclick=()=>arm(bb,'بن؟',()=>admBan(r.pid,r.n,true));d.appendChild(bb);
    }
    box.appendChild(d);
  });
  rankFX();
}
async function renderRank(){
  const t=$('tabs');t.textContent='';
  for(const m of TABS){
    const b=document.createElement('button');
    b.className='ghost'+(m.id===tab?' on':'');b.textContent=m.icon+' '+m.name;
    b.onclick=()=>{tab=m.id;sfx.ui();renderRank()};t.appendChild(b);
  }
  {const wl=$('weekLeft');if(wl)wl.textContent=weekLeftText()}
  const me=++rk,note=tab==='total'?TOTAL_NOTE:'';
  if(!Net.on){drawRank(localRank(tab),note);return}
  $('rank').textContent='در حال دریافت...';
  try{
    const [ep,kk]=await Promise.all([Net.rpc('arcade_epoch',{}),Net.rpc('arcade_kicked',{p_pid:Store.pid()})]);
    if(kk===true){Store.factory();return}
    if(me!==rk)return;
    if(typeof ep==='number'&&String(ep)!==Store.epoch()){Store.wipe(ep);renderMenu();return}
    const wk=await Net.rpc('arcade_weekly_tick',{});
    if(me!==rk)return;
    if(typeof wk==='number'||(typeof wk==='string'&&/^\d+$/.test(wk))){const w=String(wk),old=Store.week();if(old!==w){Store.wipeWeek(w,old!=='');if(old!==''){renderMenu();return}}}
    const L=tab==='total'?await Net.total():await Net.top(tab);
    if(me!==rk)return;
    await recordRankMilestone(L);
    await loadAdmins();
    drawRank(L,note);
    if(tab!=='total'){
      const mine=L.find(x=>x.pid===Store.pid()),b=Store.best(tab);
      if(b>0&&(!mine||mine.s<b)&&(L.length<20||b>L[L.length-1].s)){
        if(await Net.put(tab,b)&&me===rk)renderRank();
      }
    }
  }catch(e){
    if(me===rk)drawRank(localRank(tab),'اتصال برقرار نشد؛ رکوردهای همین دستگاه:');
  }
}
/* ---- account ---- */
let renaming=false;
const acctErr=m=>{$('acctErr').textContent=m||''};
$('renBtn').onclick=()=>{
  sfx.ui();acctErr('');renaming=true;
  nin.value=Store.name();$('nameErr').textContent='';
  $('menu').hidden=true;$('nameBox').hidden=false;$('nameCancel').hidden=false;nin.focus();
};
$('nameCancel').onclick=()=>{
  renaming=false;$('nameCancel').hidden=true;$('nameBox').hidden=true;$('menu').hidden=false;
};
$('resetBtn').onclick=e=>arm(e.currentTarget,'مطمئنی؟ همه‌چیز پاک می‌شه',async()=>{
  acctErr('در حال ریست...');
  const ok=await Net.rpc('arcade_self_reset',{p_pid:Store.pid()});
  if(ok!==true){acctErr('ریست انجام نشد؛ اینترنت رو چک کن و دوباره امتحان کن.');return}
  Store.factory();
});
/* ---- admin ---- */
function admRefresh(){
  const on=!!adminCode;
  $('admLogin').hidden=on;$('admPanel').hidden=!on;
  $('admBtn').textContent=on?'🔓 ادمین (فعال)':'🔐 ادمین';
}
$('admBtn').onclick=()=>{
  const b=$('admBox');b.hidden=!b.hidden;sfx.ui();
  if(!b.hidden&&!adminCode)$('admIn').focus();
};
async function admLogin(){
  const c=$('admIn').value.trim();if(!c)return;
  admErr('در حال بررسی...');
  const ok=await Net.rpc('arcade_admin_check',{p_code:c});
  if(ok===true){adminCode=c;$('admIn').value='';admErr('');admRefresh();renderRank();Chat.refresh()}
  else if(ok===false)admErr('کد اشتباهه');
  else admErr('به سرور وصل نشد، یا فایل admin_setup.sql هنوز توی Supabase اجرا نشده.');
}
$('admOk').onclick=admLogin;
$('admIn').onkeydown=e=>{if(e.key==='Enter')admLogin()};
setTimeout(syncProfile,1200);
$('admOut').onclick=()=>{adminCode='';admErr('');$('admBansBox').hidden=true;$('admPlayersBox').hidden=true;admRefresh();renderRank();Chat.refresh()};
$('admReset').onclick=e=>arm(e.currentTarget,'مطمئنی؟ دوباره بزن',async()=>{
  admErr('در حال ریست...');
  const ok=await Net.rpc('arcade_admin_reset',{p_code:adminCode});
  admErr(ok===true?'✅ لیدربورد ریست شد':'ریست انجام نشد.');
  renderRank();
});
async function admLoadPlayers(){
  const box=$('admPlayersBox');box.hidden=false;box.textContent='در حال دریافت بازیکن‌ها...';
  await loadAdmins(true);
  const rows=await Net.rpc('arcade_admin_list_profiles',{p_code:adminCode});
  if(!Array.isArray(rows)){box.textContent='لیست بازیکن‌ها دریافت نشد. SQL جدید ادمین را اجرا کن.';return}
  box.textContent='';
  if(!rows.length){box.textContent='بازیکنی پیدا نشد.';return}
  for(const r of rows){
    const d=document.createElement('div');d.className='adminPlayer';
    d.innerHTML=`<div class="aa">♛</div><div class="ab"><div class="an"></div><div class="am">${String(r.pid||'').slice(0,12)} · ${FA(Number(r.score)||0)} امتیاز</div><div class="ar"><input maxlength="14" value=""><button class="saveName">اسم</button><button class="admTg">⭐ ادمین</button><button class="banBtn">🚫 بن</button></div></div>`;
    d.querySelector('.an').textContent=r.name||'بازیکن';d.querySelector('input').value=r.name||'';
    d.querySelector('.saveName').onclick=async()=>{const n=d.querySelector('input').value.trim();if(!n)return;const ok=await Net.rpc('arcade_admin_rename',{p_code:adminCode,p_pid:r.pid,p_name:n});admErr(ok===true?'✅ اسم تغییر کرد':'تغییر اسم انجام نشد.');if(ok===true){r.name=n;d.querySelector('.an').textContent=n;renderRank()}};
    d.querySelector('.banBtn').onclick=e=>arm(e.currentTarget,'مطمئنی؟ بن شه',()=>admBan(r.pid,r.name,true));
    {const tg=d.querySelector('.admTg'),paint=()=>{tg.textContent=AdmSet.has(String(r.pid))?'❌ لغو ادمین':'⭐ ادمین'};paint();
     tg.onclick=()=>admSetAdmin(r.pid,!AdmSet.has(String(r.pid)),paint)}
    box.appendChild(d);
  }
}
async function admBan(pid,name,on=true){
  pid=String(pid||'');if(!pid)return;
  if(on&&pid===Store.pid()){admErr('نمی‌تونی خودت رو بن کنی 😅');return}
  admErr('در حال انجام...');
  const byName=!!($('admBanName')&&$('admBanName').checked);
  const ok=await Net.rpc('arcade_admin_ban',{p_code:adminCode,p_pid:pid,p_name:String(name||''),p_ban:!!on,p_by_name:byName});
  if(ok===true){
    admErr(on?'🚫 بن شد؛ تا چند ثانیه‌ی دیگه از بازی بیرون انداخته می‌شه':'✅ بن برداشته شد');
    if(on){try{Chat.notify('ban_kick',{pid})}catch(e){}}
    if(!$('admBansBox').hidden)admLoadBans();
  }else admErr('انجام نشد؛ فایل admin_ban_chat.sql رو توی Supabase اجرا کن.');
}
async function admLoadBans(){
  const box=$('admBansBox');box.hidden=false;box.textContent='در حال دریافت...';
  const rows=await Net.rpc('arcade_admin_list_bans',{p_code:adminCode});
  if(!Array.isArray(rows)){box.textContent='لیست دریافت نشد؛ فایل admin_ban_chat.sql رو اجرا کن.';return}
  box.textContent='';if(!rows.length){box.textContent='کسی بن نشده.';return}
  for(const r of rows){
    const d=document.createElement('div');d.className='adminPlayer';
    d.innerHTML='<div class="aa">🚫</div><div class="ab"><div class="an"></div><div class="am"></div><div class="ar"><button class="unb">✅ آزاد کردن</button></div></div>';
    d.querySelector('.an').textContent=r.name||'بازیکن';
    d.querySelector('.am').textContent=String(r.pid||'').slice(0,12)+(r.by_name?' · اسم هم بلاکه':'');
    d.querySelector('.unb').onclick=e=>arm(e.currentTarget,'مطمئنی؟',()=>admBan(r.pid,r.name,false));
    box.appendChild(d);
  }
}
$('admBans').onclick=()=>{sfx.ui();admLoadBans()};
$('admPlayers').onclick=()=>{sfx.ui();admLoadPlayers()};
async function admSetAdmin(pid,on,after){
  pid=String(pid||'');if(!pid)return;
  admErr('در حال انجام...');
  const ok=await Net.rpc('arcade_admin_set_admin',{p_code:adminCode,p_pid:pid,p_on:!!on});
  if(ok===true){
    if(on)AdmSet.add(pid);else AdmSet.delete(pid);
    admErr(on?'⭐ ادمین شد':'ادمین برداشته شد');
    decorateChat();renderRank();if(after)after();
  }else admErr('انجام نشد؛ SQL ادمین‌سازی رو توی Supabase اجرا کن.');
}
$('admSelf').onclick=async()=>{sfx.ui();await loadAdmins(true);admSetAdmin(Store.pid(),!AdmSet.has(String(Store.pid())))};
function renderPortalSummary(){
  const ids=IDS;
  const best=ids.reduce((a,k)=>a+Math.max(0,Number(Store.best(k))||0),0);
  const plays=ids.reduce((a,k)=>a+Math.max(0,Number(Store.get(k).plays)||0),0);
  $('statGames').textContent=FA(ids.length);
  $('statPlays').textContent=FA(plays);
  $('statBest').textContent=FA(best);
}
async function benchmarkDevice(){
  const cores=Math.max(1,Number(navigator.hardwareConcurrency)||2);
  const mem=Number(navigator.deviceMemory)||0;
  const dpr=Math.min(3,Number(window.devicePixelRatio)||1);
  const start=performance.now();
  let frames=0,ops=0,rafId=0;
  const can=document.createElement('canvas');
  can.width=720;can.height=480;
  const c=can.getContext('2d',{alpha:false});
  const particles=Array.from({length:220},(_,i)=>({x:(i*37)%720,y:(i*53)%480,vx:1+(i%5)*.2,vy:.6+(i%4)*.3,r:1+(i%3)}));
  return await new Promise(resolve=>{
    const loop=now=>{
      const elapsed=now-start;
      if(elapsed>=850){
        const sec=Math.max(.25,elapsed/1000),fps=frames/sec;
        let tier='low';
        if(fps>=52&&cores>=4&&(mem===0||mem>=4))tier='high';
        if(fps>=58&&cores>=6&&(mem===0||mem>=6)&&dpr<=2.5)tier='pro';
        if(tier==='low'&&fps>=34&&cores>=4)tier='med';
        if(tier==='high'&&fps<58)tier='high';
        const score=Math.round(fps*1.4+cores*7+(mem||2)*3-dpr*2);
        const result={fps:Math.round(fps),cores,mem,dpr:Math.round(dpr*10)/10,tier,score,at:Date.now()};
        Pref.set('bench',result);
        resolve(result);return;
      }
      c.fillStyle='#050814';c.fillRect(0,0,720,480);
      for(let pass=0;pass<3;pass++){
        for(const p of particles){
          p.x+=p.vx+pass*.1;if(p.x>720)p.x=0;
          p.y+=p.vy;if(p.y>480)p.y=0;
          c.beginPath();c.arc(p.x,p.y,p.r,0,Math.PI*2);c.fillStyle=pass===0?'#35f2ff':pass===1?'#ff3df0':'#9aaeff';c.fill();
          ops++;
        }
      }
      c.globalAlpha=.22;
      for(let i=0;i<20;i++){c.fillRect((i*43+frames*3)%720,(i*29+frames*2)%480,54,2)}
      c.globalAlpha=1;
      frames++;rafId=requestAnimationFrame(loop);
    };
    rafId=requestAnimationFrame(loop);
    setTimeout(()=>{if(rafId)cancelAnimationFrame(rafId)},1400);
  });
}
function benchmarkText(b){
  const ram=b.mem?FA(b.mem)+' GB':'نامشخص';
  return `تست واقعی مرورگر: میانگین ${FA(b.fps)} FPS · ${FA(b.cores)} هسته پردازشی · RAM گزارش‌شده ${ram} · امتیاز ${FA(b.score)} → پیشنهاد ${GFXN.find(x=>x[0]===b.tier)?.[1]||b.tier}.`;
}
function updateLagButton(){
  const on=!!Pref.get('lag');
  $('lagBtn').textContent=on?'🚀 حالت ضدلگ: روشن':'🚀 حالت ضدلگ: خاموش';
  $('lagBtn').classList.toggle('on',on);
}
function renderMenu(){
  renderPortalSummary();
  const box=$('cards');box.textContent='';
  for(const m of META){
    if(m.hide)continue;
    const g=m.id==='hokm'?(()=>{const a=Store.get('hokm'),c=Store.get('chaharbarg');return{best:a.best+c.best,last:a.last||c.last,plays:a.plays+c.plays,wins:0,losses:0}})():Store.get(m.id);
    const stat=m.id==='pong'?`رکورد: <b>${FA(g.best)}</b> · برد: ${FA(g.wins)} · باخت: ${FA(g.losses)}`:`رکورد: <b>${FA(g.best)}</b> · آخرین: ${FA(g.last)} · ${FA(g.plays)} بار بازی`;
    const b=document.createElement('button');
    b.className='card arcadeCard';b.dataset.gameId=m.id;b.dataset.category=GAME_CATEGORY[m.id]||'classic';b.style.setProperty('--c',m.color);b.style.setProperty('--i',META.indexOf(m));
    const badge=(m.id==='dino'?'🦖 DINO RUN':m.id==='snake'?'🐍 SNAKE LAB':m.id==='breakout'?'🧱 BRICK STORM':m.id==='pong'?'🏓 DUEL ARENA':m.id==='ninja'?'🍉 NINJA MODE':m.id==='memory'?'🃏 MEMORY LAB':m.id==='colorseq'?'🎨 COLOR MEMORY':m.id==='soccer'?'⚽ SOCCER STAR':m.id==='pancake'?'🥞 PANCAKE TOWER':m.id==='traffic'?'🚦 NEON TRAFFIC':m.id==='markhor'?'🩸 MARKHOR':m.id==='amirshahi'?'👑 AMIR SHAHI':m.id==='cityrun'?'🏙️ CITY RUN':m.id==='hokm'?'🃏 PASUR':'🐦 SKY RUN');
    const metaTxt=m.id==='hokm'?'🌐 آنلاین · لیدربورد':`🏆 ${FA(g.best)} · ${FA(g.plays)} بازی`;
    b.innerHTML=`<span class="arcadeScene"><span class="arcadeStars"></span><span class="arcadeBadge">${badge} · LIVE</span><span class="arcadeIcon">${m.icon}</span></span><span class="arcadeInfo"><span class="arcadeName">${m.name}</span><span class="arcadeDesc">${m.desc}</span><span class="arcadeMeta"><span>${metaTxt}</span><span class="arcadePlay">▶ بازی کن</span></span></span>`;
    b.onclick=()=>{audio();sfx.ui();if(m.pick)openPasurMenu();else openGame(m.id)};
    box.appendChild(b);
  }
  hello();
  renderRank();
  $('warn').hidden=Store.isOk();
}
function setTouchControls(id){
  const box=$('touchControls');
  if(!box)return;
  box.classList.remove('show');
  box.querySelectorAll('[data-touch-game]').forEach(x=>x.hidden=x.dataset.touchGame!==id);
  if(id==='snake'||id==='dino'||id==='pancake')box.classList.add('show');
}
async function lockPortrait(){
  try{await ensureFullscreen()}catch(e){}
  try{if(screen.orientation&&screen.orientation.lock)await screen.orientation.lock('portrait')}catch(e){}
}
function unlockPortrait(){try{if(screen.orientation&&screen.orientation.unlock)screen.orientation.unlock()}catch(e){}}
function openGame(id){
  resultFX.clear();
  cur=Games[id];paused=false;In.x=W/2;lastShown=-1;embedRunStarted=false;
  document.body.classList.add('playing');
  document.body.classList.toggle('memoryFS',id==='memory');
  document.body.classList.toggle('mkfs',id==='markhor'||id==='amirshahi'||id==='cityrun');
  if(id==='memory')ensureFullscreen();
  if(id==='markhor'||id==='amirshahi')lockPortrait();
  $('menu').hidden=true;$('play').hidden=false;
  $('bs').textContent=FA(Store.best(id));$('bw').hidden=!!cur.norec;$('info').textContent='';$('bp').textContent='⏸';$('bp').hidden=!!(cur.embed||cur.nopause);
  setTouchControls(id);
  if(cur.embed){cv.hidden=true;gameFrame.hidden=false;gameFrame.src=id+'.html?v='+GAME_V;return;}
  cv.hidden=false;gameFrame.hidden=true;gameFrame.src='about:blank';
  cur.enter();
}
function goHome(){
  resultFX.clear();
  if(cur&&cur.leave)cur.leave();
  Shell.leave();cur=null;paused=false;embedRunStarted=false;
  gameFrame.hidden=true;gameFrame.src='about:blank';cv.hidden=false;$('bp').hidden=false;setTouchControls('');
  document.body.classList.remove('playing');document.body.classList.remove('mkfs');document.body.classList.remove('memoryFS');unlockPortrait();
  $('play').hidden=true;$('menu').hidden=false;renderMenu();
}
function setPause(p){paused=p;$('bp').textContent=p?'▶':'⏸'}
function togglePause(){if(!cur)return;if(paused)setPause(false);else if(cur.playing())setPause(true)}
function toggleMute(){muted=!muted;Pref.set('snd',muted?0:1);$('bm').textContent=muted?'🔇':'🔊';if(!muted)audio()}
/* ================= BREAKOUT ================= */
Games.breakout=(()=>{
const id='breakout';
const LV=[
  ["1111111111","1111111111","1111111111","1111111111","1111111111"],
  ["2121212121","1212121212","2121212121","1212121212","2121212121","1212121212"],
  ["0000110000","0001221000","0012332100","0123113210","0012332100","0001221000","0000110000"],
  ["1100XX0011","2211221122","X23333332X","2211221122","0033333300"],
  ["0110000110","1221001221","1233223321","1233333321","0123333210","0012332100","0001221000","0000110000"]
];
function makeExtraLevel(stage){
  const rows=5+(stage%4),out=[],mode=stage%10,mid=(rows-1)/2;
  for(let r=0;r<rows;r++){
    let line='';
    for(let c=0;c<10;c++){
      const dx=Math.abs(c-4.5),dy=Math.abs(r-mid),radius=Math.sqrt((dx/4.8)**2+(dy/(rows*.56))**2);
      let on=false;
      switch(mode){
        case 0: on=((r+c+stage)%4!==0)||r===0||r===rows-1; break; // meteor net
        case 1: on=dx+dy*1.15<6.2; break; // diamond
        case 2: on=Math.abs(c-((r*2+stage)%10))<=1||((r+c+stage)%4===0); break; // zig-zag
        case 3: on=Math.abs(radius-.72)<.24||radius<.28; break; // orbit ring
        case 4: on=((c+stage)%4===0)||(r===0&&c>1&&c<8)||(r===rows-1&&c>1&&c<8); break; // towers
        case 5: on=(dx<4.7&&dy<rows*.53)&&!((r===1||r===2)&&(c===2||c===7))&&!(r>=rows-2&&c>=3&&c<=6); break; // alien face
        case 6: on=((r*3+c+stage)%6<4)&&dx<4.9; break; // fractured waves
        case 7: on=dx<=(r+1)*.9||r===rows-1; break; // arrowhead
        case 8: on=(dx<4.8-dy*.48)&&((r*3+c*2+stage)%7!==0||dy<1); break; // spiral maze
        default: on=(radius<1.02&&radius>.22)||((r+c)%4===0&&dx<4.5); break; // portal
      }
      if(!on){line+='0';continue;}
      if(stage>=18&&((r*7+c*3+stage)%17===0)){line+='X';continue;}
      const hp=stage<10?1+((r+c+stage)%2):1+((r*2+c+stage)%3);
      line+=String(hp);
    }
    out.push(line);
  }
  if(!out.some(row=>/[123]/.test(row)))out[Math.floor(rows/2)]='0000110000';
  return out;
}
for(let stage=6;stage<=25;stage++)LV.push(makeExtraLevel(stage));
const COL=['#ff6b81','#ff9f43','#feca57','#1dd1a1','#48dbfb','#a29bfe','#fd79a8','#55efc4'];
const POW=['W','W','M','M','S','G','G','L','P','P','B','H','D','D'];
const POWC={W:'#48dbfb',M:'#fd79a8',S:'#a29bfe',L:'#ff6b6b',G:'#feca57',P:'#8ef0a5',B:'#ff7043',H:'#f8f0a0',D:'#b7a1ff'};
const POWN={W:'پدل بزرگ',M:'چندتوپ',S:'کندتر',L:'جان +۱',G:'لیزر',P:'توپ نفوذی',B:'بمب زنجیره‌ای',H:'سپر نجات',D:'امتیاز دوبرابر'};
const BW=44,BH=18,GAP=2,OX=(W-10*(BW+GAP)+GAP)/2,OY=56;
let st='ready',score=0,lives=3,level=0,left=0,hits=0,combo=0,newBest=false,lock=0;
let balls=[],bricks=[],drops=[],parts=[],bullets=[],floats=[];
let fx={wide:0,slow:0,laser:0,pierce:0,bomb:0,shield:0,double:0},shake=0,t=0,clearT=0,bonus=0,laserT=0;
const paddle={x:W/2,y:H-50,w:84,h:12,tw:84,vx:0,sq:0};
const stars=Array.from({length:45},()=>({x:Math.random()*W,y:Math.random()*H,s:Math.random()*1.6+.4,p:Math.random()*6}));
const bgGrad=ctx.createLinearGradient(0,0,0,H);bgGrad.addColorStop(0,'#2b2050');bgGrad.addColorStop(1,'#120c22');
const mult=()=>Math.min(1+Math.floor(combo/6),4);
const speed=()=>(310+level*18+Math.min(hits*.8,110))*(fx.slow>0?.72:1);
function sync(){Shell.score(score);Shell.info('♥'.repeat(Math.max(0,lives)))}
function resetBall(){balls=[{x:paddle.x,y:paddle.y-7,vx:0,vy:0,r:6,stuck:true,trail:[]}]}
function loadLevel(i){
  bricks=[];
  LV[i].forEach((row,r)=>[...row].forEach((ch,c)=>{
    if(ch==='0')return;
    const hp=ch==='X'?99:+ch;
    bricks.push({x:OX+c*(BW+GAP),y:OY+r*(BH+GAP),w:BW,h:BH,hp,max:hp,row:r,flash:0});
  }));
  left=bricks.filter(b=>b.hp<99).length;
  drops=[];bullets=[];parts=[];floats=[];
  fx.wide=fx.slow=fx.laser=fx.pierce=fx.bomb=fx.shield=fx.double=0;paddle.tw=84;paddle.w=84;combo=0;hits=0;
  resetBall();sync();
}
function enter(){st='ready';score=0;lives=3;level=0;newBest=false;paddle.x=W/2;loadLevel(0)}
function newGame(){
  score=0;lives=3;level=0;newBest=false;paddle.x=In.x;
  Shell.begin();loadLevel(0);st='play';sfx.launch();
}
function nextLevel(){
  level++;
  if(level>=LV.length){level=LV.length-1;st='win';newBest=Shell.finish(score,'win');lock=Date.now()+800;sync()}
  else{loadLevel(level);st='play'}
}
function levelClear(){
  st='clear';clearT=2;balls=[];drops=[];bullets=[];sfx.clear();
  bonus=lives*100;score+=bonus;sync();
}
function loseLife(){
  lives--;lifeFX.show();combo=0;shake=12;sfx.lose();drops=[];bullets=[];
  fx.wide=fx.slow=fx.laser=0;paddle.tw=84;
  if(lives<=0){st='over';newBest=Shell.finish(score,'lose');lock=Date.now()+800;setTimeout(sfx.over,350)}
  else resetBall();
  sync();
}
function launch(b){
  const a=Math.random()*.5-.25,sp=speed();
  b.stuck=false;b.vx=sp*Math.sin(a)+paddle.vx*.02;b.vy=-sp*Math.cos(a);sfx.launch();
}
function burst(x,y,c,n){
  for(let i=0,N=Math.max(2,Math.round(n*GFX.p));i<N;i++){
    const a=Math.random()*6.28,s=60+Math.random()*180;
    parts.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-60,life:.5+Math.random()*.4,max:.9,c,s:2+Math.random()*2.5});
  }
}
function apply(tp){
  sfx.power();
  if(tp==='W'){fx.wide=12;paddle.tw=132}
  if(tp==='S')fx.slow=9;
  if(tp==='G')fx.laser=10;
  if(tp==='P')fx.pierce=8;
  if(tp==='B')fx.bomb=1;
  if(tp==='H')fx.shield=1;
  if(tp==='D')fx.double=12;
  if(tp==='L'){if(lives<5)lives++;else score+=200}
  if(tp==='M'){
    const add=[];
    for(const b of balls){
      if(b.stuck)continue;
      for(const a of[-.4,.4]){
        if(balls.length+add.length>=8)break;
        const v=rot(b.vx,b.vy,a);
        add.push({x:b.x,y:b.y,vx:v[0],vy:v[1],r:6,stuck:false,trail:[]});
      }
    }
    balls.push(...add);
  }
  floats.push({x:paddle.x,y:paddle.y-22,txt:POWN[tp],life:1,c:POWC[tp]});
  sync();
}
function damage(br){
  if(br.hp===99){br.flash=.1;sfx.metal();return}
  br.hp--;br.flash=.12;hits++;
  if(br.hp>0){sfx.hit(br.row);score+=5;sync();return}
  combo++;
  const pts=br.max*10*mult()*(fx.double>0?2:1);score+=pts;
  sfx.pop(br.row,combo);
  burst(br.x+br.w/2,br.y+br.h/2,COL[br.row%COL.length],12);
  floats.push({x:br.x+br.w/2,y:br.y,txt:'+'+FA(pts),life:.8,c:'#fff'});
  left--;
  if(Math.random()<.13)drops.push({x:br.x+br.w/2,y:br.y,t:POW[Math.floor(Math.random()*POW.length)]});
  sync();
  if(left<=0)levelClear();
}
function collide(b){
  const r=b.r;
  if(b.x<r){b.x=r;b.vx=Math.abs(b.vx);sfx.wall()}
  else if(b.x>W-r){b.x=W-r;b.vx=-Math.abs(b.vx);sfx.wall()}
  if(b.y<r){b.y=r;b.vy=Math.abs(b.vy);sfx.wall()}
  if(b.vy>0&&b.y+r>=paddle.y&&b.y-r<paddle.y+paddle.h&&Math.abs(b.x-paddle.x)<=paddle.w/2+r*.6){
    const rel=clamp((b.x-paddle.x)/(paddle.w/2),-1,1),a=rel*1.05,sp=Math.hypot(b.vx,b.vy);
    b.vx=sp*Math.sin(a)+paddle.vx*.04;b.vy=-sp*Math.cos(a);b.y=paddle.y-r;
    combo=0;paddle.sq=.12;sfx.paddle();
  }
  if(b.y>H+r+10){b.dead=true;return}
  for(const br of bricks){
    if(!br.hp)continue;
    const cx=clamp(b.x,br.x,br.x+br.w),cy=clamp(b.y,br.y,br.y+br.h),dx=b.x-cx,dy=b.y-cy;
    if(dx*dx+dy*dy<r*r){
      const canPierce=fx.pierce>0&&br.hp<99;
      const ex=br.x+br.w/2,ey=br.y+br.h/2;
      if(!canPierce){
        if(Math.abs(dx)>Math.abs(dy)){b.vx=(dx>0?1:-1)*Math.abs(b.vx);b.x=cx+(dx>0?r:-r)}
        else{b.vy=(dy>0?1:-1)*Math.abs(b.vy);b.y=cy+(dy>0?r:-r)}
      }else if(t-(br.lastPierce||-1)>.20){br.lastPierce=t;damage(br)}
      if(!canPierce)damage(br);
      if(fx.bomb>0&&br.hp<99&&st==='play'){
        fx.bomb=0;burst(ex,ey,'#ff7043',34);sfx.power();
        for(const other of bricks){
          if(other===br||other.hp<=0||other.hp>=99)continue;
          const ox=other.x+other.w/2,oy=other.y+other.h/2;
          if(Math.hypot(ox-ex,oy-ey)<76)damage(other);
          if(st!=='play')break;
        }
        floats.push({x:ex,y:ey,txt:'💥 زنجیره!',life:1,c:'#ffb07a'});
      }
      break;
    }
  }
}
function updateBalls(dt){
  const sp=speed();
  for(const b of balls){
    if(b.stuck){b.x=paddle.x;b.y=paddle.y-b.r-1;continue}
    let vx=b.vx,vy=b.vy;
    if(Math.abs(vy)<sp*.22)vy=(vy<0?-1:1)*sp*.22;
    const m=Math.hypot(vx,vy);b.vx=vx/m*sp;b.vy=vy/m*sp;
    const steps=Math.ceil(sp*dt/4),h=dt/steps;
    for(let i=0;i<steps&&!b.dead&&st==='play';i++){b.x+=b.vx*h;b.y+=b.vy*h;collide(b)}
    b.trail.push({x:b.x,y:b.y});if(b.trail.length>9)b.trail.shift();
  }
  balls=balls.filter(b=>!b.dead);
  if(st==='play'&&!balls.length){if(fx.shield>0){fx.shield=0;resetBall();floats.push({x:paddle.x,y:paddle.y-28,txt:'🛡 نجات!',life:1.1,c:'#f8f0a0'});sfx.power()}else loseLife()}
}
function update(dt){
  t+=dt;
  if(shake>0)shake=Math.max(0,shake-dt*30);
  if(paddle.sq>0)paddle.sq-=dt;
  for(const p of parts){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=500*dt;p.life-=dt}
  parts=parts.filter(p=>p.life>0);
  for(const f of floats){f.y-=34*dt;f.life-=dt}
  floats=floats.filter(f=>f.life>0);
  for(const br of bricks)if(br.flash>0)br.flash-=dt;
  if(st==='clear'){clearT-=dt;if(clearT<=0)nextLevel();return}
  if(st!=='play')return;
  const kx=(keys.ArrowRight||keys.KeyD?1:0)-(keys.ArrowLeft||keys.KeyA?1:0);
  if(kx)In.x+=kx*580*dt;
  paddle.w+=(paddle.tw-paddle.w)*Math.min(1,dt*10);
  In.x=clamp(In.x,paddle.w/2,W-paddle.w/2);
  const old=paddle.x;paddle.x+=(In.x-paddle.x)*Math.min(1,dt*30);
  paddle.vx=(paddle.x-old)/dt;
  if(fx.wide>0){fx.wide-=dt;if(fx.wide<=0)paddle.tw=84}
  if(fx.slow>0)fx.slow-=dt;
  if(fx.pierce>0)fx.pierce=Math.max(0,fx.pierce-dt);
  if(fx.double>0)fx.double=Math.max(0,fx.double-dt);
  if(fx.laser>0){
    fx.laser-=dt;laserT-=dt;
    if(laserT<=0){laserT=.3;bullets.push({x:paddle.x-paddle.w/2+6,y:paddle.y},{x:paddle.x+paddle.w/2-6,y:paddle.y});sfx.laser()}
  }
  for(const bl of bullets){
    bl.y-=560*dt;
    if(bl.y<-12){bl.dead=true;continue}
    for(const br of bricks){
      if(!br.hp)continue;
      if(bl.x>br.x&&bl.x<br.x+br.w&&bl.y-10<br.y+br.h&&bl.y>br.y){bl.dead=true;damage(br);break}
    }
  }
  bullets=bullets.filter(b=>!b.dead);
  if(st!=='play')return;
  for(const d of drops){
    d.y+=130*dt;
    if(d.y+8>=paddle.y&&d.y-8<=paddle.y+paddle.h&&Math.abs(d.x-paddle.x)<=paddle.w/2+15){d.dead=true;apply(d.t)}
    else if(d.y>H+20)d.dead=true;
  }
  drops=drops.filter(d=>!d.dead);
  updateBalls(dt);
}
function capsule(x,y,l){
  // Premium lightweight 3D-style pickup token: one compact draw per reward.
  const color=POWC[l]||'#d9e2f2';
  const glyph={W:'↔',M:'×3',S:'❄',L:'+1',G:'⚡',P:'◉',B:'✹',H:'⬟',D:'×2'}[l]||'★';
  ctx.save();
  ctx.translate(x,y);
  const bob=reduce?0:Math.sin(t*4+x*.07)*1.1;
  ctx.translate(0,bob);
  // Drop shadow and outer metal rim.
  ctx.globalAlpha=.25;ctx.fillStyle='#000';rr(-14,-7,30,19,6);ctx.fill();ctx.globalAlpha=1;
  const metal=ctx.createLinearGradient(-13,-10,13,10);
  metal.addColorStop(0,'#f7fbff');metal.addColorStop(.24,'#8d9aab');metal.addColorStop(.52,'#303a4a');metal.addColorStop(.78,'#dce4ec');metal.addColorStop(1,'#667386');
  ctx.fillStyle=metal;rr(-15,-10,30,20,6);ctx.fill();
  // Colored enamel face with a raised top highlight.
  const enamel=ctx.createLinearGradient(0,-8,0,8);
  enamel.addColorStop(0,'#ffffff');enamel.addColorStop(.16,color);enamel.addColorStop(1,'#202a3a');
  ctx.fillStyle=enamel;rr(-12,-7,24,14,4);ctx.fill();
  ctx.strokeStyle='rgba(255,255,255,.82)';ctx.lineWidth=.8;rr(-11.5,-6.5,23,13,3.5);ctx.stroke();
  // Tiny rivets make each pickup feel like a physical arcade artifact.
  ctx.fillStyle='#f4f5f7';ctx.beginPath();ctx.arc(-10,-5,1,0,Math.PI*2);ctx.arc(10,5,1,0,Math.PI*2);ctx.fill();
  ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=`900 ${l==='M'||l==='D'?9:12}px ${FONT}`;
  ctx.lineWidth=2.4;ctx.strokeStyle='rgba(12,17,28,.72)';ctx.strokeText(glyph,0,.5);ctx.fillStyle='#fff';ctx.fillText(glyph,0,.5);
  ctx.restore();
}
function draw(){
  ctx.fillStyle=bgGrad;ctx.fillRect(0,0,W,H);
  const tt=reduce?0:t;
  for(const s of stars){
    ctx.globalAlpha=.25+.25*Math.sin(tt*s.s+s.p);ctx.fillStyle='#cfc4ff';
    ctx.fillRect(s.x,(s.y+tt*s.s*4)%H,s.s,s.s);
  }
  ctx.globalAlpha=1;
  ctx.save();
  if(shake>0&&!reduce)ctx.translate((Math.random()-.5)*shake,(Math.random()-.5)*shake);
  for(const br of bricks){
    if(!br.hp)continue;
    if(br.hp===99){
      ctx.fillStyle='#6c6590';rr(br.x,br.y,br.w,br.h,3);ctx.fill();
      ctx.strokeStyle='rgba(255,255,255,.25)';ctx.lineWidth=2;ctx.beginPath();
      for(let i=-1;i<4;i++){ctx.moveTo(br.x+i*14,br.y+br.h);ctx.lineTo(br.x+i*14+br.h,br.y)}
      ctx.stroke();
    }else{
      ctx.fillStyle=COL[br.row%COL.length];rr(br.x,br.y,br.w,br.h,3);ctx.fill();
      ctx.fillStyle='rgba(255,255,255,.28)';ctx.fillRect(br.x+2,br.y+2,br.w-4,4);
      if(br.hp>=2){ctx.strokeStyle='rgba(255,255,255,.8)';ctx.lineWidth=1.5;rr(br.x+2.5,br.y+2.5,br.w-5,br.h-5,2);ctx.stroke()}
      if(br.hp>=3){ctx.strokeStyle='rgba(30,16,50,.55)';ctx.lineWidth=1.5;rr(br.x+6,br.y+6,br.w-12,br.h-12,1);ctx.stroke()}
    }
    if(br.flash>0){ctx.globalAlpha=Math.min(1,br.flash*6)*.7;ctx.fillStyle='#fff';rr(br.x,br.y,br.w,br.h,3);ctx.fill();ctx.globalAlpha=1}
  }
  for(const d of drops)capsule(d.x,d.y,d.t);
  ctx.fillStyle='#fff6c9';
  for(const b of bullets)ctx.fillRect(b.x-1.5,b.y-10,3,10);
  const sq=paddle.sq>0?paddle.sq/.12*2:0;
  const px=paddle.x-paddle.w/2,pg=ctx.createLinearGradient(0,paddle.y,0,paddle.y+paddle.h);
  pg.addColorStop(0,'#ffe29a');pg.addColorStop(1,'#ff9f43');
  ctx.fillStyle=pg;rr(px,paddle.y+sq,paddle.w,paddle.h-sq,6);ctx.fill();
  if(fx.laser>0){ctx.fillStyle='#fff';ctx.fillRect(px+4,paddle.y-5,4,6);ctx.fillRect(px+paddle.w-8,paddle.y-5,4,6)}
  for(const b of balls){
    const n=b.trail.length;
    ctx.fillStyle='#fff3c4';
    for(let i=0;i<n;i++){ctx.globalAlpha=i/n*.3;ctx.beginPath();ctx.arc(b.trail[i].x,b.trail[i].y,b.r*(i/n),0,6.283);ctx.fill()}
    ctx.globalAlpha=.22;ctx.beginPath();ctx.arc(b.x,b.y,b.r+5,0,6.283);ctx.fill();
    ctx.globalAlpha=1;ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,6.283);ctx.fill();
  }
  for(const p of parts){ctx.globalAlpha=clamp(p.life/p.max,0,1);ctx.fillStyle=p.c;ctx.fillRect(p.x,p.y,p.s,p.s)}
  ctx.globalAlpha=1;
  for(const f of floats){ctx.globalAlpha=clamp(f.life*1.5,0,1);txt(f.txt,f.x,f.y,14,f.c)}
  ctx.globalAlpha=1;
  ctx.restore();
  if(st==='play'||st==='clear')txt('مرحله '+FA(level+1),W-12,26,14,'#a79bd0','400','right');
  let ex=W-12;
  for(const [k,l] of [['wide','W'],['slow','S'],['laser','G'],['pierce','P'],['bomb','B'],['shield','H'],['double','D']]){
    if(fx[k]>0){ctx.globalAlpha=.9;capsule(ex-15,H-14,l);ctx.globalAlpha=.9;txt(FA(Math.ceil(fx[k])),ex-46,H-10,12,'#cfc4ff','400');ex-=70}
  }
  ctx.globalAlpha=1;
  if(st==='play'&&mult()>1)txt('×'+FA(mult())+' کمبو',14,H-10,14,'#ffd166','700','left');
  overlay();
}
function overlay(){
  const pulse=.55+.45*Math.sin(t*4);
  if(st==='ready'){
    dim(.66);
    txt('بریک‌اوت',W/2,150,56,'#ffd166');
    txt('آجرها رو بشکن و توپ رو نگه دار',W/2,190,17,'#cfc4ff','400');
    const powers=[['W','پدل بزرگ‌تر'],['M','توپ چندتایی'],['S','توپ کندتر'],['G','لیزر'],['L','جان اضافه'],['P','توپ نفوذی'],['B','بمب زنجیره‌ای'],['H','سپر نجات'],['D','امتیاز دوبرابر']];
    powers.forEach((p,i)=>{const col=i%2,row=Math.floor(i/2),x=col===0?W/2-12:W/2+112,y=238+row*30;capsule(x,y,p[0]);txt(p[1],col===0?x-21:x+21,y+4,11,'#f3ecff','400',col===0?'right':'left')});
    txt('رکورد: '+FA(Store.best(id)),W/2,420,18,'#ffd166');
    ctx.globalAlpha=pulse;txt('برای شروع بزن',W/2,490,24,'#fff');ctx.globalAlpha=1;
    txt('حرکت: ماوس، کشیدن انگشت یا ← →',W/2,555,13,'#a79bd0','400');
    txt('پرتاب توپ: لمس یا Space',W/2,578,13,'#a79bd0','400');
  }else if(st==='over'){
    dim(.68);txt('باختی!',W/2,240,52,'#ff6b81');
    txt('امتیاز: '+FA(score),W/2,295,24,'#fff');
    txt('رکورد: '+FA(Store.best(id)),W/2,330,18,'#ffd166');
    if(newBest)txt('🎉 رکورد جدید!',W/2,372,22,'#7dffb0');
    ctx.globalAlpha=pulse;txt('برای شروع دوباره بزن',W/2,430,20,'#fff');ctx.globalAlpha=1;
  }else if(st==='win'){
    dim(.68);txt('آفرین!',W/2,220,52,'#ffd166');
    txt('همه مرحله‌ها تموم شد',W/2,270,22,'#fff');
    txt('امتیاز: '+FA(score),W/2,315,24,'#fff');
    txt('رکورد: '+FA(Store.best(id)),W/2,350,18,'#ffd166');
    if(newBest)txt('🎉 رکورد جدید!',W/2,392,22,'#7dffb0');
    ctx.globalAlpha=pulse;txt('برای شروع دوباره بزن',W/2,450,20,'#fff');ctx.globalAlpha=1;
  }else if(st==='clear'){
    dim(.4);txt('مرحله '+FA(level+1)+' تمام شد',W/2,300,34,'#ffd166');
    txt('+'+FA(bonus)+' امتیاز جان‌های باقی‌مانده',W/2,338,16,'#fff','400');
  }else if(st==='play'&&balls.some(b=>b.stuck)){
    ctx.globalAlpha=pulse;txt('بزن تا توپ پرتاب شه',W/2,paddle.y-46,16,'#cfc4ff','400');ctx.globalAlpha=1;
  }
}
function down(){
  if(Date.now()<lock)return;
  if(st==='ready'||st==='over'||st==='win'){newGame();return}
  if(st==='play')for(const b of balls)if(b.stuck)launch(b);
}
return{id,enter,update,draw,down,up(){},playing:()=>st==='play',idle:()=>st==='ready'||st==='over'||st==='win'};
})();
/* ================= PONG ================= */
Games.pong=(()=>{
const id='pong',WIN=7;
const DIFFS=[
  {n:'آسان',c:'#7dffb0',sp:170,err:.95,lag:.38,lagR:.3,ball:300,max:520,pred:0,pts:100},
  {n:'متوسط',c:'#ffd166',sp:270,err:.5,lag:.18,lagR:.15,ball:340,max:640,pred:0,pts:200},
  {n:'سخت',c:'#ff6b81',sp:430,err:.08,lag:.03,lagR:.06,ball:370,max:720,pred:1,pts:300}
];
let di=clamp(Math.round(+Pref.get('diff')),0,2);
const D=()=>DIFFS[di];
const P={x:W/2,y:H-62,w:84,h:12,vx:0},B={x:W/2,y:48,w:84,h:12};
const ball={x:W/2,y:H/2,vx:0,vy:0,r:7,trail:[]};
let st='ready',ps=0,bs=0,rally=0,longest=0,serveT=0,serveDir=1,botErr=0,botLag=0,lock=0,won=false,newBest=false,scr=0,msg='',msgT=0,t=0;
let mode='choose',p1Touch=W/2,p2Touch=W/2,p1Pid=null,p2Pid=null;
const bx=i=>330-i*148,by=()=>st==='over'?420:300,BWD=116,BHT=44;
function setDiff(i){di=clamp(i,0,2);Pref.set('diff',di);sfx.ui()}
function sync(){Shell.hud(ps);Shell.info(mode==='pvp'?'بازیکن ۲ '+FA(bs):'بات '+FA(bs))}
function modeBtn(){return{w:190,h:68,y:292,x1:40,x2:250}}
function setMode(m){mode=m;st='ready';ps=bs=rally=longest=0;won=false;newBest=false;scr=0;p1Touch=p2Touch=W/2;p1Pid=p2Pid=null;serve(1);sync();sfx.ui()}
function serve(dir){
  ball.x=W/2;ball.y=H/2;ball.vx=ball.vy=0;ball.trail=[];
  serveDir=dir;serveT=1;rally=0;botErr=0;botLag=0;
}
function launchBall(){
  const a=Math.random()*.9-.45,sp=D().ball;
  ball.vx=sp*Math.sin(a);ball.vy=serveDir*sp*Math.cos(a);sfx.launch();
}
function enter(){
  st='ready';mode='choose';newBest=false;scr=0;ps=bs=rally=longest=0;P.x=B.x=W/2;ball.x=W/2;ball.y=H/2;ball.vx=ball.vy=0;ball.trail=[];
  p1Touch=p2Touch=W/2;p1Pid=p2Pid=null;sync();
}
function start(){
  if(mode==='choose')return;
  ps=bs=rally=longest=0;won=false;newBest=false;scr=0;p1Touch=p2Touch=W/2;p1Pid=p2Pid=null;
  Shell.begin();sync();
  serve(Math.random()<.5?1:-1);st='serve';sfx.launch();
}
function end(w){
  won=w;st='over';
  if(mode==='bot'){
    Store.add(id,w?'wins':'losses');
    scr=w?D().pts+(WIN-bs)*30+Math.min(longest,20)*5:0;
    newBest=Shell.finish(scr,won?'win':'lose');
  }else{
    scr=0;
    newBest=false;
  }
  lock=Date.now()+800;
  if(w)sfx.clear();else sfx.over();
}
function point(playerScored){
  if(playerScored){ps++;sfx.point();msg='امتیاز!'}else{bs++;sfx.miss();pongHitSound();msg='گرفتن توپ رو از دست دادی'}
  msgT=1;sync();
  if(ps>=WIN||bs>=WIN){end(ps>=WIN);return}
  st='serve';serve(playerScored?-1:1);
}
function hitPlayer(){
  const r=ball.r,rel=clamp((ball.x-P.x)/(P.w/2),-1,1),a=rel*1.0,d=D();
  rally++;longest=Math.max(longest,rally);
  const sp=Math.min(d.ball+rally*24,d.max);
  ball.vx=sp*Math.sin(a)+P.vx*.05;ball.vy=-sp*Math.cos(a);ball.y=P.y-r;
  if(mode==='bot'){botErr=(Math.random()*2-1)*B.w*d.err;botLag=d.lag+Math.random()*d.lagR;}else{botErr=0;botLag=0}
  sfx.pHit();
}
function hitBot(){
  const r=ball.r,rel=clamp((ball.x-B.x)/(B.w/2),-1,1),a=rel*1.0,d=D();
  rally++;
  const sp=Math.min(d.ball+rally*24,d.max);
  ball.vx=sp*Math.sin(a);ball.vy=sp*Math.cos(a);ball.y=B.y+B.h+r;
  sfx.bHit();
}
/* پیش‌بینی نقطه‌ی رسیدن توپ به بات، با حساب کردن برخورد به دیوارها (فقط برای سطح سخت) */
function predict(){
  const ty=B.y+B.h+ball.r,tt=(ty-ball.y)/ball.vy;
  if(!(tt>0))return ball.x;
  const span=W-2*ball.r;
  let x=ball.x+ball.vx*tt-ball.r;
  x=((x%(2*span))+2*span)%(2*span);
  if(x>span)x=2*span-x;
  return x+ball.r;
}
function collide(){
  const r=ball.r;
  if(ball.x<r){ball.x=r;ball.vx=Math.abs(ball.vx);sfx.wall()}
  else if(ball.x>W-r){ball.x=W-r;ball.vx=-Math.abs(ball.vx);sfx.wall()}
  if(ball.vy>0&&ball.y+r>=P.y&&ball.y-r<P.y+P.h&&Math.abs(ball.x-P.x)<=P.w/2+r*.6)hitPlayer();
  else if(ball.vy<0&&ball.y-r<=B.y+B.h&&ball.y+r>B.y&&Math.abs(ball.x-B.x)<=B.w/2+r*.6)hitBot();
  if(ball.y<-r*2)point(true);
  else if(ball.y>H+r*2)point(false);
}
function update(dt){
  t+=dt;
  if(msgT>0)msgT-=dt;
  if(st!=='play'&&st!=='serve')return;
  const d=D();
  if(mode==='bot'){
    const kx=(keys.ArrowRight||keys.KeyD?1:0)-(keys.ArrowLeft||keys.KeyA?1:0);
    if(kx)In.x+=kx*600*dt;
    In.x=clamp(In.x,P.w/2,W-P.w/2);
    const o=P.x;P.x+=(In.x-P.x)*Math.min(1,dt*28);P.vx=(P.x-o)/Math.max(dt,.0001);
    let aim=W/2,wait=false;
    if(st==='play'&&ball.vy<0){
      if(botLag>0){botLag-=dt;wait=true}
      else aim=(d.pred?predict():ball.x)+botErr;
    }
    if(!wait){const step=d.sp*dt;B.x+=clamp(aim-B.x,-step,step)}
    B.x=clamp(B.x,B.w/2,W-B.w/2);
  }else if(mode==='pvp'){
    const po=P.x,bo=B.x;
    P.x+=(p1Touch-P.x)*Math.min(1,dt*32);
    B.x+=(p2Touch-B.x)*Math.min(1,dt*32);
    P.vx=(P.x-po)/Math.max(dt,.0001);
    B.x=clamp(B.x,B.w/2,W-B.w/2);P.x=clamp(P.x,P.w/2,W-P.w/2);
  }
  if(st==='serve'){serveT-=dt;if(serveT<=0){launchBall();st='play'}return}
  const sp=Math.hypot(ball.vx,ball.vy),steps=Math.max(1,Math.ceil(sp*dt/4)),h=dt/steps;
  for(let i=0;i<steps&&st==='play';i++){ball.x+=ball.vx*h;ball.y+=ball.vy*h;collide()}
  if(st==='play'){ball.trail.push({x:ball.x,y:ball.y});if(ball.trail.length>10)ball.trail.shift()}
}
function btns(){
  const y=by();
  txt('سختی بات',W/2,y-14,15,'#cfc4ff','400');
  DIFFS.forEach((d,i)=>{
    const x=bx(i),on=i===di;
    rr(x,y,BWD,BHT,12);ctx.fillStyle=on?d.c:'rgba(255,255,255,.08)';ctx.fill();
    ctx.strokeStyle=on?'#fff':'rgba(255,255,255,.3)';ctx.lineWidth=on?2.5:1.5;ctx.stroke();
    txt(d.n,x+BWD/2,y+29,18,on?'#10142b':'#f3ecff');
  });
}
function draw(){
  const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#0e3a43');g.addColorStop(1,'#0a1f2b');
  ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  ctx.strokeStyle='rgba(255,255,255,.08)';ctx.lineWidth=3;ctx.strokeRect(6,6,W-12,H-12);
  ctx.setLineDash([12,12]);ctx.strokeStyle='rgba(255,255,255,.18)';ctx.lineWidth=3;
  ctx.beginPath();ctx.moveTo(10,H/2);ctx.lineTo(W-10,H/2);ctx.stroke();ctx.setLineDash([]);
  txt(FA(bs),W/2,H/2-36,70,'rgba(255,255,255,.09)');
  txt(FA(ps),W/2,H/2+96,70,'rgba(255,255,255,.09)');
  txt(mode==='pvp'?'بازیکن ۲':'بات · '+D().n,W-14,26,13,'rgba(255,255,255,.45)','400','right');
  txt(mode==='pvp'?'بازیکن ۱':'تو',W-14,H-14,13,'rgba(255,255,255,.45)','400','right');
  const glow=GFX.fx>0&&GFX.bloom;
  if(glow){ctx.shadowColor='rgba(120,220,255,.9)';ctx.shadowBlur=9*GFX.fx}
  ctx.fillStyle='#ffcf5c';rr(P.x-P.w/2,P.y,P.w,P.h,6);ctx.fill();
  ctx.fillStyle='#5fd4ff';rr(B.x-B.w/2,B.y,B.w,B.h,6);ctx.fill();
  const n=ball.trail.length;
  ctx.fillStyle='#fff';
  for(let i=0;i<n;i++){ctx.globalAlpha=i/n*.3;ctx.beginPath();ctx.arc(ball.trail[i].x,ball.trail[i].y,ball.r*(i/n),0,6.283);ctx.fill()}
  ctx.globalAlpha=.2;ctx.beginPath();ctx.arc(ball.x,ball.y,ball.r+5,0,6.283);ctx.fill();
  ctx.globalAlpha=1;ctx.beginPath();ctx.arc(ball.x,ball.y,ball.r,0,6.283);ctx.fill();
  if(glow){ctx.shadowBlur=0;ctx.shadowColor='transparent'}
  if(st==='play'&&rally>=3)txt('رالی ×'+FA(rally),14,H-14,14,'#ffd166','700','left');
  const pulse=.55+.45*Math.sin(t*4);
  if(st==='serve'){ctx.globalAlpha=pulse;txt('آماده باش...',W/2,H/2-70,18,'#fff','400');ctx.globalAlpha=1}
  if(msgT>0&&(st==='serve')){ctx.globalAlpha=clamp(msgT*2,0,1);txt(msg,W/2,H/2+150,16,'#ffd166');ctx.globalAlpha=1}
  if(st==='ready'){
    const g2=Store.get(id);
    dim(.62);
    txt('پینگ‌پنگ',W/2,130,52,'#5fd4ff');
    if(mode==='choose'){
      txt('حالت بازی رو انتخاب کن',W/2,178,18,'#cfc4ff','400');
      const mb=modeBtn();
      rr(mb.x1,mb.y,mb.w,mb.h,14);ctx.fillStyle='rgba(95,212,255,.18)';ctx.fill();ctx.strokeStyle='#5fd4ff';ctx.lineWidth=2;ctx.stroke();
      rr(mb.x2,mb.y,mb.w,mb.h,14);ctx.fillStyle='rgba(255,122,217,.18)';ctx.fill();ctx.strokeStyle='#ff7ad9';ctx.lineWidth=2;ctx.stroke();
      txt('🤖 با بات',mb.x1+mb.w/2,mb.y+29,21,'#fff','800');
      txt('👥 دونفره',mb.x2+mb.w/2,mb.y+29,21,'#fff','800');
      txt('یک گوشی · یک نفر بالا · یک نفر پایین',W/2,402,14,'#a79bd0','400');
      txt('هر دو بازیکن با کشیدن انگشت، راکت خودشون رو حرکت می‌دن',W/2,430,13,'#a79bd0','400');
      txt('کنترل با بات: کشیدن انگشت یا ← →',W/2,492,13,'#a79bd0','400');
      txt('امتیاز از ۷؛ برنده کسیه که زودتر به ۷ برسه',W/2,520,13,'#a79bd0','400');
    }else{
      txt(mode==='bot'?'مقابل بات بازی کن':'دونفره روی یک گوشی',W/2,178,18,'#cfc4ff','400');
      txt('اولین نفری که ۷ امتیاز بگیره برنده‌ست',W/2,211,16,'#f3ecff','400');
      if(mode==='bot'){
        txt('برای ثبت رکورد باید ببری؛ سخت‌تر = امتیاز بیشتر',W/2,238,14,'#a79bd0','400');
        btns();
        txt('رکورد '+FA(g2.best)+' · برد '+FA(g2.wins)+' · باخت '+FA(g2.losses),W/2,385,16,'#ffd166');
        txt('سختی با کلیدهای ۱ ۲ ۳ هم عوض می‌شه',W/2,578,13,'#a79bd0','400');
      }else{
        txt('صفحه از وسط دو نیمه است: بازیکن ۲ بالا، تو پایین',W/2,238,14,'#a79bd0','400');
        txt('بالای صفحه را برای بازیکن ۲ و پایین را برای خودت لمس/بکش',W/2,272,13,'#a79bd0','400');
        ctx.globalAlpha=pulse;txt('برای شروع بزن',W/2,360,24,'#fff');ctx.globalAlpha=1;
      }
    }
  }else if(st==='over'){
    dim(.68);
    txt(mode==='pvp'?(won?'بازیکن پایین برد! 🎉':'بازیکن بالا برد! 🏆'):(won?'بردی! 🎉':'باختی!'),W/2,220,52,won?'#7dffb0':'#ff6b81');
    txt(FA(ps)+' - '+FA(bs),W/2,272,28,'#fff');
    txt('طولانی‌ترین رالی: '+FA(longest),W/2,308,15,'#cfc4ff','400');
    if(mode==='bot'){
      if(won){txt('امتیاز: '+FA(scr),W/2,346,24,'#fff');txt(newBest?'🎉 رکورد جدید!':'رکورد: '+FA(Store.best(id)),W/2,376,18,newBest?'#7dffb0':'#ffd166')}
      else txt('برای ثبت امتیاز باید ببری',W/2,350,16,'#a79bd0','400');
      btns();
    }else{
      txt('این مسابقه دونفره روی همین گوشیه',W/2,340,16,'#a79bd0','400');
    }
    ctx.globalAlpha=pulse;txt('برای بازی دوباره بزن',W/2,490,20,'#fff');ctx.globalAlpha=1;
    txt('🏠 برای انتخاب حالت دیگر، گوشه‌ی بالا را بزن',W/2,525,12,'#7185b2','400');
  }
}
function down(e){
  if(Date.now()<lock)return;
  if(st==='ready'){
    const x=e&&e.clientX!==undefined?px(e):W/2,y=e&&e.clientY!==undefined?py(e):H/2;
    if(mode==='choose'){
      const mb=modeBtn();
      if(x>=mb.x1&&x<=mb.x1+mb.w&&y>=mb.y&&y<=mb.y+mb.h){setMode('bot');return}
      if(x>=mb.x2&&x<=mb.x2+mb.w&&y>=mb.y&&y<=mb.y+mb.h){setMode('pvp');return}
      return;
    }
    if(mode==='bot'&&e&&e.clientX!==undefined){
      const yy=by();
      for(let i=0;i<3;i++)if(x>=bx(i)&&x<=bx(i)+BWD&&y>=yy&&y<=yy+BHT){setDiff(i);return}
    }
    if(mode==='pvp'&&e&&e.clientX!==undefined){
      const pid=e.pointerId;
      if(y<H/2){p2Pid=pid;p2Touch=clamp(x,B.w/2,W-B.w/2)}else{p1Pid=pid;p1Touch=clamp(x,P.w/2,W-P.w/2)}
      if(e.currentTarget&&e.currentTarget.setPointerCapture)try{e.currentTarget.setPointerCapture(pid)}catch(_){}}
    start();
    return;
  }
  if(st==='over'){
    if(mode==='bot'&&e&&e.clientX!==undefined){
      const x=px(e),y=py(e),yy=by();
      for(let i=0;i<3;i++)if(x>=bx(i)&&x<=bx(i)+BWD&&y>=yy&&y<=yy+BHT){setDiff(i);return}
    }
    start();
  }
}
function move(e){
  if(mode!=='pvp'||st!=='play'&&st!=='serve')return;
  const x=clamp(px(e),0,W);
  if(e.pointerId===p2Pid||py(e)<H/2){p2Touch=clamp(x,B.w/2,W-B.w/2);p2Pid=e.pointerId}
  else if(e.pointerId===p1Pid||py(e)>=H/2){p1Touch=clamp(x,P.w/2,W-P.w/2);p1Pid=e.pointerId}
}
function up(){ }
function key(c){
  if(mode!=='bot'||(st!=='ready'&&st!=='over'))return false;
  const m={Digit1:0,Digit2:1,Digit3:2,Numpad1:0,Numpad2:1,Numpad3:2}[c];
  if(m===undefined)return false;
  setDiff(m);return true;
}
return{id,enter,update,draw,down,move,up,key,playing:()=>st==='play'||st==='serve',idle:()=>st==='ready'||st==='over'};
})();
/* ================= DINO (بازنویسی کامل · اسکین‌های اختصاصی · افکت‌های سنگین) ================= */
Games.dino=(()=>{
const id='dino',GY=450,DX=70,G=2500,JV=800,PI2=Math.PI*2;
const rnd=(a,b)=>a+Math.random()*(b-a),pick=a=>a[(Math.random()*a.length)|0];
const FIRE=['#fff2a1','#ffd34d','#ff7a24','#ff3b1f'],DUSTC='#cfae7a';

/* ---------- اسکین‌ها: هر ۵۰۰ امتیاز یکی باز می‌شود ---------- */
const SKINS=[
 {name:'کلاسیک 🦖',fx:'none',c:{body:'#3f9d6a',dark:'#256b49',belly:'#bff0cf',spike:'#1d4d38',eye:'#ffffff',glow:'#7dffb0'}},
 {name:'آتشین 🔥',fx:'fire',c:{body:'#e8431f',dark:'#a3200e',belly:'#ffb347',spike:'#ffd34d',eye:'#fff6b0',glow:'#ff7a24'}},
 {name:'یخی ❄️',fx:'ice',c:{body:'#5ec8f2',dark:'#2a8bc2',belly:'#eaffff',spike:'#d6f6ff',eye:'#0b2c4a',glow:'#9fe8ff'}},
 {name:'طوفانی ⚡',fx:'storm',c:{body:'#5a4bd6',dark:'#352a98',belly:'#cfc8ff',spike:'#ffe84d',eye:'#fff36b',glow:'#b7a6ff'}},
 {name:'سمی ☣️',fx:'toxic',c:{body:'#4fbf2e',dark:'#2d7d17',belly:'#d7ff6a',spike:'#a24dff',eye:'#f6ff6a',glow:'#9dff4d'}},
 {name:'سایه 🌑',fx:'shadow',c:{body:'#2a2a46',dark:'#14142a',belly:'#46466e',spike:'#8e6bff',eye:'#d9c8ff',glow:'#7a5cff'}},
 {name:'گدازه 🌋',fx:'magma',c:{body:'#2e2522',dark:'#171211',belly:'#4a3a35',spike:'#ff5a1f',eye:'#ffcf5a',glow:'#ff6a1f'}},
 {name:'کهکشانی 🌌',fx:'galaxy',c:{body:'#2b2470',dark:'#171245',belly:'#5a49c9',spike:'#ff6ee8',eye:'#ffffff',glow:'#8f7bff'}},
 {name:'طلایی 👑',fx:'gold',c:{body:'#e0a21a',dark:'#a8700a',belly:'#fff0a0',spike:'#fff7c8',eye:'#3a2200',glow:'#ffd84a'}},
 {name:'الماسی 💎',fx:'diamond',c:{body:'#8fe9ff',dark:'#4cb7d9',belly:'#ffffff',spike:'#e9fbff',eye:'#103a52',glow:'#c8f6ff'}},
 {name:'رنگین‌کمانی 🌈',fx:'rainbow',c:{body:'#ff4d9d',dark:'#c21f70',belly:'#ffe0f0',spike:'#ffffff',eye:'#2a0a1e',glow:'#ffffff'}},
 {name:'اژدهای سلطنتی 🐉',fx:'royal',c:{body:'#8a1230',dark:'#520a1c',belly:'#ffcf7a',spike:'#ffd84a',eye:'#ffe27a',glow:'#ff3d5a'}}
];
SKINS.forEach((s,i)=>{s.need=i*500});
const NS=SKINS.length;
const skinForScore=v=>Math.min(NS-1,Math.floor(Math.max(0,v)/500));

/* ---------- وضعیت ---------- */
const KINDS=[[[18,40]],[[22,56]],[[18,40],[18,40]],[[26,62]],[[22,56],[18,40]],[[18,40],[22,56],[18,40]]];
let st='ready',t=0,spd=300,dist=0,score=0,newBest=false,lock=0,skin=0,pv=0;
let jumpBuf=0,mile=0,night=0,flash=0,shake=0,hitstop=0,deadT=0,skinPulse=0,bannerSkin=0,scorePop=0;
let since=0,gapNeed=420,lastW=0,bg1=0,bg2=0,gnd=0,trAcc=0,ghAcc=0,skyT=4,navL=false,navR=false;
let obs=[],parts=[],rings=[],bolts=[],ghosts=[],tr=[];
const D={y:0,vy:0,air:false,anim:0,duck:false,rot:0,sq:0,dx:0,dvx:0,vr:0};
const acc={};

/* ---------- صحنه ---------- */
const stars=Array.from({length:70},(_,i)=>({x:(i*97)%W,y:(i*53)%330,s:.6+((i*7)%10)/8,p:i}));
let clouds=[],pebbles=[],tufts=[],lines=[];
function initScene(){
  clouds=Array.from({length:6},(_,i)=>({x:i*95+rnd(0,40),y:50+rnd(0,190),w:50+rnd(0,50),l:i%2}));
  pebbles=Array.from({length:26},()=>({x:rnd(0,W),y:GY+12+rnd(0,H-GY-30),w:2+rnd(0,9)}));
  tufts=Array.from({length:12},()=>({x:rnd(0,W),y:GY+8+rnd(0,40),h:5+rnd(0,6)}));
  lines=Array.from({length:16},()=>({x:rnd(0,W),y:rnd(40,GY-20),l:30+rnd(0,70),v:.8+rnd(0,.9)}));
}
const vig=ctx.createRadialGradient(W/2,H*.5,H*.34,W/2,H*.5,H*.78);
vig.addColorStop(0,'rgba(0,0,0,0)');vig.addColorStop(1,'rgba(0,0,0,.42)');

/* ---------- کمکی ---------- */
const cap=()=>Math.round(({low:40,med:110,high:190,pro:280}[GFX.k]||110)*(GFX.lag?.3:1));
const POn=()=>!!GFX.particles;
const FXI=()=>clamp(Number(GFX.fx)||0,0,2);
const LQ=()=>!!GFX.lag||GFX.k==='low';
function em(o){
  if(!POn()||parts.length>=cap())return;
  const p=Object.assign({x:0,y:0,vx:0,vy:0,g:0,drag:0,life:.6,size:3,grow:0,col:'#fff',a:1,k:'dot',add:false,rot:rnd(0,6.28),vr:0,w:0},o);
  p.max=p.life;parts.push(p);
}
function rate(k,r,dt){acc[k]=(acc[k]||0)+dt*r;let n=0;while(acc[k]>=1&&n<5){acc[k]-=1;n++}if(acc[k]>=1)acc[k]=0;return n}
function glow(x,y,r,col,a){
  if(a<=0.01||r<=0)return;
  const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,col);g.addColorStop(1,'rgba(0,0,0,0)');
  ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha=Math.min(1,a);ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);ctx.restore();
}
function star4(x,y,r,rot){
  ctx.beginPath();
  for(let i=0;i<8;i++){const a=rot+i*Math.PI/4,rd=i%2?r*.28:r;const px=x+Math.cos(a)*rd,py=y+Math.sin(a)*rd;if(i)ctx.lineTo(px,py);else ctx.moveTo(px,py)}
  ctx.closePath();
}
const hsl=(h,l)=>`hsl(${Math.round(h)%360},100%,${l||62}%)`;

/* ---------- افکت‌ها ---------- */
function zap(cx,cy,S,col){
  if(bolts.length>14)return;
  const a0=rnd(0,PI2),pts=[];let x=cx+Math.cos(a0)*14*S,y=cy+Math.sin(a0)*14*S;pts.push([x,y]);
  const n=4+((Math.random()*3)|0);
  for(let i=0;i<n;i++){x+=Math.cos(a0)*10*S+rnd(-7,7)*S;y+=Math.sin(a0)*10*S+rnd(-7,7)*S;pts.push([x,y])}
  bolts.push({pts,life:.15,max:.15,col});
}
function skyBolt(){
  const x=DX+rnd(60,300),pts=[[x,0]];let y=0,xx=x;
  while(y<GY){y+=rnd(30,56);xx+=rnd(-26,26);pts.push([xx,Math.min(y,GY)])}
  if(bolts.length<16)bolts.push({pts,life:.22,max:.22,col:'#e6dcff',big:true});
  flash=Math.max(flash,.3);shake=Math.max(shake,5);
}
function fxTick(dt,sk,cx,gy,S,mv,air){
  if(!POn()||dt<=0)return;
  const I=FXI(),c=sk.c,fx=sk.fx;
  const bx=cx-4*S,by=gy-44*S,mx=cx+36*S,my=gy-41*S,tx=cx-38*S,cy=gy-28*S,w=mv?.8:0;
  if(mv&&!air)for(let i=rate('dust',16*Math.max(I,.35),dt);i>0;i--)
    em({k:'smoke',x:cx-8*S+rnd(-4,4)*S,y:gy-2*S,vx:-rnd(20,70)*S,vy:-rnd(8,36)*S,life:rnd(.3,.55),size:rnd(2.5,5)*S,grow:1.2,col:DUSTC,a:.5,w:.9});
  if(I<=0||fx==='none')return;
  let i;
  switch(fx){
  case'fire':
    for(i=rate('a',34*I,dt);i>0;i--)em({k:'ember',x:bx+rnd(-18,14)*S,y:by+rnd(0,16)*S,vx:rnd(-40,20),vy:-rnd(50,130)*S,life:rnd(.45,.95),size:rnd(1.6,3.6)*S,col:pick(FIRE),add:true,w});
    for(i=rate('s',12*I,dt);i>0;i--)em({k:'smoke',x:bx+rnd(-14,10)*S,y:by-4*S,vx:rnd(-20,10),vy:-rnd(30,60)*S,life:rnd(.6,1.1),size:rnd(4,8)*S,grow:1.6,col:'#3a2a26',a:.35,w});
    break;
  case'ice':
    for(i=rate('a',26*I,dt);i>0;i--)em({k:'flake',x:cx+rnd(-42,36)*S,y:gy-rnd(0,64)*S,vx:rnd(-20,10),vy:rnd(14,40),life:rnd(.9,1.6),size:rnd(2.5,5)*S,col:'#eaffff',a:.9,vr:rnd(-3,3),w:w*.6});
    for(i=rate('m',14*I,dt);i>0;i--)em({k:'smoke',x:tx+rnd(0,26)*S,y:gy-rnd(2,26)*S,vx:-rnd(10,40),vy:-rnd(4,20),life:rnd(.5,.9),size:rnd(5,9)*S,grow:1.4,col:'#bfefff',a:.28,w});
    for(i=rate('s',10*I,dt);i>0;i--)em({k:'spark',x:cx+rnd(-30,30)*S,y:cy+rnd(-26,26)*S,life:rnd(.3,.6),size:rnd(2,4)*S,col:'#ffffff',add:true,vr:rnd(-4,4),w:w*.4});
    break;
  case'storm':
    for(i=rate('b',3.4*I,dt);i>0;i--)zap(cx,cy,S,c.glow);
    for(i=rate('a',30*I,dt);i>0;i--){const a=rnd(0,PI2),r=rnd(18,34)*S;em({k:'spark',x:cx+Math.cos(a)*r,y:cy+Math.sin(a)*r*.8,vx:Math.cos(a)*rnd(20,80),vy:Math.sin(a)*rnd(20,80),life:rnd(.15,.35),size:rnd(2,4.5)*S,col:pick(['#fff36b','#ffffff','#b7a6ff']),add:true,vr:rnd(-8,8),w:w*.3})}
    break;
  case'toxic':
    for(i=rate('b',14*I,dt);i>0;i--)em({k:'bubble',x:cx+rnd(-20,16)*S,y:gy-rnd(6,40)*S,vx:rnd(-10,10),vy:-rnd(20,55)*S,life:rnd(.7,1.3),size:rnd(2.5,5.5)*S,col:'#d8ff7a',a:.8,w:w*.5});
    for(i=rate('d',7*I,dt);i>0;i--)em({k:'dot',x:cx+rnd(-8,10)*S,y:gy-16*S,vx:rnd(-10,10),vy:rnd(0,30),g:520,life:rnd(.4,.7),size:rnd(1.6,2.8)*S,col:'#8bff3a',add:true,w:w*.6});
    for(i=rate('g',12*I,dt);i>0;i--)em({k:'smoke',x:cx+rnd(-24,18)*S,y:gy-rnd(8,44)*S,vx:rnd(-20,10),vy:-rnd(10,34),life:rnd(.6,1),size:rnd(6,11)*S,grow:1.8,col:'#5fd02e',a:.24,w});
    break;
  case'shadow':
    for(i=rate('s',38*I,dt);i>0;i--)em({k:'smoke',x:cx+rnd(-30,16)*S,y:cy+rnd(-20,16)*S,vx:rnd(-30,10),vy:-rnd(6,40),life:rnd(.5,.9),size:rnd(6,12)*S,grow:1.5,col:'#0b0b1c',a:.6,w});
    for(i=rate('w',20*I,dt);i>0;i--)em({k:'dot',x:cx+rnd(-30,20)*S,y:cy+rnd(-22,18)*S,vx:rnd(-20,10),vy:-rnd(20,70)*S,life:rnd(.4,.9),size:rnd(1.4,3)*S,col:'#9a7bff',a:.7,add:true,w});
    break;
  case'magma':
    for(i=rate('a',36*I,dt);i>0;i--)em({k:'ember',x:cx+rnd(-22,18)*S,y:cy+rnd(-10,16)*S,vx:rnd(-120,40),vy:-rnd(60,200)*S,g:520,life:rnd(.4,.9),size:rnd(1.6,3.4)*S,col:pick(['#ffcf5a','#ff7a24','#ff3b1f']),add:true,w:w*.5});
    for(i=rate('s',16*I,dt);i>0;i--)em({k:'smoke',x:cx+rnd(-22,14)*S,y:by+rnd(0,10)*S,vx:rnd(-20,10),vy:-rnd(20,50)*S,life:rnd(.7,1.2),size:rnd(5,9)*S,grow:1.7,col:'#2a2220',a:.4,w});
    break;
  case'galaxy':
    for(i=rate('a',34*I,dt);i>0;i--)em({k:'dot',x:tx+rnd(-6,12)*S,y:cy+rnd(-18,18)*S,vx:-rnd(10,60),vy:rnd(-20,20),life:rnd(.5,1.1),size:rnd(1.2,3)*S,col:pick(['#ffffff','#ff6ee8','#8f7bff','#6ee7ff']),add:true,w});
    for(i=rate('s',10*I,dt);i>0;i--)em({k:'spark',x:cx+rnd(-30,30)*S,y:cy+rnd(-28,26)*S,life:rnd(.4,.8),size:rnd(2,4.5)*S,col:pick(['#ffffff','#ffd0f8']),add:true,vr:rnd(-3,3),w:w*.3});
    break;
  case'gold':
    for(i=rate('a',28*I,dt);i>0;i--)em({k:'spark',x:cx+rnd(-32,30)*S,y:cy+rnd(-30,28)*S,life:rnd(.5,.9),size:rnd(2,5)*S,col:pick(['#fff7c8','#ffd84a','#ffffff']),add:true,vr:rnd(-5,5),w:w*.4});
    for(i=rate('d',14*I,dt);i>0;i--)em({k:'dot',x:tx+rnd(-4,14)*S,y:cy+rnd(-16,16)*S,vx:-rnd(10,50),vy:rnd(-10,25),g:60,life:rnd(.5,1),size:rnd(1.3,2.6)*S,col:'#ffd84a',add:true,w});
    break;
  case'diamond':
    for(i=rate('a',22*I,dt);i>0;i--)em({k:'spark',x:cx+rnd(-32,30)*S,y:cy+rnd(-30,28)*S,life:rnd(.35,.7),size:rnd(2,5)*S,col:hsl(rnd(0,360),82),add:true,vr:rnd(-6,6),w:w*.4});
    for(i=rate('s',8*I,dt);i>0;i--)em({k:'shard',x:cx+rnd(-20,20)*S,y:cy+rnd(-20,16)*S,vx:rnd(-50,20),vy:rnd(-60,20),g:120,life:rnd(.5,.9),size:rnd(2.5,5)*S,col:'#e9fbff',a:.8,add:true,vr:rnd(-6,6),w});
    break;
  case'rainbow':
    for(i=rate('a',28*I,dt);i>0;i--)em({k:'spark',x:tx+rnd(-6,14)*S,y:cy+rnd(-18,18)*S,vx:-rnd(20,80),vy:rnd(-30,30),life:rnd(.5,1),size:rnd(2,4.5)*S,col:hsl(t*140+rnd(0,160),62),add:true,vr:rnd(-6,6),w});
    break;
  case'royal':
    for(i=rate('a',30*I,dt);i>0;i--)em({k:'ember',x:bx+rnd(-18,14)*S,y:by+rnd(0,16)*S,vx:rnd(-40,20),vy:-rnd(40,110)*S,life:rnd(.5,1),size:rnd(1.6,3.4)*S,col:pick(['#ffd84a','#ff6a3a','#ff3d5a','#fff0a0']),add:true,w});
    for(i=rate('f',12*I,dt);i>0;i--)em({k:'ember',x:mx,y:my+rnd(-3,3)*S,vx:rnd(60,150),vy:rnd(-18,12),life:rnd(.2,.4),size:rnd(2,4)*S,col:pick(FIRE),add:true,w:w*.4});
    for(i=rate('c',10*I,dt);i>0;i--)em({k:'spark',x:cx+rnd(12,30)*S,y:gy-rnd(58,68)*S,life:rnd(.4,.7),size:rnd(2,4)*S,col:'#fff0a0',add:true,vr:rnd(-5,5),w:w*.3});
    break;
  }
}
function burst(x,y,S,sk,n,pw){
  if(!POn())return;
  const c=sk.c,cols=[c.body,c.glow,c.spike,'#ffffff'];
  for(let i=0;i<n;i++){
    const a=rnd(0,PI2),v=rnd(.3,1)*pw,k=pick(['dot','shard','spark']);
    em({k,x:x+rnd(-8,8)*S,y:y+rnd(-8,8)*S,vx:Math.cos(a)*v,vy:Math.sin(a)*v-pw*.25,g:620,drag:.8,life:rnd(.5,1.1),size:rnd(2,5.5)*S,col:pick(cols),add:k!=='shard',vr:rnd(-9,9),w:.3});
  }
}
function ring(x,y,col,max,life){if(rings.length<10)rings.push({x,y,col,max,life,m:life})}
function onJump(sk){
  D.sq=-.24;sfx.jump();
  const cx=DX+28;ring(cx,GY,sk.c.glow,46,.38);
  for(let i=0;i<6;i++)em({k:'smoke',x:cx+rnd(-10,10),y:GY-2,vx:rnd(-80,40),vy:-rnd(5,30),life:rnd(.3,.5),size:rnd(3,6),grow:1.3,col:DUSTC,a:.5,w:.9});
  if(FXI()>0&&sk.fx!=='none')for(let i=0;i<8;i++)em({k:'dot',x:cx+rnd(-8,8),y:GY-4,vx:rnd(-90,60),vy:rnd(20,120),g:300,life:rnd(.3,.6),size:rnd(1.6,3.4),col:sk.c.glow,add:true,w:.4});
  if(sk.fx==='royal')for(let i=0;i<14;i++)em({k:'ember',x:cx+36,y:GY-41,vx:rnd(80,220),vy:rnd(-40,20),life:rnd(.25,.5),size:rnd(2,5),col:pick(FIRE),add:true,w:.3});
}
function onLand(sk){
  D.sq=.32;sfx.land();shake=Math.max(shake,3);
  const cx=DX+28;ring(cx,GY,sk.c.glow,72,.5);ring(cx,GY,'#ffffff',44,.32);
  for(let i=0;i<11;i++)em({k:'smoke',x:cx+rnd(-12,12),y:GY-2,vx:rnd(-130,110),vy:-rnd(6,40),life:rnd(.3,.6),size:rnd(3,7),grow:1.4,col:DUSTC,a:.55,w:.9});
  if(FXI()>0&&sk.fx!=='none')for(let i=0;i<10;i++)em({k:'spark',x:cx+rnd(-14,14),y:GY-3,vx:rnd(-160,120),vy:-rnd(40,170),g:520,life:rnd(.3,.65),size:rnd(2,4.5),col:pick([sk.c.glow,sk.c.spike,'#ffffff']),add:true,vr:rnd(-8,8),w:.4});
}
function milestoneFx(){
  flash=Math.max(flash,.16);scorePop=1;
  if(!POn())return;
  for(let i=0;i<22;i++)em({k:'spark',x:W/2+rnd(-40,40),y:70+rnd(-10,10),vx:rnd(-220,220),vy:-rnd(20,200),g:340,life:rnd(.7,1.3),size:rnd(2.5,5.5),col:hsl(rnd(0,360),66),add:true,vr:rnd(-8,8)});
}

/* ---------- ریست / شروع ---------- */
function reset(){
  spd=300;dist=0;score=0;obs=[];since=0;gapNeed=420;lastW=0;mile=0;night=0;
  D.y=0;D.vy=0;D.air=false;D.anim=0;D.duck=false;D.rot=0;D.sq=0;D.dx=0;D.dvx=0;D.vr=0;
  parts=[];rings=[];bolts=[];ghosts=[];tr=[];jumpBuf=0;flash=0;shake=0;hitstop=0;deadT=0;skinPulse=0;scorePop=0;skyT=4;
  const best=Store.best(id);
  for(let i=0;i<NS;i++)if(best>=SKINS[i].need)Store.unlockSkin(id,i);
  skin=Math.min(NS-1,Store.selectedSkin(id));
  if(!Store.skinUnlocked(id,skin))skin=0;
  Store.setSkin(id,skin);pv=skin;
}
function enter(){reset();initScene();st='ready';newBest=false;Shell.score(0)}
function start(){
  const keep=pv;reset();
  if(Store.skinUnlocked(id,keep)){skin=keep;Store.setSkin(id,keep)}
  newBest=false;Shell.begin();Shell.score(0);st='play';jumpBuf=.12;
}
function die(){
  const sk=SKINS[skin];
  st='dying';deadT=0;sfx.die();
  D.vy=380;D.air=true;D.dx=0;D.dvx=-170;D.vr=7;D.duck=false;
  hitstop=.09;flash=.55;shake=18;
  const cx=DX+28,cy=GY-D.y-28;
  burst(cx,cy,1,sk,44,380);ring(cx,cy,sk.c.glow,110,.6);ring(cx,GY,'#ffffff',90,.45);
  newBest=Shell.finish(score,'lose');lock=Date.now()+900;
}

/* ---------- مانع‌ها ---------- */
function spawn(){
  let o;
  if(score>=120&&Math.random()<(score>400?.28:.18)){
    const hs=score>300?[8,38,38,74]:[8,38];
    o={type:'bird',x:W+30,w:46,h:28,yb:pick(hs),v:55+rnd(0,30),ph:rnd(0,6.28)};
  }else{
    const max=score>200?6:score>80?5:4;
    const k=KINDS[(Math.random()*max)|0];
    let x=0;
    const ps=k.map(([w,h])=>{const p={ox:x,w,h};x+=w+6;return p});
    o={type:'cactus',x:W+30,w:x-6,parts:ps,seed:(Math.random()*9)|0};
  }
  obs.push(o);since=0;lastW=o.w;
  gapNeed=spd*.74+160+rnd(0,220)+(o.type==='bird'?40:0);
}
function hit(){
  const cx=DX+28+D.dx,gy=GY-D.y;
  const b=D.duck?{l:cx-18,r:cx+22,t:gy-26,b:gy-4}:{l:cx-13,r:cx+16,t:gy-50,b:gy-4};
  for(const o of obs){
    if(o.x>DX+110||o.x+o.w<DX-20)continue;
    if(o.type==='bird'){
      const l=o.x+8,r=o.x+o.w-6,tp=GY-o.yb-o.h+6,bt=GY-o.yb-4;
      if(b.l<r&&b.r>l&&b.t<bt&&b.b>tp)return true;
    }else for(const p of o.parts){
      const l=o.x+p.ox+4,r=o.x+p.ox+p.w-4,tp=GY-p.h+5;
      if(b.l<r&&b.r>l&&b.t<GY&&b.b>tp)return true;
    }
  }
  return false;
}

/* ---------- آپدیت ---------- */
function updateParticles(wd,sc){
  for(let i=parts.length-1;i>=0;i--){
    const p=parts[i];p.life-=wd;
    if(p.life<=0){parts[i]=parts[parts.length-1];parts.pop();continue}
    p.vy+=p.g*wd;
    if(p.drag){const f=Math.max(0,1-p.drag*wd);p.vx*=f;p.vy*=f}
    p.x+=(p.vx-sc*p.w)*wd;p.y+=p.vy*wd;p.rot+=p.vr*wd;
  }
  for(let i=rings.length-1;i>=0;i--){const r=rings[i];r.life-=wd;r.x-=sc*.9*wd;if(r.life<=0)rings.splice(i,1)}
  for(let i=bolts.length-1;i>=0;i--){bolts[i].life-=wd;if(bolts[i].life<=0)bolts.splice(i,1)}
  for(let i=ghosts.length-1;i>=0;i--){const g=ghosts[i];g.life-=wd;g.x-=sc*wd;if(g.life<=0)ghosts.splice(i,1)}
}
function update(dt){
  dt=Math.min(dt,.033);t+=dt;
  if(hitstop>0){hitstop-=dt;return}
  const wd=st==='dying'?dt*.28:dt;
  const sc=st==='ready'?200:(st==='dead'?0:spd);
  if(flash>0)flash=Math.max(0,flash-dt*1.6);
  if(shake>0)shake=Math.max(0,shake-dt*34);
  if(skinPulse>0)skinPulse=Math.max(0,skinPulse-dt);
  if(scorePop>0)scorePop=Math.max(0,scorePop-dt*3);
  D.sq+=(0-D.sq)*Math.min(1,dt*14);
  updateParticles(wd,sc);

  if(st==='ready'){
    const L=!!(keys.ArrowLeft||keys.KeyA),R=!!(keys.ArrowRight||keys.KeyD);
    if(L&&!navL)browse(-1);if(R&&!navR)browse(1);navL=L;navR=R;
    const sk=SKINS[pv];
    fxTick(dt,sk,W/2,412,2.3,true,false);
    trAcc+=dt;if(trAcc>=.025){trAcc=0;tr.unshift(0);if(tr.length>26)tr.pop()}
    for(const c of clouds)c.x-=8*dt*(c.l?1.6:1),c.x<-c.w-10&&(c.x=W+20);
    return;
  }
  if(st==='dead'){deadT+=dt;return}
  if(st==='dying'){
    deadT+=dt;
    D.dx+=D.dvx*wd;D.dvx*=Math.max(0,1-1.5*wd);
    if(D.air){D.vy-=G*wd;D.y+=D.vy*wd;D.rot+=D.vr*wd;if(D.y<=0){D.y=0;D.vy=0;D.air=false;D.vr=0;shake=Math.max(shake,6)}}
    if(deadT>=1){st='dead';deadT=0}
    return;
  }

  /* --- بازی --- */
  const sk=SKINS[skin];
  spd=Math.min(780,spd+(6+score*.01)*dt);
  dist+=spd*dt;score=Math.floor(dist/12);Shell.score(score);
  const ns=skinForScore(score);
  if(ns>Store.skinIndex(id)){Store.unlockSkin(id,ns);skinPulse=2.4;bannerSkin=ns;sfx.power();flash=Math.max(flash,.35);burst(DX+28,GY-28,1,SKINS[ns],36,300);ring(DX+28,GY-28,SKINS[ns].c.glow,130,.7)}
  const m=Math.floor(score/100);if(m>mile){mile=m;sfx.mile();milestoneFx()}
  night+=(Math.floor(score/500)%2-night)*Math.min(1,dt*1.2);
  bg1+=spd*.04*dt;bg2+=spd*.1*dt;gnd+=spd*dt;

  const down=!!(keys.ArrowDown||keys.KeyS);
  jumpBuf-=dt;
  if(jumpBuf>0&&!D.air){D.vy=JV;D.air=true;D.y=.01;jumpBuf=0;onJump(sk)}
  if(D.air){
    D.vy-=G*(down?2.3:1)*dt;D.y+=D.vy*dt;
    D.rot=clamp(-D.vy*.00022,-.28,.28);
    if(D.y<=0){D.y=0;D.vy=0;D.air=false;D.rot=0;onLand(sk)}
  }else D.anim+=dt*(10+spd*.012);
  D.duck=down&&!D.air;

  since+=spd*dt;
  if(since-lastW>=gapNeed)spawn();
  for(const o of obs){o.x-=(spd+(o.v||0))*dt}
  obs=obs.filter(o=>o.x+o.w>-60);
  for(const c of clouds){c.x-=spd*(c.l?.07:.03)*dt;if(c.x<-c.w-10){c.x=W+20;c.y=50+rnd(0,190)}}
  for(const p of pebbles){p.x-=spd*dt;if(p.x<-20){p.x+=W+40;p.y=GY+12+rnd(0,H-GY-30)}}
  for(const p of tufts){p.x-=spd*dt;if(p.x<-20){p.x+=W+40;p.y=GY+8+rnd(0,40)}}
  for(const l of lines){l.x-=spd*l.v*2.2*dt;if(l.x<-l.l){l.x=W+rnd(0,60);l.y=rnd(40,GY-20)}}

  fxTick(dt,sk,DX+28,GY-D.y,1,true,D.air);
  trAcc+=dt;if(trAcc>=.025){trAcc=0;tr.unshift(D.y);if(tr.length>26)tr.pop()}
  if(sk.fx==='shadow'&&FXI()>0&&POn()){ghAcc+=dt;if(ghAcc>=.05){ghAcc=0;if(ghosts.length<8)ghosts.push({x:DX+28,h:D.y,leg:D.anim,air:D.air,life:.3,max:.3})}}
  if(sk.fx==='storm'&&FXI()>0){skyT-=dt;if(skyT<=0){skyT=rnd(3.5,6.5);skyBolt()}}

  if(hit())die();
}

/* ---------- ترسیم: دایناسور ---------- */
const BODY=new Path2D(),HEAD=new Path2D(),SNOUT=new Path2D(),NECK=new Path2D();
BODY.ellipse(-2,-28,21,15,-.1,0,PI2);HEAD.ellipse(21,-46,14,11.5,.05,0,PI2);
SNOUT.ellipse(32,-44,10,6.8,.08,0,PI2);NECK.ellipse(10,-38,10,12,.55,0,PI2);
function sweep(tm,sp,a,hue){
  const x=-34+((tm*sp)%96);
  ctx.save();ctx.translate(x,-28);ctx.rotate(.5);
  ctx.fillStyle=hue?hsl(x*5+tm*60,80):`rgba(255,255,255,${a})`;ctx.globalAlpha=hue?a:1;ctx.fillRect(-3,-34,6,68);ctx.restore();
}
function decor(fx,c,tm){
  ctx.save();ctx.clip(BODY);
  if(fx==='none'){ctx.fillStyle='rgba(0,0,0,.12)';for(let i=0;i<3;i++){ctx.beginPath();ctx.ellipse(-12+i*9,-40,3,6,.25,0,PI2);ctx.fill()}}
  else if(fx==='fire'){
    const g=ctx.createLinearGradient(0,-12,0,-34);g.addColorStop(0,'rgba(255,211,77,.9)');g.addColorStop(1,'rgba(255,90,30,0)');ctx.fillStyle=g;ctx.fillRect(-24,-36,48,24);
    ctx.fillStyle='rgba(255,230,120,.85)';
    for(let i=0;i<5;i++){const x0=-17+i*8,h=9+Math.sin(tm*9+i*2)*4;ctx.beginPath();ctx.moveTo(x0-3,-12);ctx.quadraticCurveTo(x0,-12-h,x0+1,-12-h*1.7);ctx.quadraticCurveTo(x0+4,-12-h*.6,x0+4,-12);ctx.fill()}
  }else if(fx==='ice'){
    ctx.strokeStyle='rgba(255,255,255,.5)';ctx.lineWidth=1;ctx.beginPath();
    ctx.moveTo(-18,-34);ctx.lineTo(-4,-26);ctx.lineTo(8,-38);ctx.moveTo(-4,-26);ctx.lineTo(-8,-16);ctx.moveTo(8,-38);ctx.lineTo(16,-24);ctx.stroke();
    sweep(tm,45,.38);
  }else if(fx==='storm'){
    ctx.strokeStyle=c.spike;ctx.lineWidth=2;ctx.globalAlpha=.5+.5*Math.abs(Math.sin(tm*17));
    ctx.beginPath();ctx.moveTo(-16,-42);ctx.lineTo(-8,-32);ctx.lineTo(-13,-31);ctx.lineTo(-3,-20);ctx.moveTo(4,-42);ctx.lineTo(11,-33);ctx.lineTo(7,-32);ctx.lineTo(14,-23);ctx.stroke();
  }else if(fx==='toxic'){
    const sp=[[-10,-30,4],[2,-22,3],[-2,-36,2.6],[10,-30,3],[-14,-20,2.4]],k=1+.1*Math.sin(tm*4);
    for(const s of sp){ctx.fillStyle='rgba(45,125,23,.6)';ctx.beginPath();ctx.arc(s[0],s[1],s[2]*k,0,PI2);ctx.fill();ctx.fillStyle='rgba(230,255,140,.5)';ctx.beginPath();ctx.arc(s[0]-1,s[1]-1,s[2]*.35,0,PI2);ctx.fill()}
  }else if(fx==='shadow'){
    ctx.strokeStyle=c.spike;ctx.lineWidth=1.3;ctx.globalAlpha=.55+.4*Math.sin(tm*3);
    ctx.beginPath();ctx.moveTo(-20,-30);ctx.quadraticCurveTo(-8,-40,2,-28);ctx.quadraticCurveTo(10,-18,16,-30);ctx.moveTo(-6,-40);ctx.quadraticCurveTo(-2,-30,-8,-18);ctx.stroke();
  }else if(fx==='magma'){
    const pa=.55+.4*Math.sin(tm*3);ctx.strokeStyle='#ff6a1f';
    for(let pass=0;pass<2;pass++){
      ctx.lineWidth=pass?1.5:4.5;ctx.globalAlpha=pass?pa:pa*.25;
      ctx.beginPath();ctx.moveTo(-18,-30);ctx.lineTo(-10,-36);ctx.lineTo(-4,-28);ctx.lineTo(4,-34);ctx.lineTo(10,-26);ctx.moveTo(-4,-28);ctx.lineTo(-6,-18);ctx.moveTo(4,-34);ctx.lineTo(8,-42);ctx.stroke();
    }
  }else if(fx==='galaxy'){
    let g=ctx.createRadialGradient(-4,-28,2,-4,-28,22);g.addColorStop(0,'rgba(255,110,232,.6)');g.addColorStop(1,'rgba(255,110,232,0)');ctx.fillStyle=g;ctx.fillRect(-26,-46,52,36);
    g=ctx.createRadialGradient(9,-24,1,9,-24,14);g.addColorStop(0,'rgba(110,231,255,.5)');g.addColorStop(1,'rgba(110,231,255,0)');ctx.fillStyle=g;ctx.fillRect(-6,-40,30,30);
    const sp=[[-12,-34],[-2,-24],[6,-36],[10,-26],[-8,-20],[0,-40],[14,-32],[-16,-26]];
    ctx.fillStyle='#fff';sp.forEach((s,i)=>{ctx.globalAlpha=.4+.6*Math.abs(Math.sin(tm*3+i));ctx.beginPath();ctx.arc(s[0],s[1],1.1,0,PI2);ctx.fill()});
  }else if(fx==='gold'){
    ctx.strokeStyle='rgba(120,70,0,.35)';ctx.lineWidth=1;
    for(let r=0;r<3;r++)for(let k=0;k<6;k++){ctx.beginPath();ctx.arc(-16+k*7+(r%2)*3.5,-38+r*7,3.4,0,Math.PI);ctx.stroke()}
    sweep(tm,60,.6);
  }else if(fx==='diamond'){
    ctx.fillStyle='rgba(255,255,255,.3)';ctx.beginPath();ctx.moveTo(-20,-34);ctx.lineTo(-6,-42);ctx.lineTo(-2,-28);ctx.closePath();ctx.fill();
    ctx.fillStyle='rgba(255,255,255,.16)';ctx.beginPath();ctx.moveTo(-2,-28);ctx.lineTo(10,-40);ctx.lineTo(18,-26);ctx.closePath();ctx.fill();
    ctx.fillStyle='rgba(60,160,210,.2)';ctx.beginPath();ctx.moveTo(-10,-20);ctx.lineTo(2,-30);ctx.lineTo(8,-16);ctx.closePath();ctx.fill();
    sweep(tm,70,.7);sweep(tm+.35,70,.35,true);
  }else if(fx==='rainbow'){sweep(tm,55,.4);}
  else if(fx==='royal'){
    ctx.strokeStyle='rgba(255,207,122,.4)';ctx.lineWidth=1;
    for(let r=0;r<3;r++)for(let k=0;k<6;k++){ctx.beginPath();ctx.arc(-16+k*7+(r%2)*3.5,-38+r*7,3.4,0,Math.PI);ctx.stroke()}
  }
  ctx.restore();
}
function drawDino(sk,cx,gy,S,po){
  const c=sk.c,fx=sk.fx,tm=po.tm===undefined?t:po.tm,air=!!po.air&&!po.dead;
  ctx.save();
  ctx.globalAlpha=po.alpha===undefined?1:po.alpha;
  ctx.translate(cx,gy);ctx.scale((po.sx||1)*S,(po.sy||1)*S);
  if(po.duck)ctx.scale(1.14,.66);
  ctx.translate(0,-26);ctx.rotate(po.rot||0);ctx.translate(0,26);
  ctx.lineCap='round';ctx.lineJoin='round';
  const ph=po.leg||0;
  const leg=(hx,phase,col,k)=>{
    let fxx,fyy;
    if(air||po.dead){fxx=hx+(k?9:-7);fyy=-9-(k?3:0)}
    else{fxx=hx+Math.sin(phase)*10;fyy=-4-Math.max(0,Math.cos(phase))*9}
    ctx.strokeStyle=col;ctx.lineWidth=9;ctx.beginPath();ctx.moveTo(hx,-20);ctx.quadraticCurveTo((hx+fxx)/2+3,(-20+fyy)/2-2,fxx,fyy);ctx.stroke();
    ctx.fillStyle=c.dark;ctx.beginPath();ctx.ellipse(fxx+3,fyy+1,6.5,3.4,0,0,PI2);ctx.fill();
  };
  leg(-7,ph+Math.PI,c.dark,0);leg(8,ph,c.body,1);
  const wag=Math.sin(tm*(air?3:9))*(air?2:4);
  ctx.fillStyle=c.body;ctx.beginPath();ctx.moveTo(-16,-36);ctx.quadraticCurveTo(-30,-34+wag,-44,-42+wag*1.4);ctx.quadraticCurveTo(-31,-24,-14,-19);ctx.closePath();ctx.fill();
  if(fx==='fire'||fx==='royal'||fx==='magma'){ctx.fillStyle=c.spike;ctx.beginPath();ctx.moveTo(-40,-40+wag*1.4);ctx.lineTo(-47,-47+wag*1.6);ctx.lineTo(-42,-36+wag*1.2);ctx.fill()}
  /* بدن */
  let bf;
  if(fx==='rainbow'){bf=ctx.createLinearGradient(-22,-40,22,-16);for(let i=0;i<=4;i++)bf.addColorStop(i/4,hsl(tm*90+i*55,62))}
  else{bf=ctx.createLinearGradient(0,-44,0,-13);bf.addColorStop(0,c.body);bf.addColorStop(1,c.dark)}
  ctx.fillStyle=bf;ctx.fill(NECK);ctx.fill(BODY);
  ctx.fillStyle=fx==='rainbow'?hsl(tm*90+120,60):c.body;ctx.fill(HEAD);ctx.fill(SNOUT);
  ctx.fillStyle='rgba(0,0,0,.22)';ctx.beginPath();ctx.ellipse(31,-40.5,8.5,3.4,.05,0,PI2);ctx.fill();
  ctx.save();ctx.clip(BODY);ctx.fillStyle=c.belly;ctx.globalAlpha=.9*(po.alpha===undefined?1:po.alpha);ctx.beginPath();ctx.ellipse(3,-21,16,8.5,.05,0,PI2);ctx.fill();ctx.restore();
  decor(fx,c,tm);
  ctx.strokeStyle='rgba(0,0,0,.28)';ctx.lineWidth=1.4;ctx.stroke(BODY);ctx.stroke(HEAD);
  ctx.fillStyle='rgba(255,255,255,.22)';ctx.beginPath();ctx.ellipse(-6,-38,9,3.5,-.2,0,PI2);ctx.fill();
  /* خارهای پشت */
  ctx.fillStyle=c.spike;
  for(let i=0;i<6;i++){
    const x=-16+i*5,yt=-28-15*Math.sqrt(Math.max(0,1-((x+2)/21)**2));
    ctx.beginPath();ctx.moveTo(x-3.2,yt+1.5);ctx.lineTo(x,yt-6-(i%2)*2);ctx.lineTo(x+3.2,yt+1.5);ctx.fill();
  }
  /* شاخ و تاج */
  if(fx==='fire'||fx==='magma'||fx==='royal'||fx==='shadow'||fx==='storm'){
    const hh=fx==='royal'?9:7;ctx.fillStyle=c.spike;
    ctx.beginPath();ctx.moveTo(11,-54);ctx.lineTo(8,-54-hh);ctx.lineTo(16,-56);ctx.fill();
  }
  if(fx==='royal'){
    const g=ctx.createLinearGradient(0,-67,0,-56);g.addColorStop(0,'#fff0a0');g.addColorStop(1,'#d59a18');
    ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(14,-56);ctx.lineTo(14,-64);ctx.lineTo(18,-60);ctx.lineTo(21,-67);ctx.lineTo(24,-60);ctx.lineTo(28,-64);ctx.lineTo(28,-56);ctx.closePath();ctx.fill();
    ctx.fillStyle='#ff3d5a';ctx.beginPath();ctx.arc(21,-59,1.6,0,PI2);ctx.fill();
  }
  /* دست */
  ctx.strokeStyle=c.body;ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(12,-31);ctx.lineTo(18.5,-26.5);ctx.stroke();
  /* صورت */
  const ex=26,ey=-49,glowEye=fx==='shadow'||fx==='magma'||fx==='royal'||fx==='storm'||fx==='fire';
  if(po.dead){
    ctx.strokeStyle='#101018';ctx.lineWidth=1.8;ctx.beginPath();ctx.moveTo(ex-3.5,ey-3.5);ctx.lineTo(ex+3.5,ey+3.5);ctx.moveTo(ex+3.5,ey-3.5);ctx.lineTo(ex-3.5,ey+3.5);ctx.stroke();
    ctx.fillStyle='#ff7a9a';ctx.beginPath();ctx.ellipse(36,-37.5,3,4.5,.2,0,PI2);ctx.fill();
  }else if((tm%3.4)>3.28){
    ctx.strokeStyle='#101018';ctx.lineWidth=1.8;ctx.beginPath();ctx.moveTo(ex-3.5,ey);ctx.lineTo(ex+3.5,ey);ctx.stroke();
  }else{
    ctx.fillStyle=glowEye?c.eye:'#fff';ctx.beginPath();ctx.arc(ex,ey,4.4,0,PI2);ctx.fill();
    ctx.fillStyle=glowEye?'#12001f':'#101018';ctx.beginPath();ctx.arc(ex+1.3,ey+.3,2.1,0,PI2);ctx.fill();
    if(!glowEye){ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(ex+.3,ey-1.2,.9,0,PI2);ctx.fill()}
  }
  ctx.strokeStyle='rgba(0,0,0,.55)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(21,-55.5);ctx.lineTo(30,-52.5);ctx.stroke();
  ctx.fillStyle='rgba(0,0,0,.5)';ctx.beginPath();ctx.arc(38.5,-46,1,0,PI2);ctx.fill();
  if(!po.dead){
    ctx.strokeStyle='rgba(0,0,0,.55)';ctx.lineWidth=1.3;ctx.beginPath();ctx.moveTo(41,-41.5);ctx.quadraticCurveTo(35,-38.5,29,-40.5);ctx.stroke();
    ctx.fillStyle='#fff';ctx.beginPath();ctx.moveTo(37,-41);ctx.lineTo(38.5,-38.8);ctx.lineTo(39.6,-41.2);ctx.fill();
  }
  ctx.restore();
}
function drawAura(sk,cx,gy,S,tm){
  const fx=sk.fx,c=sk.c,I=Math.min(FXI(),1.4),cy=gy-28*S;
  if(I<=0||fx==='none')return;
  const fl=.8+.2*Math.sin(tm*17)*Math.sin(tm*5.3);
  switch(fx){
  case'fire':glow(cx,cy,60*S,'#ff7a24',.5*I*fl);glow(cx,cy+10*S,34*S,'#ffd34d',.32*I*fl);break;
  case'ice':glow(cx,cy,58*S,'#7fdcff',.42*I);glow(cx,cy,30*S,'#ffffff',.2*I);break;
  case'storm':glow(cx,cy,60*S,'#7a5cff',.42*I*(.6+.4*Math.abs(Math.sin(tm*13))));break;
  case'toxic':glow(cx,cy,58*S,'#7dff3a',.38*I);break;
  case'shadow':{
    const g=ctx.createRadialGradient(cx,cy,6*S,cx,cy,54*S);g.addColorStop(0,'rgba(8,6,24,.7)');g.addColorStop(1,'rgba(8,6,24,0)');
    ctx.save();ctx.fillStyle=g;ctx.fillRect(cx-56*S,cy-56*S,112*S,112*S);ctx.restore();
    glow(cx,cy,50*S,'#7a5cff',.22*I);break}
  case'magma':glow(cx,cy,58*S,'#ff5a1f',(.34+.14*Math.sin(tm*3))*I);break;
  case'galaxy':
    glow(cx,cy,60*S,'#6a4cff',.36*I);
    ctx.save();ctx.globalCompositeOperation='lighter';
    for(let i=0;i<9;i++){const a=tm*(.9+i*.07)+i*.7,x=cx+Math.cos(a)*42*S,y=cy+Math.sin(a)*27*S;ctx.fillStyle=i%2?'#ff9cf0':'#9fe8ff';ctx.globalAlpha=.85*Math.min(1,I);star4(x,y,(2+i%3)*S,a*2);ctx.fill()}
    ctx.restore();break;
  case'gold':glow(cx,cy,58*S,'#ffd84a',.4*I);break;
  case'diamond':glow(cx,cy,60*S,'#bfeeff',.42*I);glow(cx+12*S,cy-8*S,22*S,'#ffffff',.2*I);break;
  case'rainbow':for(let i=0;i<3;i++){const a=tm*2+i*2.09;glow(cx+Math.cos(a)*14*S,cy+Math.sin(a)*10*S,44*S,hsl(tm*100+i*120,60),.3*I)}break;
  case'royal':
    glow(cx,cy,60*S,'#ff3d5a',.34*I);glow(cx,cy,40*S,'#ffd84a',.18*I);
    ctx.save();ctx.globalCompositeOperation='lighter';ctx.strokeStyle='#ffd84a';ctx.globalAlpha=.55*Math.min(1,I);ctx.lineWidth=2*S;ctx.setLineDash([6*S,9*S]);ctx.lineDashOffset=-tm*30;
    ctx.beginPath();ctx.ellipse(cx,cy,48*S,36*S,0,0,PI2);ctx.stroke();ctx.restore();break;
  }
}
function drawRibbon(sk,cx,gy,S,spdv,hOff){
  if(sk.fx!=='rainbow'||FXI()<=0||tr.length<2)return;
  const step=spdv*.025;
  ctx.save();ctx.lineCap='round';ctx.lineJoin='round';
  for(let b=0;b<7;b++){
    ctx.strokeStyle=hsl(b*52,60);ctx.lineWidth=3.6*S;ctx.beginPath();
    for(let i=0;i<tr.length;i++){
      const x=cx-14*S-i*step,y=gy-28*S-((tr[i]||0)-(hOff||0))*(S>1?1:1)+(b-3)*3.6*S;
      if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y);
    }
    ctx.globalAlpha=.8;ctx.stroke();
  }
  ctx.restore();
}
function drawBolts(){
  if(!bolts.length)return;
  ctx.save();ctx.globalCompositeOperation='lighter';ctx.lineCap='round';ctx.lineJoin='round';
  for(const b of bolts){
    const a=b.life/b.max;
    for(let pass=0;pass<2;pass++){
      ctx.strokeStyle=pass?'#ffffff':b.col;ctx.lineWidth=pass?(b.big?2.4:1.4):(b.big?7:4);ctx.globalAlpha=(pass?1:.45)*a;
      ctx.beginPath();b.pts.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.stroke();
    }
  }
  ctx.restore();
}
function drawParts(){
  for(let pass=0;pass<2;pass++){
    ctx.globalCompositeOperation=pass?'lighter':'source-over';
    for(const p of parts){
      if(!!p.add!==!!pass)continue;
      const k=clamp(p.life/p.max,0,1);
      ctx.globalAlpha=clamp(p.a*(p.k==='smoke'?k:Math.min(1,k*2.2)),0,1);
      ctx.fillStyle=p.col;ctx.strokeStyle=p.col;
      if(p.k==='smoke'){ctx.beginPath();ctx.arc(p.x,p.y,p.size*(1+(1-k)*p.grow),0,PI2);ctx.fill()}
      else if(p.k==='spark'){star4(p.x,p.y,p.size*(.4+.6*k),p.rot);ctx.fill()}
      else if(p.k==='flake'){
        ctx.lineWidth=1.2;ctx.beginPath();
        for(let i=0;i<3;i++){const a=p.rot+i*Math.PI/3,dx=Math.cos(a)*p.size,dy=Math.sin(a)*p.size;ctx.moveTo(p.x-dx,p.y-dy);ctx.lineTo(p.x+dx,p.y+dy)}
        ctx.stroke();
      }else if(p.k==='bubble'){
        ctx.lineWidth=1.2;ctx.beginPath();ctx.arc(p.x,p.y,p.size,0,PI2);ctx.stroke();
        ctx.globalAlpha*=.3;ctx.beginPath();ctx.arc(p.x,p.y,p.size,0,PI2);ctx.fill();
      }else if(p.k==='shard'){
        const s=p.size*(.5+.5*k);ctx.beginPath();
        for(let i=0;i<3;i++){const a=p.rot+i*2.094,rd=i?s*.7:s*1.3;const x=p.x+Math.cos(a)*rd,y=p.y+Math.sin(a)*rd;if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y)}
        ctx.closePath();ctx.fill();
      }else{ctx.beginPath();ctx.arc(p.x,p.y,Math.max(.4,p.size*(.45+.55*k)),0,PI2);ctx.fill()}
    }
  }
  ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;
}
function drawRings(){
  if(!rings.length)return;
  ctx.save();ctx.globalCompositeOperation='lighter';
  for(const r of rings){
    const k=r.life/r.m,rad=r.max*(1-k)+4;
    ctx.globalAlpha=clamp(k,0,1)*.9;ctx.strokeStyle=r.col;ctx.lineWidth=3*k+.6;
    ctx.beginPath();ctx.ellipse(r.x,r.y,rad,rad*.26,0,0,PI2);ctx.stroke();
  }
  ctx.restore();
}

/* ---------- ترسیم: دنیا ---------- */
function ridge(off,base,amp,col,f1,f2,ph){
  ctx.fillStyle=col;ctx.beginPath();ctx.moveTo(0,GY);
  for(let x=0;x<=W+8;x+=8){const X=x+off;ctx.lineTo(x,base-(Math.sin(X*f1+ph)*.6+Math.sin(X*f2+ph*2.3)*.4+1)*amp*.5)}
  ctx.lineTo(W+8,GY);ctx.closePath();ctx.fill();
}
function cactus(x,w,h,n,seed){
  const tw=Math.max(11,w*.46),tx=x+(w-tw)/2;
  ctx.fillStyle='rgba(0,0,0,.2)';ctx.beginPath();ctx.ellipse(x+w/2,GY+3,w*.75,4,0,0,PI2);ctx.fill();
  const g=ctx.createLinearGradient(x,0,x+w,0);
  g.addColorStop(0,mix('#2f8a4d','#3c7a86',n));g.addColorStop(.45,mix('#4cbd70','#5fb0be',n));g.addColorStop(1,mix('#25703e','#2f5f6e',n));
  ctx.fillStyle=g;
  rr(tx,GY-h,tw,h+2,tw/2);ctx.fill();
  const ay=GY-h*.56;rr(x,ay,tx-x+3,6,3);ctx.fill();rr(x,ay-13,6,19,3);ctx.fill();
  const by=GY-h*.38;rr(tx+tw-3,by,x+w-(tx+tw)+3,6,3);ctx.fill();rr(x+w-6,by-11,6,17,3);ctx.fill();
  ctx.strokeStyle='rgba(0,0,0,.15)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(tx+tw*.5,GY-h+7);ctx.lineTo(tx+tw*.5,GY);ctx.stroke();
  ctx.fillStyle='rgba(255,255,230,.7)';
  for(let i=0;i<5;i++)ctx.fillRect(tx+2+((i*7+seed)%Math.max(4,Math.floor(tw-4))),GY-h+10+i*(h-14)/5,1.4,3);
  if(seed%3===0){ctx.fillStyle='#ff7ab6';ctx.beginPath();ctx.arc(tx+tw/2,GY-h+1,3.2,0,PI2);ctx.fill();ctx.fillStyle='#ffe27a';ctx.beginPath();ctx.arc(tx+tw/2,GY-h+1,1.2,0,PI2);ctx.fill()}
}
function bird(o,n){
  const fl=Math.sin(t*16+o.ph),y=GY-o.yb-o.h;
  ctx.save();ctx.translate(o.x+23,y+14);
  ctx.fillStyle='rgba(0,0,0,.14)';ctx.beginPath();ctx.ellipse(0,GY-y-14+2,18,3,0,0,PI2);ctx.fill();
  const bc=mix('#5b3e86','#8d79c6',n),wc=mix('#7a56b0','#a592dd',n);
  ctx.fillStyle=wc;ctx.beginPath();ctx.moveTo(-8,-3);ctx.lineTo(10,-3);ctx.lineTo(3+fl*5,-18*fl-3);ctx.closePath();ctx.fill();
  ctx.fillStyle=bc;ctx.beginPath();ctx.ellipse(0,2,17,8,0,0,PI2);ctx.fill();
  ctx.beginPath();ctx.moveTo(15,0);ctx.lineTo(27,-2);ctx.lineTo(27,7);ctx.closePath();ctx.fill();
  ctx.beginPath();ctx.ellipse(-17,-1,8,6,-.2,0,PI2);ctx.fill();
  ctx.fillStyle='#ffb347';ctx.beginPath();ctx.moveTo(-23,-3);ctx.lineTo(-37,0);ctx.lineTo(-23,3);ctx.closePath();ctx.fill();
  ctx.fillStyle=bc;ctx.beginPath();ctx.moveTo(-12,-5);ctx.lineTo(-2,-14);ctx.lineTo(-6,-3);ctx.closePath();ctx.fill();
  ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(-19,-2.5,1.8,0,PI2);ctx.fill();ctx.fillStyle='#101018';ctx.beginPath();ctx.arc(-19.6,-2.5,.9,0,PI2);ctx.fill();
  ctx.fillStyle=mix('#9a7fd0','#b7a8e6',n);ctx.beginPath();ctx.ellipse(0,4,11,4,0,0,PI2);ctx.fill();
  ctx.restore();
}
function drawWorld(){
  const n=night,lq=LQ();
  const g=ctx.createLinearGradient(0,0,0,GY);
  g.addColorStop(0,mix('#5db4ff','#0b0a22',n));g.addColorStop(.6,mix('#a9dcff','#241b52',n));g.addColorStop(1,mix('#ffe9c4','#3b2a6e',n));
  ctx.fillStyle=g;ctx.fillRect(0,0,W,GY);
  if(n>.03){ctx.fillStyle='#e9e1ff';for(const s of stars){ctx.globalAlpha=n*(.35+.45*Math.sin(t*s.s*2+s.p));ctx.fillRect(s.x,s.y,s.s+.4,s.s+.4)}ctx.globalAlpha=1}
  if(n<.97){glow(390,115,86,'#fff2b0',.8*(1-n));ctx.globalAlpha=1-n;ctx.fillStyle='#ffd75e';ctx.beginPath();ctx.arc(390,115,26,0,PI2);ctx.fill();ctx.globalAlpha=1}
  if(n>.03){glow(390,115,70,'#cdd8ff',.4*n);ctx.globalAlpha=n;ctx.fillStyle='#f3efff';ctx.beginPath();ctx.arc(390,115,22,0,PI2);ctx.fill();ctx.fillStyle='#2a1f55';ctx.beginPath();ctx.arc(399,109,19,0,PI2);ctx.fill();ctx.globalAlpha=1}
  ctx.fillStyle=mix('#ffffff','#4a3f88',n);
  for(const c of clouds){ctx.globalAlpha=c.l?.8:.5;rr(c.x,c.y,c.w,13,7);ctx.fill();rr(c.x+c.w*.2,c.y-9,c.w*.45,14,7);ctx.fill()}
  ctx.globalAlpha=1;
  if(!lq)ridge(bg1,GY-64,74,mix('#a8b6e6','#2a2460',n),.006,.017,0);
  ridge(bg2,GY-26,54,mix('#8fa0d6','#201a4c',n),.009,.023,1.7);
  glow(W*.8,GY,230,'#ff9a4d',.2*(1-n));
  const gg=ctx.createLinearGradient(0,GY,0,H);gg.addColorStop(0,mix('#e6b46e','#3a2d66',n));gg.addColorStop(1,mix('#b9803f','#1e1640',n));
  ctx.fillStyle=gg;ctx.fillRect(0,GY,W,H-GY);
  ctx.fillStyle=mix('#f6d08a','#9a8be0',n);ctx.fillRect(0,GY,W,3);
  ctx.fillStyle=mix('#b8803c','#463a82',n);for(const b of pebbles)ctx.fillRect(b.x,b.y,b.w,2);
  ctx.strokeStyle=mix('#7fa65a','#4d6aa0',n);ctx.lineWidth=1.5;
  for(const p of tufts){ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x-3,p.y-p.h);ctx.moveTo(p.x,p.y);ctx.lineTo(p.x+1,p.y-p.h-2);ctx.moveTo(p.x,p.y);ctx.lineTo(p.x+4,p.y-p.h+1);ctx.stroke()}
}
function drawSpeedLines(){
  if(spd<430||LQ()||st==='dead')return;
  ctx.save();ctx.strokeStyle='#fff';ctx.lineWidth=1.2;ctx.globalAlpha=clamp((spd-430)/420,0,.28);
  for(const l of lines){ctx.beginPath();ctx.moveTo(l.x,l.y);ctx.lineTo(l.x+l.l,l.y);ctx.stroke()}
  ctx.restore();
}

/* ---------- ترسیم: منو (آزمایشگاه اسکین) ---------- */
function drawMenu(){
  const sk=SKINS[pv],unl=Store.skinUnlocked(id,pv),best=Store.best(id),c=sk.c;
  const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#0a0d24');g.addColorStop(.6,'#151432');g.addColorStop(1,'#07080f');
  ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  ctx.fillStyle='#fff';for(const s of stars){ctx.globalAlpha=.25+.4*Math.abs(Math.sin(t*s.s+s.p));ctx.fillRect(s.x,(s.y*1.9)%H,s.s,s.s)}ctx.globalAlpha=1;
  glow(W/2,330,230,c.glow,.22);
  ctx.save();ctx.globalAlpha=.07;ctx.fillStyle='#fff';ctx.beginPath();ctx.moveTo(W/2-34,0);ctx.lineTo(W/2+34,0);ctx.lineTo(W/2+170,420);ctx.lineTo(W/2-170,420);ctx.closePath();ctx.fill();ctx.restore();
  txt('DINO RUN',W/2,64,36,'#fff4e0','900');
  txt('آزمایشگاه اسکین‌ها',W/2,94,14,'#b9aed0','700');
  txt('رکورد '+FA(best),W-22,34,13,'#ffd29d','800','right');
  /* سکو */
  const py0=418;
  ctx.fillStyle='rgba(255,255,255,.06)';ctx.beginPath();ctx.ellipse(W/2,py0,128,24,0,0,PI2);ctx.fill();
  ctx.save();ctx.globalCompositeOperation='lighter';ctx.strokeStyle=c.glow;ctx.lineWidth=2;
  for(let i=0;i<3;i++){ctx.globalAlpha=.5;ctx.beginPath();ctx.ellipse(W/2,py0,112,20,0,t*1.2+i*2.09,t*1.2+i*2.09+1.3);ctx.stroke()}
  ctx.globalAlpha=.25;ctx.beginPath();ctx.ellipse(W/2,py0,128,24,0,0,PI2);ctx.stroke();ctx.restore();
  /* دایناسور بزرگ */
  const gy=412+Math.sin(t*2.2)*3,S=2.3,po={leg:t*11,air:false,alpha:unl?1:.5};
  drawRibbon(sk,W/2,gy,S,200,0);
  drawAura(sk,W/2,gy,S,t);
  drawDino(sk,W/2,gy,S,po);
  drawBolts();drawRings();drawParts();
  if(!unl){
    ctx.fillStyle='rgba(8,8,20,.55)';ctx.beginPath();ctx.arc(W/2,300,34,0,PI2);ctx.fill();
    ctx.strokeStyle='rgba(255,255,255,.4)';ctx.lineWidth=2;ctx.stroke();
    txt('🔒',W/2,312,32,'#fff');
  }
  /* فلش‌ها */
  for(const sd of[-1,1]){
    const x=W/2+sd*190,y=330;
    ctx.fillStyle='rgba(255,255,255,.08)';ctx.beginPath();ctx.arc(x,y,26,0,PI2);ctx.fill();
    ctx.strokeStyle='rgba(255,255,255,.35)';ctx.lineWidth=1.5;ctx.stroke();
    ctx.strokeStyle='#ffd29d';ctx.lineWidth=3.5;ctx.lineCap='round';ctx.lineJoin='round';
    ctx.beginPath();ctx.moveTo(x-sd*5,y-10);ctx.lineTo(x+sd*5,y);ctx.lineTo(x-sd*5,y+10);ctx.stroke();
  }
  /* نام و وضعیت */
  txt(sk.name,W/2,462,24,'#fff','900');
  if(unl){txt(pv===skin?'✓ فعال':'✓ باز شده',W/2,488,13,'#9ad9b4','800')}
  else{
    txt('🔒 با رسیدن به '+FA(sk.need)+' امتیاز باز می‌شود',W/2,486,13,'#ffb0b0','800');
    const f=clamp(best/sk.need,0,1);
    rr(150,498,180,8,4);ctx.fillStyle='rgba(255,255,255,.12)';ctx.fill();
    if(f>0){rr(150,498,Math.max(8,180*f),8,4);ctx.fillStyle=c.glow;ctx.fill()}
  }
  /* نقطه‌ها */
  const step=30,x0=W/2-(NS-1)*step/2;
  for(let i=0;i<NS;i++){
    const x=x0+i*step,u=Store.skinUnlocked(id,i),cur=i===pv;
    ctx.beginPath();ctx.arc(x,534,cur?7:4.5,0,PI2);
    ctx.fillStyle=u?SKINS[i].c.glow:'rgba(255,255,255,.18)';ctx.globalAlpha=u?1:.8;ctx.fill();ctx.globalAlpha=1;
    if(cur){ctx.strokeStyle='#fff';ctx.lineWidth=1.6;ctx.stroke()}
  }
  /* دکمه شروع */
  const pulse=.9+.1*Math.sin(t*4);
  ctx.save();
  const sg=ctx.createLinearGradient(70,562,410,622);sg.addColorStop(0,'#ffc27a');sg.addColorStop(1,'#e58f4a');
  rr(70,562,340,58,18);ctx.fillStyle=sg;ctx.fill();ctx.strokeStyle='#ffe2bd';ctx.lineWidth=2;ctx.stroke();
  txt('▶  شروع بازی',W/2,599,24*pulse,'#2a1604','900');
  ctx.restore();
}
function browse(d){
  pv=(pv+d+NS)%NS;sfx.ui();
  if(Store.skinUnlocked(id,pv)){skin=pv;Store.setSkin(id,pv)}
  parts=[];tr=[];bolts=[];
}

/* ---------- ترسیم اصلی ---------- */
function draw(){
  if(st==='ready'){drawMenu();return}
  const sk=SKINS[skin],n=night;
  ctx.save();
  if(GFX.shake&&shake>.1)ctx.translate((Math.random()-.5)*shake,(Math.random()-.5)*shake);
  drawWorld();
  for(const o of obs){
    if(o.type==='bird')bird(o,n);
    else for(const p of o.parts)cactus(o.x+p.ox,p.w,p.h,n,o.seed);
  }
  drawSpeedLines();
  const cx=DX+28+D.dx,dead=st==='dying'||st==='dead';
  drawRibbon(sk,DX+28,GY-D.y,1,spd,D.y);
  for(const gh of ghosts){drawDino(sk,gh.x,GY-gh.h,1,{leg:gh.leg,air:gh.air,alpha:.38*gh.life/gh.max,tm:t})}
  if(!dead)drawAura(sk,cx,GY-D.y,1,t);
  drawDino(sk,cx,GY-D.y,1,{leg:D.anim,air:D.air,duck:D.duck,dead,rot:D.rot,sx:1+D.sq,sy:1-D.sq*.9});
  drawBolts();drawRings();drawParts();
  ctx.restore();
  ctx.fillStyle=vig;ctx.fillRect(0,0,W,H);
  if(flash>0){ctx.fillStyle=`rgba(255,255,255,${clamp(flash*.5,0,.45)})`;ctx.fillRect(0,0,W,H)}
  if(st==='play'||st==='dying'){
    const sz=34+8*scorePop;
    ctx.save();ctx.shadowColor='rgba(0,0,0,.45)';ctx.shadowBlur=6;txt(FA(score),W/2,74,sz,'rgba(255,255,255,.95)','800');ctx.restore();
    if(skin<NS-1||pv<NS-1){
      const nx=Math.min(NS-1,Store.skinIndex(id)+1),from=SKINS[nx-1]?SKINS[nx-1].need:0,span=SKINS[nx].need-from||1;
      if(Store.skinIndex(id)<NS-1){const f=clamp((score-from)/span,0,1);rr(W/2-70,92,140,5,2.5);ctx.fillStyle='rgba(255,255,255,.18)';ctx.fill();if(f>0){rr(W/2-70,92,Math.max(5,140*f),5,2.5);ctx.fillStyle=SKINS[nx].c.glow;ctx.fill()}}
    }
    txt('HI '+FA(Store.best(id)),W-20,34,12,'rgba(255,255,255,.7)','700','right');
  }
  if(skinPulse>0){
    const s2=SKINS[bannerSkin],a=Math.min(1,skinPulse*2,(2.4-skinPulse)*4),yy=140-(1-a)*14;
    ctx.save();ctx.globalAlpha=a;
    rr(W/2-170,yy-34,340,76,18);ctx.fillStyle='rgba(12,10,26,.72)';ctx.fill();ctx.strokeStyle=s2.c.glow;ctx.lineWidth=2;ctx.stroke();
    txt('اسکین جدید باز شد!',W/2,yy-6,16,'#ffd29d','800');txt(s2.name,W/2,yy+26,26,'#fff','900');
    ctx.restore();
  }
  if(st==='dead'){
    const a=clamp(deadT*3,0,1);
    ctx.save();ctx.globalAlpha=a;dim(.55);
    txt('باختی!',W/2,205,54,'#ff6b81','900');
    txt('امتیاز: '+FA(score),W/2,262,26,'#fff','800');
    txt('رکورد: '+FA(Store.best(id)),W/2,298,18,'#ffd166','800');
    txt('اسکین: '+sk.name,W/2,328,16,'#eafcff','600');
    if(newBest)txt('🎉 رکورد جدید!',W/2,362,22,'#9ad9b4','800');
    ctx.globalAlpha=a*(.6+.4*Math.sin(t*4));txt('برای شروع دوباره بزن',W/2,418,20,'#fff','700');
    ctx.restore();
  }
}

/* ---------- ورودی ---------- */
function down(e){
  if(Date.now()<lock)return;
  if(st==='ready'){
    if(e&&e.clientX!==undefined){
      const x=px(e),y=py(e);
      if(Math.abs(x-(W/2-190))<44&&Math.abs(y-330)<64){browse(-1);return}
      if(Math.abs(x-(W/2+190))<44&&Math.abs(y-330)<64){browse(1);return}
      if(y>=520&&y<=548){const step=30,x0=W/2-(NS-1)*step/2,i=Math.round((x-x0)/step);if(i>=0&&i<NS&&Math.abs(x-(x0+i*step))<=15){if(i!==pv){pv=i;sfx.ui();if(Store.skinUnlocked(id,i)){skin=i;Store.setSkin(id,i)}parts=[];tr=[];bolts=[]}return}}
      if(x>=70&&x<=410&&y>=555&&y<=625){start();return}
      return;
    }
    start();return;
  }
  if(st==='dead'){start();return}
  if(st==='play')jumpBuf=.12;
}
function up(){if(st==='play'&&D.vy>640)D.vy=640}
return{id,enter,update,draw,down,up,playing:()=>st==='play',idle:()=>st==='ready'||st==='dead'};
})();
/* ================= FRUIT NINJA ================= */
Games.ninja=(()=>{
const id='ninja',R=32,G=900,SZ=54;
const FR=[['🍉','#ff4d6d'],['🍎','#ff3b3b'],['🍊','#ff9f1c'],['🍋','#ffe135'],['🍇','#9b5de5'],['🍓','#ff5d8f'],['🍍','#ffd23f'],['🥝','#8ac926'],['🍑','#ff9e7a']];
let st='ready',score=0,lives=3,pt=0,spawnT=0,newBest=false,lock=0,t=0,why='',flash=0,shake=0,comboN=0,comboT=0,lx=0,ly=0,havePrev=false;
let items=[],halves=[],parts=[],floats=[],splats=[],trail=[];
const bg=ctx.createLinearGradient(0,0,0,H);bg.addColorStop(0,'#3b1d4a');bg.addColorStop(.6,'#1b1236');bg.addColorStop(1,'#0e0a22');
const sync=()=>{Shell.score(score);Shell.info('♥'.repeat(Math.max(0,lives)))};
function reset(){items=[];halves=[];parts=[];floats=[];splats=[];trail=[];score=0;lives=3;pt=0;spawnT=.5;comboN=0;comboT=0;flash=0;shake=0;havePrev=false}
function enter(){reset();st='ready';newBest=false;sync()}
function start(){reset();newBest=false;Shell.begin();sync();st='play';sfx.launch()}
function spawn(){
  const n=1+Math.floor(Math.random()*Math.min(4,1+pt/20));
  const pb=Math.min(.3,.1+pt*.003);
  const kinds=Array.from({length:n},()=>Math.random()<pb);
  if(n>1&&kinds.every(Boolean))kinds[0]=false;
  let bombs=0;
  kinds.forEach((b,i)=>{
    if(b&&bombs>=2)b=false;
    if(b)bombs++;
    const x=50+Math.random()*(W-100),h=280+Math.random()*230,vy=-Math.sqrt(2*G*h);
    const tx=70+Math.random()*(W-140),tf=2*Math.sqrt(2*h/G);
    const f=FR[Math.floor(Math.random()*FR.length)];
    items.push({x,y:H+R,vx:(tx-x)/tf,vy,rot:Math.random()*6.28,vr:(Math.random()-.5)*6,bomb:b,e:f[0],c:f[1],wait:i*.13,dead:false});
  });
  sfx.whoosh();
}
function boom(it){
  st='over';why='bomb';flash=1;shake=24;sfx.bomb();
  const cols=['#ffd166','#ff6b35','#ffffff','#555555'];
  for(let i=0,N=Math.max(6,Math.round(46*GFX.p));i<N;i++){
    const a=Math.random()*6.28,sp=100+Math.random()*340;
    parts.push({x:it.x,y:it.y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,life:.5+Math.random()*.6,max:1.1,c:cols[i%4],s:3+Math.random()*4});
  }
  newBest=Shell.finish(score,'lose');lock=Date.now()+800;
}
function missed(it){
  lives--;lifeFX.show();sfx.miss();sync();
  floats.push({x:clamp(it.x,30,W-30),y:H-34,txt:'✖',life:.9,c:'#ff6b81'});
  if(lives<=0){st='over';why='fruit';sfx.over();newBest=Shell.finish(score,'lose');lock=Date.now()+800}
}
function slice(it,ang){
  it.dead=true;
  if(it.bomb){boom(it);return}
  comboN=comboT>0?comboN+1:1;comboT=.35;
  const pts=10+(comboN-1)*10;score+=pts;
  floats.push({x:it.x,y:it.y-10,txt:comboN>1?'+'+FA(pts)+' ×'+FA(comboN):'+'+FA(pts),life:.9,c:comboN>1?'#ffd166':'#ffffff'});
  const nx=-Math.sin(ang),ny=Math.cos(ang);
  for(const sd of[-1,1])halves.push({x:it.x,y:it.y,vx:it.vx+nx*sd*110,vy:it.vy+ny*sd*110-40,e:it.e,cut:ang,rot0:it.rot,spin:0,vr:sd*(1.5+Math.random()*3),side:sd});
  splats.push({x:it.x,y:it.y,c:it.c,r:20+Math.random()*16,life:1.6});
  for(let i=0,N=Math.max(3,Math.round(14*GFX.p));i<N;i++){
    const a=Math.random()*6.28,sp=80+Math.random()*220;
    parts.push({x:it.x,y:it.y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp-80,life:.45+Math.random()*.4,max:.85,c:it.c,s:2.5+Math.random()*3});
  }
  sfx.slice();sync();
}
function cut(x1,y1,x2,y2){
  if(st!=='play')return;
  const dx=x2-x1,dy=y2-y1,l2=dx*dx+dy*dy;
  if(l2<1)return;
  const ang=Math.atan2(dy,dx);
  for(const it of items){
    if(it.dead||it.wait>0)continue;
    const u=clamp(((it.x-x1)*dx+(it.y-y1)*dy)/l2,0,1);
    if(Math.hypot(it.x-(x1+u*dx),it.y-(y1+u*dy))<=R){
      slice(it,ang);
      if(st!=='play')break;
    }
  }
}
function move(e){
  if(!(e.buttons&1)){havePrev=false;return}
  const x=px(e),y=py(e);
  if(!havePrev){lx=x;ly=y;havePrev=true;trail=[{x,y,t}];return}
  trail.push({x,y,t});
  if(Math.hypot(x-lx,y-ly)<6)return;
  cut(lx,ly,x,y);lx=x;ly=y;
}
function update(dt){
  t+=dt;
  if(flash>0)flash-=dt*1.6;
  if(shake>0)shake=Math.max(0,shake-dt*30);
  if(comboT>0)comboT-=dt;
  for(const p of parts){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=500*dt;p.life-=dt}
  parts=parts.filter(p=>p.life>0);
  for(const h of halves){h.vy+=G*dt;h.x+=h.vx*dt;h.y+=h.vy*dt;h.spin+=h.vr*dt}
  halves=halves.filter(h=>h.y<H+120);
  for(const s of splats)s.life-=dt;
  splats=splats.filter(s=>s.life>0);
  for(const f of floats){f.y-=40*dt;f.life-=dt}
  floats=floats.filter(f=>f.life>0);
  trail=trail.filter(p=>t-p.t<.2);
  if(st!=='play')return;
  pt+=dt;
  spawnT-=dt;
  if(spawnT<=0){spawn();spawnT=Math.max(.55,1.3-pt*.009)+Math.random()*.4}
  for(const it of items){
    if(it.wait>0){it.wait-=dt;continue}
    it.vy+=G*dt;it.x+=it.vx*dt;it.y+=it.vy*dt;it.rot+=it.vr*dt;
    if(it.vy>0&&it.y>H+R){
      it.dead=true;
      if(!it.bomb&&st==='play')missed(it);
    }
  }
  items=items.filter(i=>!i.dead);
}
function drawFruit(it){
  ctx.save();ctx.translate(it.x,it.y);ctx.rotate(it.rot);
  ctx.font=`${SZ}px ${FONT}`;ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText(it.e,0,2);
  ctx.restore();ctx.textBaseline='alphabetic';
}
function drawHalf(h){
  ctx.save();ctx.translate(h.x,h.y);ctx.rotate(h.cut+h.spin);
  ctx.beginPath();ctx.rect(-R*1.6,h.side<0?-R*1.6:0,R*3.2,R*1.6);ctx.clip();
  ctx.rotate(h.rot0-h.cut);
  ctx.font=`${SZ}px ${FONT}`;ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText(h.e,0,2);
  ctx.restore();ctx.textBaseline='alphabetic';
}
function drawBomb(b){
  ctx.save();ctx.translate(b.x,b.y);ctx.rotate(b.rot*.35);
  ctx.fillStyle='#202028';ctx.beginPath();ctx.arc(0,0,R-3,0,6.283);ctx.fill();
  ctx.strokeStyle='#ff4d4d';ctx.lineWidth=3;ctx.stroke();
  ctx.fillStyle='rgba(255,255,255,.22)';ctx.beginPath();ctx.arc(-9,-10,7,0,6.283);ctx.fill();
  ctx.fillStyle='#55555f';rr(-7,-R-2,14,10,3);ctx.fill();
  ctx.strokeStyle='#d9b26f';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(0,-R-2);ctx.quadraticCurveTo(8,-R-12,14,-R-10);ctx.stroke();
  const f=.5+.5*Math.sin(t*30);
  ctx.fillStyle=f>.5?'#ffd166':'#ff6b35';ctx.beginPath();ctx.arc(14,-R-10,4+f*2,0,6.283);ctx.fill();
  ctx.restore();
}
function draw(){
  ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
  ctx.fillStyle='rgba(255,107,129,.06)';ctx.beginPath();ctx.arc(W/2,250,170,0,6.283);ctx.fill();
  ctx.save();
  if(shake>0&&!reduce)ctx.translate((Math.random()-.5)*shake,(Math.random()-.5)*shake);
  for(const s of splats){ctx.globalAlpha=clamp(s.life,0,1)*.3;ctx.fillStyle=s.c;ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,6.283);ctx.fill()}
  ctx.globalAlpha=1;
  for(const it of items){if(it.dead||it.wait>0)continue;if(it.bomb)drawBomb(it);else drawFruit(it)}
  for(const h of halves)drawHalf(h);
  for(const p of parts){ctx.globalAlpha=clamp(p.life/p.max,0,1);ctx.fillStyle=p.c;ctx.fillRect(p.x,p.y,p.s,p.s)}
  ctx.globalAlpha=1;
  ctx.restore();
  // blade trail
  ctx.lineCap='round';ctx.lineJoin='round';
  for(let i=1;i<trail.length;i++){
    const a=trail[i-1],b=trail[i],k=1-(t-b.t)/.2;
    if(k<=0)continue;
    ctx.globalAlpha=k*.35;ctx.strokeStyle='#7de8ff';ctx.lineWidth=4+k*12;
    ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
    ctx.globalAlpha=k;ctx.strokeStyle='#ffffff';ctx.lineWidth=2+k*5;
    ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
  }
  ctx.globalAlpha=1;ctx.lineCap='butt';ctx.lineJoin='miter';
  for(const f of floats){ctx.globalAlpha=clamp(f.life*1.5,0,1);txt(f.txt,f.x,f.y,20,f.c)}
  ctx.globalAlpha=1;
  if(flash>0){ctx.globalAlpha=clamp(flash,0,1)*.85;ctx.fillStyle='#fff';ctx.fillRect(0,0,W,H);ctx.globalAlpha=1}
  overlay();
}
function overlay(){
  const pulse=.55+.45*Math.sin(t*4);
  if(st==='ready'){
    dim(.66);
    txt('نینجای میوه',W/2,150,50,'#ff6b81');
    txt('میوه‌ها رو با انگشتت ببر',W/2,190,17,'#cfc4ff','400');
    txt('رکورد: '+FA(Store.best(id)),W/2,250,18,'#ffd166');
    ctx.globalAlpha=pulse;txt('برای شروع بزن',W/2,305,24,'#fff');ctx.globalAlpha=1;
    txt('انگشتت یا ماوس رو روی میوه‌ها بکش',W/2,370,14,'#f3ecff','400');
    txt('چند میوه توی یه کشیدن = امتیاز کمبو',W/2,400,14,'#a79bd0','400');
    txt('💣 بمب رو نبر! بریدنش یعنی باختن',W/2,430,14,'#ff8fa3','400');
    txt('اگه ۳ تا میوه از دستت بره می‌بازی',W/2,460,14,'#a79bd0','400');
  }else if(st==='over'){
    dim(.68);
    txt(why==='bomb'?'بمب! 💥':'باختی!',W/2,220,52,'#ff6b81');
    txt(why==='bomb'?'بمب رو بریدی':'سه تا میوه از دستت رفت',W/2,262,16,'#cfc4ff','400');
    txt('امتیاز: '+FA(score),W/2,312,24,'#fff');
    txt('رکورد: '+FA(Store.best(id)),W/2,347,18,'#ffd166');
    if(newBest)txt('🎉 رکورد جدید!',W/2,390,22,'#7dffb0');
    ctx.globalAlpha=pulse;txt('برای شروع دوباره بزن',W/2,448,20,'#fff');ctx.globalAlpha=1;
  }else if(st==='play'&&pt<3){
    ctx.globalAlpha=pulse;txt('انگشتت رو روی میوه‌ها بکش',W/2,H-40,16,'#cfc4ff','400');ctx.globalAlpha=1;
  }
}
function down(e){
  if(Date.now()<lock)return;
  if(st==='ready'||st==='over')start();
  if(e){lx=px(e);ly=py(e);havePrev=true;trail=[{x:lx,y:ly,t}]}
}
function up(){havePrev=false}
return{id,enter,update,draw,down,up,move,playing:()=>st==='play',idle:()=>st==='ready'||st==='over'};
})();
/* ================= MEMORY (کارت بازی) ================= */
Games.memory=(()=>{
const id='memory';
const SYMBOLS=[];
const MODES=[
 {id:'easy',name:'آسان',pairs:6,cols:3,points:100,par:55,rate:4,tag:'۱۲ کارت',tone:'#c8b58a',desc:'شروع راحت و مناسب گرم‌کردن'},
 {id:'medium',name:'متوسط',pairs:8,cols:4,points:180,par:85,rate:7,tag:'۱۶ کارت',tone:'#a9b9c7',desc:'کارت بیشتر و امتیاز بهتر'},
 {id:'hard',name:'سخت',pairs:12,cols:4,points:300,par:130,rate:11,tag:'۲۴ کارت',tone:'#d39a72',desc:'چالش جدی با پاداش زیاد'}
];
let mode=MODES[1],st='ready',cards=[],first=null,second=null,wait=0,matched=0,miss=0,streak=0,score=0,elapsed=0,bonus=0,finalScore=0,newBest=false,floats=[],lock=0;
const shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
function viewH(){
 if(!document.body.classList.contains('memoryFS'))return H;
 const r=cv.getBoundingClientRect();
 return r.width>0&&r.height>0?Math.max(H,r.height*W/r.width):H;
}
function viewScaleY(){return H/viewH()}
const rounded=(x,y,w,h,r)=>{ctx.beginPath();if(ctx.roundRect)ctx.roundRect(x,y,w,h,r);else{ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r)}};
function box(x,y,w,h,r,fill,stroke,line=1){rounded(x,y,w,h,r);ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=line;ctx.stroke()}}
function modeRect(i){const total=3*82+2*19,top=Math.max(184,(viewH()-total)/2);return{x:42,y:top+i*101,w:396,h:82}}
function layout(){
 const cols=mode.cols,rows=mode.pairs*2/cols,gap=mode.id==='hard'?7:9;
 const ch=mode.id==='easy'?87:mode.id==='medium'?89:64;
 const totalW=W-30,cw=(totalW-gap*(cols-1))/cols;
 const top=Math.max(mode.id==='hard'?128:136,(viewH()-(rows*ch+(rows-1)*gap))/2);
 return{cols,rows,gap,ch,cw,top,left:(W-(cols*cw+(cols-1)*gap))/2};
}
function pos(i){const g=layout();return{x:g.left+(i%g.cols)*(g.cw+g.gap),y:g.top+Math.floor(i/g.cols)*(g.ch+g.gap),w:g.cw,h:g.ch}}
let lastDeal=[];
function deal(){const fresh=SYMBOLS.filter(x=>!lastDeal.includes(x));const base=shuffle((fresh.length>=mode.pairs?fresh:SYMBOLS).slice()).slice(0,mode.pairs);lastDeal=base.slice();const picked=base.map(n=>n+':'+((Math.random()*5)|0));cards=shuffle([...picked,...picked]).map((e,i)=>({e,up:false,ok:false,f:0,pop:0,index:i}));}
function sync(){Shell.hud(st==='over'?finalScore:score);Shell.info('جفت '+FA(matched)+'/'+FA(mode.pairs))}
function reset(){cards=[];first=null;second=null;wait=0;matched=0;miss=0;streak=0;score=0;elapsed=0;bonus=0;finalScore=0;floats=[];newBest=false;}
function start(m=mode){mode=m;reset();deal();st='play';Shell.begin();Shell.hud(0);Shell.info('جفت ۰/'+FA(mode.pairs));sfx.launch();sfx.ui()}
function win(){st='over';bonus=Math.max(0,Math.ceil(mode.par-elapsed))*mode.rate;finalScore=score+bonus;Shell.hud(finalScore);newBest=Shell.finish(finalScore,'win');lock=Date.now()+250;sfx.clear();}
function resolve(){const a=first,b=second;first=null;second=null;wait=0;if(!a||!b)return;
 if(a.e===b.e){a.ok=b.ok=true;a.pop=b.pop=.28;matched++;streak++;const combo=Math.min(Math.max(0,streak-1),4)*20;const pts=mode.points+combo;score+=pts;const p=pos(cards.indexOf(a));floats.push({x:p.x+p.w/2,y:p.y+p.h/2,txt:'+'+FA(pts),life:.72,color:streak>1?'#ddbd79':'#f3ead7'});sfx.pop(matched,streak);sync();if(matched>=mode.pairs)win();}
 else{a.up=b.up=false;streak=0;miss++;floats.push({x:W/2,y:108,txt:'اشتباه! بدون کسر امتیاز',life:.65,color:'#e5b8a1'});sfx.nope();sync();}
}
function pick(x,y){if(st!=='play'||wait>0)return;for(let i=0;i<cards.length;i++){const c=cards[i],p=pos(i);if(x<p.x||x>p.x+p.w||y<p.y||y>p.y+p.h)continue;if(c.up||c.ok)return;c.up=true;sfx.flip();if(!first){first=c;return}second=c;wait=.72;return;}}
function hitMode(x,y){for(let i=0;i<MODES.length;i++){const b=modeRect(i);if(x>=b.x&&x<=b.x+b.w&&y>=b.y&&y<=b.y+b.h){start(MODES[i]);return true}}return false}
function update(dt){for(const c of cards){c.f+=clamp((c.up||c.ok?1:0)-c.f,-dt*9,dt*9);if(c.pop>0)c.pop=Math.max(0,c.pop-dt)}for(const f of floats){f.y-=18*dt;f.life-=dt}floats=floats.filter(f=>f.life>0);if(st!=='play')return;elapsed+=dt;if(wait>0){wait-=dt;if(wait<=0)resolve()}}
let g=ctx;
const TAU=Math.PI*2;
const K={red:'#c4584a',gold:'#d9a93c',orange:'#d98a45',green:'#6a9a5e',lgreen:'#9bbd7a',teal:'#4f9b8f',blue:'#5e84b5',lblue:'#a9c3e0',purple:'#8f78a8',pink:'#d98a9a',brown:'#8b6a4e',dbrown:'#5e4636',cream:'#efe6cf',grey:'#8d98a3',dgrey:'#55616c',ink:'#2a3540',white:'#fbf7ec',tan:'#d9bf8c'};
const ACC=[[K.red,K.gold,K.teal,K.blue],[K.blue,K.red,K.gold,K.teal],[K.teal,K.purple,K.red,K.gold],[K.purple,K.teal,K.orange,K.pink],[K.orange,K.blue,K.pink,K.green]];
const TINT=['#e9e0c9','#d9e5d1','#efdccb','#dadff0','#ead8de'];
const lerp3=(A,B,q)=>A.map((v,j)=>v+(B[j]-v)*q);
const rgbs=a=>'rgb('+a.map(v=>Math.round(v)).join(',')+')';
function rp(x,y,w,h,r){g.beginPath();if(g.roundRect)g.roundRect(x,y,w,h,r);else{g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r)}}
function bx(x,y,w,h,r,fill,stroke,lw){rp(x,y,w,h,r);g.fillStyle=fill;g.fill();if(stroke){g.lineWidth=lw||1;g.strokeStyle=stroke;g.stroke()}}
function circ(x,y,r,col){g.beginPath();g.arc(x,y,r,0,TAU);g.fillStyle=col;g.fill()}
function ell(x,y,rx,ry,rot,col){g.beginPath();g.ellipse(x,y,rx,ry,rot,0,TAU);g.fillStyle=col;g.fill()}
function poly(pts,col){g.beginPath();pts.forEach((p,i)=>i?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1]));g.closePath();g.fillStyle=col;g.fill()}
function ln(x1,y1,x2,y2,w,col){g.beginPath();g.moveTo(x1,y1);g.lineTo(x2,y2);g.lineWidth=w;g.lineCap='round';g.strokeStyle=col;g.stroke();g.lineCap='butt'}
function curve(x0,y0,cx,cy,x1,y1,w,col){g.beginPath();g.moveTo(x0,y0);g.quadraticCurveTo(cx,cy,x1,y1);g.lineWidth=w;g.lineCap='round';g.strokeStyle=col;g.stroke();g.lineCap='butt'}
function arcS(x,y,r,a0,a1,w,col){g.beginPath();g.arc(x,y,r,a0,a1);g.lineWidth=w;g.lineCap='round';g.strokeStyle=col;g.stroke();g.lineCap='butt'}
function rr(x,y,w,h,r,col){rp(x,y,w,h,r);g.fillStyle=col;g.fill()}
function hl(x,y,rx,ry,rot){ell(x,y,rx,ry,rot,'rgba(255,255,255,.38)')}
function eyes(x1,x2,y,r){circ(x1,y,r,K.ink);circ(x2,y,r,K.ink);circ(x1-r*.3,y-r*.3,r*.38,K.white);circ(x2-r*.3,y-r*.3,r*.38,K.white)}
function clipEll(x,y,rx,ry,rot,fn){g.save();g.beginPath();g.ellipse(x,y,rx,ry,rot,0,TAU);g.clip();fn();g.restore()}
/* ۶۴ آیکون ساده و رنگی که با دست کشیده شدن؛ هرکدوم داخل مربع ‎-۲۰ تا ۲۰‎ */
const ICONS={
 /* ---- حیوان‌ها ---- */
 cat(a){poly([[-13,-3],[-11,-17],[-3,-9]],a[1]);poly([[13,-3],[11,-17],[3,-9]],a[1]);poly([[-11,-5],[-10,-13],[-5,-9]],K.pink);poly([[11,-5],[10,-13],[5,-9]],K.pink);ell(0,3,14,12,0,a[1]);eyes(-5,5,1,2.1);poly([[-2,5],[2,5],[0,7.5]],K.pink);ln(-15,6,-7,7,1.2,K.dgrey);ln(-15,10,-7,9,1.2,K.dgrey);ln(15,6,7,7,1.2,K.dgrey);ln(15,10,7,9,1.2,K.dgrey)},
 dog(a){ell(-12,-1,5,10,.25,K.dbrown);ell(12,-1,5,10,-.25,K.dbrown);ell(0,0,11.5,12.5,0,a[1]);ell(0,6,7,6,0,K.cream);eyes(-4.5,4.5,-3,2);ell(0,3.5,3,2.2,0,K.ink);ell(0,11,2.3,3,0,K.pink)},
 fish(a){poly([[9,0],[19,-8],[19,8]],a[1]);ell(-1,0,13,8.5,0,a[0]);poly([[-2,-7.5],[3,-14],[6,-7]],a[1]);poly([[-2,7.5],[3,13],[6,7]],a[1]);clipEll(-1,0,13,8.5,0,()=>{g.fillStyle='rgba(255,255,255,.22)';g.fillRect(2,-10,3,20);g.fillRect(7,-10,3,20)});circ(-8,-2,2.5,K.white);circ(-8,-2,1.2,K.ink);ln(-12,2,-9,3.5,1.4,K.ink)},
 bird(a){poly([[-10,6],[-19,12],[-8,12]],a[3]);ell(-1,4,12,9,-.2,a[3]);circ(7,-5,6.5,a[3]);poly([[12,-6],[19,-4],[12,-2]],K.gold);ell(-2,5,7,4.2,-.45,'rgba(0,0,0,.18)');circ(8.5,-6.5,1.7,K.ink);ln(-2,13,-2,18,1.6,K.orange);ln(3,13,3,18,1.6,K.orange)},
 owl(a){poly([[-10,-10],[-12,-18],[-4,-13]],K.dbrown);poly([[10,-10],[12,-18],[4,-13]],K.dbrown);ell(0,2,12.5,15.5,0,K.brown);ell(0,6,8,9.5,0,K.cream);circ(-5.5,-3,5.8,K.white);circ(5.5,-3,5.8,K.white);circ(-5.5,-3,2.6,K.ink);circ(5.5,-3,2.6,K.ink);poly([[-2,1],[2,1],[0,5]],K.gold);ln(-4,16,-4,19,1.8,K.orange);ln(4,16,4,19,1.8,K.orange)},
 rabbit(a){ell(-5,-12,3.8,9.5,.12,K.cream);ell(5,-12,3.8,9.5,-.12,K.cream);ell(-5,-12,1.8,6.5,.12,K.pink);ell(5,-12,1.8,6.5,-.12,K.pink);ell(0,5,11,10,0,K.cream);eyes(-4.5,4.5,3,1.9);ell(0,7.5,2,1.5,0,K.pink);ell(-9,10,2.4,1.5,0,K.pink);ell(9,10,2.4,1.5,0,K.pink)},
 turtle(a){ell(15,3,4.5,4,0,K.lgreen);circ(16.5,2,1.1,K.ink);ell(-12,7,3.6,3,0,K.lgreen);ell(8,10,3.6,3,0,K.lgreen);ell(-5,11,3.6,3,0,K.lgreen);poly([[-15,4],[-21,8],[-14,8]],K.lgreen);g.beginPath();g.ellipse(-1,5,14,12,0,Math.PI,0);g.closePath();g.fillStyle=K.green;g.fill();ln(-1,-7,-1,5,1.3,'rgba(0,0,0,.28)');ln(-8,-4,-8,5,1.3,'rgba(0,0,0,.28)');ln(6,-4,6,5,1.3,'rgba(0,0,0,.28)');rr(-15,4,28,3.5,1.7,K.dbrown)},
 butterfly(a){ell(-8,-6,8.5,6.5,-.5,a[0]);ell(8,-6,8.5,6.5,.5,a[0]);ell(-6,7,6.5,5.5,.5,a[1]);ell(6,7,6.5,5.5,-.5,a[1]);circ(-9,-7,2.2,'rgba(255,255,255,.55)');circ(9,-7,2.2,'rgba(255,255,255,.55)');ell(0,0,2,10,0,K.ink);ln(-1,-9,-5,-16,1.2,K.ink);ln(1,-9,5,-16,1.2,K.ink)},
 bee(a){ell(-3,-8,6.5,4,-.5,'rgba(190,215,235,.9)');ell(5,-9,6.5,4,.4,'rgba(190,215,235,.9)');ell(1,3,12,9,0,K.gold);clipEll(1,3,12,9,0,()=>{g.fillStyle=K.ink;g.fillRect(-4,-8,3.5,22);g.fillRect(3,-8,3.5,22)});circ(-12,2,5.4,K.ink);circ(-13.5,1,1.3,K.white);poly([[13,2],[19,3],[13,5]],K.ink);ln(-14,-2,-17,-7,1.2,K.ink)},
 frog(a){ell(0,5,14.5,10.5,0,K.green);circ(-7,-5,5.8,K.green);circ(7,-5,5.8,K.green);circ(-7,-5,4,K.white);circ(7,-5,4,K.white);circ(-7,-4.5,2,K.ink);circ(7,-4.5,2,K.ink);arcS(0,4,7,.25,Math.PI-.25,1.8,'#3a5a35');ell(0,12,9,3.5,0,K.lgreen)},
 elephant(a){ell(-13,-1,6.5,9.5,.2,K.grey);ell(13,-1,6.5,9.5,-.2,K.grey);ell(-13,-1,3.4,6.5,.2,'rgba(217,138,154,.55)');ell(13,-1,3.4,6.5,-.2,'rgba(217,138,154,.55)');circ(0,-2,11.5,K.grey);curve(0,4,3,16,-5,17,6.5,K.grey);eyes(-5,5,-4,1.9);ln(-6,8,-9,12,2.4,K.cream);ln(6,8,9,12,2.4,K.cream)},
 penguin(a){ell(-12,4,3,8,.3,K.ink);ell(12,4,3,8,-.3,K.ink);ell(0,2,11.5,15.5,0,K.ink);ell(0,5,7.5,11,0,K.white);circ(-4,-6,2.6,K.white);circ(4,-6,2.6,K.white);circ(-4,-6,1.2,K.ink);circ(4,-6,1.2,K.ink);poly([[-2.5,-2],[2.5,-2],[0,2]],K.orange);ell(-6,18,4.5,2,0,K.orange);ell(6,18,4.5,2,0,K.orange)},
 snail(a){ell(-1,11,16,4.5,0,K.tan);ell(-14,8,4,6,-.2,K.tan);ln(-15,4,-17,-3,1.4,K.tan);ln(-12,4,-12,-3,1.4,K.tan);circ(-17,-3.5,1.6,K.ink);circ(-12,-3.5,1.6,K.ink);circ(4,-1,11,a[1]);arcS(4,-1,7,0,TAU*.75,1.8,'rgba(0,0,0,.3)');arcS(4,-1,3.2,.3,TAU*.7,1.8,'rgba(0,0,0,.3)')},
 crab(a,bg){ln(-10,8,-17,12,2,K.red);ln(-6,10,-11,15,2,K.red);ln(10,8,17,12,2,K.red);ln(6,10,11,15,2,K.red);ln(-12,0,-15,-7,2.4,K.red);ln(12,0,15,-7,2.4,K.red);circ(-15,-10,5.2,K.red);circ(15,-10,5.2,K.red);poly([[-15,-10],[-21,-14],[-16,-17]],bg);poly([[15,-10],[21,-14],[16,-17]],bg);ell(0,4,13,8.5,0,K.red);ln(-5,-3,-5,-7,1.6,K.red);ln(5,-3,5,-7,1.6,K.red);circ(-5,-8.5,2.4,K.white);circ(5,-8.5,2.4,K.white);circ(-5,-8.5,1.1,K.ink);circ(5,-8.5,1.1,K.ink);hl(-5,2,3,1.6,-.3)},
 octopus(a){curve(-9,6,-15,14,-8,17,3.6,a[0]);curve(-3,7,-5,16,-1,18.5,3.6,a[0]);curve(3,7,5,16,1,18.5,3.6,a[0]);curve(9,6,15,14,8,17,3.6,a[0]);circ(0,-3,11,a[0]);hl(-4,-8,3.5,2,-.5);eyes(-4,4,-2,2.1)},
 duck(a){poly([[-14,5],[-20,1],[-12,10]],K.gold);ell(-2,7,14,8,0,K.gold);ell(-3,8,7,4,-.3,'rgba(0,0,0,.14)');circ(7,-5,7,K.gold);poly([[12,-5],[19,-3],[12,0]],K.orange);circ(8,-7,1.6,K.ink)},
 /* ---- خوراکی‌ها ---- */
 apple(a){circ(-4.5,3,10.5,K.red);circ(4.5,3,10.5,K.red);ell(0,4,12,10,0,K.red);hl(-6,-1,2.6,5,.5);ln(0,-6,1.5,-14,2.2,K.dbrown);ell(6,-11,6,3,-.45,K.green)},
 banana(a){g.beginPath();g.moveTo(-13,-8);g.quadraticCurveTo(-4,17,14,5);g.lineWidth=9;g.lineCap='round';g.strokeStyle=K.gold;g.stroke();g.beginPath();g.moveTo(-12,-6);g.quadraticCurveTo(-4,13,12,4);g.lineWidth=2;g.strokeStyle='rgba(255,255,255,.35)';g.stroke();g.lineCap='butt';circ(-14,-9,2.8,K.dbrown);circ(15,5,2.6,K.dbrown)},
 cherry(a){curve(-6,9,-6,-4,1,-14,1.8,K.green);curve(6,10,6,-4,1,-14,1.8,K.green);circ(-6,10,6.5,K.red);circ(6,11,6.5,K.red);hl(-8,8,1.8,2.6,.4);hl(4,9,1.8,2.6,.4);ell(8,-13,6,3,-.4,K.green)},
 strawberry(a){g.beginPath();g.moveTo(0,18);g.bezierCurveTo(-18,8,-15,-8,0,-8);g.bezierCurveTo(15,-8,18,8,0,18);g.fillStyle=K.red;g.fill();[[-6,-1],[0,0],[6,-1],[-8,6],[-3,6],[3,6],[8,6],[-3,12],[3,12]].forEach(s=>ell(s[0],s[1]+1,.9,1.4,0,K.gold));poly([[0,-8],[-9,-12],[-4,-6]],K.green);poly([[0,-8],[9,-12],[4,-6]],K.green);poly([[-3,-8],[0,-15],[3,-8]],K.green)},
 watermelon(a){g.beginPath();g.arc(0,-5,17,0,Math.PI);g.closePath();g.fillStyle=K.green;g.fill();g.beginPath();g.arc(0,-5,14,0,Math.PI);g.closePath();g.fillStyle='#d4e6bd';g.fill();g.beginPath();g.arc(0,-5,12,0,Math.PI);g.closePath();g.fillStyle=K.red;g.fill();[[-6,3],[0,6],[6,3],[-3,0],[3,0]].forEach(s=>ell(s[0],s[1],1,1.9,.3,K.ink))},
 pizza(a){poly([[-15,-12],[15,-12],[0,18]],'#c98f4d');poly([[-12,-9],[12,-9],[0,13]],'#e8c26a');rr(-16,-15,32,5,2.5,'#c98f4d');circ(-3,-3,3,K.red);circ(4,-1,2.6,K.red);circ(0,6,2.4,K.red);circ(-6,-8,1.2,K.green)},
 icecream(a){poly([[-8,0],[8,0],[0,19]],K.tan);ln(-5,3,2,14,1,'rgba(0,0,0,.2)');ln(5,3,-2,14,1,'rgba(0,0,0,.2)');ln(-7,1,6,8,1,'rgba(0,0,0,.18)');circ(0,-4,10,a[0]);ell(0,0,11.5,3.6,0,a[0]);circ(3,-14,3,K.red);hl(-4,-7,2.4,3.6,.5)},
 cupcake(a){poly([[-10,2],[10,2],[7,17],[-7,17]],K.brown);ln(-4,3,-3,16,1.2,'rgba(0,0,0,.25)');ln(0,3,0,16,1.2,'rgba(0,0,0,.25)');ln(4,3,3,16,1.2,'rgba(0,0,0,.25)');ell(0,1,12,4,0,a[1]);ell(0,-3,10.5,5,0,a[0]);ell(0,-8,7,4.5,0,a[1]);circ(0,-13,3,K.red)},
 carrot(a){poly([[-6.5,-9],[6.5,-9],[0.5,19]],K.orange);ln(-4,-4,0,-3,1.2,'rgba(0,0,0,.2)');ln(-2,3,3,4,1.2,'rgba(0,0,0,.2)');ln(-1,10,2,10,1.2,'rgba(0,0,0,.2)');ell(-3,-13,2.6,6,-.4,K.green);ell(0,-14.5,2.6,7,0,K.green);ell(3,-13,2.6,6,.4,K.green)},
 mushroom(a){rr(-5,2,10,14,4,K.cream);g.beginPath();g.ellipse(0,3,16,14,0,Math.PI,0);g.closePath();g.fillStyle=a[0];g.fill();circ(-7,-4,2.8,K.white);circ(3,-8,3,K.white);circ(9,-1,2.3,K.white)},
 pineapple(a){ell(0,6,9.5,12.5,0,K.gold);clipEll(0,6,9.5,12.5,0,()=>{g.strokeStyle='rgba(120,80,20,.4)';g.lineWidth=1.2;g.beginPath();for(let d=-24;d<24;d+=6){g.moveTo(-10+d,-8);g.lineTo(10+d,20);g.moveTo(10+d,-8);g.lineTo(-10+d,20)}g.stroke()});poly([[0,-5],[-7,-15],[-2,-8]],K.green);poly([[0,-5],[0,-18],[3,-7]],K.green);poly([[0,-5],[7,-15],[2,-8]],K.green)},
 lemon(a){g.save();g.rotate(-.5);ell(0,0,14,10,0,'#e2c64a');circ(-14,0,2.6,'#e2c64a');circ(14,0,2.6,'#e2c64a');hl(-5,-4,4,2,0);g.restore();ell(9,-11,6,3,-.5,K.green)},
 grapes(a){[[-8,-4],[0,-4],[8,-4],[-4,3],[4,3],[0,10]].forEach(p=>{circ(p[0],p[1],5.2,K.purple);hl(p[0]-1.5,p[1]-1.8,1.4,1.1,0)});ln(0,-9,1,-15,2,K.dbrown);ell(7,-14,6,3,-.4,K.green)},
 coffee(a){curve(-6,-8,-9,-12,-6,-16,1.6,K.grey);curve(2,-8,-1,-12,2,-16,1.6,K.grey);rr(-12,-4,20,17,5,a[0]);arcS(9,4,5.5,-1.3,1.3,3,a[0]);ell(-2,-3,10,2.4,0,K.dbrown);rr(-14,12,24,4,2,'#c9bfa6')},
 /* ---- وسایل ---- */
 key(a){g.beginPath();g.arc(-8,-7,7,0,TAU);g.lineWidth=4.4;g.strokeStyle=K.gold;g.stroke();ln(-3,-2,13,14,4.4,K.gold);ln(7,8,11,4,3.4,K.gold);ln(11,12,15,8,3.4,K.gold)},
 bell(a){g.beginPath();g.moveTo(-13,12);g.quadraticCurveTo(-12,-2,-8,-8);g.quadraticCurveTo(0,-16,8,-8);g.quadraticCurveTo(12,-2,13,12);g.closePath();g.fillStyle=K.gold;g.fill();rr(-15,11,30,4,2,K.gold);circ(0,18,3,K.dbrown);circ(0,-12.5,2,K.gold);hl(-5,-2,2,6,.2)},
 umbrella(a){ln(0,-6,0,14,1.8,K.dgrey);curve(0,14,0,19,-5,17,2,K.dgrey);g.beginPath();g.arc(0,-4,16,Math.PI,0);g.closePath();g.fillStyle=a[0];g.fill();circ(-10.6,-4,5.4,a[0]);circ(0,-4,5.4,a[0]);circ(10.6,-4,5.4,a[0]);ln(0,-19,0,-5,1.6,'rgba(255,255,255,.45)');ln(-8,-17,-7,-6,1.4,'rgba(255,255,255,.3)');ln(8,-17,7,-6,1.4,'rgba(255,255,255,.3)')},
 heart(a){g.beginPath();g.moveTo(0,16);g.bezierCurveTo(-22,2,-14,-14,0,-6);g.bezierCurveTo(14,-14,22,2,0,16);g.fillStyle=a[0];g.fill();hl(-8,-5,2.8,4.4,.6)},
 crown(a){poly([[-15,12],[-17,-8],[-8,0],[0,-12],[8,0],[17,-8],[15,12]],K.gold);rr(-15,10,30,5,2,'#c1912a');circ(-17,-9,2.4,K.gold);circ(0,-13,2.4,K.gold);circ(17,-9,2.4,K.gold);circ(0,4,2.8,a[0]);circ(-8,5,2.1,a[2]);circ(8,5,2.1,a[3])},
 gem(a){poly([[-15,-4],[-8,-12],[8,-12],[15,-4],[0,16]],a[3]);poly([[-15,-4],[15,-4],[0,16]],'rgba(0,0,0,.14)');poly([[-8,-12],[-4,-4],[-15,-4]],'rgba(255,255,255,.3)');poly([[8,-12],[4,-4],[15,-4]],'rgba(255,255,255,.16)');ln(-4,-4,0,-12,1,'rgba(255,255,255,.4)')},
 balloon(a){curve(0,12,-4,16,2,20,1.2,K.dgrey);poly([[-2.5,11],[2.5,11],[0,14]],a[0]);ell(0,-3,10.5,13,0,a[0]);hl(-4,-8,2.6,4.5,.5)},
 gift(a){rr(-13,-3,26,19,2.5,a[0]);rr(-15,-8,30,7,2.5,a[1]);rr(-2.5,-8,5,24,0,K.cream);ell(-5,-12,5,3.2,-.4,K.cream);ell(5,-12,5,3.2,.4,K.cream);circ(0,-10.5,2.2,K.cream)},
 clock(a){circ(-11,-11,4.6,a[0]);circ(11,-11,4.6,a[0]);circ(0,0,15,K.dgrey);circ(0,0,12.8,K.white);ln(0,-10,0,-8.5,1.6,K.dgrey);ln(0,10,0,8.5,1.6,K.dgrey);ln(-10,0,-8.5,0,1.6,K.dgrey);ln(10,0,8.5,0,1.6,K.dgrey);ln(0,0,0,-7.5,2,K.ink);ln(0,0,5.5,3,2,K.ink);circ(0,0,1.8,a[0])},
 bulb(a){circ(0,-5,11,K.gold);poly([[-5,4],[5,4],[4,9],[-4,9]],K.gold);rr(-5,8,10,4,1.5,K.grey);rr(-4,12,8,4,1.5,K.dgrey);circ(0,17,2,K.dgrey);hl(-4,-9,3,4.5,.5);ln(-3,5,-3,-3,1.2,'#b8841f');ln(3,5,3,-3,1.2,'#b8841f');ln(-3,-3,3,-3,1.2,'#b8841f')},
 note(a){ell(-8,12,5.8,4.2,-.4,a[0]);ell(8,9,5.8,4.2,-.4,a[0]);ln(-3.5,11,-3.5,-9,2.2,K.ink);ln(12.5,8,12.5,-12,2.2,K.ink);poly([[-3.5,-10],[12.5,-14],[12.5,-8],[-3.5,-4]],K.ink)},
 camera(a){rr(-16,-7,32,22,4,K.dgrey);rr(-8,-11,10,6,2,K.dgrey);rr(8,-5,5,3,1,a[0]);circ(0,4,8.5,K.ink);circ(0,4,6,a[3]);circ(0,4,2.8,K.ink);circ(-2,2,1.2,K.white)},
 anchor(a){arcS(0,-13,3.5,0,TAU,2.4,K.dgrey);ln(0,-9,0,15,2.8,K.dgrey);ln(-7,-4,7,-4,2.6,K.dgrey);arcS(0,5,13,.15,Math.PI-.15,3,K.dgrey);circ(-12.7,6.5,2,K.dgrey);circ(12.7,6.5,2,K.dgrey)},
 sailboat(a){ln(0,-15,0,9,1.8,K.dbrown);poly([[2,-14],[2,6],[15,6]],K.white);poly([[-2,-10],[-2,6],[-13,6]],a[0]);poly([[-16,9],[16,9],[11,16],[-11,16]],K.brown);curve(-18,19,-12,16,-6,19,1.6,K.blue);curve(-6,19,0,16,6,19,1.6,K.blue);curve(6,19,12,16,18,19,1.6,K.blue)},
 car(a){rr(-17,0,34,11,4,a[0]);poly([[-10,0],[-6,-9],[7,-9],[12,0]],a[0]);poly([[-7.5,-1],[-4.5,-7],[0,-7],[0,-1]],K.lblue);poly([[2,-1],[2,-7],[6,-7],[9,-1]],K.lblue);circ(-9,12,4.4,K.ink);circ(9,12,4.4,K.ink);circ(-9,12,1.8,K.grey);circ(9,12,1.8,K.grey);circ(16,4,1.7,K.gold)},
 bicycle(a){arcS(-10,8,7,0,TAU,2,K.ink);arcS(10,8,7,0,TAU,2,K.ink);ln(-10,8,-1,8,2,a[0]);ln(-1,8,-4,-3,2,a[0]);ln(-4,-3,6,-3,2,a[0]);ln(6,-3,10,8,2,a[0]);ln(-1,8,6,-3,2,a[0]);ln(-6,-5,-2,-5,2.4,K.ink);ln(6,-3,5,-8,2,K.ink);ln(5,-8,9,-8,2,K.ink)},
 house(a){rr(7,-13,4,8,0,K.dgrey);rr(-12,-2,24,17,1,'#e8d5ad');poly([[-16,-1],[0,-15],[16,-1]],a[0]);rr(-3.5,6,7,9,1,K.brown);rr(5,2,5,5,1,K.lblue);rr(-10,2,5,5,1,K.lblue)},
 tree(a){rr(-2.5,5,5,13,1,K.dbrown);circ(0,-5,11,K.green);circ(-8,3,8,K.green);circ(8,3,8,K.green);hl(-4,-9,4,2.6,-.4);circ(-5,0,1.9,a[0]);circ(5,-3,1.9,a[0]);circ(2,6,1.9,a[0])},
 flower(a){ln(0,3,0,18,2.4,K.green);ell(5,13,5,2.4,-.5,K.green);for(let i=0;i<6;i++){const t=i*TAU/6;ell(Math.cos(t)*8,-4+Math.sin(t)*8,5.4,3.4,t,a[0])}circ(0,-4,4.6,a[1])},
 sun(a){for(let i=0;i<8;i++){const t=i*Math.PI/4;ln(Math.cos(t)*12,Math.sin(t)*12,Math.cos(t)*18,Math.sin(t)*18,3.2,K.gold)}circ(0,0,10,K.gold);circ(-3,-3,3.6,'rgba(255,255,255,.3)')},
 moon(a,bg){circ(0,0,14,'#e8d38c');circ(-4,5,2.4,'rgba(0,0,0,.12)');circ(-8,-3,1.8,'rgba(0,0,0,.12)');circ(7,-4,12.5,bg);circ(12,10,1.6,K.gold);circ(-11,-12,1.4,K.gold)},
 cloud(a){ell(0,10,15,2.2,0,'rgba(0,0,0,.1)');circ(-8,4,7,'#b9cfe6');circ(0,-2,9.5,'#b9cfe6');circ(9,4,7.5,'#b9cfe6');rr(-15,4,30,7,3.5,'#b9cfe6');hl(-3,-6,4,2.4,-.4);ln(-5,14,-7,18,1.8,a[3]);ln(2,14,0,18,1.8,a[3]);ln(9,14,7,18,1.8,a[3])},
 lightning(a){poly([[3,-18],[-9,3],[-1,3],[-4,18],[10,-5],[2,-5]],K.gold);g.lineJoin='round';g.lineWidth=1.4;g.strokeStyle='#b98a1f';g.stroke()},
 snowflake(a){for(let i=0;i<3;i++){const t=i*Math.PI/3,c=Math.cos(t),s=Math.sin(t);ln(-c*16,-s*16,c*16,s*16,2.4,a[3]);for(const sg of [-1,1]){const bx0=c*10*sg,by0=s*10*sg;ln(bx0,by0,bx0+Math.cos(t+2.2)*4.5*sg,by0+Math.sin(t+2.2)*4.5*sg,1.8,a[3]);ln(bx0,by0,bx0+Math.cos(t-2.2)*4.5*sg,by0+Math.sin(t-2.2)*4.5*sg,1.8,a[3])}}circ(0,0,2.4,a[3])},
 rainbow(a){arcS(0,9,15,Math.PI,TAU,3.4,K.red);arcS(0,9,11.5,Math.PI,TAU,3.4,K.gold);arcS(0,9,8,Math.PI,TAU,3.4,K.teal);arcS(0,9,4.8,Math.PI,TAU,2.8,K.blue);circ(-14,11,4.4,'#b9cfe6');circ(14,11,4.4,'#b9cfe6');circ(-10,12,3.6,'#b9cfe6');circ(10,12,3.6,'#b9cfe6')},
 flame(a){g.beginPath();g.moveTo(1,-19);g.bezierCurveTo(4,-10,14,-6,12,6);g.bezierCurveTo(11,15,3,19,0,19);g.bezierCurveTo(-8,19,-14,13,-11,4);g.bezierCurveTo(-10,-1,-6,-3,-5,-8);g.bezierCurveTo(-2,-5,-2,-9,1,-19);g.fillStyle=a[0]===K.red?K.orange:a[0];g.fill();ell(0,11,6.4,7.6,0,K.gold);ell(0,13,3,4,0,'#f3e19a')},
 droplet(a){g.beginPath();g.moveTo(0,-17);g.bezierCurveTo(4,-9,11,-2,11,6);g.bezierCurveTo(11,13,6,18,0,18);g.bezierCurveTo(-6,18,-11,13,-11,6);g.bezierCurveTo(-11,-2,-4,-9,0,-17);g.fillStyle=a[3];g.fill();hl(-4,6,2.2,5,.2)},
 leaf(a){ell(0,0,15,8.4,-.7,K.green);ln(-10,10,11,-10,1.5,'rgba(0,0,0,.3)');ln(-1,1,3,2,1.2,'rgba(0,0,0,.25)');ln(2,-3,6,-2,1.2,'rgba(0,0,0,.25)');ln(-10,10,-14,14,2,K.dbrown)},
 cactus(a){rr(-4.5,-14,9,28,4.5,K.green);rr(-13,-4,9,5,2.5,K.green);rr(-13,-11,5,12,2.5,K.green);rr(4,-1,9,5,2.5,K.green);rr(8,-8,5,12,2.5,K.green);rr(-9,12,18,7,2,a[0]);circ(0,-15,2.4,K.pink)},
 mountain(a){poly([[-18,14],[-5,-10],[8,14]],'#7a8a99');poly([[-2,14],[9,-3],[19,14]],'#98a6b3');poly([[-5,-10],[-9.5,-3],[-5.5,-5.5],[-2,-3]],K.white);circ(11,-11,3.6,K.gold)},
 kite(a){curve(0,9,-6,13,0,17,1.2,K.dgrey);poly([[0,-17],[10,-3],[0,9],[-10,-3]],a[0]);poly([[0,-17],[10,-3],[0,-3]],a[1]);ln(0,-17,0,9,1,'rgba(255,255,255,.6)');ln(-10,-3,10,-3,1,'rgba(255,255,255,.6)');poly([[-3,14],[0,12],[0,16]],a[1])},
 headphones(a){arcS(0,3,12,Math.PI,TAU,3,K.ink);rr(-17,2,8,13,3.5,a[0]);rr(9,2,8,13,3.5,a[0]);ln(-13,4,-13,13,1.2,'rgba(255,255,255,.35)');ln(13,4,13,13,1.2,'rgba(255,255,255,.35)')},
 glasses(a){circ(-7.5,3,6.5,'rgba(169,195,224,.55)');circ(7.5,3,6.5,'rgba(169,195,224,.55)');arcS(-7.5,3,6.5,0,TAU,2.4,K.ink);arcS(7.5,3,6.5,0,TAU,2.4,K.ink);curve(-1,2,0,-1,1,2,2,K.ink);ln(-14,2,-18,-3,2,K.ink);ln(14,2,18,-3,2,K.ink)},
 trophy(a){arcS(-10,-6,5,Math.PI*.5,Math.PI*1.5,2.4,K.gold);arcS(10,-6,5,-Math.PI*.5,Math.PI*.5,2.4,K.gold);poly([[-10,-12],[10,-12],[8,0],[3,6],[-3,6],[-8,0]],K.gold);rr(-2,6,4,6,1,K.gold);rr(-8,12,16,5,2,K.dbrown);circ(0,-5,2.6,K.white);hl(-5,-6,1.6,4,.1)}
};
SYMBOLS.push(...Object.keys(ICONS));
function drawIcon(e,x,y,s,bg){const p=String(e).split(':'),f=ICONS[p[0]];if(!f)return;const v=(+p[1]||0)%5;g.save();g.translate(x,y);g.scale(s/20,s/20);g.lineJoin='round';f(ACC[v],bg||TINT[v]);g.restore()}
function cardBack(w,h,rad){
 g.save();rp(-w/2+3,-h/2+3,w-6,h-6,Math.max(2,rad-2));g.clip();
 g.strokeStyle='rgba(181,173,152,.13)';g.lineWidth=1;g.beginPath();
 for(let d=-w-h;d<w+h;d+=9){g.moveTo(-w/2+d,-h/2);g.lineTo(-w/2+d+h,h/2);g.moveTo(-w/2+d,h/2);g.lineTo(-w/2+d+h,-h/2)}
 g.stroke();g.restore();
 const r=Math.min(w,h)*.2,q=r,t2=r*.28;
 g.beginPath();g.arc(0,0,r*1.45,0,TAU);g.lineWidth=1.3;g.strokeStyle='rgba(181,173,152,.5)';g.stroke();
 poly([[0,-q],[t2,-t2],[q,0],[t2,t2],[0,q],[-t2,t2],[-q,0],[-t2,-t2]],'#b9b09a');
}
function miniCard(x,y,rot,w,h,up,name,v,ok){
 g.save();g.translate(x,y);g.rotate(rot);
 rp(-w/2,-h/2+2.5,w,h,w*.14);g.fillStyle='rgba(0,0,0,.3)';g.fill();
 const bg=up?TINT[v]:'#2f4252';
 bx(-w/2,-h/2,w,h,w*.14,bg,up?'#a79e89':'#546a7c',1.2);
 if(up){drawIcon(name+':'+v,0,0,w*.36,bg)}else cardBack(w,h,w*.14);
 if(ok){circ(w/2-3,-h/2+3,Math.max(5,w*.17),'#6f8f70');g.beginPath();const k=Math.max(5,w*.17)/8.5;g.moveTo(w/2-3-4*k,-h/2+3);g.lineTo(w/2-3-1*k,-h/2+3+3.5*k);g.lineTo(w/2-3+4.5*k,-h/2+3-3.5*k);g.lineWidth=2*k;g.lineCap='round';g.lineJoin='round';g.strokeStyle='#f3ecd8';g.stroke();g.lineCap='butt'}
 g.restore();
}
/* ---------- پس‌زمینه: میز نمدی بازی ---------- */
let bgC=null,bgV=0;
function makeBg(vh){
 const s=2,c=document.createElement('canvas');c.width=W*s;c.height=Math.ceil(vh*s);
 const x=c.getContext('2d');x.scale(s,s);
 const gr=x.createLinearGradient(0,0,0,vh);gr.addColorStop(0,'#21403a');gr.addColorStop(1,'#12292a');x.fillStyle=gr;x.fillRect(0,0,W,vh);
 let seed=987654;const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
 for(let n=0;n<2200;n++){x.fillStyle=rnd()<.5?'rgba(255,255,255,.035)':'rgba(0,0,0,.07)';x.fillRect(rnd()*W,rnd()*vh,1.2,1.2)}
 x.strokeStyle='rgba(235,222,190,.07)';x.lineWidth=1;
 for(let d=-vh;d<W+vh;d+=26){x.beginPath();x.moveTo(d,0);x.lineTo(d+vh,vh);x.stroke()}
 x.strokeStyle='rgba(222,196,130,.22)';x.lineWidth=2;x.beginPath();
 if(x.roundRect)x.roundRect(10,10,W-20,vh-20,26);else x.rect(10,10,W-20,vh-20);x.stroke();
 x.strokeStyle='rgba(222,196,130,.1)';x.lineWidth=1;x.beginPath();if(x.roundRect)x.roundRect(16,16,W-32,vh-32,22);else x.rect(16,16,W-32,vh-32);x.stroke();
 const sil=[[W*.12,vh*.93,-.4],[W*.9,vh*.9,.35],[W*.88,vh*.15,-.3],[W*.08,vh*.2,.5]];
 for(const q of sil){x.save();x.translate(q[0],q[1]);x.rotate(q[2]);x.strokeStyle='rgba(255,255,255,.07)';x.lineWidth=1.6;x.beginPath();if(x.roundRect)x.roundRect(-18,-26,36,52,6);else x.rect(-18,-26,36,52);x.stroke();x.restore()}
 const v=x.createRadialGradient(W/2,vh/2,vh*.25,W/2,vh/2,vh*.75);v.addColorStop(0,'rgba(0,0,0,0)');v.addColorStop(1,'rgba(0,0,0,.45)');x.fillStyle=v;x.fillRect(0,0,W,vh);
 return c;
}
function drawBackground(){
 const vh=viewH();
 if(!bgC||Math.abs(bgV-vh)>1){bgC=makeBg(vh);bgV=vh}
 g.drawImage(bgC,0,0,W,vh);
}
const MODE_FAN=[['apple','cat','key'],['fish','bell','crown'],['flame','gem','trophy']];
function drawModeCard(m,i){
 const b=modeRect(i);
 rp(b.x,b.y+3,b.w,b.h,14);g.fillStyle='rgba(0,0,0,.28)';g.fill();
 const gr=g.createLinearGradient(0,b.y,0,b.y+b.h);gr.addColorStop(0,'#3b5062');gr.addColorStop(1,'#2a3a48');
 bx(b.x,b.y,b.w,b.h,14,gr,'rgba(222,196,130,.34)',1.3);
 rp(b.x+5,b.y+5,b.w-10,b.h-10,10);g.lineWidth=1;g.strokeStyle='rgba(222,211,185,.08)';g.stroke();
 rp(b.x+b.w-8,b.y+14,4,b.h-28,2);g.fillStyle=m.tone;g.fill();
 const cx=b.x+152,cy=b.y+b.h/2+1,f=MODE_FAN[i];
 miniCard(cx-24,cy+2,-.26,28,40,true,f[0],i,false);
 miniCard(cx+24,cy+2,.26,28,40,true,f[2],(i+2)%5,false);
 miniCard(cx,cy-1,0,28,40,true,f[1],(i+1)%5,false);
 txt(m.name,b.x+b.w-22,b.y+31,22,'#f0e7d3','900','right');
 txt(m.desc,b.x+b.w-22,b.y+57,12,'#c5cbd0','500','right');
 txt(m.tag,b.x+20,b.y+31,14,m.tone,'800','left');
 txt(FA(m.points)+' امتیاز / جفت',b.x+20,b.y+57,11,'#e5dbc6','600','left');
}
function drawCard(c,i){
 const p=pos(i),face=c.f>.5||c.ok,scale=Math.max(.12,Math.abs(1-2*c.f)),pop=c.pop>0?1+Math.sin(c.pop/.28*Math.PI)*.025:1;
 g.save();g.translate(p.x+p.w/2,p.y+p.h/2);g.scale(scale,pop);
 const w=p.w-2,h=p.h-2,v=(+String(c.e).split(':')[1]||0)%5;
 rp(-w/2,-h/2+3,w,h,10);g.fillStyle='rgba(0,0,0,.3)';g.fill();
 const bgc=face?(c.ok?rgbs(lerp3(hex(TINT[v]),[150,185,140],.38)):TINT[v]):'#2f4252';
 bx(-w/2,-h/2,w,h,10,bgc,face?(c.ok?'#6f8f70':'#a79e89'):'#546a7c',1.2);
 rp(-w/2+5,-h/2+5,w-10,h-10,7);g.lineWidth=1;g.strokeStyle=face?(c.ok?'rgba(70,95,72,.35)':'rgba(120,108,84,.35)'):'rgba(181,173,152,.22)';g.stroke();
 if(face){
  drawIcon(c.e,0,-1,mode.id==='hard'?16:mode.id==='easy'?25:22,bgc);
  if(c.ok){
   circ(w/2-14,-h/2+14,8.5,'#6f8f70');
   g.beginPath();g.moveTo(w/2-18,-h/2+14);g.lineTo(w/2-15,-h/2+17.5);g.lineTo(w/2-9.5,-h/2+10.5);g.lineWidth=2.2;g.lineCap='round';g.lineJoin='round';g.strokeStyle='#f3ecd8';g.stroke();g.lineCap='butt';
  }
 }else cardBack(w,h,10);
 g.restore();
}
function drawPlayHUD(){
 txt('کارت بازی',W/2,25,19,'#efe5d0','900');
 bx(14,44,112,24,12,'#1d3530','rgba(222,196,130,.3)',1);txt('زمان '+FA(Math.floor(elapsed))+' ث',70,61,13,'#e8dfca','800');
 bx(W-126,44,112,24,12,'#1d3530','rgba(222,196,130,.3)',1);txt('امتیاز '+FA(score),W-70,61,13,'#e8dfca','800');
 txt('جفت '+FA(matched)+' از '+FA(mode.pairs)+'   ·   '+mode.name,W/2,86,13,mode.tone,'700');
 bx(72,96,W-144,5,3,'#14262a',null);
 const fw=(W-144)*(matched/mode.pairs);
 if(fw>0){bx(72,96,fw,5,3,mode.tone,null);circ(72+fw,98.5,4.5,mode.tone)}
}
function drawReady(vh){
 const ty=vh*.11;
 txt('کارت بازی',W/2,ty,40,'#f1e7d0','900');
 miniCard(W/2-138,ty-10,-.3,34,48,true,'apple',0,false);miniCard(W/2-112,ty-8,.12,34,48,false,'',0,false);
 miniCard(W/2+112,ty-8,-.12,34,48,false,'',0,false);miniCard(W/2+138,ty-10,.3,34,48,true,'cat',3,true);
 txt('جفت‌های یکسان را پیدا کن',W/2,vh*.17,15,'#cfd8d4','500');
 txt('درجهٔ سختی را انتخاب کن',W/2,vh*.235,17,'#ead8a8','800');
 MODES.forEach(drawModeCard);
 const below=modeRect(2).y+82;
 txt('اشتباه امتیازت را کم نمی‌کند',W/2,below+37,14,'#e4bba5','700');
 txt('حل سریع‌تر = پاداش بیشتر',W/2,below+64,14,'#e0d7bf','700');
 txt('رکورد فعلی: '+FA(Store.best(id)),W/2,below+100,15,'#dcc99d','700');
 txt('هر دست، آیکون‌ها و رنگ‌ها عوض می‌شن',W/2,below+127,11,'#a7b6b0','500');
}
function drawOver(vh){
 const off=Math.max(0,(vh-H)/2);g.save();g.translate(0,off);
 g.fillStyle='rgba(6,16,14,.84)';g.fillRect(0,0,W,H);
 rp(24,123,W-48,389,18);g.fillStyle='rgba(0,0,0,.3)';g.fill();
 bx(24,119,W-48,389,18,'#243b3c','#8a7a55',1.4);
 rp(32,127,W-64,373,13);g.lineWidth=1;g.strokeStyle='rgba(222,196,130,.18)';g.stroke();
 txt('آفرین! جفت‌ها کامل شد',W/2,164,25,'#f0e5c9','900');
 miniCard(W/2-146,150,-.25,22,31,true,'crown',0,false);miniCard(W/2+146,150,.25,22,31,true,'trophy',0,false);
 txt('زمان حل: '+FA(elapsed.toFixed(1))+' ثانیه',W/2,204,15,'#d7d8d0','700');
 txt('امتیاز کارت‌ها: '+FA(score),W/2,241,16,'#e8dfce','700');
 txt('پاداش سرعت: +'+FA(bonus),W/2,273,16,'#d8c193','800');
 bx(86,288,W-172,44,12,'#182c2b','rgba(222,196,130,.34)',1.2);
 txt('امتیاز نهایی: '+FA(finalScore),W/2,319,27,'#f5e4b7','900');
 if(newBest){txt('رکورد جدید!',W/2-10,356,17,'#d2dfc8','800');drawIcon('trophy:0',W/2+62,349,9,'#243b3c')}
 else txt('رکورد: '+FA(Store.best(id)),W/2,356,14,'#c3cbd0','600');
 const b1={x:38,y:390,w:190,h:53},b2={x:252,y:390,w:190,h:53};
 rp(b1.x,b1.y+3,b1.w,b1.h,12);g.fillStyle='rgba(0,0,0,.28)';g.fill();
 bx(b1.x,b1.y,b1.w,b1.h,12,'#c9d3c0','#e8e6d6',1);txt('دوباره بازی کن',b1.x+b1.w/2,b1.y+32,14,'#1d2d2c','900');
 rp(b2.x,b2.y+3,b2.w,b2.h,12);g.fillStyle='rgba(0,0,0,.28)';g.fill();
 bx(b2.x,b2.y,b2.w,b2.h,12,'#4d6a69','#92a39c',1);txt('تغییر سختی',b2.x+b2.w/2,b2.y+32,14,'#f1e7d3','900');
 txt('اشتباه‌ها: '+FA(miss)+'  ·  بدون کسر امتیاز',W/2,472,12,'#d7c5b1','600');
 g.restore();
}
function draw(){
 const sy=viewScaleY();g.save();
 try{
  if(sy!==1)g.scale(1,sy);
  g.textBaseline='alphabetic';
  drawBackground();const vh=viewH();
  if(st==='ready'){drawReady(vh);return}
  drawPlayHUD();cards.forEach(drawCard);
  for(const f of floats){g.globalAlpha=clamp(f.life*1.7,0,1);txt(f.txt,f.x,f.y,15,f.color,'800')}
  g.globalAlpha=1;
  if(st==='over')drawOver(vh);
 }finally{g.restore()}
}
/* تصویر کارت بازی برای منوی اصلی (یک‌بار ساخته می‌شه) */
let artUrl=null;
function art(){
 if(artUrl)return artUrl;
 const c=document.createElement('canvas');c.width=300;c.height=188;
 const prev=g;g=c.getContext('2d');
 try{
  g.scale(2,2);
  ell(75,88,56,5,0,'rgba(0,0,0,.28)');
  miniCard(38,54,-.3,44,62,true,'cat',0,false);
  miniCard(112,54,.3,44,62,true,'cat',0,true);
  miniCard(75,50,0,44,62,false,'',0,false);
  circ(75,50,0.01,'#fff');
 }finally{g=prev}
 artUrl=c.toDataURL('image/png');return artUrl;
}
function down(e){if(Date.now()<lock)return;const sy=viewScaleY(),x=e&&e.clientX!==undefined?px(e):W/2,y=e&&e.clientY!==undefined?py(e)/sy:viewH()/2;if(st==='ready'){hitMode(x,y);return}if(st==='over'){const localY=y-Math.max(0,(viewH()-H)/2);if(localY>=390&&localY<=450&&x>=252){st='ready';reset();Shell.hud(0);Shell.info('انتخاب درجه سختی');sfx.ui();return}if(localY>=390&&localY<=450&&x<252){start(mode);return}start(mode);return}pick(x,y)}
function key(e){const raw=typeof e==='string'?e:(e&&e.key)||'';const n=raw==='Digit1'||raw==='Numpad1'||raw==='1'?1:raw==='Digit2'||raw==='Numpad2'||raw==='2'?2:raw==='Digit3'||raw==='Numpad3'||raw==='3'?3:0;if(st==='ready'&&n){start(MODES[n-1]);return true}if(st==='over'&&(raw==='Space'||raw===' '||raw==='Enter')){start(mode);return true}if(st==='play'&&(raw==='Space'||raw===' ')){sfx.ui();return true}return false}
function enter(){reset();st='ready';mode=MODES[1];sync()}
return{id,art,enter,update,draw,down,up(){},key,playing:()=>st==='play',idle:()=>st==='ready'||st==='over'};
})();
/* ================= COLOR MEMORY (حافظه رنگی) — بازنویسی کامل ================= */
Games.colorseq=(()=>{
const id='colorseq';
const CX=240,CY=338,R_OUT=186,R_IN=70,R_WELL=198,R_BEZEL=212,TAU=Math.PI*2;
const A0=[Math.PI,Math.PI*1.5,Math.PI*.5,0]; /* بالا‌چپ، بالا‌راست، پایین‌چپ، پایین‌راست */
const CREAM=[246,236,214],DARK=[26,20,16];
const PAL=[
  {name:'قرمز',c:'#c4563f',hi:'#f0a58f',shape:'circle'},
  {name:'زرد',c:'#d9a638',hi:'#f6d58a',shape:'tri'},
  {name:'سبز',c:'#4b9870',hi:'#9bd2b3',shape:'square'},
  {name:'آبی',c:'#4a77b4',hi:'#9bbbe6',shape:'diamond'}
].map(p=>({...p,C:hex(p.c)}));
/* هر رنگ یک ریتم و صدای مخصوص خودش داره */
const RH=[
  /* قرمز: «دُم» — یک ضربه‌ی بم و کشیده (طبل) */
  {notes:[{t:0,f:170,d:.34,w:'sine',v:.28,s:-110},{t:0,f:90,d:.26,w:'triangle',v:.14,s:-30}],mark:[{t:0,l:0}]},
  /* زرد: «تَ‌تَ» — دو ضربه‌ی تند و بلند */
  {notes:[{t:0,f:466,d:.11,w:'triangle',v:.15,s:0},{t:.17,f:466,d:.11,w:'triangle',v:.15,s:0}],mark:[{t:0,l:0},{t:.17,l:0}]},
  /* سبز: «تَ‌تَ‌تَ» — سه ضربه‌ی صعودی */
  {notes:[{t:0,f:349,d:.09,w:'square',v:.06,s:0},{t:.12,f:440,d:.09,w:'square',v:.06,s:0},{t:.24,f:523,d:.13,w:'square',v:.06,s:0}],mark:[{t:0,l:0},{t:.12,l:0},{t:.24,l:0}]},
  /* آبی: «تـــی» — یک زنگ کشیده و بعدش یک ضربه‌ی کوتاه */
  {notes:[{t:0,f:659,d:.30,w:'sine',v:.15,s:0},{t:0,f:1318,d:.18,w:'sine',v:.035,s:0},{t:.34,f:988,d:.11,w:'sine',v:.14,s:0}],mark:[{t:0,l:1},{t:.34,l:0}]}
];
RH.forEach(r=>{r.end=Math.max(...r.notes.map(n=>n.t+n.d))});
const KM={Digit1:0,Digit2:1,Digit3:2,Digit4:3,Numpad1:0,Numpad2:1,Numpad3:2,Numpad4:3,KeyQ:0,KeyW:1,KeyA:2,KeyS:3};
const MSG={ready:'روی هر رنگ بزن تا صداش رو بشنوی',show:'خوب گوش کن و نگاه کن',input:'همون ترتیب رو بزن',next:'درسته! مرحله‌ی بعد...',fail:'اشتباه شد؛ ببین درستش کدوم بود',over:''};

let st='ready',seq=[],idx=0,fired=0,clock=0,t=0,score=0,wrong=-1,right=-1,newBest=false,lockT=0;
let L=.6,gapT=.26,chimed=false,buzzed=false,taught=false,lastLit=-1,dimAll=0,rings=[],bg=null;
const lit=[0,0,0,0],age=[9,9,9,9],scl=[1,1,1,1],kk=[0,0,0,0];
const LEAD=.75;

const lerp3=(A,B,q)=>A.map((v,j)=>v+(B[j]-v)*q);
const rgb=a=>'rgb('+a.map(v=>Math.round(v)).join(',')+')';
const sector=(i,ri,ro,g)=>{
  const a0=A0[i],a1=a0+Math.PI/2;
  ctx.beginPath();
  ctx.arc(CX,CY,ro,a0+g/ro,a1-g/ro);
  ctx.arc(CX,CY,ri,a1-g/ri,a0+g/ri,true);
  ctx.closePath();
};
function sync(){
  Shell.hud(score);
  Shell.info(st==='ready'||st==='over'||!seq.length?'':'مرحله '+FA(seq.length)+' · '+FA(Math.min(idx,seq.length))+'/'+FA(seq.length));
}
function reset(){
  st='ready';seq=[];idx=0;fired=0;clock=0;t=0;score=0;wrong=-1;right=-1;newBest=false;lockT=0;
  chimed=buzzed=taught=false;lastLit=-1;dimAll=0;rings=[];
  for(let i=0;i<4;i++){lit[i]=0;age[i]=9;scl[i]=1;kk[i]=0}
  sync();
}
function start(){
  if(lockT>0)return;
  try{resultFX.clear()}catch(e){}
  reset();
  Shell.begin();Shell.score(0);
  addStep();
  sfx.seqStart();
}
function addStep(){
  let n=(Math.random()*4)|0;
  const m=seq.length;
  if(m>=2&&seq[m-1]===seq[m-2]&&n===seq[m-1])n=(n+1+((Math.random()*3)|0))%4; /* بیشتر از دو تکرار پشت‌سرهم نمیاد */
  seq.push(n);
  const len=seq.length;
  L=Math.max(.38,.62-(len-1)*.014);
  gapT=Math.max(.15,.27-len*.006);
  st='show';idx=0;fired=0;clock=0;chimed=false;
  sync();
}
function trigger(i,fromShow){
  const sc=fromShow?Math.min(1,Math.max(.7,L/.5)):1;
  const r=RH[i];
  for(const n of r.notes)tone(n.f,n.d*sc,n.w,n.v,n.s,n.t*sc);
  lit[i]=Math.max(fromShow?L:.42,r.end*sc+.1);
  age[i]=0;scl[i]=sc;lastLit=i;
  if(!reduce)rings.push({i,a:0});
}
function press(i){
  if(st!=='input')return;
  trigger(i,false);
  if(i!==seq[idx]){
    st='fail';wrong=i;right=seq[idx];clock=0;buzzed=false;taught=false;
    sync();return;
  }
  idx++;
  if(idx>=seq.length){
    score+=seq.length*100;
    Shell.score(score);
    st='next';clock=0;chimed=false;
  }
  sync();
}
function endGame(){
  st='over';lockT=.6;
  newBest=Shell.finish(score,'lose');
  sync();
}
function padAt(x,y){
  const dx=x-CX,dy=y-CY,r=Math.hypot(dx,dy);
  if(r<R_IN-4||r>R_OUT+10)return -1;
  return dy<0?(dx<0?0:1):(dx<0?2:3);
}
function down(e){
  if(lockT>0)return;
  const pointer=!!(e&&e.clientX!==undefined);
  if(st==='over'){start();return}
  if(st==='ready'){
    if(pointer){
      const p=padAt(px(e),py(e));
      if(p>=0){trigger(p,false);return}
    }
    start();return;
  }
  if(!pointer)return;
  const p=padAt(px(e),py(e));
  if(p>=0)press(p);
}
function key(code){
  if(!Object.prototype.hasOwnProperty.call(KM,code))return false;
  const i=KM[code];
  if(st==='ready')trigger(i,false);
  else if(st==='input')press(i);
  else if(st==='over'&&lockT<=0)start();
  return true;
}
function update(dt){
  t+=dt;clock+=dt;if(lockT>0)lockT-=dt;
  let mx=0;
  for(let i=0;i<4;i++){
    if(lit[i]>0)lit[i]-=dt;
    age[i]+=dt;
    kk[i]+=((lit[i]>0?1:0)-kk[i])*Math.min(1,dt*16);
    if(kk[i]<.004&&lit[i]<=0)kk[i]=0;
    if(kk[i]>mx)mx=kk[i];
  }
  dimAll=mx;
  for(const r of rings)r.a+=dt;
  rings=rings.filter(r=>r.a<.45);
  if(st==='show'){
    const P=L+gapT,n=seq.length;
    while(fired<n&&clock>=LEAD+fired*P){trigger(seq[fired],true);fired++;sync()}
    if(fired>=n&&clock>=LEAD+(n-1)*P+L+.3){st='input';idx=0;clock=0;sfx.ui();sync()}
  }else if(st==='next'){
    if(!chimed&&clock>.32){chimed=true;sfx.seqGood()}
    if(clock>1.0)addStep();
  }else if(st==='fail'){
    if(!buzzed&&clock>.3){buzzed=true;sfx.seqBad()}
    if(!taught&&clock>1.0){taught=true;trigger(right,false)}
    if(clock>2.1)endGame();
  }
}

/* ---------- گرافیک ---------- */
function makeBg(){
  const s=2,c=document.createElement('canvas');c.width=W*s;c.height=H*s;
  const x=c.getContext('2d');x.scale(s,s);
  const g=x.createLinearGradient(0,0,0,H);g.addColorStop(0,'#27372f');g.addColorStop(1,'#18211c');
  x.fillStyle=g;x.fillRect(0,0,W,H);
  for(let n=0;n<1600;n++){x.fillStyle=Math.random()<.5?'rgba(255,255,255,.035)':'rgba(0,0,0,.06)';x.fillRect(Math.random()*W,Math.random()*H,1.2,1.2)}
  x.strokeStyle='rgba(240,228,200,.055)';x.lineWidth=2;
  for(const r of [248,288,328]){x.beginPath();x.arc(CX,CY,r,0,TAU);x.stroke()}
  const v=x.createRadialGradient(W/2,H/2,190,W/2,H/2,470);v.addColorStop(0,'rgba(0,0,0,0)');v.addColorStop(1,'rgba(0,0,0,.5)');
  x.fillStyle=v;x.fillRect(0,0,W,H);
  return c;
}
function shape(kind,x,y,s){
  ctx.beginPath();
  if(kind==='circle')ctx.arc(x,y,s,0,TAU);
  else if(kind==='tri'){ctx.moveTo(x,y-s*1.1);ctx.lineTo(x+s*1.1,y+s*.85);ctx.lineTo(x-s*1.1,y+s*.85);ctx.closePath()}
  else if(kind==='square')rr(x-s*.88,y-s*.88,s*1.76,s*1.76,5);
  else{ctx.moveTo(x,y-s*1.2);ctx.lineTo(x+s*1.2,y);ctx.lineTo(x,y+s*1.2);ctx.lineTo(x-s*1.2,y);ctx.closePath()}
  ctx.fill();
  if(kind==='tri'||kind==='diamond'){ctx.lineJoin='round';ctx.lineWidth=4;ctx.strokeStyle=ctx.fillStyle;ctx.stroke()}
}
function drawMarks(i,x,y){
  const m=RH[i].mark,n=m.length,gap=9,ws=m.map(q=>q.l?28:10);
  const total=ws.reduce((a,b)=>a+b,0)+gap*(n-1);
  let cx=x-total/2;
  for(let j=0;j<n;j++){
    const since=age[i]-m[j].t*scl[i];
    const hit=lit[i]>0&&since>=0&&since<.2,past=lit[i]>0&&since>=.2;
    ctx.fillStyle=hit?'#fff7e2':past?'rgba(246,236,214,.72)':'rgba(246,236,214,.36)';
    rr(cx,y-5,ws[j],10,5);ctx.fill();
    cx+=ws[j]+gap;
  }
}
function drawPad(i){
  const p=PAL[i],on=kk[i],others=dimAll*(1-on);
  let ox=0;
  if(st==='fail'&&i===wrong&&!reduce&&clock<.5)ox=Math.sin(clock*60)*(1-clock/.5)*6;
  ctx.save();ctx.translate(ox,0);
  const body=rgb(lerp3(lerp3(p.C,DARK,.52+others*.22),p.C,on));
  const ro=R_OUT+on*5;
  sector(i,R_IN,ro,6);ctx.fillStyle=body;ctx.fill();
  ctx.lineJoin='round';ctx.lineWidth=6;ctx.strokeStyle=body;ctx.stroke();
  sector(i,R_IN+14,ro-14,13);ctx.fillStyle='rgba(255,244,220,'+(.05+on*.13)+')';ctx.fill();
  sector(i,R_IN,ro,6);ctx.lineWidth=2;ctx.strokeStyle='rgba(0,0,0,.28)';ctx.stroke();
  if(on>.02){sector(i,R_IN,ro,6);ctx.lineWidth=3+on*3;ctx.strokeStyle='rgba(246,236,214,'+(.3+.7*on)+')';ctx.stroke()}
  if(st==='fail'&&i===right&&clock>.3){
    sector(i,R_IN,ro,6);ctx.setLineDash([10,8]);ctx.lineWidth=3;ctx.strokeStyle='rgba(246,236,214,'+(.55+.35*Math.sin(t*9))+')';ctx.stroke();ctx.setLineDash([]);
  }
  const sx=i%2?1:-1,sy=i<2?-1:1,ix=CX+sx*88,iy=CY+sy*88;
  ctx.fillStyle='rgba(246,236,214,'+(.5+.5*on)+')';
  shape(p.shape,ix,iy,19*(1+.18*on));
  drawMarks(i,ix,iy+sy*42);
  if(st==='fail'&&i===wrong){
    ctx.strokeStyle='#f6ecd6';ctx.lineWidth=7;ctx.lineCap='round';
    ctx.beginPath();ctx.moveTo(ix-17,iy-17);ctx.lineTo(ix+17,iy+17);ctx.moveTo(ix+17,iy-17);ctx.lineTo(ix-17,iy+17);ctx.stroke();ctx.lineCap='butt';
  }
  ctx.restore();
}
function drawHub(){
  const ready=st==='ready',pulse=.5+.5*Math.sin(t*3.2);
  ctx.save();
  ctx.beginPath();ctx.arc(CX,CY,R_IN-6,0,TAU);
  ctx.fillStyle=ready?'#eadfc4':'#251b15';ctx.fill();
  ctx.lineWidth=5;ctx.strokeStyle='#5a4231';ctx.stroke();
  if(ready){ctx.beginPath();ctx.arc(CX,CY,R_IN+1,0,TAU);ctx.lineWidth=3;ctx.strokeStyle='rgba(234,223,196,'+(.25+.35*pulse)+')';ctx.stroke()}
  ctx.restore();
  let big='',bigC='#f2e8d0',sub='',size=20;
  const li=lastLit>=0&&kk[lastLit]>.3?lastLit:-1;
  if(li>=0){big=PAL[li].name;bigC=PAL[li].hi;size=24}
  else if(ready){big='شروع';bigC='#2a1f19';size=26}
  else if(st==='show'){big='گوش کن';sub='مرحله '+FA(seq.length)}
  else if(st==='input'){big='نوبت تو';sub=FA(idx)+' از '+FA(seq.length)}
  else if(st==='next'){big='آفرین';bigC='#a9d9b8';size=22}
  else{big='اشتباه';bigC='#e8957c';size=22}
  ctx.textBaseline='middle';
  txt(big,CX,CY-(sub?7:0),size,bigC,'900');
  if(sub)txt(sub,CX,CY+19,12,'#b9ad94','500');
  ctx.textBaseline='alphabetic';
}
function drawDots(){
  const n=seq.length;if(!n)return;
  const step=Math.min(22,360/n),r=Math.min(6,step*.32),x0=W/2-(n-1)*step/2,y=582;
  for(let j=0;j<n;j++){
    const done=st==='show'?j<fired:(st==='next'||st==='over'?j<(st==='over'?Math.max(0,n-1):n):j<idx);
    ctx.beginPath();ctx.arc(x0+j*step,y,r,0,TAU);
    if(done){ctx.fillStyle='#e8dcc0';ctx.fill()}
    else{ctx.lineWidth=2;ctx.strokeStyle='rgba(232,220,192,.4)';ctx.stroke()}
  }
}
function draw(){
  if(!bg)bg=makeBg();
  ctx.drawImage(bg,0,0,W,H);
  txt('حافظه رنگی',W/2,46,28,'#f2e8d0','900');
  txt(MSG[st],W/2,78,14,'#b9ad94','500');
  /* تخته‌ی بازی */
  ctx.fillStyle='rgba(0,0,0,.3)';ctx.beginPath();ctx.ellipse(CX,CY+14,R_BEZEL+4,R_BEZEL,0,0,TAU);ctx.fill();
  const bz=ctx.createLinearGradient(CX-R_BEZEL,CY-R_BEZEL,CX+R_BEZEL,CY+R_BEZEL);bz.addColorStop(0,'#5a4030');bz.addColorStop(1,'#2a1d15');
  ctx.fillStyle=bz;ctx.beginPath();ctx.arc(CX,CY,R_BEZEL,0,TAU);ctx.fill();
  ctx.lineWidth=2;ctx.strokeStyle='rgba(255,230,190,.16)';ctx.beginPath();ctx.arc(CX,CY,R_BEZEL-2,0,TAU);ctx.stroke();
  ctx.fillStyle='#120d0a';ctx.beginPath();ctx.arc(CX,CY,R_WELL,0,TAU);ctx.fill();
  ctx.fillStyle='#8b6f47';
  for(let j=0;j<8;j++){const a=j*TAU/8+TAU/16;ctx.beginPath();ctx.arc(CX+Math.cos(a)*(R_WELL+7),CY+Math.sin(a)*(R_WELL+7),3,0,TAU);ctx.fill()}
  for(let i=0;i<4;i++)drawPad(i);
  for(const r of rings){
    const a0=A0[r.i],rad=R_OUT+10+r.a*70;
    ctx.beginPath();ctx.arc(CX,CY,rad,a0+.1,a0+Math.PI/2-.1);
    ctx.lineWidth=4;ctx.lineCap='round';ctx.strokeStyle='rgba(246,236,214,'+Math.max(0,(1-r.a/.45)*.55)+')';ctx.stroke();ctx.lineCap='butt';
  }
  drawHub();
  drawDots();
  if(st==='ready')txt('رکورد: '+FA(Store.best(id)),W/2,618,15,'#e3c07a','700');
  else txt('امتیاز: '+FA(score),W/2,618,15,'#e3c07a','700');
  if(st==='over'){
    ctx.fillStyle='rgba(20,14,10,.4)';ctx.fillRect(0,0,W,H);
    ctx.fillStyle='rgba(29,22,17,.96)';rr(70,230,340,222,22);ctx.fill();
    ctx.lineWidth=3;ctx.strokeStyle='#6b5039';ctx.stroke();
    txt('اشتباه شد',W/2,282,32,'#e8957c','900');
    txt('مرحله‌های کامل: '+FA(Math.max(0,seq.length-1)),W/2,322,17,'#d8ccb0','500');
    txt('امتیاز: '+FA(score),W/2,368,28,'#f6ecd6','900');
    if(newBest)txt('رکورد جدید!',W/2,402,18,'#a9d9b8','800');
    else txt('رکورد: '+FA(Store.best(id)),W/2,402,17,'#e3c07a','700');
    ctx.globalAlpha=.6+.4*(.5+.5*Math.sin(t*4));
    txt('برای بازی دوباره بزن',W/2,434,15,'#f2e8d0','700');ctx.globalAlpha=1;
  }
}
function enter(){reset()}
return{id,enter,update,draw,down,up(){},move(){},key,playing:()=>st!=='ready'&&st!=='over',idle:()=>st==='ready'||st==='over'};
})();

/* ================= FLAPPY BIRD (فلپی‌برد) ================= */
Games.flappy=(()=>{
const id='flappy';
const bird={x:112,y:H*.45,vy:0,r:12};
const pipes=[];
let st='ready',score=0,best=0,spawnT=0,t=0,newBest=false,lock=0;
const G=920,FLAP=-330,PIPE_W=54,GAP=170,SPEED=150,GROUND=H-42;
function reset(){
  bird.x=112;bird.y=H*.45;bird.vy=0;score=0;spawnT=.45;pipes.length=0;t=0;
  sync();
}
function sync(){Shell.score(score);Shell.info('لوله '+FA(score))}
function enter(){st='ready';newBest=false;reset()}
function start(){reset();Shell.begin();st='play';sfx.launch()}
function flap(){
  if(st==='ready'||st==='over'){start();bird.vy=FLAP;sfx.jump();return}
  if(st==='play'){bird.vy=FLAP;sfx.jump()}
}
function down(){if(Date.now()<lock)return;flap()}
function key(k){if(k==='ArrowUp'||k==='Space'||k==='KeyW'){flap();return true}return false}
function addPipe(){
  const min=120,max=GROUND-120;
  const gapY=min+Math.random()*(max-min);
  pipes.push({x:W+20,gapY,passed:false});
}
function die(){
  if(st!=='play')return;
  st='over';newBest=Shell.finish(score,'lose');lock=Date.now()+700;sfx.over();
}
function hitPipe(p){
  const inX=bird.x+bird.r>p.x&&bird.x-bird.r<p.x+PIPE_W;
  const topH=p.gapY-GAP/2,botY=p.gapY+GAP/2;
  return inX&&(bird.y-bird.r<topH||bird.y+bird.r>botY);
}
function update(dt){
  t+=dt;if(st!=='play')return;
  bird.vy+=G*dt;bird.y+=bird.vy*dt;
  spawnT-=dt;
  if(spawnT<=0){addPipe();spawnT=1.65}
  for(const p of pipes){
    p.x-=SPEED*dt;
    if(!p.passed&&p.x+PIPE_W<bird.x){p.passed=true;score++;sfx.point();sync()}
    if(hitPipe(p)){die();return}
  }
  while(pipes.length&&pipes[0].x+PIPE_W<-10)pipes.shift();
  if(bird.y-bird.r<0||bird.y+bird.r>GROUND){die();return}
}
function drawPipe(x,y,h,top=true){
  ctx.fillStyle='#56c596';ctx.fillRect(x,y,PIPE_W,h);
  ctx.fillStyle='#7ce3ad';ctx.fillRect(x+5,y,8,h);
  const cy=top?y+h-16:y;
  ctx.fillStyle='#3ea678';ctx.fillRect(x-4,cy,PIPE_W+8,16);
  ctx.fillStyle='#72dca7';ctx.fillRect(x,cy,PIPE_W,5);
}
function draw(){
  // Simple flat scene: deliberately low-cost for mobile FPS.
  ctx.fillStyle='#79d9f5';ctx.fillRect(0,0,W,H);
  ctx.fillStyle='#a8e7ff';ctx.fillRect(0,0,W,H*.58);
  // Clouds: only four rectangles, no gradients/shadows.
  ctx.fillStyle='rgba(255,255,255,.65)';
  ctx.fillRect(42,92,58,10);ctx.fillRect(60,82,28,10);
  ctx.fillRect(300,145,66,10);ctx.fillRect(324,135,30,10);
  for(const p of pipes){
    drawPipe(p.x,0,p.gapY-GAP/2,true);
    drawPipe(p.x,p.gapY+GAP/2,GROUND-(p.gapY+GAP/2),false);
  }
  ctx.fillStyle='#74d66e';ctx.fillRect(0,GROUND,W,H-GROUND);
  ctx.fillStyle='#b7ed78';ctx.fillRect(0,GROUND,W,8);
  ctx.save();ctx.translate(bird.x,bird.y);ctx.rotate(clamp(bird.vy/700,-.35,.65));
  ctx.fillStyle='#ffd84d';ctx.beginPath();ctx.arc(0,0,bird.r,0,6.283);ctx.fill();
  ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(5,-4,4,0,6.283);ctx.fill();
  ctx.fillStyle='#111';ctx.beginPath();ctx.arc(6,-4,1.7,0,6.283);ctx.fill();
  ctx.fillStyle='#ff9a36';ctx.beginPath();ctx.moveTo(11,1);ctx.lineTo(21,5);ctx.lineTo(11,8);ctx.closePath();ctx.fill();
  ctx.fillStyle='#f6b63a';ctx.fillRect(-8,5,9,5);ctx.restore();
  overlay();
}
function overlay(){
  const pulse=.6+.4*Math.sin(t*4);
  if(st==='ready'){
    dim(.34);
    txt('فلپی‌برد 🐦',W/2,200,44,'#fff');
    txt('با لمس صفحه پرنده رو بالا ببر',W/2,245,17,'#e9fbff','400');
    txt('از بین لوله‌ها رد شو و امتیاز بگیر',W/2,275,15,'#e9fbff','400');
    txt('رکورد: '+FA(Store.best(id)),W/2,330,18,'#fff36b');
    ctx.globalAlpha=pulse;txt('برای شروع لمس کن',W/2,430,23,'#fff');ctx.globalAlpha=1;
  }else if(st==='over'){
    dim(.36);
    txt('باختی!',W/2,220,48,'#ff6b81');
    txt('امتیاز: '+FA(score),W/2,270,24,'#fff');
    txt('رکورد: '+FA(Store.best(id)),W/2,305,18,'#fff36b');
    if(newBest)txt('🎉 رکورد جدید!',W/2,345,21,'#7dffb0');
    ctx.globalAlpha=pulse;txt('برای بازی دوباره لمس کن',W/2,430,20,'#fff');ctx.globalAlpha=1;
  }else if(st==='play'){
    txt(FA(score),W/2,74,34,'rgba(255,255,255,.9)','700');
  }
}
return{id,enter,update,draw,down,up(){},key,playing:()=>st==='play',idle:()=>st==='ready'||st==='over'};
})();
/* ================= SNAKE (مار) ================= */
Games.snake=(()=>{
  const id='snake';
  const COLS=24,ROWS=32,CELL=20,OX=(W-COLS*CELL)/2,OY=0;
  const BOARD_W=COLS*CELL,BOARD_H=ROWS*CELL;
  let st='ready',score=0,t=0,stepT=0,newBest=false,lock=0,skin=0,skinPulse=0;
  let dir={x:1,y:0},next={x:1,y:0},snake=[],prevSnake=[],apple={x:12,y:15};
  let speed=7.5,swipe=null;
  // اسکین‌های مار: هر ۵۰ امتیاز یک اسکین جدید باز می‌شود.
  const SKINS=[
    {name:'کلاسیک',need:0,a:'#38b96f',b:'#62dc88',fx:'none'},
    {name:'آتیشی 🔥',need:50,a:'#ff5a36',b:'#ffd34d',fx:'fire'},
    {name:'یخی ❄️',need:100,a:'#4ddcff',b:'#dfffff',fx:'ice'},
    {name:'برقی ⚡',need:150,a:'#8b7cff',b:'#fff36b',fx:'electric'},
    {name:'سمی ☣️',need:200,a:'#56d43f',b:'#c8ff48',fx:'toxic'},
    {name:'سایه 🌑',need:250,a:'#3b3b55',b:'#a68cff',fx:'shadow'},
    {name:'لاوا 🌋',need:300,a:'#ff3d2e',b:'#ff8a24',fx:'lava'},
    {name:'کهکشانی 🌌',need:350,a:'#7b5cff',b:'#ff5eea',fx:'galaxy'},
    {name:'طلایی 👑',need:400,a:'#d99b19',b:'#fff0a0',fx:'gold'},
    {name:'نئونی 💚',need:450,a:'#00e5a8',b:'#00fff0',fx:'neon'},
    {name:'رنگین‌کمانی 🌈',need:500,a:'#ff4d9d',b:'#6bffcf',fx:'rainbow'}
  ];
  const skinForScore=v=>Math.min(SKINS.length-1,Math.floor(v/50));
  const currentSkin=()=>SKINS[skin];
  const same=(a,b)=>a.x===b.x&&a.y===b.y;
  const center=s=>({x:OX+s.x*CELL+CELL/2,y:OY+s.y*CELL+CELL/2});
  function placeApple(){
    let tries=0;
    do{
      apple={x:1+Math.floor(Math.random()*(COLS-2)),y:1+Math.floor(Math.random()*(ROWS-2))};
      tries++;
    }while(snake.some(s=>same(s,apple))&&tries<500);
  }
  function reset(){
    snake=[{x:7,y:15},{x:6,y:15},{x:5,y:15},{x:4,y:15}];
    prevSnake=snake.map(s=>({...s}));
    dir={x:1,y:0};next={x:1,y:0};score=0;stepT=0;speed=7.5;swipe=null;
    const best=Store.best(id);
    for(let i=0;i<SKINS.length;i++)if(best>=SKINS[i].need)Store.unlockSkin(id,i);
    skin=Math.min(SKINS.length-1,Store.selectedSkin(id));
    if(!Store.skinUnlocked(id,skin))skin=0;
    Store.setSkin(id,skin);skinPulse=0;
    placeApple();sync();
  }
  function sync(){
    Shell.score(score);
    Shell.info('🍎 طول مار: '+FA(snake.length)+' · '+currentSkin().name);
  }
  function enter(){
    st='ready';newBest=false;reset();
  }
  function start(){
    reset();newBest=false;Shell.begin();st='play';sfx.launch();
  }
  function setDir(x,y){
    if(st==='ready')return;
    if(st==='over')start();
    if(st!=='play')return;
    // جلوگیری از برگشت مستقیم داخل بدن
    if(x===-dir.x&&y===-dir.y)return;
    next={x,y};
  }
  function down(e){
    if(Date.now()<lock)return;
    if(st==='ready'){
      if(e&&e.clientX!==undefined){
        const r=cv.getBoundingClientRect();
        const x=(e.clientX-r.left)/r.width*W;
        const y=(e.clientY-r.top)/r.height*H;
        const col=x>=30&&x<=228?0:(x>=236&&x<=434?1:-1),row=Math.floor((y-215)/48);
        const idx=row*2+col;
        if(col>=0&&row>=0&&idx>=0&&idx<SKINS.length){if(Store.skinUnlocked(id,idx)){skin=idx;Store.setSkin(id,idx);sync();}return}
        if(x>=70&&x<=410&&y>=545&&y<=615){start();return}
      }else{start();return}
      return;
    }
    if(st==='over')start();
    if(st!=='play')return;
    if(e&&e.clientX!==undefined){
      swipe={x:e.clientX,y:e.clientY};
      const r=cv.getBoundingClientRect();
      const tx=(e.clientX-r.left)/r.width*W;
      const ty=(e.clientY-r.top)/r.height*H;
      const h=center(snake[0]);
      const dx=tx-h.x,dy=ty-h.y;
      if(Math.abs(dx)+Math.abs(dy)>18){
        if(Math.abs(dx)>Math.abs(dy))setDir(dx>0?1:-1,0);
        else setDir(0,dy>0?1:-1);
      }
      return;
    }
    setDir(0,-1);
  }
  function move(e){
    if(st!=='play'||e.clientX===undefined)return;
    if(!swipe)return;
    const dx=e.clientX-swipe.x,dy=e.clientY-swipe.y;
    if(Math.abs(dx)+Math.abs(dy)<22)return;
    if(Math.abs(dx)>Math.abs(dy))setDir(dx>0?1:-1,0);
    else setDir(0,dy>0?1:-1);
    swipe=null;
  }
  function key(k){
    const m={
      ArrowUp:[0,-1],KeyW:[0,-1],
      ArrowDown:[0,1],KeyS:[0,1],
      ArrowLeft:[-1,0],KeyA:[-1,0],
      ArrowRight:[1,0],KeyD:[1,0]
    };
    if(!m[k])return false;
    setDir(m[k][0],m[k][1]);
    return true;
  }
  function die(){
    st='over';swipe=null;
    newBest=Shell.finish(score,'lose');lock=Date.now()+800;sfx.die();
  }
  function update(dt){
    t+=dt;
    if(skinPulse>0)skinPulse=Math.max(0,skinPulse-dt);
    if(st!=='play')return;
    stepT+=dt;
    // سرعت با امتیاز بالا می‌رود، اما سقف کنترل‌شده دارد تا بازی قابل بازی بماند.
    const movesPerSec=Math.min(16, speed+Math.floor(score/30)*0.45);
    const interval=1/movesPerSec;
    if(stepT<interval)return;
    stepT-=interval;
    dir=next;
    prevSnake=snake.map(s=>({...s}));
    const head={x:snake[0].x+dir.x,y:snake[0].y+dir.y};
    if(head.x<0||head.x>=COLS||head.y<0||head.y>=ROWS){die();return}
    const eating=same(head,apple);
    // اگر سیب نخورده‌ایم، خانه‌ی دم در همین حرکت آزاد می‌شود.
    const bodyCount=snake.length-(eating?0:1);
    for(let i=0;i<bodyCount;i++){
      if(same(head,snake[i])){die();return}
    }
    snake.unshift(head);
    if(eating){
      score+=10;
      speed=Math.min(13,speed+.18);
      const ns=skinForScore(score);
      if(ns>Store.skinIndex(id)){Store.unlockSkin(id,ns);skinPulse=1.2;sfx.power();}
      placeApple();
      sync();
      sfx.point();
    }else{
      snake.pop();
    }
  }
  function roundRect(x,y,w,h,r){
    ctx.beginPath();
    ctx.roundRect(x,y,w,h,r);
    ctx.fill();
  }
  function drawApple(){
    const c=center(apple);
    // سیب گرد با ساقه و برگ، بدون افکت سنگین.
    ctx.fillStyle='#e93f55';
    ctx.beginPath();ctx.arc(c.x,c.y+1,7.6,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#ff6d7d';
    ctx.beginPath();ctx.arc(c.x-2.5,c.y-2,2.1,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#5a3a20';
    ctx.fillRect(c.x-1,c.y-9,2.5,4.5);
    ctx.fillStyle='#72d66f';
    ctx.beginPath();ctx.ellipse(c.x+4,c.y-8,4.2,2.2,-.35,0,Math.PI*2);ctx.fill();
  }
  function drawSkinFx(renderSnake){
    const sk=currentSkin(),f=sk.fx;
    if(f==='none'||!renderSnake.length)return;
    ctx.save();
    const n=Math.min(renderSnake.length,22);
    for(let i=0;i<n;i++){
      const p=center(renderSnake[i]);
      const q=(t*5+i*1.7)%6.28;
      let alpha=.24;
      if(f==='fire'){
        ctx.fillStyle=i%2?'#ff4b24':'#ffd34d';
        ctx.globalAlpha=.22+.12*Math.sin(t*12+i);
        ctx.beginPath();ctx.arc(p.x+Math.sin(q)*7,p.y+Math.cos(q)*5,3+Math.random()*2,0,6.283);ctx.fill();
      }else if(f==='ice'){
        ctx.fillStyle='#cfffff';ctx.globalAlpha=.35;
        ctx.beginPath();ctx.arc(p.x+Math.cos(q)*9,p.y+Math.sin(q)*7,2.2,0,6.283);ctx.fill();
      }else if(f==='electric'){
        ctx.strokeStyle='#fff36b';ctx.lineWidth=1.5;ctx.globalAlpha=.55;
        ctx.beginPath();ctx.moveTo(p.x-5,p.y+Math.sin(q)*5);ctx.lineTo(p.x,p.y-5);ctx.lineTo(p.x+4,p.y+2);ctx.stroke();
      }else if(f==='toxic'){
        ctx.fillStyle='#c8ff48';ctx.globalAlpha=.28;
        ctx.beginPath();ctx.arc(p.x+Math.sin(q)*8,p.y+Math.cos(q)*8,2.5,0,6.283);ctx.fill();
      }else if(f==='shadow'){
        ctx.fillStyle='#9c82ff';ctx.globalAlpha=.16;
        ctx.beginPath();ctx.arc(p.x,p.y,13+Math.sin(q)*2,0,6.283);ctx.fill();
      }else if(f==='lava'){
        ctx.fillStyle=i%2?'#ff3d2e':'#ffb02e';ctx.globalAlpha=.3;
        ctx.beginPath();ctx.arc(p.x+Math.sin(q)*6,p.y+Math.cos(q)*6,2.5,0,6.283);ctx.fill();
      }else if(f==='galaxy'){
        ctx.fillStyle=i%2?'#ff5eea':'#6b7cff';ctx.globalAlpha=.35;
        ctx.beginPath();ctx.arc(p.x+Math.sin(q)*8,p.y+Math.cos(q)*8,2,0,6.283);ctx.fill();
      }else if(f==='gold'){
        ctx.fillStyle='#fff0a0';ctx.globalAlpha=.38;
        ctx.beginPath();ctx.arc(p.x+Math.cos(q)*8,p.y+Math.sin(q)*8,2.3,0,6.283);ctx.fill();
      }else if(f==='neon'){
        ctx.strokeStyle='#00fff0';ctx.lineWidth=1.5;ctx.globalAlpha=.4;
        ctx.beginPath();ctx.arc(p.x,p.y,11+Math.sin(q)*2,0,6.283);ctx.stroke();
      }else if(f==='rainbow'){
        ctx.fillStyle=`hsl(${(t*180+i*32)%360},100%,65%)`;ctx.globalAlpha=.42;
        ctx.beginPath();ctx.arc(p.x+Math.sin(q)*8,p.y+Math.cos(q)*8,2.5,0,6.283);ctx.fill();
      }
    }
    ctx.restore();
  }
  function drawSnake(){
    if(!snake.length)return;
    // بدن یکپارچه است: اول یک نوار پیوسته می‌کشیم و بعد قطعه‌ها را روی آن می‌نشانیم.
    // این باعث می‌شود بین خانه‌ها هیچ شکاف مربعی یا فاصله‌ای دیده نشود.
    ctx.save();
    const interval=1/Math.min(16,speed+Math.floor(score/30)*0.45);
    const a=Math.max(0,Math.min(1,stepT/interval));
    const renderSnake=snake.map((cur,i)=>{
      const old=prevSnake[i]||cur;
      return {x:old.x+(cur.x-old.x)*a,y:old.y+(cur.y-old.y)*a};
    });
    drawSkinFx(renderSnake);
    ctx.lineCap='round';ctx.lineJoin='round';ctx.lineWidth=15.5;
    ctx.strokeStyle=currentSkin().a;
    ctx.beginPath();
    const tail=center(renderSnake[renderSnake.length-1]);ctx.moveTo(tail.x,tail.y);
    for(let i=renderSnake.length-2;i>=0;i--){const p=center(renderSnake[i]);ctx.lineTo(p.x,p.y)}
    ctx.stroke();
    ctx.lineWidth=11.5;
    ctx.strokeStyle=currentSkin().b;
    ctx.beginPath();ctx.moveTo(tail.x,tail.y);
    for(let i=renderSnake.length-2;i>=1;i--){const p=center(renderSnake[i]);ctx.lineTo(p.x,p.y)}
    ctx.stroke();
    // لکه‌های ظریف روی بدن برای اینکه مار از یک نوار ساده هم طبیعی‌تر دیده شود.
    for(let i=renderSnake.length-1;i>=1;i--){
      const p=center(renderSnake[i]);
      ctx.fillStyle=i%2?currentSkin().a:currentSkin().b;
      ctx.beginPath();ctx.arc(p.x,p.y,7.1,0,Math.PI*2);ctx.fill();
    }
    ctx.restore();
    // سر بزرگ‌تر و گردتر.
    const h=center(renderSnake[0]);
    ctx.save();
    ctx.translate(h.x,h.y);
    const ang=Math.atan2(dir.y,dir.x);
    ctx.rotate(ang);
    ctx.fillStyle=currentSkin().b;
    ctx.beginPath();ctx.ellipse(0,0,10.2,9,0,0,Math.PI*2);ctx.fill();
    // چشم‌ها
    ctx.fillStyle='#fff';
    ctx.beginPath();ctx.arc(4.8,-4.1,3,0,Math.PI*2);ctx.arc(4.8,4.1,3,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#14231b';
    ctx.beginPath();ctx.arc(5.7,-4.1,1.35,0,Math.PI*2);ctx.arc(5.7,4.1,1.35,0,Math.PI*2);ctx.fill();
    // بینی و زبان کوچک برای ظاهر زنده‌تر
    ctx.fillStyle='#d72e48';
    ctx.beginPath();ctx.arc(10,0,1.5,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#ef5366';ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(10,0);ctx.lineTo(14,0);ctx.moveTo(14,0);ctx.lineTo(16,-2);ctx.moveTo(14,0);ctx.lineTo(16,2);ctx.stroke();
    ctx.restore();
  }
  function draw(){
    if(st==='ready'){
      drawSnakeStartMenu();
      return;
    }
    ctx.fillStyle='#06110d';ctx.fillRect(0,0,W,H);
    // زمین بازی سبک و واضح
    ctx.fillStyle='#0b2418';ctx.fillRect(OX,OY,BOARD_W,BOARD_H);
    ctx.strokeStyle='rgba(125,255,176,.16)';ctx.lineWidth=2;ctx.strokeRect(OX+1,OY+1,BOARD_W-2,BOARD_H-2);
    drawApple();
    drawSnake();
    if(skinPulse>0){
      ctx.save();
      ctx.globalAlpha=Math.min(.45,skinPulse*.38);
      ctx.fillStyle=currentSkin().b;
      ctx.fillRect(OX,OY,BOARD_W,BOARD_H);
      ctx.globalAlpha=Math.min(1,skinPulse);
      txt('اسکین جدید: '+currentSkin().name,W/2,120,24,'#fff');
      ctx.restore();
    }
    overlay();
  }
  function drawHex(x,y,r,rot=0){
    ctx.beginPath();
    for(let i=0;i<6;i++){
      const a=rot+i*Math.PI/3,px=x+Math.cos(a)*r,py=y+Math.sin(a)*r;
      if(i===0)ctx.moveTo(px,py);else ctx.lineTo(px,py);
    }
    ctx.closePath();
  }
  function drawMiniSkin(sk,x,y,unlocked,current){
    ctx.save();
    ctx.globalAlpha=unlocked?.95:.42;
    ctx.shadowBlur=current?14:8;ctx.shadowColor=sk.b;
    ctx.strokeStyle=sk.a;ctx.lineWidth=7;ctx.lineCap='round';
    ctx.beginPath();ctx.moveTo(x-28,y+5);ctx.lineTo(x-10,y+5);ctx.lineTo(x+7,y-4);ctx.lineTo(x+18,y-4);ctx.stroke();
    ctx.shadowBlur=0;
    ctx.fillStyle=sk.b;ctx.beginPath();ctx.arc(x+20,y-4,8,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(x+23,y-7,2.1,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#06110d';ctx.beginPath();ctx.arc(x+23.5,y-7,0.9,0,Math.PI*2);ctx.fill();
    ctx.restore();
  }
  function drawSnakeStartMenu(){
    const pulse=.72+.28*Math.sin(t*4.2);
    const best=Store.best(id);
    ctx.save();
    // پس‌زمینه‌ی علمی‌تخیلی
    const g=ctx.createLinearGradient(0,0,0,H);
    g.addColorStop(0,'#05081b');g.addColorStop(.55,'#09102c');g.addColorStop(1,'#02040e');
    ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
    for(let i=0;i<34;i++){
      const x=(i*83+37)%W,y=(i*137+23)%H;
      ctx.fillStyle=i%3===0?'rgba(83,236,255,.55)':'rgba(255,255,255,.33)';
      ctx.fillRect(x,y,1.4,1.4);
    }
    ctx.strokeStyle='rgba(53,242,255,.08)';ctx.lineWidth=1;
    for(let x=0;x<=W;x+=40){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke()}
    for(let y=0;y<=H;y+=40){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke()}
    // حلقه‌ی انرژی پشت عنوان
    ctx.translate(W/2,85);ctx.rotate(t*.12);
    ctx.strokeStyle='rgba(53,242,255,.34)';ctx.lineWidth=2;drawHex(0,0,74,Math.PI/6);ctx.stroke();
    ctx.rotate(-t*.24);ctx.strokeStyle='rgba(255,61,240,.23)';drawHex(0,0,62,0);ctx.stroke();
    ctx.restore();
    txt('S N A K E',W/2,64,25,'#71f4ff','900');
    txt('NEO ARCADE // SKIN LAB',W/2,91,11,'#6f82c8','700');
    txt('🐍',W/2,142,52,'#fff');
    txt('آزمایشگاه اسکین‌های مار',W/2,171,19,'#eafcff','800');
    txt('هر ۵۰ امتیاز یک پوسته‌ی جدید آزاد می‌شود · روی اسکین بازشده بزن',W/2,194,12,'#91a6d8','400');
    const cardW=198,cardH=40,gap=8,left=30,top=215;
    SKINS.forEach((sk,i)=>{
      const col=i%2,row=Math.floor(i/2);
      const x=left+col*(cardW+gap),y=top+row*(cardH+gap);
      const unlocked=Store.skinUnlocked(id,i);
      const current=i===skin;
      ctx.save();
      ctx.shadowBlur=current?15:0;ctx.shadowColor=sk.b;
      rr(x,y,cardW,cardH,11);
      ctx.fillStyle=current?'rgba(41,92,116,.34)':(unlocked?'rgba(15,29,61,.82)':'rgba(8,13,31,.74)');ctx.fill();
      ctx.strokeStyle=current?sk.b:(unlocked?'rgba(70,117,183,.68)':'rgba(46,57,91,.62)');ctx.lineWidth=current?1.8:1;ctx.stroke();
      drawMiniSkin(sk,x+40,y+21,unlocked,current);
      txt(sk.name,x+118,y+18,11,unlocked?'#ecfaff':'#7785ad','800');
      txt(unlocked?'✓ باز':'🔒 '+FA(sk.need)+' امتیاز',x+118,y+34,10,unlocked?'#7dffb0':'#69779f','600');
      ctx.restore();
    });
    // کارت رکورد
    ctx.save();rr(30,492,420,32,9);ctx.fillStyle='rgba(8,15,38,.86)';ctx.fill();ctx.strokeStyle='rgba(86,126,209,.46)';ctx.stroke();ctx.restore();
    txt('رکورد فعلی',120,513,11,'#7b8fc4','700');
    txt(FA(best),355,513,15,'#fff36b','900');
    // دکمه‌ی START پایین صفحه
    ctx.save();
    ctx.globalAlpha=.95;rr(70,552,340,60,18);
    const sg=ctx.createLinearGradient(70,552,410,612);sg.addColorStop(0,'#22d9ff');sg.addColorStop(1,'#7dffb0');
    ctx.fillStyle=sg;ctx.fill();
    ctx.strokeStyle='#d5ffff';ctx.lineWidth=2;ctx.stroke();
    ctx.shadowBlur=22*GFX.fx?22:14;ctx.shadowColor='#35f2ff';
    ctx.globalAlpha=pulse;txt('▶  START',W/2,590,24,'#04101b','900');
    ctx.restore();
    txt('برای شروع روی START بزن',W/2,632,11,'#7184b8','500');
  }
  function overlay(){
    const pulse=.65+.35*Math.sin(t*4);
    if(st==='ready'){
      return;
    }else if(st==='over'){
      dim(.62);
      txt('باختی! 🐍',W/2,200,46,'#ff6b81');
      txt('امتیاز: '+FA(score),W/2,250,25,'#fff');
      txt('طول مار: '+FA(snake.length),W/2,285,17,'#cfe0ff','400');
      txt('اسکین: '+currentSkin().name,W/2,310,16,'#cfe0ff','400');
      txt('رکورد: '+FA(Store.best(id)),W/2,340,18,'#fff36b');
      if(newBest)txt('🎉 رکورد جدید!',W/2,380,21,'#7dffb0');
      ctx.globalAlpha=pulse;txt('برای بازی دوباره لمس کن',W/2,425,20,'#fff');ctx.globalAlpha=1;
    }else if(st==='play'){
      txt(FA(score),W/2,62,30,'rgba(255,255,255,.9)','700');
    }
  }
  return{id,enter,update,draw,down,move,up(){swipe=null},key,playing:()=>st==='play',idle:()=>st==='ready'||st==='over',menu:()=>st==='ready'};
})();
/* ================= SOCCER STAR (ساکر استار) ================= */
Games.soccer=(()=>{
  const id='soccer';
  const GL=152,PL=125,PR=355,BAR=100,BX=240,BY=548,R=17;
  let st='ready',score=0,goals=0,lives=3,streak=0,t=0,resT=0,resMsg='',resCol='#fff',resGood=false;
  let newBest=false,lock=0,shake=0,aimX=240,crowdBoost=0,net=0,drag=null,kTilt=0;
  let ball={x:BX,y:BY,vx:0,vy:0,rot:0,fly:false,done:false,trail:[]};
  let keeper={x:240,dir:1},defs=[],parts=[];
  const crowd=[],CC=['#ff5d73','#ffd166','#4cc9f0','#fff','#9b5de5','#06d6a0','#f78c6b'];
  for(let i=0;i<300;i++)crowd.push({x:Math.random()*W,y:6+Math.random()*60,c:CC[i%CC.length],p:Math.random()*6});
  const S=n=>{try{sfx[n]&&sfx[n]()}catch(e){}};
  const cl=(v,a,b)=>Math.max(a,Math.min(b,v));
  const sc=y=>0.5+0.5*cl((y-GL)/(BY-GL),0,1.1);
  const rr=(x,y,w,h,r)=>{ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath()};
  function setupDefs(){
    defs=[];const n=Math.min(3,Math.floor(goals/2));
    for(let i=0;i<n;i++)defs.push({x:120+Math.random()*240,y:330+i*8,dir:Math.random()<.5?-1:1,sp:45+goals*4+i*10,c:i%2?'#e63946':'#ff7b00'});
  }
  function prep(){ball={x:BX,y:BY,vx:0,vy:0,rot:0,fly:false,done:false,trail:[]};setupDefs();drag=null}
  function reset(){score=0;goals=0;lives=3;streak=0;resT=0;parts=[];keeper={x:240,dir:1};net=0;shake=0;prep();sync()}
  function sync(){Shell.score(score);Shell.info('جان: '+'⚽'.repeat(Math.max(0,lives))+(streak>1?' · 🔥×'+FA(streak):''))}
  function enter(){st='ready';newBest=false;reset()}
  function start(){reset();newBest=false;Shell.begin();st='play';S('launch')}
  function shoot(dx,dy,len){
    if(st!=='play'||ball.fly||dy>=0)return;
    const d=Math.hypot(dx,dy)||1;let ux=dx/d,uy=dy/d;
    if(-uy<0.5){uy=-0.5;ux=Math.sign(ux||1)*0.866}
    const sp=560+cl(len,30,170)*2.2;
    ball.vx=ux*sp;ball.vy=uy*sp;ball.fly=true;drag=null;S('whoosh');
  }
  function burst(x,y,n){
    for(let i=0;i<n;i++){const a=Math.random()*6.283,v=80+Math.random()*320;
      parts.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-120,l:1.2+Math.random()*.8,c:CC[i%CC.length],s:3+Math.random()*4})}
  }
  function result(good,msg,col){
    ball.done=true;st='result';resT=1.15;resMsg=msg;resCol=col;resGood=good;
    if(good){goals++;streak++;score+=10+(streak-1)*5;burst(ball.x,GL-10,90);crowdBoost=1.6;net=1;shake=.25;S('point');S('clear')}
    else{lives--;lifeFX.show();streak=0;shake=.3;S('hit')}
    sync();
  }
  function down(e){
    if(Date.now()<lock)return;
    if(st==='ready'||st==='over'){start();return}
    if(st!=='play'||ball.fly)return;
    if(e&&e.clientX!==undefined){drag={x:e.clientX,y:e.clientY,cx:e.clientX,cy:e.clientY}}
    else shoot(aimX-BX,GL-BY,110);
  }
  function move(e){
    if(st!=='play'||!drag||ball.fly||e.clientX===undefined)return;
    drag.cx=e.clientX;drag.cy=e.clientY;
  }
  function release(){
    if(st!=='play'||!drag||ball.fly){drag=null;return}
    const r=cv.getBoundingClientRect(),k=W/r.width;
    const dx=(drag.cx-drag.x)*k,dy=(drag.cy-drag.y)*k,len=Math.hypot(dx,dy);
    if(len>=18&&dy<-8)shoot(dx,dy,len);else drag=null;
  }
  function key(k){
    if(k==='ArrowLeft'||k==='KeyA'){aimX=cl(aimX-18,PL,PR);return true}
    if(k==='ArrowRight'||k==='KeyD'){aimX=cl(aimX+18,PL,PR);return true}
    return false;
  }
  function update(dt){
    t+=dt;if(shake>0)shake-=dt;if(crowdBoost>0)crowdBoost-=dt;if(net>0)net=Math.max(0,net-dt*1.4);
    for(let i=parts.length-1;i>=0;i--){const p=parts[i];p.l-=dt;if(p.l<=0){parts.splice(i,1);continue}p.vy+=520*dt;p.x+=p.vx*dt;p.y+=p.vy*dt}
    if(st==='ready'||st==='over')return;
    const kSp=80+Math.min(goals,12)*6,pk=keeper.x;
    if(ball.fly&&!ball.done){
      const f=0.42+Math.min(goals,12)*0.02;
      keeper.x+=cl(ball.x-keeper.x,-kSp*f*dt,kSp*f*dt);
    }else if(!ball.done){
      keeper.x+=keeper.dir*kSp*dt;
      if(keeper.x>320){keeper.x=320;keeper.dir=-1}if(keeper.x<160){keeper.x=160;keeper.dir=1}
    }
    keeper.x=cl(keeper.x,PL-10,PR+10);
    kTilt+=(cl((keeper.x-pk)/dt/400,-.5,.5)-kTilt)*Math.min(1,dt*10);
    for(const d of defs){d.x+=d.dir*d.sp*dt;if(d.x>400){d.x=400;d.dir=-1}if(d.x<80){d.x=80;d.dir=1}}
    if(ball.fly){
      ball.trail.push({x:ball.x,y:ball.y});if(ball.trail.length>10)ball.trail.shift();
      ball.x+=ball.vx*dt;ball.y+=ball.vy*dt;ball.rot+=ball.vx*dt*.02+dt*9;
      if(!ball.done){
        const rad=R*sc(ball.y);
        for(const d of defs){
          if(Math.abs(ball.x-d.x)<rad+17&&Math.abs(ball.y-d.y)<rad+24&&ball.vy<0){
            ball.vy=Math.abs(ball.vy)*.45;ball.vx=(ball.x-d.x)*7;result(false,'دفاع زد بیرون!','#ff8fa3');break;
          }
        }
        if(!ball.done&&ball.vy<0&&ball.y<GL+26&&ball.y>GL-14&&Math.abs(ball.x-keeper.x)<28+rad){
          ball.vy=Math.abs(ball.vy)*.4;ball.vx=(ball.x-keeper.x)*8;result(false,'دروازه‌بان مهار کرد!','#ffd166');
        }
        if(!ball.done&&ball.y<=GL){
          if(ball.x>PL+8&&ball.x<PR-8){ball.vx*=.2;ball.vy*=.22;result(true,'گووووول! ⚽','#7dffb0')}
          else if(ball.x>PL-12&&ball.x<PR+12){ball.vy=Math.abs(ball.vy)*.4;ball.vx*=-.5;result(false,'تیرک دروازه!','#ffb020')}
          else result(false,'بیرون!','#ff8fa3');
        }
        if(!ball.done&&(ball.x<-20||ball.x>W+20||ball.y<20))result(false,'بیرون!','#ff8fa3');
      }else{
        ball.x+=0;ball.vx*=Math.max(0,1-3*dt);ball.vy*=Math.max(0,1-3*dt);
        if(resGood&&ball.y<BAR+14){ball.y=BAR+14;ball.vy=0}
      }
    }
    if(st==='result'){
      resT-=dt;
      if(resT<=0){
        if(lives<=0){st='over';newBest=Shell.finish(score,'lose');lock=Date.now()+800;S('die')}
        else{st='play';prep()}
      }
    }
  }
  /* ---------- drawing ---------- */
  function drawPlayer(x,y,s,jersey,shorts,tilt,gk,up){
    ctx.save();
    ctx.fillStyle='rgba(0,0,0,.28)';ctx.beginPath();ctx.ellipse(x,y+27*s,20*s,6*s,0,0,6.283);ctx.fill();
    ctx.translate(x,y);ctx.scale(s,s);ctx.rotate(tilt);
    ctx.fillStyle='#f0f0f0';rr(-10,12,8,17,3);ctx.fill();rr(2,12,8,17,3);ctx.fill();
    ctx.fillStyle='#222';rr(-11,26,10,5,2);ctx.fill();rr(1,26,10,5,2);ctx.fill();
    ctx.fillStyle=shorts;rr(-13,6,26,12,4);ctx.fill();
    ctx.strokeStyle='#f0c8a0';ctx.lineWidth=6;ctx.lineCap='round';
    ctx.beginPath();ctx.moveTo(-14,-14);ctx.lineTo(-27,up?-34:-2);ctx.moveTo(14,-14);ctx.lineTo(27,up?-34:-2);ctx.stroke();
    ctx.fillStyle=gk?'#ff9f1c':'#f0c8a0';
    ctx.beginPath();ctx.arc(-27,up?-35:-2,5.5,0,6.283);ctx.arc(27,up?-35:-2,5.5,0,6.283);ctx.fill();
    const g=ctx.createLinearGradient(-14,-22,14,12);g.addColorStop(0,jersey);g.addColorStop(1,'rgba(0,0,0,.35)');
    ctx.fillStyle=jersey;rr(-14,-22,28,32,8);ctx.fill();ctx.fillStyle=g;rr(-14,-22,28,32,8);ctx.fill();
    ctx.fillStyle='rgba(255,255,255,.35)';ctx.fillRect(-14,-8,28,4);
    ctx.fillStyle='#f0c8a0';ctx.beginPath();ctx.arc(0,-31,9,0,6.283);ctx.fill();
    ctx.fillStyle='#2b1d12';ctx.beginPath();ctx.arc(0,-33,9,3.3,6.1);ctx.fill();
    ctx.restore();
  }
  function drawBall(x,y,s,rot){
    const r=R*s;
    ctx.save();
    ctx.fillStyle='rgba(0,0,0,.3)';ctx.beginPath();ctx.ellipse(x+3,y+r*.9,r*.95,r*.35,0,0,6.283);ctx.fill();
    ctx.translate(x,y);
    const g=ctx.createRadialGradient(-r*.35,-r*.4,r*.1,0,0,r);g.addColorStop(0,'#fff');g.addColorStop(1,'#c9d2dc');
    ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,r,0,6.283);ctx.fill();
    ctx.save();ctx.beginPath();ctx.arc(0,0,r,0,6.283);ctx.clip();ctx.rotate(rot);ctx.fillStyle='#1b1f27';
    const pent=(cx,cy,pr)=>{ctx.beginPath();for(let i=0;i<5;i++){const a=-1.5708+i*1.2566;const px=cx+Math.cos(a)*pr,py=cy+Math.sin(a)*pr;i?ctx.lineTo(px,py):ctx.moveTo(px,py)}ctx.closePath();ctx.fill()};
    pent(0,0,r*.38);
    for(let i=0;i<5;i++){const a=i*1.2566;pent(Math.cos(a)*r*.95,Math.sin(a)*r*.95,r*.34)}
    ctx.restore();
    ctx.strokeStyle='rgba(0,0,0,.45)';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(0,0,r,0,6.283);ctx.stroke();
    ctx.restore();
  }
  function drawField(){
    const sky=ctx.createLinearGradient(0,0,0,100);sky.addColorStop(0,'#0a0f24');sky.addColorStop(1,'#1b2250');
    ctx.fillStyle=sky;ctx.fillRect(0,0,W,100);
    const amp=2+crowdBoost*5;
    for(const c of crowd){ctx.fillStyle=c.c;ctx.globalAlpha=.85;ctx.fillRect(c.x,c.y-Math.abs(Math.sin(t*(crowdBoost>0?9:2)+c.p))*amp,4,5)}
    ctx.globalAlpha=1;
    // projectors
    for(const lx of [60,420]){const g=ctx.createRadialGradient(lx,0,4,lx,0,150);g.addColorStop(0,'rgba(255,255,220,.55)');g.addColorStop(1,'rgba(255,255,220,0)');ctx.fillStyle=g;ctx.fillRect(lx-150,0,300,150)}
    // ad boards
    const ads=['#e63946','#2a9d8f','#ffb703','#4361ee','#9b5de5'];
    for(let i=0;i<10;i++){ctx.fillStyle=ads[i%5];ctx.fillRect(i*48,78,48,18);ctx.fillStyle='rgba(255,255,255,.85)';ctx.font='700 9px sans-serif';ctx.textAlign='center';ctx.fillText('SOCCER STAR',i*48+24,90)}
    ctx.fillStyle='rgba(0,0,0,.4)';ctx.fillRect(0,96,W,4);
    // grass
    for(let i=0,y=100;y<H;i++,y+=44){ctx.fillStyle=i%2?'#1e8a3a':'#249c44';ctx.fillRect(0,y,W,44)}
    const gl=ctx.createRadialGradient(W/2,400,60,W/2,400,420);gl.addColorStop(0,'rgba(255,255,255,.07)');gl.addColorStop(1,'rgba(0,0,0,.38)');
    ctx.fillStyle=gl;ctx.fillRect(0,100,W,H-100);
    // lines
    ctx.strokeStyle='rgba(255,255,255,.75)';ctx.lineWidth=3;
    ctx.beginPath();ctx.moveTo(0,GL);ctx.lineTo(W,GL);ctx.stroke();
    ctx.strokeRect(60,GL,360,215);ctx.strokeRect(110,GL,260,70);
    ctx.beginPath();ctx.arc(240,GL+150,80,0.65,2.49);ctx.stroke();
    ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(240,GL+150,4,0,6.283);ctx.fill();
  }
  function drawGoal(){
    const bulge=net*10*Math.sin(t*30);
    ctx.fillStyle='rgba(0,0,0,.3)';ctx.beginPath();ctx.moveTo(PL,GL);ctx.lineTo(PL+14,BAR+8);ctx.lineTo(PR-14,BAR+8);ctx.lineTo(PR,GL);ctx.fill();
    ctx.strokeStyle='rgba(255,255,255,.28)';ctx.lineWidth=1;
    for(let x=PL;x<=PR;x+=12){ctx.beginPath();ctx.moveTo(x,BAR+8+bulge*.3);ctx.lineTo(x+(240-x)*.08,GL+bulge*.2);ctx.stroke()}
    for(let y=BAR+8;y<=GL;y+=9){const k=(y-BAR)/(GL-BAR);ctx.beginPath();ctx.moveTo(PL+14*(1-k)+bulge*.2,y);ctx.lineTo(PR-14*(1-k)-bulge*.2,y);ctx.stroke()}
    ctx.strokeStyle='#fff';ctx.lineWidth=6;ctx.lineCap='round';ctx.shadowColor='rgba(255,255,255,.6)';ctx.shadowBlur=10;
    ctx.beginPath();ctx.moveTo(PL,GL);ctx.lineTo(PL,BAR);ctx.lineTo(PR,BAR);ctx.lineTo(PR,GL);ctx.stroke();ctx.shadowBlur=0;
    if(net>0){ctx.fillStyle='rgba(125,255,176,'+(net*.22)+')';ctx.fillRect(PL,BAR,PR-PL,GL-BAR)}
  }
  function draw(){
    ctx.save();
    if(shake>0)ctx.translate((Math.random()-.5)*8*shake*3,(Math.random()-.5)*8*shake*3);
    drawField();drawGoal();
    drawPlayer(keeper.x,GL+8,.95,'#ffd60a','#222',kTilt,true,true);
    for(const d of defs)drawPlayer(d.x,d.y,1,d.c,'#fff',0,false,false);
    // aim guide
    if(st==='play'&&!ball.fly){
      ctx.save();ctx.setLineDash([8,10]);ctx.lineDashOffset=-t*40;ctx.strokeStyle='rgba(255,255,255,.55)';ctx.lineWidth=3;
      let tx=aimX,ty=GL+20;
      if(drag){const r=cv.getBoundingClientRect(),k=W/r.width,dx=(drag.cx-drag.x)*k,dy=(drag.cy-drag.y)*k,d=Math.hypot(dx,dy)||1;tx=BX+dx/d*420;ty=BY+dy/d*420}
      ctx.beginPath();ctx.moveTo(BX,BY);ctx.lineTo(tx,ty);ctx.stroke();ctx.restore();
      if(drag){const r=cv.getBoundingClientRect(),k=W/r.width,len=Math.min(1,Math.hypot((drag.cx-drag.x)*k,(drag.cy-drag.y)*k)/34);
        ctx.fillStyle='rgba(53,242,255,.9)';ctx.fillRect(BX-40,BY+34,80*len,6);ctx.strokeStyle='rgba(255,255,255,.5)';ctx.lineWidth=1;ctx.strokeRect(BX-40,BY+34,80,6)}
    }
    // ball trail
    if(ball.fly)for(let i=0;i<ball.trail.length;i++){const p=ball.trail[i];ctx.globalAlpha=i/ball.trail.length*.35;ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(p.x,p.y,R*sc(p.y)*(i/ball.trail.length),0,6.283);ctx.fill()}
    ctx.globalAlpha=1;
    const bob=(!ball.fly&&st!=='ready')?Math.sin(t*5)*2:0;
    drawBall(ball.x,ball.y+bob,sc(ball.y),ball.rot);
    for(const p of parts){ctx.globalAlpha=Math.min(1,p.l);ctx.fillStyle=p.c;ctx.fillRect(p.x,p.y,p.s,p.s*.6)}
    ctx.globalAlpha=1;
    ctx.restore();
    // HUD
    ctx.fillStyle='rgba(0,0,0,.35)';rr(W/2-60,10,120,44,12);ctx.fill();
    txt(FA(score),W/2,42,32,'#fff','800');
    ctx.font='20px sans-serif';ctx.textAlign='left';ctx.fillStyle='#fff';
    for(let i=0;i<3;i++){ctx.globalAlpha=i<lives?1:.2;ctx.fillText('⚽',12+i*26,36)}
    ctx.globalAlpha=1;
    if(streak>1)txt('🔥 کومبو ×'+FA(streak),W-70,36,16,'#ffb020','800');
    if(st==='result'){
      const p=1-resT/1.15,pop=1+Math.sin(Math.min(1,p*3)*3.14)*.25;
      ctx.save();ctx.translate(W/2,310);ctx.scale(pop,pop);ctx.globalAlpha=Math.min(1,resT*3);
      ctx.shadowColor=resCol;ctx.shadowBlur=24;txt(resMsg,0,0,resGood?46:34,resCol,'900');ctx.restore();
      if(resGood)txt('+'+FA(10+(streak-1)*5),W/2,350,24,'#fff36b','800');
    }
    overlay();
  }
  function overlay(){
    const pulse=.55+.45*Math.sin(t*4);
    if(st==='ready'){
      ctx.fillStyle='rgba(3,8,20,.72)';ctx.fillRect(0,0,W,H);
      const b=Math.abs(Math.sin(t*3))*38;
      drawBall(W/2,250-b,3.4,t*2);
      txt('ساکر استار',W/2,370,50,'#fff','900');
      txt('SOCCER STAR',W/2,400,16,'#35f2ff','700');
      txt('روی توپ به سمت دروازه سوایپ کن ⬆️',W/2,450,18,'#cfe0ff','400');
      txt('از دفاع‌ها و دروازه‌بان رد شو · ۳ جان داری',W/2,478,16,'#cfe0ff','400');
      txt('رکورد: '+FA(Store.best(id)),W/2,520,18,'#fff36b');
      ctx.globalAlpha=pulse;txt('برای شروع لمس کن',W/2,580,22,'#fff');ctx.globalAlpha=1;
    }else if(st==='over'){
      ctx.fillStyle='rgba(3,8,20,.8)';ctx.fillRect(0,0,W,H);
      txt('پایان بازی! ⚽',W/2,210,44,'#ff6b81');
      txt('امتیاز: '+FA(score),W/2,270,28,'#fff');
      txt('گل‌ها: '+FA(goals),W/2,308,18,'#cfe0ff','400');
      txt('رکورد: '+FA(Store.best(id)),W/2,345,20,'#fff36b');
      if(newBest)txt('🎉 رکورد جدید!',W/2,390,22,'#7dffb0');
      ctx.globalAlpha=pulse;txt('برای بازی دوباره لمس کن',W/2,450,20,'#fff');ctx.globalAlpha=1;
    }
  }
  return{id,enter,update,draw,down,move,up:release,key,playing:()=>st==='play'||st==='result',idle:()=>st==='ready'||st==='over'};
})();
/* ================= PANCAKE TOWER ================= */
Games.pancake=(()=>{
  const id='pancake';
  const PH=30, PLATE_Y=594, BASE_Y=548, GAP=1;
  const ACTIVE_SCREEN_Y=178;   // fixed screen height for the moving pancake
  const CAMERA_TRIGGER_Y=248; // camera stays still until the tower reaches here
  const COLORS=[
    ['#ff7fa4','#ffb4c8','#e95f85'],
    ['#c58be9','#e0b7fb','#a166d3'],
    ['#70b9e9','#a9dcfa','#4e9bd1'],
    ['#91d98b','#bcebb5','#67bf61'],
    ['#ffe06b','#fff1a4','#e8c84e'],
    ['#f4bb78','#ffd6a6','#dda05b'],
    ['#ff94b9','#ffc0d4','#e76f98']
  ];
  const BUBBLES=[
    [88,150,52,'rgba(255,182,193,.14)'],
    [388,202,34,'rgba(255,215,142,.13)'],
    [185,84,28,'rgba(255,153,204,.10)'],
    [322,330,44,'rgba(255,160,196,.12)'],
    [72,430,63,'rgba(255,196,120,.09)'],
    [421,454,51,'rgba(175,205,255,.09)'],
    [255,520,70,'rgba(255,143,192,.07)']
  ];

  let st='ready',score=0,combo=0,t=0,shake=0;
  let cameraY=0,cameraTarget=0,dir=1,speed=118;
  let stack=[],active=null,parts=[],floats=[],rings=[];
  let newBest=false,lock=0,dropFlash=0,round=0;

  function start(){
    if(Date.now()<lock)return;
    st='play';score=0;combo=0;t=0;shake=0;
    cameraY=0;cameraTarget=0;dir=Math.random()<.5?-1:1;speed=118;
    stack=[];active=null;parts=[];floats=[];rings=[];round=0;
    dropFlash=0;newBest=false;
    Shell.begin();
    const baseW=214;
    // The stack begins physically on the plate/ground.
    stack.push({x:W/2,y:BASE_Y,w:baseW,h:PH,ci:5,settle:0});
    spawn(baseW);
    Shell.score(0);
  }

  function spawn(w){
    const ci=(stack.length+4)%COLORS.length;
    const half=w/2;
    active={
      x:dir>0?half+18:W-half-18,
      y:0,w,h:PH,ci,
      fall:false,vy:0,rot:0
    };
    speed=118+Math.min(stack.length,80)*3.2;
    placeActiveAtScreenHeight();
  }

  function placeActiveAtScreenHeight(){
    if(!active)return;
    // World y is computed from the camera, so screen position does NOT drift.
    active.y=ACTIVE_SCREEN_Y+cameraY;
  }

  function updateCamera(){
    const top=stack[stack.length-1];
    if(!top){cameraTarget=0;return;}

    // World coordinates increase downward. Once the tower reaches the upper
    // screen zone, cameraY becomes negative and moves the whole world down,
    // revealing higher parts of the tower. This is the crucial direction.
    cameraTarget=Math.min(0,top.y-CAMERA_TRIGGER_Y);
  }

  function addBurst(x,y,c,n=7){
    for(let i=0;i<n;i++){
      const a=Math.random()*Math.PI*2,sp=35+Math.random()*105;
      parts.push({x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp-45,
        s:1.5+Math.random()*2.5,l:.35+Math.random()*.3,c});
    }
    rings.push({x,y,r:7,l:.7,c});
  }

  function floatText(x,y,s,c){floats.push({x,y,s,c,l:.8,v:-26});}

  function finish(){
    st='over';newBest=Shell.finish(score,'lose');lock=Date.now()+650;sfx.over();
  }

  function drop(){
    if(st!=='play'||!active||active.fall)return;
    active.fall=true;active.vy=500+Math.min(stack.length,50)*7;
    active.rot=0;sfx.launch();dropFlash=.14;
  }

  function settle(){
    const top=stack[stack.length-1];
    const aL=active.x-active.w/2,aR=active.x+active.w/2;
    const bL=top.x-top.w/2,bR=top.x+top.w/2;
    const overlap=Math.min(aR,bR)-Math.max(aL,bL);

    if(overlap<=5){
      addBurst(active.x,active.y,'#ff6f91',12);sfx.miss();finish();return;
    }

    const ratio=clamp(overlap/Math.min(active.w,top.w),0,1);
    const center=(Math.max(aL,bL)+Math.min(aR,bR))/2;
    const newW=clamp(overlap+5,26,Math.min(active.w,top.w));

    active.x=center;
    active.y=top.y-PH-GAP;
    active.w=newW;active.fall=false;active.vy=0;active.rot=0;
    stack.push({x:active.x,y:active.y,w:newW,h:PH,ci:active.ci,settle:1});

    round++;combo=ratio>.86?combo+1:0;
    const pts=10+Math.floor(ratio*15)+Math.min(combo,12)*2+(round%10===0?25:0);
    score+=pts;

    if(ratio>.94){
      sfx.clear();floatText(active.x,active.y-24,'PERFECT! +'+FA(pts),'#e8a72d');
      addBurst(active.x,active.y-10,'#ffe77b',10);
    }else{
      sfx.point();floatText(active.x,active.y-20,'+'+FA(pts),'#ffffff');
      addBurst(active.x,active.y-8,COLORS[active.ci][0],7);
    }
    if(overlap<Math.min(active.w,top.w)-12)floatText(W/2,top.y-36,'کمی برش خورد ✂️','#8f9caf');

    shake=.09;dropFlash=.16;Shell.score(score);
    updateCamera();
    const nextW=Math.max(26,newW);
    spawn(nextW);

    if(stack.length%5===0){
      floatText(W/2,125,'🔥 طبقه '+FA(stack.length),'#d27e9b');sfx.mile();
    }
  }

  function update(dt){
    t+=dt;
    if(shake>0)shake=Math.max(0,shake-dt*2);
    if(dropFlash>0)dropFlash=Math.max(0,dropFlash-dt*3);

    for(const p of parts){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=260*dt;p.l-=dt;}
    parts=parts.filter(p=>p.l>0);
    for(const f of floats){f.y+=f.v*dt;f.l-=dt;}
    floats=floats.filter(f=>f.l>0);
    for(const r of rings){r.r+=80*dt;r.l-=dt*2;}
    rings=rings.filter(r=>r.l>0);

    if(st!=='play')return;

    updateCamera();
    cameraY+=(cameraTarget-cameraY)*Math.min(1,dt*10);

    if(!active)return;

    if(!active.fall){
      // IMPORTANT: the moving pancake stays at a fixed screen height.
      // Camera movement changes its world y with it, so it never drops down.
      placeActiveAtScreenHeight();

      active.x+=dir*speed*dt;
      const half=active.w/2,minX=half+18,maxX=W-half-18;
      if(active.x<=minX){active.x=minX;dir=1;sfx.wall();}
      else if(active.x>=maxX){active.x=maxX;dir=-1;sfx.wall();}
    }else{
      active.vy+=1050*dt;
      active.y+=active.vy*dt;
      active.rot+=dir*.28*dt;
      const top=stack[stack.length-1];
      const target=top.y-PH-GAP;
      if(active.y>=target){active.y=target;settle();}
    }
  }

  function pancake(x,y,w,ci,alpha=1,rot=0,glow=0,sy=1){
    const [a,b,c]=COLORS[ci%COLORS.length];
    ctx.save();ctx.translate(x,y);ctx.rotate(rot);ctx.scale(1,sy);ctx.globalAlpha=alpha;
    if(glow){ctx.shadowColor='rgba(203,115,93,.20)';ctx.shadowBlur=8;ctx.shadowOffsetY=4;}
    const gr=ctx.createLinearGradient(0,-PH/2,0,PH/2);
    gr.addColorStop(0,b);gr.addColorStop(.48,a);gr.addColorStop(1,c);
    ctx.fillStyle=gr;rr(-w/2,-PH/2,w,PH,9);ctx.fill();
    ctx.shadowBlur=0;ctx.shadowOffsetY=0;
    ctx.fillStyle='rgba(255,255,255,.25)';rr(-w*.34,-PH*.31,w*.68,4,2);ctx.fill();
    ctx.fillStyle='rgba(125,74,54,.10)';rr(-w*.30,PH*.12,w*.60,3,1.5);ctx.fill();
    ctx.strokeStyle='rgba(255,255,255,.30)';ctx.lineWidth=1;rr(-w/2+.7,-PH/2+.7,w-1.4,PH-1.4,8);ctx.stroke();
    ctx.restore();
  }

  function drawBubbles(){
    for(const b of BUBBLES){
      ctx.fillStyle=b[3];ctx.beginPath();ctx.arc(b[0],b[1]-cameraY*.035,b[2],0,Math.PI*2);ctx.fill();
    }
  }

  function drawPlate(){
    // Plate belongs to the world, so it naturally moves with the camera.
    ctx.save();ctx.translate(W/2,PLATE_Y-cameraY);
    const g=ctx.createLinearGradient(0,-28,0,28);
    g.addColorStop(0,'#ffffff');g.addColorStop(.65,'#fffafd');g.addColorStop(1,'#ded9e0');
    ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(0,0,187,31,0,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='rgba(205,194,205,.72)';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(0,0,171,23,0,0,Math.PI*2);ctx.stroke();
    ctx.fillStyle='rgba(255,255,255,.60)';ctx.beginPath();ctx.ellipse(0,-5,120,11,0,0,Math.PI*2);ctx.fill();
    ctx.restore();
  }

  function drawCherry(x,y){
    ctx.save();ctx.translate(x,y+Math.sin(t*4)*1.2);
    const g=ctx.createRadialGradient(-3,-5,2,0,0,11);
    g.addColorStop(0,'#ff879a');g.addColorStop(.6,'#e6375f');g.addColorStop(1,'#ad1f43');
    ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,10,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#5a8e40';ctx.lineWidth=2.5;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(1,-8);ctx.quadraticCurveTo(2,-16,9,-19);ctx.stroke();
    ctx.fillStyle='#61ae43';ctx.beginPath();ctx.ellipse(9,-19,5,2.5,-.35,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='rgba(255,255,255,.7)';ctx.beginPath();ctx.arc(-3,-4,2.5,0,Math.PI*2);ctx.fill();
    ctx.restore();
  }

  function drawHeader(){
    ctx.save();ctx.fillStyle='rgba(255,255,255,.58)';rr(20,16,W-40,48,14);ctx.fill();
    ctx.strokeStyle='rgba(246,196,79,.38)';ctx.lineWidth=1;rr(20,16,W-40,48,14);ctx.stroke();
    txt(('0000'+score).slice(-5),45,47,23,'#ea4264','900','left');txt('★',155,46,17,'#b27b42','800');
    txt(('0000'+Math.max(Store.best(id),score)).slice(-5),185,47,23,'#b56b33','900','left');txt('HI',292,46,14,'#9d7654','900','left');
    txt('PANCAKE TOWER',W-74,47,17,'#b35e1b','900','right');ctx.font='23px sans-serif';ctx.textAlign='right';ctx.fillStyle='#e7a12b';ctx.fillText('🥞',W-25,48);
    ctx.restore();
  }

  function overlay(){
    const pulse=.55+.45*Math.sin(t*3.8);
    if(st==='ready'){
      ctx.fillStyle='rgba(255,248,234,.50)';ctx.fillRect(0,0,W,H);
      txt('PANCAKE TOWER',W/2,108,34,'#b65e1b','900');
      txt('پنکیک بالای برج چپ و راست می‌رود',W/2,142,17,'#a27d69','700');
      txt('لمس کن تا روی پنکیک قبلی بیفتد',W/2,169,13,'#ba9b86','500');
      ctx.globalAlpha=.95;pancake(W/2,BASE_Y,214,5);pancake(W/2,BASE_Y-31,178,4);pancake(W/2,BASE_Y-62,144,1);drawCherry(W/2,BASE_Y-92);ctx.globalAlpha=1;
      ctx.fillStyle='#f7a40b';rr(72,518,W-144,58,17);ctx.fill();ctx.fillStyle='rgba(255,255,255,.20)';rr(72,518,W-144,9,17);ctx.fill();
      txt('برای شروع بزن 🥞',W/2,554,20,'#fff','900');txt('پنکیک پایه روی ظرف می‌ماند',W/2,610,12,'#a8836e','500');
    }else if(st==='over'){
      ctx.fillStyle='rgba(255,245,240,.72)';ctx.fillRect(0,0,W,H);
      txt('برجت افتاد! 🥞',W/2,195,39,'#ca5470','900');txt('امتیاز: '+FA(score),W/2,250,26,'#6d5c5d','800');
      txt('طبقه: '+FA(Math.max(0,stack.length-1)),W/2,284,18,'#8e7778','600');txt('رکورد: '+FA(Store.best(id)),W/2,317,18,'#ad6b3c','700');
      if(newBest)txt('✨ رکورد جدید!',W/2,355,20,'#d79729','900');ctx.globalAlpha=pulse;txt('برای بازی دوباره بزن',W/2,430,20,'#b96858','800');ctx.globalAlpha=1;
    }
  }

  function draw(){
    ctx.save();
    if(shake>0)ctx.translate((Math.random()-.5)*4*shake*8,(Math.random()-.5)*3*shake*8);
    const bg=ctx.createLinearGradient(0,0,0,H);bg.addColorStop(0,'#fff8d8');bg.addColorStop(.48,'#ffefd8');bg.addColorStop(1,'#ffdbe4');ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
    drawBubbles();drawPlate();

    for(const b of stack){
      const sy=b.y-cameraY;const sc=b.settle>0?1+Math.sin((1-b.settle)*Math.PI)*.035:1;
      pancake(b.x,sy,b.w,b.ci,.98,0,0,sc);
    }
    if(active)pancake(active.x,active.y-cameraY,active.w,active.ci,1,active.fall?active.rot:0,0,1);

    const top=stack[stack.length-1];
    if(top&&st!=='over')drawCherry(top.x,top.y-cameraY-PH/2-8);
    for(const p of parts){ctx.globalAlpha=clamp(p.l,0,1);ctx.fillStyle=p.c;rr(p.x,p.y-cameraY,p.s,p.s,2);ctx.fill();}
    ctx.globalAlpha=1;
    for(const r of rings){ctx.globalAlpha=r.l;ctx.strokeStyle=r.c;ctx.lineWidth=2;ctx.beginPath();ctx.arc(r.x,r.y-cameraY,r.r,0,Math.PI*2);ctx.stroke();}
    ctx.globalAlpha=1;
    for(const f of floats){ctx.globalAlpha=clamp(f.l,0,1);txt(f.s,f.x,f.y-cameraY,14,f.c,'900');}
    ctx.globalAlpha=1;

    drawHeader();
    if(st==='play'){
      txt('طبقه '+FA(Math.max(0,stack.length-1)),18,92,12,'#9d7e77','700','left');
      if(combo>1)txt('COMBO ×'+FA(combo),W-18,92,13,'#d17858','900','right');
    }
    if(dropFlash>0){ctx.globalAlpha=dropFlash*.20;ctx.fillStyle='#fff';ctx.fillRect(0,0,W,H);ctx.globalAlpha=1;}
    overlay();
    ctx.restore();
  }

  function dropJoystickHit(e){
    if(!e||e.clientX===undefined)return false;
    const x=px(e),y=py(e);
    return Math.hypot(x-(W-76),y-(H-76))<=50;
  }
  function down(e){
    if(Date.now()<lock)return;
    if(st==='ready'||st==='over'){start();return;}
    drop();
  }

  function key(k){
    if(k==='Space'||k==='Enter'){drop();return true;}
    return false;
  }

  function enter(){
    st='ready';score=0;combo=0;t=0;cameraY=0;cameraTarget=0;parts=[];floats=[];rings=[];newBest=false;lock=0;active=null;stack=[];round=0;dir=1;speed=118;
  }

  return{id,enter,start,update,draw,down,move(){},up(){},key,playing:()=>st==='play',idle:()=>st==='ready'||st==='over'};
})();
/* ================= NEON TRAFFIC ================= */
Games.traffic=(()=>{
  const id='traffic';
  const ROAD={left:52,right:428,top:0,bottom:H};
  const LANES=[120,240,360];
  const player={lane:1,x:LANES[1],y:548,w:56,h:94,tilt:0};
  const COLORS=['#ff4fd8','#ff8a3d','#49e9ff','#8cff7a','#9d7bff','#ffe36d'];
  let st='ready',score=0,dist=0,speed=280,spawnT=0,lock=0,newBest=false,nearMiss=0,t=0,shake=0;
  let cars=[],parts=[],roadScroll=0,lastLane=1,combo=0,flash=0;

  function reset(){
    score=0;dist=0;speed=280;spawnT=.55;lock=0;newBest=false;nearMiss=0;t=0;shake=0;roadScroll=0;lastLane=1;combo=0;flash=0;
    player.lane=1;player.x=LANES[1];player.tilt=0;cars=[];parts=[];
  }
  function enter(){reset();st='ready';Shell.score(0);Shell.info('🚦 آماده‌ای؟');}
  function start(){reset();Shell.begin();st='play';Shell.score(0);Shell.info('🚗 جاخالی بده!');sfx.launch();}
  function laneX(l){return LANES[clamp(l,0,2)]}
  function shift(dir){
    if(st==='ready'||st==='over'){start();return}
    if(st!=='play')return;
    const nl=clamp(player.lane+dir,0,2);
    if(nl!==player.lane){player.lane=nl;player.tilt=dir*.10;sfx.whoosh();burst(player.x,player.y+34,'#35f2ff',5,.7)}
  }
  function moveToX(x){
    if(st==='ready'||st==='over'){start();return}
    if(st!=='play')return;
    let best=0,bestD=Infinity;
    for(let i=0;i<LANES.length;i++){const d=Math.abs(x-LANES[i]);if(d<bestD){bestD=d;best=i}}
    if(best!==player.lane){const dir=best>player.lane?1:-1;player.lane=best;player.tilt=dir*.10;sfx.whoosh()}
  }
  function spawn(){
    const blocked=new Set(cars.filter(c=>c.y<180).map(c=>c.lane));
    let opts=[0,1,2].filter(l=>!blocked.has(l));
    if(!opts.length)opts=[0,1,2];
    const lane=opts[Math.floor(Math.random()*opts.length)];
    const w=48+Math.random()*8,h=82+Math.random()*12;
    const col=COLORS[Math.floor(Math.random()*COLORS.length)];
    const drift=(Math.random()-.5)*10;
    cars.push({lane,x:laneX(lane)+drift,y:-110,w,h,col,spd:speed*(.92+Math.random()*.22),passed:false,near:false,rot:(Math.random()-.5)*.02});
  }
  function burst(x,y,col,n=7,pow=1){
    if(GFX.particles===false)return;
    for(let i=0;i<n;i++){
      const a=Math.random()*Math.PI*2,s=(50+Math.random()*130)*pow;
      parts.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,r:1.5+Math.random()*2.5,life:.4+Math.random()*.45,col});
    }
    if(parts.length>90)parts.splice(0,parts.length-90);
  }
  function finish(){
    st='over';newBest=Shell.finish(score,'lose');lock=Date.now()+700;shake=8;sfx.over();
  }
  function hit(){
    flash=.18;shake=16;burst(player.x,player.y,'#ff4d6d',20,1.2);finish();
  }
  function update(dt){
    t+=dt;if(flash>0)flash-=dt;shake=Math.max(0,shake-dt*28);
    if(st!=='play')return;
    const targetX=laneX(player.lane);
    player.x+=(targetX-player.x)*Math.min(1,dt*22);
    player.tilt+=(0-player.tilt)*Math.min(1,dt*9);
    dist+=speed*dt;
    score=Math.floor(dist/8)+combo*20;
    const oldSpeed=speed;
    speed=Math.min(980,280+dist*.085);
    if(Math.floor(oldSpeed/80)!==Math.floor(speed/80))sfx.mile();
    Shell.score(score);Shell.info('⚡ سرعت '+FA(Math.round(speed))+' · کمبو ×'+FA(combo));
    roadScroll=(roadScroll+speed*dt)%80;
    spawnT-=dt;
    const gap=Math.max(.34,1.02-dist/90000)*(1+Math.min(0.12,cars.length*.01));
    if(spawnT<=0){spawn();spawnT=gap*(.78+Math.random()*.35)}

    for(const c of cars){
      c.y+=(c.spd+speed*.10)*dt;
      if(!c.passed&&c.y>player.y+player.h*.5){c.passed=true;score+=28;combo++;Shell.score(score);sfx.point();burst(c.x,c.y,'#7dffb0',4,.5)}
      const dx=Math.abs(c.x-player.x),dy=Math.abs((c.y+c.h*.12)-(player.y-player.h*.04));
      const hitX=(c.w+player.w)*.40,hitY=(c.h+player.h)*.39;
      if(dx<hitX&&dy<hitY){hit();break}
      if(!c.near&&c.y>player.y-24&&c.y<player.y+50&&dx<hitX*1.35){c.near=true;nearMiss++;score+=12;sfx.whoosh();}
      if(c.y>H+130){cars.splice(cars.indexOf(c),1);if(combo>0&&c.near===false)combo=Math.max(0,combo-1)}
    }
    for(const p of parts){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=200*dt;p.life-=dt}
    parts=parts.filter(p=>p.life>0);
  }
  function roundedCar(x,y,w,h,col,angle=0,playerCar=false){
    ctx.save();ctx.translate(x,y);ctx.rotate(angle);
    if(GFX.bloom){ctx.shadowColor=col;ctx.shadowBlur=playerCar?18:10}
    ctx.fillStyle='rgba(5,9,18,.88)';rr(-w/2,-h/2,w,h,14);ctx.fill();
    const body=ctx.createLinearGradient(0,-h/2,0,h/2);body.addColorStop(0,'#f7fbff');body.addColorStop(.08,col);body.addColorStop(.88,col);body.addColorStop(1,'#071322');
    ctx.fillStyle=body;rr(-w/2+4,-h/2+4,w-8,h-8,11);ctx.fill();
    ctx.fillStyle='rgba(130,240,255,.82)';rr(-w*.31,-h*.22,w*.62,h*.27,8);ctx.fill();
    ctx.fillStyle='rgba(15,26,42,.8)';rr(-w*.26,-h*.18,w*.52,h*.18,6);ctx.fill();
    ctx.fillStyle=playerCar?'#fff4a8':'#ff5f73';rr(-w*.30,h*.25,w*.16,7,3);ctx.fill();rr(w*.14,h*.25,w*.16,7,3);ctx.fill();
    ctx.fillStyle='rgba(255,255,255,.22)';rr(-w*.40,-h*.39,w*.12,h*.12,4);ctx.fill();rr(w*.28,-h*.39,w*.12,h*.12,4);ctx.fill();
    if(playerCar){ctx.strokeStyle='rgba(255,255,255,.85)';ctx.lineWidth=1.5;rr(-w/2+3,-h/2+3,w-6,h-6,12);ctx.stroke()}
    ctx.restore();
    ctx.shadowBlur=0;ctx.shadowColor='transparent';
  }
  function drawRoad(){
    const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#050716');g.addColorStop(1,'#0b1024');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
    ctx.fillStyle='rgba(53,242,255,.08)';ctx.fillRect(20,0,32,H);ctx.fillRect(428,0,32,H);
    ctx.fillStyle='#0a0d1b';ctx.fillRect(58,0,364,H);
    const grd=ctx.createLinearGradient(0,0,W,0);grd.addColorStop(0,'rgba(255,61,240,.04)');grd.addColorStop(.5,'rgba(53,242,255,.06)');grd.addColorStop(1,'rgba(255,61,240,.04)');ctx.fillStyle=grd;ctx.fillRect(60,0,360,H);
    ctx.strokeStyle='rgba(53,242,255,.55)';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(58,0);ctx.lineTo(58,H);ctx.moveTo(422,0);ctx.lineTo(422,H);ctx.stroke();
    ctx.setLineDash([28,30]);ctx.lineDashOffset=-roadScroll;ctx.strokeStyle='rgba(120,170,255,.38)';ctx.lineWidth=4;
    [180,300].forEach(x=>{ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke()});ctx.setLineDash([]);
    for(let i=0;i<8;i++){const y=(i*90+roadScroll*.8)%720-80;ctx.fillStyle='rgba(255,61,240,.18)';ctx.fillRect(62,y,5,42);ctx.fillStyle='rgba(53,242,255,.18)';ctx.fillRect(413,y+18,5,42)}
  }
  function draw(){
    drawRoad();
    const shakeX=shake?((Math.random()-.5)*shake):0,shakeY=shake?((Math.random()-.5)*shake):0;
    ctx.save();ctx.translate(shakeX,shakeY);
    for(const c of cars)roundedCar(c.x,c.y,c.w,c.h,c.col,c.rot,false);
    for(const p of parts){ctx.globalAlpha=Math.max(0,p.life*1.8);ctx.fillStyle=p.col;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill()}ctx.globalAlpha=1;
    roundedCar(player.x,player.y,player.w,player.h,'#35f2ff',player.tilt,true);
    ctx.restore();
    ctx.fillStyle='rgba(255,255,255,.035)';for(let y=0;y<H;y+=12)ctx.fillRect(0,y,W,1);
    txt('NEON TRAFFIC',W/2,28,17,'#9cf9ff','900');
    txt('⚡ '+FA(score),16,30,15,'#fff','800','left');
    txt('🚦 '+FA(Math.round(speed)),W-16,30,14,'#ff8de9','800','right');
    if(combo>=2)txt('کمبو ×'+FA(combo),W/2,61,15,'#ffe477','900');
    if(st==='ready'){
      dim(.62);txt('NEON TRAFFIC',W/2,168,42,'#57f6ff');txt('بین ماشین‌ها جاخالی بده',W/2,207,18,'#fff');
      txt('هرچه جلوتر بری، سرعت بالاتر می‌ره 🚀',W/2,240,14,'#b8c7ef','400');
      txt('لمس چپ و راست صفحه یا ← →',W/2,278,14,'#b8c7ef','400');
      txt('نزدیک رد بشی، کمبو و امتیاز بیشتر!',W/2,305,14,'#b8c7ef','400');
      const b=Store.get(id);txt('رکورد: '+FA(b.best),W/2,382,18,'#ffe477','700');
      const pulse=.65+.35*Math.sin(t*4);ctx.globalAlpha=pulse;txt('برای شروع بزن',W/2,460,24,'#fff','800');ctx.globalAlpha=1;
    }else if(st==='over'){
      dim(.68);txt('💥 تصادف!',W/2,190,42,'#ff6b81');txt('امتیاز: '+FA(score),W/2,236,25,'#fff','800');txt('رکورد: '+FA(Store.best(id)),W/2,271,17,'#ffe477');txt('نزدیک‌ردشدن: '+FA(nearMiss),W/2,301,14,'#b8c7ef','400');if(newBest)txt('🎉 رکورد جدید!',W/2,342,21,'#7dffb0');
      ctx.globalAlpha=.8+.2*Math.sin(t*4);txt('برای بازی دوباره بزن',W/2,430,20,'#fff','700');ctx.globalAlpha=1;
    }
    if(flash>0){ctx.fillStyle='rgba(255,90,120,'+clamp(flash*2.8,0,.35)+')';ctx.fillRect(0,0,W,H)}
  }
  function down(e){
    if(Date.now()<lock)return;
    if(e&&e.clientX!==undefined){const x=px(e),y=py(e);if(st==='play'||st==='ready'||st==='over'){if(y>H*.48&&x<W*.34)shift(-1);else if(y>H*.48&&x>W*.66)shift(1);else moveToX(x);return}}
    if(st==='ready'||st==='over')start();
  }
  function key(c){
    if(c==='ArrowLeft'||c==='KeyA'){shift(-1);return true}
    if(c==='ArrowRight'||c==='KeyD'){shift(1);return true}
    if(c==='ArrowUp'||c==='KeyW'){if(st==='ready'||st==='over')start();return true}
    return false;
  }
  return{id,enter,start,update,draw,down,move(e){if(e&&e.clientX!==undefined&&st==='play')moveToX(px(e));},up(){},key,playing:()=>st==='play',idle:()=>st==='ready'||st==='over'};
})();
/* ================= PACMAN embed ================= */
Games.pacman={id:'pacman',embed:true,norec:false,enter(){},update(){},draw(){},down(){},up(){},key(){return false},playing(){return embedRunStarted},idle(){return !embedRunStarted}};
Games.doodle={id:'doodle',embed:true,norec:false,enter(){},update(){},draw(){},down(){},up(){},key(){return false},playing(){return embedRunStarted},idle(){return !embedRunStarted}};
Games.amirshahi={id:'amirshahi',embed:true,norec:false,enter(){},update(){},draw(){},down(){},up(){},key(){return false},playing(){return embedRunStarted},idle(){return !embedRunStarted}};
Games.markhor={id:'markhor',embed:true,norec:false,enter(){},update(){},draw(){},down(){},up(){},key(){return false},playing(){return embedRunStarted},idle(){return !embedRunStarted}};
Games.hokm={id:'hokm',embed:true,norec:false,enter(){},update(){},draw(){},down(){},up(){},key(){return false},playing(){return embedRunStarted},idle(){return !embedRunStarted}};
Games.chaharbarg={id:'chaharbarg',embed:true,norec:false,enter(){},update(){},draw(){},down(){},up(){},key(){return false},playing(){return embedRunStarted},idle(){return !embedRunStarted}};
Games.cityrun={id:'cityrun',embed:true,norec:false,enter(){},update(){},draw(){},down(){},up(){},key(){return false},playing(){return embedRunStarted},idle(){return !embedRunStarted}};
/* ================= input ================= */
const px=e=>{const r=cv.getBoundingClientRect();return(e.clientX-r.left)/r.width*W};
const py=e=>{const r=cv.getBoundingClientRect();return(e.clientY-r.top)/r.height*H};
const touchControls=$('touchControls');
if(touchControls){
  const releaseTouch=()=>{if(cur&&cur.id==='dino'&&!paused&&cur.up)cur.up()};
  touchControls.addEventListener('pointerdown',e=>{
    const b=e.target.closest('button[data-key],button[data-action]');
    if(!b||!cur||paused)return;
    e.preventDefault();e.stopPropagation();audio();
    if(cur.id==='snake'&&b.dataset.key){if(!cur.playing()&&cur.down)cur.down();if(cur.key)cur.key(b.dataset.key);return;}
    if(cur.id==='dino'&&b.dataset.action==='jump'){if(cur.down)cur.down();return;}
    if(cur.id==='pancake'&&b.dataset.action==='drop'){if(cur.down)cur.down();return;}
  },{passive:false});
  touchControls.addEventListener('pointerup',e=>{e.preventDefault();e.stopPropagation();releaseTouch();},{passive:false});
  touchControls.addEventListener('pointercancel',e=>{e.preventDefault();e.stopPropagation();releaseTouch();},{passive:false});
}
$('play').addEventListener('pointerdown',e=>{
  if(!cur||cur.id!=='snake'||e.target===cv||e.target.closest('button'))return;
  audio();cur.down(e);
});
cv.addEventListener('pointerdown',e=>{
  if(!cur)return;
  audio();In.x=px(e);
  if(cur.id==='snake'&&cur.menu()){cur.down(e);return}
  if(paused){setPause(false);return}
  cur.down(e);
});
addEventListener('pointerup',()=>{if(cur&&!paused)cur.up()});
addEventListener('pointercancel',()=>{if(cur&&!paused)cur.up()});
addEventListener('pointermove',e=>{if(cur){In.x=px(e);if(cur.move)cur.move(e)}});
const ACT=['Space','Enter','ArrowUp','KeyW'];
addEventListener('keydown',e=>{
  if(e.target.tagName==='INPUT')return;
  if(document.body.classList.contains('locked'))return;
  if(!$('setp').hidden||!$('fixp').hidden||!$('iosp').hidden||!$('pasurp').hidden){if(e.code==='Escape')closeModals();return}
  if(cur&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Space'].includes(e.code))e.preventDefault();
  keys[e.code]=true;
  if(e.repeat)return;
  if(e.code==='KeyM'){toggleMute();return}
  if(!cur)return;
  if(!paused&&cur.key&&cur.key(e.code))return;
  if(ACT.includes(e.code)){audio();if(paused)setPause(false);else cur.down()}
  else if(e.code==='Escape'&&!paused&&!cur.playing())goHome();
  else if(e.code==='KeyP'||e.code==='Escape')togglePause();
});
addEventListener('keyup',e=>{
  keys[e.code]=false;
  if(cur&&!paused&&ACT.includes(e.code))cur.up();
});
async function toggleFullscreen(){
  if(!HASFS&&!(document.fullscreenElement||document.webkitFullscreenElement)){iosTip();return}
  try{
    const el=document.documentElement;
    if(document.fullscreenElement||document.webkitFullscreenElement){
      if(document.exitFullscreen)await document.exitFullscreen();
      else if(document.webkitExitFullscreen)document.webkitExitFullscreen();
    }else{
      if(el.requestFullscreen)await el.requestFullscreen();
      else if(el.webkitRequestFullscreen)await el.webkitRequestFullscreen();
    }
  }catch(e){}
  updateFsButtons();
}
async function ensureFullscreen(){
  if(document.fullscreenElement||document.webkitFullscreenElement)return;
  try{
    const el=document.documentElement;
    if(el.requestFullscreen)await el.requestFullscreen();
    else if(el.webkitRequestFullscreen)await el.webkitRequestFullscreen();
  }catch(e){}
  updateFsButtons();
}
function updateFsButtons(){
  const on=!!(document.fullscreenElement||document.webkitFullscreenElement);
  const label=on?'⛶ خروج':'⛶ تمام‌صفحه';
  const aria=on?'خروج از تمام‌صفحه':'تمام‌صفحه';
  const a=$('fsMenuBtn'),b=$('bf'),c=$('memoryFsToggle');
  if(a){a.textContent=label;a.setAttribute('aria-label',aria)}
  if(b){b.textContent='⛶';b.setAttribute('aria-label',aria)}
  if(c){c.textContent=label;c.setAttribute('aria-label',aria)}
}
$('fsMenuBtn').onclick=e=>{e.currentTarget.blur();toggleFullscreen()};
$('bf').onclick=e=>{e.currentTarget.blur();toggleFullscreen()};
$('memoryFsToggle').onclick=e=>{e.currentTarget.blur();toggleFullscreen()};
$('bh').onclick=e=>{e.currentTarget.blur();if(cur&&cur.confirmLeave&&!cur.confirmLeave())return;goHome()};
$('bp').onclick=e=>{togglePause();e.currentTarget.blur()};
$('bm').onclick=e=>{toggleMute();e.currentTarget.blur()};
addEventListener('fullscreenchange',updateFsButtons);
addEventListener('webkitfullscreenchange',updateFsButtons);
updateFsButtons();
ensureFullscreen();
addEventListener('pointerdown',()=>{ensureFullscreen()},{once:true,passive:true});
function autoPause(){if(cur&&cur.playing())setPause(true)}
document.addEventListener('visibilitychange',()=>{if(document.hidden){autoPause();Store.flush();Presence.mark(Store.pid(),false);Net.presence(false).catch(()=>{})}else{Net.presence(true).catch(()=>{})}});
addEventListener('blur',autoPause);
addEventListener('pagehide',()=>{Presence.mark(Store.pid(),false);Net.presence(false).catch(()=>{});if(cur&&cur.leave)cur.leave();Shell.leave();Store.flush()});
addEventListener('beforeunload',()=>{Presence.mark(Store.pid(),false);Net.presence(false).catch(()=>{});if(cur&&cur.leave)cur.leave();Shell.leave();Store.flush()});
/* ================= post fx (فقط در حالت بالا و پرو) ================= */
let vig=null,scan=null;
function postfx(){
  if(cur&&cur.id==='memory')return;
  if(GFX.fx<1&&!GFX.scan)return;
  if(!vig){
    vig=ctx.createRadialGradient(W/2,H/2,H*.38,W/2,H/2,H*.78);
    vig.addColorStop(0,'rgba(0,0,12,0)');vig.addColorStop(1,'rgba(0,0,12,.5)');
    const c=document.createElement('canvas');c.width=4;c.height=3;
    const x=c.getContext('2d');x.fillStyle='rgba(0,0,0,.22)';x.fillRect(0,0,4,1);
    scan=ctx.createPattern(c,'repeat');
  }
  ctx.fillStyle=vig;ctx.fillRect(0,0,W,H);
  if(GFX.scan&&scan){ctx.fillStyle=scan;ctx.fillRect(0,0,W,H)}
}
/* ================= وضعیت اینترنت ================= */
function updNet(){
  const on=navigator.onLine;
  $('net').textContent=on?'🟢 آنلاین':'🔴 آفلاین';
  const s=$('spNet');
  s.textContent=on?'🟢 اینترنت وصله':'🔴 اینترنت نداری؛ بازی ممکنه خراب بشه';
  s.className=on?'ok':'bad';
}
addEventListener('online',updNet);addEventListener('offline',updNet);updNet();
/* ================= ورود ================= */
const ISIOS=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1),ISSTD=navigator.standalone===true||matchMedia('(display-mode: standalone)').matches,HASFS=!!(document.documentElement.requestFullscreen||document.documentElement.webkitRequestFullscreen);
function iosTip(){let d=$('iosTip');if(!d){d=document.createElement('div');d.id='iosTip';d.style.cssText='position:fixed;left:12px;right:12px;bottom:max(14px,env(safe-area-inset-bottom));z-index:300;background:#101a3c;border:1px solid #35f2ff;color:#e8f4ff;padding:12px 14px;border-radius:14px;font-size:14px;line-height:1.9;text-align:center';d.textContent='📱 آیفون اجازه‌ی تمام‌صفحه‌ی مرورگر رو نمی‌ده. دکمه‌ی اشتراک‌گذاری (⬆️) رو بزن، «Add to Home Screen» رو انتخاب کن و بازی رو از آیکونش باز کن تا کاملاً تمام‌صفحه بشه.';d.onclick=()=>{d.hidden=true};document.body.appendChild(d)}d.hidden=false;clearTimeout(d._t);d._t=setTimeout(()=>{d.hidden=true},6500)}
(()=>{const go=$('spGo');if(!HASFS&&!ISSTD)$('spIos').hidden=false;
  go.onclick=async()=>{$('splash').hidden=true;document.body.classList.remove('locked');await ensureFullscreen();audio();sfx.ui();if(!$('nameBox').hidden)nin.focus()};
})();
/* ================= تنظیمات ================= */
const GFXN=[['low','سبک'],['med','متوسط'],['high','بالا'],['pro','پرو']];
const GFXD={
  low:'سبک‌ترین حالت: بدون انیمیشن پس‌زمینه و لرزش. مناسب گوشی‌های ضعیف و باتری کم.',
  med:'تعادل خوب بین زیبایی و سرعت. حالت پیشنهادی.',
  high:'نورپردازی، سایه‌ی لبه‌ها و انیمیشن‌های بیشتر.',
  pro:'همه‌ی افکت‌ها: درخشش، خطوط اسکن، ذرات بیشتر و بیشترین وضوح. فقط برای دستگاه‌های قوی.'
};
function hello(){$('hi').textContent='سلام '+Store.name()+'! یه بازی انتخاب کن. امتیازها و رکوردها ذخیره می‌شن.'}
function renderSet(){
  {const bi=$('bioIn');if(bi&&document.activeElement!==bi)bi.value=Pref.get('bio')||''}
  {const pp=$('photoPrev'),ph=Pref.get('photo');if(pp){pp.textContent='';if(okPhoto(ph)){const im=document.createElement('img');im.alt='';im.style.cssText='width:100%;height:100%;object-fit:cover';im.src=ph;pp.appendChild(im)}else pp.textContent='👾';$('photoDel').hidden=!okPhoto(ph)}}
  const seg=$('gfxSeg');seg.textContent='';
  const selected=Pref.get('gfx');
  for(const [k,nm] of GFXN){
    const b=document.createElement('button');
    b.className='ghost'+(selected===k?' on':'');b.textContent=nm;
    b.onclick=()=>{Pref.set('gfx',k);Pref.set('lag',0);applyGfx();sfx.ui();renderSet()};
    seg.appendChild(b);
  }
  $('gfxNote').textContent=Pref.get('lag')?'🚀 حالت ضدلگ فعاله؛ گرافیک مؤثر موقتاً روی کمترین فشار اجرا می‌شود.':GFXD[selected];
  updateLagButton();
  const b=Pref.get('bench');
  $('benchNote').textContent=b?benchmarkText(b):'هنوز تست قدرت دستگاه اجرا نشده.';
  $('sndBtn').textContent=muted?'🔇 صدا خاموشه (بزن تا روشن شه)':'🔊 صدا روشنه (بزن تا خاموش شه)';
  for(const [id,key] of [['optBloom','bloom'],['optParticles','particles'],['optShadows','shadows'],['optScan','scan'],['optBackground','background'],['optShake','shake']])$(id).checked=!!Pref.get(key);
  $('renderRange').value=Pref.get('render');$('renderValue').textContent=Number(Pref.get('render')).toFixed(2)+'×';
  $('fxRange').value=Pref.get('fx');$('fxValue').textContent=Number(Pref.get('fx')).toFixed(2);

}
const closeModals=()=>{$('setp').hidden=true;$('fixp').hidden=true;$('iosp').hidden=true;$('donatep').hidden=true;$('pasurp').hidden=true};
$('iosClose').onclick=closeModals;
function openPasurMenu(){$('pasurp').hidden=false}
$('pasurClose').onclick=()=>{audio();sfx.ui();closeModals()};
$('pasurp').addEventListener('click',e=>{if(e.target===$('pasurp'))closeModals()});
document.querySelectorAll('.pasurOpt').forEach(b=>b.onclick=()=>{audio();sfx.ui();const id=b.dataset.pasur;$('pasurp').hidden=true;openGame(id)});
$('donateClose').onclick=closeModals;
$('donatePinnedBtn').onclick=()=>{audio();sfx.ui();$('donatep').hidden=false};
$('setBtn').onclick=()=>{audio();sfx.ui();renderSet();$('setp').hidden=false};
$('setClose').onclick=closeModals;
$('sndBtn').onclick=()=>{toggleMute();sfx.ui();renderSet()};
$('bioSave').onclick=async()=>{const v=$('bioIn').value.replace(/\s+/g,' ').trim().slice(0,120),m=$('bioMsg');
  if(!Store.name()){m.textContent='اول اسمت رو ثبت کن';return}
  Pref.set('bio',v);sfx.ui();m.textContent='در حال ذخیره…';let ok=false;
  try{await Net.rpc('arcade_profile_upsert',{p_pid:Store.pid(),p_name:Store.name(),p_avatar:'👾'});ok=(await Net.rpc('arcade_set_bio',{p_pid:Store.pid(),p_bio:v}))===true}catch(e){}
  m.textContent=ok?'بیوگرافی ذخیره شد و همه می‌بینن ✔':'روی گوشی خودت ذخیره شد؛ سرور قبول نکرد (فایل SQL رو توی Supabase اجرا کردی؟)'};
async function savePhoto(v){const m=$('photoMsg');
  if(!Store.name()){m.textContent='اول اسمت رو ثبت کن';return}
  Pref.set('photo',v);renderSet();sfx.ui();m.textContent='در حال ذخیره…';let ok=false;
  try{await Net.rpc('arcade_profile_upsert',{p_pid:Store.pid(),p_name:Store.name(),p_avatar:'👾'});ok=(await Net.rpc('arcade_set_photo',{p_pid:Store.pid(),p_photo:v}))===true}catch(e){}
  m.textContent=ok?(v?'عکس ذخیره شد و همه می‌بینن ✔':'عکس حذف شد ✔'):'روی گوشی خودت ذخیره شد؛ سرور قبول نکرد (SQL عکس رو توی Supabase اجرا کردی؟)'}
$('photoPick').onclick=()=>$('photoFile').click();
$('photoFile').onchange=async e=>{const f=e.target.files&&e.target.files[0];e.target.value='';if(!f)return;
  const m=$('photoMsg');if(!/^image\//.test(f.type)){m.textContent='فقط فایل عکس';return}
  try{await savePhoto(await photoToJpeg(f))}catch(err){m.textContent='این عکس خونده نشد، یکی دیگه رو امتحان کن'}};
$('photoDel').onclick=()=>savePhoto('');
$('lagBtn').onclick=()=>{Pref.set('lag',Pref.get('lag')?0:1);applyGfx();sfx.ui();renderSet()};
for(const [id,key] of [['optBloom','bloom'],['optParticles','particles'],['optShadows','shadows'],['optScan','scan'],['optBackground','background'],['optShake','shake']])$(id).onchange=()=>{Pref.set(key,$(id).checked?1:0);applyGfx();sfx.ui();renderSet()};
$('renderRange').oninput=()=>{Pref.set('render',Number($('renderRange').value));applyGfx();$('renderValue').textContent=Number(Pref.get('render')).toFixed(2)+'×'};
$('fxRange').oninput=()=>{Pref.set('fx',Number($('fxRange').value));applyGfx();$('fxValue').textContent=Number(Pref.get('fx')).toFixed(2)};
$('autoTuneBtn').onclick=async()=>{
  const b=$('autoTuneBtn');b.classList.add('busy');b.textContent='⏱ در حال تست...';
  $('benchNote').textContent='دارم با رندر واقعی مرورگر، فریم‌ریت را اندازه می‌گیرم...';
  try{
    const r=await benchmarkDevice();
    Pref.set('gfx',r.tier);Pref.set('lag',0);applyGfx();sfx.clear();
    $('benchNote').textContent=benchmarkText(r);
  }catch(e){
    $('benchNote').textContent='تست دستگاه انجام نشد؛ از تنظیم دستی استفاده کن.';
  }
  b.classList.remove('busy');b.textContent='⚡ سنجش دوباره قدرت دستگاه';renderSet();
};
for(const m of['setp','fixp','iosp'])$(m).addEventListener('pointerdown',e=>{if(e.target===$(m))closeModals()});
/* ================= دکمه‌ی واقعی رفع باگ ================= */
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let fixing=false;
async function runRepair(){
  if(fixing)return;
  fixing=true;$('fixAgain').disabled=true;
  const box=$('fixLog');box.textContent='';
  let bad=0,fixed=0;
  const row=async(icon,msg)=>{
    const d=document.createElement('div');d.className='fx';d.textContent=icon+' '+msg;
    box.appendChild(d);await sleep(250);
  };
  try{
    /* ۱) حالت‌های گیرکرده */
    for(const k in keys)keys[k]=false;
    if(cur)Shell.leave();
    setPause(false);In.x=W/2;
    await row('✅','کلیدهای گیرکرده و حالت توقف پاک شد');
    /* ۲) ذخیره‌سازی و رکوردها */
    const r=Store.repair();
    if(r<0){bad++;await row('⚠️','ذخیره‌سازی مرورگر کار نمی‌کنه (شاید حالت خصوصیه). رکوردها فقط تا بستن صفحه می‌مونن.')}
    else if(r>0){fixed+=r;await row('🛠','داده‌ی خراب پیدا و درست شد ('+FA(r)+' مورد)')}
    else await row('✅','رکوردها و داده‌های ذخیره‌شده سالمه');
    /* ۳) صدا */
    try{if(AC)await AC.close()}catch(e){}
    AC=null;noiseBuf=null;
    if(audio())await row('✅','موتور صدا دوباره راه‌اندازی شد');
    else{bad++;await row('⚠️','این مرورگر صدای بازی رو پشتیبانی نمی‌کنه')}
    /* ۴) گرافیک */
    applyGfx();
    await row('✅',`بوم بازی و تنظیم گرافیک (${GFXN.find(x=>x[0]===GFX.k)?.[1]||GFX.k}) دوباره ساخته شد`);
    /* ۵) کش و نسخه‌ی قدیمی */
    let cleared=0;
    try{
      if('serviceWorker' in navigator){for(const reg of await navigator.serviceWorker.getRegistrations()){await reg.unregister();cleared++}}
      if(window.caches){for(const k of await caches.keys()){await caches.delete(k);cleared++}}
    }catch(e){}
    if(cleared){fixed+=cleared;await row('🛠','کش قدیمی پاک شد ('+FA(cleared)+' مورد)')}
    else await row('✅','کش قدیمی‌ای وجود نداشت');
    /* ۶) اسم */
    if(!Store.name()){bad++;await row('⚠️','اسمی ثبت نشده؛ از «تغییر اسم» یکی انتخاب کن')}
    /* ۷) اینترنت و سرور */
    if(!Net.on)await row('✅','رتبه‌بندی آنلاین تنظیم نشده؛ رکوردها محلی هستن');
    else if(!navigator.onLine){bad++;await row('⚠️','اینترنت نداری؛ رتبه‌بندی آنلاین کار نمی‌کنه و فقط رکوردهای همین دستگاه دیده می‌شه')}
    else{
      const ep=await Net.rpc('arcade_epoch',{});
      if(ep===null){bad++;await row('⚠️','به سرور رتبه‌بندی وصل نشد. چند دقیقه بعد دوباره امتحان کن.')}
      else await row('✅','اتصال به سرور رتبه‌بندی برقراره');
    }
    await row(bad?'⚠️':'🎉',bad?FA(bad)+' مورد نیاز به توجه خودت داره (بالا رو ببین)':(fixed?'تموم شد؛ همه‌چیز درست شد':'همه‌چیز سالمه'));
  }catch(e){
    bad++;await row('❌','خطای غیرمنتظره: '+(e&&e.message?e.message:e));
  }
  updNet();renderMenu();
  fixing=false;$('fixAgain').disabled=false;
}
function openFix(){audio();sfx.ui();$('setp').hidden=true;$('fixp').hidden=false;runRepair()}
$('fixBtn').onclick=openFix;
$('setFix').onclick=openFix;
$('fixAgain').onclick=runRepair;
$('fixClose').onclick=closeModals;
/* ================= loop ================= */
let last=0;
function frame(ts){
  const dt=Math.min(.033,(ts-last)/1000||0);last=ts;
  if(cur){
    if(!paused)cur.update(dt);
    ctx.setTransform(DPR,0,0,DPR,0,0);ctx.direction='rtl';ctx.globalAlpha=1;
    cur.draw();postfx();
    if(paused){dim(.6);txt('توقف',W/2,300,46,'#fff');txt('برای ادامه بزن',W/2,345,18,'#cfc4ff','400')}
  }
  requestAnimationFrame(frame);
}
const nin=$('nameIn'),PF=/[^آابپتثجچحخدذرزژسشصضطظعغفقکگلمنوهیئءأؤة\u200c ]/g;
nin.oninput=()=>{
  const n=nin.value.replace(/ي/g,'ی').replace(/ك/g,'ک'),c=n.replace(PF,'');
  $('nameErr').textContent=c!==n?'فقط حروف فارسی مجازه':'';
  if(c!==nin.value)nin.value=c;
};
async function saveName(){
  const v=nin.value.replace(/\s+/g,' ').trim();
  if(v.replace(/[\u200c ]/g,'').length<2){$('nameErr').textContent='اسمت رو (حداقل ۲ حرف فارسی) بنویس';nin.focus();return}
  const was=renaming;renaming=false;$('nameCancel').hidden=true;
  if(await Ban.checkName(v))return;
  Store.setName(v);audio();sfx.ui();
  if(was)await Net.rpc('arcade_rename',{p_pid:Store.pid(),p_name:v});
  $('nameBox').hidden=true;$('menu').hidden=false;renderMenu();
}
$('nameOk').onclick=saveName;
nin.onkeydown=e=>{if(e.key==='Enter')saveName()};
if(Store.name())renderMenu();
else{$('menu').hidden=true;$('nameBox').hidden=false}
requestAnimationFrame(frame);
})();
