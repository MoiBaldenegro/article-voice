# Handoff

- T-023 hecho (#21): `src/infrastructure/audio/WebAudioOutput.ts` (+ `playbackProcessorSource.ts`, el worklet como texto cargado por Blob URL). Pasa `audioOutputContract`; spec Jest evalúa el processor real con globales simuladas; `pnpm test:audio` (Playwright/Chrome, PCM sintético) verde: 3 segmentos sin underruns y un hueco de 600 ms cuenta 1 underrun. `pnpm verify` verde.
- No se exportó en la API pública ni se cableó en `compose.ts` (sigue sin AudioOutput real en el elemento).
- Siguiente: cablear `WebAudioOutput` en `compose.ts`/elemento (T-041) y exponer el contador de underruns si hace falta.
