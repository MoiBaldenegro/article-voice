# ADR-0009 · API pública mínima, con un solo punto de entrada y reporte verificado

- **Estado:** Aceptado
- **Fecha:** 2026-11-20
- **Relacionados:** [Contrato de la API pública](../../04-diseno/contrato-api-publica.md), ADR-0007

## Contexto

En una librería, **el contrato es lo exportado**. Todo lo que se exporta se vuelve una promesa
SemVer: cambiarlo es un cambio mayor. En 06, `index.ts` reexporta todo el núcleo porque solo lo
consume la propia app; aquí eso convertiría cada detalle interno en contrato público.

## Decisión

- Un único punto de entrada: `src/index.ts`. Los subpaths de `exports` se agregan solo con ADR.
- Se exporta lo mínimo: la función de creación, los tipos de sus opciones y resultados, y las
  clases de error públicas. **Las entidades, los casos de uso y los adaptadores no se exportan.**
- **API Extractor** genera `etc/<paquete>.api.md` (el reporte de la API). Se commitea y CI falla
  si el reporte cambia sin que el PR lo incluya: así ningún cambio del contrato pasa inadvertido.
- Todo lo exportado lleva TSDoc con ejemplo; lo `@beta` o `@internal` se marca así.

## Alternativas consideradas

| Opción | Por qué no |
| --- | --- |
| Reexportar todo como en 06 | Cada detalle interno se vuelve contrato |
| Revisar el contrato a ojo | Los cambios accidentales de tipos son fáciles de no ver |

## Consecuencias

- El diff de `etc/*.api.md` en un PR muestra exactamente qué cambia para los usuarios.
- Hace falta un paso extra (`pnpm api:update`) cuando el cambio de contrato es intencional.
