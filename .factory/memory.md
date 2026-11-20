# Memoria de article-voice

Decisiones, convenciones y aprendizajes que cualquier agente futuro debe conocer.
Agrega entradas cortas y fechadas; no borres las de otros salvo que ya no sean ciertas.

- 2026-11-20: la documentación detallada vive en `docs/01..08`; `docs/architecture.md` y `docs/backlog.md` son resúmenes que apuntan a ella. El backlog por IDs T-xxx está en `docs/08-tareas/backlog.md`.
- 2026-11-20: esqueleto listo (T-001/T-002). `pnpm verify` = typecheck + lint + prettier --check + jest. Capas con `no-restricted-imports` en eslint.config.mjs (no eslint-plugin-boundaries). Jest mapea imports `.js` a `.ts`; el root aún no es `type: module`.
- 2026-11-20: T-011 `ArticleDetector` recibe candidatos ya descritos (`ArticleCandidate`), no DOM; el adaptador (T-012) cuenta palabras sin excluidos RN-02. Tampoco se pudo correr `pnpm verify` (permiso denegado) — verificar.
- 2026-11-20: VOs de T-010 en `core/domain/value-objects` (helper `invalidOption` → AV_INVALID_OPTION). La lista de idiomas de `Language` no estaba en docs y se puso de memoria: verificar. Los VOs se escribieron sin poder correr `pnpm verify` (comandos denegados en esa sesión).
