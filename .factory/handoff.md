# Handoff

- Issue #15 (T-051) hecho: `src/infrastructure/engines/MossServerEngine.ts` (+ spec con servidor HTTP falso real). POST `{serverUrl}/v1/audio/speech`, `response_format: pcm` (PCM16 LE mono, 48 kHz por defecto) en streaming, cancelación con AbortSignal/dispose (AV_ABORTED), AV_SERVER_ERROR con `details.status` (sin status en caída de red), `redirect: 'error'` y `credentials: 'omit'`. Pasa `speechEngineContract`.
- Exporté `VoiceId`, `EngineKind`, `HttpsUrl` desde `libs/reader/src/index.ts` (regenerado `etc/article-voice.api.md`). eslint: las specs de infrastructure pueden importar `core/domain/outbound/testing`.
- `pnpm verify` y `pnpm api:check` verdes.
- Siguiente paso: T-050 (#16, web-speech) y el selector de motor (`auto`) que cablee MossServerEngine con `server-url`; la voz/voces de `moss-server` se pasan por opción `voices` (no hay endpoint de voces).
