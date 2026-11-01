# Niez Animes Android

Aplicativo Android que empacota o site Órbita Anime em uma WebView nativa.

## Episódios completos — versão 1.3.0

Cinco episódios oficiais cadastrados: Gachiakuta 1–3 e Pokémon: Horizontes 1–2.
No catálogo, toque em **Ver animes com episódios disponíveis**, abra o título e
escolha o episódio. O player oficial do YouTube exige conexão com a internet.
O restante do catálogo continua disponível para pesquisa e organização.

Fontes, limitações e formato para adicionar episódios: [docs/episodios.md](docs/episodios.md).

## Gerar o APK pelo GitHub, sem PC
1. Abra a aba **Actions**.
2. Abra **Gerar APK Órbita Anime**.
3. Toque em **Run workflow**.
4. Quando terminar, baixe o artefato **Orbita-Anime-APK**.
5. Dentro do ZIP estará `app-debug.apk`.

O APK de debug é assinado automaticamente e pode ser instalado no Android para testes.

## App
- Nome: Órbita Anime
- Pacote: `app.orbita.anime`
- Android mínimo: 6.0 (API 23)
- Catálogo online: Jikan API
- Site local: `app/src/main/assets/index.html`

