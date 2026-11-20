# Handoff

- Issue #12 (CP-SPIKE-3): NO se pudo completar; requiere 5 oyentes humanos puntuando (MOS) audios oficial vs q4. No se simuló ningún resultado ni se tocó el informe.
- Para la persona: ejecutar `node spikes/t000-moss-browser/scripts/make-blind-pack.mjs` (genera A/B en `spikes/t000-moss-browser/out/escucha-ciega`), que 5 personas puntúen 1-5 las 10 frases, y registrar MOS por variante y diferencia en `docs/03-arquitectura/spikes/T-000-informe.md` sección 5 (criterio: MOS >= 3.5 y diferencia <= 0.5).
- Siguiente paso técnico (independiente): T-022 (PlayNarration), conectar DetectArticle con createCore; T-005 (release/nightly).
