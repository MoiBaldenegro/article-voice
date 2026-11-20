# Onboarding: de cero a correr el proyecto en menos de una hora

- **Estado:** Aprobado (los comandos existirán al crear el esqueleto de código)

## Requisitos

- Node.js LTS (la versión de `.nvmrc`), solo para las herramientas de desarrollo: el paquete corre en el navegador.
- Corepack (incluido en Node): `corepack enable`. Instala el pnpm fijado en `package.json`.
- Git.

## Pasos

```bash
git clone <repo> && cd <repo>
corepack enable
pnpm install            # con el lockfile; no actualiza dependencias
pnpm verify             # todo lo que corre CI, en local
```

## Scripts

| Script | Qué hace |
| --- | --- |
| `pnpm test` | Pruebas unitarias, de casos de uso e integración |
| `pnpm test:watch` | Igual, en modo observador |
| `pnpm test:package` | Empaqueta y prueba `dist/` como lo usaría alguien (Vite y HTML sin bundler) |
| `pnpm lint` / `pnpm format` | ESLint (incluye reglas de capas) / Prettier |
| `pnpm typecheck` | `tsc --noEmit` de todo el repo |
| `pnpm build` | tsup → `dist/` |
| `pnpm api:check` / `pnpm api:update` | Compara / regenera `etc/*.api.md` |
| `pnpm size` | size-limit |
| `pnpm changeset` | Registra un cambio para la próxima versión |
| `pnpm verify` | `lint` + `typecheck` + `test` + `build` + `api:check` + `size` |

## Recorrido sugerido para entender el código (30 min)

1. [Visión](../01-producto/vision.md) y [glosario](../01-producto/glosario.md).
2. [ADR-0002](../03-arquitectura/adr/0002-arquitectura-hexagonal-como-05-y-06.md) y [arquitectura interna](../05-estandares/arquitectura-interna.md).
3. `src/index.ts` → `src/create-<ctx>.ts` → `libs/<ctx>/src/<ctx>-core.ts`: de la API pública al núcleo.
4. Un caso de uso y su spec en `core/application/use-cases/**/tests`.

## Primer aporte

Busca issues con la etiqueta `good first issue`.
