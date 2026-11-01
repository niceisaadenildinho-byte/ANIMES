const ORBITA_VIDEO_SOURCES = window.VIDEO_SOURCES || {};
const ORBITA_VIDEO_SOURCES_BY_TITLE = Object.create(null);
function normVideoTitle(s) {
  return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().trim().replace(/\s+/g, ' ');
}
Object.entries(window.VIDEO_SOURCES_BY_TITLE || {}).forEach(([title, episodes]) => {
  ORBITA_VIDEO_SOURCES_BY_TITLE[normVideoTitle(title)] = episodes;
});
const VIDEO_PROGRESS_KEY = 'oa_video_progress_v1';
let VIDEO_PROGRESS = {};
try { VIDEO_PROGRESS = JSON.parse(localStorage.getItem(VIDEO_PROGRESS_KEY) || '{}') || {}; } catch (_) {}
function saveVideoProgress() {
  try { localStorage.setItem(VIDEO_PROGRESS_KEY, JSON.stringify(VIDEO_PROGRESS)); } catch (_) {}
}
function videoEpisodeMaps(animeId, title, synonyms = []) {
  const maps = [];
  if (Object.prototype.hasOwnProperty.call(ORBITA_VIDEO_SOURCES, String(animeId))) {
    maps.push(ORBITA_VIDEO_SOURCES[String(animeId)]);
  }
  for (const name of [title, ...(Array.isArray(synonyms) ? synonyms : [])]) {
    const map = ORBITA_VIDEO_SOURCES_BY_TITLE[normVideoTitle(name)];
    if (map && !maps.includes(map)) maps.push(map);
  }
  return maps;
}
function episodeSource(animeId, ep, title, synonyms) {
  for (const map of videoEpisodeMaps(animeId, title, synonyms)) {
    if (Object.prototype.hasOwnProperty.call(map, String(ep))) return map[String(ep)];
  }
  return null;
}
function normalizeVideoStream(value) {
  if (value && typeof value === 'object' && value.provider === 'youtube') {
    if (!/^[A-Za-z0-9_-]{11}$/.test(value.videoId || '')) return null;
    return { ...value, url: 'https://www.youtube.com/watch?v=' + value.videoId };
  }
  const raw = typeof value === 'string' ? value : value?.url;
  if (typeof raw !== 'string') return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:' || url.username || url.password) return null;
    return { ...(typeof value === 'object' ? value : {}), provider: 'file', url: url.href };
  } catch (_) { return null; }
}
function videoStream(src, mode) {
  if (!src) return null;
  if (typeof src === 'string' || src.provider || src.url) return normalizeVideoStream(src);
  return normalizeVideoStream(src[mode]);
}
function sourceUrl(src, mode) { return videoStream(src, mode)?.url || ''; }
function modeLabel(mode, stream) {
  if (mode === 'dub') return stream?.language === 'pt' ? 'Dublado (português)' : 'Dublado';
  if (mode === 'sub') return 'Legendado';
  return 'Original';
}
function registeredVideoEpisodes(anime) {
  const nums = new Set();
  for (const map of videoEpisodeMaps(anime.id, anime.title, anime.syn)) {
    Object.entries(map).forEach(([ep, src]) => {
      if (/^[1-9]\d*$/.test(ep) && ['dub', 'sub', 'original'].some(mode => videoStream(src, mode))) {
        nums.add(Number(ep));
      }
    });
  }
  return [...nums].sort((a, b) => a - b);
}
function hasVideoEpisodes(anime) { return registeredVideoEpisodes(anime).length > 0; }
function ensurePlayerUi() {
  if (document.getElementById('orbitaPlayer')) return;
  const style = document.createElement('style');
  style.textContent = `
    #orbitaPlayer{display:none;position:fixed;inset:0;z-index:200;background:#000;flex-direction:column}
    #orbitaPlayer.on{display:flex}.opTop{display:flex;align-items:center;gap:10px;padding:12px;background:#09090b;border-bottom:1px solid #222}
    .opBack{width:42px;height:42px;border-radius:50%;border:1px solid #333;background:#17171b;color:#fff;font-size:22px;flex-shrink:0}
    .opTitle{min-width:0}.opTitle b{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.opTitle span{font-size:11px;color:#999}
    .opStage{flex:1;display:grid;place-items:center;background:#000;min-height:0}.opStage video,.opStage iframe{width:100%;height:100%;border:0;background:#000}
    .opStage iframe{min-height:200px}.opMsg{padding:22px;color:#bbb;text-align:center;line-height:1.5}
    .opSource{padding:12px 16px;color:#aaa;font-size:12px;line-height:1.5;background:#101013}.opSource a{display:inline-block;color:#ff897c;margin-top:8px}
    .epCard{border:1px solid #29292f;border-radius:14px;background:#151519;padding:9px;display:grid;gap:7px}.epCard.seen{border-color:#5a332e}
    .epHead{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:12px;font-weight:900}
    .epActions{display:grid;grid-template-columns:1fr 1fr;gap:6px}.epActions button{padding:8px 6px;border-radius:10px;border:1px solid #303037;background:#1b1b20;color:#fff;font-size:10px;font-weight:850}
    .epActions button.red{background:#ff4937;border-color:#ff4937}.epActions button:disabled{opacity:.35}.epActions .full{grid-column:1/-1}.epMini{font-size:9px;color:#999}
    .videoBadge{position:absolute;left:8px;bottom:8px;padding:5px 7px;background:#13382c;color:#adffce;border:1px solid #246e50;border-radius:8px;font-size:10px;font-weight:850;z-index:1}
    #availableVideoFilter{margin-top:14px;font-size:13px}#availableVideoFilter.on{background:#18412f;border-color:#287b51}
  `;
  document.head.appendChild(style);
  const wrap = document.createElement('div');
  wrap.id = 'orbitaPlayer';
  wrap.innerHTML = '<div class="opTop"><button class="opBack" id="opClose" aria-label="Fechar player">‹</button><div class="opTitle"><b id="opName">Niez Animes</b><span id="opMeta"></span></div></div><div class="opStage" id="opStage"></div><div class="opSource" id="opSource"></div>';
  document.body.appendChild(wrap);
  document.getElementById('opClose').onclick = closeOrbitaPlayer;
}
function closeOrbitaPlayer() {
  const video = document.getElementById('opVideo');
  if (video) { video.pause(); video.removeAttribute('src'); video.load(); }
  document.getElementById('opStage')?.replaceChildren();
  document.getElementById('orbitaPlayer')?.classList.remove('on');
}
function openOrbitaPlayer(anime, ep, mode) {
  ensurePlayerUi();
  closeOrbitaPlayer();
  const stream = videoStream(episodeSource(anime.id, ep, anime.title, anime.syn), mode);
  if (stream?.provider === 'youtube') {
    // O player Android informa a identidade do app como Referer ao YouTube.
    // O WebView de vídeo não possui a ponte de conta nem acesso a arquivos locais.
    const bridge = window.OrbitaAccount;
    if (bridge && typeof bridge.playOfficialVideo === 'function') {
      try {
        bridge.playOfficialVideo(stream.videoId, `${anime.title} — EP ${ep}`, stream.publisher || 'YouTube');
        return;
      } catch (_) { /* A versão web continua usando o iframe oficial. */ }
    }
  }
  const stage = document.getElementById('opStage');
  const source = document.getElementById('opSource');
  source.replaceChildren();
  document.getElementById('opName').textContent = anime.title || 'Anime';
  document.getElementById('opMeta').textContent = `EP ${ep} • ${modeLabel(mode, stream)}`;
  document.getElementById('orbitaPlayer').classList.add('on');
  if (!stream) {
    stage.innerHTML = '<div class="opMsg">Este episódio ainda não está disponível no app.</div>';
    return;
  }
  if (stream.provider === 'youtube') {
    const frame = document.createElement('iframe');
    frame.id = 'opYouTube';
    frame.src = `https://www.youtube.com/embed/${stream.videoId}?playsinline=1`;
    frame.title = `${anime.title} — episódio ${ep}`;
    frame.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    frame.allowFullscreen = true;
    frame.referrerPolicy = 'strict-origin-when-cross-origin';
    stage.appendChild(frame);
    source.appendChild(document.createTextNode(`${stream.publisher || 'YouTube'} • Player oficial. A disponibilidade depende do canal e da região.`));
    source.appendChild(document.createElement('br'));
    const link = document.createElement('a');
    link.textContent = 'Abrir no YouTube';
    link.href = stream.url;
    link.target = '_blank';
    link.rel = 'noopener';
    source.appendChild(link);
    return;
  }
  const key = `${anime.id}:${ep}:${mode}`;
  const resume = Number(VIDEO_PROGRESS[key] || 0);
  const video = document.createElement('video');
  video.id = 'opVideo';
  video.controls = true;
  video.playsInline = true;
  video.preload = 'metadata';
  video.src = stream.url;
  stage.appendChild(video);
  if (stream.publisher) source.textContent = stream.publisher;
  video.addEventListener('loadedmetadata', () => {
    if (resume > 4 && resume < Math.max(0, video.duration - 8)) video.currentTime = resume;
    video.play().catch(() => {});
  }, { once: true });
  let last = 0;
  video.addEventListener('timeupdate', () => {
    if (Math.abs(video.currentTime - last) >= 5) {
      last = video.currentTime;
      VIDEO_PROGRESS[key] = Math.floor(video.currentTime);
      saveVideoProgress();
    }
  });
  video.addEventListener('ended', () => {
    VIDEO_PROGRESS[key] = 0;
    saveVideoProgress();
    const item = mine(anime.id);
    if (item) {
      item.watched = Math.max(Number(item.watched) || 0, Number(ep) || 0);
      if (item.status === 'planos') item.status = 'vendo';
      save();
    }
    toast(`EP ${ep} concluído`);
  });
  video.addEventListener('error', () => {
    stage.innerHTML = '<div class="opMsg">Não foi possível reproduzir este vídeo. Confira sua conexão e tente novamente.</div>';
  });
}
episodePanel = function (anime) {
  const available = registeredVideoEpisodes(anime);
  const total = Math.max(0, Math.floor(Number(anime.episodes) || 0), ...available);
  const watched = Math.max(0, Number(mine(anime.id)?.watched) || 0);
  if (!total) return '<div class="panel"><b>Episódios</b><p class="muted">Ainda não há episódios informados para este anime.</p></div>';
  const rows = Array.from({ length: total }, (_, i) => {
    const ep = i + 1;
    const seen = ep <= watched;
    const src = episodeSource(anime.id, ep, anime.title, anime.syn);
    const streams = ['dub', 'sub', 'original'].map(mode => ({ mode, stream: videoStream(src, mode) })).filter(x => x.stream);
    const actions = streams.length ? streams.map(({ mode, stream }) => `<button class="playEp red ${streams.length === 1 ? 'full' : ''}" data-ep="${ep}" data-mode="${mode}">▶ ${esc(modeLabel(mode, stream))}</button>`).join('') : '<button disabled class="full">Vídeo indisponível</button>';
    const publisher = streams[0]?.stream?.publisher || '';
    return `<div class="epCard ${seen ? 'seen' : ''}" data-epcard="${ep}"><div class="epHead"><span>EP ${ep}${seen ? ' ✓' : ''}</span><span class="epMini">${streams.length ? 'Disponível' : 'Sem vídeo'}</span></div><div class="epActions">${actions}</div>${publisher ? `<div class="epMini">${esc(publisher)}</div>` : ''}<button class="markEp btn" data-ep="${ep}" style="padding:8px;font-size:10px">${seen ? 'Assistido ✓' : 'Marcar visto'}</button></div>`;
  }).join('');
  return `<div class="panel"><div style="display:flex;justify-content:space-between;gap:10px"><div><b>Episódios</b><div class="muted" style="font-size:12px;margin-top:3px">${available.length} de ${total} com vídeo no app</div></div><div class="muted" style="font-size:11px">${watched}/${total} vistos</div></div><div id="episodeGrid" style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:14px;max-height:430px;overflow:auto">${rows}</div><div class="muted" style="font-size:11px;margin-top:12px">Os vídeos disponíveis são publicados pelos canais oficiais. Outros episódios ainda não têm vídeo no app.</div></div>`;
};
bindEpisodeButtons = function (anime) {
  document.querySelectorAll('.playEp').forEach(button => {
    button.onclick = () => openOrbitaPlayer(anime, Number(button.dataset.ep) || 0, button.dataset.mode);
  });
  document.querySelectorAll('.markEp').forEach(button => {
    button.onclick = () => {
      const ep = Number(button.dataset.ep) || 0;
      const item = mine(anime.id);
      if (!item) { toast('Adicione o anime à sua lista para salvar progresso'); return; }
      item.watched = Math.max(Number(item.watched) || 0, ep);
      if (item.status === 'planos') item.status = 'vendo';
      save();
      const block = document.getElementById('episodesBlock');
      if (block) block.innerHTML = episodePanel(anime);
      bindEpisodeButtons(anime);
      toast(`EP ${ep} marcado como assistido`);
    };
  });
};

let VIDEO_ONLY = false;
const videoBaseFiltered = window.filtered;
if (typeof videoBaseFiltered === 'function') {
  window.filtered = function () {
    const items = videoBaseFiltered();
    return VIDEO_ONLY ? items.filter(hasVideoEpisodes) : items;
  };
}
const videoBaseCard = window.card;
if (typeof videoBaseCard === 'function') {
  window.card = function (anime) {
    const html = videoBaseCard(anime);
    return hasVideoEpisodes(anime) ? html.replace('<div class="poster">', '<div class="poster"><span class="videoBadge">▶ Episódios</span>') : html;
  };
}
const videoBaseCatalog = window.catalog;
if (typeof videoBaseCatalog === 'function') {
  window.catalog = function () {
    videoBaseCatalog();
    const hero = document.querySelector('#view .hero');
    if (!hero) return;
    const button = document.createElement('button');
    button.id = 'availableVideoFilter';
    button.className = 'btn' + (VIDEO_ONLY ? ' on' : '');
    button.textContent = VIDEO_ONLY ? '✓ Com episódios — mostrar todos' : '▶ Ver animes com episódios disponíveis';
    button.setAttribute('aria-pressed', String(VIDEO_ONLY));
    button.onclick = () => { VIDEO_ONLY = !VIDEO_ONLY; S.shown = 60; catalog(); };
    hero.appendChild(button);
  };
}
ensurePlayerUi();
if (S.r === 'catalog') catalog();
