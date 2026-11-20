# Branching y commits

- **Estado:** Aprobado · **Base:** [ADR-0008](../03-arquitectura/adr/0008-trunk-based-y-conventional-commits.md), [ADR-0007](../03-arquitectura/adr/0007-semver-changesets-y-provenance.md)

## Ramas

- `main`: siempre publicable y protegida.
- Ramas de trabajo cortas desde `main`: `feat/<tema>`, `fix/<tema>`, `docs/<tema>`, `chore/<tema>`,
  `refactor/<tema>`, `test/<tema>`.
- Contribuciones externas: fork + PR contra `main`.
- Se fusiona con **squash**. La rama se borra al fusionar.

## Conventional Commits

```text
<tipo>(<ámbito opcional>): <resumen en imperativo, minúsculas, sin punto>

<cuerpo opcional: el porqué>

<pie opcional: BREAKING CHANGE: …, Refs #123>
```

| Tipo | Uso | ¿Necesita changeset? |
| --- | --- | --- |
| `feat` | Funcionalidad nueva para el usuario | Sí (minor) |
| `fix` | Corrige un comportamiento publicado | Sí (patch) |
| `perf` | Mejora de rendimiento sin cambiar el contrato | Sí (patch) |
| `refactor` | Cambio interno sin efecto observable | No |
| `docs` | Solo documentación | No (salvo README publicado: patch) |
| `test` | Solo pruebas | No |
| `build` / `ci` / `chore` | Herramientas, pipeline, mantenimiento | No |

Un cambio incompatible lleva `!` (`feat!: …`) y `BREAKING CHANGE:` en el pie, y su changeset es
`major` (o `minor` mientras la versión sea `0.x`).

Lo valida CI: el título del PR (que será el commit de squash) pasa por commitlint.

## Changesets

```bash
pnpm changeset   # elige patch/minor/major y escribe la nota en lenguaje de usuario
```

La nota describe el efecto para quien usa el paquete, no el detalle interno.
