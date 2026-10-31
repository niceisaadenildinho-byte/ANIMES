const ORBITA_VIDEO_SOURCES=window.VIDEO_SOURCES||{};
const VIDEO_PROGRESS_KEY='oa_video_progress_v1';
let VIDEO_PROGRESS={};
try{VIDEO_PROGRESS=JSON.parse(localStorage.getItem(VIDEO_PROGRESS_KEY)||'{}')||{}}catch{VIDEO_PROGRESS={}}
function saveVideoProgress(){try{localStorage.setItem(VIDEO_PROGRESS_KEY,JSON.stringify(VIDEO_PROGRESS))}catch{}}
function episodeSource(animeId,ep){return ORBITA_VIDEO_SOURCES?.[String(animeId)]?.[String(ep)]||null}
function sourceUrl(src,mode){if(!src)return'';if(typeof src==='string')return src;return src?.[mode]||''}
function ensurePlayerUi(){
  if(document.getElementById('orbitaPlayer'))return;
  const style=document.createElement('style');style.textContent=`
  #orbitaPlayer{display:none;position:fixed;inset:0;z-index:200;background:#000;flex-direction:column}
  #orbitaPlayer.on{display:flex}.opTop{display:flex;align-items:center;gap:10px;padding:12px;background:#09090b;border-bottom:1px solid #222}.opBack{width:42px;height:42px;border-radius:50%;border:1px solid #333;background:#17171b;color:#fff;font-size:22px}.opTitle{min-width:0}.opTitle b{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.opTitle span{font-size:11px;color:#999}.opStage{flex:1;display:grid;place-items:center;background:#000;min-height:0}.opStage video{width:100%;height:100%;max-height:100%;background:#000}.opMsg{padding:22px;color:#bbb;text-align:center;line-height:1.5}.epCard{border:1px solid #29292f;border-radius:14px;background:#151519;padding:9px;display:grid;gap:7px}.epCard.seen{border-color:#5a332e}.epHead{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:12px;font-weight:900}.epActions{display:grid;grid-template-columns:1fr 1fr;gap:6px}.epActions button{padding:8px 6px;border-radius:10px;border:1px solid #303037;background:#1b1b20;color:#fff;font-size:10px;font-weight:850}.epActions button.red{background:#ff4937;border-color:#ff4937}.epActions button:disabled{opacity:.35}.epMini{font-size:9px;color:#777}
  `;document.head.appendChild(style);
  const wrap=document.createElement('div');wrap.id='orbitaPlayer';wrap.innerHTML=`<div class="opTop"><button class="opBack" id="opClose">‹</button><div class="opTitle"><b id="opName">Órbita Anime</b><span id="opMeta">Player interno</span></div></div><div class="opStage" id="opStage"><div class="opMsg">Selecione um episódio.</div></div>`;document.body.appendChild(wrap);document.getElementById('opClose').onclick=closeOrbitaPlayer;
}
function closeOrbitaPlayer(){const p=document.getElementById('orbitaPlayer');const v=document.getElementById('opVideo');if(v){try{v.pause()}catch{}}if(p)p.classList.remove('on')}
function openOrbitaPlayer(anime,ep,mode){
  ensurePlayerUi();const src=episodeSource(anime.id,ep),url=sourceUrl(src,mode),p=document.getElementById('orbitaPlayer'),stage=document.getElementById('opStage');
  document.getElementById('opName').textContent=anime.title||'Anime';document.getElementById('opMeta').textContent=`EP ${ep} • ${mode==='dub'?'Dublado':'Legendado'}`;p.classList.add('on');
  if(!url){stage.innerHTML='<div class="opMsg">Este episódio ainda não tem um vídeo autorizado configurado no aplicativo.</div>';return}
  const key=`${anime.id}:${ep}:${mode}`,resume=Number(VIDEO_PROGRESS[key]||0);
  stage.innerHTML=`<video id="opVideo" controls playsinline preload="metadata" src="${esc(url)}"></video>`;const v=document.getElementById('opVideo');
  v.addEventListener('loadedmetadata',()=>{if(resume>4&&resume<Math.max(0,v.duration-8))v.currentTime=resume;v.play().catch(()=>{})},{once:true});
  let last=0;v.addEventListener('timeupdate',()=>{if(v.currentTime-last>=5){last=v.currentTime;VIDEO_PROGRESS[key]=Math.floor(v.currentTime);saveVideoProgress()}});
  v.addEventListener('ended',()=>{VIDEO_PROGRESS[key]=0;saveVideoProgress();const m=mine(anime.id);if(m){m.watched=Math.max(Number(m.watched)||0,Number(ep)||0);if(m.status==='planos')m.status='vendo';save()}toast(`EP ${ep} concluído`)});
  v.addEventListener('error',()=>{stage.innerHTML='<div class="opMsg">Não consegui reproduzir este vídeo. Confira se a URL é MP4/HLS compatível e se o servidor permite reprodução no app.</div>'});
}
ensurePlayerUi();
episodePanel=function(x){
  const total=Math.max(0,Number(x.episodes)||0),watched=Math.max(0,Number(mine(x.id)?.watched)||0);
  if(!total)return `<div class="panel"><b>Episódios</b><p class="muted" style="line-height:1.6">A quantidade total de episódios ainda não foi informada para este anime.</p></div>`;
  const rows=Array.from({length:total},(_,i)=>{const n=i+1,seen=n<=watched,src=episodeSource(x.id,n),dub=!!sourceUrl(src,'dub'),sub=!!sourceUrl(src,'sub');return `<div class="epCard ${seen?'seen':''}" data-epcard="${n}"><div class="epHead"><span>EP ${n}${seen?' ✓':''}</span><span class="epMini">${dub||sub?'Vídeo disponível':'Sem vídeo'}</span></div><div class="epActions"><button class="playEp ${dub?'red':''}" data-ep="${n}" data-mode="dub" ${dub?'':'disabled'}>🇧🇷 Dublado</button><button class="playEp ${sub?'red':''}" data-ep="${n}" data-mode="sub" ${sub?'':'disabled'}>💬 Legendado</button></div><button class="markEp btn" data-ep="${n}" style="padding:8px;font-size:10px">${seen?'Assistido ✓':'Marcar visto'}</button></div>`}).join('');
  return `<div class="panel"><div style="display:flex;align-items:center;justify-content:space-between;gap:10px"><div><b>Episódios</b><div class="muted" style="font-size:12px;margin-top:3px">${total} episódios neste anime</div></div><div class="muted" style="font-size:11px">${watched}/${total} vistos</div></div><div id="episodeGrid" style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:14px;max-height:430px;overflow:auto">${rows}</div><div class="muted" style="font-size:10px;margin-top:12px">Dublado/Legendado aparecem somente quando existe uma fonte de vídeo autorizada cadastrada para aquele episódio.</div></div>`;
};
bindEpisodeButtons=function(x){
  document.querySelectorAll('.playEp').forEach(b=>b.onclick=()=>openOrbitaPlayer(x,Number(b.dataset.ep)||0,b.dataset.mode));
  document.querySelectorAll('.markEp').forEach(b=>b.onclick=()=>{const n=Number(b.dataset.ep)||0,m=mine(x.id);if(!m){toast('Adicione o anime à sua lista para salvar progresso');return}m.watched=Math.max(Number(m.watched)||0,n);if(m.status==='planos')m.status='vendo';save();const ep=document.getElementById('episodesBlock');if(ep)ep.innerHTML=episodePanel(x);bindEpisodeButtons(x);toast(`EP ${n} marcado como assistido`)})
};
