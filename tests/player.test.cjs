// Integration tests against the real app assets, with a small local catalog.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require('playwright');

const assets = path.resolve(__dirname, '../app/src/main/assets');
const fixture = [
  {id: 'fixture-gachi', title: 'Gachiakuta', episodes: 24, year: 2025, type: 'TV', score: 8, image: '', tags: ['action']},
  {id: 'fixture-pokemon', title: 'Pokemon (2023)', episodes: 100, year: 2023, type: 'TV', score: 7, image: '', tags: ['adventure']},
  {id: 'fixture-other', title: 'Série sem fonte', episodes: 12, year: 2024, type: 'TV', score: 6, image: '', tags: []}
];
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/anime-catalog.js') {
    res.setHeader('Content-Type', 'application/javascript');
    res.end('window.ANIME_DB_META={count:3};window.ANIME_DB=' + JSON.stringify(fixture) + ';');
    return;
  }
  const file = path.resolve(assets, '.' + url.pathname);
  if (!file.startsWith(assets + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    res.writeHead(404); res.end(); return;
  }
  res.setHeader('Content-Type', file.endsWith('.js') ? 'application/javascript' : 'text/html; charset=utf-8');
  res.end(fs.readFileSync(file));
});

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = 'http://127.0.0.1:' + server.address().port;
  let browser;
  try {
    browser = await chromium.launch({headless: true, args: ['--no-sandbox']});
    const page = await browser.newPage({viewport: {width: 390, height: 844}});
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/*', route => {
      const url = route.request().url();
      if (url.startsWith(origin)) return route.continue();
      if (url === 'https://graphql.anilist.co/') {
        return route.fulfill({contentType: 'application/json', body: JSON.stringify({data: {Media: null}})});
      }
      // No public video is streamed, downloaded or tested through these fixtures.
      return route.abort();
    });
    await page.goto(origin + '/online_catalog.html');
    const app = page.frameLocator('#appFrame');
    await app.locator('#availableVideoFilter').waitFor();
    const appFrame = page.frames().find(frame => frame.url().endsWith('/offline_catalog.html'));
    assert.ok(appFrame, 'real catalog iframe loaded');
    assert.equal(await app.locator('.card').count(), 3, 'catalog remains intact');
    assert.equal(await app.locator('.videoBadge').count(), 2, 'only verified titles receive badge');

    await app.locator('#availableVideoFilter').click();
    assert.equal(await app.locator('.card').count(), 2, 'video filter shows two supported anime');
    assert.equal(await app.locator('[data-id="fixture-other"]').count(), 0, 'unavailable anime hidden by filter');
    await app.locator('#availableVideoFilter').click();
    assert.equal(await app.locator('.card').count(), 3, 'filter is reversible');

    await app.locator('.card[data-id="fixture-gachi"]').click();
    await app.locator('#episodeGrid').waitFor();
    assert.equal(await app.locator('.playEp').count(), 3, 'only three verified Gachiakuta episodes can play');
    assert.match(await app.locator('#episodesBlock').innerText(), /3 de 24 com vídeo/);
    assert.equal(await app.locator('[data-epcard="4"] button:disabled').count(), 1, 'episode 4 is not fabricated');

    await app.locator('.playEp[data-ep="1"]').click();
    assert.equal(await app.locator('#opYouTube').getAttribute('src'), 'https://www.youtube.com/embed/Cb3fhlr2U30?playsinline=1');
    assert.match(await app.locator('#opSource').innerText(), /Crunchyroll Brasil/);
    assert.equal(await app.locator('#opSource a').getAttribute('href'), 'https://www.youtube.com/watch?v=Cb3fhlr2U30');
    await app.locator('#opClose').click();
    assert.equal(await app.locator('#opYouTube').count(), 0, 'closing unloads the embedded player');

    await appFrame.evaluate(() => {
      window.nativeCalls = [];
      window.OrbitaAccount = {playOfficialVideo: (...args) => window.nativeCalls.push(args)};
    });
    await app.locator('.playEp[data-ep="2"]').click();
    assert.deepEqual(await appFrame.evaluate(() => window.nativeCalls[0]), ['BtdwFFfvv_8', 'Gachiakuta — EP 2', 'Crunchyroll Brasil']);
    assert.equal(await app.locator('#opYouTube').count(), 0, 'Android uses isolated native player');
    await appFrame.evaluate(() => { delete window.OrbitaAccount; });

    const mapping = await appFrame.evaluate(() => ({
      accent: videoStream(episodeSource('none', 1, '  POKÉMON  (2023)  '), 'dub')?.videoId,
      synonym: videoStream(episodeSource('none', 1, 'Nome localizado', ['Gachiakuta']), 'dub')?.videoId,
      originalSeason: episodeSource('none', 1, 'Pokemon'),
      badId: normalizeVideoStream({provider: 'youtube', videoId: 'not-an-id'}),
      badScheme: videoStream({dub: 'javascript:alert(1)'}, 'dub'),
      unknown: hasVideoEpisodes({id: 'fixture-other', title: 'Série sem fonte'})
    }));
    assert.equal(mapping.accent, '4peE47ST-mw');
    assert.equal(mapping.synonym, 'Cb3fhlr2U30');
    assert.equal(mapping.originalSeason, null, 'different Pokemon series is not matched');
    assert.equal(mapping.badId, null);
    assert.equal(mapping.badScheme, null);
    assert.equal(mapping.unknown, false);

    await app.locator('#addA').click();
    await app.locator('.markEp[data-ep="1"]').click();
    assert.equal(await appFrame.evaluate(() => mine('fixture-gachi').watched), 1, 'watched progress still persists');

    const legacy = await appFrame.evaluate(() => {
      const anime = {id: 'fixture-file', title: 'Vídeo direto', episodes: 1};
      ORBITA_VIDEO_SOURCES[anime.id] = {1: {dub: 'https://media.example.test/episode.mp4'}};
      S.list.push({...anime, status: 'planos', watched: 0});
      openOrbitaPlayer(anime, 1, 'dub');
      const video = document.getElementById('opVideo');
      const hasControls = video.controls;
      video.currentTime = 20;
      video.dispatchEvent(new Event('timeupdate'));
      const resumed = VIDEO_PROGRESS['fixture-file:1:dub'];
      video.dispatchEvent(new Event('ended'));
      const watched = mine(anime.id).watched;
      const status = mine(anime.id).status;
      closeOrbitaPlayer();
      return {hasControls, resumed, watched, status, unloaded: !document.getElementById('opVideo')};
    });
    assert.deepEqual(legacy, {hasControls: true, resumed: 20, watched: 1, status: 'vendo', unloaded: true});

    await appFrame.evaluate(() => {
      const anime = DB.find(item => item.id === 'fixture-pokemon');
      document.getElementById('detail').innerHTML = '<div id="episodesBlock">' + episodePanel(anime) + '</div>';
      bindEpisodeButtons(anime);
    });
    assert.match(await app.locator('.playEp[data-ep="1"]').innerText(), /Dublado \(português\)/);
    assert.equal(await app.locator('.playEp').count(), 2);
    if (process.env.PLAYER_QA_SCREENSHOT) await page.screenshot({path: process.env.PLAYER_QA_SCREENSHOT});
    assert.deepEqual(errors, [], 'no JavaScript exceptions in the real loader and catalog');
    console.log('PASS: catalog, filter, episode mappings, official iframe, Android bridge, source validation, progress and cleanup');
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
