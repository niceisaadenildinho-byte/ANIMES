const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assets = path.resolve(__dirname, '../app/src/main/assets');
const context = vm.createContext({
  URL,
  S: {r: 'unit-test'},
  localStorage: {getItem: () => null},
  document: {getElementById: id => id === 'orbitaPlayer' ? {} : null}
});
context.window = context;
for (const name of ['video_sources.js', 'player_enhance.js']) {
  vm.runInContext(fs.readFileSync(path.join(assets, name), 'utf8'), context, {filename: name});
}
const run = expression => vm.runInContext(expression, context);
assert.equal(run("registeredVideoEpisodes({id: 'test', title: 'Gachiakuta'}).join(',')"), '1,2,3');
assert.equal(run("registeredVideoEpisodes({id: 'test', title: 'Pokemon (2023)'}).join(',')"), '1,2');
assert.equal(run("registeredVideoEpisodes({id: 'test', title: 'Pokemon'}).length"), 0);
assert.equal(run("registeredVideoEpisodes({id: 'test', title: 'Outro anime'}).length"), 0);
assert.equal(run("registeredVideoEpisodes({id: 'test', title: 'Título localizado', syn: ['Gachiakuta']}).join(',')"), '1,2,3');
assert.equal(run("videoStream(episodeSource('test', 1, '  POKÉMON  (2023) '), 'dub').videoId"), '4peE47ST-mw');
assert.equal(run("episodeSource('test', 4, 'Gachiakuta')"), null);
assert.equal(run("sourceUrl(episodeSource('test', 2, 'Gachiakuta'), 'dub')"), 'https://www.youtube.com/watch?v=BtdwFFfvv_8');
assert.equal(run("sourceUrl(episodeSource('test', 1, 'Gachiakuta'), 'sub')"), '');
assert.equal(run("normalizeVideoStream({provider:'youtube', videoId:'bad'})"), null);
assert.equal(run("normalizeVideoStream({provider:'youtube', videoId:'../bad-path'})"), null);
assert.equal(run("videoStream({dub:'javascript:alert(1)'}, 'dub')"), null);
assert.equal(run("videoStream({dub:'https://user:pass@video.example/ep.mp4'}, 'dub')"), null);
assert.equal(run("videoStream({dub:'https://video.example/ep.mp4'}, 'dub').provider"), 'file');
assert.equal(run("videoStream({dub:'https://video.example/ep.mp4'}, 'dub').url"), 'https://video.example/ep.mp4');
assert.equal(run("videoStream('https://video.example/legacy.mp4', 'original').url"), 'https://video.example/legacy.mp4');
assert.equal(run("new Set(Object.values(VIDEO_SOURCES_BY_TITLE).flatMap(map => Object.values(map).map(ep => ep.dub.videoId))).size"), 5);
assert.equal(run("modeLabel('dub', {language:'pt'})"), 'Dublado (português)');
console.log('PASS: 18 source checks; five unique official episode publications, no guessed IDs or season mismatches');
