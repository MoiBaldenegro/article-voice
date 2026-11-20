# Arquitectura (resumen operativo)

Resumen para agentes. Fuente de verdad: [SAD](03-arquitectura/sad.md), [ADRs](03-arquitectura/adr/README.md),
[arquitectura interna](05-estandares/arquitectura-interna.md) y [visión](01-producto/vision.md).

## Qué es
Custom Element `<article-voice>` (ESM, solo navegador) que detecta el artículo de la página y lo lee con
MOSS-TTS-Nano ejecutado en el navegador (Web Worker + onnxruntime-web, WebGPU → WASM), con respaldo a
`speechSynthesis`. Una sola dependencia de runtime, diferida (ADR-0010, ADR-0015).

## Stack
TypeScript estricto, pnpm, tsup (ESM + bundle CDN), Jest (unitarias), Playwright (navegador real, ADR-0017),
ESLint con reglas de capas, Prettier, API Extractor, Changesets. Hexagonal (ADR-0002).

## Estructura objetivo
```
libs/reader/src/core/{domain,application}   # núcleo puro, sin DOM ni E/S
libs/reader/src/{reader-core.ts,reader.tokens.ts}
src/{index.ts,auto.ts,create-reader.ts,config/}
src/ui/            # ArticleVoiceElement, plantilla, i18n es/en
src/infrastructure/{dom,audio,engines,storage,device}/
src/worker/        # runtime MOSS portado (tokenizador, prefill/decode, códec)
test/package/      # prueba del paquete publicado
etc/article-voice.api.md
spikes/t000-moss-browser/   # código desechable del spike (no se reutiliza tal cual)
```
Reglas de dependencia entre capas: ver tabla en `05-estandares/arquitectura-interna.md`.

## Estado actual (2026-11-20)
Solo existe documentación, landing (GitHub Pages) y el spike T-000 (código en `spikes/`, **sin informe**
`docs/03-arquitectura/spikes/T-000-informe.md` ni ADR-0018 aceptado). **No hay package.json raíz, ni
tests, ni CI de código.**

## Cómo correr y probar (objetivo tras T-001/T-002)
```
pnpm install
pnpm verify      # lint + typecheck + test + build
pnpm test        # Jest
pnpm test:e2e    # Playwright
```
Spike: ver `spikes/t000-moss-browser/README.md`.
