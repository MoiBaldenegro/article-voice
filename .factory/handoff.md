# Handoff

- Hecho (constructor, issue #4 / T-010): VOs en `libs/reader/src/core/domain/value-objects/`: `PlaybackRate`, `MinWords`, `VoiceId`, `EngineKind`, `HttpsUrl`, `Language` (+ `invalid-option.ts`, `index.ts`, `value-objects.spec.ts`). Fábricas `of()`/`from()`; errores `AV_INVALID_OPTION` (y `AV_UNSUPPORTED_LANGUAGE` en Language) vía `DomainValidationError`.
- Estado: código y tests escritos, pero NO pude ejecutar `pnpm verify` (la sesión negó ejecutar comandos). Puede haber fallos de prettier/typecheck/lint sin detectar; correr `pnpm prettier --write libs && pnpm verify` primero.
- Supuesto a validar: la lista de 20 idiomas en `Language.ts` (`SUPPORTED_LANGUAGES`) es de memoria; no está en docs. Contrastar con MOSS-TTS-Nano / informe T-000.
- Siguiente paso: correr `pnpm verify`, corregir lo que salga, y luego seguir con #5 (T-011) u otros issues abiertos.
