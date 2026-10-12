
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
    try{const gf=$('gameFrame');if(gf)gf.srcdoc=''}catch(e){}
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
const EMBED_B64={chaharbarg:'PCFET0NUWVBFIGh0bWw+CjxodG1sIGxhbmc9ImZhIiBkaXI9InJ0bCI+CjxoZWFkPgo8bWV0YSBjaGFyc2V0PSJ1dGYtOCI+CjxtZXRhIG5hbWU9InZpZXdwb3J0IiBjb250ZW50PSJ3aWR0aD1kZXZpY2Utd2lkdGgsaW5pdGlhbC1zY2FsZT0xLHZpZXdwb3J0LWZpdD1jb3ZlciI+CjxtZXRhIG5hbWU9Im1vYmlsZS13ZWItYXBwLWNhcGFibGUiIGNvbnRlbnQ9InllcyI+PG1ldGEgbmFtZT0iYXBwbGUtbW9iaWxlLXdlYi1hcHAtY2FwYWJsZSIgY29udGVudD0ieWVzIj48bWV0YSBuYW1lPSJhcHBsZS1tb2JpbGUtd2ViLWFwcC1zdGF0dXMtYmFyLXN0eWxlIiBjb250ZW50PSJibGFjay10cmFuc2x1Y2VudCI+PG1ldGEgbmFtZT0idGhlbWUtY29sb3IiIGNvbnRlbnQ9IiMwYzNlMjUiPgo8dGl0bGU+2obZh9in2LEg2KjYsdqvINiv2Ygg2YbZgdix2Ycg2KLZhtmE2KfbjNmGPC90aXRsZT4KPGxpbmsgaHJlZj0iaHR0cHM6Ly9mb250cy5nb29nbGVhcGlzLmNvbS9jc3MyP2ZhbWlseT1WYXppcm1hdG46d2dodEA0MDA7NjAwOzgwMCZkaXNwbGF5PXN3YXAiIHJlbD0ic3R5bGVzaGVldCI+CjxzdHlsZT4KOnJvb3R7CiAgLS1nb2xkOiNlOGMyNmE7IC0tZ29sZDI6I2I4ODkyYjsgLS1pdm9yeTojZjdmMGRmOyAtLWNyaW1zb246I2IzMjYzZTsKICAtLW5vaXNlOnVybCgiZGF0YTppbWFnZS9zdmcreG1sLCUzQ3N2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPScyMjAnIGhlaWdodD0nMjIwJyUzRSUzQ2ZpbHRlciBpZD0nbiclM0UlM0NmZVR1cmJ1bGVuY2UgdHlwZT0nZnJhY3RhbE5vaXNlJyBiYXNlRnJlcXVlbmN5PScuODUnIG51bU9jdGF2ZXM9JzMnIHN0aXRjaFRpbGVzPSdzdGl0Y2gnLyUzRSUzQ2ZlQ29sb3JNYXRyaXggdmFsdWVzPScwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCAuMzggMCcvJTNFJTNDL2ZpbHRlciUzRSUzQ3JlY3Qgd2lkdGg9JzEwMCUyNScgaGVpZ2h0PScxMDAlMjUnIGZpbHRlcj0ndXJsKCUyM24pJy8lM0UlM0Mvc3ZnJTNFIik7CiAgLS1ncmFpbjp1cmwoImRhdGE6aW1hZ2Uvc3ZnK3htbCwlM0NzdmcgeG1sbnM9J2h0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnJyB3aWR0aD0nMzAwJyBoZWlnaHQ9JzMwMCclM0UlM0NmaWx0ZXIgaWQ9J3cnJTNFJTNDZmVUdXJidWxlbmNlIHR5cGU9J2ZyYWN0YWxOb2lzZScgYmFzZUZyZXF1ZW5jeT0nLjAwOCAuMjUnIG51bU9jdGF2ZXM9JzMnIHNlZWQ9JzQnLyUzRSUzQ2ZlQ29sb3JNYXRyaXggdmFsdWVzPScwIDAgMCAwIC4yIDAgMCAwIDAgLjEgMCAwIDAgMCAuMDMgMCAwIDAgLjYgMCcvJTNFJTNDL2ZpbHRlciUzRSUzQ3JlY3Qgd2lkdGg9JzEwMCUyNScgaGVpZ2h0PScxMDAlMjUnIGZpbHRlcj0ndXJsKCUyM3cpJy8lM0UlM0Mvc3ZnJTNFIik7CiAgLS1mZWx0OnZhcigtLW5vaXNlKSxyYWRpYWwtZ3JhZGllbnQoZWxsaXBzZSBhdCA1MCUgNDUlLCMyMzg2NGYgMCUsIzE3NjMzOSA1NSUsIzBjM2UyNSAxMDAlKTsKfQoqe2JveC1zaXppbmc6Ym9yZGVyLWJveDstd2Via2l0LXRhcC1oaWdobGlnaHQtY29sb3I6dHJhbnNwYXJlbnR9Cmh0bWwsYm9keXttYXJnaW46MDtoZWlnaHQ6MTAwJTtvdmVyZmxvdzpoaWRkZW59CmJvZHl7CiAgZm9udC1mYW1pbHk6VmF6aXJtYXRuLFRhaG9tYSxzeXN0ZW0tdWksc2Fucy1zZXJpZjtjb2xvcjp2YXIoLS1pdm9yeSk7YmFja2dyb3VuZDojMGIyYjFiOwogIHBhZGRpbmc6ZW52KHNhZmUtYXJlYS1pbnNldC10b3ApIGVudihzYWZlLWFyZWEtaW5zZXQtcmlnaHQpIGVudihzYWZlLWFyZWEtaW5zZXQtYm90dG9tKSBlbnYoc2FmZS1hcmVhLWluc2V0LWxlZnQpOwp9Ci5oaWRkZW57ZGlzcGxheTpub25lIWltcG9ydGFudH0KLnNjcmVlbntoZWlnaHQ6MTAwZHZofQpidXR0b257Zm9udC1mYW1pbHk6aW5oZXJpdDtjdXJzb3I6cG9pbnRlcn0KCi8qIC0tLS0tLS0tLS0gY2FyZHMgLS0tLS0tLS0tLSAqLwouY2FyZHsKICAtLWN3OjYycHg7d2lkdGg6dmFyKC0tY3cpO2FzcGVjdC1yYXRpbzo1Lzc7Ym9yZGVyLXJhZGl1czpjYWxjKHZhcigtLWN3KSouMDkpO2ZsZXg6bm9uZTtwb3NpdGlvbjpyZWxhdGl2ZTsKICBiYWNrZ3JvdW5kOmxpbmVhci1ncmFkaWVudCgxNDVkZWcsI2ZmZmRmNiwjZjFlN2NjKTsKICBib3gtc2hhZG93OjAgMXB4IDAgI2ZmZiBpbnNldCwwIDJweCA1cHggIzAwMDgsMCAwIDAgMXB4ICNiOWE2N2E7dXNlci1zZWxlY3Q6bm9uZTsKfQouY2FyZCBzdmd7d2lkdGg6MTAwJTtoZWlnaHQ6MTAwJTtkaXNwbGF5OmJsb2NrO2JvcmRlci1yYWRpdXM6aW5oZXJpdH0KLmNhcmQuYmFja3tiYWNrZ3JvdW5kOiNmZmZhZjB9CgovKiAtLS0tLS0tLS0tIGxvYmJ5IC0tLS0tLS0tLS0gKi8KI2xvYmJ5LCN3YWl0ewogIGJhY2tncm91bmQ6dmFyKC0tZmVsdCk7ZGlzcGxheTpmbGV4O2ZsZXgtZGlyZWN0aW9uOmNvbHVtbjthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OmNlbnRlcjsKICBnYXA6MTJweDtwYWRkaW5nOjIwcHg7dGV4dC1hbGlnbjpjZW50ZXI7b3ZlcmZsb3cteTphdXRvCn0KLmZhbntkaXNwbGF5OmZsZXg7ZGlyZWN0aW9uOmx0cjtoZWlnaHQ6MTE4cHg7YWxpZ24taXRlbXM6ZmxleC1lbmQ7bWFyZ2luLWJvdHRvbTo2cHh9Ci5mYW4gLmNhcmR7LS1jdzo2NHB4O21hcmdpbi1sZWZ0Oi0yNnB4O3RyYW5zZm9ybS1vcmlnaW46NTAlIDE0MCU7Ym94LXNoYWRvdzowIDRweCAxMHB4ICMwMDBhLDAgMCAwIDFweCAjYjlhNjdhfQouZmFuIC5jYXJkOmZpcnN0LWNoaWxke21hcmdpbi1sZWZ0OjB9Cmgxe2ZvbnQtc2l6ZTo0NHB4O21hcmdpbjowO2ZvbnQtd2VpZ2h0OjgwMDtjb2xvcjp2YXIoLS1nb2xkKTt0ZXh0LXNoYWRvdzowIDJweCAwICM1YTNkMDYsMCA2cHggMThweCAjMDAwYTtsaW5lLWhlaWdodDoxLjF9CmgxIHNtYWxse2Rpc3BsYXk6YmxvY2s7Zm9udC1zaXplOjE0cHg7Zm9udC13ZWlnaHQ6NDAwO2NvbG9yOiNjZmU4ZDY7dGV4dC1zaGFkb3c6bm9uZTttYXJnaW4tdG9wOjZweH0KaW5wdXR7CiAgZm9udC1mYW1pbHk6aW5oZXJpdDtmb250LXNpemU6MThweDtwYWRkaW5nOjEycHggMTRweDtib3JkZXItcmFkaXVzOjEycHg7Ym9yZGVyOjJweCBzb2xpZCAjMGIyYjFiOwogIGJhY2tncm91bmQ6I2ZmZmFmMDtjb2xvcjojMjIyO3dpZHRoOjEwMCU7bWF4LXdpZHRoOjMwMHB4O3RleHQtYWxpZ246Y2VudGVyO291dGxpbmU6bm9uZTtib3gtc2hhZG93OjAgMnB4IDZweCAjMDAwNiBpbnNldAp9CmlucHV0OmZvY3Vze2JvcmRlci1jb2xvcjp2YXIoLS1nb2xkKX0KLmJ0bnsKICBmb250LXNpemU6MThweDtmb250LXdlaWdodDo4MDA7cGFkZGluZzoxM3B4IDIycHg7Ym9yZGVyLXJhZGl1czoxMnB4O3dpZHRoOjEwMCU7bWF4LXdpZHRoOjMwMHB4O2JvcmRlcjoxcHggc29saWQgIzVhM2QwNjsKICBiYWNrZ3JvdW5kOmxpbmVhci1ncmFkaWVudCgjZjNkMjdkLCNjOTlhMzUpO2NvbG9yOiMyYTFiMDA7Ym94LXNoYWRvdzowIDNweCAwICM3YTU4MTAsMCA2cHggMTJweCAjMDAwNgp9Ci5idG46YWN0aXZle3RyYW5zZm9ybTp0cmFuc2xhdGVZKDJweCk7Ym94LXNoYWRvdzowIDFweCAwICM3YTU4MTB9Ci5idG46ZGlzYWJsZWR7b3BhY2l0eTouNn0KLmJ0bi5hbHR7YmFja2dyb3VuZDpyZ2JhKDAsMCwwLC4yOCk7Y29sb3I6dmFyKC0taXZvcnkpO2JvcmRlcjoycHggc29saWQgdmFyKC0tZ29sZCk7Ym94LXNoYWRvdzpub25lfQouZGl2aWRlcntjb2xvcjojYjlkOWMzO2ZvbnQtc2l6ZToxM3B4fQpkZXRhaWxze21heC13aWR0aDozMDBweDt3aWR0aDoxMDAlO2ZvbnQtc2l6ZToxM3B4O2NvbG9yOiNjZmU4ZDZ9CmRldGFpbHMgc3VtbWFyeXtjdXJzb3I6cG9pbnRlcjttYXJnaW4tYm90dG9tOjhweH0KZGV0YWlscyBpbnB1dHtmb250LXNpemU6MTNweDttYXJnaW4tYm90dG9tOjZweDtkaXJlY3Rpb246bHRyfQojY29kZXtmb250LXNpemU6NThweDtmb250LXdlaWdodDo4MDA7bGV0dGVyLXNwYWNpbmc6OHB4O2NvbG9yOnZhcigtLWdvbGQpO2RpcmVjdGlvbjpsdHI7dGV4dC1zaGFkb3c6MCAzcHggMTRweCAjMDAwYX0KLmhpbnR7Y29sb3I6I2NmZThkNjtmb250LXNpemU6MTRweDttYXgtd2lkdGg6MzAwcHg7bGluZS1oZWlnaHQ6MS45fQoKLyogLS0tLS0tLS0tLSBnYW1lIC0tLS0tLS0tLS0gKi8KI2dhbWV7ZGlzcGxheTpmbGV4O2ZsZXgtZGlyZWN0aW9uOmNvbHVtbjtwYWRkaW5nOjZweDtiYWNrZ3JvdW5kOiMwYTI0MTZ9Ci5mcmFtZXsKICBmbGV4OjE7bWluLWhlaWdodDowO2JvcmRlci1yYWRpdXM6MjRweDtwYWRkaW5nOjlweDsKICBiYWNrZ3JvdW5kOnZhcigtLWdyYWluKSxsaW5lYXItZ3JhZGllbnQoMTM1ZGVnLCM5YTZhMzUsIzViMzgxOCA2MCUsIzdhNGUyNCk7CiAgYm94LXNoYWRvdzowIDhweCAyNHB4ICMwMDBjLDAgMCAwIDFweCAjMmExNjA2LGluc2V0IDAgMnB4IDAgI2M4OWE2M2FhCn0KLmZlbHR7CiAgaGVpZ2h0OjEwMCU7Ym9yZGVyLXJhZGl1czoxNnB4O2JhY2tncm91bmQ6dmFyKC0tZmVsdCk7ZGlzcGxheTpmbGV4O2ZsZXgtZGlyZWN0aW9uOmNvbHVtbjtqdXN0aWZ5LWNvbnRlbnQ6c3BhY2UtYmV0d2VlbjsKICBwYWRkaW5nOjEwcHggOHB4IDhweDtwb3NpdGlvbjpyZWxhdGl2ZTtvdmVyZmxvdzpoaWRkZW47CiAgYm94LXNoYWRvdzppbnNldCAwIDAgNTBweCAjMDAwYixpbnNldCAwIDAgMCAycHggIzBhMzMyMAp9Ci50b3AsLmJvdHRvbXt0ZXh0LWFsaWduOmNlbnRlcjtwb3NpdGlvbjpyZWxhdGl2ZTt6LWluZGV4OjF9Ci5wbmFtZXtmb250LXNpemU6MTVweDtmb250LXdlaWdodDo2MDA7dGV4dC1zaGFkb3c6MCAxcHggM3B4ICMwMDB9Ci5jcm93bntjb2xvcjp2YXIoLS1nb2xkKX0KI29wcENhcmRze2Rpc3BsYXk6ZmxleDtqdXN0aWZ5LWNvbnRlbnQ6Y2VudGVyO2RpcmVjdGlvbjpsdHI7bWFyZ2luLXRvcDo2cHh9CiNvcHBDYXJkcyAuY2FyZHstLWN3OjM2cHg7bWFyZ2luLWxlZnQ6LTIxcHh9CiNvcHBDYXJkcyAuY2FyZDpmaXJzdC1jaGlsZHttYXJnaW4tbGVmdDowfQoubWlke2ZsZXg6MTtkaXNwbGF5OmZsZXg7ZmxleC1kaXJlY3Rpb246Y29sdW1uO2FsaWduLWl0ZW1zOmNlbnRlcjtqdXN0aWZ5LWNvbnRlbnQ6Y2VudGVyO2dhcDoxMHB4O3Bvc2l0aW9uOnJlbGF0aXZlO3otaW5kZXg6MX0KLm1pZDo6YmVmb3JlewogIGNvbnRlbnQ6IiI7cG9zaXRpb246YWJzb2x1dGU7aW5zZXQ6NiUgNCU7Ym9yZGVyLXJhZGl1czo1MCU7Ym9yZGVyOjJweCBzb2xpZCAjZThjMjZhNTU7ei1pbmRleDotMTsKICBiYWNrZ3JvdW5kOnVybCgiZGF0YTppbWFnZS9zdmcreG1sLCUzQ3N2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHZpZXdCb3g9Jy01MCAtNTAgMTAwIDEwMCclM0UlM0NnIGZpbGw9J25vbmUnIHN0cm9rZT0nJTIzZThjMjZhJyBzdHJva2Utb3BhY2l0eT0nLjIyJyBzdHJva2Utd2lkdGg9JzEnJTNFJTNDcmVjdCB4PSctMjQnIHk9Jy0yNCcgd2lkdGg9JzQ4JyBoZWlnaHQ9JzQ4Jy8lM0UlM0NyZWN0IHg9Jy0yNCcgeT0nLTI0JyB3aWR0aD0nNDgnIGhlaWdodD0nNDgnIHRyYW5zZm9ybT0ncm90YXRlKDQ1KScvJTNFJTNDY2lyY2xlIHI9JzEzJy8lM0UlM0NjaXJjbGUgcj0nNCcvJTNFJTNDL2clM0UlM0Mvc3ZnJTNFIikgY2VudGVyLzYyJSBuby1yZXBlYXQ7Cn0KLnNjb3JlYmFye2Rpc3BsYXk6ZmxleDtnYXA6OHB4O2FsaWduLWl0ZW1zOmNlbnRlcjtmbGV4LXdyYXA6d3JhcDtqdXN0aWZ5LWNvbnRlbnQ6Y2VudGVyO2ZvbnQtc2l6ZToxM3B4fQoucGlsbHtiYWNrZ3JvdW5kOiMwMDA4O2JvcmRlcjoxcHggc29saWQgI2U4YzI2YTY2O2JvcmRlci1yYWRpdXM6OTk5cHg7cGFkZGluZzo0cHggMTFweDtkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2dhcDo1cHh9Ci5waWxsIGJ7Y29sb3I6dmFyKC0tZ29sZCk7Zm9udC1zaXplOjE1cHh9Ci5waWxsIHN2Z3t3aWR0aDoxN3B4O2hlaWdodDoxN3B4fQojdGFibGV7ZGlzcGxheTpmbGV4O2dhcDoxNnB4O2FsaWduLWl0ZW1zOmNlbnRlcjtqdXN0aWZ5LWNvbnRlbnQ6Y2VudGVyO21pbi1oZWlnaHQ6MTI4cHh9Ci5zbG90e3dpZHRoOjg2cHg7YXNwZWN0LXJhdGlvOjUvNztib3JkZXItcmFkaXVzOjlweDtib3JkZXI6MnB4IGRhc2hlZCAjZThjMjZhNDA7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtqdXN0aWZ5LWNvbnRlbnQ6Y2VudGVyO2ZvbnQtc2l6ZToxMnB4O2NvbG9yOiNlOGMyNmE4OH0KLnNsb3Qub257Ym9yZGVyOjB9Ci5zbG90IC5jYXJkey0tY3c6ODZweDtib3gtc2hhZG93OjAgOHB4IDE0cHggIzAwMGEsMCAwIDAgMXB4ICNiOWE2N2F9Ci5zbG90IC5jYXJkLmZseS1tZXthbmltYXRpb246Zmx5TWUgLjI4cyBjdWJpYy1iZXppZXIoLjIsLjgsLjMsMSl9Ci5zbG90IC5jYXJkLmZseS1vcHB7YW5pbWF0aW9uOmZseU9wcCAuMjhzIGN1YmljLWJlemllciguMiwuOCwuMywxKX0KQGtleWZyYW1lcyBmbHlNZXtmcm9te3RyYW5zZm9ybTp0cmFuc2xhdGVZKDE1MHB4KSBzY2FsZSguNykgcm90YXRlKDhkZWcpO29wYWNpdHk6LjJ9dG97dHJhbnNmb3JtOm5vbmU7b3BhY2l0eToxfX0KQGtleWZyYW1lcyBmbHlPcHB7ZnJvbXt0cmFuc2Zvcm06dHJhbnNsYXRlWSgtMTUwcHgpIHNjYWxlKC43KSByb3RhdGUoLThkZWcpO29wYWNpdHk6LjJ9dG97dHJhbnNmb3JtOm5vbmU7b3BhY2l0eToxfX0KI3N0YXR1c3tmb250LXNpemU6MTdweDtmb250LXdlaWdodDo2MDA7bWluLWhlaWdodDoyOHB4O3RleHQtYWxpZ246Y2VudGVyO3RleHQtc2hhZG93OjAgMnB4IDRweCAjMDAwfQojc3RhdHVzLm1le2NvbG9yOnZhcigtLWdvbGQpfQojdHJ1bXBQaWNre2Rpc3BsYXk6ZmxleDtnYXA6MTBweH0KI3RydW1wUGljayBidXR0b257CiAgd2lkdGg6NjBweDtoZWlnaHQ6NjhweDtib3JkZXItcmFkaXVzOjEycHg7Ym9yZGVyOjJweCBzb2xpZCB2YXIoLS1nb2xkMik7cGFkZGluZzo4cHg7CiAgYmFja2dyb3VuZDpsaW5lYXItZ3JhZGllbnQoMTQ1ZGVnLCNmZmZkZjYsI2VmZTNjMik7Ym94LXNoYWRvdzowIDRweCA4cHggIzAwMGEKfQojdHJ1bXBQaWNrIGJ1dHRvbiBzdmd7d2lkdGg6MTAwJTtoZWlnaHQ6MTAwJX0KI3RydW1wUGljayBidXR0b246YWN0aXZle3RyYW5zZm9ybTpzY2FsZSguOTUpfQojaGFuZHtkaXNwbGF5OmZsZXg7anVzdGlmeS1jb250ZW50OmNlbnRlcjtkaXJlY3Rpb246bHRyO3BhZGRpbmc6MTZweCAwIDJweDttaW4taGVpZ2h0OjExMnB4fQojaGFuZCAuY2FyZHstLWN3OjYycHg7dHJhbnNmb3JtLW9yaWdpbjo1MCUgMTYwJTt0cmFuc2Zvcm06dHJhbnNsYXRlWSh2YXIoLS15LDApKSByb3RhdGUodmFyKC0tciwwZGVnKSk7dHJhbnNpdGlvbjp0cmFuc2Zvcm0gLjEycyxmaWx0ZXIgLjEyc30KI2hhbmQgLmNhcmQuZGlze2ZpbHRlcjpicmlnaHRuZXNzKC42Mil9CiNoYW5kIC5jYXJkLmNhbntjdXJzb3I6cG9pbnRlcjtib3gtc2hhZG93OjAgMCAwIDJweCB2YXIoLS1nb2xkKSwwIDNweCA4cHggIzAwMGF9CiNoYW5kIC5jYXJkLmNhbjpob3ZlciwjaGFuZCAuY2FyZC5jYW46YWN0aXZle3RyYW5zZm9ybTp0cmFuc2xhdGVZKGNhbGModmFyKC0teSwwcHgpIC0gMTZweCkpIHJvdGF0ZSh2YXIoLS1yLDBkZWcpKX0KI3RvYXN0ewogIHBvc2l0aW9uOmZpeGVkO3RvcDpjYWxjKDEwcHggKyBlbnYoc2FmZS1hcmVhLWluc2V0LXRvcCkpO2xlZnQ6NTAlO3RyYW5zZm9ybTp0cmFuc2xhdGVYKC01MCUpOwogIGJhY2tncm91bmQ6dmFyKC0tY3JpbXNvbik7Y29sb3I6I2ZmZjtwYWRkaW5nOjlweCAxNnB4O2JvcmRlci1yYWRpdXM6MTBweDtmb250LXNpemU6MTRweDt6LWluZGV4Ojk7bWF4LXdpZHRoOjkydnc7dGV4dC1hbGlnbjpjZW50ZXI7CiAgYm94LXNoYWRvdzowIDRweCAxMnB4ICMwMDA4Cn0KCi8qID09PT09IHY0OiBmdWxsc2NyZWVuIC8gdG9wIEhVRCAvIGFuaW1hdGlvbnMgPT09PT0gKi8KOnJvb3R7LS1zdzpjbGFtcCg3NnB4LG1pbigxMnZoLDI2dncpLDEzMHB4KX0KYm9keXtwYWRkaW5nOjA7YmFja2dyb3VuZDojMGMzZTI1fQojbG9iYnksI3dhaXR7cGFkZGluZzpjYWxjKDIwcHggKyBlbnYoc2FmZS1hcmVhLWluc2V0LXRvcCkpIDIwcHggY2FsYygyMHB4ICsgZW52KHNhZmUtYXJlYS1pbnNldC1ib3R0b20pKX0KI2dhbWV7cGFkZGluZzowO2JhY2tncm91bmQ6IzBhMjQxNn0KLmZyYW1le3BhZGRpbmc6MDtib3JkZXItcmFkaXVzOjA7YmFja2dyb3VuZDpub25lO2JveC1zaGFkb3c6bm9uZX0KLmZlbHR7Ym9yZGVyLXJhZGl1czowO2JveC1zaGFkb3c6aW5zZXQgMCAwIDkwcHggIzAwMGI7cGFkZGluZzpjYWxjKDZweCArIGVudihzYWZlLWFyZWEtaW5zZXQtdG9wKSkgY2FsYyg4cHggKyBlbnYoc2FmZS1hcmVhLWluc2V0LXJpZ2h0KSkgY2FsYyg4cHggKyBlbnYoc2FmZS1hcmVhLWluc2V0LWJvdHRvbSkpIGNhbGMoOHB4ICsgZW52KHNhZmUtYXJlYS1pbnNldC1sZWZ0KSl9Ci5zY3JlZW46bm90KC5oaWRkZW4pe2FuaW1hdGlvbjpzY3JJbiAuNDVzIGVhc2UgYmFja3dhcmRzfQpAa2V5ZnJhbWVzIHNjcklue2Zyb217b3BhY2l0eTowO3RyYW5zZm9ybTpzY2FsZSgxLjAzKX19Ci5odWR7cG9zaXRpb246cmVsYXRpdmU7ei1pbmRleDoyO3BhZGRpbmc6MCA0MHB4IDRweH0KLmh1ZCAuc2NvcmViYXJ7Z2FwOjZweDtmb250LXNpemU6MTJweH0KLmh1ZCAucGlsbHtwYWRkaW5nOjNweCAxMHB4O2JhY2tncm91bmQ6bGluZWFyLWdyYWRpZW50KCMwMDBhLCMwMDA2KTtiYWNrZHJvcC1maWx0ZXI6Ymx1cig2cHgpO3doaXRlLXNwYWNlOm5vd3JhcH0KLmh1ZCAucGlsbCBie2Rpc3BsYXk6aW5saW5lLWJsb2NrO2ZvbnQtc2l6ZToxNnB4fQouZnNie3Bvc2l0aW9uOmZpeGVkO3otaW5kZXg6MTI7dG9wOmNhbGMoOHB4ICsgZW52KHNhZmUtYXJlYS1pbnNldC10b3ApKTtsZWZ0OmNhbGMoOHB4ICsgZW52KHNhZmUtYXJlYS1pbnNldC1sZWZ0KSk7d2lkdGg6MzRweDtoZWlnaHQ6MzRweDtib3JkZXItcmFkaXVzOjEwcHg7Ym9yZGVyOjFweCBzb2xpZCAjZThjMjZhODg7YmFja2dyb3VuZDojMDAwODtjb2xvcjp2YXIoLS1nb2xkKTtmb250LXNpemU6MThweDtsaW5lLWhlaWdodDoxO3BhZGRpbmc6MDtiYWNrZHJvcC1maWx0ZXI6Ymx1cig2cHgpfQouZnNiOmFjdGl2ZXt0cmFuc2Zvcm06c2NhbGUoLjkpfQouc2xvdHt3aWR0aDp2YXIoLS1zdyk7cG9zaXRpb246cmVsYXRpdmV9Ci5zbG90IC5jYXJkey0tY3c6dmFyKC0tc3cpfQojdGFibGV7Z2FwOmNsYW1wKDEycHgsNHZ3LDI4cHgpO21pbi1oZWlnaHQ6Y2FsYyh2YXIoLS1zdykqMS40ICsgOHB4KX0KI29wcENhcmRzIC5jYXJkey0tY3c6Y2xhbXAoMzBweCw1dmgsNDhweCk7bWFyZ2luLWxlZnQ6Y2FsYyh2YXIoLS1jdykqLS41OCl9CiNzdGF0dXN7Zm9udC1zaXplOmNsYW1wKDE2cHgsMi40dmgsMjBweCl9Ci8qIGRlYWwgLyB0dXJuIC8gdHJpY2sgYW5pbWF0aW9ucyAqLwojaGFuZCAuY2FyZC5kZWFse2FuaW1hdGlvbjpkZWFsIC41NXMgY3ViaWMtYmV6aWVyKC4yLC44NSwuMywxKSBiYWNrd2FyZHM7YW5pbWF0aW9uLWRlbGF5OmNhbGModmFyKC0tZCwwKSo1NW1zKX0KQGtleWZyYW1lcyBkZWFse2Zyb217b3BhY2l0eTowO3RyYW5zZm9ybTp0cmFuc2xhdGVZKC01NXZoKSBzY2FsZSguNDUpIHJvdGF0ZSgtMjVkZWcpfX0KLmRlYWxve2FuaW1hdGlvbjpkZWFsbyAuNDVzIGN1YmljLWJlemllciguMiwuOCwuMywxKSBiYWNrd2FyZHM7YW5pbWF0aW9uLWRlbGF5OmNhbGModmFyKC0tZCwwKSo0MG1zKX0KQGtleWZyYW1lcyBkZWFsb3tmcm9te29wYWNpdHk6MDt0cmFuc2Zvcm06dHJhbnNsYXRlWSgtOTBweCkgc2NhbGUoLjUpIHJvdGF0ZSgxNWRlZyl9fQojaGFuZCAuY2FyZC5jYW46OmFmdGVye2NvbnRlbnQ6IiI7cG9zaXRpb246YWJzb2x1dGU7aW5zZXQ6LTJweDtib3JkZXItcmFkaXVzOmluaGVyaXQ7Ym94LXNoYWRvdzowIDAgMTRweCAzcHggI2U4YzI2YTtvcGFjaXR5OjA7YW5pbWF0aW9uOmdsb3cgMS42cyBlYXNlLWluLW91dCBpbmZpbml0ZTtwb2ludGVyLWV2ZW50czpub25lfQpAa2V5ZnJhbWVzIGdsb3d7NTAle29wYWNpdHk6Ljg1fX0KLmZlbHQ6OmJlZm9yZSwuZmVsdDo6YWZ0ZXJ7Y29udGVudDoiIjtwb3NpdGlvbjphYnNvbHV0ZTtsZWZ0OjA7cmlnaHQ6MDtwb2ludGVyLWV2ZW50czpub25lO29wYWNpdHk6MDt0cmFuc2l0aW9uOm9wYWNpdHkgLjRzO3otaW5kZXg6MH0KLmZlbHQ6OmJlZm9yZXt0b3A6MDtoZWlnaHQ6MzAlO2JhY2tncm91bmQ6cmFkaWFsLWdyYWRpZW50KGVsbGlwc2UgYXQgNTAlIDAsIzZmZDNmZjQ0LHRyYW5zcGFyZW50IDcwJSl9Ci5mZWx0OjphZnRlcntib3R0b206MDtoZWlnaHQ6MzYlO2JhY2tncm91bmQ6cmFkaWFsLWdyYWRpZW50KGVsbGlwc2UgYXQgNTAlIDEwMCUsI2U4YzI2YTY2LHRyYW5zcGFyZW50IDcwJSl9Ci5mZWx0W2RhdGEtdHVybj1vcHBdOjpiZWZvcmUsLmZlbHRbZGF0YS10dXJuPW1lXTo6YWZ0ZXJ7YW5pbWF0aW9uOmJyZWF0aGUgMS44cyBlYXNlLWluLW91dCBpbmZpbml0ZX0KQGtleWZyYW1lcyBicmVhdGhlezAlLDEwMCV7b3BhY2l0eToxfTUwJXtvcGFjaXR5Oi4zNX19Ci5zbG90LndpbiAuY2FyZHthbmltYXRpb246d2luUHVsc2UgLjhzIGVhc2UtaW4tb3V0IGluZmluaXRlIGFsdGVybmF0ZTt6LWluZGV4OjJ9CkBrZXlmcmFtZXMgd2luUHVsc2V7ZnJvbXt0cmFuc2Zvcm06c2NhbGUoMSk7Ym94LXNoYWRvdzowIDAgMCAzcHggdmFyKC0tZ29sZCksMCAwIDEycHggMnB4ICNlOGMyNmE5OX10b3t0cmFuc2Zvcm06c2NhbGUoMS4xKSB0cmFuc2xhdGVZKC00cHgpO2JveC1zaGFkb3c6MCAwIDAgM3B4IHZhcigtLWdvbGQpLDAgMCAzMHB4IDhweCAjZThjMjZhY2N9fQouc2xvdC5sb3NlIC5jYXJke2FuaW1hdGlvbjpub25lO3RyYW5zZm9ybTpzY2FsZSguOSk7ZmlsdGVyOmJyaWdodG5lc3MoLjU1KTt0cmFuc2l0aW9uOnRyYW5zZm9ybSAuM3MsZmlsdGVyIC4zc30KLnNsb3Qud2luOjphZnRlcntjb250ZW50OiLinKYiO3Bvc2l0aW9uOmFic29sdXRlO3RvcDotMThweDtsZWZ0OjUwJTt0cmFuc2Zvcm06dHJhbnNsYXRlWCgtNTAlKTtjb2xvcjp2YXIoLS1nb2xkKTtmb250LXNpemU6MjJweDthbmltYXRpb246c3BhcmtsZSAxcyBlYXNlLWluLW91dCBpbmZpbml0ZX0KQGtleWZyYW1lcyBzcGFya2xlezUwJXt0cmFuc2Zvcm06dHJhbnNsYXRlWCgtNTAlKSBzY2FsZSgxLjUpIHJvdGF0ZSgyMGRlZyk7b3BhY2l0eTouNn19Ci5naG9zdHthbmltYXRpb246c3dlZXAgLjU1cyBjdWJpYy1iZXppZXIoLjUsMCwuOCwuNCkgZm9yd2FyZHM7cG9pbnRlci1ldmVudHM6bm9uZTttYXJnaW46MH0KQGtleWZyYW1lcyBzd2VlcHt0b3t0cmFuc2Zvcm06dHJhbnNsYXRlWSh2YXIoLS1keSkpIHNjYWxlKC4zNSkgcm90YXRlKDI1ZGVnKTtvcGFjaXR5OjB9fQojdHJ1bXBQaWNrOm5vdCguaGlkZGVuKSBidXR0b257YW5pbWF0aW9uOnBvcCAuNDVzIGN1YmljLWJlemllciguMiwxLjQsLjQsMSkgYmFja3dhcmRzfQojdHJ1bXBQaWNrIGJ1dHRvbjpudGgtY2hpbGQoMil7YW5pbWF0aW9uLWRlbGF5Oi4wN3N9CiN0cnVtcFBpY2sgYnV0dG9uOm50aC1jaGlsZCgzKXthbmltYXRpb24tZGVsYXk6LjE0c30KI3RydW1wUGljayBidXR0b246bnRoLWNoaWxkKDQpe2FuaW1hdGlvbi1kZWxheTouMjFzfQpAa2V5ZnJhbWVzIHBvcHtmcm9te3RyYW5zZm9ybTpzY2FsZSgwKSByb3RhdGUoLTEyMGRlZyk7b3BhY2l0eTowfX0KI3RydW1wUGljayBidXR0b257dHJhbnNpdGlvbjp0cmFuc2Zvcm0gLjE1c30KI3RydW1wUGljayBidXR0b246aG92ZXJ7dHJhbnNmb3JtOnRyYW5zbGF0ZVkoLTRweCkgc2NhbGUoMS4wOCl9CiNhZ2Fpbjpub3QoLmhpZGRlbil7YW5pbWF0aW9uOnBvcCAuNXMgYmFja3dhcmRzfQouYmFubmVye3Bvc2l0aW9uOmZpeGVkO2xlZnQ6NTAlO3RvcDo0MiU7ei1pbmRleDozMDtwb2ludGVyLWV2ZW50czpub25lO2ZvbnQtc2l6ZTozNHB4O2ZvbnQtd2VpZ2h0OjgwMDtjb2xvcjp2YXIoLS1nb2xkKTt0ZXh0LXNoYWRvdzowIDNweCAwICM1YTNkMDYsMCA4cHggMjRweCAjMDAwO3doaXRlLXNwYWNlOm5vd3JhcH0KLyogbG9iYnkgKi8KLmZhbnthbmltYXRpb246Ym9iIDMuMnMgZWFzZS1pbi1vdXQgaW5maW5pdGV9CkBrZXlmcmFtZXMgYm9iezUwJXt0cmFuc2Zvcm06dHJhbnNsYXRlWSgtOHB4KX19Ci5mYW4gLmNhcmR7dHJhbnNmb3JtOnJvdGF0ZSh2YXIoLS1yLDBkZWcpKSB0cmFuc2xhdGVZKHZhcigtLXR5LDBweCkpO2FuaW1hdGlvbjpmYW5JbiAuOHMgY3ViaWMtYmV6aWVyKC4yLC45LC4zLDEuMikgYmFja3dhcmRzO2FuaW1hdGlvbi1kZWxheTpjYWxjKHZhcigtLWksMCkqMTAwbXMpfQpAa2V5ZnJhbWVzIGZhbklue2Zyb217b3BhY2l0eTowO3RyYW5zZm9ybTp0cmFuc2xhdGVZKDE0MHB4KSByb3RhdGUoMGRlZykgc2NhbGUoLjUpfX0KaDF7YW5pbWF0aW9uOnRpdGxlSW4gLjlzIGN1YmljLWJlemllciguMiwuOSwuMywxLjIpIC4ycyBiYWNrd2FyZHN9CkBrZXlmcmFtZXMgdGl0bGVJbntmcm9te29wYWNpdHk6MDt0cmFuc2Zvcm06dHJhbnNsYXRlWSgtMjBweCkgc2NhbGUoLjgpfX0KI2NvZGV7YW5pbWF0aW9uOmNvZGVJbiAuNnMgY3ViaWMtYmV6aWVyKC4yLDEuMywuNCwxKSBiYWNrd2FyZHMsZ2xvd1RleHQgMnMgZWFzZS1pbi1vdXQgLjZzIGluZmluaXRlfQpAa2V5ZnJhbWVzIGNvZGVJbntmcm9te29wYWNpdHk6MDt0cmFuc2Zvcm06c2NhbGUoLjQpfX0KQGtleWZyYW1lcyBnbG93VGV4dHs1MCV7dGV4dC1zaGFkb3c6MCAwIDI2cHggI2U4YzI2YX19Ci5idG57dHJhbnNpdGlvbjp0cmFuc2Zvcm0gLjFzLGJveC1zaGFkb3cgLjFzLGZpbHRlciAuMnN9Ci5idG46aG92ZXJ7ZmlsdGVyOmJyaWdodG5lc3MoMS4wOCl9CkBtZWRpYSAocHJlZmVycy1yZWR1Y2VkLW1vdGlvbjpyZWR1Y2UpeyosKjo6YmVmb3JlLCo6OmFmdGVye2FuaW1hdGlvbi1kdXJhdGlvbjouMDFtcyFpbXBvcnRhbnQ7YW5pbWF0aW9uLWl0ZXJhdGlvbi1jb3VudDoxIWltcG9ydGFudH19CgovKiA9PT09PSBDaGFoYXIgQmFyZyA9PT09PSAqLwojZmxvb3JXcmFwe3dpZHRoOjEwMCU7ZmxleDoxO2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OmNlbnRlcjttaW4taGVpZ2h0OjA7cG9zaXRpb246cmVsYXRpdmU7b3ZlcmZsb3c6aGlkZGVufQojZmxvb3J7ZGlzcGxheTpmbGV4O2ZsZXgtd3JhcDp3cmFwO2dhcDo3cHg7anVzdGlmeS1jb250ZW50OmNlbnRlcjthbGlnbi1jb250ZW50OmNlbnRlcjttYXgtd2lkdGg6MTAwJTttYXgtaGVpZ2h0OjEwMCU7cGFkZGluZzo2cHg7ZGlyZWN0aW9uOmx0cjtvdmVyZmxvdy15OmF1dG99CiNmbG9vcjplbXB0eTo6YmVmb3Jle2NvbnRlbnQ6ItmF24zYsiDYrtin2YTbjCDYp9iz2KoiO2NvbG9yOiNlOGMyNmE5OTtmb250LXNpemU6MTRweDtkaXJlY3Rpb246cnRsfQojZmxvb3IgLmNhcmR7LS1jdzp2YXIoLS1mdyw1MnB4KTtjdXJzb3I6cG9pbnRlcjt0cmFuc2l0aW9uOnRyYW5zZm9ybSAuMTZzLGJveC1zaGFkb3cgLjE2cyxmaWx0ZXIgLjE2c30KI2Zsb29yIC5jYXJkLm5ld3thbmltYXRpb246Zmxvb3JJbiAuMzhzIGN1YmljLWJlemllciguMiwuOSwuMywxLjIpIGJhY2t3YXJkc30KQGtleWZyYW1lcyBmbG9vcklue2Zyb217b3BhY2l0eTowO3RyYW5zZm9ybTp0cmFuc2xhdGVZKC03MHB4KSBzY2FsZSguNTUpIHJvdGF0ZSgtMTJkZWcpfX0KI2Zsb29yIC5jYXJkLnNlbHt0cmFuc2Zvcm06dHJhbnNsYXRlWSgtOXB4KSBzY2FsZSgxLjA3KTtib3gtc2hhZG93OjAgMCAwIDNweCB2YXIoLS1nb2xkKSwwIDAgMThweCA0cHggI2U4YzI2YWNjO3otaW5kZXg6Mn0KI2Zsb29yIC5jYXJkLmhpbnR7Ym94LXNoYWRvdzowIDAgMCAycHggIzdkZmZiMGFhLDAgMnB4IDZweCAjMDAwOH0KI2Zsb29yIC5jYXJkLnRha2V7Ym94LXNoYWRvdzowIDAgMCAzcHggIzdkZmZiMCwwIDAgMTZweCAzcHggIzdkZmZiMDk5O2FuaW1hdGlvbjp0YWtlR2xvdyAuOXMgZWFzZS1pbi1vdXQgaW5maW5pdGUgYWx0ZXJuYXRlfQpAa2V5ZnJhbWVzIHRha2VHbG93e3Rve3RyYW5zZm9ybTp0cmFuc2xhdGVZKC01cHgpfX0KI2Zsb29yLmxvY2tlZCAuY2FyZHtjdXJzb3I6ZGVmYXVsdH0KI2FjdHN7ZGlzcGxheTpmbGV4O2dhcDoxMHB4O2p1c3RpZnktY29udGVudDpjZW50ZXI7bWluLWhlaWdodDo0NnB4O2FsaWduLWl0ZW1zOmNlbnRlcn0KI2FjdHMgLmJ0bnt3aWR0aDphdXRvO21pbi13aWR0aDoxMThweDtwYWRkaW5nOjlweCAxNnB4O2ZvbnQtc2l6ZToxNnB4fQojYWN0cyAuYnRuOmRpc2FibGVke29wYWNpdHk6LjQ7Ym94LXNoYWRvdzpub25lfQojYWN0czpub3QoLmhpZGRlbikgLmJ0bnthbmltYXRpb246cG9wIC40cyBjdWJpYy1iZXppZXIoLjIsMS40LC40LDEpIGJhY2t3YXJkc30KI2hhbmQgLmNhcmQuc2Vse3RyYW5zZm9ybTp0cmFuc2xhdGVZKGNhbGModmFyKC0teSwwcHgpIC0gMjRweCkpIHJvdGF0ZSh2YXIoLS1yLDBkZWcpKTtib3gtc2hhZG93OjAgMCAwIDNweCB2YXIoLS1nb2xkKSwwIDAgMjBweCA1cHggI2U4YzI2YWNjO3otaW5kZXg6M30KI2hhbmQgLmNhcmQuY2Fue2N1cnNvcjpwb2ludGVyfQojaGFuZHtwYWRkaW5nLXRvcDozMHB4IWltcG9ydGFudH0KLm1vdmVGeHtwb3NpdGlvbjphYnNvbHV0ZTtsZWZ0OjUwJTt0b3A6NHB4O3RyYW5zZm9ybTp0cmFuc2xhdGVYKC01MCUpO2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7Z2FwOjZweDtiYWNrZ3JvdW5kOiMwMDBjO2JvcmRlcjoxcHggc29saWQgI2U4YzI2YTk5O2JvcmRlci1yYWRpdXM6MTRweDtwYWRkaW5nOjZweCAxMHB4O3otaW5kZXg6Njtwb2ludGVyLWV2ZW50czpub25lO2RpcmVjdGlvbjpsdHI7Ym94LXNoYWRvdzowIDZweCAxOHB4ICMwMDBhfQoubW92ZUZ4IC5jYXJkey0tY3c6MzZweH0KLm1vdmVGeCAubGJse2ZvbnQtc2l6ZToxMnB4O2NvbG9yOnZhcigtLWdvbGQpO2RpcmVjdGlvbjpydGw7d2hpdGUtc3BhY2U6bm93cmFwfQoubW92ZUZ4IC5hcnJ7Y29sb3I6dmFyKC0tZ29sZCk7Zm9udC1zaXplOjE2cHh9CiNoaW50e2ZvbnQtc2l6ZToxM3B4O2NvbG9yOiNjZmU4ZDY7bWluLWhlaWdodDoyMHB4O3RleHQtYWxpZ246Y2VudGVyO21heC13aWR0aDozMjBweDtsaW5lLWhlaWdodDoxLjZ9CiNzdW17cG9zaXRpb246YWJzb2x1dGU7aW5zZXQ6MDt6LWluZGV4OjE1O2JhY2tncm91bmQ6IzAwMGQ7YmFja2Ryb3AtZmlsdGVyOmJsdXIoNHB4KTtkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2p1c3RpZnktY29udGVudDpjZW50ZXI7cGFkZGluZzoxNHB4O2FuaW1hdGlvbjpzY3JJbiAuNHMgZWFzZSBiYWNrd2FyZHN9Ci5zdW1Cb3h7d2lkdGg6bWluKDEwMCUsMzYwcHgpO2JhY2tncm91bmQ6bGluZWFyLWdyYWRpZW50KDE2MGRlZywjMTQzZDI4LCMwYjI0MTgpO2JvcmRlcjoycHggc29saWQgdmFyKC0tZ29sZDIpO2JvcmRlci1yYWRpdXM6MThweDtwYWRkaW5nOjE0cHg7Ym94LXNoYWRvdzowIDEwcHggNDBweCAjMDAwfQouc3VtQm94IGgze21hcmdpbjowIDAgOHB4O2NvbG9yOnZhcigtLWdvbGQpO3RleHQtYWxpZ246Y2VudGVyO2ZvbnQtc2l6ZToyMHB4fQouc3VtQm94IHRhYmxle3dpZHRoOjEwMCU7Ym9yZGVyLWNvbGxhcHNlOmNvbGxhcHNlO2ZvbnQtc2l6ZToxNHB4fQouc3VtQm94IHRoLC5zdW1Cb3ggdGR7cGFkZGluZzo1cHggNHB4O3RleHQtYWxpZ246Y2VudGVyO2JvcmRlci1ib3R0b206MXB4IHNvbGlkICNlOGMyNmEyMn0KLnN1bUJveCB0ZDpmaXJzdC1jaGlsZCwuc3VtQm94IHRoOmZpcnN0LWNoaWxke3RleHQtYWxpZ246cmlnaHR9Ci5zdW1Cb3ggdHIudG90IHRke2NvbG9yOnZhcigtLWdvbGQpO2ZvbnQtd2VpZ2h0OjgwMDtmb250LXNpemU6MTdweDtib3JkZXItYm90dG9tOjB9Ci5zdW1Cb3ggdGQuentvcGFjaXR5Oi4zNX0KLnN1bUJveCAubm90ZXt0ZXh0LWFsaWduOmNlbnRlcjtmb250LXNpemU6MTJweDtjb2xvcjojY2ZlOGQ2O21hcmdpbi10b3A6OHB4fQouc3VtQm94IC5idG57bWFyZ2luOjEwcHggYXV0byAwO2Rpc3BsYXk6YmxvY2t9CiNydWxlc3twb3NpdGlvbjpmaXhlZDtpbnNldDowO3otaW5kZXg6NDA7YmFja2dyb3VuZDojMDAwZDtkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2p1c3RpZnktY29udGVudDpjZW50ZXI7cGFkZGluZzoxNnB4O2FuaW1hdGlvbjpzY3JJbiAuM3MgZWFzZSBiYWNrd2FyZHN9CiNydWxlcyAuYm94e3dpZHRoOm1pbigxMDAlLDM4MHB4KTttYXgtaGVpZ2h0Ojg4dmg7b3ZlcmZsb3c6YXV0bztiYWNrZ3JvdW5kOmxpbmVhci1ncmFkaWVudCgxNjBkZWcsIzE0M2QyOCwjMGIyNDE4KTtib3JkZXI6MnB4IHNvbGlkIHZhcigtLWdvbGQyKTtib3JkZXItcmFkaXVzOjE4cHg7cGFkZGluZzoxNnB4O2ZvbnQtc2l6ZToxNHB4O2xpbmUtaGVpZ2h0OjEuOTV9CiNydWxlcyBoM3ttYXJnaW46MCAwIDZweDtjb2xvcjp2YXIoLS1nb2xkKTt0ZXh0LWFsaWduOmNlbnRlcn0KI3J1bGVzIGxpe21hcmdpbi1ib3R0b206NHB4fQojcnVsZXMgdWx7cGFkZGluZzowIDE4cHggMCAwO21hcmdpbjowfQouZnNiLmhlbHB7bGVmdDphdXRvO3JpZ2h0OmNhbGMoOHB4ICsgZW52KHNhZmUtYXJlYS1pbnNldC1yaWdodCkpfQoucGlsbCAuZG90e2ZvbnQtc2l6ZToxMXB4O2NvbG9yOiNjZmU4ZDZ9Cjwvc3R5bGU+CjwvaGVhZD4KPGJvZHk+Cgo8IS0tIHNoYXJlZCBTVkcgc3ltYm9scyAtLT4KPHN2ZyB3aWR0aD0iMCIgaGVpZ2h0PSIwIiBzdHlsZT0icG9zaXRpb246YWJzb2x1dGUiIGFyaWEtaGlkZGVuPSJ0cnVlIj48ZGVmcz4KICA8c3ltYm9sIGlkPSJzSCIgdmlld0JveD0iMCAwIDEwMCAxMDAiPjxwYXRoIGZpbGw9ImN1cnJlbnRDb2xvciIgZD0iTTUwIDkyQzE4IDY2IDQgNTAgNCAzMUM0IDE1IDE2IDUgMjkgNUMzOSA1IDQ2IDEwIDUwIDE4QzU0IDEwIDYxIDUgNzEgNUM4NCA1IDk2IDE1IDk2IDMxQzk2IDUwIDgyIDY2IDUwIDkyWiIvPjwvc3ltYm9sPgogIDxzeW1ib2wgaWQ9InNEIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+PHBhdGggZmlsbD0iY3VycmVudENvbG9yIiBkPSJNNTAgM0M1OCAyNSA3NSA0MCA5MiA1MEM3NSA2MCA1OCA3NSA1MCA5N0M0MiA3NSAyNSA2MCA4IDUwQzI1IDQwIDQyIDI1IDUwIDNaIi8+PC9zeW1ib2w+CiAgPHN5bWJvbCBpZD0ic1MiIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48cGF0aCBmaWxsPSJjdXJyZW50Q29sb3IiIGQ9Ik01MCAzQzUwIDMgOTMgMzYgOTMgNjJDOTMgNzggODEgODcgNjggODdDNjAgODcgNTQgODMgNTIgNzdDNTMgODkgNTggOTQgNjcgOTdMMzMgOTdDNDIgOTQgNDcgODkgNDggNzdDNDYgODMgNDAgODcgMzIgODdDMTkgODcgNyA3OCA3IDYyQzcgMzYgNTAgMyA1MCAzWiIvPjwvc3ltYm9sPgogIDxzeW1ib2wgaWQ9InNDIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+PGcgZmlsbD0iY3VycmVudENvbG9yIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjI4IiByPSIyMiIvPjxjaXJjbGUgY3g9IjI2IiBjeT0iNjIiIHI9IjIyIi8+PGNpcmNsZSBjeD0iNzQiIGN5PSI2MiIgcj0iMjIiLz48cGF0aCBkPSJNNTAgNTBDNTAgNzggNDYgOTAgMzYgOThMNjQgOThDNTQgOTAgNTAgNzggNTAgNTBaIi8+PC9nPjwvc3ltYm9sPgogIDxwYXR0ZXJuIGlkPSJicCIgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj4KICAgIDxyZWN0IHdpZHRoPSIxMCIgaGVpZ2h0PSIxMCIgZmlsbD0iIzdkMWQyYyIvPgogICAgPHBhdGggZD0iTTUgMEwxMCA1TDUgMTBMMCA1WiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjYzk5NzNhIiBzdHJva2Utd2lkdGg9Ii42Ii8+CiAgICA8Y2lyY2xlIGN4PSI1IiBjeT0iNSIgcj0iMSIgZmlsbD0iI2U4YzI2YSIvPgogIDwvcGF0dGVybj4KPC9kZWZzPjwvc3ZnPgoKPGRpdiBpZD0idG9hc3QiIGNsYXNzPSJoaWRkZW4iPjwvZGl2Pgo8YnV0dG9uIGlkPSJmc0J0biIgY2xhc3M9ImZzYiIgYXJpYS1sYWJlbD0i2KrZhdin2YUg2LXZgdit2YciPuKbtjwvYnV0dG9uPgoKPGRpdiBpZD0idG9hc3QiIGNsYXNzPSJoaWRkZW4iPjwvZGl2Pgo8YnV0dG9uIGlkPSJmc0J0biIgY2xhc3M9ImZzYiIgYXJpYS1sYWJlbD0i2KrZhdin2YUg2LXZgdit2YciPuKbtjwvYnV0dG9uPgo8YnV0dG9uIGlkPSJoZWxwQnRuIiBjbGFzcz0iZnNiIGhlbHAiIGFyaWEtbGFiZWw9ItmC2YjYp9mG24zZhiI+2J88L2J1dHRvbj4KCjxkaXYgaWQ9ImxvYmJ5IiBjbGFzcz0ic2NyZWVuIj4KICA8ZGl2IGNsYXNzPSJmYW4iIGlkPSJmYW4iPjwvZGl2PgogIDxoMT7ahtmH2KfYsSDYqNix2q88c21hbGw+2b7Yp9iz2YjYsSDYr9mIINmG2YHYsdmH2Iwg2KLZhtmE2KfbjNmGINmIINio2K/ZiNmGINiq2KPYrtuM2LE8L3NtYWxsPjwvaDE+CiAgPGlucHV0IGlkPSJuYW1lSW4iIHBsYWNlaG9sZGVyPSLYp9iz2YUg2KrZiCIgbWF4bGVuZ3RoPSIxNCIgYXV0b2NvbXBsZXRlPSJvZmYiPgogIDxidXR0b24gY2xhc3M9ImJ0biIgaWQ9ImNyZWF0ZUJ0biI+2LPYp9iu2Kog2KfYqtin2YI8L2J1dHRvbj4KICA8ZGl2IGNsYXNzPSJkaXZpZGVyIj7bjNinINqp2K8g2KfYqtin2YIg2K/ZiNiz2KrYqiDYsdinINmI2KfYsdivINqp2YY8L2Rpdj4KICA8aW5wdXQgaWQ9ImNvZGVJbiIgcGxhY2Vob2xkZXI9Itqp2K8g27Ug2LHZgtmF24wiIGlucHV0bW9kZT0ibnVtZXJpYyIgbWF4bGVuZ3RoPSI1IiBhdXRvY29tcGxldGU9Im9mZiIgZGlyPSJsdHIiPgogIDxidXR0b24gY2xhc3M9ImJ0biBhbHQiIGlkPSJqb2luQnRuIj7ZiNix2YjYryDYqNmHINin2KrYp9mCPC9idXR0b24+CiAgPGJ1dHRvbiBjbGFzcz0iYnRuIGFsdCIgaWQ9InJ1bGVzQnRuIiBzdHlsZT0iZm9udC1zaXplOjE0cHg7cGFkZGluZzo5cHggMThweDtib3JkZXItd2lkdGg6MXB4Ij7wn5OWINmC2YjYp9mG24zZhiDYqNin2LLbjDwvYnV0dG9uPgo8L2Rpdj4KCjxkaXYgaWQ9IndhaXQiIGNsYXNzPSJzY3JlZW4gaGlkZGVuIj4KICA8ZGl2IGNsYXNzPSJoaW50Ij7aqdivINin2KrYp9mCINix2Kcg2KjYsdin24wg2K/ZiNiz2KrYqiDYqNmB2LHYs9iqPC9kaXY+CiAgPGRpdiBpZD0iY29kZSI+LS0tLS08L2Rpdj4KICA8YnV0dG9uIGNsYXNzPSJidG4gYWx0IiBpZD0iY29weUJ0biI+2qnZvtuMINqp2K88L2J1dHRvbj4KICA8ZGl2IGNsYXNzPSJoaW50Ij7YqNinINmI2LHZiNivINit2LHbjNmB2Iwg2KjYp9iy24wg2K7ZiNiv2qnYp9ixINi02LHZiNi5INmF24zigIzYtNmI2K8uINin24zZhiDYtdmB2K3ZhyDYsdinINmG2KjZhtivLjwvZGl2Pgo8L2Rpdj4KCjxkaXYgaWQ9ImdhbWUiIGNsYXNzPSJzY3JlZW4gaGlkZGVuIj4KICA8ZGl2IGNsYXNzPSJmcmFtZSI+PGRpdiBjbGFzcz0iZmVsdCIgaWQ9ImZlbHQiPgogICAgPGRpdiBjbGFzcz0iaHVkIj4KICAgICAgPGRpdiBjbGFzcz0ic2NvcmViYXIiPgogICAgICAgIDxzcGFuIGNsYXNzPSJwaWxsIj7Yp9mF2KrbjNin2LIgPGIgaWQ9InNjIj4wIDogMDwvYj4g2KfYsiA8c3BhbiBpZD0idGciPtuz27E8L3NwYW4+PC9zcGFuPgogICAgICAgIDxzcGFuIGNsYXNzPSJwaWxsIj7Yr9iz2KogPGIgaWQ9InJuIj4xPC9iPjwvc3Bhbj4KICAgICAgICA8c3BhbiBjbGFzcz0icGlsbCI+2qnYp9ix2KrigIzZh9inIDxiIGlkPSJjYyI+MCAtIDA8L2I+PC9zcGFuPgogICAgICAgIDxzcGFuIGNsYXNzPSJwaWxsIj7Ys9mI2LEgPGIgaWQ9InNyIj4wIC0gMDwvYj48L3NwYW4+CiAgICAgICAgPHNwYW4gY2xhc3M9InBpbGwiPvCfgqAgPGIgaWQ9ImRrIj4wPC9iPjwvc3Bhbj4KICAgICAgPC9kaXY+CiAgICA8L2Rpdj4KICAgIDxkaXYgY2xhc3M9InRvcCI+CiAgICAgIDxkaXYgY2xhc3M9InBuYW1lIiBpZD0ib3BwTmFtZSI+PC9kaXY+CiAgICAgIDxkaXYgaWQ9Im9wcENhcmRzIj48L2Rpdj4KICAgIDwvZGl2PgogICAgPGRpdiBjbGFzcz0ibWlkIj4KICAgICAgPGRpdiBpZD0iZmxvb3JXcmFwIj48ZGl2IGlkPSJmbG9vciI+PC9kaXY+PC9kaXY+CiAgICAgIDxkaXYgaWQ9InN0YXR1cyI+PC9kaXY+CiAgICAgIDxkaXYgaWQ9ImhpbnQiPjwvZGl2PgogICAgICA8ZGl2IGlkPSJhY3RzIiBjbGFzcz0iaGlkZGVuIj4KICAgICAgICA8YnV0dG9uIGNsYXNzPSJidG4iIGlkPSJjYXBCdG4iIGRpc2FibGVkPtio2q/bjNixPC9idXR0b24+CiAgICAgICAgPGJ1dHRvbiBjbGFzcz0iYnRuIGFsdCIgaWQ9ImRyb3BCdG4iIGRpc2FibGVkPtio24zZhtiv2KfYsjwvYnV0dG9uPgogICAgICA8L2Rpdj4KICAgICAgPGJ1dHRvbiBjbGFzcz0iYnRuIGhpZGRlbiIgaWQ9ImFnYWluIj7YqNin2LLbjCDYr9mI2KjYp9ix2Yc8L2J1dHRvbj4KICAgIDwvZGl2PgogICAgPGRpdiBjbGFzcz0iYm90dG9tIj4KICAgICAgPGRpdiBjbGFzcz0icG5hbWUiIGlkPSJteU5hbWUiPjwvZGl2PgogICAgICA8ZGl2IGlkPSJoYW5kIj48L2Rpdj4KICAgIDwvZGl2PgogICAgPGRpdiBpZD0ic3VtIiBjbGFzcz0iaGlkZGVuIj48L2Rpdj4KICA8L2Rpdj48L2Rpdj4KPC9kaXY+Cgo8ZGl2IGlkPSJydWxlcyIgY2xhc3M9ImhpZGRlbiI+PGRpdiBjbGFzcz0iYm94Ij4KICA8aDM+8J+TliDZgtmI2KfZhtuM2YYg2obZh9in2LEg2KjYsdqvICjZvtin2LPZiNixKTwvaDM+CiAgPHVsPgogICAgPGxpPtmH2LEg2YbZgdixINu0INqp2KfYsdiqINiv2KfYsdivINmIINu0INqp2KfYsdiqINix2Ygg2YXbjNiyINin2LPYqi4g2KjYpyDYqtmF2KfZhSDYtNiv2YYg2qnYp9ix2KrigIzZh9inINiv2YjYqNin2LHZhyDbtCDYqtinINu0INiq2Kcg2b7Yrti0INmF24zigIzYtNmI2K8uPC9saT4KICAgIDxsaT48Yj7aqdin2LHYqiDYudiv2K/bjDwvYj4gKNii2LM927Eg2KrYpyDbsduwKTog2YfYsSDaqdin2LHYqiDZhduM2LIg2qnZhyDYrNmF2LnYtCDYqNinINqp2KfYsdiq2ZAg2KrZiCA8Yj7bsduxPC9iPiDYtNmI2K8g2LHYpyDZhduM4oCM2q/bjNix24zYmyDZhdir2YTYp9mLINu0INio2Kcg27fYjCDbjNinINu0INio2Kcg27Ir27UuINqG2YbYryDYr9iz2KrZhyDYsdinINmH2YXigIzYstmF2KfZhiDZhduM4oCM2LTZiNivINqv2LHZgdiqLjwvbGk+CiAgICA8bGk+PGI+2LPYsdio2KfYsiAoSik8L2I+OiDZh9mF2YfigIzbjCDaqdin2LHYquKAjNmH2KfbjCDZhduM2LIg2LHYpyDZhduM4oCM2q/bjNix2K/YjCDYqNmH4oCM2KzYsiDYqNuM4oCM2KjbjCDZiCDYtNin2YcuPC9saT4KICAgIDxsaT48Yj7YqNuM4oCM2KjbjCAoUSk8L2I+INmB2YLYtyDYqNuM4oCM2KjbjCDZiCA8Yj7YtNin2YcgKEspPC9iPiDZgdmC2Lcg2LTYp9mHINmF24zigIzar9uM2LHYry48L2xpPgogICAgPGxpPtin2q/YsSDZhtqv24zYsduM2Iwg2qnYp9ix2KrYqiDYsdmI24wg2YXbjNiyINmF24zigIzZhdin2YbYry48L2xpPgogICAgPGxpPjxiPtiz2YjYsTwvYj46INin2q/YsSDYqNinINqv2LHZgdiq2YbYjCDZhduM2LIg2qnYp9mF2YTYp9mLINiu2KfZhNuMINi02YjYryAo2KjZh+KAjNis2LIg2KjYpyDYs9ix2KjYp9iyKSDbtSDYp9mF2KrbjNin2LIg2YXbjOKAjNqv24zYsduMLjwvbGk+CiAgICA8bGk+2KLYrtixINmH2LEg2K/Ys9iqOiDbtyDYrtin2Kwg24zYpyDYqNuM2LTYqtixID0g27fYjCDYr9mHINiu2LTYqiA9INuz2Iwg2K/ZiCDYrtin2KwgPSDbstiMINmH2LEg2KLYsyA9INux2Iwg2YfYsSDYs9ix2KjYp9iyID0g27HYjCDaqdin2LHYqiDYqNuM2LTYqtixID0g27MuPC9saT4KICAgIDxsaT7Yp9mI2YTbjNmGINmG2YHYsduMINqp2Ycg2KjZhyA8c3BhbiBpZD0idGcyIj7bs9uxPC9zcGFuPiDYp9mF2KrbjNin2LIg2KjYsdiz2K8g2KjYsdmG2K/ZhyDYp9iz2KouPC9saT4KICA8L3VsPgogIDxidXR0b24gY2xhc3M9ImJ0biIgaWQ9InJ1bGVzQ2xvc2UiIHN0eWxlPSJtYXJnaW46MTJweCBhdXRvIDA7ZGlzcGxheTpibG9jayI+2KjYp9i02Yc8L2J1dHRvbj4KPC9kaXY+PC9kaXY+Cgo8c2NyaXB0Pgpjb25zdCBTVUlUUz1bJ1MnLCdIJywnRCcsJ0MnXTsKbGV0IGFyY2FkZU1hdGNoU3RhcnRlZD1mYWxzZTtmdW5jdGlvbiBhcmNhZGVOb3RpZnkodHlwZSxzY29yZT0wLHdvbj1mYWxzZSl7aWYodHlwZT09PSdzdGFydCcpYXJjYWRlTWF0Y2hTdGFydGVkPXRydWU7dHJ5e2lmKHdpbmRvdy5wYXJlbnQhPT13aW5kb3cpd2luZG93LnBhcmVudC5wb3N0TWVzc2FnZSh7c291cmNlOidub3ZhLWFyY2FkZS1lbWJlZCcsZ2FtZTonY2hhaGFyYmFyZycsdHlwZSxzY29yZSx3b259LCcqJyl9Y2F0Y2goZSl7fX0KCmNvbnN0IE5BTUU9e1M6J9m+24zaqScsSDon2K/ZhCcsRDon2K7YtNiqJyxDOifar9i02YbbjNiyJ307CmNvbnN0IFJLPXsxMTonSicsMTI6J1EnLDEzOidLJywxNDonQSd9Owpjb25zdCBybD1yPT5SS1tyXXx8cjsKY29uc3QgJD1pZD0+ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoaWQpOwpjb25zdCBpc1JlZD1zPT5zPT09J0gnfHxzPT09J0QnOwpjb25zdCBub3JtPXM9PnMucmVwbGFjZSgvW9uwLdu5XS9nLGQ9PifbsNux27Lbs9u027Xbttu327jbuScuaW5kZXhPZihkKSkucmVwbGFjZSgvW9mgLdmpXS9nLGQ9PifZoNmh2aLZo9mk2aXZptmn2ajZqScuaW5kZXhPZihkKSkucmVwbGFjZSgvXEQvZywnJyk7CmNvbnN0IGVzYz1zPT5TdHJpbmcocykucmVwbGFjZSgvWyY8PiInXS9nLGM9Pih7JyYnOicmYW1wOycsJzwnOicmbHQ7JywnPic6JyZndDsnLCciJzonJnF1b3Q7JywiJyI6JyYjMzk7J31bY10pKTsKY29uc3QgUFJFRklYPSdjaGJhcmctJzsKZnVuY3Rpb24gbHMoayx2KXt0cnl7aWYodj09PXVuZGVmaW5lZClyZXR1cm4gbG9jYWxTdG9yYWdlLmdldEl0ZW0oayl8fCcnO2xvY2FsU3RvcmFnZS5zZXRJdGVtKGssdik7fWNhdGNoKGUpe3JldHVybiAnJ319CmZ1bmN0aW9uIHNzKGssdil7dHJ5e2lmKHY9PT11bmRlZmluZWQpcmV0dXJuIHNlc3Npb25TdG9yYWdlLmdldEl0ZW0oayl8fCcnO3Nlc3Npb25TdG9yYWdlLnNldEl0ZW0oayx2KTt9Y2F0Y2goZSl7cmV0dXJuICcnfX0KCi8qID09PT09PT09PT09PT09PT09IENhcmQgZ3JhcGhpY3MgPT09PT09PT09PT09PT09PT0gKi8KY29uc3Qgc3VpdFVzZT0ocyx4LHksc2l6ZSxyb3QpPT5gPHVzZSBocmVmPSIjcyR7c30iIHg9IiR7eC1zaXplLzJ9IiB5PSIke3ktc2l6ZS8yfSIgd2lkdGg9IiR7c2l6ZX0iIGhlaWdodD0iJHtzaXplfSIke3JvdD9gIHRyYW5zZm9ybT0icm90YXRlKDE4MCAke3h9ICR7eX0pImA6Jyd9Lz5gOwpjb25zdCBQSVBTPSgoKT0+ewogIGNvbnN0IEw9MzEsQz01MCxSPTY5OwogIGNvbnN0IHNpeD1bW0wsMzBdLFtSLDMwXSxbTCw3MF0sW1IsNzBdLFtMLDExMF0sW1IsMTEwXV07CiAgcmV0dXJuewogICAgMjpbW0MsMzBdLFtDLDExMF1dLDM6W1tDLDMwXSxbQyw3MF0sW0MsMTEwXV0sCiAgICA0OltbTCwzMF0sW1IsMzBdLFtMLDExMF0sW1IsMTEwXV0sNTpbW0wsMzBdLFtSLDMwXSxbQyw3MF0sW0wsMTEwXSxbUiwxMTBdXSwKICAgIDY6c2l4LDc6Wy4uLnNpeCxbQyw1MF1dLDg6Wy4uLnNpeCxbQyw1MF0sW0MsOTBdXSwKICAgIDk6W1tMLDMwXSxbUiwzMF0sW0wsNTddLFtSLDU3XSxbTCw4M10sW1IsODNdLFtMLDExMF0sW1IsMTEwXSxbQyw3MF1dLAogICAgMTA6W1tMLDMwXSxbUiwzMF0sW0wsNTddLFtSLDU3XSxbTCw4M10sW1IsODNdLFtMLDExMF0sW1IsMTEwXSxbNTAsNDNdLFs1MCw5N11dCiAgfTsKfSkoKTsKZnVuY3Rpb24gZmlndXJlKHIscm9iZSl7CiAgbGV0IGc9YDxwYXRoIGQ9Ik0yNCA2OUMyNCA1NSAzNCA0OSA1MCA0OUM2NiA0OSA3NiA1NSA3NiA2OVoiIGZpbGw9IiR7cm9iZX0iIHN0cm9rZT0iIzExMSIgc3Ryb2tlLXdpZHRoPSIuNiIvPgogIDxwYXRoIGQ9Ik01MCA0OUw1MCA2OSIgc3Ryb2tlPSIjZTViODRhIiBzdHJva2Utd2lkdGg9IjIiLz4KICA8cGF0aCBkPSJNMzAgNjlDMzAgNjAgMzYgNTUgNDIgNTNNNzAgNjlDNzAgNjAgNjQgNTUgNTggNTMiIHN0cm9rZT0iI2U1Yjg0YSIgc3Ryb2tlLXdpZHRoPSIxLjQiIGZpbGw9Im5vbmUiLz4KICA8ZWxsaXBzZSBjeD0iNTAiIGN5PSI0OSIgcng9IjkiIHJ5PSI0IiBmaWxsPSIjZmZmIiBzdHJva2U9IiM5OTkiIHN0cm9rZS13aWR0aD0iLjQiLz5gOwogIGlmKHI9PT0xMilnKz1gPHBhdGggZD0iTTQxIDMzQzMzIDM4IDMzIDUyIDM3IDYwTDQzIDUwTDQyIDM4WiIgZmlsbD0iIzZiM2UxZCIvPjxwYXRoIGQ9Ik01OSAzM0M2NyAzOCA2NyA1MiA2MyA2MEw1NyA1MEw1OCAzOFoiIGZpbGw9IiM2YjNlMWQiLz5gOwogIGlmKHI9PT0xMSlnKz1gPHBhdGggZD0iTTQxIDM0QzM4IDQwIDM5IDQ2IDQxIDQ4TDQzIDQwWiIgZmlsbD0iIzRhMmMxNCIvPjxwYXRoIGQ9Ik01OSAzNEM2MiA0MCA2MSA0NiA1OSA0OEw1NyA0MFoiIGZpbGw9IiM0YTJjMTQiLz5gOwogIGcrPWA8ZWxsaXBzZSBjeD0iNTAiIGN5PSIzOCIgcng9IjguNSIgcnk9IjEwIiBmaWxsPSIjZjNjZmE2IiBzdHJva2U9IiM2YjQ0MjMiIHN0cm9rZS13aWR0aD0iLjYiLz4KICA8Y2lyY2xlIGN4PSI0Ni41IiBjeT0iMzYuNSIgcj0iMSIvPjxjaXJjbGUgY3g9IjUzLjUiIGN5PSIzNi41IiByPSIxIi8+CiAgPHBhdGggZD0iTTUwIDM3LjVMNDkgNDFMNTEgNDEiIHN0cm9rZT0iI2E0NmEzYSIgc3Ryb2tlLXdpZHRoPSIuNSIgZmlsbD0ibm9uZSIvPgogIDxwYXRoIGQ9Ik00NyA0My41UTUwIDQ1LjUgNTMgNDMuNSIgc3Ryb2tlPSIjOGEyYjJiIiBzdHJva2Utd2lkdGg9Ii43IiBmaWxsPSJub25lIi8+YDsKICBpZihyPT09MTMpewogICAgZys9YDxwYXRoIGQ9Ik00MiA0MEM0MiA1NCA1OCA1NCA1OCA0MEM1NiA0NyA0NCA0NyA0MiA0MFoiIGZpbGw9IiNjZmM3YjQiIHN0cm9rZT0iIzZiNjM1NSIgc3Ryb2tlLXdpZHRoPSIuNSIvPgogICAgPHBhdGggZD0iTTQwIDMwTDQwIDIwTDQ1IDI1TDUwIDE3TDU1IDI1TDYwIDIwTDYwIDMwWiIgZmlsbD0iI2U4YjczYSIgc3Ryb2tlPSIjN2E1YTEwIiBzdHJva2Utd2lkdGg9Ii42Ii8+CiAgICA8Y2lyY2xlIGN4PSI1MCIgY3k9IjIzIiByPSIxLjUiIGZpbGw9IiNjNDI2M2UiLz48Y2lyY2xlIGN4PSI0MyIgY3k9IjI3IiByPSIxIiBmaWxsPSIjMmI2NmM0Ii8+PGNpcmNsZSBjeD0iNTciIGN5PSIyNyIgcj0iMSIgZmlsbD0iIzJiNjZjNCIvPmA7CiAgfWVsc2UgaWYocj09PTEyKXsKICAgIGcrPWA8cGF0aCBkPSJNNDEgMzFMNDIgMjNMNDYgMjdMNTAgMjFMNTQgMjdMNTggMjNMNTkgMzFaIiBmaWxsPSIjZThiNzNhIiBzdHJva2U9IiM3YTVhMTAiIHN0cm9rZS13aWR0aD0iLjYiLz4KICAgIDxjaXJjbGUgY3g9IjUwIiBjeT0iMjYiIHI9IjEuMyIgZmlsbD0iI2M0MjYzZSIvPgogICAgPHBhdGggZD0iTTQyIDUyUTUwIDU5IDU4IDUyIiBzdHJva2U9IiNlOGI3M2EiIHN0cm9rZS13aWR0aD0iMS4zIiBmaWxsPSJub25lIiBzdHJva2UtZGFzaGFycmF5PSIxLjYgMS40Ii8+YDsKICB9ZWxzZXsKICAgIGcrPWA8cGF0aCBkPSJNMzggMzFDMzggMjIgNjIgMjIgNjIgMzFRNTAgMjggMzggMzFaIiBmaWxsPSIke3JvYmV9IiBzdHJva2U9IiMxMTEiIHN0cm9rZS13aWR0aD0iLjUiLz4KICAgIDxwYXRoIGQ9Ik0zNiAzMlE1MCAyNyA2NiAzMlE2MCAzNSA1MCAzM1E0MCAzNSAzNiAzMloiIGZpbGw9IiNlOGI3M2EiIHN0cm9rZT0iIzdhNWExMCIgc3Ryb2tlLXdpZHRoPSIuNSIvPgogICAgPHBhdGggZD0iTTYwIDI2QzcwIDE2IDc2IDE4IDc0IDI2QzcwIDIyIDY2IDI0IDYyIDI4WiIgZmlsbD0iI2ZmZiIgc3Ryb2tlPSIjOTk5IiBzdHJva2Utd2lkdGg9Ii41Ii8+YDsKICB9CiAgcmV0dXJuIGc7Cn0KY29uc3QgZmFjZUNhY2hlPXt9OwpmdW5jdGlvbiBmYWNlU1ZHKGMpewogIGNvbnN0IGs9Yy5zK2MucjtpZihmYWNlQ2FjaGVba10pcmV0dXJuIGZhY2VDYWNoZVtrXTsKICBjb25zdCBjb2w9aXNSZWQoYy5zKT8nI2IzMjYzZSc6JyMxNjIwMmEnLGxhYmVsPXJsKGMuciksdGVuPWMucj09PTEwOwogIGNvbnN0IGNvcm5lcj1gPHRleHQgeD0iMTIiIHk9IiR7dGVuPzIyOjIzfSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1zaXplPSIke3Rlbj8xNjoyMH0iIGZvbnQtd2VpZ2h0PSI3MDAiIGZvbnQtZmFtaWx5PSJHZW9yZ2lhLCdUaW1lcyBOZXcgUm9tYW4nLHNlcmlmIiBmaWxsPSJjdXJyZW50Q29sb3IiIGxldHRlci1zcGFjaW5nPSIke3Rlbj8tMS41OjB9Ij4ke2xhYmVsfTwvdGV4dD4ke3N1aXRVc2UoYy5zLDEyLDM0LDEyKX1gOwogIGxldCBib2R5PScnOwogIGlmKGMucj09PTE0KXsKICAgIGJvZHk9c3VpdFVzZShjLnMsNTAsNzAsYy5zPT09J1MnPzY0OjU0KTsKICB9ZWxzZSBpZihjLnI+PTExKXsKICAgIGNvbnN0IHJvYmU9aXNSZWQoYy5zKT8nI2IzMjYzZSc6JyMxZDNmNzgnOwogICAgY29uc3QgaGFsZj1gJHtmaWd1cmUoYy5yLHJvYmUpfSR7c3VpdFVzZShjLnMsMzEsMjksMTEpfWA7CiAgICBib2R5PWA8cmVjdCB4PSIyMiIgeT0iMTciIHdpZHRoPSI1NiIgaGVpZ2h0PSIxMDYiIHJ4PSIzIiBmaWxsPSIjZmJmM2RjIiBzdHJva2U9IiNiODg5MmIiIHN0cm9rZS13aWR0aD0iMS4yIi8+CiAgICA8Zz4ke2hhbGZ9PC9nPjxnIHRyYW5zZm9ybT0icm90YXRlKDE4MCA1MCA3MCkiPiR7aGFsZn08L2c+CiAgICA8bGluZSB4MT0iMjIiIHkxPSI3MCIgeDI9Ijc4IiB5Mj0iNzAiIHN0cm9rZT0iI2I4ODkyYiIgc3Ryb2tlLXdpZHRoPSIuNiIvPmA7CiAgfWVsc2V7CiAgICBjb25zdCBzej1jLnI8PTY/MjI6MTk7CiAgICBib2R5PVBJUFNbYy5yXS5tYXAoKFt4LHldKT0+c3VpdFVzZShjLnMseCx5LHN6LHk+NzApKS5qb2luKCcnKTsKICB9CiAgY29uc3Qgc3ZnPWA8c3ZnIHZpZXdCb3g9IjAgMCAxMDAgMTQwIiBwcmVzZXJ2ZUFzcGVjdFJhdGlvPSJub25lIiBzdHlsZT0iY29sb3I6JHtjb2x9Ij48cmVjdCB4PSIyIiB5PSIyIiB3aWR0aD0iOTYiIGhlaWdodD0iMTM2IiByeD0iNiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZDljYmE4IiBzdHJva2Utd2lkdGg9Ii44Ii8+JHtjb3JuZXJ9PGcgdHJhbnNmb3JtPSJyb3RhdGUoMTgwIDUwIDcwKSI+JHtjb3JuZXJ9PC9nPiR7Ym9keX08L3N2Zz5gOwogIHJldHVybiBmYWNlQ2FjaGVba109c3ZnOwp9CmNvbnN0IEJBQ0tfU1ZHPWA8c3ZnIHZpZXdCb3g9IjAgMCAxMDAgMTQwIiBwcmVzZXJ2ZUFzcGVjdFJhdGlvPSJub25lIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjE0MCIgcng9IjciIGZpbGw9IiNmZmZhZjAiLz48cmVjdCB4PSI1IiB5PSI1IiB3aWR0aD0iOTAiIGhlaWdodD0iMTMwIiByeD0iNCIgZmlsbD0idXJsKCNicCkiIHN0cm9rZT0iI2M5OTczYSIgc3Ryb2tlLXdpZHRoPSIxLjIiLz48ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSg1MCA3MCkiPjxyZWN0IHg9Ii0xNyIgeT0iLTE3IiB3aWR0aD0iMzQiIGhlaWdodD0iMzQiIGZpbGw9IiM3ZDFkMmMiIHN0cm9rZT0iI2U4YzI2YSIvPjxyZWN0IHg9Ii0xNyIgeT0iLTE3IiB3aWR0aD0iMzQiIGhlaWdodD0iMzQiIGZpbGw9IiM3ZDFkMmMiIHN0cm9rZT0iI2U4YzI2YSIgdHJhbnNmb3JtPSJyb3RhdGUoNDUpIi8+PGNpcmNsZSByPSI5IiBmaWxsPSIjMTQ0MDRmIiBzdHJva2U9IiNlOGMyNmEiLz48Y2lyY2xlIHI9IjMuNSIgZmlsbD0iI2U4YzI2YSIvPjwvZz48L3N2Zz5gOwpmdW5jdGlvbiBjYXJkRWwoYyxleHRyYSl7CiAgY29uc3QgZD1kb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTsKICBkLmNsYXNzTmFtZT0nY2FyZCAnKyhleHRyYXx8JycpOwogIGQuaW5uZXJIVE1MPWZhY2VTVkcoYyk7CiAgcmV0dXJuIGQ7Cn0KZnVuY3Rpb24gYmFja0VsKCl7Y29uc3QgZD1kb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtkLmNsYXNzTmFtZT0nY2FyZCBiYWNrJztkLmlubmVySFRNTD1CQUNLX1NWRztyZXR1cm4gZDt9CgovKiBzb3VuZCAqLwpsZXQgQUM9bnVsbDsKZnVuY3Rpb24gc25hcCgpewogIHRyeXsKICAgIEFDPUFDfHxuZXcgKHdpbmRvdy5BdWRpb0NvbnRleHR8fHdpbmRvdy53ZWJraXRBdWRpb0NvbnRleHQpKCk7CiAgICBjb25zdCBuPUFDLnNhbXBsZVJhdGUqLjA3fDAsYj1BQy5jcmVhdGVCdWZmZXIoMSxuLEFDLnNhbXBsZVJhdGUpLGQ9Yi5nZXRDaGFubmVsRGF0YSgwKTsKICAgIGZvcihsZXQgaT0wO2k8bjtpKyspZFtpXT0oTWF0aC5yYW5kb20oKSoyLTEpKk1hdGgucG93KDEtaS9uLDQpOwogICAgY29uc3Qgcz1BQy5jcmVhdGVCdWZmZXJTb3VyY2UoKTtzLmJ1ZmZlcj1iOwogICAgY29uc3QgZj1BQy5jcmVhdGVCaXF1YWRGaWx0ZXIoKTtmLnR5cGU9J2hpZ2hwYXNzJztmLmZyZXF1ZW5jeS52YWx1ZT05MDA7CiAgICBjb25zdCBnPUFDLmNyZWF0ZUdhaW4oKTtnLmdhaW4udmFsdWU9LjU7CiAgICBzLmNvbm5lY3QoZik7Zi5jb25uZWN0KGcpO2cuY29ubmVjdChBQy5kZXN0aW5hdGlvbik7cy5zdGFydCgpOwogIH1jYXRjaChlKXt9Cn0KZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcigncG9pbnRlcmRvd24nLCgpPT57dHJ5e0FDPUFDfHxuZXcgKHdpbmRvdy5BdWRpb0NvbnRleHR8fHdpbmRvdy53ZWJraXRBdWRpb0NvbnRleHQpKCk7aWYoQUMuc3RhdGU9PT0nc3VzcGVuZGVkJylBQy5yZXN1bWUoKTt9Y2F0Y2goZSl7fX0pOwoKLyogPT09PT09PT09PT09PT09PT0gVUkgaGVscGVycyA9PT09PT09PT09PT09PT09PSAqLwpsZXQgdG9hc3RUPW51bGw7CmZ1bmN0aW9uIHNob3coaWQpe1snbG9iYnknLCd3YWl0JywnZ2FtZSddLmZvckVhY2gocz0+JChzKS5jbGFzc0xpc3QudG9nZ2xlKCdoaWRkZW4nLHMhPT1pZCkpO30KZnVuY3Rpb24gdG9hc3QobXNnLHN0aWNreSl7CiAgY29uc3QgdD0kKCd0b2FzdCcpO3QudGV4dENvbnRlbnQ9bXNnO3QuY2xhc3NMaXN0LnJlbW92ZSgnaGlkZGVuJyk7Y2xlYXJUaW1lb3V0KHRvYXN0VCk7CiAgaWYoIXN0aWNreSl0b2FzdFQ9c2V0VGltZW91dCgoKT0+dC5jbGFzc0xpc3QuYWRkKCdoaWRkZW4nKSw0NTAwKTsKfQpmdW5jdGlvbiBoaWRlVG9hc3QoKXtjbGVhclRpbWVvdXQodG9hc3RUKTskKCd0b2FzdCcpLmNsYXNzTGlzdC5hZGQoJ2hpZGRlbicpO30KZnVuY3Rpb24gbXlOYW1lKCl7cmV0dXJuICgkKCduYW1lSW4nKS52YWx1ZS50cmltKCl8fCfYqNin2LLbjNqp2YYnKS5zbGljZSgwLDE0KTt9CmZ1bmN0aW9uIGJ1c3koYil7JCgnY3JlYXRlQnRuJykuZGlzYWJsZWQ9YjskKCdqb2luQnRuJykuZGlzYWJsZWQ9YjskKCdjcmVhdGVCdG4nKS50ZXh0Q29udGVudD1iPyfYr9ixINit2KfZhCDYp9iq2LXYp9mELi4uJzon2LPYp9iu2Kog2KfYqtin2YInO30KCi8qID09PT09PT09PT09PT09PT09IEhvc3Q6IGF1dGhvcml0YXRpdmUgZ2FtZSBzdGF0ZSA9PT09PT09PT09PT09PT09PSAqLwpjb25zdCBUQVJHRVQ9MzE7CmxldCBpc0hvc3Q9ZmFsc2UsRz1udWxsLFY9bnVsbCxuYW1lcz1bJ9io2KfYstuM2qnZhiDbsScsJ9io2KfYstuM2qnZhiDbsiddOwpjb25zdCBjaWQ9Yz0+Yy5zK2MucjsKY29uc3QgaXNGYWNlPXI9PnI+PTExJiZyPD0xMzsKY29uc3QgdmFsPXI9PnI9PT0xND8xOnI7CmZ1bmN0aW9uIG5ld0RlY2soKXsKICBjb25zdCBkPVtdOwogIGZvcihjb25zdCBzIG9mIFNVSVRTKWZvcihsZXQgcj0yO3I8PTE0O3IrKylkLnB1c2goe3Mscn0pOwogIGZvcihsZXQgaT1kLmxlbmd0aC0xO2k+MDtpLS0pe2NvbnN0IGo9TWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpKihpKzEpKTtbZFtpXSxkW2pdXT1bZFtqXSxkW2ldXTt9CiAgcmV0dXJuIGQ7Cn0KZnVuY3Rpb24gcGFydGl0aW9uT0sodmFscyxuZWVkKXsKICBjb25zdCBuPXZhbHMubGVuZ3RoO2lmKCFufHxuZWVkPDEpcmV0dXJuIGZhbHNlOwogIGNvbnN0IHRvdD12YWxzLnJlZHVjZSgoYSxiKT0+YStiLDApO2lmKHRvdCVuZWVkKXJldHVybiBmYWxzZTsKICBpZih2YWxzLnNvbWUodj0+dj5uZWVkKSlyZXR1cm4gZmFsc2U7CiAgY29uc3QgZnVsbD0oMTw8biktMSxkcD1uZXcgSW50MTZBcnJheShmdWxsKzEpLmZpbGwoLTEpO2RwWzBdPTA7CiAgZm9yKGxldCBtPTA7bTw9ZnVsbDttKyspewogICAgaWYoZHBbbV08MCljb250aW51ZTsKICAgIGZvcihsZXQgaT0wO2k8bjtpKyspewogICAgICBpZihtJigxPDxpKSljb250aW51ZTsKICAgICAgY29uc3QgdD1kcFttXSt2YWxzW2ldOwogICAgICBpZih0PD1uZWVkKXtjb25zdCBubT1tfCgxPDxpKTtpZihkcFtubV08MClkcFtubV09dCVuZWVkO30KICAgIH0KICB9CiAgcmV0dXJuIGRwW2Z1bGxdPT09MDsKfQovKiByZXR1cm5zIGFycmF5IG9mIGZsb29yIGNhcmRzIHRoYXQgd291bGQgYmUgdGFrZW4sIG9yIG51bGwgaWYgaW52YWxpZCAqLwpmdW5jdGlvbiBldmFsQ2FwdHVyZShjYXJkLGZsb29yLHNlbCl7CiAgY29uc3Qgcj1jYXJkLnI7CiAgaWYocj09PTExKXtjb25zdCB0PWZsb29yLmZpbHRlcihjPT5jLnIhPT0xMiYmYy5yIT09MTMpO3JldHVybiB0Lmxlbmd0aD90Om51bGw7fQogIGlmKHI9PT0xMnx8cj09PTEzKXtyZXR1cm4oc2VsLmxlbmd0aD09PTEmJnNlbFswXS5yPT09cik/W3NlbFswXV06bnVsbDt9CiAgaWYoIXNlbC5sZW5ndGh8fHNlbC5zb21lKGM9PmlzRmFjZShjLnIpKSlyZXR1cm4gbnVsbDsKICBjb25zdCBuZWVkPTExLXZhbChyKTsKICByZXR1cm4gcGFydGl0aW9uT0soc2VsLm1hcChjPT52YWwoYy5yKSksbmVlZCk/c2VsLnNsaWNlKCk6bnVsbDsKfQpmdW5jdGlvbiBzdGFydEdhbWUoKXsKICBHPXtzY29yZTpbMCwwXSxmaXJzdDpNYXRoLnJhbmRvbSgpPC41PzA6MSxyb3VuZDowLHNlcTowLHdpbm5lcjpudWxsfTsKICBhcmNhZGVNYXRjaFN0YXJ0ZWQ9ZmFsc2U7YXJjYWRlTm90aWZ5KCdzdGFydCcpO3N0YXJ0Um91bmQoKTsKfQpmdW5jdGlvbiBzdGFydFJvdW5kKCl7CiAgRy5yb3VuZCsrO2lmKEcucm91bmQ+MSlHLmZpcnN0PTEtRy5maXJzdDsKICBHLmRlY2s9bmV3RGVjaygpO0cuaGFuZHM9W1tdLFtdXTtHLmNhcD1bW10sW11dO0cuc3VyPVswLDBdO0cubGFzdENhcD1udWxsO0cubGFzdD1udWxsO0cuc3VtPW51bGw7CiAgRy5mbG9vcj1HLmRlY2suc3BsaWNlKDAsNCk7CiAgbGV0IGd1YXJkPTA7CiAgd2hpbGUoRy5mbG9vci5zb21lKGM9PmMucj09PTExKSYmZ3VhcmQrKzw1MCl7CiAgICBmb3IobGV0IGk9MDtpPDQ7aSsrKWlmKEcuZmxvb3JbaV0ucj09PTExKXtHLmRlY2sucHVzaChHLmZsb29yW2ldKTtHLmZsb29yW2ldPUcuZGVjay5zaGlmdCgpO30KICB9CiAgRy5oYW5kc1swXT1HLmRlY2suc3BsaWNlKDAsNCk7Ry5oYW5kc1sxXT1HLmRlY2suc3BsaWNlKDAsNCk7CiAgRy50dXJuPUcuZmlyc3Q7Ry5waGFzZT0ncGxheSc7cHVzaCgpOwp9CmZ1bmN0aW9uIHBsYXkocCxpZCxjYXAsdGFrZUlkcyl7CiAgaWYoIUd8fEcucGhhc2UhPT0ncGxheSd8fEcudHVybiE9PXApcmV0dXJuOwogIGNvbnN0IGg9Ry5oYW5kc1twXSxpPWguZmluZEluZGV4KGM9PmNpZChjKT09PWlkKTsKICBpZihpPDApcmV0dXJuOwogIGNvbnN0IGM9aFtpXTtsZXQgdG9vaz1bXTsKICBpZihjYXApewogICAgY29uc3QgaWRzPW5ldyBTZXQoQXJyYXkuaXNBcnJheSh0YWtlSWRzKT90YWtlSWRzLm1hcChTdHJpbmcpOltdKTsKICAgIGNvbnN0IHNlbD1HLmZsb29yLmZpbHRlcih4PT5pZHMuaGFzKGNpZCh4KSkpOwogICAgdG9vaz1ldmFsQ2FwdHVyZShjLEcuZmxvb3Isc2VsKTsKICAgIGlmKCF0b29rKXtwdXNoKCk7cmV0dXJuO30KICB9CiAgaC5zcGxpY2UoaSwxKTsKICBjb25zdCBsYXN0PUcuaGFuZHNbMF0ubGVuZ3RoPT09MCYmRy5oYW5kc1sxXS5sZW5ndGg9PT0wJiZHLmRlY2subGVuZ3RoPT09MDsKICBsZXQgc3VyPWZhbHNlOwogIGlmKHRvb2subGVuZ3RoKXsKICAgIEcuZmxvb3I9Ry5mbG9vci5maWx0ZXIoeD0+IXRvb2suaW5jbHVkZXMoeCkpOwogICAgRy5jYXBbcF0ucHVzaChjLC4uLnRvb2spO0cubGFzdENhcD1wOwogICAgaWYoRy5mbG9vci5sZW5ndGg9PT0wJiZjLnIhPT0xMSYmIWxhc3Qpe3N1cj10cnVlO0cuc3VyW3BdKys7fQogIH1lbHNlIEcuZmxvb3IucHVzaChjKTsKICBHLnNlcSsrO0cubGFzdD17cCxjYXJkOmMsdG9vayxzdXIsc2VxOkcuc2VxfTsKICBpZihHLmhhbmRzWzBdLmxlbmd0aD09PTAmJkcuaGFuZHNbMV0ubGVuZ3RoPT09MCl7CiAgICBpZihHLmRlY2subGVuZ3RoPjApe0cuaGFuZHNbMF09Ry5kZWNrLnNwbGljZSgwLDQpO0cuaGFuZHNbMV09Ry5kZWNrLnNwbGljZSgwLDQpO0cudHVybj0xLXA7cHVzaCgpO30KICAgIGVsc2UgZW5kUm91bmQoKTsKICAgIHJldHVybjsKICB9CiAgRy50dXJuPTEtcDtwdXNoKCk7Cn0KZnVuY3Rpb24gdGFsbHkocCl7CiAgY29uc3QgYz1HLmNhcFtwXTsKICByZXR1cm57Y2FyZHM6Yy5sZW5ndGgsY2x1YnM6Yy5maWx0ZXIoeD0+eC5zPT09J0MnKS5sZW5ndGgsdGVuRDpjLnNvbWUoeD0+eC5zPT09J0QnJiZ4LnI9PT0xMCksdHdvQzpjLnNvbWUoeD0+eC5zPT09J0MnJiZ4LnI9PT0yKSwKICAgIGFjZXM6Yy5maWx0ZXIoeD0+eC5yPT09MTQpLmxlbmd0aCxqYWNrczpjLmZpbHRlcih4PT54LnI9PT0xMSkubGVuZ3RoLHN1cjpHLnN1cltwXX07Cn0KZnVuY3Rpb24gZW5kUm91bmQoKXsKICBpZihHLmZsb29yLmxlbmd0aCYmRy5sYXN0Q2FwIT09bnVsbCl7Ry5jYXBbRy5sYXN0Q2FwXS5wdXNoKC4uLkcuZmxvb3IpO30KICBHLmZsb29yPVtdOwogIGNvbnN0IHQ9W3RhbGx5KDApLHRhbGx5KDEpXSxiPVswLDFdLm1hcChwPT57CiAgICBjb25zdCBhPXRbcF0sbz10WzEtcF07CiAgICBjb25zdCB4PXtjbHViczphLmNsdWJzPj03Pzc6MCx0ZW5EOmEudGVuRD8zOjAsdHdvQzphLnR3b0M/MjowLGFjZXM6YS5hY2VzLGphY2tzOmEuamFja3MsY2FyZHM6YS5jYXJkcz5vLmNhcmRzPzM6MCxzdXI6YS5zdXIqNSxuOntjbHViczphLmNsdWJzLGNhcmRzOmEuY2FyZHN9fTsKICAgIHgudG90YWw9eC5jbHVicyt4LnRlbkQreC50d29DK3guYWNlcyt4LmphY2tzK3guY2FyZHMreC5zdXI7cmV0dXJuIHg7CiAgfSk7CiAgRy5zY29yZVswXSs9YlswXS50b3RhbDtHLnNjb3JlWzFdKz1iWzFdLnRvdGFsO0cuc3VtPWI7Ry50dXJuPW51bGw7CiAgY29uc3QgczA9Ry5zY29yZVswXSxzMT1HLnNjb3JlWzFdOwogIGlmKChzMD49VEFSR0VUfHxzMT49VEFSR0VUKSYmczAhPT1zMSl7Ry53aW5uZXI9czA+czE/MDoxO0cucGhhc2U9J292ZXInO3B1c2goKTt9CiAgZWxzZXtHLnBoYXNlPSdyb3VuZEVuZCc7cHVzaCgpO3NldFRpbWVvdXQoKCk9PntpZihHJiZHLnBoYXNlPT09J3JvdW5kRW5kJylzdGFydFJvdW5kKCk7fSw5MDAwKTt9Cn0KZnVuY3Rpb24gdmlld0ZvcihwKXsKICBjb25zdCBvPTEtcCxsPUcubGFzdDsKICByZXR1cm57eW91OnAsbmFtZXMscGhhc2U6Ry5waGFzZSxmaXJzdDpHLmZpcnN0LHR1cm46Ry50dXJuLGZsb29yOkcuZmxvb3IsaGFuZDpHLmhhbmRzW3BdLG9wcDpHLmhhbmRzW29dLmxlbmd0aCxkZWNrOkcuZGVjay5sZW5ndGgsCiAgICBjYXA6W0cuY2FwW3BdLmxlbmd0aCxHLmNhcFtvXS5sZW5ndGhdLHN1cjpbRy5zdXJbcF0sRy5zdXJbb11dLHNjb3JlOltHLnNjb3JlW3BdLEcuc2NvcmVbb11dLHJvdW5kOkcucm91bmQsdGFyZ2V0OlRBUkdFVCwKICAgIGxhc3Q6bD97cDpsLnAsY2FyZDpsLmNhcmQsdG9vazpsLnRvb2ssc3VyOmwuc3VyLHNlcTpsLnNlcX06bnVsbCwKICAgIHN1bTpHLnN1bT97bWU6Ry5zdW1bcF0sb3BwOkcuc3VtW29dfTpudWxsLAogICAgd2lubmVyOkcud2lubmVyPT09bnVsbD9udWxsOihHLndpbm5lcj09PXA/J21lJzonb3BwJyl9Owp9CmZ1bmN0aW9uIHB1c2goKXsKICByZW5kZXIodmlld0ZvcigwKSk7CiAgaWYoZ3Vlc3RDaWQpc2VuZCh7dDondicsdjp2aWV3Rm9yKDEpLHRvOmd1ZXN0Q2lkfSk7Cn0KZnVuY3Rpb24gb25BY3Rpb24ocCxtKXsKICBpZihtLnQ9PT0ncGxheScpcGxheShwLFN0cmluZyhtLmlkKSwhIW0uY2FwLG0udGFrZSk7CiAgZWxzZSBpZihtLnQ9PT0ncmVtYXRjaCcpe2lmKEcmJkcucGhhc2U9PT0nb3Zlcicpc3RhcnRHYW1lKCk7fQp9CmZ1bmN0aW9uIGFjdChtKXsKICBpZihpc0hvc3Qpb25BY3Rpb24oMCxtKTsKICBlbHNlIHNlbmQobSk7Cn0KCi8qID09PT09PT09PT09PT09PT09IE5ldHdvcmtpbmcgKE1RVFQgb3ZlciBXZWJTb2NrZXQsIHB1YmxpYyBicm9rZXJzLCBubyBzaWdudXApID09PT09PT09PT09PT09PT09ICovCmNvbnN0IFRQPSdjaGJhcmcycC12MSc7CmNvbnN0IEJST0tFUlM9Wyd3c3M6Ly9icm9rZXIuZW1xeC5pbzo4MDg0L21xdHQnLCd3c3M6Ly9icm9rZXIuaGl2ZW1xLmNvbTo4ODg0L21xdHQnLCd3c3M6Ly90ZXN0Lm1vc3F1aXR0by5vcmc6ODA4MSddOwpjb25zdCBNUVRUX1VSTFM9WydodHRwczovL2Nkbi5qc2RlbGl2ci5uZXQvbnBtL21xdHRANS4xMC4xL2Rpc3QvbXF0dC5taW4uanMnLCdodHRwczovL3VucGtnLmNvbS9tcXR0QDUuMTAuMS9kaXN0L21xdHQubWluLmpzJ107CmxldCBtcT1udWxsLHJvb21Db2RlPScnLG15Um9sZT0nJyxob3N0SW5mbz1udWxsLGd1ZXN0SW5mbz1udWxsLHByZXNlbmNlUHVibGlzaGVkPWZhbHNlOwpsZXQgZ3Vlc3RDaWQ9bnVsbCxndWVzdFNlZW49ZmFsc2UsaGVsbG9TZW50PWZhbHNlLGpvaW5lZD1mYWxzZSxqb2luVGltZXI9bnVsbCxyZWFkeURvbmU9ZmFsc2UsZ3Vlc3ROYW1lPScnOwpjb25zdCBteUlkPXNzKCdjaWQnKXx8KCgpPT57Y29uc3Qgdj1NYXRoLnJhbmRvbSgpLnRvU3RyaW5nKDM2KS5zbGljZSgyLDEwKTtzcygnY2lkJyx2KTtyZXR1cm4gdjt9KSgpOwoKZnVuY3Rpb24gbG9hZE1RVFQoKXsKICByZXR1cm4gbmV3IFByb21pc2UoKHJlcyxyZWopPT57CiAgICBsZXQgaT0wOwogICAgKGZ1bmN0aW9uIG5leHQoKXsKICAgICAgaWYod2luZG93Lm1xdHQpcmV0dXJuIHJlcygpOwogICAgICBpZihpPj1NUVRUX1VSTFMubGVuZ3RoKXJldHVybiByZWooKTsKICAgICAgY29uc3Qgc2M9ZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc2NyaXB0Jyk7CiAgICAgIHNjLnNyYz1NUVRUX1VSTFNbaSsrXTsKICAgICAgc2Mub25sb2FkPSgpPT53aW5kb3cubXF0dD9yZXMoKTpuZXh0KCk7CiAgICAgIHNjLm9uZXJyb3I9bmV4dDsKICAgICAgZG9jdW1lbnQuaGVhZC5hcHBlbmRDaGlsZChzYyk7CiAgICB9KSgpOwogIH0pOwp9CmZ1bmN0aW9uIGFsbFByZXNlbmNlKCl7CiAgcmV0dXJuW2hvc3RJbmZvJiZ7cm9sZTonaG9zdCcsY2lkOmhvc3RJbmZvLmNpZH0sZ3Vlc3RJbmZvJiZ7cm9sZTonZ3Vlc3QnLGNpZDpndWVzdEluZm8uY2lkfV0uZmlsdGVyKEJvb2xlYW4pOwp9CmZ1bmN0aW9uIHB1Ymxpc2hQcmVzZW5jZSgpewogIHByZXNlbmNlUHVibGlzaGVkPXRydWU7CiAgaWYobXEmJm1xLmNvbm5lY3RlZCltcS5wdWJsaXNoKGAke1RQfS8ke3Jvb21Db2RlfS8ke215Um9sZX1gLEpTT04uc3RyaW5naWZ5KHtjaWQ6bXlJZH0pLHtyZXRhaW46dHJ1ZSxxb3M6MX0pOwp9CmZ1bmN0aW9uIGNsb3NlQ2hhbm5lbChjbGVhcj10cnVlKXsKICBpZighbXEpcmV0dXJuOwogIGNvbnN0IGM9bXEscj1teVJvbGUsY29kZT1yb29tQ29kZTsKICBtcT1udWxsO2hvc3RJbmZvPWd1ZXN0SW5mbz1udWxsO3ByZXNlbmNlUHVibGlzaGVkPWZhbHNlOwogIGMucmVtb3ZlQWxsTGlzdGVuZXJzKCdtZXNzYWdlJyk7CiAgaWYoY2xlYXIpewogICAgdHJ5e2MucHVibGlzaChgJHtUUH0vJHtjb2RlfS8ke3J9YCwnJyx7cmV0YWluOnRydWUscW9zOjF9KTt9Y2F0Y2goZSl7fQogICAgc2V0VGltZW91dCgoKT0+e3RyeXtjLmVuZCh0cnVlKX1jYXRjaChlKXt9fSwzMDApOwogIH1lbHNle3RyeXtjLmVuZChmYWxzZSl9Y2F0Y2goZSl7fX0KfQpmdW5jdGlvbiBtcUNvbm5lY3QodXJsLGNvZGUscm9sZSl7CiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXMscmVqKT0+ewogICAgY29uc3Qgd2lsbD17dG9waWM6YCR7VFB9LyR7Y29kZX0vJHtyb2xlfWAscGF5bG9hZDonJyxyZXRhaW46dHJ1ZSxxb3M6MX07CiAgICBjb25zdCBjPW1xdHQuY29ubmVjdCh1cmwse2NsaWVudElkOidjYicrbXlJZCtNYXRoLnJhbmRvbSgpLnRvU3RyaW5nKDE2KS5zbGljZSgyLDYpLGNsZWFuOnRydWUscmVjb25uZWN0UGVyaW9kOjIwMDAsY29ubmVjdFRpbWVvdXQ6NjAwMCxrZWVwYWxpdmU6MjAsd2lsbH0pOwogICAgY29uc3QgdG89c2V0VGltZW91dCgoKT0+e2MucmVtb3ZlQWxsTGlzdGVuZXJzKCk7Yy5vbignZXJyb3InLCgpPT57fSk7Yy5lbmQodHJ1ZSk7cmVqKG5ldyBFcnJvcigndGltZW91dCcpKTt9LDcwMDApOwogICAgY29uc3Qgb25FcnI9KCk9Pnt9OwogICAgYy5vbignZXJyb3InLG9uRXJyKTsKICAgIGMub25jZSgnY29ubmVjdCcsKCk9PntjbGVhclRpbWVvdXQodG8pO2Mub2ZmKCdlcnJvcicsb25FcnIpO3JlcyhjKTt9KTsKICB9KTsKfQphc3luYyBmdW5jdGlvbiBjb25uZWN0KGNvZGUscm9sZSxvblJlYWR5KXsKICB0cnl7YXdhaXQgbG9hZE1RVFQoKTt9Y2F0Y2goZSl7dG9hc3QoJ9qp2KrYp9io2K7Yp9mG2Ycg2KfYqti12KfZhCDZhNmI2K8g2YbYtNivLiDYp9uM2YbYqtix2YbYqiDbjNinINmB24zZhNiq2LHYtNqp2YYg2LHYpyDahtqpINqp2YYnKTtyZXR1cm4gZmFsc2U7fQogIGNsb3NlQ2hhbm5lbCgpOwogIHJvb21Db2RlPWNvZGU7bXlSb2xlPXJvbGU7cmVhZHlEb25lPWZhbHNlO2hvc3RJbmZvPWd1ZXN0SW5mbz1udWxsO3ByZXNlbmNlUHVibGlzaGVkPWZhbHNlOwogIGxldCBjPW51bGw7CiAgZm9yKGNvbnN0IHUgb2YgQlJPS0VSUyl7dHJ5e2M9YXdhaXQgbXFDb25uZWN0KHUsY29kZSxyb2xlKTticmVhazt9Y2F0Y2goZSl7fX0KICBpZighYyl7dG9hc3QoJ9in2KrYtdin2YQg2KjZhyDYs9ix2YjYsSDYqNix2YLYsdin2LEg2YbYtNivLiDYp9uM2YbYqtix2YbYqiDbjNinINmB24zZhNiq2LHYtNqp2YYg2LHYpyDahtqpINqp2YYnKTtyZXR1cm4gZmFsc2U7fQogIG1xPWM7CiAgYy5vbignZXJyb3InLCgpPT57fSk7CiAgYy5vbignb2ZmbGluZScsKCk9PntpZihyZWFkeURvbmUpdG9hc3QoJ9in2LHYqtio2KfYtyDZgti32Lkg2LTYr9iMINiv2LEg2K3Yp9mEINin2KrYtdin2YQg2K/ZiNio2KfYsdmHLi4uJyx0cnVlKTt9KTsKICBjLm9uKCdjb25uZWN0JywoKT0+e2lmKHJlYWR5RG9uZSl7aGlkZVRvYXN0KCk7aWYocHJlc2VuY2VQdWJsaXNoZWQpcHVibGlzaFByZXNlbmNlKCk7fX0pOwogIGMub24oJ21lc3NhZ2UnLG9uTVEpOwogIGNvbnN0IHRvcGljcz1pc0hvc3Q/W2Ake1RQfS8ke2NvZGV9L3RvSG9zdGAsYCR7VFB9LyR7Y29kZX0vZ3Vlc3RgLGAke1RQfS8ke2NvZGV9L2hvc3RgXTpbYCR7VFB9LyR7Y29kZX0vdG9HdWVzdGAsYCR7VFB9LyR7Y29kZX0vaG9zdGBdOwogIGMuc3Vic2NyaWJlKHRvcGljcyx7cW9zOjB9LGVycj0+ewogICAgaWYoZXJyKXt0b2FzdCgn2K7Yt9inINiv2LEg2KfYqti12KfZhCDYqNmHINin2KrYp9mCJyk7YnVzeShmYWxzZSk7cmV0dXJuO30KICAgIGlmKHJlYWR5RG9uZSlyZXR1cm47cmVhZHlEb25lPXRydWU7b25SZWFkeSgpOwogIH0pOwogIHJldHVybiB0cnVlOwp9CmZ1bmN0aW9uIG9uTVEodG9waWMsYnVmKXsKICBjb25zdCB0PXRvcGljLnNwbGl0KCcvJykucG9wKCksc3RyPWJ1Zi50b1N0cmluZygpOwogIGxldCBtPW51bGw7CiAgaWYoc3RyKXt0cnl7bT1KU09OLnBhcnNlKHN0cik7fWNhdGNoKGUpe3JldHVybjt9fQogIGlmKHQ9PT0naG9zdCcpe2hvc3RJbmZvPW07b25QcmVzZW5jZSgpO30KICBlbHNlIGlmKHQ9PT0nZ3Vlc3QnKXtndWVzdEluZm89bTtvblByZXNlbmNlKCk7fQogIGVsc2UgaWYodD09PSd0b0hvc3QnJiZpc0hvc3QmJm0pb25Nc2cobSk7CiAgZWxzZSBpZih0PT09J3RvR3Vlc3QnJiYhaXNIb3N0JiZtKW9uTXNnKG0pOwp9CmZ1bmN0aW9uIHNlbmQobSl7CiAgaWYoIW1xfHwhbXEuY29ubmVjdGVkKXJldHVybiB0b2FzdCgn2KfYsdiq2KjYp9i3INmC2LfYuSDYp9iz2KonKTsKICBtcS5wdWJsaXNoKGAke1RQfS8ke3Jvb21Db2RlfS8ke2lzSG9zdD8ndG9HdWVzdCc6J3RvSG9zdCd9YCxKU09OLnN0cmluZ2lmeSh7Li4ubSxjaWQ6bXlJZH0pLHtxb3M6MH0pOwp9CmFzeW5jIGZ1bmN0aW9uIGNyZWF0ZVJvb20obj0wKXsKICBidXN5KHRydWUpO2lzSG9zdD10cnVlO25hbWVzWzBdPW15TmFtZSgpO0c9bnVsbDtndWVzdENpZD1udWxsO2d1ZXN0U2Vlbj1mYWxzZTsKICBjb25zdCBjb2RlPVN0cmluZyhNYXRoLmZsb29yKDEwMDAwK01hdGgucmFuZG9tKCkqOTAwMDApKTsKICBjb25zdCBvaz1hd2FpdCBjb25uZWN0KGNvZGUsJ2hvc3QnLCgpPT57CiAgICBzZXRUaW1lb3V0KCgpPT57CiAgICAgIGNvbnN0IG90aGVyPWFsbFByZXNlbmNlKCkuZmluZChwPT5wLnJvbGU9PT0naG9zdCcmJnAuY2lkIT09bXlJZCk7CiAgICAgIGlmKG90aGVyKXtjbG9zZUNoYW5uZWwoZmFsc2UpO2lmKG48NSljcmVhdGVSb29tKG4rMSk7ZWxzZXt0b2FzdCgn2YbYtNiv2Iwg2K/ZiNio2KfYsdmHINin2YXYqtit2KfZhiDaqdmGJyk7YnVzeShmYWxzZSk7fXJldHVybjt9CiAgICAgIHB1Ymxpc2hQcmVzZW5jZSgpOyQoJ2NvZGUnKS50ZXh0Q29udGVudD1jb2RlO2J1c3koZmFsc2UpO3Nob3coJ3dhaXQnKTsKICAgIH0sNzAwKTsKICB9KTsKICBpZighb2spYnVzeShmYWxzZSk7Cn0KYXN5bmMgZnVuY3Rpb24gam9pblJvb20oKXsKICBjb25zdCBjb2RlPW5vcm0oJCgnY29kZUluJykudmFsdWUpOwogIGlmKGNvZGUubGVuZ3RoIT09NSlyZXR1cm4gdG9hc3QoJ9qp2K8g2KfYqtin2YIg27Ug2LHZgtmF24wg2KfYs9iqJyk7CiAgYnVzeSh0cnVlKTtpc0hvc3Q9ZmFsc2U7aGVsbG9TZW50PWZhbHNlO2pvaW5lZD1mYWxzZTtndWVzdE5hbWU9bXlOYW1lKCk7CiAgY29uc3Qgb2s9YXdhaXQgY29ubmVjdChjb2RlLCdndWVzdCcsKCk9PnsKICAgIHB1Ymxpc2hQcmVzZW5jZSgpOwogICAgam9pblRpbWVyPXNldFRpbWVvdXQoKCk9PnsKICAgICAgaWYoIWhlbGxvU2VudCl7dG9hc3QoJ9in2KrYp9mC24wg2KjYpyDYp9uM2YYg2qnYryDZvtuM2K/YpyDZhti02K8nKTtjbG9zZUNoYW5uZWwoKTtidXN5KGZhbHNlKTt9CiAgICB9LDUwMDApOwogICAgb25QcmVzZW5jZSgpOwogIH0pOwogIGlmKCFvaylidXN5KGZhbHNlKTsKfQpmdW5jdGlvbiBvblByZXNlbmNlKCl7CiAgY29uc3QgbGlzdD1hbGxQcmVzZW5jZSgpOwogIGlmKGlzSG9zdCl7CiAgICBpZihndWVzdENpZCl7CiAgICAgIGlmKGxpc3Quc29tZShwPT5wLmNpZD09PWd1ZXN0Q2lkKSlndWVzdFNlZW49dHJ1ZTsKICAgICAgZWxzZSBpZihndWVzdFNlZW4pe2d1ZXN0Q2lkPW51bGw7Z3Vlc3RTZWVuPWZhbHNlO3RvYXN0KCfYrdix24zZgSDZgti32Lkg2LTYry4g2YXZhtiq2LjYsSDYp9iq2LXYp9mEINiv2YjYqNin2LHZhy4uLicsdHJ1ZSk7fQogICAgfQogIH1lbHNlewogICAgY29uc3QgaG9zdD1saXN0LmZpbmQocD0+cC5yb2xlPT09J2hvc3QnKTsKICAgIGlmKGhvc3QmJiFoZWxsb1NlbnQpe2hlbGxvU2VudD10cnVlO2NsZWFyVGltZW91dChqb2luVGltZXIpO3NlbmQoe3Q6J2hlbGxvJyxuYW1lOmd1ZXN0TmFtZX0pO30KICAgIGlmKCFob3N0JiZoZWxsb1NlbnQpe2hlbGxvU2VudD1mYWxzZTtpZihqb2luZWQpdG9hc3QoJ9in2LHYqtio2KfYtyDYqNinINmF24zYstio2KfZhiDZgti32Lkg2LTYrycsdHJ1ZSk7fQogIH0KfQpmdW5jdGlvbiBvbk1zZyhtKXsKICBpZighbSlyZXR1cm47CiAgaWYoaXNIb3N0KXsKICAgIGlmKG0udD09PSdoZWxsbycpewogICAgICBpZihndWVzdENpZCYmZ3Vlc3RDaWQhPT1tLmNpZCYmYWxsUHJlc2VuY2UoKS5zb21lKHA9PnAuY2lkPT09Z3Vlc3RDaWQpKXtzZW5kKHt0OidmdWxsJyx0bzptLmNpZH0pO3JldHVybjt9CiAgICAgIGd1ZXN0Q2lkPW0uY2lkO2d1ZXN0U2Vlbj1mYWxzZTtuYW1lc1sxXT0obS5uYW1lfHwn2K3YsduM2YEnKS5zbGljZSgwLDE0KTtoaWRlVG9hc3QoKTsKICAgICAgc2hvdygnZ2FtZScpOwogICAgICBpZihHKXB1c2goKTtlbHNlIHN0YXJ0R2FtZSgpOwogICAgICByZXR1cm47CiAgICB9CiAgICBpZihtLmNpZD09PWd1ZXN0Q2lkKW9uQWN0aW9uKDEsbSk7CiAgfWVsc2V7CiAgICBpZihtLnRvIT09bXlJZClyZXR1cm47CiAgICBpZihtLnQ9PT0ndicpe2pvaW5lZD10cnVlO2J1c3koZmFsc2UpO2hpZGVUb2FzdCgpO3Nob3coJ2dhbWUnKTtyZW5kZXIobS52KTt9CiAgICBlbHNlIGlmKG0udD09PSdmdWxsJyl0b2FzdCgn2KfYqtin2YIg2b7YsSDYp9iz2KonKTsKICB9Cn0KCi8qID09PT09IHY0IGhlbHBlcnMgPT09PT0gKi8KbGV0IHByZXZTdGF0dXM9JycscHJldlBoYXNlPScnLHByZXZIYW5kPVtdLHByZXZPcHA9MCxwcmV2Rmxvb3I9W10scHJldlNlcT0tMSxmaXJzdFJlbmRlcj10cnVlOwpjb25zdCBoYW5kQ1c9KCk9Pk1hdGgucm91bmQoTWF0aC5tYXgoNjIsTWF0aC5taW4oOTYsaW5uZXJIZWlnaHQqLjEzLGlubmVyV2lkdGgqLjE2KSkpOwpmdW5jdGlvbiBidW1wKGVsLHQpe2lmKGVsLnRleHRDb250ZW50PT09dClyZXR1cm47ZWwudGV4dENvbnRlbnQ9dDtlbC5hbmltYXRlKFt7dHJhbnNmb3JtOidzY2FsZSgxLjcpJyxjb2xvcjonI2ZmZid9LHt0cmFuc2Zvcm06J3NjYWxlKDEpJ31dLHtkdXJhdGlvbjo0ODAsZWFzaW5nOidjdWJpYy1iZXppZXIoLjIsMS40LC40LDEpJ30pO30KZnVuY3Rpb24gZ2hvc3QoZWwsZGlyKXsKICBjb25zdCBjYXJkPWVsLnF1ZXJ5U2VsZWN0b3IoJy5jYXJkJyk7aWYoIWNhcmQpcmV0dXJuOwogIGNvbnN0IHI9Y2FyZC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKSxnPWNhcmQuY2xvbmVOb2RlKHRydWUpOwogIGcuY2xhc3NOYW1lPSdjYXJkIGdob3N0JzsKICBnLnN0eWxlLmNzc1RleHQ9YHBvc2l0aW9uOmZpeGVkO2xlZnQ6JHtyLmxlZnR9cHg7dG9wOiR7ci50b3B9cHg7d2lkdGg6JHtyLndpZHRofXB4Oy0tY3c6JHtyLndpZHRofXB4O3otaW5kZXg6MjA7LS1keToke2RpcioyODB9cHhgOwogIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQoZyk7c2V0VGltZW91dCgoKT0+Zy5yZW1vdmUoKSw2NTApOwp9CmZ1bmN0aW9uIGJhbm5lcih0KXsKICBjb25zdCBiPWRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO2IuY2xhc3NOYW1lPSdiYW5uZXInO2IudGV4dENvbnRlbnQ9dDtkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKGIpOwogIGIuYW5pbWF0ZShbe29wYWNpdHk6MCx0cmFuc2Zvcm06J3RyYW5zbGF0ZSgtNTAlLC01MCUpIHNjYWxlKC4zKSd9LHtvcGFjaXR5OjEsdHJhbnNmb3JtOid0cmFuc2xhdGUoLTUwJSwtNTAlKSBzY2FsZSgxLjE1KScsb2Zmc2V0Oi4yNX0se29wYWNpdHk6MSx0cmFuc2Zvcm06J3RyYW5zbGF0ZSgtNTAlLC01MCUpIHNjYWxlKDEpJyxvZmZzZXQ6Ljh9LHtvcGFjaXR5OjAsdHJhbnNmb3JtOid0cmFuc2xhdGUoLTUwJSwtNzUlKSBzY2FsZSgxKSd9XSx7ZHVyYXRpb246MTkwMCxlYXNpbmc6J2Vhc2Utb3V0J30pLm9uZmluaXNoPSgpPT5iLnJlbW92ZSgpOwp9CmZ1bmN0aW9uIGNvbmZldHRpKG49NzApewogIGNvbnN0IGNvbHM9WycjZThjMjZhJywnI2IzMjYzZScsJyNmZmYnLCcjM2ZiZjdmJywnIzRhYTNmZiddOwogIGZvcihsZXQgaT0wO2k8bjtpKyspewogICAgY29uc3QgcD1kb2N1bWVudC5jcmVhdGVFbGVtZW50KCdpJyksej02K01hdGgucmFuZG9tKCkqNzsKICAgIHAuc3R5bGUuY3NzVGV4dD1gcG9zaXRpb246Zml4ZWQ7ei1pbmRleDoyOTtwb2ludGVyLWV2ZW50czpub25lO2xlZnQ6JHtNYXRoLnJhbmRvbSgpKjEwMH12dzt0b3A6LTE0cHg7d2lkdGg6JHt6fXB4O2hlaWdodDoke3oqMS42fXB4O2JhY2tncm91bmQ6JHtjb2xzW2klNV19O2JvcmRlci1yYWRpdXM6MnB4YDsKICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQocCk7CiAgICBjb25zdCBkeD0oTWF0aC5yYW5kb20oKS0uNSkqMTgwOwogICAgcC5hbmltYXRlKFt7dHJhbnNmb3JtOid0cmFuc2xhdGUoMCwwKSByb3RhdGUoMGRlZyknfSx7dHJhbnNmb3JtOmB0cmFuc2xhdGUoJHtkeH1weCwke2lubmVySGVpZ2h0KzQwfXB4KSByb3RhdGUoJHtNYXRoLnJhbmRvbSgpKjkwMC00NTB9ZGVnKWB9XSx7ZHVyYXRpb246MTgwMCtNYXRoLnJhbmRvbSgpKjE2MDAsZGVsYXk6TWF0aC5yYW5kb20oKSo0MDAsZWFzaW5nOidjdWJpYy1iZXppZXIoLjMsLjQsLjYsMSknLGZpbGw6J2JhY2t3YXJkcyd9KS5vbmZpbmlzaD0oKT0+cC5yZW1vdmUoKTsKICB9Cn0KY29uc3QgZnNFbD0oKT0+ZG9jdW1lbnQuZnVsbHNjcmVlbkVsZW1lbnR8fGRvY3VtZW50LndlYmtpdEZ1bGxzY3JlZW5FbGVtZW50OwpmdW5jdGlvbiBnb0ZTKGF1dG8pewogIGNvbnN0IGQ9ZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LHJxPWQucmVxdWVzdEZ1bGxzY3JlZW58fGQud2Via2l0UmVxdWVzdEZ1bGxzY3JlZW47CiAgaWYoZnNFbCgpKXtpZighYXV0bykoZG9jdW1lbnQuZXhpdEZ1bGxzY3JlZW58fGRvY3VtZW50LndlYmtpdEV4aXRGdWxsc2NyZWVuKS5jYWxsKGRvY3VtZW50KTtyZXR1cm47fQogIGlmKCFycSl7aWYoIWF1dG8pdG9hc3QoJ9iv2LEg2KLbjNmB2YjZhjogU2hhcmUg4oaQIEFkZCB0byBIb21lIFNjcmVlbiDYqtinINiq2YXYp9mF4oCM2LXZgdit2Ycg2LTZiNivJyk7cmV0dXJuO30KICB0cnl7Y29uc3QgcD1ycS5jYWxsKGQpO2lmKHAmJnAuY2F0Y2gpcC5jYXRjaCgoKT0+e30pO31jYXRjaChlKXt9Cn0KWydmdWxsc2NyZWVuY2hhbmdlJywnd2Via2l0ZnVsbHNjcmVlbmNoYW5nZSddLmZvckVhY2goZXY9PmRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoZXYsKCk9PnskKCdmc0J0bicpLnRleHRDb250ZW50PWZzRWwoKT8n4pyVJzon4pu2JztzZXRUaW1lb3V0KCgpPT57aWYoViYmISQoJ2dhbWUnKS5jbGFzc0xpc3QuY29udGFpbnMoJ2hpZGRlbicpKXJlbmRlcihWKTt9LDE1MCk7fSkpOwoKLyogPT09PT09PT09PT09PT09PT0gUmVuZGVyaW5nID09PT09PT09PT09PT09PT09ICovCmxldCBzZWxIPW51bGw7Y29uc3Qgc2VsRj1uZXcgU2V0KCk7CmNvbnN0IEZBQ0U9ezExOifYs9ix2KjYp9iyJywxMjon2KjbjOKAjNio24wnLDEzOifYtNin2YcnLDE0OifYotizJ307CmNvbnN0IGNuYW1lPWM9PihGQUNFW2Mucl18fGMucikrJyAnK05BTUVbYy5zXTsKZnVuY3Rpb24gc2VsQ2FyZHModil7cmV0dXJuIHYuZmxvb3IuZmlsdGVyKGM9PnNlbEYuaGFzKGNpZChjKSkpO30KZnVuY3Rpb24gbW92ZUZ4KHYpewogIGNvbnN0IGw9di5sYXN0LG1lPXYueW91LHc9JCgnZmxvb3JXcmFwJyk7CiAgY29uc3QgZD1kb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtkLmNsYXNzTmFtZT0nbW92ZUZ4JzsKICBkLmFwcGVuZENoaWxkKGNhcmRFbChsLmNhcmQpKTsKICBpZihsLnRvb2subGVuZ3RoKXtjb25zdCBhPWRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKTthLmNsYXNzTmFtZT0nYXJyJzthLnRleHRDb250ZW50PSfih5AnO2QuYXBwZW5kQ2hpbGQoYSk7bC50b29rLnNsaWNlKDAsNSkuZm9yRWFjaChjPT5kLmFwcGVuZENoaWxkKGNhcmRFbChjKSkpO2lmKGwudG9vay5sZW5ndGg+NSl7Y29uc3QgbT1kb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzcGFuJyk7bS5jbGFzc05hbWU9J2xibCc7bS50ZXh0Q29udGVudD0nKycrKGwudG9vay5sZW5ndGgtNSk7ZC5hcHBlbmRDaGlsZChtKTt9fQogIGNvbnN0IHQ9ZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3BhbicpO3QuY2xhc3NOYW1lPSdsYmwnOwogIHQudGV4dENvbnRlbnQ9KGwucD09PW1lPyfYqtmIJzp2Lm5hbWVzW2wucF0pKyhsLnRvb2subGVuZ3RoPyhsLnN1cj8nINiz2YjYsSDaqdix2K8hJzonINqv2LHZgdiqJyk6JyDar9iw2KfYtNiqJyk7ZC5hcHBlbmRDaGlsZCh0KTsKICB3LmFwcGVuZENoaWxkKGQpO3NuYXAoKTsKICBkLmFuaW1hdGUoW3tvcGFjaXR5OjAsdHJhbnNmb3JtOid0cmFuc2xhdGUoLTUwJSwtMjRweCkgc2NhbGUoLjcpJ30se29wYWNpdHk6MSx0cmFuc2Zvcm06J3RyYW5zbGF0ZSgtNTAlLDApIHNjYWxlKDEpJyxvZmZzZXQ6LjE1fSx7b3BhY2l0eToxLHRyYW5zZm9ybTondHJhbnNsYXRlKC01MCUsMCkgc2NhbGUoMSknLG9mZnNldDouOH0se29wYWNpdHk6MCx0cmFuc2Zvcm06J3RyYW5zbGF0ZSgtNTAlLC0xMHB4KSBzY2FsZSguOTUpJ31dLHtkdXJhdGlvbjoyMjAwLGVhc2luZzonZWFzZS1vdXQnfSkub25maW5pc2g9KCk9PmQucmVtb3ZlKCk7CiAgaWYobC5zdXIpe2Jhbm5lcihsLnA9PT1tZT8n8J+UpSDYs9mI2LEhICvbtSc6J9it2LHbjNmBINiz2YjYsSDaqdix2K8hJyk7aWYobC5wPT09bWUpY29uZmV0dGkoNDApO30KfQpmdW5jdGlvbiBzdW1IVE1MKHYpewogIGNvbnN0IHJvd3M9W1sn2K7Yp9isIOKJpSDbtycsJ2NsdWJzJ10sWyfYr9mHINiu2LTYqicsJ3RlbkQnXSxbJ9iv2Ygg2K7Yp9isJywndHdvQyddLFsn2KLYs+KAjNmH2KcnLCdhY2VzJ10sWyfYs9ix2KjYp9iy2YfYpycsJ2phY2tzJ10sWyfaqdin2LHYqiDYqNuM2LTYqtixJywnY2FyZHMnXSxbJ9iz2YjYsScsJ3N1ciddXTsKICBsZXQgdD1gPHRhYmxlPjx0cj48dGg+PC90aD48dGg+2KrZiDwvdGg+PHRoPiR7ZXNjKHYubmFtZXNbMS12LnlvdV0pfTwvdGg+PC90cj5gOwogIGZvcihjb25zdCBbbGIsa10gb2Ygcm93cyl7Y29uc3QgYT12LnN1bS5tZVtrXSxiPXYuc3VtLm9wcFtrXTt0Kz1gPHRyPjx0ZD4ke2xifTwvdGQ+PHRkIGNsYXNzPSIke2E/Jyc6J3onfSI+JHthfTwvdGQ+PHRkIGNsYXNzPSIke2I/Jyc6J3onfSI+JHtifTwvdGQ+PC90cj5gO30KICB0Kz1gPHRyIGNsYXNzPSJ0b3QiPjx0ZD7YrNmF2Lkg2KfbjNmGINiv2LPYqjwvdGQ+PHRkPiR7di5zdW0ubWUudG90YWx9PC90ZD48dGQ+JHt2LnN1bS5vcHAudG90YWx9PC90ZD48L3RyPjwvdGFibGU+YDsKICByZXR1cm4gdDsKfQpmdW5jdGlvbiByZW5kZXIodil7CiAgVj12O2lmKHYmJiFhcmNhZGVNYXRjaFN0YXJ0ZWQpYXJjYWRlTm90aWZ5KCdzdGFydCcpOwogIGNvbnN0IG1lPXYueW91LG9wcD0xLW1lOwogICQoJ3RnJykudGV4dENvbnRlbnQ9JCgndGcyJykudGV4dENvbnRlbnQ9di50YXJnZXQ7CiAgJCgnb3BwTmFtZScpLmlubmVySFRNTD1lc2Modi5uYW1lc1tvcHBdKTsKICAkKCdteU5hbWUnKS5pbm5lckhUTUw9ZXNjKHYubmFtZXNbbWVdKTsKICBjb25zdCBteVR1cm49di5waGFzZT09PSdwbGF5JyYmdi50dXJuPT09bWU7CiAgaWYoIW15VHVybil7c2VsSD1udWxsO3NlbEYuY2xlYXIoKTt9CiAgaWYoc2VsSCYmIXYuaGFuZC5zb21lKGM9PmNpZChjKT09PXNlbEgpKXNlbEg9bnVsbDsKICBmb3IoY29uc3QgaWQgb2YgWy4uLnNlbEZdKWlmKCF2LmZsb29yLnNvbWUoYz0+Y2lkKGMpPT09aWQpKXNlbEYuZGVsZXRlKGlkKTsKICBpZighc2VsSClzZWxGLmNsZWFyKCk7CgogIGNvbnN0IG9jPSQoJ29wcENhcmRzJyk7b2MuaW5uZXJIVE1MPScnOwogIGZvcihsZXQgaT0wO2k8di5vcHA7aSsrKXtjb25zdCBiPWJhY2tFbCgpO2lmKGk+PXByZXZPcHApe2IuY2xhc3NMaXN0LmFkZCgnZGVhbG8nKTtiLnN0eWxlLnNldFByb3BlcnR5KCctLWQnLGktcHJldk9wcCk7fW9jLmFwcGVuZENoaWxkKGIpO30KICBwcmV2T3BwPXYub3BwOwogIGJ1bXAoJCgnc2MnKSx2LnNjb3JlWzBdKycgOiAnK3Yuc2NvcmVbMV0pOwogIGJ1bXAoJCgncm4nKSxTdHJpbmcodi5yb3VuZCkpO2J1bXAoJCgnY2MnKSx2LmNhcFswXSsnIC0gJyt2LmNhcFsxXSk7YnVtcCgkKCdzcicpLHYuc3VyWzBdKycgLSAnK3Yuc3VyWzFdKTtidW1wKCQoJ2RrJyksU3RyaW5nKHYuZGVjaykpOwoKICAvKiBsYXN0IG1vdmUgYW5pbWF0aW9uICovCiAgaWYodi5sYXN0JiZ2Lmxhc3Quc2VxIT09cHJldlNlcSl7aWYoIWZpcnN0UmVuZGVyKW1vdmVGeCh2KTtwcmV2U2VxPXYubGFzdC5zZXE7fQogIGVsc2UgaWYoIXYubGFzdClwcmV2U2VxPS0xOwogIGZpcnN0UmVuZGVyPWZhbHNlOwoKICAvKiBmbG9vciAqLwogIGNvbnN0IHNlbENhcmQ9c2VsSD92LmhhbmQuZmluZChjPT5jaWQoYyk9PT1zZWxIKTpudWxsOwogIGNvbnN0IGZsPSQoJ2Zsb29yJyksbj12LmZsb29yLmxlbmd0aDsKICBmbC5zdHlsZS5zZXRQcm9wZXJ0eSgnLS1mdycsKG48PTY/NjY6bjw9MTA/NTY6bjw9MTU/NDg6NDIpKydweCcpOwogIGZsLmNsYXNzTGlzdC50b2dnbGUoJ2xvY2tlZCcsIW15VHVybik7CiAgZmwuaW5uZXJIVE1MPScnOwogIGNvbnN0IHByZXZGPXByZXZGbG9vcjtwcmV2Rmxvb3I9di5mbG9vci5tYXAoY2lkKTsKICBjb25zdCBuZWVkPXNlbENhcmQmJiFpc0ZhY2Uoc2VsQ2FyZC5yKT8xMS12YWwoc2VsQ2FyZC5yKTowOwogIHYuZmxvb3IuZm9yRWFjaChjPT57CiAgICBjb25zdCBpZD1jaWQoYyksZWw9Y2FyZEVsKGMpOwogICAgaWYoIXByZXZGLmluY2x1ZGVzKGlkKSllbC5jbGFzc0xpc3QuYWRkKCduZXcnKTsKICAgIGlmKHNlbEYuaGFzKGlkKSllbC5jbGFzc0xpc3QuYWRkKCdzZWwnKTsKICAgIGVsc2UgaWYoc2VsQ2FyZCl7CiAgICAgIGlmKHNlbENhcmQucj09PTExKXtpZihjLnIhPT0xMiYmYy5yIT09MTMpZWwuY2xhc3NMaXN0LmFkZCgndGFrZScpO30KICAgICAgZWxzZSBpZihzZWxDYXJkLnI9PT0xMnx8c2VsQ2FyZC5yPT09MTMpe2lmKGMucj09PXNlbENhcmQucillbC5jbGFzc0xpc3QuYWRkKCdoaW50Jyk7fQogICAgICBlbHNlIGlmKCFpc0ZhY2UoYy5yKSYmdmFsKGMucik8PW5lZWQpZWwuY2xhc3NMaXN0LmFkZCgnaGludCcpOwogICAgfQogICAgaWYobXlUdXJuKWVsLm9uY2xpY2s9KCk9PnsKICAgICAgaWYoIXNlbEgpcmV0dXJuIHRvYXN0KCfYp9mI2YQg24zaqSDaqdin2LHYqiDYp9iyINiv2LPYqtiqINin2YbYqtiu2KfYqCDaqdmGJyk7CiAgICAgIGNvbnN0IHNjPXYuaGFuZC5maW5kKHg9PmNpZCh4KT09PXNlbEgpO2lmKCFzYylyZXR1cm47CiAgICAgIGlmKHNjLnI9PT0xMSlyZXR1cm47CiAgICAgIGlmKHNjLnI9PT0xMnx8c2Mucj09PTEzKXtzZWxGLmNsZWFyKCk7aWYoYy5yPT09c2MucilzZWxGLmFkZChpZCk7fQogICAgICBlbHNle2lmKHNlbEYuaGFzKGlkKSlzZWxGLmRlbGV0ZShpZCk7ZWxzZSBzZWxGLmFkZChpZCk7fQogICAgICBzbmFwKCk7cmVuZGVyKFYpOwogICAgfTsKICAgIGZsLmFwcGVuZENoaWxkKGVsKTsKICB9KTsKCiAgLyogc3RhdHVzIC8gaGludCAvIGJ1dHRvbnMgKi8KICBjb25zdCBzdD0kKCdzdGF0dXMnKSxoaW50PSQoJ2hpbnQnKSxhY3RzPSQoJ2FjdHMnKSxhZ2Fpbj0kKCdhZ2FpbicpLGNhcD0kKCdjYXBCdG4nKSxkcm9wPSQoJ2Ryb3BCdG4nKTsKICBzdC5jbGFzc05hbWU9Jyc7YWdhaW4uY2xhc3NMaXN0LmFkZCgnaGlkZGVuJyk7YWN0cy5jbGFzc0xpc3QuYWRkKCdoaWRkZW4nKTtoaW50LnRleHRDb250ZW50PScnOwogIGNvbnN0IHN1bT0kKCdzdW0nKTtzdW0uY2xhc3NMaXN0LmFkZCgnaGlkZGVuJyk7CiAgaWYodi5waGFzZT09PSdwbGF5Jyl7CiAgICBzdC50ZXh0Q29udGVudD1teVR1cm4/J9mG2YjYqNiqINiq2YjYs9iqJzon2YbZiNio2KogJyt2Lm5hbWVzW29wcF07aWYobXlUdXJuKXN0LmNsYXNzTmFtZT0nbWUnOwogICAgaWYobXlUdXJuKXsKICAgICAgYWN0cy5jbGFzc0xpc3QucmVtb3ZlKCdoaWRkZW4nKTsKICAgICAgY29uc3Qgc2M9c2VsQ2FyZCxzZWw9c2VsQ2FyZHModiksdG9vaz1zYz9ldmFsQ2FwdHVyZShzYyx2LmZsb29yLHNlbCk6bnVsbDsKICAgICAgY2FwLmRpc2FibGVkPSF0b29rO2Ryb3AuZGlzYWJsZWQ9IXNjOwogICAgICBjYXAudGV4dENvbnRlbnQ9dG9vaz9g2Kjar9uM2LEgKCR7dG9vay5sZW5ndGh9KWA6J9io2q/bjNixJzsKICAgICAgaWYoIXNjKWhpbnQudGV4dENvbnRlbnQ9J9uM2qkg2qnYp9ix2Kog2KfYsiDYr9iz2KrYqiDYp9mG2KrYrtin2Kgg2qnZhic7CiAgICAgIGVsc2UgaWYoc2Mucj09PTExKWhpbnQudGV4dENvbnRlbnQ9dG9vaz8n2LPYsdio2KfYsiDZh9mF2Ycg2LHYpyDZhduM4oCM2q/bjNix2K8gKNio2YfigIzYrNiyINio24zigIzYqNuMINmIINi02KfZhyknOifahtuM2LLbjCDYqNix2KfbjCDar9ix2YHYqtmGINmG24zYs9iq2Jsg2YHZgti3INmF24zigIzYqtmI2KfZhtuMINio24zZhtiv2KfYstuMJzsKICAgICAgZWxzZSBpZihzYy5yPT09MTJ8fHNjLnI9PT0xMyloaW50LnRleHRDb250ZW50PXRvb2s/J9ii2YXYp9iv2YfigIzbjCDar9ix2YHYqtmGJzpg24zaqSAke3NjLnI9PT0xMj8n2KjbjOKAjNio24wnOifYtNin2YcnfSDYp9iyINmF24zYsiDYp9mG2KrYrtin2Kgg2qnZhmA7CiAgICAgIGVsc2UgaGludC50ZXh0Q29udGVudD10b29rPyfYotmF2KfYr9mH4oCM24wg2q/YsdmB2KrZhic6YNqp2KfYsdiq4oCM2YfYp9uM24wg2KfYsiDZhduM2LIg2KjYstmGINqp2Ycg2KzZhdi52LTYp9mGINio2KcgJHtybChzYy5yKX0g2KjYtNmI2K8g27HbsWA7CiAgICB9CiAgfWVsc2UgaWYodi5waGFzZT09PSdyb3VuZEVuZCcpewogICAgc3QudGV4dENvbnRlbnQ9J9m+2KfbjNin2YYg2K/Ys9iqICcrdi5yb3VuZDtzdW0uaW5uZXJIVE1MPWA8ZGl2IGNsYXNzPSJzdW1Cb3giPjxoMz7Zhtiq24zYrNmH4oCM24wg2K/Ys9iqICR7di5yb3VuZH08L2gzPiR7c3VtSFRNTCh2KX08ZGl2IGNsYXNzPSJub3RlIj7Yr9iz2Kog2KjYudivINiq2Kcg2obZhtivINir2KfZhtuM2YfigIzbjCDYr9uM2q/YsSDYtNix2YjYuSDZhduM4oCM2LTZiNiv4oCmPC9kaXY+PC9kaXY+YDtzdW0uY2xhc3NMaXN0LnJlbW92ZSgnaGlkZGVuJyk7CiAgfWVsc2UgaWYodi5waGFzZT09PSdvdmVyJyl7CiAgICBjb25zdCB3PXYud2lubmVyPT09J21lJzsKICAgIHN0LnRleHRDb250ZW50PXc/J/Cfj4Yg2KrZiCDYqNix2YbYr9mHINio2KfYstuMINi02K/bjCEnOnYubmFtZXNbb3BwXSsnINio2LHZhtiv2Ycg2KjYp9iy24wg2LTYryc7c3QuY2xhc3NOYW1lPXc/J21lJzonJzsKICAgIGFnYWluLmNsYXNzTGlzdC5yZW1vdmUoJ2hpZGRlbicpOwogICAgc3VtLmlubmVySFRNTD1gPGRpdiBjbGFzcz0ic3VtQm94Ij48aDM+JHt3Pyfwn4+GINio2LHZhtiv2Ycg2LTYr9uMISc6J9io2KfYrtiq24wnfTwvaDM+JHtzdW1IVE1MKHYpfTxkaXYgY2xhc3M9Im5vdGUiPtin2YXYqtuM2KfYsiDZhtmH2KfbjNuMOiDYqtmIICR7di5zY29yZVswXX0g4oCUICR7ZXNjKHYubmFtZXNbb3BwXSl9ICR7di5zY29yZVsxXX08L2Rpdj48YnV0dG9uIGNsYXNzPSJidG4iIGlkPSJzdW1PayI+2KjYs9iq2YY8L2J1dHRvbj48L2Rpdj5gOwogICAgc3VtLmNsYXNzTGlzdC5yZW1vdmUoJ2hpZGRlbicpOwogICAgY29uc3Qgb2s9JCgnc3VtT2snKTtpZihvaylvay5vbmNsaWNrPSgpPT5zdW0uY2xhc3NMaXN0LmFkZCgnaGlkZGVuJyk7CiAgfQogIGlmKHN0LnRleHRDb250ZW50IT09cHJldlN0YXR1cyl7cHJldlN0YXR1cz1zdC50ZXh0Q29udGVudDtpZihwcmV2U3RhdHVzKXN0LmFuaW1hdGUoW3tvcGFjaXR5OjAsdHJhbnNmb3JtOid0cmFuc2xhdGVZKDhweCkgc2NhbGUoLjkpJ30se29wYWNpdHk6MSx0cmFuc2Zvcm06J25vbmUnfV0se2R1cmF0aW9uOjMyMCxlYXNpbmc6J2Vhc2Utb3V0J30pO30KICAkKCdmZWx0JykuZGF0YXNldC50dXJuPXYucGhhc2U9PT0ncGxheSc/KG15VHVybj8nbWUnOidvcHAnKTonJzsKICBpZih2LnBoYXNlIT09cHJldlBoYXNlKXsKICAgIHByZXZQaGFzZT12LnBoYXNlOwogICAgaWYodi5waGFzZT09PSdvdmVyJyl7Y29uc3Qgdz12Lndpbm5lcj09PSdtZSc7YmFubmVyKHc/J/Cfj4Yg2KjYsdmG2K/ZhyDYtNiv24whJzon2KjYp9iu2KrbjCcpO2FyY2FkZU5vdGlmeSgnZmluaXNoJyx3PzE6MCx3KTtpZih3KWNvbmZldHRpKDE1MCk7fQogICAgZWxzZSBpZih2LnBoYXNlPT09J3BsYXknJiZ2LnJvdW5kPjEmJiF2Lmxhc3QpYmFubmVyKCfYr9iz2KogJyt2LnJvdW5kKTsKICB9CgogIC8qIGhhbmQgKi8KICBjb25zdCBoYW5kPSQoJ2hhbmQnKTtoYW5kLmlubmVySFRNTD0nJzsKICBjb25zdCBzb3J0ZWQ9di5oYW5kLnNsaWNlKCkuc29ydCgoYSxiKT0+U1VJVFMuaW5kZXhPZihhLnMpLVNVSVRTLmluZGV4T2YoYi5zKXx8Yi5yLWEucik7CiAgY29uc3QgY3c9aGFuZENXKCksVz1oYW5kLmNsaWVudFdpZHRofHwzNDAsaz1zb3J0ZWQubGVuZ3RoO2hhbmQuc3R5bGUubWluSGVpZ2h0PShjdyoxLjQrMjYpKydweCc7CiAgY29uc3QgcHJldkg9cHJldkhhbmQ7cHJldkhhbmQ9c29ydGVkLm1hcChjaWQpO2xldCBkaT0wOwogIGNvbnN0IHN0ZXA9az4xP01hdGgubWluKGN3Ki43OCwoVy1jdy02KS8oay0xKSk6MDsKICBzb3J0ZWQuZm9yRWFjaCgoYyxpKT0+ewogICAgY29uc3QgaWQ9Y2lkKGMpLGVsPWNhcmRFbChjLG15VHVybj8nY2FuJzonJyk7ZWwuc3R5bGUuc2V0UHJvcGVydHkoJy0tY3cnLGN3KydweCcpOwogICAgaWYoIXByZXZILmluY2x1ZGVzKGlkKSl7ZWwuY2xhc3NMaXN0LmFkZCgnZGVhbCcpO2VsLnN0eWxlLnNldFByb3BlcnR5KCctLWQnLGRpKyspO30KICAgIGlmKGk+MCllbC5zdHlsZS5tYXJnaW5MZWZ0PShzdGVwLWN3KSsncHgnOwogICAgY29uc3Qgb2ZmPWktKGstMSkvMjsKICAgIGVsLnN0eWxlLnNldFByb3BlcnR5KCctLXInLChvZmYqMS44KSsnZGVnJyk7CiAgICBlbC5zdHlsZS5zZXRQcm9wZXJ0eSgnLS15JywoTWF0aC5hYnMob2ZmKSpNYXRoLmFicyhvZmYpKi4zNSkrJ3B4Jyk7CiAgICBpZihpZD09PXNlbEgpZWwuY2xhc3NMaXN0LmFkZCgnc2VsJyk7CiAgICBpZihteVR1cm4pZWwub25jbGljaz0oKT0+ewogICAgICBpZihzZWxIPT09aWQpe3NlbEg9bnVsbDtzZWxGLmNsZWFyKCk7fQogICAgICBlbHNlewogICAgICAgIHNlbEg9aWQ7c2VsRi5jbGVhcigpOwogICAgICAgIGlmKGMucj09PTEyfHxjLnI9PT0xMyl7Y29uc3Qgc2FtZT12LmZsb29yLmZpbHRlcih4PT54LnI9PT1jLnIpO2lmKHNhbWUubGVuZ3RoPT09MSlzZWxGLmFkZChjaWQoc2FtZVswXSkpO30KICAgICAgfQogICAgICBzbmFwKCk7cmVuZGVyKFYpOwogICAgfTsKICAgIGhhbmQuYXBwZW5kQ2hpbGQoZWwpOwogIH0pOwp9CgovKiA9PT09PT09PT09PT09PT09PSBVSSB3aXJpbmcgPT09PT09PT09PT09PT09PT0gKi8KJCgnY3JlYXRlQnRuJykub25jbGljaz0oKT0+e2dvRlModHJ1ZSk7Y3JlYXRlUm9vbSgpO307CiQoJ2ZzQnRuJykub25jbGljaz0oKT0+Z29GUyhmYWxzZSk7CiQoJ2pvaW5CdG4nKS5vbmNsaWNrPSgpPT57Z29GUyh0cnVlKTtqb2luUm9vbSgpO307CiQoJ2NvZGVJbicpLmFkZEV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLGU9PntpZihlLmtleT09PSdFbnRlcicpam9pblJvb20oKTt9KTsKJCgnY29weUJ0bicpLm9uY2xpY2s9KCk9PnsKICBjb25zdCBjPSQoJ2NvZGUnKS50ZXh0Q29udGVudDsKICAobmF2aWdhdG9yLmNsaXBib2FyZD9uYXZpZ2F0b3IuY2xpcGJvYXJkLndyaXRlVGV4dChjKTpQcm9taXNlLnJlamVjdCgpKS50aGVuKCgpPT50b2FzdCgn2qnYryDaqdm+24wg2LTYrycpKS5jYXRjaCgoKT0+dG9hc3QoJ9qp2K86ICcrYykpOwp9OwokKCdjYXBCdG4nKS5vbmNsaWNrPSgpPT57CiAgaWYoIVZ8fCFzZWxIKXJldHVybjsKICBjb25zdCBzYz1WLmhhbmQuZmluZChjPT5jaWQoYyk9PT1zZWxIKTtpZighc2MpcmV0dXJuOwogIGNvbnN0IHRvb2s9ZXZhbENhcHR1cmUoc2MsVi5mbG9vcixzZWxDYXJkcyhWKSk7aWYoIXRvb2spcmV0dXJuOwogIGFjdCh7dDoncGxheScsaWQ6c2VsSCxjYXA6dHJ1ZSx0YWtlOnRvb2subWFwKGNpZCl9KTtzZWxIPW51bGw7c2VsRi5jbGVhcigpO3JlbmRlcihWKTsKfTsKJCgnZHJvcEJ0bicpLm9uY2xpY2s9KCk9PnsKICBpZighVnx8IXNlbEgpcmV0dXJuOwogIGFjdCh7dDoncGxheScsaWQ6c2VsSCxjYXA6ZmFsc2V9KTtzZWxIPW51bGw7c2VsRi5jbGVhcigpO3JlbmRlcihWKTsKfTsKJCgnYWdhaW4nKS5vbmNsaWNrPSgpPT5hY3Qoe3Q6J3JlbWF0Y2gnfSk7CiQoJ2hlbHBCdG4nKS5vbmNsaWNrPSgpPT4kKCdydWxlcycpLmNsYXNzTGlzdC5yZW1vdmUoJ2hpZGRlbicpOwokKCdydWxlc0J0bicpLm9uY2xpY2s9KCk9PiQoJ3J1bGVzJykuY2xhc3NMaXN0LnJlbW92ZSgnaGlkZGVuJyk7CiQoJ3J1bGVzQ2xvc2UnKS5vbmNsaWNrPSgpPT4kKCdydWxlcycpLmNsYXNzTGlzdC5hZGQoJ2hpZGRlbicpOwokKCdydWxlcycpLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJyxlPT57aWYoZS50YXJnZXQ9PT0kKCdydWxlcycpKSQoJ3J1bGVzJykuY2xhc3NMaXN0LmFkZCgnaGlkZGVuJyk7fSk7CndpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdyZXNpemUnLCgpPT57aWYoViYmISQoJ2dhbWUnKS5jbGFzc0xpc3QuY29udGFpbnMoJ2hpZGRlbicpKXJlbmRlcihWKTt9KTsKCihmdW5jdGlvbiBpbml0KCl7CiAgJCgndGcnKS50ZXh0Q29udGVudD0kKCd0ZzInKS50ZXh0Q29udGVudD1UQVJHRVQ7CiAgY29uc3Qgc3Y9bHMoJ2NiX25hbWUnKTtpZihzdikkKCduYW1lSW4nKS52YWx1ZT1zdjsKICAkKCduYW1lSW4nKS5hZGRFdmVudExpc3RlbmVyKCdpbnB1dCcsKCk9PmxzKCdjYl9uYW1lJywkKCduYW1lSW4nKS52YWx1ZS50cmltKCkpKTsKICBpZihsb2NhdGlvbi5oYXNoLmxlbmd0aD4xKSQoJ2NvZGVJbicpLnZhbHVlPW5vcm0obG9jYXRpb24uaGFzaCk7CiAgY29uc3QgZmFuPSQoJ2ZhbicpOwogIFt7czonQycscjoxMX0se3M6J0QnLHI6MTB9LHtzOidIJyxyOjE0fSx7czonUycscjoxM30se3M6J0MnLHI6Mn1dLmZvckVhY2goKGMsaSk9PnsKICAgIGNvbnN0IGVsPWNhcmRFbChjKTtlbC5zdHlsZS5zZXRQcm9wZXJ0eSgnLS1yJywoaS0yKSoxMSsnZGVnJyk7ZWwuc3R5bGUuc2V0UHJvcGVydHkoJy0tdHknLE1hdGguYWJzKGktMikqNCsncHgnKTtlbC5zdHlsZS5zZXRQcm9wZXJ0eSgnLS1pJyxpKTtmYW4uYXBwZW5kQ2hpbGQoZWwpOwogIH0pOwp9KSgpOwo8L3NjcmlwdD4KPC9ib2R5Pgo8L2h0bWw+Cg==',cityrun:'PCFET0NUWVBFIGh0bWw+CjxodG1sIGxhbmc9ImZhIiBkaXI9InJ0bCI+PGhlYWQ+PG1ldGEgY2hhcnNldD0idXRmLTgiPgo8bWV0YSBuYW1lPSJ2aWV3cG9ydCIgY29udGVudD0id2lkdGg9ZGV2aWNlLXdpZHRoLCBpbml0aWFsLXNjYWxlPTEsIHVzZXItc2NhbGFibGU9bm8sIHZpZXdwb3J0LWZpdD1jb3ZlciI+Cjx0aXRsZT5DaXR5IFJ1bjwvdGl0bGU+CjxzdHlsZT4KaHRtbCxib2R5e21hcmdpbjowO2hlaWdodDoxMDAlO2JhY2tncm91bmQ6IzAwMDtvdmVyZmxvdzpoaWRkZW47Zm9udC1mYW1pbHk6J0NvdXJpZXIgTmV3JyxUYWhvbWEsbW9ub3NwYWNlOy13ZWJraXQtdXNlci1zZWxlY3Q6bm9uZTt1c2VyLXNlbGVjdDpub25lOy13ZWJraXQtdGFwLWhpZ2hsaWdodC1jb2xvcjp0cmFuc3BhcmVudH0KY2FudmFze2Rpc3BsYXk6YmxvY2s7d2lkdGg6MTAwJTtoZWlnaHQ6MTAwJTtpbWFnZS1yZW5kZXJpbmc6cGl4ZWxhdGVkO3RvdWNoLWFjdGlvbjpub25lfQojaHVke3Bvc2l0aW9uOmZpeGVkO3RvcDpjYWxjKDhweCArIGVudihzYWZlLWFyZWEtaW5zZXQtdG9wLDBweCkpO2xlZnQ6MTBweDtyaWdodDoxMHB4O2Rpc3BsYXk6ZmxleDtqdXN0aWZ5LWNvbnRlbnQ6c3BhY2UtYmV0d2VlbjtkaXJlY3Rpb246bHRyO2NvbG9yOiNmZmY7Zm9udC13ZWlnaHQ6Ym9sZDtmb250LXNpemU6MThweDt0ZXh0LXNoYWRvdzoycHggMnB4IDAgIzAwMDtwb2ludGVyLWV2ZW50czpub25lfQojYmFubmVye3Bvc2l0aW9uOmZpeGVkO3RvcDoyMiU7bGVmdDowO3JpZ2h0OjA7dGV4dC1hbGlnbjpjZW50ZXI7Y29sb3I6I2ZmZTI0YTtmb250LXNpemU6MzBweDtmb250LXdlaWdodDpib2xkO3RleHQtc2hhZG93OjNweCAzcHggMCAjYjMyNjFlLC0xcHggLTFweCAwICMwMDA7b3BhY2l0eTowO3BvaW50ZXItZXZlbnRzOm5vbmV9CiNiYW5uZXIuc2hvd3thbmltYXRpb246YiAyLjZzIHN0ZXBzKDE0KSBmb3J3YXJkc30KQGtleWZyYW1lcyBiezAle29wYWNpdHk6MDt0cmFuc2Zvcm06c2NhbGUoLjYpfTEyJXtvcGFjaXR5OjE7dHJhbnNmb3JtOnNjYWxlKDEuMSl9MjIle3RyYW5zZm9ybTpzY2FsZSgxKX04MCV7b3BhY2l0eToxfTEwMCV7b3BhY2l0eTowfX0KI292e3Bvc2l0aW9uOmZpeGVkO2luc2V0OjA7ZGlzcGxheTpmbGV4O2ZsZXgtZGlyZWN0aW9uOmNvbHVtbjthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OnNhZmUgY2VudGVyO292ZXJmbG93LXk6YXV0bzt0b3VjaC1hY3Rpb246cGFuLXk7YmFja2dyb3VuZDpyZ2JhKDUsMCwzMCwuNzgpO2NvbG9yOiNmZmY7dGV4dC1hbGlnbjpjZW50ZXI7cGFkZGluZzoyMHB4O2dhcDoxMHB4fQojb3YgaDF7bWFyZ2luOjA7Zm9udC1zaXplOjQ0cHg7Y29sb3I6I2ZmZTI0YTtsZXR0ZXItc3BhY2luZzo0cHg7dGV4dC1zaGFkb3c6NHB4IDRweCAwICNiMzI2MWV9CiNvdiBwe21hcmdpbjowO2xpbmUtaGVpZ2h0OjEuOTtmb250LXNpemU6MTVweDtjb2xvcjojY2RlfQouYnRue21hcmdpbi10b3A6MTRweDtwYWRkaW5nOjE0cHggMzRweDtmb250OmJvbGQgMjJweCAnQ291cmllciBOZXcnLFRhaG9tYTtjb2xvcjojMDAwO2JhY2tncm91bmQ6IzNkZGM0YTtib3JkZXI6MDtib3gtc2hhZG93OjAgNXB4IDAgIzE2OGEyMCwwIDAgMCAzcHggIzAwMDtib3JkZXItcmFkaXVzOjRweH0KLmIye2JhY2tncm91bmQ6IzRhYThmZjtib3gtc2hhZG93OjAgNXB4IDAgIzFkNWZhOCwwIDAgMCAzcHggIzAwMDtmb250LXNpemU6MTlweDtwYWRkaW5nOjExcHggMzBweH0KI21ue2xlZnQ6NjBweH0KLmhwe3RleHQtYWxpZ246cmlnaHQhaW1wb3J0YW50O2xpbmUtaGVpZ2h0OjIuMSFpbXBvcnRhbnQ7Zm9udC1zaXplOjE2cHghaW1wb3J0YW50O21heC13aWR0aDozNDBweH0KLnNne2Rpc3BsYXk6Z3JpZDtncmlkLXRlbXBsYXRlLWNvbHVtbnM6cmVwZWF0KDIsMWZyKTtnYXA6OHB4O3dpZHRoOjEwMCU7bWF4LXdpZHRoOjM4MHB4fS5za3tib3JkZXI6M3B4IHNvbGlkO2JvcmRlci1yYWRpdXM6OHB4O2JhY2tncm91bmQ6cmdiYSgyNTUsMjU1LDI1NSwuMDcpO3BhZGRpbmc6OHB4IDRweDtkaXNwbGF5OmZsZXg7ZmxleC1kaXJlY3Rpb246Y29sdW1uO2FsaWduLWl0ZW1zOmNlbnRlcjtnYXA6M3B4O2ZvbnQtc2l6ZToxM3B4fS5zay5vbntiYWNrZ3JvdW5kOnJnYmEoNjEsMjIwLDc0LC4yKX0uc2sgY2FudmFze3dpZHRoOjY0cHg7aGVpZ2h0OjgwcHg7aW1hZ2UtcmVuZGVyaW5nOnBpeGVsYXRlZH0uc2sgc21hbGx7Zm9udC1zaXplOjExcHh9LmIze21hcmdpbi10b3A6MnB4O3BhZGRpbmc6NnB4IDEwcHg7Zm9udDpib2xkIDEycHggVGFob21hLG1vbm9zcGFjZTtib3JkZXI6MDtib3JkZXItcmFkaXVzOjRweDtiYWNrZ3JvdW5kOiNmZmQ0MDA7Y29sb3I6IzAwMH0uc2sub24gLmIze2JhY2tncm91bmQ6IzNkZGM0YX0KLmJ0bjphY3RpdmV7dHJhbnNmb3JtOnRyYW5zbGF0ZVkoNHB4KTtib3gtc2hhZG93OjAgMXB4IDAgIzE2OGEyMCwwIDAgMCAzcHggIzAwMH0KI3NuZCwjbW57cG9zaXRpb246Zml4ZWQ7Ym90dG9tOmNhbGMoMTBweCArIGVudihzYWZlLWFyZWEtaW5zZXQtYm90dG9tLDBweCkpO2xlZnQ6MTBweDt6LWluZGV4OjM7d2lkdGg6NDJweDtoZWlnaHQ6NDJweDtib3JkZXI6MDtib3JkZXItcmFkaXVzOjUwJTtiYWNrZ3JvdW5kOnJnYmEoMjU1LDI1NSwyNTUsLjIpO2ZvbnQtc2l6ZToyMHB4fQojZnN7cG9zaXRpb246Zml4ZWQ7Ym90dG9tOmNhbGMoMTBweCArIGVudihzYWZlLWFyZWEtaW5zZXQtYm90dG9tLDBweCkpO3JpZ2h0OjEwcHg7ei1pbmRleDo1O21pbi1oZWlnaHQ6NDJweDtwYWRkaW5nOjAgMTJweDtib3JkZXI6MXB4IHNvbGlkIHJnYmEoMjU1LDI1NSwyNTUsLjU1KTtib3JkZXItcmFkaXVzOjIycHg7YmFja2dyb3VuZDpyZ2JhKDAsMCwwLC42Mik7Y29sb3I6I2ZmZjtmb250OmJvbGQgMTNweCBUYWhvbWEsc2Fucy1zZXJpZjt0b3VjaC1hY3Rpb246bWFuaXB1bGF0aW9ufQo8L3N0eWxlPjwvaGVhZD48Ym9keT4KPGNhbnZhcyBpZD0iYyI+PC9jYW52YXM+CjxkaXYgaWQ9Imh1ZCI+PHNwYW4gaWQ9InNjIj4wIG08L3NwYW4+PHNwYW4gaWQ9ImNpIj48L3NwYW4+PHNwYW4gaWQ9ImNvIj7wn6qZIDA8L3NwYW4+PC9kaXY+CjxkaXYgaWQ9ImJhbm5lciI+PC9kaXY+CjxkaXYgaWQ9Im92Ij48L2Rpdj4KPGJ1dHRvbiBpZD0ic25kIj7wn5SKPC9idXR0b24+PGJ1dHRvbiBpZD0ibW4iIHN0eWxlPSJ2aXNpYmlsaXR5OmhpZGRlbiI+4o+4PC9idXR0b24+PGJ1dHRvbiBpZD0iZnMiIHR5cGU9ImJ1dHRvbiIgYXJpYS1sYWJlbD0i2K7YsdmI2Kwg2KfYsiDYqtmF2KfZheKAjNi12YHYrdmHIj7im7Yg2K7YsdmI2Kw8L2J1dHRvbj4KPHNjcmlwdD4KY29uc3QgY3Y9ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2MnKSxjdHg9Y3YuZ2V0Q29udGV4dCgnMmQnKSwkPWlkPT5kb2N1bWVudC5nZXRFbGVtZW50QnlJZChpZCk7CmNvbnN0IGxzPShrLHYpPT57dHJ5e2lmKHY9PT11bmRlZmluZWQpcmV0dXJuIGxvY2FsU3RvcmFnZS5nZXRJdGVtKGspO2xvY2FsU3RvcmFnZS5zZXRJdGVtKGssdil9Y2F0Y2goZSl7cmV0dXJuIG51bGx9fTsKY29uc3QgdG9GYT1uPT5TdHJpbmcobikucmVwbGFjZSgvXGQvZyxkPT4n27Dbsduy27PbtNu127bbt9u427knW2RdKTsKY29uc3QgTj0n2KrZh9ix2KfZhtiM2KfYtdmB2YfYp9mG2IzYtNuM2LHYp9iy2IzYqtio2LHbjNiy2IzZhdi02YfYr9iM24zYstiv2Izaqdin2LTYp9mG2IzYsdi02KrYjNin2YfZiNin2LLYjNqp2LHZhdin2YbYjNin2LPYqtin2YbYqNmI2YTYjNii2Ybaqdin2LHYp9iM2K/YqNuM2IzYp9io2YjYuNio24zYjNiv2YjYrdmH2IzYsduM2KfYttiM2KzYr9mH2IzZhdiz2YLYt9iM2KjYutiv2KfYr9iM2K/Zhdi02YLYjNio24zYsdmI2KrYjNmC2KfZh9ix2YfYjNin2LPaqdmG2K/YsduM2YfYjNqp2KfYstin2KjZhNin2Ybaqdin2IzZhdix2Kfaqdi02IzYqtmI2YbYs9iM2KLYqtmG2IzYsdmF2IzZhduM2YTYp9mG2IzZiNmG24zYstiM2YHZhNmI2LHYp9mG2LPYjNm+2KfYsduM2LPYjNmE24zZiNmG2IzZhdin2LHYs9uM2IzZhdin2K/YsduM2K/YjNio2KfYsdiz2YTZiNmG2KfYjNmE24zYs9io2YjZhtiM2b7ZiNix2KrZiNiM2YTZhtiv2YbYjNmF2Ybahtiz2KrYsdiM2KfYr9uM2YbYqNmI2LHZiNiM2K/ZiNio2YTbjNmG2IzYotmF2LPYqtix2K/Yp9mF2IzYqNix2Yjaqdiz2YTYjNio2LHZhNuM2YbYjNmF2YjZhtuM2K7YjNmH2KfZhdio2YjYsdqv2IzZiNuM2YbYjNiy2YjYsduM2K7YjNqY2YbZiNiM2b7Ysdin2q/YjNio2YjYr9in2b7Ys9iq2IzZiNix2LTZiNiM2qnYsdin2qnZiNmB2IzYp9iz2KraqdmH2YTZhdiM2KfYs9mE2YjYjNqp2b7ZhtmH2Kfar9iM2YfZhNiz24zZhtqp24zYjNmF2LPaqdmI2IzYs9mG4oCM2b7Yqtix2LLYqNmI2LHar9iM2qnbjOKAjNuM2YHYjNio2KfaqdmI2IzYqtmB2YTbjNiz2IzYp9uM2LHZiNin2YbYjNiq2KfYtNqp2YbYr9iM2LPZhdix2YLZhtiv2IzYqNiu2KfYsdin2IzYotmE2YXYp9iq24zYjNqp2KfYqNmE2IzYp9iz2YTYp9mF4oCM2KLYqNin2K/YjNmE2KfZh9mI2LHYjNiv2YfZhNuM2IzYqNmF2KjYptuM2IzaqdmE2qnYqtmH2Izaqdin2KrZhdin2YbYr9mI2IzaqdmE2YXYqNmI2IzYr9in2qnYp9iM2KjYp9mG2qnZiNqp2IzZh9in2YbZiNuM2IzYs9in24zar9mI2YbYjNiz2Ybar9in2b7ZiNix2IzaqdmI2KfZhNin2YTYp9mF2b7ZiNix2IzYrNin2qnYp9ix2KrYp9iM2YXYp9mG24zZhNiM2b7aqdmG2IzYtNin2Ybar9mH2KfbjNiM2YfZhtqv4oCM2qnZhtqv2IzYs9im2YjZhNiM2KrZiNqp24zZiNiM2KfZiNiy2Kfaqdin2IzaqduM2YjYqtmI2IzYs9uM2K/ZhtuM2IzZhdmE2KjZiNix2YbYjNin2YjaqdmE2YbYr9iM2YbbjNmI24zZiNix2qnYjNio2YjYs9iq2YjZhtiM2LTbjNqp2Kfar9mI2IzZiNin2LTZhtqv2KrZhtiM2YXbjNin2YXbjNiM2YTYs+KAjNii2YbYrNmE2LPYjNiz2KfZhuKAjNmB2LHYp9mG2LPbjNiz2qnZiNiM2YTYp9iz4oCM2Yjar9in2LPYjNiz24zYp9iq2YTYjNmI2YbaqdmI2YjYsdiM2KrZiNix2YbYqtmI2IzZhdqp2LLbjNqp2YjYs9uM2KrbjNiM2YfYp9mI2KfZhtin2IzYqNmI2q/ZiNiq2KfYjNmE24zZhdin2IzYsduM2YjYr9mI2pjYp9mG24zYsdmI2IzYqNmI2KbZhtmI2LPigIzYotuM2LHYs9iM2LPYp9mG2KrbjNin2q/ZiNiM2qnbjNm+4oCM2KrYp9mI2YbYjNmG2KfbjNix2YjYqNuM2IzZhNin2q/ZiNizJy5zcGxpdCgn2IwnKTsKY29uc3QgQ0lUWV9NPTMwMDsKY29uc3QgY25hbWU9aT0+TltpJU4ubGVuZ3RoXSsoaT49Ti5sZW5ndGg/JyAnK3RvRmEoTWF0aC5mbG9vcihpL04ubGVuZ3RoKSsxKTonJyk7Ci8vIC0tLS0gaGVscGVycyAtLS0tCmNvbnN0IHJuZz1hPT4oKT0+e2F8PTA7YT1hKzB4NkQyQjc5RjV8MDtsZXQgdD1NYXRoLmltdWwoYV5hPj4+MTUsMXxhKTt0PXQrTWF0aC5pbXVsKHRedD4+PjcsNjF8dCledDtyZXR1cm4oKHRedD4+PjE0KT4+PjApLzQyOTQ5NjcyOTZ9OwpmdW5jdGlvbiBoc2woaCxzLGwpe2g9KChoJTM2MCkrMzYwKSUzNjA7cy89MTAwO2wvPTEwMDtjb25zdCBrPW49PihuK2gvMzApJTEyLGE9cypNYXRoLm1pbihsLDEtbCksZj1uPT5sLWEqTWF0aC5tYXgoLTEsTWF0aC5taW4oayhuKS0zLE1hdGgubWluKDktayhuKSwxKSkpO3JldHVybltmKDApKjI1NSxmKDgpKjI1NSxmKDQpKjI1NV19CmNvbnN0IHJnYj1jPT4ncmdiKCcrKGNbMF18MCkrJywnKyhjWzFdfDApKycsJysoY1syXXwwKSsnKSc7CmNvbnN0IG1peD0oYSxiLHQpPT5hLm1hcD9hLm1hcCgodixpKT0+disoYltpXS12KSp0KTphKyhiLWEpKnQ7CmZ1bmN0aW9uIHN0eWxlKGkpe2NvbnN0IHI9cm5nKGkqOTc3KzUpLGg9KGkqMTM3LjUrcigpKjI1KSUzNjAsdG9kPWklNCxuPXRvZD09PTI7CiBjb25zdCBzaz1bW2hzbCgyMDUrcigpKjI1LDc1LDU4KSxoc2woMTkwLDY1LDgyKV0sW2hzbCgyNzArcigpKjQwLDUwLDMyKSxoc2woMTUrcigpKjIwLDkwLDY0KV0sW2hzbCgyNDAsNjAsNyksaHNsKDI1MCtyKCkqMzAsNTUsMjIpXSxbaHNsKDMyMCtyKCkqMjAsNDUsNDQpLGhzbCg0MCw4NSw3NildXVt0b2RdOwogcmV0dXJue2ksdG9kLHRvcDpza1swXSxib3Q6c2tbMV0sZ3JvdW5kOmhzbChoLDM1LG4/MTM6MzApLGdsOmhzbChoLDUwLG4/Mjg6NTApLAogIGZhcjpoc2woaCwyOCxuPzE0OnRvZD09PTE/MzA6NTgpLG1pZDpoc2woaCsyMCwzNSxuPzEwOnRvZD09PTE/MjI6NDQpLG5lYXI6aHNsKGgrNDAsNDAsbj82OjE2KSwKICB3aW46bnx8dG9kPT09MT9bMjU1LDIyNiwxMTBdOlsxNzAsMjIwLDI1NV0scm9vZjpNYXRoLmZsb29yKHIoKSo0KSx3MDoxMityKCkqOCx3MToxNCtyKCkqMjYsaG06LjM1K3IoKSouNDUsbG06aSU2LAogIHN0YXI6bj8xOjAsb3JiOltbMjU1LDI0MCwxNTBdLFsyNTUsMTEwLDUwXSxbMjI1LDIzMCwyNTVdLFsyNTUsMjAwLDEyMF1dW3RvZF0sb3k6Wy4yLC41LC4xNCwuNDVdW3RvZF19fQovLyAtLS0tIGF1ZGlvIC0tLS0KbGV0IEFDLG1hc3RlcixtdXRlZD1scygnY3JfbScpPT09JzEnLG10PTA7CmZ1bmN0aW9uIGluaXRBdWRpbygpe2lmKCFBQyl7dHJ5e0FDPW5ldyh3aW5kb3cuQXVkaW9Db250ZXh0fHx3aW5kb3cud2Via2l0QXVkaW9Db250ZXh0KSgpO21hc3Rlcj1BQy5jcmVhdGVHYWluKCk7bWFzdGVyLmdhaW4udmFsdWU9LjU7bWFzdGVyLmNvbm5lY3QoQUMuZGVzdGluYXRpb24pfWNhdGNoKGUpe319aWYoQUMmJkFDLnN0YXRlIT09J3J1bm5pbmcnKUFDLnJlc3VtZSgpfQpmdW5jdGlvbiB0b25lKGYsZCx0eSx2LGYyKXtpZighQUN8fG11dGVkKXJldHVybjtjb25zdCB0PUFDLmN1cnJlbnRUaW1lLG89QUMuY3JlYXRlT3NjaWxsYXRvcigpLGc9QUMuY3JlYXRlR2FpbigpO28udHlwZT10eXx8J3NxdWFyZSc7by5mcmVxdWVuY3kuc2V0VmFsdWVBdFRpbWUoZix0KTtpZihmMilvLmZyZXF1ZW5jeS5leHBvbmVudGlhbFJhbXBUb1ZhbHVlQXRUaW1lKGYyLHQrZCk7Zy5nYWluLnNldFZhbHVlQXRUaW1lKHZ8fC4xNSx0KTtnLmdhaW4uZXhwb25lbnRpYWxSYW1wVG9WYWx1ZUF0VGltZSguMDAxLHQrZCk7by5jb25uZWN0KGcpO2cuY29ubmVjdChtYXN0ZXIpO28uc3RhcnQodCk7by5zdG9wKHQrZCl9CmZ1bmN0aW9uIG5vaXNlKGQsdil7aWYoIUFDfHxtdXRlZClyZXR1cm47Y29uc3Qgbj1BQy5zYW1wbGVSYXRlKmQsYj1BQy5jcmVhdGVCdWZmZXIoMSxuLEFDLnNhbXBsZVJhdGUpLGE9Yi5nZXRDaGFubmVsRGF0YSgwKTtmb3IobGV0IGk9MDtpPG47aSsrKWFbaV09KE1hdGgucmFuZG9tKCkqMi0xKSooMS1pL24pO2NvbnN0IHM9QUMuY3JlYXRlQnVmZmVyU291cmNlKCksZz1BQy5jcmVhdGVHYWluKCk7cy5idWZmZXI9YjtnLmdhaW4udmFsdWU9djtzLmNvbm5lY3QoZyk7Zy5jb25uZWN0KG1hc3Rlcik7cy5zdGFydCgpfQpjb25zdCBtZj1uPT40NDAqTWF0aC5wb3coMiwobi02OSkvMTIpOwpmdW5jdGlvbiBzZngoayl7aWYoaz09PSdqdW1wJyl0b25lKDMwMCwuMTMsJ3NxdWFyZScsLjEyLDcwMCk7ZWxzZSBpZihrPT09J2RqJyl0b25lKDQ1MCwuMTIsJ3NxdWFyZScsLjEyLDkwMCk7ZWxzZSBpZihrPT09J3NsaWRlJylub2lzZSguMTIsLjE1KTsKIGVsc2UgaWYoaz09PSdjb2luJyl7dG9uZSg5ODgsLjA3LCdzcXVhcmUnLC4xMik7c2V0VGltZW91dCgoKT0+dG9uZSgxMzE5LC4xMiwnc3F1YXJlJywuMTIpLDYwKX0KIGVsc2UgaWYoaz09PSdjcmFzaCcpe25vaXNlKC41LC41KTt0b25lKDIwMCwuNSwnc2F3dG9vdGgnLC4yLDQwKX0KIGVsc2UgaWYoaz09PSdjaXR5Jyl7WzAsNCw3LDEyLDE2XS5mb3JFYWNoKCh4LGkpPT5zZXRUaW1lb3V0KCgpPT50b25lKG1mKDY5K3gpLC4xNCwnc3F1YXJlJywuMTIpLGkqNzApKX19CnNldEludGVydmFsKCgpPT57aWYoIUFDfHxtdXRlZHx8QUMuc3RhdGUhPT0ncnVubmluZyd8fHN0YXRlIT09J3BsYXknKXJldHVybjtjb25zdCByPTU3KyhjaXR5SSo1KSUxMixwYXQ9WzAsNywxMiw3LDMsMTAsMTUsMTBdLHN0PW10KyslMTYsYmFyPShtdD4+NCklNDsKIGlmKHN0JTI9PT0wKXRvbmUobWYoci0xMitbMCwwLDUsN11bYmFyXSksLjEyLCdzcXVhcmUnLC4wNik7dG9uZShtZihyK3BhdFtzdCU4XSsoc3Q+Nz8xMjowKSksLjA5LCdzcXVhcmUnLC4wNCk7aWYoc3QlND09PTIpbm9pc2UoLjA0LC4wNSl9LDEyNSk7CgovLyAtLS0tIHdhbGxldCAmIHNraW5zIC0tLS0KY29uc3QgUkFSPXtjb21tb246WyfZhdi52YXZiNmE24wnLCcjYjBiOGM0J10scmFyZTpbJ9qp2YXbjNin2KgnLCcjNGFhOGZmJ10sZXBpYzpbJ9it2YXYp9iz24wnLCcjYjQ1Y2ZmJ10sbGVnZW5kOlsn2KfZgdiz2KfZhtmH4oCM2KfbjCcsJyNmZmIwMjAnXSxteXRoaWM6WyfYp9iz2LfZiNix2YfigIzYp9uMJywnI2ZmM2Q3ZiddfTsKY29uc3QgU0tOPVsKe246J9mC2YfYsdmF2KfZhicscjonY29tbW9uJyxwOjAsc2g6JyNlNTM5MzUnLHBhOicjMjI1NWNjJyxzazonI2ZmY2M5OScsaHI6JyM0YTJmMWInfSwKe246J9iz2KjYstm+2YjYtCcscjonY29tbW9uJyxwOjQwLHNoOicjMmU5ZTQ0JyxwYTonIzI3NGE4YScsc2s6JyNmMmMyOWInLGhyOicjMjIyJ30sCntuOifYotio24zigIzZvtmI2LQnLHI6J2NvbW1vbicscDo2MCxzaDonIzJhN2RlMScscGE6JyMzMzMnLHNrOicjZTBhODc4JyxocjonIzZiM2ExYSd9LAp7bjon2LLYsdivINio2LHZgtuMJyxyOidjb21tb24nLHA6ODAsc2g6JyNmNWM1MTgnLHBhOicjNDQ0JyxzazonI2ZmZDFhOCcsaHI6JyNhMDUyMmQnLGZ4OjF9LAp7bjon2YbbjNmG2KzYpycscjoncmFyZScscDoyNTAsc2g6JyMxZDFkMjQnLHBhOicjMWQxZDI0JyxzazonI2ZmY2M5OScsaHI6JyMxMTEnLGFjYzoxfSwKe246J9ix2KjYp9iqJyxyOidyYXJlJyxwOjMwMCxzaDonIzlhYTdiNCcscGE6JyM1ZDZiNzgnLHNrOicjYzZkMmRjJyxocjonIzVkNmI3OCcsYWNjOjJ9LAp7bjon24zYrtuMJyxyOidyYXJlJyxwOjM1MCxzaDonIzdmZDhmZicscGE6JyMzYjZmYjMnLHNrOicjZThmNmZmJyxocjonI2ZmZicsZng6MX0sCntuOifZgdi22KfZhtmI2LHYrycscjonZXBpYycscDo3MDAsc2g6JyNmMmYyZjInLHBhOicjZDlkOWQ5JyxzazonI2ZmY2M5OScsaHI6JyNiYmInLGFjYzozLGZ4OjF9LAp7bjon2LTZiNin2YTbjNmHJyxyOidlcGljJyxwOjkwMCxzaDonIzlhYTBhOCcscGE6JyM2YjcwNzgnLHNrOicjZmZjYzk5JyxocjonIzlhYTBhOCcsYWNjOjMsZng6MX0sCntuOifYrNin2K/ZiNqv2LEnLHI6J2VwaWMnLHA6MTAwMCxzaDonIzZhMmZjNCcscGE6JyMzYjFiNzgnLHNrOicjZmZjYzk5JyxocjonI2VlZScsYWNjOjksZng6NH0sCntuOifYtNin2YcnLHI6J2xlZ2VuZCcscDoxODAwLHNoOicjN2ExZmEyJyxwYTonI2M5YTQwMCcsc2s6JyNmZmNjOTknLGhyOicjZmZkNzAwJyxhY2M6NCxmeDoxLGNhcGU6JyNjMDE0M2MnfSwKe246J9in2pjYr9mH2KcnLHI6J2xlZ2VuZCcscDoyNDAwLHNoOicjMWY5ZDU1JyxwYTonIzBmNWEzMicsc2s6JyM3ZGRjOGEnLGhyOicjMGY1YTMyJyxhY2M6NSxmeDoyfSwKe246J9mB2LHYtNiq2YcnLHI6J2xlZ2VuZCcscDoyODAwLHNoOicjZmZmZmZmJyxwYTonI2Y3ZTliOCcsc2s6JyNmZmUyYzQnLGhyOicjZmZkNzAwJyxhY2M6NixmeDoxLGNhcGU6JyNmZmZmZmYnfSwKe246J9mC2YLZhtmI2LMnLHI6J215dGhpYycscDo0NTAwLHNoOicjZmY1YTFmJyxwYTonI2MxMTIxZicsc2s6JyNmZmIyN2EnLGhyOicjZmZkNDAwJyxhY2M6NSxmeDoyLGNhcGU6JyNmZjhhMDAnfSwKe246J9qp2Yfaqdi02KfZhicscjonbXl0aGljJyxwOjYwMDAsc2g6JyMyYjFiNmUnLHBhOicjMTUwZTNhJyxzazonIzlmZDBmZicsaHI6JyNmZmZmZmYnLGFjYzo2LGZ4OjQsY2FwZTonIzViMmNjOSd9LAp7bjon2LHZhtqv24zZhuKAjNqp2YXYp9mGJyxyOidteXRoaWMnLHA6ODAwMCxzaDoncmInLHBhOidyYjInLHNrOicjZmZjYzk5JyxocjonI2ZmZmZmZicsYWNjOjQsZng6MyxjYXBlOidyYid9XTsKbGV0IHdhbGxldD0rbHMoJ2NyX3cnKXx8MCxlcT0rbHMoJ2NyX2UnKXx8MCxvd25lZDt0cnl7b3duZWQ9SlNPTi5wYXJzZShscygnY3JfbycpfHwnWzBdJyl9Y2F0Y2goZSl7b3duZWQ9WzBdfQppZighQXJyYXkuaXNBcnJheShvd25lZCl8fCFvd25lZC5pbmNsdWRlcygwKSlvd25lZD1bMF0uY29uY2F0KG93bmVkfHxbXSk7aWYoIW93bmVkLmluY2x1ZGVzKGVxKSllcT0wOwpjb25zdCBzYXZlVz0oKT0+e2xzKCdjcl93Jyx3YWxsZXQpO2xzKCdjcl9vJyxKU09OLnN0cmluZ2lmeShvd25lZCkpO2xzKCdjcl9lJyxlcSl9Owpjb25zdCBoYz0odix0LG8pPT52PT09J3JiJz8naHNsKCcrKCgodHx8MCkqMTIwKyhvfHwwKSklMzYwfDApKycsOTAlLDYwJSknOnY9PT0ncmIyJz8naHNsKCcrKCgoKHR8fDApKjEyMCkrMTgwKSUzNjB8MCkrJyw5MCUsNTAlKSc6djsKZnVuY3Rpb24gZHJhd0hlcm8oYyx4LHksayxmcixkdSxhaXIsdCl7Y29uc3QgUT0oYSxiLHcsaCxjb2wpPT57Yy5maWxsU3R5bGU9Y29sO2MuZmlsbFJlY3QoTWF0aC5yb3VuZChhKSxNYXRoLnJvdW5kKGIpLHcsaCl9OwogY29uc3Qgc2g9aGMoay5zaCx0KSxwYT1oYyhrLnBhLHQpLGFjPWsuYWNjfHwwOwogaWYoay5jYXBlKVEoeC04LHktMTIsNSxkdT80OjksaGMoay5jYXBlLHQsNjApKTsKIGlmKGR1KXtRKHgtNix5LTgsMTIsNixzaCk7USh4KzMseS0xMCw2LDYsay5zayk7USh4KzMseS0xMSw2LDIsay5ocik7USh4LTgseS0zLDQsMyxwYSk7CiAgaWYoYWM9PT0xKVEoeCszLHktOSw2LDEsJyNlNTM5MzUnKTtpZihhYz09PTIpUSh4KzUseS05LDQsMiwnIzM1ZjJmZicpO2lmKGFjPT09MylRKHgrMix5LTEyLDgsMywnI2NmZDhlMycpO2lmKGFjPT09NClRKHgrMyx5LTEzLDYsMiwnI2ZmZDcwMCcpO2lmKGFjPT09NSlRKHgrMyx5LTE0LDEsMywnI2ZmZicpO2lmKGFjPT09NilRKHgrMyx5LTEzLDYsMSwnI2ZmZTA2NicpO2lmKGFjPT09OSlRKHgrMyx5LTEzLDYsMiwnIzNiMWI3OCcpfQogZWxzZXtRKHgtMyx5LTE2LDYsNSxrLnNrKTtRKHgtMyx5LTE3LDYsMixrLmhyKTtRKHgtNCx5LTExLDgsNixzaCk7USh4LTYseS0xMCwyLDQsay5zayk7USh4KzQseS0xMCwyLDQsay5zayk7CiAgaWYoYWlyKXtRKHgtNCx5LTUsMyw0LHBhKTtRKHgrMSx5LTQsMyw0LHBhKX1lbHNlIGlmKGZyKXtRKHgtNCx5LTUsMyw1LHBhKTtRKHgrMSx5LTUsMywzLHBhKX1lbHNle1EoeC0zLHktNSwzLDMscGEpO1EoeCsxLHktNSwzLDUscGEpfQogIGlmKGFjPT09MSl7USh4LTMseS0xNSw2LDEsJyNlNTM5MzUnKTtRKHgtNix5LTE1LDMsMSwnI2U1MzkzNScpfQogIGlmKGFjPT09MilRKHgtMyx5LTE1LDYsMiwnIzM1ZjJmZicpOwogIGlmKGFjPT09Myl7USh4LTQseS0xOCw4LDIsJyNjZmQ4ZTMnKTtRKHgtNCx5LTE4LDEsNywnI2NmZDhlMycpO1EoeCszLHktMTgsMSw3LCcjY2ZkOGUzJyk7USh4LTIseS0xNSw1LDMsJyMzNWYyZmYnKX0KICBpZihhYz09PTQpe1EoeC0zLHktMTksNiwyLCcjZmZkNzAwJyk7USh4LTMseS0yMCwxLDEsJyNmZmQ3MDAnKTtRKHgtMSx5LTIwLDEsMSwnI2ZmZDcwMCcpO1EoeCsyLHktMjAsMSwxLCcjZmZkNzAwJyl9CiAgaWYoYWM9PT01KXtRKHgtNCx5LTE5LDEsMywnI2ZmZicpO1EoeCszLHktMTksMSwzLCcjZmZmJyl9CiAgaWYoYWM9PT02KVEoeC0zLHktMjAsNiwxLCcjZmZlMDY2Jyk7CiAgaWYoYWM9PT05KXtRKHgtNSx5LTE4LDEwLDEsJyMzYjFiNzgnKTtRKHgtMyx5LTIwLDYsMiwnIzZhMmZjNCcpO1EoeC0xLHktMjMsMywzLCcjNmEyZmM0Jyl9fX0KbGV0IGZ4cD1bXTsKZnVuY3Rpb24gZW1pdEZ4KGsseCx5KXtpZighay5meClyZXR1cm47Y29uc3Qgcj1NYXRoLnJhbmRvbTtpZihyKCk+LjcpcmV0dXJuO2NvbnN0IGY9ay5meDsKIGZ4cC5wdXNoKHt4OngtMyx5OnktNi1yKCkqOCx2eDotMjAtcigpKjIwLHZ5OmY9PT0yPy0yMC1yKCkqMzA6KHIoKS0uNSkqMjAsbDouNStyKCkqLjMsYzpmPT09MT8ocigpPC41PycjZmZlMjRhJzonI2ZmZicpOmY9PT0yPyhyKCk8LjU/JyNmZjdhMDAnOicjZmZkNDAwJyk6Zj09PTM/J2hzbCgnKygocGVyZm9ybWFuY2Uubm93KCkvNCklMzYwfDApKycsOTAlLDYwJSknOihyKCk8LjU/JyNmZmYnOicjYjQ1Y2ZmJyl9KX0KY29uc3QgRU1CPXdpbmRvdy5wYXJlbnQhPT13aW5kb3cmJmxvY2F0aW9uLmhyZWY9PT0nYWJvdXQ6c3JjZG9jJzsKZnVuY3Rpb24gcG9zdCh0eXBlLHNjb3JlLHdvbil7aWYoIUVNQilyZXR1cm47dHJ5e3BhcmVudC5wb3N0TWVzc2FnZSh7c291cmNlOidub3ZhLWFyY2FkZS1lbWJlZCcsZ2FtZTonY2l0eXJ1bicsdHlwZSxzY29yZTpzY29yZXx8MCx3b246ISF3b259LCcqJyl9Y2F0Y2goZSl7fX0KLy8gLS0tLSBzY3JlZW4gLS0tLQpsZXQgTFcsTEgsR1k7CmZ1bmN0aW9uIHJzKCl7Y29uc3QgVz1pbm5lcldpZHRoLEg9aW5uZXJIZWlnaHQ7aWYoSD5XKXtMVz0yNDA7TEg9TWF0aC5yb3VuZCgyNDAqSC9XKX1lbHNle0xIPTI0MDtMVz1NYXRoLnJvdW5kKDI0MCpXL0gpfWN2LndpZHRoPUxXO2N2LmhlaWdodD1MSDtHWT1NYXRoLnJvdW5kKExIKi43Nil9CmFkZEV2ZW50TGlzdGVuZXIoJ3Jlc2l6ZScscnMpO3JzKCk7Ci8vIC0tLS0gc3RhdGUgLS0tLQpsZXQgbGFzdFBvc3Q9LTEscHY9Jycsc3RhdGU9J21lbnUnLGNhbT0wLGNpdHlJPTAsY3VyPXN0eWxlKDApLHBhbCxMLGxtcSxzdGFycyxvYnMsY29pbnMsbmV4dFgscHksdnksZGosZHVjayxjb2luTixkZWFkPTAsYmVzdD0rbHMoJ2NyX2Jlc3QnKXx8MCxmbGFzaD0wLHNoYWtlPTA7bGV0IHNob3duU2NvcmU9Jycsc2hvd25Db2lucz0tMTsKY29uc3Qgc3I9cm5nKDcpO3N0YXJzPUFycmF5LmZyb20oe2xlbmd0aDo0MH0sKCk9Pih7eDpzcigpKjQwMCx5OnNyKCkqLjZ9KSk7CmNvbnN0IExBWT1be3A6LjE1LGs6J2ZhcicsaHM6LjYsd3M6Ljh9LHtwOi4zNSxrOidtaWQnLGhzOi44NSx3czoxfSx7cDouNyxrOiduZWFyJyxoczouNDUsd3M6MS4zfV07CmZ1bmN0aW9uIHJlc2V0KCl7Y2FtPTA7Y2l0eUk9MDtjdXI9c3R5bGUoMCk7cGFsPXt0b3A6Y3VyLnRvcCxib3Q6Y3VyLmJvdCxncm91bmQ6Y3VyLmdyb3VuZCxnbDpjdXIuZ2wsc3RhcjpjdXIuc3RhcixvcmI6Y3VyLm9yYixveTpjdXIub3l9OwogTD1MQVkubWFwKGw9Pih7Li4ubCxpdDpbXSxueDowfSkpO2xtcT1udWxsO29icz1bXTtjb2lucz1bXTtuZXh0WD00MjA7cHk9R1k7dnk9MDtkaj0wO2R1Y2s9MDtjb2luTj0wO2ZsYXNoPTB9CnJlc2V0KCk7Ci8vIC0tLS0gd29ybGQgLS0tLQpmdW5jdGlvbiBmaWxsTGF5ZXIobCl7Y29uc3Qgc3Q9Y3VyLHI9TWF0aC5yYW5kb207CiB3aGlsZShsLm54LWNhbSpsLnA8TFcrODApe2xldCB3PU1hdGgucm91bmQoKHN0LncwK3IoKSpzdC53MSkqbC53cyksaD1NYXRoLnJvdW5kKCguMjUrcigpKi43NSkqR1kqc3QuaG0qbC5ocyksYz1yZ2Ioc3RbbC5rXSksbG09LTE7CiAgaWYobC5rPT09J21pZCcmJmxtcSl7bG09bG1xO2xtcT1udWxsO3c9NDQ7aD1NYXRoLnJvdW5kKEdZKi41KTtjPXJnYihtaXgoc3QubWlkLFswLDAsMF0sLjI1KSl9CiAgY29uc3QgaXQ9e3g6bC5ueCx3LGgsYyxyb29mOnN0LnJvb2Ysd2luOnJnYihzdC53aW4pLHM6KHIoKSoxMDAwKXwwLGxtLGZhcjpsLms9PT0nZmFyJ307aWYoIWl0LmZhciYmbG08MCl7aXQud249W107Zm9yKGxldCB3eD0zO3d4PHctNTt3eCs9NSlmb3IobGV0IHd5PTQ7d3k8aC00O3d5Kz02KWlmKCgoaXQucyt3eCo3K3d5KjEzKSU1KTwyKWl0LnduLnB1c2goW3d4LHd5XSl9bC5pdC5wdXNoKGl0KTtsLm54Kz13K01hdGgucm91bmQocigpKjUpfQogd2hpbGUobC5pdC5sZW5ndGgmJmwuaXRbMF0ueCtsLml0WzBdLnc8Y2FtKmwucC0zMClsLml0LnNoaWZ0KCl9CmZ1bmN0aW9uIHNwYXduKHYpe2NvbnN0IHI9TWF0aC5yYW5kb20sYj1uZXh0WCxkPWNhbT41MDAwLHQ9TWF0aC5mbG9vcihyKCkqKGQ/Nzo1KSk7CiBjb25zdCBjcmF0ZT14PT5vYnMucHVzaCh7eCx0OidjJyx3OjEyLGg6MTJ9KSx0YWxsPXg9Pm9icy5wdXNoKHt4LHQ6J3QnLHc6MTAsaDoyNn0pLHNpZ249eD0+b2JzLnB1c2goe3gsdDoncycsdzoxNCxoOkdZLTExfSk7CiBpZih0PT09MCl7Y3JhdGUoYik7Zm9yKGxldCBrPS0xO2s8PTE7aysrKWNvaW5zLnB1c2goe3g6YitrKjEwLHk6R1ktMzItKGs/MDo1KX0pfQogZWxzZSBpZih0PT09MSl7dGFsbChiKTtmb3IobGV0IGs9LTE7azw9MTtrKyspY29pbnMucHVzaCh7eDpiK2sqMTAseTpHWS00NC0oaz8wOjUpfSl9CiBlbHNlIGlmKHQ9PT0yKXtzaWduKGIpO2ZvcihsZXQgaz0wO2s8NDtrKyspY29pbnMucHVzaCh7eDpiLTgrayoxMSx5OkdZLTZ9KX0KIGVsc2UgaWYodD09PTMpe2NyYXRlKGIpO2NyYXRlKGIrMjgpO2NvaW5zLnB1c2goe3g6YisxNCx5OkdZLTQwfSl9CiBlbHNlIGlmKHQ9PT00KXtmb3IobGV0IGs9MDtrPDY7aysrKWNvaW5zLnB1c2goe3g6YitrKjEyLHk6R1ktOC1NYXRoLnNpbihrLzUqTWF0aC5QSSkqMjh9KX0KIGVsc2UgaWYodD09PTUpe2NyYXRlKGIpO3NpZ24oYisxMDUpfQogZWxzZXt0YWxsKGIpO2NyYXRlKGIrODApO3NpZ24oYisxNjApfQogbmV4dFg9YisxNzArcigpKjEyMCt2Ki41fQpmdW5jdGlvbiBuZXdDaXR5KGkpe2NpdHlJPWk7Y3VyPXN0eWxlKGkpO2xtcT1jdXIubG07c2Z4KCdjaXR5Jyk7Y29uc3QgYm49JCgnYmFubmVyJyk7Ym4udGV4dENvbnRlbnQ9J9i02YfYsSAnK3RvRmEoaSsxKSsnIMK3ICcrY25hbWUoaSk7Ym4uY2xhc3NMaXN0LnJlbW92ZSgnc2hvdycpO3ZvaWQgYm4ub2Zmc2V0V2lkdGg7Ym4uY2xhc3NMaXN0LmFkZCgnc2hvdycpOyQoJ2NpJykudGV4dENvbnRlbnQ9J/Cfj5kgJysoaSsxKSsnICcrY25hbWUoaSl9Ci8vIC0tLS0gdXBkYXRlIC0tLS0KZnVuY3Rpb24gc3BlZWQoKXtyZXR1cm4gTWF0aC5taW4oMjIwLDEyMCtjYW0vNDAwKX0KZnVuY3Rpb24ganVtcCgpe2lmKHN0YXRlIT09J3BsYXknKXJldHVybjtpZihweT49R1ktLjUpe3Z5PS0zMTA7ZHVjaz0wO3NmeCgnanVtcCcpfWVsc2UgaWYoIWRqKXtkaj0xO3Z5PS0yNzA7c2Z4KCdkaicpfX0KZnVuY3Rpb24gc2xpZGUoKXtpZihzdGF0ZSE9PSdwbGF5JylyZXR1cm47aWYocHk+PUdZLS41KXtkdWNrPS42O3NmeCgnc2xpZGUnKX1lbHNlIHZ5PU1hdGgubWF4KHZ5LDMyMCl9CmZ1bmN0aW9uIGJhbmsoKXtjb25zdCBnPWNvaW5OK2NpdHlJKjEwO3dhbGxldCs9ZztzYXZlVygpO2NvaW5OPTA7cmV0dXJuIGd9CmNvbnN0IGRlYXRoQ2xpcD1uZXcgQXVkaW8oJ2RhdGE6YXVkaW8vbXBlZztiYXNlNjQsU1VRekJBQUFBQUFCQ1ZSWVdGZ0FBQUFTQUFBRGJXRnFiM0pmWW5KaGJtUUFhWE52YlFCVVdGaFlBQUFBRXdBQUEyMXBibTl5WDNabGNuTnBiMjRBTlRFeUFGUllXRmdBQUFBa0FBQURZMjl0Y0dGMGFXSnNaVjlpY21GdVpITUFhWE52YldsemJ6SmhkbU14YlhBME1RQlVVMU5GQUFBQURnQUFBMHhoZG1ZMk1TNDNMakV3TXdBQUFBQUFBQUFBQUFBQS8vT0F3QUFBQUFBQUFBQUFBRWx1Wm04QUFBQVBBQUFBSlFBQUh3UUFEUTBVRkJRYUdob2hJU2dvS0M4dkx6VTFQRHc4UTBORFNrcEtVRkJYVjFkZVhsNWxaV3RyYTNKeWNubDVmMzkvaG9hR2pZMk5sSlNhbXBxaG9hR29xSyt2cjdXMXRieTh3OFBEeXNySzBORFExOWZlM3Q3bDVlWHI2L0x5OHZuNStmLy9BQUFBQUV4aGRtTTJNUzR4T1FBQUFBQUFBQUFBQUFBQUFDUURBQUFBQUFBQUFCOEVxVGhlMmdBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFQL3pnTVFBS01LZDBLTkJlQUNBS2pISUFEQUNNWTNtTWNnQUFieUpxOTczM1IrL3Z1QXdLeGtsVURnM3E5emJEa1Fockp3aERlYVoxeGs0b0pUUU9pS256bk5NNjNOU0U3VmFrTkJRTHNnNWMxNFRjc2E4UVF1Q3dwenJqSjluZ0t4a3l4czhCRDFYSW5FTVVFVE4za1ROOTRlUk12SW52dkVDSmRXUE13MzhmZitQL2ZmL3Y4VTE3MzMvZTk5L0ZIOThQSGdZRTRJTFB5amk0ZndmUGdnNzRQamdRY0NBWUxuOVlmRVo4UVlmQjBaMGgyL3UwdWx0Yk1xdVlxRmYrWVJBZ0oxUC93M1NUcmZmcTNuaEVEVC84NExFSURRTDh2Yi9tYUFpeWFXc3lrQURwZ05zd01LRlFVV1d3dVFJQWdCRXpKMDZtWU1RZ0xnZ3NkQlpxYkYwbms3TlFCdkdJRGg3SWxnVzdFa0w1cVJJck45eGxTR0pFOFZSOENrdnNxNzc4SkRReE1BTU9DZzBMbGgvQStNQVlBSDdOUVJldTdmL2doQWl1RTJGajROaUFSQVFNS0JJRUdKeGpCQzRza1lTdGEzVi8vLzQ0Q0VHVUo4ZkF6NDVBNGlLRGdIR1RCVEM5WWdZcC9yYi8vLy80MkVqdzNodUVpWHhjNDVoRFIzRGdIQVFNM3YrbHNreTZCc3FpYjdzY09vT04yWmJnV1lwZjJhdDNCTjI5Ly96Z3NRVE1DUGExbGZNZUFDaDVaaXYvMUgvdThMV052YU5yeUZ1MzFyRVZ1YTFzK3h3SkluQnNtZ3d5SS9jU25yQTh1NDc1NDJzYTVQTld1RGtqME5WYTFDZE4xWVRnN2lSOXdZOWNQWjZZMDEzazlkMDk4YXBIM0RqKytIc2ZkWGhwMm5ZSFZtQndZN3Y0ZUZmdWp5YmZ0M2w2YStOVmoxeGF1TFM2ZzNoZDVCWW9tR096enRWNW14bnMvVkR6ZWtNMDVxZUZLbkpvRlB2TW4xV0ZUT0p0MHBBcEExVEdiMnJiMHRBK3RldEljUFZKOVl2cW1aTTRZcUFya0EvUThkNFF4ZW9XR2NmSWJVVm9aZGdTbmlkLy9PQ3hCWXNrM0xCZ21QUlVmamxtTDJkcjE0L3JsMjZhdVBsWjBPNFp2ZG9lMUg0U2RtWWx5aTVNdW8zbWhaYllFQ0lmaDZGNmdNaCtHb1ZDSFJTWEdpZlJKbGhTcXlkcGxKeTI5UHFseXhORmVSMnhsaG9HRzJhM05GamJ0ZUROQW10RGpFRlNSbzA1bE9GaDFQVTd6WFBRMXY3aWQxaHE0V29vb2V0RFJEUU9nUXBSZFVCb0Nudzhjd2NjaENFcUhSR05uMHFicFpwcGcyRzJpQjlMdEd6ZmpLdGNvai9oS3BGTkZ6T1BXSTJDQjVpdGh0aVNSQ2FDdWw2eWRZZFU3UTZUUFhhOWRtaVNSWHp6RklyN2VuLzg0TEVKekdiVnJWZzA5TGR5dk5pemFvR3BtWnZHS0ZBdHpHdWlGQVlvcUd0YWViUytIL0JWNXpxR2M2N1F6Z2hCcFNvNG15ZFJZMGtVZnhwdENzV0VQVUNGT2FiaUx0R2FMY3F2cUJHaHdtMmxqUTAyR1VNV1VkdFVqRGRCbEpVNUJzc1pWSWpTSko3bko3STJ1VG5aY2pIeUIwUExLNmowOGpHMnZqblBha3lyVm9pNW1wVW5Cb3MyaFpwcGE4Y21wTG9TVlkxODk1ZVNsR1gxbTdpbHUyOUlGNThESWYwSmZpZ3RRQXFWTndaTlBleEVHcWd0TFN2ZHRQTmlVcVd5R0JCb1hoK1h3YS9MajE3dDd0aWd2L3pnc1FrTC9QaXJXRFRCYXdYTzcxOXE3ZmxuT1hLMzB0SGJuYUtiZGw2bnpoeHByOFByRXBkQk11WHBERFE0bTR0bWNtYWtQUHN5Wml6eFN1Q1g1bXBiWTdWbDAwOHVISk1rUmowdUx6N3J3aVJDOGtIcVptTnA3R2dtTDZZMEpZeUs3Nm9vd0hoYmJTMy9GTWNSMFhiT3Q1S2prZm5MMEI4UzJsNDlLVU9MR0R1UHBtQnpWVjZ3UjlOdmZWWUp2bU5tQWhSVDFRYjFIaWkvcWhqZXNPOGgwM1lncDl2WngyQlNRZ2ZuRXM1Vm0wb1ZtZ3dROXNNdXBianRCZ05POTNjbmFDQ1MyRHNRcXR6R2xtWk4yL3ovL09DeENnc1c2cTFvTnNGa2Z1VnV4ZHovTGR4K20wbk1yZkxxNVdseUtmbXIxV0NVVlhtM0dPYnd1U1ZDTVlsc3J2ejI4cjh0bURLK3pUTFIyU0ZMTFo4ZG5RZWs4OHBYb29UMkJ6b0ZoSlJDOHRyMjE4RTlTZHBNSTRvU0d2aTl0YVlwbGgzQ3BTbUtRbHVIajh0Ukxvc2x0OXRsM2xtM2wxZVJYT2d4a1Qvd3BIS0taSzEyZXhySjFldnF5RjdZU0FZTWQreDZzQll5bGp5WTFQVTFrRTFBNnJCNi9zY3NLRlZWWG11MU1kL1Npd1NLZi82dTdoRkpicS91MWRjU2Evdk80VTdKTlVseXBMWTArc3FkenYvODRMRU9paFRFcjJnMHdWd2NSR0tZUjF6YzIwc2xVQ1k1S1g1bDZPWUpseGN1WEl6eGZEUXJCMEI0SFNNNGVhY3FlYktnNktJR1RrMU1qQlJabkZ0WTRwbjVZYWJvNTNNd3ZYdVlJcU5NQUNEZ1lNY0lLb1JXWmlvRkdvUkRTclJWY2wyUnYvOEtNSEZwN0dyK1Y1UVdFVDJabXJBRWh4c0FtOWtMbGR2RENCUWFTUE9uS0FqRW9qTHFYN3JQYmNzdGZ1Zmd4Z3lVR084cTA5S0dWT25MdGNyVHRhU08vYTUzKzV2c2ljZ01uYWFNNVowTFNRSkI4cFU0cXFDU0E4V3ljbkFJb0FJUUllbm8vL2Y3VkRJMlAvemdzUmNLbFBldmtUU3hYVGloZHdQSUFvanU2cnlLR28rUVpuM29FNCtOQ3IzOWJGWWFjK0YxWGRSS0o4bW15YWJsMFRVaUUrNmZHa2JTL2l1R0l6cG85RDZXOHFNdFNXYlFwdi82Ly9NbjdxS09FZ3hVV3djVWVxQU1oT29BbFRTUitjN0YybVVkQWx3RWhabDRLK1U3TDhubmdQZjdkaWNmeFdGbkRUN1hkUXVWc0NxVVZKUlhvM0wyeTBGaXhHNStZc3ZzRkE3RTJ2dy9ZcjZwMUVtclVscXhsejc4YnAzYkkwYTAxZ1NuZCtHLzNQL0laZ2hpYVdXU3RzWlFldjg0QmdtNjJjMU5ZaFFlZG5maXhwUi8vT0N4SFlvWTk2K1JOSkxpS3J6S3ppQXgzZGRnNlpKV3h4SHVSUkVSWU4rMytpa21xVTF1aS8vLzMvUXorVlNDNTZ2TUhpaXcySDZ3RnF5QVFieGxkZldVeW9DYXY1WEM4dWVPdTQweVpRMGZmMjlVYWY1L2wzSXJwSWExdkNLVURNbHdXSWVmNkhxMkwrc0pmT2xxeTJ2R1l5eWxVeVFNeExyOFpqTXRjRk9TUTBicXkzRzVJcGVBVFdYcU92aWQ3czVMOVJ1c2x5alNHMVphT3VCZ1NzNWxseWhhTlRpS3Flc3FxcnJHakJrby91M1VqZXpJWjdtbzRjWDAvMVJ0cmtJYXFKWC8vL3YrSk8vMlo5VWxLRC84NExFbUNiRDVybWt5WXVKS0R1TmdBZ0pjclcvK2xweEVhUHNyTStFYVBVcDhzWnB3R0d3TnorZnl6RkgrcGYvOVJCK0llcWR5M2NjQlFCaGJxVDBsdzVkWG5FaGdHWTRTeFNUVDkyU3lPOHlKLzJXMnJTVmFTYXdqUjFiRWlyZHFDSWNsZUc4Y01iTVlwVWpjM1hBRWFnZU5GRHErL09hUk5Kb2g4amU3V1FpOU5qTDA4N2FzK2swbmYvYmRqWE1tLzVTSzNacmtWdkgvcVZ0Nk9WVUNveHovKy8vVW45eWZWMnltUUdKY1hMVlRFRk5SVlZWZ0FRMUFzcnFOVm9LV09OekVXb1lKditrM3EvaGJlSllYZi96Z3NUQktFdmVzZUxSaGFsS0gvaldQMHl5WmJ6ZjkxVlU1Z1hlV1gxRzdtRkNqUUc1dmxqTzZ0dUxjcVU5dkM2NmIvVStHT01mZmlhS3lGUEljcmtscG5iVFp1VDNNZnRRd3phbHlQNTA0QXJGS3AvVmtCci8xdUhUOFVUMWRwd1dsb3Fmc0VBblpkdStVRjJObkdaaEE1L3g1WFQvbC8wVTUwZm8vMy9mb2NBS1l6Ti81UDk1L3ozNm1HRGpCeXdkSWx2REtvQUVJUzZzOFVPOHloZ3dUOEIxY3BxUkM5K0M0dkx4RUtPZExwYlpoNjdiMG1kTlh0OTFIeENDeTJ0cXZTVGkyekQwTVNDWEpxV2JkZSt2Ly9PQ3hOMG9XN2FxSXRKRnFEYVZBYjVVTk5QNVBKR1oyS1N6M2VWSUhFWmx3cUxBTVBWV3RTcGxxUnlRMHBqOHNuMjRNUVM4aTd1ekZ5NnhZWUVvK09HZk9DNE9BdWZyMUdGZ2dIeUVXM2xod09BNkdSMWZzWGx3NUg0K2VnZE9UeDBaVVpWVlhOQ2NQYUswZDdNSEJSMGIvYitLR0pDQmkrVlBmUTUwZjNuTGxiWCtqVjYxSjlKVnE2aXNZUFVsU2tsQVhhNXlnQUliU0x3Tkc0UzN3RUJnVmlBQUFDRGlnVC8rNzhvQW9LYVpQWnh5bmo5ZEpadm9oVmxrN0gxcHIwcnZLeE41Nko4QXVLMEpFQ3ZhLzcvLzg0TEUvekR6d3BvQTJ3dXA3M3phMEcybm1scUJ4K2FsYlhwYkc2WnlJY2VCTGt3U0VGMHBNWnZVd1FFZ2RBTUJBS0hBbXBQNFFERDdQRVozdGxXRVRrU3VGeit6Tm1pb2l1a1VpZytjZXFXZ1VGRUtJa1lyZWwwRXlNbUNUWDhTZEdFYlh4RUtBSUJ3Qm1kWXhOeUVMQmlSakNyLy83c1ZMUDhkeXVKNHM0NytUL2Y5R2tIbk9oQkFVL29qcXd1bnlERW4xT3hLbW9BQVMxYWVHTk95bjhaeUlZUjZOQUdlS1hOWWZocURRMHJaenVGK2tnU3Zhbm4vZ3VXNDE0aThjSHdYTFlvOHEwbmdacXhOOTFOSUx2L3pnc1QvTVdQT21lRGlTNmdJaHloaWMrenFnUlNobDVvWERsTElNNzhUcElIZUp1RXNmQnJxZ0tSYVI5eHVNVGQ5U2xUOFJaWStrVWFmTnhaazh0MlViM0puT2xxbG9GOVhlWHRISHJFem4wamZSSFpHTTQzR28xTHhMRGNwTU5pZEI2cGpPNnZERGxDRUZHMU1ma2EzVkxRNDUzcktjV1l6ck9NRHlEVVovOVBlUnJJTVdZd3pLNVcyTzUwVlFvOXFCbUs1QU1RR1F0b3FEbmNqTU5LSkdnaUd4REk1UE9LaFVibGFnNFE4cXNUc1l3R3poN2F0V0dZVFpmdGE3eVNacGo2dFdiakQ1ZHlYcy9YTVFBQlkvL09DeFAweGs5NmxSTk1GcURyREtHbzZ4SjhIR2lrWWExR1ZTUmgrbm5wR0NMOWEwdlNwSEl0RGppcVB3eEdXbE84dmdWRUpWTkJVMVNIYmdXbVpVUWdpemRBdXRMN0Ewbk9oZkt6SzdmL2dQNy9YYm4xdHdGbUUrMjVSMWFxSDUxd1M0cnRFRWxLNklvanVRdURCS0tFbnAxS3FUL2MxWkRmMGV4RTRteno1WE9jcWNiWDFLYU5mWVFYYmQvdUwvcHR4ZXF2MEQ2UVFsMDkzemd4LzkvOTdsWjZsOHRKeUZLRWsybVdKcGxUWTFRb0hTY0ZBWWZSa1Zqd3BBdFk2enR0SkpCYTgvZ0phd0N4S3A2VmJGVlAvODRMRStqeHo1cHdDMDlPckxaZklaaE5TYWlEN0tMdnpPU2ltWGJxdFdsMnJkdUFYZHZ4Mi9KbXZ4K2pkSlBSeW5GaGtHQlpHcEJZakZveXZZbkZVTGt4d1hZQzJ6NzFJMXB5WXRMcXR2bDBtcGkrMnZFRWtrVkU2VjEwQzFTMFAxY1EwZGU4WFkxbGxScHBSb3FXZkpSbGlva1VTQ09yeUhpQUNpNG9kbnVqdmkvczh4anpsaWF2bXRzWWtkdmZwU1ZHaUlqdmZQZjgxMS96YlgvemVzTEtVNThrWXhCSndSblFUYzQySFZSbzl1SDZyY1pybG9hQ2dDa3IxcWlIV3JINFZYRlJzSHR5K0dXR09Kek02SFAvemdzVE1MS3ZTc1dEREVTM0g1YmRQcjl5c3JNQ21Ra2pJTngrVEM0bUxvaThmSDFPSUlrbnhZUFNLdWJNQ2tlNWRaaVRIenp6UnBZWndyOU9HaXFkTFRJOFB1aFF4UXBhU1cydnZucXYrWXFZajRXckoxSGppUnpnMjNXZ21CRVNIbE9SOGxWUzFOMTFDUWs4M0tmZDErS2M4eHkwZkJIVlBWOVI5Ly84OGJmOS9MVXFVOHhiOHc1TGRzZEtQOW0wRjRNdjlha3hCVFVVekxqRXdNS3FxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxckNNS0FXcFBGNGpnVGNJVEU0d2hJR0VIVXpPTGFlUjBycC8vT0N4TjBvVzhxK0lNTVF2RENqT3hIMXRpVllxMlJaWDUxS1JUbXdqM0ZVS1V5YVVib3pheE1mWjVmSStiMjY5NzZoNmp5MWdzTDZGMUsyS0dwaXNwZWo2WTJXUHFTQXpTYnJ2T2JWL2NmNWZmK245eDBXL1pnSXNyRHN3TVVXQ2syU1BRQTVrU2NvMUhzd2hWWmFyVW1lM1JxTDBWRmFsb1ZHWkhzNTZQNjErMyt6c2F5RlJhc3lTbnE1THVjU3JtRVFlV3pxVE9BQU5BRUFUSUxVVVJQY0ZNa3hFQXpGQlgzZnRzRVZYODYvYjFtS3hhVTFvY21MbGFmaCt0VWgyT3o2OWhLSmliQWFqcW5VUDNRbHFwUC84NExFM1NpRDNyNENlWVdvMks1T2NmRXA5UTZQZkhHWGJWbWVHcTg4RHhjWEdFN2hRTDZVcm1TbFhXckgxeXpkSnJGYStLNzFtMnc5OXIyUnZ6cnZhN2pSOWRVVkwvdWxPNng5TWRITUNFNjQzRXpGT3hVRWJlajFkUzYvVWpaUHEvRlJSeHFrbEhvMHBhSUxici9BeXY0c1ovNi9mL3doUlEyb1piM0dXOGpoSUR3TkhvU2tYdUhvaURZVTBta1BtQ296M0JwTVFjQUEwa1B4bUFWMnMrSEdBM01BME5sYW8zN1dGRlNKdTRJZEhyUmVQeFJ2a00wcjM0anM1RlhGZ05PZUx4R1NLNlpZbUFLQWhvSXY2UC96Z3NUK01MUU90aTdERVIyc1pobVd1SkRyK3QyZDV1enJUYUlqS1llb24xZVZoNWE5ZzFEZXJVa2FYVEE3QXI4WmxGcCtLUnVjQVZteHY3dkNhK1hrTi95L3A2eWNRaWtLeFc3Q0NaUXNLcVdRZmlKbkx5OGhCSlQ5TkVmNTlJZjBVSW1uV3RkMStva1VUZjA1UzZqazgvVFNrbE9PZmNXT0txREdjUzVTelgrUnUyMjFLUC9NbTNkR2QzUnpjYjR3WENYb3FnUTVmREViZEIrekFUbzU4RUJSRXUxQU9XL0xtR0dDaDNrWVJHekpHaFAvWVRhTVVIQ0lPaXJQbmxiOGRDRExsSUhGekZHK1diZVFuQ0lTLy9PQ3hQMHdjOWFwUXRKTHJBY2N2RTJOL3FTbWZsQ0tQWXNxcEh6aUl5QW9HdTFPNDhYSU1nN2FPUUhBRGMyaHFxSThJbGFqTXNqY01ydld0QUR0VVVhdnRmWk5DSTNLSkFYajFIcTJaeU1ybUxWRjI3eFh4eHNqUjVSM3BXSzVtWm43WkQwMTJQR21HTnl6cXNnRzdLRW81ZzNUcEdUZFJDVDRuQW50VjZaeTFlMnZVS1B1aUdjOFRSeUNBZk1RTGVyVUZtL3YvLzZsYWxxTVY3WW1SVzZqU1gyVmhEOXpHelJ3TkRScTRSQWRwQUsxNEFCQmlFZ2VRY3FyUDZnNjUzQjBvdGJVM054QklvVTBiY0ZESnBqLzg0TEUvelNiMHFDaTJ3dXNLRmVBbEVNeFlPU2p0RTZyc01nWElYeWlkbDNZY2dCb0NZVUYzM2FnZGFDckM4U2RTZ1N2azVYZk1jOU1WK20raWRMRkkvRkhSa1ZEOHRuM1FmL2xSdEhJZVVCdzFPVlBHb1dGUnZVZU9QRFl0R2FFVmlvdlJ2K3BrVkRvelZSTXcwR3hVaUloTW1SSFRScUp5SlVxTFFzRXhJSHhmL2lvODdLRjh2SFRDeG8yWTBvNTBxMy8zUi8vKy9tVU9ZOWo4cTN4MGQvWWhjQTJOUXAvb21tOFlzc0NSZFBQODNGT3d6aXlOdTJRNnRTNmR5K21XVUJaaXdLNER6MjVUQlJnd3NZa0R2L3pnc1R3TUtQV29LTGVUcnpGTTIyRUFnWlFPSWJsOFlPaUVuWjJ0S0Z4U1hVMHRhV3pxbXFTNlBzL2NlTXhPUjIyR0s0YTJ6QXdVR01EQkVFSUZCeS9iTEdkUnFOdTIvYjZ5S0w2bGorWlZydUxpdkRGMmtRNjZWZU4xTEdlcDZwY3NmN3dzazhCUm9RTksvMmpGTDhGWi96TERmMmVmZEVoMVRnQlBwMktDaUJRVTgra3ZxZXQvLy85SGwvTzlIanZOak4vLy8vbC9TYnRhUU9YSUljTVZvZGU1Q21vQUFBS0xObHNwY0o2VEFZVU1ka1ZWYVV3Ykd6QVkxTlg4UXhlUWlZVHF3T08zaENCUllzTjdEOEIvL09DeFBFeGMrS2NvdG1GeXNQTjBIQktHQVZkMCsxUjF6QXhrTS9rdEFFejU3M1FVZk1LQUI3R3l0THFTeFlGcnpZL2h0L2xiVTg4cnNlZmh3a3I3emZSYUhYTE1BQTk2M1poaDZYNFdTTkFyUE8zaEVISGgzY3JxdDJSbFZ5MTJFL0RZeUNVcm9abmEzWWlqbk56di9oRW8yUCt6RURVTHB4MWU3TXFabzJHcGptOU8vTzl6dkhiMTh1YWVibWVEcUlKUGRpN1RJY2ptdWRPTkUrT3ZYOHE0YUVPbi85LzhsRUVMZFR4MFgrSkJuai8vNUgvK2hML0hteHNOeFlPQ1VOZ2ZJQmdQd1hIeW93aFlUcEhKdDcvODRMRTd6eXNEcEhtNDgvSk9ENCtvZ0JMdldFbFZRTXNNTXVVUzduWUJpd2lTbkdtbXVDMzRUVDJWNG8reUM3Y2lMWkZCb2ZuNXlDMnNHRkdDdzVGVlhMOVFlcXFnckdkenl0eUhXdERYTVE1a0t6WjY0RitRcjdibGVKS1hLZWJ4VWtQVWpzN3JSaWpZM2JKL0txdGU5YkRxdkJaYTBUeXEzLy90UkRHVXNySlV3dHU0aUhoK1VPZ0NDb1VyQU1BUjJSMER4bEt4aDVlcFRHZlEzYUhtYldZMmlsTC8vMW1mLy81Zlh5dE1kbWlJaVIxWkhVVjhHcE1RVTFGTXk0eE1EQ3FxZ01BL2tDczZDb1V6c285VFAvemdzVEFLalBxbkFiVHl6QlJRVHpSd01Fc011QVY4MXRnN1dtMmhiaTA4TVNDVXlHbnBhV0xRM0RzTXNOWmExbUJJRFRGZitCWitOVTFydktXdE1TS0VoU2Roc1AzS0RwVnFqUWtKZlRnYmJSdkdPSkJSTEpRd0ZSSkFvaXJLUE1YOS8rWkZjS1I5RE9oakxtdWFEWU1hR0FzenI0Wi9oWFdoU0RSNldiZ3JMRDNmaUlESlovSS9JaDBXSWhxV0tpd05LTE9SUnRxcjBNQU1SZ3laUlFtWkhDR1lBZ0VZYUEwWVhEb1pNQnFnNm5rWUpoU1VFUTE0d0ZBTmRnVUFDZExJaFVJREVJQlFFR1FZQUFRQUtvbS8vT0N4TkFsS21Kd0ZOR0ZUTlFJQUtIaTYwTFFnREV0bmNjTncwcDIrVnZoOXVEUjZySzM3cVNLSndVeUYvVk40TVhCSWw3TmprYlIyeXRLbnF6OVNGNnFlUnhOdFdTdjFUeGo1QlZhMUlxV0pXSlJJSGtwSzlKRHRvRmcvTFZOL0x3YTg0NHJJOUErOGtQU1NMcUpKWVRscExGbTdRMDNCMm9OdTNXWkJRSEQ2aWpJNHIyRnoreHhYNUcyZFZ4WEdiM1p1aWxxTWsyM0ZQL1NsVlFSeENvRG5lMUlhcEZoNkFIZXhhWU5NVFEzczlNK01xS0RLQmN5MDNNalJFT1RBQ1lOTVBIUWNDc3dNQ0FnVUJPb0ZBYi84NExFL3pYRG5rUUM2a3VvQ0FBWU1BNGxSNFUzVVRDQU5acUhrT0xjTFlJWW95NWxBWkJoa0VLU0t5aGVMazdTM2pFY1ZvNFdxV0xNcW9oaE9qTU5SY0toY0x0VU1iREFhdFFvc0Z4OGtTZDYxeVJZKzZSS1JJTm8zem5PYVJNLy9PYVUwOTNuVGZtYmRZOGs4QndneDZ3STBDTmpWS2IveC9HM25ONGQ2YWtlVEJWbFNNM3BTNVFnQk5GMW1DVHk2VVZLT1FUQy9iN1ltQ0REdEF3TVJBNERBU0NBQUxCWnhqTVNnQmo0UUlEMDQ4Y0dDOExDWWtURVFXWW1SQ0k0TVdBUUFCSlNQTVpjRnRMQnBjV0dFdi96Z3NUc0wwSldXQVZiZUFDQU1RSFNBQUFnd01JREpCZ212UmhUQkVKcTgzY0dGWU5VR1pYeXh4V3R1UklFQVpRRFZLWXdtSVNKb0ZDeG1jVER1eHA4Mjd2bXJ0RzlGc0JLQVV4RUpoL0U1cG1ldlM2ZHZXWUhmaU1OblhZOGtXQlM0aWJtTUVNVE0rbE1VR01LWHRSaXJ1VWRwTCtMY0hVRUlVeG9rTURsdkYwU1ZhNkNNeFEwZUdoQXNtVktqRVEwckdnSk52QzNWc1Vrb3dzeDJ4VXhpY2JoeTdJMlNWSXhhc1p1NUpoQ0pNU0JSZkF4c3dnSmdxZUlZSEZpRExrSUF3SUlRL2JlWE1NUDN2TENYeHkxLy9PQ3hQTlZSQlpvclp2UUFFbktPV1pWYUsveC9IWWtEWEg4azBQMjZkYXhkaEdoTmRuWUlIQkJBd0lZMFJBUmpVVTJRTVRZbkEwVjVyLy9XdjMvLy8vLy8vZTB0dnI4VWwrSDc5aXgvMjY5UERsalZKbm0vNllVdFRsWHMwaDlsTUdpeEdmem5HdDJtMHY3bjc4bkFpVGhBWDUvR1V1S0tCelROamtFR2RLYXN5TXdLTkN4SWw3eHpyZXN6VFhnU09PekxJNjRkdTdKTE9NVFZXcUl1MVZSS3RhUVVGMWx4VHkySDBJaTBoek5JUXNBOEFpRk1oeFFDSUtNWTZmaUhRaEI4RUFGb1l5L2pjQzhGSVVhaTFqLzg0TEVZajVENHFvTjJuZ0J6ZWVDNXVvTGhhbnZPL2lzaXk4VWlnclhUKzBDRy96TFBlQy9sYTFYdVZScXZieldMUTQ4ZmVyWWtlVzA2N2ZIaHc0OVZPZng2cWZFUmdaTllnYTgwR0d4N2d0N093ZDVPM1FKRll5UHAzT3lIcXVadnczSElyWE5rYlQ4TGd1VVljNnJqMXo5UDRCem85dFM2Y1gxRytWalk1c2JBenhJTUg0aVI1NDZuZHRyeHozZmUvL2x6dXoyVWlNbVlISmtiMWZzL2svSUhRY1FGemNvcnRnR0t4RU5tNmpkVXFqQUppWUZPVDF1MDdycXdOSTZla2NDZjNya3ZqVlhQZDZubXJPTjNQL3pnc1F0TXp2V3RPTFRCN0YyMzJkK2xxT0lvQy9FaGxUNk00VnRjYUhva21XWU1TaWs4OVNIbkFXRVoyNXNhY1ZTd0NCaUVHNjdvUnU2NmNWcjd6bGw2VlZlWVlXMlo0N1JwbzY4elIyMWJUSzZZWmZLYUs5YnhwSHIwZ3RXMWRyV1hkWlpyMUdzYVdKVEFSb1hYMTV6V1lkWll6YU5IUFV0REVtUnRjM3ZvSE93bml1S1lENWVoazR3SUFKR1lyTlphVFJUWGxET3BNS0RHdENsWUtobjFmV2FyZi8vMWFNVGp6S01nQWkwQUFWVHRXTlJDYkRPaVpTWDV6TFBSOU11czEybXVRWXdhSzA4ZmxVTGVYRGYvL09DeENRdlUxNjJKc3BIc05TTTg1K3NvZHg3OXFocHN0VkppVmNsOW01SVd6d216V2liZkltcTVtV3RDSVJIbHJNRXdmSzJ5cVZQNjVzQ01qVTNYSXpxQnBaU1kxSzlYWmRSOVl4U3ZpbE5aMmQ5ZjdLRWxzRU15TnVGTUk5dlc4Ly9UanZtdXltbDhibXU5azBiRTVwRmtxOEU1M0c0NXBSL3RHb1FQYlMzSW9aTWF4R2JWa0N5S1FKTURoaEF0dC8vVXRoVlhqTVpVQktIWlpVRmVNQWdsSGhwUnVySXB3QTZ1MzZTSUxDSHFKcUd3OW84d25xbjFETE9zS1ZnMUgvYTAzRmVZVktkejlJbDJkVzRscEQvODRMRUtpNDdhcjFuV0hnQ05zMytzWnphRlZpVDJkVFZndmNIOHBSSWdpa2V5SzlTSGN1c01aMko5UmJVaTVqUi9pTEYzdTBEVSs4WnQvdSs5NGk2ekpSZ2pYaFlVdDRVTE84N3ZUTk5mLy81cjY0K003ckVualE0RE16THFCU1NQN2ZOc1l0N2IxdkZKS1czakQvZnpkejFtdmVlMTU5UGJTdXJ4OGYvdFR5SkVwU2tDa2U4ZUhIaHgzOE9JOEJBRUFnQTlGWXNWT0JwdDlNZ0VpT1h5T2hvVUFvdEFDd01CUEhwR1V5Q2Y4YU5OVWd0b1dweTBCUUYxSXlJLzM2VU53R1ZEOWdPYWdNaVFJd01VSEo0cFAvemdzUTFPUnU2cWxlWm1BRWpVbEJ0aWdVbHFKZ2k1S0hSalJ6Qlc0ZkZya05JZWFrREQzU21SUWhnZk1HTzFLckRreHdDakNuak1rZWFFR0lhSVZNVFVocFJYK09Vb3RKSm01R0V3TE1Hd1JNcmtSTm5JcU1hSzJyWDYxajBYaWdaWnd2SkZBWE1PYWtWaWliRU5MaHFiRU5XZ1hpaU9hMy81NmJGZ3NETG56WWNKQXlhSDBaRkkyWnM0WW1yR1JGall4TUNlU1JRLy84enN5MHpkU2tiS05TTG4wRUhOa2k2WGl5c3FsNHBHNW9YVEl6VE5VakkraVlnYWlvSWdpU3dSSW1wckNvRWhVMWFFVWtxWVZETC8vT0N4QlFxb3VXd0FjbGdBSWlGUk1tS1YxckxsejBKSkp0eVNKSjdSY3VlMnk1Y3UvYTFyYTAxcldXbDNaYjlyMDJyV3N6bjd5VWtuc0JLRXBVVlFhb3lTRFVteExqSStYTTFnTWhLSno0NGlLbkFGQUtPcVlTbFE0Z1JQaXFKSk5keGN1WGMwdVhXMnRheld0Wm0xcG1abVptZW5abTFwclg2MTZabXRiZk5WdGNYR1RyUzU2eXdWVzRSRHp2QlVxR2xCM3JCV0Nzc2VpS0pYck9sandpUFFWcE1RVTFGTXk0eE1EQ3FxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxbz0nKTtkZWF0aENsaXAucHJlbG9hZD0nYXV0byc7CmZ1bmN0aW9uIHBsYXlEZWF0aENsaXAoKXt0cnl7ZGVhdGhDbGlwLnBhdXNlKCk7ZGVhdGhDbGlwLmN1cnJlbnRUaW1lPTA7Y29uc3QgcD1kZWF0aENsaXAucGxheSgpO2lmKHAmJnAuY2F0Y2gpcC5jYXRjaCgoKT0+e30pfWNhdGNoKGUpe319CmZ1bmN0aW9uIGRpZSgpe3N0YXRlPSdkZWFkJztzZngoJ2NyYXNoJyk7cGxheURlYXRoQ2xpcCgpO2ZsYXNoPTE7c2hha2U9LjQ7Y29uc3QgbT1NYXRoLmZsb29yKGNhbS84KSxzYz1tK2NvaW5OKjEwO2lmKHNjPmJlc3Qpe2Jlc3Q9c2M7bHMoJ2NyX2Jlc3QnLGJlc3QpfWNvbnN0IGc9YmFuaygpO3Bvc3QoJ2ZpbmlzaCcsc2MsZmFsc2UpOwogc2V0VGltZW91dCgoKT0+eyQoJ292Jykuc3R5bGUuZGlzcGxheT0nZmxleCc7JCgnb3YnKS5pbm5lckhUTUw9JzxoMT5HQU1FIE9WRVI8L2gxPjxwPtin2YXYqtuM2KfYsjogJytzYysnPGJyPtmF2LPYp9mB2Ko6ICcrdG9GYShtKSsnINmF2KrYsSDjg7sg2LPaqdmHOiAnK3RvRmEoY29pbk4pKyc8YnI+2LHYs9uM2K/bjCDYqNmHINi02YfYsSAnK3RvRmEoY2l0eUkrMSkrJzogJytjbmFtZShjaXR5SSkrJzxicj7Ysdqp2YjYsdivOiAnK2Jlc3QrJzxicj7wn6qZICsnK3RvRmEoZykrJyAo2qnbjNmBOiAnK3RvRmEod2FsbGV0KSsnKTwvcD48YnV0dG9uIGNsYXNzPSJidG4iIGlkPSJnbzIiPuKGuyDYr9mI2KjYp9ix2Yc8L2J1dHRvbj48YnV0dG9uIGNsYXNzPSJidG4gYjIiIGlkPSJnbzMiPuKYsCDZhdmG2Yg8L2J1dHRvbj4nOyQoJ2dvMicpLm9uY2xpY2s9c3RhcnQ7JCgnZ28zJykub25jbGljaz10b01lbnV9LDcwMCl9CmZ1bmN0aW9uIHN0YXJ0KCl7aW5pdEF1ZGlvKCk7cmVzZXQoKTtsYXN0UG9zdD0tMTtzaG93blNjb3JlPScnO3Nob3duQ29pbnM9LTE7cG9zdCgnc3RhcnQnKTtzdGF0ZT0ncGxheSc7JCgnb3YnKS5zdHlsZS5kaXNwbGF5PSdub25lJzskKCdjaScpLnRleHRDb250ZW50PSfwn4+ZIDEgJytjbmFtZSgwKTtjb25zdCBibj0kKCdiYW5uZXInKTtibi50ZXh0Q29udGVudD0n2LTZh9ixINuxIMK3ICcrY25hbWUoMCk7Ym4uY2xhc3NMaXN0LnJlbW92ZSgnc2hvdycpO3ZvaWQgYm4ub2Zmc2V0V2lkdGg7Ym4uY2xhc3NMaXN0LmFkZCgnc2hvdycpfQpmdW5jdGlvbiB1cGRhdGUoZHQpe2NvbnN0IHY9c3RhdGU9PT0ncGxheSc/c3BlZWQoKTpzdGF0ZT09PSdtZW51Jz83MDowO2NhbSs9dipkdDsKIGlmKHN0YXRlPT09J3BsYXknKXt2eSs9OTAwKmR0O3B5Kz12eSpkdDtpZihweT49R1kpe3B5PUdZO3Z5PTA7ZGo9MH1pZihkdWNrPjApZHVjay09ZHQ7CiAgY29uc3QgbT1NYXRoLmZsb29yKGNhbS84KSxjaT1NYXRoLmZsb29yKG0vQ0lUWV9NKTtpZihjaSE9PWNpdHlJKW5ld0NpdHkoY2kpOwogIHdoaWxlKG5leHRYPGNhbStMVysxMjApc3Bhd24odik7CiAgd2hpbGUob2JzLmxlbmd0aCYmb2JzWzBdLng8Y2FtLTYwKW9icy5zaGlmdCgpO3doaWxlKGNvaW5zLmxlbmd0aCYmY29pbnNbMF0ueDxjYW0tNjApY29pbnMuc2hpZnQoKTsKICBjb25zdCBweD1jYW0rNDgsZHU9ZHVjaz4wJiZweT49R1ktMSxwbD1kdT9weC02OnB4LTQscHc9ZHU/MTI6OCxwdD1weS0oZHU/ODoxNik7CiAgZm9yKGNvbnN0IG8gb2Ygb2JzKXtpZihvLng+cHgrMzApYnJlYWs7Y29uc3Qgb3k9by50PT09J3MnPzA6R1ktby5oO2lmKHBsK3B3LTE+by54KzEmJnBsKzE8by54K28udy0xJiZweS0xPm95JiZwdCsxPG95K28uaCl7ZGllKCk7YnJlYWt9fQogIGZvcihjb25zdCBjIG9mIGNvaW5zKXtpZihjLmdvdCljb250aW51ZTtpZihjLng+cHgrMjApYnJlYWs7aWYoTWF0aC5hYnMoYy54LXB4KTw5JiZNYXRoLmFicyhjLnktKHB5LTgpKTwxMil7Yy5nb3Q9MTtjb2luTisrO3NmeCgnY29pbicpfX0KICBlbWl0RngoU0tOW2VxXSw0OCxweSk7Y29uc3Qgc2NyPW0rY29pbk4qMTA7aWYoc2NyIT09c2hvd25TY29yZSl7c2hvd25TY29yZT1zY3I7JCgnc2MnKS50ZXh0Q29udGVudD1zY3IrJyBtJ31pZihjb2luTiE9PXNob3duQ29pbnMpe3Nob3duQ29pbnM9Y29pbk47JCgnY28nKS50ZXh0Q29udGVudD0n8J+qmSAnK2NvaW5OfWlmKHNjciE9PWxhc3RQb3N0KXtsYXN0UG9zdD1zY3I7cG9zdCgnc2NvcmUnLHNjcil9fQogZm9yKGNvbnN0IHEgb2YgZnhwKXtxLngrPXEudngqZHQ7cS55Kz1xLnZ5KmR0O3EubC09ZHR9ZnhwPWZ4cC5maWx0ZXIocT0+cS5sPjApO2lmKHN0YXRlPT09J2RlYWQnKWZ4cD1bXTsKIHtjb25zdCB2aXM9KHN0YXRlPT09J3BsYXknfHxzdGF0ZT09PSdwYXVzZScpPyd2aXNpYmxlJzonaGlkZGVuJztpZih2aXMhPT1wdil7cHY9dmlzOyQoJ21uJykuc3R5bGUudmlzaWJpbGl0eT12aXN9fQogY29uc3Qgaz0xLU1hdGguZXhwKC1kdCoyLjUpO2Zvcihjb25zdCBhIG9mIFsndG9wJywnYm90JywnZ3JvdW5kJywnZ2wnLCdvcmInXSlwYWxbYV09bWl4KHBhbFthXSxjdXJbYV0sayk7cGFsLnN0YXI9bWl4KHBhbC5zdGFyLGN1ci5zdGFyLGspO3BhbC5veT1taXgocGFsLm95LGN1ci5veSxrKTsKIEwuZm9yRWFjaChmaWxsTGF5ZXIpO2lmKGZsYXNoPjApZmxhc2gtPWR0KjI7aWYoc2hha2U+MClzaGFrZS09ZHR9Ci8vIC0tLS0gZHJhdyAtLS0tCmZ1bmN0aW9uIFIoeCx5LHcsaCxjKXtjdHguZmlsbFN0eWxlPWM7Y3R4LmZpbGxSZWN0KE1hdGgucm91bmQoeCksTWF0aC5yb3VuZCh5KSx3LGgpfQpmdW5jdGlvbiB0cmkoY3gsYncsaCxieSl7Zm9yKGxldCB5PTA7eTxoO3krKyl7Y29uc3Qgdz1NYXRoLm1heCgxLE1hdGgucm91bmQoYncqKDEteS9oKSkpO2N0eC5maWxsUmVjdChNYXRoLnJvdW5kKGN4LXcvMiksYnkteS0xLHcsMSl9fQpmdW5jdGlvbiBkaXNjKGN4LGN5LHIpe2ZvcihsZXQgaj0tcjtqPD1yO2orKyl7Y29uc3Qgdz1NYXRoLnJvdW5kKE1hdGguc3FydChyKnItaipqKSk7Y3R4LmZpbGxSZWN0KGN4LXcsY3kraix3KjIsMSl9fQpmdW5jdGlvbiBkcmF3TE0oc3gsaXQpe2NvbnN0IGN4PXN4KzIyLGg9aXQuaCx0PWl0LmxtO2N0eC5maWxsU3R5bGU9aXQuYzsKIGlmKHQ9PT0wKXt0cmkoY3gsMzQsaCxHWSk7Y3R4LmZpbGxSZWN0KGN4LEdZLWgtNiwxLDYpfQogZWxzZSBpZih0PT09MSl7dHJpKGN4LDUyLE1hdGgucm91bmQoaCouNyksR1kpO3RyaShjeCsxNCwyNixNYXRoLnJvdW5kKGgqLjQpLEdZKX0KIGVsc2UgaWYodD09PTIpe2N0eC5maWxsUmVjdChjeC0xNCxHWS0yMCwyOCwyMCk7Zm9yKGxldCBqPTA7ajwxMDtqKyspe2NvbnN0IHc9TWF0aC5yb3VuZCgxMCpNYXRoLnNxcnQoMS1qKmovMTAwKSk7Y3R4LmZpbGxSZWN0KGN4LXcsR1ktMjEtaix3KjIsMSl9Y3R4LmZpbGxSZWN0KGN4LTIxLEdZLWgsMyxoKTtjdHguZmlsbFJlY3QoY3grMTgsR1ktaCwzLGgpO3RyaShjeC0yMCw2LDYsR1ktaCk7dHJpKGN4KzE5LDYsNixHWS1oKX0KIGVsc2UgaWYodD09PTMpe2ZvcihsZXQgaz0wO2s8NDtrKyspe2NvbnN0IHc9MzQtayo3LHk9R1ktayoxMjtjdHguZmlsbFJlY3QoY3gtdy8yLTIseS0xMix3KzQsMyk7Y3R4LmZpbGxSZWN0KGN4LXcvMiszLHktOSx3LTYsOSl9Y3R4LmZpbGxSZWN0KGN4LEdZLTU0LDEsOCl9CiBlbHNlIGlmKHQ9PT00KXtjdHguZmlsbFJlY3QoY3gtOCxHWS1oLDE2LGgpO2N0eC5maWxsUmVjdChjeC00LEdZLWgtMTQsOCwxNCk7Y3R4LmZpbGxSZWN0KGN4LEdZLWgtMjYsMSwxMil9CiBlbHNle2N0eC5maWxsUmVjdChjeC04LEdZLWgsMTYsaCk7dHJpKGN4LDIyLDEyLEdZLWgpO1IoY3gtNCxHWS1oKzgsOCw4LCcjZWVlJyk7UihjeCxHWS1oKzksMSw0LCcjMjIyJyk7UihjeCxHWS1oKzEyLDMsMSwnIzIyMicpfX0KZnVuY3Rpb24gZHJhd0l0ZW0oaXQsbCl7Y29uc3Qgc3g9TWF0aC5yb3VuZChpdC54LWNhbSpsLnApLHkwPUdZLWl0Lmg7aWYoc3g+TFd8fHN4K2l0Lnc8MClyZXR1cm47CiBpZihpdC5sbT49MCl7ZHJhd0xNKHN4LGl0KTtyZXR1cm59CiBjdHguZmlsbFN0eWxlPWl0LmM7Y3R4LmZpbGxSZWN0KHN4LHkwLGl0LncsaXQuaCk7Y3R4LmZpbGxTdHlsZT0ncmdiYSgwLDAsMCwuMiknO2N0eC5maWxsUmVjdChzeCtpdC53LTMseTAsMyxpdC5oKTtjdHguZmlsbFN0eWxlPWl0LmM7CiBjb25zdCByZj1pdC5yb29mLHc9aXQudzsKIGlmKHJmPT09MSljdHguZmlsbFJlY3Qoc3grKHc+PjEpLHkwLTksMSw5KTsKIGVsc2UgaWYocmY9PT0yKXtjdHguZmlsbFJlY3Qoc3grMyx5MC00LHctNiw0KTtjdHguZmlsbFJlY3Qoc3grNix5MC04LE1hdGgubWF4KDIsdy0xMiksNCl9CiBlbHNlIGlmKHJmPT09Myl7Zm9yKGxldCBqPTA7ajw2O2orKyl7Y29uc3Qgd3c9TWF0aC5yb3VuZCh3LzIqTWF0aC5zcXJ0KDEtaipqLzM2KSk7Y3R4LmZpbGxSZWN0KHN4Kyh3Pj4xKS13dyx5MC0xLWosd3cqMiwxKX19CiBpZihpdC53biYmaXQud24ubGVuZ3RoKXtjdHguZmlsbFN0eWxlPWl0Lndpbjtmb3IoY29uc3QgcCBvZiBpdC53biljdHguZmlsbFJlY3Qoc3grcFswXSx5MCtwWzFdLDIsMyl9fQpmdW5jdGlvbiBkcmF3KHQpe2N0eC5zZXRUcmFuc2Zvcm0oMSwwLDAsMSwwLDApO2lmKHNoYWtlPjApY3R4LnRyYW5zbGF0ZShNYXRoLnJvdW5kKChNYXRoLnJhbmRvbSgpLS41KSo0KSxNYXRoLnJvdW5kKChNYXRoLnJhbmRvbSgpLS41KSo0KSk7CiBjb25zdCBCPTI4O2ZvcihsZXQgaT0wO2k8QjtpKyspe2N0eC5maWxsU3R5bGU9cmdiKG1peChwYWwudG9wLHBhbC5ib3QsaS8oQi0xKSkpO2NvbnN0IHkwPU1hdGguZmxvb3IoaSpHWS9CKSx5MT1NYXRoLmZsb29yKChpKzEpKkdZL0IpO2N0eC5maWxsUmVjdCgwLHkwLExXLHkxLXkwKzEpfQogaWYocGFsLnN0YXI+LjA1KXtjdHguZmlsbFN0eWxlPSdyZ2JhKDI1NSwyNTUsMjU1LCcrcGFsLnN0YXIrJyknO3N0YXJzLmZvckVhY2goKHMsaSk9PntpZigoKHQqMitpKXwwKSU3KWN0eC5maWxsUmVjdChNYXRoLnJvdW5kKChzLngtY2FtKi4wMiklTFcrTFcpJUxXLE1hdGgucm91bmQocy55KkdZKSwxLDEpfSl9CiBjdHguZmlsbFN0eWxlPXJnYihwYWwub3JiKTtkaXNjKE1hdGgucm91bmQoTFcqLjc1KSxNYXRoLnJvdW5kKEdZKnBhbC5veSkrMTAsMTApOwogTC5mb3JFYWNoKGw9PmwuaXQuZm9yRWFjaChpdD0+ZHJhd0l0ZW0oaXQsbCkpKTsKIFIoMCxHWSxMVyxMSC1HWSxyZ2IocGFsLmdyb3VuZCkpO1IoMCxHWSxMVywyLHJnYihwYWwuZ2wpKTsKIGN0eC5maWxsU3R5bGU9J3JnYmEoMCwwLDAsLjIpJztmb3IobGV0IHg9LTE2O3g8TFcrMTY7eCs9MTYpY3R4LmZpbGxSZWN0KE1hdGgucm91bmQoeC1jYW0lMTYpLEdZKzEyLDgsMik7Zm9yKGxldCB4PS0yNDt4PExXKzI0O3grPTI0KWN0eC5maWxsUmVjdChNYXRoLnJvdW5kKHgtKGNhbSoxLjMpJTI0KSxHWSsyOCwxMiwyKTsKIGZvcihjb25zdCBvIG9mIG9icyl7Y29uc3Qgc3g9TWF0aC5yb3VuZChvLngtY2FtKTtpZihzeD5MVysyMHx8c3g8LTMwKWNvbnRpbnVlOwogIGlmKG8udD09PSdjJyl7UihzeCxHWS0xMiwxMiwxMiwnIzAwMCcpO1Ioc3grMSxHWS0xMSwxMCwxMCwnI2M3ODIyZicpO1Ioc3grMSxHWS0xMSwxMCwyLCcjZThhNzRlJyk7UihzeCs1LEdZLTExLDIsMTAsJyM4YTUzMTYnKTtSKHN4KzEsR1ktNiwxMCwyLCcjOGE1MzE2Jyl9CiAgZWxzZSBpZihvLnQ9PT0ndCcpe1Ioc3gsR1ktMjYsMTAsMjYsJyMwMDAnKTtmb3IobGV0IGs9MDtrPDQ7aysrKXtSKHN4KzEsR1ktMjUrayo2LDgsMywnI2ZmZDQwMCcpO1Ioc3grMSxHWS0yMitrKjYsOCwzLCcjMjIyJyl9fQogIGVsc2V7UihzeCs2LDAsMixHWS0yNCwnIzg4OCcpO1Ioc3gsR1ktMjQsMTQsMTMsJyMwMDAnKTtSKHN4KzEsR1ktMjMsMTIsMTEsJyNlNTM5MzUnKTtSKHN4KzYsR1ktMjEsMiw1LCcjZmZmJyk7UihzeCs2LEdZLTE0LDIsMiwnI2ZmZicpfX0KIGZvcihjb25zdCBjIG9mIGNvaW5zKXtpZihjLmdvdCljb250aW51ZTtjb25zdCBzeD1NYXRoLnJvdW5kKGMueC1jYW0pO2lmKHN4PkxXKzEwfHxzeDwtMTApY29udGludWU7Y29uc3Qgdz1NYXRoLmFicyhNYXRoLnJvdW5kKE1hdGguY29zKHQqNitjLngqLjEpKjMpKSsxO1Ioc3gtdyxjLnktNCx3KjIsOCwnI2E4NmYwMCcpO1Ioc3gtdysxLGMueS0zLE1hdGgubWF4KDEsdyoyLTIpLDYsJyNmZmQ0MDAnKX0KIC8vIHBsYXllcgogY29uc3QgeD00OCx5PU1hdGgucm91bmQocHkpLGR1PWR1Y2s+MCYmcHk+PUdZLTEsZnI9KChjYW0vNyl8MCklMjsKIGZvcihjb25zdCBxIG9mIGZ4cCl7Y3R4Lmdsb2JhbEFscGhhPU1hdGgubWF4KDAscS5sKjEuNik7UihxLngscS55LDIsMixxLmMpfWN0eC5nbG9iYWxBbHBoYT0xOwogZHJhd0hlcm8oY3R4LHgseSxTS05bZXFdLGZyLGR1LHB5PEdZLTEsdCk7CiBpZihmbGFzaD4wKXtjdHguZmlsbFN0eWxlPSdyZ2JhKDI1NSwyNTUsMjU1LCcrTWF0aC5taW4oLjcsZmxhc2gpKycpJztjdHguZmlsbFJlY3QoMCwwLExXLExIKX19Ci8vIC0tLS0gbG9vcCAmIGlucHV0IC0tLS0KbGV0IGxhc3Q9MCxsYXN0SWRsZUZyYW1lPTA7ZnVuY3Rpb24gbG9vcChtcyl7aWYoc3RhdGUhPT0ncGxheScmJm1zLWxhc3RJZGxlRnJhbWU8NDApe3JlcXVlc3RBbmltYXRpb25GcmFtZShsb29wKTtyZXR1cm59bGFzdElkbGVGcmFtZT1tcztjb25zdCB0PW1zLzEwMDAsZHQ9TWF0aC5taW4oc3RhdGU9PT0ncGxheSc/LjAzMzouMDUsdC1sYXN0fHwuMDE2KTtsYXN0PXQ7dXBkYXRlKGR0KTtkcmF3KHQpO3JlcXVlc3RBbmltYXRpb25GcmFtZShsb29wKX0KbGV0IHN5PTAsc2c9MDsKY3YuYWRkRXZlbnRMaXN0ZW5lcigndG91Y2hzdGFydCcsZT0+e2UucHJldmVudERlZmF1bHQoKTtpbml0QXVkaW8oKTtzeT1lLnRvdWNoZXNbMF0uY2xpZW50WTtzZz0wfSx7cGFzc2l2ZTpmYWxzZX0pOwpjdi5hZGRFdmVudExpc3RlbmVyKCd0b3VjaG1vdmUnLGU9PntlLnByZXZlbnREZWZhdWx0KCk7aWYoc2cpcmV0dXJuO2NvbnN0IGQ9ZS50b3VjaGVzWzBdLmNsaWVudFktc3k7aWYoZD4yNSl7c2c9MTtzbGlkZSgpfWVsc2UgaWYoZDwtMjUpe3NnPTE7anVtcCgpfX0se3Bhc3NpdmU6ZmFsc2V9KTsKY3YuYWRkRXZlbnRMaXN0ZW5lcigndG91Y2hlbmQnLGU9PntlLnByZXZlbnREZWZhdWx0KCk7aWYoIXNnKWp1bXAoKX0se3Bhc3NpdmU6ZmFsc2V9KTsKbGV0IGx0PTA7Y3YuYWRkRXZlbnRMaXN0ZW5lcigndG91Y2hzdGFydCcsKCk9Pmx0PURhdGUubm93KCkpOwpjdi5hZGRFdmVudExpc3RlbmVyKCdtb3VzZWRvd24nLCgpPT57aWYoRGF0ZS5ub3coKS1sdD42MDApe2luaXRBdWRpbygpO2p1bXAoKX19KTsKYWRkRXZlbnRMaXN0ZW5lcigna2V5ZG93bicsZT0+e2lmKGUucmVwZWF0KXJldHVybjtpZihlLmNvZGU9PT0nU3BhY2UnfHxlLmNvZGU9PT0nQXJyb3dVcCcpe2UucHJldmVudERlZmF1bHQoKTtpZihzdGF0ZT09PSdwbGF5JylqdW1wKCl9ZWxzZSBpZihlLmNvZGU9PT0nQXJyb3dEb3duJyl7ZS5wcmV2ZW50RGVmYXVsdCgpO3NsaWRlKCl9fSk7CmNvbnN0IHNiPSQoJ3NuZCcpO3NiLnRleHRDb250ZW50PW11dGVkPyfwn5SHJzon8J+Uiic7CmZ1bmN0aW9uIHRvZ2dsZU11dGUoKXttdXRlZD0hbXV0ZWQ7bHMoJ2NyX20nLG11dGVkPycxJzonMCcpO3NiLnRleHRDb250ZW50PW11dGVkPyfwn5SHJzon8J+Uiic7aW5pdEF1ZGlvKCl9CnNiLm9uY2xpY2s9KCk9Pnt0b2dnbGVNdXRlKCk7aWYoc3RhdGU9PT0nbWVudScmJiFoZWxwT24pc2hvd01lbnUoKX07CmxldCBoZWxwT249MDsKZnVuY3Rpb24gc2hvd01lbnUoKXtoZWxwT249MDtjb25zdCBvPSQoJ292Jyk7by5zdHlsZS5kaXNwbGF5PSdmbGV4JztvLmlubmVySFRNTD0nPGgxPkNJVFkgUlVOPC9oMT48cD7wn4+ZINiv2YjZhtiv2YfigIzbjCDYqNuM4oCM2b7Yp9uM2KfZhiDYr9ixINio24zYtCDYp9iyINux27DbsCDYtNmH2LEg2KzZh9in2YY8YnI+2LHaqdmI2LHYrzogJytiZXN0Kyc8L3A+PGJ1dHRvbiBjbGFzcz0iYnRuIiBpZD0iYjEiPuKWtiDYtNix2YjYuSDYqNin2LLbjDwvYnV0dG9uPjxidXR0b24gY2xhc3M9ImJ0biBiMiIgaWQ9ImI1Ij7wn5GVINin2LPaqduM2YbigIzZh9inIMK3IPCfqpkgJyt0b0ZhKHdhbGxldCkrJzwvYnV0dG9uPjxidXR0b24gY2xhc3M9ImJ0biBiMiIgaWQ9ImIyIj7inZMg2LHYp9mH2YbZhdinPC9idXR0b24+PGJ1dHRvbiBjbGFzcz0iYnRuIGIyIiBpZD0iYjMiPicrKG11dGVkPyfwn5SHINi12K/Ypzog2K7Yp9mF2YjYtCc6J/CflIog2LXYr9inOiDYsdmI2LTZhicpKyc8L2J1dHRvbj4nKyhFTUI/JzxidXR0b24gY2xhc3M9ImJ0biBiMiIgaWQ9ImI2Ij7wn4+gINio2KfYstqv2LTYqiDYqNmHINii2LHaqduM2K88L2J1dHRvbj4nOicnKTsKICQoJ2IxJykub25jbGljaz1zdGFydDskKCdiMicpLm9uY2xpY2s9c2hvd0hlbHA7JCgnYjUnKS5vbmNsaWNrPSgpPT5zaG93U2hvcCgpO2lmKEVNQikkKCdiNicpLm9uY2xpY2s9KCk9PnBvc3QoJ2hvbWUnKTskKCdiMycpLm9uY2xpY2s9KCk9Pnt0b2dnbGVNdXRlKCk7c2hvd01lbnUoKX19CmZ1bmN0aW9uIHNob3dIZWxwKCl7aGVscE9uPTE7JCgnb3YnKS5pbm5lckhUTUw9JzxoMT7Ysdin2YfZhtmF2Kc8L2gxPjxwIGNsYXNzPSJocCI+8J+RhiDYttix2KjZhyDbjNinINio2KfZhNinINqp2LTbjNiv2YY6INm+2LHYtDxicj7inIwg2LbYsdio2YfigIzbjCDYr9mI2KjYp9ix2Ycg2K/YsSDZh9mI2Kc6INm+2LHYtCDYr9mI2YU8YnI+8J+RhyDZvtin24zbjNmGINqp2LTbjNiv2YY6INiz2Y/YsSDYrtmI2LHYr9mGICjYstuM2LEg2KrYp9io2YTZiNuMINmC2LHZhdiyKTxicj7wn5OmINis2LnYqNmHINmIINiz2K86INin2LLYtNmI2YYg2KjZvtixPGJyPvCfqpkg2YfYsSDYs9qp2Ycg27HbsCDYp9mF2KrbjNin2LI8YnI+8J+PmSDZh9ixINuz27DbsCDZhdiq2LEg24zaqSDYtNmH2LEg2KzYr9uM2K88YnI+4oyoINqp2KfZhdm+24zZiNiq2LE6IFNwYWNlINuM2Kcg4oaRINm+2LHYtNiMIOKGkyDYs9mP2LEg2K7ZiNix2K/Zhjxicj7imLAg2K/aqdmF2YfigIzbjCDZvtin24zbjNmGOiDYqNin2LLar9i02Kog2KjZhyDZhdmG2Yg8L3A+PGJ1dHRvbiBjbGFzcz0iYnRuIiBpZD0iYjQiPuKGkCDYqNin2LLar9i02Ko8L2J1dHRvbj4nOyQoJ2I0Jykub25jbGljaz1zaG93TWVudX0KZnVuY3Rpb24gdG9NZW51KCl7cmVzZXQoKTtzdGF0ZT0nbWVudSc7JCgnc2MnKS50ZXh0Q29udGVudD0nMCBtJzskKCdjbycpLnRleHRDb250ZW50PSfwn6qZIDAnOyQoJ2NpJykudGV4dENvbnRlbnQ9Jyc7JCgnYmFubmVyJykuY2xhc3NMaXN0LnJlbW92ZSgnc2hvdycpO3Nob3dNZW51KCl9CmxldCBzaG9wVD0wOwpmdW5jdGlvbiBzaG93U2hvcChtc2cpe2hlbHBPbj0xO2NsZWFySW50ZXJ2YWwoc2hvcFQpO2NvbnN0IG89JCgnb3YnKTtvLnN0eWxlLmRpc3BsYXk9J2ZsZXgnO2xldCBoPSc8aDEgc3R5bGU9ImZvbnQtc2l6ZTozMHB4Ij7wn5GVINin2LPaqduM2YbigIzZh9inPC9oMT48cD7wn6qZICcrdG9GYSh3YWxsZXQpKycg2LPaqdmHJysobXNnPycgwrcgJyttc2c6JycpKyc8L3A+PGRpdiBjbGFzcz0ic2ciPic7CiBTS04uZm9yRWFjaCgoayxpKT0+e2NvbnN0IG93PW93bmVkLmluY2x1ZGVzKGkpLG9uPWVxPT09aSxyYz1SQVJbay5yXTtoKz0nPGRpdiBjbGFzcz0ic2snKyhvbj8nIG9uJzonJykrJyIgc3R5bGU9ImJvcmRlci1jb2xvcjonK3JjWzFdKyciPjxjYW52YXMgd2lkdGg9IjMyIiBoZWlnaHQ9IjQwIiBkYXRhLWk9IicraSsnIj48L2NhbnZhcz48Yj4nK2subisnPC9iPjxzbWFsbCBzdHlsZT0iY29sb3I6JytyY1sxXSsnIj4nK3JjWzBdKyc8L3NtYWxsPjxidXR0b24gY2xhc3M9ImIzIiBkYXRhLWk9IicraSsnIj4nKyhvbj8n4pyUINin2YbYqtiu2KfYqCDYtNiv2YcnOm93PyfYp9mG2KrYrtin2KgnOifwn6qZICcrdG9GYShrLnApKSsnPC9idXR0b24+PC9kaXY+J30pOwogaCs9JzwvZGl2PjxidXR0b24gY2xhc3M9ImJ0biBiMiIgaWQ9InNiIj7ihpAg2KjYp9iy2q/YtNiqPC9idXR0b24+JztvLmlubmVySFRNTD1oOwogY29uc3QgcGFpbnQ9KCk9Pntjb25zdCB0PXBlcmZvcm1hbmNlLm5vdygpLzEwMDA7by5xdWVyeVNlbGVjdG9yQWxsKCdjYW52YXMnKS5mb3JFYWNoKGNuPT57Y29uc3QgYz1jbi5nZXRDb250ZXh0KCcyZCcpO2MuY2xlYXJSZWN0KDAsMCwzMiw0MCk7ZHJhd0hlcm8oYywxNiwzNixTS05bK2NuLmRhdGFzZXQuaV0sKCh0KjYpfDApJTIsZmFsc2UsZmFsc2UsdCl9KX07CiBwYWludCgpO3Nob3BUPXNldEludGVydmFsKCgpPT57aWYoaGVscE9uIT09MXx8IWRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5zZycpKXtjbGVhckludGVydmFsKHNob3BUKTtyZXR1cm59cGFpbnQoKX0sMTUwKTsKIG8ucXVlcnlTZWxlY3RvckFsbCgnLmIzJykuZm9yRWFjaChiPT5iLm9uY2xpY2s9KCk9Pntjb25zdCBpPStiLmRhdGFzZXQuaSxrPVNLTltpXTtpZihvd25lZC5pbmNsdWRlcyhpKSl7ZXE9aTtzYXZlVygpO3NmeCgnY29pbicpO3Nob3dTaG9wKCl9ZWxzZSBpZih3YWxsZXQ+PWsucCl7d2FsbGV0LT1rLnA7b3duZWQucHVzaChpKTtlcT1pO3NhdmVXKCk7c2Z4KCdjaXR5Jyk7c2hvd1Nob3AoJ9iu2LHbjNiv2KfYsduMINi02K8g4pyUJyl9ZWxzZXtzZngoJ2NyYXNoJyk7c2hvd1Nob3AoJ9iz2qnZhyDaqdin2YHbjCDZhtuM2LPYqiDinYwgKCcrdG9GYShrLnAtd2FsbGV0KSsnINqp2YUg2K/Yp9ix24wpJyl9fSk7CiAkKCdzYicpLm9uY2xpY2s9c2hvd01lbnV9CmZ1bmN0aW9uIHBhdXNlKCl7aWYoc3RhdGUhPT0ncGxheScpcmV0dXJuO3N0YXRlPSdwYXVzZSc7Y29uc3Qgbz0kKCdvdicpO28uc3R5bGUuZGlzcGxheT0nZmxleCc7by5pbm5lckhUTUw9JzxoMSBzdHlsZT0iZm9udC1zaXplOjM0cHgiPuKPuCDYqtmI2YLZgTwvaDE+PHA+2YXYs9in2YHYqjogJyt0b0ZhKE1hdGguZmxvb3IoY2FtLzgpKSsnINmF2KrYsSDjg7sg2LPaqdmHOiAnK3RvRmEoY29pbk4pKyc8YnI+2LTZh9ixICcrdG9GYShjaXR5SSsxKSsnOiAnK2NuYW1lKGNpdHlJKSsnPC9wPjxidXR0b24gY2xhc3M9ImJ0biIgaWQ9InAxIj7ilrYg2KfYr9in2YXZhzwvYnV0dG9uPjxidXR0b24gY2xhc3M9ImJ0biBiMiIgaWQ9InAyIj7ihrsg2LTYsdmI2Lkg2K/ZiNio2KfYsdmHPC9idXR0b24+PGJ1dHRvbiBjbGFzcz0iYnRuIGIyIiBpZD0icDMiPvCfj6Ag2YXZhtmIPC9idXR0b24+JzsKICQoJ3AxJykub25jbGljaz1yZXN1bWU7JCgncDInKS5vbmNsaWNrPSgpPT57YmFuaygpO3N0YXJ0KCl9OyQoJ3AzJykub25jbGljaz0oKT0+e2JhbmsoKTt0b01lbnUoKX19CmZ1bmN0aW9uIHJlc3VtZSgpe2lmKHN0YXRlIT09J3BhdXNlJylyZXR1cm47c3RhdGU9J3BsYXknOyQoJ292Jykuc3R5bGUuZGlzcGxheT0nbm9uZSd9CiQoJ21uJykub25jbGljaz0oKT0+e2lmKHN0YXRlPT09J3BsYXknKXBhdXNlKCk7ZWxzZSBpZihzdGF0ZT09PSdwYXVzZScpcmVzdW1lKCl9OwpmdW5jdGlvbiBzeW5jRlNCdXR0b24oKXtjb25zdCBkPUVNQj9wYXJlbnQuZG9jdW1lbnQ6ZG9jdW1lbnQ7Y29uc3Qgd2lkZT1FTUI/ZC5ib2R5LmNsYXNzTGlzdC5jb250YWlucygnbWtmcycpOiEhKGQuZnVsbHNjcmVlbkVsZW1lbnR8fGQud2Via2l0RnVsbHNjcmVlbkVsZW1lbnQpOyQoJ2ZzJykudGV4dENvbnRlbnQ9d2lkZT8n4pu2INiu2LHZiNisJzon4pu2INiq2YXYp9mF4oCM2LXZgdit2YcnOyQoJ2ZzJykuc2V0QXR0cmlidXRlKCdhcmlhLWxhYmVsJyx3aWRlPyfYrtix2YjYrCDYp9iyINiq2YXYp9mF4oCM2LXZgdit2YcnOifYqtmF2KfZheKAjNi12YHYrdmHJyl9CmFzeW5jIGZ1bmN0aW9uIHRvZ2dsZUZTKCl7Y29uc3QgZD1FTUI/cGFyZW50LmRvY3VtZW50OmRvY3VtZW50O2lmKEVNQil7aWYoZC5ib2R5LmNsYXNzTGlzdC5jb250YWlucygnbWtmcycpKXtkLmJvZHkuY2xhc3NMaXN0LnJlbW92ZSgnbWtmcycpO2lmKGQuZnVsbHNjcmVlbkVsZW1lbnR8fGQud2Via2l0RnVsbHNjcmVlbkVsZW1lbnQpe3RyeXtpZihkLmV4aXRGdWxsc2NyZWVuKWF3YWl0IGQuZXhpdEZ1bGxzY3JlZW4oKTtlbHNlIGlmKGQud2Via2l0RXhpdEZ1bGxzY3JlZW4pZC53ZWJraXRFeGl0RnVsbHNjcmVlbigpfWNhdGNoKGUpe319fWVsc2V7ZC5ib2R5LmNsYXNzTGlzdC5hZGQoJ21rZnMnKTtpZighKGQuZnVsbHNjcmVlbkVsZW1lbnR8fGQud2Via2l0RnVsbHNjcmVlbkVsZW1lbnQpKXt0cnl7Y29uc3QgZWw9ZC5kb2N1bWVudEVsZW1lbnQ7aWYoZWwucmVxdWVzdEZ1bGxzY3JlZW4pYXdhaXQgZWwucmVxdWVzdEZ1bGxzY3JlZW4oKTtlbHNlIGlmKGVsLndlYmtpdFJlcXVlc3RGdWxsc2NyZWVuKWF3YWl0IGVsLndlYmtpdFJlcXVlc3RGdWxsc2NyZWVuKCl9Y2F0Y2goZSl7fX19fWVsc2V7dHJ5e2lmKGQuZnVsbHNjcmVlbkVsZW1lbnR8fGQud2Via2l0RnVsbHNjcmVlbkVsZW1lbnQpe2lmKGQuZXhpdEZ1bGxzY3JlZW4pYXdhaXQgZC5leGl0RnVsbHNjcmVlbigpO2Vsc2UgaWYoZC53ZWJraXRFeGl0RnVsbHNjcmVlbilkLndlYmtpdEV4aXRGdWxsc2NyZWVuKCl9ZWxzZXtjb25zdCBlbD1kLmRvY3VtZW50RWxlbWVudDtpZihlbC5yZXF1ZXN0RnVsbHNjcmVlbilhd2FpdCBlbC5yZXF1ZXN0RnVsbHNjcmVlbigpO2Vsc2UgaWYoZWwud2Via2l0UmVxdWVzdEZ1bGxzY3JlZW4pYXdhaXQgZWwud2Via2l0UmVxdWVzdEZ1bGxzY3JlZW4oKX19Y2F0Y2goZSl7fX1zeW5jRlNCdXR0b24oKX0KJCgnZnMnKS5vbmNsaWNrPXRvZ2dsZUZTO2NvbnN0IGZzRG9jPUVNQj9wYXJlbnQuZG9jdW1lbnQ6ZG9jdW1lbnQ7ZnNEb2MuYWRkRXZlbnRMaXN0ZW5lcignZnVsbHNjcmVlbmNoYW5nZScsKCk9PntpZihFTUImJiFmc0RvYy5mdWxsc2NyZWVuRWxlbWVudCYmIWZzRG9jLndlYmtpdEZ1bGxzY3JlZW5FbGVtZW50KWZzRG9jLmJvZHkuY2xhc3NMaXN0LnJlbW92ZSgnbWtmcycpO3N5bmNGU0J1dHRvbigpfSk7ZnNEb2MuYWRkRXZlbnRMaXN0ZW5lcignd2Via2l0ZnVsbHNjcmVlbmNoYW5nZScsKCk9PntpZihFTUImJiFmc0RvYy5mdWxsc2NyZWVuRWxlbWVudCYmIWZzRG9jLndlYmtpdEZ1bGxzY3JlZW5FbGVtZW50KWZzRG9jLmJvZHkuY2xhc3NMaXN0LnJlbW92ZSgnbWtmcycpO3N5bmNGU0J1dHRvbigpfSk7c3luY0ZTQnV0dG9uKCk7CmRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ3Zpc2liaWxpdHljaGFuZ2UnLCgpPT57aWYoZG9jdW1lbnQuaGlkZGVuKXBhdXNlKCl9KTsKYWRkRXZlbnRMaXN0ZW5lcigna2V5ZG93bicsZT0+e2lmKGUuY29kZT09PSdLZXlQJ3x8ZS5jb2RlPT09J0VzY2FwZScpe2lmKHN0YXRlPT09J3BsYXknKXBhdXNlKCk7ZWxzZSBpZihzdGF0ZT09PSdwYXVzZScpcmVzdW1lKCl9fSk7CiQoJ2NpJykudGV4dENvbnRlbnQ9Jyc7c2hvd01lbnUoKTtyZXF1ZXN0QW5pbWF0aW9uRnJhbWUobG9vcCk7Cjwvc2NyaXB0PjwvYm9keT48L2h0bWw+Cg==',amirshahi:'PCFET0NUWVBFIGh0bWw+PGh0bWwgbGFuZz0iZmEiIGRpcj0icnRsIj48aGVhZD48bWV0YSBjaGFyc2V0PSJ1dGYtOCI+CjxtZXRhIG5hbWU9InZpZXdwb3J0IiBjb250ZW50PSJ3aWR0aD1kZXZpY2Utd2lkdGgsaW5pdGlhbC1zY2FsZT0xLHZpZXdwb3J0LWZpdD1jb3Zlcix1c2VyLXNjYWxhYmxlPW5vIj48bWV0YSBuYW1lPSJhcHBsZS1tb2JpbGUtd2ViLWFwcC1jYXBhYmxlIiBjb250ZW50PSJ5ZXMiPjxtZXRhIG5hbWU9Im1vYmlsZS13ZWItYXBwLWNhcGFibGUiIGNvbnRlbnQ9InllcyI+PG1ldGEgbmFtZT0iYXBwbGUtbW9iaWxlLXdlYi1hcHAtc3RhdHVzLWJhci1zdHlsZSIgY29udGVudD0iYmxhY2stdHJhbnNsdWNlbnQiPjxtZXRhIG5hbWU9ImFwcGxlLW1vYmlsZS13ZWItYXBwLXRpdGxlIiBjb250ZW50PSLYp9mF24zYsSDYtNin2YfbjCI+Cjx0aXRsZT7Yp9mF24zYsSDYtNin2YfbjDwvdGl0bGU+CjxzdHlsZT4KOnJvb3R7LS1iZzojMGIxZDEyOy0tZmc6I2ZmZjstLWFjYzojZmZkMjNmO2NvbG9yLXNjaGVtZTpkYXJrO2JveC1zaXppbmc6Ym9yZGVyLWJveDtwYWRkaW5nLXRvcDplbnYoc2FmZS1hcmVhLWluc2V0LXRvcCwwcHgpO3BhZGRpbmctYm90dG9tOmVudihzYWZlLWFyZWEtaW5zZXQtYm90dG9tLDBweCl9CkBtZWRpYSAocHJlZmVycy1jb2xvci1zY2hlbWU6ZGFyayl7OnJvb3Q6bm90KFtkYXRhLXRoZW1lPSJsaWdodCJdKXstLWJnOiMwYjFkMTJ9fQo6cm9vdFtkYXRhLXRoZW1lPSJkYXJrIl17LS1iZzojMGIxZDEyfQpodG1sLGJvZHl7aGVpZ2h0OjEwMCU7bWFyZ2luOjA7b3ZlcnNjcm9sbC1iZWhhdmlvcjpub25lfWh0bWx7cG9zaXRpb246Zml4ZWQ7aW5zZXQ6MDt3aWR0aDoxMDAlfWJvZHl7cG9zaXRpb246Zml4ZWQ7aW5zZXQ6MDstd2Via2l0LXRvdWNoLWNhbGxvdXQ6bm9uZTstd2Via2l0LXRhcC1oaWdobGlnaHQtY29sb3I6dHJhbnNwYXJlbnR9CmJvZHl7YmFja2dyb3VuZDp2YXIoLS1iZyk7Y29sb3I6dmFyKC0tZmcpO2ZvbnQtZmFtaWx5OlZhemlybWF0bixUYWhvbWEsc3lzdGVtLXVpLHNhbnMtc2VyaWY7ZGlzcGxheTpmbGV4O2ZsZXgtZGlyZWN0aW9uOmNvbHVtbjtvdmVyZmxvdzpoaWRkZW47dG91Y2gtYWN0aW9uOm5vbmU7dXNlci1zZWxlY3Q6bm9uZTstd2Via2l0LXVzZXItc2VsZWN0Om5vbmV9CiNodWR7ZGlzcGxheTpmbGV4O2p1c3RpZnktY29udGVudDpzcGFjZS1iZXR3ZWVuO2FsaWduLWl0ZW1zOmNlbnRlcjtwYWRkaW5nOjVweCAxMHB4O2ZvbnQtd2VpZ2h0OjcwMDtnYXA6NnB4fQojaHVkIGJ7Y29sb3I6dmFyKC0tYWNjKX0uc2N7Zm9udC1zaXplOjIwcHh9LnNjIGJ7Zm9udC1zaXplOjI0cHh9LmNuYntmb250LXNpemU6MTRweDttaW4td2lkdGg6NzBweH0KLnQwe2NvbG9yOiM2YWE1ZmZ9LnQxe2NvbG9yOiNmZjc2ODF9CiN0cnt0ZXh0LWFsaWduOmNlbnRlcjtmb250LXNpemU6MTNweDtmb250LXdlaWdodDo3MDA7aGVpZ2h0OjE4cHh9CiN3cmFwe2ZsZXg6MTttaW4taGVpZ2h0OjA7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtqdXN0aWZ5LWNvbnRlbnQ6Y2VudGVyfQpjYW52YXN7ZGlzcGxheTpibG9ja30KI292e3Bvc2l0aW9uOmZpeGVkO2luc2V0OjA7YmFja2dyb3VuZDpyYWRpYWwtZ3JhZGllbnQoY2lyY2xlIGF0IDUwJSAxNSUsIzM0MjA2YSwjMDcwYjE4KTtkaXNwbGF5OmZsZXg7ZmxleC1kaXJlY3Rpb246Y29sdW1uO2FsaWduLWl0ZW1zOmNlbnRlcjtnYXA6MTBweDt0ZXh0LWFsaWduOmNlbnRlcjtvdmVyZmxvdy15OmF1dG87cGFkZGluZzptYXgoMThweCxlbnYoc2FmZS1hcmVhLWluc2V0LXRvcCkpIDE4cHggMjRweDt6LWluZGV4OjIwfQojb3Y+OmZpcnN0LWNoaWxke21hcmdpbi10b3A6YXV0b30jb3Y+Omxhc3QtY2hpbGR7bWFyZ2luLWJvdHRvbTphdXRvfQojb3YgaDF7Zm9udC1zaXplOjQ2cHg7bWFyZ2luOjA7Y29sb3I6dmFyKC0tYWNjKTt0ZXh0LXNoYWRvdzowIDNweCAwICNhNTZhMDAsMCAwIDI1cHggI2ZmZDIzZjY2fQojb3YgaDJ7bWFyZ2luOjA7Zm9udC1zaXplOjI2cHg7Y29sb3I6dmFyKC0tYWNjKX0jb3YgcHttYXJnaW46MDtvcGFjaXR5Oi44fS5obntmb250LXNpemU6MTNweH0KLmxvZ297d2lkdGg6OTZweDtmaWx0ZXI6ZHJvcC1zaGFkb3coMCA0cHggMTBweCAjZmZkMjNmODgpfQouY257Zm9udC1zaXplOjIwcHg7Zm9udC13ZWlnaHQ6NzAwfS5jbiBie2NvbG9yOnZhcigtLWFjYyl9CmJ1dHRvbntmb250OmluaGVyaXQ7Zm9udC1zaXplOjE4cHg7Zm9udC13ZWlnaHQ6NzAwO3BhZGRpbmc6MTNweCAzMHB4O2JvcmRlcjowO2JvcmRlci1yYWRpdXM6MzBweDtiYWNrZ3JvdW5kOnZhcigtLWFjYyk7Y29sb3I6IzIyMjttaW4td2lkdGg6MjMwcHg7Ym94LXNoYWRvdzowIDRweCAwICNhNTZhMDB9CmJ1dHRvbjphY3RpdmV7dHJhbnNmb3JtOnRyYW5zbGF0ZVkoM3B4KTtib3gtc2hhZG93OjAgMXB4IDAgI2E1NmEwMH0KYnV0dG9uLmIye2JhY2tncm91bmQ6IzJmN2JmZjtjb2xvcjojZmZmO2JveC1zaGFkb3c6MCA0cHggMCAjMTQzODhhfQpidXR0b24uYjN7bWluLXdpZHRoOjA7cGFkZGluZzo5cHggMTZweDtmb250LXNpemU6MTVweDtiYWNrZ3JvdW5kOiNmZmZmZmYxZjtjb2xvcjojZmZmO2JveC1zaGFkb3c6bm9uZTtib3JkZXI6MXB4IHNvbGlkICNmZmZmZmYzM30KYnV0dG9uLmIzLm9ue2JhY2tncm91bmQ6dmFyKC0tYWNjKTtjb2xvcjojMjIyfQoucnd7ZGlzcGxheTpmbGV4O2dhcDo4cHg7ZmxleC13cmFwOndyYXA7anVzdGlmeS1jb250ZW50OmNlbnRlcn0KLmdye2Rpc3BsYXk6Z3JpZDtncmlkLXRlbXBsYXRlLWNvbHVtbnM6MWZyIDFmcjtnYXA6MTBweDt3aWR0aDptaW4oMTAwJSwzNjBweCl9Ci5pdHtiYWNrZ3JvdW5kOiNmZmZmZmYxMjtib3JkZXI6MXB4IHNvbGlkICNmZmZmZmYyNjtib3JkZXItcmFkaXVzOjE0cHg7cGFkZGluZzo4cHg7ZGlzcGxheTpmbGV4O2ZsZXgtZGlyZWN0aW9uOmNvbHVtbjthbGlnbi1pdGVtczpjZW50ZXI7Z2FwOjVweH0KLml0LmVxe2JvcmRlci1jb2xvcjp2YXIoLS1hY2MpO2JveC1zaGFkb3c6MCAwIDEycHggI2ZmZDIzZjU1fS5pdCBjYW52YXN7d2lkdGg6NzJweDtoZWlnaHQ6NzJweH0KI2Zwe2JvcmRlci1yYWRpdXM6MTBweDt3aWR0aDptaW4oODB2dywzMDBweCk7aGVpZ2h0OmF1dG87Ym9yZGVyOjJweCBzb2xpZCAjZmZmNH0KI2Vie3Bvc2l0aW9uOmZpeGVkO2xlZnQ6MDtyaWdodDowO2JvdHRvbTptYXgoMTBweCxlbnYoc2FmZS1hcmVhLWluc2V0LWJvdHRvbSkpO2Rpc3BsYXk6ZmxleDtnYXA6OHB4O2p1c3RpZnktY29udGVudDpjZW50ZXI7YWxpZ24taXRlbXM6Y2VudGVyO2ZsZXgtd3JhcDp3cmFwO3otaW5kZXg6MTV9CiNlYltoaWRkZW5de2Rpc3BsYXk6bm9uZX0KI21iLCNoYiwjcGJ7bWluLXdpZHRoOjA7cGFkZGluZzo0cHggMTBweDtmb250LXNpemU6MTZweDtiYWNrZ3JvdW5kOiNmZmZmZmYyMjtjb2xvcjojZmZmO2JveC1zaGFkb3c6bm9uZX0KI3RvYXN0e3Bvc2l0aW9uOmZpeGVkO3RvcDo2NHB4O2xlZnQ6NTAlO3RyYW5zZm9ybTp0cmFuc2xhdGVYKC01MCUpO2JhY2tncm91bmQ6IzAwMGM7Y29sb3I6dmFyKC0tYWNjKTtwYWRkaW5nOjhweCAxOHB4O2JvcmRlci1yYWRpdXM6MjBweDtmb250LXdlaWdodDo3MDA7ei1pbmRleDozMDtvcGFjaXR5OjA7dHJhbnNpdGlvbjpvcGFjaXR5IC4yNXM7cG9pbnRlci1ldmVudHM6bm9uZX0KI3RvYXN0Lm9ue29wYWNpdHk6MX0KI3JhcHtwb3NpdGlvbjpmaXhlZDtpbnNldDowO2Rpc3BsYXk6bm9uZTtwb2ludGVyLWV2ZW50czpub25lO3otaW5kZXg6NTtvdmVyZmxvdzpoaWRkZW59CiNyYXAub257ZGlzcGxheTpibG9jazthbmltYXRpb246ZmkgLjM1c30KI3JhcC5vdXR7YW5pbWF0aW9uOmZvIC40cyBmb3J3YXJkc30KI3Jje3Bvc2l0aW9uOmFic29sdXRlO2luc2V0OjA7d2lkdGg6MTAwJTtoZWlnaHQ6MTAwJX0KI3Jze3Bvc2l0aW9uOmFic29sdXRlO2xlZnQ6NTAlO2JvdHRvbTotMyU7d2lkdGg6bWluKDExMnZ3LDUyMHB4KTtoZWlnaHQ6YXV0bzt0cmFuc2Zvcm06dHJhbnNsYXRlWCgtNTAlKTthbmltYXRpb246c3UgLjY1cyBjdWJpYy1iZXppZXIoLjIsMS40LC40LDEpfQojcnR7cG9zaXRpb246YWJzb2x1dGU7dG9wOm1heCg2NHB4LGVudihzYWZlLWFyZWEtaW5zZXQtdG9wKSk7bGVmdDowO3JpZ2h0OjA7dGV4dC1hbGlnbjpjZW50ZXI7Zm9udC13ZWlnaHQ6OTAwO2ZvbnQtc2l6ZTozMHB4O2NvbG9yOiNmZmQyM2Y7dGV4dC1zaGFkb3c6MCAwIDE0cHggI2ZmZDIzZiwwIDAgMzRweCAjZmYzYmQ0O2xldHRlci1zcGFjaW5nOjJweDt0cmFuc2Zvcm0tb3JpZ2luOjUwJSA1MCV9CkBrZXlmcmFtZXMgZml7ZnJvbXtvcGFjaXR5OjB9fQpAa2V5ZnJhbWVzIGZve3Rve29wYWNpdHk6MH19CkBrZXlmcmFtZXMgc3V7ZnJvbXt0cmFuc2Zvcm06dHJhbnNsYXRlWCgtNTAlKSB0cmFuc2xhdGVZKDE0MHB4KSBzY2FsZSguOCl9fQoKI292IGlucHV0e2ZvbnQ6aW5oZXJpdDtmb250LXNpemU6MThweDtwYWRkaW5nOjExcHggMTRweDtib3JkZXItcmFkaXVzOjE0cHg7Ym9yZGVyOjJweCBzb2xpZCAjZmZmZmZmNDQ7YmFja2dyb3VuZDojMDAwNztjb2xvcjojZmZmO3RleHQtYWxpZ246Y2VudGVyO3dpZHRoOm1pbigxMDAlLDI4MHB4KTtvdXRsaW5lOm5vbmU7LXdlYmtpdC11c2VyLXNlbGVjdDp0ZXh0O3VzZXItc2VsZWN0OnRleHR9I292IGlucHV0OmZvY3Vze2JvcmRlci1jb2xvcjp2YXIoLS1hY2MpfQo8L3N0eWxlPjwvaGVhZD48Ym9keT4KPGRpdiBpZD0iaHVkIj48c3BhbiBjbGFzcz0iY25iIj7wn6qZIDxiIGlkPSJjbiI+MDwvYj48L3NwYW4+PHNwYW4gY2xhc3M9InNjIj48c3BhbiBjbGFzcz0idDAiPvCflLUgPGIgaWQ9InMwIj4wPC9iPjwvc3Bhbj4gOiA8c3BhbiBjbGFzcz0idDEiPjxiIGlkPSJzMSI+MDwvYj4g8J+UtDwvc3Bhbj48L3NwYW4+PHNwYW4+PGJ1dHRvbiBpZD0icGIiIG9uY2xpY2s9InNldFBhdXNlKHRydWUpIiBoaWRkZW4+4o+4PC9idXR0b24+IDxidXR0b24gaWQ9ImhiIiBvbmNsaWNrPSJleGl0R2FtZSgpIiBoaWRkZW4+8J+PoDwvYnV0dG9uPiA8YnV0dG9uIGlkPSJtYiIgb25jbGljaz0idG9nZ2xlTXV0ZSgpIj7wn5SKPC9idXR0b24+PC9zcGFuPjwvZGl2Pgo8ZGl2IGlkPSJ0ciI+PC9kaXY+CjxkaXYgaWQ9IndyYXAiPjxjYW52YXMgaWQ9ImMiPjwvY2FudmFzPjwvZGl2Pgo8ZGl2IGlkPSJlYiIgaGlkZGVuPjxzcGFuIHN0eWxlPSJmb250LXNpemU6MTNweDt3aWR0aDoxMDAlO3RleHQtYWxpZ246Y2VudGVyIj7ZhdmH2LHZh+KAjNmH2Kcg2LHZiCDYqNqp2LQg2Ygg2KzYp9i02YjZhiDYsdmIINi52YjYtiDaqdmGPC9zcGFuPjxidXR0b24gY2xhc3M9ImIzIiBvbmNsaWNrPSJzYXZlRWRpdCgpIj7inIUg2LDYrtuM2LHZhzwvYnV0dG9uPjxidXR0b24gY2xhc3M9ImIzIiBvbmNsaWNrPSJyZXNldEVkaXQoKSI+4oa6INix24zYs9iqPC9idXR0b24+PGJ1dHRvbiBjbGFzcz0iYjMiIG9uY2xpY2s9ImNhbmNlbEVkaXQoKSI+4pyWINmE2LrZiDwvYnV0dG9uPjwvZGl2Pgo8ZGl2IGlkPSJvdiI+PC9kaXY+PGRpdiBpZD0idG9hc3QiPjwvZGl2Pgo8ZGl2IGlkPSJyYXAiPjxjYW52YXMgaWQ9InJjIj48L2NhbnZhcz48ZGl2IGlkPSJydCI+8J+OpCDaqdin2KjZiNizIPCfjqQ8L2Rpdj4KPHN2ZyBpZD0icnMiIHZpZXdCb3g9IjAgMCAyNjAgMzMwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxkZWZzPgo8cmFkaWFsR3JhZGllbnQgaWQ9ImdzayIgY3g9Ii40IiBjeT0iLjM1IiByPSIuOCI+PHN0b3Agb2Zmc2V0PSIwIiBzdG9wLWNvbG9yPSIjZThhYTcwIi8+PHN0b3Agb2Zmc2V0PSIuNyIgc3RvcC1jb2xvcj0iI2MyN2M0NiIvPjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzhmNTQyOSIvPjwvcmFkaWFsR3JhZGllbnQ+CjxsaW5lYXJHcmFkaWVudCBpZD0iZ2hkIiB4MT0iMCIgeTE9IjAiIHgyPSIxIiB5Mj0iMSI+PHN0b3Agb2Zmc2V0PSIwIiBzdG9wLWNvbG9yPSIjNGE0YTY4Ii8+PHN0b3Agb2Zmc2V0PSIuNiIgc3RvcC1jb2xvcj0iIzIyMjIyZiIvPjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzEwMTAxOCIvPjwvbGluZWFyR3JhZGllbnQ+CjxsaW5lYXJHcmFkaWVudCBpZD0iZ3NsIiB4MT0iMCIgeTE9IjAiIHgyPSIxIiB5Mj0iMCI+PHN0b3Agb2Zmc2V0PSIwIiBzdG9wLWNvbG9yPSIjM2MzYzU2Ii8+PHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjMWExYTI2Ii8+PC9saW5lYXJHcmFkaWVudD4KPGxpbmVhckdyYWRpZW50IGlkPSJnY3AiIHgxPSIwIiB5MT0iMCIgeDI9IjEiIHkyPSIxIj48c3RvcCBvZmZzZXQ9IjAiIHN0b3AtY29sb3I9IiM0ZDk3ZmYiLz48c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiMxMjM1OTYiLz48L2xpbmVhckdyYWRpZW50Pgo8bGluZWFyR3JhZGllbnQgaWQ9ImdnbCIgeDE9IjAiIHkxPSIwIiB4Mj0iMSIgeTI9IjEiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iIzdhN2E5NiIvPjxzdG9wIG9mZnNldD0iLjQiIHN0b3AtY29sb3I9IiMwNTA1MDgiLz48c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiMxYzFjMmEiLz48L2xpbmVhckdyYWRpZW50Pgo8bGluZWFyR3JhZGllbnQgaWQ9ImdnZCIgeDE9IjAiIHkxPSIwIiB4Mj0iMSIgeTI9IjEiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iI2ZmZjZiMCIvPjxzdG9wIG9mZnNldD0iLjUiIHN0b3AtY29sb3I9IiNmZmQyM2YiLz48c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiNjODhhMDAiLz48L2xpbmVhckdyYWRpZW50Pgo8Y2xpcFBhdGggaWQ9ImxlbnMiPjxyZWN0IHg9IjkyIiB5PSI5OCIgd2lkdGg9IjM0IiBoZWlnaHQ9IjIxIiByeD0iOCIvPjxyZWN0IHg9IjEzNCIgeT0iOTgiIHdpZHRoPSIzNCIgaGVpZ2h0PSIyMSIgcng9IjgiLz48L2NsaXBQYXRoPjwvZGVmcz4KPGcgaWQ9ImZpZyI+PGcgaWQ9InRvcnNvIj4KPHBhdGggZD0iTTIwIDMzMFExOCAyNDAgNzggMjIwUTEzMCAyMDggMTgyIDIyMFEyNDIgMjQwIDI0MCAzMzBaIiBmaWxsPSJ1cmwoI2doZCkiLz4KPHBhdGggZD0iTTU4IDMzMFE2NiAyNzYgOTIgMjQ0TTIwMiAzMzBRMTk0IDI3NiAxNjggMjQ0TTExMCAzMzBRMTEyIDI4MCAxMTggMjUwIiBzdHJva2U9IiMwMDAiIHN0cm9rZS1vcGFjaXR5PSIuMyIgc3Ryb2tlLXdpZHRoPSIzIiBmaWxsPSJub25lIi8+CjxwYXRoIGQ9Ik0xMzAgMjQyVjMzMCIgc3Ryb2tlPSIjMGEwYTEwIiBzdHJva2Utd2lkdGg9IjIuNSIvPjxyZWN0IHg9IjEyNyIgeT0iMjQ4IiB3aWR0aD0iNiIgaGVpZ2h0PSIxMiIgcng9IjIiIGZpbGw9InVybCgjZ2dkKSIvPgo8cGF0aCBkPSJNNjIgMzE4UTEzMCAyOTYgMTk4IDMxOCIgc3Ryb2tlPSIjMGEwYTEwIiBzdHJva2Utb3BhY2l0eT0iLjUiIHN0cm9rZS13aWR0aD0iMiIgZmlsbD0ibm9uZSIvPgo8cGF0aCBkPSJNNzggMjE2UTEzMCAxOTAgMTgyIDIxNlExNzIgMjUyIDEzMCAyNTRRODggMjUyIDc4IDIxNloiIGZpbGw9IiMxMDEwMTgiLz4KPGcgaWQ9InN0ciI+PHBhdGggZD0iTTExMiAyMzhMMTA4IDI4Mk0xNDggMjM4TDE1MiAyODIiIHN0cm9rZT0iI2RkZCIgc3Ryb2tlLXdpZHRoPSIyLjUiLz48Y2lyY2xlIGN4PSIxMDgiIGN5PSIyODUiIHI9IjMuNSIgZmlsbD0iI2RkZCIvPjxjaXJjbGUgY3g9IjE1MiIgY3k9IjI4NSIgcj0iMy41IiBmaWxsPSIjZGRkIi8+PC9nPgo8ZyBpZD0iY2hhaW4iPjxwYXRoIGQ9Ik05OCAyMjhRMTMwIDMwNCAxNjIgMjI4IiBmaWxsPSJub25lIiBzdHJva2U9InVybCgjZ2dkKSIgc3Ryb2tlLXdpZHRoPSI0LjUiLz4KPGcgaWQ9InBkIj48cGF0aCBkPSJNMTEzIDMwNkwxMTAgMjgwTDEyMSAyOTJMMTMwIDI3NEwxMzkgMjkyTDE1MCAyODBMMTQ3IDMwNloiIGZpbGw9InVybCgjZ2dkKSIgc3Ryb2tlPSIjYTU2YTAwIiBzdHJva2Utd2lkdGg9IjEuNSIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPjxjaXJjbGUgY3g9IjExMCIgY3k9IjI3OSIgcj0iMi41IiBmaWxsPSIjZmYzYjRhIi8+PGNpcmNsZSBjeD0iMTMwIiBjeT0iMjczIiByPSIyLjUiIGZpbGw9IiMyZjdiZmYiLz48Y2lyY2xlIGN4PSIxNTAiIGN5PSIyNzkiIHI9IjIuNSIgZmlsbD0iI2ZmM2I0YSIvPjwvZz48L2c+PC9nPgo8ZyBpZD0iYXJtTCI+PHBhdGggZD0iTTgyIDIzOEw1OCAyOTIiIHN0cm9rZT0idXJsKCNnc2wpIiBzdHJva2Utd2lkdGg9IjI4IiBzdHJva2UtbGluZWNhcD0icm91bmQiLz4KPGcgaWQ9ImZvcmVMIj48cGF0aCBkPSJNNTggMjkyTDQwIDI0MCIgc3Ryb2tlPSJ1cmwoI2dzbCkiIHN0cm9rZS13aWR0aD0iMjQiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPjxwYXRoIGQ9Ik0zMyAyNjJoMTUiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLW9wYWNpdHk9Ii4yNSIgc3Ryb2tlLXdpZHRoPSIzIi8+CjxlbGxpcHNlIGN4PSIzNyIgY3k9IjIyNCIgcng9IjEyIiByeT0iMTQiIGZpbGw9InVybCgjZ3NrKSIvPjxwYXRoIGQ9Ik0yNyAyMTRoMjBNMjggMjIwaDE5TTI5IDIyNmgxNyIgc3Ryb2tlPSIjOGY1NDI5IiBzdHJva2Utd2lkdGg9IjEuNSIgb3BhY2l0eT0iLjYiLz48Y2lyY2xlIGN4PSI0NiIgY3k9IjIyOSIgcj0iNSIgZmlsbD0idXJsKCNnc2spIi8+PHJlY3QgeD0iMjciIHk9IjIxNiIgd2lkdGg9IjE5IiBoZWlnaHQ9IjMiIGZpbGw9InVybCgjZ2dkKSIvPjwvZz48L2c+CjxnIGlkPSJoZWFkIj48cmVjdCB4PSIxMTQiIHk9IjE2OCIgd2lkdGg9IjMyIiBoZWlnaHQ9IjYwIiBmaWxsPSIjOGY1NDI5Ii8+CjxlbGxpcHNlIGN4PSI4NSIgY3k9IjExNCIgcng9IjgiIHJ5PSIxMyIgZmlsbD0iI2IwNmMzOCIvPjxlbGxpcHNlIGN4PSIxNzUiIGN5PSIxMTQiIHJ4PSI4IiByeT0iMTMiIGZpbGw9IiNiMDZjMzgiLz48Y2lyY2xlIGN4PSI4NSIgY3k9IjExOSIgcj0iMi41IiBmaWxsPSJ1cmwoI2dnZCkiLz48Y2lyY2xlIGN4PSIxNzUiIGN5PSIxMTkiIHI9IjIuNSIgZmlsbD0idXJsKCNnZ2QpIi8+CjxwYXRoIGQ9Ik04NiAxMDBRODYgNjIgMTMwIDYwUTE3NCA2MiAxNzQgMTAwTDE3NCAxMzBRMTcyIDE3MCAxMzAgMTg0UTg4IDE3MCA4NiAxMzBaIiBmaWxsPSJ1cmwoI2dzaykiLz4KPHBhdGggZD0iTTg4IDEzNFE5NCAxODIgMTMwIDE5MFExNjYgMTgyIDE3MiAxMzRRMTY2IDE2MCAxNTIgMTY3UTEzMCAxNzUgMTA4IDE2N1E5NCAxNjAgODggMTM0WiIgZmlsbD0iIzFhMTAwYSIgb3BhY2l0eT0iLjg4Ii8+CjxwYXRoIGQ9Ik0xMzAgMTA4UTEyMSAxMzQgMTI3IDE0MVExMzAgMTQyIDEzMyAxNDFRMTM5IDEzNCAxMzAgMTA4IiBmaWxsPSIjN2E0NjIzIiBvcGFjaXR5PSIuNTUiLz4KPHBhdGggZD0iTTEwNiAxNDhRMTMwIDE0MCAxNTQgMTQ4UTEzMCAxNDQgMTA2IDE0OCIgc3Ryb2tlPSIjMWExMDBhIiBzdHJva2Utd2lkdGg9IjMuNSIgZmlsbD0ibm9uZSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+CjxwYXRoIGlkPSJtcCIgZmlsbD0iIzNhMGEwYSIgc3Ryb2tlPSIjN2EyZTIyIiBzdHJva2Utd2lkdGg9IjIuNSIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPjxwYXRoIGlkPSJ0dCIgZmlsbD0idXJsKCNnZ2QpIi8+PGVsbGlwc2UgaWQ9InRnIiBmaWxsPSIjYzA1MDRkIi8+CjxnIGlkPSJjYXAiPjxwYXRoIGQ9Ik04NCA5OFE4MiA0MCAxMzAgMzZRMTc4IDQwIDE3NiA5OFExMzAgODIgODQgOThaIiBmaWxsPSJ1cmwoI2djcCkiLz48cGF0aCBkPSJNMTMwIDM4Vjg2IiBzdHJva2U9IiMwZTJhNzgiIHN0cm9rZS13aWR0aD0iMiIgb3BhY2l0eT0iLjYiLz48cGF0aCBkPSJNNzggOTZRMTMwIDc2IDE4OCA5NFEyMDAgMTA0IDE4NCAxMDZRMTMwIDkwIDgyIDEwOFoiIGZpbGw9IiMwZTJhNzgiLz4KPHBhdGggZD0iTTEzMCA1MGw0IDkgOSAuOC03IDYgMi4yMDAgOS04LjIwMC01LTguMjAwIDUgMi4yMDAtOS03LTYgOS0uOHoiIGZpbGw9InVybCgjZ2dkKSIvPjwvZz4KPHJlY3QgeD0iOTIiIHk9Ijk4IiB3aWR0aD0iMzQiIGhlaWdodD0iMjEiIHJ4PSI4IiBmaWxsPSJ1cmwoI2dnbCkiLz48cmVjdCB4PSIxMzQiIHk9Ijk4IiB3aWR0aD0iMzQiIGhlaWdodD0iMjEiIHJ4PSI4IiBmaWxsPSJ1cmwoI2dnbCkiLz48cGF0aCBkPSJNMTI2IDEwNGg4TTg0IDEwNGg4TTE2OCAxMDRoOCIgc3Ryb2tlPSIjMDAwIiBzdHJva2Utd2lkdGg9IjMiLz4KPGcgY2xpcC1wYXRoPSJ1cmwoI2xlbnMpIj48cGF0aCBpZD0iZ2xpbnQiIGQ9Ik0tMTIgOTZsMTIgMGwtMTAgMjZoLTEyeiIgZmlsbD0iI2ZmZiIgb3BhY2l0eT0iLjUiLz48L2c+PC9nPgo8ZyBpZD0iYXJtUiI+PHBhdGggZD0iTTE3OCAyMzhMMjEyIDI4MCIgc3Ryb2tlPSJ1cmwoI2dzbCkiIHN0cm9rZS13aWR0aD0iMjgiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPgo8ZyBpZD0iZm9yZVIiPjxwYXRoIGQ9Ik0yMTIgMjgwTDE3NiAyMDYiIHN0cm9rZT0idXJsKCNnc2wpIiBzdHJva2Utd2lkdGg9IjI0IiBzdHJva2UtbGluZWNhcD0icm91bmQiLz48cGF0aCBkPSJNMTc2IDIwNEwxNTIgMTU2IiBzdHJva2U9IiMyYTJhMmEiIHN0cm9rZS13aWR0aD0iMTIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPgo8ZWxsaXBzZSBjeD0iMTc0IiBjeT0iMjAwIiByeD0iMTIiIHJ5PSIxMyIgZmlsbD0idXJsKCNnc2spIi8+PHJlY3QgeD0iMTYzIiB5PSIxOTQiIHdpZHRoPSIyMiIgaGVpZ2h0PSIzIiBmaWxsPSJ1cmwoI2dnZCkiLz4KPGNpcmNsZSBjeD0iMTUwIiBjeT0iMTUzIiByPSIxMyIgZmlsbD0iIzlhOWFhOCIgc3Ryb2tlPSIjNTU1IiBzdHJva2Utd2lkdGg9IjIiLz48cGF0aCBkPSJNMTQxIDE0OGwxOCAxME0xNDAgMTU0bDE2IDlNMTQ0IDE0M2wxNiA5IiBzdHJva2U9IiM2NjYiIHN0cm9rZS13aWR0aD0iMS41MDAiLz48Y2lyY2xlIGN4PSIxNDUiIGN5PSIxNDgiIHI9IjMiIGZpbGw9IiNmZmYiIG9wYWNpdHk9Ii42Ii8+PC9nPjwvZz4KPC9nPjwvc3ZnPjwvZGl2PgoKPHNjcmlwdD4KY29uc3QgaHk9KGEsYik9Pk1hdGguc3FydChhKmErYipiKTtjb25zdCAkPWk9PmRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGkpLEZBPW49PlN0cmluZyhuKS5yZXBsYWNlKC9cZC9nLGQ9PifbsNux27Lbs9u027Xbttu327jbuSdbZF0pOwpjb25zdCBQVz00MjAsTT0zMCxHRD0zOCxHVz0xNTAsUEw9TSxQUj1NK1BXLFQ9NTIsVz1QVysyKk0sQ1g9Vy8yLEdMPUNYLUdXLzIsR1I9Q1grR1cvMixQUkFEPTIxLEJSQUQ9MTEuNSxNQVhQPTcwO2xldCBQSD03MDAsQj1UK1BILEg9QitHRCsxNCxDWT0oVCtCKS8yLFBPU1RTPVtdOwpjb25zdCBjdj0kKCdjJyksY3R4PWN2LmdldENvbnRleHQoJzJkJyksd3JhcD0kKCd3cmFwJyksb3Y9JCgnb3YnKSxlbWI9d2luZG93LnBhcmVudCE9PXdpbmRvdzsKbGV0IFM9MSxtb2RlPSdib3QnLG9iaj1bXSxiYWxsLHR1cm49MCxzY29yZT1bMCwwXSxzdGF0ZT0nbWVudScsc2VsPW51bGwsYWltPW51bGwsc3A9bnVsbCxib3RUPTAscGxhbj1udWxsLG1zZz0nJyxtc2dUPTAsZnI9MCxuZXRBbXA9MCxuZXRTaWRlPTAsZWFybmVkPTAsYm90UHJlPSdiYWwnLGVkPVtdLG9wcFMsZHJhZz1udWxsLHBhdXNlZD1mYWxzZSx3YXNSYXA9ZmFsc2UscGl0Y2gwPTA7CmNvbnN0IGF1PW5ldyBBdWRpbygnZGF0YTphdWRpby9tcGVnO2Jhc2U2NCxTVVF6QkFBQUFBQUJDbFJZV0ZnQUFBQVNBQUFEYldGcWIzSmZZbkpoYm1RQWFYTnZiUUJVV0ZoWUFBQUFFd0FBQTIxcGJtOXlYM1psY25OcGIyNEFOVEV5QUZSWVdGZ0FBQUFrQUFBRFkyOXRjR0YwYVdKc1pWOWljbUZ1WkhNQWFYTnZiV2x6YnpKaGRtTXhiWEEwTVFCVVUxTkZBQUFBRHdBQUEweGhkbVkyTUM0eE5pNHhNREFBQUFBQUFBQUFBQUFBQVAvN1lNQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFFbHVabThBQUFBUEFBQUE4UUFBOXZBQUJBWUpDdzRRRXhZWUd4MGZJaVVvS2l3dk1UUTNPancrUVVOR1NFdE9VRk5WVjFwZFlHSmtaMmxzYjNKMGRubDdmb0dEaG9pTGpZK1RsWmlhbloraHBhZXFySzZ4czdlNXU3N0F3OFhIeTgzUTB0WFgyZDNmNHVUbTZldnY4ZlAyK1B2OUFBQUFBRXhoZG1NMk1DNHpNUUFBQUFBQUFBQUFBQUFBQUNRR1FBQUFBQUFBQVBid1ZydXNCd0FBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQVAvN1lNUUFBQUFBQWFRVUFBQWhuVE1yQXlqUUFNdm1RRy9pZ2I4Zms0YUZrUE5weUdMOGVoTi9PREJtLys1VFRRLzhUOE9lWURuS2YvNlpRUkpjZXdLNS85OGVBd1lXOFRzTFdFaktmLzJRdStDMEFGUVJCR0pnakFXYmYvL3Y1dVhDK1FSaHpJWWNGckk1S0VuLy8vLytwUzMweDRGeGo1SUdoVFFWQWRidjNsOGdLU2dnd1VXV0doNXRxTmI3NVJDUFVrR1B2VVViZVl2Z291YnAwaTBTUFNlZ0JCMUtxQVVrWk9WT3REbmk2YXk1azlKOExCVlRCYWhRUG1GaFVrWnp1MTMwdFdkMnN4NmVydGRLTmwrNDBLRnF1SnFiaFA3d1lzV0F3bnZEWFN1Wkg4SkpxR09USXRxTGM1WHlXVXpNU281V0ZOUXRUMnUvY0c5OHhOa2tPSmVLeGYvN1lzUkVBQmRabld1OWw0QUNJcXhzWWFZT2VQS3NydVBKbUZpRTkrSVV1dDJ6MnFzR2VzU1MzdGJWYVZwclg5Zisva3hpUjdqRzViNXI5Zi9PTFd6QTF1QmpmOTV2REJ4NUFBREQyVUsxc3pjQXpNYWhGUjA2S0pPZER6N3pWZUJZZWpXTnE1UVFMeGMwZDNYb2E5ZmFDQ2J3V3pZbzJucTdNTjZmT1V0TTBtRmJrZW92OXM5WVZKbStIQTlNVk15dWJNREFSVTR0UFhxaldGUS9sMWNWV2tVRHA0bk9HMWhrdmlPT3hlYTQ1R0R4NG9ETmh4NGV3a0VWREdIWHJHeHgxSnUvODF6MDUzcStHYVQ3RjFVS0JqSkFCQUFtYTFLV0tZUG15eGxrRk5nbjFjQlVjSGhmQk5TR1I2MGJJUFFwQm5peXhXZWNVQmdQOUgxc0M4RnlPRUVNRmVULysyREVHb0NRV1B0aGJURXBnaCtvTERHbUdqZ0kvTEl5djYrQ2ZTdnRkcHBmcEVxN0RvaTVvaVk4SUlTVTBGaFNQalVoS0NvVndSR2tteFpkbXVtMnV6YWlzYWVaNjIxbTZqY01QRlhBNk9oTnhWNGlSRnp0TFc1bDVseXo1WVZjejZ4YWdRQUFCWm44S0xTYTRqQnVteWx1VWRkWnBET081TmhpVXBiNmh4a3ROSys4NmZkVUdHTnNpRWhMdFBsNXhFWStrTzJlOU1uWHovenJ1MmEzc1VRdTd0Nk5Oc3NPczdJWG1WWXBzMk5WbTFiaUhhaE9XcUM4YWxLaE80YzJNSFJNam9jcVAvejQ5UDdkOTl6SDJNZHJVRjdLRy80eHlvYkhLMTFqalFvTERUUmdPdFR6K1J5ZExXeEFBQUxNcXFRQ3hEQmlXRUlUendmUWFpNFhnMU5VTWl2LysyREVEUUFQSFZscExMREJ3aEcwTGZHRElmaG8waUl0SXVGN2JUclVhcUZZOXNkSkw3cFZ6cnMvK2ZkN3RXUzdmN09Xc2doZUl4QzNPZEVpSitPL01JYXRudEF4b3pkamU5VjVNZC8valcwUHU5bS8vajV6R29oU3FnSEQ0RHJ1M3U3MzMvOTluNzBBdzJ0N05ha3FPQ2RhVURTRlZJRkJBSE1NWDZkcDlIRmpzY2NOMWFTbmZ0VjBibE1vbWZwR1NHK0pwZlVtaVN1aGVZbVdGcHNScFJkSUp5bmUxTE4yemVjYXBaWkl0dHJXQTlTVVY0dWxzT2hrR1pIQU5BbE9IQnN0SEhFcVVyTk5QWDAzY1RGekZ2WE1STjlyY29jYWRJNGFWT1BteWl1aVE2bmRvKzQrTnFpVWF2clM0cTcrYi91WitidjRNdFVIc09GQUFBQVJvU1MxcnRULysyREVCZ0NPY09WcGpLVU5RZENrN1BHVW9lQmw3aXVNK3pPWkxMNDNEN3RQVUloVllNSUh2NjZzVEVocTl5bWxra05La29WSGtUbDB5WStWcmlPNzJhRjNGSER3NHVqR1NScURZYTFaVFFucG5pQTRZOVhQUEhqYUtsTFJKNUlRdUpUQXg0bGVlT3FzS2t3Z3dVQnBRSEJTRFZyTzlDbjkvN3pwZ1J0S0FnQVdidEttek9saEhMYjZDWUFlbG03dngrVlNxQTY3ejBwNG9FRWI3Tk5GWFR0S0RMa1dQekhoV1RLZldLTW1vNU1ScXVWdExzaytla2lPb3N2cXU3Sk5GUlM1WnBHQTlZcXFqYlJwSDB0dzBjclQveC8xMy85ZkYrOTlRekdnTnpnQ0xHRlBZaFlXSWlobE9UZitTa0NxQ0tUZ0FBQUFFYmlFMGNBOWUyUVNKYmpqTjlILysyTEVDZ0NPME9WaGpUMkJBZElkSytXbUpPQ25DV09Cc3pVZXkyeWZ2R2pLbU1TckxLUXFubTZLdmdmVUFtYVdpNWU5OTRZSDJJL3V5eTVrVzdYYk5MT3EzbnZRSlhJS05mK3dJVnkxWThuZW5VRkRLZFQxNXM2ek45MXY2MjEyQVNsaTVCcE4ySk04VldOckdCeDlMMjlJOS9RNy9ySndRQUJqbHkwRXlpeGZ3dnUzVmxLeHdxQkVJQnNUVDhlVUFHSmVSclRJOEZtRVBiU0RKcFNLS2xLRkNsVUF2UW9lVlVsNC9QUzMrWHUyY3k0bjBLazB5M2ZOZFE0MGRaMjJlU2tBSmxjbk8zQWtiRVUyRUtpZlVpbkJkYUtjU0tMSHhVNFp4NVgxaUl4QUlzUldwZy9sQjdlaHlqQkFBQUU2RXBKMEdDMHFuMmJ0TDB3NHc0REhJUzZmeHFRTy8vdGd4QTBCanpVdFhRMDhjY0g2cGF1QnA2WTQ1cHhJbkNKaU5yVXlVMmdvN2pWVXZGSEVVYmEvcEpGak1UWHFlRmZIajZ4TXlmVmNRSy9HcjRtL3JCZk0rTXZtQ0w5ZkdZamt1eFlJMENDK2lTc0s5NEFDeWl3TUtseHFvZUEzWC90UExUWW9wQlAvUXRDUWk4T0xlSnp6LzZqSjNaSktBZ1NISG5aYTJOU2F2WFRkU1d1RElZY25tbFNKNVo1NzRzelhkektoNGhIYWJzMGl5OW5yQWNFZkZ0bWR0amRmZjFsMzhYdG5HWmZCZVZpeG9Oc1psZzZrYWFKK0E1LzRqc1NnTmdTK0l1NERadU91Rk5SWUh5WXBhc1Y4Tk9YWldJTklIZTJyaDd5cGJmN2w2ZHYveWZsc3NkMlV5ait2Nm5HSzZoVVFRa1FBQUJIbzB6OHQycmxReDRHdy8vdGd4QWlBanFrdFk0eWxDOEh5TUcwMWhLRjR1OUFrdGsxT3FMQkFFemE0ZFFvQTQwNnl4ZWsrcGc3TSt3ak5aQlhTczBTTWdKR0ZFQ3hUK2NxSEdjWmZrUUo3NE54Y1NDR0g5UFR5Tm9WQUtlbmZBUHFKdVpFVm9LVTZCdHJHc1JQMUtkK1hYak1pYlorLy8vM3gwVlB3SlQxTURYQUgrMEptQUlnQUIwK25aaDd3dGVmMTZhMUM4RVVvQUlQRlZBVlZsQWhKa3FVcVRXSUZWTlNRSUM0b1NFc3Rxbm9rbkZ5MHByK3FpSWoxbS9WTHU0dHhQY0V2UktrVUhnZkFzaEZjZVdYQmZBMjNwVytpWlowdWErUmFsZS9yNDVtTnJIK1hmcmFOMmcwNXhqVkpCZC93dkZmcUtTaURicjVRZEwzL0FwNUNHdGpqQ0lBUUFLb0h4WG04WDFBTi8vdGd4QWVBRHcxM2RhZU0wMEhQSWU0Umg2UVp4MnZIaWxtYmtKc3Q3YzNDUG1INXBtWEpBbzkrUVdlRFBYemNtUk1qODVmQUFmQ2NqTGw4cG8rcnIxa0VFaVpCYzYyT2FBOVBZc25UN0RNWWg5MTh2T3ZEVW94a1AvaWVQNHZiWWgzL01tOWdobE0rUmYrLysvL25pdk9sek9JL3Z6eVpobVhyQzd4OW8yZFJUQkRqeWdVazZTYWRjdENhTlJrTkQ4akpVaVhRRXlPaUNxZXd1SzN4bGMwTDI3bmxKZXc4ZW16Vi9wM2s5aGtwWjhsL2xOVHpzK0NETGFySlJqSWdtTUN2eE8yRlRBd2FvMndYWUxVdXlscm9PV2szSkRQS2w0cU5YRmF0cldrNXAzN04wQ2NsUUc5dHoyKy9OTTI0RDR6Vkd0YVNhSUFBRUNBV3hEbUVORXJHUTFVWS8vdGl4QWtBamwweGM0ZVllUUhSb20zdGhoazRxNGJTbTFWV0czTFR4ellFVTN5N2U3aTk1YndHQi9TZkNnY0wyaXNjNGdnZ1AzdjhuZTczc1BmbHZOUEgvWlI3RjNuZm0wYlNDY2M1a0MwU2t4bDJqWFZCVk96Tm5qWGlFdjhOcVhscFRyLzNTOXc2R0FLMllsWG95aWtrUzNRV0ppckp1RUFJdE9IR2Z2QThrWWVlYXJ4MHlKWnVoQjJSQitFcFlockhHb3o5N29IMXphOSt4WlVQV1dqaWNYdTJXcklBQk5hU2Vlc2pQK1VReFRTL3FGZnpxcFJaa2VXeFZQa3lRUE5MMGN5cUxEWW80WkVlakRuUVJLSXgwcDF2OTdka3Y2MXp4NTJZRVU4YVNUaUszb3Ywb1h5VGxSckdVa0NBQUZnMUhaMkYyTHlRazhHSmdRdHJaaklTakE4a1EvLzdZTVFOZ0UwMUszT0htSEVCZnBqdXJQTU9JQlEwaVJTcFRqYThMSDRjbXB1K21Hc0FRaHpJb2d5U2o4MEpLbENoTmM1Zi95OGV4TWRXeUdRdEhaV0loMUtTVXY5T1RQOXBTK2NQdGJ0OHZsRHBBWmtSd3h2ZFJNQkJCKzFMMmt6bVMyQzNNeElnSVQ4eXZKa2FCTklwdUplQWNLdE1SUlN2cUkxYXd4emhTSlZRYzFzcjNESU82TCtHME1XaVd5Q0U1bFBrN0ZJeVg1L1d1V1dvN0JzaHl2RXF1WWthVGFrcWFGMVBYcm0xR3laNnVCWW1GeWJ5U243VVBCa0xYVytQKzVVUzFHTWdnQ0RZUEI4aGgvSmRQTGFCVVpLRkNlQ3RNaFV1VWRDOUJFU1pFdXpBUFNhU2M0K1E3cVk2bGp3azhnTk5xM2o4djlYTVczMTV6aGFKVEltQ3F2LzdZTVFnZ0EwNDEzT0htRzlCcFJtdWVQTU42TFF3Z2hLUmE3KzVpQ0JBd3ZLZU5XYkhoUUh5aDBCa0krZ1dFQlFBakd5MTdLTGxNeWhzUGJlZ0dwRElqRUFBQUN3bm1Vdlk1Z2c0NzJVc0o5bmNkTXlIUDRqV2owTWNJTlJPMVpucGpUdWtMUVp5QmtOaUJFdk4yeGM3KzFRa3liVTArSHYvbjZ2MHF1UTRvblhpR240eDhBdU5qTlFBSmlKU1ZIanpTcFY2UXJFcmdUT3JIdjJHWW1mVXBHTlJaSDNJSDJVYlJBQUFBS2dsV0lwQTZpRmxjaHcvVmhGRnpUU0h2QzVhSGduaFdCVkp1S3pIYlZnMmwxMTA5VFl4dFhST01MTmlPQ25mZm1tbWFkL245M2p5VkN1RmRpejVuUHcya3NhYmx5REFDb0hEcmJIU3FBUUZzTlNtL1NQZmwvLzdZTVF2QUl5b3pYV25wRzFCb1J2dWRQU05lR3J2ZThRUkZZV0d0VVVRQUFNQ2FxL0V4SHJScDFIS2pGZXdJUmtBRUVBMmdpaUpLWnlzV25paTBDR0F3Sm01ZUMwbG1rQ1JPV00xSzIvenpvQVJXTDV1ZWZ5UXRQTWlNWEhCSStkZ01qNklMOEd6ZzBFekQ2QUtiMU13ajFHZ1pXQmYvVVpZTlB3dUZ4WXdRRTVPaVpVcWxVQUFBY0ZiR2hvOHY4eXVTRkVWRVFJNkNZSWxDUU1zUVBTWUx0empxckVXaHBucUlkWWZLeDVPZ0lEZS9HT2NDaHlQUXJsOEpFa3EzYWhhZzdxdzZqTGlGYlFaNDN3cUdVVVZjMGlIZzJLdkZ6WTJRSTZudE1XMWhvdHY0eGFSU0tremwwU2pYcUZyUlRCQUFnVUYxRVE0ZW1PWWlDVEN1U2l3V3d1Qnh2LzdZTVJBQUEwUTNYRW5wR3VCb1NWdWNQTU42T3p3M0d2U0lPZnFSWVRXN08vYWRORWMxdVZ4NGNDaEo3YmNZbWlJUWg3OWN0aVlyUW9leXdpUVNFWVhDUHBDQ2FqbXhIWHhya3ZTSDA1Y3lQVC8vOWNwL21jWUk0VG9DeUFPYWl4bnl1cnR0UnJYV3lRQWdQaWtyb3Y1Rm9hU3NseE9rc3VJWjNJV3JsRW1WeW43QVRMQmpIQTd4Q1dyUEsyRFBUZGJvRmd1VkZkdmxxNDRYYmsvTGpuNVpQYUdKeVJxOWdJMjlDek1tMTBRak84d1I0VmZ2Ty9DZi9NelBvUU5BWm1RTnBsbGdCZkZZREswcFdiZk1qUHg1bGtBRWtGd2swTk9GNWdva3NaUDFlY3lkYTFHZnBZaDRzR01FRGtpTW1vNXR5MXBmU04yVjFReStLRkM1ZWM1R0JNTUYvLzdZc1JQZ0EwZElYV0htRzlCbjVGdTlQTUpxZWRRUW40SzlmamdjYkV4bW9lNVhqZmE5TzEvRUVCeDN2OWovOUhjV3crMXdNcWUyZitQdmpOVE4vdTBlbXIvLy9kdEYvc2xUQkpSQlVwTGNGak9aUWtNVFRLcTBDcWxleFNzNm9iVC9SU2tVNE9qWG5PWFkyMFpKYnphcUZYSFZVWHpGTVllU2ZPaWRWM3gxVzg4OTFyUFRyZDNjOWVyZlg5T1JzMCszV2tJT05zYzVkakN2L3BVWkF2K25mTjZsKzJBNzFpMHJpdnRXeGE5MzJ3RVdha0lJQ0EyT0xsQWkyUkRUOEp5ZnA3SVU4WURST0JxVU1FSzNUMFQ1Nlo1Y294VkVicGx3OUQwQWtHY3JoYzJnYUdkTDh2OUt5R2NOSnNsVm1CWXhIZGFUa2VqbTBFcmw1SXA2dUZEYVRVUU9Obi8rMkRFWDRBTmFQVjVwNWtPeVp3ZTdyRHpEZGphVWlBZVpicXVrRXF0Yk1NTGRoTUtYcFdCVlJkNUxreUFVQUM0QjFJUFloQlFJSU5BYW9CUExRKzJIOFd3Q2RiZ2hmY3c1SHg0Sm1uMnVQc1ZwdU9XRWRSM2lQT0xXaUVhc3gvekxwb1dUU0dRaHdnc0xWRUd5QUFzaExoZ3UyaGtJZExDeUtxUTZ6VEQyMHhnZE0yM0JDdzZYaGluK3Fmd0IvQUlwSDZyRW0rM1RlWHR6ZEVqTkRNeEdRTWk1Unp5YUh4bHBEWmttTWN5Y1E5RU1raWlqbUtZVUxDS1BMcXFQM0dxN1cxL1JuUU8xZGYvKzI5S3hTOWQ2NVE1b3orN1ZiQlh6WGNkY3dUTXdNa2YveU52aEFRb3FMNHhyQnFRZ1NLdEJoN1dEanAvTHp4STI5ZEZNTHZlYnNVT1NXNy8rMkRFYmdCT1ZRRjVwaGh2Q1plZXIzajBEZWdvQUVnQk9rNW1hajhJR3VsUW04cUpGTWdObEJHWUFVM21RS2lOMlZQLzBxa3hOUDNkeVNaa2NvR1RYZ25Mei9kK2FaZDVvYTU3ZlNCcytNL2R0blFxamZ0bFA1SExOUXFpMFNiM3N1MWZpMnJRQTQvdG42NzduTVN4SW1vTS9HMXNzMU5FbldpaGFSeWdGQkFQSHFkcjViRG5KckFOWkNrR05PRlN3QmdtZ0R6YXhNZFJlc3FkSk5RU1NaZkkyalVRYU5hMndVSDV5SlNwbG1FSDlVTG02WnMvdSs0S0xaYjl0MStQVjVLc0lpLys4VUJFTVJmOS8vbVJWc1N1WkgrUm1mN2hBS1NjYlVVRHU3VENFNWF3SFhvR2V2SUFBQUI0a3JpVFo4WG96UmVqM0w4akZjeHJhTVVFSitqQ3hLTC8rMkRFZVlBTkxQZDNwNlJyaWEwb3JuRDBqVGlsaEZ6M0lnTWNRQlIyaWt1VnNMU0xod2xmTG1hUmpOSSt6R3lsd3NIdVNwRW9RWk1pWnh5d2hKek40dkl5aFlmbm41RXRjR0ZiRWFJUk1BRktub3NHa2lLRmtod3ZHTUZ5OVVXSmo0Zld3Rk96QUFBTUlWT1pFSTg2SWFhSkpESVNCbHBBN0xFU3FCblhSNEdXUVcrZCtoOVpsUmxqbm9ZRlJJSnlha2F1Y3JaYmYzTWlwNWtsSmZ6YWtwTVNpd1JtTE54REhYRDdaOXlWcVExU2FsK1puQVNHdzRSeUwvNy9JWG13TS9GOTZuRmZXc1ZQMXZLS1NGZEZDblVhSUlBQXVLNjJsN1d6em9keVRQcDdPZjZVam9CV3Fsd1pXeHlZWVR4N24waDAzMy9VZm5WdDM4N00wdWVWdzA4OEFjMy8rMkxFaHdDTnNQbHhoNkJ2UWF5a2JmRDJEWGpwZkx4clR0dGFHZUVTZzVoelo3b2dwbGQ0UTNlclhCT1NYbktRMVVNQXEvOHhPcUlWU3QrL1YrMzcwUXhwZGZTaTBjS2lMVjZBSzNTaUFBQ0FBWUhFNUdVdnZUZWVIY1RWR0psZUlsRno3cFpQNkhySlZkTzNwLy9iWGxnL2dUSHFlSTk2SXBGb0ltVk1YeDNxMVo2T1ZQSllWRUliL0Z5NUVEeEV3YlNETUdqbkNVelBmT0dDWDlqUDl0elRLc2YrZi81bmY5eHYxdmpmeURQdmh3bU9yYzMrZThaM2s1N3VGTUlGV1FBQUFZS0ZYS2toWnhXNVBNd2NHcTlUQjQ1VlNPT2x3V25yOS9IZzNZY1ViWllpNktvdHlLZU56TTF2bTJxRnVDWGsySzNnY2hqRXZWL3UvakczZnY2SUxNK0IvL3RneEpNQURYR0RjWWVNV01IUXBTMjA5ZzE1cnpEMVQ3Vk1UZGV6NmYvMjdVeHhwc1ZtZjdWRWtwRFFTQlU3cnNMTVVseEpBRWVNVGJ6b1RsV095ZmZ2VURYMEFBc3VDYVJRb2RLQThHSTlEVGNrTFBoSXE5OHBrS2hJbjFZclVxU3kzRk1FTjFwOGZQK3k2ZXNzTEgzbmxjN1BkQ0NtdEEwSmlJV1dBSGpqSUdIUElBb1ZHTXBGSEdpVEhFV01PTUNhMS9tQk9rTURobzlUZitPTXBPQ3dETGtHbkhqaHBxNUlnRUVrdU9SdVdvcEp0dHkyd2p3amdEMGlJSmN0UHlIbVhRL05QSExISGhpamRsMnNtOXVRSmRwYU9aYm0zZHY0VkpWeE1qcVA3Sks3K3V2SzdjQ3g1c2JLblFoemxXRDZqNnlWMlpEU3cwenhvSU9vNHRQWjNmL2YvL3RneEpzQURuVDFaU3c4eWNHZGpTMG1uc0FBNzdacjQ1M29mcDV1WDM4Y3FUT3BTOXFYNmI3M1pwLzUrM0U3K3FIVnJIOTNNcW4ycld0ZDVkeG02OStINy9KZlFXTWVhNXJlUGNMdk1kZDFoaDNWYlc3Y3hTZHNTaS9HSnpDV2I3L0xuNngzbnZuNC9yOTVmKys4M2x6dGJlRlNwaExMR0Vzc1owa2ZOd3lGcHkyVmtBa0lob0pJcE53Tk5PQlBoVXJhTUVTcVNDVjh0bG5jKzl6cU8yK3NJZHNYZHpKTUJhSmtYeWg4Snc4bFdETWdINGRjWjRuanRPMUlIdzZKOEJMbVFTL0xrWjUzcUU1M2lpalBYSitsTlFEUU9WT01VV1o1V2JWWWp5SW9xelRvYzRNN2RSOUFZb21JazY3MnJKbW1lK1lzRjlQYUU1dHo2dVhVQnZ6K3dxeHUvL3RneEtXQUdKR1JaN21NQUFzSk1xMTNNUEFCZVBtMlhNYU5DeEdoKzJZVzY0MlhPUFByVkhPL3pBZlBOLzJmUzJwaUxhekRpTEZ1OTFXTEpYWGlaelRIcG40M3UycTFuaTBycDl1K3J3UU9BQ1ZCUUFBaENTakV6UThZQ2RLYTV4S1VzUi9PR0V1blhrSThLeExRMXNSbFIrTm0wZFdKSVl0QTd4YU8wK2xVMEpJbm1BakVFV2twNHhXSHE1VS9kUHAwYm55MWF1WHd3WGkxWmE1Y1JwRUk4UzVjNFZPVDJUZUdIbjJxMDdiVzdxZHI2UzlMTjFZczkvZm4zaXBueDBpNlBPeXRiZjN6a0w4ZmNyaG1abWJ6L3cvUFQxY21aNjBaRWU4Qk1tMnB0MnY2QUdrb1FCbExJMlNwTE5STUsvTWRLbVJTc1VweEtGd3ROZFZTMGIxSldlUG0vL3RneEZvQTBsMWRaM3oyQUFvQ0pXMFE5NWs0UGxqWlZXWGs0bFdsSXgrSWt1aGZTeVZJQlRMODQ1NVJIUk5XeGJUaEtRWTh6V01oSUpTQ1NTcW1iREpLT2R2Tnp1SnNEMWtUL3VQamJqeFZhVVVtN25IaWhaSVZWY2wvMytmL3M4WjlRV1Rla1dOR3VxUGM0VUpyY1drcGxyVlZBR1pNQUFBclp5SXAwQ2lrcllNejNONGJja0g4NUppc2VUM0tLSk5vUmNkQ1A4WG9jSm1pVkJBWWpJNU1sSmVXb1krcmxjVWEzNjAyc3Y1QmpVTlRxRmd1VTBMTEYxaEx6bGppOVlxVmNtU1ZxK3A1R1o2RkJSQ1llbHN0Qm9vUE1FUjV2aXErS2EvZGFLaUlpKzcrK2FmL3VlLytxVDNtb25kSU5nZU8zZ0ZSQkFBN2ttRmNmQUE1U3hrdXpSYTIvL3RpeEVnQXo5MTlhV3d4QzhJckx1MlE4dzhwUk9OeklxVGpOTzBTZVhzNm5sYjFkRGovYkc5bVpVWXpzN2UzbituM05yYmc2WjZiQkVleUFBQkFBTUlTNVZHWXdJQUNEODlaM2NtNTVNSVFWSjl0RmdpRDdaVUYyWkJoQWdRSUlJZkhMelRDazlQMHhISVF6UFY1Rm5yZmIzWGp4SWtvdHozOUNOek9YbjVmYnBFOU43WEJ6K0l6RDBnQUlIcEVKVklnRUNaNW1uZ2NRUTZReVdWVXV6d1RpNFR6VmlDeXN6Z3EyL0JjRzJZdHMrMFhENDMxWmRDZ0xSV0lMNHJOMHc1V1JLaDZYSlRNdUczSkl5NGthT3JVZTQ4TGxWZXJHVEw3d0hsSWV0NlRuYjJWRkxzL1lYaXlsOWF3VkVybVFQeFlYTGJGQnRZLzhrRVlzR0FnNmdNNE1DTm0xZi83WU1RN2dGSVZoWEZuc0hQS0RTTHVFUFlsZUVLY2JMb2x5MHBTUDBpLzlqODFMUGJ2c1ArMGhzWXFlbGJaUlpsUUFTRVV4Q3hHU2dCTlhMTWpDYmlrdWlvbGljYU5PSEJZRkFyYmZTSEx5dzZpV3dSOExTY2hsa3VHUVBsc2tLR1YySEM0ZmlHYUlzWFZmQVhEMEVTSnNtUXFSSmtla0xpeUM4ZGZjaXBFbzdHWlo3V2JIanhmSXBOS0ppTE02MmRTUzBYNXRMN05sV081S3QvWjM5M0tHaXA4YUhxTUcvaTA3VE50U2lLdUxTOXRYWkFrQUFCNDFvUkZDb1puQVREZ2xFSVNoK1VtQ0ZFd1A1ZFdPaW5zWHhlU2JZM00wcTVSZ2VjRGdaQTRhOTRKYTVSdDdpK3duSm5KMU1VRGMwRDg3ME9EOGhhR3YwNFJhSVQxSmVGb3hPWFAxLy83WU1RcGdBMXhNM2VHR0hUQmhRd3Z2UFlZY0Z6ay8veS8rbHZpVmpxUXFackNCaWZ5NUZodXNVRU9TcmVHTmxRd0lBQ1NFcGk2SGNIV2VZV0dJZHJBZ0toUkpIQklzYU9BYVBsbXNObmp2cjdadlpkM001SElRbEVMbGpXTFBCUUNIenhBaVNVV0dLQW9yMHRnWUxqUTJFemEwdUZ1bVFjK1ZlS3JoWStIclR0dmNFcGlkY09FZ3NTZTR1MmxsM05GTWpJU0Nna3JnazUvZzFsR09jOEMyTUM0aklXd0o1U3BoNmFSWVlhaWZXQXhPZXpFN0tHMVZ1TWEySGVWSnNvbGRxVjZWTDVucDd5WU5IMGt5UDkyT01PSG1OVE0vWDNYVjNHLzMvd3VpaVNCc0ljSml5dHUrYm44MDdYdk8zL01RcVorbisvbHNLd0tKQkpBQ2NOd2U1VkVqUC83WU1RN0FBMFUwWHZuaUhBSm1KL3VkUEdLT0pFYzR1YnczMlZ3WDRVQStDMnVFYnFHTlpoWWsrdlJkVXJPUUdLWmpJUWRQWWxXOWJ6TldwNTk1akU2QVZzc0s1UHBDT1MxVVp5eUdEd3hrLzliRFhGdFFRbTFQVUdtREdPRStZUWJMdHdIQkRTbHBaNFFjSFpKeHdpQ0xFaUFVaFk1VEVpbklCZkpSQU01RXBCVTVma0xqbzFZVUdJY0tBaXpzRlVpVlNZVEljTU5ac1ZlejAwR3ZvYnNnOUJZSmxIQ2FNSmpCWlVNTkZyc1ZPcldkU0ljcVRXS3VTeDZ6RUVWY3YraTA4YVFjNzlmYnAvOStvd1FFNElNZFRKbW1OUlh3NjdKRTJ3QVhORjBHMHhqNFQ1NzRTenRRSUZ2T2xqVXlWZW9CVm9MRUplaml1WDdTNzVXRm10TU9ZeXNqLy83WXNSTGdBMEZhWEdIaks4Qmw2MXU5UE1KNFVheGpBMnZtbjdNb01LY014eG5VSUlrYXFFdjlsTDA1TmJhN09aMVVpNS8wUlpFN0dxekhhMXYwNmY4a01sTHhrWlcvYUswZi8xYkIwcHBsUkFBSzVNNGFhcElJbmllUjdvNDZUZGNEZ2VVUC8xak1VZWttOWFvendYMkNQeDg2OUJWMlprT2kvUDZmYkNMdjhSM0RITmxlNFRPQXJpSnhzY0tOOW44aWtQN2ZWMlUxVnQvYWtsbU14N3QvLy81dFRxWkVkQkZoSTdDdzJia000TUZ3WVh1bGhWT1JFdEFBR1RIY005ek5wblBadzJheURRQm9JMks5UityUTNDTmxUSFBPK1FNb0ZvYy9aTW8yc2dpTHZDN1A2ZWFGL3cxQ1FYUldrNHF4UllMSG5adjc1cVVWR0VseVZvcmo3dTFiYTcvKzJERVhRQU5PWk56cDR5MUNaNnk3blR4bG1ubGRVb3M2RWF2UHR2Ly91dExmVXV6dnNkMlBPTUl3d3J1S1dlV09TQUpUd2hvbDJ3WFJqVHlCZ0Y4VHpFcEcxR0tkeFAyNnVqMW5iVEtuaUFOTDRHWVFpakNwdW1RSU1pRG41VTBuWjhYNnpGUUZFV25hZUVkRmsvTktjTThNb08reVdNWjhyVnZaZGJyUkMwREFnTS9kay8vLzZzbXIyZjhwVUlWVEtnbEdPN2hLU3NKSWlTS0FBcW5vQkFHS3JpUkF0SUJDNGg2MlF3Nkx2NDdwMUZaWDBlME5LVlF3SVFJYTdvTUtIMEJtaDlNd2RMU0hzTmo3bTErZXh4Z01IdU9pNVRxUFBPNkZkditsQ282eTI5VU1tVy9heUtxVW9WRGswWjJ2Ly8vL2twLzZGclVWcndhc0JFaEExUWtpZ0QvKzJERWJBQU5KWk41cDR4VENabXlicnp4bG1FVENqRGlLYU1weDBMUXN6dzdWaFRFdFo4b1VvWEJnd3h3b1YwL2Q4TlVuc0dKeVJpM3dpMHkyY1dqdWIyb1pxblhOOWFtSEdLRG5IS0tGaVFSU0M2eS85SkVLSUljNmV4enN4TFA5MnJLMW5WcERsUlFIY2ovL1dyMkRWQUZISWVZZGFTY0FKY3FZS0JoTHN0RVNFbEtjYnFNUFlWc0xJK0pucmhNb1M1MU16dHNwUlE0RGtSUVh1NXF0WUlKeTZRSnZWNnVUWHlVSHFQUXF4bDNGME9abi8vLy9EYXd5eXlMK1k0a0hFTHkwNHA2T2p6UE5xR0FFQ01JU2J2LzlkUFZVdGVBQUJBREVBZ1FBOEc0ZmNZbVlIbHBFV1oxMmdGNE4yRzJ1RjVBZWcxK2t0OW51VmkvcUN0eCsrR1NGZnovKzJERWZBQU16Uzl4NTVoU3daSWw3blQwalpqcEdlMVRmVTdhMi9QeFQ2b0Vwb29Jc2hsbU1jTzNEZzJxSDhTODMvVjN4eG9ieTRISTVVc0pnWlliWUxPQ1FGQnNZdzcvL2xXRkJmOHBhZ1NrQkdaRnRBRUs0SndVdkhaRmZCckdOYnRobjlYVVR4aVdreU0vdW43eER1ZlJJcURkNmtMeE16SC9yL1dkTmluaUtLUEQ1aG9xWm5aQTRPRnhNdzBEb29nMGluZVFtUzZMMXFmMDJzK3F5RlBxN1ozLy8ydVJqdVJaenVKanlEK1lNTVRIcXBJeWMwVmxPdU1BQkxvdGJ1TXNzT3k5STRHSHM3UVE4NHVTWWl6RzZzanhMYWV6NlZnSVk5Tm5kSUl2dk5Kc2V0QXVxclRPN1dmbGtSSDM4a3BXUTNSektDYUFodU1ZUXhRN213UFFvb2ovKzJERWpvQU0zTjlyeDdFTkFad3U3enpFRmVrRENFSnVJVHpSNUpTMmpSVG1Tb1FlMEtxYzEyK0pVcGQ5aVlRUW93SjBQU0FMc1lJekc4akxEbytpRkJEVWVxQmVUUmlZamlUa2dKclNtaXZOVnFkV01neGFtdzFUWW8rQUhsbnpwWm5pMFQzNUVVNlpjcnZXeFd5bjczWU1EUHF0aFJBUkVreWlYLzdUTDVmek9sZmhIUHNmSFFuSzNyUFFsQzFpcnFWcXhBQVJBalFrQUF2WXV3WjhkRW85NGs0U1NuU1FGOW5YYWJaMlI5V0ZhcmFsSW5wUHUyWWNjc0d0R1VialIrT3NRakFlTVJiLyt2dVlyNnBXTnR6MFpJZUtaMXRZdTA1MGlXdlIwdVVSTlI1djkrZmRuYXJzMTg0b3NPQXg4V2ZWMmtPWWNzbTdvY2F4aUpERVVNd0FBQ24vKzJMRW40QU5JTmw1NTdCcndaUWw3cmowamFEV1lmWVpsVWlMV3NGeVVpWVJrNkdKSldnVzhiSERwaVVvUnJWVHpTL1pmRXhZVTJlbzdIZzJEVTRYK1hDWStXbmtEQXdRaDJJOHZ5T1drWDVKSWgwenVTRTRkUDJOR0NndWsyUEJRM3RFUVRZbGQ5QVhjbmxHSCtaSW9VS0E2TXJIRkZsaVZUQUtCVDNsRDVCSm5RMm1NZlF1cU1TaDNwOHNTTk41T25Hem5UQWV4Q1UzSXpGSm1LSXBDTTVFSFJYb2dDUy9wblptWno5RktxczdTMjNWc3pyWGxPam9ZaG5GVmIvLzZvc3hDV1JjaitsbEtaRHdqQXgwQkFpRVFtMzNKRkpJVk5EMkZoOEtLR2FDSWlBQUFRbzRqREJBR0FMcW1GZWJyaWxGQzFtWXJ6amhKc2VReGk0SlNaQ3F0elBSLy90Z3hMRUFEUWtqY2NlZ1Z3R2hHNjY4OUkyZ2IzWllPb3FabEtqK0tHcFJsdjNGRW9vQkVmYXh4MUQyc3hrU1Bwc1JDQkNURGhLYWNEUlVnRC8yR2xqV0F3ZE1WTldQRjFCRURBWVlDU1YvNjFQcVNCVGdCQUFBQUNtRDVHY2NnaW9xV1JUSEN5cUJTb0JMcE55UE5LazlKSzI0S296MXArcE9wbnZEQ1c3VU05Q2tqdHVQLzhQQ2pYK0ZtNFhYQWUyeW1xNjdIcVdOOGltb2xKMG1CRnNiaklhV2RVRFIwdnpoVXk1d2xNb1JkZjVpSGZwd1FSQUFBSmNoNVNrSUkramNYa2liaFB2TThsQzZKYkFoRUhDSUR4UWdZZnpmanlEYjBmWFY3YzRoYm5DYVJ5SHRxVE1IbWRCNURFMnV0MHpEaHhFc3BhR3R1WHJ0UXkzT1hMODM3Tm9MLy90Z3hNQ0FEUjFEZStlTVVRR1psbTQ4OHc0WVlOUGxVVHcxZ2xXRWt2a2JFL2Z4S1d4TEVBQUFBQXJYRkhIdzZGQWs0RFVtMWxKTndIZFdVUURkNkRGVUNMakdnUkJvSUpEVzhEUnBYQVYzS2FldHRXSEJSU0lodzNVTTNSRWNOVWJDRldMT2hPSDROQ005cFptRnFHL29ScVIwbW9NWDlnR3E5a2N0aXVyMUxmTGZwaGhLUnNkMXB1MGdSWnJDdGlTOVlvdC9NZ0k4MmNaT3JmelYwbUJFQWdJQUxlKzBYbHIxRkJpSkR0dXkxT25pN0tsOVQ4cTVSTmZmdmozU2NZUkFlVllDcVp1QW1nSHJ0Qk5FMURFc1FIaGU3bHVWRnVlTWYyK2taZXJCQlZQaGpxMU5LM3JwRWNPWXNYNUlySlU4Ly8rNnQzei82YmVoMnRSem1EbndFVHRCLy90Z3hOQ0FqRWpQYTZlWWNRR0NvZXkxaEpXZzBheENlL0lFancxM0ovWWxCRkRRUkFBQUFML0ZNQ2FWSTRnYXBOaHBtTmdwME1OOVFHa3JWZWhUT3h1Q3NqYllvK29pcDF0dGhBaUVGU1dQS01Bck1MUFhYQmFiR083c1lPcG9MZW1iSEtxSFRydzNiUHQzUDNZejJuUmk5TVFMVFRZeE13WTkzUkJSaUZkenkwS2NJR3lkYmY5OXpSVHArNWdCQ3o4eStGZm9IRWVFNXFCanhhNTRRQXFRejA5YTVZTHBLQUFJQ2wvNDBpNkc0ZmNaeFJKNVExS3FFS3EyUjA2bFZZeXdXdjJ6VGI5eGpQeTZhTlNLRnBxRENHQktrS0N5cGdUa1ppN25lN2l2dU1KVHJJYk9jMGtvS01FK3dKQlFKRkVlejBUb1ptRWdlUGxFTUJwRXBKQ2RaWWkxLy90aXhPY0FEeXpOV093d3o4SEJxMnhwZ3c0b2pGdUQwRXZORlBFNEdRU2NaSWFoNkZTZFIybXVYOXVScHo3U1Rnekx0T2plTCtkaHRJbzNZcTFFU2FjSE9oeFFHQUZwRG1IS1NBVXN1d1hJd240K1VNUjdhK3V6clV5NlZMQTVWbDFIZjVqSzFnem1CdTlwSENtOFZpVzFMZUhFdlp2amJpS05PS0pBQUFCOTVNbzJyWFc2VHJTUi9acDRZcE91cGJobVR4bWdsTXN2VTEyN0tEVVFCMFJLMTdSa0J4aFlmSjZuU3lxcFVWeFBLaXdLWDBOaDQ0UGprNlhPMHB0TzloeWk5NW5sdDI2WlIwMmlMc1ZZZXFkTDd3TUhNT0h0RXBwaVZaSkhLSkVaTFlvd0tBa2tyOUVadUxjeWoycXQ3TDVqelhRQlVySWJTUnBBTDBVb2dsLzVOVGhIcHYvN1lNVHFnQkNOZ1dXbm1IV0xFVE10ZFBTK09BY1VPa01GVk8vRitFbThnQUFTc0Z1QWVHTlhDQnhsYW9FSVZMMU9wOUdKSit5dE82MHZyRGM4ZWxYZVZ0Y0gwUVdIR2podXlzNW0xZ1dRc3FlUHdzai9nWGxOaXBUaThVRzN1WTNKUVhrdlBzS25MSnlFdTB3WmxhNnM5b3JxZDZ1dlZFTkRHY2tpYUtXbm9uclpTdS9hdEhiLys0TW9lYk05Szc5MWRYRUVXR0pCQUFBTFM1ZVNQVnErTlluUi9tSThqaXl3M3hrdVdHaE1zSldGNHNONGhFMHlTWmVVTXdNZFJxQ2c0a2w3L08zS3NDNDRhTEIxS0lad2p4U2hERGtLQmdGSGhHQnlMWEZRaGJsbjk0blBJcTUvYWZvV2Y3bjhqQ0JPSlFvMVRHc2c5Rnl3QmV6amdINUJEM1BaRnYvN1lNUytBSktKVjJtTU1OSEIxS3R0Y1BTS3FIbGhBREFCVGlIeHZZQ1RLa2gwazJORXB4d0h3VDB6aXcyUjUwSVNJZVoxblVsc0N4dUpEUkVUNHZPbzY3YW5pUldFSWZ4VzNmLzZoS28rdk5xRnpwT0d6ZzBTMVBGMEQzR2o2TFcyVTVoNHF3R2RXRGF1SlRrcXNoU3NzejAyYTJaS3RWcFVYTExXbVJ4M1VOc0ZtL3NVa2NDMlFKM0phcE9NUDByK0pldm1ReW92WHlXZnd5WnhwQ0pveFFjcWl5RzlRa25sY0FvQU9ZV2lzcVhrYVVkaVRxdGlpemxQMjBFSTJoUkFMaWNhVFlkSE1vWXhlbVlleDl2YlIzSVVCSzk3L3YvL3lOK3RqK2FqR3g0amVyWHVPNXZFbzM3dk1rbStlZy9rQ28yNnRXcGpva2NsQiswaGF3OHhxRkdUNlAvN1lNU3hBQTRKSlcvSHBHMENUeTd1ZFpla1lXemNLTTZ0dzRCbTBBSzUreGdBZ0FFd2tzVGtZYS84VmFBNmM4TGlXNm1BNmRHWitXMUNENlI2MHFLdTlkRTJZMjR0VVpGWWFBaklPTENBYVVmMC8vcHdveUc3cWpTUTNWRllRZHBCb2NKRG1HSEk2VkREQUpyQ3FESk5WQXhwcWxWbDdpcW4rbTVaYzhBelZjbUZzNFNsMVFEZGFZQUFBQUVvZGRvVXNJazg0OXJaNEdhLzJ1K3pmV0p3MVN3bkZUNWN6R0EwTU9PUE5FSUpVcVNtVHhvRmJkKzBqcVM3VmFzN096MnlsTWpxVkFUVXFva3hxVUN2ZEw5YVBNTU96WTF0YWFiOU9ZVzFWLzg5WHBGUTdETGpWOXYvcnN1TEl1L203SUJzekpJRUlra2FISUd1T3U5L1lhV1pCTFRCMnYvN1lNU25BQXpjMTNHTXBNc0JvWmp1TlpZTStFWHhsRWRUaFB4V2h4cHpOWHJuWDUrOWxtTVdpTXBGbXNDMWlRc3ROZEhaenVpV0twSGJNcDBlNjNWU2xldExvdlF5cFpEZFNsVXovLzlQcUw0d1djclgzcWhqR2RoRmcwUy8vL2kzNC9rRXdud2dySlVFdUVBQ0FTWkR1K0JnTUdIN2JMa29ic0dyRWdKY2pCbWt1UksxUkVQc0pObjhmRkJSUTRUS0VLRVFFckIzTWZkVTVOSEhjaDFKWmIvSTdPWU9sWWlJNkdXcDNJb3cwZml3c1J5T3JLS2tNNVN1YXBWcW5tZk8zLzlYNDREWXU0bXFpeVBpSTRlZ1VQS0hSeHJJTEwvelBEUk1HNjYyVnBOa2xLaXlzYW9qQzNGN1R4ZEM0d0RKY2pMZHgyMURXQ0h1MUlOM0NtL0h2VFZLYXYvN1lzUzNBQTBvODIrc0dFMUpwQ2tzOWFZVStaU2NsMWRqNkFCRG5JZWlXc3FTbjB5TnFkN0N4YmtSdVQrM1JqK3kvN0xQL0pmZDVHdiszZTA4K3o2RUl4eFpKRkdqUm81RUJKV0tPWGJSbzBhRUxtNklDVEViZlVRWk1vU0NBQlVPM1dTeHB5Sk5Pa2EwWGlaVUdVeEdRbTVYSTVWVnBrY1l6QXJ0d2xYU1J4YXB2ZkViTnM1dE8ycTVmMVNlaitQYUFwNFIrbmljVVp4SFFPQkhBQ2dpbkJRSEZyMzNCVkl1WEMyTEpGektKTHdnNU1rZWhiUVo4Wk1pdUViME1kRmw3RjBPRTNIQm5NaHNjRjRzZFgrc1VaNXJ3bFl5S3hPTERVNmpTWmhNY2FyblQ1ZVNLQldPQzZjRU1uVmJwKzhXZmF6Wk15THBTTlVSWnkzUVZ0QWwzVGphUlRMLysyREV4Z0FPV1ZOaFRTU3RrYzR6Y0hUeEp2K2RDdFNSYlZwdWV6azVFWktCUUpCTkw1a0gwYnhsNlVhTFRCaEhpK1dXS1lDV3lxZ2lBVzRWcGRZaE14Vm5rU0prUHVMZE1vUThhNE5WUE13S2hxdmg5SWtER09rdEVtUDVpVHBPOXYrbnhPSmo5aGNWMmNudjNwOTlmYXVyYnd6V1ZhZGtKUXk5Zll2YmtzeFJFaWlCalNOVXVhTDg4a3lRTm95Y1lOU2cxaFBOR2l0T1dEV2hFNno3M2k1TDUzMmxoRkNnaGNJcENLclZBMVpvUkdJU0FBQ3BRUlNVdGFnUm1idnRBeUNKZVpGTVdSM2dQRlpMUGlqOHNZYUg2RjdGd0xDVU1CeUkrbHNabHhqSW0yR3NuTXBJZHVmeE4yc3ZWOWY2ZFNOU0pxSm9kYW0zblVEbkhXa2RRMjB3NThyLysyREV5b0FZcWFPRnA1bjZzZVFqcmZHWG1EaXkxMEd6SldoUTNPK2lWTzFoWmd2TU1FSWExQVp6TEl6RVFBSUJqd0ZURWxaNjBGdDRzeE5hQUhITVNvTVdyblNsWXN4R25uSGRXdThzOXY4VFU5VmlGWDI4cVRpdGs3MHFlVEdvYVRPSWpmc2JsdytHcUxKUEk1K3Ava00vLzA4TmU0enJGLy8rMEcxV3pZZGZ2NzkvLytmQkhJSHFUTnREYk9ISE9Jb0JWcFZtWkFBQVJVbE1Rb20xeW5ubUl2TEJMZ09wRTRCa2RhSnlZT29XWE5xbDJsMFdkbm9KSkV0aC9ZTjRtMXk1aHhyZm4vZWhEb2xYb1FMeTBVTE82bVJMeDZtelp4RG1qbDMvL3ZuM3lwVjNlL2VNbk9FV2wwZ0hlRXlCYXBYVVYzRVZMVXNRR1M2Mm9GRmdMV2JOQUFELysyREVvd0FOUEw5ejdERUZRYWNQcnIyR0hUa0FKdzJuZ2h4dVM1N25KZ2R2Wit2QUQ1d2RENHBHQVRhbUlwK0VTdHhJZWs2WWp4d21vbzExdFRQaTRSSlQwOFJxSGlvNkM2eXFWakZuWWhVWXh5R0V6STdNclZLOTBZLy8yWE5tMzcwZm9zelhZOTJHajNXbUJvZXJaTGpQTkYxQnNUV09na2ZxQWVrdXBBQUEyZGlPR3ltdTlhc1VMZ0o3YlV2Z1Y1NzBZQW9nSWc2OU0vM2RCcVlGY29lNEVjYStBOHlrRWRZSGt4Vjd6Myt4LzdKb3B2NUZkSHJLWkZoaU5YaU9KY2had1BBd1VVZkdnTXo1b2RXQVdWS3h5RURtQkVTcmVrSHlxRlZzS084aFM4SUR2UUJLOFJMeVlBQUl0ekFTN0FZWEZaY0Q4RGdWc2lVUVV6dzRpeUpFZ3JELysyTEVzUUFOalNWMTdDUnB3YStscmpXRWxhZ0NnMFJZa3FnbDJjWGlEUnJERHdwNExYL3FPa2RCWGxGbHN4VUpkRGtRaWRXc3Nqb2xpb2lrUlA4eFQzL2JXbjluUHRQVS91dDNMWDNKenRNUnE5NkdWVUdIRGlQQ0lmb0VPV1ZWTXdBQld4Smovb2Y5bExlT3NwUTMwTnhEc0hUOEQwKzVZY3d1bERJcGpnWmpzMFhHRHh6a29vWkNzY0xmK3BYUGM1cnF0V2RFYWExdnBaaUJBZ0VPWWFmcERCWURKa09UVDFXZnQzMTdUN1h1dEQ3OXgvRDNFTzZhQlBDNFBnK3RTeVJWKzdZSUhFTVFBTklodTVFUi9mYklBQ0E0MGVrVW9xMkc5ZEpvcm55Mld2dEFsSGxUeHVac2JnUy9xSlJJTWlVTEpHMUt3L0JuRDdKL25VTFBVdE5HTEo3OC8vdGd4TDBBRFV5eGI0d2tiY0dZcjY4ODloUndVRTBNMWNVNGNOTXVZZ1V4MEdOcEJSVUtvYVNxTUxVQTY5Yk5VaXhwSUVVTnNMaTVoc2JkeHh1VEZRRVpoWFpnQUFBWEltUmNSOFNFVVFCelFoNkpwZUxxa2ZGSnl2MHVBeHF0eDA0NUFWd3NYVVNqY1VqUmVDcXovb1NPVkRLUHFxbnJXaGpuRWpwWm8wYXBCWFJzWEFxanpNVnBoNkp2eGR5QUt4d3FFUTJMRXlOOFdMTG02djdoWTU2Q3dvZlF6TktFVjF1cEJCVUtGemlwSlM2RUhTQiszY2s4aGxFRDNKYlJQSkdxZXRBOHRYRzdDRWk0eXBVWmlLNVUyU2xUbkViZi9YYzR1aWZFTWlWME9LNmtSb3BoRGs3Q3FFcXRXamFqOTh2SnBtWER5Ny8zdi85bDZVYnBlUzMrQmkxai8vdGd4TXlBRGtFVGRjd2N6OEdJRys3eGdvNGdHTGNkOVZTVmpSOEpaOUpnQUFBQW1EWUxmcS9tRmdIVmNWM0lyRUhYaGlCcjh1ZVFIdVF4R2VjbTY2Z3BOOUhUekF0YVpjbFd5V2JsTnBZS2F3ek16TXkzWDJwVDlyTllicUpsRVdZbEVXclRGSU5SMlpIS21kS0t3MXpGVDhUbUJYRWpVZEdZdVU1enVqcDJTem83bzZXbzdtUmowUjlFK281NU42OHd1U2VOL1h6VmdHeDFFQUltTThyZVVDMkxqOHFHUytBb1hCWmJMNWtKUm1jMFpMREdjNkxJQ0FSNUZLQ0JaeGxUZGJsbjRtWG1TVlR2bWRuSlo4Z1lBUjZqMDJGblVWaHMvZlR1alJGcVdOd3I5YjJYYVQzUFowclNOLy91cjNibWMzN0Y3dnRFSlZvRWJBejdtQXV2OTB2cy8vdGd4TnFBak9qcGRjd3dvY0dXcUc2MWc0NGc4SzhkLytlUEFCbzFRU0FBUUFJRml0ODFmQjRsdnFDSXV3ZTNkUHA0M1ZzeUM5RDFXeFNRSFZtSjJVTTd2Wnk2MHpBMFVQNGN2VE1EcG5oVXdzcjFQQi9sVm9wd1ZYWjgyWi9zRXBjdnM1ZTlodHRXekxhekF3WW0xM01nWi8rYzBES1JXdVZ6SGM2dThmKzltQkJZQW5rU3VKTWEzZmw2c2R6Lzk1TjcrTUNGWVFBQXdBRThRR3Vvb3c5NkpYWVN6cGN1RDdRSnFRMHRGTE1hZWF0eGF4TG4rK2xpM3RlQmxrSnoxYWpXeGpZYWdiWjdiTGtXSnRmMjJZQ2l2VmNjZmFTSkNSdHd6MzR3VGpycHBQcFZEMWZrWVZKTTlpamY4cXBNTUVqRGFzVkZVaTZIcWVqdFhOdWljdE1hOUZtOS8vdGd4T3dBajRWamJheXdyY25IbW0xdGxobDVHc3JNMXpFS0ZMeWpEVktWMGdBb0NBQUFKeWk2bHlWenRPd3hZSGg5SHcvS0NFalREKzJxeHg1UnBWY3lGeHBoS1lpb2RBcWhLa3NlTVY2c2xVZExtNS9ta2NXcG5LTGxJUTRZYlUzZHpVTkk0UnhCRGlWSFF4T3NyWHJScytPVC85b0pOTmlwcXRHUHhqMUV0elYwdGFiOFZITWMxZnYyMXI2WHlKWFp6amRieWV2LzFuWmdnMEVFQUFqNU9RbW85VEM1bk9ibGl5UjBaTlN2Zko1WUlBVmtlU1RZY0xNcnBwRU05RlVYTzFQZGxiZHd5QlM5OS8rdXYveEREY3RhR2JsK2E3RnI2QkJEb3NwZCtGa1pCMzZXbmFMS28rcGwybkczUktqU2tVeXNmdlZpdFRwNUVaR1ZrUjRxQ1JTRC8vdGl4TzBBRHkwUGE4eWtWUW4ySyt6eGxKNm85bFVaQnd3TThac0JSTmtnSG95dm9laGpEdUlIb0x1Z2ZEd0RjVW1ENFVVRDlCTGR6NjdaeExJVllUS1NIZ3F4eDNMQ09rSllWS3ZyNmpUcHU2bUsrNDh1WFBkM2Q2anFGV0xSS3FaN21Jai9SNlNvU0svUmpMTXF0NCtLU29hWHRJbVBlNEVNNHVlOGZEejJteURoNzgvcEtzRFY5d2RBQnZpSGVzQUlxVXlFa1FBNlVtdUpxeVIzNFVzRTFzdGpVUHc4aXgxdHRNUHlwbExabE1PSFdFcnhSNThjTWhXWjJld3BNOVZGTE02MklhekdVUG5WYTJwS2ZqbzZHbHBaZEd1MjFuLzlHYm1vcDRPME1vbVlSY1UxY25uL0pvc21oNXVNc3VqaFdqeFl0dytvVStSMmVOR1FJbzkwNXd2b2NmLzdZTVRxQUk4dFcyTnRNUVhKeHExc3NaU05zWGdBc3l2SExyY3p1cFVBUklKQUpLZ0I4aWk4SFBEUWNjbUtGbVhCUnpBR2pFRVFUQjRKdHhFMmttODZ5Qi9SR3RESm1xdG9GZzV1SmVKNW05VDJ1L3FwcXVZY2E2TzlSVVZOeXFTVlJGZi8vNzN2MUZjL2lQVFhLUlVXekxJK2tnYzUxVEhNVWtwSWgzVU01Sy9YR09lVTltWkt4OUo4ZGN4clN1MUlQd3FrekFLTHNTTEFIZUR4azBwOXFEeUNBakR4S0x3UU1BR0ZzbUYwOU5zRUxOakRTVWhsWFpFMjJiNnpic1hrUnZac3pNcy8xZWZjNy90djF2Y0ZWS0hqMzBKWHRTMGU1MzN2aVBrbmZ0aCs4b3JWNmk5eHFmMHZHcmNReEZQWit2SDZmeEtZSzUycGpNU2VkZWYvZDVxcjF2LzdZTVRzZ0E2Tk9XU01zUWNKK0NyczhaWWc0V3Q5UFhKSHErNTIwcDAyMWdEQ28wVVNnQUd4OVZpMjFoNEVhKzlyMFF1eTdrWGRWeXFWL3B1anYwOGo3ZXhtaUE3QW81aERqTXpGT0NFdVVheW5UMkFHZHAzdDBScUpja3YrM1hTdEM3QzZJVDM3UjlhWGhuM3VVenlnVEtMTGhuNTBlWDFqdGZJTnFDYk9uanpPaDZMNm90ZUp4UVRsYkh4VkFLaVdLZHRhKzdmWmsybmdNN1lrd0FKeG93c1NKY1dKRlZFNG9KQzQxRTBvb0s4anBFZlF2SFNRcE9nbzFHamxQMnNmU1d6V2wwMGlxZkE4ZzVtYW52L2ppdnYvbFlwRWFCcW9GREE2U3B2dlNvdnZncXJpVHhFTkZoREl1R2FaWlBxb2llWkZWcFdYbXFhcGF6bERHQm5PUnZlVkd2LzdZTVRyQUE3WmlXbU1QUUVKN1MydExZWVlvY2N6YzBLTGZVb0FFVW9wSUFiRTZ0aGVlZFJTaHg0NlMyeVYxTGNEWmFOQk1tRm9ybVkwYVdiaVQ3czI1K2FzN1NqTEs5N05PVHBwWnZoVUtoc0NpZ2tRU3Y0NjRjWnBJSmM4UnF5dWI5UER3UlJ1b2hPaTN4RUlUNHNhRW9VbWdrZ2RoNUdVbFVVZlRrZjVnUlg5V1M4ZGdWQzB5THpUUitrMVV3MmJGS3k0VWxHVlZSSWtiYjk0NlcyU0czT29xc2FJMDEyQ0RpOHNlSlM5TVZySHpqZXQvMHJ1SGk5TCt0OGVTdHF6N0Z6U2J3MHNCalRZMFM3WFZrQXVqZXVRYVU5YXBzM2xHSzhmaEJVRWdMV0trSW5lS0syT0p5b2s2bFZkZ3hsRGlRSVdiY1kybi9UNjJwOUwxMU9ya0ZWV0V2LzdZc1RxQUE4MU8ydU1DTk5Kd3lhdEpZWWc0S2VoZ2dJTERVQnNuQjJvUW96L0YzNCtOVGhJanYvWGo3bmR1eE9yTmI3cm12enF5VzRhL0RuWitpVFBvZ0phUm1aM1dmTUFCVVIxNFBHQ1RVcmtVWTZxTjFvVEJrUFU0SlJKQWVNcXZBRWdsRXhISUp6RGhSUUJxaGs0T29GcHBiL3VWS1pyMy9tS0pTcWt5bkZuc0djaXd3TkhoRXdpdXA0a0M1WTg4SmdIL2l5eHd5c2FjY1EzTkJrcEFyRFFzZkZCM2FFZEczdEpaQUFWQWdVNHBjaEFKME9MQzhSV2tBaXNHckJqd2tHRkR4MGtCWGxXSU9nVEV4dVg0b1g3eG9YTEx3N0E3cGN6TTdRa3draERJdmFSa1YzbzBqTWpLZTdqQThSRk1Kek8xTHVtYlZ6RFZ6M094Sm5OVzNXL3RVei8rMkRFN1FBVmZYMWxiS1h0eWFlYXIzejBqV0ZSQXM2cGpKUDJiNzlLZUl2dlB2T3ZGUUJJaVlTTkFCQXhzSlhKaXlxUU5hZEZ0SXhrOFVadVNldEc3OE1TdXBKV09KZjlINUJJZFJlZnJSM3ZrRmtIcmUwVzUzMFNRdFJaUU9iTmJpVjJjVFd1N1BPVDQwTGo3Q0F4QStCTTRmVVJHNjByTFMxZGNwUnJHeno2bjgzMTJPdU5MWElzYXlLWG5leTFITjJiZGswcjgycjI5a3piYzM2L1BmU2FiUFRNMWxXaXpsSVRIS3EwcS8vMzN2WUdzTkxxMEpiSWdWTWIxanRtSTJ5bkVmWjliYlR1S2RpT0NDbG80Y2RhK2xGMnk2Z0tMbXJVVStxZVp3ejh1ck0rdk1JTHU1VFE0MTlEV3N2bjFtTkxpVklHcldQMFZtUnBkajBJZ1VxbWRGMy8rMkRFMmdBTXpNTjU1NlJzUWJvbDdyVDJGVGxLQklrRXlOaXpKNHFlYkZMTktGb0FOUUJFb0NGTHY2ZzlLMG5YSHZzU2ZLVVM2WHZObTBQYmFXaFU0SWdpTjFERU96QVFIWUd2cHpHUTM3c0ZULy9ybktkaVYrYzB5MjFRbTdhZkc4VjNydW5pc2E3TG9qbGViRnNTaDZ2OGJVRFRmTUk4bnM5WlA3blZyWFB0ZUNmdlJtQmxuZnlHRHIvOXAyczcrVlpYM2wrWDUvS3JUODI3cldBb25LZ0lxeGpKbWhhSUFEZ1FwOE0xa1VDOXdWRHVKRHhYZTRJQU9DSUVpQWIwTWJVUnl6QXpYNExjV1lVTFZkNzlYbXRiTzNVL2lDNUlUUDkvNE1RQUpkbnBLT0lBOFFHakIxeWJnK1lYNXNXSUFFWEhOMENjNkJralJRSHdWUTFkenFZdXZjbi8rMkRFNTRBUnZXTnRqQm1SaVg4WkwvenpEZGhkQXlNQWdBQkMxclRSb3Q5aHdSaTcrWEhQdXowRTRSQkpOcjB1Z1dibDA5bmNtWVA3VzVIT1RNOFd6WERNYlROZXRzcXlucDROdjIzVmN3NE1YeG9VMWNzQ1RNcFFNVG1YWjB4dkVQYTRLT2l1anZJVXJTVXFwQ3p6ZUc0VVlqeEJVUTRxa2ZSaTh1U3BxbmpsUXAwcDBLeE9qNGwyOURqL2U0ZXN5bldvN2MrZHZwWXFyVXliUnEydnhjTlVycWR6L0ljTFZrNFcyYmVKMkxlM0lGa05Mclhnc21RU05UbUlWRHArbngwWmNRaS9tVzJDSThra2hTQUFDaUVseGlGSzNhaTQ1Y0h1aS9icUthQVlUaTdpZDJOWVZXK1dtNzYwSEdBZk5Da2VSc29vcWx1cGo3YitvOGxKNWhFZUJkei8rMkxFNklBUHRVRnBiQm1QZ1pBWGJuejJESGhVNFVaRUdxUUVJMFdENmhDSUpFVU1pcEFiTUxCckpRWU9iYjRKTEczNnZLY0RJNmxCaHA5WEsrZGx5eTR4NldEMlVQTkpBTVdGYVlBSUtSVXFBalJ0U0ZSQklRQW5TTTFSTUFWaHRVZjBZcUpCVkdaMlJTNmRMQ3ltWmRmMDFwbmpGRU1ncnVKb0VSS2Y2djVuOHVoMitVYmpBNlNqMkhPczRUazNEa1EyTWVSTk1sa3hla0x2RjU0RUdDakZxVDFIaGxrdE5adzRsMlZBS3dEcXl6a01BREZRVlpuVzBYVzlXNmhZMUZ6M0JQRjJKakUvS0o2aXQ1OFNDKys5b3E1OFpNaFMyaWYvdDIyTDhJTnY1OXVobjdaM2MzVWxGeHA5dXZVaUpqaExoYmdScjByUnlSaGJKdmU0KzlINzZ6TGUvL3RneFBBQUZtVi9ZeXk4MWNuZ0lpMzFoS0Z3cUxTeGdQRUFlQ0w2YkpSbzVvKzhYL0xrSzJmVEJFZEViUkFBT0RqYlNXMUdpOVBBNVVyQ1FoZk9DSy9QMXhhRWhNWGpKTTVSV0lPN09IVEhJMzRtSXEwdGlYSy8xUWNmWHd3b3pZZkdrWHF0TVFVb1JDR0I0ZzBZTUdDVUZBbkVPbUU2bENvalFwVmt3S3JucEF3azJxRzdEdHBQaVJ6cEQ3UjFiNlg2WE0yczlkcEt6eE44ZmZ3cmlLSFRwb0JvRWJSRTc5SVFid1R4RUFBd2xrQVE2UVpNUjZiaU1UeGVUME9CRFJ3ZFpOR3JnZVl6enBGMmpsaFp5MTVvaTVvY01CMUtyL3JRYWhmeFZtUHlNT1Vpb0hRd3dZdzQ2ZTJWeFFQQ0JVU2hxaFFhV3AzRjRzbmN3bDIyVzBzMTdFd2IvL3RneE5JQUM4Qy9lZWV3WThHcm5pM3hoaGtnRFlGMGF5b1lmTS9GMzIvWFZQMzY5cm1pdWZzcURGL0RsUVlBQUNnWTdXRWxUeWxDNERrRTZGSVE1T0V5eWVMSWNqSksyU05NTHFvNjlMYnVYMHduSlorcE9rNjZ3NmV5Vy96N3lQWkZVUHlFNHh1S2l6algzMHJXVjRjTWpNaGxDNlFOTUlrTC91ZGpmbWNJUzROQnAxOHlmNFJVdnlMdFhod2FCdGJLVEZiVFFxaUZGMUNRUXpFYXFRZ0FQREFESVJTS0RSSVdKRXJCZWx2UFpYTVpSR1FzTzNUUGhuYm9iWkQvUjJQZ0l4Y1kyZWRwN3VxMXUzZzBIUE9NYTg3N1ZaSjJKSHZxZXFaaHpCQWd5WDFNRXl6SWdJVW1nR052NUdadExaN1R2NDV1NTczS01lZi82Sm43d3Q4RTBscGkvL3RneE9XQUQvMWZjWWVaRHdIQUlDNHc5S0ZSMGM1RUd0WjlRZ09MSEJHY2llb01WdEJFZ0FBUWhITWdVTE9HZEZDblRhMUQ4a2o4WGZxQUpSazgwdG1ZUG11NTUyZFgyLzd0a2dzYjZiVG4vVFByeStPRCs2Nk1QQ1drVXpNekRhYXRyRDVPdm55ei9OTUZybUIvSThEQnNOb1RZUlFQRktCTUFPRlB4SGhmRUF6T2lzY24xa1g1OGpKRzUyVUpoR0N4QllqQjRKUTZZb1cvNUV4d1hFRzB2SU9lcHVTME1IZGZmdS9IWHNza0lsVkZKZElJMXVxenZVbVFUSUtBc3hXRkpZQ0JJUEFmSmxPeThUcFpOcnZTRm9SRWUzU3IwNzNqREFINHR4YU1seU1CcmZvT1YzNHYyMlBqY1hEUWVLT3IzMTVXNWx0eDNWSldvMVRNN2lSUzVCT3IvL3RneE9XQVRoVTVjYWVrYjhIZXArNDQ4dzU0MGFESzZqaW81S1pGUHkzZmxWMjQxT2s0cDFmNjFSdFFsaFJRTXlFQWlWNzdYVU5IRWYwVVZWRmJLekVMQURoVWNmUk9YOFpDMGZoU1VSeFRHQUVWZzdDS29Yd25MMkZTRlp1cG8vTG1hTG5tS1NwN24yYkpGckRvT3l5VmhXUFQ1dnA3aGErTkd6K2EwbUdFNlNOR1daWTkrU0wxOTU5eHdpUXlSQktLYTQ0YUNROFlkTTZxMnFhZTZkSXdSWEM4MXNkY2twU1NPV1NrZ0FGSVlRNE5FcncyNThxZmZOd2xKQ054OUhpNXNjdm42S2tWYTkvdE8xcUVrRm4wTHVsUE1hNnhFUzAvakdQRS8rSVprNzVGbTVvaWZJNElFSU5GQXhZNVl1Q3hkU1YyMjB1YUJHK3B3YnBSaVFReDNxaTcvL3RpeE9rQUU1bUphNHd4RThteG9LNHM5Q1l3VkNoY1dWYVV3c0gybjNRcXNZSUZCRk9ZYU1nQUFBM2xrWDlEMHViWW41ZlZoUHdqMEwyZUtGM1JucENTdjNTYk81VzlLbjdEZG9hN2VDK2RPL05KN0w5MzlTWjdmbGhSV3krMkxxelk4TzNheHBFcGVINEhGYkNmckZvQnJETFNrR3JEcCtXanhzeGM0bEYya1pQbXZJanVaUEVBTUZZdzBXS3dxS0FaZ29YL28wSFkzSXA3dXFDbmtjeUVGTmJpckYzbVpCWXNvN2RsVXRkdFAyM1VBQW1JUXBDMVU0dkNCczhIUTBLSnkwYUhva0YvRDNEVkpiQjN0ZGh4M0N5cUdSSnFidVRpN01yRlpFaERrZkNtcFQ0cFBleXVGQVUvR3hBNHN3UXJOWFgrUDZSTTZjT0VzTkpKbVdjcC8vd3M0Zi83WU1UY2dBMXhCWEdNTVFPQnJDRXVOWVlOT05Mdm1aMzMrRjVaZFdkOHIzbEdzWWVXQmRsUlNRZ0FFR3JTQnJxVmNGd1RoaW5nWVNlaklTL2Z1Q2l0VnljK1RCTVV4RHBFSUMxS0dDa0xKbm1VVHVMSkxJZkI3RmZVM2tuMGU3RENuRjFWb2U2RzBWakRVRDlSd2NqMlFlTUI0UkJQbWl3K2lCR1BMaERZT3NtbmhEZUxyMCtaK2UzNnRydVhuU291SzUvUXRudnJkcFl3UUcvUzdnR3JKS282SGFBQWowTGhEVDBEV0w2Z0NjUmttNG5NbExuZ2ZyNlpUUHpzVWJvQndzVXhLUEtTeUlrU1RzUWs1TEhXZU9YMlhOdWsxTmFka0RrRHJkTW15TEhRUUdSa2xwcTNNYlN6TnVaQW5aenkwbWZ4OVpPMURpUVB4eHgxU1hqUjVzTERULy83WU1UcEFCRkpZV3VIc0xQQm9xNXU5UFlNZU9qRTQ0SXRWYm4zMVJZMFdFSWlIUUFBQlBsRUptSis4UHc0RnlYbzRGQ2lrZW9xdlVJME5nSVVteGxmVlBBZTNDSFhkczBROFYvTWZ5NDIrWWhuUGhwbVNuQ3BzbmExYTdWenlzSFJoSEFWY0pSMFV6RlV1SW9pdFFTV1Y2SDdEN2k2S0QzYU14SW5zUTc0dVlzMzk0YTlOYVQvekRWbjI4bS9aTkt6dngva1plYy9sVWZiOHZWSHY3M29vOHV5SWFxNDBBQ0dTemtOUFVscExqK01jMGprVUQ5TFFNUWxDeVdjM1BiMlQzZFRqUFAybFkwWFJjNVB4MElZejAxUFhkb3JiK2ZLcmVidnh5N2IyYWEzZVJFaFRkUzBXcTRlbXNJTkRTSEtiVTViNWRxOGhsRDg4clRCZjIzdk9VL3AwLy83WU1UbmdBOGxXMjJIalJGSnVCL3VPUEdhS0o1NEovQkdyY1ZuL2FNR1d2SVZzQUFBZGRVQ3JUVU41SkVyUmlsMHB6K09BMDJacFpiTWtTTkViV0JqMlRqdTc3VW44dlNlbU9iN3YzL1pwMTczcy9IU3ZSVXBqbi9aaGI2M2o2RlZWWWtQQ0lhbkZiRm92R1RSR0dnelA2YkxxZUpsSHI3bHkyMjdDb2dvMTk5aFRFMHo5TlBhTk9oSDRwcmtMSjhBM0lDSmNEeVpBSlFnclBac2d0NXRLU01BQUZEODBYaHdSS0ZwYlNNWWxTZ2taQmJrTVVha1E0eEZtSkJ4RjNpMHJWMnhXeUxoVVAwNFBRZnRqMnpGUXhEUC8yL2FIZU1WTDEzNWQycWJRMExQT0NIT3BjcG5wbXVpVm91NUxKcGVzN3ArbXMvV1prRVp5T3kxTys2STFWWDgxLy83WXNUcmdCQlZOVzNIb1krSnVhdHV2UE1PT1dZd2tTaVVYUzFyNncrSFM0TnZsVHgrdnBWcFUzRVptTUFBR0NCcEFzYWFQMEFrUWtDYVBxT2RyTWpUZ1pFWGlPaHo0M25FaEFzV0hVZG1sblI1Sm05VVgyTkhybmxtN3VzTzFqNVBIVCtudE9LOWVlN3JkVmUwM2Z0bTFXRzlpVHhRMG1rUktQdXlwVmNHQXpTalpnSjFSNkdRNjJNZmNTbXhyTzJhYTI2cTEyMm0xZjZWTnVjcEpUSEJuY0hRZ0VScEsvVFVvUVV3RVFRQUFIQ2FYSHBlS1F2dHlnQ0I0b3dQR2c4R3RhRTB4RHBZQ0k0YTVocm45MndRa2VjVVUvdDRmMjc1Q0NHN0pGYnV6Njk1S3J4R1J2amZ1RnBVZHJlQ3pTUTNYT0pXNW9VZTRxREs0RnNLVE1ydUtpVlVMMmovKzJERTY0QVAyVGxyaDdCendlY25MalR6Q3VoZ3B2VThvWmNTRkVNZ1k0UEtwWCtNTWlLSUJBQUMyYThBUjVUQnNMVDhuU0V0cDVNakRGVldXdERtc0tza3FzUmNrc20yb0xBY2duTko0UTd3dFBMalU4eWlqQWtPek80NW11YWM1REN3aWhFQjU5NmdMSGRqQ1hkS3JneEJydVJJVlpVNXRXdlpWNUtmcC9WYmxlK2hPdWFqTG9oYUwwVkFRWVdjbjFkQmhJUUFBQ1BDRVMwZWcvbWh0UmlIQmlLeHF0REtSeExaVWNvdFNRVHJDWG1VZUtlVXJnNE4wSWVYanAyeUJVOGs0MURqZmpYeDNiTE92eSs3VmV5K3AyRittSVRyRWI0TjMxRjVQSGh6UVRBcm43NW1tSjUyVHk0Y293UUFZTkJCamt6d2NMUEN6aUh2a3hBUkZSQlljQVQvKzJERTV3QVFQV3R6cDdCUndiQ1pMblQyR09EU0RhRHJSSnltelpDQmFiR1Q0SUlQL2Q0OU5MLzYvL3V2Y3hHWG4zTDVsZndpcDdsU096N0QxWHZSMGdnQ2dEaDFobEthNHNMZ2VFNitUVkZ1c0h6ZGlSbGtGRXRkSlI0YTZKQWh6MU52R1R0dzlJb0YvY2s0dCswMCtkQ256NDNiTFcxT3ozSkZiZEZDelNMM1J3dkV5QytFenBhTTZjSkxnV1djWmUxYzh6SkVkQjAxc0NPT0M0cUJtTldMSEVIeEtYbjdlaEFLd0FlYXV4aUtRc1prVkxmb3dVZ3h1VHc5MlNJelIyMHhLU2ZWZDRpWmVUUGk4YWJvK0QyUCtiL2NJM3U0bXBGUGM3UTBOZVBtMDhKeTlUTTIrc1V6N3ZnaGVRc1FTS0NISkRPRkVWZXVwRWVTK3k2T3ZiL3lxckwvKzJERTZBQ04xWE54aDVoUlFtYXU3V3oyR2prRlVIOU9YWG1aUDFOUkFZbS8rMGZsanlVc2x3QUFIbFFwbnltS1NZS3lLZXBkVnl3b3lVOTJoT2xNb0RTWldTUXJYY1ljQTJKQUZNNFBwV3pEbzVWWTIvVHl4ZzRUS3luVGMxdFpKVmlpek1WVnlWUVFnVE9kZUNka1lXaW1pVUVTenJUZEZ6Mnl4Q3NYZFZOcnFUNmRQYU43Ris3MWtVRDc4aFpzTUxRWjFUNE8vM3pYdjNidjMxTHJCaUFuamMzVmVYWlV0QmZrcklxdHNpUmZKbVp4RTFpeWRJc05zOW5ZM0N3WkxDVm5kbll2V2Y2eno3VFU2WDhxbTRnTzIwblNKcDV5STRza2pGYlJrMmVFZmJZQ2c1T1JPb0VUNUV3dXpwRWdZTWFvcGtxUjVWUWpCMDRYSitxUmhjUHNOWUQvKzJERTI0QU5NTmQ1aGJ6QndiNG1MdkR6Q3VGL25DcWVTT2o2UDV4bi91eVJXaDZMLy90S2FxanRVdFNBQUNRN0ZNRFR3SkJSR0pSWkVBdFdKWlBVSHBLRzl6cGpHN1JleldsbkhYMmd4aVg2bERJb1VNUnJiQ1daZHpOMFNXcTNhNVlxQlBRMGE0Z2gxWW9XeG8wRk1pQmFBNmJBOFJVZ2VpYnZGcWYyYWl0TGRTWFNWRVJYekhldU1nWXlVSGlBSHp3UWVSRWdQSFZpL2V4eWxLNkZZdG1NbHl3Z0FBSWhMS05wdkFXNFpERnNHelRJckd5ZnRGeFFpWVlpWFRaVjgxVnd3QWtZRVJSN290bHNsRHcrVDl6aE84LysrZE1aY1BGSktyaytrM2VkUGtoNVlhODRrdUZ6OGlqNHdNc3dML0p4Nm01REpiazY4WGI1N3hyMi81dEFEdS8vKzJMRTV3QU83TzFzaDVreENlUWlyYUR6SmpFeWVHMnYvL3QzMDhjKzFWUEJDQ3RMdjlVNzVhRTVDUTBTZ0FGdU00WTg1dWh6azJMRVBVRlllY0ZoVjZzYzBTdEo0bDV4dCtRTk1xVFliZERTTWlDSXJQcytDVUl0Vk9LUkhyRGx3aEwzVTRxUml6am0xNExJdFd4VnRseVdROHlMU1lHSTZSUU9MRUpDV1lQQW9wRHgxVU1XVlVwbFNWcEIwdmFYZk1YYXREUkVLc1RxWlhpdkRCbnF0VGZaOGZXU0gzMjFQOXY1N0JQaTF1cnF5b0xFSmdOc3RHUnBvcE4xaXRBbXRuYlhMVUh5aC9YY3dYeEs1MXJVbWxOSkhvSWxOcTludTZvRmpPZFRWck1ycmYvSWRRVU1FVHVXTHFtV0o2ZU9XN2pld2FGMG8ybktEd3VCVlJnaUdsMGM5MzJ5Ly90Z3hPY0FEd1VkY2FZTkZvSGlIdTQwOWlSSkxKN1ZNbUkwQ0o1Ulc1TkQvTDRSa2hHK1paVzgvZnltU3doWlczT1A0UGtmejdPNHBFWTFJQU1SQUFZL2hJUnBkSUVtT0lXSWhyS1pEV2I4VnlaNFNJZE1DcDBZajY4TmltaDRIVkZLTzhPR2YvSGdLcmtYZmMzTWF2K1prWGFvTUFSejNEQkFnY2dRVmFnb3phM0NwUktqeG1ESWtTRThhWnNKTkpzWVFPdGNoakRhVGlJNGs0VXRvS3c4bUJNekFBQUFBQUI0UlNKOGw0UzNRUkxoWEdIRXg4a0c2NFAyUkdjVEhzdHpyMTMrWXJpVlNrZHBEcmVTd29IbXVrYzE5N2IxVW15VHZxYnJqdmxpZDAyWGlDWVNTVlNkNlVrZkRUOWEzbjc5ZnZqOXMvMHkxL1phbFFzMWRqVVJOVUtQLy90Z3hPYUFFTTBqYlllbEVjbnFMRzc1aEE1eEJzYWRIQVFnUk1ObHhwOGJPY3pnQUFBQUFCVUkySnN5bVk0U0VIV0EyMEpSQW9aUVZVY0V3VFpoRHBZVk5NM3d1SDlPbm9KMERtcTJzRGpSZEJ3ZndIMjFETnJ4U2pReEt2OGh2cGxSMHJXNkpkV2MwNXdqSzFxZkZGU3BadUpncXZtTmpVcW5OMklrbENxRmFNL0xjcmRPeEJuT000QXRYRnRSN2x2c2M0a1VncVRGQlBRZ1F2ZTUxS1JBSkFPMmVvZExZZXlwUElmRlRJYzBnbGVKaTNBN21UQzNScjFMTjRZZHpXdWNZaWI2UHB1NWJzbTFIK0hsOFZ6L3o2azlrdXRkVjh5VVd2Y3B0b2hRV0ZOQ2RORVVPbXlVL0VvZXVaalZMYlVjank1M09iVWR0T1VXalloWUhnb0dpZHhCLy90Z3hONEFEVERmZDhlWWNJRzluKzU0d1JzSXA1NEFDVWNPajM0TGpLT2R6M1RseVJBclhxYnN5dWR1VzEvMmxZZ1JBVEVRVUErUXp5OXFVN2lRbllnYW5kWTlwdVdMQ0ZvQ3ltaXZYam1Pd2k5cUNxR2xqV2lzS01nKytsL0pmZHN6bFdoa2N4MUxtaU94RklpaVVsYWNSZnNwbWIrRGlybmwweFFqSm16SFBXRWdiYUdrZ1I0QUNoRVBHU1RtaWk2ckpCaE9xR1FBQUFkZk1od0tNMzFZZVU0NzNwaENsc1lCS2VaZ2g0Z0sxemZPN05meHlhbjF5ZzRzS2RHaWRVTXlCYWF3bjVSK1psWGQvOVBZemtzbGNKcndxa2MraWNyYm5rTXBCTnp6U2dKQ29FVVowYWFpOElNSFhVb29vakZhY1pKeGhtSzZPcTBVc29TazRPeUtUSEN0Ly90aXhPbUJENWtMYTRla2M4SUVyQzQ0OUk1NS83UE1ySWRvS1BWYjlwWmFiS1V3UUNBQUFENlNaQzVUQmRuQ1NxcElVZk9sVmdRR1l2RlZvaEVnSjBsb0hHK3E5ZGo5Slk4a2lnczJzMGdSSk1sbEpYL2Y5NS9YeUhWbktVYjl4OE5UalZROEtYUERHSVRIa2JzeTBpZ3loUXVZeGUwdk5VY1Z1N2x2MkdWVzVXWnUyeUdydEdPZHVSL1BacTg3WFZmUks4eWliWGRLR0FJQi8vcWlFVUVBQVJBc2xaS3hDSGlSYnBqMU45RWtFV0ROSDRSZ292STQ0REdwWE5ET1Q0cU1SeTZxU1VNWXBKMU93UGs3MDkzMTRYLzkrd2hGWFlJKzJ1YlVLN3JVRE1ROEE1Q0ZqYXpqd2pHZzRXUk9EQUZtR0JleFF2TWh0UlV3aW0yb1hZVzJEUlJNd3YvN1lNVGpBQXpRNDNmSGxOR0I3aWl0VVBTT2VKVTM2UnpVbENVYTJiU3Z0S0t3ZkprNzZPbytwd1FQVnV0bld6alA3L0hYeGcrcEt2WVFUWTFqSzlmc1dOZlNaVFd6TkVJQklpbkFDbDQraCt0S29NRDBoZzNqSUtaUUhoRENWWEVXMHk1ZXhCRDlyVWlmMWp0cTVTODVNMnhZTEhWc2VaZS8vOUlMcHdqclNteEFmV2tpeXFURXFnUkVLTjBGMkhpRDhMRjhQLzhSeTF4RDhUUHh4dFA4OFZDT2NsaktQdUZpWnNad0VWUU9QMXloSVpDQWdDdUFYeVhnNVhyQWFuUGg4RFM4bEVRdm1TdWhQQlNYT0xaTkNiVmNMUUMzUFBiN2xJbm9EVFN0Lytkc3ZhZkxXUXpNLzdmT3llZldxc09rdlJjNDRTZ0IrZ1VOSlpEa3VjZldKR0pEaHYvN1lNVHFBSStCQzJ1SDRTcEtZYkZ0dVB3bGdXMFhHS1JBV1N3c1BKQjVUeHFEeldIWFBuRXlSRm5LV0pJbVFRQWhBYUFiWlFmQUpKaFhCQnk3bVlqR3RYS1p2VHlTWmRLaHVZbk9ETDdSL2pkWk4yWmFUczBMSlFqRUx2SHNlemsvd2hZOVRrNUd6Z3AyNEVRZGdrSlZtSWxEeFEweWMzc2lIWndXRlFXQjh1YUI4V0RqUWJzemhaYTdibHNwZStHTVFYM1N1SUpKQUFZRlJDS2dGNUNXc09JL2pDUUNjV1lRazUwbjhoaHFHbW1NTVVLYUhIaVczSGZIcElvMTB3VG5CQmYrbnhhNzJQZlZZbmdadG0ycWViRmF0OGFCNDlsZThrWkpGYkhWMENJNVNOQS95WnVNYzZvRHl3c0JqcVpqWnk4b0pwaElHNlFVN1V1OStNd3IwU0REaFAvN1lNVFhnQTExT1hmR0NScEJyUnB1ZVBZWTJPY1hPaFl3ODhvZUVkeUpCNTFvT0ZCaVBZdkFjVXBqc2ZQQ0plWmNXbjRwa2MzRnlsSENwcWZicmRLMEc0d3B5ejkvdXJJVVZUSWtJdUlBQXRVaEJ4dXFONGJTUE00MVZRb3F1MlZVTURXdk51cDlCbkRDNUIxRkVvbGlHRkFqcDl3eDBTcFluU0VSNHZoMkgvVFd4dlhwZlJyZVhpOElLS2JVdG9RY0hyTGc2WUYwT0xCeGltZ1Bxc1dZQnBOUnE1U3lKV2hWRHp5bkQzcWVNZ0NWV01SUWowaGhIQlRHOGdCM2w5T2NoTGc2UDArVmhTVU9IbnN1eU1FTHpkbER0blN4T2NQeStiQ2ZqVmNwU2p5S2RCN29GTDZiT29zbGUwS2tWS01hQWdIRW1QdTdHNHBNNFl4ZkluempTV0s2M1AvN1lNVGtBQTBNMlhISGpOY0NpSzlzN1BlaWVWZjUzeFN5NHJpMjNiOHo3ZHMzNzR5Zmx0eWZGc0txUXlWSVVrVXFnQXE0TWdINmtEcVN4YlU4NXA5cFU2R3BVUDR6WXJ1SkRmSkdSUkVrbXlHRjBmUmwvUHkrMGJTLzZibzkvLy92cDhqdVZyUThWZDFldW9ta0JDQkFObGdrbjJEVDA0TWN5RXBVVVZha0FDTnJ1YzV4MklRalU1RDJaZXhOSmk3TVJ2ZFpGNW9jQ1RLdy9seUc0aUVncUFGNUZNRDNFVGF5cGp4TEdoSnJRbERWVG5VbklzS0VJMjJGdThmcGlpbnV6VEVNNVQzTGpKTWgwS3I3bE0yVUV6dTdHbVM1N0NsK2NhS2RpSUJwY2VtQWdzcVJRQlV1RmFLNFFvS29nbzhURU5ZclBDZjdLNktDQjhxN0tHM0dhMGdmTnYvN1lzVFdnRTBZeVhYbmpOR0JxaHR0K1BNTnNZcUx1amhkZnZ2cGN0RS8xMURiVWRLeDB5L3E2MmpjNnN4ZXN6bG1aa1NjNE1yOStQeXNoajJldDY2MjBRdUtCc1V6UjBnbFZqc2pBQmM1bkR5YUd3dHB5SFBPYnlOVDFwMXdXOVd0SkVRUElEa3MyZktiNlRnNlUvMmU1UHZkc2JQMkdiL2N5ZHhxeCsrZkcybStmWExZU05lYTZSVUpsdFE3SUU0TC95ZCtiZjFrYk03Zy9qNzJGQTh3cjc2Rlk0M3ZrOFZ3MDA1MXVhTS9iK2twSnROT1Z5UnlRbEFFa3BKdU1qZmFFdGJmcUlMY2FBNnJWMVZ4NHkxU0lTNTA5Q0FZWWN0SUFuemFuRG5JRUtlYXpZYUIzRnNWeHFxa3R5UmhGeXNjencyRG9QYzQwS1ZxaVZ4TWk0T2FvZ3JnWHkzLysyREU1UUFPR1Y5dHg1aFJ3bU93TFREME1mR3RvNHpwWk1QWEJodG1tSGtOODRiWTUzUEVTalcralJkMW5rcTV5emFXNERyVHRRdzJ1UEUxcHgwaCtKbUxGTFd1eE1iY3I0Q3dkRGpIdkhua3N6UWQ3ZVkyMTIxQmNaUDc5MGg3R2RiVTZlVXZyTThSYmgzMzh1Ri9iL3dOUk03dE5tUGpWZitqV0Zvczhtem1GTkxSa2ljajI4YmhKQXlBQUFsaDFWQzQwMmZaZ3MyNGpaRldVS2lFVFN3TjhaUTZMUEYwSW1kSXZ5WElJcTFPWGpEQytRQ0VQenJzVzB2U1NuUmllckt5S1lMb0RCS3FINW9rTmZ5NVNPRkhSODljNk1UaWtvRXVOeHRSVlFvNFIvcCthMEZXczZkVHpPNHhYR1NHMkt1VlhsN1dGdGVUdGs4dkhVUUZuTHpBZnB2LysyREUyQUFOZE10MTlQTUFDeEN5YmpjdzhBS2QrbmZGWEowRjhqSjFqZXpKRFMyZnF3bmwwam51WWJ5ODdIaVM5bjladHM5bmltZFNNYzhGUzJqNmlSSGtPWjVxYWw3Zi81eTJUWmE0R2MwbC8vaWJ0RjNIQXkxMHJwRXFxbkdBQUFEREc2Y291YUlPdzhEcFBGV0x6QWlUNlVsVWtxa0JBUmlxT285MlU4enBSdWJtazhxR3lVWGJxc3VVSlZWZi9mRy9KWDdLRFY3enkrV25hYkJZS1BSb29GU0FuSlRyb2pwdFJRYzFoRk8ybU03NVRsR0dwMzFYL2JTajY5ZS9DN3VzOE5TeHF4OGZTVmZraTF2L1dKdjczMVd0NVdRMHdEa0ZBQUlEdE5ReWtXWnhRakpoTUY2aUJ4S2pFbVVNRW9XTExKeGExcUM4RGVYTE1UenlXTGpWTW9ILysyREV1QUFZbllkcm1ZZUFDZW1rYm4rZWtBR2svdDM0ZklYL2FxWFNaYVhRcVRKTlViVVhPeVpLd09FTkkyQldmZk9CcDBROGhrOXFxaUtrSGxuakJXVlpVbXAwNTBwOUhzY2c3VWtFTG5ESldoYkxIb014Q3N2ZS9TUVllRjBzMmlOTUdDcTdLcEVBZVlKWWNTeUp3TlErenh5WC9nTjJiTXJjWjE3VkJwMWt5aU9OUm5xczB1aFpRUHh0ZjFzM1k0VEJWSll1dE9DdGZ3M2FYZ25QQ2tIUGZVNVJpbmJHR2ttaUZqUmQwUWZJaXFhUWxoSkl4amVjbzk3aWU5eTVIOEowbXM5R212QjFnSlNZYVdOU2w1a2l1UnNDSXRXa1FCdDJiL2Nxd091cklJQXJrOXc0TEM2SG1ESEp1N1A0THR6WVdaT3NDb1ZQWldDSXlHU24xcGhkMitQLysyTEVrQUNQMVNkdFo3RW1nZW9oYmZtRW9mZ1RCeWE3QVlXZTllU0FSSHByUFRzbTdUcmVMaE9uaXorZW42TFRRYm9rREN2Q2ErVWVhVEN3TWlJT0xGbSttYnZjZUQxeXlLbjUwMWNmQ0JjOW9EQ3JBdXVqNlM3NGdHdmJKeE9EZ1lqTzFMQktJQUZGTzRPZFBqUVM0WUlzUk9oalJFQzBvM1J5UUl6THFKSEx6NjBTYk9GVmFwTmtGK0FyRW9kSXlNWDJFbVBwanM2VmxzMUJnaUVNUllVN3FHbGhLdlRMRjJFWjAxVnRaTktONHRRbHptZXluMHJIRUZaOWZVeFdCMVllWTJpek93dVJ1d0hrZi92NmVtaG5PMXFwRmZyK2MvLzlaNXhIK3NkZi9uUHRiMy85d21nUjVkMlFUWUpNYTg3dG55bE9jdFRxYXV0THJFQUFBRE5vTHNYeC8vdGd4SXVBRG5FUGNXZVljY0pmTWk0dzlobzQ5bkFheGNZUi9LRmhUNkdINDVMQzdSN0M1dEpsSGltSUhPR0dFTDQ4SWkrbnBKSEVaTWJ3dnE4R1JwdWMxa3N1U0QvejA5Nm5idk82VzdVSEZwSmk3VUZMU2RnRitLVXRMaWVldzVJRmhnS2pSUEErN2hvV1lrMlc3dUZJZFFwNTVibW1CeWlwSzBPaG1JZ0FwWkdzR3daSlJ1Rm9UaDhrb0hJakxqbDg1SFFDSENpb215TWw1UnNWdWRHV2RrU3J5bVlzRTJxMWtJaE41U3FEZFhjcU16WlNvWmcxNGprVEpSclhrZTdveUt5dXV6R1l4VVdSNmNtZi9LanVnVk1tbTNyMFJONkhldW9NdEp0Wm5CWXIrMnJ2Q2lRQUFBQzU0S2o2MFJpTzZISXVCb2lITkdQTEtBY25NRWg0RkVVbi8vdGd4SDJBamhUcmQ0ZWtiOEdwTHk5OHd3bnBoNkt6NE4yN1JMcmEzSjJwQnZsYyt0b2o3TjBqcVpXczRLZ3lWdGo0bkJ3UStha0RMRmRhTVc1S1ZJVHF1RjB2a1hCZ0ZVNHVmMnJZRUdxTDdHSjROTkt2TncyVkJYTlBVbmJTa2dBVkx6WU1OK1dxaWxPVkRrS3l1YklkRlpGWE1ISUd5WW5Ub0d2Z2tZWVhVUmxRMmxhYXlqZG42N3pTNnZ4M1g2YnRldlc1dmR2V3MyeStWV2JqNWtzelBuejdXN212OHpiM0o3KzQyV2IvOHNOeGMxYkRzOEpuQ0pTM0dOSkkwTHlQUVZhcWJrZDJTbGQwdFpNWlRESWhIelB3V3NIWWNoNUhtWEFXMDZtc1QwZ2dqb1lRc1FJeUVFTUtWSmlHTXk0Tk5OTGxHdjFlTEdxR0EyemNWRGNjU2VnSy8vdGd4SWdBalJUamRhWVliNEdlSWE1Mm5tQUE5RUlVZDVjajRVOFJVVmNqL1VjSm5WN0tUNUNuS0RBZ3NMZ3hxeExHZ3VEb1M2N3pMZXFrWW5rUGJMN1pmeDZLWENjV0hLdWRRbjBPYTByTS96dk1WbmdLdzY0OGZFQ2hQa09jcVkzaTE2WHpLLzgrTDQ2dmZ4bGVyOXhLYWozd3hLWjY4K1Bud291cExVemFTZisyTmFVZUhrMmZFYjJkK2RGSnUzcTZ0YTJmUXRWMW1DbkZSRklERkJVVVcxQ1FVdERsUjVrRThJS3VpMks4bFNTRkFrRGRRaFBsQWNORlE0ZnE2aVJVWkJnVVZENTZKRURxRElNRkhPMXAwZlRrZHpqblk5MmpLTDdURWNxRklOWXp2VGRXMFpPNldsZGIwMzNJYTY2b3gzUm5JTUE5My9ROFRnZ2RCc0lxdk4xRS8vdGd4SmVBR0tHVGI3ajNnQUdycG01N25sQUEzZkpBQUNpQU9DZ1VCMElNNHo3VzNpbWhuOWdEOHZtOUZWNkZxNk5HblJleVlVNy9YaXZHM0VPL04ya3FJaGt4V21RSWJoKzhwVWQ5OUNwb0VVdDdDU1BnekVYb0tJZ0xjRGg4VDlQOTlDakZNMHV6K0h6eXJWQVo3NWpnd0pCdjlUVEtUVkk0alc0dmFMRW9KSWhxeUxiS0tORkh1UXM1aVFHZzZBQkFKeDhTM2dyQ2xPSkswK3l5Y2p3ZUtvU0dEZHRsZVFqQmVxcjZQSHBEK2NNdXpNWWxDWnk3UXZiYnBWdGJxVmg1TEQvTFBXRmY5TmxhSG9oVTJCeFM5Z1p6SGQ1eE8wMEttZkQ1bXBPUHFyRmRmLy85Ly9pVU40VUJKazZVQjQ0STlRd3RuOEZxakxqcGhoU3NMd05WeDJDdy8vdGl4SGVBRFAwdmJXZVljUUdzSW03NDlnenB2ZWFnVlVzcUM4UmpscWxXWEhnYi9sQnQ0aXVUTzV0QWRYa3lqZllDR3JpR3czT2Y5MFNwYXhOdmQvZC9kdFNHVm8vVDJaNVRYb0FHalZQUCsxMytkOXZzV0dWY0RCRk9PckdHRDExM2JramxUSTFWSkVRUVNvYUFFMFJLc21WOElwaFREWUxKUExKOEpLYzVNaW1Pamg5aHlHUEZBTkhBUWdoOE00NWpPQjAwTW8wVUxXOXA4a3lyTWVpcUJNZE82RitHZlJ5bWZNeTlQVXo1ZzlyK290eTZGaTBicllESW5PdkJBSTNLZXdjR0JtZWxnWU5yNUY1YWhWT0VGVmszSXlRWmFpbkF6OEV3SGsyQTZFNEZXOU5sRzJXbTVUUEtzcmpWMnhGemhlaUV6dFdwQWxnTkFPMk9DTXVsZnkvN1VmLzdZTVNHZ0ExWWszUE1zR2VKckI1dXZZWU02RXU1ZXJBM3BVOS8vazJobDN6VTE3RXArdld0aXpReERPcnQvLzJ6QkRqTWdwWTJSUERSZHhzVTJNeFNwQWxCZWltUk1FQWpSVWpRQjVDRG1sY3VqV1ZCZVMyRUM2WlVLdlFUdzhIVGM1TzkwMnhZcjJyVnB1a1g2YndRUWh5M3NVZ2Z6My80eGEvRnJFTWU2RlRQL3BRczN5a3BRS0RxbUJuN1JYVDhwMGRHVnYvOXlNNHNGRGZRdXlpM3ZsR2ljUUZtQmdEbDZzTmdJeVIyU0p3a0pSTGpWSWJNTkZtTmh6akRhZ21rdXpkVlJuTkQxQzJwcnBOTzlzN1VYdFBOdzNzdnQ4dFBwTHRGcWRYN2RNS0swczlIUWxjZVZyTWVyKzlUbGY3VE9wbTIreDNrUTRneWpzcUpULysrWTVFMFp2LzdZTVNUZ0EwQk4zbm5qRlBCa1NXdWVQR0tzS1hQT3AzVVl3YmEzNCtmRHlGQWE2L05JU1JzbGtBbVpNd005TUJERk9KOGNVRXhaalVQa3NWeGNuRGNuSDlhMGluNTNQWFRRQzRtU0UySFFWT2pHQ0lTbEgrdDZPemt4TUdoU2FmZDlySXhyeXNySEtjcm1ZMzY3SFp5bWNycUdVMy8rcXFxNzNxcjY1OUljcmM3ekVWV2NGMm90WFlVQjFNeWRFd25vZ1dESk1DckFpbUJTdVN6MGU2NlkzVVNxek9wbjd2NlEycjRnWXlYcm5DeDYzVWYvL3JmL1gxMThlOEpNTzdCNEQ0ckEwNWJNRHQzNi93dVovLzhzci9WTjVlbjFyQ1B5ejgwUXVhWC92elUvZ3BFSzhJOGpvNkEvc096cGZiVlNzbzRzN0tFNFFDcGtVOFRaZElOekxHY1l2LzdZTVNsQUEwcFdYZm5yRktCa3lzdXRQU0pvSGRod29lWDFMd1dsNmxSWkFNTjFJa3p0TDErVnlxNk1Gc240YzdpS2JmZjh2bVVPWHpUSWpPWkllV2NxdW5NOHd3OE9VdDBMWmpKY3VmSlM3MEVJM0NNSWk5dFl4NGJZNTZGbnhFdDFTaVp4Y0ZhcGJIcGVJVUNFbFV3Q2lBSE9ZSWpLdExzaHBjTm5wSFBaNERJUHVDYXd4TVNHcDRvcXFsSW5hRXhZZFZCTGZzWTV2cW4xWXJTNTBxY3lJWkp0RXFlOUVpSUtNUlZGV2RHSU9WOVRkMHNxOHhpN1BmMC8yRWQzbTFkcEhkYVBVT3ZKUEJEZTI1SUtpdGp0VTFBQU5FSUFFZ0ZRd2hNU2tnSTJRbzFZaDhKdWRDN1JwUUFQSm9CMEdzcEtjK09WNzRRSEFtVVpCYnRLNFpqT3YwKzB2LzdZc1MyQUEwVmRZSG1JSEhKcGFBdnZQTU42Q1BWVVFTUXB6blZaN0s1S2VaTFNLdFZRd3FaR21SMDBaVXZTeEUyZS8vOUpIdnlscjJVMmNjczFOejU5L3hqUHAyNjZ2RXdBSEVDaUQ2R2dha0E0K2RFcGZYRmpTcFZIbnBaZHhzMU5Vck1IMHlIckk2RGdXWVZVOHlrMjcwTEhzdFN2LzcvK1VWL1NrMWdEbFpyRWFaUzUvYmIrWTJpTWpEbmc5ck1wV280QWJIV2V5bXRDVm9VUEtBNGNQR1NPa0d5czgyUkZiNHdCRlVTRUNBcGt6aDFtNllTY0xuWXpwVXl5RjJEZmpHK2RDQW9xcm9SampJNFdVcDFPR0NoK0RFK1UyMThMTkxJdm55a0kvZDlrNy9wa0QzSWVDSUlZWXZML01xcXRZNFlMRmhJWWR1Y2hKTVhDYVg3c2lrUlRESC8rMkRFeFlBTXlWdDM1NlNzZ1pncnJyenpDYUdCMWhtd1RBWndCR2ZpNndDYlNwWGlxQUJ0QUFBVkswTno5bDBYUVZvdnU0c1pzTUplTVdsVkxoeVVudWJPSVd5WDY2OWoxSmlTNW9ERzZSb3NSNDhoL3hicUhkV1o3NVpVNldNalNIRFNPWjNNWmhkUnFPT0hpN3VRLzFadEdJWTR1b0lVc1RicWpFZG5HdVFhVVRMZGlwNnIvWGluZDM2KzFTNUJOMzVNb2hhSEFBVkRnenhBa1dheVRCSHdsQ215TXFnOXpZUnB3d0czeDBkVFVWTnhudDNrUzhSZWxPcFI5Y3pvY3lOMTh2TVBvWStLTm1hWHprNDMvN08xemprZE53Smh5UlM1d3c0czVac1hWL0wrVDM3ZTBpVHBCSFAwNko4ZmxSNEV0emI2WHk4MWVJYWVPU0N3NGNPQkJoNy8rMkRFMXdBTVlOMXpoNnh2UWFlYWJuVDFqZWgwN0lqakFKQXR2T2RxS1lCQlFBQUFyRjFGb1BjVUIyakV3blVlQjNTaGVDUzRpTDdXMEoxY1Y3SEwzOHRhSHZENG5sNnpEWm1Qc0VjYTJ3cklDVWdvdmhHbUxyYnppNGhMTXM0MTZZYU1VUXFncVJYeW1oblJMYUd2L3B4bVUwT1ZOTFBMYzBJdmN0LzhmZTBYWDdFRFJxTWZuMEtkK2VNYnNRVE4zU1ZFVndscVRmNWVCQWdFQU54MEEvUlBRZ2k4UDFxa1VRNlVnQStEYVpWS2xMQ2xJa1B3RkpOckNwL1pLSUlpZ2lJWWtSVmdLemNreXNzUmlja1NuOWpkLzU3eG1Wem5xekJENHdoQy9yTXdjUjFweDFCSEprN0V1WklTeTdmYzBOeEpHZHVmOUxrWXpwaUdVS0VCaVFKa3FTTC8rMkRFNklDT1VXRnJqREN0Z2VZbkxTRHpEMWdsT20xdU9md2ZnTklzSjZtVUFBMW02RDRHd2p6SGljNk1ydnV5aUJCMUNBeHBneUJxQlVUUkNLcTNEc2k2bGdVdnBqb3hRRGxRUjExYXRGYU5aUk1rT0J4SkNpaGgwNGwzeG5aOFdwMTIrMGNVano3UGV6S01WenBEeTBSR0dLZnEvMlA2ZUplMkFDS09hLy9LU3BmZDc4LzAyYit2VXZQQW53QVNjU3Y4T0lWaU9KQVY5V3dVTWRCWnRPdGR3V2RRRWhlNEVVVkJEOVBPUE5iQW5wYWo5blNqYjA2bnJScHFDU1ExS2FCU1ZXUXd1ZTd6REdFcnJBaEJWNTBvdUM1eDV5dVg1T2ViR1dYLytmK1hDTlRpMHZRMmZ0dEsyMC9leHBQSSt3c0pXbWY1dkxEVVBsV1EyQ01lRnBGclVjWC8rMkRFNm9EUE9UZG5KN0VTaWR3bGJCRDBqZmdjY2dEQUFBV3lvQWFxbEl1bVByV2dITjBYV2FVeVZ2YmNLYXRWTXRpSVNxVE0rS0FtU1FzUkY1SlRscTdiNGtxUDZoOWRMZDJRazg5VmkybHR5b2s0Y295U0J4d2ZpZ1ZQZk14ZWFGcVNCeEI1K3p5TDZUY3pFakVzYWxMdjhWWHp3a2Q3dDM5ZlJRZVZ6dFR4TXU2Vk5jUzdtSkNRNmp4cWpMUDlMajkzWTcxY01FRHMzcEFFK2JaTlRuVmlkQzlGcklVMEhlOFNxa1ZjU2JNa0ZzckJpT05JakxqQ3RWYkZ0THM4d1NPTTZVcnh4Q1lUczdPRkM5NzdYLzM5WWNFdWdkbjFhRk0zSUI0OFRMWHBWL0N4QTR6QnVOdHRiOE5UR2llR3pLeGVzajNLL3NFZEozMk1wWllaR0JiaFZXci8rMkxFNmdBT2ZMRmVyREROU2NjeExPV0VqZWpOcTJubytlQ2FyaDluTmZiUzFUSVFhdTg5eEVqR2lrU2lTeTBLWWNnRFFaQlNqcEV4TVVOU05lQUNNa0FWQkZ6Z1dGY0hYaGNMR1FrRXRjQndmWktTUmNQWTNsUk53WWNoZG5jbkdjVEhSWFRJZTBBT2FsK0VCODBtTlA5TmVNWmJXdm50MWQ3TTZNWllzOFQwcUQ3Q0tpaHlvaEZzYjVUOFRJYzNNakRwc0tCakNZZE5JQ01CR0RsakJEOGVDTEl3MGsrWlJ4UkNpQ1IzU0wySzVPTVN2ejJmVjlYOTBnV285NTJ2Ymc0aHJ0NFIybi8rbHpuMlArelBwT0VCNjJTdEcxWkU2NFhaTW1STU80ODRpVkoreGo5a2JwOTNXeEtjQkFnbjRQOTUxMHltanNZV3VMMHloRmVIR0pVc08vL2YvL3RneE8rQ2ovbHBZc3dsRHdwRUxheEU5aHE1MUV6Sk1pV29UR3BCbWF1Q0tIbm1hbUJKQ0dWb0ZUMENHMkhPZUxlcHpST2x0ZGoxTFNFczZ2ancyVmR4VWdqTlFQQlNLcG1VY0psUjNJd3dXRWswODloQ2hIb3Y5cHRtT2VPVHZ1S2plZmVFeEtoQkVBTE1YbGFKczhGZ1pFMHppT1JDY1VuSkc2RXdWcVZheEd3K2ZyUEx6S21MRGxBT0N6ZTFrSlE0MDB4VmF4U3Y2MVZsL3VsUFNzeXZyVHZuOTYrdnpmOWE2azcvZS9PTjlZVk9OMWUvZU1Jd3FxcW9WYVlBQU5COWhwUnpKMmVnZEtFRnVPdGdHQkVKd21CS2c4aUlxakZIUE96dlhwTkpscklpcUZYS0c1QUVMdnc1bXgrYWxQT0xWek9MeU1sQWJjZ3Fpd3lqMEtOMEt3bEsvL3RneE44QVRFVEJjY2V4QlVIc3NPMXM4dzY0NVdOZk5RaWJaMkUySEJ0S2hFMkgxQ2pCQmE5bDdGQkFBRjVJa2l6NjZrT1dWRlZZS0lvZ0F1eEdSVVBCeUdzWG1MNDhsc1RpNGVTY0dqeXgwMWNaQzhHeTY0L01ZOFJkM090UStpTkdzK2VmKzFiOU1vYU5zYU1wWmFrcU5ua3d4VXovam9Kd2pncmJxS0htblcrWndGRlFpZ1JVZWlvNDd0WXR6M3YxTHozT0tsZkNVZHRKTTFvZ0E2VEl0TWhqa3BPQTZESDJqbDVCSjEreXhpeEsxNmk0dVQ1TnJWNVlHTTQwOVpuRnhZOERqYWxrSHBBSmxpMmhlM3Ivbi9TcEVoZHBNZ2djSG90Um1NS3lXT1NZS0Jnak5XZVByc2Rka1VuMnBRZTZlc2ZNc3JxYm1mVzdPWGFqTDQxaXBBV0svL3RneE9nQUVsMTFhMmVOa1VtdG9XNjg5STFvSFFrRXpKdndhb1VtNWQyU1F0SUVDQTNqNUpTYng5b3MybVF4a3k0THpJMnJpVjhoQVdUSlp5WkdYZk5NcVV5UDEvd2d2V1ZyRlZyd3VGVXZjcXFkbXVNOFYvais4S08zYmtzaDc2V3JMUVdRaWxFaU5JWkdsd2JURUtBamdML1UvTlk2NDNCZEFyUnc0bFNaT0tvS3FRSUZVZXlZTnBDMHBObzBtb3kxbWNFQ1FDVm9MMytRMSsybDhwQlFFQUFLWXV4WW54eGJLUTlUem1hSkNuVTVQZSthYndGaCtMQVJWSjY5ZzR6RTR3WkIwY3B5WnlzZkdFN1RLbHh2LzZnTnVmbk5qamxCR0dCZzFaYW1GMFJuWnRRb2pnbkExWFdoMmRaV2JUVmNhTGJrb3NPV09yZkcySnhTY24wMmtsQjcvL3RpeE9DQURLampkK2V3WThuYXBXM3c4YWJnMkpvR2t1bWZGWHRhb2pFRU1nRUFBQUE2eUNuMDFHayttVEtPalFWOGE4VkdPa3JDY1ZpR3pKSkRuekt2dmVTUTNGLzJ2TDFuSk5wdUo3bTF1TTlUNWZNcW5JNittam9RMnkvbVc3VXBlckNwK1VNc1BRaVlKb2xuaFVmRUlvclYxaW9TSVZDMHZyVU00V0xZRi9zTEdiOXRuZllsYlU2VXE2ZFhGdCt2ZDV6bmZXZElyRU02Tm9EMmFRMG1vWjBNam82b1k4eUFSY0JIQ1huT1RaT1JqQk1aRTJVNUNuRm5jRUpWY2xuS2I0Y2RhZ3MyQUErd3hMZEZySDJGR3p5MU9oUHpjUVg5K2tmSi9tYVV5ZE1YQ01QcUxUckp5TU5NWEpQTkxmRTVjcnEyOE05OHRBR3dyV1dQR25ZK3I4b2xJdi83WU1UckFBK2RPV3RubVMvQnhDVnQ5UEdtT0oyWmhxYlNwTkdBUURJYjV4cEVZWjlxNHdUVVQ3Z2I2VWlQbVpqUXhVUmtJZW1DbUh3TmFRZWpxL2tMa095V0tVTTJoa2xObWNoNVlWa0F6UUVUMW40ZGE3YkxHM21UbXFIWTZTSEZqdEpjNUVzUEJwR3RBcWN0Y2xiWHNPM1NsODh4eDlZc0x4NllJVDZoNk5mQnJLMjFHYzdLNVBUdHB5Ynd2TGptNmJTMm12TEZaS3l5VVFvQUI0UXhNT1VvQVpHQnVMUElxRWFMVjZNbzNDeWtTZW1FMklZcnNVTWhyWHFURVV2TzIwbU9KT2IxTDRwSmhla3ExdHJ3bjd6SUp0K29vMGNvMmlEQlVOVGd3aEUwdGtNa25rcUtnQkZtU1Y1QXdoTUkrbXpKZHJVS0hObWNWUXBKa2hNK0ZyeVRpLy83WU1Uc0FCQ3ROV25IbVpHQm1hRXVlUEdhY0pUUmNOSGl3cUZCblQxdmZhMU5Ya0RyVUtxbU5LTWdxUUJlMG1QZ3hSYkE2SWhqbUl3TENrRnJGb0pTQmpKMFNCWEpTck50anRQd0h3bUlDL3VsVWxBT2hPaHFoQVNLL1U4UjNhOHNXeGwzUDFTazFBL211aVlGbDFqRlZNems0ZENXSzFNSkdxQkFvZ2dOUEI0aFNrVm5kWU9QSlVnRlZ5ZGd1bytoZ3lzaCtsUElRREFBQUFGczA5U1FNT3dBRVNXYktYVXdlcWRlZFN1V2lpWWpQcXEyUzZtREh0bGFMR2tzRUpRVm9vWWR0cDNMRUVpSG92ZjNsT1N1OWRXNHlPSUdXcVY2L2hCSWQzYzRTR3VGd3dIaEF6b1VGSW9qKzMvbnU0KzZqbmQ4U2VmN0cvOHovNC9zaU83MVduc0R1Ly83WU1UdUFBL3BQV2xualpHQi9TTHRjTU1sNElJQUFCQWhBQUFCbVdITUZiZWtDQXdoNENac09XNHJVYmhBQkNFbnBMSGhpVUlpRnJrQTJKdGpMS3d2UkZTcDRtUGJMVzBvVk5GNUcrWm5qTUZLWDdHL3piVnRqcnJpckc5aVg0M0ZEQTAwZFVYUXRFa3QxVlhQUzNpcEZDVEh0TU5nYmdLYi9PM3E5T2RNTVVBWlVYcmYrbVY3MlhMRVJaampqWndPbDkwamZSQ2Ivdm9BQUNBQUFRRW9YVWdSM2Q0VjJCc0RhWURObFhCNHpnallLM1RLOHhFbXhiU3NXM05Oa3N5UEZtWktiYUJ2dE1Ea21ETXF6LzMvNzI2VVhoQ1RtVlUxclRoVFdVaG1XWGJVUm8ya0NxVGxWRW05WFkwbWgyc2szdi8vN2xCMENDa0svKzMxN3JNNENKNTJLZi83WXNUbWdBM2MzMjJIbVJDQnVCbnRNWVNONmFMUzVISGlVeVZIcFdYSGVyUHFzeEFFRUNFQUFBQVpHZGtJMkIwc0F2dEpXbktNVjFocUpmRVljUk1XbHJoWU94SVk1NTZWQnN5T0tCb0xIaXMyT01FR1MxY0htSEZxNnBEOWY5SVFjYVdoRTBZY0xsSEkxbENybWloSTA5Q0JrRHJjWlNpNVJiV1pjM2R6Zi96Y05OMVhQLy8vLy84V25NMUVJYkpiVEk4ZStwVG9oS3ZZWlNkMEFrQUFHT0ZJa29vQUFBQVVEUlNsamRSTXFBSG9ISHJNRkVLbkxac3NVK29pdmRGc2VMTGd5amxTTjM0eHBqbVJwREZnNnphYnp5TG0xdGpHTTlFdVNHSU5Sb3RqTENYSkdQZWwwSWdOZlBBNzNiUmlHN2FrK3AwaElzdWtlaVZIaC9CVnkycjZ0Nm4vKzJERThJQ1FrVE5sekRDendlT29MWHowaW5pZE1Ma3lkVm9ZcURvWGEyMmFIR0Juc1NrSE84VjdKQ3JBeExaUDJWbG9rN2hMSEVCSzlLdjdMS2dPVnoxOUs2REFzejVoU1RRNDcvZE41K2RxMVVvY3lLNnJQZVBLNVRLSiszWWd4b1VYRWVTLytuS0JoNXFrZUpTQkZ2aXZVREV5cUJ3YkxPYW9mUFlFSndxMU1DVUJOQ0JRQm54cEZNZmpvMUlKZlJ0djB5Mk5pVWhvYlB6eHg1RENBRDYxSXBjVkpON2ZkSnFtSktzZnhjZHIvNjJhZjh2NHgxMW00Vi9VY0lKb2dDRDVNUTRlN09vbEZEa2dieU1aanBYVmFtTGkvb2FMNER1NzAwMUQyazJLNTcvampmZDVuWWh2MGl1KzlkM0tSUk54QWpLVUFMZ0YzTDZ1akFSYjRKWUw1ZlAvKzJERTZZQVBaVHR0OVlRQUEwMnpMVGN3OEFCWXdvQkUyVDI2T1dXRFh3MlgrSi9lTEFSRStIa1k1eCtLd0hIRkhNaVUvNHgvMHRYSjkwT0l1YjdiNkt1Q1djM0tnT05UWGxvN0xxNWg5SjQrc0JZSnBTTks4c09Xd1VaM2pDa0NzV1NVbzg0QTJyRnJpeExTRUVRUkl5QUFBQU5mamNQUnNZa0hzSUVFb0YwSlpJTE9NMXNJVEZWamxHWVhQVDV2Z3lQWG1vWGIwZjhaaTFUUk5ob0l5bG4yMVJ2QjRoNER1Rk5rTTRRVDVScUg4WkhJeE1aMStyckNGVmVWcjB3dVpTZWxCa0Y3UlRIU2hxUkkyUjUyaXR5MXhxem9hSGtnVmNXT0x3MWNTaUxqRUZNQU15UkFBQmNWWXlUZlhEbWw0WU1zU3BwSlNvMlp0Rjdjck9EcGJoeldXbzMvKzJERXVnQU44UUYxM1BRQUNhNGJMbmp5bXRDWThHSTk2VE9MYW0xYnFocVAwSTNYZVEyLzY5NTU1MUdpQjBXclNkeGhvcEtaUEhueHNkVGhveVEyRlNza0puY3R2OHhURkJRdEhVUlJDZDBjVW1ENWl5bHExbmdpQ2ExeUJRZThyVUVIUGJYM1FXTUFWU0lSQkx1UzRuUURZd0dtVThncEF6aFhGRHpBaEw2RGVaZXJtQXlEaXpnbm92Q1RBck9HWjVpL1BNQ29FN2dkcGR0N2Z6L0pWeFBNSTlPWENxTDhUT3ltTUhZcFZTOWJFc0lNWVNySTFLSVgzcjcramt0c1I2SGl4Y2M2cEx5NGxYSG1sT0UvYUV2Tmw5UzJyZGRaQzNDSUFFQUVRZ0FBQXFhUFlmZWk1a1BvSmE1Z0dJM0ZUbzJSMUttelpHWVN5MFAxcHpINzF4SGt6VnIvKzJERXhJQU9vTmx0NTVVMmdkR2RMZnowanRoU2cwakp0VEUwNVNVemYvbjkrU1kwL1pSUHg2YTViaUFtczFNWVdmSWM0b2pLN0VLYzZoeFpRUWtRb1VwLzFNMm5YLy9CSFNZaUtWNTFxWTdLMG5kV1hrM2o5QkhmYVV4RFF2bW0xZlZCSWdZb0VnQUFONXlHK1p6YWlrRTJtaEhTNnpPbTVBWmd1RlllZXNoZkgxbGZYYytMV3JGTkhscDk0bUhGSUpoQytyZktRck1CV1VMQ01VRUtBOGw2bW5kNm1uWm1keElrR0hDeHdobVJXazkrUXpsT0praVVYWmxoQ0lITUptQVFTcElCVk5YYXhnVkFZa1NBQUFEcm9qZ2xTd1MzYUZVamVaTHBtbVVUK1JhY0R2ZlJhOUZPNXR0dnpjUlhEcXlhNnBHT01kRWhDUnBQZTkwaDY4Z2RJS3IvKzJMRXg0QU9qU2x6NTVoUmlkdWpiYnowaWZrSklJQVVWRlRzS2xIV2RUS1Nkem1rUTVvazRneEJGRE9raFdiU3U5di8vc3BIS05Ja3JOSVFMUlBmOEtYTjdpajVyeTV1ZHBXVFlRRUFOQ0lBQUFld1ZqSkRBOE9vMEYyZ2ZORHdnam00cUdpVjdoTXg5aGxQMTRjV3dqMlJhVnhmV05naWdEaTZPU2Z6LzZUcnR0eFNNd1Fxc2lxeCthdG5qZFZGY29pRFN6RU9lbjJ1aUZrLy8vK3EzMnJUYXJQMVJwclZ5S3IyVWlIWUVueTVaRVFFSUNJZ0JBQXVuTUpRc0VFNVdvbnpLaUpKVUdxazZZQ3VDVTZWRkx1ZHlIcG9TTzJ3eUlmVXFsdTZzcFNpakFKVTNNejcxVU8zVXJSQ3VJRG5HWXU1NVVXWnlLU2FFY3d3TkNMZHBPdEJKd2hYLy90Z3hNb0FET3pSYytld1RRSERwZTM5aGhXaFlPRlFqLy83TytFQkdocGVkNW5NeTRjMEQrKytHU0dqRCtxWklRQTBsTmdBUDZOQUNTcWZDQUlxVWVxd0UrandhRVM1Q0lERnhJR1U1MVM4Q0ZDN215ZEtIRUI5WTM4dnpwNVpXODRkTzdId3NqK1o2Yys2eHpWemMxTThETVAwMzhuUjA5TC8vLzVsNWM4NHExckZIeGNDVkZoVGdwUVB0TWlXWktobExTbm4vNW0yVVRDQ1VMQUI1RTRHdTZNUXNSVE1STFZJY3plTVY4MURFUmIvQ0lRRTdnM1dPcWpxTjBWaUhkenNhblhKVHZCYlhqSS82K3YzYlovZDIyR3BkSk1Sekh5VVNKSGFkcTMwY1JJZ29TYk81V0hGNC9vR1c2dG82enFZaVJDVDFnbEJVYUU2bEJnSndwbEpYZTYxLy90Z3hOV0FETjJGY2VZTVZ3bTNKdTI4OHdvUnRPRXpyWmhBNHJVQVFFQWtBQUFFeTRJd1dLaUdIaXV4SGlhR2VkYmNiUnBsN0lrdEhIRkoxZGpFZnVvMmRCOGhPT1h0aTFRaUNSaEEwWXBway9NLzlXaEFTRHBRbVJqRDNKRkV1bnBwcnE5dVg1MnRHa2ZNTVlOTUtSbVl5RjZkYWxvb3ZhL3FYcGV1YW1zZmduWkdObm9EcGFXZzFISmM4SlZreXBFY0U0bW9oTFpFTkFBODJCaGxJZHlpSFNyQTFiNG5KekxBM3l2UGNUSis3RkVqYnJwR2lGdXVERGlhQUNKVXV4YWxFRjBrWUtKaDN0RzJhVm1aMjdQU0tKVVVGaTQ4Z1Jza0RhSTdXZFJ6cVdheVNhSVJDR2o1VE15SXlzenZTZXkvNy9HVVNvYUs1SCtjTWUxWndtZnNsYWdRLy90Z3hPTUFEVEZiY2FZWWJrblBvR3p3OTVnd0VBQUFDVVh5N2orWkFRYjV4TUVsZ0Zaak93ems4QUpBang1bitYSHpjbTFDWnZDMHNSZzNNQUNXSG5UU0xYd2JteWhqQnlucmJ2dXV2NlIzYkVxUWNpYzRQclRESHl6U3YzOTFwUTd1WXZodFZUTnZOL21MRjZhZHBuVThjVE1YeFhLakxibzFjZnUvLy8vL1dwelZucGQ5V1FNYitHd2FKaUlhQUk0MjRnUVdBQUFBUUtRb3FWWTJLbC96ZjFBU2lBY29kVmRCcHRvSnBJaFNwdWw1dktjQ3dkaE9GczYwN0NVNVA1bHlkTEdZWlBGY2tJNlhUeHltaWdYTzZRYzJNMDFHY0VSclRpWFVMQ2R6YXdTTThkUHpUc0VXT3pLWlJNeUVwNUNaMlpLcDI3eHZaMEk4QjhYRVF3QmdEaFF3Ly90aXhPd0FqMGt6WWFlaHM4R3ZKZXdvOHhZd1ROdVlnNWk1TEpPaVdSWjRqL2QzNmZWWWNKUGw5Y0oxSHV6cHdYMGRCZGtpUkNIUlMvSE9YQlFUS3hrcEV6dUpsNDlRS0RYYmUydWNmTGd4dUNqYWxkTldaaFAzVWRXTWtOUU1uaU1jZk1PUEExUnFjVlE4Y0lrTndjOXhJRkpkMWd3UDhWamVTQ3gvLzlYLzhxb0xhWFl5SUFBQUdMa0tVcS9WMDZyTVlxcm1BWGVkcWVlR0VSMkhkeXFLSlVDRnNEYzBESlNMdHRoK3Q4cGxWOEdwaVlGQ2RNeWJiK3dlb3crNGRDM0ZZWlZlcUpDMWhSVVNnMUVrWWFiWVlHbk9MRHlvMWdpVW04T2lCWjBraExyUnplRm5qenloS0doTDZnRjNpSmRHUmtFQUpRVXNDS1RaQ3lUa3JEOEdaRUxSTVAvN1lNVHhnQTlWV1dOVTlZQWJrekp0TnpMd0FITmdBaFhFY3lQSVkxMUt2UWZzcHkrS1N5bWZUUjNNV09lL0VIcHlUUFdtV1U1UHhGT2x3M0wvT1VCQkJtY3I2MFlnOVRBbkxoME5peUJ4NE1weUxGekRqbTJ3TVpsNkdyZnNreWdvT0JDZklRalpxc21KZTFvQUpRUWVLR2Fkb0NZYjhCR2x6UDl6UmhDb2FJR3phUkVpN1l3ak9GZGFlM3IwRFRLTnRwQ2lrMnVwWnlHVXpDbzdtclovcDcyMlVybzVGTVlqdFE2M1N5RTY3VFBydHRaTHFVWWtzNER1U1RhMXdsY0N4dFQ3cTFabTVGSFhXT1lwWU5taE1SQUFDeldnVTJBSUtSc0dUd0hUSVhqbmNmVVpDVzJLb2d2T0l5QkZtcFBHN1NaaytQclYzN1pRMVBmVlV6OTkrMHpScnYvN1lNUzVnQTFnNTNXOWdZQUJvNXJ1L1BZTXNNL2YzajFhNzkrTzU0MWZiS0wxRzN5OC9RTHZrZ1RHUHlsMWFnM2tMSmhnaEZpVHhJa1l0RlJZUk5PcWJlcHJHV3ZWRXQza1RTQkpCVW9QVzFscVQycnlrTXRmOGR4eExBNUErYjZ5TENxZlZaczE1MFZZSHMrWHRYdHVLWWVhMUxYbVlvTVBsZTVIUzZ4bmxOcjBoQUxUMmxnME0vdnVaSVNxaE1VTzliOC9yWmZKN0UzQzg4MUwrRXFTWVhVRnBCNUhTVm9IMkM5RktHb0NVME1aYUFJQUtvbm1BR3F4cHNrSWRpS3VFMkNBNEJibFd2UC9ETTJBcWt5SmlFM1RvN1FZZ2daek4xNzF4blpnTUF2cWx3Y0phalNSTitGTFJLVStnM3BrWTJ1TUJpR01FQ3hjczVxQW11b015WU5DUXYvN1lNVEhnQTBOQVlQbnBFMWhuNW90OFpZWU9NQUhKa2xoNGdHSjhsZTlpZExNSzlqaEIxVjNLaEZIUzJTQUFOSDlWWkZSd2w4U0VkUk9QeERHc09oVW9jS01aRk8xMnM4NzBjYjBPc3lqMW1MK3hwc1hVWlpOTDZUODBOOTA2YTVkallXWkxkWllzaVFsR0pNNHhJT0RvaVJZUktCMW9nZUR6c3FPQjRINlRCbXU2b1BCd1RBRkI1YUxTMG9WMEFBUUFJQUJqNDlVRmJaeFd3VE45NkkyMXg2NWZWZXllUEU4Z3NiUW9aYkZ5SXRxcUFWRkM0MWVYNGVhSTBrWU9ZTXNrejNNSW1tRHBIcE5FcEdVU2NlSEJ4TlBaVTUwaDREek9Cb2lSZE9IUVBGTVpLZzFISzhiejJPcDBodVZ1SzF2Vm5GYWYvdmo2cnEzbXNhNkhTeWhabzJhVHYvN1lNVFhBQTBKTlhPc01HZkJwNWt1TllNTjJMNDdJZS85Lzc2bCt3a3FTaUFBQUFDNmJlVElta3k1aHo5dXl3NEJna25oSFBDaWRuYUlYTkdrWlB2REo5cVN6Ym5wa1RMdU5kL3ZNakZVZElzSTczTmVuMVNjM0xMWmN3c284OUlMbWozQ0s1ZWpCZ2pLS0xGR1F0RmU2YzVLODg3ck4vZk5mVS8vVmNWTG9PRUwwcVZzQm1iZ0VIeVNHaXI5dktyRjRBUUJqTVRVdFVub0hKQUE0enFWaVVQVUpXREloa0JLSVdlK0tIRUVXU3NYVFFNclNkRjAzVnF2a2J3bUptRlhEQzhaL3daZWd4Ym9OWmtjUnBuSlkxTEVTcXpOTGxkUGc4U3B5VVlPcEFVeUlXbXlrVjVRZitzdlg2bjl3N0hIaHdBQThUSUh5Tkk5cHdDbHdySXRTTTFzV3YvN1lzVGxnSXk4elcrTU1RV0IrQ1hzOFpTaHNZdkZsQnVpcmYxcUFFcUJBQUFBRVlXb29ZeXZHUXNDZnlDVzFnR0g2dGhza0hSQ052Smh1L0RaS3lleTFjVk1URzVsQmJldFA1OEtySXZUMlhiTmJmSkRHYmFhL2QwbkxNUjVoUStxb3hQWHl6eFlHSGVNcWlDanlLWmdRa0hJdnZGNVN6WG5CK01NOHdZaHVvS24wQjBhZ0hMMGtXYlZYZ01tS0daZkpoQ29BQUFJcE5UdGJSclZSZ01hWkErTmFidTRzaGlWSGswR256K2Rhcy9sdGM0NUlvaWpCRmttUDR4M2tpcmIrMHNZTEp6Z2drOTBrQ3FJZytsckZiT0pvMjJaYzEvdWp3K0lSazlMZXNMSHpDeENSRU1HeGdOYy9Sdi80Znc3ZEd6NGVsNjNOaXVIUERCcTNWaC9pZGdDaGRqLysyREU3QUNPYVNkcnJMRUh3ZXllTE9XbUpIQk83djBWRUdJQUFSemdsb3hhWHc4V3F0MDd3Vm9xL1RvUDg2ZEk4RWpiak1OTXFvVENhc3c5SkpvaUM2TnFtL09PdE1JR0pvajZiNXJlUGFvNm1WUE1OTG9rUktRY1RRTkp3RkJmRUQ5QkVRVDBqUnFMS3ppNG1sSTJNS2M0ZGt6VW52azJWLzlydVladHp0TlMwNlBUSjE4T1o4d3Uwblg3M1VxUHRDc3BJa0ltQUVpdTF6dGJid1JTbW9TZ0FCaUdkbGJYYVBKZkx5T2hIZHhlSEhmbkhQUUhYajdhcGw3YnVPYWxaRk1xRVJCVFc3bWlHRmpyZXkwMnFwcWttSzFvWVZUaUtLSE93K0xIc1NXZUJvcnlYZVVLaTVubG9ydXQxZjZKWS8vL29mL0w5L3hGRk90NTlnSHZ1SGppQkgvLysyREU3SUNPdlFWbmpTUnh3ZG9sck8ya2pqanYzNDlzTENBQ2NlK09HYXBWTHZYZ0FBQ0FseldGdFpPdzBCNTR5M1N2RTMzMjc5TlFVOG1nMmY3YzV6VkxIcmEwc3M1RXFhYVZrdWluRk5NbysvVHNuREwrcFhVUEN2NlVsNTlTU0pGUyt3YzRTVzhZS0VqMzhveHFrWmtrVXk2YkxuVkNkb0o3NnlQM0J2SGRFRUJrVEozQ3JuNS9uOXZLU3FvTUZhMzliMG1xZ09PWEt3ekNZUVRJNXNhbzBTQWlvSVJ5OGdHK1hBNE9RL2sveEVnU2s1T2RKbE5IS1dlWVNQb1dZWElXeGRPNDc1WG1iYXViNi80aXQ1WCtLbXBpZUU1aU9YazBXRnhkckdaMG5DS2djbUNDQ2dSaFlRaVZKRVVUbG1ENnhjL2hiT2laSEpkY3V2dzl3MWZjd1JULysyREU3Z0FRb1R0akRTVnZ3YzBjN2JHVW9aSHRjNlYvWE5WRWZjZGM4U3FhVktLYU13N2xsb1VESXNNVU1BUUFBVEo2QkJIR2hEaU5EYVZ4ZXk4SGN3ZFVzS0RPZGppN0c3K2ZsWWFqSnhBT1JpaVZzOTkwcFR2WnpLL3RzOTVxbWpzMkZvbXk1R1MzT3gwVFpVY1JHeTJKWUZkUU9COUUwSlk0Q2RyditxTFpIM1h1UHQ0MS9iTjZuT2V1Nm0zMTM3eGlQVzl2VVBEUUsrMitPU01sOUlnQkFBYzE3ZWRROWlzSWROdmFpdHNVRVlQQzRFUmRPeXNxWk0yek9Ga214MHVhWVhBV0lsSCtib1V1VUY3ZVRyK0JpaWdrUFZGaG5aOTBIektqYnMzbExJZ0g2UGV1UmNnNFB5ZEdpM0lQMlcxOHNFbEE3SHZKQjVpVXRvN0M1MTdBdFBmLysyTEU2WUFQYlQ5ckxLUnp3ZkN1cnYyR0lHZ2tJQmN0UTE5YmhSUkJCRWhRQ0FBQUVjM3pha05pT2hGUjVMQjV0cFFza3B2TVpjRGNsRmlZVUlDeks3ODZya1EyNGhLcjFXK0RVYWxCZVdzSW1aS2VWRVZ0aTVNbGlXejFOenFUTzdwRENNcWpJbkllU0lpQ09JVTJrWFFURVI1Y3o3bWl0N09JcDMyRmY3cmZIZmNjOFBTOUI0U3cwcVZYUEhpSjF2U29nakxIdGRTenFnSUFFaDM2cStRUlFFNHpyTGVaU3l1Qm5rZWNIaHRVZERTVDJxQXNkQklsUVBuMExQZTI2Y1cwc1M2KzN0ZTJYSnQzdXM0dVpZVmcraGhxajU1TEhHV0pCZExHMmRCUTRVbzdrV0pCcGtDdXc0UWFPcnU1clB1NzI4bHYvNFY1L2pyOFlaNXRqRTMrR0pjNi8vdGd4T1lBRG8wemJjdzh3WUhCbk8yeGhpRVl4L0t5eHVvU2pSM0gvMm82UUFBQUFvNUVoY29zQmowWVZXZGgyMytnNXV6d3dxTHR6YjExS1czZXJ3NE9HMElYYXlMSENUeUdHR2c2blRSNzFlZXlhanMrMWRzRFVudXZnOUxQNDBwRFFJa0h6TmRUVmZlY21CU3paSllVdDJJQnJhUGExNXI1bExCeFYwOHd3OEZpV2RTUGUwQmpoVEtONVltK1FaSENBZ0FnQkJ4NEtBWWtCTmFqUzhXVFA5RHNGV0daUVczdExINHZGek5HaTlOSHhoTlJVYlFLWlF1c21tUXRwcnFHVTJMMXVrOG5jSGZIdlQxRGRXNGtHRE5mVFJ3eDdNSjM3QnRTSFNBNTlScjRIUVNVanh4ZFlxMWJsNk8rMkp5YnZ2OVdoNEpLQlFtaDhJd0E0TUlBY2ErRy8vdGd4T3VBajFFUFpZeTlJVUhjcVd5cGxLRjR6bUJBMGM3RlZTWWhJRUFCemdMbHlyRmZ0czhNc1FnRmxEN3pVOU93SlR2TkFjTGZTTTBzeFIzTEZCQzZwU2FMMm1TR3RjZ1pvbXhzV0hVWHZWUXpjOVUyKy9YZDV3NHNtMUFzZkpha2ptTW1rZTYycEFXZG9SbWcxR3Y1YVRFSEhJYWU2UWVkaUVXMnlWS1FvczRDUXpURWpWenVOeGQ5M0dSdGY3djlYcXIxT0lZUTNnTjRxdUNBQUFBTEhHZTNaNko2TXZvMC9jZnBwWERMWkpSTDc4bndhaHh5RGdsZ2NPZDMzRllORlFnVUZXa1NwaVRVRGI2TVh0UnRlV2txdG4vOWFuU21mcGl2OXQxRmhwKzB3dExMUm0xOGR0U1FsaHZGc1RkRDlXQ05wYUU4ck8zRjllRy8vNnUxRy9WNy8vdGd4T3FBVGt6allTMFprWUhqSG13dHBLMzQ4L3IzNjM1djkva2dVbUcwQkhGYzYyMlZJbFVad2tSb1Q0aFhKMHB4azg0Z1FJTWxGUjV2N3RNNUd3VE9IUktlcDVNSjNGd1NCd1FVektoekxST28xWmZQR3RTdVZEQVltQ0JVVWtMU1cvVGgwNmVsS25DeTUxWWdsM3FNaUlSZzNOaU15VDhwblFNMFlwa2E0bVFZWkFNcTduZlJYc2k5di8xUFp2WlNGbE5SMG9XdGh4MElqbzVCQ1pFRldaUm80cEJLY2NvZ1NVVTBPQ2xWVVoxUWxHaUFDd1c3VUpJaHB4b0l6V0VsejFkUXFISS9kazVUbWpZRUVOWTl6S2hQN2FiMkF6MlkxZks0U0ZJcDA0SzltY21NamQ0REtjdkEyWWNjOGViN1dzRGhvZ09BM2cwa0JIV1VITmdhZUwxcC8vdGd4T3lBRC9Wcll5MHNVOEkyc3UwcGthWHhSejVnWGhCb3FxanZTazR6Slk4Z05aWXFESkxkWkFBZ2ZEUzJkeGlHbkxpRXhIZVFxYXA1TkxJdFFWTnk2OVU1TjJjTVNtby9ZeGdLa0lHVVJBMnNXUG1mN1o3TlErS09oMDc5Znl1NXZ1REhuTW5haEFxOVF3eUl6ZytyQWdLR3RoWkVxb3ByTlc2bjZYalRLeUdPKzJWOThzcW1Vek05S1dwK3QxS1VCQWs0RitXWnYvMW8xL0wxQ2VmeWJXM0hyOENVUlRSVUlTa1FBM1FJN1lTZ2JxR3FGZk4xVEh5d3dVNm5GWTRONzVLcTUvRHhCaG92R3BHV0xSNExlUHBOZW1sWDJZOFZzYVJDT3NyWEV3czRvVXpDNHBNSk9yb2pKSXFzMUpMcDdkbmRLdGFoYjcvdFJuUEZtekttdk1tMy8vdGl4TjJBRHBtWGU2ZU1zY21kbWU3ODh3M2dVbHBKaFFoS084N05ING40bW91RnFoU1VtU0FBQUJCSWpFM2ZaeTdjRlM1d29URUlNbExPMmMzb0ZmU0tRSGhZMkQwNHMxRnZUc1VUWXdrUjZMbFF6NTJlL21ra0lLSTBRY3duSmFSSjNHa0pKbk1Lb0dBVmh1UWllMEtCVTJ3bVpsRTI1M1hSUE1WYkc3RnNOb0Iwa0FWM2psVUtkNjNJSXZuOC96dFZ4Sm92THVPc2lGeWkxRUFDYTJVRXBQY2xpc0dZY3AzSU0zMElMdkJOQjZlaFJ3WUZJTVRSekVJcnhYY1ZiYWtoK0tmdHh1Y0l6MWxNaHRQSHhZSjJVbGJWenNSZ29RekZTSzFhaVNpNnA1TWpRcWhVZnk0WmxJUmFaS21VMVJaV08wemo1Z2RtdUNuS1hPcGZ0cjdmdExtSysvLzdZTVRuZ0EveE5XdHNKSFBKdHpBdXZQR1dHV3NQdmI1dW81M0s0VlBmazdqSG5WVC9KUkNBQ0FCQUkrZ3pkeG04ZFY5MTZ3OG8vdU13ODBscjhBejloakVnZXRUOWJDVTVVTi9LbnFXRGcvakV1dUw3VGEwTDlLOU9QOUg5TWhwYU9idnRPMjIvMmlxdlVWcWVSUUxZVUY5Q2NqTHdTQVlCZ0U0K241d29MNndDQVVKUVFUbjdCd3lmdk5INGxrc3pUbmE5eGVlVTFlY0htNUM1QVlRNDZaMjZqYlZUdC8vWWdBSTl3K1VDQ0ZxZVQ2SklYTHZFUkN2RXBnREk0c1pZc2ZBckV2dGJBSktGWjRwRGNBTFBTTEJFa2dpY0U0ZVRRdm01K09hdE1UWHAwTFJoNU9LRlFweVhaTm1helQ2WEMwcS92YWpES25aSWRZdWh5bXIzTVZUS0t2LzdZTVRvZ003UTIybU1tVEdCOEp2c29aZWtNUzdDR0lTRHhwQU9pRUM0T25Nb093aFJoTFdyRDZxUE1yNVJVdlM1aFJwRFFvUlFWRFFYUE5HcjVlWXhWbzFpSGlWVkY2MFYxT01BaG9BNU1tUnVOSlh3Z1JjTWFlYW5idkJMT2s2NGFsTUxkSjlwN3RIaGF5ajZ4RGg1Y2RSbVl6Tk83bTQ0SVhoVkhmdDVqdkhydysvNWRGUDZiSzcrRFI4RWFmS3JBSWNnMkZBWWNNRk9wN0ZUTGt2bHFJSG1UcmhjbllLaHRKRmtBRHhmenN3c21BWFNpZzZWVGE0VlZob2dBRkFBcUR5cDFuY3RleWxaUEUxdzZpaXBGMVVKQ0d3Q0s4cktyUVhmL01VVk9kNGtWd1M0elZZRERpd3dnRlhXWkpVdHVXWHJsY05IZ1NIbkxsSDhEVmg3bUVvVTUvLzdZTVRuQUZQQmRXZHNzSFhKenlGdU1ZWWdxSGxjdDM4YjlyK2Y5WDkvODZORTNpRlUvM09oc2hKcGw1L0l2ODUyb0ZQYU5nZG5sVVFpSUp4dHVjWHM1UU1CTnl4SGNRY3Z5WUxxWlJ1S2hnZUllaTFNbTVHRWNaRFp1NUU1V3ZpV1ZtOW5TWE8vVHJ1MDQ3SHJ6S3hEWDFuQnZDbEpvTGhvNlpoUU9qa21nSXcwTVVTcHFVUHFtTzFwYUh5WThhd3g2Q3lHcGNGYTRLS0FZdTBtMHM0UXhBQUFBQUE0UGsvTGx4aDVuNWdWeloyb3lsd1oyekY1REg0WER6R296QVI4MmZxZlM1eTRrbkFUQ1EyWXNGWm04dTFQOEJKcFRMSDdWdEt0Y0NTSlFFQzNSRlhrVnBvbXFTNm5Ja3Z5MXlZakp6TC90LyswdktRMS93YzhrNitYb0lTK2RmLzdZc1RXQUE1QkEzR01HSEhCcTVMdU5ZWU0rUXdnQk9INStWL2lkTit6dS9iVkdEaTFHZFJUQUFBQUFCZ1pXSGxlTm5jMTJFTmw3dnd2Q1Z3bUlVcmxQdytsdVVLT3ZKTWxTNk50QXJBMWFGRXVGU2VCdVRSUmFTdXVQVWpHWjUyc2p5RjJkM2QxS3B6dWwyUm5SSHVtZVMvbzdYVjJkZFVkRWFqZitiOXFVM2RXUjBNOE1wVU5kZjFCdEpCaWczTExESkllOHpORWdBQUFaMWpPeTdUUldOdkR4c3kzbithVzEyTEtZdjVLSHRhNnlpUnFZemhvVXhjT2l5N3R6UWtIZ05WNEF3TWlxY0dDZGNpcFd1bU9aQzVGWmhpOU1yZCtLZHMwMUhBbWU2TDJYV1dvR2xQSlhtMUVaVmVaVmpMYXoxWWN6MW5FT0Y0MXUzTElKY2JJRTAvQThUYi8rMkRFNEFBTlFKVjU1NWhSUWRhcExUR0dEaGxJRHhkeDYxTFJkVHNRQUFBQnpnRGNLa2NWaDQ2RXk1VTdxd1Z0L0pLeWgwYjB0ZnpibEkxTzhvUmo4UEEwR1pzdFBWeFpLeGNBYXlxUHlDNmRsdExicUgySzJsOHJyNjZDR1hNZ2dwNGZBUldqUjBlR1ZHYW9xRVJGNzhvNXpnWHo2ZkpQYzlYbjd2ZWJYczYyME9GdXE4UTVoL0tEaWkzWC80Vi8xbjUyRmpBSFVrQXN1Z0pYTU1QYTdENFJOZURQaUcyQTlzdkY0VHc4SzFrVHNaa3NYR3pnc1NMamdmaFVlTUdDNzF6UnVjTlBSNDlESEJyck5hQTRzMTAzMFpNdENKcVJ4aUhpWkJCRVN5NWdkajlvcmMraTZQbVhvNDl5TVJTQW9jRG94ZzVZZTF3U1RpNnRqaWdYZHBidmZLTC8rMkRFNkFDT0xWMXRyQ1JRd2RpZjdHV1dEakRoaFRVUUFBQUFqa21WSzJ0UGpLdUpVOTBIeEo5WDlFVTVCSTVQeGNFNVdZaHdUWHRPUndSd3F6TWxteUl1aHl0VlJ0MWJxV2pzK1h2STJMS0ZrVnJmT2VhVVpRcTlrTHNWTlFPVWFQMG9HOGloNWFpNVk5eXpURFRpeGRZSHpaSngwVWpFQ2s1Z0tCRVBRUEtwb0pIdkVkNkk2V2xJaVMyZjdRRmljK2JENU9mVDUvd0l6dllxLy9zSTBLMnlpQUFIQXhMc3RpVGN5M0EvRDlUaGFIaXJDNkgyNXpJRmhrMFpCSk1uL1pPU3lGUVJpa29jUVJZcW9XNDI1dGduSm1LYXorMGtvWTN0cGJCVjB5ZEFoUjRhQktYazhRbEhYR2ZvdEQ1VUVBK01BSlpTMk1OM2tGR1VsM2dZbUlDYmwxYi8rMkRFN0FITy9NOWxMTEJ4Q2NhZ2JPR0dEWGhxUVltVFNuY2hMRXBwR1RVQkFBQmdKclVqRGNpazRMZWhpbndoYk5oQ29TS2MzS0dweTF0QnRjN2FrRHlEZExBaVNvVmwwYUpGQ0xiQ0FDT1dKMXBSKzkvNTA4alIyVHRaSDFzYlhpQkpsQVp0Tkl5RHArdktWcExxNnJIcnBlSkxTVmVwR1ZWN1hmenJUamZjbHNldFE3Tk9vREQ3TENicUVURTJZV3YxYTdMQkswNHdBQVFCMC9ObzZxRGZJSXVTK0lXclNlaDRjRFE0VngwNEtJdVFiNDE5b3ViT0tHUisyY3VJb0lIemlCbzdYdUZpSElvM2xTUzNoeWlBUFphRnozK1RyNWRQOVYwU2pqTGZYU3lkWHhlbFUvMXZHMWtRU3hvbTcxUElVRmdzS0RFcURtUlNFUVFsL2xrcERBUC8rMkRFN3dDUk5TMW5MREVMeWJtYTdqRDBqYkFJMnMxQ3RVb3FFU1RRQkFBQUVBYXFSWEZ2WnpPS0ZVTHN5RGNOQnVQTld3Y21nUUpScWN3em1aYk9saVhVMVUyR1d4UVpQZGlvRWhJU01FQXBpWlJyb0U4VldsQ01CQ240N04yUjI1MUIxMnZKOXJ4dFUwcTJMcmNqMUcwekFCVWxHMmJCdUdGMUlXZlJBc2ZFOUJYTGJ5ak1LUTRMbVZDbkhiMmk4T0dhaHdqWWhZRHZwRjJoMk5GZ0FDd2owNkdIQ29Fa1c1YU9wVk9ha0pCNFhpM1l1Z291ZUVoZTh1NkdHbnBxZTZidytlemJLck9mdnAvbWZTTE80ZFNRTVRjdThmNnpDUldXQTVoQnhZc0lHZHBxUW1zTStSeUxHc01iTUhRVUpFTElxUkVjOWRQeXovYjNaRDFNOG1IQVk5UC8rMkxFNndDTzhTMXZaNlRSQWRLZXJmRDJHWGkxaHNScG4yelJaRFlPV0p3b0FJRFlRMkFNOVBGV1RNZ3A3bmF6bUdqRENaVWtqMVd3TVVreC9oUVdGMFh0TlVtVUhWdWJOMnhRdzZMUE8wNUZmKy91bjlsZVhrZThlcnBUelJ1eGdzVG9CU0pndTBoUUxXNGFIUk10RWhEcXZXWXVaQkZLQmRLUk92ajBLSkN4aW13SjdwNUhEczFTRkFUNm40b21VbVZHSlF4VDVMd3kvMzVHR1pVRWV4YWpzZjkxY3BOazFCazhoUlEvUUUzVGFDUVFBSWIwTTNJeWZSS1djek1TMVdsV1BEc08xVFIyOUFYWlQyUXlieXZTTDFmeDVNMDhkYWFKaUdHSXl5SG12bVo1RzJkSXBFS0E5b21rQnNBZ25YSjZERnhmRjNZUVJjVCtpREpJakg1aG9JbEEvL3RneE8wQWtBMFhiWWVrYzRIRnFLNHc5ZzE0MkNJOTZST0VoS2hJWmJXMXlzWXMyR2swMzlPcUYyMTBJQUJRQUNoUFpoSFVxWkkzbEdTazM1MGtqMUhEVHJVcWM5RUJzdHpXbTlyR29ITFM1M3M2bk5NU0lJMm5UbWVkUHI2YWcwNXZaZktVbDB1NktKY0xvbXhITTRKazhwRzFzNWNzejBTejNwdWpLcXA5emFpWlB2S1VSY210elZYRmM4eWtnQllRaUFBQkFQbWROeFQrR0lXTlhKVmtQaWlyYkRvbVRjVzVXcWwxS3c4cEZwY2oxRXlTckNuQnRzbldRRDdxUUlqSEtSZWQrRnQ3UTJlWm54NEw2aWIwa2JaKzQrQkpBSEpxQzdLY3h5Z21WUFJLSXpHZ0swOGNGMmU0S09CZElRcUlndUcvVjlzck4rOTk5SFNZVENkSTE2TEovL3RneE93QUVqVjNjWWVaTVlHc29HNnc4dzRnWVlHWXhnb0c3MWNSVlFxdVdBQ0FJTTFXaTJOb3gwbTRxdHNMa2JDWWFqN2FwVFhVaFJyRkU2M01TemRpaGhNVUtJRDhkaUlMSFlnS0toQWFpRGp4T1kzVlNwYXBlM2oyUjF1dEdsc3dXUEdIMGNLR0R6cGlobG5RWk8vbHFTOG53OTFKcWkxQVlJS2hXUmlPVngvWXRxejJSV1pHbjhpVS9vK3JuRjJDQTFOTnl2MUEyS0FJeVJKY01xd2EwODF0NUlCbDhZdk55bm9mbjR5a2E4Qy9uUEoxQjZlWEpQa0xKNGtHUnB0QUtwc0cyUTJteVVqSm1TV1RMa2E1cHRYSlYyN01rczBlbWpDNDNZY1BEMHM0WEhLa1hRbERSRHJxbHlQc1BEaktHTWg0OUpGZ2NEKzZhZUZyb2FsblZhUTAvL3RneE9XQUROVXhkNmVZVDRIMkpLMXM5Sm9Zb01XTk1jdC84VnRmUFA4SmJWcjdmME0rdzlKS0IvUUFBUlFjQU9yRFQ2clVzdUc5dVJGRFlTeWFUeXRDU1E3T2drQklYQ1M0a3JuMktlbGRQRXViWjV0RFBTdVdnK0ZxVEpMNjVPcFpibkUyamYyOU1jMzI4YjczMC9rMlRBcllLU1VxUDhkRjdWMmlwQkNxbVRzZWk3Q1FDV0VCVjE4aGt5c0RVSHdreDRtWUxEcHR2MUtISFhqSlYvSzFrRmhLb29nQUFFQUJRU0k1M0U0U1hIV1hNdGpwZEZ0Zm55K3E0T1NKWm5aN3ZRaThLNzBhVTF3V002dkx1Z3pKeXhjdk1zaE9GQkdXcjB2VWp5dDh4VmFaREdVWmFhUGYxdFdWVG83MXVyR01xZk42bDI5MWJkY3lrUC8vWlcyTWFqdTAvL3RpeE9zQXp5MWpiV2VnczhJRUxtMGhoS0lnQ2V5SXhoU2tDMi8xQWdBQURqRlFzRnpZT2R4bFQ5UUZHWUNrTHJ3ZS9NWGc1eThuUUhSUFJEelFiTWtsU0EybUgwYTVOUWZNVkExVUMwaHFKTk5rdjNvMEZ0TGR4QXFZbDRSdE5XVVcycklKSmU1U1lVVWs0dUhTSXBJR3Z0WnVFY0dCUk9nRmdqRDJ2UUZHaGRCWno3ZC9KcWRwN1h6Qlh6Ly8xcU81SFNEdUdJK3Y5VHJLNGhCSUJOQkRHOFdFdlJvandRQ1NXVHZNUkxMUi9JYTJwdFBrWUdLdVhTaVpya1ZvRTdUUXdMeUUyaU9TRWJsc1pFa0txQ1dXL1ZKRWVFM3VidnAzL2JpV1V6L0lpMzBOVkRFM0R5dGQzT0lmejVsMC84eno0ZWZjbDd1VzNpLytuRS9BRlRWOEVrTkE4UC83WU1UbUFBODFDV2tNTU1uQnFURHR0UE1LSVNPNGdoSHh5d2c1Z0FBQUFNcUpmbDNsZHFqWU94TzB6NW96UHBaSzNWZlY0V05TSW1FdFdIbWJicEp5VjVWckVsdjNLdExLSmZYU0xPT3gzSGRyTmRrSk4wdzc3Y3pUL2FUZVM3Unl1WGxKYjFzV2xQK0dnU3BnMHpmMkI2ODNoVzhvRk1wVFYvMEg3M25uOW8vbVgxbXl5M2g4YkM5L3p2aFVQdUsrWnRUck9XRGhZb2JUYmlPVE0vai9aeElXSHFzOWRPWnJHSXNqZXh5QVJ5MUVFbUlDNVpZSytPZXlxTnhJTFpjVk9iNjVja3lyWFN1TEE1S2JVZXNHaTFTZXU0bE1XZ3dHSlVVQVd1MmFJaHE3b25hWG1YZlJDYlBPb1RsbEJqdW1UcVduOU0wc1M3dVo0VHY0VFBySHFPVFgydi83WU1Uc0FZL00rV0RNSkhOSndyR3M5UE1PRVZYanJ2b3JaNHhQVG5QRFpXWVdXMnVWSmhlbDY0a2NaaFNCWUpxYlBCbVVaaUFPbUFOYStzZEZrNllxRkJYVTRnek5BQURYb0hSSUd3aUFCbDg3SWhUNUtMUytPcGlqSXRvcE1XZlVyeHRUWDE3clUyWjkvTkZTWlVHRzFySGl1U0l6azF0MFB5VlZoeGNsSlNhdXJsK2ZLNzU2YUVkSUdvTE9QVDdPZWFFTG9qZnpOVk5WQkFERytSZWg1YmVDMXZHd1FiVUNFNC9ZODJHQ1ZWT1VNaUhWVUJCeElBSVdEY0E0SkdBbmNJSVVSRklUMms0cUpSazZZYlo2OHU5a3U5R0xML2NETzYrcEpYTWlJNDluOHloQ29UbDVoYzZxS04wR2JjSUVaN0c2dEs1eStLdk9hZG82NStQZW9MQVBQLy83WU1Uc2dCSjVuMk1zR1pmQ0NMT3Q4UEdhZUJkLzBzVFB2djRYdTBLMWt6di8vMzk3ZCtnQUFCWnhrQk9sOERUUTgwVkVYK0tUeFVIWlBDa21DbGdHMGFIeStvNW4wRHRsaTFwMXhuWGs5RXA5Y2Q3dHNvdTZuMHRheTVualRxN3FhRHBRVk0zcWtQYUowWXYxOXUrWkdicXhsUEJSQUw4ZzFnN0NscFEyYjJtcE9RWmFJRGJEbXdmb1lEUlZjSkNjRmcxaU5Ka3hIM2IzSWhMUUFJWmc3Z0dPY3NCSjB0S2hMWWhhZ1Y1enBOTUxXS01kMjJ6cHNQODRsWXU1bEFHU1FMZ25yY0R6NHBDTUJEUWIrYXdnK1J0dTI3WDZQei9nNGdKR0tlUUNnTU90ZWZMQ3djKzdQQVlXaHJGNjA3RzlyMU1tWDB6MS9MaCs3cnhYVkorY2Q3R2RBdi83WU1UWmdBMnhVM09HR0hFQm1aV3UrTU1PRVFHYjBGNUtOZi9EUFkxNWYvM245NDU5Qm4vdTVkWHhhNU5BQUJCWWhLNVJkeHArbXIxMnB0aXBXa3l1dmJndUFhR2R5N2pPN3cxV1BOZ2VibFpDc3FhSGJOSHpsYnFaNStucmxDaGxlbGZiNkZ1OE5wKzNVdkg5cWxyMzdKTlNYQXJXaXJ5UEV4eTByUnVwRE1mSS9tNzdtMVErKzhPZHJGdXRXUzU2d1lwT2R5VExMNGRKUXhDak9RTzVyQ1g0c0RINjUrWVBTWU1paG9HMjB1cFhyeUVvMEkwb2dnQVZBc0pwQ2MwV0VNRmtRaWxOMGNCTFF4SEs5WVRzQ2hJV1hoYUZCUnlySmdrSmVUQjZyUzV3VTBlWDFRKzNSa2xJaTR5bVJ4OTliU09NRkJDcEJsb1dsaUpWd2VORGpiNmx0UC83WXNUbmdJNjVMVzBIc0d2QitoOXRvUFNhb2VDa0p5TEdlTVU5eW4zaUM1SnNOaUp4NkpiS2t6VHBKWFE0UkdSQUFBQUFFd09OVGg4cGR4SFFIS1RaSlA1RG9QS0kzazdieXhHa1JNRStYM0RSaGhOamxKRnJQQmJpbU1aZ0dnWWk2RzFWTXBWS1FQVXFEWTNPdGd4L2JWU1I0R3VQb1hDZno5N0k1UzJYeVNmUVpVZ0dlU29vTWpSY0JYZE5FcWNTNVhlR3NsYWlnQUVCSU5JRndxNkY1Sjh1aDYwN0t1bFdYNmhjbk5VSzJWeGxqcVcreXhvaERYQlNLUlFPMnlXeUYwYThNU2JqSTBkQjlJZGlMaWpmR3kwREs1TE5Fazg4KzBHRUdQYnU1c1pCZEdEekhVVUFrMFlJMDJya2poVXJOZ2k2VlZYUllUR1N3U0NZVkQ0STR1MU5KNEQvKzJERTVZQ1JQVzkzakRCenlaNlRyNzJHSUhEbXd1bXIwMkNsRFJaaWxvOUN5T3NLSUFBQUdEbkw2TDlVcHNtNTlKNDZwazZkVDQ0ZWo0eDF0RGxIZHR1dHNyQ1VUYXNxcDJBRFo4SENPVEhGaUwxNnhoVWE0ek83YTdCWWhtaGtGR1FNbUxJS0VEakhKdEJRcEF6bGp4NG9OaUNqeG9ad2lMZk5mVXFMcml4MEx6bDl6U1RCMHR2ZVRyeVJjN1RCWGluWWNwd0xpWUFBUWNoUHdnS1hScVFKZTFISTlNSm1QOVZMRDArbWxpVmZvbnR3bjZlR0V0eDBOd01nSUZSVVU0cXR4ZWlvWUhRQWdJaVJPYWtmYVdFVDdqS3JraWp0WWREQjdMMTJqbkd3cWg2SmRReFFLR0JxZ3gxQmJ1Yzl2azgyeTJwQklkSFhXNitwUG9hRVJxWkNRWkQvKzJERTVJQ05DUFY1NTVoeEFmV2NiZXowbTBEa3VmSlZQeDNvY2dYSENCdHd0WUJWRWdBQUtqSlFHSXEwb1RVZWhWbytLekgwS1hDQkdZeHVsTTk2MTlkVkNnS25heEd4a3RFWVVwaVVXcWxrOFRMbGgyRkpMRzdwZzVCQkFFelAwOGpmN1o1ZjlsVmU0L3d1MmNwRnk2dWxPQ2JaU0NMYW5PTTMrWC9meld0NTVYOWZEaDhOVkJHd1N2S0xPOG4xdzZkdGE1VzA2UU9zRVJwakFCUUppQUFCUk9RQzhOTkNUbVBOaVFBWjQvREJnUlM0Umtqd2tEeE5xbVRZQTlDV1JybjM0c1VEeTRWOW9XVEJSN0NFVkRRRklscWttc1p0WTNBek1pa0dKSTg0MUZVdkVyNU1PcEE0QktKUmpOUzZ4Y2J3cGhZbFkxeTFpSW5sUUVSZWVCVVZKWlgvKzJERTZZQ09jUEZ2aDdCMGdmU21yV3owanBpR2krSFN6MUdhNkszSTlpb0FpQUFBQXZTZDVwQmRaMC9iYmUzQ1J3NUNpc1N6cUlvaGlIUjFHVjYxZE9oS09uQzBQOXpvYU5Qakd4K25RV1V4UFNBMVhyRnQ3TTFXdkc0VlFSWEZoV2pJRW9vRVFNSERqSklDd1lrQ0JxTHNoQXdvTS9ydXlGQkNadlU3OXBabm1meitmL0w1WmJrT0VVdXpCeklUZzg0TUJ4NkRHVlJjN0pnRlVFQUFHNFFEK0RWU0xBVDFHbDhMYXVDTVBqQlBSa1lVbFJxWmxiQlZXbVZTeDF3OWExc29tRnpnbkZDeWFhMFZES0lnVkpVYVFZVEVSNFlSaU5sZWMvTkcyNXJVZXlMbFpFaTdTVCt4S1V6aGxwbWxwN0thUE1iZmNNenRUSThLRWlzTWJsRVZxbXovKzJMRTZRQ1BOUWRyWjdETHdjNGRMVGowamJBQ0dJSmxCUWdJd3VHMm9YRE5Sazc0S0tTMWNBREFCVU9QY1d4VDArcCsvVEluZCtTVnQ4TzlGNkZ5aTI1U1FsdGlVQUFEYVUzTUV4Y2t3VUpqb2N4SnBMbmlwekxldzI1UnhOd0d4Ky90ajUzbTlOYXZqRmE0MWlsL1I1Tm0wYnkwdDg3K040djhic29YME5sUlRZWHhEeDBJVWZMWW5sS2U1YXBSVkc2Y1M1YkZmTWg1eVBVK2RiMmlOQzBkTFVyU09aTVN1SWxabHBrcGcyTUlVS3ZjNXZjUHRxelpleE1nUjFEeGxSQW5LbUVTMFo4K1lQcWJpVC84MkU0Ym1SUDIxaldTUUxsTHpIbUpuamp2MkJoTUNUd1RFSUNBU0FBYnN2cE1ZeVlQRW5SZUMrMEdaaFZRVUVsaEoxcWlwcHZFLy90Z3hPcUFqMVV6WXl3d2E4SmNzV3l3OUk2NG5VcFZ2U0o0dzNxKzRRMkFiVkpQZHoxby9aWTZMWXkvWEZFRnEzM1VXZDRDZDBrN1d1VjhaTTFEMURtM1RxM2NkWHh4Rjk5akJnczhMTVRRSmhNWFQxdVZqQzJ2dlBJNkttTVVsR0VDQUFBQUJYM3FXUlZya3hwcFRvQ1JDVEM5S2dwMWFIWmE2ZlhPYTdYdWlXRGtPVWd5Q3ZIUUV3cWFURUgxRXpLYmE4aTJtTUhOR09LTm03bVZZT2kyb2xtMkxxNmJYZ2pkWmVNWWVBUlVrN1RDZ2xGUThWUjRWRExrbkFpeEVlUGZGRXhWeTkzVnlscWJJVGloQUFpQVUremw4TEdyaHNrNEhVVkZsOHFTWWtFcEZoa2FCSmF1aEtKTFJ5aXhneDBpdHpWZzQ0RXdaanlPWDg4a1J5YkwraW9oLy90Z3hObUFGRFY1YzZlOU1jbW1vSzc4OUtFdzgrdWFOZDVmSnNJd2RWZFU3YlMvLzZXLysyWkpWRktDRVFBZlc0Njh0eFN5MmVOU2F5all2SDJweEFFekVCSUFDQUFsU1dnYkJxSVVrUlF2MG1ZN1pBU2lZWUNpR3F5TXFuaHoyZnNFR0xVMUFzTWRKVG5WaGppS0ZVbXJpeXFzVHovNUF0Y2ZrUGJFY0FrdFY0cnN4eXVnaVZjMVZLa3dnWGEzb01XcDdpeDBPdlVJVEtpTTZvUUhOTG1MTGRKRWFTZlM5dFp4SzlRbFloQWlCQWdBcWFKSjFwWlF4UkVSRmNJbU5MWVkzTzdReWgyMjlwczg0bGNwcHhQNThjdUFneDVmSkxsaTNaZlZzeE12WC8vc282Kyt0MjdlQ3oxcWc1QnR5U3RwQ2hVMGIwa3VuSUJRaEhFWUJBaWpZTHQrLy90Z3hNdUFEWVRaYyt3eEJ3R1RvZTc4OWd5bzUvK2M3Und1aXBNWW52c2pKNE53SjByYlFXZ0x2bi9pYzBFWnpoV3pRWnNkKzM5ODFNaE9aMDJnZFpQS0xLempnRUJjc1luSFhJNUowbkp0U0xhaXZLWXpWZ0F4TFZBSHFIK0JCT1VzZ3VXMHdrMHhtOGFiYk1hNmJ4SGMzSExYOGduOXRLS1EydVh4dTd2UExhaEpxYnl0YnV6Ly81Yk11V3h2MDY1WlNCSkszWlVKeE82SnowcDFzckhUQTVob0NDMkpqejF1OFhsZmF6T3BXdXl0YXUrNnZpeFJ0VEszVHMvUSs0MVR3aGxsVzJsS0lSTkFJeEVBQUFCUktIb2FJWW9BZXdOWVU0QkFmQytjaVVFcTFjdmhiK1dxWjdPUUZmVG12RlkrREV5aFcvK1AvM29PLzNhZHN0blE0LzhkLy90aXhOc0FEYUROYitlZzB3SmtNdTQ5Z3lZeEJVUFIxM2g1VjVqc21XWitnazc2a2ExbTFPdGNSRXFtNU5jODBXQXAzY3F4OHRDS0pWc2NtRXlWc3dPRUFrVXdBUUFwVk1RVTJYK1RiVTVBUWs0OVFoc0ZOU0d3TFFxRWd0WVF6VU9oM21COUV3cWR6K3l3MWhKVkRZdXUvNFZ6aDBMMVhuVUpZY3o1cVltcG1hT0JzSUY0MGdRVUhYNUc1V1BRczJjS0NIQUltQlFXWXhwNFVjUHJJRmhkZWFaK25ZUldnZ1JFbHFBYjNPMEJtQXVFNkVmRnFZaTRIbW56NFY2Vm9leXE5RWNJRnZsMXlET3h1VkR6emNQdTdBOWFIVmlJMUNZWVFtV00xMi84ZHo3UDZlbWhTUkRlMHpla1hQSlpFRmtyQW15Ly9obDUvbjg4ajNsVXk0N2taUlFpRXYvN1lNVFFnQTV4WFhYSHBMSEJtSnJ1Zk1HYUdEQVlsejh3eWxNOTRyenRlNys2ZnRYRkEzVUFJUVlBQUFlVHdSZ0lPZUJoeVBTeEU5UktOU0ZJU1dNS0E0djJpQm5wWHUveFQ1cEN4TkY2bFgzRXNvaGN2ZTUvdSt2Zm5DOXFIYlVRYWpDNXZtTFRXRlpzajJvcVpuVWhDVzFyMFJRNTJKVThPZTdvL3ovS0pNL25sRm1SdTVONThPSUFCaUF3alRCTjh4aGVwbVVjNm9POEFFQUFBQUdiTndabWhYVmFjcDRuWXRxbFNyalN2SjZZc2FXa2tXTnY2Vm5XYXZTNVc3blEzek12UDVhSFp6T25PYjcvdTMxWXppTnpva3hkZGVERmVPVUswckFrYk5MeDdJdHkrODBkTDYxT2ZYMVNaa3JnSGdZcWl5RU5WeGE0YkN0S05WRTU5M2M3c3YvN1lNVGJnQXpRdFhYbnNRakJ2eVV2UFBZTmVlRzE3YzYwcU16cWhMOXM2WnNueFV0dUNZc0hRKzNFYkp2TlJ3a29FZ2dBTGNUb09jMXpMRHRHZE9tWUJScDlpVGkrdTlvNWN4bnRpSnd3TjhoSlBBTFAzdnZEYW1jeW51dEpVQ3FiUFBaL3VoS25iS2dMR3E0S3pIcjc1RDRaUGZ1bGp2aGVkRm9RYmN0b3NEVDF1TXZ5NFFXMmExUFNCcXhBZXdyYUtMWXpjaGRNaGpKQkFBQUFBT0gyRXFDa0VhSVdCYUVaTnlSQW9sUm45TkYwUXRMRml3aXp0WWRpTE1EQlVSaWtOV2FicVdqMkdxZFQ4eElwTmZwSzR1SWhIeU1PRG9SQnpGZzZVTkIwSWFob0Q4OTRyMUNjaTJ1U1NHakdxaDl2VFFzcFUxR3N0dzNNOUwzcGRYOVl0ZlBIRi8vN1lNVG9BQTV4T1hIbnBISENGaWh0dFBZYU9MU3Y3ZlZmQ254MjNGLzZXMTFuUE9qUFFnQUJFZ0VxdDBRbVVsSWlra2thMXRpNmsxZmpDWVZPWlpSTjZUUDVERnNydzJ6ZUdDUTRCTFdlSlZMMEpkSUFYbGxTeFg2cHJ0RHg4TFZhQ25oaGhvRVBzeVhPb2U2RUFXNFA3bmVpMDFoU1p0MFUzWkpHSS91amxkZXBHcnRQYyt0Y2xWYVZSMnpaenA0elZ2OWwxaDVvMWJ4a0U1TWNwNW10TTBsVER0N2x6SFc4c0sxUGQvdG5PNU0zTGVPODVYS0pWZDVMZVdidlBxL1Z0WlhLM2JHZjkrZWtManV1NEVDczFmT2N1YnM0MmQ2L3Y3MS9mLzdsNnp2OTQ5NXZ2ZTU5bGtpa0h5R2VzVkgvbEZhbHBwVmgrdFcwcXdBUUNGbG9kUUFZRHYvN1lNVGpnQTAwMzNHbmpORkIvQy9zOXA2QUFFZEFrTWdNZzNFN2tNM0xUZFQwSmp6MlBHVU1EcDJkNnRGSEZqWFVneU9GNmZTRVRtZTIwbGU1ZTNldXU5RlRaUHJyNC92aVV0T0p1T2FUbi9TWklTdXUzNzdxMFhqK3Z2aUl0YS80a3U2bDBsN1RmMm9zUThmSXdPQWJueEJIQmd5QlF6MHlCVWNNY2RXbUZtVkVNaEFRQm94c0dFY3J0QWtCUTZHazJOUXQ3VW5USVJKd21GRzJkbEJGSmI3R3NOaUJ3dXdURXdlZVFtRnBXb2xoYlp4WGMrZXBMRWVsMXNZQ3NNNjFVQmk1U0lJTUxvZHg2VDhLN3pwNUxuOFN0cHd3VHppaDBuRm9xckYvdHhYVnYrcVJwOExNM3NNNnR4MFM5cmVOZGROa09zdXJvcEFBQUZPclFXTmdOamdFNHYvN1lzVG5BQm9kbVczNC9BQUIyakp1ZDVpQUFXUUVVa0E2YVFDNXdrRDZaZ3hvTHlSa2IwK1puS2JSREdQRzZiMFMwRjVCclozTWpYSTAvODFxRXQ4cU9SQSt6YmpwM3l1WnhmbnhKTi81RGhRTUxCb1hLbnc2YmhaYXcrTm5WQ2phclpFRkM1UnBBS1BJcHlmZWxZaEVabVFqQUFBQUZSaU4wQnlJSWNxSUw2M0U2VTY0TDhkamdiNGo3SmhyejRvUWduZVo2WFFqaGM0VkhWMHQxZUxEazR4ay9OcmxVdHpQTWdOcGhRZ2M1SHJLNEpIRlZiU3lYcjVuVzNkWlZadEhxdEpWMjhsM3VpVnlBandmTXJScDZIZ0F5YUZwQnFVUzBUcmVPc2dSV1ZFRUJvQnREQXV3anNWZG1JekhHYjZ5YkFNQUlZUmhobEU1Sk1qWGJhVFBXMVJtWWxMLysyREV1NEFPcFBseng2UnR5YW1mTHp6RERlaGFlZ0lOTHBHTXJmS2YrVFk2Q2hBcGhtelFVQjJXRFU3VzcvQWUwQU1DYjVmLzNiV2Y3MUpzYkx0Wk5vTVVaK0RmLy9QMWhSMFV5NFJaMi84Wi8rMHFzQVJtUXhBVnNCSXl6Rk5LVmRrMUp6Q0RvVkVvUENFVFg1Q2RJL1pJdGhMYWlDT2pjRHludjY4c3lZZFEyWWxEc1pXN3RQSjZlTlR1NzFBMnBtTm94bGp1UTQ4VFc3ME9TQlFhSFYrMEJnTUtCQUh6N1hvdUdDNjBmWGN3Z3h0Q0lNSkhvRW9xc2dMM2dBcHhCaUZCQmJFWUVFMFZuS3d5OGVVcFdQMUkzUkJFbndHbnZJemVBdzJxVzNLWXZvZTNLcDNQVXJnWTZlUXJJVS9NMys2emJsZSs4aXRrbW83WFVuQnJac2xoVElqLysyREV3NEFOMlN0MTU2Uk5nWjJUN3JqMGpTR2xwTnAxTUZDN2lWNXdFeERFUE4rSnBDc3k5bll1bGFmZkg3VUh4UkZnU010M29tNHhQMzlxME5xVWZVbFN3c1B3Q1ZWTnlUYXZSU2M1WkN5aEFCQXpTMFVVSFdMOE9rMnVUa1MwSFFxTXBFd0pIV05nODRLaXlweERCb2htT3B5K3l1c1dTSWxKbUtOdHlxZitmT0hDL1EwTmlKWlcxeUNBMkFSbTdDSkhlNFlld05DZFFsTFVDN2hZZ01TQ001SXBzTUZ2dlV5RUZqR0V4eldpVWlJZ0VsdHBRTEZwTWdXQ094RUFqWlZ6dVk0RHJWZ3RxYmhzeXl1S1F5U0lzbE00aVNtNTFrSkNnbk5aZlNJT09QQ3RSN1ZCa1JKNmZNWnplUUpsSXdzV0dVcFVGa0tNeEIrNEpvR0IwT2hvTlVILysyREUwQUFOSk5Oeng3Qm53Zm9nYmpHR0pKR0ZCNnkxaFlRUE1hTnd1aC94NzNOU2hzMlFLT0VpRkhxanpuQ3lBbDEreUlXQ01iN280dHlpN1pwYXdLSXRxNFltT05rZ2RGb2xGbGMvRVZwS1BSdDZZdmtoT0hKM3pKVHZEd1VtUEJ5WkxNWXV6SmsvU0M1WEMyZnNWdmFuU1lNQXhMRXdNWG5sQ2hLbzJ3ZW9xMVd4cW51UlZJRVNRY1NwdTFlK0ZRQ1F2aFVxeWZja08zYU5FQUFBd2VUU3RIZDE3V0N1QzF5R29IaTcrdXp1VlhuV2pDTWtJM010b0ZibGlPS0VsWVJxWVRJaVVXWUM0OEd3VERrQ0pFZmhHRDA1N0pLTFZCNnRJR2VsRmFVbnFFcGFDYmdoWVdBajFLdTN3OWtoVnkzZDZVRG5DT1RnSlFidUtCbDlJb2dYUEFMLysyTEUxQUFOY05kempDUnB3YUNZN2Eya2pQaGltMjFpZzAyWDZoZS9YWFVMNk90TkFDY0xUb01CbEFRRTl6cjNucGlzRTlzdS9CVVRoaVJuajU1RTlRNVdXaXV3NUsrc3ZMV2RKVmp1emdOQUxzSnlxTkE1Ky9WZFpidGN4R2YxdzlPckpjWWF4Q2h6VnJEMVlZMEJNUlVpNGY1bWRxbTZhRWZSUDBnMmtra09qMG1KeDR2ZWxiWDc2U1VteG5yQXJkcUxKb0lLTTdBSGVjUmxVeStEL2ZNdUZaZmF0YmZucDJsanV0V0Z0bWNiWWJ0U0d6dnJVOHZ0dG5KVURxNDh1R1R4eXcwZ3duMnJybEpLRnh5T3E2cUMwdlhZK2RxRXp5QmQ5Z1VKRU9LWXhHT0RPTFdhWUtwQUFGS2J4UkJUdzRoQ0RET0Z5dWNJeEttc2pOWHZmZnFpVTFuZi8vdGd4T0tBRFJpZmNZd3d5TUhhbksyeGxJMzRjblI2aUdPQmZGcWlhaC9mcEFBdzg1T1JmOEd0TWRXckFiOTRUV29oSzVxcExZK2xQTWR4aHJmWDM3Nk5Mb1IvUGRXY3BHaWhKTEo0SkpheFhDZFdXT1l2YkdoS2hGUFlUNTVVK1A1d2JGUlkwdGM1eDVjVit6Z1RPWmFNWTFZdFhSNytmbXFkTTQzTC9oTzJrdWlOVXhzTkRsSGh1TUhnaWl5NHB6akxmVHh3aEI3clAvbjdBbzFuYzBRZ0hISVgvWlRna21tdkZpOVVSaWo2UlpwRUFQOWhQdzRqUExHNE1vOHIzNWVkNzJPclVVQ3BnMUEwSkUxaWlHL0s2YWNwRXVQUmxOaFpTbVhyWS9IMnRrVUJtSXpzaFVkdERPOWtKdU1TYktTcWRYdWlrdG9YVi8yTmZrdTlwYW9XanY2aC8vdGd4T3FBemVqbGJXeXdiOEg4ckswUnBnbjRLSUtJeU9NTCsxenozY29FdlZGa2dpUTNxeXBxRjFIVWpyQkhIcG1sN3BwVlh0VHUwaFc0eGFlampoaHZxL3FYS2JKbGVBVUVrK0Vkb25CaDRqYjVaTzZHVmVzY3NIbzQzaHRZN1p1a3lIaXJyUEoyaWpjekFzLzJVZHBaWHpZVmhWWm1XNnk4aDY3d2xTRDZ4NXV6SFIxc25YZFcvbXgvaDd4S2c1em9TT3RmMENaZHlkMWRuOERWN3FMWVREcmRaUTkyWGNyUGM1RHl3M0xwVEw0NUQwL3lSN2tEeTY4N2FjaXZUMlRrK3IzK3NlWEhaQlJEcFF0TnFSQUR4OSs3NjV0NlMraVdNR2F3NlFTMDhoT3NUZXJQSzdIWENzOHhRVnpWVmdYdHlPTmRwREFWR29TVkd0T0VTVDh0S21xMy8vdGd4T3NBajZEM2FRMHd6OG5PS3k0NWxJbjV0TElxUCtsaURRWjFUbis5bWc1cnE0eUFBQkdWSkVVcklvdW1YdnEvVGlTN0JsaWNwSFJrdGdSTm1kWllYM3ArVG10YkF2dE52bGthZ2kwWGtBYzE1MElac2xiYkNDY0RnSUQwSEpLR0ZqdE1Ka0lMZEFGekhtWHZScDEvdE9TK1IvWGFQYjdoWFhwTllPMURtQVZJRG1MdS9pOStYLy90YjV1SU94U0IxZHJmYSt1QWd1eHdabUlDblA3T2xSU2FGempLNGRkWi9ucWxFdGhsNmFPam9pWk95ZUNDQmphM283Z1JFeHdnUVpYaU5DRndrRUo4VEZCR1pOR293TE5seUJjTEh4b1VxU1RPbm5pYzBrM2FuYVJ5Y0tNTFFhbmpkTzNSSm1jOUtyWExsTkR6UWh4QU5ETWpSNCtkT0gvTi8vdGd4T3FBajdFbmFJMHd6OG5RSzYydGxnbjVNUEJmcHFqcjZPT2lMSlpuL3JrTFB5eElBQUE1MHc5TEJjMWdtL21wSXIydEFjbWxydFZiOGtnN1NKcHk5SVA0V3RpQnRBd1hFZzQxZVZNUmlVS0FrVFlKd1FKaHMvU1ZFWmpoYzhGR3pURFFYVFZzOUZKbEZCaEh1TzRKem9hNVQ3MGN0bGV5MHNybTNTNW5MV1ZnU083Si85a3FwZDBhOXJmN3VHZHh4allPM3RvdEJPYXNLQUFNT3VOZlNFNlBObWNoWkxYWDZ0dnJYbGo5d3paanpYN2VHTXZsbFBicVc2bHI1bWVhMGw3TDJsVnJEYXM2UmtKUVVua1pTYTBvM0dNVjAzTlloR3habHBwUFYxeUpGMkw5WEoxVS9PTXROanZmTFBZY1NrakFvUVJNZWRPZHlyenB3T2dVQk1Idi8vdGl4T21BanN6aGJZeXd5OG5xSlcyNWhJMzVjNW9obTBJZkxMVTUwVVNlS0FBbGsyTkNBQWdBSlEzQ2d0by9aTzhycVVEdndCRUs5aUNvclpvNUVSTURCRG4wVVp5MHJJRkhYckx3N3ZYWW1iQ2taVWg0M3ExUzNrVGRMRTJzUmp1akI4WEVCZHlOVUJ3REQ0b3dtSHhkQ05Qa0l1ZmlBY0pRbFJkMGlZdVE3a2laL1JHeU55TitjLzg2SWhDRTFPZ2NGQUIxditod0FvQkxWUExxb0FKSWt6QWYyNHZrY3R4Q3lVaTZtWW5WVTR2bnFObVY5bm1ZemZlWisySHhKbUhJUEhlTS9mTm82Sk16WTcrYXo5L3YzKzcvM3N6Rm5PU3YvL0RTSUlKL05ZeXh2VHB4ZFg4VjJKYXptN3pKNnRETG5zWFduZVRuNWdWRFVFZVBIcWZ1NHVxY21mLzdZTVRwZ0k3QlgyMk1KRS9CNDVxdE5aU08yR0xBQUlBTTR2aFFRY0tOUlJ3TzBIRTRaTGpLQlh5YkVBQWdQRGh0T29uVWNDSG13TXJrQkQ4Z0hpOHdVbnFTWmdjNWhDRStpSW5yYUFmMkpIamJteHl5cThnS1VBdXJGOVR6MWpHMGFxRUJwWFJOS21VMXZVb1FOeFl5OG8rQWxGQktZMGlCTkVqc1ZFSDRoT0ZNTTA0cTNTSmFmMzdzaTRQRHYzenUrNVFOdnNvOXNHN0wvMnR2K0FDU3BrQUJqbkJiZ3duV0xpeGw2NUQyS3ZNWG5WaTgzaWFpc2g1a1Z3MWlTQUFxQjdFcjNHcUpkbUtpRy9jUXoxRFVXbzkrZDlmYjdqM0VBVmtIMGdUeUpEZVdLN0k5MXhCUWk0Y3pIakdoaU9YRG1iNitaUTRmKy9LUzFyNGM3OHY3L0k3Ny8vLzdZTVRxQUE4TmRYSHNHSzlKL0xHdlBQTU9lZGZIbkFRSW5HMjNEb01EMWVHSExPdnJ0UXc4c2tBQUFMaHZITGRSODVPMU43cGhsMHFnaW9kaEFrUXgvNWdzc3B0YnEyUEVRb0kyanl2ZFZTdzlLZm9WMDZmWVBMdFZYNzB1NjJTaElnSFNDam9OZEN5R1I0aEVDc29zNFRXTktkMU9XZGhNMFRvNzMwdCtta2hXN2w2blRmLy8ycSsxa21LbXBuUTBhQ2xSK1dYUXB3MytCTHg2TkFBMkJKYmdMRFJWcnJkR1dNUmEvVmRhZFZuYTdFcXFsMGJnS2t6amVWRmxTUUxhWXhXdWhrVmxKRFBOcFZQV1JkUVBKOUFUT05IZFhQSExQSUNVcGtvV2FSSElGclY2bDBKMUtVRzVPaEU5dTMzQ05RVTFGTUVPTENQdlArZW54VStiNnAvVS9mLzdZTVRtQUk2ODIyMXNNUW5KM2gydGNaWWhlVWlPNTJsbWRQNU1LSlhGM1NZMk5RdU53OXI5YXZvRVpwU0VBQUFCU2orSEhablNSbHFEcHUwODFSNmFHRGEyZE94U1JpVU1UZzR4WGlFaXNPZmNNYVZRYm1zb2NjcFBRa0ZrYUhzZm1lbk5rUmhnNk11SDBjTVVlU0t4dGhDb3JIVkJuNUtENDg2Z3lIYWVqLzk0eHNhcmh1dStUbktCR3J1dnJlMkpqRWZQOVdmMHE1bTJIOTcxVEYvOUFEcmFRQUxqN2JURzZWbithdEtHN3RlaTBaazQ4ai9GRVZSNlloUDJXOGhFdFEyMDJ3N2NoSXhEOWcwc2tQWEJNTnFsR2pwdFIyZHIrMFRoMWRjRTJjbXFCdDdOcTJpSmdHZ0VCUWdpMGMralV5aWRxTVJUb2lENTg5VGxrcWhSQ2d3RlMvLzdZc1RuQUk2RmNXMk1NS3ZKLzZudGRaV09xWXFMaTN3T3MvS0tZWTd3azBEaS83NjFFWXdBQUFIRDNxZlk2enBFNlBveEU0RFJWSUM0Z0QrK0pUeElXbGhwZXB1cGVKQmlpV2h0SWdsOEpURWRtMkx4UnJhR2FyREkrQ1phdHBadXVWbmE3Rjh4c1VxOTQ1S1g5Zk9lOHh0QXJzOGkxM2EvdmFzbnpkd2RUWUNxcHhkWlRIVjNyQWJpWkVUQ3pYT3JOL3dTaXNKTnc2Qmc0THZEckpjNGRGTWlCYWtBTHVGMFNYS0I4Z2NseDdUMXVpOEVFVWtRazh6WmJQWkZ3VURnNW15Q1Fia0FNTm80THlEWVZGNE4zdUZNcGdXc1NnMnY0dUpmbXFHYkdMSTdUZi83YlBpSE8wL21MWlJZWU9JRlFvRFR6eXQ1NTZJVUVoUkxsdkYwVmNGY2UyLy8rMkRFNVlDT3dQZHRyREN2U2RJYUxUR1dHWGltbHhZODFMNEZMRm5RS2dCOTVIcG9DbEVra1UyazlyL0FjUVd1ZkFnbUFKYVgvQzRaQjhzNHNrMGhBSVhMbkxnTU9VZlk1QjhHSVMzdGpoY1lPQTdnalVyUTNKMjVXM0tOUWUvdGl1OXNpdVFMZzdMQjJWdHhlSjlJdmVvblhsbEJVenF0Ni9zVGgrN0xKQmR2N2gzQ0FaREY5ek55T1FpY3IwOVBma24vWnVZUDErRlBmaFZteEo2L1lyYmwxVEx1dTgxakxxUHRySHZkdnhQVWt2aTlQaFlwODkwMHRyOXNmdkRDV1hMRTNucnRqVnEwKzc5eHVVU2ljbTNiaThib080OXEvM0Q4dno1Ly9XdTVYdFo5eHovbGp2ZVdNdFp4VDhIZm4rNnFXQ3BnZFFjUXFLWm9xSVVrU1RKWkVKei8rMkRFNkFDUHZOdGhMVDJBUWJNYUxHcTBnQURSaDB0NGlkT09jRW9wb1lRZVpFR1ZneDVBb0hUc25EQ0tUUXNpV2t0QW42c0JTSDRhNSt0UlBra2JSUG9CQ0Nia0hRVDB0eWpiWHlxUG9qemtnTkNJTGljaXpHUUN5M3p4ampWYW1oT296NW1VdGRlSy90SmVqR3h3NDB6eUsyUW9FczFIcWp1MXhxUDh3SG01YnNOdDZ4QXhWcWY1aHFOZzFtQmViVllNSDcvY0pITmk5WWpoQzdFM3ZJdHRSN1JaOGVIRGZWdGpWUCtwMkp0ZXBGU0s2RWpuN203ZFJhUWE2Z1BGdlVqYkpHdG5PdjhVanlNQ0FBZ3ZVQkpPYXBxNGhSTU5BTjJkbXE2Y0dPdlNQVXYrbm5RdlVjTE1GWUxFYng0cXBjTVQ5WlpZUktSRFI4SlZPbmJsalZiaXoyWC8rMkRFNm9BYXZaVmp1YXdBQ3hnd3JmODA4QUF1cDRVZU5HYzYzZ01RdEc2Vml1TU55aFFkUUhKMWd1ekdocDJ2bHkvY1Z6RlVWVUtPcCtoVWRkMFpJamN5YVlKdHF5MldOVTFnUmF6V2gybmZNVGxhejJ1dFZyWFdleFJvVUtNeFp0VndycUpHcHFUN3ZxSFBtczlKSXR2bUhOVU1HaGttS2lvRU1pUUFBQVoxaE9TME9jZzFWdE8yQkErbGV5cFhoR2JHWlcwaExxMG5aRlU1YXRkNTh6eGlKeE5DK2VESzZ6MDdERHRxbnpCNCt2bytLQTVJdTJtMlJjNjI0Y013dFdzdDllZTk3dEV5WjJ5cDAyZlBFT0M3clZ1ZUpsekVpKzAvS1UxNW12dmFiMk8vLzlkdDVjTWErbzV2OEtBL09Ic2VGQUV0OU5SSUFrcWIyYVVKUkFBQUFNLy8rMkRFbElDVUhUdGl2WmVBQWdlbTdPV1dHamdFVjNNNXZ0S1FoNnRoVXpzaXljOHNITFdFc0d2SzNNV2ZSaU53aG0xVHBzZ2o4bEZ5cnhhK29wR1l1cUYyb0xoVVBwWHVGZXJZS2NWaWQ5dno1Z3NrVDhWNmtNeW9nSFdtK244Tmo1bU14V0ZoZHk2aXhxemZONG9rZ29JT0t6VngxYjFNcnEwY2J5NS8vKzNDTlVNbkNoME1FQTQxQnc3enhrTlBsbnJHZ2dBQnpyTVpDcnEyeGlJUU81Vk90dElhMG5ROHpBUWdUQWtYVTlOUXJGUUo4VXhWQ2ZES0U2SkVqV1llZ2FZV1B6YWNzTHRuamN3SlBoNzduMytQVzlqQ1JWcEFGbURBODJTdjFxWmxNbmRaRlZLdlcrU3hZUXFLUGdMcU81UGtrTE9zanNSV0c2R2VWLzgvLzlTckxJTC8rMkxFZXdDUWlUTmxMTEJ4d2d1ckxLV1VqamxjV1NMc2hmNFFEdGNKMS90YjVKeDNVaW9EYUVBUUFBQUFBQ01PeTRNVXBqaXlGY0pJSWd4Vk1VZUJGRmxZWUk2MW15S0liN2MwMVN6RUhxTEpLblU1dC9jdDFUbDFlWGFvdGd3KzZqZC9MdExKN2FoQVEzQmtScCtKd0E3S1lhRkdHbUZQWS9GT2l6VFJSMm9xVVJ3dktpUnpndUNXS2hjdTNqSTJzOFRWMWV2UTRMcDQ1a3pMOGlWd3VHRnhZVXNuVndpMU9xbXZheGgrY2pYdGd6aFdRWVZZOEtaL1NTWDBtM20yL3UrTTR6NFRhK2JXeHRoUThOa0crRk9ybnJQaVM4c0taZ2xwN1lwQWgwQW5waElBRUdBQUlGQ21YbzR0SVd1WGJYZXU1a1NxL0d5VzQ0bEpMTGI4NFhPTUFRUTAvL3RneEcrQUZ6R1phZXdsOFlIaUlHNDVnU1lwSFE2UlRJTUhhWVJTUjFBTmtLZjF2TWJWeFk4YlJyMjEzcktMTWswNFJJVkxWVnA4aEs1SkU1Sml0SXlWWFMyL3EvVVdVemtHdDJLZHBoZHZlVUpLT2VodmRGdzdtWnYvKzhuK0hOZnQzWFhkdkZzSy9CQWtrQWdBS0Z4YmtGNVFHcGN2WVJLZTdUcGRncDU3REQ0VFhoL0t0eFRsUlVZWHZVWHExcXRHdEh4SWRQTUwvclF5STZuWTg1a211N1JRcHlJUkFDTU9vQVE5elZPZ3dmc1JQWHVSdkc1TnVOZjBYdWYvMDRsSVVWelFzMXJsV1AvUWtzSUd0cHNBYm1McUJjdFJ6WWFqS0NRUUNBQk1BT21NNEdhQ2VDeVpTRTFOM1VjeGw0Rmk3Y0lqUDM4QllmSDBlSW1LWm16VmEwVEUvL3RneEU2QURpVmpjNndVY2NtZUcyNDA4bzRvSTBGUm5pejNka29nV09RM3YxVi9NKzRtWjAwTSt4RFUxVXlwVUVUMkFGamhZRHQwU1RBQ3hOSVhTczNKaUtQZWFrUVpHS05rU0VqWUdUMUZEVmpBVEJBSkFMZ0FCYkNiTUw1TktzaEpmRmNRUnpYY2lTUDQxb0lPbW9oUmh4Q0hwZk9BTG90MHRjaGdLREUvUmlhbU9qSWgycWw1VElVNzZVRkxJeEVUWXp2Y2hkV3FmVlpVTitYK203cG10aGhSang0d0VtR1hhd2trTkJwNFFaY0srNzFoWHlOS3R4dEVxVVc2R1lNYy9CUWtzWFFMbGdJc0QzSEhrUm4xajBFN0xaY05vcWczTHRKY3p5T3BOWHlhSmRITXpQaGJzY0xRcktidUJnaEJwWkVTb3IvWDdFUkVQbVJvbnZLYW5UZXYvL3RneEZvQURLMG5iNmVZVHNHa0srODA5SXo0dXhmbjlwVDY0czhzamdqMzgvTnp5L2lBQURPTkQrWGRkN1VxQW1kcVVrUjNZd0FYUnU0TXh6SkVkWnJZTGdyanBNZy9kdzFZcU51Q3JleSsrbTZBd04yOXdHTTVzU241ak5TeEZWdms4MU5mQ2QvdE1zbFA3QndndnZQd3RHZGVFY0hEQlcrK2IrWCtLZUdXanZ2SitIY09UL2luK1U3OXJvM1pObXZNWm8zQTV4My93VGF4QnhzQUJZRGNjNU95OUowdlJLRG5RNURrRTZYYTFvNW5HcnQ5TENvVUJJS0FNRkVWZ3g4RExPNGxEOHZNM3Q4ekpHOUkvVWlaQ0RQNmxKcHF0bDRsUnBIWDdYMHNGQnJBaVZMRFMwd0kxR2cwMk1VaEE2T3hSYlp3WVJGMk9IbG92YkpJb2huMG1rU3cvL3RpeEdxQURUREZlZWVNMVFtWkdTNHc4YVl3Z0ZnZ3NPcTNSbWxWQ3JldlIxWnR0OEtyelJHamlrRlFWYWpWTXhheEpUV1NJekJGUGY3OWFwSTJ0M1M1RzlySU53MmE4c0xNKytVaWNQcWVzWUs5TGx1R05KQmtLQlJqbHVVUkxLZGoxNlh5QlVDdFhqZTY1OUxTcGxJQzBOV0g5QVlCQUFTaG5ZK0RlVVRNbGNzT2hpU1F5cUcvbFJ2VENXb09tT3lEVDZzZ0JtYktTYVdhOTNEYWlvWXZFVTF5S0VacTZJZnRaUFVQMnR0VTVhZ3kwbzRRM2h3S215MDRBcjE4a2dSbGpxUktzSmlYUWVvUm9STkpyRnA0WFdLaHFWVzVxWGlsU1RiU1VrYmxpaVRhYkxJaE5pRjBJY0IxcnhzcmVKMEZkcW9weVB1Z3JHa21Xa0oxUUkzd0swVE1mdi83WU1SN0FBeUV5VzJNR0hFQm1oSnRLckN3QUF2aHluRWd6dVlsYW9MRUlaQTBVUVg5REJNbThkTGErcXlLZmE2Y1ljRmVtVWQxWENHNmJoVHNTRlZmUlBpUlVTdnBJTnpuZHNGcFVNYTc3WExtK2gxblNaOXNpZFViT2ZoNHVUSWJLRlA1czFraDdsMWU5L1NrU1hjOWJaczZyRjIxeHZlUEZtaTdoVzFmYlBiVWZGTDRlekpJOUl6bXVJU3ZWa2JVYTFZVW54TmZXUGpUSXp2TksrUjVaNUUxOTBvL1d0OTZ6VW50cCs4V05iN3JKSllBY21WaUhrM1VaS3pqVjZRV3ptam44NXVha2FWQWtvQUJNb2t5NXE5WnVRRFRuajYzK1JhVGxyTjNQLzgrWThFMlg3LzM5Ky9idWRCbytKSy9ycE44UTFpMGp3Q1djOFdUSWhWNUlzWXFIUC83WU1TTmdCaTlrWGU1bDRBWm41a3ZNNTVnQUNFQTR4aFZCUkpuU3Q2aUJJOHNKTlcvZjYwR0tFUkNKVXlBQjFnYkJtR2lOQkxQbk5kK0c1VS9GbDJwZlh0U0t5U0tMR2paTTFLVWNTK0UrbTIwL2YraHRPM3JhYi9ublprUkZVcTZLZDRaVkF4d1Zrd2NJcXJRdEVxZFphUU9qemk1TjVHRk9MU0l5V0taTTJmMTZ3SkRHb0pTbjlMMjlvcmNvL3ByeFFCQUpNaE16V1FDeElud2swV3BxM1RJNDBLR1BETnk1dm9WN3cza080UzZzS0VZRWtIQWlOblRjRUxVU1dhNjNQNGVSY0hRUkVXUXhDZ1NLYUFsUUdRS2tHdUpVVjNOcmxaTkNBakxiWDFhMzcycFRUa01paW1ZY3c1RDNUai9VWkpLTkJjOGppUk5LZ1VhU0kza2dUaHN2Zi83WU1SdWdBMXBMWFhNR0c5Qm9LWHVlUEdLT0MrdWxJWk5Ca0lnZjZGcWNwNk1KMVZkcGtSK2VHS2lzaHloZkl4bGVqbVZuQ3VwdC8wWkJ4clN5VEVRQUllNEtpb0hoUWtzcXBtMGJxOGxGZWZxdEIvM2Q3R001V0toVFRnUWVBQnowb01kS2pGaUdxVUI0T0hnR0tyQmtvRmprYkFBS1pBckg5c3V5RVdFZlNwdXRNcHFNTmtnUkpUcTJxcll3U2tFRnN4aWlhQlRqR1RJendxSEl6Ly8vSlprZnhheEZPUFFNREF4K3J3SUl6RnV6dXdqaWJHYUJLN0Y4SUpBR1lUbHo4UVlvTmFaTHhnSU9PY29zV0VCWXhFR2x0TUJGUVhtaFhKMmdYbnpWUStFbWxPU3B2RThmSWcxZE5TdzRKcURILzFxSmdEcHJWeTBkMWFVWUM1ck15VmVKLy83WU1SOGdBeUpKM09IbUU3Qm54NnV0UFNOaUU5dTlCOEVpZzZHc3hCb2dPTldBMGMwMk1GMHhLMDdkZE15ZGpSWkttNU9jWlVOVFJreHJTVE5IcXFNQWloUlBlb2ovL2Y3YTUrNWhQSHRBVWtGUVFyQUFBb2UwSkhjalp3OUtydzRwaWdQMUNFekIyNHNiSmhqcEJnWndPR1pkVzY4aHk2NU1aWjVDam1TTS8vK2IrM25kN2JmbGJONWZ0czdQWGxoMWRtUEpIT3M0ZjVJcnlxVFozbDUxMEl3cmowM3NyL1UzNENpZlEvenQyL1kydUs3Zi8ybzdqYzRaZ0VHUmxqOFNMbUZQZWdlRUNURjJlaVZ5aE5VVk5EUVlOQVN3ZG4yNUxwb1RaZVNwdnc5bHZEUGwxcGMrUm5wajhDTnRMSi9ENmtKS1g4V2lqUG1wS0x0NzIwUzVOY3pZLy83WXNTT2dBMEZKM3VIaFJNSnF4c3V0UEVhRWFTTVRIYk15bnMrZExPK3htWDhiLy9QcGlTRkdSb0F5Qlpjc05SY1dISTR3MmtPNHFESWh4dEpGM0FiRndDblJ3bkRPZkNhcWcyTXc2dDUzSEFRK1U2ZnR1MHFPYmJGNTBUTkdkWDM1M1lyRlVjN0hoLy9UNjFRNXRYdXpzWXlvTWxuWmpIUFFzbmJTVXp1bXFzc0tvcHZHdnJuL3YvYmIrRUNsQ292Qk9veDMvV0Q3VzV4dC85eEVhQUFDSUFBQUJna2JlQ3FSNWRsUXVHV2hPSUtUdzJnSnBxSXRIeVBkREQzT1RhM095ZnlmbmVobDZJVncwUSsvWDJ2T09jMUt0WkQyS1owcEZhSmxsMnlBZ2pNaWsxRjRiaVlER2ZSYi82eDlUblBkcmNjQWorNy8vOUlFYmIrRVdrYmpxSnYzZ2ovKzJERW5ZQU5iVFY5NTZSdGdaNmVMM3owaWVuWVRXV0lFQUJJQ0NnTGhnRElaU2pobGxEaW5lcGkrdTJKUjdQWkhSa0wzQlRGa3kwKzJYbTlqTGE5THYyeUJnZFR0bi92Qyt2eHBJbVcrV3g5OHRPRnVxeGoxUUV0eDQvUytVKzAvL3Zmc3pVMENBNE1rd3lHeDl2dHR0T09NLy9PV20zK3YvNmFiSkVTY1FCQUJSd3dNNnNHeGtTRDQ0UWlOVWxjSldEd1lveFEyMFBKT3hBZXh6Q3VXSDRSQkFjVWR0ZXpFcURXQ1Y2a1kzWFgwelIvRUdrcmsxMXR4Y04zUFh5dEVxaFExTFVweUtPVXA0dW9pN2h2K3YvKzFYNHRZdVRiSmNDYlJEaGt2KzY3NzZBQ0lCQWhBYVFpaUx5VHpGYVY1cG1JUktEWWV1THhxT0Ftc2dWZk9JOFJRTG4vKzJERXJBQU5JS2R2cDVsUENaOGk3blR6RGlFZUhiZ0tIeGZIeDRwUVB1dldncEZLT1prMFlvT1ZFVnZtRkNuWlVkMVl0SXhpWkE4NjBJeFRSRitMQzQ2NWtZT0RyUnhVUG1RZEJZaURhMy9lYkhxbjBrM2xqRENhYm0xaWpBdGpqa3dMT3dMSFJVRktreWNIc2NSMG51cG9LRHd2bzdCN1FtN2JUT2Y5ZUo5dzJ6Qkh4OU5ZZ3QzeU44dVFOVm91MzBaUkdKbCtqTzlVdlhlOUNrSG83ZnY3YUVIVXBtOUdlbTYzSWRXT1FvZzRISjNiL3QvK0txekd0VkxvT1Bjb0EzQ0JBSWtFQWlnU3o4bVppVlFDbk9FNUQzaHNwNFJGRlBjLzl6Nmd6M1ZOWlhlaThTRXpkWGFXQUNsUmdSSFZMTmVNUk1zK3QwajFCS3liMXV5TE1PdGxaNkQvKzJERXU0RU1zU2xyQjdFRGlaeVZMS1dHRmFqb2o2b2ovVFd2TS85NTZQM2EwN0VNNlUvNWFiNTBlUWduYUZhQVlwVlZJQVE1SXhJQlVBMFd3VGVSUXhTallVVXAybzBnQ0NLM1Vrd2hjeVUwSDBzdzh5dW5ZMmpQeFRkaDZHOFd4dFByak1yWFE5UmRHdisxSFVlbnJ0T3BVUTVnUzJWbUJXRkdZK2ovdVZ6VzdmMFNlK2xFRHNkMERzRG9Xei9ROWZ3VEVHRUM1NkNxQkFBQ1hVbEJNdTBtNlBEcG56bHo3NVVrczIvVldHS2pZV2VRSStsTEU5NERyUlk4akNyUjZINVdpaDJuWHR4VWdMZ3NSZytJUjdCemF5Ni9wK25kUCs5U0I4L1htYXBoeGVkMllWSGhZVG5hNHdkVjBYeWtoaFIwRGhWNDZTVjRFaTJOWWZ1dnRSV1pZN3ovKzJMRXpRQU12UzkxcDVpeENZa3RMU1R4bHNBN2FtdjE0UlhTREtIZ0FyaTNkSVRhOEhWL0NaSWdsY2J1VWxGbFVRQVFDQUFvTGZERGtlbmloUjduZzlMZ3lsdmNWZWVjSTNlaWJ5WGlUZVR4OFZjTlFJNVBBK0RVQ1JnNGFoU3RWTnBmdjQ2ZHZSYUxTejhuaThlZzFqQmRCMlh3MENxRkluUzR6bHRXVFNyKy9KL3lXa28xR0dNRUVJeUxKRzNNeDV3Y2FhSGxYVldaSUlBQUJBT2pJRFpnaytkbXkwS2MvZG1UYzVTeEMyRVBnaE5Ha3hJODAvbEkwajJmcFc5WWoxSGRWcTQ1Q1Fid0ljU2VzTDFkLy8rYUtOT2dwU2ZxTUFqd0ZxUjZRbzBVZUZFd29ETUpIa2oxdXVXcTlOV1ZESVBBOEpIUlJ5VWNhOTZ4S0FnYUxQZFgvb1FYLy90Z3hPRUFETWxqYitld1NjSVJwdXlWaGc1NEZLMXRJNmtneEFBQXdWYjRTMFE3VHVUTGFMT3pMZzh5N2lsSzhCcVR5SU1YVFZaTjN2V09zWmw3N0ZWZGtGOXNwUENtR1JDVFVnZmdlMzkvLy8xNHFWWlNTbk83a1Q5RmtIcXNXYW1vc0tlSTBTYlRjRGpvbzRDNEVCRVRpY1AvUmIzT0hzT2pDWnBpS0ZLemJDUVprQjVzVVdVUzUvc0x3UUJJZ0FKdUFzZ0tRVEEzREVJSTZMek1aand2cURMcWo1SFVxcHZIM0F4TDY0a3hsVWlrenI3enp3SHRzU1ZPY3B6KzcvLy9iWGN3bTJwaWxwdHpjczJqWEkwbHhXVGlkWVNKS0kwNDdPUkE5SXVGM3d0dlZGSFFwQm13YmIzRVpQT1NCNjZQVjNvSTdPbDJrRUllYzc3RTg1L3NteXEwLy90Z3hPT0FEVFVwY2FlZ1U4SEZHZTFrOWhub1loR29kMjFRQUtCdGN6ZTA0UVgzcFNBeEFHVEFJaFNmWUlxczFYUy9MNVNCclZ5SDNqbW1QVllKQU1XRWhSUjFUTGJHSno1bkVzenNzMUU0SWtUQjErcHpLdjE2Mi9TVjRzMFhwYkxlL29tdmpLczJReUpVU0g5TVJJZ3pFa0QxY0xTb2dSVmtrVFRXdTh0K1ZPTTY4M2Y1VFlvTGtnN21XaUFpeHhPeFQwMUtISlNNRksxMWFnSlRSSENBREFUZTFGQ0hoUFpUY014SnNTZlRUOExlMHplY2kwVHdFSDVQRVBMK3l1ZGUrWDE3bzhvTGNacVh5YnovWC9RN1Y5YnVRT0xSUTRJaCt5RXl1cVhaa2ZWSm5TZHFGSEU4QXRhczlKei9uOGJNZnR1ckZvckZFVUduc0IwYUFWV0tVUnBNLy90Z3hPNEFEb1RKYXlleEwwSWRydTNrOUlxNXVWUVVkenFHMEE4Q2xBQUJqYWhGcGxiWEZYSTM3eHVpOWVVUWJWc0xwUVk2OGdsbjB1VU8zOWJyV3p0N1hYblhWdGZWMGx3U2lDQ3lLci92UEZ2TFkrSEcraWF2ek9wSDhJMnhNWGJSMHNvaW1CNFl0eUpKcUFvTWtMREVuWXlLSHBlNHA4NmlXWGxmOWRHS1JjMzdyMlIySFdOV3BRc29pV3JTRFNuMm5ERmYydE9nbWdDSm9BZ0FCUWQ4YTIwdUE0RGx6TWFhSXlDYWRXRFZtMlgxbFQrcFdzS3lBTStVN1RoczJEazNycWRFV0NuZ0lEVExUTDJqN2IvK0YwbDVWR2xrWEhMcXBPRnM0blgyd3d2VFZWaWtGR1ZwRmY5TjN2eWNQWmxPWTM2ZW1rZmM2ZDd2K0ZFRVVDWk14djUrLy90Z3hPZ0Fqd0VMYjJ3WkxZRzdvRzMxbDVob2IrOTVjcFRGSWFMZ25xMy80SlVGeFdBQk1yTlZJbTFUTEJSUjhKK0MyczZXZjdrZG01VkQ4MXlVMHRJWXJldW0rdlNKaER2dmRyTFdGMGdOT2kzNFdsQzk5M2x1YmFqS2R4aXdYTHBRSDJGaWt0bWtVU1c3cmcwN3lVVWVQSWd4UkU4YmlZTS8vUXAwdlQxUlhaRDJLVWVqTG5SQ0tQSGxIdDBNdk9xQjhZZE5QV2dER1JBSHQ4bGtBVVVCZmdvaGZDb3FuYUNTaTNBZW1YTVRSZFpuc1FuWWZmcFB4a2tWcitFUDRFSkFKVU1xbHRhckxQRElWeXpUdDdLaThudm1kcUNxazVraEFLZzJHR1Q2dTZCQVlJL08zdHlOOGh2WE41TkJuLy84OTlVcExLcW9kL1U2RjN3RG9BSWEzaUNOLy90aXhPeUFENDBuYVN5a1U4SG9ITzIxa3lYNWJzdnEvejNkMlpyYnNRQ3hDZ3dBSjFXSVlGTFB5OXZJZzNKNXFCeVk3RUhldnZ0RGNIVldDdGc2b2dJSFFyRzRQaU1RRUR1RkpDbFB3em1NZThHU1RMSE1ESFV5N0ZNc0pjbndKc2VlcFJsSDBHQ0NLaFdBMmtZSE5ZME9IUjZVTkJaS0o4Y010QlZyVlRmTy8vT3o5V2Q3Mkk2eDE4di85UlVqUlk1dnFHK1R0VFowMXFILy9nSVU4aUdBQXdMOFZ1QWVGQ1FaWktoRWlBTVVFWUREQmxzUElqbDlSL1ltMVNWMll3andnSEVBM2gyVUVjWnh4L2p6bjc1bi9WK1grY1NmWEVNbkxSalpremlDT2tKWW1FQ1BhaTlFaE1wczd6S1dOZzR3aVBNejRlYlNDQ05UU2kzYyt5bjltM3haRmYvN1lNVHBnSTZoUFdrTkpMSEIzQ0pzNFpZa01UcDFuYzZPM2JlZit6LzIvLzRxQzFpQUFBQ0RTeVBLaHNPTzI4c0V2azhRM1NuTDhTNnJVM0tsaWI3eVRZbXE0KzBXSWpld3E5ZEVNY2FtYjYxVzc4MzVkQmp2SVhGVlhPN2VaY3FucDg4dGpoMmkrVzdRT0tYNDRCdCtzV05DKzR2V3QxVzJQWUg2YXc1ei9SdHpMa3NZZ2pQZ3k4WFlqY05pNW9pRlFQUzFwazRHQ0RBN0FDVW9EaitrQU9RTUFBTWNZZXNobHp6dWo4T1FHemlLeU9CSWxETkRReXA1YUc5cXJSWlYrMXYxVCsrMXpPSlZYUEZ2OXk0dXRscE4wZG5LQ2c3Sko5eWRLSzQ0eTdaUTJ5SFpLYlRMRlNaZUsyODVtV0hVckVtUFIyMDBuNEpJWnNyTVNtaWovOXFidnYvN1lNVHJnQS9kSVdWdElXL0oxUm90Slpla0NVYTUvK1JsZTNRa1c1RmtrVTVORU5LQ0ZVbWt2Q29ZSStnQldTTklBQUF4MW9NOVg1WGZIcndxRGFZTkVwVzdqWElOZStYTitxUkY0b1prTDZqcXMxaWZRK3dDb2M4Wi8xTDAra25SZHFhQUZrZDFjSjNGTk1TbTRQeXVjZk5RNXF3SitIZ3dCakRoeW9Nbk4yd2pFNDNQLzc4bjhJdWZuMy9yMDQvU3R0Yy9WenpLSk5JRTREeHBOT3Rqd0dOc2dBRE9adG5DOTZSUjBPWXFMbGNOMkgrakRLb3pIYWJKMmFLcmZxU2ZNOTYzVUVFTUdRRkZpemZ4dXJrcjd6WlpVbHpvb2xMMDNxRERrNjI3VW5WN0psT2xXaVFQUFhFUkQ0TnRUbEFrdDQwQWtBWnhvOGhWRW5ycXAyK3JvZEcyK2YvN1lNVHBBSSs0NldjdFBZZkI5U3ZzOGFTSzZEdjBYUFNqb3pXYXRsU3ozVkRDckZVS0M1MjhhZ0M4bXlnSVFBQW1lYlArNU9jUVJobkZHa2Ftc3VrNWtkYldiaU5TR3BiblY2eDJFcjdQQ2Jnc1FFbE5Eb3lsM3pNbjYvYXpVUDJ4VlMzN1YycjZTQUZjV2FnV1JCN0lDa3RJc1lzc3dQSUZGRkhJYWpYMkllcjg2cWZ1N3RycTJrNk80eDFEeGdZbFh4aCtOMTFaOS9tL0dMOXBnQTRKR1FRQURteEd3Um4xeVBMSGQ1Ulo3b09idTRyTWlZQ0QzY203WVVIUkdiMU1kMldwVzJNMDZ0ak56dE9VeHlYbnNsMzdIOTI5WXR0NUdEd3hRZm1DdVJFNjdEeENlYldVWTZ0MDZMa2Q2bXplWG1LSC9nOUNUdjkreVZ6OXpMVW1wLzRkZmYvN1lzVGpnUTV4WTJ1TXBHK0ozeXh0Y1pTV09XLzMvN2k3QkVwQURLQUFPYW1NME5nY09zekVoVDd0eWRLaFpiTzNXZFU3d1U5KzdXczBtVlhDcERkdGM0dWViVXpUdS90ajVaTEErenRmYnJOS2R5WUtYMi85amFIVm9TYzJTenhZSkppNEh2aWcyT3kwbUxRSDR5UXNNRU1ybVpOYU80RE5aVzJVcjdPemJWMDF0OXNnUEplRzBSMmhaYkViNlR2Q05wUCtGK2t5Ti9jSEs5NmdPcEdXL3g2UDV3SVlwRFFrU29BQXFVQVJmSm1PTFkzc2Q5bGRDNFRqVjRMdjRRUG5YdFc4ck16aDlKZjduTlkyNDRzRFVsaytURFBHQ05oQWdndXYzUG9ZRmRKblVydjFSUkpRVnEzS1RLSVRRcldpeE1ud1BFb3FMVElRa2VtaU1LV0tGV3NScVVqLysyREU1Z0FPaVMxdHJCaXh5YThhYlhHVEpmbjZWcXJMNWlrR0NjN2trYXZWU1NUY2YyNnNZY0tHQ2hETFlLRThYMHd5Mm9oYVpWU2xxakM2U2NzcGlsZGJtU05zeXo0c20xalFHcFlFUzZpWVoyU2FBQVVBclJpRlJqQlJvdEFXTEZwMlN4U3lXUkZpUGJwM1c4WnJkM3VnZTJET1UvL2pXcUdIQTBTbDh0eTZmN2E1eGlYT2ZGSUE0QXg2NEhYQmp3eXJDY0VNdVh6aEwvelA1Q2hrVTUvUDgxTzBGSWRFcFpaMXpHUktzWUh0dmhNbVRCV2lhZUZOckVRQUV4QWVLcVVZR0lWRmtUeEVFTXFCeENOakV4TVQxLzlTY3dlUmdoWVJJRzFvWGN5RkVTNFdHVEdTOXpVdWJHZno4dU96d2JJSzZ2Q0VqVUhNRUtBRUFoZ1ZVaGdwWStmLysyREU3Z0FSWVdsbGpUQnp5bWN3YmoyQnB0bUlKVTBQR0VHaEVic0h2UUNyakJ3TGhHOGFqNVA5OVFTS2RvYVpYU1FnQjBWUkdtazNVd09JWWxqNjR3aGFXaDJPd0g1UWxwMXBOcThjblhlSnhnbE9KYnRLcWZpamtkWlhaMm40ZG9UeDl4OHcvRVZiMTMzZEp1Mk5ITWcwRndoQ09Jc215dnBkbC9LOXpVOG9PN2h3c2xnNGRBcHdRQzBVcmk2OTlnYS8xQVBPc3RCd0FDQm5xN1hpeGNXNjNrTXVwU1BHLzg1VnJVcm5kMGVpZnVRQmEzZFBnaVNXdHk5OXYwbjNVOWpxWkxhZi90TmZ0a08rTmpTUWZEYU9tcngwV3AzR0xzZmlQV3lDRW9oaXhEREI4NGhENHZFK2JIRm9QWC9lQmUyY2U0aStzYmtjSG45NEdwWlhwdHgvSVNELysyREUwNEFNK1M5NTU3Qmx3WmFiTHIyR0RIQnduQlBQbms3RWpydEMzb0lLQlpobFpIWVhVUUFDeFdCMm1CMGp6UzVuT2JXWm1aMUZIU3hmZHJHTU9UVVRrSWNDRGczWm5XY0hVajNnSFdXclhlWDhtRjF0cDc0M1BPbGRteU4rVERXZWFSWnFDSXl5YzF1NHJ3c1o2Um9URWlFVVNLemFiYUU4WHArY29Oem94S1RiNTIzdXdidTA3K0p6L3FVcnVramdJTllpZ1FiUUcrYmdSQ0t2dUVkcmpMVGdBQ1NYc0JZQTE2WE5yTlBvOHNsZ0RHSlJIZEUydEtNNERDT2dQcEVEVHJlZmxTTGRrSStHZXVFcERzamlWVE91SDd2bFdMVk5ncmtGa3JlMDBMeWQxMTFId0R5a2lJaFhBbzRFdVVRbkN6U0pSRVFoK1RtRTFUektOZVU1UmxMLysyTEU1SUFOSFB0MTdERUR3ZklrYlBHVE1maU5UazdaZm9zUWFRcFk3bk5udkJ2TmpYZ0l2NzMxejk2cUIycVpobWhybzBBSEFINXVERFF0R01hcE5Jdlpia1VxSGhuSCsxS1p6YXZ0TXpBc0Z0VUNZMDJNODhHN05UQms0WWpNMHFzWitERjl2M2NublcwZVpJVkc5dmpUemI1QlNsRUM0c3hIWUw4Wkdvc2FtOG4yL3lOay8vb0UxUjFkM2o5S1BkNFArbjRDU1pSTmlRQUJGZDFrclFnQ1Z1dEEwSE1yWWpFNmttZmVudlEvSXNJeDE2cTBrSWFlK01Kd0lRUGQ1cC9tbGxiSlYrNS83NXRhU24zMktxY212T3ZkL0RPbFNoN08rd0REMUNpOFNEbEpRa1ZvYTR3RlJZa0FrNUlWUEVNMUdLRjR0WVZqajR4bWR4NnIzTmQyOXpuWS8vdGd4T29BRDlrdmJleVpNY0h5SkMweGxDWHh3S2xVUmJKYmwvckxlanZWYng0Ly9iN1ZDZTFnUkZNQUdGckdlTnZBNHZIQVNRSGc4S3l3UFZoWXcyZzJhUGVYek5SVmJxZ3NPSlNwWnJlQ3pFT21pU1pxc2xZUVhRZThUTnRWKy9hWEQvT29pREpNb3hTVlpVSUFnVWcxd2JoOURITFJhQ3FxVUxNZ3kzeVo0cm0walJidXQ0UFJ2aDBhTGI1bTErcnVwcmpxaGlrMEhpRG9UZEFKYjdNemZzSGlaaDJkbjJtUlR2REhieCtzd29UQ0dQSWhpVWdsbXBMU29iSTZQR09IUmRCa3JFSm9jaFRCMUovamhQUE50eXFLTDFISithWExoODRaVnVNWkhDcFJaY2hZc1lVN09YY3htaE5jVTdKMyt2ZDl2dFhaZWJRVGorVy90MDAwWGwxMi8vdGd4T1FBRFF6amQrZVljRW9ESnl6eGt5STVxdXMvOWJwZGhGbnJxZ1Zhb1NaS0FBbUJrNERqVWo0dnd1aU53ODgwUmtzZWVWMzdFVmhKNFIwZjRQUWduQkhYSjNlVXJZK2JwT1BkLzdXOXBkNGpXajFUTmUyeGtMQXllYkJCa0NLUnQ5TlFqcUluV0xESkNhVEY5ZFZ0S2hGOG1YTXoyS0Jlc3ZXM2RtYmY1bSt0elpqQmUwUUduV3NQa29IQWdJTUlNSmdkYjN3aXMwM1p3dUFrM0FTakZyYTJwWkpnK0QweEUwYVc0aTJWRXdwZE1HMTVyZE43aVVYUXVScm55emRwRVd4YnlkSmJVbEk2a1BENTVHdVBqaGFqUFN6WWs4Zml5a0NLQ1pOdzdqNXRCQlVRdzJKQmg1d2tFcUI0TUV1ZWtNbU04VUR1bXFWaGtFYStzVzJxQjlGay8vdGd4T2NBRDRsZGFZeXhBNG1ybSs4ODlneHhtRFlvVUZDaHlEeW5rZXZERTBxL1BWMWRyNjhSWEVNeno4Vms3U3dlQVZhRlZETmMwZ0FBeEFKNEd3MVh1aGJoeHAvcDZZbHhBRVk5V2xRKzJXbHF6NFkxNGJQa1VReVpRV0tsQkVjM01QR3h3TlhHNDBuVnlaem93dVYzZFhwVFV0MnErd3ByOHl0ZUlwL2lWeDJNWVIvcExKcnlWdXVlUkxPTXFDdjMvL1lwUHI4OFBrRm4xdGVtYU8vK2IvZ0EwZEtCUUFBakhkNzA4b2RiclB0ZmR1TVFhL1U2QkRqc2ZMa3N1cFdEcTdzaVdReHBHUU5neEhZL1VLTDlyblI4Nkx6czVYMm1ISU43Lzd6cXhqSXpJeUtrWXRYcC9YQS80cW5ISFZRU1B2ZGFqT1VQSktkZHFvWlpWSTRUbTJ2Ry8vdGd4T3NBVDgwUFo0eVpqOElXc1d6UmxpQndZc21IclFvNXViclNhV0xBeUVISWYva2FBVWpMWkFBZ0JrNHluMk1xV08rOTh2Z3Vib1ZSMitsb2FnSE8yYTNkWDgwaHFGNFBCSDVqR3pOSWYxU3ZxWkNXd1MxVEJ3NTk3M1Y5MHlkbVZEWVFJSVBmeU13bW5zbmwxS0EzT1RveVdPR0J1UHl5WjlwbnIyTWUySVJ0djdUVFR1OXpHbVl2dmJuMmZBQmNhQzBEa2tSQVBQamlod1NPNWZ4UGg4dGJXUElBQUVFS0FGN21GQ09laENTV0xTZVZocHRaL3NxZmI0cW9MWWp6MkRwSjJkQ3l1SkV4c1pIRUl6Z1lLcWtqeVZDdW9zMm1mT09NS215SHJ4VlRYVi8yWFVmdlNjSiswc09RN2MyK3drY0ZuU1NlQlhBZ1V3bG9PRlF4YmNRVC8vdGl4T0VBRGh5dGMrd3dTOG5LcFMxeGhnMTQ1c0FYa2xtTmpRNWE4cVcyeXMvMzVyZldlTm81THMzbzEvbDU5TEsvdi95QkMzUmhTWmhMQlpDdSs4eWtzWGlhNFFla3BSWkZoa1FSQUFBSEF1UlJHekdmRW5QR0VmSnZSQ2RnZXVqSlZTcUJpRUdYc29NMGppUUdGYlNSa3JWeHhSSnNZWGlrNzJZSHIyR2gwRUsrUUtySkpQa3drNkxGZDZOd3FPVytMTGRGNHR0LzFseDU1WEtzRldXdk5pUzVnVHI3ckhKMTBZMjhqQUxsRjhwUWtGT25OaE1BQUtnaGM0UmtlU0xQNG5Kdkp0djUrSzh1bG5QU1dPTktzYTR4WHk0WFRMOFlrYWpJMGlRc3FUa3hoMHk0VXQwa295Y3Fvb1VWdE56REJaeGVLc3BBalBFbTdhZmo5K1RTUCsrUmcvLzdZTVRuZ0ErSkdXMXNNTXZDVmJJdXRQU2FNR2I5UVFzZ1BPS29FaGJvS2lzY3ZiNUlnVnBUaFZqbkhyQWJBU21USVJFQUFBQUZBY2tVdTFub3ZFQU1waVZES3hLODQ5anovMlRLSjJ1VzlDNzdhUUZqODdYU2FSU2hGbEVLU0tRb2wxNUx5TXhaWFJSK1Z0TUVjSGt2b0NnbkNQY1ZveUVPYzFVbUFTSzUwdTdHZEQxem9yS3kvMVhmOGNIbWdtREFYZFI4SzRuaXpMcW5pWU5oNEFKNlF5RXdBQUlCY0Foc3huN1B3U3FBR0VTdFRIQ3hJOWRSVmM1SlpFZVVrQko2cE0wam9rcGdFazFRMFFrelRSQmJCY0Z2NFMxbUtTWkZBdlBXMmxOUEZaN3lKRHFzdDBMQ3NER1ZLUDYwUHRUVkdhNVpFZTNaZFdnbXVsbEJtUVRIaTkzQWR2LzdZTVRXZ0kxdzMzZkhwTXVCcmg2dS9QTU9rUGZHVURMNDVURUFWSkFBQUFBWjJrNElNWk9zQ1ptOENldzZ4RGtKUlhMSTRqV0VCa0lCOUErWWtpVmVTdmllQ2NrbUIrdVJZdVRqVGFDbE1kU1RhY09TNVJza2xuZEZFckVOTE5ydmplL24rWEQ0ME0zNTM0YmNwc0xaTkl2MFMzMXJ2emN4dnNVeFR2anYybithazN1ZVhocGRmLy94SGovM2l3cmZOaHVEWEwxaFFqb3NBSVFRQUFDT3R0d2pMSGIyWEVUVFVuYmR6M1FwSG9oRlZzTUI2Z1BkemZKckt6STg1bDVOUDYzOHRXdGZxQ1VSN2dhNGZGaUtseXB6SXlsd3R3ZDR6SkNySHpEbXA0ZEN6UHBkMkxFWndzZEZUT3g1WlI1L0IwSE12ekh6TVFVZFQxM0EwUkhtMnBXNGZ2LzdZTVRqQUEzeEpYUG5wRTNCdFNWdVBQTUorS2x1OXp2ZXYvdGZLVUFGMUpUZEtoOTZiRE4wWWdEcW1TQUFBREhFZ3oweEExUHNOTHNNY2JxbWJLb1U5anhSR2JtM3ozRUlIcHFiUGNzZnlsc1RMT2E4MDFOK21ZeHZpZFo1bm1YWHQ3R1luaGJkaHdzNXZKOFdRTEd5S1ozbmlURG16LzNXUHVSRTQ5NllUSk5leGpJdUhJUmx4R2JyMWpPM3gzY1g4M0hhMmovMXViNmQ4M3NsQzNOano1TGozdFErZjdCWGMxNUFnQVpERUFBQ09vM3FJV1NwNDBQeUxUcG90cG56SE9rRVdHN2JHRFVBZmFVVkZlR2RCNXFSQlEwMG50MHB6aGlBcmFJeE9tQzRGT3RxMDl4dlpvRk5wY3ZDOW1RUFNwTEZZbzNLQlNpUXdjUU05UldtSGtDR2cvLzdZc1RzZ0kvZEhXV01NTWZKK3lzc01aUUs4R3RQTlVTZis1MVZOMlZWYkdNMGE2ZVU3d1E0SWoxSldMWWljK3YyaWF3MjhncDZxeVI2NU5VREtGRXhFQUlBQUFlREFUTDV1YlBKQ0lscU9peDQ3QmVmSHR3MDltTE1MSDBDK1p0Y3RKWFZrK0FLQ2ZWZm5kUTdKcXZqNDVVOWN4dW5wcFd6N1RhZytBVm9zOFZBQUs0dFFRb1pyaVNkVUQxQXlaNzNlUEUvbi8vbWdxMGNFRFFZU29YcEZ1NXhKZXA0c3dHbm1pN0ZIQ05RL0dqZDNTQUNBREtFcmJDNncxWVc5eUptVTNPQnlsTDNZOUJxOFQ5a29vUEJmU1FxM216bWZtRkd5ZFJEWXY0Sk9ENGl3bjF5c3p5WTVFR0cvd01YUm9PY3JjWmtIV0xyQnpqRnAreUZ0VlZhZG1iL3pHai8rMkRFNWdDUWRUdGpqS1RXUWZvaGJQR0hwSmpodUZBNEZpeWl5a2k0RVdwdEFjVk5nZ2RJTE8zSjN4NHAyZzFLa0NTQUFBQzRCRWZqNFptOG5VY0dTTFd1U1ZSRFBRcHZGZnBFQnh0S3NLU1daNjdQaEpJQmNUTllid3ZLWVhKc0hQRFAvNTU0UGZKaG9tRU56RTBFYUNjT1FjQ1VEZ3MyQktOSjB0Y21oWHR6KzMvekt5cnF5Qnh0aUNTREloYjVoSWhYSW1Qdm44eS96TEVJN0pNV0JQMmlLRWtoQWdBQWh3RmV3Q2ljRmVYaU9SazFvWmZicmtzR2dTaWJoRmRwREExbGVWeHpVMWtYaWZublZRWUFVU01IWjZ4Ly8vOTFicWs3WjJNTWdTeGVrUzZ5a3lnaGFoQ0RBOENzSDRTWkhkdCtub1gvL3pQMjRlMmFreXc4TGRZQjlwSC8rMkRFM0lBT2xRVnY3Q3h4UWJrZnJpajBDdURVdGlXR0xuc1k4UHJPSCsxRkNpQUFKQUFBQUJnMHgvMXN6N3FMdHZRYXhmMk1ZVUN0c0JLck52ZkVSOEhya3NUWXhwcldjMGllcW9zWUY3eWtFekI4c1RIcGlVM1AvK21zaUh3bUt4SnEraWFYdmluVkU0WjdSQWtGUktHR2NWUkF4Z0FtZ2RZQU15aVRmLy96L1E3Zi9JNTdXU3hXMHJwbi8vODQ4cVFEVER2YnV6ZHFsM2IrV3RvZEFKQVhIcnloWkZIRkZNdE56YTExalVKa2hBNmtzTVM3SG9mbzRKNmthM05tQ1p2eUVLbzdLNWJ5dGpTRUNKYnNsdlQ1L1ptWjZhdjFQaGdvK2Ftazc5VnA0NUc1WityS3lBNmN4RGVYV3JVNFdDQlllUU1HWVNNRktncG12di9Lcm85dGQ5WC8rMkRFNHdBT2JWOXZwNlJ2UWIwbDdmVDBqZkFPcGlxQU9nem5la25lMUR5eWtRY3o4RmpWejdmdGZpb0tZZ0pwRUVBRktoWU9aZG1oSGxYRkw2TldHdlFhcHNhcmdQTHNNR0dtUkp0cStKdTVvb2lsNkcya2lpQ3lWYisvTi9VU3JVV3FsRlNqS3lFa0pEQ0ZFeGFQMG9KRHBwY1VCaENzRUxLR0M0bFJxRUxiQXIraU1zU01XdUs0TDMvRTJLRHB1RXlNMmROR0czUDFoSXdHNVRoZjh2WlJBeS9GR0Y5djF1VFFPMmN2cUoxTVR1b2RIVTFsUk9RSzdQYmVnbmwxSkFuSmliUkpGcVFPaXBTZ0ZDcWlHZTRsK0FrRmdJMExtOGhIbll6MHFkS2ZWY2R0cy9nM295anh3VGNQd2RvMVhYUndlU0wvT2ZsZHpZanNOQ2ZqUVBQWHBLWC8rMkRFNllDUG9WMXJyQ3h2eWZTcjdTV0dDam5Ja3ZrT2t5S25iUkNSZUZ0bThhT0oveDBXTCtiSC83bnRnMlp0QkpZMUxXNXQvZ3V4TlFKYUlBY2pORUFLSW1jeloxU0JmSm9DWkxwWnJQS0dURTFEclBCVE9aaEEzcytjSEx1WUtsWlVSQXh3SXZML2Y5My8rL2JRb0hhc1k3TU5zT0JSc2JMQVpSOFJhSjJGT0ZGb2RabGZzbGIxSHBuOCtMM1oxWGQvOXZMZkRCcTZETjFWcWI1QjVqLzZCRmtoQWhGQUFBQVhCZlVpa1V3aUFCRDJBZ01DQ0doUmZHWXlxS09hVnl5L1JYZUdKWWZmKzR4M2MyZU5MT1hzOW04cTVmenVBdXpDR0hpb280R2JZZFZyclFrY09EalNENjVFekdadkpoalhUL09mUy8vT2NwZitRMU54U2wzbkFiSC8rMkxFNUFBVEhabHZwNkV0eVpJYXJ6anhtbWx6dDdiaFUvZVU4M1dxQTFBQUtDQUFHUEZpekNKK0JnYUtjV212TGtFTFJpVWNJZzNZQ2tlL3hsVkozbEw1T3BLWjU4OFhqWmYyYTFNVGJBZTZkZi81ZnJMMnFoMEw0bC9BVTVUYWpiUmNnYmlyQjc4azFFakRSR0lUTFN5UjB1eE0vWHpFNVhQSkpibW82K3lIL1IramVtanl2OGt5SWt2c1VFeVFZakl0NzhZQW5CQUFBSUFGVVdOWlZXaEdaZmN1VzlDS3NybWloVjFReFJqMnNZZG0vcGFmL3BtS1ZxTk5vOUNFejJxMlNzODRDaVZJWDF6Y3pmSG05U054ZWlYUElCMkxFcEhoSnA5N0RPMFgyaTV4Q3RnU01zaFlPbHp6djA5cTBQV1pmMURxMy82a1pxbUdYUlVkV2RUS04xa1gvL3RneE4yQURRRFpjOGVNendtc3BtNDg4dzNvbWZ0dDFtT2tVYTE3KzNkRDl2eEYxUWhBQUFBZ0FGaVJaNVZkam1saEtCV2RVVkl3dGUwclNrVHgwNmNnN0tPMXEzN3YzdGMrL2poanpmZFN1aTNLLzFFYk5kbTg1TVMzbjQvR1V5Ly82OVVtaGdLRzV0d0tGVWlBTXRsMFNBUVBtczJqZnFtdHRHVVlyTUl5S1V4NUpTK2o3Q2RzUnVwZXIvK2t6bEpLVTdTSEVpMnM5VVFLN3M4eU1LZEtnZlBrM0diLzg0b0tBbTRBQThOSnRNMjloQzZtYWNHaHAzWEplenhibnF6UjcydDdxS3VVVVVPR1lnbEw5aE9YVFFrVU5XUlRuei8rOWYvTTdJaTF5ejBna2V5SkI1elRkbUgrK1lObTJvZ0NRWU1ydFZHRGV1Ly9WNklWUWxPSXBIVnMvL3RneE91QWp1VmxhWXdrVThIOEoyMDloWXA1eTYxKzk1dXFZWDNsdytjQnhBQUFCZ0NDcmlFTGFSTExKaGtOc0xDbG1FV2xaaEhtL2JyZHN2STVyOFBOS3pNRG5yTVNqWnZOUEpxRXFveldjVWFIWE1MVHBRWXJmMmVRVktXOEVxSnFUSmJSRkltaWFCYVB4N1Jka2lScHNteUVKSFMxZ1VHRWlGNHJmL2YvTHlteUtUaWNFUWtsZ3hRc3pXMy9yb2FzWnJjNTB3ZENRb0xHUXVGdlFBSVRHRWpBTVVFWXpPa3htamhQMDRhRDZXcklVMEt3em5OaHhJczRZbmoweXU4aU9LSmFKdlVqTVVkWHNiZW1Cby8ydW5GY1ZVRGdscjFmeTBVZGJRVFNVbENmVWRBaGxWaXF6Ynlzak1FWkNLUmJsWWlUWGR2LytnWXBRcFN0MmJ0L1BKS3IvL3RneE9nQUVLRlBaNHdrV3NHWUltMms4d3B4bzE2b1lVSllFalNNU3JUa1ZRRkdYQlo3NTBpVE9EMXhma0hRbVplNmdwbUtSUnZweVlsM0tmY3dQbjQ1UWtucDJxYUR0Rml4K3Nld0hqWUhIamluTHBLNlplalBMeC9QeXllSXo2SUhNOWZaczNXcjNjL3RwTktPUHdNTkhjZXVNckUya2hUYUJuT3RTdEoyK1RrLzcvVXJOMExVb1F1NkxJb01XeGhDRlcwK1JrSXlBMDhuV2ZRQU9rZ0VDNDFzZ1ZjYkEvS2xrTVJ5Q1doT3JhY09YQjlNTEhOYUVxNkNSRUVaRE5TRTB5cWFBTVM0Uml0NE9vTjJvYjFQT0xYUWMrK2Iwa2g4ekF4MEllUFQwWDByTGF1YXo3blBwUzBqcnlpRFEzT1F6ZmJEclkzdC8vL2puNW5mY3NyKy9qZHgvL3RpeE9xQVQvVmhadWVZZXNIR3E2enM5SXFnV2g2OEt4Q3F5TGp6YWM5Rk9id2NKeHJWQUNyUUFBQWw0Y1FTT1d3VXBPbVlBQlVTU2FwRTRaRHNTS25RUWEyZFl6WEVEaXBhRkhaZ3o4djJtT0xUM1N4Yys5QzJuSkc0NlVCYUk5MTl2VFliRCswOGRlUm10dGhoM1U3MVNpbkZzSjA0MXpjVGxCSGJ1L1VScVdmLy92NW5PV3F5Vm55M3Irb3Y3MVQ4UkVMUGZxTi82bFc1T3lwZWVtTFlveHkwcUFyQ1FBYXFPQktPYTdKTkNPSSsxMFNsNE5BVXNLbkhRUldHUm5FVktIb3RNWVl3NHN3TlRDRlhqWXlTdnNnRXlJMkF2VFZKSngwMkpUeXppVVBxSkNIdTU2S1NVZll4V0szR3g0VkJxbFZTaGhKQ1ZXcHZYdWhpdXRxYi9aVEp1Zi83WU1UcUFNK0ZZV0FNTUZQQjRLZ3NrWVN0c2Zsc3lUa1M3cldiaElkdDgvOXFBQUNCSUFBQUFBQUd5OEFFUjROWVZqaUlPRW9KV28zVEVrMTVGMmVsUHZMbnFzMUZWeHVvcXlJaThnVmxqTklwTXpTUnQ0ckxDOGlyZURXMUQ3NE1JSjdFbG1ldE9MTUZiVHFwVjZndmZyM2FhNm9GQXhuZlFTZGxWbG5KbmtQWnppN05XLzZ1MVhzZzFDdnNXekg2dmM2RUZsQjhXQmk5UC9VZ2wwcGExQ2dRQXhibU1TSEs2SkhJYnBkejFQV0Mzb1ZoY0p0aUo0bDU3Y3FLRDgzYkZjcEp4UzlROTFCVFlqdjN0M2hrY2g5WjlmOW9yeCs3dnFFSFQySVNXQTByMi9HTGdoR2RDVHVxbjBJU2R0cXlWM2thckVuZjdiVjF0MVRzM2R6bklHQnNHdi83WU1UbmdJL1phMlZzTVdmQnRxWnM0UFNkYVhFQU1SeTc2eUFvZ1V5SUFCSnl6Q0FpWFJFaWRMMnNOdEJiUEpjOWJuMUg3eXliTnlZbDBqaEt5WDlzdDhXdHV3UWNYeExQU1dCSkxxazl0WXJFbFlvdmh4MUpBbWhXZXN6WTRiUmwzdEZsZEswbjB5aGZOY00vRG9VYUdxUW5oMkY5WERZU2VBUHhWbUp1V1FuRDVMcWlPQWVTc2RuQm1IQ1dxV0ZiZUZTY0hTMUpZbHNPSHpKMjMwc3lwT2w3L3M5QzFsVHpjejJJWXI5NzI5S3AzMlp5MEN0aWlMcldjdTNqQitwcGJ2M2JSNDNKYVlqcW1kWWg5b2dDWEJYbjV4MVBVNGlWRjdSQ1JRemFkWmpSWG5GT0JiS1RXcUJDblhJQnBZRUZMSXAyRkdRM21rM0l2MWwxTHBmZGxqbUEyZi83WU1UcEFBOUZZV1hIcExIQnQ2dnVOUE1LT0R3MFdxMGNIRVFYYmFMWERJY1R6UCsvblBKdnlhZmMwLytYdUdrV2xxb1l3RWhGU0EwdHJVVWR6UjlUWjNsV2VIa2lBQVVKQ3lqTnZDTEdoSzBaTEdkQ2Ria3N3cXlVL256TStmT0xHcHErQUhkWllYMjkxd1lTYzVpUnY5VFg1V3o5ci92dWZPOU5DVVBlOGliYVUzZHdZa2xqNTlyMmdreUloZW9pcTQ2RlU1WStqU0FoWjRkc2MvWTV3cFJhOUF1MWFQTU5McTdxNGlBQzJYWXpqNUxFYUJDbG9rQ1FzZjVvSmhoaXR4MVBXMTNHaUVjSEVXYzdxYkFobVZrVGp1VE82RnFyTzdPekUreTBJcTFWa2J0NHpYU1dHTEpuakR0RVRLQ3k5ajVxV3ZUWTc5M1NQdEl1SHpndWhicjR4Ly83WU1UdEFCVzVoV21NUFpISm5LZ3Z2UFdOd0R3UlNTUE1Vamk3WjNRbFJrdWhjVUFBQ1RFcURXZkdpaGFHSDRmNmtOMVFMZzgyR1ZQS3NGeUNTR29BWDF1bmhWQmJOKzM3WmwrTmJUL2tsTzVqRjFzc3p0UHlHYVUxNmlnQktWclo2aXF2UGFaNjF3bk5neEc2bDFqR01xNmxYUGwyWExObTYxNWxCdkFyaE1mT1ZWWXBmaHQzMzdGRWVhNG85TXU3Z29oejE5dS92UHU3NnpobmRsTXpSdUVBQXdoR1doNkNZNUJPUFJBQkc1RWVIVlhjd0haNjlYSzArMlU2WHNuWE8yWnJYS1d6SE94LzV0SDlPNXUzVXBidWZ5azQvYmVldEtkNXU4UHJ5dUZad3ZzdGZ5bEhGaCtqYU54TE56eUZxTnBqNXJ6SE5YczZFQlFVcklnVUxoU3REUC83WXNUYWdBenMzWG5uak5EQm9aOXV2UEthTUN0Si9jbUsyYmxxWmNMcVJEVkNtd3dRV0RvZm9wK2x0bWxzZGNiUkFLWTJVTkhRZnE4Z1NWR1FjY1N4dzdPeFJxbzZYQi9qREdySU1SVHlkS0FNRGlua0xSeUNpUW5Xejh6MEtkUWt3dFdFRExvVWVGaEl5SllpRmRCajAzTEdCMTNGalhjM1JPN01wcFV6OHBHTktkR2ZZNkUvRUhEd0ZzRTNXMFBsSC9URHEwUTVrNWNvQVJVSDhwaVhIZytORXpTOUtBM3pwVTUybi8xZWhjSDNZSTBqOXhoa0ZKMmhPRmpFM0xiak9MaFdrN0NGa1lqbkRORkVSdDNBbER2TGJzU1pHeXFuSSt3b3ZzNmZuNGhqd0JFZmZhc3h6RFhNT0xmbklMMWRwUnEwVkdIN2ZOWUhhVHBBQ0pidmtJMUdwQWYvKzJERTZ3QVBnUmxwaDVtUHlmOHJianpHRG5ocE1VcWxaVVZCUlVjQUFpamFrMmNSZWcwRUd5bzdDSlVjVkpNc056T1JoWm5qRW9rNUxkbHBMZDgvdTVQNzVOM21WWDIzWmRPNy9qcjNGNVYvYXZuZjFmbkgxQ1ZjazQvYWJYOXJ5UXhaRzk0aXlTSm81RlNqei95dW5OT0toNUh2TFBDdkJraGJ2UnhqUW84YVdzV05JZGE4cUdTSUJIcWNLdk9EOTE1cVVDaVhKdDlPeXlxcm1pcklrQUFHMkUvSHlkcHZGelNoZjByQlRpRktCWEh6TE1nSThCdlhlZ1JOT01sZWM0c0l0RkJQd2pJSmNGRythekk1amZ4M3JVYnJmMzM3L0NNanJmTitmUmltMnRkMnJKdWNYRktJZkFsYzR3eWRQdG9ZclE2cUdVL1VJejkxTFZvb0p0V0lCcVAvKzJERTVRQU5CVGQ5cDR5ekVkSWlMYmp4c21oalg2Snh4MTQ0WHpKeGRiWkZjbE5UQlVBRGNpVUVDT0ZsU0NMT0J6U1RWZy9FVy9tYUdPWmllTmpkbkZmNW80SVNlVDd2b1VpdlVIWWJCZzB5VXg2S1NNWDlXU1phSTFzQVFsQnZXV2h3UmhOSXZRZ0F4RkZLS0Fzb2ZMbjZiYktvVVVGbHpra1MvWFRYaHlrMFVIWTB5a3d6MGU1bXk5VlZ6ck1WQldtU2hnWENHSjJnTmg5N2h5VDhkYW9xSW9rUnFBQVZ3UnRBTDF2N2JxNEQ3dkp1UFNaZ2NOeTUzTnl5TjFMSERFS3phQkV2Q1ErbjNERTVFNmxxWDAzTEtlYjkycDVIZmJJcEtnNU52MHVGVEhqU0l5b1ZhVlZsU3NZUUt3cU01MjA2U2kzMVhYZmZrTDNNdkdpaWdmc1VJQnovKzJERTdvQVFOUk5weDZYeHdkY2g3Znp6SmpnNnEweW9YT3ZYSFI2VXRVcmUwQUp6RUZJMEFBVTd3SFVXUnlVNEhKS2htUFMzaWlaV0ZuZmp2Y3lmQ1pHc0VMZFpqMmgvYVlYMmIrV0lIS1ppVzZ3MHEvYm4vdnV2dVg2eU41TGRSVTdaUWNTbFU0NHRoOEhCWFE0a1ZNeVhVczNQdGJrV3M5UVoyNzhqYVM5NHhBNGJnV1U2U0d1UkhGeStVNEhoOVFJektmV1JUWklnQW1BQVJBQUE3c2xwQzNnOTFsNlBOeFBjODFRYmx6M0ljOU1kb1BxT0RMWjB5MFc5aGFSaVVTeGtMNGtydVpGWWhreGExcVo4NlVkcWJ6amJUQ2x4eXl0OW1VN0ZzU2NvMVFRZEpJc1FERmloaDVFa2VvdVRJTzNYZjgxL21mYzMrVy9yTTN2UjArLzA2K24vKzJMRTZvQVFGU3R0eDQwekFjVWhMam1CcGloVmRGbEo5RG5tVkdiMk9vcnlFQ0lBTXhRQ0FDZUh5Q01IaHpabGdFTmhIUnNVTGNCQjhjNDBFOGlnY3BSVFI2UXRrTU14ZTRlQllmbFBxRnA1ZWxRbHE4M082dU5LaXhuSkJXVm5BQXgydjF5dlBIMjNKTnZyK2RYQzZLa0Z4VU92WHJMekwvLzZjMSt2azdlSmNUSUVlWG43Q0lBQ0FBSUFBQTdDS2NPdHlNVmNEMk9PaE45bk5FU0JhTXBNSDdlNmxleEhEVUc4MjZzaVlFRVBPVEJwcHNtUk1ydU9rVTB2RGZEKzcvblBmVnlTWXZGWm95TUV4VzB2Zmk3REtaMFVYMUhMbzRwa0VMbTIzVzJLQlF4OFJrOVZ0MEhZSUNDSGhVWEN6dXdnSU5vTVRLQ1FJUzFEY3cvL05DL2ZoSW4xLy90Z3hPb0FEczB0YmNla2M4SGdwYTE0OUpuZ3pPSmdZczMrd0VjVEI5T0VNQ0VRTWdBQUJuNU15YlhONVlNeFJGME5LcUppcGRDTUNocENmUFlyN2V0ZVVweHBVWkMrTndoYXFKRTNIVVNRN3lzZFp2Ny9WT3lkd1dTS3RKVHVUYXFGUWFPcmtjSXBFZG9BTkF5akJGTm9HbFJvMnE0OFNnYVVOamVMSW9LcG1TVkYxbTNSS0NQWTF3YTBjVUhRYW9yT25sZmlWSHdtam1NajN3elVIUk9KTjJ6L1U1MUJ6MWNBM2MzaVpyZGxWUkkxTmtzQUZ5QWJJeEdBZ3FrRStpQnNLRitRNlJPd1MzclBQSTlSbW1FYWs4bWkxL0IxcEorNmRPcUdDVUdDSGN2dVdiM0JrSkh6eXEyRW9pQnN1R2ltWjFOME5XSmRoendzUUhhSXNESVplaTk3Ly90Z3hPcUFETnhwYytld3h3b2tNRzI0OUk1NFExcEZRNENoRnAxa28vWWVRV2V0eS90dVdvVXhBaEFDQUFFQUJ3M0E0Qk5WR01hSVljVXUwZE10TGNWem1YaDY4WVRaZzg4ZTEwckpJdzQ0Mmg5M0E4a2xSQXhBQmFOR2JkYXZWekd0YjF0SmlidzlRVFB1VUxNT3NXUVZnM1k3T2VIT0piRnBONjZ5a3UrdVkrK1AvL252dWIvMmhhcWVIWjhsbVBQTDJCTlhlM1NXK0hmK2c0UkxVQlFMTDNLRkFLVUFRQWs5S2tzUEVsenpEaEFnTEwwdTJISit5MU1GcHBwd0hjQ3pnaU1abWt5K0NKUTZGTmdhUVRIZTlJZ3RGR1dpUWlBSU5oSmM5d2kxUzE0SXYwc1ZaUzROSkJLK3hhc0FScWRjVmw4cy9LTlZzL3RRODF1Z1NOTDlJTGZsLy90Z3hPcUFFZUZsYjhlazA4bWltZTk4OUkzWU0ySnlPeTJ6akxyV0VOVllCZEdrbm9lNXZXTWRpRlBLc2NuMi9scWxzMXUyZnExdFp4WEtOV2JXNjJxdUdPTzdtT1AzNkQ1Ull2Wi9mK3ovZDJ2eS9lTlg4cXV1OHo3MjlobmNzUnlrdTFibExQV3B5dld2OGxWV2ozbDluSExmZVcrOG11Njd6TzVsamIzOTZ6dXhnQUFBQU94SzZNUVVuS05SUTNoRGxTZngxTzA2aHJ3bFFtd0JRZUFCQUJoR2tWRlJWcFZhZ29XRmxyOVZGUlc1V29LT3YrVlZZS0ZsaG1iVWtWdVZXdG1iaHI1Ly9obTFXNVZWNEtGZ2tIYzhXQnFKZjhTeEtkRVFjRVI2Q3YvNnpzN0Jwd05SS2QvV0FEVG9DaTU0VDQ1a0tMcUppc1h2SXJpL0k2RW5sVkJsLy90Z3hPYUFEc1ZCY2ZUMEFBdFRzeTEzTTRBQU9WWjc2ejYrUEJaZm1qNk5iVnJQclcyd3AyZFd2WXZ0Qm8rMFl5bFl6Ly8vaGlZMTZGSmlabUZWU0RMR1pxQWdGUThGUVZkQlgvbGh3dzhHc1M5WjMvLy9EaForSWp3ZEpVeEJUVVV6TGpFd01GVlZWVlZWVlZWVlZWVlZWVlZWVlZWVlZWVlZWVlZWVlZWVlZWVlZWVlVBbzFkWFVWbFNwd3VnTm1SVUZRV0R4T2VhVlNiUWtSWkc1cE9EU3F5VTRUYzBLUkVNakp3UGg0UmlnWERJaUtCMGFmUDVkdHd5Ly9vdXR5aGtjcUhZeFVSVzdsRElkbi82Zi8rdC9Lbi8vLy8vLy8vL2RVUi83bFE0a0NDZ2c1MFNURUZOUlRNdU1UQXdxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxLy90aXhMa0FEVHpaUzN6MEFBR0VHcU9rOFE5SXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFURUZOUlRNdU1UQXdxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXYvN1lNUzRBOHdWeE9Ra21Gb1lBQUEwZ0FBQUJLcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFURUZOUlRNdU1UQXdxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXYvN1lNU0hnOEFBQWFRQUFBQWdBQUEwZ0FBQUJLcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXYvN1lNU0hnOEFBQWFRQUFBQWdBQUEwZ0FBQUJLcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcWc9PScpOwpsZXQgYWMsbXV0ZT1mYWxzZSxuYjtjb25zdCBsYXN0Uz17fTsKZnVuY3Rpb24gZW52KGcsdCxhLGQsdil7Zy5nYWluLnNldFZhbHVlQXRUaW1lKC4wMDAxLHQpO2cuZ2Fpbi5leHBvbmVudGlhbFJhbXBUb1ZhbHVlQXRUaW1lKHYsdCthKTtnLmdhaW4uZXhwb25lbnRpYWxSYW1wVG9WYWx1ZUF0VGltZSguMDAwMSx0K2ErZCl9CmZ1bmN0aW9uIG9zYyh0eSxmMSxmMixkLHYsZGw9MCl7Y29uc3QgdD1hYy5jdXJyZW50VGltZStkbCxvPWFjLmNyZWF0ZU9zY2lsbGF0b3IoKSxnPWFjLmNyZWF0ZUdhaW4oKTtvLnR5cGU9dHk7by5mcmVxdWVuY3kuc2V0VmFsdWVBdFRpbWUoZjEsdCk7by5mcmVxdWVuY3kuZXhwb25lbnRpYWxSYW1wVG9WYWx1ZUF0VGltZShmMix0K2QpO2VudihnLHQsLjAwNSxkLHYpO28uY29ubmVjdChnKTtnLmNvbm5lY3QoYWMuZGVzdGluYXRpb24pO28uc3RhcnQodCk7by5zdG9wKHQrZCsuMDYpfQpmdW5jdGlvbiBub2lzZShkLHYsdHksZixkbD0wLGYyLGF0PS4wMDUpe2NvbnN0IHQ9YWMuY3VycmVudFRpbWUrZGw7aWYoIW5iKXtuYj1hYy5jcmVhdGVCdWZmZXIoMSxhYy5zYW1wbGVSYXRlKjIsYWMuc2FtcGxlUmF0ZSk7Y29uc3QgeD1uYi5nZXRDaGFubmVsRGF0YSgwKTtmb3IobGV0IGk9MDtpPHgubGVuZ3RoO2krKyl4W2ldPU1hdGgucmFuZG9tKCkqMi0xfQogY29uc3Qgcz1hYy5jcmVhdGVCdWZmZXJTb3VyY2UoKSxmbD1hYy5jcmVhdGVCaXF1YWRGaWx0ZXIoKSxnPWFjLmNyZWF0ZUdhaW4oKTtzLmJ1ZmZlcj1uYjtmbC50eXBlPXR5O2ZsLmZyZXF1ZW5jeS5zZXRWYWx1ZUF0VGltZShmLHQpO2lmKGYyKWZsLmZyZXF1ZW5jeS5leHBvbmVudGlhbFJhbXBUb1ZhbHVlQXRUaW1lKGYyLHQrZCk7ZmwuUS52YWx1ZT10eT09PSdiYW5kcGFzcyc/MS4yOi43O2VudihnLHQsYXQsZCx2KTtzLmNvbm5lY3QoZmwpO2ZsLmNvbm5lY3QoZyk7Zy5jb25uZWN0KGFjLmRlc3RpbmF0aW9uKTtzLnN0YXJ0KHQpO3Muc3RvcCh0K2QrYXQrLjA2KX0KZnVuY3Rpb24gYmxhc3QoZGwsbGVuKXtjb25zdCB0PWFjLmN1cnJlbnRUaW1lK2RsLG89YWMuY3JlYXRlT3NjaWxsYXRvcigpLGw9YWMuY3JlYXRlT3NjaWxsYXRvcigpLGxnPWFjLmNyZWF0ZUdhaW4oKSxnPWFjLmNyZWF0ZUdhaW4oKTtvLmZyZXF1ZW5jeS52YWx1ZT0yOTAwO2wuZnJlcXVlbmN5LnZhbHVlPTM4O2xnLmdhaW4udmFsdWU9LjA1O2cuZ2Fpbi52YWx1ZT0uMDY7bC5jb25uZWN0KGxnKTtsZy5jb25uZWN0KGcuZ2Fpbik7by5jb25uZWN0KGcpO2cuY29ubmVjdChhYy5kZXN0aW5hdGlvbik7by5zdGFydCh0KTtsLnN0YXJ0KHQpO28uc3RvcCh0K2xlbik7bC5zdG9wKHQrbGVuKX0KZnVuY3Rpb24gc2Z4KG4sdj0xKXtpZihtdXRlKXJldHVybjt0cnl7aW5pdEF1ZGlvKCk7aWYoIWFjKXJldHVybjtjb25zdCBub3c9cGVyZm9ybWFuY2Uubm93KCk7aWYobGFzdFNbbl0mJm5vdy1sYXN0U1tuXTw0NSlyZXR1cm47bGFzdFNbbl09bm93OwogaWYobj09PSdwaWVjZScpe29zYygndHJpYW5nbGUnLDMyMCt2KjIyMCwxMTAsLjA5LC4yOCp2Ky4wNSk7bm9pc2UoLjA0LC4xNip2LCdiYW5kcGFzcycsMjIwMCl9CiBlbHNlIGlmKG49PT0nYmFsbCcpe29zYygnc2luZScsNTYwK3YqMzAwLDE5MCwuMDksLjM0KnYrLjA1KTtub2lzZSguMDMsLjIyKnYsJ2hpZ2hwYXNzJywzMjAwKX0KIGVsc2UgaWYobj09PSd3YWxsJyl7b3NjKCdzaW5lJywxNTAsNTUsLjEyLC4yMip2Ky4wNCl9CiBlbHNlIGlmKG49PT0na2ljaycpe25vaXNlKC4yLC4yKnYrLjA0LCdiYW5kcGFzcycsNTAwLDAsMjYwMCk7b3NjKCdzaW5lJywyMjAsNzAsLjEzLC4zKnYrLjA1KX0KIGVsc2UgaWYobj09PSdzZWxlY3QnKXtvc2MoJ3NxdWFyZScsNjUwLDkwMCwuMDUsLjA1KX0KIGVsc2UgaWYobj09PSd3aGlzdGxlJyl7Ymxhc3QoMCwuMjgpO2JsYXN0KC4zOCwuNSl9CiBlbHNlIGlmKG49PT0nZ29hbCcpe25vaXNlKC40LC4zLCdoaWdocGFzcycsMjUwMCwwLDkwMCk7bm9pc2UoMS44LC4xNSwnYmFuZHBhc3MnLDkwMCwwLDE4MDAsLjUpO29zYygnc2F3dG9vdGgnLDQ0MCw0NDAsLjYsLjA1LC4xKTtvc2MoJ3Nhd3Rvb3RoJyw1NTQsNTU0LC42LC4wNCwuMSl9CiBlbHNlIGlmKG49PT0nY29uYycpe29zYygnc2F3dG9vdGgnLDMyMCwxMTAsLjU1LC4xMik7bm9pc2UoLjUsLjA4LCdsb3dwYXNzJyw1MDApfWVsc2UgaWYobj09PSdjb2luJyl7b3NjKCdzcXVhcmUnLDk4OCw5ODgsLjA3LC4wNyk7b3NjKCdzcXVhcmUnLDEzMTgsMTMxOCwuMiwuMDcsLjA3KX1lbHNlIGlmKG49PT0ncG9zdCcpe29zYygndHJpYW5nbGUnLDE1MDAsMTEwMCwuMywuMjIqdisuMDUpO29zYygnc2luZScsMjIwMCwxODAwLC4yLC4xKX1lbHNlIGlmKG49PT0nd2luJyl7WzUyMyw2NTksNzg0LDEwNDddLmZvckVhY2goKGYsaSk9Pm9zYygndHJpYW5nbGUnLGYsZiwuMjUsLjIsaSouMTMpKX19Y2F0Y2goZSl7fX0KCmZ1bmN0aW9uIHRvZ2dsZU11dGUoKXttdXRlPSFtdXRlO2F1Lm11dGVkPW11dGU7JCgnbWInKS50ZXh0Q29udGVudD1tdXRlPyfwn5SHJzon8J+Uiid9CmZ1bmN0aW9uIHBvc3QodHlwZSxzY29yZSx3b24pe3RyeXtwYXJlbnQucG9zdE1lc3NhZ2Uoe3NvdXJjZTonbm92YS1hcmNhZGUtZW1iZWQnLGdhbWU6J2FtaXJzaGFoaScsdHlwZSxzY29yZTpzY29yZXx8MCx3b246ISF3b259LCcqJyl9Y2F0Y2goZSl7fX0KaWYoZW1iKSQoJ2hiJykuaGlkZGVuPWZhbHNlOwpjb25zdCBJT1M9L2lQYWR8aVBob25lfGlQb2QvLnRlc3QobmF2aWdhdG9yLnVzZXJBZ2VudCl8fChuYXZpZ2F0b3IucGxhdGZvcm09PT0nTWFjSW50ZWwnJiZuYXZpZ2F0b3IubWF4VG91Y2hQb2ludHM+MSksU1RBTkQ9bmF2aWdhdG9yLnN0YW5kYWxvbmU9PT10cnVlfHxtYXRjaE1lZGlhKCcoZGlzcGxheS1tb2RlOiBzdGFuZGFsb25lKScpLm1hdGNoZXMsSEFTRlM9ISEoZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnJlcXVlc3RGdWxsc2NyZWVufHxkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQud2Via2l0UmVxdWVzdEZ1bGxzY3JlZW4pOwpjb25zdCBJT1NUSVA9J/Cfk7Eg2KLbjNmB2YjZhjog2K/aqdmF2YfigIzbjCDYp9i02KrYsdin2qnigIzar9iw2KfYsduMICjirIbvuI8pINix2Ygg2KjYstmG2IwgwqtBZGQgdG8gSG9tZSBTY3JlZW7CuyDYsdmIINin2YbYqtiu2KfYqCDaqdmGINmIINio2KfYstuMINix2Ygg2KfYsiDYotuM2qnZiNmG2LQg2KjYp9iyINqp2YYg2KrYpyDYqtmF2KfZheKAjNi12YHYrdmHINio2LTZhy4nOwpmdW5jdGlvbiByZXFGUygpe2NvbnN0IGVsPWRvY3VtZW50LmRvY3VtZW50RWxlbWVudCxmPWVsLnJlcXVlc3RGdWxsc2NyZWVufHxlbC53ZWJraXRSZXF1ZXN0RnVsbHNjcmVlbjtpZihmKXt0cnl7Y29uc3Qgcj1mLmNhbGwoZWwpO2lmKHImJnIuY2F0Y2gpci5jYXRjaCgoKT0+e30pfWNhdGNoKGUpe319dHJ5e3NjcmVlbi5vcmllbnRhdGlvbi5sb2NrKCdwb3J0cmFpdCcpLmNhdGNoKCgpPT57fSl9Y2F0Y2goZSl7fX0KZnVuY3Rpb24gZnNCdG4oKXtpZihIQVNGUylyZXFGUygpO2Vsc2UgdG9hc3QoSU9TVElQKX0KZnVuY3Rpb24gZW50ZXIoKXtyZXFGUygpO2luaXRBdWRpbygpO3Nob3dNZW51KCl9CmZ1bmN0aW9uIHNob3dDb3Zlcigpe3N0YXRlPSdtZW51Jztvdi5pbm5lckhUTUw9YCR7Q1J9PGgxPtin2YXbjNixINi02KfZh9uMPC9oMT48YnV0dG9uIG9uY2xpY2s9ImVudGVyKCkiPtmI2LHZiNivINio2Ycg2KjYp9iy24w8L2J1dHRvbj4keyFIQVNGUyYmIVNUQU5EP2A8cCBjbGFzcz0iaG4iIHN0eWxlPSJtYXgtd2lkdGg6MzAwcHgiPiR7SU9TVElQfTwvcD5gOicnfWA7b3Yuc3R5bGUuZGlzcGxheT0nZmxleCd9CnRyeXtjb25zdCBjPWRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2NhbnZhcycpO2Mud2lkdGg9Yy5oZWlnaHQ9MTgwO2NvbnN0IGc9Yy5nZXRDb250ZXh0KCcyZCcpO2cuZmlsbFN0eWxlPScjMWEwZjNkJztnLmZpbGxSZWN0KDAsMCwxODAsMTgwKTtnLnRyYW5zbGF0ZSg5MCw5Nik7Zy5maWxsU3R5bGU9JyNmZmQyM2YnO2cuYmVnaW5QYXRoKCk7Zy5tb3ZlVG8oLTYwLDUwKTtnLmxpbmVUbygtNjQsLTMwKTtnLmxpbmVUbygtMzIsLTIpO2cubGluZVRvKDAsLTU4KTtnLmxpbmVUbygzMiwtMik7Zy5saW5lVG8oNjQsLTMwKTtnLmxpbmVUbyg2MCw1MCk7Zy5jbG9zZVBhdGgoKTtnLmZpbGwoKTtjb25zdCBsPWRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2xpbmsnKTtsLnJlbD0nYXBwbGUtdG91Y2gtaWNvbic7bC5ocmVmPWMudG9EYXRhVVJMKCdpbWFnZS9wbmcnKTtkb2N1bWVudC5oZWFkLmFwcGVuZENoaWxkKGwpfWNhdGNoKGUpe30KLyogLS0tLS0tLS0tLSBzYXZlIC8gc2hvcCBkYXRhIC0tLS0tLS0tLS0gKi8KbGV0IFNWPXtjb2luczoxMDAsb3duOlsnYmx1ZScsJ2IwJ10sc2tpbjonYmx1ZScsYmFsbDonYjAnLHByZXNldDonYmFsJyxjdXN0b206bnVsbCxnaWZ0OjAsb3duRjpbJ2JhbCddLGRpZmY6J21lZCd9Owp0cnl7Y29uc3Qgcz1KU09OLnBhcnNlKGxvY2FsU3RvcmFnZS5nZXRJdGVtKCdhbWlyX3NoYWhpX3YxJykpO2lmKHMpU1Y9T2JqZWN0LmFzc2lnbihTVixzKX1jYXRjaChlKXt9CmlmKCFTVi5vd25GLmluY2x1ZGVzKFNWLnByZXNldCkpU1YucHJlc2V0PSdiYWwnOwpjb25zdCBzYXZlPSgpPT57dHJ5e2xvY2FsU3RvcmFnZS5zZXRJdGVtKCdhbWlyX3NoYWhpX3YxJyxKU09OLnN0cmluZ2lmeShTVikpfWNhdGNoKGUpe319Owpjb25zdCBTSz1bCntpZDonYmx1ZScsbjon2qnZhNin2LPbjNqpJyxwOjAsYzE6JyM4ZGJjZmYnLGMyOicjMTg1MGM4JyxyaW06JyNlOGYwZmYnLG1jOicjZmZmJyxtOidzdGFyJ30sCntpZDonZmlyZScsbjon2KLYqti024zZhicscDo2MDAsYzE6JyNmZmMyNjEnLGMyOicjZDkyMzBmJyxyaW06JyNmZmUzYjAnLG1jOicjZmZmM2M0JyxtOidib2x0J30sCntpZDonaXJhbicsbjon2b7YsdqG2YUnLHA6ODAwLGMxOicjZmZmZmZmJyxjMjonIzJmYWU0YScscmltOicjZDYyODI4JyxtYzonI2Q2MjgyOCcsbTonZG90cyd9LAp7aWQ6J2ljZScsbjon24zYrtuMJyxwOjEwMDAsYzE6JyNmMGZkZmYnLGMyOicjM2VjNmU4JyxyaW06JyNmZmZmZmYnLG1jOicjMWI3ZWEwJyxtOidzdGFyJ30sCntpZDonbmVvbicsbjon2YbYptmI2YYnLHA6MTMwMCxjMTonI2M0ZmY4YScsYzI6JyMwYWE4NGYnLHJpbTonI2VhZmZkMCcsbWM6JyMwNjM2MWMnLG06J2JvbHQnfSwKe2lkOidnb2xkJyxuOifYt9mE2KfbjNuMJyxwOjI1MDAsYzE6JyNmZmYxYTgnLGMyOicjYzg4YTAwJyxyaW06JyNmZmY3Y2YnLG1jOicjN2E0YjAwJyxtOidzdGFyJ30sCntpZDonZGFyaycsbjon2LPbjNin2Ycg2KfZhNmF2KfYsycscDozNTAwLGMxOicjNmI2YjhjJyxjMjonIzBiMGIxNCcscmltOicjOWFhMGZmJyxtYzonIzlhYTBmZicsbTonZG90cyd9LAp7aWQ6J3JveWFsJyxuOifYs9mE2LfZhtiq24wg8J+RkScscDo2MDAwLGMxOicjYzA4Y2ZmJyxjMjonIzRhMTRhOCcscmltOicjZmZkMjNmJyxtYzonI2ZmZDIzZicsbTonY3Jvd24nfV07CmNvbnN0IE9QUD17aWQ6J3JlZCcsYzE6JyNmZjlhYTInLGMyOicjYzExMjFmJyxyaW06JyNmZmUwZTMnLG1jOicjZmZmJyxtOidzdGFyJ307CmNvbnN0IEJMPVt7aWQ6J2IwJyxuOifaqdmE2KfYs9uM2qknLHA6MCxhOicjZmZmJyxiOicjY2ZjZmNmJyxkOicjMjIyJ30se2lkOidiMicsbjon2YbYptmI2YYnLHA6OTAwLGE6JyNlZmZmYjAnLGI6JyM3YmQxMDAnLGQ6JyMxZTNkMDAnfSx7aWQ6J2IxJyxuOifYt9mE2KfbjNuMJyxwOjE4MDAsYTonI2ZmZjNiMCcsYjonI2Q3OWEwMCcsZDonIzVhM2EwMCd9LHtpZDonYjMnLG46J9ii2KrYtCcscDoyNjAwLGE6JyNmZmQ5YTAnLGI6JyNlODQzMWEnLGQ6JyM0YTBkMDAnfV07CmNvbnN0IG15U2s9KCk9PlNLLmZpbmQocz0+cy5pZD09PVNWLnNraW4pfHxTS1swXSxteUJhbGw9KCk9PkJMLmZpbmQocz0+cy5pZD09PVNWLmJhbGwpfHxCTFswXTsKY29uc3QgUFJFPXtiYWw6e246J9mF2KrYudin2K/ZhCcscDowLGY6W1suNSwuOTNdLFsuMjUsLjY4XSxbLjc1LC42OF0sWy4zLC4zOF0sWy43LC4zOF1dfSxkZWY6e246J9iv2YHYp9i524wnLHA6NzAwLGY6W1suNSwuOTNdLFsuMiwuNzJdLFsuNSwuNjRdLFsuOCwuNzJdLFsuNSwuMzRdXX0sYXR0OntuOifYqtmH2KfYrNmF24wnLHA6OTAwLGY6W1suNSwuOTNdLFsuNSwuN10sWy4yLC4zNl0sWy41LC4yOF0sWy44LC4zNl1dfSxkaWE6e246J9mE2YjYstuMJyxwOjEyMDAsZjpbWy41LC45M10sWy41LC43Ml0sWy4yMiwuNTJdLFsuNzgsLjUyXSxbLjUsLjNdXX0sd2lkOntuOifZvtmH2YYnLHA6MTUwMCxmOltbLjUsLjkzXSxbLjE0LC42XSxbLjg2LC42XSxbLjM0LC4zNF0sWy42NiwuMzRdXX19Owpjb25zdCBteUZvcm09KCk9PlNWLnByZXNldD09PSdjdXN0b20nJiZTVi5jdXN0b20/U1YuY3VzdG9tOlBSRVtTVi5wcmVzZXRdLmY7CmxldCB0b2FzdFQ7ZnVuY3Rpb24gdG9hc3QodCl7Y29uc3QgZT0kKCd0b2FzdCcpO2UudGV4dENvbnRlbnQ9dDtlLmNsYXNzTGlzdC5hZGQoJ29uJyk7Y2xlYXJUaW1lb3V0KHRvYXN0VCk7dG9hc3RUPXNldFRpbWVvdXQoKCk9PmUuY2xhc3NMaXN0LnJlbW92ZSgnb24nKSwxNzAwKX0KZnVuY3Rpb24gZWFybihuKXtTVi5jb2lucys9bjtlYXJuZWQrPW47c2F2ZSgpO3VwZEh1ZCgpO3RvYXN0KCcrJytGQShuKSsnIPCfqpknKTtzZXRUaW1lb3V0KCgpPT5zZngoJ2NvaW4nKSw2MDApfQovKiAtLS0tLS0tLS0tIGRyYXdpbmcgaGVscGVycyAtLS0tLS0tLS0tICovCmZ1bmN0aW9uIGNyb3duUGF0aChjLHMpe2MuYmVnaW5QYXRoKCk7Yy5tb3ZlVG8oLXMscyouNTUpO2MubGluZVRvKC1zLC1zKi40KTtjLmxpbmVUbygtcyouNSxzKi4xKTtjLmxpbmVUbygwLC1zKi43KTtjLmxpbmVUbyhzKi41LHMqLjEpO2MubGluZVRvKHMsLXMqLjQpO2MubGluZVRvKHMscyouNTUpO2MuY2xvc2VQYXRoKCl9CmZ1bmN0aW9uIHBlbnQoYyxzKXtjLmJlZ2luUGF0aCgpO2ZvcihsZXQgaT0wO2k8NTtpKyspe2NvbnN0IGE9LU1hdGguUEkvMitpKk1hdGguUEkqMi81O2k/Yy5saW5lVG8oTWF0aC5jb3MoYSkqcyxNYXRoLnNpbihhKSpzKTpjLm1vdmVUbyhNYXRoLmNvcyhhKSpzLE1hdGguc2luKGEpKnMpfWMuY2xvc2VQYXRoKCl9CmZ1bmN0aW9uIGVtYmxlbShjLHNrLHIpe2MuZmlsbFN0eWxlPXNrLm1jO2NvbnN0IG09c2subTsKIGlmKG09PT0nc3Rhcicpe2MuYmVnaW5QYXRoKCk7Zm9yKGxldCBpPTA7aTwxMDtpKyspe2NvbnN0IGE9LU1hdGguUEkvMitpKk1hdGguUEkvNSxxPWklMj9yKi4yOnIqLjQ2O2k/Yy5saW5lVG8oTWF0aC5jb3MoYSkqcSxNYXRoLnNpbihhKSpxKTpjLm1vdmVUbyhNYXRoLmNvcyhhKSpxLE1hdGguc2luKGEpKnEpfWMuY2xvc2VQYXRoKCk7Yy5maWxsKCl9CiBlbHNlIGlmKG09PT0nYm9sdCcpe2MuYmVnaW5QYXRoKCk7Yy5tb3ZlVG8ociouMSwtciouNSk7Yy5saW5lVG8oLXIqLjI4LHIqLjA2KTtjLmxpbmVUbygtciouMDIsciouMDYpO2MubGluZVRvKC1yKi4xMixyKi41KTtjLmxpbmVUbyhyKi4zLC1yKi4xKTtjLmxpbmVUbyhyKi4wNCwtciouMSk7Yy5jbG9zZVBhdGgoKTtjLmZpbGwoKX0KIGVsc2UgaWYobT09PSdjcm93bicpe2Nyb3duUGF0aChjLHIqLjQyKTtjLmZpbGwoKTtjLmZpbGxTdHlsZT1zay5jMjtjLmZpbGxSZWN0KC1yKi4zLHIqLjEyLHIqLjYsciouMDYpfQogZWxzZXtmb3IobGV0IGk9MDtpPDY7aSsrKXtjb25zdCBhPWkqTWF0aC5QSS8zO2MuYmVnaW5QYXRoKCk7Yy5hcmMoTWF0aC5jb3MoYSkqciouMzIsTWF0aC5zaW4oYSkqciouMzIsciouMSwwLDcpO2MuZmlsbCgpfWMuYmVnaW5QYXRoKCk7Yy5hcmMoMCwwLHIqLjEsMCw3KTtjLmZpbGwoKX19CmZ1bmN0aW9uIGRyYXdQaWVjZShjLHgseSxyLHNrLGFuZyxub1NoYWRvdyl7CiBpZighbm9TaGFkb3cpe2MuZmlsbFN0eWxlPSdyZ2JhKDAsMCwwLC4zNSknO2MuYmVnaW5QYXRoKCk7Yy5lbGxpcHNlKHgrMyx5KzUscixyKi45MiwwLDAsNyk7Yy5maWxsKCl9CiBjLmZpbGxTdHlsZT1zay5yaW07Yy5iZWdpblBhdGgoKTtjLmFyYyh4LHksciwwLDcpO2MuZmlsbCgpOwogY29uc3QgZz1jLmNyZWF0ZVJhZGlhbEdyYWRpZW50KHgtciouMzUseS1yKi40LHIqLjEseCx5LHIqLjg4KTtnLmFkZENvbG9yU3RvcCgwLHNrLmMxKTtnLmFkZENvbG9yU3RvcCgxLHNrLmMyKTsKIGMuZmlsbFN0eWxlPWc7Yy5iZWdpblBhdGgoKTtjLmFyYyh4LHksciouODYsMCw3KTtjLmZpbGwoKTsKIGMuc3Ryb2tlU3R5bGU9J3JnYmEoMCwwLDAsLjI4KSc7Yy5saW5lV2lkdGg9MS41O2MuYmVnaW5QYXRoKCk7Yy5hcmMoeCx5LHIqLjY2LDAsNyk7Yy5zdHJva2UoKTsKIGMuc3Ryb2tlU3R5bGU9J3JnYmEoMjU1LDI1NSwyNTUsLjMpJztjLmJlZ2luUGF0aCgpO2MuYXJjKHgseSxyKi42MywwLDcpO2Muc3Ryb2tlKCk7CiBjLnNhdmUoKTtjLnRyYW5zbGF0ZSh4LHkpO2lmKHNrLm09PT0nc3Rhcid8fHNrLm09PT0nZG90cycpYy5yb3RhdGUoYW5nKTtlbWJsZW0oYyxzayxyKTtjLnJlc3RvcmUoKTsKIGMuc3Ryb2tlU3R5bGU9J3JnYmEoMCwwLDAsLjM1KSc7Yy5saW5lV2lkdGg9MTtjLmJlZ2luUGF0aCgpO2MuYXJjKHgseSxyLDAsNyk7Yy5zdHJva2UoKTsKIGMuZmlsbFN0eWxlPSdyZ2JhKDI1NSwyNTUsMjU1LC4zOCknO2MuYmVnaW5QYXRoKCk7Yy5lbGxpcHNlKHgtciouMzIseS1yKi41LHIqLjQyLHIqLjE4LC0uNSwwLDcpO2MuZmlsbCgpfQpmdW5jdGlvbiBkcmF3QmFsbChjLHgseSxyLGJzLHJvdCxub1NoYWRvdyl7CiBpZighbm9TaGFkb3cpe2MuZmlsbFN0eWxlPSdyZ2JhKDAsMCwwLC4zOCknO2MuYmVnaW5QYXRoKCk7Yy5lbGxpcHNlKHgrMi41LHkrNCxyLHIqLjksMCwwLDcpO2MuZmlsbCgpfQogY29uc3QgZz1jLmNyZWF0ZVJhZGlhbEdyYWRpZW50KHgtciouMzUseS1yKi40LHIqLjEseCx5LHIpO2cuYWRkQ29sb3JTdG9wKDAsYnMuYSk7Zy5hZGRDb2xvclN0b3AoMSxicy5iKTtjLmZpbGxTdHlsZT1nO2MuYmVnaW5QYXRoKCk7Yy5hcmMoeCx5LHIsMCw3KTtjLmZpbGwoKTsKIGMuc2F2ZSgpO2MuYmVnaW5QYXRoKCk7Yy5hcmMoeCx5LHIsMCw3KTtjLmNsaXAoKTtjLnRyYW5zbGF0ZSh4LHkpO2Mucm90YXRlKHJvdCk7Yy5maWxsU3R5bGU9YnMuZDtwZW50KGMsciouMzYpO2MuZmlsbCgpOwogZm9yKGxldCBpPTA7aTw1O2krKyl7Yy5zYXZlKCk7Yy5yb3RhdGUoaSpNYXRoLlBJKjIvNSk7Yy50cmFuc2xhdGUoMCwtciouODYpO3BlbnQoYyxyKi4zKTtjLmZpbGwoKTtjLnJlc3RvcmUoKX0KIGMuc3Ryb2tlU3R5bGU9YnMuZDtjLmxpbmVXaWR0aD0uOTtmb3IobGV0IGk9MDtpPDU7aSsrKXtjb25zdCBhPS1NYXRoLlBJLzIraSpNYXRoLlBJKjIvNTtjLmJlZ2luUGF0aCgpO2MubW92ZVRvKE1hdGguY29zKGEpKnIqLjM2LE1hdGguc2luKGEpKnIqLjM2KTtjLmxpbmVUbyhNYXRoLmNvcyhhKSpyKi41OCxNYXRoLnNpbihhKSpyKi41OCk7Yy5zdHJva2UoKX0KIGMucmVzdG9yZSgpO2Muc3Ryb2tlU3R5bGU9J3JnYmEoMCwwLDAsLjQpJztjLmxpbmVXaWR0aD0xO2MuYmVnaW5QYXRoKCk7Yy5hcmMoeCx5LHIsMCw3KTtjLnN0cm9rZSgpOwogYy5maWxsU3R5bGU9J3JnYmEoMjU1LDI1NSwyNTUsLjYpJztjLmJlZ2luUGF0aCgpO2MuZWxsaXBzZSh4LXIqLjM1LHktciouNDUsciouMyxyKi4xNSwtLjYsMCw3KTtjLmZpbGwoKX0KLyogLS0tLS0tLS0tLSBwaXRjaCB0ZXh0dXJlIC0tLS0tLS0tLS0gKi8KbGV0IHBpdGNoOwpmdW5jdGlvbiBzZXRXb3JsZCgpe2NvbnN0IHc9d3JhcC5jbGllbnRXaWR0aCxoPXdyYXAuY2xpZW50SGVpZ2h0O2lmKCF3fHwhaClyZXR1cm47Y29uc3QgbnA9TkVURklYPzcyMDpNYXRoLm1heCg2NDAsTWF0aC5taW4oODYwLE1hdGguZmxvb3IoaCpXL3cpLShUK0dEKzE0KSkpO2lmKG5wPT09UEgmJnBpdGNoKXJldHVybjtQSD1ucDtCPVQrUEg7SD1CK0dEKzE0O0NZPShUK0IpLzI7UE9TVFM9W1tHTCxUXSxbR1IsVF0sW0dMLEJdLFtHUixCXV07aWYoc3RhdGU9PT0nbWVudSd8fHN0YXRlPT09J292ZXInKW9iaj1bXTtidWlsZFBpdGNoKCl9CmZ1bmN0aW9uIGJ1aWxkUGl0Y2goKXtjb25zdCBrPTIsYz1kb2N1bWVudC5jcmVhdGVFbGVtZW50KCdjYW52YXMnKTtjLndpZHRoPVcqaztjLmhlaWdodD1IKms7Y29uc3QgZz1jLmdldENvbnRleHQoJzJkJyk7Zy5zY2FsZShrLGspO2NvbnN0IFI9TWF0aC5yYW5kb207CiBnLmZpbGxTdHlsZT0nIzEyMTYxZCc7Zy5maWxsUmVjdCgwLDAsVyxIKTsKIGZvcihsZXQgaT0wO2k8MzUwMDtpKyspe2cuZmlsbFN0eWxlPSdyZ2JhKDI1NSwyNTUsMjU1LCcrUigpKi4wNSsnKSc7Zy5maWxsUmVjdChSKCkqVyxSKCkqSCwxLjUsMS41KX0KIGcuZmlsbFN0eWxlPScjMWM1YTI4JztnLmZpbGxSZWN0KEdMLFQtR0QsR1csR0QpO2cuZmlsbFJlY3QoR0wsQixHVyxHRCk7CiBjb25zdCBuPTE0LHNoPVBIL247Zm9yKGxldCBpPTA7aTxuO2krKyl7Y29uc3QgeT1UK2kqc2gsZ3I9Zy5jcmVhdGVMaW5lYXJHcmFkaWVudCgwLHksMCx5K3NoKSxhPWklMj9bJyMyYzhhMzknLCcjMjY4MDJmJ106WycjMzhhMjQ3JywnIzJmOTE0MCddO2dyLmFkZENvbG9yU3RvcCgwLGFbMF0pO2dyLmFkZENvbG9yU3RvcCgxLGFbMV0pO2cuZmlsbFN0eWxlPWdyO2cuZmlsbFJlY3QoUEwseSxQVyxzaCl9CiBmb3IobGV0IGk9MDtpPDE3MDAwO2krKyl7Y29uc3QgeD1QTCtSKCkqUFcseT1UK1IoKSpQSCxsPTMrUigpKjUsYT0tTWF0aC5QSS8yKyhSKCktLjUpKi43O2cuc3Ryb2tlU3R5bGU9UigpPC41PydyZ2JhKDI1NSwyNTUsMjU1LCcrKC4wMytSKCkqLjA1KSsnKSc6J3JnYmEoMCwzMCwwLCcrKC4wNStSKCkqLjA4KSsnKSc7Zy5saW5lV2lkdGg9Ljg7Zy5iZWdpblBhdGgoKTtnLm1vdmVUbyh4LHkpO2cubGluZVRvKHgrTWF0aC5jb3MoYSkqbCx5K01hdGguc2luKGEpKmwpO2cuc3Ryb2tlKCl9CiBmb3IobGV0IGk9MDtpPDU1O2krKyl7Y29uc3QgeD1QTCtSKCkqUFcseT1UK1IoKSpQSCxycj0yMCtSKCkqNTAsZ3I9Zy5jcmVhdGVSYWRpYWxHcmFkaWVudCh4LHksMCx4LHkscnIpO2dyLmFkZENvbG9yU3RvcCgwLFIoKTwuNT8ncmdiYSgwLDQwLDAsLjA4KSc6J3JnYmEoMjU1LDI1NSwyMDAsLjA1KScpO2dyLmFkZENvbG9yU3RvcCgxLCdyZ2JhKDAsMCwwLDApJyk7Zy5maWxsU3R5bGU9Z3I7Zy5maWxsUmVjdCh4LXJyLHktcnIscnIqMixycioyKX0KIGNvbnN0IHZnPWcuY3JlYXRlUmFkaWFsR3JhZGllbnQoQ1gsQ1ksUEgqLjIyLENYLENZLFBIKi42NCk7dmcuYWRkQ29sb3JTdG9wKDAsJ3JnYmEoMCwwLDAsMCknKTt2Zy5hZGRDb2xvclN0b3AoMSwncmdiYSgwLDAsMCwuMzQpJyk7Zy5maWxsU3R5bGU9dmc7Zy5maWxsUmVjdChQTCxULFBXLFBIKTsKIGcuc2F2ZSgpO2cuZ2xvYmFsQWxwaGE9LjEzO2cudHJhbnNsYXRlKENYLENZLTYpO2cuZmlsbFN0eWxlPScjZmZmJztjcm93blBhdGgoZywzNCk7Zy5maWxsKCk7Zy5yZXN0b3JlKCk7CiBnLmZpbGxTdHlsZT0ncmdiYSgyNTUsMjU1LDI1NSwuMTIpJztnLmZvbnQ9J2JvbGQgMjBweCBUYWhvbWEnO2cudGV4dEFsaWduPSdjZW50ZXInO2cuZmlsbFRleHQoJ9in2YXbjNixINi02KfZh9uMJyxDWCxDWSs0NCk7CiBnLnN0cm9rZVN0eWxlPSdyZ2JhKDI1NSwyNTUsMjU1LC45KSc7Zy5saW5lV2lkdGg9MztnLmxpbmVKb2luPSdyb3VuZCc7CiBnLnN0cm9rZVJlY3QoUEwsVCxQVyxQSCk7Zy5iZWdpblBhdGgoKTtnLm1vdmVUbyhQTCxDWSk7Zy5saW5lVG8oUFIsQ1kpO2cuc3Ryb2tlKCk7Zy5iZWdpblBhdGgoKTtnLmFyYyhDWCxDWSw1OCwwLDcpO2cuc3Ryb2tlKCk7Zy5maWxsU3R5bGU9JyNmZmYnO2cuYmVnaW5QYXRoKCk7Zy5hcmMoQ1gsQ1ksNCwwLDcpO2cuZmlsbCgpOwogY29uc3QgYWNfPU1hdGguYWNvcygyNy81Mik7CiBmb3IoY29uc3QgcyBvZiBbMSwtMV0pe2NvbnN0IHkwPXM+MD9COlQsc3k9eTAtcyo2ODtnLnN0cm9rZVJlY3QoQ1gtMTE1LHM+MD9CLTk1OlQsMjMwLDk1KTtnLnN0cm9rZVJlY3QoQ1gtNjIscz4wP0ItMzY6VCwxMjQsMzYpO2cuYmVnaW5QYXRoKCk7Zy5hcmMoQ1gsc3ksMy41LDAsNyk7Zy5maWxsKCk7Zy5iZWdpblBhdGgoKTtzPjA/Zy5hcmMoQ1gsc3ksNTIsLU1hdGguUEkvMi1hY18sLU1hdGguUEkvMithY18pOmcuYXJjKENYLHN5LDUyLE1hdGguUEkvMi1hY18sTWF0aC5QSS8yK2FjXyk7Zy5zdHJva2UoKX0KIGcuYmVnaW5QYXRoKCk7Zy5hcmMoUEwsVCwxNCwwLE1hdGguUEkvMik7Zy5zdHJva2UoKTtnLmJlZ2luUGF0aCgpO2cuYXJjKFBSLFQsMTQsTWF0aC5QSS8yLE1hdGguUEkpO2cuc3Ryb2tlKCk7Zy5iZWdpblBhdGgoKTtnLmFyYyhQTCxCLDE0LC1NYXRoLlBJLzIsMCk7Zy5zdHJva2UoKTtnLmJlZ2luUGF0aCgpO2cuYXJjKFBSLEIsMTQsTWF0aC5QSSxNYXRoLlBJKjEuNSk7Zy5zdHJva2UoKTsKIGZvcihjb25zdCB4IG9mIFs2LFctMThdKXtjb25zdCBncj1nLmNyZWF0ZUxpbmVhckdyYWRpZW50KHgsMCx4KzEyLDApO2dyLmFkZENvbG9yU3RvcCgwLCcjMWEyYTVhJyk7Z3IuYWRkQ29sb3JTdG9wKDEsJyMwYjEzMzAnKTtnLmZpbGxTdHlsZT1ncjtnLmZpbGxSZWN0KHgsVC02LDEyLFBIKzEyKTtnLnNhdmUoKTtnLnRyYW5zbGF0ZSh4KzksQ1kpO2cucm90YXRlKC1NYXRoLlBJLzIpO2cuZmlsbFN0eWxlPScjZmZkMjNmJztnLmZvbnQ9J2JvbGQgOXB4IFRhaG9tYSc7Zy50ZXh0QWxpZ249J2NlbnRlcic7Zy5maWxsVGV4dCgnQU1JUiBTSEFISSAg4pmbICBBTUlSIFNIQUhJICDimZsgIEFNSVIgU0hBSEknLDAsMCk7Zy5yZXN0b3JlKCl9CiBwaXRjaD1jfQpsZXQgZng9W10sbXJpbmdzPVtdLHRyYWlsPVtdLHNoYWtlPTAsZndUPTAsY2VsZT1mYWxzZSxmaXJzdD1mYWxzZSxtc2dLaW5kPSdnJzsKZnVuY3Rpb24gYnVyc3QoeCx5LG4sY29scyxzcCxsaWZlLHN6LGcpe2ZvcihsZXQgaT0wO2k8bjtpKyspe2NvbnN0IGE9TWF0aC5yYW5kb20oKSo2LjI4Myx2PXNwKiguMytNYXRoLnJhbmRvbSgpKi43KTtmeC5wdXNoKHt4LHksdng6TWF0aC5jb3MoYSkqdix2eTpNYXRoLnNpbihhKSp2LGw6bGlmZSooLjYrTWF0aC5yYW5kb20oKSouNCksbTpsaWZlLGM6Y29sc1tpJWNvbHMubGVuZ3RoXSxzOnN6KiguNStNYXRoLnJhbmRvbSgpKSxnOmd8fDAscTpNYXRoLnJhbmRvbSgpPC4zNX0pfX0KZnVuY3Rpb24gc3RlcEZ4KCl7Zm9yKGNvbnN0IHAgb2YgZngpe3AueCs9cC52eDtwLnkrPXAudnk7cC52eSs9cC5nO3AudngqPS45ODtwLmwtLX1meD1meC5maWx0ZXIocD0+cC5sPjApO2lmKGZ4Lmxlbmd0aD43MDApZnguc3BsaWNlKDAsZngubGVuZ3RoLTcwMCk7Zm9yKGNvbnN0IHIgb2YgbXJpbmdzKXtyLnIrPXIudjtyLmEqPS45Mn1tcmluZ3M9bXJpbmdzLmZpbHRlcihyPT5yLmE+LjA0KTtzaGFrZSo9Ljg2fQpmdW5jdGlvbiBkcmF3RngoKXtmb3IoY29uc3QgcCBvZiBmeCl7Y3R4Lmdsb2JhbEFscGhhPU1hdGgubWF4KDAscC5sL3AubSk7Y3R4LmZpbGxTdHlsZT1wLmM7cC5xP2N0eC5maWxsUmVjdChwLngscC55LHAucyoxLjcscC5zKTooY3R4LmJlZ2luUGF0aCgpLGN0eC5hcmMocC54LHAueSxwLnMsMCw3KSxjdHguZmlsbCgpKX1jdHguZ2xvYmFsQWxwaGE9MTtmb3IoY29uc3QgciBvZiBtcmluZ3Mpe2N0eC5zdHJva2VTdHlsZT0ncmdiYSgnK3IuYysnLCcrci5hKycpJztjdHgubGluZVdpZHRoPTMqci5hKzE7Y3R4LmJlZ2luUGF0aCgpO2N0eC5hcmMoci54LHIueSxyLnIsMCw3KTtjdHguc3Ryb2tlKCl9fQpjb25zdCBlYXNlQmFjaz14PT57Y29uc3QgYzE9MS43MDE1OCxjMz1jMSsxO3JldHVybiAxK2MzKk1hdGgucG93KHgtMSwzKStjMSpNYXRoLnBvdyh4LTEsMil9OwovKiAtLS0tLS0tLS0tIHBoeXNpY3MgLS0tLS0tLS0tLSAqLwoKZnVuY3Rpb24gd2FsbHMwKG8pe2NvbnN0IHI9by5yLGI9bz09PWJhbGw7CiBpZihvLng8UEwrcil7by54PVBMK3I7by52eD1NYXRoLmFicyhvLnZ4KSouODh9aWYoby54PlBSLXIpe28ueD1QUi1yO28udng9LU1hdGguYWJzKG8udngpKi44OH0KIGlmKG8ueTxUfHwoby54PkdMK3ImJm8ueDxHUi1yKSl7aWYoby55PFQpe2lmKG8ueDxHTCtyKXtvLng9R0wrcjtvLnZ4PU1hdGguYWJzKG8udngpKi4zfWlmKG8ueD5HUi1yKXtvLng9R1ItcjtvLnZ4PS1NYXRoLmFicyhvLnZ4KSouM319aWYoby55PFQtR0Qrcil7by55PVQtR0QrcjtvLnZ5PU1hdGguYWJzKG8udnkpKi4yMn19CiBlbHNlIGlmKG8ueTxUK3Ipe28ueT1UK3I7by52eT1NYXRoLmFicyhvLnZ5KSouODh9CiBpZihvLnk+Qnx8KG8ueD5HTCtyJiZvLng8R1Itcikpe2lmKG8ueT5CKXtpZihvLng8R0wrcil7by54PUdMK3I7by52eD1NYXRoLmFicyhvLnZ4KSouM31pZihvLng+R1Itcil7by54PUdSLXI7by52eD0tTWF0aC5hYnMoby52eCkqLjN9fWlmKG8ueT5CK0dELXIpe28ueT1CK0dELXI7by52eT0tTWF0aC5hYnMoby52eSkqLjIyfX0KIGVsc2UgaWYoby55PkItcil7by55PUItcjtvLnZ5PS1NYXRoLmFicyhvLnZ5KSouODh9fQpmdW5jdGlvbiB3YWxscyhvKXtjb25zdCBhPW8udngsYj1vLnZ5O3dhbGxzMChvKTtjb25zdCBzcF89aHkoYSxiKTtpZigoYSpvLnZ4PDB8fGIqby52eTwwKSYmc3BfPjIpc2Z4KCd3YWxsJyxNYXRoLm1pbihzcF8vMTUsMSkpfQpmdW5jdGlvbiBwb3N0QyhvKXtmb3IoY29uc3RbcHgscHldb2YgUE9TVFMpe2NvbnN0IGR4PW8ueC1weCxkeT1vLnktcHksZD1oeShkeCxkeSksbWQ9by5yKzUuNTtpZihkPG1kJiZkPjApe2NvbnN0IG54PWR4L2Qsbnk9ZHkvZDtvLng9cHgrbngqbWQ7by55PXB5K255Km1kO2NvbnN0IHZuPW8udngqbngrby52eSpueTtpZih2bjwwKXtvLnZ4LT0xLjgqdm4qbng7by52eS09MS44KnZuKm55O2lmKG89PT1iYWxsKXtzZngoJ3Bvc3QnLE1hdGgubWluKC12bi8xMCwxKSk7YnVyc3QocHgscHksMTAsWycjZmZmJywnI2ZmZDIzZicsJyNmZjZiNmInXSwzLDIyLDEuOCk7c2hha2U9TWF0aC5tYXgoc2hha2UsNCl9fX19fQpmdW5jdGlvbiBjb2xsKGEsYil7Y29uc3QgZHg9Yi54LWEueCxkeT1iLnktYS55LGQ9aHkoZHgsZHkpLG1kPWEucitiLnI7aWYoZD49bWR8fGQ9PT0wKXJldHVybjsKIGNvbnN0IG54PWR4L2Qsbnk9ZHkvZCxwPW1kLWQsdGk9YS5tK2IubTthLngtPW54KnAqYi5tL3RpO2EueS09bnkqcCpiLm0vdGk7Yi54Kz1ueCpwKmEubS90aTtiLnkrPW55KnAqYS5tL3RpOwogY29uc3QgcnY9KGIudngtYS52eCkqbngrKGIudnktYS52eSkqbnk7aWYocnY+MClyZXR1cm47CiBjb25zdCBqPS0xLjkyKnJ2LygxL2EubSsxL2IubSk7YS52eC09aipueC9hLm07YS52eS09aipueS9hLm07Yi52eCs9aipueC9iLm07Yi52eSs9aipueS9iLm07aWYoLXJ2PjEuNSl7Y29uc3Qgdj0tcnYsYmw9YT09PWJhbGx8fGI9PT1iYWxsO3NmeChibD8nYmFsbCc6J3BpZWNlJyxNYXRoLm1pbih2LzE1LDEpKTtjb25zdCBreD1hLngrbngqYS5yLGt5PWEueStueSphLnI7YS5wb3A9Yi5wb3A9TWF0aC5taW4oMSx2LzkpO2lmKGJsKXtidXJzdChreCxreSxNYXRoLm1pbigxMix2KjEuNHwwKSxbJyNmZmYnLCcjZmZlMjdhJywnI2ZmZDIzZiddLDIrdiouMywyMCwxLjcpO3NoYWtlPU1hdGgubWF4KHNoYWtlLE1hdGgubWluKHYqLjMsNSkpfWVsc2UgYnVyc3Qoa3gsa3ksTWF0aC5taW4oNix2fDApLFsnIzdiZDM2YScsJyM0ZjlmNGEnLCcjYTZlMzlhJ10sMS41K3YqLjIsMTYsMS42LC4wOCl9fQpmdW5jdGlvbiBzdGVwKCl7Zm9yKGxldCBrPTA7azwyO2srKyl7Zm9yKGNvbnN0IG8gb2Ygb2JqKXtvLngrPW8udngvMjtvLnkrPW8udnkvMjt3YWxscyhvKTtwb3N0QyhvKX1mb3IobGV0IGk9MDtpPG9iai5sZW5ndGg7aSsrKWZvcihsZXQgaj1pKzE7ajxvYmoubGVuZ3RoO2orKyljb2xsKG9ialtpXSxvYmpbal0pfQogZm9yKGNvbnN0IG8gb2Ygb2JqKWlmKG8hPT1iYWxsJiYoby55PFR8fG8ueT5CKSlvdXRHb2FsKG8pOwogZm9yKGNvbnN0IG8gb2Ygb2JqKXtjb25zdCBpbkc9bz09PWJhbGwmJihvLnk8VHx8by55PkIpLGY9bz09PWJhbGw/KGluRz8uOTU6Ljk4OSk6Ljk4NTtvLnZ4Kj1mO28udnkqPWY7aWYoaHkoby52eCxvLnZ5KTwuMDYpby52eD1vLnZ5PTA7by5yb3QrPShvLnZ4K28udnkqLjMpKihvPT09YmFsbD8uMDM6LjAxMil9fQovKiAtLS0tLS0tLS0tIGdhbWUgZmxvdyAtLS0tLS0tLS0tICovCmZ1bmN0aW9uIG91dEdvYWwobyl7bGV0IHg9by54LHk9by55LG9rPWZhbHNlOwogIGZvcihsZXQgaT0wO2k8ODAmJiFvaztpKyspe3g9UEwrby5yKzgrcm5kKCkqKFBXLTIqby5yLTE2KTt5PVQrby5yKzQ1K3JuZCgpKihQSC0yKm8uci05MCk7CiAgICBvaz1vYmouZXZlcnkocT0+cT09PW98fGh5KHEueC14LHEueS15KT5xLnIrby5yKzQpfQogIG1yaW5ncy5wdXNoKHt4Om8ueCx5Ok1hdGgubWluKE1hdGgubWF4KG8ueSxUKSxCKSxyOm8ucixhOjEsdjozLjUsYzonMjU1LDI1NSwyNTUnfSk7CiAgby54PXg7by55PXk7by52eD1vLnZ5PTA7by5zcD0xO2J1cnN0KHgseSwxMixbJyNmZmYnLCcjN2RmZmIwJywnI2ZmZDIzZiddLDIuNiwyMiwxLjgsLjA0KTtzZngoJ3NlbGVjdCcpfQpjb25zdCBpc0JvdD0oKT0+bW9kZT09PSdib3QnJiZ0dXJuPT09MTsKZnVuY3Rpb24gc3RvcFJhcCgpe3JhcHBpbmc9ZmFsc2U7dHJ5e2F1LnBhdXNlKCk7YXUuY3VycmVudFRpbWU9MH1jYXRjaChlKXt9cmFwRWwuY2xhc3NMaXN0LnJlbW92ZSgnb24nLCdvdXQnKX0KZnVuY3Rpb24gc2V0UGF1c2UocCl7aWYobW9kZT09PSdvbmxpbmUnJiZwKXJldHVybjtpZihwPT09cGF1c2VkKXJldHVybjtpZihwJiYhWydhaW0nLCdtb3ZpbmcnLCdnb2FsJywnbm9nb2FsJ10uaW5jbHVkZXMoc3RhdGUpKXJldHVybjtwYXVzZWQ9cDsKIGlmKHApe3dhc1JhcD1yYXBwaW5nJiYhYXUucGF1c2VkO2lmKHdhc1JhcClhdS5wYXVzZSgpO292LmlubmVySFRNTD1gPGgyPuKPuCDYqtmI2YLZgTwvaDI+PGRpdiBjbGFzcz0iY24iPiR7RkEoc2NvcmVbMF0pfSAtICR7RkEoc2NvcmVbMV0pfTwvZGl2PjxidXR0b24gb25jbGljaz0ic2V0UGF1c2UoZmFsc2UpIj7ilrYg2KfYr9in2YXZhzwvYnV0dG9uPjxidXR0b24gY2xhc3M9ImIyIiBvbmNsaWNrPSJzdGFydChtb2RlKSI+8J+UgSDYtNix2YjYuSDYr9mI2KjYp9ix2Yc8L2J1dHRvbj48YnV0dG9uIGNsYXNzPSJiMyIgb25jbGljaz0idG9NZW51KCkiPvCfj6Ag2KjYp9iy2q/YtNiqINio2Ycg2YXZhtmIPC9idXR0b24+JHtlbWI/JzxidXR0b24gY2xhc3M9ImIzIiBvbmNsaWNrPSJwb3N0KFwnaG9tZVwnLDApIj7wn5W5INio2KfYstqv2LTYqiDYqNmHINii2LHaqduM2K88L2J1dHRvbj4nOicnfWA7b3Yuc3R5bGUuZGlzcGxheT0nZmxleCd9CiBlbHNle292LnN0eWxlLmRpc3BsYXk9J25vbmUnO2lmKHdhc1JhcCl7YXUucGxheSgpLmNhdGNoKCgpPT57fSk7d2FzUmFwPWZhbHNlfX11cGRIdWQoKX0KZnVuY3Rpb24gdG9NZW51KCl7cGF1c2VkPWZhbHNlO3N0b3BSYXAoKTtzZWw9YWltPXNwPWRyYWc9bnVsbDtzaG93TWVudSgpfQpmdW5jdGlvbiB1cGRIdWQoKXskKCdjbicpLnRleHRDb250ZW50PUZBKFNWLmNvaW5zKTskKCdzMCcpLnRleHRDb250ZW50PUZBKHNjb3JlWzBdKTskKCdzMScpLnRleHRDb250ZW50PUZBKHNjb3JlWzFdKTtjb25zdCB0PSQoJ3RyJyk7dC5jbGFzc05hbWU9dHVybj8ndDEnOid0MCc7JCgncGInKS5oaWRkZW49IShbJ2FpbScsJ21vdmluZycsJ2dvYWwnLCdub2dvYWwnXS5pbmNsdWRlcyhzdGF0ZSkmJiFwYXVzZWQpO3QudGV4dENvbnRlbnQ9c3RhdGU9PT0nb3Zlcic/J9m+2KfbjNin2YYg2KjYp9iy24wnOnN0YXRlPT09J2VkaXQnPyfahtuM2K/ZhiDYqtix2qnbjNioJzpzdGF0ZT09PSdtZW51Jz8nJzoodHVybj09PTA/KG1vZGU9PT0nYm90Jz8n2YbZiNio2Kog2LTZhdinJzon2YbZiNio2Kog2KLYqNuMJyk6KG1vZGU9PT0nYm90Jz8n2YbZiNio2Kog2LHYqNin2KonOifZhtmI2KjYqiDZgtix2YXYsicpKX0KZnVuY3Rpb24gcmVzZXQoayl7b2JqPVtdO2NvbnN0IGYwPW1vZGU9PT0nb25saW5lJz9GT1JNU1swXTpteUZvcm0oKSxmMT1tb2RlPT09J29ubGluZSc/Rk9STVNbMV06KG1vZGU9PT0nYm90Jz9QUkVbYm90UHJlXS5mOmYwKTsKIGxldCBjbl89MDtmb3IobGV0IHQ9MDt0PDI7dCsrKSh0P2YxOmYwKS5mb3JFYWNoKChmLGkpPT57bGV0IHg9UEwrZlswXSpQVyx5PUNZK2ZbMV0qUEgvMjtpZih0KXt4PVBMK1BXLSh4LVBMKTt5PTIqQ1kteX1vYmoucHVzaCh7eCx5LHZ4OjAsdnk6MCxyOlBSQUQsbTozLHQsbjppLHJvdDowLHBvcDowLHNwOjErKGNuXysrKSouMX0pfSk7CiBiYWxsPXt4OkNYLHk6Q1ksdng6MCx2eTowLHI6QlJBRCxtOjEsdDotMSxyb3Q6MCxwb3A6MCxzcDoxLjZ9O29iai5wdXNoKGJhbGwpO3RyYWlsPVtdO2ZpcnN0PXRydWU7dHVybj1rO3N0YXRlPSdhaW0nO3NlbD1haW09c3A9cGxhbj1udWxsO2RyYWc9bnVsbDtpZihpc0JvdCgpKWJvdFQ9Qk9UVCgpO3VwZEh1ZCgpO2FpbUVudGVyKCl9CmxldCByZWNkPXRydWU7CmZ1bmN0aW9uIHJlY29yZFJ1bigpe2lmKHJlY2R8fG1vZGUhPT0nYm90J3x8c2NvcmVbMF08PTApcmV0dXJuO3JlY2Q9dHJ1ZTtwb3N0KCdmaW5pc2gnLHNjb3JlWzBdKjEwMCxmYWxzZSl9CmZ1bmN0aW9uIHN0YXJ0KG0pe3JlY29yZFJ1bigpO3JlY2Q9ZmFsc2U7c2V0V29ybGQoKTtmaXQoKTtwYXVzZWQ9ZmFsc2U7bW9kZT1tO3Njb3JlPVswLDBdO2Vhcm5lZD0wO2NvbnN0IGtzPU9iamVjdC5rZXlzKFBSRSk7Ym90UHJlPWtzW01hdGguZmxvb3IoTWF0aC5yYW5kb20oKSprcy5sZW5ndGgpXTsKIGNvbnN0IG1lPW15U2soKTtvcHBTPShtZS5pZD09PSdmaXJlJ3x8bWUuaWQ9PT0naXJhbicpP1NLLmZpbmQocz0+cy5pZD09PSdpY2UnKTpPUFA7CiBvdi5zdHlsZS5kaXNwbGF5PSdub25lJztpbml0QXVkaW8oKTthdS5tdXRlZD10cnVlO2F1LnBsYXkoKS50aGVuKCgpPT57YXUucGF1c2UoKTthdS5jdXJyZW50VGltZT0wO2F1Lm11dGVkPW11dGV9KS5jYXRjaCgoKT0+e2F1Lm11dGVkPW11dGV9KTsKIHJlc2V0KDApO3NmeCgnd2hpc3RsZScpO2lmKG09PT0nYm90Jylwb3N0KCdzdGFydCcsMCl9CmZ1bmN0aW9uIHNob290KHAsdngsdnkpe21yaW5ncy5wdXNoKHt4OnAueCx5OnAueSxyOnAucixhOjEsdjozLjUsYzonMjU1LDI1NSwyNTUnfSk7YnVyc3QocC54LHAueSw4LFsnIzdiZDM2YScsJyNhNmUzOWEnXSwyLjUsMTgsMS41LC4wNik7c2hha2U9TWF0aC5tYXgoc2hha2UsTWF0aC5taW4oaHkodngsdnkpKi4xMiwyLjIpKTtzZngoJ2tpY2snLE1hdGgubWluKGh5KHZ4LHZ5KS8xOSwxKSk7cC52eD12eDtwLnZ5PXZ5O3N0YXRlPSdtb3ZpbmcnO3NlbD1haW09c3A9cGxhbj1udWxsO2RyYWc9bnVsbH0KZnVuY3Rpb24gZ29hbCh0KXtzY29yZVt0XSsrO3N0YXRlPSdnb2FsJzttc2dUPTE1MDtuZXRBbXA9NztuZXRTaWRlPXQ9PT0wPy0xOjE7CiBjb25zdCBodW1hbj1tb2RlPT09J3R3byd8fHQ9PT0obW9kZT09PSdvbmxpbmUnP215VGVhbTowKTttc2c9aHVtYW4/J+KavSDar9mA2YDZgNmEISc6J/CfmKwg2q/ZhCDYrtmI2LHYr9uMJzttc2dLaW5kPWh1bWFuPydnJzoncic7CiBpZihtb2RlPT09J2JvdCcmJnQ9PT0wKWVhcm4oNCk7CiBzZngoaHVtYW4/J2dvYWwnOidjb25jJyk7aWYoaHVtYW4pc3RhcnRSYXAoKTtjZWxlPWh1bWFuO2Z3VD0xNTA7Y29uc3QgZ3k9dD09PTA/VDpCO3NoYWtlPTEwO21yaW5ncy5wdXNoKHt4OkNYLHk6Z3kscjoyMCxhOjEsdjo3LGM6aHVtYW4/JzI1NSwyMTAsNjMnOicyMDAsMjAwLDIwMCd9KTsKIGlmKGh1bWFuKWJ1cnN0KENYLGd5LDkwLFsnI2ZmZDIzZicsJyNmZjNiNGEnLCcjMmY3YmZmJywnIzdkZmZiMCcsJyNmZjZiY2InLCcjZmZmJ10sOCw3NSwzLjIsLjEzKTtlbHNlIGJ1cnN0KENYLGd5LDMwLFsnIzU1NScsJyM3NzcnLCcjOTk5J10sMyw1MCwzLjUsLS4wMik7CiB1cGRIdWQoKTtpZihtb2RlPT09J2JvdCcpcG9zdCgnc2NvcmUnLHNjb3JlWzBdKjEwMCl9CmZ1bmN0aW9uIG5vR29hbCgpe3N0YXRlPSdub2dvYWwnO21zZ1Q9MTUwO21zZ0tpbmQ9J24nO21zZz0n2LbYsdio2YfigIzbjCDYp9mI2YQg2KjZiNiv2Iwg2q/ZhCDYrdiz2KfYqCDZhti02K8nO2NlbGU9ZmFsc2U7c2hha2U9NTtzZngoJ3dhbGwnKTt1cGRIdWQoKX0KZnVuY3Rpb24gZmluaXNoKCl7aWYobW9kZT09PSdvbmxpbmUnKXtmaW5pc2hPbmxpbmUoKTtyZXR1cm59cmVjZD10cnVlO3N0YXRlPSdvdmVyJztjb25zdCB3PXNjb3JlWzBdPnNjb3JlWzFdPzA6MTtsZXQgc2M9MDsKIGlmKG1vZGU9PT0nYm90JyllYXJuKHc9PT0wPzI1OjUpOwogaWYobW9kZT09PSdib3QnKXtzYz1zY29yZVswXSoxMDArKHc9PT0wPzMwMCsoc2NvcmVbMF0tc2NvcmVbMV0pKjUwOjApO3Bvc3QoJ2ZpbmlzaCcsc2Msdz09PTApfQogdXBkSHVkKCk7c2Z4KG1vZGU9PT0nYm90JyYmdz09PTE/J2NvbmMnOid3aW4nKTsKIGNvbnN0IHRpdGxlPW1vZGU9PT0nYm90Jz8odz09PTA/J9io2LHYr9uMISDwn4+GJzon2KjYp9iu2KrbjCDwn5iFJyk6KHc9PT0wPyfYotio24wg2KjYsdivISDwn4+GJzon2YLYsdmF2LIg2KjYsdivISDwn4+GJyk7CiBvdi5pbm5lckhUTUw9YDxoMj4ke3RpdGxlfTwvaDI+PGRpdiBjbGFzcz0iY24iPiR7RkEoc2NvcmVbMF0pfSAtICR7RkEoc2NvcmVbMV0pfTwvZGl2PiR7ZWFybmVkP2A8ZGl2IGNsYXNzPSJjbiI+2KzYp9uM2LLZhzogPGI+KyR7RkEoZWFybmVkKX08L2I+IPCfqpk8L2Rpdj5gOicnfTxidXR0b24gb25jbGljaz0ic3RhcnQobW9kZSkiPvCflIEg2K/ZiNio2KfYsdmHPC9idXR0b24+PGJ1dHRvbiBjbGFzcz0iYjMiIG9uY2xpY2s9InNob3dTaG9wKCdwJykiPvCfm5Ig2YHYsdmI2LTar9in2Yc8L2J1dHRvbj48YnV0dG9uIGNsYXNzPSJiMyIgb25jbGljaz0ic2hvd01lbnUoKSI+2YXZhtmIPC9idXR0b24+YDtvdi5zdHlsZS5kaXNwbGF5PSdmbGV4J30KY29uc3QgQk9UVD0oKT0+KHtlYXN5Ojg1LG1lZDo2MCxoYXJkOjUwfSlbU1YuZGlmZnx8J21lZCddfHw2MDsKZnVuY3Rpb24gc2VnRChheCxheSxieCxieSxweCxweSl7Y29uc3QgZHg9YngtYXgsZHk9YnktYXksbDI9ZHgqZHgrZHkqZHl8fDE7bGV0IHQ9KChweC1heCkqZHgrKHB5LWF5KSpkeSkvbDI7dD1NYXRoLm1heCgwLE1hdGgubWluKDEsdCkpO3JldHVybiBoeShweC0oYXgrdCpkeCkscHktKGF5K3QqZHkpKX0KZnVuY3Rpb24gYm90QWltKHAsZ3gpe2NvbnN0IGJ4PWJhbGwueCxieT1iYWxsLnk7bGV0IHV4PWd4LWJ4LHV5PUIrMTAtYnksbD1oeSh1eCx1eSl8fDE7dXgvPWw7dXkvPWw7CiAgY29uc3QgdHg9YngtdXgqKGJhbGwucitQUkFELTMpLHR5PWJ5LXV5KihiYWxsLnIrUFJBRC0zKTtyZXR1cm57dHgsdHksZ2Q6bCxkOmh5KHR4LXAueCx0eS1wLnkpfX0KZnVuY3Rpb24gYm90UGxhbigpe2NvbnN0IGRmPVNWLmRpZmZ8fCdtZWQnLGJ4PWJhbGwueCxieT1iYWxsLnk7CiAgY29uc3Qgb3duPW9iai5maWx0ZXIobz0+by50PT09MSk7bGV0IGM9b3duLmZpbHRlcihvPT5vLnk8YnktNSk7aWYoIWMubGVuZ3RoKWM9b3duOwogIGlmKGRmPT09J2hhcmQnKXtsZXQgYmVzdD1udWxsLGJzPTFlOTsKICAgIGZvcihjb25zdCBwIG9mIGMpZm9yKGNvbnN0IGd4IG9mW0dMKzI0LENYLEdSLTI0XSl7Y29uc3QgYT1ib3RBaW0ocCxneCk7bGV0IHNjPWEuZCthLmdkKi4xNTsKICAgICAgZm9yKGNvbnN0IG8gb2Ygb2JqKXtpZihvPT09cHx8bz09PWJhbGwpY29udGludWU7CiAgICAgICAgaWYoc2VnRChwLngscC55LGEudHgsYS50eSxvLngsby55KTxQUkFEK28uci0yKXNjKz0yNjA7CiAgICAgICAgaWYoby50PT09MCYmc2VnRChieCxieSxneCxCKzEwLG8ueCxvLnkpPG8ucitCUkFEKzIpc2MrPTE4MH0KICAgICAgaWYoc2M8YnMpe2JzPXNjO2Jlc3Q9e3AsYX19fQogICAgY29uc3R7cCxhfT1iZXN0O3BsYW49e3AsYW5nOk1hdGguYXRhbjIoYS50eS1wLnksYS50eC1wLngpKyhNYXRoLnJhbmRvbSgpLS41KSouMDIscHc6TWF0aC5taW4oMTArYS5kKi4wNCthLmdkKi4wMDgsMTkpfTtyZXR1cm59CiAgaWYoZGY9PT0nZWFzeScpe2NvbnN0IGEwPWJvdEFpbShjWzBdLENYKTtsZXQgYmVzdD1jW01hdGguZmxvb3IoTWF0aC5yYW5kb20oKSpjLmxlbmd0aCldOwogICAgaWYoTWF0aC5yYW5kb20oKTwuNSl7bGV0IGJkPTFlOTtmb3IoY29uc3QgcCBvZiBjKXtjb25zdCBkPWJvdEFpbShwLENYKS5kO2lmKGQ8YmQpe2JkPWQ7YmVzdD1wfX19CiAgICBjb25zdCBhPWJvdEFpbShiZXN0LENYKTtwbGFuPXtwOmJlc3QsYW5nOk1hdGguYXRhbjIoYS50eS1iZXN0LnksYS50eC1iZXN0LngpKyhNYXRoLnJhbmRvbSgpLS41KSouNyxwdzo2K01hdGgucmFuZG9tKCkqOX07cmV0dXJufQogIGxldCB1eD1DWC1ieCx1eT1CKzEwLWJ5LGw9aHkodXgsdXkpO3V4Lz1sO3V5Lz1sOwogIGNvbnN0IHR4PWJ4LXV4KihiYWxsLnIrUFJBRC0zKSx0eT1ieS11eSooYmFsbC5yK1BSQUQtMyk7CiAgbGV0IGJlc3Q9Y1swXSxiZD0xZTk7Zm9yKGNvbnN0IHAgb2YgYyl7Y29uc3QgZD1oeSh0eC1wLngsdHktcC55KTtpZihkPGJkKXtiZD1kO2Jlc3Q9cH19CiAgcGxhbj17cDpiZXN0LGFuZzpNYXRoLmF0YW4yKHR5LWJlc3QueSx0eC1iZXN0LngpKyhNYXRoLnJhbmRvbSgpLS41KSouMSxwdzpNYXRoLm1pbig5K2JkKi4wNCtNYXRoLnJhbmRvbSgpKjMsMTguNSl9fQpmdW5jdGlvbiB1cGRhdGUoKXtpZihwYXVzZWQpcmV0dXJuO2ZyKys7bmV0QW1wKj0uOTc7c3RlcEZ4KCk7aWYob2JqLmxlbmd0aCl7Zm9yKGNvbnN0IG8gb2Ygb2JqKXtvLnBvcCo9Ljg0O2lmKG8uc3A+MClvLnNwPU1hdGgubWF4KDAsby5zcC0uMDUpfWlmKGh5KGJhbGwudngsYmFsbC52eSk+My41KXt0cmFpbC5wdXNoKHt4OmJhbGwueCx5OmJhbGwueX0pO2lmKHRyYWlsLmxlbmd0aD4xNCl0cmFpbC5zaGlmdCgpfWVsc2UgaWYodHJhaWwubGVuZ3RoKXRyYWlsLnNoaWZ0KCl9CiBpZihzdGF0ZT09PSdnb2FsJyYmZndUPjApe2Z3VC0tO2lmKGNlbGUmJmZ3VCUxND09PTApYnVyc3QoUEwrNjArTWF0aC5yYW5kb20oKSooUFctMTIwKSxUKzgwK01hdGgucmFuZG9tKCkqUEgqLjUsNDAsWydoc2woJytNYXRoLnJhbmRvbSgpKjM2MCsnLDEwMCUsNjUlKScsJyNmZmYnLCcjZmZkMjNmJ10sNC41LDU1LDIuMiwuMDUpfQogaWYoc3RhdGU9PT0nbW92aW5nJyl7c3RlcCgpO2lmKGJhbGwueTxULTEpKGZpcnN0P25vR29hbCgpOmdvYWwoMCkpO2Vsc2UgaWYoYmFsbC55PkIrMSkoZmlyc3Q/bm9Hb2FsKCk6Z29hbCgxKSk7CiAgZWxzZSBpZihvYmouZXZlcnkobz0+IW8udngmJiFvLnZ5KSl7Zmlyc3Q9ZmFsc2U7dHVybj0xLXR1cm47c3RhdGU9J2FpbSc7c2VsPWFpbT1zcD1udWxsO2RyYWc9bnVsbDtpZihpc0JvdCgpKWJvdFQ9Qk9UVCgpO3VwZEh1ZCgpO2FpbUVudGVyKCl9fQogZWxzZSBpZihzdGF0ZT09PSdub2dvYWwnKXtzdGVwKCk7aWYobXNnVD4wKW1zZ1QtLTtpZihtc2dUPD0wKXttc2c9Jyc7cmVzZXQoMS10dXJuKTtzZngoJ3doaXN0bGUnKX19CiBlbHNlIGlmKHN0YXRlPT09J2dvYWwnKXtzdGVwKCk7aWYobXNnVD4wKW1zZ1QtLTtpZihtc2dUPD0wJiYoIXJhcHBpbmd8fG1vZGU9PT0nb25saW5lJykpe21zZz0nJztjb25zdCB3PXNjb3JlWzBdPj01PzA6c2NvcmVbMV0+PTU/MTotMTtpZih3Pj0wKWZpbmlzaCgpO2Vsc2V7cmVzZXQoYmFsbC55PENZPzE6MCk7c2Z4KCd3aGlzdGxlJyl9fX0KIGVsc2UgaWYoc3RhdGU9PT0nYWltJyYmaXNCb3QoKSl7aWYoYm90VD09PTQ1KWJvdFBsYW4oKTtpZigtLWJvdFQ8PTAmJnBsYW4pe2NvbnN0e3AsYW5nLHB3fT1wbGFuO3Nob290KHAsTWF0aC5jb3MoYW5nKSpwdyxNYXRoLnNpbihhbmcpKnB3KX19fQovKiAtLS0tLS0tLS0tIGlucHV0IC0tLS0tLS0tLS0gKi8KZnVuY3Rpb24gcHQoZSl7Y29uc3Qgcj1jdi5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKSx4PShlLmNsaWVudFgtci5sZWZ0KS9TLHk9KGUuY2xpZW50WS1yLnRvcCkvUztyZXR1cm4gRkwoKT9bVy14LEgteV06W3gseV19CmZ1bmN0aW9uIG5lYXJPd24oeCx5KXtsZXQgYj1udWxsLGJkPTFlOTtmb3IoY29uc3QgbyBvZiBvYmopaWYoby50PT09dHVybil7Y29uc3QgZD1oeShvLngteCxvLnkteSk7aWYoZDxvLnIrMjQmJmQ8YmQpe2JkPWQ7Yj1vfX1yZXR1cm4gYn0KY3YuYWRkRXZlbnRMaXN0ZW5lcigncG9pbnRlcmRvd24nLGU9Pntjb25zdFt4LHldPXB0KGUpOwogaWYoc3RhdGU9PT0nZWRpdCcpe2xldCBiPW51bGwsYmQ9MWU5O2VkLmZvckVhY2gobz0+e2NvbnN0IGQ9aHkoby54LXgsby55LXkpO2lmKGQ8by5yKzE2JiZkPGJkKXtiZD1kO2I9b319KTtpZihiKXtzZWw9YjtzZngoJ3NlbGVjdCcpO3RyeXtjdi5zZXRQb2ludGVyQ2FwdHVyZShlLnBvaW50ZXJJZCl9Y2F0Y2goXyl7fX1yZXR1cm59CiBpZihzdGF0ZSE9PSdhaW0nfHxpc0JvdCgpfHxwYXVzZWR8fChtb2RlPT09J29ubGluZScmJnR1cm4hPT1teVRlYW0pKXJldHVybjsKIGNvbnN0IGI9bmVhck93bih4LHkpOwogaWYoc2VsJiYoIWJ8fGI9PT1zZWx8fGRyYWcpKXtkcmFnPXtpZDplLnBvaW50ZXJJZCx0YXA6Yj09PXNlbCYmIWRyYWd9O3NwPXt4LHl9O2FpbT17eCx5fTt0cnl7Y3Yuc2V0UG9pbnRlckNhcHR1cmUoZS5wb2ludGVySWQpfWNhdGNoKF8pe319CiBlbHNlIGlmKGImJiFkcmFnKXtzZngoJ3NlbGVjdCcpO3NlbD1iO2RyYWc9e2lkOmUucG9pbnRlcklkLHRhcDpmYWxzZX07c3A9e3gseX07YWltPXt4LHl9O3RyeXtjdi5zZXRQb2ludGVyQ2FwdHVyZShlLnBvaW50ZXJJZCl9Y2F0Y2goXyl7fX19KTsKY3YuYWRkRXZlbnRMaXN0ZW5lcigncG9pbnRlcm1vdmUnLGU9Pntjb25zdFt4LHldPXB0KGUpOwogaWYoc3RhdGU9PT0nZWRpdCcpe2lmKCFzZWwpcmV0dXJuO2NvbnN0IG54PU1hdGgubWluKE1hdGgubWF4KHgsUEwrc2VsLnIpLFBSLXNlbC5yKSxueT1NYXRoLm1pbihNYXRoLm1heCh5LENZK3NlbC5yKzYpLEItc2VsLnItNCksb2s9KGEsYik9PmVkLmV2ZXJ5KG89Pm89PT1zZWx8fGh5KG8ueC1hLG8ueS1iKT49by5yK3NlbC5yKzIpOwogIGlmKG9rKG54LG55KSl7c2VsLng9bng7c2VsLnk9bnl9ZWxzZSBpZihvayhueCxzZWwueSkpc2VsLng9bng7ZWxzZSBpZihvayhzZWwueCxueSkpc2VsLnk9bnk7cmV0dXJufQogaWYoZHJhZyYmZS5wb2ludGVySWQ9PT1kcmFnLmlkKXthaW09e3gseX07aWYobW9kZT09PSdvbmxpbmUnKXNlbmRBaW0oKX19KTsKZnVuY3Rpb24gcmVsKGUpe2lmKHN0YXRlPT09J2VkaXQnKXtzZWw9bnVsbDtyZXR1cm59CiBpZighZHJhZ3x8ZS5wb2ludGVySWQhPT1kcmFnLmlkKXJldHVybjtjb25zdCBkPWRyYWc7ZHJhZz1udWxsO2lmKCFzZWx8fCFzcHx8IWFpbSl7YWltPXNwPW51bGw7cmV0dXJufQogY29uc3QgZHg9c3AueC1haW0ueCxkeT1zcC55LWFpbS55LGw9aHkoZHgsZHkpOwogaWYobD45KXtjb25zdCB2PU1hdGgubWluKGwsTUFYUCkvTUFYUCoxOTtjb25zdCB2eD1keC9sKnYsdnk9ZHkvbCp2O2lmKG1vZGU9PT0nb25saW5lJyluZXRTaG90KHNlbCx2eCx2eSk7c2hvb3Qoc2VsLHZ4LHZ5KX1lbHNle2FpbT1zcD1udWxsO2lmKGQudGFwKXNlbD1udWxsO2lmKG1vZGU9PT0nb25saW5lJyluZXRTZW5kKHt0OidhaW0nLGk6LTF9LDApfX0KY3YuYWRkRXZlbnRMaXN0ZW5lcigncG9pbnRlcnVwJyxyZWwpO2N2LmFkZEV2ZW50TGlzdGVuZXIoJ3BvaW50ZXJjYW5jZWwnLGU9PntpZihkcmFnJiZlLnBvaW50ZXJJZD09PWRyYWcuaWQpe2RyYWc9bnVsbDthaW09c3A9bnVsbH19KTsKWydnZXN0dXJlc3RhcnQnLCdnZXN0dXJlY2hhbmdlJywnZ2VzdHVyZWVuZCddLmZvckVhY2gobj0+ZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihuLGU9PmUucHJldmVudERlZmF1bHQoKSkpOwpkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCd0b3VjaG1vdmUnLGU9Pntjb25zdCBlbD1lLnRhcmdldDtpZighKGVsJiZlbC5jbG9zZXN0JiZlbC5jbG9zZXN0KCcjb3YnKSkpZS5wcmV2ZW50RGVmYXVsdCgpfSx7cGFzc2l2ZTpmYWxzZX0pOwpkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdjb250ZXh0bWVudScsZT0+ZS5wcmV2ZW50RGVmYXVsdCgpKTsKZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcigndmlzaWJpbGl0eWNoYW5nZScsKCk9PntpZihkb2N1bWVudC5oaWRkZW4pc2V0UGF1c2UodHJ1ZSl9KTsKLyogLS0tLS0tLS0tLSBmb3JtYXRpb24gZWRpdG9yIC0tLS0tLS0tLS0gKi8KZnVuY3Rpb24gZWRGcm9tKGYpe2VkPWYubWFwKHE9Pih7eDpQTCtxWzBdKlBXLHk6Q1krcVsxXSpQSC8yLHI6UFJBRH0pKX0KZnVuY3Rpb24gc3RhcnRFZGl0KCl7aWYoIVNWLm93bkYuaW5jbHVkZXMoJ2N1c3RvbScpKXJldHVybjtlZEZyb20obXlGb3JtKCkpO3N0YXRlPSdlZGl0Jztvdi5zdHlsZS5kaXNwbGF5PSdub25lJzskKCdlYicpLmhpZGRlbj1mYWxzZTt1cGRIdWQoKX0KZnVuY3Rpb24gcmVzZXRFZGl0KCl7ZWRGcm9tKFBSRS5iYWwuZil9CmZ1bmN0aW9uIHNhdmVFZGl0KCl7U1YuY3VzdG9tPWVkLm1hcChvPT5bKG8ueC1QTCkvUFcsKG8ueS1DWSkvKFBILzIpXSk7U1YucHJlc2V0PSdjdXN0b20nO3NhdmUoKTtjYW5jZWxFZGl0KCk7c2hvd0Zvcm0oJ2N1c3RvbScpO3RvYXN0KCfYqtix2qnbjNioINiw2K7bjNix2Ycg2LTYryDinIUnKX0KZnVuY3Rpb24gY2FuY2VsRWRpdCgpeyQoJ2ViJykuaGlkZGVuPXRydWU7c3RhdGU9J21lbnUnO3NlbD1udWxsO3VwZEh1ZCgpO3Nob3dGb3JtKCdjdXN0b20nKX0KLyogLS0tLS0tLS0tLSBtZW51cyAtLS0tLS0tLS0tICovCmNvbnN0IENSPSc8c3ZnIGNsYXNzPSJsb2dvIiB2aWV3Qm94PSIwIDAgNjQgNTIiPjxkZWZzPjxsaW5lYXJHcmFkaWVudCBpZD0iY2ciIHgxPSIwIiB5MT0iMCIgeDI9IjAiIHkyPSIxIj48c3RvcCBvZmZzZXQ9IjAiIHN0b3AtY29sb3I9IiNmZmYyYTAiLz48c3RvcCBvZmZzZXQ9Ii41NSIgc3RvcC1jb2xvcj0iI2ZmZDIzZiIvPjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iI2Q5OGUwMCIvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjxwYXRoIGQ9Ik02IDQwTDIgMTJsMTYgMTRMMzIgNGwxNCAyMkw2MiAxMmwtNCAyOHoiIGZpbGw9InVybCgjY2cpIiBzdHJva2U9IiNhNTZhMDAiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPjxyZWN0IHg9IjYiIHk9IjQwIiB3aWR0aD0iNTIiIGhlaWdodD0iNyIgcng9IjIiIGZpbGw9InVybCgjY2cpIiBzdHJva2U9IiNhNTZhMDAiIHN0cm9rZS13aWR0aD0iMiIvPjxjaXJjbGUgY3g9IjIiIGN5PSIxMiIgcj0iMy41IiBmaWxsPSIjZmYzYjRhIi8+PGNpcmNsZSBjeD0iMzIiIGN5PSI0IiByPSIzLjUiIGZpbGw9IiMyZjdiZmYiLz48Y2lyY2xlIGN4PSI2MiIgY3k9IjEyIiByPSIzLjUiIGZpbGw9IiNmZjNiNGEiLz48Y2lyY2xlIGN4PSIzMiIgY3k9IjMwIiByPSI0IiBmaWxsPSIjZmYzYjRhIiBzdHJva2U9IiNhNTZhMDAiLz48Y2lyY2xlIGN4PSIxOCIgY3k9IjM1IiByPSIyLjUiIGZpbGw9IiMyZjdiZmYiLz48Y2lyY2xlIGN4PSI0NiIgY3k9IjM1IiByPSIyLjUiIGZpbGw9IiMyZjdiZmYiLz48L3N2Zz4nOwpmdW5jdGlvbiBnaWZ0VHh0KCl7Y29uc3QgbGVmdD04NjRlNS0oRGF0ZS5ub3coKS1TVi5naWZ0KTtyZXR1cm4gbGVmdDw9MD8n2KzYp9uM2LLZhyDYsdmI2LLYp9mG2YcgKCvbtNuwIPCfqpkpJzon2KzYp9uM2LLZhyDYqNi52K/bjDogJytGQShNYXRoLmNlaWwobGVmdC8zNmU1KSkrJyDYs9in2LnYqiDYr9uM2q/Zhyd9CmZ1bmN0aW9uIHNldERpZmYoZCl7U1YuZGlmZj1kO3NhdmUoKTtzaG93TWVudSgpfQpmdW5jdGlvbiBzaG93TWVudSgpe3JlY29yZFJ1bigpO3BhdXNlZD1mYWxzZTtzdGF0ZT0nbWVudSc7dXBkSHVkKCk7b3YuaW5uZXJIVE1MPWAke0NSfTxoMT7Yp9mF24zYsSDYtNin2YfbjDwvaDE+PHA+4pq9INiz2KfaqdixINin2LPYqtin2LEgwrcg2KfZiNmEINio2Ycg27Ug2q/ZhDwvcD48ZGl2IGNsYXNzPSJjbiI+8J+qmSA8Yj4ke0ZBKFNWLmNvaW5zKX08L2I+PC9kaXY+PHAgY2xhc3M9ImhuIiBzdHlsZT0ibWFyZ2luLXRvcDo0cHgiPtiz2LfYrSDYsdio2KfYqjwvcD48ZGl2IGNsYXNzPSJydyI+JHtbWydlYXN5Jywn8J+YiiDYotiz2KfZhiddLFsnbWVkJywn8J+YkCDZhdiq2YjYs9i3J10sWydoYXJkJywn8J+YiCDYs9iu2KonXV0ubWFwKChbayx0XSk9PmA8YnV0dG9uIGNsYXNzPSJiMyAkeyhTVi5kaWZmfHwnbWVkJyk9PT1rPydvbic6Jyd9IiBvbmNsaWNrPSJzZXREaWZmKCcke2t9JykiPiR7dH08L2J1dHRvbj5gKS5qb2luKCcnKX08L2Rpdj48YnV0dG9uIG9uY2xpY2s9InN0YXJ0KCdib3QnKSI+8J+kliDYqNin2LLbjCDYqNinINix2KjYp9iqPC9idXR0b24+PGJ1dHRvbiBjbGFzcz0iYjIiIG9uY2xpY2s9InN0YXJ0KCd0d28nKSI+8J+RpSDYr9mIINmG2YHYsdmHICjbjNqpINqv2YjYtNuMKTwvYnV0dG9uPjxidXR0b24gc3R5bGU9ImJhY2tncm91bmQ6IzE5Yjg2Yjtjb2xvcjojZmZmO2JveC1zaGFkb3c6MCA0cHggMCAjMGI2YjNjIiBvbmNsaWNrPSJzaG93T25saW5lKDApIj7wn4yQINii2YbZhNin24zZhiDYqNinINqp2K8g2KfYqtin2YI8L2J1dHRvbj48YnV0dG9uIHN0eWxlPSJiYWNrZ3JvdW5kOiNmZjhhMDA7Y29sb3I6I2ZmZjtib3gtc2hhZG93OjAgNHB4IDAgIzhhNGEwMCIgb25jbGljaz0ic2hvd09ubGluZSgyNSkiPvCfqpkg2KLZhtmE2KfbjNmGINiz2qnZh+KAjNin24wgKNuy27Ug2KrYpyDbsduw27ApPC9idXR0b24+PGRpdiBjbGFzcz0icnciPjxidXR0b24gY2xhc3M9ImIzIiBvbmNsaWNrPSJzaG93U2hvcCgncCcpIj7wn5uSINmB2LHZiNi02q/Yp9mHPC9idXR0b24+PGJ1dHRvbiBjbGFzcz0iYjMiIG9uY2xpY2s9InNob3dGb3JtKCkiPvCfk4sg2KrYsdqp24zYqCDYqtuM2YU8L2J1dHRvbj4ke2VtYnx8U1RBTkQ/Jyc6JzxidXR0b24gY2xhc3M9ImIzIiBvbmNsaWNrPSJmc0J0bigpIj7im7Yg2KrZhdin2YXigIzYtdmB2K3ZhzwvYnV0dG9uPid9PC9kaXY+PGJ1dHRvbiBjbGFzcz0iYjMiIG9uY2xpY2s9ImdpZnQoKSI+8J+OgSAke2dpZnRUeHQoKX08L2J1dHRvbj48cCBjbGFzcz0iaG4iPtmF2YfYsdmHINix2Ygg2YTZhdizINqp2YbYjCDYqNi52K8g2KjYpyDZh9ixINin2Ybar9i02KrbjCAo2K3YqtuMINiv2LPYqiDYr9uM2q/Zhykg2YfYsdis2KfbjCDYtdmB2K3ZhyDYqNqp2LQg2LnZgtioINmIINix2YfYpyDaqdmGPC9wPmA7b3Yuc3R5bGUuZGlzcGxheT0nZmxleCd9CmZ1bmN0aW9uIGdpZnQoKXtpZihEYXRlLm5vdygpLVNWLmdpZnQ+ODY0ZTUpe1NWLmdpZnQ9RGF0ZS5ub3coKTtlYXJuKDQwKX1lbHNlIHRvYXN0KCfZh9mG2YjYsiDYstmI2K/ZhyDij7MnKTtzaG93TWVudSgpfQpmdW5jdGlvbiBzaG93U2hvcCh0KXtjb25zdCBMPXQ9PT0ncCc/U0s6Qkw7c3RhdGU9J21lbnUnO292LmlubmVySFRNTD1gPGgyPvCfm5Ig2YHYsdmI2LTar9in2Yc8L2gyPjxkaXYgY2xhc3M9ImNuIj7wn6qZIDxiPiR7RkEoU1YuY29pbnMpfTwvYj48L2Rpdj48ZGl2IGNsYXNzPSJydyI+PGJ1dHRvbiBjbGFzcz0iYjMgJHt0PT09J3AnPydvbic6Jyd9IiBvbmNsaWNrPSJzaG93U2hvcCgncCcpIj7ZhdmH2LHZh+KAjNmH2Kc8L2J1dHRvbj48YnV0dG9uIGNsYXNzPSJiMyAke3Q9PT0nYic/J29uJzonJ30iIG9uY2xpY2s9InNob3dTaG9wKCdiJykiPtiq2YjZvuKAjNmH2Kc8L2J1dHRvbj48L2Rpdj48ZGl2IGNsYXNzPSJnciI+JHtMLm1hcChzPT57Y29uc3Qgb3duPVNWLm93bi5pbmNsdWRlcyhzLmlkKSxlcT0odD09PSdwJz9TVi5za2luOlNWLmJhbGwpPT09cy5pZDtyZXR1cm5gPGRpdiBjbGFzcz0iaXQgJHtlcT8nZXEnOicnfSI+PGNhbnZhcyB3aWR0aD0iOTYiIGhlaWdodD0iOTYiIGRhdGEtdD0iJHt0fSIgZGF0YS1pPSIke3MuaWR9Ij48L2NhbnZhcz48Yj4ke3Mubn08L2I+PGJ1dHRvbiBjbGFzcz0iYjMiIG9uY2xpY2s9ImJ1eSgnJHt0fScsJyR7cy5pZH0nKSI+JHtlcT8n4pyTINmB2LnYp9mEJzpvd24/J9in2YbYqtiu2KfYqCc6J/CfqpkgJytGQShzLnApfTwvYnV0dG9uPjwvZGl2PmB9KS5qb2luKCcnKX08L2Rpdj48YnV0dG9uIGNsYXNzPSJiMyIgb25jbGljaz0ic2hvd01lbnUoKSI+4qyFINio2KfYstqv2LTYqjwvYnV0dG9uPmA7CiBvdi5xdWVyeVNlbGVjdG9yQWxsKCdjYW52YXNbZGF0YS1pXScpLmZvckVhY2goYz0+e2NvbnN0IGc9Yy5nZXRDb250ZXh0KCcyZCcpO2cuc2NhbGUoMiwyKTtpZihjLmRhdGFzZXQudD09PSdwJylkcmF3UGllY2UoZywyNCwyNCwyMCxTSy5maW5kKHM9PnMuaWQ9PT1jLmRhdGFzZXQuaSksLjMsdHJ1ZSk7ZWxzZSBkcmF3QmFsbChnLDI0LDI0LDE4LEJMLmZpbmQocz0+cy5pZD09PWMuZGF0YXNldC5pKSwuMyx0cnVlKX0pO292LnN0eWxlLmRpc3BsYXk9J2ZsZXgnfQpmdW5jdGlvbiBidXkodCxpZCl7Y29uc3QgTD10PT09J3AnP1NLOkJMLHM9TC5maW5kKHg9PnguaWQ9PT1pZCk7CiBpZighU1Yub3duLmluY2x1ZGVzKGlkKSl7aWYoU1YuY29pbnM8cy5wKXt0b2FzdCgn2LPaqdmH4oCM2KfYqiDaqdin2YHbjCDZhtuM2LPYqiDwn6qZJyk7c2Z4KCd3YWxsJyk7cmV0dXJufVNWLmNvaW5zLT1zLnA7U1Yub3duLnB1c2goaWQpO3NmeCgnY29pbicpO3RvYXN0KCfYrtix24zYr9uMISDwn46JJyl9CiBpZih0PT09J3AnKVNWLnNraW49aWQ7ZWxzZSBTVi5iYWxsPWlkO3NhdmUoKTtzaG93U2hvcCh0KX0KbGV0IHB2PSdiYWwnO2NvbnN0IENVUD0zMDAwLGZwcj1rPT5rPT09J2N1c3RvbSc/Q1VQOlBSRVtrXS5wLGZwZj0oKT0+cHY9PT0nY3VzdG9tJz8oU1YuY3VzdG9tfHxQUkUuYmFsLmYpOlBSRVtwdl0uZjsKZnVuY3Rpb24gc2hvd0Zvcm0oayl7aWYoaylwdj1rO2Vsc2UgcHY9U1YucHJlc2V0O3N0YXRlPSdtZW51Jztjb25zdCBvd249eD0+U1Yub3duRi5pbmNsdWRlcyh4KTtsZXQgYWN0PScnOwogaWYocHY9PT0nY3VzdG9tJyl7YWN0PW93bignY3VzdG9tJyk/YDxidXR0b24gb25jbGljaz0ic3RhcnRFZGl0KCkiPuKcj++4jyDahtuM2K/ZhiDYqtix2qnbjNioINiv2YTYrtmI2KfZhzwvYnV0dG9uPmArKFNWLmN1c3RvbSYmU1YucHJlc2V0IT09J2N1c3RvbSc/YDxidXR0b24gY2xhc3M9ImIyIiBvbmNsaWNrPSJ1c2VGb3JtKCdjdXN0b20nKSI+4pyTINin2LPYqtmB2KfYr9mHINin2LIg2KrYsdqp24zYqCDYr9mE2K7ZiNin2Yc8L2J1dHRvbj5gOicnKTpgPGJ1dHRvbiBvbmNsaWNrPSJidXlGb3JtKCdjdXN0b20nKSI+8J+qmSAke0ZBKENVUCl9IMK3INiu2LHbjNivINiq2LHaqduM2Kgg2K/ZhNiu2YjYp9mHPC9idXR0b24+YH0KIGVsc2UgYWN0PW93bihwdik/KFNWLnByZXNldD09PXB2Pyc8cCBjbGFzcz0iY24iPuKckyDYr9ixINit2KfZhCDYp9iz2KrZgdin2K/ZhzwvcD4nOmA8YnV0dG9uIGNsYXNzPSJiMiIgb25jbGljaz0idXNlRm9ybSgnJHtwdn0nKSI+4pyTINin2LPYqtmB2KfYr9mHPC9idXR0b24+YCk6YDxidXR0b24gb25jbGljaz0iYnV5Rm9ybSgnJHtwdn0nKSI+8J+qmSAke0ZBKGZwcihwdikpfSDCtyDYrtix24zYryDYqtix2qnbjNioICR7UFJFW3B2XS5ufTwvYnV0dG9uPmA7CiBvdi5pbm5lckhUTUw9YDxoMj7wn5OLINiq2LHaqduM2Kgg2KrbjNmFPC9oMj48ZGl2IGNsYXNzPSJjbiI+8J+qmSA8Yj4ke0ZBKFNWLmNvaW5zKX08L2I+PC9kaXY+PGNhbnZhcyBpZD0iZnAiIHdpZHRoPSIzMDAiIGhlaWdodD0iMjMwIj48L2NhbnZhcz48ZGl2IGNsYXNzPSJydyI+JHtPYmplY3Qua2V5cyhQUkUpLmNvbmNhdCgnY3VzdG9tJykubWFwKHg9PmA8YnV0dG9uIGNsYXNzPSJiMyAke3B2PT09eD8nb24nOicnfSIgb25jbGljaz0ic2hvd0Zvcm0oJyR7eH0nKSI+JHtvd24oeCk/Jyc6J/CflJIgJ30ke3g9PT0nY3VzdG9tJz8n4pyP77iPINiv2YTYrtmI2KfZhyc6UFJFW3hdLm59PC9idXR0b24+YCkuam9pbignJyl9PC9kaXY+JHthY3R9PGJ1dHRvbiBjbGFzcz0iYjMiIG9uY2xpY2s9InNob3dNZW51KCkiPuKshSDYqNin2LLar9i02Ko8L2J1dHRvbj5gO2RyYXdGcCgpO292LnN0eWxlLmRpc3BsYXk9J2ZsZXgnfQpmdW5jdGlvbiBidXlGb3JtKGspe2NvbnN0IHA9ZnByKGspO2lmKFNWLmNvaW5zPHApe3RvYXN0KCfYs9qp2YfigIzYp9iqINqp2KfZgduMINmG24zYs9iqIPCfqpknKTtzZngoJ3dhbGwnKTtyZXR1cm59U1YuY29pbnMtPXA7U1Yub3duRi5wdXNoKGspO2lmKGshPT0nY3VzdG9tJylTVi5wcmVzZXQ9aztzYXZlKCk7c2Z4KCdjb2luJyk7dG9hc3QoJ9iu2LHbjNiv24whIPCfjoknKTtzaG93Rm9ybShrKX0KZnVuY3Rpb24gdXNlRm9ybShrKXtTVi5wcmVzZXQ9aztzYXZlKCk7c2hvd0Zvcm0oayl9CmZ1bmN0aW9uIGRyYXdGcCgpe2NvbnN0IGM9JCgnZnAnKS5nZXRDb250ZXh0KCcyZCcpO2MuZmlsbFN0eWxlPScjMmY5MTQwJztjLmZpbGxSZWN0KDAsMCwzMDAsMjMwKTtjLnN0cm9rZVN0eWxlPScjZmZmYyc7Yy5saW5lV2lkdGg9MjtjLnN0cm9rZVJlY3QoNiwyLDI4OCwyMjYpO2Muc3Ryb2tlUmVjdCg3NSwxNTAsMTUwLDc4KTtjLnN0cm9rZVJlY3QoMTEyLDE5NCw3NiwzNCk7Yy5iZWdpblBhdGgoKTtjLm1vdmVUbyg2LDIpO2MubGluZVRvKDI5NCwyKTtjLnN0cm9rZSgpO2MuYmVnaW5QYXRoKCk7Yy5hcmMoMTUwLDIsMzQsMCxNYXRoLlBJKTtjLnN0cm9rZSgpOwogY29uc3Qgc2s9bXlTaygpO2ZwZigpLmZvckVhY2goZj0+ZHJhd1BpZWNlKGMsNitmWzBdKjI4OCwxMCtmWzFdKjIxMCwxMyxzaywwKSl9Ci8qIC0tLS0tLS0tLS0gcmVuZGVyaW5nIC0tLS0tLS0tLS0gKi8KZnVuY3Rpb24gZHJhd0dvYWwocyl7Y29uc3QgeTA9czwwP1Q6Qix5MT15MCtzKkdELGs9Ljk0LGFtcD1zPT09bmV0U2lkZT9uZXRBbXA6MDsKIGN0eC5saW5lV2lkdGg9MTtjdHguc3Ryb2tlU3R5bGU9J3JnYmEoMjU1LDI1NSwyNTUsLjUpJzsKIGZvcihsZXQgaT0wO2k8PTE1O2krKyl7Y29uc3QgeDA9R0wraSpHVy8xNSx4Yj1DWCsoeDAtQ1gpKmssd29iPU1hdGguc2luKGZyKi4zNStpKi45KSphbXA7Y3R4LmJlZ2luUGF0aCgpO2N0eC5tb3ZlVG8oeDAseTApO2N0eC5xdWFkcmF0aWNDdXJ2ZVRvKCh4MCt4YikvMit3b2IsKHkwK3kxKS8yLHhiLHkxKTtjdHguc3Ryb2tlKCl9CiBmb3IobGV0IGo9MTtqPD02O2orKyl7Y29uc3QgZj1qLzYseXk9eTArcypHRCpmLGhhbGY9R1cvMiooMS0oMS1rKSpmKSx3Mj1NYXRoLnNpbihmciouMytqKSphbXAqLjYqcztjdHguYmVnaW5QYXRoKCk7Y3R4Lm1vdmVUbyhDWC1oYWxmLHl5KTtjdHgucXVhZHJhdGljQ3VydmVUbyhDWCx5eSt3MixDWCtoYWxmLHl5KTtjdHguc3Ryb2tlKCl9CiBjdHguc3Ryb2tlU3R5bGU9JyNmNGY0ZjQnO2N0eC5saW5lV2lkdGg9MztjdHgubGluZUpvaW49J3JvdW5kJztjdHguYmVnaW5QYXRoKCk7Y3R4Lm1vdmVUbyhHTCx5MCk7Y3R4LmxpbmVUbyhDWC1HVy8yKmsseTEpO2N0eC5saW5lVG8oQ1grR1cvMiprLHkxKTtjdHgubGluZVRvKEdSLHkwKTtjdHguc3Ryb2tlKCk7CiBmb3IoY29uc3QgeCBvZltHTCxHUl0pe2N0eC5maWxsU3R5bGU9J3JnYmEoMCwwLDAsLjM1KSc7Y3R4LmJlZ2luUGF0aCgpO2N0eC5hcmMoeCsyLHkwKzMsNS41LDAsNyk7Y3R4LmZpbGwoKTtjb25zdCBnPWN0eC5jcmVhdGVSYWRpYWxHcmFkaWVudCh4LTEuNSx5MC0xLjUsMSx4LHkwLDUuNSk7Zy5hZGRDb2xvclN0b3AoMCwnI2ZmZicpO2cuYWRkQ29sb3JTdG9wKDEsJyM5YWEnKTtjdHguZmlsbFN0eWxlPWc7Y3R4LmJlZ2luUGF0aCgpO2N0eC5hcmMoeCx5MCw1LjUsMCw3KTtjdHguZmlsbCgpO2N0eC5zdHJva2VTdHlsZT0nI2UzMyc7Y3R4LmxpbmVXaWR0aD0xLjU7Y3R4LmJlZ2luUGF0aCgpO2N0eC5hcmMoeCx5MCw1LjUsMCw3KTtjdHguc3Ryb2tlKCl9fQpmdW5jdGlvbiBkcmF3KCl7aWYoRkwoKSl7Y3R4LnNhdmUoKTtjdHgudHJhbnNsYXRlKFcsSCk7Y3R4LnJvdGF0ZShNYXRoLlBJKTtkcmF3MCgpO2N0eC5yZXN0b3JlKCl9ZWxzZSBkcmF3MCgpfQpmdW5jdGlvbiBkcmF3MCgpe2N0eC5maWxsU3R5bGU9JyMxMjE2MWQnO2N0eC5maWxsUmVjdCgwLDAsVyxIKTtjb25zdCBzaD1zaGFrZT4uMztpZihzaCl7Y3R4LnNhdmUoKTtjdHgudHJhbnNsYXRlKChNYXRoLnJhbmRvbSgpLS41KSpzaGFrZSoyLChNYXRoLnJhbmRvbSgpLS41KSpzaGFrZSoyKX0KIGN0eC5kcmF3SW1hZ2UocGl0Y2gsMCwwLFcsSCk7Y29uc3QgYnM9bXlCYWxsKCk7CiBpZihzdGF0ZT09PSdlZGl0Jyl7Y3R4LmZpbGxTdHlsZT0ncmdiYSgwLDAsMCwuMzUpJztjdHguZmlsbFJlY3QoUEwsVCxQVyxDWS1UKTtjdHguZmlsbFN0eWxlPScjZmZmJztjdHguZm9udD0nYm9sZCAxN3B4IFRhaG9tYSc7Y3R4LnRleHRBbGlnbj0nY2VudGVyJztjdHguZmlsbFRleHQoJ9mG24zZhdmH4oCM24wg2K7ZiNiv2Kog2b7Yp9uM24zZhtmHIOKshycsQ1gsQ1ktMTQpOwogIGNvbnN0IHNrPW15U2soKTtmb3IoY29uc3QgbyBvZiBlZCl7Y3R4LnN0cm9rZVN0eWxlPScjZmZkMjNmJztjdHguZ2xvYmFsQWxwaGE9LjUrLjQqTWF0aC5zaW4oZnIvOCk7Y3R4LmxpbmVXaWR0aD0zO2N0eC5iZWdpblBhdGgoKTtjdHguYXJjKG8ueCxvLnksby5yKzUsMCw3KTtjdHguc3Ryb2tlKCk7Y3R4Lmdsb2JhbEFscGhhPTE7ZHJhd1BpZWNlKGN0eCxvLngsby55LG8ucixzaywwKX0KICBkcmF3QmFsbChjdHgsQ1gsQ1ksQlJBRCxicywwKTtkcmF3R29hbCgtMSk7ZHJhd0dvYWwoMSk7aWYoc2gpY3R4LnJlc3RvcmUoKTtyZXR1cm59CiBpZighb2JqLmxlbmd0aCl7ZHJhd0dvYWwoLTEpO2RyYXdHb2FsKDEpO2lmKHNoKWN0eC5yZXN0b3JlKCk7cmV0dXJufQogY29uc3QgbTA9bXlTaygpOwogZm9yKGxldCBpPTA7aTx0cmFpbC5sZW5ndGg7aSsrKXtjb25zdCBxPXRyYWlsW2ldLGs9KGkrMSkvdHJhaWwubGVuZ3RoO2N0eC5maWxsU3R5bGU9J3JnYmEoMjU1LDI1NSwyNTUsJytrKi4yOCsnKSc7Y3R4LmJlZ2luUGF0aCgpO2N0eC5hcmMocS54LHEueSxiYWxsLnIqayouOSwwLDcpO2N0eC5maWxsKCl9CiBmb3IoY29uc3QgbyBvZiBvYmope2lmKG89PT1iYWxsKWNvbnRpbnVlO2NvbnN0IGs9MS1vLnNwKm8uc3A7aWYoazwuMDMpY29udGludWU7Y29uc3QgcnI9by5yKmsqKDErby5wb3AqLjE2KTsKICBpZihzdGF0ZT09PSdhaW0nJiZvLnQ9PT10dXJuJiYhaXNCb3QoKSYmKG1vZGUhPT0nb25saW5lJ3x8dHVybj09PW15VGVhbSkpe2N0eC5zdHJva2VTdHlsZT0nI2ZmZDIzZic7Y3R4Lmdsb2JhbEFscGhhPS41Ky40Kk1hdGguc2luKGZyLzgpO2N0eC5saW5lV2lkdGg9MztjdHguYmVnaW5QYXRoKCk7Y3R4LmFyYyhvLngsby55LHJyKzUsMCw3KTtjdHguc3Ryb2tlKCk7Y3R4Lmdsb2JhbEFscGhhPTF9CiAgZHJhd1BpZWNlKGN0eCxvLngsby55LHJyLG8udD09PW15VGVhbT9tMDpvcHBTLG8ucm90KX0KIHtjb25zdCBrPTEtYmFsbC5zcCpiYWxsLnNwO2lmKGs+LjAzKWRyYXdCYWxsKGN0eCxiYWxsLngsYmFsbC55LGJhbGwuciprKigxK2JhbGwucG9wKi4xMiksYnMsYmFsbC5yb3QpfQogZHJhd0dvYWwoLTEpO2RyYXdHb2FsKDEpOwogaWYocGxhbiYmc3RhdGU9PT0nYWltJyYmaXNCb3QoKSl7Y3R4LnN0cm9rZVN0eWxlPScjZmY3NjgxODgnO2N0eC5saW5lV2lkdGg9NDtjdHguc2V0TGluZURhc2goWzgsOF0pO2N0eC5iZWdpblBhdGgoKTtjdHgubW92ZVRvKHBsYW4ucC54LHBsYW4ucC55KTtjdHgubGluZVRvKHBsYW4ucC54K01hdGguY29zKHBsYW4uYW5nKSoxMDAscGxhbi5wLnkrTWF0aC5zaW4ocGxhbi5hbmcpKjEwMCk7Y3R4LnN0cm9rZSgpO2N0eC5zZXRMaW5lRGFzaChbXSl9CiBpZihzZWwmJmFpbSYmc3AmJnN0YXRlPT09J2FpbScpe2NvbnN0IGR4PXNwLngtYWltLngsZHk9c3AueS1haW0ueSxsPWh5KGR4LGR5KTtpZihsPjQpe2NvbnN0IHV4PWR4L2wsdXk9ZHkvbCxwdz1NYXRoLm1pbihsLE1BWFApL01BWFAsY29sPSdoc2woJysoMTIwLXB3KjEyMCkrJyw5NSUsNTUlKSc7CiAgY3R4LnNldExpbmVEYXNoKFs2LDhdKTtjdHguc3Ryb2tlU3R5bGU9J3JnYmEoMjU1LDI1NSwyNTUsLjU1KSc7Y3R4LmxpbmVXaWR0aD0yO2N0eC5iZWdpblBhdGgoKTtjdHgubW92ZVRvKHNlbC54LHNlbC55KTtjdHgubGluZVRvKHNlbC54K3V4KjM0MCxzZWwueSt1eSozNDApO2N0eC5zdHJva2UoKTtjdHguc2V0TGluZURhc2goW10pOwogIGNvbnN0IGV4PXNlbC54K3V4KihzZWwucisyMCtwdyo3MCksZXk9c2VsLnkrdXkqKHNlbC5yKzIwK3B3KjcwKTtjdHguc3Ryb2tlU3R5bGU9Y29sO2N0eC5maWxsU3R5bGU9Y29sO2N0eC5saW5lV2lkdGg9NjtjdHgubGluZUNhcD0ncm91bmQnO2N0eC5iZWdpblBhdGgoKTtjdHgubW92ZVRvKHNlbC54K3V4KnNlbC5yLHNlbC55K3V5KnNlbC5yKTtjdHgubGluZVRvKGV4LGV5KTtjdHguc3Ryb2tlKCk7CiAgY3R4LmJlZ2luUGF0aCgpO2N0eC5tb3ZlVG8oZXgrdXgqMTMsZXkrdXkqMTMpO2N0eC5saW5lVG8oZXgtdXkqOSxleSt1eCo5KTtjdHgubGluZVRvKGV4K3V5KjksZXktdXgqOSk7Y3R4LmZpbGwoKTsKICBjdHgubGluZVdpZHRoPTM7Y3R4LmJlZ2luUGF0aCgpO2N0eC5tb3ZlVG8oc2VsLngsc2VsLnkpO2N0eC5saW5lVG8oc2VsLngtdXgqTWF0aC5taW4obCxNQVhQKSouOCxzZWwueS11eSpNYXRoLm1pbihsLE1BWFApKi44KTtjdHguc3Ryb2tlKCk7Y3R4LmxpbmVDYXA9J2J1dHQnfX0KIGRyYXdGeCgpOwogaWYoc2VsJiZzdGF0ZT09PSdhaW0nKXtjdHguc3Ryb2tlU3R5bGU9JyNmZmYnO2N0eC5saW5lV2lkdGg9MztjdHguYmVnaW5QYXRoKCk7Y3R4LmFyYyhzZWwueCxzZWwueSxzZWwucis5K01hdGguc2luKGZyLzYpKjIsMCw3KTtjdHguc3Ryb2tlKCl9CiBpZihtc2cpe2NvbnN0IHA9MS1tc2dULzE1MCxlPXA8LjE1P2Vhc2VCYWNrKHAvLjE1KToxLGFsPXA+Ljg1P01hdGgubWF4KDAsKDEtcCkvLjE1KToxLEs9bXNnS2luZCxDPUs9PT0nZyc/WycjZmZkMjNmJywnI2E1NmEwMCcsJyNmZmY2YTgnLCcjZmZiNDAwJ106Sz09PSdyJz9bJyNmZjRkNmQnLCcjNWEwYTE4JywnI2ZmZDBkNicsJyNmZjRkNmQnXTpbJyM2YWE1ZmYnLCcjMTIzYThhJywnI2YyZjdmZicsJyM3ZmIwZmYnXTtjdHguc2F2ZSgpO2N0eC5nbG9iYWxBbHBoYT1hbDtjdHgudHJhbnNsYXRlKENYLENZKTtjdHgucm90YXRlKE1hdGguc2luKGZyKi4xKSouMDMrKEZMKCk/TWF0aC5QSTowKSk7Y3R4LnNjYWxlKGUsZSk7CiAgY29uc3QgYmc9Y3R4LmNyZWF0ZUxpbmVhckdyYWRpZW50KC1XLzIsMCxXLzIsMCk7YmcuYWRkQ29sb3JTdG9wKDAsJ3JnYmEoMCwwLDAsMCknKTtiZy5hZGRDb2xvclN0b3AoLjIsJ3JnYmEoMCwwLDAsLjc1KScpO2JnLmFkZENvbG9yU3RvcCguOCwncmdiYSgwLDAsMCwuNzUpJyk7YmcuYWRkQ29sb3JTdG9wKDEsJ3JnYmEoMCwwLDAsMCknKTtjdHguZmlsbFN0eWxlPWJnO2N0eC5maWxsUmVjdCgtVy8yLC00OCxXLDk2KTsKICBsZXQgZnM9NTQ7Y3R4LmZvbnQ9J2JvbGQgNTRweCBUYWhvbWEnO2NvbnN0IG13PWN0eC5tZWFzdXJlVGV4dChtc2cpLndpZHRoO2lmKG13PlctMTEwKWZzPU1hdGguZmxvb3IoNTQqKFctMTEwKS9tdyk7Y3R4LmZvbnQ9J2JvbGQgJytmcysncHggVGFob21hJztjdHgudGV4dEFsaWduPSdjZW50ZXInO2N0eC50ZXh0QmFzZWxpbmU9J21pZGRsZSc7Y3R4LnNoYWRvd0NvbG9yPUNbMF07Y3R4LnNoYWRvd0JsdXI9MjQ7Y3R4LmxpbmVXaWR0aD04O2N0eC5zdHJva2VTdHlsZT1DWzFdO2N0eC5saW5lSm9pbj0ncm91bmQnO2N0eC5zdHJva2VUZXh0KG1zZywwLDIpOwogIGNvbnN0IHRnPWN0eC5jcmVhdGVMaW5lYXJHcmFkaWVudCgwLC0yNiwwLDMwKTt0Zy5hZGRDb2xvclN0b3AoMCxDWzJdKTt0Zy5hZGRDb2xvclN0b3AoMSxDWzNdKTtjdHguZmlsbFN0eWxlPXRnO2N0eC5maWxsVGV4dChtc2csMCwyKTtjdHgucmVzdG9yZSgpfQogaWYoc2gpY3R4LnJlc3RvcmUoKX0KZnVuY3Rpb24gZml0KCl7Y29uc3Qgdz13cmFwLmNsaWVudFdpZHRoLGg9d3JhcC5jbGllbnRIZWlnaHQsZD1kZXZpY2VQaXhlbFJhdGlvfHwxO1M9TWF0aC5taW4ody9XLGgvSCk7Y3Yuc3R5bGUud2lkdGg9VypTKydweCc7Y3Yuc3R5bGUuaGVpZ2h0PUgqUysncHgnO2N2LndpZHRoPVcqUypkO2N2LmhlaWdodD1IKlMqZDtjdHguc2V0VHJhbnNmb3JtKFMqZCwwLDAsUypkLDAsMCl9CmFkZEV2ZW50TGlzdGVuZXIoJ3Jlc2l6ZScsKCk9PntpZihzdGF0ZT09PSdtZW51J3x8c3RhdGU9PT0nb3Zlcicpc2V0V29ybGQoKTtmaXQoKX0pOwpsZXQgcmFwcGluZz1mYWxzZSxzcmMsYW4sYnVmLGZiPW5ldyBVaW50OEFycmF5KDEyOCksYmF2Zz0wLGZsYXNoPTAsa2ljaz0wLGxhc3RCZWF0PTAsYmM9MCxzYT0wLHNiPTAsZ0E9WzgsMF0sY0ExPTgsY0EyPTAscmN4LHJwYXJ0PVtdLHJyaW5ncz1bXTsKY29uc3QgcmFwRWw9JCgncmFwJykscmM9JCgncmMnKSxFPXt9O1snZmlnJywndG9yc28nLCdzdHInLCdjaGFpbicsJ3BkJywnYXJtTCcsJ2ZvcmVMJywnaGVhZCcsJ2NhcCcsJ2dsaW50JywnbXAnLCd0dCcsJ3RnJywnYXJtUicsJ2ZvcmVSJywncnQnXS5mb3JFYWNoKGk9PkVbaV09JChpKSk7CmNvbnN0IFBPU0VTPVtbOCwwXSxbNjIsMThdLFs4NSwtMzVdLFszNSwtNzBdLFstNSw1NV0sWzcwLC0xMF1dOwpmdW5jdGlvbiBpbml0QXVkaW8oKXt0cnl7YWM9YWN8fG5ldyAod2luZG93LkF1ZGlvQ29udGV4dHx8d2luZG93LndlYmtpdEF1ZGlvQ29udGV4dCkoKTtpZighc3JjKXtzcmM9YWMuY3JlYXRlTWVkaWFFbGVtZW50U291cmNlKGF1KTthbj1hYy5jcmVhdGVBbmFseXNlcigpO2FuLmZmdFNpemU9MjU2O2FuLnNtb290aGluZ1RpbWVDb25zdGFudD0uNTU7YnVmPW5ldyBVaW50OEFycmF5KGFuLmZmdFNpemUpO2ZiPW5ldyBVaW50OEFycmF5KGFuLmZyZXF1ZW5jeUJpbkNvdW50KTtzcmMuY29ubmVjdChhbik7YW4uY29ubmVjdChhYy5kZXN0aW5hdGlvbil9YWMucmVzdW1lKCl9Y2F0Y2goZSl7fX0KZnVuY3Rpb24gc2l6ZVJjKCl7Y29uc3QgZD1kZXZpY2VQaXhlbFJhdGlvfHwxO3JjLndpZHRoPWlubmVyV2lkdGgqZDtyYy5oZWlnaHQ9aW5uZXJIZWlnaHQqZDtyY3g9cmMuZ2V0Q29udGV4dCgnMmQnKTtyY3guc2V0VHJhbnNmb3JtKGQsMCwwLGQsMCwwKX0KZnVuY3Rpb24gc2hvd1JhcCgpe3JhcHBpbmc9dHJ1ZTtiYXZnPTA7YmM9MDtycGFydD1bXTtycmluZ3M9W107c2l6ZVJjKCk7cmFwRWwuY2xhc3NMaXN0LnJlbW92ZSgnb3V0Jyk7cmFwRWwuY2xhc3NMaXN0LmFkZCgnb24nKX0KZnVuY3Rpb24gc3RhcnRSYXAoKXthdS5jdXJyZW50VGltZT0wO2F1LnBsYXkoKS50aGVuKHNob3dSYXApLmNhdGNoKCgpPT57cmFwcGluZz1mYWxzZX0pfQpmdW5jdGlvbiBlbmRSYXAoKXtpZighcmFwcGluZylyZXR1cm47cmFwcGluZz1mYWxzZTtyYXBFbC5jbGFzc0xpc3QuYWRkKCdvdXQnKTtzZXRUaW1lb3V0KCgpPT57aWYoIXJhcHBpbmcpcmFwRWwuY2xhc3NMaXN0LnJlbW92ZSgnb24nLCdvdXQnKX0sNDIwKX0KYXUub25lbmRlZD1lbmRSYXA7YXUub25lcnJvcj1lbmRSYXA7CmZ1bmN0aW9uIG9uQmVhdCh3LGgpe2JjKys7a2ljaz0xO2ZsYXNoPS41O3JyaW5ncy5wdXNoKHtyOjMwLGE6MSx2OjEwfSk7aWYoYmMlMj09PTApZ0E9UE9TRVNbKGJjPj4xKSVQT1NFUy5sZW5ndGhdOwogZm9yKGxldCBpPTA7aTwxNDtpKyspcnBhcnQucHVzaCh7eDpNYXRoLnJhbmRvbSgpKncseTpoKzEwLHZ4OihNYXRoLnJhbmRvbSgpLS41KSo0LHZ5Oi0oOCtNYXRoLnJhbmRvbSgpKjExKSxsOjc1LG06NzUsYzonaHNsKCcrTWF0aC5yYW5kb20oKSozNjArJyw5NSUsNjIlKScsczozK01hdGgucmFuZG9tKCkqMyxxOk1hdGgucmFuZG9tKCk8LjV9KX0KZnVuY3Rpb24gcmFwQW5pbSgpe2lmKCFyYXBwaW5nfHwhcmN4KXJldHVybjtjb25zdCBsaXZlPWFuJiYhYXUucGF1c2VkLHQ9bGl2ZT9hdS5jdXJyZW50VGltZTpmci82MCx3PWlubmVyV2lkdGgsaD1pbm5lckhlaWdodDtsZXQgYSxiOwogaWYobGl2ZSl7YW4uZ2V0Qnl0ZVRpbWVEb21haW5EYXRhKGJ1Zik7bGV0IHM9MDtmb3IoY29uc3QgdiBvZiBidWYpcys9KHYtMTI4KSoodi0xMjgpO2E9TWF0aC5taW4oMSxNYXRoLnNxcnQocy9idWYubGVuZ3RoKS8zMik7YW4uZ2V0Qnl0ZUZyZXF1ZW5jeURhdGEoZmIpO2I9TWF0aC5taW4oMSxNYXRoLnBvdygoZmJbMF0rZmJbMV0rZmJbMl0pLzc2NSwyLjIpKjEuNSl9CiBlbHNle2E9LjUrLjUqTWF0aC5zaW4oZnIvMyk7Yj1NYXRoLnBvdyhNYXRoLm1heCgwLE1hdGguc2luKGZyLzcpKSwzKX0KIGNvbnN0IEY9aT0+bGl2ZT9mYltpXToxMjgrMTIwKk1hdGguc2luKGZyKi4wOCtpKi43KSxub3c9cGVyZm9ybWFuY2Uubm93KCk7CiBzYSs9KGEtc2EpKi40NTtzYis9KGItc2IpKi40OwogaWYoYj5iYXZnKjEuMysuMDYmJmI+LjI4JiZub3ctbGFzdEJlYXQ+MjIwKXtsYXN0QmVhdD1ub3c7b25CZWF0KHcsaCl9YmF2Zys9KGItYmF2ZykqLjA1O2tpY2sqPS44MjsKIC8qIC0tLS0gc3RhZ2UgY2FudmFzIC0tLS0gKi8KIGNvbnN0IGM9cmN4LGN4PXcvMixjeT1oKi41ODtjLmdsb2JhbENvbXBvc2l0ZU9wZXJhdGlvbj0nc291cmNlLW92ZXInO2MuY2xlYXJSZWN0KDAsMCx3LGgpOwogbGV0IGc9Yy5jcmVhdGVSYWRpYWxHcmFkaWVudChjeCxjeSwxMCxjeCxjeSxNYXRoLm1heCh3LGgpKi44KTtnLmFkZENvbG9yU3RvcCgwLCdyZ2JhKCcrKDcwK3NiKjkwfDApKycsMjAsJysoMTMwK3NiKjYwfDApKycsLjg4KScpO2cuYWRkQ29sb3JTdG9wKDEsJ3JnYmEoNCwyLDE2LC45NSknKTtjLmZpbGxTdHlsZT1nO2MuZmlsbFJlY3QoMCwwLHcsaCk7CiBjLmdsb2JhbENvbXBvc2l0ZU9wZXJhdGlvbj0nbGlnaHRlcic7CiBmb3IobGV0IGk9MDtpPDY7aSsrKXtjb25zdCB4MD13KihpKy41KS82LGFuZz1NYXRoLnNpbih0Ki43K2kqMS4zKSouNSsoaS0yLjUpKi4yMjtnPWMuY3JlYXRlTGluZWFyR3JhZGllbnQoeDAsMCx4MCxoKTtjb25zdCBjb2w9J2hzbCgnKygoaSo2MCt0KjQwKSUzNjApKycsMTAwJSw2MCUpJyxhbD0uMDcrc2IqLjIyO2cuYWRkQ29sb3JTdG9wKDAsY29sLnJlcGxhY2UoJyknLCcsJythbCsnKScpLnJlcGxhY2UoJ2hzbCcsJ2hzbGEnKSk7Zy5hZGRDb2xvclN0b3AoMSwncmdiYSgwLDAsMCwwKScpO2MuZmlsbFN0eWxlPWc7Yy5iZWdpblBhdGgoKTtjLm1vdmVUbyh4MCwwKTtjLmxpbmVUbyh4MCtNYXRoLnRhbihhbmctLjA4KSpoLGgpO2MubGluZVRvKHgwK01hdGgudGFuKGFuZysuMDgpKmgsaCk7Yy5maWxsKCl9CiBjb25zdCBSMD1NYXRoLm1pbih3LGgpKi4yNjtjLmxpbmVDYXA9J3JvdW5kJzsKIGZvcihsZXQgaT0wO2k8NjQ7aSsrKXtjb25zdCBhbmc9aS82NCo2LjI4MzItMS41NzA4LGw9NCtGKDErKGklMzIpKS8yNTUqTWF0aC5taW4odyxoKSouMTY7Yy5zdHJva2VTdHlsZT0naHNsKCcrKChpKjUrdCo3MCklMzYwKSsnLDEwMCUsNjAlKSc7Yy5saW5lV2lkdGg9My41O2MuYmVnaW5QYXRoKCk7Yy5tb3ZlVG8oY3grTWF0aC5jb3MoYW5nKSpSMCxjeStNYXRoLnNpbihhbmcpKlIwKTtjLmxpbmVUbyhjeCtNYXRoLmNvcyhhbmcpKihSMCtsKSxjeStNYXRoLnNpbihhbmcpKihSMCtsKSk7Yy5zdHJva2UoKX0KIGZvcihjb25zdCByIG9mIHJyaW5ncyl7ci5yKz1yLnY7ci5hKj0uOTM7Yy5zdHJva2VTdHlsZT0ncmdiYSgyNTUsMjEwLDYzLCcrci5hKycpJztjLmxpbmVXaWR0aD0yK3IuYSo1O2MuYmVnaW5QYXRoKCk7Yy5hcmMoY3gsY3ksci5yK1IwKi42LDAsNi4yODMyKTtjLnN0cm9rZSgpfXJyaW5ncz1ycmluZ3MuZmlsdGVyKHI9PnIuYT4uMDQpOwogZm9yKGxldCBrPTA7azwzO2srKyl7Y29uc3QgeD1rJTI/dzowLHR4PXcvMitNYXRoLnNpbih0KjEuMytrKjIpKncqLjc7Yy5zdHJva2VTdHlsZT0naHNsYSgnKygoayoxMjArdCo5MCklMzYwKSsnLDEwMCUsNjAlLCcrKC4yNStzYiouNSkrJyknO2MubGluZVdpZHRoPTI7Yy5iZWdpblBhdGgoKTtjLm1vdmVUbyh4LGgpO2MubGluZVRvKHR4LDApO2Muc3Ryb2tlKCl9CiBjLmdsb2JhbENvbXBvc2l0ZU9wZXJhdGlvbj0nc291cmNlLW92ZXInOwogZm9yKGxldCBrPTA7azw5O2srKyl7Y29uc3QgeD0oaysuNSkqdy85K01hdGguc2luKHQqMitrKSo1LGJvYj1zYioxMiooayUyPzE6LjYpK01hdGguc2luKHQqOCtrKSoyLHk9aC0zNC1ib2Iscj13Ki4wNTtjLmZpbGxTdHlsZT0nIzA2MDMwZSc7Yy5iZWdpblBhdGgoKTtjLmFyYyh4LHksciwwLDYuMjgzMik7Yy5maWxsKCk7Yy5maWxsUmVjdCh4LXIqMS41LHkrciouOCxyKjMsaCk7CiAgaWYoayUyKXtjLnN0cm9rZVN0eWxlPScjMDYwMzBlJztjLmxpbmVXaWR0aD1yKi43O2MuYmVnaW5QYXRoKCk7Yy5tb3ZlVG8oeCtyKjEuMix5K3IpO2MubGluZVRvKHgrcioxLjkseS1yKjIuMi1zYio4KTtjLnN0cm9rZSgpO2MuZmlsbFN0eWxlPU1hdGgucmFuZG9tKCk8Ljk/JyNiZmU4ZmYnOicjZmZmJztjLmZpbGxSZWN0KHgrcioxLjUseS1yKjMuNC1zYio4LHIqLjkscioxLjMpfX0KIGZvcihjb25zdCBwIG9mIHJwYXJ0KXtwLngrPXAudng7cC55Kz1wLnZ5O3AudnkrPS4yODtwLmwtLTtjLmdsb2JhbEFscGhhPU1hdGgubWF4KDAscC5sL3AubSk7Yy5maWxsU3R5bGU9cC5jO3AucT9jLmZpbGxSZWN0KHAueCxwLnkscC5zKjEuNixwLnMpOihjLmJlZ2luUGF0aCgpLGMuYXJjKHAueCxwLnkscC5zLDAsNi4yODMyKSxjLmZpbGwoKSl9Yy5nbG9iYWxBbHBoYT0xO3JwYXJ0PXJwYXJ0LmZpbHRlcihwPT5wLmw+MCYmcC55PGgrNDApOwogaWYoZmxhc2g+LjAyKXtjLmZpbGxTdHlsZT0ncmdiYSgyNTUsMjU1LDI1NSwnK2ZsYXNoKi4zNSsnKSc7Yy5maWxsUmVjdCgwLDAsdyxoKTtmbGFzaCo9Ljh9CiAvKiAtLS0tIHJhcHBlciAtLS0tICovCiBjb25zdCBTPShlLGssdik9PkVbZV0uc2V0QXR0cmlidXRlKGssdiksYm9iPU1hdGguc2luKHQqOC40KTsKIGNvbnN0IG89MS41K3NhKjE3LG13PTgrKC41Ky41Kk1hdGguc2luKHQqNS4zKSkqNyooLjMrc2EpLG14PTEzMCxteT0xNTcsdGg9TWF0aC5taW4obyouMzUsNSk7CiBTKCdtcCcsJ2QnLCdNJysobXgtbXcpKycgJytteSsnUScrbXgrJyAnKyhteS0yLW8qLjEyKSsnICcrKG14K213KSsnICcrbXkrJ1EnK214KycgJysobXkrbykrJyAnKyhteC1tdykrJyAnK215KydaJyk7CiBTKCd0dCcsJ2QnLCdNJysobXgtbXcqLjcpKycgJytteSsnTCcrKG14K213Ki43KSsnICcrbXkrJ0wnKyhteCttdyouNikrJyAnKyhteSt0aCkrJ1EnK214KycgJysobXkrdGgrMSkrJyAnKyhteC1tdyouNikrJyAnKyhteSt0aCkrJ1onKTtFLnR0LnN0eWxlLm9wYWNpdHk9bz40PzE6MDsKIFMoJ3RnJywnY3gnLG14KTtTKCd0ZycsJ2N5JyxteStvKi4zOCk7UygndGcnLCdyeCcsbXcqLjUpO1MoJ3RnJywncnknLG8qLjE0KTtFLnRnLnN0eWxlLm9wYWNpdHk9bz42PzE6MDsKIGNBMSs9KGdBWzBdLWNBMSkqLjE4O2NBMis9KGdBWzFdLWNBMikqLjE4OwogUygnZmlnJywndHJhbnNmb3JtJywndHJhbnNsYXRlKDAgJysoc2IqNytraWNrKjUpKycpJyk7CiBTKCd0b3JzbycsJ3RyYW5zZm9ybScsJ3JvdGF0ZSgnKyhNYXRoLnNpbih0KjQuMikqMS41LWtpY2sqMS41KSsnIDEzMCAzMzApJyk7CiBTKCdoZWFkJywndHJhbnNmb3JtJywncm90YXRlKCcrKGJvYio0LXNiKjQra2ljayozKSsnIDEzMCAyMTUpIHRyYW5zbGF0ZSgwICcrKHNiKjYtc2EqMikrJyknKTsKIFMoJ2NhcCcsJ3RyYW5zZm9ybScsJ3JvdGF0ZSgnK01hdGguc2luKHQqOC40Ky42KSoyLjUrJyAxMzAgNzApJyk7CiBTKCdhcm1MJywndHJhbnNmb3JtJywncm90YXRlKCcrKGNBMS1raWNrKjEwKSsnIDgyIDIzOCknKTtTKCdmb3JlTCcsJ3RyYW5zZm9ybScsJ3JvdGF0ZSgnKyhjQTIrTWF0aC5zaW4odCo4LjQpKjYta2ljayoxNCkrJyA1OCAyOTIpJyk7CiBTKCdhcm1SJywndHJhbnNmb3JtJywncm90YXRlKCcrKE1hdGguc2luKHQqMykqMy1zYiozKSsnIDE3OCAyMzgpJyk7UygnZm9yZVInLCd0cmFuc2Zvcm0nLCdyb3RhdGUoJysoTWF0aC5zaW4odCo4LjQrMSkqNC1zYSozKSsnIDIxMiAyODApJyk7CiBTKCdjaGFpbicsJ3RyYW5zZm9ybScsJ3JvdGF0ZSgnKyhNYXRoLnNpbih0KjguNCsyKSoxMC1zYioxMCkrJyAxMzAgMjI4KScpO1MoJ3N0cicsJ3RyYW5zZm9ybScsJ3JvdGF0ZSgnK01hdGguc2luKHQqOC40KzEuNSkqMTIrJyAxMTIgMjM4KScpOwogUygnZ2xpbnQnLCd0cmFuc2Zvcm0nLCd0cmFuc2xhdGUoJysoKHQqNzApJTE5MCkrJyAwKScpOwogRS5ydC5zdHlsZS50cmFuc2Zvcm09J3NjYWxlKCcrKDErc2IqLjIyKSsnKSByb3RhdGUoJytNYXRoLnNpbih0KjQpKjEuNSsnZGVnKSd9CgovKiA9PT09PSBPTkxJTkUgKE1RVFQsIGxvY2tzdGVwKSA9PT09PSAqLwpjb25zdCBOVD0nYW1pcjJwLXYxJyxCUks9Wyd3c3M6Ly9icm9rZXIuZW1xeC5pbzo4MDg0L21xdHQnLCd3c3M6Ly9icm9rZXIuaGl2ZW1xLmNvbTo4ODg0L21xdHQnLCd3c3M6Ly90ZXN0Lm1vc3F1aXR0by5vcmc6ODA4MSddLE1RTD1bJ2h0dHBzOi8vY2RuLmpzZGVsaXZyLm5ldC9ucG0vbXF0dEA1LjEwLjEvZGlzdC9tcXR0Lm1pbi5qcycsJ2h0dHBzOi8vdW5wa2cuY29tL21xdHRANS4xMC4xL2Rpc3QvbXF0dC5taW4uanMnXTsKbGV0IE5FVEZJWD1mYWxzZSxtcT1udWxsLHJvb209Jycscm9sZT0nJyxvcHBJZD0nJyxTVEFLRT0wLG15VGVhbT0wLG9wcE5hbWU9J9it2LHbjNmBJyxvcHBTa2luPSdyZWQnLEZPUk1TPVtdLHBybmc9MSxlcG9jaD0wLHBlbmRTaG90PVtdLHNuYXBRPW51bGwsc2V0dGxlZD10cnVlLG1hdGNoTGl2ZT1mYWxzZSxwbGF5ZWQ9ZmFsc2UsaG9zdFdhaXRpbmc9ZmFsc2Usb3BwR29uZT0wLGxhc3RSeD0wLHJ0dD0wLGxhc3RQaW5nPTAscm1NaW5lPWZhbHNlLHJtT3BwPWZhbHNlLGxhc3RBaW09MCxob3N0SW5mbz1udWxsLGpvaW5UTz1udWxsLGVuZFc9bnVsbCxzdGFrZVNlbD0wLGxhc3RDb2RlPScnOwpsZXQgc3E9MCxzZWVuPW5ldyBTZXQoKSxwYz1udWxsLGRjPW51bGwscnE9W107CmNvbnN0IG15SWQ9TWF0aC5yYW5kb20oKS50b1N0cmluZygzNikuc2xpY2UoMiwxMCksRkw9KCk9Pm1vZGU9PT0nb25saW5lJyYmbXlUZWFtPT09MTsKY29uc3QgZXNjPXM9PlN0cmluZyhzKS5yZXBsYWNlKC9bJjw+IiddL2csYz0+KHsnJic6JyZhbXA7JywnPCc6JyZsdDsnLCc+JzonJmd0OycsJyInOicmcXVvdDsnLCInIjonJiMzOTsnfVtjXSkpOwpmdW5jdGlvbiBybmQoKXtwcm5nPShwcm5nKzB4NkQyQjc5RjUpfDA7bGV0IHQ9TWF0aC5pbXVsKHBybmdecHJuZz4+PjE1LDF8cHJuZyk7dD10K01hdGguaW11bCh0XnQ+Pj43LDYxfHQpXnQ7cmV0dXJuKCh0XnQ+Pj4xNCk+Pj4wKS80Mjk0OTY3Mjk2fQpjb25zdCBteU5tPSgpPT4oU1YubmFtZXx8J9io2KfYstuM2qnZhicpLnNsaWNlKDAsMTIpOwpmdW5jdGlvbiBubVNhdmUoKXtjb25zdCBuPSQoJ25tJyk7aWYobil7U1YubmFtZT1uLnZhbHVlLnRyaW0oKS5zbGljZSgwLDEyKTtzYXZlKCl9fQpjb25zdCBva0Zvcm09Zj0+QXJyYXkuaXNBcnJheShmKSYmZi5sZW5ndGg9PT01JiZmLmV2ZXJ5KHE9PkFycmF5LmlzQXJyYXkocSkmJnEubGVuZ3RoPT09MiYmcVswXT49LjA0JiZxWzBdPD0uOTYmJnFbMV0+PS4wNSYmcVsxXTw9Ljk3KTsKaWYoU1YucGVuZCl7Y29uc3QgcD1TVi5wZW5kO1NWLnBlbmQ9MDtzYXZlKCk7c2V0VGltZW91dCgoKT0+dG9hc3QoJ9io2KfYstuMINii2YbZhNin24zZhiDZhtuM2YXZh+KAjNqp2KfYsdmHINmF2YjZhtiv2Jsg2LTYsdi3ICcrRkEocCkrJyDYs9qp2Ycg2LPZiNiu2KonKSw5MDApfQpmdW5jdGlvbiBsb2FkTVEoKXtyZXR1cm4gbmV3IFByb21pc2UoKHJlcyxyZWopPT57bGV0IGk9MDsoZnVuY3Rpb24gbngoKXtpZih3aW5kb3cubXF0dClyZXR1cm4gcmVzKCk7aWYoaT49TVFMLmxlbmd0aClyZXR1cm4gcmVqKCk7Y29uc3Qgcz1kb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzY3JpcHQnKTtzLnNyYz1NUUxbaSsrXTtzLm9ubG9hZD0oKT0+d2luZG93Lm1xdHQ/cmVzKCk6bngoKTtzLm9uZXJyb3I9bng7ZG9jdW1lbnQuaGVhZC5hcHBlbmRDaGlsZChzKX0pKCl9KX0KZnVuY3Rpb24gbXFjKHVybCx3aWxsKXtyZXR1cm4gbmV3IFByb21pc2UoKHJlcyxyZWopPT57Y29uc3QgYz1tcXR0LmNvbm5lY3QodXJsLHtjbGllbnRJZDonYXMnK215SWQrTWF0aC5yYW5kb20oKS50b1N0cmluZygxNikuc2xpY2UoMiw2KSxjbGVhbjp0cnVlLHJlY29ubmVjdFBlcmlvZDoxNTAwLGNvbm5lY3RUaW1lb3V0OjYwMDAsa2VlcGFsaXZlOjE1LHdpbGx9KTtjb25zdCB0bz1zZXRUaW1lb3V0KCgpPT57Yy5yZW1vdmVBbGxMaXN0ZW5lcnMoKTtjLm9uKCdlcnJvcicsKCk9Pnt9KTtjLmVuZCh0cnVlKTtyZWooKX0sNzAwMCk7Yy5vbignZXJyb3InLCgpPT57fSk7Yy5vbmNlKCdjb25uZWN0JywoKT0+e2NsZWFyVGltZW91dCh0byk7cmVzKGMpfSl9KX0KZnVuY3Rpb24gTXVsdGkoKXtjb25zdCBjcz1bXTtyZXR1cm57Y3MsZ2V0IGNvbm5lY3RlZCgpe3JldHVybiBjcy5zb21lKGM9PmMuY29ubmVjdGVkKX0scHVibGlzaCh0LHAsbyl7Zm9yKGNvbnN0IGMgb2YgY3MpaWYoYy5jb25uZWN0ZWQpdHJ5e2MucHVibGlzaCh0LHAsbyl9Y2F0Y2goZSl7fX19fQphc3luYyBmdW5jdGlvbiBuZXRPcGVuKGNvZGUscil7CiB0cnl7YXdhaXQgbG9hZE1RKCl9Y2F0Y2goZSl7dG9hc3QoJ9qp2KrYp9io2K7Yp9mG2Ycg2KfYqti12KfZhCDZhNmI2K8g2YbYtNiv2Jsg2KfbjNmG2KrYsdmG2Kog24zYpyDZgduM2YTYqtix2LTaqdmGINix2Ygg2obaqSDaqdmGJyk7cmV0dXJuIGZhbHNlfQogbmV0Q2xvc2UoKTtyb29tPWNvZGU7cm9sZT1yO29wcElkPScnOwogY29uc3QgYmFzZT1OVCsnLycrY29kZSxvdXQ9cj09PSdob3N0Jz8naDJnJzonZzJoJyxpbm49cj09PSdob3N0Jz8nZzJoJzonaDJnJzsKIGNvbnN0IHdpbGw9e3RvcGljOmJhc2UrJy8nK291dCxwYXlsb2FkOkpTT04uc3RyaW5naWZ5KHt0Oidkcm9wJyxjOm15SWR9KSxxb3M6MX07CiBjb25zdCB3PU11bHRpKCk7bXE9dzsKIGNvbnN0IG9rPWF3YWl0IG5ldyBQcm9taXNlKHJlcz0+e2xldCBmaXJzdD0wLHNldHRsZWQ9MCxkb25lPWZhbHNlOwogIGNvbnN0IGZpbj12PT57aWYoIWRvbmUpe2RvbmU9dHJ1ZTtyZXModil9fTsKICBjb25zdCB0aWNrPSgpPT57aWYoKytzZXR0bGVkPj1CUksubGVuZ3RoKWZpbih3LmNzLmxlbmd0aD4wKX07CiAgQlJLLmZvckVhY2godT0+bXFjKHUsd2lsbCkudGhlbihjPT57CiAgIGlmKG1xIT09dyl7dHJ5e2MuZW5kKHRydWUpfWNhdGNoKGUpe31yZXR1cm4gdGljaygpfQogICB3LmNzLnB1c2goYyk7Yy5vbignbWVzc2FnZScsKHQsYik9Pm9uTmV0KGIpKTsKICAgYy5vbignb2ZmbGluZScsKCk9PntpZihtYXRjaExpdmUmJiF3LmNvbm5lY3RlZCl0b2FzdCgn2KfYsdiq2KjYp9i3INmC2LfYuSDYtNiv2Jsg2K/YsSDYrdin2YQg2KfYqti12KfZhCDYr9mI2KjYp9ix2YcuLi4nKX0pOwogICBjLm9uKCdjb25uZWN0JywoKT0+e2lmKG1hdGNoTGl2ZSl7bGFzdFJ4PURhdGUubm93KCk7bmV0U2VuZCh7dDonaGVyZSd9KX19KTsKICAgYy5zdWJzY3JpYmUoYmFzZSsnLycraW5uLHtxb3M6MX0sKCk9PntpZighZmlyc3Qpe2ZpcnN0PTE7c2V0VGltZW91dCgoKT0+ZmluKHRydWUpLDcwMCl9dGljaygpfSk7CiAgfSkuY2F0Y2godGljaykpOwogfSk7CiBpZighb2t8fCF3LmNzLmxlbmd0aCl7aWYobXE9PT13KW1xPW51bGw7dG9hc3QoJ9in2KrYtdin2YQg2KjZhyDYs9ix2YjYsSDYqNix2YLYsdin2LEg2YbYtNiv2Jsg2KfbjNmG2KrYsdmG2Kog24zYpyDZgduM2YTYqtix2LTaqdmGINix2Ygg2obaqSDaqdmGJyk7cmV0dXJuIGZhbHNlfQogcmV0dXJuIHRydWU7Cn0KLyogLS0tLSBkaXJlY3QgUDJQIChXZWJSVEMgRGF0YUNoYW5uZWwpIG9uIHRvcCBvZiBNUVRUOiBsb3dlc3QgbGF0ZW5jeSwgTVFUVCBzdGF5cyBhcyBmYWxsYmFjayAtLS0tICovCmNvbnN0IElDRT1be3VybHM6J3N0dW46c3R1bi5sLmdvb2dsZS5jb206MTkzMDInfSx7dXJsczonc3R1bjpzdHVuMS5sLmdvb2dsZS5jb206MTkzMDInfSx7dXJsczonc3R1bjpnbG9iYWwuc3R1bi50d2lsaW8uY29tOjM0NzgnfV07CmNvbnN0IGRjT3Blbj0oKT0+ISEoZGMmJmRjLnJlYWR5U3RhdGU9PT0nb3BlbicpOwpmdW5jdGlvbiBwMnBEb3duKGtlZXBRKXt0cnl7ZGMmJmRjLmNsb3NlKCl9Y2F0Y2goZSl7fXRyeXtwYyYmcGMuY2xvc2UoKX1jYXRjaChlKXt9cGM9ZGM9bnVsbDtpZigha2VlcFEpcnE9W119CmZ1bmN0aW9uIHAycE1rKCl7Y29uc3QgYz1uZXcgUlRDUGVlckNvbm5lY3Rpb24oe2ljZVNlcnZlcnM6SUNFfSk7cGM9YzsKIGMub25pY2VjYW5kaWRhdGU9ZT0+e2lmKHBjPT09YyYmZS5jYW5kaWRhdGUpbmV0U2VuZCh7dDoncnRjJyxrOidpJyxjOmUuY2FuZGlkYXRlLnRvSlNPTj9lLmNhbmRpZGF0ZS50b0pTT04oKTplLmNhbmRpZGF0ZX0sMSl9OwogYy5vbmNvbm5lY3Rpb25zdGF0ZWNoYW5nZT0oKT0+e2lmKHBjPT09YyYmKGMuY29ubmVjdGlvblN0YXRlPT09J2ZhaWxlZCd8fGMuY29ubmVjdGlvblN0YXRlPT09J2Nsb3NlZCcpKWRjPW51bGx9OwogcmV0dXJuIGN9CmZ1bmN0aW9uIHAycEJpbmQoY2gsYyl7Y2gub25vcGVuPSgpPT57aWYocGM9PT1jKXtkYz1jaDtsYXN0Ung9RGF0ZS5ub3coKX19O2NoLm9uY2xvc2U9KCk9PntpZihkYz09PWNoKWRjPW51bGx9O2NoLm9ubWVzc2FnZT1lPT57aWYocGM9PT1jKW9uTmV0KGUuZGF0YSl9fQphc3luYyBmdW5jdGlvbiBwMnBVcCgpewogaWYodHlwZW9mIFJUQ1BlZXJDb25uZWN0aW9uIT09J2Z1bmN0aW9uJ3x8cm9sZSE9PSdob3N0J3x8IW1xKXJldHVybjsKIGlmKGRjT3BlbigpKXJldHVybjsKIHRyeXtwMnBEb3duKCk7Y29uc3QgYz1wMnBNaygpLGNoPWMuY3JlYXRlRGF0YUNoYW5uZWwoJ2cnLHtvcmRlcmVkOnRydWV9KTtwMnBCaW5kKGNoLGMpOwogIGF3YWl0IGMuc2V0TG9jYWxEZXNjcmlwdGlvbihhd2FpdCBjLmNyZWF0ZU9mZmVyKCkpOwogIG5ldFNlbmQoe3Q6J3J0YycsazonbycsczpjLmxvY2FsRGVzY3JpcHRpb24uc2RwfSwxKX1jYXRjaChlKXtwMnBEb3duKCl9fQphc3luYyBmdW5jdGlvbiBydGNTaWcobSl7CiBpZih0eXBlb2YgUlRDUGVlckNvbm5lY3Rpb24hPT0nZnVuY3Rpb24nKXJldHVybjsKIHRyeXsKICBpZihtLms9PT0nbycmJnJvbGU9PT0nZ3Vlc3QnKXtwMnBEb3duKHRydWUpO2NvbnN0IGM9cDJwTWsoKTtjLm9uZGF0YWNoYW5uZWw9ZT0+cDJwQmluZChlLmNoYW5uZWwsYyk7CiAgIGF3YWl0IGMuc2V0UmVtb3RlRGVzY3JpcHRpb24oe3R5cGU6J29mZmVyJyxzZHA6bS5zfSk7CiAgIGZvcihjb25zdCB4IG9mIHJxLnNwbGljZSgwKSlhd2FpdCBjLmFkZEljZUNhbmRpZGF0ZSh4KS5jYXRjaCgoKT0+e30pOwogICBhd2FpdCBjLnNldExvY2FsRGVzY3JpcHRpb24oYXdhaXQgYy5jcmVhdGVBbnN3ZXIoKSk7bmV0U2VuZCh7dDoncnRjJyxrOidhJyxzOmMubG9jYWxEZXNjcmlwdGlvbi5zZHB9LDEpfQogIGVsc2UgaWYobS5rPT09J2EnJiZyb2xlPT09J2hvc3QnJiZwYyl7YXdhaXQgcGMuc2V0UmVtb3RlRGVzY3JpcHRpb24oe3R5cGU6J2Fuc3dlcicsc2RwOm0uc30pO2Zvcihjb25zdCB4IG9mIHJxLnNwbGljZSgwKSlhd2FpdCBwYy5hZGRJY2VDYW5kaWRhdGUoeCkuY2F0Y2goKCk9Pnt9KX0KICBlbHNlIGlmKG0uaz09PSdpJyl7aWYocGMmJnBjLnJlbW90ZURlc2NyaXB0aW9uKWF3YWl0IHBjLmFkZEljZUNhbmRpZGF0ZShtLmMpLmNhdGNoKCgpPT57fSk7ZWxzZSBycS5wdXNoKG0uYyl9CiB9Y2F0Y2goZSl7fX0KZnVuY3Rpb24gbmV0Q2xvc2UoKXtjbGVhclRpbWVvdXQoam9pblRPKTtob3N0V2FpdGluZz1mYWxzZTtwMnBEb3duKCk7c2Vlbj1uZXcgU2V0KCk7aWYobXEpe2NvbnN0IHc9bXE7bXE9bnVsbDtmb3IoY29uc3QgYyBvZiB3LmNzKXtjLnJlbW92ZUFsbExpc3RlbmVycygnbWVzc2FnZScpO3RyeXtjLmVuZChmYWxzZSl9Y2F0Y2goZSl7fX19fQpmdW5jdGlvbiBuZXRTZW5kKG0scT0xKXtpZighbXEpcmV0dXJuIGZhbHNlOwogY29uc3Qgcz1KU09OLnN0cmluZ2lmeShPYmplY3QuYXNzaWduKHt9LG0se2M6bXlJZCxuOisrc3EsdG86b3BwSWR8fHVuZGVmaW5lZH0pKTtsZXQgb2s9ZmFsc2U7CiBpZihkY09wZW4oKSl7dHJ5e2RjLnNlbmQocyk7b2s9dHJ1ZX1jYXRjaChlKXt9aWYob2smJm0udD09PSdhaW0nKXJldHVybiB0cnVlfQogaWYobXEuY29ubmVjdGVkKXt0cnl7bXEucHVibGlzaChOVCsnLycrcm9vbSsnLycrKHJvbGU9PT0naG9zdCc/J2gyZyc6J2cyaCcpLHMse3FvczpxfSk7b2s9dHJ1ZX1jYXRjaChlKXt9fQogcmV0dXJuIG9rfQpmdW5jdGlvbiBuZXRTZW5kVG8oaWQsbSl7Y29uc3Qgbz1vcHBJZDtvcHBJZD1pZDtuZXRTZW5kKG0pO29wcElkPW99CmZ1bmN0aW9uIG9uTmV0KGIpe2xldCBtO3RyeXttPUpTT04ucGFyc2UoYi50b1N0cmluZygpKX1jYXRjaChlKXtyZXR1cm59aWYoIW18fG0uYz09PW15SWQpcmV0dXJuOwogaWYobS5uIT09dW5kZWZpbmVkKXtjb25zdCBrPW0uYysnOicrbS5uO2lmKHNlZW4uaGFzKGspKXJldHVybjtzZWVuLmFkZChrKTtpZihzZWVuLnNpemU+ODAwKXNlZW4uZGVsZXRlKHNlZW4udmFsdWVzKCkubmV4dCgpLnZhbHVlKX0KIGlmKHJvbGU9PT0naG9zdCcpewogIGlmKG0udD09PSdwcm9iZScpe2lmKGhvc3RXYWl0aW5nKW1xLnB1Ymxpc2goTlQrJy8nK3Jvb20rJy9oMmcnLEpTT04uc3RyaW5naWZ5KHt0OidpbmZvJyxjOm15SWQsbjorK3NxLHRvOm0uYyxzdGFrZTpTVEFLRSxuYW1lOm15Tm0oKSxza2luOlNWLnNraW4sZm9ybTpteUZvcm0oKX0pLHtxb3M6MX0pO3JldHVybn0KICBpZihtLnQ9PT0naGVsbG8nKXtpZihtLnRvIT09bXlJZHx8IWhvc3RXYWl0aW5nKXJldHVybjsKICAgaWYoU1RBS0UmJlNWLmNvaW5zPFNUQUtFKXtuZXRTZW5kVG8obS5jLHt0Oidubycsd2h5OifZhduM2LLYqNin2YYg2LPaqdmH4oCM24wg2qnYp9mB24wg2YbYr9in2LHZhyd9KTtyZXR1cm59CiAgIG9wcElkPW0uYztob3N0V2FpdGluZz1mYWxzZTtvcHBOYW1lPVN0cmluZyhtLm5hbWV8fCfYrdix24zZgScpLnNsaWNlKDAsMTIpO29wcFNraW49bS5za2luO0ZPUk1TPVtteUZvcm0oKSxva0Zvcm0obS5mb3JtKT9tLmZvcm06UFJFLmJhbC5mXTtob3N0QmVnaW4oKTtyZXR1cm59CiAgaWYobS5jIT09b3BwSWQpcmV0dXJuOwogfWVsc2V7CiAgaWYobS50byE9PW15SWQpcmV0dXJuOwogIGlmKG0udD09PSdpbmZvJyl7aWYoaG9zdEluZm8pcmV0dXJuO2hvc3RJbmZvPW07b3BwSWQ9bS5jO2NsZWFyVGltZW91dChqb2luVE8pO3JldHVybiBzaG93Q29uZmlybSgpfQogIGlmKG0uYyE9PW9wcElkKXJldHVybjsKIH0KIGxhc3RSeD1EYXRlLm5vdygpO29wcEdvbmU9MDsKIHN3aXRjaChtLnQpewogIGNhc2UncCc6bmV0U2VuZCh7dDoncScsdHM6bS50c30sMCk7YnJlYWs7CiAgY2FzZSdxJzp7Y29uc3Qgdj1NYXRoLm1heCgxLERhdGUubm93KCktbS50cyk7cnR0PXJ0dD9NYXRoLnJvdW5kKHJ0dCouNit2Ki40KTp2O2JyZWFrfQogIGNhc2UncnRjJzpydGNTaWcobSk7YnJlYWs7CiAgY2FzZSdkcm9wJzpvcHBHb25lPURhdGUubm93KCk7YnJlYWs7CiAgY2FzZSdiZWdpbic6Z3Vlc3RCZWdpbihtKTticmVhazsKICBjYXNlJ25vJzp0b2FzdChtLndoeXx8J9it2LHbjNmBINmC2KjZiNmEINmG2qnYsdivJyk7cm1NaW5lPXJtT3BwPWZhbHNlO2lmKCFwbGF5ZWQpbGVhdmVPbmxpbmUoKTtlbHNlIGlmKCQoJ3JtYicpKSQoJ3JtYicpLnRleHRDb250ZW50PSfwn5SBINiv2YjYqNin2LHZhyc7YnJlYWs7CiAgY2FzZSdzaG90JzpwZW5kU2hvdC5wdXNoKG0pO2ZsdXNoU2hvdHMoKTticmVhazsKICBjYXNlJ2FpbSc6b25BaW0obSk7YnJlYWs7CiAgY2FzZSdzbmFwJzpzbmFwUT1PYmplY3QuYXNzaWduKG0se2F0OkRhdGUubm93KCl9KTt0cnlTbmFwKCk7YnJlYWs7CiAgY2FzZSdlbmQnOmVuZFc9bS53O2lmKHN0YXRlPT09J292ZXInKWVuZE1hdGNoKGVuZFcpO2Vsc2Ugc2V0VGltZW91dCgoKT0+e2lmKCFzZXR0bGVkKWVuZE1hdGNoKGVuZFcpfSwyNTAwKTticmVhazsKICBjYXNlJ2J5ZSc6aWYobWF0Y2hMaXZlJiYhc2V0dGxlZCllbmRNYXRjaChteVRlYW0sJ2J5ZScpO2JyZWFrOwogIGNhc2UncmVzJzppZihtYXRjaExpdmUmJiFzZXR0bGVkKWVuZE1hdGNoKG0udywnZGMnKTticmVhazsKICBjYXNlJ3JtJzpybU9wcD10cnVlO3RyeVJlbWF0Y2goKTticmVhazsKIH19Ci8qIC0tLS0gc2NyZWVucyAtLS0tICovCmZ1bmN0aW9uIHNob3dPbmxpbmUocyl7bm1TYXZlKCk7Y29uc3QgYzA9JCgnY2QnKTtpZihjMClsYXN0Q29kZT1jMC52YWx1ZTtpZihzIT09dW5kZWZpbmVkKXN0YWtlU2VsPXM7c3RhdGU9J21lbnUnO3VwZEh1ZCgpOwogb3YuaW5uZXJIVE1MPWA8aDI+8J+MkCDYqNin2LLbjCDYotmG2YTYp9uM2YY8L2gyPjxkaXYgY2xhc3M9ImNuIj7wn6qZIDxiPiR7RkEoU1YuY29pbnMpfTwvYj48L2Rpdj48aW5wdXQgaWQ9Im5tIiBtYXhsZW5ndGg9IjEyIiBwbGFjZWhvbGRlcj0i2KfYs9mFINiq2YgiIHZhbHVlPSIke2VzYyhTVi5uYW1lfHwnJyl9Ij48cCBjbGFzcz0iaG4iPti02LHYtyDZh9ixINmG2YHYsSDCtyDYqNix2YbYr9mHINmH2LEg2K/ZiCDYtNix2Lcg2LHZiCDZhduM4oCM2KjYsdmHPC9wPjxkaXYgY2xhc3M9InJ3Ij4ke1swLDI1LDUwLDc1LDEwMF0ubWFwKHY9PmA8YnV0dG9uIGNsYXNzPSJiMyAke3N0YWtlU2VsPT09dj8nb24nOicnfSIgb25jbGljaz0ic2hvd09ubGluZSgke3Z9KSI+JHt2Pyfwn6qZICcrRkEodik6J9ix2KfbjNqv2KfZhid9PC9idXR0b24+YCkuam9pbignJyl9PC9kaXY+JHtzdGFrZVNlbD9gPHAgY2xhc3M9ImhuIj7Zh9ixINiv2YggJHtGQShzdGFrZVNlbCl9INiz2qnZhyDZhduM4oCM2LDYp9ix24zYr9ibINio2LHZhtiv2YcgJHtGQShzdGFrZVNlbCoyKX0g2LPaqdmHINmF24zigIzar9uM2LHZhzwvcD5gOicnfTxidXR0b24gb25jbGljaz0iY3JlYXRlUm9vbSgpIj7wn4+gINiz2KfYrtiqINin2KrYp9mCPC9idXR0b24+PHAgY2xhc3M9ImhuIj7bjNinINqp2K8g2KfYqtin2YIg2K/ZiNiz2KrYqiDYsdmIINio2LLZhjwvcD48aW5wdXQgaWQ9ImNkIiBpbnB1dG1vZGU9Im51bWVyaWMiIG1heGxlbmd0aD0iNSIgcGxhY2Vob2xkZXI9Itqp2K8g27Ug2LHZgtmF24wiIGRpcj0ibHRyIiB2YWx1ZT0iJHtlc2MobGFzdENvZGUpfSI+PGJ1dHRvbiBjbGFzcz0iYjIiIG9uY2xpY2s9ImpvaW5Sb29tKCkiPvCfmqog2YjYsdmI2K8g2KjZhyDYp9iq2KfZgjwvYnV0dG9uPjxidXR0b24gY2xhc3M9ImIzIiBvbmNsaWNrPSJzaG93TWVudSgpIj7irIUg2KjYp9iy2q/YtNiqPC9idXR0b24+YDtvdi5zdHlsZS5kaXNwbGF5PSdmbGV4J30KYXN5bmMgZnVuY3Rpb24gY3JlYXRlUm9vbSgpe25tU2F2ZSgpO2luaXRBdWRpbygpO2lmKHN0YWtlU2VsJiZTVi5jb2luczxzdGFrZVNlbClyZXR1cm4gdG9hc3QoJ9iz2qnZh+KAjNin2Kog2KjYsdin24wg2KfbjNmGINi02LHYtyDaqdin2YHbjCDZhtuM2LPYqiDwn6qZJyk7CiBTVEFLRT1zdGFrZVNlbDtjb25zdCBjb2RlPVN0cmluZygxMDAwMCtNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkqOTAwMDApKTt0b2FzdCgn2K/YsSDYrdin2YQg2KfYqti12KfZhC4uLicpOwogaWYoIWF3YWl0IG5ldE9wZW4oY29kZSwnaG9zdCcpKXJldHVybjtob3N0V2FpdGluZz10cnVlO2hvc3RJbmZvPW51bGw7cGxheWVkPWZhbHNlO3Nob3dXYWl0KGNvZGUpfQpmdW5jdGlvbiBzaG93V2FpdChjb2RlKXtvdi5pbm5lckhUTUw9YDxoMj7wn4+gINin2KrYp9mCINiz2KfYrtiq2Ycg2LTYrzwvaDI+PHA+2qnYryDYsdmIINio2LHYp9uMINiv2YjYs9iq2Kog2KjZgdix2LPYqjwvcD48ZGl2IHN0eWxlPSJmb250LXNpemU6NjBweDtmb250LXdlaWdodDo4MDA7bGV0dGVyLXNwYWNpbmc6OHB4O2NvbG9yOnZhcigtLWFjYyk7ZGlyZWN0aW9uOmx0ciI+JHtjb2RlfTwvZGl2PiR7U1RBS0U/YDxkaXYgY2xhc3M9ImNuIj7YtNix2Lc6IPCfqpkgPGI+JHtGQShTVEFLRSl9PC9iPiDZh9ixINmG2YHYsSDCtyDYrNin24zYstmHICR7RkEoU1RBS0UqMil9PC9kaXY+YDonPHA+2KjYp9iy24wg2K/ZiNiz2KrYp9mG2Yc8L3A+J308YnV0dG9uIGNsYXNzPSJiMyIgb25jbGljaz0iY3BDb2RlKCcke2NvZGV9JykiPvCfk4sg2qnZvtuMINqp2K88L2J1dHRvbj48cCBjbGFzcz0iaG4iPtio2Kcg2YjYsdmI2K8g2K3YsduM2YEg2KjYp9iy24wg2K7ZiNiv2qnYp9ixINi02LHZiNi5INmF24zigIzYtNmHLiDYp9uM2YYg2LXZgdit2Ycg2LHZiCDZhtio2YbYry48L3A+PGJ1dHRvbiBjbGFzcz0iYjMiIG9uY2xpY2s9ImxlYXZlT25saW5lKCkiPtmE2LrZiDwvYnV0dG9uPmA7b3Yuc3R5bGUuZGlzcGxheT0nZmxleCd9CmZ1bmN0aW9uIGNwQ29kZShjKXsobmF2aWdhdG9yLmNsaXBib2FyZD9uYXZpZ2F0b3IuY2xpcGJvYXJkLndyaXRlVGV4dChjKTpQcm9taXNlLnJlamVjdCgpKS50aGVuKCgpPT50b2FzdCgn2qnYryDaqdm+24wg2LTYrycpKS5jYXRjaCgoKT0+dG9hc3QoJ9qp2K86ICcrYykpfQphc3luYyBmdW5jdGlvbiBqb2luUm9vbSgpe25tU2F2ZSgpO2luaXRBdWRpbygpO2NvbnN0IGNvZGU9KCQoJ2NkJykudmFsdWV8fCcnKS5yZXBsYWNlKC9b27At27ldL2csZD0+J9uw27Hbstuz27Tbtdu227fbuNu5Jy5pbmRleE9mKGQpKS5yZXBsYWNlKC9cRC9nLCcnKTtpZihjb2RlLmxlbmd0aCE9PTUpcmV0dXJuIHRvYXN0KCfaqdivINin2KrYp9mCINu1INix2YLZhduM2YcnKTsKIHRvYXN0KCfYr9ixINit2KfZhCDYp9iq2LXYp9mELi4uJyk7aWYoIWF3YWl0IG5ldE9wZW4oY29kZSwnZ3Vlc3QnKSlyZXR1cm47aG9zdEluZm89bnVsbDtwbGF5ZWQ9ZmFsc2U7bmV0U2VuZCh7dDoncHJvYmUnfSk7Y29uc3QgcGk9c2V0SW50ZXJ2YWwoKCk9PntpZihob3N0SW5mb3x8IW1xKXJldHVybiBjbGVhckludGVydmFsKHBpKTtuZXRTZW5kKHt0Oidwcm9iZSd9KX0sOTAwKTtzZXRUaW1lb3V0KCgpPT5jbGVhckludGVydmFsKHBpKSw1MjAwKTsKIGNsZWFyVGltZW91dChqb2luVE8pO2pvaW5UTz1zZXRUaW1lb3V0KCgpPT57aWYoIWhvc3RJbmZvKXt0b2FzdCgn2KfYqtin2YLbjCDYqNinINin24zZhiDaqdivINm+24zYr9inINmG2LTYrycpO2xlYXZlT25saW5lKCl9fSw1MDAwKX0KZnVuY3Rpb24gc2hvd0NvbmZpcm0oKXtjb25zdCBpPWhvc3RJbmZvLG9rPSFpLnN0YWtlfHxTVi5jb2lucz49aS5zdGFrZTtvcHBOYW1lPVN0cmluZyhpLm5hbWV8fCfZhduM2LLYqNin2YYnKS5zbGljZSgwLDEyKTtvcHBTa2luPWkuc2tpbjsKIG92LmlubmVySFRNTD1gPGgyPvCfmqog2KfYqtin2YIgJHtlc2Mob3BwTmFtZSl9PC9oMj4ke2kuc3Rha2U/YDxkaXYgY2xhc3M9ImNuIj7YtNix2Lc6IPCfqpkgPGI+JHtGQShpLnN0YWtlKX08L2I+INmH2LEg2YbZgdixPC9kaXY+PHA+2KjYsdmG2K/ZhyAke0ZBKGkuc3Rha2UqMil9INiz2qnZhyDZhduM4oCM2q/bjNix2Yc8L3A+YDonPHA+2KjYp9iy24wg2K/ZiNiz2KrYp9mG2YcgKNio2K/ZiNmGINi02LHYtyk8L3A+J308ZGl2IGNsYXNzPSJjbiI+2LPaqdmH4oCM24wg2KrZiDog8J+qmSA8Yj4ke0ZBKFNWLmNvaW5zKX08L2I+PC9kaXY+JHtvaz8nPGJ1dHRvbiBvbmNsaWNrPSJhY2NlcHRSb29tKCkiPuKchSDZgtio2YjZhCDZiCDYtNix2YjYuTwvYnV0dG9uPic6JzxwPtiz2qnZh+KAjNin2Kog2KjYsdin24wg2KfbjNmGINi02LHYtyDaqdin2YHbjCDZhtuM2LPYqiDwn6qZPC9wPid9PGJ1dHRvbiBjbGFzcz0iYjMiIG9uY2xpY2s9ImxlYXZlT25saW5lKCkiPtin2YbYtdix2KfZgTwvYnV0dG9uPmA7b3Yuc3R5bGUuZGlzcGxheT0nZmxleCd9CmZ1bmN0aW9uIGFjY2VwdFJvb20oKXtpbml0QXVkaW8oKTtTVEFLRT1ob3N0SW5mby5zdGFrZXwwO0ZPUk1TPVtva0Zvcm0oaG9zdEluZm8uZm9ybSk/aG9zdEluZm8uZm9ybTpQUkUuYmFsLmYsbXlGb3JtKCldO25ldFNlbmQoe3Q6J2hlbGxvJyxuYW1lOm15Tm0oKSxza2luOlNWLnNraW4sZm9ybTpteUZvcm0oKX0pOwogb3YuaW5uZXJIVE1MPSc8aDI+4o+zINmF2YbYqti42LEg2LTYsdmI2LkuLi48L2gyPic7Y2xlYXJUaW1lb3V0KGpvaW5UTyk7am9pblRPPXNldFRpbWVvdXQoKCk9PntpZighbWF0Y2hMaXZlKXt0b2FzdCgn2YXbjNiy2KjYp9mGINm+2KfYs9iuINmG2K/Yp9ivJyk7bGVhdmVPbmxpbmUoKX19LDcwMDApfQovKiAtLS0tIG1hdGNoIHN0YXJ0IC0tLS0gKi8KZnVuY3Rpb24gaG9zdEJlZ2luKCl7aWYoU1RBS0UmJlNWLmNvaW5zPFNUQUtFKXt0b2FzdCgn2LPaqdmH4oCM2KfYqiDYqNix2KfbjCDYtNix2Lcg2qnYp9mB24wg2YbbjNiz2Kog8J+qmScpO3JtTWluZT1ybU9wcD1mYWxzZTtuZXRTZW5kKHt0Oidubycsd2h5OifZhduM2LLYqNin2YYg2LPaqdmH4oCM24wg2qnYp9mB24wg2YbYr9in2LHZhyd9KTtyZXR1cm59CiBjb25zdCBzZWVkPShNYXRoLnJhbmRvbSgpKjQyOTQ5NjcyOTYpPj4+MDtpZihTVEFLRSl7U1YuY29pbnMtPVNUQUtFO1NWLnBlbmQ9U1RBS0U7c2F2ZSgpfQogbmV0U2VuZCh7dDonYmVnaW4nLHNlZWQsc3Rha2U6U1RBS0V9KTtzdGFydE9ubGluZShzZWVkKX0KZnVuY3Rpb24gZ3Vlc3RCZWdpbihtKXtpZighaG9zdEluZm98fG0uc3Rha2UhPT1ob3N0SW5mby5zdGFrZSl7bGVhdmVPbmxpbmUoKTtyZXR1cm59U1RBS0U9bS5zdGFrZTsKIGlmKFNUQUtFJiZTVi5jb2luczxTVEFLRSl7bmV0U2VuZCh7dDonbm8nLHdoeTon2K3YsduM2YEg2LPaqdmH4oCM24wg2qnYp9mB24wg2YbYr9in2LHZhyd9KTt0b2FzdCgn2LPaqdmH4oCM2KfYqiDaqdin2YHbjCDZhtuM2LPYqiDwn6qZJyk7aWYoIXBsYXllZClsZWF2ZU9ubGluZSgpO3JldHVybn0KIGlmKFNUQUtFKXtTVi5jb2lucy09U1RBS0U7U1YucGVuZD1TVEFLRTtzYXZlKCl9c3RhcnRPbmxpbmUobS5zZWVkKX0KZnVuY3Rpb24gc3RhcnRPbmxpbmUoc2VlZCl7cmVjZD10cnVlO05FVEZJWD10cnVlO3NldFdvcmxkKCk7Zml0KCk7cGF1c2VkPWZhbHNlO21vZGU9J29ubGluZSc7bXlUZWFtPXJvbGU9PT0naG9zdCc/MDoxO3Njb3JlPVswLDBdO2Vhcm5lZD0wO3Bybmc9c2VlZHwwO2Vwb2NoPTA7cGVuZFNob3Q9W107c25hcFE9bnVsbDsKIHNldHRsZWQ9ZmFsc2U7bWF0Y2hMaXZlPXRydWU7cGxheWVkPXRydWU7b3BwR29uZT0wO2xhc3RSeD1EYXRlLm5vdygpO2VuZFc9bnVsbDtybU1pbmU9cm1PcHA9ZmFsc2U7Y2xlYXJUaW1lb3V0KGpvaW5UTyk7CiBjb25zdCBtPW15U2soKSxhPVNLLmZpbmQocz0+cy5pZD09PW9wcFNraW4pfHxPUFA7b3BwUz1hLmlkPT09bS5pZD8obS5pZD09PSdmaXJlJ3x8bS5pZD09PSdpcmFuJz9TSy5maW5kKHM9PnMuaWQ9PT0naWNlJyk6T1BQKTphOwogb3Yuc3R5bGUuZGlzcGxheT0nbm9uZSc7aW5pdEF1ZGlvKCk7cmVzZXQoMCk7c2Z4KCd3aGlzdGxlJyk7c2V0VGltZW91dChwMnBVcCwzMDApfQovKiAtLS0tIGxvY2tzdGVwIHN5bmMgLS0tLSAqLwpmdW5jdGlvbiBuZXRTaG90KHAsdngsdnkpe25ldFNlbmQoe3Q6J3Nob3QnLGU6ZXBvY2gsdG06bXlUZWFtLGk6b2JqLmluZGV4T2YocCksdngsdnl9LDEpfQpmdW5jdGlvbiBmbHVzaFNob3RzKCl7d2hpbGUocGVuZFNob3QubGVuZ3RoKXtjb25zdCBtPXBlbmRTaG90WzBdO2lmKG0uZTxlcG9jaCl7cGVuZFNob3Quc2hpZnQoKTtjb250aW51ZX0KIGlmKG0uZT09PWVwb2NoJiZzdGF0ZT09PSdhaW0nJiZ0dXJuPT09bS50bSYmbS50bSE9PW15VGVhbSl7cGVuZFNob3Quc2hpZnQoKTtjb25zdCBwPW9ialttLmldO2lmKHAmJnAudD09PW0udG0mJmlzRmluaXRlKG0udngpJiZpc0Zpbml0ZShtLnZ5KSl7Y29uc3QgbD1NYXRoLnNxcnQobS52eCptLnZ4K20udnkqbS52eSk7aWYobD4xOS4wMSl7bS52eCo9MTkvbDttLnZ5Kj0xOS9sfXNob290KHAsbS52eCxtLnZ5KX19ZWxzZSBicmVha319CmZ1bmN0aW9uIHNlbmRBaW0oKXtjb25zdCBuPXBlcmZvcm1hbmNlLm5vdygpO2lmKG4tbGFzdEFpbTw0NXx8IXNlbHx8IXNwfHwhYWltKXJldHVybjtsYXN0QWltPW47bmV0U2VuZCh7dDonYWltJyxpOm9iai5pbmRleE9mKHNlbCksc3g6c3AueCxzeTpzcC55LHg6YWltLngseTphaW0ueX0sMCl9CmZ1bmN0aW9uIG9uQWltKG0pe2lmKHN0YXRlIT09J2FpbSd8fHR1cm49PT1teVRlYW0pcmV0dXJuO2lmKG0uaTwwKXtzZWw9YWltPXNwPW51bGw7cmV0dXJufWNvbnN0IHA9b2JqW20uaV07aWYocCYmcC50PT09dHVybil7c2VsPXA7c3A9e3g6bS5zeCx5Om0uc3l9O2FpbT17eDptLngseTptLnl9fX0KZnVuY3Rpb24gc2VuZFNuYXAoKXtuZXRTZW5kKHt0OidzbmFwJyxlOmVwb2NoLHM6c2NvcmUsdG46dHVybixyczpwcm5nLG86b2JqLm1hcChvPT5bby54LG8ueV0pfSwxKX0KZnVuY3Rpb24gdHJ5U25hcCgpe2NvbnN0IHE9c25hcFE7aWYoIXEpcmV0dXJuO2lmKHEuZT09PWVwb2NoJiZzdGF0ZT09PSdhaW0nKXthcHBseVNuYXAocSk7c25hcFE9bnVsbH1lbHNlIGlmKHEuZTxlcG9jaHx8KHEuZT09PWVwb2NoJiZzdGF0ZSE9PSdhaW0nKSlzbmFwUT1udWxsfQpmdW5jdGlvbiBhcHBseVNuYXAocSl7b2JqLmZvckVhY2goKG8saSk9Pntjb25zdCBwPXEub1tpXTtpZihwKXtvLng9cFswXTtvLnk9cFsxXTtvLnZ4PW8udnk9MH19KTtzY29yZT1xLnMuc2xpY2UoKTt0dXJuPXEudG47cHJuZz1xLnJzO3VwZEh1ZCgpfQpmdW5jdGlvbiBhaW1FbnRlcigpe2Vwb2NoKys7aWYobW9kZSE9PSdvbmxpbmUnKXJldHVybjtpZihyb2xlPT09J2hvc3QnKXNlbmRTbmFwKCk7dHJ5U25hcCgpO2ZsdXNoU2hvdHMoKTt1cGRIdWQoKX0KZnVuY3Rpb24gbmV0VGljaygpe2lmKCFtcXx8IW1xLmNvbm5lY3RlZClyZXR1cm47Y29uc3Qgbj1EYXRlLm5vdygpOwogaWYobi1sYXN0UGluZz4yMDAwKXtsYXN0UGluZz1uO25ldFNlbmQoe3Q6J3AnLHRzOm59LDApO2lmKG1vZGU9PT0nb25saW5lJyl1cGRIdWQoKX0KIGlmKHNuYXBRJiZzdGF0ZT09PSdhaW0nJiZzbmFwUS5lPmVwb2NoJiZuLXNuYXBRLmF0PjQwMDApe2Vwb2NoPXNuYXBRLmU7YXBwbHlTbmFwKHNuYXBRKTtzbmFwUT1udWxsfQogaWYobWF0Y2hMaXZlJiYhc2V0dGxlZCYmKChvcHBHb25lJiZuLW9wcEdvbmU+MjIwMDApfHwobGFzdFJ4JiZuLWxhc3RSeD4zMDAwMCkpKXtuZXRTZW5kKHt0OidyZXMnLHc6bXlUZWFtLHdoeTonZGMnfSk7ZW5kTWF0Y2gobXlUZWFtLCdkYycpfX0Kc2V0SW50ZXJ2YWwobmV0VGljaywxMDAwKTsKLyogLS0tLSBlbmQgLyByZW1hdGNoIC8gbGVhdmUgLS0tLSAqLwpmdW5jdGlvbiBmaW5pc2hPbmxpbmUoKXtyZWNkPXRydWU7c3RhdGU9J292ZXInO2NvbnN0IHc9c2NvcmVbMF0+c2NvcmVbMV0/MDoxOwogaWYocm9sZT09PSdob3N0Jyl7bmV0U2VuZCh7dDonZW5kJyx3LHM6c2NvcmV9KTtlbmRNYXRjaCh3KX0KIGVsc2UgaWYoZW5kVyE9PW51bGwpZW5kTWF0Y2goZW5kVyk7ZWxzZSBzZXRUaW1lb3V0KCgpPT57aWYoIXNldHRsZWQpZW5kTWF0Y2godyl9LDYwMDApfQpmdW5jdGlvbiBlbmRNYXRjaCh3LHdoeSl7aWYoc2V0dGxlZClyZXR1cm47c2V0dGxlZD10cnVlO21hdGNoTGl2ZT1mYWxzZTtTVi5wZW5kPTA7Y29uc3Qgd29uPXc9PT1teVRlYW07bGV0IGdhaW49MDtpZihTVEFLRSYmd29uKXtnYWluPVNUQUtFKjI7U1YuY29pbnMrPWdhaW59c2F2ZSgpO3N0YXRlPSdvdmVyJzt1cGRIdWQoKTtzZngod29uPyd3aW4nOidjb25jJyk7CiBjb25zdCB0aXRsZT13aHk9PT0nYnllJz8n8J+PgyDYrdix24zZgSDYsdmB2KrYmyDYqtmIINio2LHYr9uMISDwn4+GJzp3aHk9PT0nZGMnPyh3b24/J/Cfk6Eg2K3YsduM2YEg2YLYt9i5INi02K/YmyDYqtmIINio2LHYr9uMISDwn4+GJzon8J+ToSDYqNin2K7YqtuMICjZgti32Lkg2KfYsdiq2KjYp9i3KScpOih3b24/J9io2LHYr9uMISDwn4+GJzon2KjYp9iu2KrbjCDwn5iFJyk7CiBvdi5pbm5lckhUTUw9YDxoMj4ke3RpdGxlfTwvaDI+PGRpdiBjbGFzcz0iY24iPiR7RkEoc2NvcmVbbXlUZWFtXSl9IC0gJHtGQShzY29yZVsxLW15VGVhbV0pfTwvZGl2PiR7U1RBS0U/YDxkaXYgY2xhc3M9ImNuIj4ke3dvbj8n2KzYp9uM2LLZhyc6J9io2KfYrtiq24wnfTogPGI+JHt3b24/JysnK0ZBKGdhaW4pOictJytGQShTVEFLRSl9PC9iPiDwn6qZPC9kaXY+YDonJ308ZGl2IGNsYXNzPSJjbiI+8J+qmSA8Yj4ke0ZBKFNWLmNvaW5zKX08L2I+PC9kaXY+PGJ1dHRvbiBpZD0icm1iIiBvbmNsaWNrPSJyZXFSZW1hdGNoKCkiPvCflIEg2K/ZiNio2KfYsdmHPC9idXR0b24+PGJ1dHRvbiBjbGFzcz0iYjMiIG9uY2xpY2s9ImxlYXZlT25saW5lKCkiPtmF2YbZiDwvYnV0dG9uPmA7b3Yuc3R5bGUuZGlzcGxheT0nZmxleCd9CmZ1bmN0aW9uIHJlcVJlbWF0Y2goKXtpZihTVEFLRSYmU1YuY29pbnM8U1RBS0UpcmV0dXJuIHRvYXN0KCfYs9qp2YfigIzYp9iqINio2LHYp9uMINi02LHYtyDaqdin2YHbjCDZhtuM2LPYqiDwn6qZJyk7cm1NaW5lPXRydWU7bmV0U2VuZCh7dDoncm0nfSk7JCgncm1iJykudGV4dENvbnRlbnQ9J+KPsyDZhdmG2KrYuNixINit2LHbjNmBLi4uJzt0cnlSZW1hdGNoKCl9CmZ1bmN0aW9uIHRyeVJlbWF0Y2goKXtpZihyb2xlPT09J2hvc3QnJiZybU1pbmUmJnJtT3BwJiZzZXR0bGVkJiYhbWF0Y2hMaXZlKWhvc3RCZWdpbigpfQpmdW5jdGlvbiBsZWF2ZU9ubGluZSgpe2lmKG1hdGNoTGl2ZSYmIXNldHRsZWQpbmV0U2VuZCh7dDonYnllJ30pO25ldENsb3NlKCk7bWF0Y2hMaXZlPWZhbHNlO3NldHRsZWQ9dHJ1ZTtob3N0SW5mbz1udWxsO29wcElkPScnO05FVEZJWD1mYWxzZTttb2RlPSdib3QnO3JlY2Q9dHJ1ZTtwZW5kU2hvdD1bXTtzbmFwUT1udWxsO3JtTWluZT1ybU9wcD1mYWxzZTtzZWw9YWltPXNwPW51bGw7c3RhdGU9J21lbnUnO3NldFdvcmxkKCk7Zml0KCk7c2hvd01lbnUoKX0KZnVuY3Rpb24gZXhpdEdhbWUoKXtpZihtb2RlIT09J29ubGluZScpe3Bvc3QoJ2hvbWUnLDApO3JldHVybn0KIGlmKG1hdGNoTGl2ZSYmIXNldHRsZWQpe2lmKCFjb25maXJtKCfYp9qv2Ycg2KfZhNin2YYg2KjYsduMINio2KfYstuMINix2Ygg2YXbjOKAjNio2KfYstuMJysoU1RBS0U/JyDZiCDYtNix2LcgKCcrRkEoU1RBS0UpKycg2LPaqdmHKSDYs9mI2K7YqiDZhduM4oCM2LTZhyc6JycpKycuINmF2LfZhdim2YbbjNifJykpcmV0dXJuO25ldFNlbmQoe3Q6J2J5ZSd9KX0KIG5ldENsb3NlKCk7bWF0Y2hMaXZlPWZhbHNlO3NldHRsZWQ9dHJ1ZTtpZihlbWIpe3NldFRpbWVvdXQoKCk9PnBvc3QoJ2hvbWUnLDApLDIyMCk7cmV0dXJufWxlYXZlT25saW5lKCl9CmNvbnN0IF91aD11cGRIdWQ7dXBkSHVkPWZ1bmN0aW9uKCl7X3VoKCk7aWYobW9kZT09PSdvbmxpbmUnKXskKCdwYicpLmhpZGRlbj10cnVlOyQoJ2hiJykuaGlkZGVuPWZhbHNlO2lmKFsnYWltJywnbW92aW5nJywnZ29hbCcsJ25vZ29hbCddLmluY2x1ZGVzKHN0YXRlKSl7Y29uc3QgdD0kKCd0cicpO3QuY2xhc3NOYW1lPXR1cm49PT1teVRlYW0/J3QwJzondDEnO3QudGV4dENvbnRlbnQ9KHR1cm49PT1teVRlYW0/J/Cfjq8g2YbZiNio2Kog2KrZiNiz2KonOifij7Mg2YbZiNio2KogJytvcHBOYW1lKSsoU1RBS0U/JyDCtyDwn6qZICcrRkEoU1RBS0UqMik6JycpKyhydHQ/JyDCtyAnK0ZBKHJ0dCkrJ21zJysoZGNPcGVuKCk/JyDimqEnOicnKTonJyl9fX07CgpzZXRXb3JsZCgpO2lmKCFwaXRjaClidWlsZFBpdGNoKCk7Zml0KCk7ZW1iP3Nob3dNZW51KCk6c2hvd0NvdmVyKCk7CihmdW5jdGlvbiBsb29wKCl7dXBkYXRlKCk7ZHJhdygpO3JhcEFuaW0oKTtyZXF1ZXN0QW5pbWF0aW9uRnJhbWUobG9vcCl9KSgpOwo8L3NjcmlwdD48L2JvZHk+PC9odG1sPgo=',markhor:'PCFET0NUWVBFIGh0bWw+CjxodG1sIGxhbmc9ImZhIiBkaXI9InJ0bCI+CjxoZWFkPgo8bWV0YSBjaGFyc2V0PSJ1dGYtOCI+CjxtZXRhIG5hbWU9InZpZXdwb3J0IiBjb250ZW50PSJ3aWR0aD1kZXZpY2Utd2lkdGgsIGluaXRpYWwtc2NhbGU9MSwgbWF4aW11bS1zY2FsZT0xLCB1c2VyLXNjYWxhYmxlPW5vLCB2aWV3cG9ydC1maXQ9Y292ZXIiPgo8dGl0bGU+2YXYp9ix2K7ZiNixPC90aXRsZT4KPHN0eWxlPgpodG1sLGJvZHl7aGVpZ2h0OjEwMCU7bWFyZ2luOjA7YmFja2dyb3VuZDojMDAwO292ZXJmbG93OmhpZGRlbjt0b3VjaC1hY3Rpb246bm9uZTstd2Via2l0LXVzZXItc2VsZWN0Om5vbmU7dXNlci1zZWxlY3Q6bm9uZX0KY2FudmFze3Bvc2l0aW9uOmZpeGVkO3RvcDowO2xlZnQ6MDtkaXNwbGF5OmJsb2NrfQojdWl7cG9zaXRpb246Zml4ZWQ7aW5zZXQ6MDtkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2p1c3RpZnktY29udGVudDpjZW50ZXI7cG9pbnRlci1ldmVudHM6bm9uZTtmb250LWZhbWlseTpWYXppcm1hdG4sVGFob21hLCJTZWdvZSBVSSIsc2Fucy1zZXJpZjtjb2xvcjojZmZmfQouY2FyZHtwb2ludGVyLWV2ZW50czphdXRvO2JhY2tncm91bmQ6cmdiYSgyMywyMSwzOCwuOTIpO2JvcmRlci1yYWRpdXM6MThweDtwYWRkaW5nOjIycHggMjBweDt3aWR0aDptaW4oOTJ2dywzNjBweCk7bWF4LWhlaWdodDo4NnZoO292ZXJmbG93OmF1dG87dGV4dC1hbGlnbjpjZW50ZXI7Ym94LXNoYWRvdzowIDEwcHggNDBweCByZ2JhKDAsMCwwLC41KTtib3gtc2l6aW5nOmJvcmRlci1ib3h9Ci5jYXJkW2hpZGRlbl17ZGlzcGxheTpub25lfQpoMXttYXJnaW46MCAwIDhweDtmb250LXNpemU6NDZweH0KLnN1Yntmb250LXNpemU6MTVweDtsaW5lLWhlaWdodDoxLjk7Y29sb3I6cmdiYSgyNTUsMjU1LDI1NSwuODUpO21hcmdpbi1ib3R0b206OHB4fQoud2Fse2ZvbnQtc2l6ZToxN3B4O2NvbG9yOiNmZmQxNjY7Zm9udC13ZWlnaHQ6NzAwO21hcmdpbjo2cHggMCAxNHB4fQpidXR0b257Zm9udDppbmhlcml0O2ZvbnQtd2VpZ2h0OjcwMDtmb250LXNpemU6MTdweDtib3JkZXI6MDtib3JkZXItcmFkaXVzOjEycHg7cGFkZGluZzoxMnB4IDE4cHg7bWFyZ2luOjRweDtjdXJzb3I6cG9pbnRlcjtiYWNrZ3JvdW5kOiNmZmQxNjY7Y29sb3I6IzJhMWQwMH0KYnV0dG9uLnNlY3tiYWNrZ3JvdW5kOnJnYmEoMjU1LDI1NSwyNTUsLjE0KTtjb2xvcjojZmZmfQpidXR0b246ZGlzYWJsZWR7b3BhY2l0eTouNDtjdXJzb3I6ZGVmYXVsdH0KI2dyaWR7ZGlzcGxheTpncmlkO2dyaWQtdGVtcGxhdGUtY29sdW1uczoxZnIgMWZyO2dhcDoxMHB4O21hcmdpbjoxMHB4IDB9Ci5za3tiYWNrZ3JvdW5kOnJnYmEoMjU1LDI1NSwyNTUsLjA3KTtib3JkZXItcmFkaXVzOjEycHg7cGFkZGluZzo4cHg7Ym9yZGVyOjJweCBzb2xpZCB0cmFuc3BhcmVudH0KLnNrLm9ue2JvcmRlci1jb2xvcjojN2FlN2M3fQouc2sgY2FudmFze3dpZHRoOjEwMCU7aGVpZ2h0OjQ0cHg7ZGlzcGxheTpibG9ja30KLnNrIGJ7ZGlzcGxheTpibG9jaztmb250LXNpemU6MTVweDttYXJnaW4tdG9wOjRweH0KLnNrIGl7ZGlzcGxheTpibG9jaztmb250LXN0eWxlOm5vcm1hbDtmb250LXNpemU6MTJweDttYXJnaW4tYm90dG9tOjZweH0KLnNrIGJ1dHRvbnt3aWR0aDoxMDAlO2ZvbnQtc2l6ZToxNHB4O3BhZGRpbmc6OHB4O21hcmdpbjowfQojcm90e2Rpc3BsYXk6bm9uZTtwb3NpdGlvbjpmaXhlZDtpbnNldDowO3otaW5kZXg6OTk7YmFja2dyb3VuZDojMDUwMzBjO2ZsZXgtZGlyZWN0aW9uOmNvbHVtbjthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OmNlbnRlcjtnYXA6MTZweDtjb2xvcjojZmZmO2ZvbnQtZmFtaWx5OlZhemlybWF0bixUYWhvbWEsIlNlZ29lIFVJIixzYW5zLXNlcmlmO3RleHQtYWxpZ246Y2VudGVyO3BhZGRpbmc6MjRweH0KI3JvdCAucGh7Zm9udC1zaXplOjc2cHg7YW5pbWF0aW9uOnJ0IDIuMnMgZWFzZS1pbi1vdXQgaW5maW5pdGV9CiNyb3QgYntmb250LXNpemU6MjRweH0jcm90IHNtYWxse2ZvbnQtc2l6ZToxNHB4O29wYWNpdHk6Ljd9CkBrZXlmcmFtZXMgcnR7MCUsMjUle3RyYW5zZm9ybTpyb3RhdGUoOTBkZWcpfTY1JSwxMDAle3RyYW5zZm9ybTpyb3RhdGUoMCl9fQo8L3N0eWxlPgo8L2hlYWQ+Cjxib2R5Pgo8Y2FudmFzIGlkPSJjIj48L2NhbnZhcz4KPGRpdiBpZD0icm90Ij48ZGl2IGNsYXNzPSJwaCI+8J+TsTwvZGl2PjxiPtqv2YjYtNuMINix2Ygg2LnZhdmI2K/bjCDYqNqv24zYsTwvYj48c21hbGw+2KfbjNmGINio2KfYstuMINmB2YLYtyDYqtmI24wg2K3Yp9mE2Kog2LnZhdmI2K/bjCAo2b7Ysdiq2LHZhykg2KfYrNix2Kcg2YXbjNi02Yc8L3NtYWxsPjwvZGl2Pgo8ZGl2IGlkPSJ1aSI+CjxkaXYgY2xhc3M9ImNhcmQiIGlkPSJtYWluIj48aDEgaWQ9InR0bCI+2YXYp9ix2K7ZiNixPC9oMT48ZGl2IGNsYXNzPSJzdWIiIGlkPSJzdWIiPjwvZGl2PjxkaXYgY2xhc3M9IndhbCIgaWQ9IndhbCI+PC9kaXY+PGJ1dHRvbiBpZD0icGxheSI+2LTYsdmI2Lkg2KjYp9iy24w8L2J1dHRvbj48YnV0dG9uIGlkPSJza2J0biIgY2xhc3M9InNlYyI+2KfYs9qp24zZhuKAjNmH2Kc8L2J1dHRvbj48YnV0dG9uIGlkPSJob21lIiBjbGFzcz0ic2VjIj7wn4+gINmF2YbZiNuMINin2LXZhNuMPC9idXR0b24+PC9kaXY+CjxkaXYgY2xhc3M9ImNhcmQiIGlkPSJweiIgaGlkZGVuPjxoMSBzdHlsZT0iY29sb3I6I2ZmZDE2NiI+2KrZiNmC2YE8L2gxPjxkaXYgY2xhc3M9InN1YiI+2KjYp9iy24wg2YXYqtmI2YLZgSDYtNiv2Yc8L2Rpdj48YnV0dG9uIGlkPSJyZXN1bWUiPtin2K/Yp9mF2Yc8L2J1dHRvbj48YnV0dG9uIGlkPSJxdWl0IiBjbGFzcz0ic2VjIj7Zvtin24zYp9mGINio2KfYstuMPC9idXR0b24+PGJ1dHRvbiBpZD0iaG9tZTIiIGNsYXNzPSJzZWMiPvCfj6Ag2YXZhtmI24wg2KfYtdmE24w8L2J1dHRvbj48L2Rpdj4KPGRpdiBjbGFzcz0iY2FyZCIgaWQ9InNob3AiIGhpZGRlbj48ZGl2IHN0eWxlPSJkaXNwbGF5OmZsZXg7anVzdGlmeS1jb250ZW50OnNwYWNlLWJldHdlZW47YWxpZ24taXRlbXM6Y2VudGVyIj48YiBzdHlsZT0iZm9udC1zaXplOjIwcHgiPtin2LPaqduM2YbigIzZh9inPC9iPjxzcGFuIGNsYXNzPSJ3YWwiIGlkPSJ3YWwyIiBzdHlsZT0ibWFyZ2luOjAiPjwvc3Bhbj48L2Rpdj48ZGl2IGlkPSJncmlkIj48L2Rpdj48YnV0dG9uIGlkPSJiYWNrIiBjbGFzcz0ic2VjIiBzdHlsZT0id2lkdGg6MTAwJSI+2KjYsdqv2LTYqjwvYnV0dG9uPjwvZGl2Pgo8L2Rpdj4KPHNjcmlwdD4KY29uc3QgYz1kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYycpLHg9Yy5nZXRDb250ZXh0KCcyZCcpOwpjb25zdCBGT05UPSdWYXppcm1hdG4sVGFob21hLCJTZWdvZSBVSSIsc2Fucy1zZXJpZicsVEFVPU1hdGguUEkqMixSPTI2MDAsQk9UUz0xNCxGT09ETUFYPTk1MDsKY29uc3QgTkFNRVM9Wyfaqdin2YjZhycsJ9mG24zZhdinJywn2LPYp9ix2KcnLCfYotix2LQnLCfZhdmH2LPYpycsJ9m+2YjbjNinJywn2LHZh9inJywn2KjYp9io2qknLCfYs9iq2KfYsdmHJywn2qnbjNin2YYnLCfZhtqv2KfYsScsJ9iz2KfZhScsJ9mE24zZhNinJywn2K/Yp9ix24zZiNi0J107CmxldCBXLEgsb2ZmWD0wLERQUnY9MTsKZnVuY3Rpb24gcnMoKXsKICBjb25zdCBEPU1hdGgubWluKGRldmljZVBpeGVsUmF0aW98fDEsMiksaXc9aW5uZXJXaWR0aCxpaD1pbm5lckhlaWdodCxjb2Fyc2U9bWF0Y2hNZWRpYSgnKHBvaW50ZXI6Y29hcnNlKScpLm1hdGNoZXM7CiAgRFBSdj1EOwogIC8vINmF2YjYqNin24zZhC/Yqtio2YTYqjog2qnZhCDYtdmB2K3Zhy4g2K/Ys9qp2KrYp9m+OiDYs9iq2YjZhiDYudmF2YjYr9uMINu5Otux27Yg2YjYs9i3INi12YHYrdmHCiAgVz1jb2Fyc2U/aXc6TWF0aC5yb3VuZChNYXRoLm1pbihpdyxpaCouNTYyNSkpO0g9aWg7b2ZmWD1NYXRoLnJvdW5kKChpdy1XKS8yKTsKICBjLndpZHRoPVcqRDtjLmhlaWdodD1IKkQ7Yy5zdHlsZS53aWR0aD1XKydweCc7Yy5zdHlsZS5oZWlnaHQ9SCsncHgnO2Muc3R5bGUubGVmdD1vZmZYKydweCc7CiAgeC5zZXRUcmFuc2Zvcm0oRCwwLDAsRCwwLDApOwogIGNvbnN0IHU9ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3VpJyk7aWYodSl7dS5zdHlsZS5sZWZ0PW9mZlgrJ3B4Jzt1LnN0eWxlLnJpZ2h0PSdhdXRvJzt1LnN0eWxlLndpZHRoPVcrJ3B4J30KfQphZGRFdmVudExpc3RlbmVyKCdyZXNpemUnLHJzKTthZGRFdmVudExpc3RlbmVyKCdvcmllbnRhdGlvbmNoYW5nZScsKCk9PnNldFRpbWVvdXQocnMsMTIwKSk7cnMoKTsKY29uc3QgbnJtPWE9PigoYStNYXRoLlBJKSVUQVUrVEFVKSVUQVUtTWF0aC5QSTsKY29uc3Qgcm5kPU1hdGgucmFuZG9tOwpjb25zdCAkPWlkPT5kb2N1bWVudC5nZXRFbGVtZW50QnlJZChpZCk7CmNvbnN0IFJBUj17Yzp7bjon2LHYp9uM2KwnLGNvbDonI2I4YzBjYycsdzo1fSxyOntuOifaqdmF24zYp9ioJyxjb2w6JyM0ZGEzZmYnLHc6M30sZTp7bjon2K3Zhdin2LPbjCcsY29sOicjYjg2YmZmJyx3OjJ9LGw6e246J9in2YHYs9in2YbZh+KAjNin24wnLGNvbDonI2ZmYjAyZScsdzoxfSxtOntuOifYp9iz2LfZiNix2YfigIzYp9uMJyxjb2w6JyNmZjRkNmQnLHc6LjZ9fTsKY29uc3QgaHM9KGgscyxsKT0+J2hzbCgnK2grJywnK3MrJyUsJytsKyclKSc7CmNvbnN0IFNLSU5TPVsKe2lkOid0ZWFsJyxuOifZhti52YbYpycscjonYycscDowLGg6MTY1LGNvbDppPT5ocygxNjUsNzAsNDYrKE1hdGguZmxvb3IoaS8zKSUyKSo3KX0sCntpZDonZW1iZXInLG46J9in2K7ar9ixJyxyOidjJyxwOjgwLGg6MTgsY29sOmk9PmhzKDE4LDgwLDQ4KyhNYXRoLmZsb29yKGkvMyklMikqNyl9LAp7aWQ6J3Zpb2xldCcsbjon2LTYqOKAjNio2YgnLHI6J2MnLHA6ODAsaDoyNzAsY29sOmk9PmhzKDI3MCw2MCw1MisoTWF0aC5mbG9vcihpLzMpJTIpKjcpfSwKe2lkOid6ZWJyYScsbjon2q/ZiNix2K7YsScscjoncicscDozMDAsaDowLGNvbDppPT5NYXRoLmZsb29yKGkvMyklMj9ocygwLDAsOTIpOmhzKDAsMCwxNCl9LAp7aWQ6J2NhbmR5JyxuOifYotio2YbYqNin2KonLHI6J3InLHA6MzAwLGg6MzMwLGNvbDppPT5NYXRoLmZsb29yKGkvMyklMj9ocygzMzAsODUsNzApOmhzKDE5MCw4MCw3NSl9LAp7aWQ6J2xhdmEnLG46J9qv2K/Yp9iy2YcnLHI6J2UnLHA6OTAwLGg6MjAsY29sOihpLG4sdCk9PmhzKE1hdGguZmxvb3IoKE1hdGguc2luKGkqLjI1LXQqNCkrMSkqMjUpLDk1LDQ4K01hdGguc2luKGkqLjI1LXQqNCkqMTApfSwKe2lkOidhdXJvcmEnLG46J9i02YHZgicscjonZScscDo5MDAsaDoxNTAsY29sOihpLG4sdCk9PmhzKCgxMzAraSo0K01hdGguc2luKHQqMikqMzApJTM2MCw4MCw1NSl9LAp7aWQ6J2dvbGQnLG46J9iy2LHbjNmGJyxyOidsJyxwOjI1MDAsaDo0NSxhdXJhOjEsY29sOihpLG4sdCk9PmhzKDQ1LDk1LDQwK01hdGgubWF4KDAsTWF0aC5zaW4oaSouMy10KjUpKSoyOCl9LAp7aWQ6J3JhaW5ib3cnLG46J9ix2Ybar9uM2YbigIzaqdmF2KfZhicscjonbCcscDozMDAwLGg6MzAwLGF1cmE6MSxjb2w6KGksbix0KT0+aHMoKGkqNyt0KjkwKSUzNjAsOTAsNTgpfSwKe2lkOidnYWxheHknLG46J9qp2Yfaqdi02KfZhicscjonbScscDo2MDAwLGg6MjYwLGF1cmE6MSxjb2w6KGksbix0KT0+KGkqMzcrTWF0aC5mbG9vcih0KjUpKSU5PT09MD9ocygwLDAsOTUpOmhzKDI1MCsoaSozKSU0MCw3MCwyMisoTWF0aC5mbG9vcihpLzIpJTIpKjYpfSwKe2lkOidwaG9lbml4JyxuOifZgtmC2YbZiNizJyxyOidtJyxwOjgwMDAsaDoyNSxhdXJhOjEsY29sOihpLG4sdCk9Pntjb25zdCB3PU1hdGguc2luKGkqLjM1LXQqOSk7cmV0dXJuIGhzKE1hdGgubWF4KDAsTWF0aC5mbG9vcigodyouNSsuNSkqNTUpKSwxMDAsNDUrdyoxMil9fQpdOwpjb25zdCBza2luQnlJZD1pZD0+U0tJTlMuZmluZChrPT5rLmlkPT09aWQpfHxTS0lOU1swXTsKZnVuY3Rpb24gYm90U2tpbigpe2xldCB0b3Q9MDtmb3IoY29uc3QgayBvZiBTS0lOUyl0b3QrPVJBUltrLnJdLnc7bGV0IHI9cm5kKCkqdG90O2Zvcihjb25zdCBrIG9mIFNLSU5TKXtyLT1SQVJbay5yXS53O2lmKHI8PTApcmV0dXJuIGt9cmV0dXJuIFNLSU5TWzBdfQpsZXQgc2F2ZT17d2FsbGV0OjEwMCxvd25lZDpbJ3RlYWwnXSxzZWw6J3RlYWwnfTsKdHJ5e2NvbnN0IHE9SlNPTi5wYXJzZShsb2NhbFN0b3JhZ2UuZ2V0SXRlbSgnbWFya2hvci1zYXZlJykpO2lmKHEmJkFycmF5LmlzQXJyYXkocS5vd25lZCkmJnR5cGVvZiBxLndhbGxldD09PSdudW1iZXInKXNhdmU9cX1jYXRjaChlKXt9CmlmKCFzYXZlLm93bmVkLmluY2x1ZGVzKCd0ZWFsJykpc2F2ZS5vd25lZC5wdXNoKCd0ZWFsJyk7CmlmKCFzYXZlLm93bmVkLmluY2x1ZGVzKHNhdmUuc2VsKSlzYXZlLnNlbD0ndGVhbCc7CmZ1bmN0aW9uIHN2KCl7dHJ5e2xvY2FsU3RvcmFnZS5zZXRJdGVtKCdtYXJraG9yLXNhdmUnLEpTT04uc3RyaW5naWZ5KHNhdmUpKX1jYXRjaChlKXt9fQoKbGV0IHN0PSdyZWFkeScsdD0wLG92ZXJBdD0wLGVhcm5lZD0wLHVpU2hvd249ZmFsc2UsYmVzdD0wLHBhcnRzPVtdLHJpbmdzPVtdLGJvbHRzPVtdLHBvcHM9W10sY2hhaW49W10sZXllcz1bXSxyaWZ0cz1bXSxtb3Rlcz1bXSxsaW5lcz1bXSxwdW5jaD0wLGFiZXI9MCxnbGl0Y2g9MCxyYWdlPTAsc3RyZWFrPTAsc3RyZWFrVD0tOTksaGl0U3RvcD0wLHRzPTEsZnhRPTEsYks9MCxkYW5nPTAseno9LjcsZ0F2Zz0uMDE2LHBhdXNlZD1mYWxzZSxsYXN0RW1pdD0wLHNuYWtlcz1bXSxmb29kPVtdLFA9bnVsbCxjYW09e3g6MCx5OjAsejouN30sbGI9W10sbGJUPTAsbXNnPXtzOicnLHQ6MH07CmxldCBwdHI9e3g6MCx5OjB9LHN0ZWVySWQ9bnVsbCxib29zdElkPW51bGwsYm9vc3RJbj1mYWxzZTsKdHJ5e2Jlc3Q9K2xvY2FsU3RvcmFnZS5nZXRJdGVtKCdtYXJraG9yLWJlc3QnKXx8MH1jYXRjaChlKXt9CmNvbnN0IGJ0bj0oKT0+KHt4OlctNzAseTpILTkwLHI6NDR9KTsKY29uc3QgcGJ0bj0oKT0+KHt4OlcvMix5OkgtNDAscjoyMH0pOwoKZnVuY3Rpb24gdXBSKHMpe3Mucj03K01hdGgubWluKDE4LE1hdGguc3FydChzLm1hc3MpKi41NSk7cy5zcD1zLnIqLjd9CmZ1bmN0aW9uIGFkZEZvb2QocHgscHksdixoKXtmb29kLnB1c2goe3g6cHgseTpweSx2LGgscGg6cm5kKCkqNn0pfQpmdW5jdGlvbiBzYWZlUG9zKCl7CiAgZm9yKGxldCBrPTA7azw0MDtrKyspewogICAgY29uc3QgYT1ybmQoKSpUQVUsZD1SKi44Kk1hdGguc3FydChybmQoKSkscHg9TWF0aC5jb3MoYSkqZCxweT1NYXRoLnNpbihhKSpkO2xldCBvaz10cnVlOwogICAgZm9yKGNvbnN0IHMgb2Ygc25ha2VzKXtpZighcy5hbGl2ZSljb250aW51ZTtmb3IobGV0IGk9MDtpPHMuc2Vncy5sZW5ndGg7aSs9NCl7aWYoTWF0aC5oeXBvdChzLnNlZ3NbaV0ueC1weCxzLnNlZ3NbaV0ueS1weSk8MzUwKXtvaz1mYWxzZTticmVha319aWYoIW9rKWJyZWFrfQogICAgaWYob2spcmV0dXJuW3B4LHB5XTsKICB9CiAgcmV0dXJuWzAsMF07Cn0KZnVuY3Rpb24gbWsobmFtZSxpc1AsbWFzcyl7CiAgY29uc3RbcHgscHldPXNhZmVQb3MoKSxhPXJuZCgpKlRBVTsKICBjb25zdCBzPXtuYW1lLGlzUCx4OnB4LHk6cHksYW5nOmEsdGE6YSxtYXNzOm1hc3N8fDEwLGh1ZTowLHNraW46bnVsbCxzYTphLHNlZ3M6W10sYm9vc3Q6ZmFsc2UsYWxpdmU6dHJ1ZSxraWxsczowLHRoaW5rOnJuZCgpKi4xLGFnZ3I6LjMrcm5kKCkqLjYsd2FuZGVyOmEsZHJvcDowLGRlYWQ6MCxodW50OmZhbHNlLGdsb3c6MCxiazowLGZlOjB9OwogIHVwUihzKTtzLnNraW49aXNQP3NraW5CeUlkKHNhdmUuc2VsKTpib3RTa2luKCk7cy5odWU9cy5za2luLmg7CiAgZm9yKGxldCBpPTA7aTwxMDtpKyspcy5zZWdzLnB1c2goe3g6cHgtTWF0aC5jb3MoYSkqaSpzLnNwLHk6cHktTWF0aC5zaW4oYSkqaSpzLnNwfSk7CiAgcmV0dXJuIHM7Cn0KZnVuY3Rpb24gaW5pdCgpewogIHNuYWtlcz1bXTtmb29kPVtdOwogIGZvcihsZXQgaT0wO2k8NzAwO2krKyl7Y29uc3QgYT1ybmQoKSpUQVUsZD1SKk1hdGguc3FydChybmQoKSk7YWRkRm9vZChNYXRoLmNvcyhhKSpkLE1hdGguc2luKGEpKmQsLjYrcm5kKCkqLjksTWF0aC5mbG9vcihybmQoKSozNjApKX0KICBQPW1rKCfYqtmIJyx0cnVlLDEwKTtQLmFsaXZlPWZhbHNlO3NuYWtlcy5wdXNoKFApOwogIGZvcihsZXQgaT0wO2k8Qk9UUztpKyspc25ha2VzLnB1c2gobWsoTkFNRVNbaV0sZmFsc2UsMTArcm5kKCkqNDApKTsKICBpbml0RlgoKTsKfQpmdW5jdGlvbiBzdGFydCgpewogIE9iamVjdC5hc3NpZ24oUCxtaygn2KrZiCcsdHJ1ZSwxMCkpO1AucXVpdD1mYWxzZTtzdD0ncGxheSc7U05ELnN0YXJ0KCk7bXNnPXtzOicnLHQ6MH07dWlTaG93bj1mYWxzZTtwYXVzZWQ9ZmFsc2U7JCgncHonKS5oaWRkZW49dHJ1ZTtwYXJ0cz1bXTtyaW5ncz1bXTtib2x0cz1bXTtwb3BzPVtdO2NoYWluPVtdO3B1bmNoPTA7YWJlcj0wO2dsaXRjaD0wO3JhZ2U9MDtzdHJlYWs9MDtzdHJlYWtUPS05OTtoaXRTdG9wPTA7dHM9MTtiSz0wO2xhc3RFbWl0PTA7JCgndWknKS5zdHlsZS5kaXNwbGF5PSdub25lJztlbWl0KCdzdGFydCcsMCk7am95LmlkPW51bGw7am95Lm9uPWZhbHNlO2pveS5hbmc9UC5hbmc7Ym9vc3RJbj1mYWxzZTtib29zdElkPW51bGw7Cn0KaW5pdCgpOwoKZnVuY3Rpb24gZW1pdCh0eXBlLHNjb3JlLHdvbil7dHJ5e2lmKHBhcmVudCE9PXdpbmRvdylwYXJlbnQucG9zdE1lc3NhZ2Uoe3NvdXJjZTonbm92YS1hcmNhZGUtZW1iZWQnLGdhbWU6J21hcmtob3InLHR5cGUsc2NvcmU6TWF0aC5tYXgoMCxNYXRoLmZsb29yKHNjb3JlfHwwKSksd29uOiEhd29ufSwnKicpfWNhdGNoKGUpe319CgovKiA9PT09PT09PT09PT09PT09PSBTT1VORCBFTkdJTkUgKFdlYkF1ZGlvLCBwcm9jZWR1cmFsLCBubyBmaWxlcykgPT09PT09PT09PT09PT09PT0gKi8KY29uc3QgU05EPSgoKT0+ewpsZXQgYWMsbXN0LG11ZmYscnYsYnVzLE49e30sTD17fSxvbj10cnVlLGNoaz0wLHZjPTAsbGFzdEhpc3M9MCxsYXN0RWF0PTAsbGFzdEVhdFQ9MCxlYXRDPTAsaGI9MCxtaWxlPTAsd2FzQj1mYWxzZSxsYXN0Qm90PTA7CmNvbnN0IGNsPSh2LGEsYik9Pk1hdGgubWF4KGEsTWF0aC5taW4oYix2KSksUk49KGEsYik9PmErTWF0aC5yYW5kb20oKSooYi1hKSxTQz1bMCwzLDUsNywxMCwxMiwxNSwxN10sUkk9e2M6MCxyOjEsZToyLGw6MyxtOjR9Owpjb25zdCBudD0oYixzKT0+YipNYXRoLnBvdygyLHMvMTIpOwpmdW5jdGlvbiBjaGtPbigpe2NvbnN0IG49cGVyZm9ybWFuY2Uubm93KCk7aWYobi1jaGs+MzAwKXtjaGs9bjtsZXQgdj10cnVlO3RyeXtjb25zdCBwPUpTT04ucGFyc2UobG9jYWxTdG9yYWdlLmdldEl0ZW0oJ2FyY2FkZV9wcmVmJyl8fCd7fScpO3Y9IShwLnNuZD09PTB8fHAuc25kPT09ZmFsc2UpfWNhdGNoKGUpe31vbj12O2lmKG1zdCltc3QuZ2Fpbi5zZXRUYXJnZXRBdFRpbWUob24/Ljg1OjAsYWMuY3VycmVudFRpbWUsLjA1KX1yZXR1cm4gb259CmZ1bmN0aW9uIG91dChnLHBhbixzZW5kKXtsZXQgbj1nO2lmKHBhbiYmYWMuY3JlYXRlU3RlcmVvUGFubmVyKXtjb25zdCBwPWFjLmNyZWF0ZVN0ZXJlb1Bhbm5lcigpO3AucGFuLnZhbHVlPWNsKHBhbiwtMSwxKTtuLmNvbm5lY3QocCk7bj1wfW4uY29ubmVjdChidXMpO2lmKHNlbmQpe2NvbnN0IHM9YWMuY3JlYXRlR2FpbigpO3MuZ2Fpbi52YWx1ZT1zZW5kO24uY29ubmVjdChzKTtzLmNvbm5lY3QocnYpfX0KZnVuY3Rpb24gbnoobyl7aWYodmM+NDYmJiFvLmhpKXJldHVybjtjb25zdCB0MD1hYy5jdXJyZW50VGltZSsoby50fHwwKSxzPWFjLmNyZWF0ZUJ1ZmZlclNvdXJjZSgpLGY9YWMuY3JlYXRlQmlxdWFkRmlsdGVyKCksZz1hYy5jcmVhdGVHYWluKCk7CiBzLmJ1ZmZlcj1OW28uYnVmfHwndyddO3MubG9vcD10cnVlO2YudHlwZT1vLnR5cGV8fCdiYW5kcGFzcyc7Zi5RLnZhbHVlPW8ucXx8MTtmLmZyZXF1ZW5jeS5zZXRWYWx1ZUF0VGltZShvLmYxLHQwKTtpZihvLmYyKWYuZnJlcXVlbmN5LmV4cG9uZW50aWFsUmFtcFRvVmFsdWVBdFRpbWUoby5mMix0MCtvLmQpOwogZy5nYWluLnNldFZhbHVlQXRUaW1lKC4wMDAxLHQwKTtnLmdhaW4ubGluZWFyUmFtcFRvVmFsdWVBdFRpbWUoby52LHQwKyhvLmF8fC4wMDQpKTtnLmdhaW4uZXhwb25lbnRpYWxSYW1wVG9WYWx1ZUF0VGltZSguMDAwMSx0MCtvLmQpO3MuY29ubmVjdChmKTtmLmNvbm5lY3QoZyk7CiBpZihvLmFtKXtjb25zdCBsPWFjLmNyZWF0ZU9zY2lsbGF0b3IoKSxsZz1hYy5jcmVhdGVHYWluKCk7bC5mcmVxdWVuY3kudmFsdWU9by5hbTtsZy5nYWluLnZhbHVlPW8udiouNjtsLmNvbm5lY3QobGcpO2xnLmNvbm5lY3QoZy5nYWluKTtsLnN0YXJ0KHQwKTtsLnN0b3AodDArby5kKy4wNSl9CiBvdXQoZyxvLnBhbixvLnNlbmQpO3ZjKys7cy5vbmVuZGVkPSgpPT52Yy0tO3Muc3RhcnQodDAsTWF0aC5yYW5kb20oKSoxLjUpO3Muc3RvcCh0MCtvLmQrLjA1KX0KZnVuY3Rpb24gb2Iobyl7aWYodmM+NDYmJiFvLmhpKXJldHVybjtjb25zdCB0MD1hYy5jdXJyZW50VGltZSsoby50fHwwKSxzPWFjLmNyZWF0ZU9zY2lsbGF0b3IoKSxnPWFjLmNyZWF0ZUdhaW4oKTsKIHMudHlwZT1vLnR5cGV8fCdzaW5lJztzLmZyZXF1ZW5jeS5zZXRWYWx1ZUF0VGltZShvLmYxLHQwKTtpZihvLmYyKXMuZnJlcXVlbmN5LmV4cG9uZW50aWFsUmFtcFRvVmFsdWVBdFRpbWUoTWF0aC5tYXgoMjAsby5mMiksdDArby5kKTsKIGcuZ2Fpbi5zZXRWYWx1ZUF0VGltZSguMDAwMSx0MCk7Zy5nYWluLmxpbmVhclJhbXBUb1ZhbHVlQXRUaW1lKG8udix0MCsoby5hfHwuMDA0KSk7Zy5nYWluLmV4cG9uZW50aWFsUmFtcFRvVmFsdWVBdFRpbWUoLjAwMDEsdDArby5kKTsKIGxldCBuPXM7aWYoby5scCl7Y29uc3QgZj1hYy5jcmVhdGVCaXF1YWRGaWx0ZXIoKTtmLnR5cGU9J2xvd3Bhc3MnO2YuZnJlcXVlbmN5LnNldFZhbHVlQXRUaW1lKG8ubHAsdDApO2lmKG8ubHAyKWYuZnJlcXVlbmN5LmV4cG9uZW50aWFsUmFtcFRvVmFsdWVBdFRpbWUoby5scDIsdDArby5kKTtzLmNvbm5lY3QoZik7bj1mfQogbi5jb25uZWN0KGcpO291dChnLG8ucGFuLG8uc2VuZCk7dmMrKztzLm9uZW5kZWQ9KCk9PnZjLS07cy5zdGFydCh0MCk7cy5zdG9wKHQwK28uZCsuMDUpfQpmdW5jdGlvbiBkcm9wKHQsdixwYW4pe29iKHt0LGQ6LjA3LGYxOlJOKDkwMCwxNzAwKSxmMjpSTigzMDAsNTIwKSx2LHBhbixzZW5kOi4zfSk7bnooe3QsZDouMDMsZjE6Uk4oMjAwMCw0MjAwKSxxOjMsdjp2Ki44LHBhbn0pfQpmdW5jdGlvbiBoaXNzKHBhbix2KXtjb25zdCBkPVJOKC4zNSwuNik7bnooe2QsZjE6NTgwMCxxOi45LHYsYTouMDcscGFuLHNlbmQ6LjE1LGFtOjI3fSk7bnooe2QsZjE6NDIwMCx0eXBlOidoaWdocGFzcycsdjp2Ki41LGE6LjA5LHBhbn0pfQpmdW5jdGlvbiBiZWF0KHQsdil7b2Ioe3QsZDouMTYsZjE6NjQsZjI6MzgsdjouNSp2LGhpOjF9KTtvYih7dDp0Ky4wMixkOi4xMixmMTo5NSxmMjo0OCx2Oi4yMip2LGhpOjF9KTtvYih7dDp0Ky4xNyxkOi4xMyxmMTo1OCxmMjozNix2Oi4zMip2LGhpOjF9KX0KZnVuY3Rpb24gY2hpbWUodCxmLHYpe29iKHt0LGQ6MS4zLGYxOmYsdixzZW5kOi41LGhpOjF9KTtvYih7dCxkOi45LGYxOmYqMi4wMSx2OnYqLjQsc2VuZDouNSxoaToxfSk7b2Ioe3QsZDouNSx0eXBlOid0cmlhbmdsZScsZjE6ZiozLHY6diouMTgsaGk6MX0pfQpmdW5jdGlvbiBzcGxhdCh6LHBhbix2KXsKIG9iKHtkOi4yOCsuMyp6LGYxOjEzMC00MCp6LGYyOjM0LHY6LjU1KnYsaGk6MSxwYW4sc2VuZDouMTV9KTsKIG56KHtkOi4wMyxmMTozMjAwLHR5cGU6J2xvd3Bhc3MnLHY6LjQqdixwYW59KTsKIG56KHtkOi4yNisuMjIqeixmMTo5NTAsZjI6MjQwLHE6Nyx2Oi41KnYsYnVmOidwJyxhbToyMSxwYW4sc2VuZDouMjV9KTsKIG56KHt0Oi4wNCxkOi4yLGYxOjE3MDAsZjI6NjAwLHE6NSx2Oi4yOCp2LGJ1ZjoncCcsYW06MzQscGFuLHNlbmQ6LjJ9KTsKIGZvcihsZXQgaT0wO2k8KCg1K3oqNSl8MCk7aSsrKW56KHt0OlJOKDAsLjEyKSxkOi4wMTIsZjE6Uk4oMjUwMCw2MDAwKSx0eXBlOidoaWdocGFzcycsdjpSTiguMSwuMikqdixwYW59KTsKIGZvcihsZXQgaT0wO2k8KCg3K3oqOCl8MCk7aSsrKWRyb3AoUk4oLjA2LC43NSt6Ki40KSxSTiguMDQsLjEpKnYscGFuKTsKIG56KHt0Oi4xLGQ6LjUrLjQqeixmMTo2MDAsZjI6MjgwLHE6Myx2Oi4xKnYsYnVmOidiJyxhbToxMyxwYW4sc2VuZDouMzV9KX0KZnVuY3Rpb24gbG9vcChidWYsdHlwZSxmLHEscmF0ZSl7Y29uc3Qgcz1hYy5jcmVhdGVCdWZmZXJTb3VyY2UoKSxmbD1hYy5jcmVhdGVCaXF1YWRGaWx0ZXIoKSxhbT1hYy5jcmVhdGVHYWluKCksZz1hYy5jcmVhdGVHYWluKCkscj17fTsKIHMuYnVmZmVyPU5bYnVmXTtzLmxvb3A9dHJ1ZTtmbC50eXBlPXR5cGU7ZmwuZnJlcXVlbmN5LnZhbHVlPWY7ZmwuUS52YWx1ZT1xO2cuZ2Fpbi52YWx1ZT0wO3MuY29ubmVjdChmbCk7ZmwuY29ubmVjdChhbSk7YW0uY29ubmVjdChnKTtnLmNvbm5lY3QoYnVzKTsKIGlmKHJhdGUpe2FtLmdhaW4udmFsdWU9LjU7Y29uc3QgbD1hYy5jcmVhdGVPc2NpbGxhdG9yKCksbGc9YWMuY3JlYXRlR2FpbigpO2wuZnJlcXVlbmN5LnZhbHVlPXJhdGU7bGcuZ2Fpbi52YWx1ZT0uNTtsLmNvbm5lY3QobGcpO2xnLmNvbm5lY3QoYW0uZ2Fpbik7bC5zdGFydCgpO3IubD1sfQogcy5zdGFydCgpO3IuZmw9Zmw7ci5nPWc7cmV0dXJuIHJ9CmZ1bmN0aW9uIG9zYyh0eXBlLGYsbHAscmF0ZSl7Y29uc3Qgbz1hYy5jcmVhdGVPc2NpbGxhdG9yKCksZmw9YWMuY3JlYXRlQmlxdWFkRmlsdGVyKCksYW09YWMuY3JlYXRlR2FpbigpLGc9YWMuY3JlYXRlR2FpbigpO28udHlwZT10eXBlO28uZnJlcXVlbmN5LnZhbHVlPWY7ZmwudHlwZT0nbG93cGFzcyc7ZmwuZnJlcXVlbmN5LnZhbHVlPWxwO2cuZ2Fpbi52YWx1ZT0wO28uY29ubmVjdChmbCk7ZmwuY29ubmVjdChhbSk7YW0uY29ubmVjdChnKTtnLmNvbm5lY3QoYnVzKTsKIGFtLmdhaW4udmFsdWU9MTtpZihyYXRlKXthbS5nYWluLnZhbHVlPS41NTtjb25zdCBsPWFjLmNyZWF0ZU9zY2lsbGF0b3IoKSxsZz1hYy5jcmVhdGVHYWluKCk7bC5mcmVxdWVuY3kudmFsdWU9cmF0ZTtsZy5nYWluLnZhbHVlPS40NTtsLmNvbm5lY3QobGcpO2xnLmNvbm5lY3QoYW0uZ2Fpbik7bC5zdGFydCgpfW8uc3RhcnQoKTtyZXR1cm57byxnfX0KZnVuY3Rpb24gaW5pdCgpewogaWYoYWMpcmV0dXJuIGFjO3RyeXthYz1uZXcod2luZG93LkF1ZGlvQ29udGV4dHx8d2luZG93LndlYmtpdEF1ZGlvQ29udGV4dCkoKX1jYXRjaChlKXtyZXR1cm4gbnVsbH0KIG1zdD1hYy5jcmVhdGVHYWluKCk7bXN0LmdhaW4udmFsdWU9Ljg1O211ZmY9YWMuY3JlYXRlQmlxdWFkRmlsdGVyKCk7bXVmZi50eXBlPSdsb3dwYXNzJzttdWZmLmZyZXF1ZW5jeS52YWx1ZT0yMDAwMDsKIGNvbnN0IGNwPWFjLmNyZWF0ZUR5bmFtaWNzQ29tcHJlc3NvcigpO2NwLnRocmVzaG9sZC52YWx1ZT0tMTY7Y3Aua25lZS52YWx1ZT0xODtjcC5yYXRpby52YWx1ZT01O2NwLmF0dGFjay52YWx1ZT0uMDA0O2NwLnJlbGVhc2UudmFsdWU9LjI7CiBtc3QuY29ubmVjdChtdWZmKTttdWZmLmNvbm5lY3QoY3ApO2NwLmNvbm5lY3QoYWMuZGVzdGluYXRpb24pO2J1cz1hYy5jcmVhdGVHYWluKCk7YnVzLmNvbm5lY3QobXN0KTsKIGNvbnN0IGxlbj0oYWMuc2FtcGxlUmF0ZSoxLjgpfDAsaWI9YWMuY3JlYXRlQnVmZmVyKDIsbGVuLGFjLnNhbXBsZVJhdGUpOwogZm9yKGxldCBjPTA7YzwyO2MrKyl7Y29uc3QgZD1pYi5nZXRDaGFubmVsRGF0YShjKTtsZXQgbHA9MDtmb3IobGV0IGk9MDtpPGxlbjtpKyspe2NvbnN0IGs9aS9sZW47bHArPSgoTWF0aC5yYW5kb20oKSoyLTEpLWxwKSooLjUtLjQyKmspO2RbaV09bHAqTWF0aC5wb3coMS1rLDIuNikqMn19CiBjb25zdCBjdj1hYy5jcmVhdGVDb252b2x2ZXIoKTtjdi5idWZmZXI9aWI7cnY9YWMuY3JlYXRlR2FpbigpO3J2LmNvbm5lY3QoY3YpO2N2LmNvbm5lY3QobXN0KTsKIGNvbnN0IG1rTj1mPT57Y29uc3QgYj1hYy5jcmVhdGVCdWZmZXIoMSxhYy5zYW1wbGVSYXRlKjIsYWMuc2FtcGxlUmF0ZSk7ZihiLmdldENoYW5uZWxEYXRhKDApKTtyZXR1cm4gYn07CiBOLnc9bWtOKGQ9Pntmb3IobGV0IGk9MDtpPGQubGVuZ3RoO2krKylkW2ldPU1hdGgucmFuZG9tKCkqMi0xfSk7CiBOLnA9bWtOKGQ9PntsZXQgYT0wLGI9MCxjPTA7Zm9yKGxldCBpPTA7aTxkLmxlbmd0aDtpKyspe2NvbnN0IHc9TWF0aC5yYW5kb20oKSoyLTE7YT0uOTk3NjUqYSt3Ki4wOTk7Yj0uOTYzKmIrdyouMjk2NTtjPS41NypjK3cqMS4wNTI2O2RbaV09KGErYitjK3cqLjE4KSouMn19KTsKIE4uYj1ta04oZD0+e2xldCBsPTA7Zm9yKGxldCBpPTA7aTxkLmxlbmd0aDtpKyspe2w9KGwrLjAyKihNYXRoLnJhbmRvbSgpKjItMSkpLzEuMDI7ZFtpXT1sKjMuNX19KTsKIEwuc2w9bG9vcCgncCcsJ2JhbmRwYXNzJywxNzAwLDEuMSw2KTtMLmJvPWxvb3AoJ3cnLCdiYW5kcGFzcycsODAwLDEuNCk7TC53ZD1sb29wKCdiJywnbG93cGFzcycsNDIwLC43LC4xMSk7TC5kZz1sb29wKCdiJywnbG93cGFzcycsMTQwLC44KTsKIEwuaHVtPW9zYygnc2F3dG9vdGgnLDYyLDI2MCk7TC5kcjE9b3NjKCdzaW5lJyw1NSwyMDApO0wuZHIyPW9zYygnc2luZScsNTUuNywyMDApO0wucmc9b3NjKCd0cmlhbmdsZScsODIsNTAwLDcpO0wucmcyPW9zYygnc2F3dG9vdGgnLDEyMy41LDcwMCw1LjMpOwogY29uc3QgdW49KCk9PntpZihhYy5zdGF0ZT09PSdzdXNwZW5kZWQnKWFjLnJlc3VtZSgpfTtbJ3BvaW50ZXJkb3duJywna2V5ZG93bicsJ3RvdWNoc3RhcnQnXS5mb3JFYWNoKGU9PmFkZEV2ZW50TGlzdGVuZXIoZSx1bix7cGFzc2l2ZTp0cnVlfSkpOwogZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcigndmlzaWJpbGl0eWNoYW5nZScsKCk9PntpZihkb2N1bWVudC5oaWRkZW4pYWMuc3VzcGVuZCgpO2Vsc2UgdW4oKX0pO3JldHVybiBhY30KWydwb2ludGVyZG93bicsJ2tleWRvd24nLCd0b3VjaHN0YXJ0J10uZm9yRWFjaChlPT5hZGRFdmVudExpc3RlbmVyKGUsKCk9PmluaXQoKSx7cGFzc2l2ZTp0cnVlLGNhcHR1cmU6dHJ1ZX0pKTsKZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcigncG9pbnRlcmRvd24nLGU9PntpZihhYyYmZS50YXJnZXQuY2xvc2VzdCYmZS50YXJnZXQuY2xvc2VzdCgnYnV0dG9uJykpU05ELnVpKCl9LHRydWUpOwpjb25zdCBvaz0oKT0+YWMmJmNoa09uKCk7CmNvbnN0IEE9ewogdWkoKXtpZighb2soKSlyZXR1cm47b2Ioe2Q6LjA1LGYxOjYyMCxmMjo0MzAsdjouMDcsaGk6MX0pO256KHtkOi4wMTUsZjE6MzUwMCxxOjIsdjouMDYsaGk6MX0pfSwKIGRlbnkoKXtpZighb2soKSlyZXR1cm47b2Ioe2Q6LjIyLHR5cGU6J3Nhd3Rvb3RoJyxmMToxNTAsZjI6MTA1LHY6LjA4LGxwOjYwMCxoaToxfSl9LAogZXF1aXAoKXtpZighb2soKSlyZXR1cm47bnooe2Q6LjE0LGYxOjMwMDAsZjI6OTAwMCxxOjIsdjouMSxoaToxfSk7Y2hpbWUoLjAzLG50KDUyMywwKSwuMDYpfSwKIGJ1eShyKXtpZighb2soKSlyZXR1cm47Y29uc3Qgbj0yKyhSSVtyXXx8MCk7Y2hpbWUoMCw5ODgsLjA4KTtjaGltZSguMDgsMTMxOSwuMDcpOwogIGZvcihsZXQgaT0wO2k8bjtpKyspb2Ioe3Q6LjEyK2kqLjA3LGQ6LjQsdHlwZTondHJpYW5nbGUnLGYxOm50KDUyMyxTQ1tpXSksdjouMDUsc2VuZDouNCxoaToxfSk7bnooe3Q6LjEsZDouNSxmMTo2MDAwLHR5cGU6J2hpZ2hwYXNzJyx2Oi4wNCpuLGE6LjEsaGk6MX0pOwogIGlmKChSSVtyXXx8MCk+PTMpe29iKHtkOi45LGYxOjYyLGYyOjM2LHY6LjM1LGhpOjEsc2VuZDouM30pO2Zvcihjb25zdCBmIG9mWzExMCwxNjUsMjIwXSlvYih7dDouMSxkOjEuNSx0eXBlOidzYXd0b290aCcsZjE6Zix2Oi4wNCxhOi4yLGxwOjkwMCxoaToxLHNlbmQ6LjV9KX19LAogcGF1c2UocCl7aWYoIW9rKCkpcmV0dXJuO2lmKHApe29iKHtkOi4xNCxmMTo0NDAsZjI6MzAwLHY6LjA3LGhpOjF9KTtvYih7dDouMDksZDouMTYsZjE6MzMwLGYyOjIyMCx2Oi4wNixoaToxfSl9ZWxzZXtvYih7ZDouMTIsZjE6MzAwLGYyOjQ4MCx2Oi4wNyxoaToxfSk7b2Ioe3Q6LjA5LGQ6LjE0LGYxOjQwMCxmMjo2NDAsdjouMDYsaGk6MX0pfX0sCiBkcmlwKCl7aWYob2soKSYmdmM8MzApZHJvcCgwLC4wMzUsMCl9LAogc3RhcnQoKXtpZighb2soKSlyZXR1cm47Y29uc3Qgbj1hYy5jdXJyZW50VGltZTttdWZmLmZyZXF1ZW5jeS5jYW5jZWxTY2hlZHVsZWRWYWx1ZXMobik7bXVmZi5mcmVxdWVuY3kuc2V0VGFyZ2V0QXRUaW1lKDIwMDAwLG4sLjA1KTttaWxlPTA7CiAgbnooe2Q6LjU1LGYxOjI1MCxmMjozMDAwLHE6MS41LHY6LjE0LGJ1ZjoncCcsYTouMTIsc2VuZDouMyxoaToxfSk7b2Ioe2Q6LjQsZjE6MTEwLGYyOjI0MCx2Oi4xOCxhOi4wNSxoaToxfSk7CiAgWzM5Miw0OTQsNTg3XS5mb3JFYWNoKChmLGkpPT5vYih7dDppKi4wNyxkOi4zNSx0eXBlOid0cmlhbmdsZScsZjE6Zix2Oi4wNSxzZW5kOi40LGhpOjF9KSk7aGlzcygwLC4wNil9LAogZWF0KHMsZil7aWYoIW9rKCkpcmV0dXJuO2NvbnN0IG49cGVyZm9ybWFuY2Uubm93KCk7CiAgaWYoIXMuaXNQKXtpZihuLWxhc3RCb3Q8MTEwfHxNYXRoLmh5cG90KGYueC1jYW0ueCxmLnktY2FtLnkpPjM4MClyZXR1cm47bGFzdEJvdD1uO29iKHtkOi4wNSxmMTo0MjAsZjI6NzAwLHY6LjAxOCxwYW46Y2woKGYueC1jYW0ueCkvNTAwLC0xLDEpfSk7cmV0dXJufQogIGlmKG4tbGFzdEVhdDwzMClyZXR1cm47bGFzdEVhdD1uO2VhdEM9KG4tbGFzdEVhdFQ8NDIwKT9NYXRoLm1pbihlYXRDKzEsOSk6MDtsYXN0RWF0VD1uOwogIGNvbnN0IHo9Y2woKGYudi0uNSkvMS4zLDAsMSksaz1NYXRoLnBvdygyLGVhdEMqLjkvMTIpKlJOKC45NywxLjA0KSxwYW49Y2woKGYueC1jYW0ueCkvNzAwLC0xLDEpKi40OwogIG9iKHtkOi4wNyxmMTozNjAqayxmMjo5MDAqayx2Oi4xMSxwYW4saGk6MX0pO29iKHtkOi4wOSt6Ki4wNixmMToxNzAtNDAqeixmMjo4MCx2Oi4xKy4wNip6LHBhbixoaToxfSk7bnooe2Q6LjAyNSxmMToyNjAwKmsscTo0LHY6LjEscGFuLGhpOjF9KTsKICBpZih6Pi41KW56KHtkOi4xNCxmMTo4MDAsZjI6MzAwLHE6NSx2Oi4xLGJ1ZjoncCcsYW06MjQscGFuLGhpOjF9KX0sCiBraWxsKGEsYnkpe2lmKCFvaygpKXJldHVybjtjb25zdCBtaW5lPWEuaXNQfHwoYnkmJmJ5LmlzUCksaD1hLnNlZ3NbMF0sZHg9aC54LWNhbS54LGQ9TWF0aC5oeXBvdChkeCxoLnktY2FtLnkpO2lmKCFtaW5lJiZkPjE1MDApcmV0dXJuOwogIGNvbnN0IHo9Y2woYS5tYXNzLzE4MCwwLDEpOwogIGlmKGEuaXNQKXtjb25zdCBuPWFjLmN1cnJlbnRUaW1lO29iKHtkOjEuMSxmMTo5NSxmMjoyNix2Oi43LGhpOjEsc2VuZDouM30pO29iKHtkOjEuMyx0eXBlOidzYXd0b290aCcsZjE6MjMwLGYyOjQ4LHY6LjIsbHA6MjAwMCxscDI6MTEwLGhpOjEsc2VuZDouNH0pO3NwbGF0KDEsMCwxLjEpOwogICBpZighYnkpe256KHtkOi41NSxmMTozMDAwLHE6Mix2Oi4yLGFtOjU4LHNlbmQ6LjMsaGk6MX0pO29iKHtkOi4zLHR5cGU6J3Nhd3Rvb3RoJyxmMToxNTAwLGYyOjYwLHY6LjEyLGxwOjMwMDAsaGk6MX0pfQogICBiZWF0KC41LC41KTtiZWF0KDEuMjUsLjM1KTtvYih7ZDoxLjQsZjE6MzE1MCx2Oi4wMixhOi4wNSxoaToxfSk7CiAgIG11ZmYuZnJlcXVlbmN5LmNhbmNlbFNjaGVkdWxlZFZhbHVlcyhuKTttdWZmLmZyZXF1ZW5jeS5zZXRWYWx1ZUF0VGltZShtdWZmLmZyZXF1ZW5jeS52YWx1ZSxuKTttdWZmLmZyZXF1ZW5jeS5zZXRUYXJnZXRBdFRpbWUoNzAwLG4sLjA4KTttdWZmLmZyZXF1ZW5jeS5zZXRUYXJnZXRBdFRpbWUoMjAwMDAsbisxLjcsLjUpO3JldHVybn0KICBzcGxhdCh6LGNsKGR4LzcwMCwtMSwxKSoobWluZT8uNDoxKSxtaW5lPzE6TWF0aC5wb3coY2woMS1kLzE1MDAsLjEyLDEpLDEuNCkqLjgpOwogIGlmKGJ5JiZieS5pc1Ape2NvbnN0IHM9Y2woc3RyZWFrLDEsOCksZj1udCgyMjAsU0Nbcy0xXSk7bnooe2Q6LjE0LGYxOjMwMDAsZjI6OTUwMCxxOjIsdjouMTIsaGk6MX0pO2NoaW1lKC4wMixmLC4wOSk7CiAgIGlmKHM+PTIpe2NoaW1lKC4xLGYqMS41LC4wNyk7bnooe2Q6LjM1LGYxOjQwMCxmMjo1MDAwLHE6MS41LHY6LjA4LGE6LjIsc2VuZDouMyxoaToxfSl9CiAgIGlmKHM+PTMpe29iKHtkOi44LGYxOjcwLGYyOjQwLHY6LjM1LGhpOjF9KTtmb3IoY29uc3QgbSBvZlsxLDEuMDA1LC45OTVdKW9iKHtkOjEuNCx0eXBlOidzYXd0b290aCcsZjE6Zi8yKm0sdjouMDUsYTouMTUsbHA6OTAwLHNlbmQ6LjUsaGk6MX0pfX19LAogdGljayhkdCl7aWYoIWFjfHxhYy5zdGF0ZSE9PSdydW5uaW5nJylyZXR1cm47Y29uc3Qgbz1jaGtPbigpLG49YWMuY3VycmVudFRpbWUscGxheT1vJiZzdD09PSdwbGF5JyYmIXBhdXNlZCYmUC5hbGl2ZSxibz1wbGF5JiZQLmJvb3N0LHNldD0ocCx2LHQpPT5wLnNldFRhcmdldEF0VGltZSh2LG4sdHx8LjA4KTsKICBzZXQoTC5kcjEuZy5nYWluLG8/KHBsYXk/LjAzOi4wNDUpOjAsLjQpO3NldChMLmRyMi5nLmdhaW4sbz8ocGxheT8uMDM6LjA0NSk6MCwuNCk7c2V0KEwud2QuZy5nYWluLG8/LjA1OjAsLjUpOwogIGNvbnN0IHN6PWNsKFAucnx8OCw3LDI1KTtzZXQoTC5zbC5nLmdhaW4scGxheT8oYm8/LjE6LjA2NSk6MCwuMSk7c2V0KEwuc2wuZmwuZnJlcXVlbmN5LChibz8yNjAwOjE3MDApLXN6KjMwLC4xKTtMLnNsLmwuZnJlcXVlbmN5LnNldFRhcmdldEF0VGltZShibz8xMTo2LjIsbiwuMSk7CiAgc2V0KEwuYm8uZy5nYWluLHBsYXk/YksqLjEyOjAsLjA2KTtzZXQoTC5iby5mbC5mcmVxdWVuY3ksNTAwK2JLKjE4MDAsLjA2KTtzZXQoTC5odW0uZy5nYWluLHBsYXk/YksqLjA2OjAsLjA2KTtMLmh1bS5vLmZyZXF1ZW5jeS5zZXRUYXJnZXRBdFRpbWUoNjIrYksqNDAsbiwuMSk7CiAgc2V0KEwucmcuZy5nYWluLHBsYXkmJnJhZ2U+MD8uMDU6MCwuMTUpO3NldChMLnJnMi5nLmdhaW4scGxheSYmcmFnZT4wPy4wMjU6MCwuMTUpO3NldChMLmRnLmcuZ2FpbixwbGF5P2RhbmcqLjM1OjAsLjEpOwogIGlmKGJvJiYhd2FzQil7bnooe2Q6LjMsZjE6MzAwLGYyOjI0MDAscToxLjIsdjouMTQsYTouMDYsaGk6MX0pO29iKHtkOi4yNSxmMTo5MCxmMjoxODAsdjouMTYsaGk6MX0pfWlmKCFibyYmd2FzQiYmcGxheSlueih7ZDouMyxmMToyMjAwLGYyOjMwMCxxOjEsdjouMDgsaGk6MX0pO3dhc0I9Ym87CiAgaWYocGxheSYmZGFuZz4uMTUpe2hiLT1kdDtpZihoYjw9MCl7aGI9Ljk1LS41NSpkYW5nO2JlYXQoMCwuNCsuNipkYW5nKX19CiAgaWYocGxheSYmbj5sYXN0SGlzcyl7Y29uc3QgaD1QLnNlZ3NbMF07Zm9yKGNvbnN0IGIgb2Ygc25ha2VzKXtpZihiPT09UHx8IWIuYWxpdmUpY29udGludWU7Y29uc3QgcT1iLnNlZ3NbMF0sZD1NYXRoLmh5cG90KHEueC1oLngscS55LWgueSk7aWYoZDwyMzApe2hpc3MoY2woKHEueC1oLngpLzI1MCwtMSwxKSwuMDkqKDEtZC8yNjApKTtsYXN0SGlzcz1uK1JOKC44LDEuNik7YnJlYWt9fX0KICBjb25zdCBtPU1hdGguZmxvb3IoUC5tYXNzLzUwKTtpZihwbGF5JiZtPm1pbGUpe2lmKG1pbGU+MCl7Y2hpbWUoMCxudCg1MjMsU0NbTWF0aC5taW4obSw3KV0pLC4wNyk7Y2hpbWUoLjA5LG50KDUyMyxTQ1tNYXRoLm1pbihtLDcpXSs3KSwuMDUpfW1pbGU9bX19Cn07CnJldHVybiBBfSkoKTsKCi8qID09PT09PT09PT09PT09PT09IEdPRCBGWCBFTkdJTkUgPT09PT09PT09PT09PT09PT0gKi8KY29uc3QgaHNsYT0oaCxzLGwsYSk9Pidoc2xhKCcrKCgoaCUzNjApKzM2MCklMzYwKS50b0ZpeGVkKDApKycsJytzKyclLCcrbCsnJSwnK01hdGgubWF4KDAsTWF0aC5taW4oMSxhKSkudG9GaXhlZCgzKSsnKSc7CmxldCBvYz1udWxsLG9jMj1udWxsOwpmdW5jdGlvbiBpbml0RlgoKXsKICBleWVzPVtdO3JpZnRzPVtdO21vdGVzPVtdO2xpbmVzPVtdOwogIGZvcihsZXQgaT0wO2k8MTY7aSsrKXtjb25zdCBhPXJuZCgpKlRBVSxkPVIqTWF0aC5zcXJ0KHJuZCgpKSouOTU7ZXllcy5wdXNoKHt4Ok1hdGguY29zKGEpKmQseTpNYXRoLnNpbihhKSpkLHM6NzArcm5kKCkqMTEwLHBoOnJuZCgpKjYsaDpybmQoKTwuNT8zNTA6Mjg1fSl9CiAgZm9yKGxldCBpPTA7aTw3O2krKyl7Y29uc3QgYT1ybmQoKSpUQVUsZD1SKk1hdGguc3FydChybmQoKSkqLjg1O3JpZnRzLnB1c2goe3g6TWF0aC5jb3MoYSkqZCx5Ok1hdGguc2luKGEpKmQsczo5MCtybmQoKSoxMjAsaDpNYXRoLmZsb29yKHJuZCgpKjM2MCksZGlyOnJuZCgpPC41Py0xOjF9KX0KICBmb3IobGV0IGk9MDtpPDcwO2krKyltb3Rlcy5wdXNoKHt4OnJuZCgpLHk6cm5kKCksdjouMDIrcm5kKCkqLjA2LHc6cm5kKCkqNixyOi44K3JuZCgpKjEuOCxoOk1hdGguZmxvb3Iocm5kKCkqMzYwKX0pOwogIGZvcihsZXQgaT0wO2k8MzA7aSsrKWxpbmVzLnB1c2goe2E6cm5kKCkqVEFVLHA6cm5kKCksdjouOCtybmQoKSoxLjYsbGVuOi4xMitybmQoKSouMjV9KTsKfQpmdW5jdGlvbiBzcGFyayh3eCx3eSxhbmcsc3BkLGwscixoLGspewogIGlmKHBhcnRzLmxlbmd0aD49TWF0aC5mbG9vcig1NjAqZnhRKSlyZXR1cm47CiAgcGFydHMucHVzaCh7eDp3eCx5Ond5LHZ4Ok1hdGguY29zKGFuZykqc3BkLHZ5Ok1hdGguc2luKGFuZykqc3BkLGwsbTpsLHIsaCxrLHJvdDpybmQoKSpUQVUsdnI6KHJuZCgpLS41KSoxNH0pOwp9CmZ1bmN0aW9uIGJ1cnN0KHd4LHd5LG4sczAsczEsbCxyLGgsayxodil7CiAgbj1NYXRoLm1heCgxLE1hdGgucm91bmQobipmeFEpKTsKICBmb3IobGV0IGk9MDtpPG47aSsrKXNwYXJrKHd4LHd5LHJuZCgpKlRBVSxzMCtybmQoKSooczEtczApLGwqKC42K3JuZCgpKi44KSxyKiguNitybmQoKSouOCksaCsoaHZ8fDApKihybmQoKS0uNSksayk7Cn0KZnVuY3Rpb24gYm9sdCh4MCx5MCx4MSx5MSxoLGwpewogIGlmKGJvbHRzLmxlbmd0aD40MClyZXR1cm47CiAgY29uc3QgZHg9eDEteDAsZHk9eTEteTAsZD1NYXRoLmh5cG90KGR4LGR5KXx8MSxuPU1hdGgubWF4KDQsTWF0aC5taW4oMTQsTWF0aC5mbG9vcihkLzQ1KSkpLG54PS1keS9kLG55PWR4L2QscHRzPVtbeDAseTBdXTsKICBmb3IobGV0IGk9MTtpPG47aSsrKXtjb25zdCBmPWkvbixqPShybmQoKS0uNSkqTWF0aC5taW4oNzAsZCouMjIpO3B0cy5wdXNoKFt4MCtkeCpmK254KmoseTArZHkqZitueSpqXSl9CiAgcHRzLnB1c2goW3gxLHkxXSk7Ym9sdHMucHVzaCh7cHRzLGwsbTpsLGh9KTsKfQpmdW5jdGlvbiByaW5nKHd4LHd5LHIwLG1yLGwsaCx3KXtpZihyaW5ncy5sZW5ndGg8MzApcmluZ3MucHVzaCh7eDp3eCx5Ond5LHIwLG1yLGwsbTpsLGgsd30pfQpmdW5jdGlvbiBwb3AocyxoLGJpZyl7cG9wcy5sZW5ndGg9MDtwb3BzLnB1c2goe3MsaCx0OjAsbDpiaWc/MS41OjEuMTUsYmlnfSl9CmNvbnN0IEtUPVsn2YTZh+KAjNi0INqp2LHYr9uMIScsJ9mG2KfYqNmI2K/YtCDaqdix2K/bjCEnLCfZgtiq2YTigIzYudin2YUhJywn2K7Zj9ix2K/YtCDaqdix2K/bjCEnLCfYp9i52K/Yp9mF2LQg2qnYsdiv24whJywn2YjYrdi024whJywn2b7ZiNiv2LHYtCDaqdix2K/bjCEnXTsKY29uc3QgU1Q9WycnLCcnLCfYr9in2KjZhCDaqduM2YQhIPCflKUnLCfYqtix24zZvtmEINqp24zZhCEg4pig77iPJywn2obZh9in2LHYqtin24zbjCEg4pqhJywn2YjYrdi024zigIzar9ix24whIPCfkbknLCfYutuM2LHZgtin2KjZhOKAjNiq2YjZgtmBISDwn5GB77iP8J+UpSddOwpmdW5jdGlvbiBwbGF5ZXJLaWxsRngodil7CiAgc3RyZWFrPSh0LXN0cmVha1Q8Nik/c3RyZWFrKzE6MTtzdHJlYWtUPXQ7CiAgY29uc3QgdGl0bGU9c3RyZWFrPjE/U1RbTWF0aC5taW4oc3RyZWFrLFNULmxlbmd0aC0xKV06S1RbTWF0aC5mbG9vcihybmQoKSpLVC5sZW5ndGgpXTsKICBwb3AodGl0bGUsc3RyZWFrPjI/KHQqMjAwKSUzNjA6di5odWUsc3RyZWFrPjJ8fHYubWFzcz45MCk7CiAgaWYoc3RyZWFrPj0zKXJhZ2U9TWF0aC5tYXgocmFnZSw2K01hdGgubWluKDYsc3RyZWFrKSk7Cn0KZnVuY3Rpb24gZnhEZWF0aChhLGJ5KXsKICBjb25zdCBuPWEuc2Vncy5sZW5ndGgsaGQ9YS5zZWdzWzBdLGg9YS5odWUsYmlnPWEubWFzcz45MCxtaW5lPWEuaXNQfHwoYnkmJmJ5LmlzUCk7CiAgaWYoIW1pbmUmJk1hdGguaHlwb3QoaGQueC1jYW0ueCxoZC55LWNhbS55KT4xMDAwKXJldHVybjsKICBjb25zdCBrPU1hdGgubWF4KDEsTWF0aC5jZWlsKG4vNzApKSxzPVtdOwogIGZvcihsZXQgaT0wO2k8bjtpKz1rKXMucHVzaCh7eDphLnNlZ3NbaV0ueCx5OmEuc2Vnc1tpXS55fSk7CiAgY2hhaW4ucHVzaCh7cyxpOjAsdDowLHN0ZXA6TWF0aC5taW4oLjAxMiwuNTUvcy5sZW5ndGgpLGh9KTsKICByaW5nKGhkLngsaGQueSxhLnIsMzAwK01hdGgubWluKDcwMCxuKjQpLC43NSxoLDEyKTsKICByaW5nKGhkLngsaGQueSwwLDE4MCtNYXRoLm1pbigzMDAsbioyKSwuNSxoKzE2MCw2KTsKICBidXJzdChoZC54LGhkLnksMjYsMTIwLDcwMCwuOCw0LGgsJ3NwYXJrJyw3MCk7CiAgYnVyc3QoaGQueCxoZC55LDEyLDgwLDQyMCwxLjEsOSxoLCdzaGFyZCcsOTApOwogIGxldCBjMz0wOwogIGZvcihjb25zdCBiIG9mIHNuYWtlcyl7aWYoYzM+PTMpYnJlYWs7aWYoYj09PWF8fCFiLmFsaXZlKWNvbnRpbnVlO2NvbnN0IGJoPWIuc2Vnc1swXTtpZihNYXRoLmh5cG90KGJoLngtaGQueCxiaC55LWhkLnkpPDgwMCl7Ym9sdChoZC54LGhkLnksYmgueCxiaC55LGgsLjM1KTtjMysrfX0KICBmb3IobGV0IGk9MDtpPDQ7aSsrKXtjb25zdCBxPXJuZCgpKlRBVSxkPTI1MCtybmQoKSo0NTA7Ym9sdChoZC54LGhkLnksaGQueCtNYXRoLmNvcyhxKSpkLGhkLnkrTWF0aC5zaW4ocSkqZCxoLC4zKX0KICBpZihtaW5lKXtwdW5jaD1NYXRoLm1pbigxLjMscHVuY2grLjkpO2FiZXI9MTtnbGl0Y2g9Ljk7aGl0U3RvcD0uMDc7aWYoYmlnfHxhLmlzUCl0cz1NYXRoLm1pbih0cywuMjgpfQogIGVsc2V7cHVuY2g9TWF0aC5taW4oMS4zLHB1bmNoKy4yNSk7Z2xpdGNoPU1hdGgubWF4KGdsaXRjaCwuMjUpfQp9CmZ1bmN0aW9uIGZ4RWF0KHMsZil7CiAgU05ELmVhdChzLGYpOwogIGlmKHMuaXNQKXsKICAgIHMuZ2xvdz1NYXRoLm1pbigxLHMuZ2xvdysuMzUpOwogICAgaWYoZnhRPi40NSlidXJzdChmLngsZi55LDMsNjAsMjYwLC40NSwyLjIsZi5oLCdzcGFyaycsMzApOwogIH1lbHNlIGlmKGZ4UT4uNyYmcm5kKCk8LjMmJk1hdGguaHlwb3QoZi54LWNhbS54LGYueS1jYW0ueSk8NDIwKWJ1cnN0KGYueCxmLnksMSw0MCwxNjAsLjM1LDEuOCxmLmgsJ3NwYXJrJywyMCk7Cn0KZnVuY3Rpb24gZnhTbmFrZShzLGR0KXsKICBzLmJrKz0oKHMuYm9vc3Q/MTowKS1zLmJrKSpNYXRoLm1pbigxLGR0KjkpOwogIHMuZ2xvdz1NYXRoLm1heCgwLHMuZ2xvdy1kdCoyLjQpOwogIGNvbnN0IGhoPXMuc2Vnc1swXTsKICBpZighcy5pc1AmJk1hdGguaHlwb3QoaGgueC1jYW0ueCxoaC55LWNhbS55KT42NTApcmV0dXJuOwogIGlmKHMuYm9vc3QpewogICAgcy5mZS09ZHQ7CiAgICBpZihzLmZlPD0wKXsKICAgICAgcy5mZT0uMDIyL01hdGgubWF4KC40LGZ4USk7CiAgICAgIGNvbnN0IGc9cy5zZWdzW3Muc2Vncy5sZW5ndGgtMV0saHVlPShyYWdlPjAmJnMuaXNQKT8odCo0MDApJTM2MDooMjArcm5kKCkqMzUpOwogICAgICBzcGFyayhoaC54LGhoLnkscy5hbmcrTWF0aC5QSSsocm5kKCktLjUpKi45LDE2MCtybmQoKSoyNjAsLjUsMytybmQoKSozLGh1ZSwnZW1iZXInKTsKICAgICAgY29uc3Qgaj1NYXRoLmZsb29yKHJuZCgpKnMuc2Vncy5sZW5ndGgpLGdqPXMuc2Vnc1tqXTsKICAgICAgc3BhcmsoZ2oueCxnai55LHJuZCgpKlRBVSw2MCtybmQoKSoxNjAsLjQ1LDIrcm5kKCkqMi41LGh1ZSwnc3BhcmsnKTsKICAgICAgaWYocy5pc1AmJnJuZCgpPC40KXNwYXJrKGcueCxnLnkscy5hbmcrTWF0aC5QSSsocm5kKCktLjUpKi42LDIwMCtybmQoKSoyMDAsLjYsNSxodWUrNDAsJ3NoYXJkJyk7CiAgICB9CiAgfQogIGlmKHMuaXNQJiZyYWdlPjAmJnJuZCgpPC41KXNwYXJrKGhoLngsaGgueSxybmQoKSpUQVUsODArcm5kKCkqMjIwLC41NSwzK3JuZCgpKjMsKHQqNTAwK3JuZCgpKjYwKSUzNjAsJ2VtYmVyJyk7Cn0KZnVuY3Rpb24gZnhVcGRhdGUoZHQpewogIHB1bmNoPU1hdGgubWF4KDAscHVuY2gtZHQqMi42KTthYmVyPU1hdGgubWF4KDAsYWJlci1kdCoyLjQpO2dsaXRjaD1NYXRoLm1heCgwLGdsaXRjaC1kdCoyLjIpO3JhZ2U9TWF0aC5tYXgoMCxyYWdlLWR0KTsKICBpZihzdD09PSdwbGF5JyYmUC5hbGl2ZSliSys9KChQLmJvb3N0PzE6MCktYkspKk1hdGgubWluKDEsZHQqOCk7ZWxzZSBiSyo9Ljk7CiAgaWYoUC5hbGl2ZSl7Y29uc3QgZGQ9Ui1NYXRoLmh5cG90KFAuc2Vnc1swXS54LFAuc2Vnc1swXS55KTtkYW5nKz0oKGRkPDM4MD8xLU1hdGgubWF4KDAsZGQpLzM4MDowKS1kYW5nKSpNYXRoLm1pbigxLGR0KjgpfWVsc2UgZGFuZyo9Ljk7CiAgZm9yKGxldCBpPXBhcnRzLmxlbmd0aC0xO2k+PTA7aS0tKXsKICAgIGNvbnN0IHA9cGFydHNbaV07cC5sLT1kdDsKICAgIGlmKHAubDw9MCl7cGFydHNbaV09cGFydHNbcGFydHMubGVuZ3RoLTFdO3BhcnRzLnBvcCgpO2NvbnRpbnVlfQogICAgcC54Kz1wLnZ4KmR0O3AueSs9cC52eSpkdDsKICAgIGNvbnN0IGRyPU1hdGgucG93KHAuaz09PSdlbWJlcic/LjI6LjA3LGR0KTtwLnZ4Kj1kcjtwLnZ5Kj1kcjtwLnJvdCs9cC52cipkdDsKICB9CiAgZm9yKGxldCBpPXJpbmdzLmxlbmd0aC0xO2k+PTA7aS0tKXtyaW5nc1tpXS5sLT1kdDtpZihyaW5nc1tpXS5sPD0wKXJpbmdzLnNwbGljZShpLDEpfQogIGZvcihsZXQgaT1ib2x0cy5sZW5ndGgtMTtpPj0wO2ktLSl7Ym9sdHNbaV0ubC09ZHQ7aWYoYm9sdHNbaV0ubDw9MClib2x0cy5zcGxpY2UoaSwxKX0KICBmb3IobGV0IGk9cG9wcy5sZW5ndGgtMTtpPj0wO2ktLSl7cG9wc1tpXS50Kz1kdDtpZihwb3BzW2ldLnQ+cG9wc1tpXS5sKXBvcHMuc3BsaWNlKGksMSl9CiAgZm9yKGxldCBpPWNoYWluLmxlbmd0aC0xO2k+PTA7aS0tKXsKICAgIGNvbnN0IGNuPWNoYWluW2ldO2NuLnQrPWR0OwogICAgd2hpbGUoY24uaTxjbi5zLmxlbmd0aCYmY24udD49Y24uaSpjbi5zdGVwKXsKICAgICAgY29uc3QgZ3A9Y24uc1tjbi5pKytdOwogICAgICBidXJzdChncC54LGdwLnksMyw2MCw0MjAsLjYsMyxjbi5oLCdzcGFyaycsNjApOwogICAgICBpZihybmQoKTwuNTUpYnVyc3QoZ3AueCxncC55LDEsNDAsMjYwLC45LDcsY24uaCwnc2hhcmQnLDYwKTsKICAgICAgaWYocm5kKCk8LjE4KXJpbmcoZ3AueCxncC55LDIsNjArcm5kKCkqNjAsLjM1LGNuLmgsNSk7CiAgICAgIGlmKHJuZCgpPC4xKXtjb25zdCBxPWNuLnNbTWF0aC5taW4oY24ucy5sZW5ndGgtMSxjbi5pKzIpXTtib2x0KGdwLngsZ3AueSxxLngrKHJuZCgpLS41KSoxMjAscS55KyhybmQoKS0uNSkqMTIwLGNuLmgsLjIyKX0KICAgIH0KICAgIGlmKGNuLmk+PWNuLnMubGVuZ3RoKWNoYWluLnNwbGljZShpLDEpOwogIH0KfQoKZnVuY3Rpb24ga2lsbChhLGJ5KXsKICBpZighYS5hbGl2ZSlyZXR1cm47CiAgYS5hbGl2ZT1mYWxzZTthLmRlYWQ9dDsKICBjb25zdCBuPWEuc2Vncy5sZW5ndGgsdj1NYXRoLm1heCguOCxhLm1hc3MvKG4vMikqLjkpOwogIGZvcihsZXQgaT0wO2k8bjtpKz0yKXtjb25zdCBnPWEuc2Vnc1tpXTthZGRGb29kKGcueCsocm5kKCktLjUpKjEwLGcueSsocm5kKCktLjUpKjEwLHYsYS5odWUpfQogIGlmKGJ5KXtieS5raWxscysrO2lmKGJ5LmlzUCl7bXNnPXtzOifYrtmI2LHYr9uM4oCM2LQ6ICcrYS5uYW1lLHQ6Mi4yfTtwbGF5ZXJLaWxsRngoYSl9fQogIGlmKCFhLnF1aXQpe2Z4RGVhdGgoYSxieSk7U05ELmtpbGwoYSxieSl9CiAgaWYoYS5pc1Ape2lmKCFhLnF1aXQpcG9wKCfZhtin2KjZiNivINi02K/bjCEg4pig77iPJyxhLmh1ZSx0cnVlKTtzdD0nb3Zlcic7b3ZlckF0PXQ7Y29uc3Qgc2M9TWF0aC5mbG9vcihhLm1hc3MpO2lmKHNjPmJlc3Qpe2Jlc3Q9c2M7dHJ5e2xvY2FsU3RvcmFnZS5zZXRJdGVtKCdtYXJraG9yLWJlc3QnLGJlc3QpfWNhdGNoKGUpe319ZWFybmVkPXNjK2Eua2lsbHMqMTA7c2F2ZS53YWxsZXQrPWVhcm5lZDtzdigpO2VtaXQoJ2ZpbmlzaCcsZWFybmVkKX0KfQoKZnVuY3Rpb24gZGVjaWRlKHMpewogIGNvbnN0IGg9cy5zZWdzWzBdLGh4PWgueCxoeT1oLnksbmVhcj1bXTsKICBsZXQgdGhyZWF0PW51bGwsdGQ9MWU5LHByZXk9bnVsbCxwZD0xZTk7CiAgZm9yKGNvbnN0IGIgb2Ygc25ha2VzKXsKICAgIGlmKGI9PT1zfHwhYi5hbGl2ZSljb250aW51ZTsKICAgIGNvbnN0IGJoPWIuc2Vnc1swXSxkZD1NYXRoLmh5cG90KGJoLngtaHgsYmgueS1oeSk7CiAgICBpZihkZDwzMDArYi5zZWdzLmxlbmd0aCpiLnNwKXsKICAgICAgZm9yKGNvbnN0IGcgb2YgYi5zZWdzKXtjb25zdCBkeD1nLngtaHgsZHk9Zy55LWh5O2lmKGR4KmR4K2R5KmR5PDkwMDAwKW5lYXIucHVzaChnLngsZy55LGIucil9CiAgICB9CiAgICBpZihkZDw1MDApewogICAgICBpZihiLm1hc3M+cy5tYXNzKjEuMTUmJmRkPHRkKXt0ZD1kZDt0aHJlYXQ9Yn0KICAgICAgZWxzZSBpZihiLm1hc3M8cy5tYXNzKi45JiZkZDxwZCl7cGQ9ZGQ7cHJleT1ifQogICAgfQogIH0KICBzLndhbmRlcis9KHJuZCgpLS41KSouNzsKICBsZXQgd2FudD1zLndhbmRlcixodW50PWZhbHNlLGZsZWU9ZmFsc2U7CiAgbGV0IGJmPW51bGwsYnY9MDsKICBmb3IoY29uc3QgZiBvZiBmb29kKXtjb25zdCBkeD1mLngtaHgsZHk9Zi55LWh5LGQyPWR4KmR4K2R5KmR5O2lmKGQyPDIwMjUwMCl7Y29uc3Qgdj0oZi52Ky4zKS8oTWF0aC5zcXJ0KGQyKSs2MCk7aWYodj5idil7YnY9djtiZj1mfX19CiAgaWYoYmYpd2FudD1NYXRoLmF0YW4yKGJmLnktaHksYmYueC1oeCk7CiAgaWYocHJleSYmcy5tYXNzPjIwJiZzLmFnZ3I+LjQ1KXtjb25zdCBwaD1wcmV5LnNlZ3NbMF07d2FudD1NYXRoLmF0YW4yKHBoLnkrTWF0aC5zaW4ocHJleS5hbmcpKnBkKi43LWh5LHBoLngrTWF0aC5jb3MocHJleS5hbmcpKnBkKi43LWh4KTtodW50PXRydWV9CiAgaWYodGhyZWF0JiZ0ZDwyODApe2NvbnN0IHRoPXRocmVhdC5zZWdzWzBdO3dhbnQ9TWF0aC5hdGFuMihoeS10aC55LGh4LXRoLngpO2ZsZWU9dHJ1ZX0KICBpZihNYXRoLmh5cG90KGh4LGh5KT5SLTM4MCl7d2FudD1NYXRoLmF0YW4yKC1oeSwtaHgpO2h1bnQ9ZmxlZT1mYWxzZX0KICBzLndhbmRlcj13YW50OwogIGxldCBiZXN0QT1zLmFuZyxicz0tMWU5OwogIGZvcihsZXQgaz0wO2s8MTY7aysrKXsKICAgIGNvbnN0IGE9cy5hbmcrKGs8OD9rOmstMTYpKlRBVS8xNjtsZXQgZGFuZ2VyPTA7CiAgICBmb3IoY29uc3QgZCBvZls2MCwxMjAsMTkwXSl7CiAgICAgIGNvbnN0IHB4PWh4K01hdGguY29zKGEpKmQscHk9aHkrTWF0aC5zaW4oYSkqZDsKICAgICAgaWYocHgqcHgrcHkqcHk+KFItNDApKihSLTQwKSlkYW5nZXI9TWF0aC5tYXgoZGFuZ2VyLDQwMC1kKTsKICAgICAgZm9yKGxldCBqPTA7ajxuZWFyLmxlbmd0aDtqKz0zKXtjb25zdCBkeD1uZWFyW2pdLXB4LGR5PW5lYXJbaisxXS1weSxsaW09cy5yK25lYXJbaisyXSsxMjtpZihkeCpkeCtkeSpkeTxsaW0qbGltKXtkYW5nZXI9TWF0aC5tYXgoZGFuZ2VyLDUwMC1kKTticmVha319CiAgICB9CiAgICBjb25zdCBzYz1NYXRoLmNvcyhucm0oYS13YW50KSkqODAtZGFuZ2VyLU1hdGguYWJzKG5ybShhLXMuYW5nKSkqMTA7CiAgICBpZihzYz5icyl7YnM9c2M7YmVzdEE9YX0KICB9CiAgcy50YT1iZXN0QTsKICBzLmJvb3N0PXMubWFzcz4yNSYmKChodW50JiZwZDwzNTAmJk1hdGguYWJzKG5ybSh3YW50LXMuYW5nKSk8LjQpfHwoZmxlZSYmdGQ8MjAwKSk7Cn0KCmZ1bmN0aW9uIG1vdmUocyxkdCl7CiAgY29uc3QgdHVybj1NYXRoLm1heCgyLjIsNC4yLXMuciouMDcpOwogIHMuYW5nKz1NYXRoLm1heCgtdHVybipkdCxNYXRoLm1pbih0dXJuKmR0LG5ybShzLnRhLXMuYW5nKSkpOwogIGlmKHMubWFzczw9MTIpcy5ib29zdD1mYWxzZTsKICBjb25zdCBzcD1zLmJvb3N0PzMwMDoxNjA7CiAgY29uc3QgaD1zLnNlZ3NbMF07aC54Kz1NYXRoLmNvcyhzLmFuZykqc3AqZHQ7aC55Kz1NYXRoLnNpbihzLmFuZykqc3AqZHQ7CiAgZm9yKGxldCBpPTE7aTxzLnNlZ3MubGVuZ3RoO2krKyl7CiAgICBjb25zdCBwPXMuc2Vnc1tpLTFdLGc9cy5zZWdzW2ldLGR4PXAueC1nLngsZHk9cC55LWcueSxkPU1hdGguaHlwb3QoZHgsZHkpOwogICAgaWYoZD5zLnNwKXtjb25zdCBrPShkLXMuc3ApL2Q7Zy54Kz1keCprO2cueSs9ZHkqa30KICB9CiAgaWYocy5ib29zdCl7CiAgICBzLm1hc3M9TWF0aC5tYXgoMTIscy5tYXNzLTcqZHQpO3MuZHJvcCs9ZHQ7CiAgICBpZihzLmRyb3A+LjEyKXtzLmRyb3A9MDtjb25zdCBnPXMuc2Vnc1tzLnNlZ3MubGVuZ3RoLTFdO2FkZEZvb2QoZy54LGcueSwuOCxzLmh1ZSk7aWYocy5pc1ApU05ELmRyaXAoKX0KICB9CiAgdXBSKHMpOwogIGNvbnN0IHdhbnQ9TWF0aC5taW4oNjAwLE1hdGguZmxvb3IoMTArKHMubWFzcy0xMCkqLjU1KSk7CiAgd2hpbGUocy5zZWdzLmxlbmd0aDx3YW50KXtjb25zdCBnPXMuc2Vnc1tzLnNlZ3MubGVuZ3RoLTFdO3Muc2Vncy5wdXNoKHt4OmcueCx5OmcueX0pfQogIHdoaWxlKHMuc2Vncy5sZW5ndGg+d2FudCYmcy5zZWdzLmxlbmd0aD42KXMuc2Vncy5wb3AoKTsKfQoKZnVuY3Rpb24gdXBkYXRlKGR0KXsKICB0Kz1kdDttc2cudD1NYXRoLm1heCgwLG1zZy50LWR0KTsKICBmeFVwZGF0ZShkdCk7U05ELnRpY2soZHQpOwogIGZvcihjb25zdCBzIG9mIHNuYWtlcyl7CiAgICBpZighcy5hbGl2ZSljb250aW51ZTsKICAgIGlmKHMuaXNQKXsKICAgICAgY29uc3QgdGc9dG91Y2hEZXY/am95LmFuZzpNYXRoLmF0YW4yKHB0ci55LUgvMixwdHIueC1XLzIpOwogICAgICBzLnNhKz1ucm0odGctcy5zYSkqTWF0aC5taW4oMSxkdCoxNCk7cy50YT1zLnNhOwogICAgICBzLmJvb3N0PWJvb3N0SW4mJnMubWFzcz4xMjsKICAgIH1lbHNle3MudGhpbmstPWR0O2lmKHMudGhpbms8PTApe3MudGhpbms9LjA5K3JuZCgpKi4wNTtkZWNpZGUocyl9fQogICAgbW92ZShzLGR0KTtmeFNuYWtlKHMsZHQpOwogIH0KICAvLyBlYXRpbmcKICBmb3IoY29uc3QgcyBvZiBzbmFrZXMpewogICAgaWYoIXMuYWxpdmUpY29udGludWU7CiAgICBjb25zdCBoPXMuc2Vnc1swXSxtPXMucioyKzM2OwogICAgZm9yKGxldCBpPWZvb2QubGVuZ3RoLTE7aT49MDtpLS0pewogICAgICBjb25zdCBmPWZvb2RbaV07bGV0IGR4PWgueC1mLngsZHk9aC55LWYueSxkPU1hdGguaHlwb3QoZHgsZHkpOwogICAgICBpZihkPG0pe2NvbnN0IGs9TWF0aC5taW4oZCw0MjAqZHQpLyhkfHwxKTtmLngrPWR4Kms7Zi55Kz1keSprO2YudHg9ZHgqaztmLnR5PWR5Kms7Zi5wdD10O2Q9TWF0aC5oeXBvdChoLngtZi54LGgueS1mLnkpfQogICAgICBpZihkPHMucis4KXtzLm1hc3MrPWYudjtmeEVhdChzLGYpO2Zvb2RbaV09Zm9vZFtmb29kLmxlbmd0aC0xXTtmb29kLnBvcCgpfQogICAgfQogIH0KICAvLyBjb2xsaXNpb25zIChjb2xsZWN0IGZpcnN0IHNvIGhlYWQtdG8taGVhZCBraWxscyBib3RoKQogIGNvbnN0IGRlYXRocz1bXTsKICBmb3IoY29uc3QgYSBvZiBzbmFrZXMpewogICAgaWYoIWEuYWxpdmUpY29udGludWU7CiAgICBjb25zdCBoPWEuc2Vnc1swXTsKICAgIGlmKE1hdGguaHlwb3QoaC54LGgueSk+Uil7ZGVhdGhzLnB1c2goW2EsbnVsbF0pO2NvbnRpbnVlfQogICAgZm9yKGNvbnN0IGIgb2Ygc25ha2VzKXsKICAgICAgaWYoYj09PWF8fCFiLmFsaXZlKWNvbnRpbnVlOwogICAgICBjb25zdCBiaD1iLnNlZ3NbMF07CiAgICAgIGlmKE1hdGguaHlwb3QoYmgueC1oLngsYmgueS1oLnkpPmIuc2Vncy5sZW5ndGgqYi5zcCtiLnIqMithLnIpY29udGludWU7CiAgICAgIGNvbnN0IGxpbT0oYS5yK2IucikqLjc4O2xldCBoaXQ9ZmFsc2U7CiAgICAgIGZvcihjb25zdCBnIG9mIGIuc2Vncyl7Y29uc3QgZHg9Zy54LWgueCxkeT1nLnktaC55O2lmKGR4KmR4K2R5KmR5PGxpbSpsaW0pe2hpdD10cnVlO2JyZWFrfX0KICAgICAgaWYoaGl0KXtkZWF0aHMucHVzaChbYSxiXSk7YnJlYWt9CiAgICB9CiAgfQogIGZvcihjb25zdFthLGJdb2YgZGVhdGhzKWtpbGwoYSxiKTsKICAvLyByZXNwYXduIGJvdHMKICBmb3IobGV0IGk9MDtpPHNuYWtlcy5sZW5ndGg7aSsrKXtjb25zdCBzPXNuYWtlc1tpXTtpZighcy5pc1AmJiFzLmFsaXZlJiZ0LXMuZGVhZD4zKXNuYWtlc1tpXT1PYmplY3QuYXNzaWduKG1rKHMubmFtZSxmYWxzZSwxMCtybmQoKSozMCkse30pfQogIHdoaWxlKGZvb2QubGVuZ3RoPEZPT0RNQVgmJnJuZCgpPC41KXtjb25zdCBhPXJuZCgpKlRBVSxkPVIqTWF0aC5zcXJ0KHJuZCgpKTthZGRGb29kKE1hdGguY29zKGEpKmQsTWF0aC5zaW4oYSkqZCwuNitybmQoKSouOSxNYXRoLmZsb29yKHJuZCgpKjM2MCkpfQogIGxiVC09ZHQ7aWYobGJUPD0wKXtsYlQ9LjU7bGI9c25ha2VzLmZpbHRlcihzPT5zLmFsaXZlKS5zb3J0KChwLHEpPT5xLm1hc3MtcC5tYXNzKX0KICBpZihQLmFsaXZlJiZ0LWxhc3RFbWl0Pi41KXtsYXN0RW1pdD10O2VtaXQoJ3Njb3JlJyxNYXRoLmZsb29yKFAubWFzcykrUC5raWxscyoxMCl9Cn0KCmZ1bmN0aW9uIGZvbGxvdygpewogIGxldCBmPVAuYWxpdmU/UDpsYlswXTsKICBpZighZnx8IWYuYWxpdmUpZj1zbmFrZXMuZmluZChzPT5zLmFsaXZlKTsKICBpZihmKXsKICAgIGNvbnN0IGg9Zi5zZWdzWzBdLGJhc2U9TWF0aC5tYXgoLjU1LE1hdGgubWluKDEuMixNYXRoLm1pbihXLEgpLzYyMCkpLHp0PWJhc2UqKDEtTWF0aC5taW4oLjM1LChmLnItNykqLjAxMikpOwogICAgY2FtLngrPShoLngtY2FtLngpKi4xODtjYW0ueSs9KGgueS1jYW0ueSkqLjE4O2NhbS56Kz0oenQtY2FtLnopKi4wNDsKICB9Cn0KCmZ1bmN0aW9uIGRyYXdTbmFrZShzKXsKICBjb25zdCB6PXp6LG49cy5zZWdzLmxlbmd0aCxyZz1zLmlzUCYmcmFnZT4wLGdoPXJnPyh0KjQwMCklMzYwOnMuaHVlOwogIGZvcihsZXQgaT1uLTE7aT49MDtpLS0pewogICAgY29uc3QgZz1zLnNlZ3NbaV0sc3g9KGcueC1jYW0ueCkqeitXLzIsc3k9KGcueS1jYW0ueSkqeitILzIscnI9cy5yKnoqKDEtLjM1Kmkvbik7CiAgICBpZihzeDwtcnIqMi00fHxzeD5XK3JyKjIrNHx8c3k8LXJyKjItNHx8c3k+SCtycioyKzQpY29udGludWU7CiAgICBpZihyZyYmaSUyPT09MCl7eC5maWxsU3R5bGU9aHNsYShnaCtpKjYsMTAwLDU1LC4yKTt4LmJlZ2luUGF0aCgpO3guYXJjKHN4LHN5LHJyKjIuMSwwLFRBVSk7eC5maWxsKCl9CiAgICBlbHNlIGlmKHMuc2tpbi5hdXJhJiZpJTQ9PT0wKXt4LmZpbGxTdHlsZT0naHNsYSgnK3MuaHVlKycsOTAlLDYwJSwuMTYpJzt4LmJlZ2luUGF0aCgpO3guYXJjKHN4LHN5LHJyKjEuOSwwLFRBVSk7eC5maWxsKCl9CiAgICBlbHNlIGlmKHMuYms+LjA1JiZpJTI9PT0wKXt4LmZpbGxTdHlsZT1oc2xhKDMwK01hdGguc2luKGkqLjQtdCoyMCkqMjUsMTAwLDYwLC4yMipzLmJrKTt4LmJlZ2luUGF0aCgpO3guYXJjKHN4LHN5LHJyKigxLjUrcy5iayouNiksMCxUQVUpO3guZmlsbCgpfQogICAgeC5maWxsU3R5bGU9cmc/aHNsYShnaCtpKjUsOTAsNTYsMSk6cy5za2luLmNvbChpLG4sdCk7CiAgICB4LnN0cm9rZVN0eWxlPSdyZ2JhKDAsMCwwLC4yOCknO3gubGluZVdpZHRoPTI7CiAgICB4LmJlZ2luUGF0aCgpO3guYXJjKHN4LHN5LHJyLDAsVEFVKTt4LmZpbGwoKTt4LnN0cm9rZSgpOwogIH0KICBjb25zdCBoPXMuc2Vnc1swXSxzeD0oaC54LWNhbS54KSp6K1cvMixzeT0oaC55LWNhbS55KSp6K0gvMixycj1zLnIqejsKICBjb25zdCBjYT1NYXRoLmNvcyhzLmFuZyksc2E9TWF0aC5zaW4ocy5hbmcpOwogIGlmKHMuZ2xvdz4uMDIpe3guc3Ryb2tlU3R5bGU9aHNsYShnaCwxMDAsNzAscy5nbG93Ki45KTt4LmxpbmVXaWR0aD0zKnorMTt4LmJlZ2luUGF0aCgpO3guYXJjKHN4LHN5LHJyKigxLjMrKDEtcy5nbG93KSoxLjMpLDAsVEFVKTt4LnN0cm9rZSgpfQogIGZvcihjb25zdCBzaWRlIG9mWy0xLDFdKXsKICAgIGNvbnN0IGV4PXN4K2NhKnJyKi4zNS1zYSpyciouNSpzaWRlLGV5PXN5K3NhKnJyKi4zNStjYSpyciouNSpzaWRlOwogICAgeC5maWxsU3R5bGU9cmc/JyNmZjNiM2InOicjZmZmJzt4LmJlZ2luUGF0aCgpO3guYXJjKGV4LGV5LHJyKi4zNCwwLFRBVSk7eC5maWxsKCk7CiAgICB4LmZpbGxTdHlsZT0nIzE2MTQyMyc7eC5iZWdpblBhdGgoKTt4LmFyYyhleCtjYSpyciouMTIsZXkrc2EqcnIqLjEyLHJyKi4xNywwLFRBVSk7eC5maWxsKCk7CiAgfQogIGlmKHMubWFzcz42MCYmZnhRPi41JiZzeD4tODAmJnN4PFcrODAmJnN5Pi04MCYmc3k8SCs4MCl7CiAgICBmb3IobGV0IGs9MDtrPDM7aysrKXtjb25zdCBhYT10KjMuMitrKjIuMDk0LG94Mj1zeCtNYXRoLmNvcyhhYSkqcnIqMi4yLG95Mj1zeStNYXRoLnNpbihhYSkqcnIqMi4yOwogICAgICB4LmZpbGxTdHlsZT1oc2xhKGdoK2sqNDAsMTAwLDcyLC45KTt4LmJlZ2luUGF0aCgpO3guYXJjKG94MixveTIsTWF0aC5tYXgoMS41LHJyKi4xNSksMCxUQVUpO3guZmlsbCgpfQogIH0KICBpZihzeD4tNjAmJnN4PFcrNjAmJnN5Pi02MCYmc3k8SCs2MCl7CiAgICB4LmZpbGxTdHlsZT0ncmdiYSgyNTUsMjU1LDI1NSwuODUpJzt4LmZvbnQ9JzEzcHggJytGT05UO3gudGV4dEFsaWduPSdjZW50ZXInO3guZmlsbFRleHQocy5uYW1lLHN4LHN5LXJyLTgpOwogIH0KfQoKZnVuY3Rpb24gZHJhd1BvcHMoKXsKICBmb3IoY29uc3QgcCBvZiBwb3BzKXsKICAgIGNvbnN0IGs9cC50L3AubCxzYz1wLnQ8LjE0PzMuNC0yLjQqKHAudC8uMTQpOjErKHAudC0uMTQpKi4wNixhPWs+LjYyP01hdGgubWF4KDAsMS0oay0uNjIpLy4zOCk6TWF0aC5taW4oMSxwLnQvLjA1KTsKICAgIGNvbnN0IHk9SCouMzYtKGs+LjU/KGstLjUpKjcwOjApLGZzPXAuYmlnPzQyOjMyOwogICAgeC5zYXZlKCk7eC50cmFuc2xhdGUoVy8yLHkpO3gucm90YXRlKChwLmJpZz8tLjA3Oi4wNCkrKHAudDwuMz9NYXRoLnNpbihwLnQqNjApKi4wNCooMS1wLnQvLjMpOjApKTt4LnNjYWxlKHNjLHNjKTsKICAgIHguZ2xvYmFsQWxwaGE9YTt4LnRleHRBbGlnbj0nY2VudGVyJzt4LnRleHRCYXNlbGluZT0nbWlkZGxlJzt4LmxpbmVKb2luPSdyb3VuZCc7eC5mb250PSc5MDAgJytmcysncHggJytGT05UOwogICAgeC5zdHJva2VTdHlsZT1oc2xhKHAuaCwxMDAsNTUsLjg1KTt4LmxpbmVXaWR0aD0xNjt4LnN0cm9rZVRleHQocC5zLDAsMCk7CiAgICB4LnN0cm9rZVN0eWxlPScjMTIwMjBhJzt4LmxpbmVXaWR0aD04O3guc3Ryb2tlVGV4dChwLnMsMCwwKTsKICAgIGNvbnN0IGdyPXguY3JlYXRlTGluZWFyR3JhZGllbnQoMCwtZnMvMiwwLGZzLzIpO2dyLmFkZENvbG9yU3RvcCgwLCcjZmZmJyk7Z3IuYWRkQ29sb3JTdG9wKC41NSxoc2xhKHAuaCszMCwxMDAsNzAsMSkpO2dyLmFkZENvbG9yU3RvcCgxLGhzbGEocC5oLDEwMCw1MCwxKSk7CiAgICB4LmZpbGxTdHlsZT1ncjt4LmZpbGxUZXh0KHAucywwLDApOwogICAgeC5yZXN0b3JlKCk7CiAgfQogIHgudGV4dEJhc2VsaW5lPSdhbHBoYWJldGljJzt4Lmdsb2JhbEFscGhhPTE7Cn0KZnVuY3Rpb24gbWtPQygpewogIGlmKCFvYyl7b2M9ZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJyk7b2MyPWRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2NhbnZhcycpfQogIGZvcihjb25zdCBvIG9mW29jLG9jMl0pe2lmKG8ud2lkdGghPT1jLndpZHRofHxvLmhlaWdodCE9PWMuaGVpZ2h0KXtvLndpZHRoPWMud2lkdGg7by5oZWlnaHQ9Yy5oZWlnaHR9fQp9CmZ1bmN0aW9uIHBvc3RBYmVyKGEpewogIG1rT0MoKTtjb25zdCBxPW9jLmdldENvbnRleHQoJzJkJykscTI9b2MyLmdldENvbnRleHQoJzJkJyk7CiAgcS5nbG9iYWxDb21wb3NpdGVPcGVyYXRpb249J3NvdXJjZS1vdmVyJztxLmRyYXdJbWFnZShjLDAsMCk7cS5nbG9iYWxDb21wb3NpdGVPcGVyYXRpb249J211bHRpcGx5JztxLmZpbGxTdHlsZT0nI2YwMCc7cS5maWxsUmVjdCgwLDAsb2Mud2lkdGgsb2MuaGVpZ2h0KTsKICBxMi5nbG9iYWxDb21wb3NpdGVPcGVyYXRpb249J3NvdXJjZS1vdmVyJztxMi5kcmF3SW1hZ2UoYywwLDApO3EyLmdsb2JhbENvbXBvc2l0ZU9wZXJhdGlvbj0nbXVsdGlwbHknO3EyLmZpbGxTdHlsZT0nIzBmZic7cTIuZmlsbFJlY3QoMCwwLG9jMi53aWR0aCxvYzIuaGVpZ2h0KTsKICBjb25zdCBvPU1hdGgucm91bmQoYSoxNCpEUFJ2KTsKICB4LnNhdmUoKTt4LnNldFRyYW5zZm9ybSgxLDAsMCwxLDAsMCk7eC5nbG9iYWxDb21wb3NpdGVPcGVyYXRpb249J3NvdXJjZS1vdmVyJzt4LmZpbGxTdHlsZT0nIzAwMCc7eC5maWxsUmVjdCgwLDAsYy53aWR0aCxjLmhlaWdodCk7CiAgeC5nbG9iYWxDb21wb3NpdGVPcGVyYXRpb249J2xpZ2h0ZXInO3guZHJhd0ltYWdlKG9jLC1vLDApO3guZHJhd0ltYWdlKG9jMixvLDApO3gucmVzdG9yZSgpOwp9CmZ1bmN0aW9uIHBvc3RHbGl0Y2goZ2wpewogIG1rT0MoKTtvYy5nZXRDb250ZXh0KCcyZCcpLmdsb2JhbENvbXBvc2l0ZU9wZXJhdGlvbj0nc291cmNlLW92ZXInO29jLmdldENvbnRleHQoJzJkJykuZHJhd0ltYWdlKGMsMCwwKTsKICBjb25zdCBuPU1hdGguZmxvb3IoMytnbCo3KTt4LnNhdmUoKTt4LnNldFRyYW5zZm9ybSgxLDAsMCwxLDAsMCk7CiAgZm9yKGxldCBpPTA7aTxuO2krKyl7CiAgICBjb25zdCBoaD1NYXRoLmZsb29yKCg4K3JuZCgpKjYwKmdsKSpEUFJ2KSxzeT1NYXRoLmZsb29yKHJuZCgpKk1hdGgubWF4KDEsYy5oZWlnaHQtaGgpKSxkeD1NYXRoLnJvdW5kKChybmQoKS0uNSkqOTAqZ2wqRFBSdik7CiAgICB4LmRyYXdJbWFnZShvYywwLHN5LGMud2lkdGgsaGgsZHgsc3ksYy53aWR0aCxoaCk7CiAgfQogIHgucmVzdG9yZSgpOwp9CmZ1bmN0aW9uIGRyYXcoKXsKICB6ej1jYW0ueiooMStwdW5jaCouMSkqKDEtLjA5KmJLKTsKICBjb25zdCB6PXp6LG94PVcvMi1jYW0ueCp6LG95PUgvMi1jYW0ueSp6LGhiPSh0KjkrKHJhZ2U+MD90KjI2MDowKSklMzYwOwogIHguZ2xvYmFsQ29tcG9zaXRlT3BlcmF0aW9uPSdzb3VyY2Utb3Zlcic7eC5nbG9iYWxBbHBoYT0xOwogIHguZmlsbFN0eWxlPScjMDQwMjA4Jzt4LmZpbGxSZWN0KDAsMCxXLEgpOwogIHguc2F2ZSgpO3guYmVnaW5QYXRoKCk7eC5hcmMob3gsb3ksUip6LDAsVEFVKTsKICBjb25zdCBnMD14LmNyZWF0ZVJhZGlhbEdyYWRpZW50KFcvMixILzIsMCxXLzIsSC8yLE1hdGgubWF4KFcsSCkqLjg1KTsKICBnMC5hZGRDb2xvclN0b3AoMCxoc2xhKGhiLDYwLHJhZ2U+MD8xNzoxMiwxKSk7ZzAuYWRkQ29sb3JTdG9wKDEsJyMwNjAzMGMnKTsKICB4LmZpbGxTdHlsZT1nMDt4LmZpbGwoKTt4LmNsaXAoKTsKICAvLyAtLS0tIHJlYWxpdHktd2FycCBkb3QgZ3JpZCAocmlwcGxlcyBmcm9tIHRoZSBjYW1lcmEgZm9jdXMpCiAgY29uc3QgZ3M9NjQseDA9TWF0aC5mbG9vcigoY2FtLngtVy8yL3opL2dzKSpncyx4MT1jYW0ueCtXLzIveitncyx5MD1NYXRoLmZsb29yKChjYW0ueS1ILzIveikvZ3MpKmdzLHkxPWNhbS55K0gvMi96K2dzOwogIHguZ2xvYmFsQ29tcG9zaXRlT3BlcmF0aW9uPSdsaWdodGVyJzsKICBmb3IobGV0IGd4PXgwO2d4PHgxO2d4Kz1ncylmb3IobGV0IGd5PXkwO2d5PHkxO2d5Kz1ncyl7CiAgICBjb25zdCBkeD1neC1jYW0ueCxkeT1neS1jYW0ueSxkZD1NYXRoLnNxcnQoZHgqZHgrZHkqZHkpLGZhbGw9ZGQ8OTAwPzEtZGQvOTAwOjAsc3c9TWF0aC5zaW4oZGQqLjAxMi10KjUpOwogICAgY29uc3Qgdz1zdypmYWxsKjE4K01hdGguc2luKGd4Ki4wMSt0KjEuNykqMyxhbj1NYXRoLmF0YW4yKGR5LGR4KTsKICAgIGNvbnN0IHB4PSgoZ3grTWF0aC5jb3MoYW4pKncpLWNhbS54KSp6K1cvMixweT0oKGd5K01hdGguc2luKGFuKSp3KS1jYW0ueSkqeitILzIsYWw9LjA5K01hdGgubWF4KDAsc3cpKmZhbGwqLjM1OwogICAgeC5maWxsU3R5bGU9aHNsYShoYitkZCouMTIsOTAsNjAsYWwpO3guYmVnaW5QYXRoKCk7eC5hcmMocHgscHksKDEuNithbCo1KSp6LDAsVEFVKTt4LmZpbGwoKTsKICB9CiAgeC5nbG9iYWxDb21wb3NpdGVPcGVyYXRpb249J3NvdXJjZS1vdmVyJzsKICAvLyAtLS0tIHdhdGNoZXIgZXllcwogIGlmKGZ4UT4uNSlmb3IoY29uc3QgZSBvZiBleWVzKXsKICAgIGNvbnN0IHN4PShlLngtY2FtLngpKnorVy8yLHN5PShlLnktY2FtLnkpKnorSC8yLHN6PWUucyp6OwogICAgaWYoc3g8LXN6fHxzeD5XK3N6fHxzeTwtc3p8fHN5Pkgrc3opY29udGludWU7CiAgICBjb25zdCBvcGVuPU1hdGguc2luKHQqLjkrZS5waCk+LjkzPy4xOjE7CiAgICB4LmJlZ2luUGF0aCgpO3gubW92ZVRvKHN4LXN6LHN5KTt4LnF1YWRyYXRpY0N1cnZlVG8oc3gsc3ktc3oqLjkqb3BlbixzeCtzeixzeSk7eC5xdWFkcmF0aWNDdXJ2ZVRvKHN4LHN5K3N6Ki45Km9wZW4sc3gtc3osc3kpOwogICAgeC5maWxsU3R5bGU9aHNsYShlLmgsOTAsMjUsLjI4KTt4LmZpbGwoKTt4LnN0cm9rZVN0eWxlPWhzbGEoZS5oLDEwMCw2MCwuMzUpO3gubGluZVdpZHRoPTIqejt4LnN0cm9rZSgpOwogICAgY29uc3QgZHg9Y2FtLngtZS54LGR5PWNhbS55LWUueSxkZD1NYXRoLmh5cG90KGR4LGR5KXx8MTsKICAgIHguZmlsbFN0eWxlPWhzbGEoZS5oLDEwMCw3MCwuNTUpO3guYmVnaW5QYXRoKCk7eC5lbGxpcHNlKHN4K2R4L2RkKnN6Ki4zNSxzeStkeS9kZCpzeiouMixzeiouMDksTWF0aC5tYXgoMSxzeiouNSpvcGVuKSwwLDAsVEFVKTt4LmZpbGwoKTsKICB9CiAgLy8gLS0tLSBzcGlubmluZyByaWZ0cwogIGlmKGZ4UT4uNSlmb3IoY29uc3QgciBvZiByaWZ0cyl7CiAgICBjb25zdCBzeD0oci54LWNhbS54KSp6K1cvMixzeT0oci55LWNhbS55KSp6K0gvMixzej1yLnMqejsKICAgIGlmKHN4PC1zenx8c3g+Vytzenx8c3k8LXN6fHxzeT5IK3N6KWNvbnRpbnVlOwogICAgeC5maWxsU3R5bGU9J3JnYmEoMCwwLDAsLjU1KSc7eC5iZWdpblBhdGgoKTt4LmFyYyhzeCxzeSxzeiouMywwLFRBVSk7eC5maWxsKCk7CiAgICB4LmxpbmVXaWR0aD0yLjUqejsKICAgIGZvcihsZXQgaz0wO2s8MztrKyspe2NvbnN0IGEwPXQqci5kaXIqKDErayouNikrayoyO3guc3Ryb2tlU3R5bGU9aHNsYShyLmgrayo0MCt0KjMwLDkwLDYwLC4zKTt4LmJlZ2luUGF0aCgpO3guYXJjKHN4LHN5LHN6KiguNDUrayouMjgpLGEwLGEwK01hdGguUEkqMS4xKTt4LnN0cm9rZSgpfQogIH0KICAvLyAtLS0tIGZvb2QKICBmb3IoY29uc3QgZiBvZiBmb29kKXsKICAgIGNvbnN0IHN4PShmLngtY2FtLngpKnorVy8yLHN5PShmLnktY2FtLnkpKnorSC8yOwogICAgaWYoc3g8LTE0fHxzeD5XKzE0fHxzeTwtMTR8fHN5PkgrMTQpY29udGludWU7CiAgICBjb25zdCByPSgzK01hdGgubWluKDYsZi52KjIuMikrTWF0aC5zaW4odCozK2YucGgpKi43KSp6OwogICAgaWYoZi5wdCE9PXVuZGVmaW5lZCYmdC1mLnB0PC4wOCl7eC5zdHJva2VTdHlsZT1oc2xhKGYuaCwxMDAsNzAsLjYpO3gubGluZVdpZHRoPXIqLjk7eC5saW5lQ2FwPSdyb3VuZCc7eC5iZWdpblBhdGgoKTt4Lm1vdmVUbyhzeCxzeSk7eC5saW5lVG8oc3gtZi50eCp6Kjcsc3ktZi50eSp6KjcpO3guc3Ryb2tlKCl9CiAgICB4LmZpbGxTdHlsZT1oc2xhKGYuaCwxMDAsNjAsLjE0KTt4LmJlZ2luUGF0aCgpO3guYXJjKHN4LHN5LHIqMi4zLDAsVEFVKTt4LmZpbGwoKTsKICAgIHguZmlsbFN0eWxlPSdoc2woJytmLmgrJyw4MCUsNjIlKSc7eC5iZWdpblBhdGgoKTt4LmFyYyhzeCxzeSxyLDAsVEFVKTt4LmZpbGwoKTsKICB9CiAgY29uc3Qgb3JkZXI9c25ha2VzLmZpbHRlcihzPT5zLmFsaXZlKS5zb3J0KChhLGIpPT5hLm1hc3MtYi5tYXNzKTsKICBmb3IoY29uc3QgcyBvZiBvcmRlcilkcmF3U25ha2Uocyk7CiAgLy8gLS0tLSBhZGRpdGl2ZSBsYXllcjogcGFydGljbGVzLCBzaG9ja3dhdmVzLCBsaWdodG5pbmcKICB4Lmdsb2JhbENvbXBvc2l0ZU9wZXJhdGlvbj0nbGlnaHRlcic7eC5saW5lQ2FwPSdyb3VuZCc7CiAgZm9yKGNvbnN0IHAgb2YgcGFydHMpewogICAgY29uc3Qgc3g9KHAueC1jYW0ueCkqeitXLzIsc3k9KHAueS1jYW0ueSkqeitILzI7CiAgICBpZihzeDwtNDB8fHN4PlcrNDB8fHN5PC00MHx8c3k+SCs0MCljb250aW51ZTsKICAgIGNvbnN0IGs9cC5sL3AubSxhbD1NYXRoLm1pbigxLGsqMS42KTsKICAgIGlmKHAuaz09PSdzcGFyaycpewogICAgICB4LnN0cm9rZVN0eWxlPWhzbGEocC5oLDEwMCw2MCtrKjMwLGFsKTt4LmxpbmVXaWR0aD1NYXRoLm1heCgxLHAucip6KmsrLjUpOwogICAgICB4LmJlZ2luUGF0aCgpO3gubW92ZVRvKHN4LHN5KTt4LmxpbmVUbyhzeC1wLnZ4Ki4wNDUqeixzeS1wLnZ5Ki4wNDUqeik7eC5zdHJva2UoKTsKICAgIH1lbHNlIGlmKHAuaz09PSdzaGFyZCcpewogICAgICBjb25zdCByPXAucip6KiguNCtrKi42KSxhPXAucm90OwogICAgICB4LmZpbGxTdHlsZT1oc2xhKHAuaCwxMDAsNTgsYWwqLjkpO3guYmVnaW5QYXRoKCk7CiAgICAgIHgubW92ZVRvKHN4K01hdGguY29zKGEpKnIsc3krTWF0aC5zaW4oYSkqcik7CiAgICAgIHgubGluZVRvKHN4K01hdGguY29zKGErMi40KSpyKi41NSxzeStNYXRoLnNpbihhKzIuNCkqciouNTUpOwogICAgICB4LmxpbmVUbyhzeCtNYXRoLmNvcyhhLTIuNCkqciouNTUsc3krTWF0aC5zaW4oYS0yLjQpKnIqLjU1KTt4LmNsb3NlUGF0aCgpO3guZmlsbCgpOwogICAgfWVsc2V7CiAgICAgIHguZmlsbFN0eWxlPWhzbGEocC5oLDEwMCw1NSxhbCouOCk7eC5iZWdpblBhdGgoKTt4LmFyYyhzeCxzeSxNYXRoLm1heCguOCxwLnIqeiprKSwwLFRBVSk7eC5maWxsKCk7CiAgICB9CiAgfQogIGZvcihjb25zdCBxIG9mIHJpbmdzKXsKICAgIGNvbnN0IGs9MS1xLmwvcS5tLGU9MS1NYXRoLnBvdygxLWssMykscj0ocS5yMCsocS5tci1xLnIwKSplKSp6LHN4PShxLngtY2FtLngpKnorVy8yLHN5PShxLnktY2FtLnkpKnorSC8yOwogICAgeC5zdHJva2VTdHlsZT1oc2xhKHEuaCwxMDAsNjUsKDEtaykqLjkpO3gubGluZVdpZHRoPU1hdGgubWF4KDEscS53KnoqKDEtaykrMSk7eC5iZWdpblBhdGgoKTt4LmFyYyhzeCxzeSxyLDAsVEFVKTt4LnN0cm9rZSgpOwogICAgeC5zdHJva2VTdHlsZT0ncmdiYSgyNTUsMjU1LDI1NSwnKygoMS1rKSouNikudG9GaXhlZCgzKSsnKSc7eC5saW5lV2lkdGg9TWF0aC5tYXgoMSxxLncqLjMqeiooMS1rKSk7eC5zdHJva2UoKTsKICB9CiAgZm9yKGNvbnN0IGIgb2YgYm9sdHMpewogICAgY29uc3Qgaz1iLmwvYi5tO3guYmVnaW5QYXRoKCk7CiAgICBiLnB0cy5mb3JFYWNoKChwLGkpPT57Y29uc3Qgc3g9KHBbMF0tY2FtLngpKnorVy8yLHN5PShwWzFdLWNhbS55KSp6K0gvMjtpZihpKXgubGluZVRvKHN4LHN5KTtlbHNlIHgubW92ZVRvKHN4LHN5KX0pOwogICAgeC5zdHJva2VTdHlsZT1oc2xhKGIuaCwxMDAsNjAsayooLjQ1K3JuZCgpKi4zKSk7eC5saW5lV2lkdGg9Nyp6KmsrMTt4LnN0cm9rZSgpOwogICAgeC5zdHJva2VTdHlsZT0ncmdiYSgyNTUsMjU1LDI1NSwnKyhrKiguNitybmQoKSouNCkpLnRvRml4ZWQoMykrJyknO3gubGluZVdpZHRoPTIqayp6Ky41O3guc3Ryb2tlKCk7CiAgfQogIHguZ2xvYmFsQ29tcG9zaXRlT3BlcmF0aW9uPSdzb3VyY2Utb3Zlcic7CiAgeC5yZXN0b3JlKCk7CiAgLy8gLS0tLSBlbGVjdHJpYyBhcmVuYSBib3JkZXIKICB7CiAgICBjb25zdCBycj1SKnosTj0xNDA7eC5nbG9iYWxDb21wb3NpdGVPcGVyYXRpb249J2xpZ2h0ZXInO3guYmVnaW5QYXRoKCk7CiAgICBmb3IobGV0IGk9MDtpPD1OO2krKyl7Y29uc3QgYT1pL04qVEFVLHJhZD1ycisocm5kKCktLjUpKjEwKnoqKDErZGFuZyoyKTtjb25zdCBweD1veCtNYXRoLmNvcyhhKSpyYWQscHk9b3krTWF0aC5zaW4oYSkqcmFkO2lmKGkpeC5saW5lVG8ocHgscHkpO2Vsc2UgeC5tb3ZlVG8ocHgscHkpfQogICAgeC5zdHJva2VTdHlsZT1oc2xhKCh0KjYwKSUzNjAsMTAwLDYwLC41NStkYW5nKi40KTt4LmxpbmVXaWR0aD0oNStkYW5nKjgpKno7eC5zdHJva2UoKTsKICAgIHguc3Ryb2tlU3R5bGU9J3JnYmEoMjU1LDI1NSwyNTUsLjgpJzt4LmxpbmVXaWR0aD0xLjUqejt4LnN0cm9rZSgpOwogICAgeC5nbG9iYWxDb21wb3NpdGVPcGVyYXRpb249J3NvdXJjZS1vdmVyJzsKICB9CiAgLy8gLS0tLSBzY3JlZW4tc3BhY2U6IG1vdGVzLCBzcGVlZCBsaW5lcywgdmlnbmV0dGUKICB4Lmdsb2JhbENvbXBvc2l0ZU9wZXJhdGlvbj0nbGlnaHRlcic7CiAgZm9yKGxldCBpPTAsbj1NYXRoLmZsb29yKG1vdGVzLmxlbmd0aCpmeFEpO2k8bjtpKyspewogICAgY29uc3QgbT1tb3Rlc1tpXSx5eT0oKG0ueS10Km0udiklMSsxKSUxLHh4PSgobS54K01hdGguc2luKHQqLjYrbS53KSouMDIpJTErMSklMTsKICAgIHguZmlsbFN0eWxlPWhzbGEobS5oK3QqMjAsOTAsNjUsLjM1KTt4LmJlZ2luUGF0aCgpO3guYXJjKHh4KlcseXkqSCxtLnIsMCxUQVUpO3guZmlsbCgpOwogIH0KICBpZihiSz4uMDQmJmZ4UT4uNCl7CiAgICB4LmxpbmVDYXA9J3JvdW5kJztjb25zdCBjeD1XLzIsY3k9SC8yLG1yPU1hdGguaHlwb3QoVyxIKS8yOwogICAgZm9yKGNvbnN0IGwgb2YgbGluZXMpewogICAgICBjb25zdCBwPShsLnArdCpsLnYpJTEscjA9bXIqKC4yNStwKi43NSkscjE9cjArbXIqbC5sZW4qKC4zK3ApLGNhPU1hdGguY29zKGwuYSksc2E9TWF0aC5zaW4obC5hKTsKICAgICAgeC5zdHJva2VTdHlsZT1yYWdlPjA/aHNsYSh0KjMwMCtsLmEqNDAsMTAwLDcwLGJLKi40KToncmdiYSgyNTUsMjU1LDI1NSwnKyhiSyouMzUqKHA8LjE1P3AvLjE1OjEtcCouNykpLnRvRml4ZWQoMykrJyknOwogICAgICB4LmxpbmVXaWR0aD0xK2wubGVuKjU7eC5iZWdpblBhdGgoKTt4Lm1vdmVUbyhjeCtjYSpyMCxjeStzYSpyMCk7eC5saW5lVG8oY3grY2EqcjEsY3krc2EqcjEpO3guc3Ryb2tlKCk7CiAgICB9CiAgfQogIHguZ2xvYmFsQ29tcG9zaXRlT3BlcmF0aW9uPSdzb3VyY2Utb3Zlcic7CiAgewogICAgY29uc3Qgdms9TWF0aC5tYXgoYksqLjU1LHJhZ2U+MD8uNSsuMTUqTWF0aC5zaW4odCoxNCk6MCk7CiAgICBpZih2az4uMDJ8fGRhbmc+LjAyKXsKICAgICAgY29uc3QgZ3I9eC5jcmVhdGVSYWRpYWxHcmFkaWVudChXLzIsSC8yLE1hdGgubWluKFcsSCkqLjI1LFcvMixILzIsTWF0aC5tYXgoVyxIKSouNzUpOwogICAgICBjb25zdCBkYW5nZXJXaW5zPWRhbmc+LjA1JiZkYW5nPnZrLGh1ZT1kYW5nZXJXaW5zPzM1MDoocmFnZT4wPyh0KjMwMCklMzYwOjI1KSxzdDI9ZGFuZ2VyV2lucz9kYW5nKi43OnZrOwogICAgICBnci5hZGRDb2xvclN0b3AoMCxoc2xhKGh1ZSwxMDAsNTAsMCkpO2dyLmFkZENvbG9yU3RvcCgxLGhzbGEoaHVlLDEwMCw1MCxNYXRoLm1pbiguNzUsc3QyKSkpOwogICAgICB4LmZpbGxTdHlsZT1ncjt4LmZpbGxSZWN0KDAsMCxXLEgpOwogICAgfQogIH0KICAvLyAtLS0tIHBvc3Q6IGNocm9tYXRpYyBzcGxpdCArIGdsaXRjaCBzbGljZXMgKGJ1cnN0cyBvbmx5KQogIGlmKGZ4UT49LjYpe2lmKGFiZXI+LjA0KXBvc3RBYmVyKGFiZXIpO2lmKGdsaXRjaD4uMDQpcG9zdEdsaXRjaChnbGl0Y2gpfQogIGRyYXdQb3BzKCk7CiAgLy8gSFVECiAgeC50ZXh0QWxpZ249J3JpZ2h0Jzt4LmZpbGxTdHlsZT0ncmdiYSgyNTUsMjU1LDI1NSwuOSknO3guZm9udD0nYm9sZCAxNHB4ICcrRk9OVDsKICB4LmZpbGxUZXh0KCfYqNix2KrYsduM2YbigIzZh9inJyxXLTE0LDI4KTsKICB4LmZvbnQ9JzE0cHggJytGT05UOwogIGxiLnNsaWNlKDAsNSkuZm9yRWFjaCgocyxpKT0+e3guZmlsbFN0eWxlPXMuaXNQPycjZmZkMTY2JzoncmdiYSgyNTUsMjU1LDI1NSwuNzUpJzt4LmZpbGxUZXh0KChpKzEpKycuICcrcy5uYW1lKycgICcrTWF0aC5mbG9vcihzLm1hc3MpLFctMTQsNTAraSoyMCl9KTsKICAvLyBtaW5pbWFwCiAgY29uc3QgbXI9NDYsbXg9NjIsbXk9MTMwOwogIHguZmlsbFN0eWxlPSdyZ2JhKDAsMCwwLC4zNSknO3guYmVnaW5QYXRoKCk7eC5hcmMobXgsbXksbXIsMCxUQVUpO3guZmlsbCgpO3guc3Ryb2tlU3R5bGU9J3JnYmEoMjU1LDI1NSwyNTUsLjMpJzt4LmxpbmVXaWR0aD0xLjU7eC5zdHJva2UoKTsKICBmb3IoY29uc3QgcyBvZiBzbmFrZXMpe2lmKCFzLmFsaXZlKWNvbnRpbnVlO2NvbnN0IGg9cy5zZWdzWzBdO3guZmlsbFN0eWxlPXMuaXNQPycjZmZkMTY2JzonaHNsKCcrcy5odWUrJyw3MCUsNjAlKSc7eC5iZWdpblBhdGgoKTt4LmFyYyhteCtoLngvUiptcixteStoLnkvUiptcixzLmlzUD8zLjU6MiwwLFRBVSk7eC5maWxsKCl9CiAgaWYoc3Q9PT0ncGxheScpewogICAgeC50ZXh0QWxpZ249J2xlZnQnO3guZmlsbFN0eWxlPScjZmZmJzt4LmZvbnQ9J2JvbGQgMjJweCAnK0ZPTlQ7eC5maWxsVGV4dCgn2LfZiNmEOiAnK01hdGguZmxvb3IoUC5tYXNzKSwxNiwzNCk7CiAgICBpZihyYWdlPjApe3gudGV4dEFsaWduPSdjZW50ZXInO3guZm9udD0nOTAwIDE4cHggJytGT05UO3guZmlsbFN0eWxlPWhzbGEodCo0MDAsMTAwLDY2LDEpO3guZmlsbFRleHQoJ/Cfkbkg2K7YtNmFIMOXJytzdHJlYWssVy8yLDM2KTt4LnRleHRBbGlnbj0nbGVmdCd9CiAgICBpZihkYW5nPi41KXt4LnRleHRBbGlnbj0nY2VudGVyJzt4LmZvbnQ9J2JvbGQgMTZweCAnK0ZPTlQ7eC5maWxsU3R5bGU9J3JnYmEoMjU1LDcwLDkwLCcrKC42Ky40Kk1hdGguc2luKHQqMTQpKSsnKSc7eC5maWxsVGV4dCgn4pqg77iPINmE2KjZh+KAjNuMINiv2YbbjNinIScsVy8yLHJhZ2U+MD82MDozNik7eC50ZXh0QWxpZ249J2xlZnQnfQogICAgeC5mb250PScxNHB4ICcrRk9OVDt4LmZpbGxTdHlsZT0ncmdiYSgyNTUsMjU1LDI1NSwuNyknOwogICAgY29uc3Qgcms9bGIuZmluZEluZGV4KHM9PnMuaXNQKSsxO3guZmlsbFRleHQoJ9ix2KrYqNmHICcrKHJrfHwnLScpKycg2KfYsiAnK2xiLmxlbmd0aCsnICAgfCAgINqp2LTYqtmH4oCM2YfYpzogJytQLmtpbGxzLDE2LDU2KTsKICAgIGNvbnN0IGI9YnRuKCksY2FuPVAubWFzcz4xMjsKICAgIHguZmlsbFN0eWxlPWJvb3N0SW4mJmNhbj8ncmdiYSgyNTUsMjA5LDEwMiwuOSknOidyZ2JhKDI1NSwyNTUsMjU1LC4xOCknO3guYmVnaW5QYXRoKCk7eC5hcmMoYi54LGIueSxiLnIsMCxUQVUpO3guZmlsbCgpOwogICAgeC5zdHJva2VTdHlsZT1jYW4/J3JnYmEoMjU1LDI1NSwyNTUsLjcpJzoncmdiYSgyNTUsMjU1LDI1NSwuMjUpJzt4LmxpbmVXaWR0aD0zO3guc3Ryb2tlKCk7CiAgICB4LnRleHRBbGlnbj0nY2VudGVyJzt4LmZpbGxTdHlsZT1ib29zdEluJiZjYW4/JyMyYTFkMDAnOidyZ2JhKDI1NSwyNTUsMjU1LC45KSc7eC5mb250PSdib2xkIDE2cHggJytGT05UO3guZmlsbFRleHQoJ9i02KrYp9ioJyxiLngsYi55KzYpOwogICAgaWYobXNnLnQ+MCl7eC5nbG9iYWxBbHBoYT1NYXRoLm1pbigxLG1zZy50KjIpO3guZmlsbFN0eWxlPScjZmZkMTY2Jzt4LmZvbnQ9J2JvbGQgMjJweCAnK0ZPTlQ7eC5maWxsVGV4dChtc2cucyxXLzIsSCouMjIpO3guZ2xvYmFsQWxwaGE9MX0KICB9CiAgaWYoc3Q9PT0ncGxheScpe2NvbnN0IHBiPXBidG4oKTt4LmZpbGxTdHlsZT0ncmdiYSgyNTUsMjU1LDI1NSwuMTYpJzt4LmJlZ2luUGF0aCgpO3guYXJjKHBiLngscGIueSxwYi5yLDAsVEFVKTt4LmZpbGwoKTt4LmZpbGxTdHlsZT0ncmdiYSgyNTUsMjU1LDI1NSwuODUpJzt4LmZpbGxSZWN0KHBiLngtNixwYi55LTcsNCwxNCk7eC5maWxsUmVjdChwYi54KzIscGIueS03LDQsMTQpfQogIGlmKHN0PT09J3BsYXknJiZ0b3VjaERldil7CiAgICBpZihqb3kub24pewogICAgICB4LmZpbGxTdHlsZT0ncmdiYSgyNTUsMjU1LDI1NSwuMDgpJzt4LnN0cm9rZVN0eWxlPSdyZ2JhKDI1NSwyNTUsMjU1LC4zNSknO3gubGluZVdpZHRoPTM7CiAgICAgIHguYmVnaW5QYXRoKCk7eC5hcmMoam95Lm94LGpveS5veSxKUiwwLFRBVSk7eC5maWxsKCk7eC5zdHJva2UoKTsKICAgICAgeC5maWxsU3R5bGU9J3JnYmEoMjU1LDI1NSwyNTUsLjQpJzt4LmJlZ2luUGF0aCgpO3guYXJjKGpveS54LGpveS55LDI2LDAsVEFVKTt4LmZpbGwoKTsKICAgIH1lbHNlewogICAgICB4LnN0cm9rZVN0eWxlPSdyZ2JhKDI1NSwyNTUsMjU1LC4yKSc7eC5saW5lV2lkdGg9Mzt4LmJlZ2luUGF0aCgpO3guYXJjKDEwMCxILTExMCxKUiwwLFRBVSk7eC5zdHJva2UoKTsKICAgICAgeC5maWxsU3R5bGU9J3JnYmEoMjU1LDI1NSwyNTUsLjM1KSc7eC5mb250PScxM3B4ICcrRk9OVDt4LnRleHRBbGlnbj0nY2VudGVyJzt4LmZpbGxUZXh0KCfYqNqp2LQg2KrYpyDYqNqG2LHYrtuMJywxMDAsSC0xMDYpOwogICAgfQogIH0KfQoKCmxldCB0b3VjaERldj0oJ29udG91Y2hzdGFydCcgaW4gd2luZG93KXx8KG5hdmlnYXRvci5tYXhUb3VjaFBvaW50cz4wKTsKY29uc3Qgam95PXtpZDpudWxsLG94OjAsb3k6MCx4OjAseTowLGFuZzowLG9uOmZhbHNlfSxKUj02NDsKYy5hZGRFdmVudExpc3RlbmVyKCdjb250ZXh0bWVudScsZT0+ZS5wcmV2ZW50RGVmYXVsdCgpKTsKYy5hZGRFdmVudExpc3RlbmVyKCdwb2ludGVyZG93bicsZT0+ewogIGUucHJldmVudERlZmF1bHQoKTsKICBpZihzdCE9PSdwbGF5J3x8cGF1c2VkKXJldHVybjsKICBjb25zdCBteD1lLmNsaWVudFgtb2ZmWCxteT1lLmNsaWVudFk7CiAgY29uc3QgcGI9cGJ0bigpO2lmKE1hdGguaHlwb3QobXgtcGIueCxteS1wYi55KTxwYi5yKzEyKXtzZXRQYXVzZSh0cnVlKTtyZXR1cm59CiAgY29uc3QgYj1idG4oKTsKICBpZihNYXRoLmh5cG90KG14LWIueCxteS1iLnkpPGIucisxMil7Ym9vc3RJZD1lLnBvaW50ZXJJZDtib29zdEluPXRydWU7cmV0dXJufQogIGlmKGUucG9pbnRlclR5cGU9PT0nbW91c2UnKXt0b3VjaERldj1mYWxzZTtwdHI9e3g6bXgseTpteX07Ym9vc3RJZD1lLnBvaW50ZXJJZDtib29zdEluPXRydWV9CiAgZWxzZSBpZihqb3kuaWQ9PT1udWxsKXt0b3VjaERldj10cnVlO2pveS5pZD1lLnBvaW50ZXJJZDtqb3kub3g9am95Lng9bXg7am95Lm95PWpveS55PW15O2pveS5vbj10cnVlfQp9KTsKYy5hZGRFdmVudExpc3RlbmVyKCdwb2ludGVybW92ZScsZT0+ewogIGNvbnN0IG14PWUuY2xpZW50WC1vZmZYLG15PWUuY2xpZW50WTsKICBpZihlLnBvaW50ZXJUeXBlPT09J21vdXNlJyl7dG91Y2hEZXY9ZmFsc2U7cHRyPXt4Om14LHk6bXl9O3JldHVybn0KICBpZihlLnBvaW50ZXJJZCE9PWpveS5pZClyZXR1cm47CiAgbGV0IGR4PW14LWpveS5veCxkeT1teS1qb3kub3k7Y29uc3QgZD1NYXRoLmh5cG90KGR4LGR5KTsKICBpZihkPjEwKWpveS5hbmc9TWF0aC5hdGFuMihkeSxkeCk7CiAgaWYoZD5KUil7ZHgqPUpSL2Q7ZHkqPUpSL2R9CiAgam95Lng9am95Lm94K2R4O2pveS55PWpveS5veStkeTsKfSk7CmZ1bmN0aW9uIHVwKGUpe2lmKGUucG9pbnRlcklkPT09Ym9vc3RJZCl7Ym9vc3RJZD1udWxsO2Jvb3N0SW49ZmFsc2V9aWYoZS5wb2ludGVySWQ9PT1qb3kuaWQpe2pveS5pZD1udWxsO2pveS5vbj1mYWxzZX19CmFkZEV2ZW50TGlzdGVuZXIoJ3BvaW50ZXJ1cCcsdXApO2FkZEV2ZW50TGlzdGVuZXIoJ3BvaW50ZXJjYW5jZWwnLHVwKTsKZnVuY3Rpb24gc2V0UGF1c2UocCl7CiAgaWYoc3QhPT0ncGxheScpcmV0dXJuOwogIHBhdXNlZD1wO1NORC5wYXVzZShwKTtib29zdEluPWZhbHNlO2Jvb3N0SWQ9bnVsbDtqb3kuaWQ9bnVsbDtqb3kub249ZmFsc2U7CiAgJCgncHonKS5oaWRkZW49IXA7JCgnbWFpbicpLmhpZGRlbj10cnVlOyQoJ3Nob3AnKS5oaWRkZW49dHJ1ZTskKCd1aScpLnN0eWxlLmRpc3BsYXk9cD8nZmxleCc6J25vbmUnOwp9CmFkZEV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLGU9PnsKICBpZihlLmNvZGU9PT0nS2V5UCd8fGUuY29kZT09PSdFc2NhcGUnKXtpZihzdD09PSdwbGF5JylzZXRQYXVzZSghcGF1c2VkKTtyZXR1cm59CiAgaWYoZS5jb2RlIT09J1NwYWNlJylyZXR1cm47CiAgZS5wcmV2ZW50RGVmYXVsdCgpOwogIGlmKHN0PT09J3BsYXknKXtpZighcGF1c2VkKWJvb3N0SW49dHJ1ZX0KICBlbHNlIGlmKCQoJ3VpJykuc3R5bGUuZGlzcGxheSE9PSdub25lJyYmISQoJ21haW4nKS5oaWRkZW4mJihzdD09PSdyZWFkeSd8fHQtb3ZlckF0Pi44KSlzdGFydCgpOwp9KTsKYWRkRXZlbnRMaXN0ZW5lcigna2V5dXAnLGU9PntpZihlLmNvZGU9PT0nU3BhY2UnKWJvb3N0SW49ZmFsc2V9KTsKYWRkRXZlbnRMaXN0ZW5lcignYmx1cicsKCk9Pntib29zdEluPWZhbHNlO2lmKHN0PT09J3BsYXknKXNldFBhdXNlKHRydWUpfSk7CmRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ3Zpc2liaWxpdHljaGFuZ2UnLCgpPT57aWYoZG9jdW1lbnQuaGlkZGVuJiZzdD09PSdwbGF5JylzZXRQYXVzZSh0cnVlKX0pOwoKLy8gLS0tLSBtZW51ICYgc2tpbiBzaG9wCmZ1bmN0aW9uIHdhbCgpe2NvbnN0IHE9J9in2YXYqtuM2KfYsjogJytzYXZlLndhbGxldDskKCd3YWwnKS50ZXh0Q29udGVudD1xOyQoJ3dhbDInKS50ZXh0Q29udGVudD1xfQpmdW5jdGlvbiBzaG93VUkob3Zlcil7CiAgJCgnc2hvcCcpLmhpZGRlbj10cnVlOyQoJ3B6JykuaGlkZGVuPXRydWU7JCgnbWFpbicpLmhpZGRlbj1mYWxzZTsKICAkKCd0dGwnKS50ZXh0Q29udGVudD1vdmVyPyfZhdix2K/bjCEnOifZhdin2LHYrtmI2LEnOyQoJ3R0bCcpLnN0eWxlLmNvbG9yPW92ZXI/JyNmZjZiOGEnOicjN2FlN2M3JzsKICAkKCdzdWInKS5pbm5lckhUTUw9b3Zlcj8oJ9i32YjZhCDZhtmH2KfbjNuMOiAnK01hdGguZmxvb3IoUC5tYXNzKSsnICZuYnNwO3wmbmJzcDsg2qnYtNiq2YfigIzZh9inOiAnK1Aua2lsbHMrJzxicj7Yp9mF2KrbjNin2LIg2qnYs9io4oCM2LTYr9mHOiArJytlYXJuZWQrJyAmbmJzcDt8Jm5ic3A7INix2qnZiNix2K86ICcrYmVzdCkKICAgIDon2KjYpyDYrNmI24zigIzYp9iz2KrbjNqpICjbjNinINmF2YjYsykg2KzZh9iqINmF2KfYsSDYsdmIINiq2LnbjNuM2YYg2qnZhiDZiCDYutiw2Kcg2KjYrtmI2LEuPGJyPtiz2LEg2YXYp9ixINiv24zar9mH4oCM2KfbjCDaqdmHINio2Ycg2KjYr9mGINiq2Ygg2KjYrtmI2LHZh9iMINmF24zigIzZhduM2LHZhy48YnI+2KjYpyDYp9mF2KrbjNin2LLZh9inINin2LPaqduM2YbigIzZh9in24wg2qnZhduM2KfYqCDYqtinINin2LPYt9mI2LHZh+KAjNin24wg2KjYrtixISc7CiAgJCgncGxheScpLnRleHRDb250ZW50PW92ZXI/J9io2KfYstuMINiv2YjYqNin2LHZhyc6J9i02LHZiNi5INio2KfYstuMJzsKICB3YWwoKTskKCd1aScpLnN0eWxlLmRpc3BsYXk9J2ZsZXgnOwp9CmNvbnN0IHByZXZzPVtdO2xldCBzaG9wT249ZmFsc2U7CmZ1bmN0aW9uIHJlbmRlclNob3AoKXsKICBjb25zdCBnPSQoJ2dyaWQnKTtnLmlubmVySFRNTD0nJztwcmV2cy5sZW5ndGg9MDsKICBmb3IoY29uc3QgayBvZiBTS0lOUyl7CiAgICBjb25zdCBvd249c2F2ZS5vd25lZC5pbmNsdWRlcyhrLmlkKSxvbj1zYXZlLnNlbD09PWsuaWQscnI9UkFSW2sucl07CiAgICBjb25zdCBkPWRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO2QuY2xhc3NOYW1lPSdzaycrKG9uPycgb24nOicnKTsKICAgIGNvbnN0IGN2PWRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2NhbnZhcycpO2N2LndpZHRoPTI2MDtjdi5oZWlnaHQ9ODg7ZC5hcHBlbmRDaGlsZChjdik7CiAgICBkLmluc2VydEFkamFjZW50SFRNTCgnYmVmb3JlZW5kJywnPGI+JytrLm4rJzwvYj48aSBzdHlsZT0iY29sb3I6Jytyci5jb2wrJyI+Jytyci5uKyc8L2k+Jyk7CiAgICBjb25zdCBiPWRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2J1dHRvbicpOwogICAgYi50ZXh0Q29udGVudD1vbj8n2YHYudin2YQg4pyTJzpvd24/J9in2YbYqtiu2KfYqCc6J9iu2LHbjNivICcray5wOwogICAgYi5kaXNhYmxlZD1vbnx8KCFvd24mJnNhdmUud2FsbGV0PGsucCk7CiAgICBiLm9uY2xpY2s9KCk9PntpZihvd24pe3NhdmUuc2VsPWsuaWQ7U05ELmVxdWlwKCl9ZWxzZSBpZihzYXZlLndhbGxldD49ay5wKXtzYXZlLndhbGxldC09ay5wO3NhdmUub3duZWQucHVzaChrLmlkKTtzYXZlLnNlbD1rLmlkO1NORC5idXkoay5yKX1lbHNlIFNORC5kZW55KCk7c3YoKTt3YWwoKTtyZW5kZXJTaG9wKCl9OwogICAgZC5hcHBlbmRDaGlsZChiKTtnLmFwcGVuZENoaWxkKGQpO3ByZXZzLnB1c2goW2N2LGtdKTsKICB9Cn0KZnVuY3Rpb24gcHJldkxvb3Aobm93KXsKICBpZighc2hvcE9uKXJldHVybjsKICBmb3IoY29uc3RbY3Ysa11vZiBwcmV2cyl7CiAgICBjb25zdCBxPWN2LmdldENvbnRleHQoJzJkJyk7cS5jbGVhclJlY3QoMCwwLDI2MCw4OCk7CiAgICBmb3IobGV0IGk9MTM7aT49MDtpLS0pewogICAgICBjb25zdCBweD0yMzYtaSoxNyxweT00NCtNYXRoLnNpbihpKi41NSkqMTgscj0xNy1pKi4zNTsKICAgICAgaWYoay5hdXJhJiZpJTQ9PT0wKXtxLmZpbGxTdHlsZT0naHNsYSgnK2suaCsnLDkwJSw2MCUsLjE4KSc7cS5iZWdpblBhdGgoKTtxLmFyYyhweCxweSxyKjEuNywwLFRBVSk7cS5maWxsKCl9CiAgICAgIHEuZmlsbFN0eWxlPWsuY29sKGksMTQsbm93LzEwMDApO3EuYmVnaW5QYXRoKCk7cS5hcmMocHgscHksciwwLFRBVSk7cS5maWxsKCk7CiAgICB9CiAgICBxLmZpbGxTdHlsZT0nI2ZmZic7cS5iZWdpblBhdGgoKTtxLmFyYygyNDIsMzcsNiwwLFRBVSk7cS5hcmMoMjQyLDUzLDYsMCxUQVUpO3EuZmlsbCgpOwogICAgcS5maWxsU3R5bGU9JyMxNjE0MjMnO3EuYmVnaW5QYXRoKCk7cS5hcmMoMjQ0LDM3LDMsMCxUQVUpO3EuYXJjKDI0NCw1MywzLDAsVEFVKTtxLmZpbGwoKTsKICB9CiAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKHByZXZMb29wKTsKfQokKCdwbGF5Jykub25jbGljaz0oKT0+e2lmKHN0PT09J3JlYWR5J3x8KHN0PT09J292ZXInJiZ0LW92ZXJBdD4uOCkpc3RhcnQoKX07CiQoJ3NrYnRuJykub25jbGljaz0oKT0+eyQoJ21haW4nKS5oaWRkZW49dHJ1ZTskKCdzaG9wJykuaGlkZGVuPWZhbHNlO3JlbmRlclNob3AoKTtzaG9wT249dHJ1ZTtyZXF1ZXN0QW5pbWF0aW9uRnJhbWUocHJldkxvb3ApfTsKJCgnYmFjaycpLm9uY2xpY2s9KCk9PnskKCdzaG9wJykuaGlkZGVuPXRydWU7JCgnbWFpbicpLmhpZGRlbj1mYWxzZTtzaG9wT249ZmFsc2U7d2FsKCl9OwokKCdyZXN1bWUnKS5vbmNsaWNrPSgpPT5zZXRQYXVzZShmYWxzZSk7CiQoJ3F1aXQnKS5vbmNsaWNrPSgpPT57cGF1c2VkPWZhbHNlOyQoJ3B6JykuaGlkZGVuPXRydWU7UC5xdWl0PXRydWU7a2lsbChQLG51bGwpfTsKc2hvd1VJKGZhbHNlKTsKCnB0cj17eDpXLzIrMTAwLHk6SC8yfTsKJCgnaG9tZScpLm9uY2xpY2s9JCgnaG9tZTInKS5vbmNsaWNrPSgpPT5lbWl0KCdob21lJywwKTsKY29uc3Qgcm90RWw9ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3JvdCcpOwpjb25zdCBpc0Jsb2NrZWQ9KCk9Pm1hdGNoTWVkaWEoJyhwb2ludGVyOmNvYXJzZSknKS5tYXRjaGVzJiZpbm5lcldpZHRoPmlubmVySGVpZ2h0KjEuMDI7CmxldCBsYXN0PXBlcmZvcm1hbmNlLm5vdygpOwpmdW5jdGlvbiBsb29wKG4pewogIGNvbnN0IHJkdD1NYXRoLm1pbigobi1sYXN0KS8xMDAwLC4wNSk7bGFzdD1uOwogIGdBdmcrPShyZHQtZ0F2ZykqLjA1OwogIGlmKGdBdmc+LjAyNyYmZnhRPi40KWZ4UT1NYXRoLm1heCguNCxmeFEtLjAxKTtlbHNlIGlmKGdBdmc8LjAxOSYmZnhRPDEpZnhRPU1hdGgubWluKDEsZnhRKy4wMDQpOwogIGNvbnN0IGJsPWlzQmxvY2tlZCgpO3JvdEVsLnN0eWxlLmRpc3BsYXk9Ymw/J2ZsZXgnOidub25lJzsKICB0cys9KDEtdHMpKk1hdGgubWluKDEscmR0KjIuNCk7CiAgaWYoIXBhdXNlZCYmIWJsKXtpZihoaXRTdG9wPjApe2hpdFN0b3AtPXJkdDtmeFVwZGF0ZShyZHQqLjIpfWVsc2UgdXBkYXRlKHJkdCp0cyl9CiAgZm9sbG93KCk7ZHJhdygpOwogIGlmKHN0PT09J292ZXInJiYhdWlTaG93biYmdC1vdmVyQXQ+Ljgpe3VpU2hvd249dHJ1ZTtzaG93VUkodHJ1ZSl9CiAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKGxvb3ApOwp9CnJlcXVlc3RBbmltYXRpb25GcmFtZShsb29wKTsKPC9zY3JpcHQ+CjwvYm9keT4KPC9odG1sPgo=',doodle:'PCFET0NUWVBFIGh0bWw+CjxodG1sIGxhbmc9ImZhIiBkaXI9InJ0bCI+CjxoZWFkPgo8bWV0YSBjaGFyc2V0PSJ1dGYtOCI+CjxtZXRhIG5hbWU9InZpZXdwb3J0IiBjb250ZW50PSJ3aWR0aD1kZXZpY2Utd2lkdGgsaW5pdGlhbC1zY2FsZT0xLG1heGltdW0tc2NhbGU9MSx1c2VyLXNjYWxhYmxlPW5vIj4KPHRpdGxlPtm+2LHYtCDYr9mI2K/ZhDwvdGl0bGU+CjxzdHlsZT4KICBodG1sLGJvZHl7bWFyZ2luOjA7aGVpZ2h0OjEwMCU7YmFja2dyb3VuZDojMjYzMzJiO292ZXJmbG93OmhpZGRlbjt0b3VjaC1hY3Rpb246bm9uZTsKICAgIC13ZWJraXQtdXNlci1zZWxlY3Q6bm9uZTt1c2VyLXNlbGVjdDpub25lOy13ZWJraXQtdGFwLWhpZ2hsaWdodC1jb2xvcjp0cmFuc3BhcmVudH0KICAjd3JhcHtwb3NpdGlvbjpmaXhlZDtpbnNldDowO2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OmNlbnRlcn0KICBjYW52YXN7ZGlzcGxheTpibG9jaztib3gtc2hhZG93OjAgMCAwIDNweCAjMTYyMDFhLDAgMjBweCA2MHB4IHJnYmEoMCwwLDAsLjQ1KTt0b3VjaC1hY3Rpb246bm9uZX0KPC9zdHlsZT4KPC9oZWFkPgo8Ym9keT4KPGRpdiBpZD0id3JhcCI+PGNhbnZhcyBpZD0iYyI+PC9jYW52YXM+PC9kaXY+CjxzY3JpcHQ+CigoKSA9PiB7CiAgY29uc3QgVyA9IDQwMCwgSCA9IDY0MDsKICAvLyDYsdiy2YjZhNmI2LTZhiDZhdit2K/ZiNivINio2LHYp9uMINqv2YjYtNuM4oCM2YfYp9uMINi22LnbjNmB4oCM2KrYsQogIGNvbnN0IFJFUyA9IE1hdGgubWluKHdpbmRvdy5kZXZpY2VQaXhlbFJhdGlvIHx8IDEsIDEuNSk7CiAgY29uc3QgY3YgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYycpOwogIGNvbnN0IGN0eCA9IGN2LmdldENvbnRleHQoJzJkJyk7CiAgY3Yud2lkdGggPSBNYXRoLnJvdW5kKFcgKiBSRVMpOyBjdi5oZWlnaHQgPSBNYXRoLnJvdW5kKEggKiBSRVMpOwogIGN0eC5zZXRUcmFuc2Zvcm0oUkVTLCAwLCAwLCBSRVMsIDAsIDApOwoKICBmdW5jdGlvbiBmaXQoKSB7CiAgICBjb25zdCBzID0gTWF0aC5taW4oaW5uZXJXaWR0aCAvIFcsIGlubmVySGVpZ2h0IC8gSCk7CiAgICBjdi5zdHlsZS53aWR0aCA9IE1hdGguZmxvb3IoVyAqIHMpICsgJ3B4JzsKICAgIGN2LnN0eWxlLmhlaWdodCA9IE1hdGguZmxvb3IoSCAqIHMpICsgJ3B4JzsKICB9CiAgYWRkRXZlbnRMaXN0ZW5lcigncmVzaXplJywgZml0KTsgZml0KCk7CgogIGNvbnN0IFBBUEVSID0gJyNmNWYxZTMnLCBJTksgPSAnIzFkMmEyMicsIFJFRCA9ICcjZTA1MjNjJzsKICBjb25zdCBGT05UID0gIlRhaG9tYSwgJ1NlZ29lIFVJJywgc3lzdGVtLXVpLCBzYW5zLXNlcmlmIjsKICBjb25zdCByYW5kID0gKGEsIGIpID0+IGEgKyBNYXRoLnJhbmRvbSgpICogKGIgLSBhKTsKICBjb25zdCBjbGFtcCA9ICh2LCBhLCBiKSA9PiBNYXRoLm1heChhLCBNYXRoLm1pbihiLCB2KSk7CiAgY29uc3QgZmEgPSBuID0+IE1hdGguZmxvb3IobikudG9Mb2NhbGVTdHJpbmcoJ2ZhLUlSJywgeyB1c2VHcm91cGluZzogZmFsc2UgfSk7CgogIGZ1bmN0aW9uIHJyKGcsIHgsIHksIHcsIGgsIHIpIHsKICAgIGcuYmVnaW5QYXRoKCk7CiAgICBnLm1vdmVUbyh4ICsgciwgeSk7CiAgICBnLmFyY1RvKHggKyB3LCB5LCB4ICsgdywgeSArIGgsIHIpOwogICAgZy5hcmNUbyh4ICsgdywgeSArIGgsIHgsIHkgKyBoLCByKTsKICAgIGcuYXJjVG8oeCwgeSArIGgsIHgsIHksIHIpOwogICAgZy5hcmNUbyh4LCB5LCB4ICsgdywgeSwgcik7CiAgICBnLmNsb3NlUGF0aCgpOwogIH0KCiAgLy8gLS0tLS0tLS0tLSBQcmUtcmVuZGVyZWQgc3ByaXRlcyAob25jZSkgLS0tLS0tLS0tLQogIGZ1bmN0aW9uIHNwcml0ZSh3LCBoLCBmbikgewogICAgY29uc3QgYyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2NhbnZhcycpOwogICAgYy53aWR0aCA9IE1hdGguY2VpbCh3ICogUkVTKTsgYy5oZWlnaHQgPSBNYXRoLmNlaWwoaCAqIFJFUyk7CiAgICBjb25zdCBnID0gYy5nZXRDb250ZXh0KCcyZCcpOyBnLnNjYWxlKFJFUywgUkVTKTsKICAgIGZuKGcpOyBjLl93ID0gdzsgYy5faCA9IGg7IHJldHVybiBjOwogIH0KICBjb25zdCBQWCA9IDQsIFBZID0gNTsgLy8gc3ByaXRlIHBhZGRpbmcgYXJvdW5kIGEgNjB4MTIgcGxhdGZvcm0KCiAgZnVuY3Rpb24gcGxhdEJvZHkoZywgdG9wLCBib3QpIHsKICAgIGNvbnN0IGdyID0gZy5jcmVhdGVMaW5lYXJHcmFkaWVudCgwLCBQWSwgMCwgUFkgKyAxMik7CiAgICBnci5hZGRDb2xvclN0b3AoMCwgdG9wKTsgZ3IuYWRkQ29sb3JTdG9wKDEsIGJvdCk7CiAgICBnLmZpbGxTdHlsZSA9IGdyOyBycihnLCBQWCwgUFksIDYwLCAxMiwgNSk7IGcuZmlsbCgpOwogICAgZy5zdHJva2VTdHlsZSA9IElOSzsgZy5saW5lV2lkdGggPSAyLjU7IGcubGluZUpvaW4gPSAncm91bmQnOyBnLnN0cm9rZSgpOwogIH0KICBmdW5jdGlvbiBzaGluZShnKSB7CiAgICBnLnN0cm9rZVN0eWxlID0gJ3JnYmEoMjU1LDI1NSwyNTUsLjU1KSc7IGcubGluZVdpZHRoID0gMjsgZy5iZWdpblBhdGgoKTsKICAgIGcubW92ZVRvKFBYICsgOCwgUFkgKyAzLjUpOyBnLmxpbmVUbyhQWCArIDUwLCBQWSArIDMuNSk7IGcuc3Ryb2tlKCk7CiAgfQoKICBjb25zdCBTUF9HUkVFTiA9IHNwcml0ZSg2OCwgMjIsIGcgPT4gewogICAgcGxhdEJvZHkoZywgJyM5YmRhNzYnLCAnIzRmOTEzOCcpOyBzaGluZShnKTsKICAgIGcuc3Ryb2tlU3R5bGUgPSBJTks7IGcubGluZVdpZHRoID0gMjsgZy5iZWdpblBhdGgoKTsKICAgIGZvciAoY29uc3QgdCBvZiBbMTQsIDMwLCA0Nl0pIHsgZy5tb3ZlVG8oUFggKyB0IC0gMywgUFkgKyAxKTsgZy5saW5lVG8oUFggKyB0LCBQWSAtIDMuNSk7IGcubGluZVRvKFBYICsgdCArIDMsIFBZICsgMSk7IH0KICAgIGcuc3Ryb2tlKCk7CiAgfSk7CiAgY29uc3QgU1BfQkxVRSA9IHNwcml0ZSg2OCwgMjIsIGcgPT4gewogICAgcGxhdEJvZHkoZywgJyM4NmNkZjInLCAnIzNmOGZjNCcpOyBzaGluZShnKTsKICAgIGcuc3Ryb2tlU3R5bGUgPSAnI2ZmZic7IGcubGluZVdpZHRoID0gMjsgZy5saW5lQ2FwID0gJ3JvdW5kJzsgZy5iZWdpblBhdGgoKTsKICAgIGcubW92ZVRvKFBYICsgMTQsIFBZICsgMyk7IGcubGluZVRvKFBYICsgMTAsIFBZICsgNik7IGcubGluZVRvKFBYICsgMTQsIFBZICsgOSk7CiAgICBnLm1vdmVUbyhQWCArIDQ2LCBQWSArIDMpOyBnLmxpbmVUbyhQWCArIDUwLCBQWSArIDYpOyBnLmxpbmVUbyhQWCArIDQ2LCBQWSArIDkpOwogICAgZy5zdHJva2UoKTsKICB9KTsKICBjb25zdCBTUF9CUk9XTiA9IHNwcml0ZSg2OCwgMjIsIGcgPT4gewogICAgcGxhdEJvZHkoZywgJyNkNmFhN2EnLCAnIzk0NjYzOScpOwogICAgZy5zdHJva2VTdHlsZSA9ICdyZ2JhKDgwLDUwLDI1LC40NSknOyBnLmxpbmVXaWR0aCA9IDEuNTsgZy5iZWdpblBhdGgoKTsKICAgIGcubW92ZVRvKFBYICsgNiwgUFkgKyA0KTsgZy5saW5lVG8oUFggKyAyMiwgUFkgKyA0KTsKICAgIGcubW92ZVRvKFBYICsgMzgsIFBZICsgOCk7IGcubGluZVRvKFBYICsgNTQsIFBZICsgOCk7IGcuc3Ryb2tlKCk7CiAgICBnLnN0cm9rZVN0eWxlID0gSU5LOyBnLmxpbmVXaWR0aCA9IDIuNTsgZy5iZWdpblBhdGgoKTsKICAgIGcubW92ZVRvKFBYICsgMjgsIFBZKTsgZy5saW5lVG8oUFggKyAzMywgUFkgKyA1KTsgZy5saW5lVG8oUFggKyAyNywgUFkgKyA4KTsgZy5saW5lVG8oUFggKyAzMiwgUFkgKyAxMik7CiAgICBnLnN0cm9rZSgpOwogIH0pOwogIGNvbnN0IFNQX1NQUklORyA9IHNwcml0ZSgyMiwgMjEsIGcgPT4gewogICAgZy5saW5lSm9pbiA9ICdyb3VuZCc7IGcubGluZUNhcCA9ICdyb3VuZCc7CiAgICBnLnN0cm9rZVN0eWxlID0gSU5LOyBnLmxpbmVXaWR0aCA9IDIuNTsgZy5iZWdpblBhdGgoKTsKICAgIGcubW92ZVRvKDUsIDE5KTsgZy5saW5lVG8oMTcsIDE2KTsgZy5saW5lVG8oNSwgMTMpOyBnLmxpbmVUbygxNywgMTApOyBnLmxpbmVUbygxMSwgOCk7IGcuc3Ryb2tlKCk7CiAgICBjb25zdCBnciA9IGcuY3JlYXRlTGluZWFyR3JhZGllbnQoMCwgMSwgMCwgOCk7CiAgICBnci5hZGRDb2xvclN0b3AoMCwgJyNmMjdhNjMnKTsgZ3IuYWRkQ29sb3JTdG9wKDEsICcjYzkzZDI4Jyk7CiAgICBnLmZpbGxTdHlsZSA9IGdyOyBycihnLCAyLCAxLCAxOCwgNywgMy41KTsgZy5maWxsKCk7IGcubGluZVdpZHRoID0gMi41OyBnLnN0cm9rZSgpOwogIH0pOwogIGZ1bmN0aW9uIGNsb3VkU3ByaXRlKHMpIHsKICAgIHJldHVybiBzcHJpdGUoOTAgKiBzLCA0OCAqIHMsIGcgPT4gewogICAgICBnLnNjYWxlKHMsIHMpOwogICAgICBjb25zdCBjcyA9IFtbMjIsIDMwLCAxM10sIFs0MiwgMjIsIDE3XSwgWzYzLCAzMCwgMTNdLCBbNDIsIDMyLCAxNF1dOwogICAgICBnLnN0cm9rZVN0eWxlID0gJ3JnYmEoNzAsMTAwLDEzMCwuMzgpJzsgZy5saW5lV2lkdGggPSA0OwogICAgICBmb3IgKGNvbnN0IGMgb2YgY3MpIHsgZy5iZWdpblBhdGgoKTsgZy5hcmMoY1swXSwgY1sxXSwgY1syXSwgMCwgNyk7IGcuc3Ryb2tlKCk7IH0KICAgICAgZy5maWxsU3R5bGUgPSAnI2ZmZic7CiAgICAgIGZvciAoY29uc3QgYyBvZiBjcykgeyBnLmJlZ2luUGF0aCgpOyBnLmFyYyhjWzBdLCBjWzFdLCBjWzJdIC0gMSwgMCwgNyk7IGcuZmlsbCgpOyB9CiAgICB9KTsKICB9CiAgY29uc3QgQ0xPVURTID0gW2Nsb3VkU3ByaXRlKDEpLCBjbG91ZFNwcml0ZSguNyldOwoKICAvLyBCYWNrZ3JvdW5kIHBhcGVyIHdpdGggZ3JpZCwgZHJhd24gb25jZSBhbmQgc2Nyb2xsZWQKICBjb25zdCBHUklEUyA9IDI2OwogIGNvbnN0IEJHID0gc3ByaXRlKFcsIEggKyBHUklEUywgZyA9PiB7CiAgICBjb25zdCBnciA9IGcuY3JlYXRlTGluZWFyR3JhZGllbnQoMCwgMCwgMCwgSCArIEdSSURTKTsKICAgIGdyLmFkZENvbG9yU3RvcCgwLCAnI2Y4ZjVlOCcpOyBnci5hZGRDb2xvclN0b3AoMSwgJyNmMWVjZDknKTsKICAgIGcuZmlsbFN0eWxlID0gZ3I7IGcuZmlsbFJlY3QoMCwgMCwgVywgSCArIEdSSURTKTsKICAgIGcuc3Ryb2tlU3R5bGUgPSAnI2QzZGZjZCc7IGcubGluZVdpZHRoID0gMTsgZy5iZWdpblBhdGgoKTsKICAgIGZvciAobGV0IHggPSAxNC41OyB4IDwgVzsgeCArPSBHUklEUykgeyBnLm1vdmVUbyh4LCAwKTsgZy5saW5lVG8oeCwgSCArIEdSSURTKTsgfQogICAgZm9yIChsZXQgeSA9IC41OyB5IDwgSCArIEdSSURTOyB5ICs9IEdSSURTKSB7IGcubW92ZVRvKDAsIHkpOyBnLmxpbmVUbyhXLCB5KTsgfQogICAgZy5zdHJva2UoKTsKICAgIGcuc3Ryb2tlU3R5bGUgPSAncmdiYSgyMTQsOTIsODAsLjM1KSc7IGcubGluZVdpZHRoID0gMjsgZy5iZWdpblBhdGgoKTsKICAgIGcubW92ZVRvKFcgLSA0MCwgMCk7IGcubGluZVRvKFcgLSA0MCwgSCArIEdSSURTKTsgZy5zdHJva2UoKTsKICB9KTsKCiAgY29uc3QgY2xvdWRzID0gQXJyYXkuZnJvbSh7IGxlbmd0aDogNSB9LCAoXywgaSkgPT4gKHsKICAgIHg6IHJhbmQoLTIwLCBXIC0gNjApLCB5MDogaSAqICgoSCArIDEyMCkgLyA1KSArIHJhbmQoLTIwLCAyMCksCiAgICBwYXI6IHJhbmQoLjE4LCAuNCksIGs6IE1hdGgucmFuZG9tKCkgPCAuNSA/IDAgOiAxCiAgfSkpOwoKICAvLyAtLS0tLS0tLS0tIFN0YXRlIC0tLS0tLS0tLS0KICBsZXQgc3RhdGUgPSAnbWVudScsIHBsYXllciwgcGxhdHMsIGdlblksIHNjb3JlLCBiZ09mZiwgYmVzdCA9IDAsIG92ZXJBdCA9IDAsIGZyYW1lID0gMDsKICBsZXQgbGFzdFJlcG9ydCA9IC0xOwogIGZ1bmN0aW9uIHJlcG9ydCh0eXBlLCB2YWx1ZSkgewogICAgdHJ5IHsgd2luZG93LnBhcmVudC5wb3N0TWVzc2FnZSh7c291cmNlOidub3ZhLWFyY2FkZS1lbWJlZCcsIGdhbWU6J2Rvb2RsZScsIHR5cGUsIHNjb3JlOk1hdGgubWF4KDAsTWF0aC5mbG9vcih2YWx1ZXx8MCkpfSwgJyonKTsgfSBjYXRjaChlKSB7fQogIH0KICBsZXQgcHVmZnMgPSBbXTsKICBjb25zdCBrZXlzID0geyBsZWZ0OiBmYWxzZSwgcmlnaHQ6IGZhbHNlIH07CiAgY29uc3Qgam95ID0geyBhY3RpdmU6IGZhbHNlLCBpZDogbnVsbCwgb3g6IDAsIG95OiAwLCB4OiAwLCB2YWw6IDAgfTsKICBjb25zdCBKUiA9IDQ2OwogIGNvbnN0IGlzVG91Y2ggPSAnb250b3VjaHN0YXJ0JyBpbiB3aW5kb3cgfHwgbmF2aWdhdG9yLm1heFRvdWNoUG9pbnRzID4gMDsKCiAgZnVuY3Rpb24gcmVzZXQoKSB7CiAgICBwbGF5ZXIgPSB7IHg6IFcgLyAyLCB5OiBIIC0gMTIwLCB2eDogMCwgdnk6IC0xMywgdzogMzgsIGg6IDQyLCBmYWNlOiAxLCBzcTogMCB9OwogICAgcGxhdHMgPSBbeyB4OiBXIC8gMiAtIDMwLCB5OiBIIC0gNjAsIHc6IDYwLCBoOiAxMiwgdHlwZTogJ24nLCBkaXI6IDAsIHNwZDogMCwgc3ByaW5nOiBmYWxzZSwgYnJva2VuOiBmYWxzZSwgZnY6IDAgfV07CiAgICBnZW5ZID0gSCAtIDYwOyBzY29yZSA9IDA7IGJnT2ZmID0gMDsgcHVmZnMgPSBbXTsKICAgIHdoaWxlIChnZW5ZID4gLTYwKSBnZW5Sb3coKTsKICB9CgogIGZ1bmN0aW9uIGdlblJvdygpIHsKICAgIGNvbnN0IGQgPSBNYXRoLm1pbihzY29yZSAvIDkwMDAsIDEpOwogICAgZ2VuWSAtPSByYW5kKDQyLCA2OCArIGQgKiA1Mik7CiAgICBjb25zdCBtb3ZpbmcgPSBNYXRoLnJhbmRvbSgpIDwgMC4xMiArIDAuMjggKiBkOwogICAgY29uc3QgcCA9IHsKICAgICAgeDogcmFuZCg2LCBXIC0gNjYpLCB5OiBnZW5ZLCB3OiA2MCwgaDogMTIsCiAgICAgIHR5cGU6IG1vdmluZyA/ICdtJyA6ICduJywgZGlyOiBNYXRoLnJhbmRvbSgpIDwgLjUgPyAtMSA6IDEsCiAgICAgIHNwZDogcmFuZCguOCwgMS40KSArIGQgKiAxLjQsCiAgICAgIHNwcmluZzogIW1vdmluZyAmJiBNYXRoLnJhbmRvbSgpIDwgMC4wNywgYnJva2VuOiBmYWxzZSwgZnY6IDAKICAgIH07CiAgICBwbGF0cy5wdXNoKHApOwogICAgaWYgKE1hdGgucmFuZG9tKCkgPCAwLjA4ICsgMC4yNSAqIGQpIHsgLy8gYnJlYWthYmxlIGRlY295cywgbmV2ZXIgb24gdGhlIHNhZmUgcGF0aAogICAgICBsZXQgYnggPSByYW5kKDYsIFcgLSA2NiksIHQgPSAwOwogICAgICB3aGlsZSAoTWF0aC5hYnMoYnggLSBwLngpIDwgNzAgJiYgdCsrIDwgMTApIGJ4ID0gcmFuZCg2LCBXIC0gNjYpOwogICAgICBpZiAoTWF0aC5hYnMoYnggLSBwLngpID49IDcwKQogICAgICAgIHBsYXRzLnB1c2goeyB4OiBieCwgeTogZ2VuWSArIHJhbmQoLTE0LCAxNCksIHc6IDYwLCBoOiAxMiwgdHlwZTogJ2InLCBkaXI6IDAsIHNwZDogMCwgc3ByaW5nOiBmYWxzZSwgYnJva2VuOiBmYWxzZSwgZnY6IDAgfSk7CiAgICB9CiAgfQoKICBmdW5jdGlvbiBwdWZmKHgsIHksIG4pIHsKICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbiAmJiBwdWZmcy5sZW5ndGggPCAyODsgaSsrKQogICAgICBwdWZmcy5wdXNoKHsgeDogeCArIHJhbmQoLTgsIDgpLCB5LCB2eDogcmFuZCgtMS40LCAxLjQpLCB2eTogcmFuZCgtLjcsIC4xKSwgbDogMSwgcjogcmFuZCgyLCA0LjIpIH0pOwogIH0KCiAgZnVuY3Rpb24gc3RhcnQoKSB7IHJlc2V0KCk7IHN0YXRlID0gJ3BsYXknOyBsYXN0UmVwb3J0ID0gLTE7IHJlcG9ydCgnc3RhcnQnLCAwKTsgfQoKICAvLyAtLS0tLS0tLS0tIFVwZGF0ZSAtLS0tLS0tLS0tCiAgZnVuY3Rpb24gdGljaygpIHsKICAgIGZyYW1lKys7CiAgICBpZiAoc3RhdGUgPT09ICdtZW51JykgewogICAgICBwbGF5ZXIudnkgKz0gLjU7IHBsYXllci55ICs9IHBsYXllci52eTsKICAgICAgaWYgKHBsYXllci55ICsgcGxheWVyLmggLyAyID49IEggLSA2MCkgeyBwbGF5ZXIueSA9IEggLSA2MCAtIHBsYXllci5oIC8gMjsgcGxheWVyLnZ5ID0gLTEzOyBwbGF5ZXIuc3EgPSAxOyB9CiAgICAgIHBsYXllci5zcSAqPSAuODU7CiAgICAgIHJldHVybjsKICAgIH0KICAgIGlmIChzdGF0ZSAhPT0gJ3BsYXknKSByZXR1cm47CgogICAgbGV0IGRpciA9IGpveS5hY3RpdmUgPyBqb3kudmFsIDogMDsKICAgIGlmIChrZXlzLmxlZnQpIGRpciAtPSAxOwogICAgaWYgKGtleXMucmlnaHQpIGRpciArPSAxOwogICAgZGlyID0gY2xhbXAoZGlyLCAtMSwgMSk7CiAgICBwbGF5ZXIudnggKz0gKGRpciAqIDUuNiAtIHBsYXllci52eCkgKiAuMjU7CiAgICBpZiAoTWF0aC5hYnMoZGlyKSA+IC4wNSkgcGxheWVyLmZhY2UgPSBkaXIgPiAwID8gMSA6IC0xOwogICAgcGxheWVyLnggKz0gcGxheWVyLnZ4OwogICAgaWYgKHBsYXllci54IDwgLXBsYXllci53IC8gMikgcGxheWVyLnggKz0gVyArIHBsYXllci53OwogICAgaWYgKHBsYXllci54ID4gVyArIHBsYXllci53IC8gMikgcGxheWVyLnggLT0gVyArIHBsYXllci53OwoKICAgIGZvciAoY29uc3QgcCBvZiBwbGF0cykgewogICAgICBpZiAocC50eXBlID09PSAnbScpIHsKICAgICAgICBwLnggKz0gcC5kaXIgKiBwLnNwZDsKICAgICAgICBpZiAocC54IDwgMCkgeyBwLnggPSAwOyBwLmRpciA9IDE7IH0KICAgICAgICBpZiAocC54ID4gVyAtIHAudykgeyBwLnggPSBXIC0gcC53OyBwLmRpciA9IC0xOyB9CiAgICAgIH0KICAgICAgaWYgKHAuYnJva2VuKSB7IHAuZnYgKz0gLjQ1OyBwLnkgKz0gcC5mdjsgfQogICAgfQoKICAgIGNvbnN0IHByZXZCb3R0b20gPSBwbGF5ZXIueSArIHBsYXllci5oIC8gMjsKICAgIHBsYXllci52eSArPSAuNTsgcGxheWVyLnkgKz0gcGxheWVyLnZ5OwogICAgY29uc3QgYm90dG9tID0gcGxheWVyLnkgKyBwbGF5ZXIuaCAvIDI7CgogICAgaWYgKHBsYXllci52eSA+IDApIHsKICAgICAgZm9yIChjb25zdCBwIG9mIHBsYXRzKSB7CiAgICAgICAgaWYgKHAuYnJva2VuKSBjb250aW51ZTsKICAgICAgICBpZiAoIShwcmV2Qm90dG9tIDw9IHAueSArIDMgJiYgYm90dG9tID49IHAueSAmJiBwbGF5ZXIueCArIDE1ID4gcC54ICYmIHBsYXllci54IC0gMTUgPCBwLnggKyBwLncpKSBjb250aW51ZTsKICAgICAgICBpZiAocC50eXBlID09PSAnYicpIHsgcC5icm9rZW4gPSB0cnVlOyBwLmZ2ID0gMTsgcHVmZihwLnggKyAzMCwgcC55LCA1KTsgY29udGludWU7IH0KICAgICAgICBwbGF5ZXIueSA9IHAueSAtIHBsYXllci5oIC8gMjsKICAgICAgICBjb25zdCBzcHJpbmcgPSBwLnNwcmluZyAmJiBNYXRoLmFicyhwbGF5ZXIueCAtIChwLnggKyBwLncgLyAyKSkgPCAyMjsKICAgICAgICBwbGF5ZXIudnkgPSBzcHJpbmcgPyAtMjEgOiAtMTM7CiAgICAgICAgcGxheWVyLnNxID0gMTsKICAgICAgICBwdWZmKHBsYXllci54LCBwLnksIHNwcmluZyA/IDggOiA0KTsKICAgICAgICBicmVhazsKICAgICAgfQogICAgfQogICAgcGxheWVyLnNxICo9IC44NTsKCiAgICBjb25zdCBsaW5lID0gSCAqIC40MjsKICAgIGlmIChwbGF5ZXIueSA8IGxpbmUpIHsKICAgICAgY29uc3QgZCA9IGxpbmUgLSBwbGF5ZXIueTsKICAgICAgcGxheWVyLnkgKz0gZDsgZ2VuWSArPSBkOyBzY29yZSArPSBkOyBiZ09mZiArPSBkOwogICAgICBjb25zdCBzaG93blNjb3JlID0gTWF0aC5mbG9vcihzY29yZSAvIDEwKTsKICAgICAgaWYgKHNob3duU2NvcmUgIT09IGxhc3RSZXBvcnQpIHsgbGFzdFJlcG9ydCA9IHNob3duU2NvcmU7IHJlcG9ydCgnc2NvcmUnLCBzaG93blNjb3JlKTsgfQogICAgICBmb3IgKGNvbnN0IHAgb2YgcGxhdHMpIHAueSArPSBkOwogICAgICBmb3IgKGNvbnN0IHEgb2YgcHVmZnMpIHEueSArPSBkOwogICAgfQogICAgcGxhdHMgPSBwbGF0cy5maWx0ZXIocCA9PiBwLnkgPCBIICsgNjApOwogICAgd2hpbGUgKGdlblkgPiAtNjApIGdlblJvdygpOwoKICAgIGZvciAoY29uc3QgcSBvZiBwdWZmcykgeyBxLnggKz0gcS52eDsgcS55ICs9IHEudnk7IHEubCAtPSAuMDU7IH0KICAgIHB1ZmZzID0gcHVmZnMuZmlsdGVyKHEgPT4gcS5sID4gMCk7CgogICAgaWYgKHBsYXllci55IC0gcGxheWVyLmggLyAyID4gSCArIDIwKSB7CiAgICAgIHN0YXRlID0gJ292ZXInOyBvdmVyQXQgPSBwZXJmb3JtYW5jZS5ub3coKTsKICAgICAgY29uc3QgZmluYWxTY29yZSA9IE1hdGguZmxvb3Ioc2NvcmUgLyAxMCk7CiAgICAgIGJlc3QgPSBNYXRoLm1heChiZXN0LCBmaW5hbFNjb3JlKTsKICAgICAgcmVwb3J0KCdmaW5pc2gnLCBmaW5hbFNjb3JlKTsKICAgICAgam95LmFjdGl2ZSA9IGZhbHNlOwogICAgfQogIH0KCiAgLy8gLS0tLS0tLS0tLSBEcmF3aW5nIC0tLS0tLS0tLS0KICBmdW5jdGlvbiBkcmF3QmFja2dyb3VuZCgpIHsKICAgIGN0eC5kcmF3SW1hZ2UoQkcsIDAsIChiZ09mZiAlIEdSSURTKSAtIEdSSURTLCBXLCBIICsgR1JJRFMpOwogICAgY29uc3QgYSA9IE1hdGgubWluKHNjb3JlIC8gMjUwMDAsIC4yKTsKICAgIGlmIChhID4gLjAwNSkgeyBjdHguZmlsbFN0eWxlID0gYHJnYmEoMTEwLDE3MCwyMjUsJHthfSlgOyBjdHguZmlsbFJlY3QoMCwgMCwgVywgSCk7IH0KICAgIGN0eC5nbG9iYWxBbHBoYSA9IC44OwogICAgZm9yIChjb25zdCBjIG9mIGNsb3VkcykgewogICAgICBjb25zdCB5ID0gKGMueTAgKyBiZ09mZiAqIGMucGFyKSAlIChIICsgMTIwKSAtIDYwOwogICAgICBjb25zdCBzID0gQ0xPVURTW2Mua107CiAgICAgIGN0eC5kcmF3SW1hZ2UocywgYy54LCB5LCBzLl93LCBzLl9oKTsKICAgIH0KICAgIGN0eC5nbG9iYWxBbHBoYSA9IDE7CiAgfQoKICBmdW5jdGlvbiBkcmF3UGxhdGZvcm0ocCkgewogICAgaWYgKHAudHlwZSA9PT0gJ2InICYmIHAuYnJva2VuKSB7CiAgICAgIGNvbnN0IHQgPSBNYXRoLm1pbihwLmZ2IC8gOCwgMSksIGh3ID0gMzQ7CiAgICAgIGN0eC5zYXZlKCk7IGN0eC50cmFuc2xhdGUocC54LCBwLnkpOyBjdHgucm90YXRlKC0uNCAqIHQpOwogICAgICBjdHguZHJhd0ltYWdlKFNQX0JST1dOLCAwLCAwLCBodyAqIFJFUywgU1BfQlJPV04uaGVpZ2h0LCAtUFgsIC1QWSwgaHcsIFNQX0JST1dOLl9oKTsKICAgICAgY3R4LnJlc3RvcmUoKTsKICAgICAgY3R4LnNhdmUoKTsgY3R4LnRyYW5zbGF0ZShwLnggKyBwLncsIHAueSk7IGN0eC5yb3RhdGUoLjQgKiB0KTsKICAgICAgY3R4LmRyYXdJbWFnZShTUF9CUk9XTiwgaHcgKiBSRVMsIDAsIFNQX0JST1dOLndpZHRoIC0gaHcgKiBSRVMsIFNQX0JST1dOLmhlaWdodCwgaHcgLSA2MCAtIFBYLCAtUFksIFNQX0JST1dOLl93IC0gaHcsIFNQX0JST1dOLl9oKTsKICAgICAgY3R4LnJlc3RvcmUoKTsKICAgICAgcmV0dXJuOwogICAgfQogICAgY3R4LmZpbGxTdHlsZSA9ICdyZ2JhKDI5LDQyLDM0LC4xMyknOwogICAgcnIoY3R4LCBwLnggKyAyLCBwLnkgKyA2LCBwLncsIHAuaCwgNSk7IGN0eC5maWxsKCk7CiAgICBjb25zdCBzID0gcC50eXBlID09PSAnbScgPyBTUF9CTFVFIDogcC50eXBlID09PSAnYicgPyBTUF9CUk9XTiA6IFNQX0dSRUVOOwogICAgY3R4LmRyYXdJbWFnZShzLCBwLnggLSBQWCwgcC55IC0gUFksIHMuX3csIHMuX2gpOwogICAgaWYgKHAuc3ByaW5nKSBjdHguZHJhd0ltYWdlKFNQX1NQUklORywgcC54ICsgcC53IC8gMiAtIDExLCBwLnkgLSAxNywgU1BfU1BSSU5HLl93LCBTUF9TUFJJTkcuX2gpOwogIH0KCiAgLy8gbG9jYWwtc3BhY2UgZ3JhZGllbnRzIGZvciB0aGUgcGxheWVyIChjcmVhdGVkIG9uY2UpCiAgY29uc3QgZ0JvZHkgPSBjdHguY3JlYXRlTGluZWFyR3JhZGllbnQoMCwgLTIxLCAwLCAyMSk7CiAgZ0JvZHkuYWRkQ29sb3JTdG9wKDAsICcjZmZjNjg0Jyk7IGdCb2R5LmFkZENvbG9yU3RvcCgxLCAnI2VlODY0NScpOwoKICBmdW5jdGlvbiBkcmF3UGxheWVyKHB4LCBweSkgewogICAgY29uc3QgZiA9IHBsYXllci5mYWNlOwogICAgY29uc3Qgc3QgPSBjbGFtcCgtcGxheWVyLnZ5IC8gMTQsIC0xLCAxKTsKICAgIGN0eC5zYXZlKCk7CiAgICBjdHgudHJhbnNsYXRlKHB4LCBweSk7CiAgICBjdHguc2NhbGUoMSAtIC4wOCAqIHN0ICsgLjE0ICogcGxheWVyLnNxLCAxICsgLjEyICogc3QgLSAuMiAqIHBsYXllci5zcSk7CiAgICBjdHgubGluZUpvaW4gPSAncm91bmQnOyBjdHgubGluZUNhcCA9ICdyb3VuZCc7CiAgICBjdHguc3Ryb2tlU3R5bGUgPSBJTks7IGN0eC5saW5lV2lkdGggPSAzOwogICAgY29uc3QgbGVnID0gNyArIChzdCA+IDAgPyA1ICogc3QgOiAwKTsKICAgIGN0eC5iZWdpblBhdGgoKTsKICAgIGZvciAoY29uc3QgbHggb2YgWy05LCA5XSkgewogICAgICBjdHgubW92ZVRvKGx4LCAxOCk7IGN0eC5saW5lVG8obHgsIDIxICsgbGVnKTsgY3R4LmxpbmVUbyhseCArIGYgKiA1LCAyMSArIGxlZyk7CiAgICB9CiAgICBjdHguc3Ryb2tlKCk7CiAgICAvLyBlYXIgdHVmdAogICAgY3R4LmxpbmVXaWR0aCA9IDIuNTsgY3R4LmJlZ2luUGF0aCgpOwogICAgY3R4Lm1vdmVUbygtZiAqIDQsIC0yMCk7IGN0eC5xdWFkcmF0aWNDdXJ2ZVRvKC1mICogMTAsIC0zMiwgLWYgKiAxNSwgLTI3KTsKICAgIGN0eC5tb3ZlVG8oLWYgKiAxLCAtMjApOyBjdHgucXVhZHJhdGljQ3VydmVUbygtZiAqIDMsIC0zNCwgZiAqIDMsIC0zMyk7CiAgICBjdHguc3Ryb2tlKCk7CiAgICAvLyBib2R5CiAgICBjdHguZmlsbFN0eWxlID0gZ0JvZHk7IHJyKGN0eCwgLTE5LCAtMjEsIDM4LCA0MiwgMTUpOyBjdHguZmlsbCgpOyBjdHguc3Ryb2tlKCk7CiAgICAvLyBiZWxseSArIGNoZWVrCiAgICBjdHguZmlsbFN0eWxlID0gJ3JnYmEoMjU1LDI0MCwyMDUsLjY1KSc7IGN0eC5iZWdpblBhdGgoKTsgY3R4LmVsbGlwc2UoLWYgKiAyLCA5LCAxMSwgOCwgMCwgMCwgNyk7IGN0eC5maWxsKCk7CiAgICBjdHguZmlsbFN0eWxlID0gJ3JnYmEoMjI0LDgyLDYwLC4zNSknOyBjdHguYmVnaW5QYXRoKCk7IGN0eC5hcmMoZiAqIDksIDIsIDMuNCwgMCwgNyk7IGN0eC5maWxsKCk7CiAgICAvLyBzbm91dAogICAgY3R4LmZpbGxTdHlsZSA9ICcjZmZiMzZhJzsKICAgIHJyKGN0eCwgZiA+IDAgPyAxNiA6IC0yOCwgLTYsIDEyLCAxMCwgNCk7IGN0eC5maWxsKCk7IGN0eC5saW5lV2lkdGggPSAyLjU7IGN0eC5zdHJva2UoKTsKICAgIGN0eC5maWxsU3R5bGUgPSBJTks7IGN0eC5iZWdpblBhdGgoKTsgY3R4LmFyYyhmICogMjMsIC0yLCAxLjMsIDAsIDcpOyBjdHguZmlsbCgpOwogICAgLy8gZXllcwogICAgZm9yIChjb25zdCBleCBvZiBbZiAqIDMsIGYgKiAxM10pIHsKICAgICAgY3R4LmZpbGxTdHlsZSA9ICcjZmZmJzsgY3R4LmJlZ2luUGF0aCgpOyBjdHguYXJjKGV4LCAtOSwgNC42LCAwLCA3KTsgY3R4LmZpbGwoKTsKICAgICAgY3R4LmxpbmVXaWR0aCA9IDEuODsgY3R4LnN0cm9rZSgpOwogICAgICBjdHguZmlsbFN0eWxlID0gSU5LOyBjdHguYmVnaW5QYXRoKCk7IGN0eC5hcmMoZXggKyBmICogMS40LCAtOSwgMiwgMCwgNyk7IGN0eC5maWxsKCk7CiAgICB9CiAgICBjdHgucmVzdG9yZSgpOwogIH0KCiAgZnVuY3Rpb24gZHJhd1BsYXllcldyYXBwZWQoKSB7CiAgICBmb3IgKGNvbnN0IG9mZiBvZiBbLVcsIDAsIFddKSB7CiAgICAgIGNvbnN0IHggPSBwbGF5ZXIueCArIG9mZjsKICAgICAgaWYgKHggPiAtNDUgJiYgeCA8IFcgKyA0NSkgZHJhd1BsYXllcih4LCBwbGF5ZXIueSk7CiAgICB9CiAgfQoKICBmdW5jdGlvbiBkcmF3RngoKSB7CiAgICBmb3IgKGNvbnN0IHEgb2YgcHVmZnMpIHsKICAgICAgY3R4Lmdsb2JhbEFscGhhID0gcS5sICogLjU1OyBjdHguZmlsbFN0eWxlID0gJyM3ZjhmODQnOwogICAgICBjdHguYmVnaW5QYXRoKCk7IGN0eC5hcmMocS54LCBxLnksIHEuciAqICgxLjUgLSBxLmwgKiAuNSksIDAsIDcpOyBjdHguZmlsbCgpOwogICAgfQogICAgY3R4Lmdsb2JhbEFscGhhID0gMTsKICAgIGlmIChzdGF0ZSA9PT0gJ3BsYXknICYmIHBsYXllci52eSA8IC0xNSkgewogICAgICBjdHguc3Ryb2tlU3R5bGUgPSAncmdiYSgyOSw0MiwzNCwuMjgpJzsgY3R4LmxpbmVXaWR0aCA9IDI7IGN0eC5saW5lQ2FwID0gJ3JvdW5kJzsgY3R4LmJlZ2luUGF0aCgpOwogICAgICBmb3IgKGxldCBpID0gMDsgaSA8IDU7IGkrKykgewogICAgICAgIGNvbnN0IHggPSBwbGF5ZXIueCArIChpIC0gMikgKiAxMSwgeSA9IHBsYXllci55ICsgMzAgKyAoKGZyYW1lICogNCArIGkgKiAxMykgJSAyNik7CiAgICAgICAgY3R4Lm1vdmVUbyh4LCB5KTsgY3R4LmxpbmVUbyh4LCB5ICsgMTQpOwogICAgICB9CiAgICAgIGN0eC5zdHJva2UoKTsKICAgIH0KICB9CgogIGZ1bmN0aW9uIHRleHQoc3RyLCB4LCB5LCBzaXplLCB3ZWlnaHQsIGNvbG9yLCBhbGlnbikgewogICAgY3R4LmZvbnQgPSBgJHt3ZWlnaHR9ICR7c2l6ZX1weCAke0ZPTlR9YDsKICAgIGN0eC50ZXh0QWxpZ24gPSBhbGlnbiB8fCAnY2VudGVyJzsgY3R4LnRleHRCYXNlbGluZSA9ICdtaWRkbGUnOwogICAgY3R4LmZpbGxTdHlsZSA9IGNvbG9yIHx8IElOSzsgY3R4LmZpbGxUZXh0KHN0ciwgeCwgeSk7CiAgfQogIGZ1bmN0aW9uIHBhbmVsKHgsIHksIHcsIGgpIHsKICAgIGN0eC5maWxsU3R5bGUgPSBJTks7IHJyKGN0eCwgeCArIDUsIHkgKyA1LCB3LCBoLCAxNCk7IGN0eC5maWxsKCk7CiAgICBjdHguZmlsbFN0eWxlID0gUEFQRVI7IHJyKGN0eCwgeCwgeSwgdywgaCwgMTQpOyBjdHguZmlsbCgpOwogICAgY3R4LnN0cm9rZVN0eWxlID0gSU5LOyBjdHgubGluZVdpZHRoID0gMzsgY3R4LnN0cm9rZSgpOwogIH0KCiAgZnVuY3Rpb24gZHJhd0hVRCgpIHsKICAgIGN0eC5maWxsU3R5bGUgPSAncmdiYSgyNDUsMjQxLDIyNywuODgpJzsgcnIoY3R4LCBXIC0gMTUwLCAxMCwgMTQwLCAzMCwgMTUpOyBjdHguZmlsbCgpOwogICAgY3R4LnN0cm9rZVN0eWxlID0gSU5LOyBjdHgubGluZVdpZHRoID0gMi41OyBjdHguc3Ryb2tlKCk7CiAgICB0ZXh0KCfYp9mF2KrbjNin2LI6ICcgKyBmYShzY29yZSAvIDEwKSwgVyAtIDgwLCAyNS41LCAxNywgJ2JvbGQnLCBJTkspOwogICAgdGV4dCgn2KjZh9iq2LHbjNmGOiAnICsgZmEoTWF0aC5tYXgoYmVzdCwgc2NvcmUgLyAxMCkpLCAxNCwgMjUsIDEzLCAnbm9ybWFsJywgJyM1NTY0NWEnLCAnbGVmdCcpOwogIH0KCiAgZnVuY3Rpb24gZHJhd0pveXN0aWNrKCkgewogICAgbGV0IG94LCBveSwga3gsIGE7CiAgICBpZiAoam95LmFjdGl2ZSkgeyBveCA9IGpveS5veDsgb3kgPSBqb3kub3k7IGt4ID0gb3ggKyBqb3kudmFsICogSlI7IGEgPSAxOyB9CiAgICBlbHNlIGlmIChpc1RvdWNoKSB7IG94ID0gNzQ7IG95ID0gSCAtIDc0OyBreCA9IG94OyBhID0gLjQ1OyB9CiAgICBlbHNlIHJldHVybjsKICAgIGN0eC5nbG9iYWxBbHBoYSA9IGE7CiAgICBjdHguZmlsbFN0eWxlID0gJ3JnYmEoMjksNDIsMzQsLjEyKSc7IGN0eC5zdHJva2VTdHlsZSA9ICdyZ2JhKDI5LDQyLDM0LC40NSknOyBjdHgubGluZVdpZHRoID0gMzsKICAgIHJyKGN0eCwgb3ggLSBKUiAtIDI0LCBveSAtIDMwLCAoSlIgKyAyNCkgKiAyLCA2MCwgMzApOyBjdHguZmlsbCgpOyBjdHguc3Ryb2tlKCk7CiAgICBjdHguc3Ryb2tlU3R5bGUgPSAncmdiYSgyOSw0MiwzNCwuNSknOyBjdHgubGluZVdpZHRoID0gMzsgY3R4LmxpbmVDYXAgPSAncm91bmQnOyBjdHgubGluZUpvaW4gPSAncm91bmQnOwogICAgY3R4LmJlZ2luUGF0aCgpOwogICAgY3R4Lm1vdmVUbyhveCAtIEpSIC0gOCwgb3kgLSA3KTsgY3R4LmxpbmVUbyhveCAtIEpSIC0gMTUsIG95KTsgY3R4LmxpbmVUbyhveCAtIEpSIC0gOCwgb3kgKyA3KTsKICAgIGN0eC5tb3ZlVG8ob3ggKyBKUiArIDgsIG95IC0gNyk7IGN0eC5saW5lVG8ob3ggKyBKUiArIDE1LCBveSk7IGN0eC5saW5lVG8ob3ggKyBKUiArIDgsIG95ICsgNyk7CiAgICBjdHguc3Ryb2tlKCk7CiAgICBjdHguZmlsbFN0eWxlID0gJ3JnYmEoMjksNDIsMzQsLjcpJzsgY3R4LmJlZ2luUGF0aCgpOyBjdHguYXJjKGt4LCBveSwgMjIsIDAsIDcpOyBjdHguZmlsbCgpOwogICAgY3R4LmZpbGxTdHlsZSA9ICdyZ2JhKDI1NSwyNTUsMjU1LC4zNSknOyBjdHguYmVnaW5QYXRoKCk7IGN0eC5hcmMoa3ggLSA2LCBveSAtIDcsIDcsIDAsIDcpOyBjdHguZmlsbCgpOwogICAgY3R4Lmdsb2JhbEFscGhhID0gMTsKICB9CgogIGZ1bmN0aW9uIHJlbmRlcigpIHsKICAgIGRyYXdCYWNrZ3JvdW5kKCk7CiAgICBmb3IgKGNvbnN0IHAgb2YgcGxhdHMpIGRyYXdQbGF0Zm9ybShwKTsKICAgIGRyYXdGeCgpOwogICAgaWYgKHN0YXRlICE9PSAnb3ZlcicpIGRyYXdQbGF5ZXJXcmFwcGVkKCk7CgogICAgaWYgKHN0YXRlID09PSAncGxheScpIHsgZHJhd0hVRCgpOyBkcmF3Sm95c3RpY2soKTsgfQoKICAgIGlmIChzdGF0ZSA9PT0gJ21lbnUnKSB7CiAgICAgIHBhbmVsKDQwLCAxMTAsIFcgLSA4MCwgMTkwKTsKICAgICAgdGV4dCgn2b7Ysdi0INiv2YjYr9mEJywgVyAvIDIsIDE2NSwgNDYsICdib2xkJywgSU5LKTsKICAgICAgdGV4dCgn2KrYpyDYrNin24zbjCDaqdmHINmF24zigIzYtNmI2K8g2KjYp9mE2Kcg2KjYsdmIJywgVyAvIDIsIDIxMiwgMTYsICdub3JtYWwnLCAnIzRhNWE1MCcpOwogICAgICB0ZXh0KCfYqNix2KfbjCDYtNix2YjYudiMINmE2YXYsyDaqdmGINuM2Kcg2YHYp9i12YTZhyDYsdinINio2LLZhicsIFcgLyAyLCAyNjIsIDE1LCAnYm9sZCcsIFJFRCk7CiAgICAgIHRleHQoJ9it2LHaqdiqOiDYp9mG2q/YtNiq2Kog2LHYpyDYsdmI24wg2LXZgdit2Ycg2Kjar9iw2KfYsSDZiCDahtm+INuM2Kcg2LHYp9iz2Kog2Kjaqdi0JywgVyAvIDIsIDM2MCwgMTMsICdub3JtYWwnLCAnIzRhNWE1MCcpOwogICAgICB0ZXh0KCfYsdmI24wg2qnYp9mF2b7bjNmI2KrYsTog2qnZhNuM2K/Zh9in24wg4oaQINmIIOKGkicsIFcgLyAyLCAzODQsIDEzLCAnbm9ybWFsJywgJyM0YTVhNTAnKTsKICAgICAgdGV4dCgn2YHZhtixINmC2LHZhdiyINiq2Ygg2LHYpyDYrtuM2YTbjCDYqNin2YTYp9iq2LEg2YXbjOKAjNio2LHYr9ibINix2YjbjCDYqtiu2KrZh9mUINmC2YfZiNmH4oCM2KfbjCDZhtin24zYs9iqJywgVyAvIDIsIDQwOCwgMTMsICdub3JtYWwnLCAnIzRhNWE1MCcpOwogICAgfQoKICAgIGlmIChzdGF0ZSA9PT0gJ292ZXInKSB7CiAgICAgIGN0eC5maWxsU3R5bGUgPSAncmdiYSgyNDUsMjQxLDIyNywuNzIpJzsgY3R4LmZpbGxSZWN0KDAsIDAsIFcsIEgpOwogICAgICBwYW5lbCg1MCwgMTcwLCBXIC0gMTAwLCAyNTApOwogICAgICB0ZXh0KCfYp9mB2KrYp9iv24whJywgVyAvIDIsIDIyMCwgNDAsICdib2xkJywgSU5LKTsKICAgICAgdGV4dCgn2KfZhdiq24zYp9iyOiAnICsgZmEoc2NvcmUgLyAxMCksIFcgLyAyLCAyODAsIDI0LCAnYm9sZCcsIElOSyk7CiAgICAgIHRleHQoJ9io2YfYqtix24zZhjogJyArIGZhKGJlc3QpLCBXIC8gMiwgMzE2LCAxNywgJ25vcm1hbCcsICcjNGE1YTUwJyk7CiAgICAgIGNvbnN0IHJlYWR5ID0gcGVyZm9ybWFuY2Uubm93KCkgLSBvdmVyQXQgPiA1MDA7CiAgICAgIHRleHQoJ9iv2YjYqNin2LHZhyDYtNix2YjYuSDaqdmGJywgVyAvIDIsIDM3NiwgMTgsICdib2xkJywgcmVhZHkgPyBSRUQgOiAnI2I5YjRhMycpOwogICAgfQogIH0KCiAgLy8gLS0tLS0tLS0tLSBJbnB1dCAtLS0tLS0tLS0tCiAgZnVuY3Rpb24gcHJlc3MoKSB7CiAgICBpZiAoc3RhdGUgPT09ICdtZW51Jykgc3RhcnQoKTsKICAgIGVsc2UgaWYgKHN0YXRlID09PSAnb3ZlcicgJiYgcGVyZm9ybWFuY2Uubm93KCkgLSBvdmVyQXQgPiA1MDApIHN0YXJ0KCk7CiAgfQoKICBhZGRFdmVudExpc3RlbmVyKCdrZXlkb3duJywgZSA9PiB7CiAgICBpZiAoWydBcnJvd0xlZnQnLCAnQXJyb3dSaWdodCcsICdBcnJvd1VwJywgJ0Fycm93RG93bicsICcgJ10uaW5jbHVkZXMoZS5rZXkpKSBlLnByZXZlbnREZWZhdWx0KCk7CiAgICBpZiAoZS5rZXkgPT09ICdBcnJvd0xlZnQnIHx8IGUua2V5ID09PSAnYScgfHwgZS5rZXkgPT09ICdBJykga2V5cy5sZWZ0ID0gdHJ1ZTsKICAgIGlmIChlLmtleSA9PT0gJ0Fycm93UmlnaHQnIHx8IGUua2V5ID09PSAnZCcgfHwgZS5rZXkgPT09ICdEJykga2V5cy5yaWdodCA9IHRydWU7CiAgICBpZiAoZS5rZXkgPT09ICcgJyB8fCBlLmtleSA9PT0gJ0VudGVyJykgcHJlc3MoKTsKICB9KTsKICBhZGRFdmVudExpc3RlbmVyKCdrZXl1cCcsIGUgPT4gewogICAgaWYgKGUua2V5ID09PSAnQXJyb3dMZWZ0JyB8fCBlLmtleSA9PT0gJ2EnIHx8IGUua2V5ID09PSAnQScpIGtleXMubGVmdCA9IGZhbHNlOwogICAgaWYgKGUua2V5ID09PSAnQXJyb3dSaWdodCcgfHwgZS5rZXkgPT09ICdkJyB8fCBlLmtleSA9PT0gJ0QnKSBrZXlzLnJpZ2h0ID0gZmFsc2U7CiAgfSk7CgogIGZ1bmN0aW9uIHRvQ2FudmFzKGUpIHsKICAgIGNvbnN0IHIgPSBjdi5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTsKICAgIHJldHVybiB7IHg6IChlLmNsaWVudFggLSByLmxlZnQpICogVyAvIHIud2lkdGgsIHk6IChlLmNsaWVudFkgLSByLnRvcCkgKiBIIC8gci5oZWlnaHQgfTsKICB9CiAgZnVuY3Rpb24gam95TW92ZShlKSB7CiAgICBjb25zdCBwID0gdG9DYW52YXMoZSk7CiAgICBjb25zdCByYXcgPSBjbGFtcCgocC54IC0gam95Lm94KSAvIEpSLCAtMSwgMSksIGR6ID0gLjE7CiAgICBqb3kudmFsID0gTWF0aC5hYnMocmF3KSA8IGR6ID8gMCA6IE1hdGguc2lnbihyYXcpICogKE1hdGguYWJzKHJhdykgLSBkeikgLyAoMSAtIGR6KTsKICB9CiAgY3YuYWRkRXZlbnRMaXN0ZW5lcigncG9pbnRlcmRvd24nLCBlID0+IHsKICAgIGlmIChzdGF0ZSAhPT0gJ3BsYXknKSB7IHByZXNzKCk7IHJldHVybjsgfQogICAgaWYgKGpveS5hY3RpdmUpIHJldHVybjsKICAgIGN2LnNldFBvaW50ZXJDYXB0dXJlKGUucG9pbnRlcklkKTsKICAgIGNvbnN0IHAgPSB0b0NhbnZhcyhlKTsKICAgIGpveS5hY3RpdmUgPSB0cnVlOyBqb3kuaWQgPSBlLnBvaW50ZXJJZDsKICAgIGpveS5veCA9IGNsYW1wKHAueCwgSlIgKyAzMCwgVyAtIEpSIC0gMzApOwogICAgam95Lm95ID0gY2xhbXAocC55LCAxNDAsIEggLSA1MCk7CiAgICBqb3kudmFsID0gMDsKICAgIGpveU1vdmUoZSk7CiAgfSk7CiAgY3YuYWRkRXZlbnRMaXN0ZW5lcigncG9pbnRlcm1vdmUnLCBlID0+IHsgaWYgKGpveS5hY3RpdmUgJiYgZS5wb2ludGVySWQgPT09IGpveS5pZCkgam95TW92ZShlKTsgfSk7CiAgY29uc3QgcmVsZWFzZSA9IGUgPT4geyBpZiAoam95LmFjdGl2ZSAmJiBlLnBvaW50ZXJJZCA9PT0gam95LmlkKSB7IGpveS5hY3RpdmUgPSBmYWxzZTsgam95LnZhbCA9IDA7IH0gfTsKICBjdi5hZGRFdmVudExpc3RlbmVyKCdwb2ludGVydXAnLCByZWxlYXNlKTsKICBjdi5hZGRFdmVudExpc3RlbmVyKCdwb2ludGVyY2FuY2VsJywgcmVsZWFzZSk7CiAgYWRkRXZlbnRMaXN0ZW5lcignYmx1cicsICgpID0+IHsga2V5cy5sZWZ0ID0ga2V5cy5yaWdodCA9IGZhbHNlOyBqb3kuYWN0aXZlID0gZmFsc2U7IGpveS52YWwgPSAwOyB9KTsKCiAgLy8gLS0tLS0tLS0tLSBMb29wIC0tLS0tLS0tLS0KICByZXNldCgpOwogIHN0YXRlID0gJ21lbnUnOwogIHBsYXllci55ID0gSCAtIDYwIC0gcGxheWVyLmggLyAyOwoKICBsZXQgbGFzdCA9IHBlcmZvcm1hbmNlLm5vdygpLCBhY2MgPSAwOwogIGNvbnN0IFNURVAgPSAxMDAwIC8gNjA7CiAgZnVuY3Rpb24gbG9vcCh0KSB7CiAgICBhY2MgKz0gTWF0aC5taW4odCAtIGxhc3QsIDEwMCk7IGxhc3QgPSB0OwogICAgd2hpbGUgKGFjYyA+PSBTVEVQKSB7IHRpY2soKTsgYWNjIC09IFNURVA7IH0KICAgIHJlbmRlcigpOwogICAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKGxvb3ApOwogIH0KICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUobG9vcCk7Cn0pKCk7Cjwvc2NyaXB0Pgo8L2JvZHk+CjwvaHRtbD4K',pacman:'PCFET0NUWVBFIGh0bWw+CjxodG1sIGxhbmc9ImZhIiBkaXI9InJ0bCI+CjxoZWFkPgo8bWV0YSBjaGFyc2V0PSJVVEYtOCI+CjxtZXRhIG5hbWU9InZpZXdwb3J0IiBjb250ZW50PSJ3aWR0aD1kZXZpY2Utd2lkdGgsIGluaXRpYWwtc2NhbGU9MSwgbWF4aW11bS1zY2FsZT0xLCB1c2VyLXNjYWxhYmxlPW5vIj4KPHRpdGxlPtm+2qnigIzZhdmGPC90aXRsZT4KPHN0eWxlPgogIGh0bWwsYm9keXttYXJnaW46MDtoZWlnaHQ6MTAwJTtiYWNrZ3JvdW5kOiMwYTA2MjA7b3ZlcmZsb3c6aGlkZGVuO3RvdWNoLWFjdGlvbjpub25lOwogICAgZm9udC1mYW1pbHk6VGFob21hLCJTZWdvZSBVSSIsc2Fucy1zZXJpZjstd2Via2l0LXVzZXItc2VsZWN0Om5vbmU7dXNlci1zZWxlY3Q6bm9uZX0KICBjYW52YXN7ZGlzcGxheTpibG9jazt3aWR0aDoxMDAlO2hlaWdodDoxMDAlfQogICNtdXRle3Bvc2l0aW9uOmZpeGVkO3RvcDoxMHB4O2xlZnQ6MTBweDtiYWNrZ3JvdW5kOnJnYmEoMjU1LDIyNSw3NCwuMTIpO2JvcmRlcjoxcHggc29saWQgcmdiYSgyNTUsMjI1LDc0LC40NSk7CiAgICBjb2xvcjojZmZlMTRhO2JvcmRlci1yYWRpdXM6MjBweDtwYWRkaW5nOjZweCAxNHB4O2ZvbnQtc2l6ZToxNHB4O2ZvbnQtZmFtaWx5OmluaGVyaXR9CiAgI21zZ3twb3NpdGlvbjpmaXhlZDtpbnNldDowO2Rpc3BsYXk6ZmxleDtmbGV4LWRpcmVjdGlvbjpjb2x1bW47YWxpZ24taXRlbXM6Y2VudGVyO2p1c3RpZnktY29udGVudDpjZW50ZXI7CiAgICBjb2xvcjojZmZlOWE4O3RleHQtYWxpZ246Y2VudGVyO3BhZGRpbmc6MjRweDtnYXA6MTJweDtwb2ludGVyLWV2ZW50czpub25lO2JhY2tncm91bmQ6cmdiYSgxMCw2LDMyLC41NSl9CiAgI21zZyBoMXttYXJnaW46MDtmb250LXNpemU6NjBweDtjb2xvcjojZmZlMTRhO3RleHQtc2hhZG93OjAgMCAxMnB4ICNmZmUxNGEsMCAwIDM2cHggI2ZmOWEyZX0KICAjbXNnIHB7bWFyZ2luOjA7Zm9udC1zaXplOjE3cHg7bGluZS1oZWlnaHQ6MS45O21heC13aWR0aDozMjBweDtjb2xvcjojZTZkY2ZmfQogICNtc2cgLmJpZ3tmb250LXNpemU6NjhweDtjb2xvcjojZmZmO2ZvbnQtd2VpZ2h0OmJvbGQ7dGV4dC1zaGFkb3c6MCAwIDE0cHggIzViN2NmZiwwIDAgNDBweCAjNWI3Y2ZmfQogICNtc2cgLnRhcHtjb2xvcjojNWVlNmQwO3RleHQtc2hhZG93OjAgMCAxMHB4ICM1ZWU2ZDA7YW5pbWF0aW9uOnB1bHNlIDEuMnMgZWFzZS1pbi1vdXQgaW5maW5pdGV9CiAgQGtleWZyYW1lcyBwdWxzZXs1MCV7b3BhY2l0eTouMzV9fQo8L3N0eWxlPgo8L2hlYWQ+Cjxib2R5Pgo8Y2FudmFzIGlkPSJjIj48L2NhbnZhcz4KPGJ1dHRvbiBpZD0ibXV0ZSI+8J+UiiDYtdiv2Kc8L2J1dHRvbj4KPGRpdiBpZD0ibXNnIj4KICA8aDE+2b7aqeKAjNmF2YY8L2gxPgogIDxwPtio2Kcg2qnYtNuM2K/ZhiDYp9mG2q/YtNiqINix2YjbjCDYtdmB2K3ZhyAo2KjYp9mE2KfYjCDZvtin24zbjNmG2Iwg2obZvtiMINix2KfYs9iqKSDYrNmH2Kog2LHZiCDYudmI2LYg2qnZhi48YnI+2YfZhdmH4oCM24wg2YbZgti32YfigIzZh9inINix2Ygg2KjYrtmI2LHYjCDYp9iyINix2YjYreKAjNmH2Kcg2YHYsdin2LEg2qnZhi48YnI+2q/ZhNmI2YTZh+KAjNmH2KfbjCDYqNiy2LHaryDYsdmI2K3igIzZh9inINix2Ygg2KLYqNuMINmF24zigIzaqdmG2Ycg2Ygg2YXbjOKAjNiq2YjZhtuMINio2K7ZiNix24zYtNmI2YYuPC9wPgogIDxwIGNsYXNzPSJ0YXAiPtio2LHYp9uMINi02LHZiNi5INmE2YXYsyDaqdmGPC9wPgo8L2Rpdj4KCjxzY3JpcHQ+CmNvbnN0IGN2ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2MnKSwgY3R4ID0gY3YuZ2V0Q29udGV4dCgnMmQnKTsKY29uc3QgbXNnID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ21zZycpLCBtdXRlQnRuID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ211dGUnKTsKY29uc3QgZmEgPSBuID0+IFN0cmluZyhuKS5yZXBsYWNlKC9cZC9nLCBkID0+ICfbsNux27Lbs9u027Xbttu327jbuSdbZF0pOwpjb25zdCBUQVUgPSBNYXRoLlBJICogMjsKCi8qIC0tLS0tLS0tLS0g2YbZgti02YcgLS0tLS0tLS0tLSAqLwpjb25zdCBNQVAgPSBbCiIjIyMjIyMjIyMjIyMjIyMjIyMjIiwKIiMuLi4uLi4uLiMuLi4uLi4uLiMiLAoiI28jIy4jIyMuIy4jIyMuIyNvIyIsCiIjLi4uLi4uLi4uLi4uLi4uLi4jIiwKIiMuIyMuIy4jIyMjIy4jLiMjLiMiLAoiIy4uLi4jLi4uIy4uLiMuLi4uIyIsCiIjIyMjLiMjIy4jLiMjIy4jIyMjIiwKIiMjIyMuIy4uLi4uLi4jLiMjIyMiLAoiIyMjIy4jLiMjLSMjLiMuIyMjIyIsCiIgICAgLiAgI0dHRyMgIC4gICAgIiwKIiMjIyMuIy4jIyMjIy4jLiMjIyMiLAoiIy4uLi4uLi4uIy4uLi4uLi4uIyIsCiIjLiMjLiMjIy4jLiMjIy4jIy4jIiwKIiMuLi4uLi4uLi4uLi4uLi4uLiMiLAoiIy4jIy4jLiMjIyMjLiMuIyMuIyIsCiIjby4uLiMuLi5QLi4uIy4uLm8jIiwKIiMuIyMuIy4jIyMjIy4jLiMjLiMiLAoiIy4uLi4jLi4uIy4uLiMuLi4uIyIsCiIjLiMjIyMjIy4jLiMjIyMjIy4jIiwKIiMuLi4uLi4uLi4uLi4uLi4uLiMiLAoiIyMjIyMjIyMjIyMjIyMjIyMjIyJdOwpjb25zdCBDT0xTID0gMTksIFJPV1MgPSAyMTsKY29uc3QgRElSUyA9IFtbMCwtMV0sWy0xLDBdLFswLDFdLFsxLDBdXTsKbGV0IGdyaWQsIGZvb2QsIGRvdHNMZWZ0LCBob21lRGlzdDsKCmZ1bmN0aW9uIGJ1aWxkR3JpZCgpewogIGdyaWQgPSBbXTsgZm9vZCA9IFtdOyBkb3RzTGVmdCA9IDA7CiAgZm9yIChsZXQgciA9IDA7IHIgPCBST1dTOyByKyspIHsKICAgIGdyaWRbcl0gPSBbXTsgZm9vZFtyXSA9IFtdOwogICAgZm9yIChsZXQgYyA9IDA7IGMgPCBDT0xTOyBjKyspIHsKICAgICAgY29uc3QgY2ggPSBNQVBbcl1bY107IGxldCBnID0gY2gsIGYgPSAwOwogICAgICBpZiAoY2ggPT09ICcuJykgeyBmID0gMTsgZG90c0xlZnQrKzsgZyA9ICcgJzsgfQogICAgICBlbHNlIGlmIChjaCA9PT0gJ28nKSB7IGYgPSAyOyBkb3RzTGVmdCsrOyBnID0gJyAnOyB9CiAgICAgIGVsc2UgaWYgKGNoID09PSAnUCcgfHwgY2ggPT09ICdHJykgZyA9ICcgJzsKICAgICAgZ3JpZFtyXVtjXSA9IGc7IGZvb2Rbcl1bY10gPSBmOwogICAgfQogIH0KfQpmdW5jdGlvbiBidWlsZEhvbWUoKXsKICBob21lRGlzdCA9IEFycmF5LmZyb20oeyBsZW5ndGg6IFJPV1MgfSwgKCkgPT4gQXJyYXkoQ09MUykuZmlsbCg5OTkpKTsKICBjb25zdCBxID0gW1s5LCA5XV07IGhvbWVEaXN0WzldWzldID0gMDsKICB3aGlsZSAocS5sZW5ndGgpIHsKICAgIGNvbnN0IFtjLCByXSA9IHEuc2hpZnQoKTsKICAgIGZvciAoY29uc3QgW2R4LCBkeV0gb2YgRElSUykgewogICAgICBjb25zdCBuYyA9IChjICsgZHggKyBDT0xTKSAlIENPTFMsIG5yID0gciArIGR5OwogICAgICBpZiAobnIgPCAwIHx8IG5yID49IFJPV1MgfHwgZ3JpZFtucl1bbmNdID09PSAnIycpIGNvbnRpbnVlOwogICAgICBpZiAoaG9tZURpc3RbbnJdW25jXSA+IGhvbWVEaXN0W3JdW2NdICsgMSkgeyBob21lRGlzdFtucl1bbmNdID0gaG9tZURpc3Rbcl1bY10gKyAxOyBxLnB1c2goW25jLCBucl0pOyB9CiAgICB9CiAgfQp9CmJ1aWxkR3JpZCgpOyBidWlsZEhvbWUoKTsKCi8qIC0tLS0tLS0tLS0g2KfZhtiv2KfYstmHINmIINix2YbYr9ixINiv24zZiNin2LHZh9inIC0tLS0tLS0tLS0gKi8KbGV0IFcsIEgsIGRwciwgdHMsIG94LCBveSwgd2FsbEJsdWUsIHdhbGxXaGl0ZTsKY29uc3QgaXNXYWxsQXQgPSAoYywgcikgPT4gKHIgPCAwIHx8IHIgPj0gUk9XUyB8fCBjIDwgMCB8fCBjID49IENPTFMpID8gdHJ1ZSA6IGdyaWRbcl1bY10gPT09ICcjJzsKZnVuY3Rpb24gcmVuZGVyV2FsbHMoY29sb3IsIGdsb3cpewogIGNvbnN0IGsgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdjYW52YXMnKTsgay53aWR0aCA9IENPTFMgKiB0cyAqIGRwcjsgay5oZWlnaHQgPSBST1dTICogdHMgKiBkcHI7CiAgY29uc3QgZyA9IGsuZ2V0Q29udGV4dCgnMmQnKTsgZy5zY2FsZShkcHIsIGRwcik7CiAgZy5maWxsU3R5bGUgPSAncmdiYSg0MCw1MCwxNzAsMC4yNSknOwogIGZvciAobGV0IHIgPSAwOyByIDwgUk9XUzsgcisrKSBmb3IgKGxldCBjID0gMDsgYyA8IENPTFM7IGMrKykgaWYgKGdyaWRbcl1bY10gPT09ICcjJykgZy5maWxsUmVjdChjICogdHMsIHIgKiB0cywgdHMsIHRzKTsKICBnLnN0cm9rZVN0eWxlID0gY29sb3I7IGcubGluZVdpZHRoID0gTWF0aC5tYXgoMiwgdHMgKiAwLjEpOyBnLmxpbmVDYXAgPSAncm91bmQnOwogIGcuc2hhZG93Q29sb3IgPSBnbG93OyBnLnNoYWRvd0JsdXIgPSB0cyAqIDAuNTsKICBnLmJlZ2luUGF0aCgpOwogIGZvciAobGV0IHIgPSAwOyByIDwgUk9XUzsgcisrKSBmb3IgKGxldCBjID0gMDsgYyA8IENPTFM7IGMrKykgewogICAgaWYgKGdyaWRbcl1bY10gIT09ICcjJykgY29udGludWU7CiAgICBjb25zdCB4ID0gYyAqIHRzLCB5ID0gciAqIHRzOwogICAgaWYgKHIgPiAwICYmICFpc1dhbGxBdChjLCByIC0gMSkpIHsgZy5tb3ZlVG8oeCwgeSk7IGcubGluZVRvKHggKyB0cywgeSk7IH0KICAgIGlmIChyIDwgUk9XUyAtIDEgJiYgIWlzV2FsbEF0KGMsIHIgKyAxKSkgeyBnLm1vdmVUbyh4LCB5ICsgdHMpOyBnLmxpbmVUbyh4ICsgdHMsIHkgKyB0cyk7IH0KICAgIGlmIChjID4gMCAmJiAhaXNXYWxsQXQoYyAtIDEsIHIpKSB7IGcubW92ZVRvKHgsIHkpOyBnLmxpbmVUbyh4LCB5ICsgdHMpOyB9CiAgICBpZiAoYyA8IENPTFMgLSAxICYmICFpc1dhbGxBdChjICsgMSwgcikpIHsgZy5tb3ZlVG8oeCArIHRzLCB5KTsgZy5saW5lVG8oeCArIHRzLCB5ICsgdHMpOyB9CiAgfQogIGcuc3Ryb2tlKCk7CiAgZy5zaGFkb3dDb2xvciA9ICcjZmY5ZGUyJzsgZy5zdHJva2VTdHlsZSA9ICcjZmY5ZGUyJzsgZy5saW5lV2lkdGggPSBNYXRoLm1heCgyLCB0cyAqIDAuMTQpOwogIGcuYmVnaW5QYXRoKCk7IGcubW92ZVRvKDkgKiB0cyArIDIsIDguNSAqIHRzKTsgZy5saW5lVG8oMTAgKiB0cyAtIDIsIDguNSAqIHRzKTsgZy5zdHJva2UoKTsKICByZXR1cm4gazsKfQpmdW5jdGlvbiByZXNpemUoKXsKICBkcHIgPSBNYXRoLm1pbih3aW5kb3cuZGV2aWNlUGl4ZWxSYXRpbyB8fCAxLCAyKTsKICBXID0gaW5uZXJXaWR0aDsgSCA9IGlubmVySGVpZ2h0OwogIGN2LndpZHRoID0gVyAqIGRwcjsgY3YuaGVpZ2h0ID0gSCAqIGRwcjsgY3R4LnNldFRyYW5zZm9ybShkcHIsIDAsIDAsIGRwciwgMCwgMCk7CiAgdHMgPSBNYXRoLmZsb29yKE1hdGgubWluKFcgLyBDT0xTLCAoSCAtIDExMCkgLyBST1dTKSk7CiAgb3ggPSBNYXRoLmZsb29yKChXIC0gQ09MUyAqIHRzKSAvIDIpOyBveSA9IE1hdGguZmxvb3IoKEggLSBST1dTICogdHMpIC8gMik7CiAgd2FsbEJsdWUgPSByZW5kZXJXYWxscygnIzViN2NmZicsICcjM2E1YmZmJyk7IHdhbGxXaGl0ZSA9IHJlbmRlcldhbGxzKCcjZmZmZmZmJywgJyNmZmZmZmYnKTsKfQphZGRFdmVudExpc3RlbmVyKCdyZXNpemUnLCByZXNpemUpOyByZXNpemUoKTsKCi8qIC0tLS0tLS0tLS0g2LXYr9inIC0tLS0tLS0tLS0gKi8KbGV0IEFDLCBtYXN0ZXIsIHNmeEdhaW4sIG11dGVkID0gZmFsc2UsIHNpcmVuT3NjLCBzaXJlbkdhaW4sIHdha2FUID0gZmFsc2U7CmZ1bmN0aW9uIGluaXRBdWRpbygpewogIGlmIChBQykgeyBpZiAoQUMuc3RhdGUgPT09ICdzdXNwZW5kZWQnKSBBQy5yZXN1bWUoKTsgcmV0dXJuOyB9CiAgY29uc3QgQ3RvciA9IHdpbmRvdy5BdWRpb0NvbnRleHQgfHwgd2luZG93LndlYmtpdEF1ZGlvQ29udGV4dDsgaWYgKCFDdG9yKSByZXR1cm47CiAgQUMgPSBuZXcgQ3RvcigpOwogIG1hc3RlciA9IEFDLmNyZWF0ZUdhaW4oKTsgbWFzdGVyLmdhaW4udmFsdWUgPSBtdXRlZCA/IDAgOiAwLjg7IG1hc3Rlci5jb25uZWN0KEFDLmRlc3RpbmF0aW9uKTsKICBzZnhHYWluID0gQUMuY3JlYXRlR2FpbigpOyBzZnhHYWluLmdhaW4udmFsdWUgPSAwLjc7IHNmeEdhaW4uY29ubmVjdChtYXN0ZXIpOwogIHNpcmVuT3NjID0gQUMuY3JlYXRlT3NjaWxsYXRvcigpOyBzaXJlbk9zYy50eXBlID0gJ3RyaWFuZ2xlJzsgc2lyZW5Pc2MuZnJlcXVlbmN5LnZhbHVlID0gMjIwOwogIHNpcmVuR2FpbiA9IEFDLmNyZWF0ZUdhaW4oKTsgc2lyZW5HYWluLmdhaW4udmFsdWUgPSAwOwogIHNpcmVuT3NjLmNvbm5lY3Qoc2lyZW5HYWluKTsgc2lyZW5HYWluLmNvbm5lY3QobWFzdGVyKTsgc2lyZW5Pc2Muc3RhcnQoKTsKfQpmdW5jdGlvbiB0b25lKGYsIHQsIGR1ciwgdHlwZSwgdm9sLCB0byl7CiAgY29uc3QgbyA9IEFDLmNyZWF0ZU9zY2lsbGF0b3IoKSwgZyA9IEFDLmNyZWF0ZUdhaW4oKTsKICBvLnR5cGUgPSB0eXBlOyBvLmZyZXF1ZW5jeS5zZXRWYWx1ZUF0VGltZShmLCB0KTsKICBpZiAodG8pIG8uZnJlcXVlbmN5LmV4cG9uZW50aWFsUmFtcFRvVmFsdWVBdFRpbWUodG8sIHQgKyBkdXIpOwogIGcuZ2Fpbi5zZXRWYWx1ZUF0VGltZSgwLjAwMDEsIHQpOyBnLmdhaW4uZXhwb25lbnRpYWxSYW1wVG9WYWx1ZUF0VGltZSh2b2wsIHQgKyAwLjAwOCk7CiAgZy5nYWluLmV4cG9uZW50aWFsUmFtcFRvVmFsdWVBdFRpbWUoMC4wMDAxLCB0ICsgZHVyKTsKICBvLmNvbm5lY3QoZyk7IGcuY29ubmVjdChzZnhHYWluKTsgby5zdGFydCh0KTsgby5zdG9wKHQgKyBkdXIgKyAwLjA1KTsKfQpjb25zdCBBID0gKCkgPT4gQUMgPyBBQy5jdXJyZW50VGltZSA6IDA7CmZ1bmN0aW9uIHNmeFdha2EoKXsgaWYgKCFBQykgcmV0dXJuOyB3YWthVCA9ICF3YWthVDsgdG9uZSh3YWthVCA/IDMwMCA6IDIwMCwgQSgpLCAwLjA3LCAnc3F1YXJlJywgMC4xMiwgd2FrYVQgPyAyMDAgOiAzMjApOyB9CmZ1bmN0aW9uIHNmeFBvd2VyKCl7IGlmICghQUMpIHJldHVybjsgdG9uZSgxODAsIEEoKSwgMC4zNSwgJ3Nhd3Rvb3RoJywgMC4yLCA3MDApOyB9CmZ1bmN0aW9uIHNmeEdob3N0KCl7IGlmICghQUMpIHJldHVybjsgdG9uZSgyNTAsIEEoKSwgMC4zLCAnc3F1YXJlJywgMC4yMiwgMTQwMCk7IH0KZnVuY3Rpb24gc2Z4RGVhdGgoKXsgaWYgKCFBQykgcmV0dXJuOyBjb25zdCB0ID0gQSgpOyBmb3IgKGxldCBpID0gMDsgaSA8IDEwOyBpKyspIHRvbmUoNzAwIC0gaSAqIDU1LCB0ICsgaSAqIDAuMTMsIDAuMTQsICd0cmlhbmdsZScsIDAuMywgNTAwIC0gaSAqIDQ1KTsgdG9uZSgxMjAsIHQgKyAxLjM1LCAwLjE1LCAnc3F1YXJlJywgMC4yKTsgfQpmdW5jdGlvbiBzZnhTdGFydCgpeyBpZiAoIUFDKSByZXR1cm47IGNvbnN0IHQgPSBBKCk7IFsyNjIsMzMwLDM5Miw1MjMsMzkyLDUyMyw2NTksNzg0XS5mb3JFYWNoKChmLCBpKSA9PiB0b25lKGYsIHQgKyBpICogMC4xMywgMC4xNSwgJ3NxdWFyZScsIDAuMTUpKTsgfQpmdW5jdGlvbiBzZnhXaW4oKXsgaWYgKCFBQykgcmV0dXJuOyBjb25zdCB0ID0gQSgpOyBbNTIzLDY1OSw3ODQsMTA0Nyw3ODQsMTA0NywxMzE5XS5mb3JFYWNoKChmLCBpKSA9PiB0b25lKGYsIHQgKyBpICogMC4xMiwgMC4xOCwgJ3RyaWFuZ2xlJywgMC4zKSk7IH0KbXV0ZUJ0bi5hZGRFdmVudExpc3RlbmVyKCdwb2ludGVyZG93bicsIGUgPT4gewogIGUuc3RvcFByb3BhZ2F0aW9uKCk7IG11dGVkID0gIW11dGVkOwogIG11dGVCdG4udGV4dENvbnRlbnQgPSBtdXRlZCA/ICfwn5SHINio24zigIzYtdiv2KcnIDogJ/CflIog2LXYr9inJzsKICBpZiAobWFzdGVyKSBtYXN0ZXIuZ2Fpbi52YWx1ZSA9IG11dGVkID8gMCA6IDAuODsKfSk7CmRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ3Zpc2liaWxpdHljaGFuZ2UnLCAoKSA9PiB7IGlmIChBQykgZG9jdW1lbnQuaGlkZGVuID8gQUMuc3VzcGVuZCgpIDogQUMucmVzdW1lKCk7IH0pOwpmdW5jdGlvbiB1cGRhdGVTaXJlbigpewogIGlmICghQUMgfHwgIXNpcmVuR2FpbikgcmV0dXJuOwogIGNvbnN0IHQgPSBBQy5jdXJyZW50VGltZTsKICBpZiAoc3RhdGUgIT09ICdwbGF5JykgeyBzaXJlbkdhaW4uZ2Fpbi5zZXRUYXJnZXRBdFRpbWUoMCwgdCwgMC4wNSk7IHJldHVybjsgfQogIGNvbnN0IGZyID0gZnJpZ2h0VCA+IDA7CiAgY29uc3QgcHJvZyA9IDEgLSBkb3RzTGVmdCAvIDE4MjsKICBjb25zdCBmID0gZnIgPyAxMjAgKyA2MCAqIE1hdGguYWJzKE1hdGguc2luKHRtICogMTIpKSA6IDE4MCArIHByb2cgKiAxNDAgKyA2MCAqIE1hdGguc2luKHRtICogMyk7CiAgc2lyZW5Pc2MuZnJlcXVlbmN5LnNldFRhcmdldEF0VGltZShmLCB0LCAwLjAzKTsKICBzaXJlbkdhaW4uZ2Fpbi5zZXRUYXJnZXRBdFRpbWUoZnIgPyAwLjA3IDogMC4wNDUsIHQsIDAuMDUpOwp9CgovKiAtLS0tLS0tLS0tINmI2LbYuduM2Kog2KjYp9iy24wgLS0tLS0tLS0tLSAqLwpjb25zdCBDT0xPUlMgPSB7IGJsaW5reTonI2ZmNGQ0ZCcsIHBpbmt5OicjZmY5ZGUyJywgaW5reTonIzRkZjBmZicsIGNseWRlOicjZmZiMzQ3JyB9OwpsZXQgc3RhdGUgPSAndGl0bGUnLCBzdFQgPSAwLCBzY29yZSA9IDAsIGJlc3QgPSAwLCBsaXZlcyA9IDMsIGxldmVsID0gMSwgdG0gPSAwLCBwbGF5VCA9IDAsIG1vZGVUID0gMCwgZnJpZ2h0VCA9IDAsIGNoYWluID0gMDsKY29uc3QgQVJDX0dBTUU9J3BhY21hbic7CmZ1bmN0aW9uIGFyY1JlcG9ydCh0eXBlLHM9MCl7dHJ5e3dpbmRvdy5wYXJlbnQucG9zdE1lc3NhZ2Uoe3NvdXJjZTonbm92YS1hcmNhZGUtZW1iZWQnLGdhbWU6QVJDX0dBTUUsdHlwZSxzY29yZTpNYXRoLm1heCgwLE1hdGguZmxvb3IoTnVtYmVyKHMpfHwwKSksd29uOnR5cGU9PT0nZmluaXNoJyYmc3RhdGU9PT0nd29uJ30sJyonKX1jYXRjaChlKXt9fQpzZXRJbnRlcnZhbCgoKT0+e2lmKHN0YXRlPT09J3BsYXknKWFyY1JlcG9ydCgnc2NvcmUnLHNjb3JlKX0sMzUwKTsKbGV0IHBhYywgZ2hvc3RzLCBmbG9hdHMgPSBbXSwgcGFydHMgPSBbXSwgbGFzdEFuZyA9IDAsIHNjYXR0ZXIgPSB0cnVlOwoKZnVuY3Rpb24gbWtHaG9zdChuYW1lLCBjLCByLCBtb2RlLCByZWxlYXNlLCBjb3JuZXIpewogIHJldHVybiB7IG5hbWUsIGMsIHIsIGR4OiAwLCBkeTogMCwgdDogMCwgbW9kZSwgcmVsZWFzZSwgY29ybmVyLCBjb2xvcjogQ09MT1JTW25hbWVdIH07Cn0KZnVuY3Rpb24gcmVzZXRBY3RvcnMoKXsKICBjb25zdCBrID0gTWF0aC5tYXgoMC41LCAxIC0gbGV2ZWwgKiAwLjA4KTsKICBwYWMgPSB7IGM6IDksIHI6IDE1LCBkeDogMCwgZHk6IDAsIHQ6IDAsIG5kOiBbMCwgMF0gfTsKICBnaG9zdHMgPSBbCiAgICBta0dob3N0KCdibGlua3knLCA5LCA3LCAnbm9ybWFsJywgMCwgWzE3LCAtMV0pLAogICAgbWtHaG9zdCgncGlua3knLCA5LCA5LCAnaG91c2UnLCAyICogaywgWzEsIC0xXSksCiAgICBta0dob3N0KCdpbmt5JywgOCwgOSwgJ2hvdXNlJywgNiAqIGssIFsxNywgMjFdKSwKICAgIG1rR2hvc3QoJ2NseWRlJywgMTAsIDksICdob3VzZScsIDExICogaywgWzEsIDIxXSkKICBdOwogIGdob3N0c1swXS5keCA9IC0xOwogIHBsYXlUID0gMDsgbW9kZVQgPSAwOyBmcmlnaHRUID0gMDsgY2hhaW4gPSAwOyBmbG9hdHMgPSBbXTsgbGFzdEFuZyA9IDA7Cn0KZnVuY3Rpb24gbmV3R2FtZSgpewogIHNjb3JlID0gMDsgbGl2ZXMgPSAzOyBsZXZlbCA9IDE7IGJ1aWxkR3JpZCgpOyByZXNldEFjdG9ycygpOwogIHN0YXRlID0gJ3JlYWR5Jzsgc3RUID0gMDsgbXNnLnN0eWxlLmRpc3BsYXkgPSAnbm9uZSc7IHNmeFN0YXJ0KCk7IGFyY1JlcG9ydCgnc3RhcnQnLDApOwp9CnJlc2V0QWN0b3JzKCk7Cgpjb25zdCBwYWNTcGVlZCA9ICgpID0+IDYuMDsKY29uc3QgZ2hvc3RTcGVlZCA9IGcgPT4gewogIGNvbnN0IGJhc2UgPSBNYXRoLm1pbig1LjAgKyBsZXZlbCAqIDAuMywgNi4yKTsKICBpZiAoZy5tb2RlID09PSAnZnJpZ2h0JykgcmV0dXJuIGJhc2UgKiAwLjY7CiAgaWYgKGcubW9kZSA9PT0gJ2VhdGVuJykgcmV0dXJuIDExOwogIGlmIChnLm1vZGUgPT09ICdsZWF2ZScpIHJldHVybiA0OwogIHJldHVybiBiYXNlOwp9OwoKZnVuY3Rpb24gY2FuTW92ZShlLCBkeCwgZHksIGdob3N0KXsKICBjb25zdCBuYyA9IChlLmMgKyBkeCArIENPTFMpICUgQ09MUywgbnIgPSBlLnIgKyBkeTsKICBpZiAobnIgPCAwIHx8IG5yID49IFJPV1MpIHJldHVybiBmYWxzZTsKICBjb25zdCBjaCA9IGdyaWRbbnJdW25jXTsKICBpZiAoY2ggPT09ICcjJykgcmV0dXJuIGZhbHNlOwogIGlmIChjaCA9PT0gJy0nKSByZXR1cm4gZ2hvc3QgJiYgKGUubW9kZSA9PT0gJ2xlYXZlJyB8fCBlLm1vZGUgPT09ICdlYXRlbicpOwogIHJldHVybiB0cnVlOwp9CmZ1bmN0aW9uIGZsaXAoZSl7CiAgZS5jID0gKGUuYyArIGUuZHggKyBDT0xTKSAlIENPTFM7IGUuciArPSBlLmR5OwogIGUuZHggPSAtZS5keDsgZS5keSA9IC1lLmR5OyBlLnQgPSAxIC0gZS50Owp9CmZ1bmN0aW9uIHNldERpcihkeCwgZHkpewogIGlmICghcGFjKSByZXR1cm47CiAgcGFjLm5kID0gW2R4LCBkeV07CiAgaWYgKChwYWMuZHggfHwgcGFjLmR5KSAmJiBwYWMuZHggPT09IC1keCAmJiBwYWMuZHkgPT09IC1keSkgZmxpcChwYWMpOwp9CgpmdW5jdGlvbiBwYWNDaG9vc2UocCl7CiAgY29uc3QgW254LCBueV0gPSBwLm5kOwogIGlmICgobnggfHwgbnkpICYmIGNhbk1vdmUocCwgbngsIG55LCBmYWxzZSkpIHsgcC5keCA9IG54OyBwLmR5ID0gbnk7IHJldHVybjsgfQogIGlmICgocC5keCB8fCBwLmR5KSAmJiBjYW5Nb3ZlKHAsIHAuZHgsIHAuZHksIGZhbHNlKSkgcmV0dXJuOwogIHAuZHggPSAwOyBwLmR5ID0gMDsKfQpmdW5jdGlvbiBwYWNBcnJpdmUocCl7CiAgY29uc3QgZiA9IGZvb2RbcC5yXVtwLmNdOwogIGlmICghZikgcmV0dXJuOwogIGZvb2RbcC5yXVtwLmNdID0gMDsgZG90c0xlZnQtLTsKICBpZiAoZiA9PT0gMSkgeyBzY29yZSArPSAxMDsgc2Z4V2FrYSgpOyB9CiAgZWxzZSB7CiAgICBzY29yZSArPSA1MDsgc2Z4UG93ZXIoKTsgY2hhaW4gPSAwOwogICAgZnJpZ2h0VCA9IE1hdGgubWF4KDcgLSBsZXZlbCAqIDAuOCwgMi41KTsKICAgIGZvciAoY29uc3QgZyBvZiBnaG9zdHMpIGlmIChnLm1vZGUgPT09ICdub3JtYWwnIHx8IGcubW9kZSA9PT0gJ2ZyaWdodCcpIHsgaWYgKGcubW9kZSA9PT0gJ25vcm1hbCcgJiYgKGcuZHggfHwgZy5keSkpIGZsaXAoZyk7IGcubW9kZSA9ICdmcmlnaHQnOyB9CiAgfQogIGlmIChzY29yZSA+IGJlc3QpIGJlc3QgPSBzY29yZTsKICBpZiAoZG90c0xlZnQgPD0gMCkgeyBzdGF0ZSA9ICd3b24nOyBzdFQgPSAwOyBzZnhXaW4oKTsgfQp9CgpmdW5jdGlvbiBnaG9zdFRhcmdldChnKXsKICBpZiAoZy5tb2RlID09PSAnbGVhdmUnKSByZXR1cm4gWzksIDddOwogIGlmIChzY2F0dGVyKSByZXR1cm4gZy5jb3JuZXI7CiAgc3dpdGNoIChnLm5hbWUpIHsKICAgIGNhc2UgJ2JsaW5reSc6IHJldHVybiBbcGFjLmMsIHBhYy5yXTsKICAgIGNhc2UgJ3Bpbmt5JzogcmV0dXJuIFtwYWMuYyArIHBhYy5keCAqIDQsIHBhYy5yICsgcGFjLmR5ICogNF07CiAgICBjYXNlICdpbmt5JzogeyBjb25zdCBiID0gZ2hvc3RzWzBdOyByZXR1cm4gWyhwYWMuYyArIHBhYy5keCAqIDIpICogMiAtIGIuYywgKHBhYy5yICsgcGFjLmR5ICogMikgKiAyIC0gYi5yXTsgfQogICAgZGVmYXVsdDogcmV0dXJuIE1hdGguaHlwb3QocGFjLmMgLSBnLmMsIHBhYy5yIC0gZy5yKSA+IDggPyBbcGFjLmMsIHBhYy5yXSA6IGcuY29ybmVyOwogIH0KfQpmdW5jdGlvbiBnaG9zdENob29zZShnKXsKICBsZXQgb3B0cyA9IFtdOwogIGNvbnN0IG1vdmluZyA9IGcuZHggfHwgZy5keTsKICBmb3IgKGNvbnN0IGQgb2YgRElSUykgewogICAgaWYgKG1vdmluZyAmJiBkWzBdID09PSAtZy5keCAmJiBkWzFdID09PSAtZy5keSkgY29udGludWU7CiAgICBpZiAoY2FuTW92ZShnLCBkWzBdLCBkWzFdLCB0cnVlKSkgb3B0cy5wdXNoKGQpOwogIH0KICBpZiAoIW9wdHMubGVuZ3RoKSBmb3IgKGNvbnN0IGQgb2YgRElSUykgaWYgKGNhbk1vdmUoZywgZFswXSwgZFsxXSwgdHJ1ZSkpIG9wdHMucHVzaChkKTsKICBpZiAoIW9wdHMubGVuZ3RoKSB7IGcuZHggPSAwOyBnLmR5ID0gMDsgcmV0dXJuOyB9CiAgbGV0IHBpY2s7CiAgaWYgKGcubW9kZSA9PT0gJ2ZyaWdodCcpIHBpY2sgPSBvcHRzW01hdGgucmFuZG9tKCkgKiBvcHRzLmxlbmd0aCB8IDBdOwogIGVsc2UgewogICAgY29uc3QgdGcgPSBnLm1vZGUgPT09ICdlYXRlbicgPyBudWxsIDogZ2hvc3RUYXJnZXQoZyk7CiAgICBsZXQgYmVzdFYgPSBJbmZpbml0eTsKICAgIGZvciAoY29uc3QgZCBvZiBvcHRzKSB7CiAgICAgIGNvbnN0IG5jID0gKGcuYyArIGRbMF0gKyBDT0xTKSAlIENPTFMsIG5yID0gZy5yICsgZFsxXTsKICAgICAgY29uc3QgdiA9IHRnID8gKG5jIC0gdGdbMF0pICoqIDIgKyAobnIgLSB0Z1sxXSkgKiogMiA6IGhvbWVEaXN0W25yXVtuY107CiAgICAgIGlmICh2IDwgYmVzdFYpIHsgYmVzdFYgPSB2OyBwaWNrID0gZDsgfQogICAgfQogIH0KICBnLmR4ID0gcGlja1swXTsgZy5keSA9IHBpY2tbMV07Cn0KZnVuY3Rpb24gZ2hvc3RBcnJpdmUoZyl7CiAgaWYgKGcubW9kZSA9PT0gJ2xlYXZlJyAmJiBnLnIgPD0gNyAmJiBnLmMgPT09IDkpIGcubW9kZSA9IGZyaWdodFQgPiAwID8gJ2ZyaWdodCcgOiAnbm9ybWFsJzsKICBpZiAoZy5tb2RlID09PSAnZWF0ZW4nICYmIGcuYyA9PT0gOSAmJiBnLnIgPT09IDkpIGcubW9kZSA9ICdsZWF2ZSc7Cn0KCmZ1bmN0aW9uIGFkdmFuY2UoZSwgc3AsIGR0LCBhcnJpdmUsIGNob29zZSl7CiAgbGV0IG0gPSBzcCAqIGR0LCBndWFyZCA9IDA7CiAgd2hpbGUgKG0gPiAwICYmIGd1YXJkKysgPCA4KSB7CiAgICBpZiAoIWUuZHggJiYgIWUuZHkpIHsgY2hvb3NlKGUpOyBpZiAoIWUuZHggJiYgIWUuZHkpIHJldHVybjsgfQogICAgY29uc3QgcmVtID0gMSAtIGUudDsKICAgIGlmIChtIDwgcmVtKSB7IGUudCArPSBtOyByZXR1cm47IH0KICAgIG0gLT0gcmVtOyBlLmMgPSAoZS5jICsgZS5keCArIENPTFMpICUgQ09MUzsgZS5yICs9IGUuZHk7IGUudCA9IDA7CiAgICBhcnJpdmUoZSk7CiAgICBpZiAoc3RhdGUgIT09ICdwbGF5JykgcmV0dXJuOwogICAgY2hvb3NlKGUpOwogIH0KfQpjb25zdCBwb3NPZiA9IGUgPT4gW2UuYyArIGUuZHggKiBlLnQsIGUuciArIGUuZHkgKiBlLnRdOwoKZnVuY3Rpb24gYnVyc3QoeCwgeSwgY29sLCBuKXsKICBmb3IgKGxldCBpID0gMDsgaSA8IG47IGkrKykgewogICAgY29uc3QgYSA9IE1hdGgucmFuZG9tKCkgKiBUQVUsIHMgPSA0MCArIE1hdGgucmFuZG9tKCkgKiAxNjA7CiAgICBwYXJ0cy5wdXNoKHsgeCwgeSwgdng6IE1hdGguY29zKGEpICogcywgdnk6IE1hdGguc2luKGEpICogcywgbGlmZTogMC42LCBjb2wgfSk7CiAgfQp9CgpmdW5jdGlvbiBkaWUoKXsKICBzdGF0ZSA9ICdkeWluZyc7IHN0VCA9IDA7IHNmeERlYXRoKCk7Cn0KCmZ1bmN0aW9uIHVwZGF0ZShkdCl7CiAgdG0gKz0gZHQ7CiAgZm9yIChjb25zdCBwIG9mIHBhcnRzKSB7IHAueCArPSBwLnZ4ICogZHQ7IHAueSArPSBwLnZ5ICogZHQ7IHAubGlmZSAtPSBkdDsgfQogIHBhcnRzID0gcGFydHMuZmlsdGVyKHAgPT4gcC5saWZlID4gMCk7CiAgZm9yIChjb25zdCBmIG9mIGZsb2F0cykgZi5saWZlIC09IGR0OwogIGZsb2F0cyA9IGZsb2F0cy5maWx0ZXIoZiA9PiBmLmxpZmUgPiAwKTsKICB1cGRhdGVTaXJlbigpOwoKICBpZiAoc3RhdGUgPT09ICdyZWFkeScpIHsgc3RUICs9IGR0OyBpZiAoc3RUID4gMi4yKSB7IHN0YXRlID0gJ3BsYXknOyBzdFQgPSAwOyB9IHJldHVybjsgfQogIGlmIChzdGF0ZSA9PT0gJ2R5aW5nJykgewogICAgc3RUICs9IGR0OwogICAgaWYgKHN0VCA+IDEuOCkgewogICAgICBsaXZlcy0tOwogICAgICBhcmNSZXBvcnQoJ2xpZmVMb3N0JyxzY29yZSk7CiAgICAgIGlmIChsaXZlcyA8PSAwKSB7CiAgICAgICAgc3RhdGUgPSAnb3Zlcic7IG1zZy5zdHlsZS5kaXNwbGF5ID0gJ2ZsZXgnOwogICAgICAgIG1zZy5pbm5lckhUTUwgPSAnPGgxIHN0eWxlPSJmb250LXNpemU6NDRweCI+2KrZhdmI2YUg2LTYrzwvaDE+PGRpdiBjbGFzcz0iYmlnIj4nICsgZmEoc2NvcmUpICsgJzwvZGl2PjxwPtix2qnZiNix2K86ICcgKyBmYShiZXN0KSArICc8L3A+PHAgY2xhc3M9InRhcCI+2KjYsdin24wg2LTYsdmI2Lkg2K/ZiNio2KfYsdmHINmE2YXYsyDaqdmGPC9wPic7CiAgICAgICAgYXJjUmVwb3J0KCdmaW5pc2gnLHNjb3JlKTsKICAgICAgfSBlbHNlIHsgcmVzZXRBY3RvcnMoKTsgc3RhdGUgPSAncmVhZHknOyBzdFQgPSAwOyB9CiAgICB9CiAgICByZXR1cm47CiAgfQogIGlmIChzdGF0ZSA9PT0gJ3dvbicpIHsKICAgIHN0VCArPSBkdDsKICAgIGlmIChzdFQgPiAyLjQpIHsgbGV2ZWwrKzsgYnVpbGRHcmlkKCk7IHJlc2V0QWN0b3JzKCk7IHN0YXRlID0gJ3JlYWR5Jzsgc3RUID0gMDsgfQogICAgcmV0dXJuOwogIH0KICBpZiAoc3RhdGUgIT09ICdwbGF5JykgcmV0dXJuOwoKICBwbGF5VCArPSBkdDsgbW9kZVQgKz0gZHQ7CiAgc2NhdHRlciA9IG1vZGVUIDwgMTA4ICYmIChtb2RlVCAlIDI3KSA8IDc7CiAgaWYgKGZyaWdodFQgPiAwKSB7CiAgICBmcmlnaHRUIC09IGR0OwogICAgaWYgKGZyaWdodFQgPD0gMCkgZm9yIChjb25zdCBnIG9mIGdob3N0cykgaWYgKGcubW9kZSA9PT0gJ2ZyaWdodCcpIGcubW9kZSA9ICdub3JtYWwnOwogIH0KCiAgYWR2YW5jZShwYWMsIHBhY1NwZWVkKCksIGR0LCBwYWNBcnJpdmUsIHBhY0Nob29zZSk7CiAgaWYgKHBhYy5keCB8fCBwYWMuZHkpIGxhc3RBbmcgPSBNYXRoLmF0YW4yKHBhYy5keSwgcGFjLmR4KTsKICBpZiAoc3RhdGUgIT09ICdwbGF5JykgcmV0dXJuOwoKICBmb3IgKGNvbnN0IGcgb2YgZ2hvc3RzKSB7CiAgICBpZiAoZy5tb2RlID09PSAnaG91c2UnKSB7CiAgICAgIGlmIChwbGF5VCA+PSBnLnJlbGVhc2UpIHsgZy5tb2RlID0gJ2xlYXZlJzsgZy5keCA9IDA7IGcuZHkgPSAwOyB9CiAgICAgIGVsc2UgY29udGludWU7CiAgICB9CiAgICBhZHZhbmNlKGcsIGdob3N0U3BlZWQoZyksIGR0LCBnaG9zdEFycml2ZSwgZ2hvc3RDaG9vc2UpOwogIH0KCiAgY29uc3QgW3B4LCBweV0gPSBwb3NPZihwYWMpOwogIGZvciAoY29uc3QgZyBvZiBnaG9zdHMpIHsKICAgIGlmIChnLm1vZGUgIT09ICdub3JtYWwnICYmIGcubW9kZSAhPT0gJ2ZyaWdodCcgJiYgZy5tb2RlICE9PSAnbGVhdmUnKSBjb250aW51ZTsKICAgIGNvbnN0IFtneCwgZ3ldID0gcG9zT2YoZyk7CiAgICBpZiAoTWF0aC5oeXBvdChneCAtIHB4LCBneSAtIHB5KSA8IDAuNikgewogICAgICBpZiAoZy5tb2RlID09PSAnZnJpZ2h0JykgewogICAgICAgIGcubW9kZSA9ICdlYXRlbic7IGNoYWluKys7CiAgICAgICAgY29uc3QgcHRzID0gMjAwICogTWF0aC5wb3coMiwgY2hhaW4gLSAxKTsgc2NvcmUgKz0gcHRzOyBpZiAoc2NvcmUgPiBiZXN0KSBiZXN0ID0gc2NvcmU7CiAgICAgICAgZmxvYXRzLnB1c2goeyB4OiBneCwgeTogZ3ksIHRleHQ6IHB0cywgbGlmZTogMC45IH0pOwogICAgICAgIGJ1cnN0KG94ICsgKGd4ICsgMC41KSAqIHRzLCBveSArIChneSArIDAuNSkgKiB0cywgZy5jb2xvciwgMTQpOyBzZnhHaG9zdCgpOwogICAgICB9IGVsc2UgeyBkaWUoKTsgcmV0dXJuOyB9CiAgICB9CiAgfQp9CgovKiAtLS0tLS0tLS0tINqv2LHYp9mB24zaqSAtLS0tLS0tLS0tICovCmNvbnN0IHN4ID0geCA9PiBveCArICh4ICsgMC41KSAqIHRzLCBzeSA9IHkgPT4gb3kgKyAoeSArIDAuNSkgKiB0czsKCmZ1bmN0aW9uIGRyYXdQYWMoeCwgeSwgYW5nLCBtb3V0aCwgcnIpewogIGNvbnN0IGcgPSBjdHguY3JlYXRlUmFkaWFsR3JhZGllbnQoeCAtIHJyICogMC4zLCB5IC0gcnIgKiAwLjMsIHJyICogMC4xLCB4LCB5LCBycik7CiAgZy5hZGRDb2xvclN0b3AoMCwgJyNmZmY3YjAnKTsgZy5hZGRDb2xvclN0b3AoMC41LCAnI2ZmZTE0YScpOyBnLmFkZENvbG9yU3RvcCgxLCAnI2ZmYjMwMCcpOwogIGN0eC5zaGFkb3dDb2xvciA9ICcjZmZkMjNhJzsgY3R4LnNoYWRvd0JsdXIgPSByciAqIDAuOTsgY3R4LmZpbGxTdHlsZSA9IGc7CiAgY3R4LmJlZ2luUGF0aCgpOyBjdHgubW92ZVRvKHgsIHkpOyBjdHguYXJjKHgsIHksIHJyLCBhbmcgKyBtb3V0aCwgYW5nICsgVEFVIC0gbW91dGgpOyBjdHguY2xvc2VQYXRoKCk7IGN0eC5maWxsKCk7CiAgY3R4LnNoYWRvd0JsdXIgPSAwOwp9CmZ1bmN0aW9uIGRyYXdHaG9zdChnLCB4LCB5KXsKICBjb25zdCByciA9IHRzICogMC40NDsKICBjb25zdCBmbGFzaCA9IGZyaWdodFQgPCAyICYmIE1hdGguZmxvb3IodG0gKiA2KSAlIDIgPT09IDA7CiAgY29uc3QgY29sID0gZy5tb2RlID09PSAnZnJpZ2h0JyA/IChmbGFzaCA/ICcjZmZmZmZmJyA6ICcjMmIzY2ZmJykgOiBnLmNvbG9yOwogIGlmIChnLm1vZGUgIT09ICdlYXRlbicpIHsKICAgIGN0eC5zaGFkb3dDb2xvciA9IGNvbDsgY3R4LnNoYWRvd0JsdXIgPSB0cyAqIDAuNzsgY3R4LmZpbGxTdHlsZSA9IGNvbDsKICAgIGN0eC5iZWdpblBhdGgoKTsgY3R4LmFyYyh4LCB5IC0gcnIgKiAwLjEsIHJyLCBNYXRoLlBJLCAwKTsKICAgIGN0eC5saW5lVG8oeCArIHJyLCB5ICsgcnIgKiAwLjk1KTsKICAgIGNvbnN0IG4gPSAzLCB3ID0gMiAqIHJyIC8gbiwgcGggPSBNYXRoLmZsb29yKHRtICogOCkgJSAyOwogICAgZm9yIChsZXQgaSA9IDA7IGkgPCBuOyBpKyspIHsKICAgICAgY29uc3QgYnggPSB4ICsgcnIgLSBpICogdzsKICAgICAgY3R4LmxpbmVUbyhieCAtIHcgKiAwLjUsIHkgKyByciAqIChwaCA/IDAuNTUgOiAwLjcpKTsKICAgICAgY3R4LmxpbmVUbyhieCAtIHcsIHkgKyByciAqIDAuOTUpOwogICAgfQogICAgY3R4LmNsb3NlUGF0aCgpOyBjdHguZmlsbCgpOyBjdHguc2hhZG93Qmx1ciA9IDA7CiAgfQogIGlmIChnLm1vZGUgPT09ICdmcmlnaHQnKSB7CiAgICBjdHguZmlsbFN0eWxlID0gZmxhc2ggPyAnI2ZmM2IzYicgOiAnI2ZmZTlhOCc7CiAgICBjdHguYmVnaW5QYXRoKCk7IGN0eC5hcmMoeCAtIHJyICogMC4zNSwgeSAtIHJyICogMC4yLCByciAqIDAuMTMsIDAsIFRBVSk7IGN0eC5hcmMoeCArIHJyICogMC4zNSwgeSAtIHJyICogMC4yLCByciAqIDAuMTMsIDAsIFRBVSk7IGN0eC5maWxsKCk7CiAgICBjdHguc3Ryb2tlU3R5bGUgPSBjdHguZmlsbFN0eWxlOyBjdHgubGluZVdpZHRoID0gTWF0aC5tYXgoMS41LCB0cyAqIDAuMDcpOwogICAgY3R4LmJlZ2luUGF0aCgpOwogICAgZm9yIChsZXQgaSA9IDA7IGkgPD0gNDsgaSsrKSBjdHgubGluZVRvKHggLSByciAqIDAuNiArIGkgKiByciAqIDAuMywgeSArIHJyICogKGkgJSAyID8gMC4zIDogMC4xKSk7CiAgICBjdHguc3Ryb2tlKCk7CiAgfSBlbHNlIHsKICAgIGZvciAoY29uc3QgcyBvZiBbLTEsIDFdKSB7CiAgICAgIGN0eC5maWxsU3R5bGUgPSAnI2ZmZic7IGN0eC5iZWdpblBhdGgoKTsgY3R4LmVsbGlwc2UoeCArIHMgKiByciAqIDAuMzYsIHkgLSByciAqIDAuMjUsIHJyICogMC4yNywgcnIgKiAwLjM0LCAwLCAwLCBUQVUpOyBjdHguZmlsbCgpOwogICAgICBjdHguZmlsbFN0eWxlID0gJyMxYTJjZmYnOyBjdHguYmVnaW5QYXRoKCk7IGN0eC5hcmMoeCArIHMgKiByciAqIDAuMzYgKyBnLmR4ICogcnIgKiAwLjE0LCB5IC0gcnIgKiAwLjI1ICsgZy5keSAqIHJyICogMC4xNiwgcnIgKiAwLjE1LCAwLCBUQVUpOyBjdHguZmlsbCgpOwogICAgfQogIH0KfQoKZnVuY3Rpb24gZHJhdygpewogIGN0eC5nbG9iYWxDb21wb3NpdGVPcGVyYXRpb24gPSAnc291cmNlLW92ZXInOwogIGNvbnN0IGJnID0gY3R4LmNyZWF0ZVJhZGlhbEdyYWRpZW50KFcgLyAyLCBIIC8gMiwgMjAsIFcgLyAyLCBIIC8gMiwgTWF0aC5tYXgoVywgSCkgKiAwLjcpOwogIGJnLmFkZENvbG9yU3RvcCgwLCAnIzFhMGYzZCcpOyBiZy5hZGRDb2xvclN0b3AoMSwgJyMwNzA0MTUnKTsKICBjdHguZmlsbFN0eWxlID0gYmc7IGN0eC5maWxsUmVjdCgwLCAwLCBXLCBIKTsKCiAgLy8g2K/bjNmI2KfYsdmH2KcKICBjb25zdCBmbGFzaFdhbGwgPSBzdGF0ZSA9PT0gJ3dvbicgJiYgTWF0aC5mbG9vcihzdFQgKiA0KSAlIDIgPT09IDE7CiAgY3R4LmRyYXdJbWFnZShmbGFzaFdhbGwgPyB3YWxsV2hpdGUgOiB3YWxsQmx1ZSwgb3gsIG95LCBDT0xTICogdHMsIFJPV1MgKiB0cyk7CgogIC8vINmG2YLYt9mH4oCM2YfYpwogIGZvciAobGV0IHIgPSAwOyByIDwgUk9XUzsgcisrKSBmb3IgKGxldCBjID0gMDsgYyA8IENPTFM7IGMrKykgewogICAgY29uc3QgZiA9IGZvb2Rbcl1bY107IGlmICghZikgY29udGludWU7CiAgICBjb25zdCB4ID0gc3goYyksIHkgPSBzeShyKTsKICAgIGlmIChmID09PSAxKSB7IGN0eC5maWxsU3R5bGUgPSAnI2ZmZDlhMCc7IGN0eC5iZWdpblBhdGgoKTsgY3R4LmFyYyh4LCB5LCB0cyAqIDAuMSwgMCwgVEFVKTsgY3R4LmZpbGwoKTsgfQogICAgZWxzZSB7CiAgICAgIGNvbnN0IHAgPSAwLjc1ICsgMC4yNSAqIE1hdGguc2luKHRtICogOCk7CiAgICAgIGN0eC5zaGFkb3dDb2xvciA9ICcjZmZmM2MwJzsgY3R4LnNoYWRvd0JsdXIgPSB0cyAqIDAuOTsgY3R4LmZpbGxTdHlsZSA9ICcjZmZmM2MwJzsKICAgICAgY3R4LmJlZ2luUGF0aCgpOyBjdHguYXJjKHgsIHksIHRzICogMC4yNyAqIHAsIDAsIFRBVSk7IGN0eC5maWxsKCk7IGN0eC5zaGFkb3dCbHVyID0gMDsKICAgIH0KICB9CgogIC8vINix2YjYreKAjNmH2KcKICBpZiAoc3RhdGUgIT09ICd3b24nKSB7CiAgICBnaG9zdHMuZm9yRWFjaCgoZywgaSkgPT4gewogICAgICBsZXQgW2d4LCBneV0gPSBwb3NPZihnKTsKICAgICAgaWYgKGcubW9kZSA9PT0gJ2hvdXNlJykgZ3kgKz0gTWF0aC5zaW4odG0gKiA2ICsgaSkgKiAwLjE7CiAgICAgIGlmIChzdGF0ZSA9PT0gJ2R5aW5nJyAmJiBzdFQgPiAwLjQpIHJldHVybjsKICAgICAgZHJhd0dob3N0KGcsIHN4KGd4KSwgc3koZ3kpKTsKICAgIH0pOwogIH0KCiAgLy8g2b7aqeKAjNmF2YYKICBjb25zdCByciA9IHRzICogMC40NjsKICBpZiAoc3RhdGUgPT09ICdkeWluZycpIHsKICAgIGNvbnN0IGsgPSBNYXRoLm1pbihzdFQgLyAxLjUsIDEpOwogICAgaWYgKGsgPCAxKSBkcmF3UGFjKHN4KHBhYy5jICsgcGFjLmR4ICogcGFjLnQpLCBzeShwYWMuciArIHBhYy5keSAqIHBhYy50KSwgLU1hdGguUEkgLyAyLCAwLjMgKyBrICogKE1hdGguUEkgLSAwLjMyKSwgcnIpOwogIH0gZWxzZSB7CiAgICBjb25zdCBbcHgsIHB5XSA9IHBvc09mKHBhYyk7CiAgICBjb25zdCBtb3ZpbmcgPSBwYWMuZHggfHwgcGFjLmR5OwogICAgY29uc3QgbW91dGggPSBtb3ZpbmcgPyAwLjA2ICsgMC4zICogKDAuNSArIDAuNSAqIE1hdGguc2luKHRtICogMTgpKSA6IDAuMjg7CiAgICBkcmF3UGFjKHN4KHB4KSwgc3kocHkpLCBsYXN0QW5nLCBtb3V0aCwgcnIpOwogIH0KCiAgLy8g2LDYsdin2Kog2Ygg2KfZhdiq24zYp9iyINi02YbYp9mI2LEKICBjdHguZ2xvYmFsQ29tcG9zaXRlT3BlcmF0aW9uID0gJ2xpZ2h0ZXInOwogIGZvciAoY29uc3QgcCBvZiBwYXJ0cykgewogICAgY3R4Lmdsb2JhbEFscGhhID0gTWF0aC5tYXgoMCwgcC5saWZlIC8gMC42KTsgY3R4LmZpbGxTdHlsZSA9IHAuY29sOwogICAgY3R4LmJlZ2luUGF0aCgpOyBjdHguYXJjKHAueCwgcC55LCAyLjIsIDAsIFRBVSk7IGN0eC5maWxsKCk7CiAgfQogIGN0eC5nbG9iYWxBbHBoYSA9IDE7IGN0eC5nbG9iYWxDb21wb3NpdGVPcGVyYXRpb24gPSAnc291cmNlLW92ZXInOwogIGN0eC50ZXh0QWxpZ24gPSAnY2VudGVyJzsgY3R4LnRleHRCYXNlbGluZSA9ICdtaWRkbGUnOwogIGN0eC5mb250ID0gJ2JvbGQgJyArIE1hdGgucm91bmQodHMgKiAwLjcpICsgJ3B4IFRhaG9tYSwgc2Fucy1zZXJpZic7CiAgZm9yIChjb25zdCBmIG9mIGZsb2F0cykgewogICAgY3R4Lmdsb2JhbEFscGhhID0gTWF0aC5taW4oMSwgZi5saWZlICogMik7IGN0eC5maWxsU3R5bGUgPSAnIzVlZTZkMCc7CiAgICBjdHguZmlsbFRleHQoZmEoZi50ZXh0KSwgc3goZi54KSwgc3koZi55KSAtICgwLjkgLSBmLmxpZmUpICogdHMpOwogIH0KICBjdHguZ2xvYmFsQWxwaGEgPSAxOwoKICAvLyDZvtuM2KfZhSDYr9in2K7ZhCDYqNin2LLbjAogIGlmIChzdGF0ZSA9PT0gJ3JlYWR5JykgewogICAgY3R4LmZpbGxTdHlsZSA9ICcjZmZlMTRhJzsgY3R4LnNoYWRvd0NvbG9yID0gJyNmZmUxNGEnOyBjdHguc2hhZG93Qmx1ciA9IDE0OwogICAgY3R4LmZvbnQgPSAnYm9sZCAnICsgTWF0aC5yb3VuZCh0cyAqIDEuMCkgKyAncHggVGFob21hLCBzYW5zLXNlcmlmJzsKICAgIGN0eC5maWxsVGV4dCgn2KLZhdin2K/ZhyEnLCBzeCg5KSwgc3koMTEpKTsKICAgIGN0eC5zaGFkb3dCbHVyID0gMDsKICB9CgogIC8vINmG2YjYp9ixINio2KfZhNinINmIINm+2KfbjNuM2YYKICBjdHguZmlsbFN0eWxlID0gJyNmNGVjZmYnOyBjdHguZm9udCA9ICdib2xkICcgKyBNYXRoLnJvdW5kKE1hdGgubWF4KDE1LCB0cyAqIDAuOCkpICsgJ3B4IFRhaG9tYSwgc2Fucy1zZXJpZic7CiAgY29uc3QgdG9wID0gTWF0aC5tYXgoMjIsIG95IC0gdHMgKiAwLjkpOwogIGN0eC50ZXh0QWxpZ24gPSAnbGVmdCc7IGN0eC5maWxsVGV4dChmYShzY29yZSksIG94ICsgNiwgdG9wKTsKICBjdHgudGV4dEFsaWduID0gJ3JpZ2h0JzsgY3R4LmZpbGxTdHlsZSA9ICcjZmZkOWEwJzsgY3R4LmZpbGxUZXh0KCfYsdqp2YjYsdivICcgKyBmYShiZXN0KSwgb3ggKyBDT0xTICogdHMgLSA2LCB0b3ApOwogIGN0eC50ZXh0QWxpZ24gPSAnY2VudGVyJzsgY3R4LmZpbGxTdHlsZSA9ICcjNWVlNmQwJzsgY3R4LmZpbGxUZXh0KCfZhdix2K3ZhNmHICcgKyBmYShsZXZlbCksIFcgLyAyLCB0b3ApOwogIGZvciAobGV0IGkgPSAwOyBpIDwgbGl2ZXMgLSAoc3RhdGUgPT09ICdkeWluZycgPyAxIDogMCk7IGkrKykgewogICAgZHJhd1BhYyhveCArIHRzICogMS4yICsgaSAqIHRzICogMS4zLCBveSArIFJPV1MgKiB0cyArIHRzICogMS4xLCAwLCAwLjM1LCB0cyAqIDAuNDUpOwogIH0KfQoKLyogLS0tLS0tLS0tLSDZiNix2YjYr9uMIC0tLS0tLS0tLS0gKi8KZnVuY3Rpb24gc3RhcnRJZk5lZWRlZCgpewogIGluaXRBdWRpbygpOwogIGlmIChzdGF0ZSA9PT0gJ3RpdGxlJyB8fCBzdGF0ZSA9PT0gJ292ZXInKSBuZXdHYW1lKCk7Cn0KbGV0IHNwID0gbnVsbDsKYWRkRXZlbnRMaXN0ZW5lcigncG9pbnRlcmRvd24nLCBlID0+IHsKICBpZiAoZS50YXJnZXQuY2xvc2VzdCAmJiBlLnRhcmdldC5jbG9zZXN0KCcjbXV0ZScpKSByZXR1cm47CiAgZS5wcmV2ZW50RGVmYXVsdCgpOyBzdGFydElmTmVlZGVkKCk7IHNwID0geyB4OiBlLmNsaWVudFgsIHk6IGUuY2xpZW50WSB9Owp9KTsKYWRkRXZlbnRMaXN0ZW5lcigncG9pbnRlcm1vdmUnLCBlID0+IHsKICBpZiAoIXNwKSByZXR1cm47CiAgY29uc3QgZHggPSBlLmNsaWVudFggLSBzcC54LCBkeSA9IGUuY2xpZW50WSAtIHNwLnk7CiAgaWYgKE1hdGguaHlwb3QoZHgsIGR5KSA8IDE2KSByZXR1cm47CiAgaWYgKE1hdGguYWJzKGR4KSA+IE1hdGguYWJzKGR5KSkgc2V0RGlyKGR4ID4gMCA/IDEgOiAtMSwgMCk7IGVsc2Ugc2V0RGlyKDAsIGR5ID4gMCA/IDEgOiAtMSk7CiAgc3AgPSB7IHg6IGUuY2xpZW50WCwgeTogZS5jbGllbnRZIH07Cn0pOwphZGRFdmVudExpc3RlbmVyKCdwb2ludGVydXAnLCAoKSA9PiB7IHNwID0gbnVsbDsgfSk7CmFkZEV2ZW50TGlzdGVuZXIoJ3BvaW50ZXJjYW5jZWwnLCAoKSA9PiB7IHNwID0gbnVsbDsgfSk7CmFkZEV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLCBlID0+IHsKICBjb25zdCBtID0geyBBcnJvd1VwOlswLC0xXSwgQXJyb3dEb3duOlswLDFdLCBBcnJvd0xlZnQ6Wy0xLDBdLCBBcnJvd1JpZ2h0OlsxLDBdLCB3OlswLC0xXSwgczpbMCwxXSwgYTpbLTEsMF0sIGQ6WzEsMF0gfVtlLmtleV07CiAgaWYgKG0pIHsgZS5wcmV2ZW50RGVmYXVsdCgpOyBzdGFydElmTmVlZGVkKCk7IHNldERpcihtWzBdLCBtWzFdKTsgfQogIGVsc2UgaWYgKGUuY29kZSA9PT0gJ1NwYWNlJykgeyBlLnByZXZlbnREZWZhdWx0KCk7IHN0YXJ0SWZOZWVkZWQoKTsgfQp9KTsKCmxldCBsYXN0ID0gcGVyZm9ybWFuY2Uubm93KCk7CmZ1bmN0aW9uIGZyYW1lKG5vdyl7CiAgY29uc3QgZHQgPSBNYXRoLm1pbigobm93IC0gbGFzdCkgLyAxMDAwLCAwLjA1KTsgbGFzdCA9IG5vdzsKICB1cGRhdGUoZHQpOyBkcmF3KCk7CiAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKGZyYW1lKTsKfQpyZXF1ZXN0QW5pbWF0aW9uRnJhbWUoZnJhbWUpOwo8L3NjcmlwdD4KPC9ib2R5Pgo8L2h0bWw+Cg==',hokm:'PCFET0NUWVBFIGh0bWw+CjxodG1sIGxhbmc9ImZhIiBkaXI9InJ0bCI+CjxoZWFkPgo8bWV0YSBjaGFyc2V0PSJ1dGYtOCI+CjxtZXRhIG5hbWU9InZpZXdwb3J0IiBjb250ZW50PSJ3aWR0aD1kZXZpY2Utd2lkdGgsaW5pdGlhbC1zY2FsZT0xLHZpZXdwb3J0LWZpdD1jb3ZlciI+Cjx0aXRsZT7Yrdqp2YUg2K/ZiCDZhtmB2LHZhyDYotmG2YTYp9uM2YY8L3RpdGxlPgo8bGluayBocmVmPSJodHRwczovL2ZvbnRzLmdvb2dsZWFwaXMuY29tL2NzczI/ZmFtaWx5PVZhemlybWF0bjp3Z2h0QDQwMDs2MDA7ODAwJmRpc3BsYXk9c3dhcCIgcmVsPSJzdHlsZXNoZWV0Ij4KPHN0eWxlPgo6cm9vdHsKICAtLWdvbGQ6I2U4YzI2YTsgLS1nb2xkMjojYjg4OTJiOyAtLWl2b3J5OiNmN2YwZGY7IC0tY3JpbXNvbjojYjMyNjNlOwogIC0tbm9pc2U6dXJsKCJkYXRhOmltYWdlL3N2Zyt4bWwsJTNDc3ZnIHhtbG5zPSdodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Zycgd2lkdGg9JzIyMCcgaGVpZ2h0PScyMjAnJTNFJTNDZmlsdGVyIGlkPSduJyUzRSUzQ2ZlVHVyYnVsZW5jZSB0eXBlPSdmcmFjdGFsTm9pc2UnIGJhc2VGcmVxdWVuY3k9Jy44NScgbnVtT2N0YXZlcz0nMycgc3RpdGNoVGlsZXM9J3N0aXRjaCcvJTNFJTNDZmVDb2xvck1hdHJpeCB2YWx1ZXM9JzAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwIC4zOCAwJy8lM0UlM0MvZmlsdGVyJTNFJTNDcmVjdCB3aWR0aD0nMTAwJTI1JyBoZWlnaHQ9JzEwMCUyNScgZmlsdGVyPSd1cmwoJTIzbiknLyUzRSUzQy9zdmclM0UiKTsKICAtLWdyYWluOnVybCgiZGF0YTppbWFnZS9zdmcreG1sLCUzQ3N2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPSczMDAnIGhlaWdodD0nMzAwJyUzRSUzQ2ZpbHRlciBpZD0ndyclM0UlM0NmZVR1cmJ1bGVuY2UgdHlwZT0nZnJhY3RhbE5vaXNlJyBiYXNlRnJlcXVlbmN5PScuMDA4IC4yNScgbnVtT2N0YXZlcz0nMycgc2VlZD0nNCcvJTNFJTNDZmVDb2xvck1hdHJpeCB2YWx1ZXM9JzAgMCAwIDAgLjIgMCAwIDAgMCAuMSAwIDAgMCAwIC4wMyAwIDAgMCAuNiAwJy8lM0UlM0MvZmlsdGVyJTNFJTNDcmVjdCB3aWR0aD0nMTAwJTI1JyBoZWlnaHQ9JzEwMCUyNScgZmlsdGVyPSd1cmwoJTIzdyknLyUzRSUzQy9zdmclM0UiKTsKICAtLWZlbHQ6dmFyKC0tbm9pc2UpLHJhZGlhbC1ncmFkaWVudChlbGxpcHNlIGF0IDUwJSA0NSUsIzIzODY0ZiAwJSwjMTc2MzM5IDU1JSwjMGMzZTI1IDEwMCUpOwp9Cip7Ym94LXNpemluZzpib3JkZXItYm94Oy13ZWJraXQtdGFwLWhpZ2hsaWdodC1jb2xvcjp0cmFuc3BhcmVudH0KaHRtbCxib2R5e21hcmdpbjowO2hlaWdodDoxMDAlO292ZXJmbG93OmhpZGRlbn0KYm9keXsKICBmb250LWZhbWlseTpWYXppcm1hdG4sVGFob21hLHN5c3RlbS11aSxzYW5zLXNlcmlmO2NvbG9yOnZhcigtLWl2b3J5KTtiYWNrZ3JvdW5kOiMwYjJiMWI7CiAgcGFkZGluZzplbnYoc2FmZS1hcmVhLWluc2V0LXRvcCkgZW52KHNhZmUtYXJlYS1pbnNldC1yaWdodCkgZW52KHNhZmUtYXJlYS1pbnNldC1ib3R0b20pIGVudihzYWZlLWFyZWEtaW5zZXQtbGVmdCk7Cn0KLmhpZGRlbntkaXNwbGF5Om5vbmUhaW1wb3J0YW50fQouc2NyZWVue2hlaWdodDoxMDBkdmh9CmJ1dHRvbntmb250LWZhbWlseTppbmhlcml0O2N1cnNvcjpwb2ludGVyfQoKLyogLS0tLS0tLS0tLSBjYXJkcyAtLS0tLS0tLS0tICovCi5jYXJkewogIC0tY3c6NjJweDt3aWR0aDp2YXIoLS1jdyk7YXNwZWN0LXJhdGlvOjUvNztib3JkZXItcmFkaXVzOmNhbGModmFyKC0tY3cpKi4wOSk7ZmxleDpub25lO3Bvc2l0aW9uOnJlbGF0aXZlOwogIGJhY2tncm91bmQ6bGluZWFyLWdyYWRpZW50KDE0NWRlZywjZmZmZGY2LCNmMWU3Y2MpOwogIGJveC1zaGFkb3c6MCAxcHggMCAjZmZmIGluc2V0LDAgMnB4IDVweCAjMDAwOCwwIDAgMCAxcHggI2I5YTY3YTt1c2VyLXNlbGVjdDpub25lOwp9Ci5jYXJkIHN2Z3t3aWR0aDoxMDAlO2hlaWdodDoxMDAlO2Rpc3BsYXk6YmxvY2s7Ym9yZGVyLXJhZGl1czppbmhlcml0fQouY2FyZC5iYWNre2JhY2tncm91bmQ6I2ZmZmFmMH0KCi8qIC0tLS0tLS0tLS0gbG9iYnkgLS0tLS0tLS0tLSAqLwojbG9iYnksI3dhaXR7CiAgYmFja2dyb3VuZDp2YXIoLS1mZWx0KTtkaXNwbGF5OmZsZXg7ZmxleC1kaXJlY3Rpb246Y29sdW1uO2FsaWduLWl0ZW1zOmNlbnRlcjtqdXN0aWZ5LWNvbnRlbnQ6Y2VudGVyOwogIGdhcDoxMnB4O3BhZGRpbmc6MjBweDt0ZXh0LWFsaWduOmNlbnRlcjtvdmVyZmxvdy15OmF1dG8KfQouZmFue2Rpc3BsYXk6ZmxleDtkaXJlY3Rpb246bHRyO2hlaWdodDoxMThweDthbGlnbi1pdGVtczpmbGV4LWVuZDttYXJnaW4tYm90dG9tOjZweH0KLmZhbiAuY2FyZHstLWN3OjY0cHg7bWFyZ2luLWxlZnQ6LTI2cHg7dHJhbnNmb3JtLW9yaWdpbjo1MCUgMTQwJTtib3gtc2hhZG93OjAgNHB4IDEwcHggIzAwMGEsMCAwIDAgMXB4ICNiOWE2N2F9Ci5mYW4gLmNhcmQ6Zmlyc3QtY2hpbGR7bWFyZ2luLWxlZnQ6MH0KaDF7Zm9udC1zaXplOjQ0cHg7bWFyZ2luOjA7Zm9udC13ZWlnaHQ6ODAwO2NvbG9yOnZhcigtLWdvbGQpO3RleHQtc2hhZG93OjAgMnB4IDAgIzVhM2QwNiwwIDZweCAxOHB4ICMwMDBhO2xpbmUtaGVpZ2h0OjEuMX0KaDEgc21hbGx7ZGlzcGxheTpibG9jaztmb250LXNpemU6MTRweDtmb250LXdlaWdodDo0MDA7Y29sb3I6I2NmZThkNjt0ZXh0LXNoYWRvdzpub25lO21hcmdpbi10b3A6NnB4fQppbnB1dHsKICBmb250LWZhbWlseTppbmhlcml0O2ZvbnQtc2l6ZToxOHB4O3BhZGRpbmc6MTJweCAxNHB4O2JvcmRlci1yYWRpdXM6MTJweDtib3JkZXI6MnB4IHNvbGlkICMwYjJiMWI7CiAgYmFja2dyb3VuZDojZmZmYWYwO2NvbG9yOiMyMjI7d2lkdGg6MTAwJTttYXgtd2lkdGg6MzAwcHg7dGV4dC1hbGlnbjpjZW50ZXI7b3V0bGluZTpub25lO2JveC1zaGFkb3c6MCAycHggNnB4ICMwMDA2IGluc2V0Cn0KaW5wdXQ6Zm9jdXN7Ym9yZGVyLWNvbG9yOnZhcigtLWdvbGQpfQouYnRuewogIGZvbnQtc2l6ZToxOHB4O2ZvbnQtd2VpZ2h0OjgwMDtwYWRkaW5nOjEzcHggMjJweDtib3JkZXItcmFkaXVzOjEycHg7d2lkdGg6MTAwJTttYXgtd2lkdGg6MzAwcHg7Ym9yZGVyOjFweCBzb2xpZCAjNWEzZDA2OwogIGJhY2tncm91bmQ6bGluZWFyLWdyYWRpZW50KCNmM2QyN2QsI2M5OWEzNSk7Y29sb3I6IzJhMWIwMDtib3gtc2hhZG93OjAgM3B4IDAgIzdhNTgxMCwwIDZweCAxMnB4ICMwMDA2Cn0KLmJ0bjphY3RpdmV7dHJhbnNmb3JtOnRyYW5zbGF0ZVkoMnB4KTtib3gtc2hhZG93OjAgMXB4IDAgIzdhNTgxMH0KLmJ0bjpkaXNhYmxlZHtvcGFjaXR5Oi42fQouYnRuLmFsdHtiYWNrZ3JvdW5kOnJnYmEoMCwwLDAsLjI4KTtjb2xvcjp2YXIoLS1pdm9yeSk7Ym9yZGVyOjJweCBzb2xpZCB2YXIoLS1nb2xkKTtib3gtc2hhZG93Om5vbmV9Ci5kaXZpZGVye2NvbG9yOiNiOWQ5YzM7Zm9udC1zaXplOjEzcHh9CmRldGFpbHN7bWF4LXdpZHRoOjMwMHB4O3dpZHRoOjEwMCU7Zm9udC1zaXplOjEzcHg7Y29sb3I6I2NmZThkNn0KZGV0YWlscyBzdW1tYXJ5e2N1cnNvcjpwb2ludGVyO21hcmdpbi1ib3R0b206OHB4fQpkZXRhaWxzIGlucHV0e2ZvbnQtc2l6ZToxM3B4O21hcmdpbi1ib3R0b206NnB4O2RpcmVjdGlvbjpsdHJ9CiNjb2Rle2ZvbnQtc2l6ZTo1OHB4O2ZvbnQtd2VpZ2h0OjgwMDtsZXR0ZXItc3BhY2luZzo4cHg7Y29sb3I6dmFyKC0tZ29sZCk7ZGlyZWN0aW9uOmx0cjt0ZXh0LXNoYWRvdzowIDNweCAxNHB4ICMwMDBhfQouaGludHtjb2xvcjojY2ZlOGQ2O2ZvbnQtc2l6ZToxNHB4O21heC13aWR0aDozMDBweDtsaW5lLWhlaWdodDoxLjl9CgovKiAtLS0tLS0tLS0tIGdhbWUgLS0tLS0tLS0tLSAqLwojZ2FtZXtkaXNwbGF5OmZsZXg7ZmxleC1kaXJlY3Rpb246Y29sdW1uO3BhZGRpbmc6NnB4O2JhY2tncm91bmQ6IzBhMjQxNn0KLmZyYW1lewogIGZsZXg6MTttaW4taGVpZ2h0OjA7Ym9yZGVyLXJhZGl1czoyNHB4O3BhZGRpbmc6OXB4OwogIGJhY2tncm91bmQ6dmFyKC0tZ3JhaW4pLGxpbmVhci1ncmFkaWVudCgxMzVkZWcsIzlhNmEzNSwjNWIzODE4IDYwJSwjN2E0ZTI0KTsKICBib3gtc2hhZG93OjAgOHB4IDI0cHggIzAwMGMsMCAwIDAgMXB4ICMyYTE2MDYsaW5zZXQgMCAycHggMCAjYzg5YTYzYWEKfQouZmVsdHsKICBoZWlnaHQ6MTAwJTtib3JkZXItcmFkaXVzOjE2cHg7YmFja2dyb3VuZDp2YXIoLS1mZWx0KTtkaXNwbGF5OmZsZXg7ZmxleC1kaXJlY3Rpb246Y29sdW1uO2p1c3RpZnktY29udGVudDpzcGFjZS1iZXR3ZWVuOwogIHBhZGRpbmc6MTBweCA4cHggOHB4O3Bvc2l0aW9uOnJlbGF0aXZlO292ZXJmbG93OmhpZGRlbjsKICBib3gtc2hhZG93Omluc2V0IDAgMCA1MHB4ICMwMDBiLGluc2V0IDAgMCAwIDJweCAjMGEzMzIwCn0KLnRvcCwuYm90dG9te3RleHQtYWxpZ246Y2VudGVyO3Bvc2l0aW9uOnJlbGF0aXZlO3otaW5kZXg6MX0KLnBuYW1le2ZvbnQtc2l6ZToxNXB4O2ZvbnQtd2VpZ2h0OjYwMDt0ZXh0LXNoYWRvdzowIDFweCAzcHggIzAwMH0KLmNyb3due2NvbG9yOnZhcigtLWdvbGQpfQojb3BwQ2FyZHN7ZGlzcGxheTpmbGV4O2p1c3RpZnktY29udGVudDpjZW50ZXI7ZGlyZWN0aW9uOmx0cjttYXJnaW4tdG9wOjZweH0KI29wcENhcmRzIC5jYXJkey0tY3c6MzZweDttYXJnaW4tbGVmdDotMjFweH0KI29wcENhcmRzIC5jYXJkOmZpcnN0LWNoaWxke21hcmdpbi1sZWZ0OjB9Ci5taWR7ZmxleDoxO2Rpc3BsYXk6ZmxleDtmbGV4LWRpcmVjdGlvbjpjb2x1bW47YWxpZ24taXRlbXM6Y2VudGVyO2p1c3RpZnktY29udGVudDpjZW50ZXI7Z2FwOjEwcHg7cG9zaXRpb246cmVsYXRpdmU7ei1pbmRleDoxfQoubWlkOjpiZWZvcmV7CiAgY29udGVudDoiIjtwb3NpdGlvbjphYnNvbHV0ZTtpbnNldDo2JSA0JTtib3JkZXItcmFkaXVzOjUwJTtib3JkZXI6MnB4IHNvbGlkICNlOGMyNmE1NTt6LWluZGV4Oi0xOwogIGJhY2tncm91bmQ6dXJsKCJkYXRhOmltYWdlL3N2Zyt4bWwsJTNDc3ZnIHhtbG5zPSdodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Zycgdmlld0JveD0nLTUwIC01MCAxMDAgMTAwJyUzRSUzQ2cgZmlsbD0nbm9uZScgc3Ryb2tlPSclMjNlOGMyNmEnIHN0cm9rZS1vcGFjaXR5PScuMjInIHN0cm9rZS13aWR0aD0nMSclM0UlM0NyZWN0IHg9Jy0yNCcgeT0nLTI0JyB3aWR0aD0nNDgnIGhlaWdodD0nNDgnLyUzRSUzQ3JlY3QgeD0nLTI0JyB5PSctMjQnIHdpZHRoPSc0OCcgaGVpZ2h0PSc0OCcgdHJhbnNmb3JtPSdyb3RhdGUoNDUpJy8lM0UlM0NjaXJjbGUgcj0nMTMnLyUzRSUzQ2NpcmNsZSByPSc0Jy8lM0UlM0MvZyUzRSUzQy9zdmclM0UiKSBjZW50ZXIvNjIlIG5vLXJlcGVhdDsKfQouc2NvcmViYXJ7ZGlzcGxheTpmbGV4O2dhcDo4cHg7YWxpZ24taXRlbXM6Y2VudGVyO2ZsZXgtd3JhcDp3cmFwO2p1c3RpZnktY29udGVudDpjZW50ZXI7Zm9udC1zaXplOjEzcHh9Ci5waWxse2JhY2tncm91bmQ6IzAwMDg7Ym9yZGVyOjFweCBzb2xpZCAjZThjMjZhNjY7Ym9yZGVyLXJhZGl1czo5OTlweDtwYWRkaW5nOjRweCAxMXB4O2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7Z2FwOjVweH0KLnBpbGwgYntjb2xvcjp2YXIoLS1nb2xkKTtmb250LXNpemU6MTVweH0KLnBpbGwgc3Zne3dpZHRoOjE3cHg7aGVpZ2h0OjE3cHh9CiN0YWJsZXtkaXNwbGF5OmZsZXg7Z2FwOjE2cHg7YWxpZ24taXRlbXM6Y2VudGVyO2p1c3RpZnktY29udGVudDpjZW50ZXI7bWluLWhlaWdodDoxMjhweH0KLnNsb3R7d2lkdGg6ODZweDthc3BlY3QtcmF0aW86NS83O2JvcmRlci1yYWRpdXM6OXB4O2JvcmRlcjoycHggZGFzaGVkICNlOGMyNmE0MDtkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2p1c3RpZnktY29udGVudDpjZW50ZXI7Zm9udC1zaXplOjEycHg7Y29sb3I6I2U4YzI2YTg4fQouc2xvdC5vbntib3JkZXI6MH0KLnNsb3QgLmNhcmR7LS1jdzo4NnB4O2JveC1zaGFkb3c6MCA4cHggMTRweCAjMDAwYSwwIDAgMCAxcHggI2I5YTY3YX0KLnNsb3QgLmNhcmQuZmx5LW1le2FuaW1hdGlvbjpmbHlNZSAuMjhzIGN1YmljLWJlemllciguMiwuOCwuMywxKX0KLnNsb3QgLmNhcmQuZmx5LW9wcHthbmltYXRpb246Zmx5T3BwIC4yOHMgY3ViaWMtYmV6aWVyKC4yLC44LC4zLDEpfQpAa2V5ZnJhbWVzIGZseU1le2Zyb217dHJhbnNmb3JtOnRyYW5zbGF0ZVkoMTUwcHgpIHNjYWxlKC43KSByb3RhdGUoOGRlZyk7b3BhY2l0eTouMn10b3t0cmFuc2Zvcm06bm9uZTtvcGFjaXR5OjF9fQpAa2V5ZnJhbWVzIGZseU9wcHtmcm9te3RyYW5zZm9ybTp0cmFuc2xhdGVZKC0xNTBweCkgc2NhbGUoLjcpIHJvdGF0ZSgtOGRlZyk7b3BhY2l0eTouMn10b3t0cmFuc2Zvcm06bm9uZTtvcGFjaXR5OjF9fQojc3RhdHVze2ZvbnQtc2l6ZToxN3B4O2ZvbnQtd2VpZ2h0OjYwMDttaW4taGVpZ2h0OjI4cHg7dGV4dC1hbGlnbjpjZW50ZXI7dGV4dC1zaGFkb3c6MCAycHggNHB4ICMwMDB9CiNzdGF0dXMubWV7Y29sb3I6dmFyKC0tZ29sZCl9CiN0cnVtcFBpY2t7ZGlzcGxheTpmbGV4O2dhcDoxMHB4fQojdHJ1bXBQaWNrIGJ1dHRvbnsKICB3aWR0aDo2MHB4O2hlaWdodDo2OHB4O2JvcmRlci1yYWRpdXM6MTJweDtib3JkZXI6MnB4IHNvbGlkIHZhcigtLWdvbGQyKTtwYWRkaW5nOjhweDsKICBiYWNrZ3JvdW5kOmxpbmVhci1ncmFkaWVudCgxNDVkZWcsI2ZmZmRmNiwjZWZlM2MyKTtib3gtc2hhZG93OjAgNHB4IDhweCAjMDAwYQp9CiN0cnVtcFBpY2sgYnV0dG9uIHN2Z3t3aWR0aDoxMDAlO2hlaWdodDoxMDAlfQojdHJ1bXBQaWNrIGJ1dHRvbjphY3RpdmV7dHJhbnNmb3JtOnNjYWxlKC45NSl9CiNoYW5ke2Rpc3BsYXk6ZmxleDtqdXN0aWZ5LWNvbnRlbnQ6Y2VudGVyO2RpcmVjdGlvbjpsdHI7cGFkZGluZzoxNnB4IDAgMnB4O21pbi1oZWlnaHQ6MTEycHh9CiNoYW5kIC5jYXJkey0tY3c6NjJweDt0cmFuc2Zvcm0tb3JpZ2luOjUwJSAxNjAlO3RyYW5zZm9ybTp0cmFuc2xhdGVZKHZhcigtLXksMCkpIHJvdGF0ZSh2YXIoLS1yLDBkZWcpKTt0cmFuc2l0aW9uOnRyYW5zZm9ybSAuMTJzLGZpbHRlciAuMTJzfQojaGFuZCAuY2FyZC5kaXN7ZmlsdGVyOmJyaWdodG5lc3MoLjYyKX0KI2hhbmQgLmNhcmQuY2Fue2N1cnNvcjpwb2ludGVyO2JveC1zaGFkb3c6MCAwIDAgMnB4IHZhcigtLWdvbGQpLDAgM3B4IDhweCAjMDAwYX0KI2hhbmQgLmNhcmQuY2FuOmhvdmVyLCNoYW5kIC5jYXJkLmNhbjphY3RpdmV7dHJhbnNmb3JtOnRyYW5zbGF0ZVkoY2FsYyh2YXIoLS15LDBweCkgLSAxNnB4KSkgcm90YXRlKHZhcigtLXIsMGRlZykpfQojdG9hc3R7CiAgcG9zaXRpb246Zml4ZWQ7dG9wOmNhbGMoMTBweCArIGVudihzYWZlLWFyZWEtaW5zZXQtdG9wKSk7bGVmdDo1MCU7dHJhbnNmb3JtOnRyYW5zbGF0ZVgoLTUwJSk7CiAgYmFja2dyb3VuZDp2YXIoLS1jcmltc29uKTtjb2xvcjojZmZmO3BhZGRpbmc6OXB4IDE2cHg7Ym9yZGVyLXJhZGl1czoxMHB4O2ZvbnQtc2l6ZToxNHB4O3otaW5kZXg6OTttYXgtd2lkdGg6OTJ2dzt0ZXh0LWFsaWduOmNlbnRlcjsKICBib3gtc2hhZG93OjAgNHB4IDEycHggIzAwMDgKfQo8L3N0eWxlPgo8L2hlYWQ+Cjxib2R5PgoKPCEtLSBzaGFyZWQgU1ZHIHN5bWJvbHMgLS0+Cjxzdmcgd2lkdGg9IjAiIGhlaWdodD0iMCIgc3R5bGU9InBvc2l0aW9uOmFic29sdXRlIiBhcmlhLWhpZGRlbj0idHJ1ZSI+PGRlZnM+CiAgPHN5bWJvbCBpZD0ic0giIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48cGF0aCBmaWxsPSJjdXJyZW50Q29sb3IiIGQ9Ik01MCA5MkMxOCA2NiA0IDUwIDQgMzFDNCAxNSAxNiA1IDI5IDVDMzkgNSA0NiAxMCA1MCAxOEM1NCAxMCA2MSA1IDcxIDVDODQgNSA5NiAxNSA5NiAzMUM5NiA1MCA4MiA2NiA1MCA5MloiLz48L3N5bWJvbD4KICA8c3ltYm9sIGlkPSJzRCIgdmlld0JveD0iMCAwIDEwMCAxMDAiPjxwYXRoIGZpbGw9ImN1cnJlbnRDb2xvciIgZD0iTTUwIDNDNTggMjUgNzUgNDAgOTIgNTBDNzUgNjAgNTggNzUgNTAgOTdDNDIgNzUgMjUgNjAgOCA1MEMyNSA0MCA0MiAyNSA1MCAzWiIvPjwvc3ltYm9sPgogIDxzeW1ib2wgaWQ9InNTIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+PHBhdGggZmlsbD0iY3VycmVudENvbG9yIiBkPSJNNTAgM0M1MCAzIDkzIDM2IDkzIDYyQzkzIDc4IDgxIDg3IDY4IDg3QzYwIDg3IDU0IDgzIDUyIDc3QzUzIDg5IDU4IDk0IDY3IDk3TDMzIDk3QzQyIDk0IDQ3IDg5IDQ4IDc3QzQ2IDgzIDQwIDg3IDMyIDg3QzE5IDg3IDcgNzggNyA2MkM3IDM2IDUwIDMgNTAgM1oiLz48L3N5bWJvbD4KICA8c3ltYm9sIGlkPSJzQyIgdmlld0JveD0iMCAwIDEwMCAxMDAiPjxnIGZpbGw9ImN1cnJlbnRDb2xvciI+PGNpcmNsZSBjeD0iNTAiIGN5PSIyOCIgcj0iMjIiLz48Y2lyY2xlIGN4PSIyNiIgY3k9IjYyIiByPSIyMiIvPjxjaXJjbGUgY3g9Ijc0IiBjeT0iNjIiIHI9IjIyIi8+PHBhdGggZD0iTTUwIDUwQzUwIDc4IDQ2IDkwIDM2IDk4TDY0IDk4QzU0IDkwIDUwIDc4IDUwIDUwWiIvPjwvZz48L3N5bWJvbD4KICA8cGF0dGVybiBpZD0iYnAiIHdpZHRoPSIxMCIgaGVpZ2h0PSIxMCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+CiAgICA8cmVjdCB3aWR0aD0iMTAiIGhlaWdodD0iMTAiIGZpbGw9IiM3ZDFkMmMiLz4KICAgIDxwYXRoIGQ9Ik01IDBMMTAgNUw1IDEwTDAgNVoiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2M5OTczYSIgc3Ryb2tlLXdpZHRoPSIuNiIvPgogICAgPGNpcmNsZSBjeD0iNSIgY3k9IjUiIHI9IjEiIGZpbGw9IiNlOGMyNmEiLz4KICA8L3BhdHRlcm4+CjwvZGVmcz48L3N2Zz4KCjxkaXYgaWQ9InRvYXN0IiBjbGFzcz0iaGlkZGVuIj48L2Rpdj4KCjxkaXYgaWQ9ImxvYmJ5IiBjbGFzcz0ic2NyZWVuIj4KICA8ZGl2IGNsYXNzPSJmYW4iIGlkPSJmYW4iPjwvZGl2PgogIDxoMT7Yrdqp2YU8c21hbGw+2K/ZiCDZhtmB2LHZh9iMINii2YbZhNin24zZhiDZiCDYqNiv2YjZhiDYqtij2K7bjNixPC9zbWFsbD48L2gxPgogIDxpbnB1dCBpZD0ibmFtZUluIiBwbGFjZWhvbGRlcj0i2KfYs9mFINiq2YgiIG1heGxlbmd0aD0iMTQiIGF1dG9jb21wbGV0ZT0ib2ZmIj4KICA8YnV0dG9uIGNsYXNzPSJidG4iIGlkPSJjcmVhdGVCdG4iPtiz2KfYrtiqINin2KrYp9mCPC9idXR0b24+CiAgPGRpdiBjbGFzcz0iZGl2aWRlciI+24zYpyDaqdivINin2KrYp9mCINiv2YjYs9iq2Kog2LHYpyDZiNin2LHYryDaqdmGPC9kaXY+CiAgPGlucHV0IGlkPSJjb2RlSW4iIHBsYWNlaG9sZGVyPSLaqdivINu1INix2YLZhduMIiBpbnB1dG1vZGU9Im51bWVyaWMiIG1heGxlbmd0aD0iNSIgYXV0b2NvbXBsZXRlPSJvZmYiIGRpcj0ibHRyIj4KICA8YnV0dG9uIGNsYXNzPSJidG4gYWx0IiBpZD0iam9pbkJ0biI+2YjYsdmI2K8g2KjZhyDYp9iq2KfZgjwvYnV0dG9uPgo8L2Rpdj4KCjxkaXYgaWQ9IndhaXQiIGNsYXNzPSJzY3JlZW4gaGlkZGVuIj4KICA8ZGl2IGNsYXNzPSJoaW50Ij7aqdivINin2KrYp9mCINix2Kcg2KjYsdin24wg2K/ZiNiz2KrYqiDYqNmB2LHYs9iqPC9kaXY+CiAgPGRpdiBpZD0iY29kZSI+LS0tLS08L2Rpdj4KICA8YnV0dG9uIGNsYXNzPSJidG4gYWx0IiBpZD0iY29weUJ0biI+2qnZvtuMINqp2K88L2J1dHRvbj4KICA8ZGl2IGNsYXNzPSJoaW50Ij7YqNinINmI2LHZiNivINit2LHbjNmB2Iwg2KjYp9iy24wg2K7ZiNiv2qnYp9ixINi02LHZiNi5INmF24zigIzYtNmI2K8uINin24zZhiDYtdmB2K3ZhyDYsdinINmG2KjZhtivLjwvZGl2Pgo8L2Rpdj4KCjxkaXYgaWQ9ImdhbWUiIGNsYXNzPSJzY3JlZW4gaGlkZGVuIj4KICA8ZGl2IGNsYXNzPSJmcmFtZSI+PGRpdiBjbGFzcz0iZmVsdCI+CiAgICA8ZGl2IGNsYXNzPSJ0b3AiPgogICAgICA8ZGl2IGNsYXNzPSJwbmFtZSIgaWQ9Im9wcE5hbWUiPjwvZGl2PgogICAgICA8ZGl2IGlkPSJvcHBDYXJkcyI+PC9kaXY+CiAgICA8L2Rpdj4KICAgIDxkaXYgY2xhc3M9Im1pZCI+CiAgICAgIDxkaXYgY2xhc3M9InNjb3JlYmFyIj4KICAgICAgICA8c3BhbiBjbGFzcz0icGlsbCI+2KfZhdiq24zYp9iyIDxiIGlkPSJzYyI+MCA6IDA8L2I+INin2LIg27c8L3NwYW4+CiAgICAgICAgPHNwYW4gY2xhc3M9InBpbGwiPtiv2LPYquKAjNmH2KcgPGIgaWQ9InRrIj4wIC0gMDwvYj48L3NwYW4+CiAgICAgICAgPHNwYW4gY2xhc3M9InBpbGwiIGlkPSJ0cnVtcFBpbGwiPtit2qnZhTogLTwvc3Bhbj4KICAgICAgPC9kaXY+CiAgICAgIDxkaXYgaWQ9InRhYmxlIj48ZGl2IGNsYXNzPSJzbG90IiBpZD0ic2xvdE9wcCI+2K3YsduM2YE8L2Rpdj48ZGl2IGNsYXNzPSJzbG90IiBpZD0ic2xvdE1lIj7YqtmIPC9kaXY+PC9kaXY+CiAgICAgIDxkaXYgaWQ9InN0YXR1cyI+PC9kaXY+CiAgICAgIDxkaXYgaWQ9InRydW1wUGljayIgY2xhc3M9ImhpZGRlbiI+CiAgICAgICAgPGJ1dHRvbiBkYXRhLXM9IlMiIHN0eWxlPSJjb2xvcjojMTYyMDJhIj48c3ZnIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48dXNlIGhyZWY9IiNzUyIgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiLz48L3N2Zz48L2J1dHRvbj4KICAgICAgICA8YnV0dG9uIGRhdGEtcz0iSCIgc3R5bGU9ImNvbG9yOiNiMzI2M2UiPjxzdmcgdmlld0JveD0iMCAwIDEwMCAxMDAiPjx1c2UgaHJlZj0iI3NIIiB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIvPjwvc3ZnPjwvYnV0dG9uPgogICAgICAgIDxidXR0b24gZGF0YS1zPSJEIiBzdHlsZT0iY29sb3I6I2IzMjYzZSI+PHN2ZyB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+PHVzZSBocmVmPSIjc0QiIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIi8+PC9zdmc+PC9idXR0b24+CiAgICAgICAgPGJ1dHRvbiBkYXRhLXM9IkMiIHN0eWxlPSJjb2xvcjojMTYyMDJhIj48c3ZnIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48dXNlIGhyZWY9IiNzQyIgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiLz48L3N2Zz48L2J1dHRvbj4KICAgICAgPC9kaXY+CiAgICAgIDxidXR0b24gY2xhc3M9ImJ0biBoaWRkZW4iIGlkPSJhZ2FpbiI+2KjYp9iy24wg2K/ZiNio2KfYsdmHPC9idXR0b24+CiAgICA8L2Rpdj4KICAgIDxkaXYgY2xhc3M9ImJvdHRvbSI+CiAgICAgIDxkaXYgY2xhc3M9InBuYW1lIiBpZD0ibXlOYW1lIj48L2Rpdj4KICAgICAgPGRpdiBpZD0iaGFuZCI+PC9kaXY+CiAgICA8L2Rpdj4KICA8L2Rpdj48L2Rpdj4KPC9kaXY+Cgo8c2NyaXB0Pgpjb25zdCBTVUlUUz1bJ1MnLCdIJywnRCcsJ0MnXTsKY29uc3QgTkFNRT17Uzon2b7bjNqpJyxIOifYr9mEJyxEOifYrti02KonLEM6J9qv2LTZhtuM2LInfTsKY29uc3QgUks9ezExOidKJywxMjonUScsMTM6J0snLDE0OidBJ307CmNvbnN0IHJsPXI9PlJLW3JdfHxyOwpjb25zdCAkPWlkPT5kb2N1bWVudC5nZXRFbGVtZW50QnlJZChpZCk7CmNvbnN0IGlzUmVkPXM9PnM9PT0nSCd8fHM9PT0nRCc7CmNvbnN0IG5vcm09cz0+cy5yZXBsYWNlKC9b27At27ldL2csZD0+J9uw27Hbstuz27Tbtdu227fbuNu5Jy5pbmRleE9mKGQpKS5yZXBsYWNlKC9b2aAt2aldL2csZD0+J9mg2aHZotmj2aTZpdmm2afZqNmpJy5pbmRleE9mKGQpKS5yZXBsYWNlKC9cRC9nLCcnKTsKY29uc3QgZXNjPXM9PlN0cmluZyhzKS5yZXBsYWNlKC9bJjw+IiddL2csYz0+KHsnJic6JyZhbXA7JywnPCc6JyZsdDsnLCc+JzonJmd0OycsJyInOicmcXVvdDsnLCInIjonJiMzOTsnfVtjXSkpOwpjb25zdCBQUkVGSVg9J2hva20ycC0nOwpmdW5jdGlvbiBscyhrLHYpe3RyeXtpZih2PT09dW5kZWZpbmVkKXJldHVybiBsb2NhbFN0b3JhZ2UuZ2V0SXRlbShrKXx8Jyc7bG9jYWxTdG9yYWdlLnNldEl0ZW0oayx2KTt9Y2F0Y2goZSl7cmV0dXJuICcnfX0KZnVuY3Rpb24gc3Moayx2KXt0cnl7aWYodj09PXVuZGVmaW5lZClyZXR1cm4gc2Vzc2lvblN0b3JhZ2UuZ2V0SXRlbShrKXx8Jyc7c2Vzc2lvblN0b3JhZ2Uuc2V0SXRlbShrLHYpO31jYXRjaChlKXtyZXR1cm4gJyd9fQoKLyogPT09PT09PT09PT09PT09PT0gQ2FyZCBncmFwaGljcyA9PT09PT09PT09PT09PT09PSAqLwpjb25zdCBzdWl0VXNlPShzLHgseSxzaXplLHJvdCk9PmA8dXNlIGhyZWY9IiNzJHtzfSIgeD0iJHt4LXNpemUvMn0iIHk9IiR7eS1zaXplLzJ9IiB3aWR0aD0iJHtzaXplfSIgaGVpZ2h0PSIke3NpemV9IiR7cm90P2AgdHJhbnNmb3JtPSJyb3RhdGUoMTgwICR7eH0gJHt5fSkiYDonJ30vPmA7CmNvbnN0IFBJUFM9KCgpPT57CiAgY29uc3QgTD0zMSxDPTUwLFI9Njk7CiAgY29uc3Qgc2l4PVtbTCwzMF0sW1IsMzBdLFtMLDcwXSxbUiw3MF0sW0wsMTEwXSxbUiwxMTBdXTsKICByZXR1cm57CiAgICAyOltbQywzMF0sW0MsMTEwXV0sMzpbW0MsMzBdLFtDLDcwXSxbQywxMTBdXSwKICAgIDQ6W1tMLDMwXSxbUiwzMF0sW0wsMTEwXSxbUiwxMTBdXSw1OltbTCwzMF0sW1IsMzBdLFtDLDcwXSxbTCwxMTBdLFtSLDExMF1dLAogICAgNjpzaXgsNzpbLi4uc2l4LFtDLDUwXV0sODpbLi4uc2l4LFtDLDUwXSxbQyw5MF1dLAogICAgOTpbW0wsMzBdLFtSLDMwXSxbTCw1N10sW1IsNTddLFtMLDgzXSxbUiw4M10sW0wsMTEwXSxbUiwxMTBdLFtDLDcwXV0sCiAgICAxMDpbW0wsMzBdLFtSLDMwXSxbTCw1N10sW1IsNTddLFtMLDgzXSxbUiw4M10sW0wsMTEwXSxbUiwxMTBdLFs1MCw0M10sWzUwLDk3XV0KICB9Owp9KSgpOwpmdW5jdGlvbiBmaWd1cmUocixyb2JlKXsKICBsZXQgZz1gPHBhdGggZD0iTTI0IDY5QzI0IDU1IDM0IDQ5IDUwIDQ5QzY2IDQ5IDc2IDU1IDc2IDY5WiIgZmlsbD0iJHtyb2JlfSIgc3Ryb2tlPSIjMTExIiBzdHJva2Utd2lkdGg9Ii42Ii8+CiAgPHBhdGggZD0iTTUwIDQ5TDUwIDY5IiBzdHJva2U9IiNlNWI4NGEiIHN0cm9rZS13aWR0aD0iMiIvPgogIDxwYXRoIGQ9Ik0zMCA2OUMzMCA2MCAzNiA1NSA0MiA1M003MCA2OUM3MCA2MCA2NCA1NSA1OCA1MyIgc3Ryb2tlPSIjZTViODRhIiBzdHJva2Utd2lkdGg9IjEuNCIgZmlsbD0ibm9uZSIvPgogIDxlbGxpcHNlIGN4PSI1MCIgY3k9IjQ5IiByeD0iOSIgcnk9IjQiIGZpbGw9IiNmZmYiIHN0cm9rZT0iIzk5OSIgc3Ryb2tlLXdpZHRoPSIuNCIvPmA7CiAgaWYocj09PTEyKWcrPWA8cGF0aCBkPSJNNDEgMzNDMzMgMzggMzMgNTIgMzcgNjBMNDMgNTBMNDIgMzhaIiBmaWxsPSIjNmIzZTFkIi8+PHBhdGggZD0iTTU5IDMzQzY3IDM4IDY3IDUyIDYzIDYwTDU3IDUwTDU4IDM4WiIgZmlsbD0iIzZiM2UxZCIvPmA7CiAgaWYocj09PTExKWcrPWA8cGF0aCBkPSJNNDEgMzRDMzggNDAgMzkgNDYgNDEgNDhMNDMgNDBaIiBmaWxsPSIjNGEyYzE0Ii8+PHBhdGggZD0iTTU5IDM0QzYyIDQwIDYxIDQ2IDU5IDQ4TDU3IDQwWiIgZmlsbD0iIzRhMmMxNCIvPmA7CiAgZys9YDxlbGxpcHNlIGN4PSI1MCIgY3k9IjM4IiByeD0iOC41IiByeT0iMTAiIGZpbGw9IiNmM2NmYTYiIHN0cm9rZT0iIzZiNDQyMyIgc3Ryb2tlLXdpZHRoPSIuNiIvPgogIDxjaXJjbGUgY3g9IjQ2LjUiIGN5PSIzNi41IiByPSIxIi8+PGNpcmNsZSBjeD0iNTMuNSIgY3k9IjM2LjUiIHI9IjEiLz4KICA8cGF0aCBkPSJNNTAgMzcuNUw0OSA0MUw1MSA0MSIgc3Ryb2tlPSIjYTQ2YTNhIiBzdHJva2Utd2lkdGg9Ii41IiBmaWxsPSJub25lIi8+CiAgPHBhdGggZD0iTTQ3IDQzLjVRNTAgNDUuNSA1MyA0My41IiBzdHJva2U9IiM4YTJiMmIiIHN0cm9rZS13aWR0aD0iLjciIGZpbGw9Im5vbmUiLz5gOwogIGlmKHI9PT0xMyl7CiAgICBnKz1gPHBhdGggZD0iTTQyIDQwQzQyIDU0IDU4IDU0IDU4IDQwQzU2IDQ3IDQ0IDQ3IDQyIDQwWiIgZmlsbD0iI2NmYzdiNCIgc3Ryb2tlPSIjNmI2MzU1IiBzdHJva2Utd2lkdGg9Ii41Ii8+CiAgICA8cGF0aCBkPSJNNDAgMzBMNDAgMjBMNDUgMjVMNTAgMTdMNTUgMjVMNjAgMjBMNjAgMzBaIiBmaWxsPSIjZThiNzNhIiBzdHJva2U9IiM3YTVhMTAiIHN0cm9rZS13aWR0aD0iLjYiLz4KICAgIDxjaXJjbGUgY3g9IjUwIiBjeT0iMjMiIHI9IjEuNSIgZmlsbD0iI2M0MjYzZSIvPjxjaXJjbGUgY3g9IjQzIiBjeT0iMjciIHI9IjEiIGZpbGw9IiMyYjY2YzQiLz48Y2lyY2xlIGN4PSI1NyIgY3k9IjI3IiByPSIxIiBmaWxsPSIjMmI2NmM0Ii8+YDsKICB9ZWxzZSBpZihyPT09MTIpewogICAgZys9YDxwYXRoIGQ9Ik00MSAzMUw0MiAyM0w0NiAyN0w1MCAyMUw1NCAyN0w1OCAyM0w1OSAzMVoiIGZpbGw9IiNlOGI3M2EiIHN0cm9rZT0iIzdhNWExMCIgc3Ryb2tlLXdpZHRoPSIuNiIvPgogICAgPGNpcmNsZSBjeD0iNTAiIGN5PSIyNiIgcj0iMS4zIiBmaWxsPSIjYzQyNjNlIi8+CiAgICA8cGF0aCBkPSJNNDIgNTJRNTAgNTkgNTggNTIiIHN0cm9rZT0iI2U4YjczYSIgc3Ryb2tlLXdpZHRoPSIxLjMiIGZpbGw9Im5vbmUiIHN0cm9rZS1kYXNoYXJyYXk9IjEuNiAxLjQiLz5gOwogIH1lbHNlewogICAgZys9YDxwYXRoIGQ9Ik0zOCAzMUMzOCAyMiA2MiAyMiA2MiAzMVE1MCAyOCAzOCAzMVoiIGZpbGw9IiR7cm9iZX0iIHN0cm9rZT0iIzExMSIgc3Ryb2tlLXdpZHRoPSIuNSIvPgogICAgPHBhdGggZD0iTTM2IDMyUTUwIDI3IDY2IDMyUTYwIDM1IDUwIDMzUTQwIDM1IDM2IDMyWiIgZmlsbD0iI2U4YjczYSIgc3Ryb2tlPSIjN2E1YTEwIiBzdHJva2Utd2lkdGg9Ii41Ii8+CiAgICA8cGF0aCBkPSJNNjAgMjZDNzAgMTYgNzYgMTggNzQgMjZDNzAgMjIgNjYgMjQgNjIgMjhaIiBmaWxsPSIjZmZmIiBzdHJva2U9IiM5OTkiIHN0cm9rZS13aWR0aD0iLjUiLz5gOwogIH0KICByZXR1cm4gZzsKfQpjb25zdCBmYWNlQ2FjaGU9e307CmZ1bmN0aW9uIGZhY2VTVkcoYyl7CiAgY29uc3Qgaz1jLnMrYy5yO2lmKGZhY2VDYWNoZVtrXSlyZXR1cm4gZmFjZUNhY2hlW2tdOwogIGNvbnN0IGNvbD1pc1JlZChjLnMpPycjYjMyNjNlJzonIzE2MjAyYScsbGFiZWw9cmwoYy5yKSx0ZW49Yy5yPT09MTA7CiAgY29uc3QgY29ybmVyPWA8dGV4dCB4PSIxMiIgeT0iJHt0ZW4/MjI6MjN9IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXNpemU9IiR7dGVuPzE2OjIwfSIgZm9udC13ZWlnaHQ9IjcwMCIgZm9udC1mYW1pbHk9Ikdlb3JnaWEsJ1RpbWVzIE5ldyBSb21hbicsc2VyaWYiIGZpbGw9ImN1cnJlbnRDb2xvciIgbGV0dGVyLXNwYWNpbmc9IiR7dGVuPy0xLjU6MH0iPiR7bGFiZWx9PC90ZXh0PiR7c3VpdFVzZShjLnMsMTIsMzQsMTIpfWA7CiAgbGV0IGJvZHk9Jyc7CiAgaWYoYy5yPT09MTQpewogICAgYm9keT1zdWl0VXNlKGMucyw1MCw3MCxjLnM9PT0nUyc/NjQ6NTQpOwogIH1lbHNlIGlmKGMucj49MTEpewogICAgY29uc3Qgcm9iZT1pc1JlZChjLnMpPycjYjMyNjNlJzonIzFkM2Y3OCc7CiAgICBjb25zdCBoYWxmPWAke2ZpZ3VyZShjLnIscm9iZSl9JHtzdWl0VXNlKGMucywzMSwyOSwxMSl9YDsKICAgIGJvZHk9YDxyZWN0IHg9IjIyIiB5PSIxNyIgd2lkdGg9IjU2IiBoZWlnaHQ9IjEwNiIgcng9IjMiIGZpbGw9IiNmYmYzZGMiIHN0cm9rZT0iI2I4ODkyYiIgc3Ryb2tlLXdpZHRoPSIxLjIiLz4KICAgIDxnPiR7aGFsZn08L2c+PGcgdHJhbnNmb3JtPSJyb3RhdGUoMTgwIDUwIDcwKSI+JHtoYWxmfTwvZz4KICAgIDxsaW5lIHgxPSIyMiIgeTE9IjcwIiB4Mj0iNzgiIHkyPSI3MCIgc3Ryb2tlPSIjYjg4OTJiIiBzdHJva2Utd2lkdGg9Ii42Ii8+YDsKICB9ZWxzZXsKICAgIGNvbnN0IHN6PWMucjw9Nj8yMjoxOTsKICAgIGJvZHk9UElQU1tjLnJdLm1hcCgoW3gseV0pPT5zdWl0VXNlKGMucyx4LHksc3oseT43MCkpLmpvaW4oJycpOwogIH0KICBjb25zdCBzdmc9YDxzdmcgdmlld0JveD0iMCAwIDEwMCAxNDAiIHByZXNlcnZlQXNwZWN0UmF0aW89Im5vbmUiIHN0eWxlPSJjb2xvcjoke2NvbH0iPjxyZWN0IHg9IjIiIHk9IjIiIHdpZHRoPSI5NiIgaGVpZ2h0PSIxMzYiIHJ4PSI2IiBmaWxsPSJub25lIiBzdHJva2U9IiNkOWNiYTgiIHN0cm9rZS13aWR0aD0iLjgiLz4ke2Nvcm5lcn08ZyB0cmFuc2Zvcm09InJvdGF0ZSgxODAgNTAgNzApIj4ke2Nvcm5lcn08L2c+JHtib2R5fTwvc3ZnPmA7CiAgcmV0dXJuIGZhY2VDYWNoZVtrXT1zdmc7Cn0KY29uc3QgQkFDS19TVkc9YDxzdmcgdmlld0JveD0iMCAwIDEwMCAxNDAiIHByZXNlcnZlQXNwZWN0UmF0aW89Im5vbmUiPjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iMTQwIiByeD0iNyIgZmlsbD0iI2ZmZmFmMCIvPjxyZWN0IHg9IjUiIHk9IjUiIHdpZHRoPSI5MCIgaGVpZ2h0PSIxMzAiIHJ4PSI0IiBmaWxsPSJ1cmwoI2JwKSIgc3Ryb2tlPSIjYzk5NzNhIiBzdHJva2Utd2lkdGg9IjEuMiIvPjxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKDUwIDcwKSI+PHJlY3QgeD0iLTE3IiB5PSItMTciIHdpZHRoPSIzNCIgaGVpZ2h0PSIzNCIgZmlsbD0iIzdkMWQyYyIgc3Ryb2tlPSIjZThjMjZhIi8+PHJlY3QgeD0iLTE3IiB5PSItMTciIHdpZHRoPSIzNCIgaGVpZ2h0PSIzNCIgZmlsbD0iIzdkMWQyYyIgc3Ryb2tlPSIjZThjMjZhIiB0cmFuc2Zvcm09InJvdGF0ZSg0NSkiLz48Y2lyY2xlIHI9IjkiIGZpbGw9IiMxNDQwNGYiIHN0cm9rZT0iI2U4YzI2YSIvPjxjaXJjbGUgcj0iMy41IiBmaWxsPSIjZThjMjZhIi8+PC9nPjwvc3ZnPmA7CmZ1bmN0aW9uIGNhcmRFbChjLGV4dHJhKXsKICBjb25zdCBkPWRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpOwogIGQuY2xhc3NOYW1lPSdjYXJkICcrKGV4dHJhfHwnJyk7CiAgZC5pbm5lckhUTUw9ZmFjZVNWRyhjKTsKICByZXR1cm4gZDsKfQpmdW5jdGlvbiBiYWNrRWwoKXtjb25zdCBkPWRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO2QuY2xhc3NOYW1lPSdjYXJkIGJhY2snO2QuaW5uZXJIVE1MPUJBQ0tfU1ZHO3JldHVybiBkO30KCi8qIHNvdW5kICovCmxldCBBQz1udWxsOwpmdW5jdGlvbiBzbmFwKCl7CiAgdHJ5ewogICAgQUM9QUN8fG5ldyAod2luZG93LkF1ZGlvQ29udGV4dHx8d2luZG93LndlYmtpdEF1ZGlvQ29udGV4dCkoKTsKICAgIGNvbnN0IG49QUMuc2FtcGxlUmF0ZSouMDd8MCxiPUFDLmNyZWF0ZUJ1ZmZlcigxLG4sQUMuc2FtcGxlUmF0ZSksZD1iLmdldENoYW5uZWxEYXRhKDApOwogICAgZm9yKGxldCBpPTA7aTxuO2krKylkW2ldPShNYXRoLnJhbmRvbSgpKjItMSkqTWF0aC5wb3coMS1pL24sNCk7CiAgICBjb25zdCBzPUFDLmNyZWF0ZUJ1ZmZlclNvdXJjZSgpO3MuYnVmZmVyPWI7CiAgICBjb25zdCBmPUFDLmNyZWF0ZUJpcXVhZEZpbHRlcigpO2YudHlwZT0naGlnaHBhc3MnO2YuZnJlcXVlbmN5LnZhbHVlPTkwMDsKICAgIGNvbnN0IGc9QUMuY3JlYXRlR2FpbigpO2cuZ2Fpbi52YWx1ZT0uNTsKICAgIHMuY29ubmVjdChmKTtmLmNvbm5lY3QoZyk7Zy5jb25uZWN0KEFDLmRlc3RpbmF0aW9uKTtzLnN0YXJ0KCk7CiAgfWNhdGNoKGUpe30KfQpkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdwb2ludGVyZG93bicsKCk9Pnt0cnl7QUM9QUN8fG5ldyAod2luZG93LkF1ZGlvQ29udGV4dHx8d2luZG93LndlYmtpdEF1ZGlvQ29udGV4dCkoKTtpZihBQy5zdGF0ZT09PSdzdXNwZW5kZWQnKUFDLnJlc3VtZSgpO31jYXRjaChlKXt9fSk7CgovKiA9PT09PT09PT09PT09PT09PSBVSSBoZWxwZXJzID09PT09PT09PT09PT09PT09ICovCmxldCB0b2FzdFQ9bnVsbDsKZnVuY3Rpb24gc2hvdyhpZCl7Wydsb2JieScsJ3dhaXQnLCdnYW1lJ10uZm9yRWFjaChzPT4kKHMpLmNsYXNzTGlzdC50b2dnbGUoJ2hpZGRlbicscyE9PWlkKSk7fQpmdW5jdGlvbiB0b2FzdChtc2csc3RpY2t5KXsKICBjb25zdCB0PSQoJ3RvYXN0Jyk7dC50ZXh0Q29udGVudD1tc2c7dC5jbGFzc0xpc3QucmVtb3ZlKCdoaWRkZW4nKTtjbGVhclRpbWVvdXQodG9hc3RUKTsKICBpZighc3RpY2t5KXRvYXN0VD1zZXRUaW1lb3V0KCgpPT50LmNsYXNzTGlzdC5hZGQoJ2hpZGRlbicpLDQ1MDApOwp9CmZ1bmN0aW9uIGhpZGVUb2FzdCgpe2NsZWFyVGltZW91dCh0b2FzdFQpOyQoJ3RvYXN0JykuY2xhc3NMaXN0LmFkZCgnaGlkZGVuJyk7fQpmdW5jdGlvbiBteU5hbWUoKXtyZXR1cm4gKCQoJ25hbWVJbicpLnZhbHVlLnRyaW0oKXx8J9io2KfYstuM2qnZhicpLnNsaWNlKDAsMTQpO30KZnVuY3Rpb24gYnVzeShiKXskKCdjcmVhdGVCdG4nKS5kaXNhYmxlZD1iOyQoJ2pvaW5CdG4nKS5kaXNhYmxlZD1iOyQoJ2NyZWF0ZUJ0bicpLnRleHRDb250ZW50PWI/J9iv2LEg2K3Yp9mEINin2KrYtdin2YQuLi4nOifYs9in2K7YqiDYp9iq2KfZgic7fQoKLyogPT09PT09PT09PT09PT09PT0gSG9zdDogYXV0aG9yaXRhdGl2ZSBnYW1lIHN0YXRlID09PT09PT09PT09PT09PT09ICovCmxldCBpc0hvc3Q9ZmFsc2UsRz1udWxsLFY9bnVsbCxuYW1lcz1bJ9io2KfYstuM2qnZhiDbsScsJ9io2KfYstuM2qnZhiDbsiddOwpmdW5jdGlvbiBuZXdEZWNrKCl7CiAgY29uc3QgZD1bXTsKICBmb3IoY29uc3QgcyBvZiBTVUlUUylmb3IobGV0IHI9MjtyPD0xNDtyKyspZC5wdXNoKHtzLHJ9KTsKICBmb3IobGV0IGk9ZC5sZW5ndGgtMTtpPjA7aS0tKXtjb25zdCBqPU1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSooaSsxKSk7W2RbaV0sZFtqXV09W2Rbal0sZFtpXV07fQogIHJldHVybiBkOwp9CmZ1bmN0aW9uIHN0YXJ0R2FtZSgpe0c9e3Njb3JlOlswLDBdLGhha2VtOk1hdGgucmFuZG9tKCk8LjU/MDoxLHJvdW5kOjB9O3N0YXJ0Um91bmQoKTt9CmZ1bmN0aW9uIHN0YXJ0Um91bmQoKXsKICBHLnJvdW5kKys7Ry5kZWNrPW5ld0RlY2soKTtHLmhhbmRzPVtbXSxbXV07CiAgRy50cnVtcD1udWxsO0cucGhhc2U9J3RydW1wJztHLnRhYmxlPVtdO0cudHJpY2tzPVswLDBdO0cudHVybj1udWxsO0cubXNnPW51bGw7CiAgRy5oYW5kc1tHLmhha2VtXT1HLmRlY2suc3BsaWNlKDAsNSk7CiAgcHVzaCgpOwp9CmZ1bmN0aW9uIGNob29zZVRydW1wKHAscyl7CiAgaWYoIUd8fEcucGhhc2UhPT0ndHJ1bXAnfHxwIT09Ry5oYWtlbXx8IVNVSVRTLmluY2x1ZGVzKHMpKXJldHVybjsKICBHLnRydW1wPXM7CiAgRy5oYW5kc1tHLmhha2VtXS5wdXNoKC4uLkcuZGVjay5zcGxpY2UoMCw4KSk7CiAgRy5oYW5kc1sxLUcuaGFrZW1dPUcuZGVjay5zcGxpY2UoMCwxMyk7CiAgRy5waGFzZT0ncGxheSc7Ry50dXJuPUcuaGFrZW07cHVzaCgpOwp9CmZ1bmN0aW9uIHBsYXkocCxpZCl7CiAgaWYoIUd8fEcucGhhc2UhPT0ncGxheSd8fEcudHVybiE9PXApcmV0dXJuOwogIGNvbnN0IGg9Ry5oYW5kc1twXSxpPWguZmluZEluZGV4KGM9PmMucytjLnI9PT1pZCk7CiAgaWYoaTwwKXJldHVybjsKICBjb25zdCBjPWhbaV07CiAgaWYoRy50YWJsZS5sZW5ndGg9PT0xKXsKICAgIGNvbnN0IGxzdWl0PUcudGFibGVbMF0uYy5zOwogICAgaWYoYy5zIT09bHN1aXQmJmguc29tZSh4PT54LnM9PT1sc3VpdCkpcmV0dXJuOwogIH0KICBoLnNwbGljZShpLDEpO0cudGFibGUucHVzaCh7cCxjfSk7CiAgaWYoRy50YWJsZS5sZW5ndGg9PT0xKXtHLnR1cm49MS1wO3B1c2goKTtyZXR1cm47fQogIEcudHVybj1udWxsO0cucGhhc2U9J3Jlc29sdmUnO3B1c2goKTsKICBzZXRUaW1lb3V0KHJlc29sdmVUcmljaywxMzAwKTsKfQpmdW5jdGlvbiByZXNvbHZlVHJpY2soKXsKICBpZighR3x8Ry5waGFzZSE9PSdyZXNvbHZlJylyZXR1cm47CiAgY29uc3QgW2EsYl09Ry50YWJsZTtsZXQgdz1hLnA7CiAgaWYoYi5jLnM9PT1hLmMucyl7aWYoYi5jLnI+YS5jLnIpdz1iLnA7fQogIGVsc2UgaWYoYi5jLnM9PT1HLnRydW1wKXc9Yi5wOwogIEcudHJpY2tzW3ddKys7Ry50YWJsZT1bXTsKICBpZihHLmhhbmRzWzBdLmxlbmd0aD09PTApe2VuZFJvdW5kKCk7cmV0dXJuO30KICBHLnBoYXNlPSdwbGF5JztHLnR1cm49dztwdXNoKCk7Cn0KZnVuY3Rpb24gZW5kUm91bmQoKXsKICBjb25zdCB3PUcudHJpY2tzWzBdPkcudHJpY2tzWzFdPzA6MSxrb3Q9Ry50cmlja3Nbd109PT0xMyxwdHM9a290PzI6MTsKICBHLnNjb3JlW3ddKz1wdHM7Ry5tc2c9e3cscHRzLGtvdH07Ry5oYWtlbT13OwogIGlmKEcuc2NvcmVbd10+PTcpe0cucGhhc2U9J292ZXInO3B1c2goKTt9CiAgZWxzZXtHLnBoYXNlPSdyb3VuZEVuZCc7cHVzaCgpO3NldFRpbWVvdXQoKCk9PntpZihHJiZHLnBoYXNlPT09J3JvdW5kRW5kJylzdGFydFJvdW5kKCk7fSw0MDAwKTt9Cn0KZnVuY3Rpb24gdmlld0ZvcihwKXsKICByZXR1cm57eW91OnAsbmFtZXMscGhhc2U6Ry5waGFzZSxoYWtlbTpHLmhha2VtLHRydW1wOkcudHJ1bXAsdHVybjpHLnR1cm4sdGFibGU6Ry50YWJsZSwKICAgIHRyaWNrczpHLnRyaWNrcyxzY29yZTpHLnNjb3JlLHJvdW5kOkcucm91bmQsaGFuZDpHLmhhbmRzW3BdLG9wcDpHLmhhbmRzWzEtcF0ubGVuZ3RoLG1zZzpHLm1zZ307Cn0KZnVuY3Rpb24gcHVzaCgpewogIHJlbmRlcih2aWV3Rm9yKDApKTsKICBpZihndWVzdENpZClzZW5kKHt0Oid2Jyx2OnZpZXdGb3IoMSksdG86Z3Vlc3RDaWR9KTsKfQpmdW5jdGlvbiBvbkFjdGlvbihwLG0pewogIGlmKG0udD09PSd0cnVtcCcpY2hvb3NlVHJ1bXAocCxtLnMpOwogIGVsc2UgaWYobS50PT09J3BsYXknKXBsYXkocCxtLmlkKTsKICBlbHNlIGlmKG0udD09PSdyZW1hdGNoJyl7aWYoRyYmRy5waGFzZT09PSdvdmVyJylzdGFydEdhbWUoKTt9Cn0KZnVuY3Rpb24gYWN0KG0pewogIGlmKGlzSG9zdClvbkFjdGlvbigwLG0pOwogIGVsc2Ugc2VuZChtKTsKfQoKLyogPT09PT09PT09PT09PT09PT0gTmV0d29ya2luZyAoTVFUVCBvdmVyIFdlYlNvY2tldCwgcHVibGljIGJyb2tlcnMsIG5vIHNpZ251cCkgPT09PT09PT09PT09PT09PT0gKi8KY29uc3QgVFA9J2hva20ycC12MSc7CmNvbnN0IEJST0tFUlM9Wyd3c3M6Ly9icm9rZXIuZW1xeC5pbzo4MDg0L21xdHQnLCd3c3M6Ly9icm9rZXIuaGl2ZW1xLmNvbTo4ODg0L21xdHQnLCd3c3M6Ly90ZXN0Lm1vc3F1aXR0by5vcmc6ODA4MSddOwpjb25zdCBNUVRUX1VSTFM9WydodHRwczovL2Nkbi5qc2RlbGl2ci5uZXQvbnBtL21xdHRANS4xMC4xL2Rpc3QvbXF0dC5taW4uanMnLCdodHRwczovL3VucGtnLmNvbS9tcXR0QDUuMTAuMS9kaXN0L21xdHQubWluLmpzJ107CmxldCBtcT1udWxsLHJvb21Db2RlPScnLG15Um9sZT0nJyxob3N0SW5mbz1udWxsLGd1ZXN0SW5mbz1udWxsLHByZXNlbmNlUHVibGlzaGVkPWZhbHNlOwpsZXQgZ3Vlc3RDaWQ9bnVsbCxndWVzdFNlZW49ZmFsc2UsaGVsbG9TZW50PWZhbHNlLGpvaW5lZD1mYWxzZSxqb2luVGltZXI9bnVsbCxyZWFkeURvbmU9ZmFsc2UsZ3Vlc3ROYW1lPScnOwpjb25zdCBteUlkPXNzKCdjaWQnKXx8KCgpPT57Y29uc3Qgdj1NYXRoLnJhbmRvbSgpLnRvU3RyaW5nKDM2KS5zbGljZSgyLDEwKTtzcygnY2lkJyx2KTtyZXR1cm4gdjt9KSgpOwoKZnVuY3Rpb24gbG9hZE1RVFQoKXsKICByZXR1cm4gbmV3IFByb21pc2UoKHJlcyxyZWopPT57CiAgICBsZXQgaT0wOwogICAgKGZ1bmN0aW9uIG5leHQoKXsKICAgICAgaWYod2luZG93Lm1xdHQpcmV0dXJuIHJlcygpOwogICAgICBpZihpPj1NUVRUX1VSTFMubGVuZ3RoKXJldHVybiByZWooKTsKICAgICAgY29uc3Qgc2M9ZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc2NyaXB0Jyk7CiAgICAgIHNjLnNyYz1NUVRUX1VSTFNbaSsrXTsKICAgICAgc2Mub25sb2FkPSgpPT53aW5kb3cubXF0dD9yZXMoKTpuZXh0KCk7CiAgICAgIHNjLm9uZXJyb3I9bmV4dDsKICAgICAgZG9jdW1lbnQuaGVhZC5hcHBlbmRDaGlsZChzYyk7CiAgICB9KSgpOwogIH0pOwp9CmZ1bmN0aW9uIGFsbFByZXNlbmNlKCl7CiAgcmV0dXJuW2hvc3RJbmZvJiZ7cm9sZTonaG9zdCcsY2lkOmhvc3RJbmZvLmNpZH0sZ3Vlc3RJbmZvJiZ7cm9sZTonZ3Vlc3QnLGNpZDpndWVzdEluZm8uY2lkfV0uZmlsdGVyKEJvb2xlYW4pOwp9CmZ1bmN0aW9uIHB1Ymxpc2hQcmVzZW5jZSgpewogIHByZXNlbmNlUHVibGlzaGVkPXRydWU7CiAgaWYobXEmJm1xLmNvbm5lY3RlZCltcS5wdWJsaXNoKGAke1RQfS8ke3Jvb21Db2RlfS8ke215Um9sZX1gLEpTT04uc3RyaW5naWZ5KHtjaWQ6bXlJZH0pLHtyZXRhaW46dHJ1ZSxxb3M6MX0pOwp9CmZ1bmN0aW9uIGNsb3NlQ2hhbm5lbChjbGVhcj10cnVlKXsKICBpZighbXEpcmV0dXJuOwogIGNvbnN0IGM9bXEscj1teVJvbGUsY29kZT1yb29tQ29kZTsKICBtcT1udWxsO2hvc3RJbmZvPWd1ZXN0SW5mbz1udWxsO3ByZXNlbmNlUHVibGlzaGVkPWZhbHNlOwogIGMucmVtb3ZlQWxsTGlzdGVuZXJzKCdtZXNzYWdlJyk7CiAgaWYoY2xlYXIpewogICAgdHJ5e2MucHVibGlzaChgJHtUUH0vJHtjb2RlfS8ke3J9YCwnJyx7cmV0YWluOnRydWUscW9zOjF9KTt9Y2F0Y2goZSl7fQogICAgc2V0VGltZW91dCgoKT0+e3RyeXtjLmVuZCh0cnVlKX1jYXRjaChlKXt9fSwzMDApOwogIH1lbHNle3RyeXtjLmVuZChmYWxzZSl9Y2F0Y2goZSl7fX0KfQpmdW5jdGlvbiBtcUNvbm5lY3QodXJsLGNvZGUscm9sZSl7CiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXMscmVqKT0+ewogICAgY29uc3Qgd2lsbD17dG9waWM6YCR7VFB9LyR7Y29kZX0vJHtyb2xlfWAscGF5bG9hZDonJyxyZXRhaW46dHJ1ZSxxb3M6MX07CiAgICBjb25zdCBjPW1xdHQuY29ubmVjdCh1cmwse2NsaWVudElkOidoaycrbXlJZCtNYXRoLnJhbmRvbSgpLnRvU3RyaW5nKDE2KS5zbGljZSgyLDYpLGNsZWFuOnRydWUscmVjb25uZWN0UGVyaW9kOjIwMDAsY29ubmVjdFRpbWVvdXQ6NjAwMCxrZWVwYWxpdmU6MjAsd2lsbH0pOwogICAgY29uc3QgdG89c2V0VGltZW91dCgoKT0+e2MucmVtb3ZlQWxsTGlzdGVuZXJzKCk7Yy5vbignZXJyb3InLCgpPT57fSk7Yy5lbmQodHJ1ZSk7cmVqKG5ldyBFcnJvcigndGltZW91dCcpKTt9LDcwMDApOwogICAgY29uc3Qgb25FcnI9KCk9Pnt9OwogICAgYy5vbignZXJyb3InLG9uRXJyKTsKICAgIGMub25jZSgnY29ubmVjdCcsKCk9PntjbGVhclRpbWVvdXQodG8pO2Mub2ZmKCdlcnJvcicsb25FcnIpO3JlcyhjKTt9KTsKICB9KTsKfQphc3luYyBmdW5jdGlvbiBjb25uZWN0KGNvZGUscm9sZSxvblJlYWR5KXsKICB0cnl7YXdhaXQgbG9hZE1RVFQoKTt9Y2F0Y2goZSl7dG9hc3QoJ9qp2KrYp9io2K7Yp9mG2Ycg2KfYqti12KfZhCDZhNmI2K8g2YbYtNivLiDYp9uM2YbYqtix2YbYqiDbjNinINmB24zZhNiq2LHYtNqp2YYg2LHYpyDahtqpINqp2YYnKTtyZXR1cm4gZmFsc2U7fQogIGNsb3NlQ2hhbm5lbCgpOwogIHJvb21Db2RlPWNvZGU7bXlSb2xlPXJvbGU7cmVhZHlEb25lPWZhbHNlO2hvc3RJbmZvPWd1ZXN0SW5mbz1udWxsO3ByZXNlbmNlUHVibGlzaGVkPWZhbHNlOwogIGxldCBjPW51bGw7CiAgZm9yKGNvbnN0IHUgb2YgQlJPS0VSUyl7dHJ5e2M9YXdhaXQgbXFDb25uZWN0KHUsY29kZSxyb2xlKTticmVhazt9Y2F0Y2goZSl7fX0KICBpZighYyl7dG9hc3QoJ9in2KrYtdin2YQg2KjZhyDYs9ix2YjYsSDYqNix2YLYsdin2LEg2YbYtNivLiDYp9uM2YbYqtix2YbYqiDbjNinINmB24zZhNiq2LHYtNqp2YYg2LHYpyDahtqpINqp2YYnKTtyZXR1cm4gZmFsc2U7fQogIG1xPWM7CiAgYy5vbignZXJyb3InLCgpPT57fSk7CiAgYy5vbignb2ZmbGluZScsKCk9PntpZihyZWFkeURvbmUpdG9hc3QoJ9in2LHYqtio2KfYtyDZgti32Lkg2LTYr9iMINiv2LEg2K3Yp9mEINin2KrYtdin2YQg2K/ZiNio2KfYsdmHLi4uJyx0cnVlKTt9KTsKICBjLm9uKCdjb25uZWN0JywoKT0+e2lmKHJlYWR5RG9uZSl7aGlkZVRvYXN0KCk7aWYocHJlc2VuY2VQdWJsaXNoZWQpcHVibGlzaFByZXNlbmNlKCk7fX0pOwogIGMub24oJ21lc3NhZ2UnLG9uTVEpOwogIGNvbnN0IHRvcGljcz1pc0hvc3Q/W2Ake1RQfS8ke2NvZGV9L3RvSG9zdGAsYCR7VFB9LyR7Y29kZX0vZ3Vlc3RgLGAke1RQfS8ke2NvZGV9L2hvc3RgXTpbYCR7VFB9LyR7Y29kZX0vdG9HdWVzdGAsYCR7VFB9LyR7Y29kZX0vaG9zdGBdOwogIGMuc3Vic2NyaWJlKHRvcGljcyx7cW9zOjB9LGVycj0+ewogICAgaWYoZXJyKXt0b2FzdCgn2K7Yt9inINiv2LEg2KfYqti12KfZhCDYqNmHINin2KrYp9mCJyk7YnVzeShmYWxzZSk7cmV0dXJuO30KICAgIGlmKHJlYWR5RG9uZSlyZXR1cm47cmVhZHlEb25lPXRydWU7b25SZWFkeSgpOwogIH0pOwogIHJldHVybiB0cnVlOwp9CmZ1bmN0aW9uIG9uTVEodG9waWMsYnVmKXsKICBjb25zdCB0PXRvcGljLnNwbGl0KCcvJykucG9wKCksc3RyPWJ1Zi50b1N0cmluZygpOwogIGxldCBtPW51bGw7CiAgaWYoc3RyKXt0cnl7bT1KU09OLnBhcnNlKHN0cik7fWNhdGNoKGUpe3JldHVybjt9fQogIGlmKHQ9PT0naG9zdCcpe2hvc3RJbmZvPW07b25QcmVzZW5jZSgpO30KICBlbHNlIGlmKHQ9PT0nZ3Vlc3QnKXtndWVzdEluZm89bTtvblByZXNlbmNlKCk7fQogIGVsc2UgaWYodD09PSd0b0hvc3QnJiZpc0hvc3QmJm0pb25Nc2cobSk7CiAgZWxzZSBpZih0PT09J3RvR3Vlc3QnJiYhaXNIb3N0JiZtKW9uTXNnKG0pOwp9CmZ1bmN0aW9uIHNlbmQobSl7CiAgaWYoIW1xfHwhbXEuY29ubmVjdGVkKXJldHVybiB0b2FzdCgn2KfYsdiq2KjYp9i3INmC2LfYuSDYp9iz2KonKTsKICBtcS5wdWJsaXNoKGAke1RQfS8ke3Jvb21Db2RlfS8ke2lzSG9zdD8ndG9HdWVzdCc6J3RvSG9zdCd9YCxKU09OLnN0cmluZ2lmeSh7Li4ubSxjaWQ6bXlJZH0pLHtxb3M6MH0pOwp9CmFzeW5jIGZ1bmN0aW9uIGNyZWF0ZVJvb20obj0wKXsKICBidXN5KHRydWUpO2lzSG9zdD10cnVlO25hbWVzWzBdPW15TmFtZSgpO0c9bnVsbDtndWVzdENpZD1udWxsO2d1ZXN0U2Vlbj1mYWxzZTsKICBjb25zdCBjb2RlPVN0cmluZyhNYXRoLmZsb29yKDEwMDAwK01hdGgucmFuZG9tKCkqOTAwMDApKTsKICBjb25zdCBvaz1hd2FpdCBjb25uZWN0KGNvZGUsJ2hvc3QnLCgpPT57CiAgICBzZXRUaW1lb3V0KCgpPT57CiAgICAgIGNvbnN0IG90aGVyPWFsbFByZXNlbmNlKCkuZmluZChwPT5wLnJvbGU9PT0naG9zdCcmJnAuY2lkIT09bXlJZCk7CiAgICAgIGlmKG90aGVyKXtjbG9zZUNoYW5uZWwoZmFsc2UpO2lmKG48NSljcmVhdGVSb29tKG4rMSk7ZWxzZXt0b2FzdCgn2YbYtNiv2Iwg2K/ZiNio2KfYsdmHINin2YXYqtit2KfZhiDaqdmGJyk7YnVzeShmYWxzZSk7fXJldHVybjt9CiAgICAgIHB1Ymxpc2hQcmVzZW5jZSgpOyQoJ2NvZGUnKS50ZXh0Q29udGVudD1jb2RlO2J1c3koZmFsc2UpO3Nob3coJ3dhaXQnKTsKICAgIH0sNzAwKTsKICB9KTsKICBpZighb2spYnVzeShmYWxzZSk7Cn0KYXN5bmMgZnVuY3Rpb24gam9pblJvb20oKXsKICBjb25zdCBjb2RlPW5vcm0oJCgnY29kZUluJykudmFsdWUpOwogIGlmKGNvZGUubGVuZ3RoIT09NSlyZXR1cm4gdG9hc3QoJ9qp2K8g2KfYqtin2YIg27Ug2LHZgtmF24wg2KfYs9iqJyk7CiAgYnVzeSh0cnVlKTtpc0hvc3Q9ZmFsc2U7aGVsbG9TZW50PWZhbHNlO2pvaW5lZD1mYWxzZTtndWVzdE5hbWU9bXlOYW1lKCk7CiAgY29uc3Qgb2s9YXdhaXQgY29ubmVjdChjb2RlLCdndWVzdCcsKCk9PnsKICAgIHB1Ymxpc2hQcmVzZW5jZSgpOwogICAgam9pblRpbWVyPXNldFRpbWVvdXQoKCk9PnsKICAgICAgaWYoIWhlbGxvU2VudCl7dG9hc3QoJ9in2KrYp9mC24wg2KjYpyDYp9uM2YYg2qnYryDZvtuM2K/YpyDZhti02K8nKTtjbG9zZUNoYW5uZWwoKTtidXN5KGZhbHNlKTt9CiAgICB9LDUwMDApOwogICAgb25QcmVzZW5jZSgpOwogIH0pOwogIGlmKCFvaylidXN5KGZhbHNlKTsKfQpmdW5jdGlvbiBvblByZXNlbmNlKCl7CiAgY29uc3QgbGlzdD1hbGxQcmVzZW5jZSgpOwogIGlmKGlzSG9zdCl7CiAgICBpZihndWVzdENpZCl7CiAgICAgIGlmKGxpc3Quc29tZShwPT5wLmNpZD09PWd1ZXN0Q2lkKSlndWVzdFNlZW49dHJ1ZTsKICAgICAgZWxzZSBpZihndWVzdFNlZW4pe2d1ZXN0Q2lkPW51bGw7Z3Vlc3RTZWVuPWZhbHNlO3RvYXN0KCfYrdix24zZgSDZgti32Lkg2LTYry4g2YXZhtiq2LjYsSDYp9iq2LXYp9mEINiv2YjYqNin2LHZhy4uLicsdHJ1ZSk7fQogICAgfQogIH1lbHNlewogICAgY29uc3QgaG9zdD1saXN0LmZpbmQocD0+cC5yb2xlPT09J2hvc3QnKTsKICAgIGlmKGhvc3QmJiFoZWxsb1NlbnQpe2hlbGxvU2VudD10cnVlO2NsZWFyVGltZW91dChqb2luVGltZXIpO3NlbmQoe3Q6J2hlbGxvJyxuYW1lOmd1ZXN0TmFtZX0pO30KICAgIGlmKCFob3N0JiZoZWxsb1NlbnQpe2hlbGxvU2VudD1mYWxzZTtpZihqb2luZWQpdG9hc3QoJ9in2LHYqtio2KfYtyDYqNinINmF24zYstio2KfZhiDZgti32Lkg2LTYrycsdHJ1ZSk7fQogIH0KfQpmdW5jdGlvbiBvbk1zZyhtKXsKICBpZighbSlyZXR1cm47CiAgaWYoaXNIb3N0KXsKICAgIGlmKG0udD09PSdoZWxsbycpewogICAgICBpZihndWVzdENpZCYmZ3Vlc3RDaWQhPT1tLmNpZCYmYWxsUHJlc2VuY2UoKS5zb21lKHA9PnAuY2lkPT09Z3Vlc3RDaWQpKXtzZW5kKHt0OidmdWxsJyx0bzptLmNpZH0pO3JldHVybjt9CiAgICAgIGd1ZXN0Q2lkPW0uY2lkO2d1ZXN0U2Vlbj1mYWxzZTtuYW1lc1sxXT0obS5uYW1lfHwn2K3YsduM2YEnKS5zbGljZSgwLDE0KTtoaWRlVG9hc3QoKTsKICAgICAgc2hvdygnZ2FtZScpOwogICAgICBpZihHKXB1c2goKTtlbHNlIHN0YXJ0R2FtZSgpOwogICAgICByZXR1cm47CiAgICB9CiAgICBpZihtLmNpZD09PWd1ZXN0Q2lkKW9uQWN0aW9uKDEsbSk7CiAgfWVsc2V7CiAgICBpZihtLnRvIT09bXlJZClyZXR1cm47CiAgICBpZihtLnQ9PT0ndicpe2pvaW5lZD10cnVlO2J1c3koZmFsc2UpO2hpZGVUb2FzdCgpO3Nob3coJ2dhbWUnKTtyZW5kZXIobS52KTt9CiAgICBlbHNlIGlmKG0udD09PSdmdWxsJyl0b2FzdCgn2KfYqtin2YIg2b7YsSDYp9iz2KonKTsKICB9Cn0KCi8qID09PT09PT09PT09PT09PT09IFJlbmRlcmluZyA9PT09PT09PT09PT09PT09PSAqLwpmdW5jdGlvbiBmaWxsU2xvdChlbCxlbnRyeSxsYWJlbCxjbHMpewogIGNvbnN0IGlkPWVudHJ5P2VudHJ5LmMucytlbnRyeS5jLnI6Jyc7CiAgaWYoZWwuZGF0YXNldC5pZD09PWlkKXJldHVybjsKICBlbC5kYXRhc2V0LmlkPWlkO2VsLmlubmVySFRNTD0nJzsKICBpZihlbnRyeSl7ZWwuY2xhc3NOYW1lPSdzbG90IG9uJztlbC5hcHBlbmRDaGlsZChjYXJkRWwoZW50cnkuYyxjbHMpKTtzbmFwKCk7fQogIGVsc2V7ZWwuY2xhc3NOYW1lPSdzbG90JztlbC50ZXh0Q29udGVudD1sYWJlbDt9Cn0KZnVuY3Rpb24gcmVuZGVyKHYpewogIFY9djsKICBjb25zdCBtZT12LnlvdSxvcHA9MS1tZTsKICAkKCdvcHBOYW1lJykuaW5uZXJIVE1MPSh2Lmhha2VtPT09b3BwPyc8c3BhbiBjbGFzcz0iY3Jvd24iPuKZmzwvc3Bhbj4gJzonJykrZXNjKHYubmFtZXNbb3BwXSk7CiAgJCgnbXlOYW1lJykuaW5uZXJIVE1MPSh2Lmhha2VtPT09bWU/JzxzcGFuIGNsYXNzPSJjcm93biI+4pmbPC9zcGFuPiAnOicnKStlc2Modi5uYW1lc1ttZV0pOwogIGNvbnN0IG9jPSQoJ29wcENhcmRzJyk7b2MuaW5uZXJIVE1MPScnOwogIGZvcihsZXQgaT0wO2k8di5vcHA7aSsrKW9jLmFwcGVuZENoaWxkKGJhY2tFbCgpKTsKICAkKCdzYycpLnRleHRDb250ZW50PXYuc2NvcmVbbWVdKycgOiAnK3Yuc2NvcmVbb3BwXTsKICAkKCd0aycpLnRleHRDb250ZW50PXYudHJpY2tzW21lXSsnIC0gJyt2LnRyaWNrc1tvcHBdOwogICQoJ3RydW1wUGlsbCcpLmlubmVySFRNTD12LnRydW1wCiAgICA/YNit2qnZhSA8c3ZnIHZpZXdCb3g9IjAgMCAxMDAgMTAwIiBzdHlsZT0iY29sb3I6JHtpc1JlZCh2LnRydW1wKT8nI2ZmN2I4ZSc6JyNmZmYnfSI+PHVzZSBocmVmPSIjcyR7di50cnVtcH0iIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIi8+PC9zdmc+IDxiPiR7TkFNRVt2LnRydW1wXX08L2I+YAogICAgOifYrdqp2YU6IC0nOwoKICBmaWxsU2xvdCgkKCdzbG90T3BwJyksdi50YWJsZS5maW5kKHg9PngucD09PW9wcCksJ9it2LHbjNmBJywnZmx5LW9wcCcpOwogIGZpbGxTbG90KCQoJ3Nsb3RNZScpLHYudGFibGUuZmluZCh4PT54LnA9PT1tZSksJ9iq2YgnLCdmbHktbWUnKTsKCiAgY29uc3Qgc3Q9JCgnc3RhdHVzJyk7c3QuY2xhc3NOYW1lPScnOwogIGNvbnN0IHBpY2s9JCgndHJ1bXBQaWNrJyksYWdhaW49JCgnYWdhaW4nKTsKICBwaWNrLmNsYXNzTGlzdC5hZGQoJ2hpZGRlbicpO2FnYWluLmNsYXNzTGlzdC5hZGQoJ2hpZGRlbicpOwogIGNvbnN0IG15VHVybj12LnBoYXNlPT09J3BsYXknJiZ2LnR1cm49PT1tZTsKICBpZih2LnBoYXNlPT09J3RydW1wJyl7CiAgICBpZih2Lmhha2VtPT09bWUpe3N0LnRleHRDb250ZW50PSfYqtmIINit2KfaqdmF24wuINit2qnZhSDYsdinINin2YbYqtiu2KfYqCDaqdmGJztzdC5jbGFzc05hbWU9J21lJztwaWNrLmNsYXNzTGlzdC5yZW1vdmUoJ2hpZGRlbicpO30KICAgIGVsc2Ugc3QudGV4dENvbnRlbnQ9J9mF2YbYqti42LEg2KfZhtiq2K7Yp9ioINit2qnZhSDYqtmI2LPYtyAnK3YubmFtZXNbb3BwXSsnLi4uJzsKICB9ZWxzZSBpZih2LnBoYXNlPT09J3BsYXknKXsKICAgIHN0LnRleHRDb250ZW50PW15VHVybj8n2YbZiNio2Kog2KrZiNiz2KonOifZhtmI2KjYqiAnK3YubmFtZXNbb3BwXTsKICAgIGlmKG15VHVybilzdC5jbGFzc05hbWU9J21lJzsKICB9ZWxzZSBpZih2LnBoYXNlPT09J3Jlc29sdmUnKXsKICAgIHN0LnRleHRDb250ZW50PScnOwogIH1lbHNlIGlmKHYucGhhc2U9PT0ncm91bmRFbmQnKXsKICAgIGNvbnN0IG09di5tc2c7CiAgICBzdC50ZXh0Q29udGVudD0obS53PT09bWU/J9in24zZhiDYr9iz2Kog2LHYpyDYqNix2K/bjCc6di5uYW1lc1tvcHBdKycg2KfbjNmGINiv2LPYqiDYsdinINio2LHYrycpKycgKCsnK20ucHRzKyhtLmtvdD8nINqp2YjYqiEnOicnKSsnKSc7CiAgfWVsc2UgaWYodi5waGFzZT09PSdvdmVyJyl7CiAgICBzdC50ZXh0Q29udGVudD12Lm1zZy53PT09bWU/J/Cfj4Yg2KrZiCDYqNix2YbYr9mHINio2KfYstuMINi02K/bjCEnOnYubmFtZXNbb3BwXSsnINio2LHZhtiv2Ycg2KjYp9iy24wg2LTYryc7CiAgICBzdC5jbGFzc05hbWU9di5tc2cudz09PW1lPydtZSc6Jyc7CiAgICBhZ2Fpbi5jbGFzc0xpc3QucmVtb3ZlKCdoaWRkZW4nKTsKICB9CgogIGNvbnN0IGhhbmQ9JCgnaGFuZCcpO2hhbmQuaW5uZXJIVE1MPScnOwogIGNvbnN0IHNvcnRlZD12LmhhbmQuc2xpY2UoKS5zb3J0KChhLGIpPT5TVUlUUy5pbmRleE9mKGEucyktU1VJVFMuaW5kZXhPZihiLnMpfHxiLnItYS5yKTsKICBsZXQgYWxsb3dlZD1udWxsOwogIGlmKG15VHVybiYmdi50YWJsZS5sZW5ndGg9PT0xKXsKICAgIGNvbnN0IGxzdWl0PXYudGFibGVbMF0uYy5zOwogICAgaWYodi5oYW5kLnNvbWUoYz0+Yy5zPT09bHN1aXQpKWFsbG93ZWQ9bHN1aXQ7CiAgfQogIGNvbnN0IFc9aGFuZC5jbGllbnRXaWR0aHx8MzQwLGN3PTYyLG49c29ydGVkLmxlbmd0aDsKICBjb25zdCBzdGVwPW4+MT9NYXRoLm1pbihjdyouNzIsKFctY3ctNikvKG4tMSkpOjA7CiAgc29ydGVkLmZvckVhY2goKGMsaSk9PnsKICAgIGNvbnN0IG9rPW15VHVybiYmKCFhbGxvd2VkfHxjLnM9PT1hbGxvd2VkKTsKICAgIGNvbnN0IGVsPWNhcmRFbChjLG15VHVybj8ob2s/J2Nhbic6J2RpcycpOicnKTsKICAgIGlmKGk+MCllbC5zdHlsZS5tYXJnaW5MZWZ0PShzdGVwLWN3KSsncHgnOwogICAgY29uc3Qgb2ZmPWktKG4tMSkvMjsKICAgIGVsLnN0eWxlLnNldFByb3BlcnR5KCctLXInLChvZmYqMS44KSsnZGVnJyk7CiAgICBlbC5zdHlsZS5zZXRQcm9wZXJ0eSgnLS15JywoTWF0aC5hYnMob2ZmKSpNYXRoLmFicyhvZmYpKi4zNSkrJ3B4Jyk7CiAgICBpZihvayllbC5vbmNsaWNrPSgpPT5hY3Qoe3Q6J3BsYXknLGlkOmMucytjLnJ9KTsKICAgIGhhbmQuYXBwZW5kQ2hpbGQoZWwpOwogIH0pOwp9CgovKiA9PT09PT09PT09PT09PT09PSBVSSB3aXJpbmcgPT09PT09PT09PT09PT09PT0gKi8KJCgnY3JlYXRlQnRuJykub25jbGljaz0oKT0+Y3JlYXRlUm9vbSgpOwokKCdqb2luQnRuJykub25jbGljaz1qb2luUm9vbTsKJCgnY29kZUluJykuYWRkRXZlbnRMaXN0ZW5lcigna2V5ZG93bicsZT0+e2lmKGUua2V5PT09J0VudGVyJylqb2luUm9vbSgpO30pOwokKCdjb3B5QnRuJykub25jbGljaz0oKT0+ewogIGNvbnN0IGM9JCgnY29kZScpLnRleHRDb250ZW50OwogIChuYXZpZ2F0b3IuY2xpcGJvYXJkP25hdmlnYXRvci5jbGlwYm9hcmQud3JpdGVUZXh0KGMpOlByb21pc2UucmVqZWN0KCkpLnRoZW4oKCk9PnRvYXN0KCfaqdivINqp2b7bjCDYtNivJykpLmNhdGNoKCgpPT50b2FzdCgn2qnYrzogJytjKSk7Cn07CiQoJ3RydW1wUGljaycpLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJyxlPT57Y29uc3QgYj1lLnRhcmdldC5jbG9zZXN0KCdidXR0b24nKTtpZihiKWFjdCh7dDondHJ1bXAnLHM6Yi5kYXRhc2V0LnN9KTt9KTsKJCgnYWdhaW4nKS5vbmNsaWNrPSgpPT5hY3Qoe3Q6J3JlbWF0Y2gnfSk7CndpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdyZXNpemUnLCgpPT57aWYoViYmISQoJ2dhbWUnKS5jbGFzc0xpc3QuY29udGFpbnMoJ2hpZGRlbicpKXJlbmRlcihWKTt9KTsKCihmdW5jdGlvbiBpbml0KCl7CiAgdHJ5e2NvbnN0IG5tPWxvY2FsU3RvcmFnZS5nZXRJdGVtKCdhcmNhZGVfbmFtZScpO2lmKG5tKSQoJ25hbWVJbicpLnZhbHVlPW5tLnNsaWNlKDAsMTQpfWNhdGNoKGUpe30KICBpZihsb2NhdGlvbi5oYXNoLmxlbmd0aD4xKSQoJ2NvZGVJbicpLnZhbHVlPW5vcm0obG9jYXRpb24uaGFzaCk7CiAgY29uc3QgZmFuPSQoJ2ZhbicpOwogIFt7czonUycscjoxNH0se3M6J0gnLHI6MTN9LHtzOidDJyxyOjEyfSx7czonRCcscjoxMX0se3M6J0gnLHI6MTB9XS5mb3JFYWNoKChjLGkpPT57CiAgICBjb25zdCBlbD1jYXJkRWwoYyk7ZWwuc3R5bGUudHJhbnNmb3JtPWByb3RhdGUoJHsoaS0yKSoxMX1kZWcpIHRyYW5zbGF0ZVkoJHtNYXRoLmFicyhpLTIpKjR9cHgpYDtmYW4uYXBwZW5kQ2hpbGQoZWwpOwogIH0pOwp9KSgpOwo8L3NjcmlwdD4KPC9ib2R5Pgo8L2h0bWw+Cg==',hokm:'PCFET0NUWVBFIGh0bWw+CjxodG1sIGxhbmc9ImZhIiBkaXI9InJ0bCI+CjxoZWFkPgo8bWV0YSBjaGFyc2V0PSJ1dGYtOCI+CjxtZXRhIG5hbWU9InZpZXdwb3J0IiBjb250ZW50PSJ3aWR0aD1kZXZpY2Utd2lkdGgsaW5pdGlhbC1zY2FsZT0xLHZpZXdwb3J0LWZpdD1jb3ZlciI+CjxtZXRhIG5hbWU9Im1vYmlsZS13ZWItYXBwLWNhcGFibGUiIGNvbnRlbnQ9InllcyI+PG1ldGEgbmFtZT0iYXBwbGUtbW9iaWxlLXdlYi1hcHAtY2FwYWJsZSIgY29udGVudD0ieWVzIj48bWV0YSBuYW1lPSJhcHBsZS1tb2JpbGUtd2ViLWFwcC1zdGF0dXMtYmFyLXN0eWxlIiBjb250ZW50PSJibGFjay10cmFuc2x1Y2VudCI+PG1ldGEgbmFtZT0idGhlbWUtY29sb3IiIGNvbnRlbnQ9IiMwYzNlMjUiPgo8dGl0bGU+2K3aqdmFINiv2Ygg2YbZgdix2Ycg2KLZhtmE2KfbjNmGPC90aXRsZT4KPGxpbmsgaHJlZj0iaHR0cHM6Ly9mb250cy5nb29nbGVhcGlzLmNvbS9jc3MyP2ZhbWlseT1WYXppcm1hdG46d2dodEA0MDA7NjAwOzgwMCZkaXNwbGF5PXN3YXAiIHJlbD0ic3R5bGVzaGVldCI+CjxzdHlsZT4KOnJvb3R7CiAgLS1nb2xkOiNlOGMyNmE7IC0tZ29sZDI6I2I4ODkyYjsgLS1pdm9yeTojZjdmMGRmOyAtLWNyaW1zb246I2IzMjYzZTsKICAtLW5vaXNlOnVybCgiZGF0YTppbWFnZS9zdmcreG1sLCUzQ3N2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPScyMjAnIGhlaWdodD0nMjIwJyUzRSUzQ2ZpbHRlciBpZD0nbiclM0UlM0NmZVR1cmJ1bGVuY2UgdHlwZT0nZnJhY3RhbE5vaXNlJyBiYXNlRnJlcXVlbmN5PScuODUnIG51bU9jdGF2ZXM9JzMnIHN0aXRjaFRpbGVzPSdzdGl0Y2gnLyUzRSUzQ2ZlQ29sb3JNYXRyaXggdmFsdWVzPScwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCAuMzggMCcvJTNFJTNDL2ZpbHRlciUzRSUzQ3JlY3Qgd2lkdGg9JzEwMCUyNScgaGVpZ2h0PScxMDAlMjUnIGZpbHRlcj0ndXJsKCUyM24pJy8lM0UlM0Mvc3ZnJTNFIik7CiAgLS1ncmFpbjp1cmwoImRhdGE6aW1hZ2Uvc3ZnK3htbCwlM0NzdmcgeG1sbnM9J2h0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnJyB3aWR0aD0nMzAwJyBoZWlnaHQ9JzMwMCclM0UlM0NmaWx0ZXIgaWQ9J3cnJTNFJTNDZmVUdXJidWxlbmNlIHR5cGU9J2ZyYWN0YWxOb2lzZScgYmFzZUZyZXF1ZW5jeT0nLjAwOCAuMjUnIG51bU9jdGF2ZXM9JzMnIHNlZWQ9JzQnLyUzRSUzQ2ZlQ29sb3JNYXRyaXggdmFsdWVzPScwIDAgMCAwIC4yIDAgMCAwIDAgLjEgMCAwIDAgMCAuMDMgMCAwIDAgLjYgMCcvJTNFJTNDL2ZpbHRlciUzRSUzQ3JlY3Qgd2lkdGg9JzEwMCUyNScgaGVpZ2h0PScxMDAlMjUnIGZpbHRlcj0ndXJsKCUyM3cpJy8lM0UlM0Mvc3ZnJTNFIik7CiAgLS1mZWx0OnZhcigtLW5vaXNlKSxyYWRpYWwtZ3JhZGllbnQoZWxsaXBzZSBhdCA1MCUgNDUlLCMyMzg2NGYgMCUsIzE3NjMzOSA1NSUsIzBjM2UyNSAxMDAlKTsKfQoqe2JveC1zaXppbmc6Ym9yZGVyLWJveDstd2Via2l0LXRhcC1oaWdobGlnaHQtY29sb3I6dHJhbnNwYXJlbnR9Cmh0bWwsYm9keXttYXJnaW46MDtoZWlnaHQ6MTAwJTtvdmVyZmxvdzpoaWRkZW59CmJvZHl7CiAgZm9udC1mYW1pbHk6VmF6aXJtYXRuLFRhaG9tYSxzeXN0ZW0tdWksc2Fucy1zZXJpZjtjb2xvcjp2YXIoLS1pdm9yeSk7YmFja2dyb3VuZDojMGIyYjFiOwogIHBhZGRpbmc6ZW52KHNhZmUtYXJlYS1pbnNldC10b3ApIGVudihzYWZlLWFyZWEtaW5zZXQtcmlnaHQpIGVudihzYWZlLWFyZWEtaW5zZXQtYm90dG9tKSBlbnYoc2FmZS1hcmVhLWluc2V0LWxlZnQpOwp9Ci5oaWRkZW57ZGlzcGxheTpub25lIWltcG9ydGFudH0KLnNjcmVlbntoZWlnaHQ6MTAwZHZofQpidXR0b257Zm9udC1mYW1pbHk6aW5oZXJpdDtjdXJzb3I6cG9pbnRlcn0KCi8qIC0tLS0tLS0tLS0gY2FyZHMgLS0tLS0tLS0tLSAqLwouY2FyZHsKICAtLWN3OjYycHg7d2lkdGg6dmFyKC0tY3cpO2FzcGVjdC1yYXRpbzo1Lzc7Ym9yZGVyLXJhZGl1czpjYWxjKHZhcigtLWN3KSouMDkpO2ZsZXg6bm9uZTtwb3NpdGlvbjpyZWxhdGl2ZTsKICBiYWNrZ3JvdW5kOmxpbmVhci1ncmFkaWVudCgxNDVkZWcsI2ZmZmRmNiwjZjFlN2NjKTsKICBib3gtc2hhZG93OjAgMXB4IDAgI2ZmZiBpbnNldCwwIDJweCA1cHggIzAwMDgsMCAwIDAgMXB4ICNiOWE2N2E7dXNlci1zZWxlY3Q6bm9uZTsKfQouY2FyZCBzdmd7d2lkdGg6MTAwJTtoZWlnaHQ6MTAwJTtkaXNwbGF5OmJsb2NrO2JvcmRlci1yYWRpdXM6aW5oZXJpdH0KLmNhcmQuYmFja3tiYWNrZ3JvdW5kOiNmZmZhZjB9CgovKiAtLS0tLS0tLS0tIGxvYmJ5IC0tLS0tLS0tLS0gKi8KI2xvYmJ5LCN3YWl0ewogIGJhY2tncm91bmQ6dmFyKC0tZmVsdCk7ZGlzcGxheTpmbGV4O2ZsZXgtZGlyZWN0aW9uOmNvbHVtbjthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OmNlbnRlcjsKICBnYXA6MTJweDtwYWRkaW5nOjIwcHg7dGV4dC1hbGlnbjpjZW50ZXI7b3ZlcmZsb3cteTphdXRvCn0KLmZhbntkaXNwbGF5OmZsZXg7ZGlyZWN0aW9uOmx0cjtoZWlnaHQ6MTE4cHg7YWxpZ24taXRlbXM6ZmxleC1lbmQ7bWFyZ2luLWJvdHRvbTo2cHh9Ci5mYW4gLmNhcmR7LS1jdzo2NHB4O21hcmdpbi1sZWZ0Oi0yNnB4O3RyYW5zZm9ybS1vcmlnaW46NTAlIDE0MCU7Ym94LXNoYWRvdzowIDRweCAxMHB4ICMwMDBhLDAgMCAwIDFweCAjYjlhNjdhfQouZmFuIC5jYXJkOmZpcnN0LWNoaWxke21hcmdpbi1sZWZ0OjB9Cmgxe2ZvbnQtc2l6ZTo0NHB4O21hcmdpbjowO2ZvbnQtd2VpZ2h0OjgwMDtjb2xvcjp2YXIoLS1nb2xkKTt0ZXh0LXNoYWRvdzowIDJweCAwICM1YTNkMDYsMCA2cHggMThweCAjMDAwYTtsaW5lLWhlaWdodDoxLjF9CmgxIHNtYWxse2Rpc3BsYXk6YmxvY2s7Zm9udC1zaXplOjE0cHg7Zm9udC13ZWlnaHQ6NDAwO2NvbG9yOiNjZmU4ZDY7dGV4dC1zaGFkb3c6bm9uZTttYXJnaW4tdG9wOjZweH0KaW5wdXR7CiAgZm9udC1mYW1pbHk6aW5oZXJpdDtmb250LXNpemU6MThweDtwYWRkaW5nOjEycHggMTRweDtib3JkZXItcmFkaXVzOjEycHg7Ym9yZGVyOjJweCBzb2xpZCAjMGIyYjFiOwogIGJhY2tncm91bmQ6I2ZmZmFmMDtjb2xvcjojMjIyO3dpZHRoOjEwMCU7bWF4LXdpZHRoOjMwMHB4O3RleHQtYWxpZ246Y2VudGVyO291dGxpbmU6bm9uZTtib3gtc2hhZG93OjAgMnB4IDZweCAjMDAwNiBpbnNldAp9CmlucHV0OmZvY3Vze2JvcmRlci1jb2xvcjp2YXIoLS1nb2xkKX0KLmJ0bnsKICBmb250LXNpemU6MThweDtmb250LXdlaWdodDo4MDA7cGFkZGluZzoxM3B4IDIycHg7Ym9yZGVyLXJhZGl1czoxMnB4O3dpZHRoOjEwMCU7bWF4LXdpZHRoOjMwMHB4O2JvcmRlcjoxcHggc29saWQgIzVhM2QwNjsKICBiYWNrZ3JvdW5kOmxpbmVhci1ncmFkaWVudCgjZjNkMjdkLCNjOTlhMzUpO2NvbG9yOiMyYTFiMDA7Ym94LXNoYWRvdzowIDNweCAwICM3YTU4MTAsMCA2cHggMTJweCAjMDAwNgp9Ci5idG46YWN0aXZle3RyYW5zZm9ybTp0cmFuc2xhdGVZKDJweCk7Ym94LXNoYWRvdzowIDFweCAwICM3YTU4MTB9Ci5idG46ZGlzYWJsZWR7b3BhY2l0eTouNn0KLmJ0bi5hbHR7YmFja2dyb3VuZDpyZ2JhKDAsMCwwLC4yOCk7Y29sb3I6dmFyKC0taXZvcnkpO2JvcmRlcjoycHggc29saWQgdmFyKC0tZ29sZCk7Ym94LXNoYWRvdzpub25lfQouZGl2aWRlcntjb2xvcjojYjlkOWMzO2ZvbnQtc2l6ZToxM3B4fQpkZXRhaWxze21heC13aWR0aDozMDBweDt3aWR0aDoxMDAlO2ZvbnQtc2l6ZToxM3B4O2NvbG9yOiNjZmU4ZDZ9CmRldGFpbHMgc3VtbWFyeXtjdXJzb3I6cG9pbnRlcjttYXJnaW4tYm90dG9tOjhweH0KZGV0YWlscyBpbnB1dHtmb250LXNpemU6MTNweDttYXJnaW4tYm90dG9tOjZweDtkaXJlY3Rpb246bHRyfQojY29kZXtmb250LXNpemU6NThweDtmb250LXdlaWdodDo4MDA7bGV0dGVyLXNwYWNpbmc6OHB4O2NvbG9yOnZhcigtLWdvbGQpO2RpcmVjdGlvbjpsdHI7dGV4dC1zaGFkb3c6MCAzcHggMTRweCAjMDAwYX0KLmhpbnR7Y29sb3I6I2NmZThkNjtmb250LXNpemU6MTRweDttYXgtd2lkdGg6MzAwcHg7bGluZS1oZWlnaHQ6MS45fQoKLyogLS0tLS0tLS0tLSBnYW1lIC0tLS0tLS0tLS0gKi8KI2dhbWV7ZGlzcGxheTpmbGV4O2ZsZXgtZGlyZWN0aW9uOmNvbHVtbjtwYWRkaW5nOjZweDtiYWNrZ3JvdW5kOiMwYTI0MTZ9Ci5mcmFtZXsKICBmbGV4OjE7bWluLWhlaWdodDowO2JvcmRlci1yYWRpdXM6MjRweDtwYWRkaW5nOjlweDsKICBiYWNrZ3JvdW5kOnZhcigtLWdyYWluKSxsaW5lYXItZ3JhZGllbnQoMTM1ZGVnLCM5YTZhMzUsIzViMzgxOCA2MCUsIzdhNGUyNCk7CiAgYm94LXNoYWRvdzowIDhweCAyNHB4ICMwMDBjLDAgMCAwIDFweCAjMmExNjA2LGluc2V0IDAgMnB4IDAgI2M4OWE2M2FhCn0KLmZlbHR7CiAgaGVpZ2h0OjEwMCU7Ym9yZGVyLXJhZGl1czoxNnB4O2JhY2tncm91bmQ6dmFyKC0tZmVsdCk7ZGlzcGxheTpmbGV4O2ZsZXgtZGlyZWN0aW9uOmNvbHVtbjtqdXN0aWZ5LWNvbnRlbnQ6c3BhY2UtYmV0d2VlbjsKICBwYWRkaW5nOjEwcHggOHB4IDhweDtwb3NpdGlvbjpyZWxhdGl2ZTtvdmVyZmxvdzpoaWRkZW47CiAgYm94LXNoYWRvdzppbnNldCAwIDAgNTBweCAjMDAwYixpbnNldCAwIDAgMCAycHggIzBhMzMyMAp9Ci50b3AsLmJvdHRvbXt0ZXh0LWFsaWduOmNlbnRlcjtwb3NpdGlvbjpyZWxhdGl2ZTt6LWluZGV4OjF9Ci5wbmFtZXtmb250LXNpemU6MTVweDtmb250LXdlaWdodDo2MDA7dGV4dC1zaGFkb3c6MCAxcHggM3B4ICMwMDB9Ci5jcm93bntjb2xvcjp2YXIoLS1nb2xkKX0KI29wcENhcmRze2Rpc3BsYXk6ZmxleDtqdXN0aWZ5LWNvbnRlbnQ6Y2VudGVyO2RpcmVjdGlvbjpsdHI7bWFyZ2luLXRvcDo2cHh9CiNvcHBDYXJkcyAuY2FyZHstLWN3OjM2cHg7bWFyZ2luLWxlZnQ6LTIxcHh9CiNvcHBDYXJkcyAuY2FyZDpmaXJzdC1jaGlsZHttYXJnaW4tbGVmdDowfQoubWlke2ZsZXg6MTtkaXNwbGF5OmZsZXg7ZmxleC1kaXJlY3Rpb246Y29sdW1uO2FsaWduLWl0ZW1zOmNlbnRlcjtqdXN0aWZ5LWNvbnRlbnQ6Y2VudGVyO2dhcDoxMHB4O3Bvc2l0aW9uOnJlbGF0aXZlO3otaW5kZXg6MX0KLm1pZDo6YmVmb3JlewogIGNvbnRlbnQ6IiI7cG9zaXRpb246YWJzb2x1dGU7aW5zZXQ6NiUgNCU7Ym9yZGVyLXJhZGl1czo1MCU7Ym9yZGVyOjJweCBzb2xpZCAjZThjMjZhNTU7ei1pbmRleDotMTsKICBiYWNrZ3JvdW5kOnVybCgiZGF0YTppbWFnZS9zdmcreG1sLCUzQ3N2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHZpZXdCb3g9Jy01MCAtNTAgMTAwIDEwMCclM0UlM0NnIGZpbGw9J25vbmUnIHN0cm9rZT0nJTIzZThjMjZhJyBzdHJva2Utb3BhY2l0eT0nLjIyJyBzdHJva2Utd2lkdGg9JzEnJTNFJTNDcmVjdCB4PSctMjQnIHk9Jy0yNCcgd2lkdGg9JzQ4JyBoZWlnaHQ9JzQ4Jy8lM0UlM0NyZWN0IHg9Jy0yNCcgeT0nLTI0JyB3aWR0aD0nNDgnIGhlaWdodD0nNDgnIHRyYW5zZm9ybT0ncm90YXRlKDQ1KScvJTNFJTNDY2lyY2xlIHI9JzEzJy8lM0UlM0NjaXJjbGUgcj0nNCcvJTNFJTNDL2clM0UlM0Mvc3ZnJTNFIikgY2VudGVyLzYyJSBuby1yZXBlYXQ7Cn0KLnNjb3JlYmFye2Rpc3BsYXk6ZmxleDtnYXA6OHB4O2FsaWduLWl0ZW1zOmNlbnRlcjtmbGV4LXdyYXA6d3JhcDtqdXN0aWZ5LWNvbnRlbnQ6Y2VudGVyO2ZvbnQtc2l6ZToxM3B4fQoucGlsbHtiYWNrZ3JvdW5kOiMwMDA4O2JvcmRlcjoxcHggc29saWQgI2U4YzI2YTY2O2JvcmRlci1yYWRpdXM6OTk5cHg7cGFkZGluZzo0cHggMTFweDtkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2dhcDo1cHh9Ci5waWxsIGJ7Y29sb3I6dmFyKC0tZ29sZCk7Zm9udC1zaXplOjE1cHh9Ci5waWxsIHN2Z3t3aWR0aDoxN3B4O2hlaWdodDoxN3B4fQojdGFibGV7ZGlzcGxheTpmbGV4O2dhcDoxNnB4O2FsaWduLWl0ZW1zOmNlbnRlcjtqdXN0aWZ5LWNvbnRlbnQ6Y2VudGVyO21pbi1oZWlnaHQ6MTI4cHh9Ci5zbG90e3dpZHRoOjg2cHg7YXNwZWN0LXJhdGlvOjUvNztib3JkZXItcmFkaXVzOjlweDtib3JkZXI6MnB4IGRhc2hlZCAjZThjMjZhNDA7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtqdXN0aWZ5LWNvbnRlbnQ6Y2VudGVyO2ZvbnQtc2l6ZToxMnB4O2NvbG9yOiNlOGMyNmE4OH0KLnNsb3Qub257Ym9yZGVyOjB9Ci5zbG90IC5jYXJkey0tY3c6ODZweDtib3gtc2hhZG93OjAgOHB4IDE0cHggIzAwMGEsMCAwIDAgMXB4ICNiOWE2N2F9Ci5zbG90IC5jYXJkLmZseS1tZXthbmltYXRpb246Zmx5TWUgLjI4cyBjdWJpYy1iZXppZXIoLjIsLjgsLjMsMSl9Ci5zbG90IC5jYXJkLmZseS1vcHB7YW5pbWF0aW9uOmZseU9wcCAuMjhzIGN1YmljLWJlemllciguMiwuOCwuMywxKX0KQGtleWZyYW1lcyBmbHlNZXtmcm9te3RyYW5zZm9ybTp0cmFuc2xhdGVZKDE1MHB4KSBzY2FsZSguNykgcm90YXRlKDhkZWcpO29wYWNpdHk6LjJ9dG97dHJhbnNmb3JtOm5vbmU7b3BhY2l0eToxfX0KQGtleWZyYW1lcyBmbHlPcHB7ZnJvbXt0cmFuc2Zvcm06dHJhbnNsYXRlWSgtMTUwcHgpIHNjYWxlKC43KSByb3RhdGUoLThkZWcpO29wYWNpdHk6LjJ9dG97dHJhbnNmb3JtOm5vbmU7b3BhY2l0eToxfX0KI3N0YXR1c3tmb250LXNpemU6MTdweDtmb250LXdlaWdodDo2MDA7bWluLWhlaWdodDoyOHB4O3RleHQtYWxpZ246Y2VudGVyO3RleHQtc2hhZG93OjAgMnB4IDRweCAjMDAwfQojc3RhdHVzLm1le2NvbG9yOnZhcigtLWdvbGQpfQojdHJ1bXBQaWNre2Rpc3BsYXk6ZmxleDtnYXA6MTBweH0KI3RydW1wUGljayBidXR0b257CiAgd2lkdGg6NjBweDtoZWlnaHQ6NjhweDtib3JkZXItcmFkaXVzOjEycHg7Ym9yZGVyOjJweCBzb2xpZCB2YXIoLS1nb2xkMik7cGFkZGluZzo4cHg7CiAgYmFja2dyb3VuZDpsaW5lYXItZ3JhZGllbnQoMTQ1ZGVnLCNmZmZkZjYsI2VmZTNjMik7Ym94LXNoYWRvdzowIDRweCA4cHggIzAwMGEKfQojdHJ1bXBQaWNrIGJ1dHRvbiBzdmd7d2lkdGg6MTAwJTtoZWlnaHQ6MTAwJX0KI3RydW1wUGljayBidXR0b246YWN0aXZle3RyYW5zZm9ybTpzY2FsZSguOTUpfQojaGFuZHtkaXNwbGF5OmZsZXg7anVzdGlmeS1jb250ZW50OmNlbnRlcjtkaXJlY3Rpb246bHRyO3BhZGRpbmc6MTZweCAwIDJweDttaW4taGVpZ2h0OjExMnB4fQojaGFuZCAuY2FyZHstLWN3OjYycHg7dHJhbnNmb3JtLW9yaWdpbjo1MCUgMTYwJTt0cmFuc2Zvcm06dHJhbnNsYXRlWSh2YXIoLS15LDApKSByb3RhdGUodmFyKC0tciwwZGVnKSk7dHJhbnNpdGlvbjp0cmFuc2Zvcm0gLjEycyxmaWx0ZXIgLjEyc30KI2hhbmQgLmNhcmQuZGlze2ZpbHRlcjpicmlnaHRuZXNzKC42Mil9CiNoYW5kIC5jYXJkLmNhbntjdXJzb3I6cG9pbnRlcjtib3gtc2hhZG93OjAgMCAwIDJweCB2YXIoLS1nb2xkKSwwIDNweCA4cHggIzAwMGF9CiNoYW5kIC5jYXJkLmNhbjpob3ZlciwjaGFuZCAuY2FyZC5jYW46YWN0aXZle3RyYW5zZm9ybTp0cmFuc2xhdGVZKGNhbGModmFyKC0teSwwcHgpIC0gMTZweCkpIHJvdGF0ZSh2YXIoLS1yLDBkZWcpKX0KI3RvYXN0ewogIHBvc2l0aW9uOmZpeGVkO3RvcDpjYWxjKDEwcHggKyBlbnYoc2FmZS1hcmVhLWluc2V0LXRvcCkpO2xlZnQ6NTAlO3RyYW5zZm9ybTp0cmFuc2xhdGVYKC01MCUpOwogIGJhY2tncm91bmQ6dmFyKC0tY3JpbXNvbik7Y29sb3I6I2ZmZjtwYWRkaW5nOjlweCAxNnB4O2JvcmRlci1yYWRpdXM6MTBweDtmb250LXNpemU6MTRweDt6LWluZGV4Ojk7bWF4LXdpZHRoOjkydnc7dGV4dC1hbGlnbjpjZW50ZXI7CiAgYm94LXNoYWRvdzowIDRweCAxMnB4ICMwMDA4Cn0KCi8qID09PT09IHY0OiBmdWxsc2NyZWVuIC8gdG9wIEhVRCAvIGFuaW1hdGlvbnMgPT09PT0gKi8KOnJvb3R7LS1zdzpjbGFtcCg3NnB4LG1pbigxMnZoLDI2dncpLDEzMHB4KX0KYm9keXtwYWRkaW5nOjA7YmFja2dyb3VuZDojMGMzZTI1fQojbG9iYnksI3dhaXR7cGFkZGluZzpjYWxjKDIwcHggKyBlbnYoc2FmZS1hcmVhLWluc2V0LXRvcCkpIDIwcHggY2FsYygyMHB4ICsgZW52KHNhZmUtYXJlYS1pbnNldC1ib3R0b20pKX0KI2dhbWV7cGFkZGluZzowO2JhY2tncm91bmQ6IzBhMjQxNn0KLmZyYW1le3BhZGRpbmc6MDtib3JkZXItcmFkaXVzOjA7YmFja2dyb3VuZDpub25lO2JveC1zaGFkb3c6bm9uZX0KLmZlbHR7Ym9yZGVyLXJhZGl1czowO2JveC1zaGFkb3c6aW5zZXQgMCAwIDkwcHggIzAwMGI7cGFkZGluZzpjYWxjKDZweCArIGVudihzYWZlLWFyZWEtaW5zZXQtdG9wKSkgY2FsYyg4cHggKyBlbnYoc2FmZS1hcmVhLWluc2V0LXJpZ2h0KSkgY2FsYyg4cHggKyBlbnYoc2FmZS1hcmVhLWluc2V0LWJvdHRvbSkpIGNhbGMoOHB4ICsgZW52KHNhZmUtYXJlYS1pbnNldC1sZWZ0KSl9Ci5zY3JlZW46bm90KC5oaWRkZW4pe2FuaW1hdGlvbjpzY3JJbiAuNDVzIGVhc2UgYmFja3dhcmRzfQpAa2V5ZnJhbWVzIHNjcklue2Zyb217b3BhY2l0eTowO3RyYW5zZm9ybTpzY2FsZSgxLjAzKX19Ci5odWR7cG9zaXRpb246cmVsYXRpdmU7ei1pbmRleDoyO3BhZGRpbmc6MCA0MHB4IDRweH0KLmh1ZCAuc2NvcmViYXJ7Z2FwOjZweDtmb250LXNpemU6MTJweH0KLmh1ZCAucGlsbHtwYWRkaW5nOjNweCAxMHB4O2JhY2tncm91bmQ6bGluZWFyLWdyYWRpZW50KCMwMDBhLCMwMDA2KTtiYWNrZHJvcC1maWx0ZXI6Ymx1cig2cHgpO3doaXRlLXNwYWNlOm5vd3JhcH0KLmh1ZCAucGlsbCBie2Rpc3BsYXk6aW5saW5lLWJsb2NrO2ZvbnQtc2l6ZToxNnB4fQouZnNie3Bvc2l0aW9uOmZpeGVkO3otaW5kZXg6MTI7dG9wOmNhbGMoOHB4ICsgZW52KHNhZmUtYXJlYS1pbnNldC10b3ApKTtsZWZ0OmNhbGMoOHB4ICsgZW52KHNhZmUtYXJlYS1pbnNldC1sZWZ0KSk7d2lkdGg6MzRweDtoZWlnaHQ6MzRweDtib3JkZXItcmFkaXVzOjEwcHg7Ym9yZGVyOjFweCBzb2xpZCAjZThjMjZhODg7YmFja2dyb3VuZDojMDAwODtjb2xvcjp2YXIoLS1nb2xkKTtmb250LXNpemU6MThweDtsaW5lLWhlaWdodDoxO3BhZGRpbmc6MDtiYWNrZHJvcC1maWx0ZXI6Ymx1cig2cHgpfQouZnNiOmFjdGl2ZXt0cmFuc2Zvcm06c2NhbGUoLjkpfQouc2xvdHt3aWR0aDp2YXIoLS1zdyk7cG9zaXRpb246cmVsYXRpdmV9Ci5zbG90IC5jYXJkey0tY3c6dmFyKC0tc3cpfQojdGFibGV7Z2FwOmNsYW1wKDEycHgsNHZ3LDI4cHgpO21pbi1oZWlnaHQ6Y2FsYyh2YXIoLS1zdykqMS40ICsgOHB4KX0KI29wcENhcmRzIC5jYXJkey0tY3c6Y2xhbXAoMzBweCw1dmgsNDhweCk7bWFyZ2luLWxlZnQ6Y2FsYyh2YXIoLS1jdykqLS41OCl9CiNzdGF0dXN7Zm9udC1zaXplOmNsYW1wKDE2cHgsMi40dmgsMjBweCl9Ci8qIGRlYWwgLyB0dXJuIC8gdHJpY2sgYW5pbWF0aW9ucyAqLwojaGFuZCAuY2FyZC5kZWFse2FuaW1hdGlvbjpkZWFsIC41NXMgY3ViaWMtYmV6aWVyKC4yLC44NSwuMywxKSBiYWNrd2FyZHM7YW5pbWF0aW9uLWRlbGF5OmNhbGModmFyKC0tZCwwKSo1NW1zKX0KQGtleWZyYW1lcyBkZWFse2Zyb217b3BhY2l0eTowO3RyYW5zZm9ybTp0cmFuc2xhdGVZKC01NXZoKSBzY2FsZSguNDUpIHJvdGF0ZSgtMjVkZWcpfX0KLmRlYWxve2FuaW1hdGlvbjpkZWFsbyAuNDVzIGN1YmljLWJlemllciguMiwuOCwuMywxKSBiYWNrd2FyZHM7YW5pbWF0aW9uLWRlbGF5OmNhbGModmFyKC0tZCwwKSo0MG1zKX0KQGtleWZyYW1lcyBkZWFsb3tmcm9te29wYWNpdHk6MDt0cmFuc2Zvcm06dHJhbnNsYXRlWSgtOTBweCkgc2NhbGUoLjUpIHJvdGF0ZSgxNWRlZyl9fQojaGFuZCAuY2FyZC5jYW46OmFmdGVye2NvbnRlbnQ6IiI7cG9zaXRpb246YWJzb2x1dGU7aW5zZXQ6LTJweDtib3JkZXItcmFkaXVzOmluaGVyaXQ7Ym94LXNoYWRvdzowIDAgMTRweCAzcHggI2U4YzI2YTtvcGFjaXR5OjA7YW5pbWF0aW9uOmdsb3cgMS42cyBlYXNlLWluLW91dCBpbmZpbml0ZTtwb2ludGVyLWV2ZW50czpub25lfQpAa2V5ZnJhbWVzIGdsb3d7NTAle29wYWNpdHk6Ljg1fX0KLmZlbHQ6OmJlZm9yZSwuZmVsdDo6YWZ0ZXJ7Y29udGVudDoiIjtwb3NpdGlvbjphYnNvbHV0ZTtsZWZ0OjA7cmlnaHQ6MDtwb2ludGVyLWV2ZW50czpub25lO29wYWNpdHk6MDt0cmFuc2l0aW9uOm9wYWNpdHkgLjRzO3otaW5kZXg6MH0KLmZlbHQ6OmJlZm9yZXt0b3A6MDtoZWlnaHQ6MzAlO2JhY2tncm91bmQ6cmFkaWFsLWdyYWRpZW50KGVsbGlwc2UgYXQgNTAlIDAsIzZmZDNmZjQ0LHRyYW5zcGFyZW50IDcwJSl9Ci5mZWx0OjphZnRlcntib3R0b206MDtoZWlnaHQ6MzYlO2JhY2tncm91bmQ6cmFkaWFsLWdyYWRpZW50KGVsbGlwc2UgYXQgNTAlIDEwMCUsI2U4YzI2YTY2LHRyYW5zcGFyZW50IDcwJSl9Ci5mZWx0W2RhdGEtdHVybj1vcHBdOjpiZWZvcmUsLmZlbHRbZGF0YS10dXJuPW1lXTo6YWZ0ZXJ7YW5pbWF0aW9uOmJyZWF0aGUgMS44cyBlYXNlLWluLW91dCBpbmZpbml0ZX0KQGtleWZyYW1lcyBicmVhdGhlezAlLDEwMCV7b3BhY2l0eToxfTUwJXtvcGFjaXR5Oi4zNX19Ci5zbG90LndpbiAuY2FyZHthbmltYXRpb246d2luUHVsc2UgLjhzIGVhc2UtaW4tb3V0IGluZmluaXRlIGFsdGVybmF0ZTt6LWluZGV4OjJ9CkBrZXlmcmFtZXMgd2luUHVsc2V7ZnJvbXt0cmFuc2Zvcm06c2NhbGUoMSk7Ym94LXNoYWRvdzowIDAgMCAzcHggdmFyKC0tZ29sZCksMCAwIDEycHggMnB4ICNlOGMyNmE5OX10b3t0cmFuc2Zvcm06c2NhbGUoMS4xKSB0cmFuc2xhdGVZKC00cHgpO2JveC1zaGFkb3c6MCAwIDAgM3B4IHZhcigtLWdvbGQpLDAgMCAzMHB4IDhweCAjZThjMjZhY2N9fQouc2xvdC5sb3NlIC5jYXJke2FuaW1hdGlvbjpub25lO3RyYW5zZm9ybTpzY2FsZSguOSk7ZmlsdGVyOmJyaWdodG5lc3MoLjU1KTt0cmFuc2l0aW9uOnRyYW5zZm9ybSAuM3MsZmlsdGVyIC4zc30KLnNsb3Qud2luOjphZnRlcntjb250ZW50OiLinKYiO3Bvc2l0aW9uOmFic29sdXRlO3RvcDotMThweDtsZWZ0OjUwJTt0cmFuc2Zvcm06dHJhbnNsYXRlWCgtNTAlKTtjb2xvcjp2YXIoLS1nb2xkKTtmb250LXNpemU6MjJweDthbmltYXRpb246c3BhcmtsZSAxcyBlYXNlLWluLW91dCBpbmZpbml0ZX0KQGtleWZyYW1lcyBzcGFya2xlezUwJXt0cmFuc2Zvcm06dHJhbnNsYXRlWCgtNTAlKSBzY2FsZSgxLjUpIHJvdGF0ZSgyMGRlZyk7b3BhY2l0eTouNn19Ci5naG9zdHthbmltYXRpb246c3dlZXAgLjU1cyBjdWJpYy1iZXppZXIoLjUsMCwuOCwuNCkgZm9yd2FyZHM7cG9pbnRlci1ldmVudHM6bm9uZTttYXJnaW46MH0KQGtleWZyYW1lcyBzd2VlcHt0b3t0cmFuc2Zvcm06dHJhbnNsYXRlWSh2YXIoLS1keSkpIHNjYWxlKC4zNSkgcm90YXRlKDI1ZGVnKTtvcGFjaXR5OjB9fQojdHJ1bXBQaWNrOm5vdCguaGlkZGVuKSBidXR0b257YW5pbWF0aW9uOnBvcCAuNDVzIGN1YmljLWJlemllciguMiwxLjQsLjQsMSkgYmFja3dhcmRzfQojdHJ1bXBQaWNrIGJ1dHRvbjpudGgtY2hpbGQoMil7YW5pbWF0aW9uLWRlbGF5Oi4wN3N9CiN0cnVtcFBpY2sgYnV0dG9uOm50aC1jaGlsZCgzKXthbmltYXRpb24tZGVsYXk6LjE0c30KI3RydW1wUGljayBidXR0b246bnRoLWNoaWxkKDQpe2FuaW1hdGlvbi1kZWxheTouMjFzfQpAa2V5ZnJhbWVzIHBvcHtmcm9te3RyYW5zZm9ybTpzY2FsZSgwKSByb3RhdGUoLTEyMGRlZyk7b3BhY2l0eTowfX0KI3RydW1wUGljayBidXR0b257dHJhbnNpdGlvbjp0cmFuc2Zvcm0gLjE1c30KI3RydW1wUGljayBidXR0b246aG92ZXJ7dHJhbnNmb3JtOnRyYW5zbGF0ZVkoLTRweCkgc2NhbGUoMS4wOCl9CiNhZ2Fpbjpub3QoLmhpZGRlbil7YW5pbWF0aW9uOnBvcCAuNXMgYmFja3dhcmRzfQouYmFubmVye3Bvc2l0aW9uOmZpeGVkO2xlZnQ6NTAlO3RvcDo0MiU7ei1pbmRleDozMDtwb2ludGVyLWV2ZW50czpub25lO2ZvbnQtc2l6ZTozNHB4O2ZvbnQtd2VpZ2h0OjgwMDtjb2xvcjp2YXIoLS1nb2xkKTt0ZXh0LXNoYWRvdzowIDNweCAwICM1YTNkMDYsMCA4cHggMjRweCAjMDAwO3doaXRlLXNwYWNlOm5vd3JhcH0KLyogbG9iYnkgKi8KLmZhbnthbmltYXRpb246Ym9iIDMuMnMgZWFzZS1pbi1vdXQgaW5maW5pdGV9CkBrZXlmcmFtZXMgYm9iezUwJXt0cmFuc2Zvcm06dHJhbnNsYXRlWSgtOHB4KX19Ci5mYW4gLmNhcmR7dHJhbnNmb3JtOnJvdGF0ZSh2YXIoLS1yLDBkZWcpKSB0cmFuc2xhdGVZKHZhcigtLXR5LDBweCkpO2FuaW1hdGlvbjpmYW5JbiAuOHMgY3ViaWMtYmV6aWVyKC4yLC45LC4zLDEuMikgYmFja3dhcmRzO2FuaW1hdGlvbi1kZWxheTpjYWxjKHZhcigtLWksMCkqMTAwbXMpfQpAa2V5ZnJhbWVzIGZhbklue2Zyb217b3BhY2l0eTowO3RyYW5zZm9ybTp0cmFuc2xhdGVZKDE0MHB4KSByb3RhdGUoMGRlZykgc2NhbGUoLjUpfX0KaDF7YW5pbWF0aW9uOnRpdGxlSW4gLjlzIGN1YmljLWJlemllciguMiwuOSwuMywxLjIpIC4ycyBiYWNrd2FyZHN9CkBrZXlmcmFtZXMgdGl0bGVJbntmcm9te29wYWNpdHk6MDt0cmFuc2Zvcm06dHJhbnNsYXRlWSgtMjBweCkgc2NhbGUoLjgpfX0KI2NvZGV7YW5pbWF0aW9uOmNvZGVJbiAuNnMgY3ViaWMtYmV6aWVyKC4yLDEuMywuNCwxKSBiYWNrd2FyZHMsZ2xvd1RleHQgMnMgZWFzZS1pbi1vdXQgLjZzIGluZmluaXRlfQpAa2V5ZnJhbWVzIGNvZGVJbntmcm9te29wYWNpdHk6MDt0cmFuc2Zvcm06c2NhbGUoLjQpfX0KQGtleWZyYW1lcyBnbG93VGV4dHs1MCV7dGV4dC1zaGFkb3c6MCAwIDI2cHggI2U4YzI2YX19Ci5idG57dHJhbnNpdGlvbjp0cmFuc2Zvcm0gLjFzLGJveC1zaGFkb3cgLjFzLGZpbHRlciAuMnN9Ci5idG46aG92ZXJ7ZmlsdGVyOmJyaWdodG5lc3MoMS4wOCl9CkBtZWRpYSAocHJlZmVycy1yZWR1Y2VkLW1vdGlvbjpyZWR1Y2UpeyosKjo6YmVmb3JlLCo6OmFmdGVye2FuaW1hdGlvbi1kdXJhdGlvbjouMDFtcyFpbXBvcnRhbnQ7YW5pbWF0aW9uLWl0ZXJhdGlvbi1jb3VudDoxIWltcG9ydGFudH19Cjwvc3R5bGU+CjwvaGVhZD4KPGJvZHk+Cgo8IS0tIHNoYXJlZCBTVkcgc3ltYm9scyAtLT4KPHN2ZyB3aWR0aD0iMCIgaGVpZ2h0PSIwIiBzdHlsZT0icG9zaXRpb246YWJzb2x1dGUiIGFyaWEtaGlkZGVuPSJ0cnVlIj48ZGVmcz4KICA8c3ltYm9sIGlkPSJzSCIgdmlld0JveD0iMCAwIDEwMCAxMDAiPjxwYXRoIGZpbGw9ImN1cnJlbnRDb2xvciIgZD0iTTUwIDkyQzE4IDY2IDQgNTAgNCAzMUM0IDE1IDE2IDUgMjkgNUMzOSA1IDQ2IDEwIDUwIDE4QzU0IDEwIDYxIDUgNzEgNUM4NCA1IDk2IDE1IDk2IDMxQzk2IDUwIDgyIDY2IDUwIDkyWiIvPjwvc3ltYm9sPgogIDxzeW1ib2wgaWQ9InNEIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+PHBhdGggZmlsbD0iY3VycmVudENvbG9yIiBkPSJNNTAgM0M1OCAyNSA3NSA0MCA5MiA1MEM3NSA2MCA1OCA3NSA1MCA5N0M0MiA3NSAyNSA2MCA4IDUwQzI1IDQwIDQyIDI1IDUwIDNaIi8+PC9zeW1ib2w+CiAgPHN5bWJvbCBpZD0ic1MiIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48cGF0aCBmaWxsPSJjdXJyZW50Q29sb3IiIGQ9Ik01MCAzQzUwIDMgOTMgMzYgOTMgNjJDOTMgNzggODEgODcgNjggODdDNjAgODcgNTQgODMgNTIgNzdDNTMgODkgNTggOTQgNjcgOTdMMzMgOTdDNDIgOTQgNDcgODkgNDggNzdDNDYgODMgNDAgODcgMzIgODdDMTkgODcgNyA3OCA3IDYyQzcgMzYgNTAgMyA1MCAzWiIvPjwvc3ltYm9sPgogIDxzeW1ib2wgaWQ9InNDIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+PGcgZmlsbD0iY3VycmVudENvbG9yIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjI4IiByPSIyMiIvPjxjaXJjbGUgY3g9IjI2IiBjeT0iNjIiIHI9IjIyIi8+PGNpcmNsZSBjeD0iNzQiIGN5PSI2MiIgcj0iMjIiLz48cGF0aCBkPSJNNTAgNTBDNTAgNzggNDYgOTAgMzYgOThMNjQgOThDNTQgOTAgNTAgNzggNTAgNTBaIi8+PC9nPjwvc3ltYm9sPgogIDxwYXR0ZXJuIGlkPSJicCIgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj4KICAgIDxyZWN0IHdpZHRoPSIxMCIgaGVpZ2h0PSIxMCIgZmlsbD0iIzdkMWQyYyIvPgogICAgPHBhdGggZD0iTTUgMEwxMCA1TDUgMTBMMCA1WiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjYzk5NzNhIiBzdHJva2Utd2lkdGg9Ii42Ii8+CiAgICA8Y2lyY2xlIGN4PSI1IiBjeT0iNSIgcj0iMSIgZmlsbD0iI2U4YzI2YSIvPgogIDwvcGF0dGVybj4KPC9kZWZzPjwvc3ZnPgoKPGRpdiBpZD0idG9hc3QiIGNsYXNzPSJoaWRkZW4iPjwvZGl2Pgo8YnV0dG9uIGlkPSJmc0J0biIgY2xhc3M9ImZzYiIgYXJpYS1sYWJlbD0i2KrZhdin2YUg2LXZgdit2YciPuKbtjwvYnV0dG9uPgoKPGRpdiBpZD0ibG9iYnkiIGNsYXNzPSJzY3JlZW4iPgogIDxkaXYgY2xhc3M9ImZhbiIgaWQ9ImZhbiI+PC9kaXY+CiAgPGgxPtit2qnZhTxzbWFsbD7Yr9mIINmG2YHYsdmH2Iwg2KLZhtmE2KfbjNmGINmIINio2K/ZiNmGINiq2KPYrtuM2LE8L3NtYWxsPjwvaDE+CiAgPGlucHV0IGlkPSJuYW1lSW4iIHBsYWNlaG9sZGVyPSLYp9iz2YUg2KrZiCIgbWF4bGVuZ3RoPSIxNCIgYXV0b2NvbXBsZXRlPSJvZmYiPgogIDxidXR0b24gY2xhc3M9ImJ0biIgaWQ9ImNyZWF0ZUJ0biI+2LPYp9iu2Kog2KfYqtin2YI8L2J1dHRvbj4KICA8ZGl2IGNsYXNzPSJkaXZpZGVyIj7bjNinINqp2K8g2KfYqtin2YIg2K/ZiNiz2KrYqiDYsdinINmI2KfYsdivINqp2YY8L2Rpdj4KICA8aW5wdXQgaWQ9ImNvZGVJbiIgcGxhY2Vob2xkZXI9Itqp2K8g27Ug2LHZgtmF24wiIGlucHV0bW9kZT0ibnVtZXJpYyIgbWF4bGVuZ3RoPSI1IiBhdXRvY29tcGxldGU9Im9mZiIgZGlyPSJsdHIiPgogIDxidXR0b24gY2xhc3M9ImJ0biBhbHQiIGlkPSJqb2luQnRuIj7ZiNix2YjYryDYqNmHINin2KrYp9mCPC9idXR0b24+CjwvZGl2PgoKPGRpdiBpZD0id2FpdCIgY2xhc3M9InNjcmVlbiBoaWRkZW4iPgogIDxkaXYgY2xhc3M9ImhpbnQiPtqp2K8g2KfYqtin2YIg2LHYpyDYqNix2KfbjCDYr9mI2LPYqtiqINio2YHYsdiz2Ko8L2Rpdj4KICA8ZGl2IGlkPSJjb2RlIj4tLS0tLTwvZGl2PgogIDxidXR0b24gY2xhc3M9ImJ0biBhbHQiIGlkPSJjb3B5QnRuIj7aqdm+24wg2qnYrzwvYnV0dG9uPgogIDxkaXYgY2xhc3M9ImhpbnQiPtio2Kcg2YjYsdmI2K8g2K3YsduM2YHYjCDYqNin2LLbjCDYrtmI2K/aqdin2LEg2LTYsdmI2Lkg2YXbjOKAjNi02YjYry4g2KfbjNmGINi12YHYrdmHINix2Kcg2YbYqNmG2K8uPC9kaXY+CjwvZGl2PgoKPGRpdiBpZD0iZ2FtZSIgY2xhc3M9InNjcmVlbiBoaWRkZW4iPgogIDxkaXYgY2xhc3M9ImZyYW1lIj48ZGl2IGNsYXNzPSJmZWx0IiBpZD0iZmVsdCI+CiAgICA8ZGl2IGNsYXNzPSJodWQiPgogICAgICA8ZGl2IGNsYXNzPSJzY29yZWJhciI+CiAgICAgICAgPHNwYW4gY2xhc3M9InBpbGwiPtin2YXYqtuM2KfYsiA8YiBpZD0ic2MiPjAgOiAwPC9iPiDYp9iyINu3PC9zcGFuPgogICAgICAgIDxzcGFuIGNsYXNzPSJwaWxsIj7Yr9iz2KrigIzZh9inIDxiIGlkPSJ0ayI+MCAtIDA8L2I+PC9zcGFuPgogICAgICAgIDxzcGFuIGNsYXNzPSJwaWxsIiBpZD0idHJ1bXBQaWxsIj7Yrdqp2YU6IC08L3NwYW4+CiAgICAgIDwvZGl2PgogICAgPC9kaXY+CiAgICA8ZGl2IGNsYXNzPSJ0b3AiPgogICAgICA8ZGl2IGNsYXNzPSJwbmFtZSIgaWQ9Im9wcE5hbWUiPjwvZGl2PgogICAgICA8ZGl2IGlkPSJvcHBDYXJkcyI+PC9kaXY+CiAgICA8L2Rpdj4KICAgIDxkaXYgY2xhc3M9Im1pZCI+CiAgICAgIDxkaXYgaWQ9InRhYmxlIj48ZGl2IGNsYXNzPSJzbG90IiBpZD0ic2xvdE9wcCI+2K3YsduM2YE8L2Rpdj48ZGl2IGNsYXNzPSJzbG90IiBpZD0ic2xvdE1lIj7YqtmIPC9kaXY+PC9kaXY+CiAgICAgIDxkaXYgaWQ9InN0YXR1cyI+PC9kaXY+CiAgICAgIDxkaXYgaWQ9InRydW1wUGljayIgY2xhc3M9ImhpZGRlbiI+CiAgICAgICAgPGJ1dHRvbiBkYXRhLXM9IlMiIHN0eWxlPSJjb2xvcjojMTYyMDJhIj48c3ZnIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48dXNlIGhyZWY9IiNzUyIgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiLz48L3N2Zz48L2J1dHRvbj4KICAgICAgICA8YnV0dG9uIGRhdGEtcz0iSCIgc3R5bGU9ImNvbG9yOiNiMzI2M2UiPjxzdmcgdmlld0JveD0iMCAwIDEwMCAxMDAiPjx1c2UgaHJlZj0iI3NIIiB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIvPjwvc3ZnPjwvYnV0dG9uPgogICAgICAgIDxidXR0b24gZGF0YS1zPSJEIiBzdHlsZT0iY29sb3I6I2IzMjYzZSI+PHN2ZyB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+PHVzZSBocmVmPSIjc0QiIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIi8+PC9zdmc+PC9idXR0b24+CiAgICAgICAgPGJ1dHRvbiBkYXRhLXM9IkMiIHN0eWxlPSJjb2xvcjojMTYyMDJhIj48c3ZnIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48dXNlIGhyZWY9IiNzQyIgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiLz48L3N2Zz48L2J1dHRvbj4KICAgICAgPC9kaXY+CiAgICAgIDxidXR0b24gY2xhc3M9ImJ0biBoaWRkZW4iIGlkPSJhZ2FpbiI+2KjYp9iy24wg2K/ZiNio2KfYsdmHPC9idXR0b24+CiAgICA8L2Rpdj4KICAgIDxkaXYgY2xhc3M9ImJvdHRvbSI+CiAgICAgIDxkaXYgY2xhc3M9InBuYW1lIiBpZD0ibXlOYW1lIj48L2Rpdj4KICAgICAgPGRpdiBpZD0iaGFuZCI+PC9kaXY+CiAgICA8L2Rpdj4KICA8L2Rpdj48L2Rpdj4KPC9kaXY+Cgo8c2NyaXB0Pgpjb25zdCBTVUlUUz1bJ1MnLCdIJywnRCcsJ0MnXTsKbGV0IGFyY2FkZU1hdGNoU3RhcnRlZD1mYWxzZTtmdW5jdGlvbiBhcmNhZGVOb3RpZnkodHlwZSxzY29yZT0wLHdvbj1mYWxzZSl7aWYodHlwZT09PSdzdGFydCcpYXJjYWRlTWF0Y2hTdGFydGVkPXRydWU7dHJ5e2lmKHdpbmRvdy5wYXJlbnQhPT13aW5kb3cpd2luZG93LnBhcmVudC5wb3N0TWVzc2FnZSh7c291cmNlOidub3ZhLWFyY2FkZS1lbWJlZCcsZ2FtZTonaG9rbScsdHlwZSxzY29yZSx3b259LCcqJyl9Y2F0Y2goZSl7fX0KCmNvbnN0IE5BTUU9e1M6J9m+24zaqScsSDon2K/ZhCcsRDon2K7YtNiqJyxDOifar9i02YbbjNiyJ307CmNvbnN0IFJLPXsxMTonSicsMTI6J1EnLDEzOidLJywxNDonQSd9Owpjb25zdCBybD1yPT5SS1tyXXx8cjsKY29uc3QgJD1pZD0+ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoaWQpOwpjb25zdCBpc1JlZD1zPT5zPT09J0gnfHxzPT09J0QnOwpjb25zdCBub3JtPXM9PnMucmVwbGFjZSgvW9uwLdu5XS9nLGQ9PifbsNux27Lbs9u027Xbttu327jbuScuaW5kZXhPZihkKSkucmVwbGFjZSgvW9mgLdmpXS9nLGQ9PifZoNmh2aLZo9mk2aXZptmn2ajZqScuaW5kZXhPZihkKSkucmVwbGFjZSgvXEQvZywnJyk7CmNvbnN0IGVzYz1zPT5TdHJpbmcocykucmVwbGFjZSgvWyY8PiInXS9nLGM9Pih7JyYnOicmYW1wOycsJzwnOicmbHQ7JywnPic6JyZndDsnLCciJzonJnF1b3Q7JywiJyI6JyYjMzk7J31bY10pKTsKY29uc3QgUFJFRklYPSdob2ttMnAtJzsKZnVuY3Rpb24gbHMoayx2KXt0cnl7aWYodj09PXVuZGVmaW5lZClyZXR1cm4gbG9jYWxTdG9yYWdlLmdldEl0ZW0oayl8fCcnO2xvY2FsU3RvcmFnZS5zZXRJdGVtKGssdik7fWNhdGNoKGUpe3JldHVybiAnJ319CmZ1bmN0aW9uIHNzKGssdil7dHJ5e2lmKHY9PT11bmRlZmluZWQpcmV0dXJuIHNlc3Npb25TdG9yYWdlLmdldEl0ZW0oayl8fCcnO3Nlc3Npb25TdG9yYWdlLnNldEl0ZW0oayx2KTt9Y2F0Y2goZSl7cmV0dXJuICcnfX0KCi8qID09PT09PT09PT09PT09PT09IENhcmQgZ3JhcGhpY3MgPT09PT09PT09PT09PT09PT0gKi8KY29uc3Qgc3VpdFVzZT0ocyx4LHksc2l6ZSxyb3QpPT5gPHVzZSBocmVmPSIjcyR7c30iIHg9IiR7eC1zaXplLzJ9IiB5PSIke3ktc2l6ZS8yfSIgd2lkdGg9IiR7c2l6ZX0iIGhlaWdodD0iJHtzaXplfSIke3JvdD9gIHRyYW5zZm9ybT0icm90YXRlKDE4MCAke3h9ICR7eX0pImA6Jyd9Lz5gOwpjb25zdCBQSVBTPSgoKT0+ewogIGNvbnN0IEw9MzEsQz01MCxSPTY5OwogIGNvbnN0IHNpeD1bW0wsMzBdLFtSLDMwXSxbTCw3MF0sW1IsNzBdLFtMLDExMF0sW1IsMTEwXV07CiAgcmV0dXJuewogICAgMjpbW0MsMzBdLFtDLDExMF1dLDM6W1tDLDMwXSxbQyw3MF0sW0MsMTEwXV0sCiAgICA0OltbTCwzMF0sW1IsMzBdLFtMLDExMF0sW1IsMTEwXV0sNTpbW0wsMzBdLFtSLDMwXSxbQyw3MF0sW0wsMTEwXSxbUiwxMTBdXSwKICAgIDY6c2l4LDc6Wy4uLnNpeCxbQyw1MF1dLDg6Wy4uLnNpeCxbQyw1MF0sW0MsOTBdXSwKICAgIDk6W1tMLDMwXSxbUiwzMF0sW0wsNTddLFtSLDU3XSxbTCw4M10sW1IsODNdLFtMLDExMF0sW1IsMTEwXSxbQyw3MF1dLAogICAgMTA6W1tMLDMwXSxbUiwzMF0sW0wsNTddLFtSLDU3XSxbTCw4M10sW1IsODNdLFtMLDExMF0sW1IsMTEwXSxbNTAsNDNdLFs1MCw5N11dCiAgfTsKfSkoKTsKZnVuY3Rpb24gZmlndXJlKHIscm9iZSl7CiAgbGV0IGc9YDxwYXRoIGQ9Ik0yNCA2OUMyNCA1NSAzNCA0OSA1MCA0OUM2NiA0OSA3NiA1NSA3NiA2OVoiIGZpbGw9IiR7cm9iZX0iIHN0cm9rZT0iIzExMSIgc3Ryb2tlLXdpZHRoPSIuNiIvPgogIDxwYXRoIGQ9Ik01MCA0OUw1MCA2OSIgc3Ryb2tlPSIjZTViODRhIiBzdHJva2Utd2lkdGg9IjIiLz4KICA8cGF0aCBkPSJNMzAgNjlDMzAgNjAgMzYgNTUgNDIgNTNNNzAgNjlDNzAgNjAgNjQgNTUgNTggNTMiIHN0cm9rZT0iI2U1Yjg0YSIgc3Ryb2tlLXdpZHRoPSIxLjQiIGZpbGw9Im5vbmUiLz4KICA8ZWxsaXBzZSBjeD0iNTAiIGN5PSI0OSIgcng9IjkiIHJ5PSI0IiBmaWxsPSIjZmZmIiBzdHJva2U9IiM5OTkiIHN0cm9rZS13aWR0aD0iLjQiLz5gOwogIGlmKHI9PT0xMilnKz1gPHBhdGggZD0iTTQxIDMzQzMzIDM4IDMzIDUyIDM3IDYwTDQzIDUwTDQyIDM4WiIgZmlsbD0iIzZiM2UxZCIvPjxwYXRoIGQ9Ik01OSAzM0M2NyAzOCA2NyA1MiA2MyA2MEw1NyA1MEw1OCAzOFoiIGZpbGw9IiM2YjNlMWQiLz5gOwogIGlmKHI9PT0xMSlnKz1gPHBhdGggZD0iTTQxIDM0QzM4IDQwIDM5IDQ2IDQxIDQ4TDQzIDQwWiIgZmlsbD0iIzRhMmMxNCIvPjxwYXRoIGQ9Ik01OSAzNEM2MiA0MCA2MSA0NiA1OSA0OEw1NyA0MFoiIGZpbGw9IiM0YTJjMTQiLz5gOwogIGcrPWA8ZWxsaXBzZSBjeD0iNTAiIGN5PSIzOCIgcng9IjguNSIgcnk9IjEwIiBmaWxsPSIjZjNjZmE2IiBzdHJva2U9IiM2YjQ0MjMiIHN0cm9rZS13aWR0aD0iLjYiLz4KICA8Y2lyY2xlIGN4PSI0Ni41IiBjeT0iMzYuNSIgcj0iMSIvPjxjaXJjbGUgY3g9IjUzLjUiIGN5PSIzNi41IiByPSIxIi8+CiAgPHBhdGggZD0iTTUwIDM3LjVMNDkgNDFMNTEgNDEiIHN0cm9rZT0iI2E0NmEzYSIgc3Ryb2tlLXdpZHRoPSIuNSIgZmlsbD0ibm9uZSIvPgogIDxwYXRoIGQ9Ik00NyA0My41UTUwIDQ1LjUgNTMgNDMuNSIgc3Ryb2tlPSIjOGEyYjJiIiBzdHJva2Utd2lkdGg9Ii43IiBmaWxsPSJub25lIi8+YDsKICBpZihyPT09MTMpewogICAgZys9YDxwYXRoIGQ9Ik00MiA0MEM0MiA1NCA1OCA1NCA1OCA0MEM1NiA0NyA0NCA0NyA0MiA0MFoiIGZpbGw9IiNjZmM3YjQiIHN0cm9rZT0iIzZiNjM1NSIgc3Ryb2tlLXdpZHRoPSIuNSIvPgogICAgPHBhdGggZD0iTTQwIDMwTDQwIDIwTDQ1IDI1TDUwIDE3TDU1IDI1TDYwIDIwTDYwIDMwWiIgZmlsbD0iI2U4YjczYSIgc3Ryb2tlPSIjN2E1YTEwIiBzdHJva2Utd2lkdGg9Ii42Ii8+CiAgICA8Y2lyY2xlIGN4PSI1MCIgY3k9IjIzIiByPSIxLjUiIGZpbGw9IiNjNDI2M2UiLz48Y2lyY2xlIGN4PSI0MyIgY3k9IjI3IiByPSIxIiBmaWxsPSIjMmI2NmM0Ii8+PGNpcmNsZSBjeD0iNTciIGN5PSIyNyIgcj0iMSIgZmlsbD0iIzJiNjZjNCIvPmA7CiAgfWVsc2UgaWYocj09PTEyKXsKICAgIGcrPWA8cGF0aCBkPSJNNDEgMzFMNDIgMjNMNDYgMjdMNTAgMjFMNTQgMjdMNTggMjNMNTkgMzFaIiBmaWxsPSIjZThiNzNhIiBzdHJva2U9IiM3YTVhMTAiIHN0cm9rZS13aWR0aD0iLjYiLz4KICAgIDxjaXJjbGUgY3g9IjUwIiBjeT0iMjYiIHI9IjEuMyIgZmlsbD0iI2M0MjYzZSIvPgogICAgPHBhdGggZD0iTTQyIDUyUTUwIDU5IDU4IDUyIiBzdHJva2U9IiNlOGI3M2EiIHN0cm9rZS13aWR0aD0iMS4zIiBmaWxsPSJub25lIiBzdHJva2UtZGFzaGFycmF5PSIxLjYgMS40Ii8+YDsKICB9ZWxzZXsKICAgIGcrPWA8cGF0aCBkPSJNMzggMzFDMzggMjIgNjIgMjIgNjIgMzFRNTAgMjggMzggMzFaIiBmaWxsPSIke3JvYmV9IiBzdHJva2U9IiMxMTEiIHN0cm9rZS13aWR0aD0iLjUiLz4KICAgIDxwYXRoIGQ9Ik0zNiAzMlE1MCAyNyA2NiAzMlE2MCAzNSA1MCAzM1E0MCAzNSAzNiAzMloiIGZpbGw9IiNlOGI3M2EiIHN0cm9rZT0iIzdhNWExMCIgc3Ryb2tlLXdpZHRoPSIuNSIvPgogICAgPHBhdGggZD0iTTYwIDI2QzcwIDE2IDc2IDE4IDc0IDI2QzcwIDIyIDY2IDI0IDYyIDI4WiIgZmlsbD0iI2ZmZiIgc3Ryb2tlPSIjOTk5IiBzdHJva2Utd2lkdGg9Ii41Ii8+YDsKICB9CiAgcmV0dXJuIGc7Cn0KY29uc3QgZmFjZUNhY2hlPXt9OwpmdW5jdGlvbiBmYWNlU1ZHKGMpewogIGNvbnN0IGs9Yy5zK2MucjtpZihmYWNlQ2FjaGVba10pcmV0dXJuIGZhY2VDYWNoZVtrXTsKICBjb25zdCBjb2w9aXNSZWQoYy5zKT8nI2IzMjYzZSc6JyMxNjIwMmEnLGxhYmVsPXJsKGMuciksdGVuPWMucj09PTEwOwogIGNvbnN0IGNvcm5lcj1gPHRleHQgeD0iMTIiIHk9IiR7dGVuPzIyOjIzfSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1zaXplPSIke3Rlbj8xNjoyMH0iIGZvbnQtd2VpZ2h0PSI3MDAiIGZvbnQtZmFtaWx5PSJHZW9yZ2lhLCdUaW1lcyBOZXcgUm9tYW4nLHNlcmlmIiBmaWxsPSJjdXJyZW50Q29sb3IiIGxldHRlci1zcGFjaW5nPSIke3Rlbj8tMS41OjB9Ij4ke2xhYmVsfTwvdGV4dD4ke3N1aXRVc2UoYy5zLDEyLDM0LDEyKX1gOwogIGxldCBib2R5PScnOwogIGlmKGMucj09PTE0KXsKICAgIGJvZHk9c3VpdFVzZShjLnMsNTAsNzAsYy5zPT09J1MnPzY0OjU0KTsKICB9ZWxzZSBpZihjLnI+PTExKXsKICAgIGNvbnN0IHJvYmU9aXNSZWQoYy5zKT8nI2IzMjYzZSc6JyMxZDNmNzgnOwogICAgY29uc3QgaGFsZj1gJHtmaWd1cmUoYy5yLHJvYmUpfSR7c3VpdFVzZShjLnMsMzEsMjksMTEpfWA7CiAgICBib2R5PWA8cmVjdCB4PSIyMiIgeT0iMTciIHdpZHRoPSI1NiIgaGVpZ2h0PSIxMDYiIHJ4PSIzIiBmaWxsPSIjZmJmM2RjIiBzdHJva2U9IiNiODg5MmIiIHN0cm9rZS13aWR0aD0iMS4yIi8+CiAgICA8Zz4ke2hhbGZ9PC9nPjxnIHRyYW5zZm9ybT0icm90YXRlKDE4MCA1MCA3MCkiPiR7aGFsZn08L2c+CiAgICA8bGluZSB4MT0iMjIiIHkxPSI3MCIgeDI9Ijc4IiB5Mj0iNzAiIHN0cm9rZT0iI2I4ODkyYiIgc3Ryb2tlLXdpZHRoPSIuNiIvPmA7CiAgfWVsc2V7CiAgICBjb25zdCBzej1jLnI8PTY/MjI6MTk7CiAgICBib2R5PVBJUFNbYy5yXS5tYXAoKFt4LHldKT0+c3VpdFVzZShjLnMseCx5LHN6LHk+NzApKS5qb2luKCcnKTsKICB9CiAgY29uc3Qgc3ZnPWA8c3ZnIHZpZXdCb3g9IjAgMCAxMDAgMTQwIiBwcmVzZXJ2ZUFzcGVjdFJhdGlvPSJub25lIiBzdHlsZT0iY29sb3I6JHtjb2x9Ij48cmVjdCB4PSIyIiB5PSIyIiB3aWR0aD0iOTYiIGhlaWdodD0iMTM2IiByeD0iNiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZDljYmE4IiBzdHJva2Utd2lkdGg9Ii44Ii8+JHtjb3JuZXJ9PGcgdHJhbnNmb3JtPSJyb3RhdGUoMTgwIDUwIDcwKSI+JHtjb3JuZXJ9PC9nPiR7Ym9keX08L3N2Zz5gOwogIHJldHVybiBmYWNlQ2FjaGVba109c3ZnOwp9CmNvbnN0IEJBQ0tfU1ZHPWA8c3ZnIHZpZXdCb3g9IjAgMCAxMDAgMTQwIiBwcmVzZXJ2ZUFzcGVjdFJhdGlvPSJub25lIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjE0MCIgcng9IjciIGZpbGw9IiNmZmZhZjAiLz48cmVjdCB4PSI1IiB5PSI1IiB3aWR0aD0iOTAiIGhlaWdodD0iMTMwIiByeD0iNCIgZmlsbD0idXJsKCNicCkiIHN0cm9rZT0iI2M5OTczYSIgc3Ryb2tlLXdpZHRoPSIxLjIiLz48ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSg1MCA3MCkiPjxyZWN0IHg9Ii0xNyIgeT0iLTE3IiB3aWR0aD0iMzQiIGhlaWdodD0iMzQiIGZpbGw9IiM3ZDFkMmMiIHN0cm9rZT0iI2U4YzI2YSIvPjxyZWN0IHg9Ii0xNyIgeT0iLTE3IiB3aWR0aD0iMzQiIGhlaWdodD0iMzQiIGZpbGw9IiM3ZDFkMmMiIHN0cm9rZT0iI2U4YzI2YSIgdHJhbnNmb3JtPSJyb3RhdGUoNDUpIi8+PGNpcmNsZSByPSI5IiBmaWxsPSIjMTQ0MDRmIiBzdHJva2U9IiNlOGMyNmEiLz48Y2lyY2xlIHI9IjMuNSIgZmlsbD0iI2U4YzI2YSIvPjwvZz48L3N2Zz5gOwpmdW5jdGlvbiBjYXJkRWwoYyxleHRyYSl7CiAgY29uc3QgZD1kb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTsKICBkLmNsYXNzTmFtZT0nY2FyZCAnKyhleHRyYXx8JycpOwogIGQuaW5uZXJIVE1MPWZhY2VTVkcoYyk7CiAgcmV0dXJuIGQ7Cn0KZnVuY3Rpb24gYmFja0VsKCl7Y29uc3QgZD1kb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtkLmNsYXNzTmFtZT0nY2FyZCBiYWNrJztkLmlubmVySFRNTD1CQUNLX1NWRztyZXR1cm4gZDt9CgovKiBzb3VuZCAqLwpsZXQgQUM9bnVsbDsKZnVuY3Rpb24gc25hcCgpewogIHRyeXsKICAgIEFDPUFDfHxuZXcgKHdpbmRvdy5BdWRpb0NvbnRleHR8fHdpbmRvdy53ZWJraXRBdWRpb0NvbnRleHQpKCk7CiAgICBjb25zdCBuPUFDLnNhbXBsZVJhdGUqLjA3fDAsYj1BQy5jcmVhdGVCdWZmZXIoMSxuLEFDLnNhbXBsZVJhdGUpLGQ9Yi5nZXRDaGFubmVsRGF0YSgwKTsKICAgIGZvcihsZXQgaT0wO2k8bjtpKyspZFtpXT0oTWF0aC5yYW5kb20oKSoyLTEpKk1hdGgucG93KDEtaS9uLDQpOwogICAgY29uc3Qgcz1BQy5jcmVhdGVCdWZmZXJTb3VyY2UoKTtzLmJ1ZmZlcj1iOwogICAgY29uc3QgZj1BQy5jcmVhdGVCaXF1YWRGaWx0ZXIoKTtmLnR5cGU9J2hpZ2hwYXNzJztmLmZyZXF1ZW5jeS52YWx1ZT05MDA7CiAgICBjb25zdCBnPUFDLmNyZWF0ZUdhaW4oKTtnLmdhaW4udmFsdWU9LjU7CiAgICBzLmNvbm5lY3QoZik7Zi5jb25uZWN0KGcpO2cuY29ubmVjdChBQy5kZXN0aW5hdGlvbik7cy5zdGFydCgpOwogIH1jYXRjaChlKXt9Cn0KZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcigncG9pbnRlcmRvd24nLCgpPT57dHJ5e0FDPUFDfHxuZXcgKHdpbmRvdy5BdWRpb0NvbnRleHR8fHdpbmRvdy53ZWJraXRBdWRpb0NvbnRleHQpKCk7aWYoQUMuc3RhdGU9PT0nc3VzcGVuZGVkJylBQy5yZXN1bWUoKTt9Y2F0Y2goZSl7fX0pOwoKLyogPT09PT09PT09PT09PT09PT0gVUkgaGVscGVycyA9PT09PT09PT09PT09PT09PSAqLwpsZXQgdG9hc3RUPW51bGw7CmZ1bmN0aW9uIHNob3coaWQpe1snbG9iYnknLCd3YWl0JywnZ2FtZSddLmZvckVhY2gocz0+JChzKS5jbGFzc0xpc3QudG9nZ2xlKCdoaWRkZW4nLHMhPT1pZCkpO30KZnVuY3Rpb24gdG9hc3QobXNnLHN0aWNreSl7CiAgY29uc3QgdD0kKCd0b2FzdCcpO3QudGV4dENvbnRlbnQ9bXNnO3QuY2xhc3NMaXN0LnJlbW92ZSgnaGlkZGVuJyk7Y2xlYXJUaW1lb3V0KHRvYXN0VCk7CiAgaWYoIXN0aWNreSl0b2FzdFQ9c2V0VGltZW91dCgoKT0+dC5jbGFzc0xpc3QuYWRkKCdoaWRkZW4nKSw0NTAwKTsKfQpmdW5jdGlvbiBoaWRlVG9hc3QoKXtjbGVhclRpbWVvdXQodG9hc3RUKTskKCd0b2FzdCcpLmNsYXNzTGlzdC5hZGQoJ2hpZGRlbicpO30KZnVuY3Rpb24gbXlOYW1lKCl7cmV0dXJuICgkKCduYW1lSW4nKS52YWx1ZS50cmltKCl8fCfYqNin2LLbjNqp2YYnKS5zbGljZSgwLDE0KTt9CmZ1bmN0aW9uIGJ1c3koYil7JCgnY3JlYXRlQnRuJykuZGlzYWJsZWQ9YjskKCdqb2luQnRuJykuZGlzYWJsZWQ9YjskKCdjcmVhdGVCdG4nKS50ZXh0Q29udGVudD1iPyfYr9ixINit2KfZhCDYp9iq2LXYp9mELi4uJzon2LPYp9iu2Kog2KfYqtin2YInO30KCi8qID09PT09PT09PT09PT09PT09IEhvc3Q6IGF1dGhvcml0YXRpdmUgZ2FtZSBzdGF0ZSA9PT09PT09PT09PT09PT09PSAqLwpsZXQgaXNIb3N0PWZhbHNlLEc9bnVsbCxWPW51bGwsbmFtZXM9WyfYqNin2LLbjNqp2YYg27EnLCfYqNin2LLbjNqp2YYg27InXTsKZnVuY3Rpb24gbmV3RGVjaygpewogIGNvbnN0IGQ9W107CiAgZm9yKGNvbnN0IHMgb2YgU1VJVFMpZm9yKGxldCByPTI7cjw9MTQ7cisrKWQucHVzaCh7cyxyfSk7CiAgZm9yKGxldCBpPWQubGVuZ3RoLTE7aT4wO2ktLSl7Y29uc3Qgaj1NYXRoLmZsb29yKE1hdGgucmFuZG9tKCkqKGkrMSkpO1tkW2ldLGRbal1dPVtkW2pdLGRbaV1dO30KICByZXR1cm4gZDsKfQpmdW5jdGlvbiBzdGFydEdhbWUoKXtHPXtzY29yZTpbMCwwXSxoYWtlbTpNYXRoLnJhbmRvbSgpPC41PzA6MSxyb3VuZDowfTthcmNhZGVNYXRjaFN0YXJ0ZWQ9ZmFsc2U7YXJjYWRlTm90aWZ5KCdzdGFydCcpO3N0YXJ0Um91bmQoKTt9CmZ1bmN0aW9uIHN0YXJ0Um91bmQoKXsKICBHLnJvdW5kKys7Ry5kZWNrPW5ld0RlY2soKTtHLmhhbmRzPVtbXSxbXV07CiAgRy50cnVtcD1udWxsO0cucGhhc2U9J3RydW1wJztHLnRhYmxlPVtdO0cudHJpY2tzPVswLDBdO0cudHVybj1udWxsO0cubXNnPW51bGw7CiAgRy5oYW5kc1tHLmhha2VtXT1HLmRlY2suc3BsaWNlKDAsNSk7CiAgcHVzaCgpOwp9CmZ1bmN0aW9uIGNob29zZVRydW1wKHAscyl7CiAgaWYoIUd8fEcucGhhc2UhPT0ndHJ1bXAnfHxwIT09Ry5oYWtlbXx8IVNVSVRTLmluY2x1ZGVzKHMpKXJldHVybjsKICBHLnRydW1wPXM7CiAgRy5oYW5kc1tHLmhha2VtXS5wdXNoKC4uLkcuZGVjay5zcGxpY2UoMCw4KSk7CiAgRy5oYW5kc1sxLUcuaGFrZW1dPUcuZGVjay5zcGxpY2UoMCwxMyk7CiAgRy5waGFzZT0ncGxheSc7Ry50dXJuPUcuaGFrZW07cHVzaCgpOwp9CmZ1bmN0aW9uIHBsYXkocCxpZCl7CiAgaWYoIUd8fEcucGhhc2UhPT0ncGxheSd8fEcudHVybiE9PXApcmV0dXJuOwogIGNvbnN0IGg9Ry5oYW5kc1twXSxpPWguZmluZEluZGV4KGM9PmMucytjLnI9PT1pZCk7CiAgaWYoaTwwKXJldHVybjsKICBjb25zdCBjPWhbaV07CiAgaWYoRy50YWJsZS5sZW5ndGg9PT0xKXsKICAgIGNvbnN0IGxzdWl0PUcudGFibGVbMF0uYy5zOwogICAgaWYoYy5zIT09bHN1aXQmJmguc29tZSh4PT54LnM9PT1sc3VpdCkpcmV0dXJuOwogIH0KICBoLnNwbGljZShpLDEpO0cudGFibGUucHVzaCh7cCxjfSk7CiAgaWYoRy50YWJsZS5sZW5ndGg9PT0xKXtHLnR1cm49MS1wO3B1c2goKTtyZXR1cm47fQogIEcudHVybj1udWxsO0cucGhhc2U9J3Jlc29sdmUnO3B1c2goKTsKICBzZXRUaW1lb3V0KHJlc29sdmVUcmljaywxMzAwKTsKfQpmdW5jdGlvbiByZXNvbHZlVHJpY2soKXsKICBpZighR3x8Ry5waGFzZSE9PSdyZXNvbHZlJylyZXR1cm47CiAgY29uc3QgW2EsYl09Ry50YWJsZTtsZXQgdz1hLnA7CiAgaWYoYi5jLnM9PT1hLmMucyl7aWYoYi5jLnI+YS5jLnIpdz1iLnA7fQogIGVsc2UgaWYoYi5jLnM9PT1HLnRydW1wKXc9Yi5wOwogIEcudHJpY2tzW3ddKys7Ry50YWJsZT1bXTsKICBpZihHLmhhbmRzWzBdLmxlbmd0aD09PTApe2VuZFJvdW5kKCk7cmV0dXJuO30KICBHLnBoYXNlPSdwbGF5JztHLnR1cm49dztwdXNoKCk7Cn0KZnVuY3Rpb24gZW5kUm91bmQoKXsKICBjb25zdCB3PUcudHJpY2tzWzBdPkcudHJpY2tzWzFdPzA6MSxrb3Q9Ry50cmlja3Nbd109PT0xMyxwdHM9a290PzI6MTsKICBHLnNjb3JlW3ddKz1wdHM7Ry5tc2c9e3cscHRzLGtvdH07Ry5oYWtlbT13OwogIGlmKEcuc2NvcmVbd10+PTcpe0cucGhhc2U9J292ZXInO3B1c2goKTt9CiAgZWxzZXtHLnBoYXNlPSdyb3VuZEVuZCc7cHVzaCgpO3NldFRpbWVvdXQoKCk9PntpZihHJiZHLnBoYXNlPT09J3JvdW5kRW5kJylzdGFydFJvdW5kKCk7fSw0MDAwKTt9Cn0KZnVuY3Rpb24gdmlld0ZvcihwKXsKICByZXR1cm57eW91OnAsbmFtZXMscGhhc2U6Ry5waGFzZSxoYWtlbTpHLmhha2VtLHRydW1wOkcudHJ1bXAsdHVybjpHLnR1cm4sdGFibGU6Ry50YWJsZSwKICAgIHRyaWNrczpHLnRyaWNrcyxzY29yZTpHLnNjb3JlLHJvdW5kOkcucm91bmQsaGFuZDpHLmhhbmRzW3BdLG9wcDpHLmhhbmRzWzEtcF0ubGVuZ3RoLG1zZzpHLm1zZ307Cn0KZnVuY3Rpb24gcHVzaCgpewogIHJlbmRlcih2aWV3Rm9yKDApKTsKICBpZihndWVzdENpZClzZW5kKHt0Oid2Jyx2OnZpZXdGb3IoMSksdG86Z3Vlc3RDaWR9KTsKfQpmdW5jdGlvbiBvbkFjdGlvbihwLG0pewogIGlmKG0udD09PSd0cnVtcCcpY2hvb3NlVHJ1bXAocCxtLnMpOwogIGVsc2UgaWYobS50PT09J3BsYXknKXBsYXkocCxtLmlkKTsKICBlbHNlIGlmKG0udD09PSdyZW1hdGNoJyl7aWYoRyYmRy5waGFzZT09PSdvdmVyJylzdGFydEdhbWUoKTt9Cn0KZnVuY3Rpb24gYWN0KG0pewogIGlmKGlzSG9zdClvbkFjdGlvbigwLG0pOwogIGVsc2Ugc2VuZChtKTsKfQoKLyogPT09PT09PT09PT09PT09PT0gTmV0d29ya2luZyAoTVFUVCBvdmVyIFdlYlNvY2tldCwgcHVibGljIGJyb2tlcnMsIG5vIHNpZ251cCkgPT09PT09PT09PT09PT09PT0gKi8KY29uc3QgVFA9J2hva20ycC12MSc7CmNvbnN0IEJST0tFUlM9Wyd3c3M6Ly9icm9rZXIuZW1xeC5pbzo4MDg0L21xdHQnLCd3c3M6Ly9icm9rZXIuaGl2ZW1xLmNvbTo4ODg0L21xdHQnLCd3c3M6Ly90ZXN0Lm1vc3F1aXR0by5vcmc6ODA4MSddOwpjb25zdCBNUVRUX1VSTFM9WydodHRwczovL2Nkbi5qc2RlbGl2ci5uZXQvbnBtL21xdHRANS4xMC4xL2Rpc3QvbXF0dC5taW4uanMnLCdodHRwczovL3VucGtnLmNvbS9tcXR0QDUuMTAuMS9kaXN0L21xdHQubWluLmpzJ107CmxldCBtcT1udWxsLHJvb21Db2RlPScnLG15Um9sZT0nJyxob3N0SW5mbz1udWxsLGd1ZXN0SW5mbz1udWxsLHByZXNlbmNlUHVibGlzaGVkPWZhbHNlOwpsZXQgZ3Vlc3RDaWQ9bnVsbCxndWVzdFNlZW49ZmFsc2UsaGVsbG9TZW50PWZhbHNlLGpvaW5lZD1mYWxzZSxqb2luVGltZXI9bnVsbCxyZWFkeURvbmU9ZmFsc2UsZ3Vlc3ROYW1lPScnOwpjb25zdCBteUlkPXNzKCdjaWQnKXx8KCgpPT57Y29uc3Qgdj1NYXRoLnJhbmRvbSgpLnRvU3RyaW5nKDM2KS5zbGljZSgyLDEwKTtzcygnY2lkJyx2KTtyZXR1cm4gdjt9KSgpOwoKZnVuY3Rpb24gbG9hZE1RVFQoKXsKICByZXR1cm4gbmV3IFByb21pc2UoKHJlcyxyZWopPT57CiAgICBsZXQgaT0wOwogICAgKGZ1bmN0aW9uIG5leHQoKXsKICAgICAgaWYod2luZG93Lm1xdHQpcmV0dXJuIHJlcygpOwogICAgICBpZihpPj1NUVRUX1VSTFMubGVuZ3RoKXJldHVybiByZWooKTsKICAgICAgY29uc3Qgc2M9ZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc2NyaXB0Jyk7CiAgICAgIHNjLnNyYz1NUVRUX1VSTFNbaSsrXTsKICAgICAgc2Mub25sb2FkPSgpPT53aW5kb3cubXF0dD9yZXMoKTpuZXh0KCk7CiAgICAgIHNjLm9uZXJyb3I9bmV4dDsKICAgICAgZG9jdW1lbnQuaGVhZC5hcHBlbmRDaGlsZChzYyk7CiAgICB9KSgpOwogIH0pOwp9CmZ1bmN0aW9uIGFsbFByZXNlbmNlKCl7CiAgcmV0dXJuW2hvc3RJbmZvJiZ7cm9sZTonaG9zdCcsY2lkOmhvc3RJbmZvLmNpZH0sZ3Vlc3RJbmZvJiZ7cm9sZTonZ3Vlc3QnLGNpZDpndWVzdEluZm8uY2lkfV0uZmlsdGVyKEJvb2xlYW4pOwp9CmZ1bmN0aW9uIHB1Ymxpc2hQcmVzZW5jZSgpewogIHByZXNlbmNlUHVibGlzaGVkPXRydWU7CiAgaWYobXEmJm1xLmNvbm5lY3RlZCltcS5wdWJsaXNoKGAke1RQfS8ke3Jvb21Db2RlfS8ke215Um9sZX1gLEpTT04uc3RyaW5naWZ5KHtjaWQ6bXlJZH0pLHtyZXRhaW46dHJ1ZSxxb3M6MX0pOwp9CmZ1bmN0aW9uIGNsb3NlQ2hhbm5lbChjbGVhcj10cnVlKXsKICBpZighbXEpcmV0dXJuOwogIGNvbnN0IGM9bXEscj1teVJvbGUsY29kZT1yb29tQ29kZTsKICBtcT1udWxsO2hvc3RJbmZvPWd1ZXN0SW5mbz1udWxsO3ByZXNlbmNlUHVibGlzaGVkPWZhbHNlOwogIGMucmVtb3ZlQWxsTGlzdGVuZXJzKCdtZXNzYWdlJyk7CiAgaWYoY2xlYXIpewogICAgdHJ5e2MucHVibGlzaChgJHtUUH0vJHtjb2RlfS8ke3J9YCwnJyx7cmV0YWluOnRydWUscW9zOjF9KTt9Y2F0Y2goZSl7fQogICAgc2V0VGltZW91dCgoKT0+e3RyeXtjLmVuZCh0cnVlKX1jYXRjaChlKXt9fSwzMDApOwogIH1lbHNle3RyeXtjLmVuZChmYWxzZSl9Y2F0Y2goZSl7fX0KfQpmdW5jdGlvbiBtcUNvbm5lY3QodXJsLGNvZGUscm9sZSl7CiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXMscmVqKT0+ewogICAgY29uc3Qgd2lsbD17dG9waWM6YCR7VFB9LyR7Y29kZX0vJHtyb2xlfWAscGF5bG9hZDonJyxyZXRhaW46dHJ1ZSxxb3M6MX07CiAgICBjb25zdCBjPW1xdHQuY29ubmVjdCh1cmwse2NsaWVudElkOidoaycrbXlJZCtNYXRoLnJhbmRvbSgpLnRvU3RyaW5nKDE2KS5zbGljZSgyLDYpLGNsZWFuOnRydWUscmVjb25uZWN0UGVyaW9kOjIwMDAsY29ubmVjdFRpbWVvdXQ6NjAwMCxrZWVwYWxpdmU6MjAsd2lsbH0pOwogICAgY29uc3QgdG89c2V0VGltZW91dCgoKT0+e2MucmVtb3ZlQWxsTGlzdGVuZXJzKCk7Yy5vbignZXJyb3InLCgpPT57fSk7Yy5lbmQodHJ1ZSk7cmVqKG5ldyBFcnJvcigndGltZW91dCcpKTt9LDcwMDApOwogICAgY29uc3Qgb25FcnI9KCk9Pnt9OwogICAgYy5vbignZXJyb3InLG9uRXJyKTsKICAgIGMub25jZSgnY29ubmVjdCcsKCk9PntjbGVhclRpbWVvdXQodG8pO2Mub2ZmKCdlcnJvcicsb25FcnIpO3JlcyhjKTt9KTsKICB9KTsKfQphc3luYyBmdW5jdGlvbiBjb25uZWN0KGNvZGUscm9sZSxvblJlYWR5KXsKICB0cnl7YXdhaXQgbG9hZE1RVFQoKTt9Y2F0Y2goZSl7dG9hc3QoJ9qp2KrYp9io2K7Yp9mG2Ycg2KfYqti12KfZhCDZhNmI2K8g2YbYtNivLiDYp9uM2YbYqtix2YbYqiDbjNinINmB24zZhNiq2LHYtNqp2YYg2LHYpyDahtqpINqp2YYnKTtyZXR1cm4gZmFsc2U7fQogIGNsb3NlQ2hhbm5lbCgpOwogIHJvb21Db2RlPWNvZGU7bXlSb2xlPXJvbGU7cmVhZHlEb25lPWZhbHNlO2hvc3RJbmZvPWd1ZXN0SW5mbz1udWxsO3ByZXNlbmNlUHVibGlzaGVkPWZhbHNlOwogIGxldCBjPW51bGw7CiAgZm9yKGNvbnN0IHUgb2YgQlJPS0VSUyl7dHJ5e2M9YXdhaXQgbXFDb25uZWN0KHUsY29kZSxyb2xlKTticmVhazt9Y2F0Y2goZSl7fX0KICBpZighYyl7dG9hc3QoJ9in2KrYtdin2YQg2KjZhyDYs9ix2YjYsSDYqNix2YLYsdin2LEg2YbYtNivLiDYp9uM2YbYqtix2YbYqiDbjNinINmB24zZhNiq2LHYtNqp2YYg2LHYpyDahtqpINqp2YYnKTtyZXR1cm4gZmFsc2U7fQogIG1xPWM7CiAgYy5vbignZXJyb3InLCgpPT57fSk7CiAgYy5vbignb2ZmbGluZScsKCk9PntpZihyZWFkeURvbmUpdG9hc3QoJ9in2LHYqtio2KfYtyDZgti32Lkg2LTYr9iMINiv2LEg2K3Yp9mEINin2KrYtdin2YQg2K/ZiNio2KfYsdmHLi4uJyx0cnVlKTt9KTsKICBjLm9uKCdjb25uZWN0JywoKT0+e2lmKHJlYWR5RG9uZSl7aGlkZVRvYXN0KCk7aWYocHJlc2VuY2VQdWJsaXNoZWQpcHVibGlzaFByZXNlbmNlKCk7fX0pOwogIGMub24oJ21lc3NhZ2UnLG9uTVEpOwogIGNvbnN0IHRvcGljcz1pc0hvc3Q/W2Ake1RQfS8ke2NvZGV9L3RvSG9zdGAsYCR7VFB9LyR7Y29kZX0vZ3Vlc3RgLGAke1RQfS8ke2NvZGV9L2hvc3RgXTpbYCR7VFB9LyR7Y29kZX0vdG9HdWVzdGAsYCR7VFB9LyR7Y29kZX0vaG9zdGBdOwogIGMuc3Vic2NyaWJlKHRvcGljcyx7cW9zOjB9LGVycj0+ewogICAgaWYoZXJyKXt0b2FzdCgn2K7Yt9inINiv2LEg2KfYqti12KfZhCDYqNmHINin2KrYp9mCJyk7YnVzeShmYWxzZSk7cmV0dXJuO30KICAgIGlmKHJlYWR5RG9uZSlyZXR1cm47cmVhZHlEb25lPXRydWU7b25SZWFkeSgpOwogIH0pOwogIHJldHVybiB0cnVlOwp9CmZ1bmN0aW9uIG9uTVEodG9waWMsYnVmKXsKICBjb25zdCB0PXRvcGljLnNwbGl0KCcvJykucG9wKCksc3RyPWJ1Zi50b1N0cmluZygpOwogIGxldCBtPW51bGw7CiAgaWYoc3RyKXt0cnl7bT1KU09OLnBhcnNlKHN0cik7fWNhdGNoKGUpe3JldHVybjt9fQogIGlmKHQ9PT0naG9zdCcpe2hvc3RJbmZvPW07b25QcmVzZW5jZSgpO30KICBlbHNlIGlmKHQ9PT0nZ3Vlc3QnKXtndWVzdEluZm89bTtvblByZXNlbmNlKCk7fQogIGVsc2UgaWYodD09PSd0b0hvc3QnJiZpc0hvc3QmJm0pb25Nc2cobSk7CiAgZWxzZSBpZih0PT09J3RvR3Vlc3QnJiYhaXNIb3N0JiZtKW9uTXNnKG0pOwp9CmZ1bmN0aW9uIHNlbmQobSl7CiAgaWYoIW1xfHwhbXEuY29ubmVjdGVkKXJldHVybiB0b2FzdCgn2KfYsdiq2KjYp9i3INmC2LfYuSDYp9iz2KonKTsKICBtcS5wdWJsaXNoKGAke1RQfS8ke3Jvb21Db2RlfS8ke2lzSG9zdD8ndG9HdWVzdCc6J3RvSG9zdCd9YCxKU09OLnN0cmluZ2lmeSh7Li4ubSxjaWQ6bXlJZH0pLHtxb3M6MH0pOwp9CmFzeW5jIGZ1bmN0aW9uIGNyZWF0ZVJvb20obj0wKXsKICBidXN5KHRydWUpO2lzSG9zdD10cnVlO25hbWVzWzBdPW15TmFtZSgpO0c9bnVsbDtndWVzdENpZD1udWxsO2d1ZXN0U2Vlbj1mYWxzZTsKICBjb25zdCBjb2RlPVN0cmluZyhNYXRoLmZsb29yKDEwMDAwK01hdGgucmFuZG9tKCkqOTAwMDApKTsKICBjb25zdCBvaz1hd2FpdCBjb25uZWN0KGNvZGUsJ2hvc3QnLCgpPT57CiAgICBzZXRUaW1lb3V0KCgpPT57CiAgICAgIGNvbnN0IG90aGVyPWFsbFByZXNlbmNlKCkuZmluZChwPT5wLnJvbGU9PT0naG9zdCcmJnAuY2lkIT09bXlJZCk7CiAgICAgIGlmKG90aGVyKXtjbG9zZUNoYW5uZWwoZmFsc2UpO2lmKG48NSljcmVhdGVSb29tKG4rMSk7ZWxzZXt0b2FzdCgn2YbYtNiv2Iwg2K/ZiNio2KfYsdmHINin2YXYqtit2KfZhiDaqdmGJyk7YnVzeShmYWxzZSk7fXJldHVybjt9CiAgICAgIHB1Ymxpc2hQcmVzZW5jZSgpOyQoJ2NvZGUnKS50ZXh0Q29udGVudD1jb2RlO2J1c3koZmFsc2UpO3Nob3coJ3dhaXQnKTsKICAgIH0sNzAwKTsKICB9KTsKICBpZighb2spYnVzeShmYWxzZSk7Cn0KYXN5bmMgZnVuY3Rpb24gam9pblJvb20oKXsKICBjb25zdCBjb2RlPW5vcm0oJCgnY29kZUluJykudmFsdWUpOwogIGlmKGNvZGUubGVuZ3RoIT09NSlyZXR1cm4gdG9hc3QoJ9qp2K8g2KfYqtin2YIg27Ug2LHZgtmF24wg2KfYs9iqJyk7CiAgYnVzeSh0cnVlKTtpc0hvc3Q9ZmFsc2U7aGVsbG9TZW50PWZhbHNlO2pvaW5lZD1mYWxzZTtndWVzdE5hbWU9bXlOYW1lKCk7CiAgY29uc3Qgb2s9YXdhaXQgY29ubmVjdChjb2RlLCdndWVzdCcsKCk9PnsKICAgIHB1Ymxpc2hQcmVzZW5jZSgpOwogICAgam9pblRpbWVyPXNldFRpbWVvdXQoKCk9PnsKICAgICAgaWYoIWhlbGxvU2VudCl7dG9hc3QoJ9in2KrYp9mC24wg2KjYpyDYp9uM2YYg2qnYryDZvtuM2K/YpyDZhti02K8nKTtjbG9zZUNoYW5uZWwoKTtidXN5KGZhbHNlKTt9CiAgICB9LDUwMDApOwogICAgb25QcmVzZW5jZSgpOwogIH0pOwogIGlmKCFvaylidXN5KGZhbHNlKTsKfQpmdW5jdGlvbiBvblByZXNlbmNlKCl7CiAgY29uc3QgbGlzdD1hbGxQcmVzZW5jZSgpOwogIGlmKGlzSG9zdCl7CiAgICBpZihndWVzdENpZCl7CiAgICAgIGlmKGxpc3Quc29tZShwPT5wLmNpZD09PWd1ZXN0Q2lkKSlndWVzdFNlZW49dHJ1ZTsKICAgICAgZWxzZSBpZihndWVzdFNlZW4pe2d1ZXN0Q2lkPW51bGw7Z3Vlc3RTZWVuPWZhbHNlO3RvYXN0KCfYrdix24zZgSDZgti32Lkg2LTYry4g2YXZhtiq2LjYsSDYp9iq2LXYp9mEINiv2YjYqNin2LHZhy4uLicsdHJ1ZSk7fQogICAgfQogIH1lbHNlewogICAgY29uc3QgaG9zdD1saXN0LmZpbmQocD0+cC5yb2xlPT09J2hvc3QnKTsKICAgIGlmKGhvc3QmJiFoZWxsb1NlbnQpe2hlbGxvU2VudD10cnVlO2NsZWFyVGltZW91dChqb2luVGltZXIpO3NlbmQoe3Q6J2hlbGxvJyxuYW1lOmd1ZXN0TmFtZX0pO30KICAgIGlmKCFob3N0JiZoZWxsb1NlbnQpe2hlbGxvU2VudD1mYWxzZTtpZihqb2luZWQpdG9hc3QoJ9in2LHYqtio2KfYtyDYqNinINmF24zYstio2KfZhiDZgti32Lkg2LTYrycsdHJ1ZSk7fQogIH0KfQpmdW5jdGlvbiBvbk1zZyhtKXsKICBpZighbSlyZXR1cm47CiAgaWYoaXNIb3N0KXsKICAgIGlmKG0udD09PSdoZWxsbycpewogICAgICBpZihndWVzdENpZCYmZ3Vlc3RDaWQhPT1tLmNpZCYmYWxsUHJlc2VuY2UoKS5zb21lKHA9PnAuY2lkPT09Z3Vlc3RDaWQpKXtzZW5kKHt0OidmdWxsJyx0bzptLmNpZH0pO3JldHVybjt9CiAgICAgIGd1ZXN0Q2lkPW0uY2lkO2d1ZXN0U2Vlbj1mYWxzZTtuYW1lc1sxXT0obS5uYW1lfHwn2K3YsduM2YEnKS5zbGljZSgwLDE0KTtoaWRlVG9hc3QoKTsKICAgICAgc2hvdygnZ2FtZScpOwogICAgICBpZihHKXB1c2goKTtlbHNlIHN0YXJ0R2FtZSgpOwogICAgICByZXR1cm47CiAgICB9CiAgICBpZihtLmNpZD09PWd1ZXN0Q2lkKW9uQWN0aW9uKDEsbSk7CiAgfWVsc2V7CiAgICBpZihtLnRvIT09bXlJZClyZXR1cm47CiAgICBpZihtLnQ9PT0ndicpe2pvaW5lZD10cnVlO2J1c3koZmFsc2UpO2hpZGVUb2FzdCgpO3Nob3coJ2dhbWUnKTtyZW5kZXIobS52KTt9CiAgICBlbHNlIGlmKG0udD09PSdmdWxsJyl0b2FzdCgn2KfYqtin2YIg2b7YsSDYp9iz2KonKTsKICB9Cn0KCi8qID09PT09IHY0IGhlbHBlcnMgPT09PT0gKi8KbGV0IHByZXZUcnVtcD1udWxsLHByZXZTdGF0dXM9JycscHJldlBoYXNlPScnLHByZXZIYW5kPVtdLHByZXZPcHA9MCxzd2VlcERpcj0xOwpjb25zdCBoYW5kQ1c9KCk9Pk1hdGgucm91bmQoTWF0aC5tYXgoNjIsTWF0aC5taW4oOTYsaW5uZXJIZWlnaHQqLjEzLGlubmVyV2lkdGgqLjE2KSkpOwpmdW5jdGlvbiB0cmlja1dpbm5lcih2KXtjb25zdFthLGJdPXYudGFibGU7bGV0IHc9YS5wO2lmKGIuYy5zPT09YS5jLnMpe2lmKGIuYy5yPmEuYy5yKXc9Yi5wO31lbHNlIGlmKGIuYy5zPT09di50cnVtcCl3PWIucDtyZXR1cm4gdzt9CmZ1bmN0aW9uIGJ1bXAoZWwsdCl7aWYoZWwudGV4dENvbnRlbnQ9PT10KXJldHVybjtlbC50ZXh0Q29udGVudD10O2VsLmFuaW1hdGUoW3t0cmFuc2Zvcm06J3NjYWxlKDEuNyknLGNvbG9yOicjZmZmJ30se3RyYW5zZm9ybTonc2NhbGUoMSknfV0se2R1cmF0aW9uOjQ4MCxlYXNpbmc6J2N1YmljLWJlemllciguMiwxLjQsLjQsMSknfSk7fQpmdW5jdGlvbiBnaG9zdChlbCxkaXIpewogIGNvbnN0IGNhcmQ9ZWwucXVlcnlTZWxlY3RvcignLmNhcmQnKTtpZighY2FyZClyZXR1cm47CiAgY29uc3Qgcj1jYXJkLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLGc9Y2FyZC5jbG9uZU5vZGUodHJ1ZSk7CiAgZy5jbGFzc05hbWU9J2NhcmQgZ2hvc3QnOwogIGcuc3R5bGUuY3NzVGV4dD1gcG9zaXRpb246Zml4ZWQ7bGVmdDoke3IubGVmdH1weDt0b3A6JHtyLnRvcH1weDt3aWR0aDoke3Iud2lkdGh9cHg7LS1jdzoke3Iud2lkdGh9cHg7ei1pbmRleDoyMDstLWR5OiR7ZGlyKjI4MH1weGA7CiAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChnKTtzZXRUaW1lb3V0KCgpPT5nLnJlbW92ZSgpLDY1MCk7Cn0KZnVuY3Rpb24gYmFubmVyKHQpewogIGNvbnN0IGI9ZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7Yi5jbGFzc05hbWU9J2Jhbm5lcic7Yi50ZXh0Q29udGVudD10O2RvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQoYik7CiAgYi5hbmltYXRlKFt7b3BhY2l0eTowLHRyYW5zZm9ybTondHJhbnNsYXRlKC01MCUsLTUwJSkgc2NhbGUoLjMpJ30se29wYWNpdHk6MSx0cmFuc2Zvcm06J3RyYW5zbGF0ZSgtNTAlLC01MCUpIHNjYWxlKDEuMTUpJyxvZmZzZXQ6LjI1fSx7b3BhY2l0eToxLHRyYW5zZm9ybTondHJhbnNsYXRlKC01MCUsLTUwJSkgc2NhbGUoMSknLG9mZnNldDouOH0se29wYWNpdHk6MCx0cmFuc2Zvcm06J3RyYW5zbGF0ZSgtNTAlLC03NSUpIHNjYWxlKDEpJ31dLHtkdXJhdGlvbjoxOTAwLGVhc2luZzonZWFzZS1vdXQnfSkub25maW5pc2g9KCk9PmIucmVtb3ZlKCk7Cn0KZnVuY3Rpb24gY29uZmV0dGkobj03MCl7CiAgY29uc3QgY29scz1bJyNlOGMyNmEnLCcjYjMyNjNlJywnI2ZmZicsJyMzZmJmN2YnLCcjNGFhM2ZmJ107CiAgZm9yKGxldCBpPTA7aTxuO2krKyl7CiAgICBjb25zdCBwPWRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2knKSx6PTYrTWF0aC5yYW5kb20oKSo3OwogICAgcC5zdHlsZS5jc3NUZXh0PWBwb3NpdGlvbjpmaXhlZDt6LWluZGV4OjI5O3BvaW50ZXItZXZlbnRzOm5vbmU7bGVmdDoke01hdGgucmFuZG9tKCkqMTAwfXZ3O3RvcDotMTRweDt3aWR0aDoke3p9cHg7aGVpZ2h0OiR7eioxLjZ9cHg7YmFja2dyb3VuZDoke2NvbHNbaSU1XX07Ym9yZGVyLXJhZGl1czoycHhgOwogICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChwKTsKICAgIGNvbnN0IGR4PShNYXRoLnJhbmRvbSgpLS41KSoxODA7CiAgICBwLmFuaW1hdGUoW3t0cmFuc2Zvcm06J3RyYW5zbGF0ZSgwLDApIHJvdGF0ZSgwZGVnKSd9LHt0cmFuc2Zvcm06YHRyYW5zbGF0ZSgke2R4fXB4LCR7aW5uZXJIZWlnaHQrNDB9cHgpIHJvdGF0ZSgke01hdGgucmFuZG9tKCkqOTAwLTQ1MH1kZWcpYH1dLHtkdXJhdGlvbjoxODAwK01hdGgucmFuZG9tKCkqMTYwMCxkZWxheTpNYXRoLnJhbmRvbSgpKjQwMCxlYXNpbmc6J2N1YmljLWJlemllciguMywuNCwuNiwxKScsZmlsbDonYmFja3dhcmRzJ30pLm9uZmluaXNoPSgpPT5wLnJlbW92ZSgpOwogIH0KfQpjb25zdCBmc0VsPSgpPT5kb2N1bWVudC5mdWxsc2NyZWVuRWxlbWVudHx8ZG9jdW1lbnQud2Via2l0RnVsbHNjcmVlbkVsZW1lbnQ7CmZ1bmN0aW9uIGdvRlMoYXV0byl7CiAgY29uc3QgZD1kb2N1bWVudC5kb2N1bWVudEVsZW1lbnQscnE9ZC5yZXF1ZXN0RnVsbHNjcmVlbnx8ZC53ZWJraXRSZXF1ZXN0RnVsbHNjcmVlbjsKICBpZihmc0VsKCkpe2lmKCFhdXRvKShkb2N1bWVudC5leGl0RnVsbHNjcmVlbnx8ZG9jdW1lbnQud2Via2l0RXhpdEZ1bGxzY3JlZW4pLmNhbGwoZG9jdW1lbnQpO3JldHVybjt9CiAgaWYoIXJxKXtpZighYXV0byl0b2FzdCgn2K/YsSDYotuM2YHZiNmGOiBTaGFyZSDihpAgQWRkIHRvIEhvbWUgU2NyZWVuINiq2Kcg2KrZhdin2YXigIzYtdmB2K3ZhyDYtNmI2K8nKTtyZXR1cm47fQogIHRyeXtjb25zdCBwPXJxLmNhbGwoZCk7aWYocCYmcC5jYXRjaClwLmNhdGNoKCgpPT57fSk7fWNhdGNoKGUpe30KfQpbJ2Z1bGxzY3JlZW5jaGFuZ2UnLCd3ZWJraXRmdWxsc2NyZWVuY2hhbmdlJ10uZm9yRWFjaChldj0+ZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihldiwoKT0+eyQoJ2ZzQnRuJykudGV4dENvbnRlbnQ9ZnNFbCgpPyfinJUnOifim7YnO3NldFRpbWVvdXQoKCk9PntpZihWJiYhJCgnZ2FtZScpLmNsYXNzTGlzdC5jb250YWlucygnaGlkZGVuJykpcmVuZGVyKFYpO30sMTUwKTt9KSk7CgovKiA9PT09PT09PT09PT09PT09PSBSZW5kZXJpbmcgPT09PT09PT09PT09PT09PT0gKi8KZnVuY3Rpb24gZmlsbFNsb3QoZWwsZW50cnksbGFiZWwsY2xzKXsKICBjb25zdCBpZD1lbnRyeT9lbnRyeS5jLnMrZW50cnkuYy5yOicnOwogIGlmKGVsLmRhdGFzZXQuaWQ9PT1pZClyZXR1cm47CiAgaWYoIWVudHJ5JiZlbC5kYXRhc2V0LmlkKWdob3N0KGVsLHN3ZWVwRGlyKTsKICBlbC5kYXRhc2V0LmlkPWlkO2VsLmlubmVySFRNTD0nJzsKICBpZihlbnRyeSl7ZWwuY2xhc3NOYW1lPSdzbG90IG9uJztlbC5hcHBlbmRDaGlsZChjYXJkRWwoZW50cnkuYyxjbHMpKTtzbmFwKCk7fQogIGVsc2V7ZWwuY2xhc3NOYW1lPSdzbG90JztlbC50ZXh0Q29udGVudD1sYWJlbDt9Cn0KZnVuY3Rpb24gcmVuZGVyKHYpewogIFY9djtpZih2JiZ2LnBoYXNlIT09J2xvYmJ5JyYmIWFyY2FkZU1hdGNoU3RhcnRlZClhcmNhZGVOb3RpZnkoJ3N0YXJ0Jyk7CiAgY29uc3QgbWU9di55b3Usb3BwPTEtbWU7CiAgJCgnb3BwTmFtZScpLmlubmVySFRNTD0odi5oYWtlbT09PW9wcD8nPHNwYW4gY2xhc3M9ImNyb3duIj7imZs8L3NwYW4+ICc6JycpK2VzYyh2Lm5hbWVzW29wcF0pOwogICQoJ215TmFtZScpLmlubmVySFRNTD0odi5oYWtlbT09PW1lPyc8c3BhbiBjbGFzcz0iY3Jvd24iPuKZmzwvc3Bhbj4gJzonJykrZXNjKHYubmFtZXNbbWVdKTsKICBjb25zdCBvYz0kKCdvcHBDYXJkcycpO29jLmlubmVySFRNTD0nJzsKICBmb3IobGV0IGk9MDtpPHYub3BwO2krKyl7Y29uc3QgYj1iYWNrRWwoKTtpZihpPj1wcmV2T3BwKXtiLmNsYXNzTGlzdC5hZGQoJ2RlYWxvJyk7Yi5zdHlsZS5zZXRQcm9wZXJ0eSgnLS1kJyxpLXByZXZPcHApO31vYy5hcHBlbmRDaGlsZChiKTt9CiAgcHJldk9wcD12Lm9wcDsKICBidW1wKCQoJ3NjJyksdi5zY29yZVttZV0rJyA6ICcrdi5zY29yZVtvcHBdKTsKICBidW1wKCQoJ3RrJyksdi50cmlja3NbbWVdKycgLSAnK3YudHJpY2tzW29wcF0pOwogICQoJ3RydW1wUGlsbCcpLmlubmVySFRNTD12LnRydW1wCiAgICA/YNit2qnZhSA8c3ZnIHZpZXdCb3g9IjAgMCAxMDAgMTAwIiBzdHlsZT0iY29sb3I6JHtpc1JlZCh2LnRydW1wKT8nI2ZmN2I4ZSc6JyNmZmYnfSI+PHVzZSBocmVmPSIjcyR7di50cnVtcH0iIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIi8+PC9zdmc+IDxiPiR7TkFNRVt2LnRydW1wXX08L2I+YAogICAgOifYrdqp2YU6IC0nOwoKICBpZih2LnRydW1wIT09cHJldlRydW1wKXtpZih2LnRydW1wKSQoJ3RydW1wUGlsbCcpLmFuaW1hdGUoW3t0cmFuc2Zvcm06J3NjYWxlKC4zKSByb3RhdGUoLTEyZGVnKScsb3BhY2l0eTowfSx7dHJhbnNmb3JtOidzY2FsZSgxLjI1KScsb3BhY2l0eToxLG9mZnNldDouNn0se3RyYW5zZm9ybTonbm9uZSd9XSx7ZHVyYXRpb246NjAwLGVhc2luZzonZWFzZS1vdXQnfSk7cHJldlRydW1wPXYudHJ1bXA7fQogIGNvbnN0IHJlcz12LnBoYXNlPT09J3Jlc29sdmUnJiZ2LnRhYmxlLmxlbmd0aD09PTI7CiAgaWYocmVzKXN3ZWVwRGlyPXRyaWNrV2lubmVyKHYpPT09bWU/MTotMTsKICBmaWxsU2xvdCgkKCdzbG90T3BwJyksdi50YWJsZS5maW5kKHg9PngucD09PW9wcCksJ9it2LHbjNmBJywnZmx5LW9wcCcpOwogIGZpbGxTbG90KCQoJ3Nsb3RNZScpLHYudGFibGUuZmluZCh4PT54LnA9PT1tZSksJ9iq2YgnLCdmbHktbWUnKTsKICBpZihyZXMpe2NvbnN0IHc9dHJpY2tXaW5uZXIodik9PT1tZTskKHc/J3Nsb3RNZSc6J3Nsb3RPcHAnKS5jbGFzc0xpc3QuYWRkKCd3aW4nKTskKHc/J3Nsb3RPcHAnOidzbG90TWUnKS5jbGFzc0xpc3QuYWRkKCdsb3NlJyk7fQoKICBjb25zdCBzdD0kKCdzdGF0dXMnKTtzdC5jbGFzc05hbWU9Jyc7CiAgY29uc3QgcGljaz0kKCd0cnVtcFBpY2snKSxhZ2Fpbj0kKCdhZ2FpbicpOwogIHBpY2suY2xhc3NMaXN0LmFkZCgnaGlkZGVuJyk7YWdhaW4uY2xhc3NMaXN0LmFkZCgnaGlkZGVuJyk7CiAgY29uc3QgbXlUdXJuPXYucGhhc2U9PT0ncGxheScmJnYudHVybj09PW1lOwogIGlmKHYucGhhc2U9PT0ndHJ1bXAnKXsKICAgIGlmKHYuaGFrZW09PT1tZSl7c3QudGV4dENvbnRlbnQ9J9iq2Ygg2K3Yp9qp2YXbjC4g2K3aqdmFINix2Kcg2KfZhtiq2K7Yp9ioINqp2YYnO3N0LmNsYXNzTmFtZT0nbWUnO3BpY2suY2xhc3NMaXN0LnJlbW92ZSgnaGlkZGVuJyk7fQogICAgZWxzZSBzdC50ZXh0Q29udGVudD0n2YXZhtiq2LjYsSDYp9mG2KrYrtin2Kgg2K3aqdmFINiq2YjYs9i3ICcrdi5uYW1lc1tvcHBdKycuLi4nOwogIH1lbHNlIGlmKHYucGhhc2U9PT0ncGxheScpewogICAgc3QudGV4dENvbnRlbnQ9bXlUdXJuPyfZhtmI2KjYqiDYqtmI2LPYqic6J9mG2YjYqNiqICcrdi5uYW1lc1tvcHBdOwogICAgaWYobXlUdXJuKXN0LmNsYXNzTmFtZT0nbWUnOwogIH1lbHNlIGlmKHYucGhhc2U9PT0ncmVzb2x2ZScpewogICAgc3QudGV4dENvbnRlbnQ9Jyc7CiAgfWVsc2UgaWYodi5waGFzZT09PSdyb3VuZEVuZCcpewogICAgY29uc3QgbT12Lm1zZzsKICAgIHN0LnRleHRDb250ZW50PShtLnc9PT1tZT8n2KfbjNmGINiv2LPYqiDYsdinINio2LHYr9uMJzp2Lm5hbWVzW29wcF0rJyDYp9uM2YYg2K/Ys9iqINix2Kcg2KjYsdivJykrJyAoKycrbS5wdHMrKG0ua290Pycg2qnZiNiqISc6JycpKycpJzsKICB9ZWxzZSBpZih2LnBoYXNlPT09J292ZXInKXsKICAgIHN0LnRleHRDb250ZW50PXYubXNnLnc9PT1tZT8n8J+PhiDYqtmIINio2LHZhtiv2Ycg2KjYp9iy24wg2LTYr9uMISc6di5uYW1lc1tvcHBdKycg2KjYsdmG2K/ZhyDYqNin2LLbjCDYtNivJzsKICAgIHN0LmNsYXNzTmFtZT12Lm1zZy53PT09bWU/J21lJzonJzsKICAgIGFnYWluLmNsYXNzTGlzdC5yZW1vdmUoJ2hpZGRlbicpOwogIH0KCiAgaWYoc3QudGV4dENvbnRlbnQhPT1wcmV2U3RhdHVzKXtwcmV2U3RhdHVzPXN0LnRleHRDb250ZW50O2lmKHByZXZTdGF0dXMpc3QuYW5pbWF0ZShbe29wYWNpdHk6MCx0cmFuc2Zvcm06J3RyYW5zbGF0ZVkoOHB4KSBzY2FsZSguOSknfSx7b3BhY2l0eToxLHRyYW5zZm9ybTonbm9uZSd9XSx7ZHVyYXRpb246MzIwLGVhc2luZzonZWFzZS1vdXQnfSk7fQogICQoJ2ZlbHQnKS5kYXRhc2V0LnR1cm49di5waGFzZT09PSdwbGF5Jz8obXlUdXJuPydtZSc6J29wcCcpOih2LnBoYXNlPT09J3RydW1wJz8odi5oYWtlbT09PW1lPydtZSc6J29wcCcpOicnKTsKICBpZih2LnBoYXNlIT09cHJldlBoYXNlKXsKICAgIHByZXZQaGFzZT12LnBoYXNlOwogICAgaWYodi5waGFzZT09PSdyb3VuZEVuZCcpe2NvbnN0IG09di5tc2c7YmFubmVyKG0ua290Pyfwn5SlINqp2YjYqiEnOihtLnc9PT1tZT8n2K/Ys9iqINix2Kcg2KjYsdiv24wg4pymJzon2K3YsduM2YEg2K/Ys9iqINix2Kcg2KjYsdivJykpO2lmKG0udz09PW1lKWNvbmZldHRpKG0ua290PzExMDoyOCk7fQogICAgZWxzZSBpZih2LnBoYXNlPT09J292ZXInKXtiYW5uZXIodi5tc2cudz09PW1lPyfwn4+GINio2LHZhtiv2Ycg2LTYr9uMISc6J9io2KfYrtiq24wnKTthcmNhZGVOb3RpZnkoJ2ZpbmlzaCcsdi5tc2cudz09PW1lPzE6MCx2Lm1zZy53PT09bWUpO2lmKHYubXNnLnc9PT1tZSljb25mZXR0aSgxNTApO30KICB9CgogIGNvbnN0IGhhbmQ9JCgnaGFuZCcpO2hhbmQuaW5uZXJIVE1MPScnOwogIGNvbnN0IHNvcnRlZD12LmhhbmQuc2xpY2UoKS5zb3J0KChhLGIpPT5TVUlUUy5pbmRleE9mKGEucyktU1VJVFMuaW5kZXhPZihiLnMpfHxiLnItYS5yKTsKICBsZXQgYWxsb3dlZD1udWxsOwogIGlmKG15VHVybiYmdi50YWJsZS5sZW5ndGg9PT0xKXsKICAgIGNvbnN0IGxzdWl0PXYudGFibGVbMF0uYy5zOwogICAgaWYodi5oYW5kLnNvbWUoYz0+Yy5zPT09bHN1aXQpKWFsbG93ZWQ9bHN1aXQ7CiAgfQogIGNvbnN0IGN3PWhhbmRDVygpLFc9aGFuZC5jbGllbnRXaWR0aHx8MzQwLG49c29ydGVkLmxlbmd0aDtoYW5kLnN0eWxlLm1pbkhlaWdodD0oY3cqMS40KzE4KSsncHgnO2NvbnN0IHByZXZIPXByZXZIYW5kO3ByZXZIYW5kPXNvcnRlZC5tYXAoYz0+Yy5zK2Mucik7bGV0IGRpPTA7CiAgY29uc3Qgc3RlcD1uPjE/TWF0aC5taW4oY3cqLjcyLChXLWN3LTYpLyhuLTEpKTowOwogIHNvcnRlZC5mb3JFYWNoKChjLGkpPT57CiAgICBjb25zdCBvaz1teVR1cm4mJighYWxsb3dlZHx8Yy5zPT09YWxsb3dlZCk7CiAgICBjb25zdCBlbD1jYXJkRWwoYyxteVR1cm4/KG9rPydjYW4nOidkaXMnKTonJyk7ZWwuc3R5bGUuc2V0UHJvcGVydHkoJy0tY3cnLGN3KydweCcpO2lmKCFwcmV2SC5pbmNsdWRlcyhjLnMrYy5yKSl7ZWwuY2xhc3NMaXN0LmFkZCgnZGVhbCcpO2VsLnN0eWxlLnNldFByb3BlcnR5KCctLWQnLGRpKyspO30KICAgIGlmKGk+MCllbC5zdHlsZS5tYXJnaW5MZWZ0PShzdGVwLWN3KSsncHgnOwogICAgY29uc3Qgb2ZmPWktKG4tMSkvMjsKICAgIGVsLnN0eWxlLnNldFByb3BlcnR5KCctLXInLChvZmYqMS44KSsnZGVnJyk7CiAgICBlbC5zdHlsZS5zZXRQcm9wZXJ0eSgnLS15JywoTWF0aC5hYnMob2ZmKSpNYXRoLmFicyhvZmYpKi4zNSkrJ3B4Jyk7CiAgICBpZihvayllbC5vbmNsaWNrPSgpPT5hY3Qoe3Q6J3BsYXknLGlkOmMucytjLnJ9KTsKICAgIGhhbmQuYXBwZW5kQ2hpbGQoZWwpOwogIH0pOwp9CgovKiA9PT09PT09PT09PT09PT09PSBVSSB3aXJpbmcgPT09PT09PT09PT09PT09PT0gKi8KJCgnY3JlYXRlQnRuJykub25jbGljaz0oKT0+e2dvRlModHJ1ZSk7Y3JlYXRlUm9vbSgpO307CiQoJ2ZzQnRuJykub25jbGljaz0oKT0+Z29GUyhmYWxzZSk7CiQoJ2pvaW5CdG4nKS5vbmNsaWNrPSgpPT57Z29GUyh0cnVlKTtqb2luUm9vbSgpO307CiQoJ2NvZGVJbicpLmFkZEV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLGU9PntpZihlLmtleT09PSdFbnRlcicpam9pblJvb20oKTt9KTsKJCgnY29weUJ0bicpLm9uY2xpY2s9KCk9PnsKICBjb25zdCBjPSQoJ2NvZGUnKS50ZXh0Q29udGVudDsKICAobmF2aWdhdG9yLmNsaXBib2FyZD9uYXZpZ2F0b3IuY2xpcGJvYXJkLndyaXRlVGV4dChjKTpQcm9taXNlLnJlamVjdCgpKS50aGVuKCgpPT50b2FzdCgn2qnYryDaqdm+24wg2LTYrycpKS5jYXRjaCgoKT0+dG9hc3QoJ9qp2K86ICcrYykpOwp9OwokKCd0cnVtcFBpY2snKS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsZT0+e2NvbnN0IGI9ZS50YXJnZXQuY2xvc2VzdCgnYnV0dG9uJyk7aWYoYilhY3Qoe3Q6J3RydW1wJyxzOmIuZGF0YXNldC5zfSk7fSk7CiQoJ2FnYWluJykub25jbGljaz0oKT0+YWN0KHt0OidyZW1hdGNoJ30pOwp3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigncmVzaXplJywoKT0+e2lmKFYmJiEkKCdnYW1lJykuY2xhc3NMaXN0LmNvbnRhaW5zKCdoaWRkZW4nKSlyZW5kZXIoVik7fSk7CgooZnVuY3Rpb24gaW5pdCgpewogIGlmKGxvY2F0aW9uLmhhc2gubGVuZ3RoPjEpJCgnY29kZUluJykudmFsdWU9bm9ybShsb2NhdGlvbi5oYXNoKTsKICBjb25zdCBmYW49JCgnZmFuJyk7CiAgW3tzOidTJyxyOjE0fSx7czonSCcscjoxM30se3M6J0MnLHI6MTJ9LHtzOidEJyxyOjExfSx7czonSCcscjoxMH1dLmZvckVhY2goKGMsaSk9PnsKICAgIGNvbnN0IGVsPWNhcmRFbChjKTtlbC5zdHlsZS5zZXRQcm9wZXJ0eSgnLS1yJywoaS0yKSoxMSsnZGVnJyk7ZWwuc3R5bGUuc2V0UHJvcGVydHkoJy0tdHknLE1hdGguYWJzKGktMikqNCsncHgnKTtlbC5zdHlsZS5zZXRQcm9wZXJ0eSgnLS1pJyxpKTtmYW4uYXBwZW5kQ2hpbGQoZWwpOwogIH0pOwp9KSgpOwo8L3NjcmlwdD4KPC9ib2R5Pgo8L2h0bWw+Cg=='};
const decodeEmbed=b64=>new TextDecoder().decode(Uint8Array.from(atob(b64),c=>c.charCodeAt(0)));
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
  if(cur.embed){cv.hidden=true;gameFrame.hidden=false;gameFrame.srcdoc=decodeEmbed(EMBED_B64[id]);return;}
  cv.hidden=false;gameFrame.hidden=true;gameFrame.srcdoc='';
  cur.enter();
}
function goHome(){
  resultFX.clear();
  if(cur&&cur.leave)cur.leave();
  Shell.leave();cur=null;paused=false;embedRunStarted=false;
  gameFrame.hidden=true;gameFrame.srcdoc='';cv.hidden=false;$('bp').hidden=false;setTouchControls('');
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
