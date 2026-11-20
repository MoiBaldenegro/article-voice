# Guía de estilo y convenciones

- **Estado:** Aprobado

Lo que se puede automatizar, se automatiza: **Prettier** formatea y **ESLint** (typescript-eslint
`strict-type-checked`) marca el resto. Esta guía cubre lo que las herramientas no deciden.

## Formato (Prettier)

`printWidth: 110`, comillas simples, `trailingComma: all`, punto y coma, 2 espacios. Igual que 05/06.
No se discute en revisión: si Prettier lo aceptó, está bien.

## Nombres

| Elemento | Convención | Ejemplo |
| --- | --- | --- |
| Archivo de entidad / VO / puerto / caso de uso | PascalCase + sufijo | `Order.entity.ts`, `OrderId.vo.ts`, `Clock.port.ts`, `PlaceOrder.use-case.ts` |
| Archivo de adaptador o utilidad de infraestructura | kebab-case | `fs-order-store.ts` |
| Clases, tipos, interfaces | PascalCase, **sin** prefijo `I` | `OrderRepository` |
| Variables y funciones | camelCase, verbos para funciones | `placeOrder`, `isExpired` |
| Constantes de módulo inmutables | SCREAMING_SNAKE_CASE | `MAX_ITEMS` |
| Tokens de puertos | SCREAMING_SNAKE_CASE, `Symbol` | `ORDER_REPOSITORY` |
| Códigos de error | SCREAMING_SNAKE_CASE, prefijo del contexto | `AV_INVALID_OPTION` |
| Booleanos | `is/has/can/should` | `hasExpired` |

**Idioma:** identificadores y API pública en **inglés** (es un paquete público en npm). Comentarios,
documentación interna y mensajes de commit en **español**, como en el resto del repo. Los términos
del dominio usan exactamente la traducción fijada en el [glosario](../01-producto/glosario.md).

## Tipos

- `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` (ADR-0003).
- Preferir `readonly` en propiedades y `ReadonlyArray`/`readonly T[]` en parámetros.
- Uniones de literales con `as const` en lugar de `enum`.
- `unknown` en las fronteras; se convierte a tipo de dominio con un VO.
- `import type` para lo que solo es tipo (`verbatimModuleSyntax`).

## Funciones y clases

- Una responsabilidad por archivo. Si un archivo pasa de ~250 líneas, probablemente son dos.
- Parámetros: máximo 3 posicionales; más, un objeto con nombre.
- Sin efectos al importar un módulo.
- `async`/`await`, nunca `.then` encadenado salvo para encadenar escrituras ordenadas (patrón de 06).

## Comentarios y TSDoc

- Los comentarios explican **por qué**, no qué.
- Todo lo exportado públicamente lleva TSDoc con descripción, `@param`, `@returns`, `@throws`
  (con el código de error) y un `@example` que compile.
- `// TODO` solo con issue: `// TODO(#123): …`.
