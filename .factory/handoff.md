# Handoff

- Hecho (constructor, issue #2): esqueleto con package.json, tsconfig estricto, Jest (ts-jest), ESLint flat con reglas de capas (no-restricted-imports por carpeta), Prettier, `libs/reader` con ValueObject, errores base y `createCore` vacío; README con sección Desarrollo.
- Estado: `pnpm install && pnpm verify` en verde (5 tests). Comprobado a mano que un import domain -> reader-core hace fallar `pnpm lint`.
- Pendiente: no hay test automático de la violación de capas; no hay `src/` aún.
- Siguiente paso: los issues abiertos (#4 value objects, #9 API Extractor, #3 informe del spike).
