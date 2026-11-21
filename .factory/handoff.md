# Handoff

- T-022 hecho (issue #20), `pnpm verify` verde (299 tests). En `libs/reader/src/core/application/`: `NarrationSession` (une Narration + SpeechEngine + AudioOutput, síntesis con lookahead 2), `NarrationRegistry` (una sola activa), `narration.use-cases.ts` (PlayNarration, Pause/Resume/Stop/SeekNarration) y su spec con dobles.
- No se exportó nada en el entry público (sin cambio de API).
- Siguiente paso: T-023 (WebAudioOutput) y T-041 (ArticleVoiceElement) que debe cablear estos casos de uso en `src/compose.ts`; T-035 sigue pendiente.
