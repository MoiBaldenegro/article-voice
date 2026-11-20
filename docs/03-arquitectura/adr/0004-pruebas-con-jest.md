# ADR-0004 · Pruebas con Jest y ts-jest, junto al código

- **Estado:** Aceptado
- **Fecha:** 2026-11-20
- **Relacionados:** [Estrategia de pruebas](../../06-calidad/estrategia-de-pruebas.md)

## Contexto

05 y 06 usan Jest + ts-jest, con las pruebas en carpetas `tests/` junto al código y un
`moduleNameMapper` que quita el `.js` de los imports. Mantener el mismo motor permite mover
conocimiento y patrones (dobles en memoria de cada puerto) entre proyectos.

## Decisión

- Jest + ts-jest, misma configuración base que 06.
- Unitarias y de casos de uso en `**/tests/*.spec.ts` junto al código.
- Pruebas del paquete compilado (consumirlo como lo haría un usuario, en ESM y CJS) en
  `test/package/`, fuera de `src`, porque prueban `dist/` y no el código fuente.

## Alternativas consideradas

| Opción | Por qué no |
| --- | --- |
| Vitest | Más rápido y ESM nativo, pero rompe la consistencia con 05/06. Se reconsidera si ts-jest + ESM da fricción real |
| `node:test` | Sin mocks ni cobertura integrados al nivel de Jest |

## Consecuencias

- Las mismas convenciones de nombres y dobles que en 06.
- Señal de revisión: si configurar ESM en Jest cuesta más de lo que aporta la consistencia.
