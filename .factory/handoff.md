# Handoff

- #35 hecho (T-053, HU-13): selects de velocidad (0.75–2) y voz en el shadow del elemento, i18n es/en, persistencia en localStorage (`src/ui/preferences.ts`). Specs en `ArticleVoiceElement.preferences.spec.ts`. `pnpm verify`, `test:a11y`, `test:e2e`, `api:check`, `size` verdes (api.md regenerado).
- Pendiente de #35: ninguna prueba Playwright de recarga real ni axe con el selector de voz visible (solo jsdom).
- Siguiente paso: #36 (Dependabot/comunidad) y #37 (Media Session + ejemplos).
