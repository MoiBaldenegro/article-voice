# Pipeline de CI/CD

- **Estado:** Aprobado · **Base:** [ADR-0007](../03-arquitectura/adr/0007-semver-changesets-y-provenance.md)

## Flujo

```mermaid
flowchart LR
  PR[PR] --> CI{ci.yml}
  CI -->|verde + revisión| M[main]
  M --> R[release.yml]
  R -->|hay changesets| VPR[PR "Version Packages"]
  VPR -->|se fusiona| R2[release.yml]
  R2 --> PUB[npm publish --provenance<br/>Trusted Publishing]
  PUB --> GHR[GitHub Release + tag]
  PUB --> SMOKE[Humo: instalar desde npm]
```

## `ci.yml` (cada PR y cada push a `main`)

| Etapa | Qué valida | Falla si… |
| --- | --- | --- |
| 1. Setup | `pnpm install --frozen-lockfile` | El lockfile no coincide |
| 2. Título del PR | commitlint sobre el título | No es Conventional Commit |
| 3. Formato y lint | Prettier, ESLint, reglas de capas | Hay errores |
| 4. Tipos | `tsc --noEmit` | Hay errores |
| 5. Pruebas | Jest con cobertura + Playwright en Chromium, Firefox y WebKit | Falla una prueba o la cobertura baja |
| 6. Build | tsup | No compila |
| 7. Contrato | `api-extractor` compara `etc/*.api.md` | El contrato cambió sin actualizar el reporte |
| 8. Empaquetado | publint, `@arethetypeswrong/cli`, `test:package` (Vite y HTML sin bundler) | El paquete no es consumible |
| 9. Tamaño | size-limit | Se excede el presupuesto |
| 10. Seguridad | `pnpm audit --prod`, revisión de licencias, CodeQL (semanal y en PR) | Vulnerabilidad alta o licencia incompatible |
| 11. Changeset | Si cambia `src/` o `libs/`, hay changeset (o etiqueta `no-release`) | Falta |

## `release.yml` (push a `main`)

- `changesets/action`: si hay changesets, abre o actualiza el PR **Version Packages**
  (sube versiones y escribe el CHANGELOG).
- Al fusionar ese PR: build, `npm publish --provenance --access public` con **OIDC** (permisos
  `id-token: write`, sin token), tag `vX.Y.Z` y GitHub Release con las notas.
- Prueba de humo: en un job limpio, `npm install <paquete>@X.Y.Z` y ejecutar el ejemplo del README.

## Endurecimiento del pipeline

- Acciones de terceros fijadas por **SHA** completo, actualizadas por Dependabot.
- `permissions` mínimos por job (por defecto `contents: read`).
- El job de publicación corre solo en `main` y en el entorno protegido `npm-publish`.
- Dependabot semanal para `devDependencies` y GitHub Actions.

## `nightly.yml` (cada noche y a demanda)

Corre `verify`, `api:check` y `size`. Si hay changesets pendientes, publica una versión snapshot
(`0.0.0-nightly-AAAAMMDD…`) con la etiqueta `next`, vía Trusted Publishing y provenance. Sin changesets
pendientes no publica nada.

## Cómo publicar `0.0.1-next.0` (primera prerelease)

Configuración única (la hace una persona con acceso al paquete):

1. En npmjs.com → paquete `article-voice` → Settings → **Trusted Publisher**: GitHub Actions,
   repositorio `MoiBaldenegro/article-voice`, workflow `release.yml` (y `nightly.yml`), entorno `npm-publish`.
   Si el paquete aún no existe, la primera publicación debe hacerse una vez a mano para crearlo.
2. En GitHub → Settings → Environments: crear `npm-publish` (solo rama `main`).
3. Settings → Actions → General: permitir que Actions cree PRs.

Publicación:

1. En una rama: `pnpm changeset pre enter next`, luego `pnpm changeset` (patch, nota para el
   usuario). Commit de `.changeset/` y PR.
2. Al fusionar a `main`, `release.yml` abre el PR **Version Packages**, que sube la versión a
   `0.0.1-next.0` y escribe el CHANGELOG.
3. Al fusionar ese PR, `release.yml` hace build y `changeset publish` con la etiqueta `next`
   (provenance, sin token), crea el tag `v0.0.1-next.0` y corre la prueba de humo.
4. Verificar: `npm view article-voice dist-tags` muestra `next: 0.0.1-next.0`.
5. Para salir de prerelease: `pnpm changeset pre exit` en un PR.

Validar los workflows en local: `actionlint .github/workflows/*.yml`.
