# Arquitectura (resumen operativo)

Resumen para agentes. Fuente de verdad: [SAD](03-arquitectura/sad.md), [ADRs](03-arquitectura/adr/README.md),
[arquitectura interna](05-estandares/arquitectura-interna.md) y [visión](01-producto/vision.md).

## Qué es
Custom Element `<article-voice>` (ESM, solo navegador) que detecta el artículo de la página y lo lee con
voz neuronal MOSS-TTS-Nano generada por el servidor del propio sitio (`moss-server`, `POST /v1/audio/speech`),
con respaldo automático a `speechSynthesis` (`web-speech`) y aviso visible. `moss-browser` (MOSS en el
navegador) es experimental y opt-in: no cumple RTF<1 (mejor 1,18 en WASM+worker; ADR-0018). Cero dependencias
de runtime salvo onnxruntime-web diferido para el motor experimental (ADR-0010, ADR-0015).

## Stack
TypeScript estricto, pnpm, tsup (ESM + bundle CDN), Jest (unitarias), Playwright (navegador real, ADR-0017),
ESLint con reglas de capas, Prettier, API Extractor, Changesets, publint/attw, size-limit. Hexagonal (ADR-0002). Node >= 22.

## Estructura
```
libs/reader/src/core/{domain,application}   # núcleo puro: detector, normalizador, segmentador, Narration, casos de uso, puertos
libs/reader/src/{index.ts,core-api.ts}      # index = elemento + registro; core-api = API del núcleo
libs/reader/src/ui/                         # ArticleVoiceElement, i18n es/en (no importa infrastructure)
libs/reader/src/infrastructure/             # DomArticleSource, WebAudioOutput, motores (moss-server, web-speech, SelectEngine)
libs/reader/src/compose.ts                  # cableado real
test/{package,landing,audio,a11y}/          # pruebas Playwright
etc/article-voice.api.md                    # API pública (api:check)
spikes/t000-moss-browser/                   # spike desechable; informe en docs/03-arquitectura/spikes
```

## Estado (2026-11-21)
Hecho: esqueleto, detección, normalización, segmentación, narración, motores `moss-server` y `web-speech`,
`SelectEngine` con respaldo, `WebAudioOutput`, elemento con estados/i18n/a11y, CI y release (publicación npm
opt-in), landing con audio. Falta para el MVP 0.1.0: README real, prueba de integración extremo a extremo
con servidor falso, resaltado de la frase, preferencias de velocidad/voz, comunidad (Dependabot), demo.

## Cómo correr y probar
```
pnpm install
pnpm verify        # typecheck + lint + prettier --check + jest
pnpm build         # dist/index.js + d.ts
pnpm api:check     # API pública (pnpm api:extract para regenerar y commitear)
pnpm test:package  # Playwright: paquete sin bundler (requiere `playwright install chromium`)
pnpm test:audio / test:a11y / test:landing
pnpm size
```
Spike: ver `spikes/t000-moss-browser/README.md`.
