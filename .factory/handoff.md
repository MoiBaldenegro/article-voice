# Handoff

- #34 hecho (T-052 resaltado, HU-12): puerto `SegmentHighlighter`, `DomArticleSource.rangeOf(span)` (mapea offsets normalizados a un Range sin mutar el DOM), `HighlightApiHighlighter` (CSS.highlights, nombre `article-voice`, hoja `::highlight` con `--av-highlight`, sin soporte = no-op, seguimiento con scroll tras 5 s sin scroll del usuario, `behavior:'auto'` con prefers-reduced-motion). El elemento tiene propiedad inyectable `highlighter` (compose la cablea) y respeta `no-highlight`. Specs unitarios + 3 pruebas Playwright en test/e2e. `etc/article-voice.api.md` regenerado. `pnpm verify`, `api:check`, `test:e2e`, `size` verdes.
- Siguiente paso: #35 (velocidad/voz persistentes), #36, #37.
