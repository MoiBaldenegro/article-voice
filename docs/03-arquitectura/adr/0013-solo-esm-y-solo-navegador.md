# ADR-0013 · Paquete solo ESM y solo para navegador

- **Estado:** Aceptado · **Reemplaza a:** [ADR-0003](0003-typescript-estricto-y-build-dual.md) en lo relativo a la salida dual
- **Fecha:** 2026-11-20

## Contexto

ADR-0003 eligió la salida dual ESM + CJS para no dejar fuera a proyectos CommonJS, y dejó una
señal de revisión: "si el ecosistema objetivo ya es solo ESM". Con el producto definido, se cumple:
un Custom Element con un Web Worker y WebAssembly solo se ejecuta en un navegador, y todo
navegador y todo bundler actual consumen ESM. CommonJS es un formato de Node.

## Decisión

- La salida es **solo ESM** (`dist/*.js`) con sus `.d.ts`. Sin `.cjs`.
- Sigue en pie todo lo demás de ADR-0003: TypeScript estricto, tsup, publint y attw.
- `exports` de `package.json`: `"."` (registra el elemento y exporta la API), `"./auto"` (inserta
  el botón solo; ver contrato) y `"./worker"` (el worker de inferencia, para quien lo aloje en su
  propio servidor).
- Se publica también un **bundle listo para CDN** (`dist/cdn/article-voice.js`, ESM autocontenido)
  para quien usa HTML sin bundler: `<script type="module" src="https://cdn.jsdelivr.net/npm/article-voice@X.Y.Z/dist/cdn/article-voice.js">`.
- `engines` no declara Node; la compatibilidad se declara por navegador ([RNF-COMP](../../02-requisitos/requisitos-no-funcionales.md)).

## Alternativas consideradas

| Opción | Por qué no |
| --- | --- |
| Mantener ESM + CJS | Un `require()` del paquete nunca podría funcionar: no hay DOM ni Web Audio en Node |
| UMD para `<script>` clásico | Los navegadores objetivo ya soportan `type="module"` |

## Consecuencias

- La "prueba del paquete" (`test/package`) instala el tarball en un proyecto con Vite y en una
  página HTML sin bundler, y las abre en un navegador real (ADR-0017).
- Importar el paquete en Node (por ejemplo en SSR) no debe fallar: el módulo comprueba
  `typeof customElements` antes de registrar el elemento.
