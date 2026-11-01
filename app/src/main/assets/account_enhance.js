(function(){
  let account={};
  try{
    if(window.OrbitaAccount&&typeof window.OrbitaAccount.getAccountJson==='function'){
      account=JSON.parse(window.OrbitaAccount.getAccountJson()||'{}')||{};
    }
  }catch(e){account={}}

  if(account.email){
    try{localStorage.setItem('oa_google_account',JSON.stringify(account))}catch(e){}
    try{
      if(typeof S!=='undefined'){
        S.profile=S.profile||{};
        if(account.name)S.profile.name=account.name;
        S.profile.email=account.email||'';
        S.profile.photo=account.photo||'';
        if(typeof save==='function')save();
      }
    }catch(e){}
  }

  const style=document.createElement('style');
  style.textContent=`
    .oaProfileWrap{padding-bottom:20px}.oaHero{position:relative;margin:0 -15px 16px;padding:28px 20px 22px;min-height:250px;overflow:hidden;background:radial-gradient(circle at 75% 15%,#6f3cff55,transparent 34%),linear-gradient(160deg,#1e1a28,#0c0c10 64%);border-bottom:1px solid #2a2633}.oaHero:before{content:'';position:absolute;inset:0;background:linear-gradient(90deg,#0009,transparent 75%);pointer-events:none}.oaIdentity{position:relative;z-index:1;display:flex;gap:14px;align-items:flex-end;margin-top:92px}.oaAvatar{width:92px;height:92px;border-radius:24px;padding:4px;background:linear-gradient(135deg,#fff2c7,#b64cff);box-shadow:0 12px 30px #0008;flex:0 0 auto}.oaAvatar>div,.oaAvatar img{width:100%;height:100%;border-radius:20px;object-fit:cover;background:#17171c}.oaAvatar>div{display:grid;place-items:center;font-size:40px}.oaName{font-size:29px;font-weight:950;line-height:1}.oaEmail{font-size:11px;color:#c7c2ce;margin-top:7px;max-width:210px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.oaRank{display:inline-flex;margin-top:9px;border:1px solid #705cff;background:#171322;border-radius:999px;padding:6px 10px;font-size:10px;font-weight:900;color:#cdbdff}.oaStatGrid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.oaStatCard{border:1px solid #2b2b31;border-radius:20px;padding:16px;min-height:112px;background:#17171b;box-shadow:0 7px 0 #050506}.oaStatCard:nth-child(1){background:#fff1cb;color:#111}.oaStatCard:nth-child(2){background:#b6ff3f;color:#111}.oaStatCard:nth-child(3){background:#b967ff;color:#111}.oaStatCard:nth-child(4){background:#ff573e;color:#111}.oaStatNum{font-size:31px;font-weight:950;letter-spacing:-1px}.oaStatLabel{font-size:11px;font-weight:850;margin-top:8px}.oaSection{margin-top:14px;border:1px solid #2a2930;background:#15151a;border-radius:24px;padding:17px}.oaSection.paper{background:#fff0c9;color:#171514;border-color:#ffe5aa}.oaSectionTitle{font-size:19px;font-weight:950;margin-bottom:12px}.oaClass{background:linear-gradient(145deg,#2b2424,#151316);border-color:#4b3530}.oaClassKicker{font-size:11px;letter-spacing:2px;color:#ffb08d;font-weight:900}.oaClassName{font-size:28px;font-weight:950;margin:5px 0}.oaQuote{border-left:4px solid #ff9b75;padding-left:12px;color:#d5c8c4;font-style:italic;line-height:1.6}.oaProgress{height:8px;border-radius:99px;background:#302b2b;overflow:hidden;margin-top:13px}.oaProgress i{display:block;height:100%;background:linear-gradient(90deg,#ff9b75,#ffd0bd)}.oaDnaGrid{display:grid;grid-template-columns:1fr 1fr;gap:16px 18px}.oaDnaName{display:flex;justify-content:space-between;font-size:13px}.oaDnaBar{height:7px;background:#d7cba9;border-radius:99px;margin-top:7px;overflow:hidden}.oaDnaBar i{display:block;height:100%;background:#171514;border-radius:99px}.oaDnaSub{font-size:10px;opacity:.65;margin-top:5px}.oaNumbers{display:grid;gap:0}.oaNumberRow{display:flex;justify-content:space-between;padding:13px 0;border-bottom:1px solid #d7c69f;font-size:13px}.oaNumberRow:last-child{border-bottom:0}.oaTopList{display:grid;gap:9px}.oaTopItem{position:relative;min-height:92px;border-radius:17px;overflow:hidden;border:1px solid #303038;background:#1c1c22;display:flex;align-items:center;padding:12px}.oaTopItem img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.3}.oaTopItem:after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,#08080ae8,#08080a55)}.oaTopPos,.oaTopText{position:relative;z-index:1}.oaTopPos{width:50px;height:54px;display:grid;place-items:center;border-radius:12px;background:#fff0c9;color:#111;font-size:24px;font-weight:950;margin-right:12px}.oaTopText b{display:block;font-size:15px}.oaTopText span{font-size:11px;color:#c4c4ca}.oaAccountBtns{display:grid;grid-template-columns:1fr;gap:8px;margin-top:14px}.oaLogout{border:1px solid #3a3a41;background:#17171b;color:#fff;border-radius:14px;padding:12px;font-weight:850}
  `;
  document.head.appendChild(style);

  function topTags(){
    const tags={};
    try{S.list.forEach(a=>(a.tags||[]).forEach(t=>tags[String(t).toLowerCase()]=(tags[String(t).toLowerCase()]||0)+1))}catch(e){}
    return tags;
  }
  function clamp(v){return Math.max(8,Math.min(99,Math.round(v||0)))}
  function power(eps,done,total){return Math.round(eps*7.7+done*135+total*18)}
  function dnaValues(tags,total){
    const g=(names)=>names.reduce((s,n)=>s+(tags[n]||0),0);
    const scale=(v,bonus=0)=>clamp(18+bonus+(total?Math.min(65,(v/Math.max(1,total))*210):0));
    return [
      ['Força',scale(g(['action','sports','martial arts']),10),'Ação / Esporte'],
      ['Magia',scale(g(['fantasy','magic','supernatural']),8),'Fantasia / Magia'],
      ['Inteligência',scale(g(['mystery','psychological','suspense']),5),'Mistério / Psicológico'],
      ['Agilidade',scale(g(['adventure','sports']),3),'Aventura / Esporte'],
      ['Vitalidade',scale(g(['drama','horror']),2),'Drama / Terror'],
      ['Carisma',scale(g(['romance','comedy','slice of life']),12),'Romance / Comédia']
    ];
  }
  function fmtMinutes(min){
    const d=Math.floor(min/1440),h=Math.floor((min%1440)/60),m=min%60;
    return `${d}d ${h}h ${m}m`;
  }

  window.profile=function(){
    const c=counts(),eps=S.list.reduce((s,a)=>s+(Number(a.watched)||0),0),minutes=eps*24;
    const tags=topTags(),dna=dnaValues(tags,c.todos),pwr=power(eps,c.fim,c.todos);
    const progress=Math.min(100,Math.round((Math.min(eps,1500)/1500)*70+(c.todos?c.fim/c.todos*30:0)));
    const top=[...S.list].sort((a,b)=>(Number(b.score)||0)-(Number(a.score)||0)||((Number(b.watched)||0)-(Number(a.watched)||0))).slice(0,10);
    const name=account.name||S.profile?.name||'Explorador';
    const email=account.email||S.profile?.email||'';
    const photo=account.photo||S.profile?.photo||'';
    const avatar=photo?`<img src="${esc(photo)}" alt="">`:`<div>${esc(S.profile?.avatar||'🧙')}</div>`;
    const topHtml=top.length?top.map((a,i)=>`<div class="oaTopItem"><img src="${esc(a.image||a.thumb||'')}" alt=""><div class="oaTopPos">${String(i+1).padStart(2,'0')}</div><div class="oaTopText"><b>${esc(a.title)}</b><span>${a.year||'—'} ${a.score?'• ★ '+Number(a.score).toFixed(1):''}</span></div></div>`).join(''):'<div class="muted">Adicione animes à sua lista para montar seu Top 10.</div>';
    view.innerHTML=`<div class="oaProfileWrap"><section class="oaHero"><div class="oaIdentity"><div class="oaAvatar">${avatar}</div><div><div class="kicker">SEU UNIVERSO EM ANIMES</div><div class="oaName">${esc(name)}</div><div class="oaEmail">${esc(email)}</div><div class="oaRank">🏆 Explorador da Órbita</div></div></div></section><div class="oaStatGrid"><div class="oaStatCard"><div class="oaStatNum">${eps.toLocaleString('pt-BR')}</div><div class="oaStatLabel">Episódios assistidos</div></div><div class="oaStatCard"><div class="oaStatNum">${pwr.toLocaleString('pt-BR')}</div><div class="oaStatLabel">Poder de jornada</div></div><div class="oaStatCard"><div class="oaStatNum" style="font-size:23px">${fmtMinutes(minutes)}</div><div class="oaStatLabel">Tempo estimado</div></div><div class="oaStatCard"><div class="oaStatNum">${c.fim}</div><div class="oaStatLabel">Obras concluídas</div></div></div><section class="oaSection oaClass"><div class="oaClassKicker">CLASSE DESPERTADA</div><div class="oaClassName">CONQUISTADOR</div><div class="oaQuote">“Cada anime concluído aumenta sua história dentro da Órbita.”</div><div style="display:flex;justify-content:space-between;margin-top:18px"><span>Progresso do despertar</span><b>${progress}%</b></div><div class="oaProgress"><i style="width:${progress}%"></i></div></section><section class="oaSection paper"><div class="oaSectionTitle">SEU DNA OTAKU</div><div class="oaDnaGrid">${dna.map(x=>`<div><div class="oaDnaName"><span>${x[0]}</span><b>${x[1]}</b></div><div class="oaDnaBar"><i style="width:${x[1]}%"></i></div><div class="oaDnaSub">${x[2]}</div></div>`).join('')}</div></section><section class="oaSection paper"><div class="oaSectionTitle">SUA COLEÇÃO EM NÚMEROS</div><div class="oaNumbers"><div class="oaNumberRow"><span>Total na lista</span><b>${c.todos} obras</b></div><div class="oaNumberRow"><span>Assistindo</span><b>${c.vendo}</b></div><div class="oaNumberRow"><span>Quero assistir</span><b>${c.planos}</b></div><div class="oaNumberRow"><span>Concluídos</span><b>${c.fim}</b></div><div class="oaNumberRow"><span>Abandonados</span><b>${c.drop}</b></div></div></section><section class="oaSection"><div class="oaSectionTitle">MEU TOP 10</div><div class="oaTopList">${topHtml}</div></section><div class="oaAccountBtns"><button class="oaLogout" id="oaLogout">Sair da conta Google</button></div></div>`;
    const out=document.getElementById('oaLogout');
    if(out)out.onclick=()=>{try{window.OrbitaAccount.logout()}catch(e){toast('Não foi possível sair da conta')}};
  };
})();
