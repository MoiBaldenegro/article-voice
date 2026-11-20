# Handoff

- Issue #7 (T-020/T-021) hecho y `pnpm verify` en verde (208 tests).
- Añadido: `Narration` + `NarrationState` (máquina de estados, seek, segmentEnded, fail, pendingSynthesis/lookahead), puertos `SpeechEngine`, `AudioOutput`, `ModelStore`, `DeviceCapabilities` en `core/domain/outbound/`, dobles en memoria y suites de contrato en `outbound/testing/`, exports en `src/index.ts`, código `AV_INVALID_NARRATION_TRANSITION` en el catálogo de errores.
- Pendiente de reconciliar: el diagrama de estados de docs usa buffering/ended; el issue pidió 6 estados sin ellos (ver memory.md).
- Siguiente paso: T-022 (`PlayNarration`, Pause/Resume/Stop, Seek, `NarrationRegistry`) usando los dobles. El spike T-000 (#3) sigue pendiente aparte.
