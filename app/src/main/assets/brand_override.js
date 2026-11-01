(function(){
  function applyBrand(){
    try{document.title='Niez Animes'}catch(e){}
    document.querySelectorAll('.brand').forEach(el=>{
      if(el.dataset.niezBrand==='1')return;
      el.innerHTML='Niez <b>Animes</b>';
      el.dataset.niezBrand='1';
    });
    document.querySelectorAll('.oaRank').forEach(el=>{
      if(el.textContent.includes('Órbita'))el.textContent='🏆 Explorador Niez';
    });
    document.querySelectorAll('.oaQuote').forEach(el=>{
      if(el.textContent.includes('Órbita'))el.textContent='“Cada anime concluído aumenta sua história dentro do Niez Animes.”';
    });
  }
  applyBrand();
  const ob=new MutationObserver(()=>applyBrand());
  ob.observe(document.body,{childList:true,subtree:true});
})();
