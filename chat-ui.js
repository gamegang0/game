
(function(){
  const box=document.getElementById('chatMsgs'),btn=document.getElementById('chatDown'),fs=document.getElementById('chatFs');
  const panel=box&&box.closest('.chatPanel');if(!box||!btn||!fs||!panel)return;
  let ph=null,lastCount=0,seen=0;
  const near=()=>box.scrollHeight-box.scrollTop-box.clientHeight<70;
  const count=()=>box.querySelectorAll('.chatMsg').length;
  function upd(){
    const away=!near()&&count()>0;
    if(!away){seen=count()}
    btn.hidden=!away;
    const fresh=count()-seen;
    btn.classList.toggle('nw',away&&fresh>0);
    btn.textContent=away&&fresh>0?'⬇ '+fresh+' پیام جدید':'⬇ آخرین پیام';
  }
  function down(smooth){box.style.scrollBehavior=smooth?'smooth':'auto';box.scrollTop=box.scrollHeight;setTimeout(()=>{box.style.scrollBehavior='auto';seen=count();upd()},smooth?420:30)}
  btn.onclick=()=>down(true);
  box.addEventListener('scroll',upd,{passive:true});
  new MutationObserver(upd).observe(box,{childList:true});
  function setFs(on){
    if(on===panel.classList.contains('chatFull'))return;
    if(on){ph=document.createComment('chat');panel.replaceWith(ph);document.body.appendChild(panel);panel.classList.add('chatFull');document.body.classList.add('chatFsOn');fs.textContent='✕';fs.title='خروج از تمام‌صفحه'}
    else{panel.classList.remove('chatFull');document.body.classList.remove('chatFsOn');if(ph){ph.replaceWith(panel);ph=null}fs.textContent='⛶';fs.title='تمام‌صفحه'}
    down(false);setTimeout(()=>down(false),150);
  }
  fs.onclick=()=>setFs(!panel.classList.contains('chatFull'));
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&panel.classList.contains('chatFull')){e.stopPropagation();setFs(false)}},true);
  upd();
})();
