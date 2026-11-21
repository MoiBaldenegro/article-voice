# Handoff

- T-005 hecho (#24): Changesets (`.changeset/config.json`, scripts `changeset` y `release`, `@changesets/cli`), `.github/workflows/release.yml` (PR Version Packages + publicación OIDC con provenance + prueba de humo) y `nightly.yml` (verify + snapshot a `next` si hay changesets). actionlint 1.7.7 sin errores (binario en `temp/`, ignorado). Paquete ya no es `private`; añadidos `repository` y `publishConfig`.
- Documentado en `docs/07-operacion/ci-cd.md` cómo publicar `0.0.1-next.0`. `pnpm verify` y `package:lint` OK.
- Siguiente paso (persona): configurar Trusted Publisher en npm, entorno `npm-publish` y permitir PRs de Actions; luego seguir la guía. Falta aún el job de CI "Changeset" (etapa 11).
