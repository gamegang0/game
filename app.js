
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
    fetchT(`${SB_URL}/rest/v1/arcade_profiles?select=bio,photo,last_seen,online&pid=eq.${encodeURIComponent(r.pid)}`,{headers:{apikey:SB_KEY}},6000).then(x=>x.ok?x.json():fetchT(`${SB_URL}/rest/v1/arcade_profiles?select=bio,photo&pid=eq.${encodeURIComponent(r.pid)}`,{headers:{apikey:SB_KEY}},6000).then(y=>y.ok?y.json():[])).then(j=>{const p=j&&j[0];if(p&&p.bio&&!mine){bio.textContent=p.bio;bio.hidden=false}if(p&&p.photo)setPhoto(p.photo);if(p&&p.last_seen!==undefined){const t=Presence.parseTime(p.last_seen);Presence.mark(String(r.pid),Presence.fresh(p.online,t),t||Date.now());paintStat()}}).catch(()=>{}).finally(()=>b.classList.remove('loading'));
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
  o.onclick=close;closeBtn.onclick=e=>{e.stopPropagation();close()};try{if(window.NovaHooks&&NovaHooks.profile)NovaHooks.profile(o,r)}catch(e){}document.body.appendChild(o)}
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
/* ================= storage ================= */
/* Supabase: آدرس پروژه و کلید publishable/anon (نه secret). اگه یکی‌شون خالی باشه رتبه‌بندی فقط روی همین دستگاه می‌مونه */
const SB_URL='https://sabxzrwdqhxfdzxonwmw.supabase.co';
const SB_KEY='sb_publishable_vpVUe8xUxnxSgY1fiv3p9A_eQBWY3Hp';
const Store=(()=>{
  const KEY='arcade_v1';
  const blank=()=>({pong:{best:0,last:0,plays:0,wins:0,losses:0},dino:{best:0,last:0,plays:0},ninja:{best:0,last:0,plays:0},memory:{best:0,last:0,plays:0},flappy:{best:0,last:0,plays:0},snake:{best:0,last:0,plays:0},soccer:{best:0,last:0,plays:0},pancake:{best:0,last:0,plays:0},traffic:{best:0,last:0,plays:0},pacman:{best:0,last:0,plays:0},doodle:{best:0,last:0,plays:0},markhor:{best:0,last:0,plays:0},amirshahi:{best:0,last:0,plays:0},cityrun:{best:0,last:0,plays:0},hokm:{best:0,last:0,plays:0},chaharbarg:{best:0,last:0,plays:0},colorseq:{best:0,last:0,plays:0}});
  let g=blank(),ok=true,dirty=false;
  (window.EXTRA_GAMES||[]).forEach(x=>{if(x&&x.id&&!g[x.id])g[x.id]={best:0,last:0,plays:0}});
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
  const rank={pong:[],dino:[],ninja:[],memory:[],flappy:[],snake:[],soccer:[],pancake:[],traffic:[],pacman:[],doodle:[],markhor:[],amirshahi:[],cityrun:[],colorseq:[],hokm:[],chaharbarg:[]};
  (window.EXTRA_GAMES||[]).forEach(x=>{if(x&&x.id&&!rank[x.id])rank[x.id]=[]});
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
  function fresh(on,ts){return (String(on)==='true'||on===true)&&!!ts&&(Date.now()-ts)<90000}
  return {online,lastSeen,mark,isOnline,seen,load,save,parseTime,fresh};
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
      if(x.pid&&parsed)Presence.mark(String(x.pid),Presence.fresh(x.online,parsed),parsed);
      return [x.pid,x];
    }));
    return a.map(x=>{
      const p=pm[x.pid]||{};
      const ls=Presence.parseTime(p.last_seen)||Presence.seen(x.pid)||0;
      return {pid:x.pid,n:String(x.name||'').slice(0,14),s:+x.score||0,online:Presence.isOnline(x.pid)||Presence.fresh(p.online,Presence.parseTime(p.last_seen)),lastSeen:ls};
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
      if(x.pid&&parsed)Presence.mark(String(x.pid),Presence.fresh(x.online,parsed),parsed);
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
        online:Presence.isOnline(o.pid)||Presence.fresh(p.online,Presence.parseTime(p.last_seen)),
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
        if(ev&&ev.indexOf('dm_')===0){try{window.dispatchEvent(new CustomEvent('arcade-dm',{detail:{ev:ev,p:p}}))}catch(e){}return}
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
window.NovaApp={Store,Net,Presence,fetchT,SB_URL,SB_KEY,sfx,agoFa,Chat,AdmSet,admBadge,audio};
setTimeout(()=>Net.presence(true).catch(()=>{}),1400);
setInterval(()=>{if(!document.hidden)Net.presence(true).catch(()=>{})},30000);

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
const GAME_V=3; /* هر بار بازی رو آپدیت کردی این عدد رو یکی زیاد کن تا کش مرورگر پاک بشه */
function loadEmbedGame(id){
  const u=id+'.html?v='+GAME_V;
  fetch(u).then(r=>{if(!r.ok)throw new Error('HTTP '+r.status);return r.text();})
    .then(t=>{if(cur&&cur.id===id)gameFrame.srcdoc=t;})
    .catch(e=>alert('بازی لود نشد: '+u+'\n'+e.message));
}
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
    if(cur.id==='pacman'||cur.id==='ninja'||cur.id==='soccer')lifeFX.show();
  }else if(d.type==='hud'){
    Shell.hud(n);
  }else if(d.type==='info'){
    Shell.info(String(d.text==null?'':d.text).slice(0,120));
  }else if(d.type==='stat'){
    if(d.field==='wins'||d.field==='losses')Store.add(cur.id,d.field);
  }else if(d.type==='pref'){
    if(d.key==='diff'&&[0,1,2].includes(+d.value))Pref.set('diff',+d.value);
  }else if(d.type==='fx'){
    if(d.fx==='win'||d.fx==='lose')resultFX.show(d.fx);
  }else if(d.type==='home'){
    goHome();
  }else if(d.type==='finish'){
    if(!embedRunStarted){embedRunStarted=true;Shell.begin();}
    Shell.finish(n,(d.fx==='win'||d.fx==='lose'||d.fx==='none')?d.fx:((cur.id==='markhor'||cur.id==='amirshahi'||cur.id==='cityrun'||cur.noFX)?'none':(d.won===true?'win':'lose')));embedRunStarted=false;
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
  {id:'pacman',icon:'🟡',name:'پک‌من',desc:'نقطه‌ها رو بخور و از روح‌ها فرار کن',color:'#ffe14a',embed:true},
  {id:'doodle',icon:'🪂',name:'پرش دودل',desc:'بپر بالا و تا جایی که می‌تونی رکورد بزن',color:'#9bda76',embed:true},
  {id:'amirshahi',icon:'👑',name:'امیر شاهی',desc:'ساکر استار با فروشگاه، دو نفره، آنلاین با کد اتاق و شرط سکه‌ای',color:'#ffd23f',embed:true},
  {id:'markhor',icon:'🩸',name:'مارخور',desc:'مار بخور، بزرگ شو و با اسکین‌های اسطوره‌ای خون به پا کن',color:'#ff4d6d',embed:true},
  {id:'cityrun',icon:'🏙️',name:'سیتی ران',desc:'دونده‌ی بی‌پایان در بیش از ۱۰۰ شهر؛ با سکه اسکین بخر',color:'#ff9f43',embed:true},
  {id:'hokm',icon:'🃏',name:'پاسور',tabName:'حکم',tabIcon:'♠️',desc:'حکم و چهار برگ؛ دو نفره آنلاین با کد اتاق، بدون تأخیر',color:'#e8c26a',embed:true,pick:true},
  {id:'chaharbarg',icon:'🃏',name:'چهار برگ',desc:'چهار برگ (پاسور) دو نفره با کد اتاق؛ رکورد بردها در لیدربورد',color:'#e8c26a',embed:true,hide:true},
];
/* بازی‌های جدید از games.js میان */
(window.EXTRA_GAMES||[]).forEach(g=>{if(g&&g.id&&!META.some(m=>m.id===g.id))META.push(Object.assign({embed:true},g))});
let tab='total',rk=0;
const IDS=META.filter(m=>!m.norec).map(m=>m.id);
const TABS=[{id:'total',icon:'👑',name:'مجموع'},...META.filter(m=>!m.norec).map(m=>Object.assign({},m,{name:m.tabName||m.name,icon:m.tabIcon||m.icon}))];
function weekLeftText(){const T=12600000,n=Date.now()+T,d=Math.floor(n/864e5),nx=((Math.floor((d-1)/7)+1)*7+1)*864e5-T,m=Math.max(0,nx-Date.now()),dd=Math.floor(m/864e5),hh=Math.floor(m%864e5/36e5);return '⏳ ریست هفتگی رتبه‌ها (جمعه): '+(dd?FA(dd)+' روز و ':'')+FA(hh)+' ساعت دیگر'}
const TOTAL_NOTE='مجموع بهترین امتیاز هر نفر توی همه‌ی بازی‌ها';
const GAME_CATEGORY={
  breakoutpro:'classic',pong:'sports',dino:'runner',ninja:'action',memory:'puzzle',colorseq:'puzzle',
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
    const badge=(m.id==='dino'?'🦖 DINO RUN':m.id==='snake'?'🐍 SNAKE LAB':m.id==='breakoutpro'?'🧱 BRICK STORM':m.id==='pong'?'🏓 DUEL ARENA':m.id==='ninja'?'🍉 NINJA MODE':m.id==='memory'?'🃏 MEMORY LAB':m.id==='colorseq'?'🎨 COLOR MEMORY':m.id==='soccer'?'⚽ SOCCER STAR':m.id==='pancake'?'🥞 PANCAKE TOWER':m.id==='traffic'?'🚦 NEON TRAFFIC':m.id==='markhor'?'🩸 MARKHOR':m.id==='amirshahi'?'👑 AMIR SHAHI':m.id==='cityrun'?'🏙️ CITY RUN':m.id==='hokm'?'🃏 PASUR':'🐦 SKY RUN');
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
  document.body.classList.remove('memoryFS');
  document.body.classList.toggle('mkfs',id==='markhor'||id==='amirshahi'||id==='cityrun'||!!(Games[id]&&Games[id].fs));
  if(id==='markhor'||id==='amirshahi'||(Games[id]&&Games[id].portrait))lockPortrait();
  $('menu').hidden=true;$('play').hidden=false;
  $('bs').textContent=FA(Store.best(id));$('bw').hidden=!!cur.norec;$('info').textContent='';$('bp').textContent='⏸';$('bp').hidden=!!(cur.embed||cur.nopause);
  setTouchControls(id);
  if(cur.embed){cv.hidden=true;gameFrame.hidden=false;loadEmbedGame(id);return;}
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
/* ================= PACMAN embed ================= */
Games.pacman={id:'pacman',embed:true,norec:false,enter(){},update(){},draw(){},down(){},up(){},key(){return false},playing(){return embedRunStarted},idle(){return !embedRunStarted}};
Games.doodle={id:'doodle',embed:true,norec:false,enter(){},update(){},draw(){},down(){},up(){},key(){return false},playing(){return embedRunStarted},idle(){return !embedRunStarted}};
Games.amirshahi={id:'amirshahi',embed:true,norec:false,enter(){},update(){},draw(){},down(){},up(){},key(){return false},playing(){return embedRunStarted},idle(){return !embedRunStarted}};
Games.markhor={id:'markhor',embed:true,norec:false,enter(){},update(){},draw(){},down(){},up(){},key(){return false},playing(){return embedRunStarted},idle(){return !embedRunStarted}};
Games.hokm={id:'hokm',embed:true,norec:false,enter(){},update(){},draw(){},down(){},up(){},key(){return false},playing(){return embedRunStarted},idle(){return !embedRunStarted}};
Games.chaharbarg={id:'chaharbarg',embed:true,norec:false,enter(){},update(){},draw(){},down(){},up(){},key(){return false},playing(){return embedRunStarted},idle(){return !embedRunStarted}};
Games.cityrun={id:'cityrun',embed:true,norec:false,enter(){},update(){},draw(){},down(){},up(){},key(){return false},playing(){return embedRunStarted},idle(){return !embedRunStarted}};
/* ساخت خودکار بازی‌های جدید از games.js */
META.filter(m=>m.embed&&!Games[m.id]).forEach(m=>{Games[m.id]={id:m.id,embed:true,norec:false,fs:!!m.fs,noFX:!!m.noFX,portrait:!!m.portrait,enter(){},update(){},draw(){},down(){},up(){},key(){return false},playing(){return embedRunStarted},idle(){return !embedRunStarted}};});
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
  if(e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA')return;
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
