# Handoff

- #37 hecho: Media Session en `<article-voice>` (propiedad inyectable `mediaSession`, por defecto `navigator.mediaSession`; metadatos título/hostname y handlers play/pause/stop/previoustrack/nexttrack al sonar, se liberan al salir de playing/paused o desconectar). Spec `ArticleVoiceElement.mediasession.spec.ts`. API pública regenerada (etc/).
- Ejemplos en `examples/{html,astro,react}` con README y comando de arranque; `examples/examples.spec.ts` lo verifica. Astro y React NO se instalaron ni ejecutaron (solo HTML/estructura); eslint y prettier los ignoran parcialmente.
- `pnpm verify` verde (359 tests) y api:extract hecho.
- Siguiente paso: verificar en navegador real los ejemplos astro/react (pnpm install + dev) y la Media Session con teclas multimedia.
