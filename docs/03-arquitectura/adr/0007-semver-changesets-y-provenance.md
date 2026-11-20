# ADR-0007 · SemVer, Changesets y publicación con provenance desde CI

- **Estado:** Aceptado
- **Fecha:** 2026-11-20
- **Relacionados:** [CI/CD](../../07-operacion/ci-cd.md), [Runbooks](../../07-operacion/runbooks.md)

## Contexto

Quien depende del paquete confía en que una versión menor no le rompa nada y en que lo que instala
salió de este repo. Las publicaciones manuales desde una laptop son la causa clásica de versiones
rotas y de ataques a la cadena de suministro.

## Decisión

- **SemVer estricto** sobre la [API pública](../../04-diseno/contrato-api-publica.md). Antes de 1.0.0,
  los cambios incompatibles suben la versión menor.
- **Changesets**: cada PR que cambie el comportamiento publicado incluye un archivo
  `.changeset/*.md` con el tipo de cambio y la nota para el CHANGELOG.
- **Solo CI publica**: GitHub Actions publica con **npm Trusted Publishing (OIDC)** y
  `--provenance`. No existe token de npm en ninguna máquina ni en secretos de larga duración.
- Cuenta de npm con 2FA obligatoria; el paquete exige 2FA para cambios de configuración.
- Etiquetas de distribución: `latest` (estable) y `next` (prereleases `x.y.z-next.N`).

## Alternativas consideradas

| Opción | Por qué no |
| --- | --- |
| semantic-release (versión deducida de los commits) | Acopla la versión al texto del commit; Changesets hace explícita la intención en el PR |
| Publicar a mano con `npm publish` | Sin provenance, sin revisión y con token en una máquina |
| Token de npm en secretos de GitHub | Credencial de larga duración; Trusted Publishing la elimina |

## Consecuencias

- Una versión siempre corresponde a un commit de `main` y a una ejecución de CI auditable.
- El CHANGELOG se genera solo, a partir de los changesets.
- Si una versión sale mal: [runbook de publicación](../../07-operacion/runbooks.md#rb-01--versión-rota-publicada).
