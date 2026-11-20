# Handoff

- Issue #16 (T-050) hecho. `src/infrastructure/engines/WebSpeechEngine.ts`: motor sobre `speechSynthesis` inyectable (`SpeechSynthesisLike`); `synthesize` habla el texto y al terminar entrega UN chunk de silencio (el navegador no expone el PCM de la voz del sistema). Voces → ids slug `[a-z0-9-]`, filtradas por `language` si hay coincidencias; espera `voiceschanged`. Pasa `speechEngineContract`.
- `libs/reader/src/core/application/SelectEngine.use-case.ts` (CU-06): `auto` = moss-server si hay `serverUrl` y el `probe` inyectado responde; si no, web-speech con `fallback: true`, `label: 'voz del sistema'` y callback `onFallback(FallbackEvent)`; `fallback: 'none'` o sin voz del sistema → AV_ENGINE_UNAVAILABLE; nunca elige moss-browser salvo `engine` explícito. Exportado en `index.ts` (api.md regenerado).
- `pnpm verify` y `pnpm api:check` verdes.
- Siguiente paso: cablear SelectEngine + engines + PlayNarration en el componente (la UI debe mostrar la etiqueta y re-emitir el evento de respaldo como CustomEvent), y un `probe` HTTP real para `server-url` (aún no existe).
