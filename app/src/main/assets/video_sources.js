// Episódios completos publicados pelos próprios distribuidores.
// Reprodução pelo player oficial; nenhum vídeo é baixado ou republicado.
// Fontes e data da conferência: docs/episodios.md.
window.VIDEO_SOURCES = {};
window.VIDEO_SOURCES_BY_TITLE = {};
(function () {
  const youtube = (videoId, publisher, language) => ({provider: 'youtube', videoId, publisher, language, verifiedAt: '2026-11-01'});
  const gachiakuta = {
    1: {dub: youtube('Cb3fhlr2U30', 'Crunchyroll Brasil', 'pt-BR')},
    2: {dub: youtube('BtdwFFfvv_8', 'Crunchyroll Brasil', 'pt-BR')},
    3: {dub: youtube('dmQRY0bvTpE', 'Crunchyroll Brasil', 'pt-BR')}
  };
  const horizons = {
    1: {dub: youtube('4peE47ST-mw', 'O Canal Oficial da Pokémon em Português', 'pt')},
    2: {dub: youtube('R--INUiUisY', 'O Canal Oficial da Pokémon em Português', 'pt')}
  };
  const register = (titles, episodes) => titles.forEach(title => {window.VIDEO_SOURCES_BY_TITLE[title] = episodes;});
  register(['gachiakuta'], gachiakuta);
  register(['pokemon (2023)', 'pokémon (2023)', 'pokemon horizons: the series', 'pokémon horizons: the series', 'pokemon horizons', 'pokémon: horizontes'], horizons);
})();

