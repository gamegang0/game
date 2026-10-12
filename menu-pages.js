
(function(){
  const $id=id=>document.getElementById(id);
  const pages={home:$id('homePage'),games:$id('gamesPage'),rank:$id('rankPage'),chat:$id('chatPage')};
  const tools=$id('homeTools'),menu=$id('menu');
  let activeCategory='all';
  function showPage(name){
    if(!pages[name])name='home';
    Object.entries(pages).forEach(([key,el])=>{if(el)el.hidden=key!==name;});
    if(tools)tools.hidden=name!=='home';
    if(menu){menu.dataset.menuView=name;menu.scrollTop=0;}
    document.querySelectorAll('[data-page-target]').forEach(b=>b.setAttribute('aria-current',b.dataset.pageTarget===name?'page':'false'));
    if(name==='rank'&&typeof renderRank==='function')renderRank();
    if(name==='chat'&&typeof Chat!=='undefined'){try{Chat.enter()}catch(e){}}
    try{if(typeof sfx!=='undefined'&&sfx.ui)sfx.ui();}catch(e){}
  }
  function filterGames(category){
    activeCategory=category||'all';
    const cards=$id('cards');
    if(cards)cards.querySelectorAll('.arcadeCard').forEach(card=>{
      const show=activeCategory==='all'||card.dataset.category===activeCategory;
      card.classList.toggle('categoryHidden',!show);
    });
    document.querySelectorAll('[data-game-category]').forEach(b=>{
      const on=b.dataset.gameCategory===activeCategory;
      b.classList.toggle('active',on);b.setAttribute('aria-pressed',on?'true':'false');
    });
  }
  document.querySelectorAll('[data-page-target]').forEach(b=>b.addEventListener('click',()=>showPage(b.dataset.pageTarget)));
  document.querySelectorAll('[data-game-category]').forEach(b=>b.addEventListener('click',()=>filterGames(b.dataset.gameCategory)));
  // renderMenu() creates cards on load and after account/repair actions; preserve the selected filter.
  if($id('cards'))new MutationObserver(()=>filterGames(activeCategory)).observe($id('cards'),{childList:true});
  showPage('home');filterGames('all');
})();
