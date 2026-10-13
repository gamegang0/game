/* کنترل پیوی بازیکن‌ها برای ادمین — بعد از pv.js لود می‌شود */
(function(){
const NA=window.NovaApp;if(!NA)return;
const {Store,fetchT,SB_URL,SB_KEY,AdmSet}=NA;
const API=SB_URL+'/rest/v1/arcade_dm';
const HD={apikey:SB_KEY,'Content-Type':'application/json'};
const isAdmin=()=>{try{return AdmSet&&AdmSet.has(String(Store.pid()))}catch(e){return false}};
const h=(t,c,x)=>{const e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e};
const tm=t=>{try{return new Date(t).toLocaleString('fa-IR',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}catch(e){return ''}};

const st=document.createElement('style');st.textContent=`
.pvaBtn{display:block;width:100%;margin-top:8px;padding:11px;border:1px solid #ffb02e;border-radius:12px;background:rgba(255,176,46,.12);color:#ffb02e;font:inherit;font-weight:700;cursor:pointer}
.pvaOv{position:fixed;inset:0;z-index:99999;background:#0b0d17;color:#eaf0ff;display:flex;flex-direction:column;direction:rtl;font-family:inherit}
.pvaTop{display:flex;align-items:center;gap:8px;padding:12px 14px;border-bottom:1px solid #26304d;background:#11162a}
.pvaTop b{flex:1;font-size:15px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pvaTop button{border:0;border-radius:10px;padding:8px 12px;background:#1f2745;color:#eaf0ff;font:inherit;cursor:pointer}
.pvaTop button.red{background:#5a1b2b;color:#ff9db0}
.pvaBody{flex:1;overflow:auto;padding:10px 12px 24px}
.pvaRow{display:block;width:100%;text-align:right;margin-bottom:8px;padding:11px 12px;border:1px solid #26304d;border-radius:12px;background:#141a30;color:inherit;font:inherit;cursor:pointer}
.pvaRow b{display:block;font-size:14px}.pvaRow span{display:block;margin-top:3px;font-size:12px;opacity:.7;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pvaMsg{max-width:86%;margin:6px 0;padding:8px 11px;border-radius:12px;font-size:14px;line-height:1.7;word-break:break-word;white-space:pre-wrap}
.pvaMsg.a{background:#1d3a6b;margin-right:auto;margin-left:0}.pvaMsg.b{background:#2a2f4a;margin-left:auto;margin-right:0}
.pvaMsg small{display:flex;gap:8px;align-items:center;margin-top:4px;font-size:11px;opacity:.65}
.pvaMsg small button{border:0;background:none;color:#ff9db0;cursor:pointer;font-size:13px;padding:0}
.pvaEmpty{text-align:center;opacity:.6;padding:40px 0}
`;document.head.appendChild(st);

async function load(pid){
  const q=`${API}?select=*&or=(from_pid.eq."${pid}",to_pid.eq."${pid}")&order=created_at.desc&limit=500`;
  const r=await fetchT(q,{headers:{apikey:SB_KEY}},9000);
  if(!r.ok)throw new Error(r.status);
  return r.json();
}
async function del(filter){
  const r=await fetchT(API+'?'+filter,{method:'DELETE',headers:Object.assign({Prefer:'return=minimal'},HD)},9000);
  return r.ok;
}

function openAdmin(pid,name){
  const ov=h('div','pvaOv');
  const top=h('div','pvaTop'),title=h('b','','🛡 پیوی '+name);
  const back=h('button','','بستن'),ref=h('button','','🔄');
  top.append(title,ref,back);
  const body=h('div','pvaBody');ov.append(top,body);document.body.appendChild(ov);
  let rows=[],peer=null;
  back.onclick=()=>{if(peer){peer=null;paint()}else ov.remove()};
  ref.onclick=()=>fetchAll();
  function paint(){
    body.textContent='';
    back.textContent=peer?'بازگشت':'بستن';
    const old=top.querySelector('.red');if(old)old.remove();
    if(!peer){
      title.textContent='🛡 پیوی '+name;
      const g=new Map();
      rows.forEach(m=>{
        const other=m.from_pid===pid?m.to_pid:m.from_pid;
        const on=m.from_pid===pid?m.to_name:m.from_name;
        const o=g.get(other)||{pid:other,name:on||'بازیکن',n:0,last:m};g.set(other,o);o.n++;
      });
      if(!g.size){body.append(h('div','pvaEmpty','این بازیکن هیچ پیامی ندارد'));return}
      [...g.values()].forEach(o=>{
        const b=h('button','pvaRow');
        b.append(h('b','',o.name+'  ('+o.n+' پیام)'),h('span','',(o.last.from_pid===pid?'او: ':'طرف مقابل: ')+o.last.text+' · '+tm(o.last.created_at)));
        b.onclick=()=>{peer=o;paint()};body.append(b);
      });
    }else{
      title.textContent=name+' ⇄ '+peer.name;
      const x=h('button','red','حذف کل گفتگو');
      x.onclick=async()=>{
        if(!confirm('کل این گفتگو برای هر دو نفر پاک شود؟'))return;
        const f=`or=(and(from_pid.eq."${pid}",to_pid.eq."${peer.pid}"),and(from_pid.eq."${peer.pid}",to_pid.eq."${pid}"))`;
        if(await del(f)){peer=null;fetchAll()}else alert('حذف نشد');
      };
      top.insertBefore(x,ref);
      const list=rows.filter(m=>(m.from_pid===pid&&m.to_pid===peer.pid)||(m.to_pid===pid&&m.from_pid===peer.pid)).reverse();
      list.forEach(m=>{
        const d=h('div','pvaMsg '+(m.from_pid===pid?'a':'b'));
        d.append(h('div','',m.text));
        const s=h('small');s.append(h('span','',(m.from_pid===pid?name:peer.name)+' · '+tm(m.created_at)));
        const rb=h('button','','🗑');
        rb.onclick=async()=>{if(!confirm('این پیام پاک شود؟'))return;if(await del('id=eq.'+encodeURIComponent(m.id)))fetchAll();else alert('حذف نشد')};
        s.append(rb);d.append(s);body.append(d);
      });
      body.scrollTop=body.scrollHeight;
    }
  }
  async function fetchAll(){
    try{rows=await load(pid);if(peer)peer=(()=>{const o=peer;return rows.some(m=>m.from_pid===o.pid||m.to_pid===o.pid)?o:null})();paint()}
    catch(e){body.textContent='';body.append(h('div','pvaEmpty','خطا در دریافت پیام‌ها'))}
  }
  body.append(h('div','pvaEmpty','در حال دریافت...'));fetchAll();
}

window.NovaHooks=window.NovaHooks||{};
const prev=window.NovaHooks.profile;
window.NovaHooks.profile=function(o,r){
  try{if(prev)prev(o,r)}catch(e){}
  try{
    if(!isAdmin()||!r||!r.pid||r.pid==='anon')return;
    const b=h('button','pvaBtn','🛡 کنترل پیوی این بازیکن');
    b.onclick=e=>{e.stopPropagation();o.remove();openAdmin(String(r.pid),r.n||'بازیکن')};
    o.append(b);
  }catch(e){}
};
window.PVAdmin={open:openAdmin};
})();
