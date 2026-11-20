# Handoff

- Hecho (constructor, issue #5 / T-011): `libs/reader/src/core/domain/ArticleDetector.ts` (puro, sin DOM) + `ArticleDetector.spec.ts` con corpus de 14 estructuras de página. Entrada: `ArticleCandidate[]` (id, tag, wordCount, linkWordCount, paragraphCount, isArticleBody?, excluded?), `MinWords`, `explicitId?`. Salida: `{ok:true,candidate,rule}` o `{ok:false,code}` (`AV_ARTICLE_NOT_FOUND` / `AV_ARTICLE_TOO_SHORT`). Orden RN-03: explícito → único `<article>` → articleBody → único `<main>` → `densityScore`. Excluye nav/aside/footer/form/etc. y `excluded`.
- Estado: NO pude ejecutar `pnpm verify` ni prettier (comandos denegados; sesión sin aprobación). Ajusté a mano el formato a printWidth 100, pero puede fallar prettier/typecheck/lint. Correr `pnpm prettier --write libs && pnpm verify` primero (también cubre T-010, que tampoco se había verificado).
- No exportado aún desde `src/index.ts` (la API pública se decide con T-003/T-004).
- Siguiente paso: verificar lo anterior; T-012 (#8) debe producir los `ArticleCandidate` desde el DOM (conteo sin descendientes excluidos RN-02).
