# Handoff

- Issue #9 (T-003/T-004) hecho: tsup, API Extractor (`etc/article-voice.api.md`, `api:check` verificado: un cambio de tipo lo hace fallar), publint, attw, size-limit (60 kB gzip), prueba del paquete en Playwright (Vite + HTML sin bundler) y `ci.yml` con los jobs verify y package. `pnpm verify` verde (225 tests); lo demás corrido localmente.
- Siguiente paso: T-022 (PlayNarration) y conectar DetectArticle con createCore; #10 ya planeado. T-005 (release/nightly) sigue pendiente. Nota: ci.yml no se ha ejecutado en GitHub aún; `pnpm/action-setup` usa `packageManager` del package.json.
