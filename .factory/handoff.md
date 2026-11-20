# Handoff

- Issue #8 (T-012) hecho: `src/infrastructure/dom/DomArticleSource.ts` (+ spec con jsdom y `fixtures/blog.html`). API: `candidates(explicitId?)` → `ArticleCandidate[]` para `ArticleDetector`; `extract(candidateId)` → `{title, language, blocks[{ref,role,text}], wordCount}`; `resolve(ref)` → `Element | undefined` (WeakRef). Exclusiones RN-02 + publicidad (tokens de class/id, `data-ad*`, ins/iframe) + invisibles por `getComputedStyle`.
- `libs/reader/src/index.ts` ahora exporta `ArticleDetector`, `MinWords`, tipos de detección y `BlockRef/Segment/TextSpan`. Devdeps nuevas: jest-environment-jsdom@29, @types/jsdom, @types/node; tsconfig `types` incluye `node`. Specs DOM usan `@jest-environment jsdom` en el docblock.
- `pnpm verify` verde (217 tests).
- Siguiente paso: T-015 (`DetectArticle.use-case` + duración estimada) usando DomArticleSource, y T-022. #9 y #10 ya planeados.
