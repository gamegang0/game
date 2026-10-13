/* ===== پیوی (پیام خصوصی) =====
   نیاز به جدول arcade_dm دارد (فایل pv.sql را یک‌بار در Supabase اجرا کن). */
(function(){
'use strict';
const NA=window.NovaApp;
if(!NA||!NA.Store||!NA.Chat)return;
const {Store,Net,Presence,fetchT,SB_URL,SB_KEY,sfx,agoFa,Chat,AdmSet,admBadge,audio}=NA;

/* ---------- استایل ---------- */
const css=`
#pvPage .pvApp{display:flex;flex-direction:column;height:calc(100vh - 330px);height:calc(100dvh - 330px);min-height:360px;position:relative}
#pvPage.pvT .pageHead{display:none}
#pvPage.pvT .pvApp{height:calc(100vh - 28px);height:calc(100dvh - 28px)}
.pvList,.pvThread{display:flex;flex-direction:column;flex:1;min-height:0}
.pvTop{display:flex;gap:8px;align-items:center;margin-bottom:10px}
.pvSearch{flex:1;min-width:0;background:rgba(10,12,24,.85);border:1px solid #55506d;border-radius:14px;padding:10px 12px;color:#f4eff9;font:inherit;font-size:14px;outline:none}
.pvSearch:focus{border-color:var(--accent,#ffb347);box-shadow:0 0 0 2px rgba(255,181,102,.14)}
.pvIcoBtn{flex:0 0 auto;width:42px;height:42px;border-radius:14px;border:1px solid #55506d;background:rgba(255,255,255,.06);color:#fff;font-size:18px;display:grid;place-items:center;cursor:pointer;font-family:inherit}
.pvIcoBtn.on{border-color:var(--accent,#ffb347);background:rgba(255,179,71,.18)}
.pvIcoBtn.go{background:linear-gradient(135deg,#ffc27a,#e58f4a);color:#2a1604;border-color:#e9a45a;font-weight:900}
.pvChips{display:flex;gap:7px;margin-bottom:10px;overflow-x:auto;scrollbar-width:none}
.pvChip{flex:0 0 auto;padding:6px 13px;border-radius:99px;border:1px solid #4b4564;background:rgba(255,255,255,.05);color:#c5bfd0;font:inherit;font-size:12.5px;cursor:pointer}
.pvChip.on{color:#2a1604;background:linear-gradient(135deg,#ffd29a,#ffb347);border-color:#ffb347;font-weight:800}
.pvChip b{margin-inline-start:5px;font-weight:900}
.pvConvs{flex:1;min-height:0;overflow-y:auto;overscroll-behavior:contain;display:flex;flex-direction:column;gap:7px;padding-bottom:10px;touch-action:pan-y}
.pvConv{display:flex;align-items:center;gap:11px;padding:10px 11px;border-radius:18px;border:1px solid rgba(255,255,255,.08);background:linear-gradient(145deg,rgba(255,255,255,.07),rgba(255,255,255,.025));cursor:pointer;position:relative;animation:pvIn .3s ease both;transition:transform .12s,border-color .2s,background .2s;-webkit-user-select:none;user-select:none}
.pvConv:active{transform:scale(.985)}
.pvConv.unread{border-color:rgba(255,179,71,.55);background:linear-gradient(145deg,rgba(255,179,71,.14),rgba(255,111,145,.06))}
.pvConv.pin:before{content:"";position:absolute;inset-inline-start:0;top:14px;bottom:14px;width:3px;border-radius:3px;background:var(--accent,#ffb347)}
.pvConv.sel{border-color:#7dffb0;background:rgba(125,255,176,.1)}
@keyframes pvIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
.pvAv{position:relative;flex:0 0 48px;width:48px;height:48px;border-radius:16px;display:grid;place-items:center;font-size:20px;font-weight:900;color:#fff;text-shadow:0 1px 4px rgba(0,0,0,.4);box-shadow:inset 0 0 0 1px rgba(255,255,255,.22),0 4px 12px rgba(0,0,0,.3)}
.pvAv.sm{flex-basis:38px;width:38px;height:38px;font-size:16px;border-radius:13px}
.pvOn{position:absolute;bottom:-3px;inset-inline-start:-3px;width:13px;height:13px;border-radius:50%;background:#7dffb0;border:2px solid #17172a;box-shadow:0 0 8px #7dffb0}
.pvChk{position:absolute;inset:0;border-radius:inherit;background:rgba(40,160,100,.92);display:none;place-items:center;font-size:22px}
.pvConv.sel .pvChk{display:grid}
.pvBody{flex:1;min-width:0}
.pvRow1,.pvRow2{display:flex;align-items:center;gap:8px}
.pvRow2{margin-top:4px}
.pvName{flex:1;min-width:0;font-size:15px;font-weight:800;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pvName .admBadge{margin-inline-start:6px}
.pvTime{flex:0 0 auto;font-size:11px;color:#a49cb8}
.pvConv.unread .pvTime{color:#ffb347}
.pvPrev{flex:1;min-width:0;font-size:12.5px;color:#b9b2c9;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pvConv.unread .pvPrev{color:#fff3e0;font-weight:700}
.pvCnt{flex:0 0 auto;min-width:22px;height:22px;padding:0 6px;border-radius:99px;background:linear-gradient(135deg,#ff6f91,#ff4d6d);color:#fff;font-size:12px;font-weight:900;display:grid;place-items:center;box-shadow:0 0 12px rgba(255,77,109,.5)}
.pvCnt.dot{min-width:12px;width:12px;height:12px;padding:0;background:#ffb347;box-shadow:0 0 10px #ffb347}
.pvMore{flex:0 0 auto;width:30px;height:30px;border-radius:10px;border:0;background:transparent;color:#a49cb8;font-size:20px;cursor:pointer;font-family:inherit}
.pvEmpty{margin:auto;text-align:center;color:#b9b2c9;padding:30px 20px;line-height:2}
.pvEmpty .big{font-size:52px;display:block;margin-bottom:6px;filter:drop-shadow(0 0 16px rgba(255,179,71,.4))}
.pvEmpty button{margin-top:14px}
.pvBtn{border:1px solid #e9a45a;border-radius:14px;background:linear-gradient(135deg,#ffc27a,#e58f4a);color:#2a1604;font:inherit;font-weight:900;font-size:14px;padding:10px 18px;cursor:pointer}
.pvBtn.alt{background:rgba(255,255,255,.07);border-color:#55506d;color:#fff}
.pvBtn.bad{background:linear-gradient(135deg,#ff7b8e,#e0364f);border-color:#ff7b8e;color:#fff}
.pvSelBar{display:none;gap:7px;align-items:center;padding:8px;margin-bottom:10px;border-radius:16px;border:1px solid #7dffb0;background:rgba(125,255,176,.08);flex-wrap:wrap}
.pvSelBar.on{display:flex}
.pvSelBar .cnt{flex:1 0 100%;font-size:13px;color:#7dffb0;font-weight:800}
.pvSelBar button{flex:1;min-width:64px;padding:8px 6px;border-radius:12px;border:1px solid #55506d;background:rgba(255,255,255,.07);color:#fff;font:inherit;font-size:12.5px;cursor:pointer}
.pvSelBar button.arm{background:#e0364f;border-color:#ff7b8e}
.pvSetup{margin:auto;text-align:center;padding:22px 18px;border-radius:20px;border:1px dashed #ff7b8e;background:rgba(255,77,109,.07);color:#ffd2d9;line-height:2;font-size:14px}
.pvSetup code{display:inline-block;direction:ltr;background:rgba(0,0,0,.35);padding:1px 8px;border-radius:8px;color:#ffe08a}
/* thread */
.pvTh{display:flex;align-items:center;gap:10px;padding:8px 6px 10px;border-bottom:1px solid rgba(255,255,255,.1)}
.pvBack{flex:0 0 auto;width:38px;height:38px;border-radius:12px;border:1px solid #55506d;background:rgba(255,255,255,.06);color:#fff;font-size:18px;cursor:pointer;font-family:inherit}
.pvThInfo{flex:1;min-width:0}
.pvThName{font-size:16px;font-weight:900;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pvThSt{font-size:11.5px;color:#a49cb8;margin-top:2px}
.pvThSt.on{color:#7dffb0}
.pvMsgs{flex:1;min-height:0;overflow-y:auto;overscroll-behavior:contain;padding:12px 4px;display:flex;flex-direction:column;gap:5px;touch-action:pan-y;scroll-behavior:auto}
.pvDay{align-self:center;margin:8px 0 4px;padding:3px 12px;border-radius:99px;background:rgba(255,255,255,.08);color:#b9b2c9;font-size:11px}
.pvMsg{display:flex;max-width:100%;animation:pvIn .22s ease both}
.pvMsg.me{justify-content:flex-start}
.pvMsg.them{justify-content:flex-end}
.pvBub{max-width:82%;padding:8px 11px 6px;border-radius:16px;font-size:14.5px;line-height:1.75;word-break:break-word;white-space:pre-wrap;cursor:pointer;position:relative;-webkit-user-select:text;user-select:text}
.pvMsg.me .pvBub{border-radius:16px 16px 16px 4px;background:linear-gradient(145deg,#ffc27a,#f0a05a);color:#2a1604;box-shadow:0 4px 14px rgba(229,143,74,.25)}
.pvMsg.them .pvBub{border-radius:16px 16px 4px 16px;background:linear-gradient(145deg,rgba(255,255,255,.13),rgba(255,255,255,.06));color:#fff;border:1px solid rgba(255,255,255,.1)}
.pvMeta{display:flex;gap:6px;align-items:center;justify-content:flex-end;margin-top:2px;font-size:10.5px;opacity:.75;white-space:nowrap}
.pvMsg.me .pvMeta{justify-content:flex-start}
.pvTick.rd{color:#1d6fb8;opacity:1;font-weight:900}
.pvTick.bad{color:#b3001f;font-weight:900;opacity:1}
.pvQuote{margin-bottom:5px;padding:4px 8px;border-radius:9px;font-size:12px;line-height:1.6;border-inline-start:3px solid currentColor;background:rgba(0,0,0,.14);opacity:.85;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pvDown{position:absolute;bottom:78px;inset-inline-end:10px;padding:7px 13px;border-radius:99px;border:1px solid #ffb347;background:rgba(30,24,40,.95);color:#ffb347;font:inherit;font-size:12.5px;cursor:pointer;box-shadow:0 6px 18px rgba(0,0,0,.4);z-index:3}
.pvReplying{display:none;align-items:center;gap:8px;padding:7px 11px;margin-top:6px;border-radius:12px;background:rgba(255,179,71,.12);border-inline-start:3px solid #ffb347;font-size:12.5px;color:#ffe3bd}
.pvReplying.on{display:flex}
.pvReplying span{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pvReplying button{border:0;background:transparent;color:#ffe3bd;font-size:16px;cursor:pointer}
.pvInRow{display:flex;gap:8px;align-items:flex-end;padding-top:8px}
.pvInput{flex:1;min-width:0;max-height:120px;resize:none;background:rgba(10,12,24,.88);border:1px solid #55506d;border-radius:18px;padding:11px 14px;color:#f4eff9;font:inherit;font-size:15px;line-height:1.6;outline:none}
.pvInput:focus{border-color:#ffb566;box-shadow:0 0 0 2px rgba(255,181,102,.14)}
.pvSend{flex:0 0 46px;height:46px;border-radius:50%;border:1px solid #e9a45a;background:linear-gradient(135deg,#ffc27a,#e58f4a);color:#2a1604;font-size:20px;font-weight:900;cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,.3)}
.pvSend:disabled{opacity:.45}
/* sheet / toast */
.pvOver{position:fixed;inset:0;z-index:20000;display:flex;align-items:flex-end;justify-content:center;background:rgba(5,6,14,.62);backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px);animation:pvFade .18s ease both}
@keyframes pvFade{from{opacity:0}to{opacity:1}}
.pvSheet{width:min(100%,460px);max-height:82vh;overflow-y:auto;padding:14px 14px calc(14px + env(safe-area-inset-bottom));border-radius:24px 24px 0 0;border:1px solid #4b4564;border-bottom:0;background:linear-gradient(160deg,#1f2340,#13152a);animation:pvUp .24s cubic-bezier(.2,.9,.3,1.1) both;display:flex;flex-direction:column;gap:8px;color:#fff}
@keyframes pvUp{from{transform:translateY(40px);opacity:0}to{transform:none;opacity:1}}
.pvSheet h3{margin:0 0 4px;font-size:16px;color:#ffd29a;text-align:center}
.pvSheet .pvOpt{display:flex;align-items:center;gap:10px;padding:13px 14px;border-radius:14px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.06);color:#fff;font:inherit;font-size:14.5px;cursor:pointer;text-align:start}
.pvSheet .pvOpt.bad{color:#ff9aa8;border-color:rgba(255,123,142,.4)}
.pvSheet .pvOpt.arm{background:#e0364f;color:#fff;border-color:#ff7b8e}
.pvPick{max-height:46vh;overflow-y:auto;display:flex;flex-direction:column;gap:6px;touch-action:pan-y}
.pvPickRow{display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:14px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.05);cursor:pointer}
.pvPickRow b{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:14px}
.pvPickRow small{color:#a49cb8}
.pvToast{position:fixed;top:calc(10px + env(safe-area-inset-top));inset-inline:12px;margin-inline:auto;width:min(420px,calc(100vw - 24px));z-index:20001;display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:18px;border:1px solid #ffb347;background:linear-gradient(135deg,rgba(40,30,50,.97),rgba(24,22,40,.97));color:#fff;box-shadow:0 10px 30px rgba(0,0,0,.5),0 0 22px rgba(255,179,71,.25);cursor:pointer;animation:pvDrop .35s cubic-bezier(.2,.9,.3,1.2) both}
@keyframes pvDrop{from{transform:translateY(-70px);opacity:0}to{transform:none;opacity:1}}
.pvToast .t1{font-size:13px;font-weight:900;color:#ffd29a}
.pvToast .t2{font-size:12.5px;color:#e6dff0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pvToast .tx{flex:1;min-width:0}
#menu{padding-bottom:104px!important}
#bottomNav{position:fixed;left:0;right:0;bottom:0;z-index:30;display:flex;justify-content:center;padding:10px 10px calc(10px + env(safe-area-inset-bottom));background:linear-gradient(180deg,rgba(16,19,33,0),rgba(16,19,33,.94) 45%);pointer-events:none}
#bottomNav .bnWrap{pointer-events:auto;display:flex;gap:3px;width:min(100%,460px);padding:6px;border-radius:24px;border:1px solid #4b4564;background:rgba(27,31,52,.95);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);box-shadow:0 10px 30px rgba(0,0,0,.5)}
.bnItem{position:relative;flex:1;min-width:0;display:flex;flex-direction:column;align-items:center;gap:2px;padding:7px 2px 6px;border-radius:18px;border:0;background:transparent;color:#b9b2c9;font:inherit;font-size:10.5px;font-weight:700;cursor:pointer;transition:background .2s,color .2s,transform .12s}
.bnItem .bi{font-size:21px;line-height:1.1;filter:grayscale(.5);transition:filter .2s,transform .2s}
.bnItem:active{transform:scale(.92)}
.bnItem[aria-current="page"]{background:linear-gradient(145deg,rgba(255,179,71,.22),rgba(255,111,145,.14));color:#ffd29a}
.bnItem[aria-current="page"] .bi{filter:none;transform:translateY(-1px) scale(1.08)}
.bnBadge{position:absolute;top:1px;inset-inline-end:12%;min-width:18px;height:18px;padding:0 5px;border-radius:99px;background:linear-gradient(135deg,#ff6f91,#ff4d6d);color:#fff;font-size:11px;font-weight:900;display:grid;place-items:center;box-shadow:0 0 12px rgba(255,77,109,.6);animation:pvPulse 1.6s ease-in-out infinite}
body.chatFsOn #bottomNav,body.pvThreadOn #bottomNav,body.playing #bottomNav{display:none}
.pvNavBadge{position:absolute;top:8px;inset-inline-end:46px;min-width:22px;height:22px;padding:0 6px;border-radius:99px;background:linear-gradient(135deg,#ff6f91,#ff4d6d);color:#fff;font-size:12px;font-weight:900;display:grid;place-items:center;box-shadow:0 0 14px rgba(255,77,109,.6);animation:pvPulse 1.6s ease-in-out infinite}
@keyframes pvPulse{50%{transform:scale(1.15)}}
.mainAction.actionPv{--tile:#c9a7ff;position:relative}
.pvProfBtn{margin-top:6px;padding:12px 26px;border-radius:16px;border:1px solid #e9a45a;background:linear-gradient(135deg,#ffc27a,#e58f4a);color:#2a1604;font:900 16px Vazirmatn,Tahoma,sans-serif;cursor:pointer;box-shadow:0 6px 20px rgba(229,143,74,.4)}
.chatAv.pvAvLink{cursor:pointer}
.chatAv.pvAvLink:active{transform:scale(.9)}
`;
const sty=document.createElement('style');sty.id='pvStyle';sty.textContent=css;document.head.appendChild(sty);

/* ---------- ابزار ---------- */
const $=id=>document.getElementById(id);
const fa=n=>Number(n).toLocaleString('fa-IR');
const API=SB_URL+'/rest/v1/arcade_dm';
const HD={apikey:SB_KEY,'Content-Type':'application/json'};
const me=()=>Store.pid();
const myName=()=>String(Store.name()||'بازیکن').slice(0,20);
const h=(tag,cls,txt)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(txt!=null)e.textContent=txt;return e};
const sound=()=>{try{audio();sfx.ui()}catch(e){}};
const uid=()=>{try{if(crypto.randomUUID)return crypto.randomUUID()}catch(e){}return Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,10)};
const parseT=v=>{const t=Date.parse(v);return isNaN(t)?0:t};
const hm=t=>new Date(t).toLocaleTimeString('fa-IR',{hour:'2-digit',minute:'2-digit'});
const dayKey=t=>{const d=new Date(t);return d.getFullYear()*10000+(d.getMonth()+1)*100+d.getDate()};
const dayLabel=t=>dayKey(t)===dayKey(Date.now())?'امروز':dayKey(t)===dayKey(Date.now()-864e5)?'دیروز':new Date(t).toLocaleDateString('fa-IR',{month:'long',day:'numeric'});
const listTime=t=>dayKey(t)===dayKey(Date.now())?hm(t):dayKey(t)===dayKey(Date.now()-864e5)?'دیروز':new Date(t).toLocaleDateString('fa-IR',{month:'short',day:'numeric'});
function hue(s){let x=0;for(let i=0;i<s.length;i++)x=(x*31+s.charCodeAt(i))>>>0;return x%360}
function avatar(pid,name,sm){
  const a=h('div','pvAv'+(sm?' sm':''));
  const k=hue(String(pid));a.style.background='linear-gradient(135deg,hsl('+k+' 62% 52%),hsl('+((k+40)%360)+' 62% 38%))';
  a.textContent=(String(name||'?').trim()[0]||'?').toUpperCase();
  return a;
}
const isAdm=pid=>{try{return typeof AdmSet!=='undefined'&&AdmSet.has(String(pid))}catch(e){return false}};

/* ---------- وضعیت و ذخیره ---------- */
const LSK='pv_state_v1',CK='pv_cache_v1';
let st={marks:{},cleared:{},hidden:[]};
try{const j=JSON.parse(localStorage.getItem(LSK)||'{}');if(j&&typeof j==='object'){st.marks=j.marks||{};st.cleared=j.cleared||{};st.hidden=Array.isArray(j.hidden)?j.hidden:[]}}catch(e){}
const hiddenSet=new Set(st.hidden);
const save=()=>{try{localStorage.setItem(LSK,JSON.stringify({marks:st.marks,cleared:st.cleared,hidden:[...hiddenSet].slice(-500)}))}catch(e){}};
const rows=new Map();
let noTable=false,firstPull=true,pulling=false,netErr=false;
const ui={view:'list',peer:null,q:'',filter:'all',sel:null,reply:null,mine:0};

function norm(r){return{id:String(r.id),from:String(r.from_pid||''),fn:String(r.from_name||'بازیکن').slice(0,20),to:String(r.to_pid||''),tn:String(r.to_name||'بازیکن').slice(0,20),t:String(r.text||'').slice(0,500),at:parseT(r.created_at)||Date.now(),read:r.read_at?parseT(r.read_at):0,reply:r.reply_to||null,dF:!!r.del_from,dT:!!r.del_to}}
function cacheSave(){try{const a=[...rows.values()].filter(m=>!m.st).sort((x,y)=>y.at-x.at).slice(0,150);localStorage.setItem(CK,JSON.stringify({me:me(),a}))}catch(e){}}
try{const c=JSON.parse(localStorage.getItem(CK)||'null');if(c&&c.me===me()&&Array.isArray(c.a))c.a.forEach(m=>{if(m&&m.id)rows.set(m.id,m)})}catch(e){}

const peerOf=m=>m.from===me()?m.to:m.from;
function visible(m){
  if(hiddenSet.has(m.id))return false;
  if(m.from===me()?m.dF:m.dT)return false;
  if(m.at<=(st.cleared[peerOf(m)]||0))return false;
  return true;
}
function convs(){
  const map=new Map();
  for(const m of rows.values()){
    if(m.from!==me()&&m.to!==me())continue;
    if(m.from===m.to)continue;
    if(!visible(m))continue;
    const p=peerOf(m);let c=map.get(p);
    if(!c){c={pid:p,name:'',msgs:[],unread:0,last:null};map.set(p,c)}
    c.msgs.push(m);
  }
  const out=[];
  for(const c of map.values()){
    c.msgs.sort((a,b)=>a.at-b.at);c.last=c.msgs[c.msgs.length-1];
    for(let i=c.msgs.length-1;i>=0;i--){if(c.msgs[i].from===c.pid){c.name=c.msgs[i].fn;break}}
    if(!c.name)c.name=c.last.from===me()?c.last.tn:c.last.fn;
    c.unread=c.msgs.filter(m=>m.to===me()&&!m.read).length;
    const mk=st.marks[c.pid]||{};
    c.pin=!!mk.pin;c.flag=!!mk.unread&&c.unread===0;
    out.push(c);
  }
  out.sort((a,b)=>(Number(b.pin)-Number(a.pin))||(b.last.at-a.last.at));
  return out;
}
function totalUnread(){let n=0;for(const c of convs())n+=c.unread||(c.flag?1:0);return n}
function refreshBadge(){
  const n=totalUnread();
  document.querySelectorAll('[data-pv-badge]').forEach(b=>{b.hidden=n<=0;b.textContent=n>99?'۹۹+':fa(n)});
}

/* ---------- شبکه ---------- */
async function patch(filter,body){
  try{const r=await fetchT(`${API}?${filter}`,{method:'PATCH',headers:Object.assign({Prefer:'return=minimal'},HD),body:JSON.stringify(body),keepalive:true},7000);return r.ok}catch(e){return false}
}
async function pull(){
  if(pulling||!me()||me()==='anon')return false;pulling=true;
  try{
    const r=await fetchT(`${API}?select=*&or=(to_pid.eq.${me()},from_pid.eq.${me()})&order=created_at.desc&limit=400`,{headers:{apikey:SB_KEY}},8000);
    if(!r.ok){
      if(r.status===404||r.status===400||r.status===401||r.status===403)noTable=true;
      netErr=true;render();return false;
    }
    const j=await r.json();if(!Array.isArray(j))return false;
    noTable=false;netErr=false;
    const fresh=[],ids=new Set();let oldest=Infinity;
    for(const x of j){
      const m=norm(x);ids.add(m.id);if(m.at<oldest)oldest=m.at;
      const old=rows.get(m.id);
      if(!old&&m.to===me()&&!m.read&&!firstPull&&visible(m))fresh.push(m);
      rows.set(m.id,m);
    }
    for(const [id,m] of [...rows]){
      if(!ids.has(id)&&!m.st&&m.at>=oldest&&j.length<400)rows.delete(id);
    }
    firstPull=false;cacheSave();
    fresh.forEach(m=>incoming(m));
    refreshBadge();render();return true;
  }catch(e){netErr=true;return false}finally{pulling=false}
}
function transmitBody(m){return JSON.stringify({id:m.id,from_pid:m.from,from_name:m.fn,to_pid:m.to,to_name:m.tn,text:m.t,reply_to:m.reply})}
async function transmit(m){
  m.st='sending';render();
  let ok=false;
  try{
    const r=await fetchT(API,{method:'POST',headers:Object.assign({Prefer:'return=minimal'},HD),body:transmitBody(m),keepalive:true},7000);
    ok=r.ok||r.status===409;
    if(r.status===404)noTable=true;
  }catch(e){}
  if(ok){
    delete m.st;
    try{Chat.notify('dm_message',{i:m.id,f:m.from,to:m.to,at:m.at})}catch(e){}
    cacheSave();
  }else m.st='failed';
  render();
}
let lastSend=0;
function sendMsg(peer,text){
  text=String(text||'').replace(/\s+$/,'').slice(0,500);
  if(!text.trim()||!peer||peer.pid===me())return false;
  if(Date.now()-lastSend<400)return false;lastSend=Date.now();
  const rp=ui.reply?{id:ui.reply.id,n:ui.reply.from===me()?'من':(ui.reply.fn||'').slice(0,14),t:String(ui.reply.t).slice(0,70)}:null;
  const m={id:uid(),from:me(),fn:myName(),to:peer.pid,tn:String(peer.name||'بازیکن').slice(0,20),t:text,at:Date.now(),read:0,reply:rp,dF:false,dT:false,st:'sending'};
  rows.set(m.id,m);
  if(st.cleared[peer.pid]&&st.cleared[peer.pid]>=m.at)st.cleared[peer.pid]=m.at-1;
  const mk=st.marks[peer.pid];if(mk&&mk.unread){mk.unread=false;save()}
  ui.reply=null;paintReply();
  transmit(m);scrollEnd(true);sound();
  return true;
}
function markRead(pid){
  const ids=[],t=Date.now();
  for(const m of rows.values())if(m.from===pid&&m.to===me()&&!m.read){m.read=t;ids.push(m.id)}
  const mk=st.marks[pid];if(mk&&mk.unread){mk.unread=false}
  save();refreshBadge();
  if(ids.length){
    patch(`to_pid=eq.${me()}&from_pid=eq.${pid}&read_at=is.null`,{read_at:new Date(t).toISOString()});
    try{Chat.notify('dm_read',{f:me(),to:pid,ids:ids.slice(-100)})}catch(e){}
    cacheSave();
  }
}
function markUnread(pid){(st.marks[pid]=st.marks[pid]||{}).unread=true;save();refreshBadge()}
function togglePin(pid){const mk=(st.marks[pid]=st.marks[pid]||{});mk.pin=!mk.pin;save()}
function deleteConv(pid){
  let mx=0;for(const m of rows.values())if(peerOf(m)===pid&&(m.from===me()||m.to===me())&&m.at>mx)mx=m.at;
  st.cleared[pid]=Math.max(mx,st.cleared[pid]||0);
  const mk=st.marks[pid];if(mk){delete mk.unread}
  save();
  patch(`to_pid=eq.${me()}&from_pid=eq.${pid}`,{del_to:true});
  patch(`from_pid=eq.${me()}&to_pid=eq.${pid}`,{del_from:true});
  refreshBadge();
}
function delForMe(m){
  hiddenSet.add(m.id);save();
  patch(`id=eq.${m.id}`,m.from===me()?{del_from:true}:{del_to:true});
  refreshBadge();render();
}
async function delForAll(m){
  if(m.from!==me())return;
  rows.delete(m.id);cacheSave();render();refreshBadge();
  try{await fetchT(`${API}?id=eq.${m.id}&from_pid=eq.${me()}`,{method:'DELETE',headers:{apikey:SB_KEY,Prefer:'return=minimal'},keepalive:true},7000)}catch(e){}
  try{Chat.notify('dm_delete',{i:m.id,f:me(),to:m.to})}catch(e){}
}

/* ---------- پیام جدید (لحظه‌ای) ---------- */
const pvOpen=()=>{const p=$('pvPage');return !!p&&!p.hidden};
const threadOpen=pid=>pvOpen()&&ui.view==='thread'&&ui.peer&&ui.peer.pid===pid&&!document.hidden;
function incoming(m){
  const p=m.from;
  if(threadOpen(p)){markRead(p);return}
  sound();toast(m);
}
let toastEl=null,toastT=0;
function toast(m){
  if(toastEl)toastEl.remove();clearTimeout(toastT);
  const t=h('div','pvToast');toastEl=t;
  t.append(avatar(m.from,m.fn,true));
  const tx=h('div','tx');tx.append(h('div','t1','✉️ '+m.fn),h('div','t2',m.t));t.append(tx);
  t.onclick=()=>{t.remove();toastEl=null;openChatWith({pid:m.from,name:m.fn})};
  document.body.appendChild(t);
  toastT=setTimeout(()=>{if(toastEl===t){t.remove();toastEl=null}},5000);
}
async function fetchOne(id){
  try{
    const r=await fetchT(`${API}?select=*&id=eq.${encodeURIComponent(id)}&to_pid=eq.${me()}`,{headers:{apikey:SB_KEY}},6000);
    const j=r.ok?await r.json():null;
    if(!Array.isArray(j)||!j.length){pull();return}
    const m=norm(j[0]);
    if(rows.has(m.id)||!visible(m))return;
    rows.set(m.id,m);cacheSave();incoming(m);refreshBadge();render();
  }catch(e){pull()}
}
addEventListener('arcade-dm',e=>{
  const d=e.detail||{},ev=d.ev,p=d.p;if(!p||!me())return;
  if(ev==='dm_message'){
    if(p.to!==me()||p.f===me()||!p.i||rows.has(String(p.i)))return;
    fetchOne(String(p.i));
  }else if(ev==='dm_delete'){
    const m=rows.get(String(p.i));
    if(m&&p.to===me()&&m.from===p.f){rows.delete(m.id);cacheSave();refreshBadge();render()}
  }else if(ev==='dm_read'){
    if(p.to!==me()||!Array.isArray(p.ids))return;
    let ch=false;p.ids.forEach(id=>{const m=rows.get(String(id));if(m&&m.from===me()&&!m.read){m.read=Date.now();ch=true}});
    if(ch){cacheSave();render()}
  }
});

/* ---------- رابط: ساخت اسکلت ---------- */
let root=null,listEl=null,threadEl=null,convsEl=null,selBar=null,msgsEl=null,inputEl=null,sendBtn=null,downBtn=null,replyBar=null,thHead=null;
function build(){
  root=$('pvRoot');if(!root||root._built)return;root._built=true;
  root.textContent='';
  const app=h('div','pvApp');
  /* لیست */
  listEl=h('div','pvList');
  const top=h('div','pvTop');
  const search=h('input','pvSearch');search.type='search';search.placeholder='🔍 جستجوی گفتگو...';search.autocomplete='off';
  search.oninput=()=>{ui.q=search.value.trim();renderList()};
  const bNew=h('button','pvIcoBtn go','✏️');bNew.title='پیام جدید';bNew.onclick=openPicker;
  const bSel=h('button','pvIcoBtn','☑️');bSel.title='انتخاب';bSel.onclick=()=>{ui.sel=ui.sel?null:new Set();renderList()};bSel.id='pvSelBtn';
  top.append(search,bSel,bNew);
  const chips=h('div','pvChips');chips.id='pvChips';
  selBar=h('div','pvSelBar');
  convsEl=h('div','pvConvs');
  listEl.append(top,chips,selBar,convsEl);
  /* گفتگو */
  threadEl=h('div','pvThread');threadEl.hidden=true;
  thHead=h('div','pvTh');
  msgsEl=h('div','pvMsgs');
  downBtn=h('button','pvDown','⬇ پایین');downBtn.hidden=true;downBtn.onclick=()=>scrollEnd(true,true);
  msgsEl.addEventListener('scroll',()=>{downBtn.hidden=nearEnd()},{passive:true});
  replyBar=h('div','pvReplying');
  const inRow=h('div','pvInRow');
  inputEl=h('textarea','pvInput');inputEl.rows=1;inputEl.maxLength=500;inputEl.placeholder='پیام بنویس...';inputEl.enterKeyHint='send';
  inputEl.addEventListener('input',()=>{inputEl.style.height='auto';inputEl.style.height=Math.min(120,inputEl.scrollHeight)+'px';sendBtn.disabled=!inputEl.value.trim();if(ui.peer)drafts[ui.peer.pid]=inputEl.value});
  inputEl.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();doSend()}});
  sendBtn=h('button','pvSend','➤');sendBtn.disabled=true;sendBtn.onclick=doSend;
  inRow.append(inputEl,sendBtn);
  threadEl.append(thHead,msgsEl,downBtn,replyBar,inRow);
  app.append(listEl,threadEl);root.append(app);
}
const drafts={};
function doSend(){
  if(!ui.peer)return;
  const v=inputEl.value;if(!v.trim())return;
  if(sendMsg(ui.peer,v)){inputEl.value='';drafts[ui.peer.pid]='';inputEl.style.height='auto';sendBtn.disabled=true;inputEl.focus()}
}
const nearEnd=()=>msgsEl.scrollHeight-msgsEl.scrollTop-msgsEl.clientHeight<80;
function scrollEnd(force,smooth){
  const go=()=>{msgsEl.style.scrollBehavior=smooth?'smooth':'auto';msgsEl.scrollTop=msgsEl.scrollHeight};
  go();requestAnimationFrame(go);setTimeout(go,80);
}

/* ---------- نمایش لیست ---------- */
function setupCard(){
  const d=h('div','pvSetup');
  d.append(h('div',null,noTable?'⚙️ بخش پیوی هنوز فعال نشده':'📡 اتصال برقرار نشد'));
  if(noTable){
    const p=h('div');p.append('فایل ',Object.assign(h('code'),{textContent:'pv.sql'}),' رو یک‌بار توی Supabase (بخش SQL Editor) اجرا کن، بعد این صفحه رو دوباره باز کن.');d.append(p);
  }else d.append(h('div',null,'اینترنتت رو چک کن و دوباره امتحان کن.'));
  const b=h('button','pvBtn','🔄 دوباره امتحان');b.onclick=()=>pull();d.append(b);
  return d;
}
function renderChips(all){
  const box=$('pvChips');if(!box)return;box.textContent='';
  const unread=all.filter(c=>c.unread||c.flag).length,pins=all.filter(c=>c.pin).length;
  [['all','همه',all.length],['unread','نخوانده',unread],['pin','سنجاق‌شده',pins]].forEach(([k,l,n])=>{
    const b=h('button','pvChip'+(ui.filter===k?' on':''));b.append(l);if(n){b.append(h('b',null,fa(n)))}
    b.onclick=()=>{ui.filter=k;renderList()};box.append(b);
  });
}
function renderSelBar(all){
  selBar.textContent='';
  const sb=$('pvSelBtn');if(sb)sb.classList.toggle('on',!!ui.sel);
  if(!ui.sel){selBar.classList.remove('on');return}
  selBar.classList.add('on');
  selBar.append(h('div','cnt',ui.sel.size?fa(ui.sel.size)+' گفتگو انتخاب شده':'گفتگوها رو انتخاب کن'));
  const act=(label,fn,arm)=>{
    const b=h('button',null,label);
    b.onclick=()=>{
      if(!ui.sel.size)return;
      if(arm&&!b._a){b._a=1;b.classList.add('arm');b.textContent='مطمئنی؟';setTimeout(()=>{b._a=0;b.classList.remove('arm');b.textContent=label},2500);return}
      [...ui.sel].forEach(fn);ui.sel=null;refreshBadge();renderList();
    };
    selBar.append(b);
  };
  act('✓ خوانده',markRead);act('● نخوانده',markUnread);act('📌 سنجاق',togglePin);act('🗑 حذف',deleteConv,true);
  const x=h('button',null,'✕');x.onclick=()=>{ui.sel=null;renderList()};selBar.append(x);
  const allB=h('button',null,'همه');allB.onclick=()=>{ui.sel=new Set(all.map(c=>c.pid));renderList()};selBar.append(allB);
}
function renderList(){
  if(!convsEl)return;
  const all=convs();
  renderChips(all);renderSelBar(all);
  let list=all;
  if(ui.filter==='unread')list=list.filter(c=>c.unread||c.flag);
  if(ui.filter==='pin')list=list.filter(c=>c.pin);
  if(ui.q){const q=ui.q.toLowerCase();list=list.filter(c=>c.name.toLowerCase().includes(q))}
  convsEl.textContent='';
  if(noTable||(netErr&&!all.length)){convsEl.append(setupCard());return}
  if(!list.length){
    const e=h('div','pvEmpty');
    if(!all.length){
      e.append(h('span','big','💌'),h('div',null,'هنوز پیامی نداری'),h('div',null,'از لیدربورد روی اسم یه بازیکن بزن و «پیام خصوصی» رو انتخاب کن، یا از دکمه ✏️ شروع کن.'));
      const b=h('button','pvBtn','✏️ پیام جدید');b.onclick=openPicker;e.append(b);
    }else e.append(h('span','big','🔎'),h('div',null,ui.q?'گفتگویی با این اسم پیدا نشد':'موردی نیست'));
    convsEl.append(e);return;
  }
  list.forEach((c,i)=>{
    const unread=c.unread>0||c.flag;
    const d=h('div','pvConv'+(unread?' unread':'')+(c.pin?' pin':'')+((ui.sel&&ui.sel.has(c.pid))?' sel':''));
    d.style.animationDelay=Math.min(i,8)*30+'ms';
    const av=avatar(c.pid,c.name);
    if(typeof Presence!=='undefined'&&Presence.isOnline(c.pid))av.append(h('i','pvOn'));
    av.append(h('div','pvChk','✓'));
    const body=h('div','pvBody');
    const r1=h('div','pvRow1');const nm=h('div','pvName',c.name);if(isAdm(c.pid)&&typeof admBadge==='function')nm.append(admBadge());
    r1.append(nm);if(c.pin)r1.append(h('span',null,'📌'));r1.append(h('span','pvTime',listTime(c.last.at)));
    const r2=h('div','pvRow2');
    const mineLast=c.last.from===me();
    const pv=h('div','pvPrev',(mineLast?(c.last.st==='failed'?'⚠️ ':c.last.read?'✓✓ ':'✓ '):'')+c.last.t.replace(/\s+/g,' '));
    r2.append(pv);
    if(c.unread)r2.append(h('span','pvCnt',c.unread>99?'۹۹+':fa(c.unread)));else if(c.flag)r2.append(h('span','pvCnt dot'));
    const more=h('button','pvMore','⋯');more.onclick=e=>{e.stopPropagation();openConvSheet(c)};r2.append(more);
    body.append(r1,r2);d.append(av,body);
    let pressT=0,long=false;
    d.addEventListener('pointerdown',()=>{long=false;clearTimeout(pressT);pressT=setTimeout(()=>{long=true;if(!ui.sel){ui.sel=new Set([c.pid]);try{navigator.vibrate&&navigator.vibrate(20)}catch(e){}renderList()}},520)});
    ['pointerup','pointerleave','pointercancel','pointermove'].forEach(ev=>d.addEventListener(ev,()=>clearTimeout(pressT)));
    d.onclick=()=>{
      if(long){long=false;return}
      if(ui.sel){if(ui.sel.has(c.pid))ui.sel.delete(c.pid);else ui.sel.add(c.pid);renderList();return}
      openThread({pid:c.pid,name:c.name});
    };
    convsEl.append(d);
  });
}

/* ---------- نمایش گفتگو ---------- */
function statusText(pid){
  try{
    if(Presence.isOnline(pid))return['● آنلاین',true];
    const ls=Presence.seen(pid);if(ls&&typeof agoFa==='function')return['آخرین بازدید: '+agoFa(ls),false];
  }catch(e){}
  return['آفلاین',false];
}
function renderHead(){
  thHead.textContent='';
  const p=ui.peer;if(!p)return;
  const back=h('button','pvBack','→');back.onclick=closeThread;
  const info=h('div','pvThInfo');const nm=h('div','pvThName',p.name);if(isAdm(p.pid)&&typeof admBadge==='function')nm.append(admBadge());
  const [s,on]=statusText(p.pid);const stt=h('div','pvThSt'+(on?' on':''),s);
  info.append(nm,stt);
  const more=h('button','pvBack','⋯');more.onclick=()=>openConvSheet(convOf(p.pid)||{pid:p.pid,name:p.name,unread:0,flag:false,pin:!!(st.marks[p.pid]||{}).pin,msgs:[]},true);
  thHead.append(back,avatar(p.pid,p.name,true),info,more);
}
const convOf=pid=>convs().find(c=>c.pid===pid);
function renderThread(){
  if(!ui.peer||!msgsEl)return;
  const pid=ui.peer.pid;
  const wasNear=nearEnd(),prevTop=msgsEl.scrollTop;
  const list=[...rows.values()].filter(m=>(m.from===me()&&m.to===pid||m.from===pid&&m.to===me())&&visible(m)).sort((a,b)=>a.at-b.at);
  msgsEl.textContent='';
  if(!list.length){const e=h('div','pvEmpty');e.append(h('span','big','👋'),h('div',null,'اولین پیام رو به '+ui.peer.name+' بفرست'));msgsEl.append(e)}
  let lastDay=0;
  list.forEach(m=>{
    const dk=dayKey(m.at);
    if(dk!==lastDay){lastDay=dk;msgsEl.append(h('div','pvDay',dayLabel(m.at)))}
    const mine=m.from===me();
    const row=h('div','pvMsg '+(mine?'me':'them'));
    const b=h('div','pvBub');
    if(m.reply&&m.reply.t){const q=h('div','pvQuote','↩ '+(m.reply.n?m.reply.n+': ':'')+m.reply.t);b.append(q)}
    b.append(document.createTextNode(m.t));
    const meta=h('div','pvMeta');meta.append(h('span',null,hm(m.at)));
    if(mine){
      if(m.st==='sending')meta.append(h('span','pvTick','⏳'));
      else if(m.st==='failed'){const f=h('span','pvTick bad','⚠️ ارسال نشد، بزن دوباره');f.onclick=e=>{e.stopPropagation();transmit(m)};meta.append(f)}
      else meta.append(h('span','pvTick'+(m.read?' rd':''),m.read?'✓✓':'✓'));
    }
    b.append(meta);
    b.onclick=()=>{if(window.getSelection&&String(window.getSelection()).length)return;openMsgSheet(m)};
    row.append(b);msgsEl.append(row);
  });
  if(wasNear||ui.mine){scrollEnd(false);ui.mine=0}else msgsEl.scrollTop=prevTop;
  downBtn.hidden=nearEnd();
}
function paintReply(){
  if(!replyBar)return;replyBar.textContent='';
  if(!ui.reply){replyBar.classList.remove('on');return}
  replyBar.classList.add('on');
  const m=ui.reply;
  replyBar.append(h('span',null,'↩ پاسخ به '+(m.from===me()?'خودم':m.fn)+': '+m.t.slice(0,60)));
  const x=h('button',null,'✕');x.onclick=()=>{ui.reply=null;paintReply()};replyBar.append(x);
}
function render(){
  if(!root||!root._built)return;
  if(ui.view==='thread'&&ui.peer){
    renderHead();renderThread();
    if(pvOpen()&&!document.hidden)markReadIfAny(ui.peer.pid);
  }else renderList();
}
function markReadIfAny(pid){
  for(const m of rows.values())if(m.from===pid&&m.to===me()&&!m.read&&visible(m)){markRead(pid);return}
  const mk=st.marks[pid];if(mk&&mk.unread){mk.unread=false;save();refreshBadge()}
}
function setView(v){
  ui.view=v;
  $('pvPage').classList.toggle('pvT',v==='thread');
  document.body.classList.toggle('pvThreadOn',v==='thread');
  listEl.hidden=v==='thread';threadEl.hidden=v!=='thread';
}
function openThread(peer){
  build();ui.peer={pid:peer.pid,name:String(peer.name||'بازیکن').slice(0,20)};
  ui.sel=null;ui.reply=null;paintReply();setView('thread');
  inputEl.value=drafts[peer.pid]||'';inputEl.style.height='auto';sendBtn.disabled=!inputEl.value.trim();
  render();scrollEnd(false);refreshBadge();
  pull();
}
function closeThread(){
  ui.peer=null;ui.reply=null;setView('list');renderList();refreshBadge();
}
function openChatWith(peer){
  if(!peer||!peer.pid||peer.pid===me()||peer.pid==='anon')return;
  const nav=document.querySelector('[data-page-target="pv"]');
  if(!pvOpen()&&nav)nav.click();
  build();openThread(peer);
}

/* ---------- شیت‌ها ---------- */
function sheet(title,build2){
  const ov=h('div','pvOver'),sh=h('div','pvSheet');
  if(title)sh.append(h('h3',null,title));
  const close=()=>ov.remove();
  build2(sh,close);
  ov.onclick=e=>{if(e.target===ov)close()};
  ov.append(sh);document.body.appendChild(ov);return close;
}
function opt(sh,label,fn,cls,needArm){
  const b=h('button','pvOpt'+(cls?' '+cls:''),label);
  b.onclick=()=>{
    if(needArm&&!b._a){b._a=1;b.classList.add('arm');b.textContent='⚠️ دوباره بزن تا تأیید بشه';setTimeout(()=>{b._a=0;b.classList.remove('arm');b.textContent=label},2800);return}
    fn();
  };
  sh.append(b);return b;
}
function openConvSheet(c,inThread){
  sheet(c.name,(sh,close)=>{
    const unread=c.unread>0||c.flag;
    if(unread)opt(sh,'✓ علامت‌گذاری به‌عنوان خوانده‌شده',()=>{markRead(c.pid);close();render()});
    else opt(sh,'● علامت‌گذاری به‌عنوان نخوانده',()=>{markUnread(c.pid);close();if(inThread)closeThread();else render()});
    opt(sh,c.pin?'📌 برداشتن سنجاق':'📌 سنجاق کردن بالای لیست',()=>{togglePin(c.pid);close();render()});
    opt(sh,'🗑 حذف کل گفتگو',()=>{deleteConv(c.pid);close();if(inThread)closeThread();else renderList()},'bad',true);
    opt(sh,'بستن',close);
  });
}
function openMsgSheet(m){
  const mine=m.from===me();
  sheet('گزینه‌های پیام',(sh,close)=>{
    opt(sh,'↩ پاسخ',()=>{ui.reply=m;paintReply();close();inputEl.focus()});
    opt(sh,'📋 کپی متن',()=>{
      try{navigator.clipboard.writeText(m.t)}catch(e){const t=document.createElement('textarea');t.value=m.t;document.body.appendChild(t);t.select();try{document.execCommand('copy')}catch(_){}t.remove()}
      close();
    });
    opt(sh,'🙈 حذف فقط برای من',()=>{delForMe(m);close()},'bad',true);
    if(mine&&!m.st)opt(sh,'🗑 حذف برای همه',()=>{delForAll(m);close()},'bad',true);
    opt(sh,'بستن',close);
  });
}
let playersCache={at:0,list:[]};
async function getPlayers(){
  if(Date.now()-playersCache.at<60000&&playersCache.list.length)return playersCache.list;
  try{const L=await Net.total();if(Array.isArray(L)){playersCache={at:Date.now(),list:L.filter(x=>x&&x.pid&&x.pid!==me()&&x.pid!=='anon')}}}catch(e){}
  return playersCache.list;
}
function openPicker(){
  sheet('✏️ پیام جدید',(sh,close)=>{
    const q=h('input','pvSearch');q.type='search';q.placeholder='🔍 اسم بازیکن...';q.autocomplete='off';
    const box=h('div','pvPick');
    sh.append(q,box);
    let all=[],loaded=false;
    const paint=()=>{
      box.textContent='';const s=q.value.trim().toLowerCase();
      const L=all.filter(x=>!s||String(x.n||'').toLowerCase().includes(s)).slice(0,60);
      if(!L.length){box.append(h('div','pvEmpty',!loaded?'در حال بارگذاری...':all.length?'بازیکنی پیدا نشد':'هنوز بازیکنی توی لیدربورد نیست'));return}
      L.forEach(x=>{
        const r=h('div','pvPickRow');r.append(avatar(x.pid,x.n,true),h('b',null,String(x.n||'بازیکن')));
        if(typeof Presence!=='undefined'&&Presence.isOnline(x.pid))r.append(h('small',null,'● آنلاین'));
        r.onclick=()=>{close();openChatWith({pid:x.pid,name:x.n})};box.append(r);
      });
    };
    q.oninput=paint;paint();
    getPlayers().then(L=>{all=L;loaded=true;paint()}).catch(()=>{loaded=true;paint()});
    opt(sh,'بستن',close);
  });
}

/* ---------- اتصال به بقیه‌ی سایت ---------- */
// دکمه پیام خصوصی داخل پروفایل بازیکن (لیدربورد)
window.NovaHooks=window.NovaHooks||{};
const prevHook=window.NovaHooks.profile;
window.NovaHooks.profile=function(o,r){
  try{if(prevHook)prevHook(o,r)}catch(e){}
  try{
    if(!r||!r.pid||r.pid===me()||r.pid==='anon')return;
    const b=h('button','pvProfBtn','✉️ پیام خصوصی');
    b.onclick=e=>{e.stopPropagation();o.remove();openChatWith({pid:r.pid,name:r.n})};
    o.append(b);
  }catch(e){}
};
// کلیک روی آواتار پیام‌های چت عمومی
function hookChat(){
  const box=$('chatMsgs');if(!box)return;
  const deco=()=>box.querySelectorAll('.chatMsg:not(.me)').forEach(row=>{
    const av=row.querySelector('.chatAv');if(!av||av._pv)return;
    const pid=row.dataset.pid;if(!pid||pid==='anon')return;
    av._pv=1;av.classList.add('pvAvLink');av.title='پیام خصوصی';
    av.onclick=e=>{
      e.stopPropagation();
      const nm=(row.querySelector('.chatName span')||{}).textContent||'بازیکن';
      sheet(nm,(sh,close)=>{opt(sh,'✉️ ارسال پیام خصوصی',()=>{close();openChatWith({pid,name:nm})});opt(sh,'بستن',close)});
    };
  });
  new MutationObserver(deco).observe(box,{childList:true});deco();
}
// ورودی از menu-pages.js
function enter(){
  build();
  if(ui.view==='thread'&&!ui.peer)setView('list');
  else document.body.classList.toggle('pvThreadOn',ui.view==='thread');
  render();refreshBadge();pull();
}
function leave(){document.body.classList.remove('pvThreadOn')}
window.PV={enter,leave,open:openChatWith,pull,unread:totalUnread};

function init(){
  build();hookChat();refreshBadge();
  setTimeout(pull,1800);
  setInterval(()=>{
    if(document.hidden)return;
    if(pvOpen()){pull();if(ui.view==='thread'&&ui.peer)renderHead()}
  },9000);
  setInterval(()=>{if(!document.hidden&&!pvOpen())pull()},30000);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)pull()});
  addEventListener('online',()=>pull());
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
