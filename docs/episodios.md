# Episódios no Niez Animes 1.3.0

O catálogo de 30 mil ou mais títulos continua sendo um catálogo de informações.
Esta atualização cadastra **cinco episódios completos em dois animes** e adiciona
o filtro **Ver animes com episódios disponíveis**. Não disponibiliza os episódios
de todos os títulos. Nenhum trailer, trecho ou vídeo não oficial é usado como episódio.

## Publicações conferidas em 1º de novembro de 2026

| Anime | Episódio | Publicador | Idioma informado | Publicação oficial |
| --- | --- | --- | --- | --- |
| Gachiakuta | 1 | Crunchyroll Brasil | Português do Brasil | https://www.youtube.com/watch?v=Cb3fhlr2U30 |
| Gachiakuta | 2 | Crunchyroll Brasil | Português do Brasil | https://www.youtube.com/watch?v=BtdwFFfvv_8 |
| Gachiakuta | 3 | Crunchyroll Brasil | Português do Brasil | https://www.youtube.com/watch?v=dmQRY0bvTpE |
| Pokémon: Horizontes / Pokémon (2023) | 1 | O Canal Oficial da Pokémon em Português | Português | https://www.youtube.com/watch?v=4peE47ST-mw |
| Pokémon: Horizontes / Pokémon (2023) | 2 | O Canal Oficial da Pokémon em Português | Português | https://www.youtube.com/watch?v=R--INUiUisY |

As publicações foram identificadas pelos títulos de episódio completo e pelos
canais oficiais. A disponibilidade para incorporação e as restrições regionais
continuam sob controle do YouTube e dos publicadores. O app oferece **Abrir no
YouTube** quando a reprodução incorporada não estiver disponível. A exibição
integral no aparelho do usuário não foi validada automaticamente.

## Reprodução

- Android: `OfficialVideoActivity` abre o player oficial num WebView separado, sem
  a ponte de conta, com arquivos locais desabilitados e o Referer identificado pelo
  pacote `app.orbita.anime`, conforme a documentação do YouTube.
- Navegador: iframe oficial do YouTube, com origem enviada pelo navegador.
- Vídeos do YouTube mantêm os controles, anúncios e marca da plataforma. O app
  não baixa nem armazena os arquivos dos episódios no GitHub.
- O histórico de episódios vistos continua disponível pelo botão **Marcar visto**.
  A reprodução do YouTube não altera automaticamente esse histórico. Arquivos
  diretos HTTPS mantêm retomada de tempo e conclusão automática existentes.
- Ao sair do player Android, o vídeo é encerrado; não há reprodução em segundo plano.

Referência técnica: https://developers.google.com/youtube/terms/required-minimum-functionality

## Cadastrar outra publicação

Em `app/src/main/assets/video_sources.js`, associe o episódio ao ID real do catálogo
ou ao título/sinônimo exato, sem misturar temporadas. Exemplo de formato:

```js
window.VIDEO_SOURCES_BY_TITLE['título exato do catálogo'] = {
  1: { dub: { provider: 'youtube', videoId: 'ID_REAL_11C', publisher: 'Canal oficial', language: 'pt-BR' } }
};
```

Substitua o exemplo por um ID de publicação oficial realmente conferida. Cada
episódio deve ter sua própria correspondência; não derive IDs nem replique um
único vídeo em todos os episódios. `sub` e `original` também são aceitos. Para
arquivos com distribuição autorizada, mantenha o formato `{dub: 'https://...'}`.
Links ausentes, protocolos inseguros e IDs inválidos não habilitam reprodução.

## Verificação

`node tests/player.test.cjs` usa Playwright e fixtures locais para testar a interface,
as correspondências de títulos, a seleção de episódios, a ponte Android e a
compatibilidade com arquivos diretos, sem fazer streaming dos episódios nos testes.
Instale Playwright pelo registro npm caso ele não esteja no ambiente de desenvolvimento.

`node tests/sources.test.cjs` verifica as correspondências e a validação das fontes
sem depender de um navegador. O workflow de APK executa essas verificações, os
testes de interface com Playwright e a compilação Android. Os testes não comprovam
disponibilidade regional nem reproduzem o conteúdo dos episódios.
