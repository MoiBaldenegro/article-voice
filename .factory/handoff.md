# Handoff

- #49: prueba E2E de moss-server con pesos reales hecha y VERDE (`pnpm test:moss-real`, scripts/moss-e2e/{run.mjs,moss_upstream.py}).
  - Pesos ya estaban en spikes/t000-moss-browser/models (si faltan, run.mjs los descarga con el manifest). Python: venv del spike.
  - Resultado en CPU: es 12,8 s de audio en 6,08 s (RTF 0,48); en 9,12 s en 4,06 s (RTF 0,45); PCM 16-bit mono 48 kHz válido. Chromium con examples/html: playing, avanza segmento 0→1, resalta, sin fallback. Documentado en docs/07-operacion/moss-server.md §7.
  - Cambios menores: examples/html ahora tiene >120 palabras (antes no se detectaba el artículo); eslint ignora scripts/moss-e2e.
  - No hay bugs encontrados. Una sola medición por idioma (orientativa).
- Siguiente paso: opcional, medir RTF con ≥3 repeticiones y con varias peticiones concurrentes; no está en CI (requiere pesos de ~GB).
