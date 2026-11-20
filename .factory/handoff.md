# Handoff

- Hecho (constructor, issue #6 / T-013 + T-014), en `libs/reader/src/core/domain/`:
  - `number-words.ts`: cardinales/ordinales/año es-en (< 1e12), concordancia es (un/una, -ientas).
  - `TextNormalizer.ts`: `normalize(text, lang)` puro (RN-11): URLs→dominio, fechas, horas, monedas, %, ordinales, abreviaturas, números, emojis/símbolos. Solo es/en convierten números; otros idiomas solo limpieza.
  - `Segment.ts`: `BlockRef` (alias string provisional hasta T-012), `TextSpan`, `createTextSpan` (valida 0≤start<end≤len, `AV_INVALID_TEXT_SPAN`), `Segment`.
  - `Segmenter.ts`: `segment(blocks, lang)` (RN-05): ≤300 chars, corta oración → coma/; → palabra; un bloque nunca comparte segmento; spans apuntan al texto original.
  - Specs de los tres. Arreglé también un error de typecheck previo en `ArticleDetector.spec.ts` (exactOptionalPropertyTypes).
- Estado: `pnpm verify` en verde (136 tests).
- No exportado aún desde `src/index.ts` (API pública con T-003/T-004).
- Siguiente paso: T-012 (#8) debe definir el `BlockRef` real y reemplazar el alias; T-020/T-021 (#7) usa `Segment` en `Narration`.
