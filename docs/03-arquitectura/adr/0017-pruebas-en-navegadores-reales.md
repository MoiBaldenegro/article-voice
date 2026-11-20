# ADR-0017 · Pruebas de componente y de extremo a extremo con Playwright en navegadores reales

- **Estado:** Aceptado · **Complementa a:** [ADR-0004](0004-pruebas-con-jest.md)
- **Fecha:** 2026-11-20

## Contexto

Jest con jsdom sirve para el dominio y los casos de uso, pero no tiene Web Audio, Web Workers
reales, WebGPU, WebAssembly con hilos, Shadow DOM completo ni la CSS Custom Highlight API. Probar el
componente ahí daría falsa confianza.

## Decisión

- **Jest** (ADR-0004) sigue para `libs/**` y para los adaptadores que no dependen del navegador.
- **Playwright** para lo que necesita navegador real, en Chromium, Firefox y WebKit:
  - **componente:** el elemento en páginas de prueba (`test/fixtures/*.html`) con un motor falso
    determinista que genera tonos (así no se descarga el modelo en cada prueba);
  - **accesibilidad:** `@axe-core/playwright` sobre cada estado del componente;
  - **paquete:** el tarball instalado en Vite y en HTML sin bundler (ADR-0013);
  - **inferencia real:** con el modelo, solo en un job nocturno con caché de los pesos, no en cada PR.
- Las pruebas de Playwright viven en `test/e2e/` (prueban el paquete armado, no un archivo suelto).

## Consecuencias

- CI instala los navegadores de Playwright (con caché).
- WebGPU no está disponible en los runners sin GPU: la inferencia real nocturna usa WASM y los números
  de WebGPU se miden en el hardware de referencia manualmente antes de cada versión mayor.
