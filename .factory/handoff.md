# Handoff

- Issue #19 (T-052) hecho. Como el componente completo (T-041) NO existe, se creó un elemento parcial: `src/ui/ArticleVoiceElement.ts` (al conectarse/cambiar `engine`/`fallback`/`server-url` corre `SelectEngine`; expone `activeEngine {kind, fallback}` y `ready`; shadow `<p part="meta" role="status">` con «voz del sistema»; re-emite el FallbackEvent como `article-voice:fallback`; atributo inválido → `article-voice:error` AV_INVALID_OPTION y usa el defecto).
- `src/infrastructure/net/HttpServerProbe.ts` (HEAD, GET si 405/501; timeout 3 s; `credentials:'omit'`; <500 = vivo) y `src/infrastructure/device/BrowserDeviceCapabilities.ts`. `src/compose.ts` los une al elemento (ui no puede importar infrastructure) y define `defineArticleVoice()`.
- Evento documentado en `docs/04-diseno/contrato-api-publica.md`. Pruebas: probe contra servidores http reales (vivo, 405, 5xx, caído, timeout) y elemento en jsdom con servidor caído. `pnpm verify` verde.
- NO está exportado en `libs/reader/src/index.ts` ni en el bundle (no cambia la API pública ni `etc/article-voice.api.md`); la entrada del paquete que registre el elemento llega con T-041.
- Siguiente paso: T-041 (plantilla, resto de atributos, PlayNarration) sobre este elemento y exportarlo/registrarlo en el entry (`pnpm api:extract`).
