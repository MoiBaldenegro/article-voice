# Backlog

- **Estado:** En revisión · **Fecha:** 2026-11-20 · Orden = prioridad

Cada tarea sigue la [plantilla](plantilla-de-ticket.md). Las que tienen detalle completo están en
[`tickets/`](tickets/).

## Épica S · Validar la viabilidad (antes de todo)

| ID | Tarea | Estado | Criterio de salida |
| --- | --- | --- | --- |
| [T-000](tickets/T-000-spike-moss-en-el-navegador.md) | **Spike:** MOSS-TTS-Nano en el navegador, medido | ✅ Hecho (CA-5 parcial) | Informe con números; ADR-0018 aceptado |

## Épica 0 · Esqueleto del proyecto

| ID | Tarea | Criterio de salida |
| --- | --- | --- |
| T-001 | Estructura de [arquitectura interna](../05-estandares/arquitectura-interna.md) con `libs/reader`, `ValueObject`, errores base, `createCore` vacío | `pnpm verify` en verde |
| T-002 | Herramientas: TS estricto, tsup (ESM + CDN), Jest, Playwright, ESLint con reglas de capas, Prettier | Una violación de capas a propósito hace fallar el lint |
| T-003 | API Extractor y `etc/article-voice.api.md` | Cambiar un tipo exportado hace fallar `api:check` |
| T-004 | Prueba del paquete (Vite + HTML sin bundler en Playwright), publint, attw, size-limit | Corre en CI |
| T-005 | `ci.yml`, `release.yml`, `nightly.yml` con Changesets y Trusted Publishing | `0.0.1-next.0` publicada con provenance |
| T-006 | Comunidad: `NOTICE`, plantillas, protección de `main`, Dependabot | Revisado con el checklist |

## Épica 1 · Detectar y preparar el texto (0.1.0)

| ID | Tarea | Historias |
| --- | --- | --- |
| T-010 | VOs: `Language`, `PlaybackRate`, `EngineKind`, `HttpsUrl`, `MinWords`, `VoiceId` | — |
| T-011 | `ArticleDetector` (puro) con puntuación de densidad + corpus de páginas | HU-01 |
| T-012 | `DomArticleSource` (adaptador) con exclusiones RN-02 y `BlockRef` | HU-01, HU-02 |
| T-013 | `TextNormalizer` es/en (RN-11) | HU-03 |
| T-014 | `Segmenter` (RN-05) con `TextSpan` | HU-03 |
| T-015 | `DetectArticle.use-case` + duración estimada | HU-01, HU-02 |

## Épica 2 · Narración (0.1.0)

| ID | Tarea | Historias |
| --- | --- | --- |
| T-020 | Entidad `Narration` + máquina de estados | HU-04, HU-05 |
| T-021 | Puertos `SpeechEngine`, `AudioOutput`, `ModelStore`, `DeviceCapabilities` + dobles + suites de contrato | — |
| T-022 | `PlayNarration`, `Pause/Resume/Stop`, `SeekNarration`, `NarrationRegistry` | HU-04, HU-05, HU-08 |
| T-023 | `WebAudioOutput` con AudioWorklet y contador de underruns | HU-04 |

## Épica 3 · Motor MOSS en el navegador (0.1.0)

| ID | Tarea | Historias |
| --- | --- | --- |
| T-030 | Runtime del worker (a partir del spike): tokenizador, prefill/decode, códec en streaming | HU-04 |
| T-031 | `MossBrowserEngine` + protocolo de mensajes tipado | HU-04 |
| T-032 | `CacheModelStore` con manifiesto, SHA-256, progreso, cancelación y reanudación | HU-06, HU-07 |
| T-033 | `PrepareEngine.use-case` con confirmación (RN-15) y `clearModelCache()` | HU-06, HU-07 |

## Épica 4 · El elemento (0.1.0)

| ID | Tarea | Historias |
| --- | --- | --- |
| T-040 | Maqueta aprobada de todos los estados (artifact) | — |
| T-041 | `ArticleVoiceElement`: plantilla, atributos → config, eventos, métodos | HU-16 |
| T-042 | Estados visuales, i18n es/en, accesibilidad | HU-09 |

## Épicas siguientes (0.2.0 → 1.0.0)

T-050 `WebSpeechEngine` + `SelectEngine` (HU-10) · T-051 `MossServerEngine` (HU-11) ·
T-052 resaltado con Highlight API (HU-12) · T-053 velocidad y voz con preferencias (HU-13) ·
T-054 tematización y partes (HU-14) · T-055 `article-voice/auto` (HU-15) · T-056 ejemplos por
framework · T-057 Media Session (HU-17) · T-058 README completo y sitio de demostración.
