# ADR-0003 · TypeScript estricto y paquete dual ESM + CJS con tsup

- **Estado:** Reemplazado en parte por [ADR-0013](0013-solo-esm-y-solo-navegador.md) (la salida dual ESM + CJS; el resto sigue vigente)
- **Fecha:** 2026-11-20

## Contexto

Un paquete público lo consumen proyectos con ESM, con CommonJS y con TypeScript. Si falla uno de
los tres, el paquete "no funciona" para esa persona. 05 y 06 usan webpack porque son aplicaciones;
para una librería, webpack no genera tipos ni salida dual de forma natural.

## Decisión

- TypeScript con `strict: true`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` y
  `verbatimModuleSyntax`.
- Se empaqueta con **tsup**: salida ESM (`.js`) y CJS (`.cjs`), declaraciones `.d.ts`/`.d.cts`,
  source maps y sin minificar.
- `package.json` con `"type": "module"`, `exports` condicionales (`import`, `require`, `types`),
  `files` explícito y `sideEffects: false`.
- La compatibilidad se verifica en CI con **publint** y **@arethetypeswrong/cli** antes de publicar.

## Alternativas consideradas

| Opción | Por qué no |
| --- | --- |
| webpack (como 05/06) | Pensado para apps; los tipos y la salida dual requieren configuración extra |
| Solo `tsc` | Dos compilaciones a mano y extensiones a mano para CJS |
| Solo ESM | Deja fuera a proyectos CommonJS todavía comunes; se revisa en la v2 |
| Rollup | Funciona, pero tsup lo resuelve con menos configuración |

## Consecuencias

- Un comando (`pnpm build`) produce todo lo publicable en `dist/`.
- Señal de revisión: si publint o attw marcan problemas recurrentes, o si el ecosistema objetivo
  ya es solo ESM, proponer ADR para pasar a solo ESM.
