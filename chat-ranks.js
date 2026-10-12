
(function(){
  const box=document.getElementById('chatMsgs');if(!box)return;
  let map=new Map(),at=0,busy=false,raf=0;
  const fa=n=>Number(n).toLocaleString('fa-IR');
  function paint(){
    raf=0;
    box.querySelectorAll('.chatMsg').forEach(row=>{
      const idx=map.get(String(row.dataset.pid||'')),cur=row.querySelector('.chatRk');
      if(idx===undefined){if(cur)cur.remove();return}
      if(cur&&cur.dataset.k===String(idx))return;
      if(cur)cur.remove();
      let el;
      if(idx<3&&typeof ttlEl==='function')el=ttlEl(idx);
      else{el=document.createElement('span');el.className='ttl tN';el.textContent='🏅 رتبه '+fa(idx+1)}
      el.classList.add('chatRk');el.dataset.k=String(idx);
      const anchor=row.querySelector('.admBadge')||row.querySelector('.chatName span');
      if(anchor)anchor.after(el);
    });
  }
  const sched=()=>{if(!raf)raf=requestAnimationFrame(paint)};
  async function load(force){
    if(busy||typeof Net==='undefined'||!Net.on)return;
    if(!force&&Date.now()-at<45000)return;
    busy=true;
    try{
      const L=await Net.total(),m=new Map();
      L.forEach((x,i)=>{if(x&&x.pid)m.set(String(x.pid),i)});
      map=m;at=Date.now();sched();
    }catch(e){}
    busy=false;
  }
  new MutationObserver(()=>{sched();load(false)}).observe(box,{childList:true});
  setTimeout(()=>load(true),2500);
  setInterval(()=>load(true),45000);
})();
