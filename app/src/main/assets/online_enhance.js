const ANILIST_URL='https://graphql.anilist.co';
const HQ_COVER_CACHE=new Map(),DETAIL_CACHE=new Map();
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
async function fetchAniDetail(malId){
  const id=Number(malId);if(!id)return null;if(DETAIL_CACHE.has(id))return DETAIL_CACHE.get(id);
  const q=`query($idMal:Int){Media(idMal:$idMal,type:ANIME){id idMal title{romaji english native}coverImage{extraLarge large medium}bannerImage description(asHtml:false)format status episodes duration seasonYear averageScore genres tags{ name rank isAdult isGeneralSpoiler isMediaSpoiler }studios(isMain:true){nodes{name}}}}`;
  try{const d=(await aniRequest(q,{idMal:id})).Media;DETAIL_CACHE.set(id,d);if(d?.coverImage?.extraLarge)HQ_COVER_CACHE.set(id,d.coverImage.extraLarge);return d}catch(e){console.warn('AniList detalhe',e);return null}
}
async function enrichCoverChunk(chunk){
  const valid=chunk.filter(a=>Number(a.id)&&!HQ_COVER_CACHE.has(Number(a.id))).slice(0,18);if(!valid.length)return;
  const fields=valid.map((a,i)=>`m${i}:Media(idMal:${Number(a.id)},type:ANIME){idMal coverImage{extraLarge large}}`).join('\n');
  try{const data=await aniRequest(`query{${fields}}`);valid.forEach((a,i)=>{const x=data['m'+i],u=x?.coverImage?.extraLarge||x?.coverImage?.large;if(u)HQ_COVER_CACHE.set(Number(a.id),u)});valid.forEach(a=>{const u=HQ_COVER_CACHE.get(Number(a.id));if(u)document.querySelectorAll(`img[data-mal="${a.id}"]`).forEach(im=>{if(im.src!==u)im.src=u})})}catch(e){console.warn('AniList capas',e)}
}
async function enrichVisible(arr){for(let i=0;i<Math.min(arr.length,60);i+=18)await enrichCoverChunk(arr.slice(i,i+18))}
window.card=function(a){let m=mine(a.id),x=m?{...a,...m}:a,hq=HQ_COVER_CACHE.get(Number(a.id)),src=hq||x.image||x.thumb||'';return `<article class="card" data-id="${esc(a.id)}"><div class="poster">${src?`<img loading="lazy" decoding="async" data-mal="${esc(a.id)}" src="${esc(src)}" onerror="if(this.dataset.fallback!=='1'){this.dataset.fallback='1';this.src='${esc(x.image||x.thumb||'')}'}`:''}${m?`<span class="status ${x.status}">${label(x.status)}</span>`:''}${x.score?`<span class="score">★ ${Number(x.score).toFixed(1)}</span>`:''}</div><div class="ct">${esc(x.title)}</div><div class="cm"><span>${x.year||'—'} • ${x.episodes||'?'} eps</span><span>${esc(x.type)}</span></div><div class="tagline">${esc((x.tags||[]).slice(0,3).map(pt).join(' • '))}</div></article>`};
const baseCatalog=window.catalog;
window.catalog=function(){baseCatalog();const arr=filtered().slice(0,S.shown);enrichVisible(arr)};
window.details=async function(a){
  if(!a)return;let m=mine(a.id),x=m?{...a,...m}:a;
  $('#detail').innerHTML=`<div class="row" style="align-items:flex-start"><div class="poster" style="max-width:180px;flex:0 0 42%">${x.image?`<img id="detailCover" src="${esc(HQ_COVER_CACHE.get(Number(x.id))||x.image)}">`:''}</div><div><div class="kicker">ONLINE • ${esc(x.type)} ${x.year?'• '+x.year:''}</div><h2 style="margin:8px 0">${esc(x.title)}</h2><div class="muted">${x.episodes||'?'} episódios ${x.score?'• ★ '+x.score:''}</div><div class="tagline" style="white-space:normal;margin-top:9px">${esc((x.tags||[]).map(pt).join(' • '))}</div></div></div><div class="panel" id="onlineInfo"><b>Descrição</b><p class="muted" style="line-height:1.6">Carregando descrição e capa em alta resolução...</p></div><div id="listControls"></div>`;
  modal(true);
  const d=await fetchAniDetail(x.id);const desc=cleanDescription(d?.description||'');const cover=d?.coverImage?.extraLarge||d?.coverImage?.large||x.image;
  if(cover){const im=$('#detailCover');if(im)im.src=cover;x.image=cover}
  if(d){x.episodes=d.episodes||x.episodes;x.year=d.seasonYear||x.year;x.type=d.format||x.type;x.score=d.averageScore?d.averageScore/10:x.score;x.duration=d.duration||0;x.tags=[...(d.genres||[]),...(d.tags||[]).filter(t=>!t.isAdult&&!t.isGeneralSpoiler&&!t.isMediaSpoiler&&t.rank>=55).map(t=>t.name)];x.description=desc;x.studios=(d.studios?.nodes||[]).map(s=>s.name)}
  const info=$('#onlineInfo');if(info)info.innerHTML=`<b>Descrição</b><p style="line-height:1.65;white-space:pre-line">${esc(desc||'Descrição não disponível para este título.')}</p>${d?`<div class="muted" style="font-size:12px;line-height:1.7">${x.duration?`⏱ ${x.duration} min por episódio<br>`:''}${x.studios?.length?`🎬 ${esc(x.studios.join(', '))}<br>`:''}${d.status?`📡 ${esc(d.status.replaceAll('_',' '))}`:''}</div>`:''}`;
  const controls=$('#listControls');m=mine(a.id);
  if(m){controls.innerHTML=`<div class="field"><label>Status</label><select id="st"><option value="planos" ${m.status==='planos'?'selected':''}>Planos</option><option value="vendo" ${m.status==='vendo'?'selected':''}>Vendo</option><option value="fim" ${m.status==='fim'?'selected':''}>Finalizado</option><option value="drop" ${m.status==='drop'?'selected':''}>Drop</option></select></div><div class="field"><label>Episódios assistidos</label><input id="wat" type="number" min="0" value="${m.watched||0}"></div><div class="row"><button class="btn red" id="saveA">Salvar</button><button class="btn" id="removeA">Remover</button></div>`;$('#saveA').onclick=()=>{Object.assign(m,x,{status:$('#st').value,watched:Math.max(0,Number($('#wat').value)||0)});save();modal(false);render();toast('Anime atualizado')};$('#removeA').onclick=()=>{S.list=S.list.filter(z=>String(z.id)!==String(m.id));save();modal(false);render();toast('Removido')}}else{controls.innerHTML='<button class="btn red full" id="addA">＋ Adicionar aos Planos</button>';$('#addA').onclick=()=>{S.list.unshift({...x,status:'planos',watched:0});save();modal(false);render();toast('Adicionado aos Planos')}}
};
if(S.r==='catalog')catalog();