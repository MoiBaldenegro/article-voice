## Qué cambia y por qué

<!-- 1–3 frases. Enlaza el issue: Closes #123 -->

## Trazabilidad

- Historia / criterios: HU-…
- Requisitos / reglas: RF-…, RN-…
- ADR / RFC: …

## Tipo de cambio publicado

- [ ] Ninguno (refactor, pruebas, docs internas, CI)
- [ ] patch · [ ] minor · [ ] major — changeset incluido
- [ ] Cambia `etc/*.api.md` a propósito (explicar arriba)

## Checklist del autor

- [ ] Cada criterio de aceptación tiene su prueba (`HU-XX · CA-N` en el nombre)
- [ ] `pnpm verify` pasa en local
- [ ] Respeta las capas y no agrega dependencias de runtime sin ADR
- [ ] Errores nuevos en el catálogo; TSDoc con ejemplo en lo exportado
- [ ] Docs actualizadas (README, docs/, estado de los documentos)

La revisión sigue `docs/05-estandares/code-review.md`.
