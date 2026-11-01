const ANILIST_URL='https://graphql.anilist.co';
const HQ_COVER_CACHE=new Map(),DETAIL_CACHE=new Map();
const PT_DESC_KEY='oa_pt_desc_cache_v1';
let PT_DESC_CACHE={};
try{PT_DESC_CACHE=JSON.parse(localStorage.getItem(PT_DESC_KEY)||'{}')||{}}catch{PT_DESC_CACHE={}}

async function aniRequest(query,variables={}){
  const r=await fetch(ANILIST_URL,{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify({query,variables})});
  const j=await r.json();
  if(!r.ok||j.errors)throw new Error(j.errors?.[0]?.message||'AniList indisponível');
  return j.data;
}
function cleanDescription(s=''){
  const d=document.createElement('div');d.innerHTML=String(s).replace(/<br\s*\/?\s*>/gi,'\n');
  return (d.textContent||d.innerText||'').replace(/\n{3,}/g,'\n\n').trim();
}
function decodeHtml(s=''){const t=document.createElement('textarea');t.innerHTML=String(s);return t.value}
function savePtCache(){try{const entries=Object.entries(PT_DESC_CACHE);if(entries.length>350)PT_DESC_CACHE=Object.fromEntries(entries.slice(-300));localStorage.setItem(PT_DESC_KEY,JSON.stringify(PT_DESC_CACHE))}catch{}}
function splitTranslationText(text,max=410){const src=String(text||'').trim();if(!src)return[];const paras=src.split(/\n+/).map(x=>x.trim()).filter(Boolean),out=[];for(const p of paras){const parts=p.match(/[^.!?]+[.!?]+|[^.!?]+$/g)||[p];let cur='';for(let part of parts){part=part.trim();if(!part)continue;if((cur+' '+part).trim().length<=max){cur=(cur+' '+part).trim();continue}if(cur){out.push(cur);cur=''}while(part.length>max){let cut=part.lastIndexOf(' ',max);if(cut<180)cut=max;out.push(part.slice(0,cut).trim());part=part.slice(cut).trim()}cur=part}if(cur)out.push(cur)}return out}
async function translateChunkPt(text){const url='https://api.mymemory.translated.net/get?q='+encodeURIComponent(text)+'&langpair=en|pt-BR&mt=1';const r=await fetch(url,{headers:{'Accept':'application/json'}});if(!r.ok)throw new Error('tradução indisponível');const j=await r.json();const v=decodeHtml(j?.responseData?.translatedText||'').trim();if(!v||/QUERY LENGTH LIMIT EXCEEDED/i.test(v))throw new Error('limite de tradução');return v}
async function translateDescriptionPt(malId,text){const src=cleanDescription(text);if(!src)return'';const key=String(malId||'')+'|'+String(src.length)+'|'+src.slice(0,60);if(PT_DESC_CACHE[key])return PT_DESC_CACHE[key];const chunks=splitTranslationText(src),translated=[];try{for(const c of chunks)translated.push(await translateChunkPt(c));const result=translated.join(' ').replace(/\s+/g,' ').trim();if(result){PT_DESC_CACHE[key]=result;savePtCache();return result}}catch(e){console.warn('Tradução pt-BR',e)}return''}
function statusPt(s=''){return({FINISHED:'Finalizado',RELEASING:'Em lançamento',NOT_YET_RELEASED:'Ainda não lançado',CANCELLED:'Cancelado',HIATUS:'Em pausa'})[s]||String(s).replaceAll('_',' ')}
function formatPt(s=''){return({MOVIE:'Filme',SPECIAL:'Especial',TV_SHORT:'TV curta',MUSIC:'Música'})[s]||s}
function tagPt(s=''){const m={Action:'Ação',Adventure:'Aventura',Comedy:'Comédia',Drama:'Drama',Fantasy:'Fantasia',Romance:'Romance',Mystery:'Mistério',Sports:'Esporte',Supernatural:'Sobrenatural',Psychological:'Psicológico',Thriller:'Suspense',Horror:'Terror',SciFi:'Ficção científica','Sci-Fi':'Ficção científica','Slice of Life':'Slice of Life',Mecha:'Mecha'};return m[s]||pt(String(s).toLowerCase())||s}
async function fetchAniDetail(malId){const id=Number(malId);if(!id)return null;if(DETAIL_CACHE.has(id))return DETAIL_CACHE.get(id);const q=`query($idMal:Int){Media(idMal:$idMal,type:ANIME){id idMal title{romaji english native}coverImage{extraLarge large medium}bannerImage description(asHtml:false)format status episodes duration seasonYear averageScore genres tags{name rank isAdult isGeneralSpoiler isMediaSpoiler}studios(isMain:true){nodes{name}}}}`;try{const d=(await aniRequest(q,{idMal:id})).Media;DETAIL_CACHE.set(id,d);if(d?.coverImage?.extraLarge)HQ_COVER_CACHE.set(id,d.coverImage.extraLarge);return d}catch(e){console.warn('AniList detalhe',e);return null}}
async function enrichCoverChunk(chunk){const valid=chunk.filter(a=>Number(a.id)&&!HQ_COVER_CACHE.has(Number(a.id))).slice(0,18);if(!valid.length)return;const fields=valid.map((a,i)=>`m${i}:Media(idMal:${Number(a.id)},type:ANIME){idMal coverImage{extraLarge large}}`).join('\n');try{const data=await aniRequest(`query{${fields}}`);valid.forEach((a,i)=>{const x=data['m'+i],u=x?.coverImage?.extraLarge||x?.coverImage?.large;if(u)HQ_COVER_CACHE.set(Number(a.id),u)});valid.forEach(a=>{const u=HQ_COVER_CACHE.get(Number(a.id));if(u)document.querySelectorAll(`img[data-mal="${a.id}"]`).forEach(im=>{if(im.src!==u)im.src=u})})}catch(e){console.warn('AniList capas',e)}}
async function enrichVisible(arr){for(let i=0;i<Math.min(arr.length,60);i+=18)await enrichCoverChunk(arr.slice(i,i+18))}

function episodePanel(x){
  const total=Math.max(0,Number(x.episodes)||0),watched=Math.max(0,Number(mine(x.id)?.watched)||0);
  if(!total)return `<div class="panel"><b>Episódios</b><p class="muted" style="line-height:1.6">A quantidade total de episódios ainda não foi informada para este anime. Se ele estiver em lançamento, o número será atualizado quando a fonte online disponibilizar o total.</p></div>`;
  const buttons=Array.from({length:total},(_,i)=>{const n=i+1,seen=n<=watched;return `<button class="btn epBtn ${seen?'red':''}" data-ep="${n}" style="padding:10px 8px;min-width:64px">EP ${n}${seen?' ✓':''}</button>`}).join('');
  return `<div class="panel"><div style="display:flex;align-items:center;justify-content:space-between;gap:10px"><div><b>Episódios</b><div class="muted" style="font-size:12px;margin-top:3px">${total} episódios neste anime</div></div><div class="muted" style="font-size:11px">${watched}/${total} vistos</div></div><div id="episodeGrid" style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-top:14px;max-height:330px;overflow:auto">${buttons}</div><div class="muted" style="font-size:10px;margin-top:12px">Os botões organizam os episódios e o progresso. O vídeo só pode tocar aqui quando houver uma fonte de streaming autorizada para o episódio.</div></div>`;
}
function bindEpisodeButtons(x){
  document.querySelectorAll('.epBtn').forEach(b=>b.onclick=()=>{
    const n=Number(b.dataset.ep)||0,m=mine(x.id);
    if(!m){toast('Adicione o anime à sua lista para salvar progresso');return}
    m.watched=Math.max(Number(m.watched)||0,n);if(m.status==='planos')m.status='vendo';save();
    document.querySelectorAll('.epBtn').forEach(btn=>{const k=Number(btn.dataset.ep);btn.classList.toggle('red',k<=m.watched);btn.textContent='EP '+k+(k<=m.watched?' ✓':'')});
    toast(`EP ${n} marcado como assistido`);
  });
}

window.card=function(a){let m=mine(a.id),x=m?{...a,...m}:a,hq=HQ_COVER_CACHE.get(Number(a.id)),src=hq||x.image||x.thumb||'';return `<article class="card" data-id="${esc(a.id)}"><div class="poster">${src?`<img loading="lazy" decoding="async" data-mal="${esc(a.id)}" src="${esc(src)}" onerror="if(this.dataset.fallback!=='1'){this.dataset.fallback='1';this.src='${esc(x.image||x.thumb||'')}'}">`:''}${m?`<span class="status ${x.status}">${label(x.status)}</span>`:''}${x.score?`<span class="score">★ ${Number(x.score).toFixed(1)}</span>`:''}</div><div class="ct">${esc(x.title)}</div><div class="cm"><span>${x.year||'—'} • ${x.episodes||'?'} eps</span><span>${esc(formatPt(x.type))}</span></div><div class="tagline">${esc((x.tags||[]).slice(0,3).map(tagPt).join(' • '))}</div></article>`};
const baseCatalog=window.catalog;window.catalog=function(){baseCatalog();const arr=filtered().slice(0,S.shown);enrichVisible(arr)};
window.details=async function(a){
  if(!a)return;let m=mine(a.id),x=m?{...a,...m}:a;
  $('#detail').innerHTML=`<div class="row" style="align-items:flex-start"><div class="poster" style="max-width:180px;flex:0 0 42%">${x.image?`<img id="detailCover" src="${esc(HQ_COVER_CACHE.get(Number(x.id))||x.image)}">`:''}</div><div><div class="kicker">ONLINE • ${esc(formatPt(x.type))} ${x.year?'• '+x.year:''}</div><h2 style="margin:8px 0">${esc(x.title)}</h2><div class="muted">${x.episodes||'?'} episódios ${x.score?'• ★ '+x.score:''}</div><div class="tagline" style="white-space:normal;margin-top:9px">${esc((x.tags||[]).map(tagPt).join(' • '))}</div></div></div><div class="panel" id="onlineInfo"><b>Descrição em português</b><p class="muted" style="line-height:1.6">Buscando e traduzindo a descrição...</p></div><div id="episodesBlock">${episodePanel(x)}</div><div id="listControls"></div>`;
  modal(true);bindEpisodeButtons(x);
  const d=await fetchAniDetail(x.id),original=cleanDescription(d?.description||''),cover=d?.coverImage?.extraLarge||d?.coverImage?.large||x.image;
  if(cover){const im=$('#detailCover');if(im)im.src=cover;x.image=cover}
  if(d){x.episodes=d.episodes||x.episodes;x.year=d.seasonYear||x.year;x.type=d.format||x.type;x.score=d.averageScore?d.averageScore/10:x.score;x.duration=d.duration||0;x.tags=[...(d.genres||[]),...(d.tags||[]).filter(t=>!t.isAdult&&!t.isGeneralSpoiler&&!t.isMediaSpoiler&&t.rank>=55).map(t=>t.name)];x.studios=(d.studios?.nodes||[]).map(s=>s.name)}
  let descPt='';if(original)descPt=await translateDescriptionPt(x.id,original);x.descriptionPt=descPt;x.description=original;
  const info=$('#onlineInfo');if(info)info.innerHTML=`<b>Descrição em português</b><p style="line-height:1.65;white-space:pre-line">${esc(descPt||'Não foi possível traduzir esta descrição agora. Tente abrir novamente quando estiver conectado à internet.')}</p>${d?`<div class="muted" style="font-size:12px;line-height:1.7">${x.duration?`⏱ ${x.duration} min por episódio<br>`:''}${x.studios?.length?`🎬 Estúdio: ${esc(x.studios.join(', '))}<br>`:''}${d.status?`📡 Status: ${esc(statusPt(d.status))}`:''}</div>`:''}<div class="muted" style="font-size:10px;margin-top:10px">Tradução automática para pt-BR.</div>`;
  const ep=$('#episodesBlock');if(ep)ep.innerHTML=episodePanel(x);bindEpisodeButtons(x);
  const controls=$('#listControls');m=mine(a.id);
  if(m){controls.innerHTML=`<div class="field"><label>Status</label><select id="st"><option value="planos" ${m.status==='planos'?'selected':''}>Planos</option><option value="vendo" ${m.status==='vendo'?'selected':''}>Vendo</option><option value="fim" ${m.status==='fim'?'selected':''}>Finalizado</option><option value="drop" ${m.status==='drop'?'selected':''}>Drop</option></select></div><div class="field"><label>Episódios assistidos</label><input id="wat" type="number" min="0" max="${x.episodes||9999}" value="${m.watched||0}"></div><div class="row"><button class="btn red" id="saveA">Salvar</button><button class="btn" id="removeA">Remover</button></div>`;$('#saveA').onclick=()=>{Object.assign(m,x,{status:$('#st').value,watched:Math.max(0,Number($('#wat').value)||0)});save();modal(false);render();toast('Anime atualizado')};$('#removeA').onclick=()=>{S.list=S.list.filter(z=>String(z.id)!==String(m.id));save();modal(false);render();toast('Removido')}}else{controls.innerHTML='<button class="btn red full" id="addA">＋ Adicionar aos Planos</button>';$('#addA').onclick=()=>{S.list.unshift({...x,status:'planos',watched:0});save();const ep=$('#episodesBlock');if(ep)ep.innerHTML=episodePanel(x);bindEpisodeButtons(x);controls.innerHTML='<div class="muted" style="text-align:center">Adicionado aos Planos ✓</div>';toast('Adicionado aos Planos')}}
};
if(S.r==='catalog')catalog();
