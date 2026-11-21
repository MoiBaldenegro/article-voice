# Handoff

- T-041 hecho (#22): `src/ui/ArticleVoiceElement.ts` completo: plantilla (botones play/pausa/detener en shadow, partes root/controls/play/pause/stop/progress/meta), atributos→propiedades, métodos play/pause/stop/next/previous/refresh, props de solo lectura (state, progress, article, activeEngine, voices) y eventos ready/statechange/segment/ended/fallback/error. Usa PlayNarration/Pause/Resume/Stop/Seek de T-022; `NarrationSession.onChange` nuevo.
- `src/compose.ts` cablea DomArticleSource, MossServerEngine/WebSpeechEngine y WebAudioOutput; `libs/reader/src/index.ts` ahora exporta `ArticleVoiceElement`, `defineArticleVoice` y registra `<article-voice>` al importar. El contenido anterior del index está en `core-api.ts` (ui/infra importan de ahí para evitar ciclos).
- `pnpm verify`, `api:extract` (etc/ actualizado), `api:check`, `test:package` (comprueba el registro), `package:lint` y `size` OK.
- Pendiente (#23 T-042): estados visuales, i18n, accesibilidad, estilos/variables CSS. Sin cablear aún: moss-browser, resaltado (`no-highlight` solo se refleja), `confirm-download`/`download-*`, selector `target`, lista `voice`/`rate` en la UI, estado `buffering`.
