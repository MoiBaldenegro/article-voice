# Handoff

- Issue #11 (T-015) hecho: puerto `ArticleSource` (`core/domain/outbound/ArticleSource.port.ts`, tipos ContentBlock/ExtractedArticle; DomArticleSource lo cumple estructuralmente), entidad `Article` (truncado RN-12, `estimatedDuration(rate, wpm)`, DEFAULT_WPM=150) y `DetectArticle` en `core/application/DetectArticle.use-case.ts` (lanza ResourceNotFoundError AV_ARTICLE_NOT_FOUND, DomainValidationError AV_ARTICLE_TOO_SHORT / AV_UNSUPPORTED_LANGUAGE; aviso AV_INPUT_TOO_LARGE en `warnings`). Exportado en `libs/reader/src/index.ts`.
- `pnpm verify` verde (225 tests).
- Siguiente paso: T-022 (reproducción/PlayNarration) y conectar DetectArticle con createCore; #9 y #10 ya planeados. Pendiente: wpm por voz aún es parámetro, sin dato de voz real; DomArticleSource aún define sus propios tipos ContentBlock (duplicados con el puerto).
