# ADR-0008 · Trunk-based development y Conventional Commits

- **Estado:** Aceptado
- **Fecha:** 2026-11-20
- **Relacionados:** [Branching y commits](../../05-estandares/branching-y-commits.md)

## Contexto

Un solo paquete, un equipo chico y contribuciones externas por fork. GitFlow añade ramas de larga
vida (`develop`, `release/*`) que aquí no aportan: la estabilidad la da CI y la versión la da
Changesets (ADR-0007).

## Decisión

- `main` siempre publicable. Ramas cortas (`feat/…`, `fix/…`, `docs/…`) que viven días, no semanas.
- Fusión por **squash**; el título del PR debe ser un Conventional Commit válido (lo verifica CI).
- `main` protegida: PR obligatorio, CI verde, 1 aprobación, historia lineal, sin force push.

## Alternativas consideradas

| Opción | Por qué no |
| --- | --- |
| GitFlow | Ramas de larga vida y fusiones grandes para un solo paquete |
| Merge commits | Historia ruidosa; squash deja un commit por cambio, fácil de revertir |

## Consecuencias

- Revertir un cambio es revertir un commit.
- Lo que no está listo para usuarios se esconde detrás de una opción no documentada o no se
  exporta, en lugar de vivir en una rama larga.
