# Backlog

- **Estado:** En revisión · **Fecha:** 2026-11-20 · Orden = prioridad
- **Replanificado (issue #13):** según el informe T-000 y la medición de q4 (#10), MOSS no llega a tiempo real en el navegador (RTF 1,93 WASM oficial, 5,5 q4 WebGPU, 10,6 WebGPU oficial). [ADR-0018](../03-arquitectura/adr/0018-variante-del-modelo-y-entrega-de-pesos.md): `engine="auto"` no elige `moss-browser`. La 0.1.0 funciona **sin** el motor en el navegador: `moss-server` primero y `web-speech` como respaldo. La escucha ciega (CP-SPIKE-3, #12) no bloquea nada de esto.

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

Checklist de T-006 (revisado en #36):

- [x] `LICENSE`, `NOTICE` (atribución a MOSS-TTS-Nano, Apache-2.0), `CODE_OF_CONDUCT.md`
- [x] `CONTRIBUTING.md` (comandos corregidos: `pnpm verify`, `pnpm api:extract`) y `SECURITY.md`
- [x] Plantillas de issue y de PR en `.github/`
- [x] `.github/dependabot.yml`: npm y github-actions, semanal, agrupado
- [ ] **Pendiente humano:** protección de `main` (PR obligatorio, checks de CI requeridos, sin force-push). Solo el dueño del repo puede configurarla en Settings → Branches.

## Épica 1 · Detectar y preparar el texto (0.1.0)

| ID | Tarea | Historias |
| --- | --- | --- |
| T-010 | VOs: `Language`, `PlaybackRate`, `EngineKind`, `HttpsUrl`, `MinWords`, `VoiceId` | — |
| T-011 | `ArticleDetector` (puro) con puntuación de densidad + corpus de páginas | HU-01 |
| T-012 | `DomArticleSource` (adaptador) con exclusiones RN-02 y `BlockRef` | HU-01, HU-02 |
| T-013 | `TextNormalizer` es/en (RN-11) | HU-03 |
| T-014 | `Segmenter` (RN-05) con `TextSpan` | HU-03 |
| T-015 | `DetectArticle.use-case` + duración estimada | HU-01, HU-02 |

## Orden de la 0.1.0 (replanificado)

1. **Detección, estado y UI** (Épicas 1, 2 y 4): no dependen del motor.
2. **`moss-server`** (Épica 3): adaptador de `POST /v1/audio/speech`, con streaming y `AV_SERVER_ERROR`.
3. **`web-speech`** (Épica 3): respaldo automático con aviso visible.
4. **`moss-browser`** (Épica 6): experimental, solo con `engine="moss-browser"`; investigación aparte.

## Épica 2 · Narración (0.1.0)

| ID | Tarea | Historias |
| --- | --- | --- |
| T-020 | Entidad `Narration` + máquina de estados (✅ hecho) | HU-04, HU-05 |
| T-021 | Puertos `SpeechEngine`, `AudioOutput`, `ModelStore`, `DeviceCapabilities` + dobles + suites de contrato (✅ hecho) | — |
| T-022 | `PlayNarration`, `Pause/Resume/Stop`, `SeekNarration`, `NarrationRegistry` | HU-04, HU-05, HU-08 |
| T-023 | `WebAudioOutput` con AudioWorklet y contador de underruns | HU-04 |

## Épica 3 · Motores que funcionan hoy (0.1.0)

| ID | Tarea | Historias | Criterio de salida |
| --- | --- | --- | --- |
| T-051 | `MossServerEngine`: `POST /v1/audio/speech` (compatible con OpenAI), audio en streaming, `AV_SERVER_ERROR` con `details.status`, cancelación; pasa `speechEngineContract` contra un servidor falso | HU-11 | Pruebas con servidor falso: 200 en streaming, 4xx/5xx, caída de red, abort |
| T-050 | `WebSpeechEngine` + `SelectEngine` (respaldo automático; `auto` = `moss-server` si hay `server-url`, si no `web-speech`; nunca `moss-browser`) | HU-10 | Pasa la suite de contrato; el aviso "voz del sistema" es visible y se emite el evento de respaldo |

## Épica 4 · El elemento (0.1.0)

| ID | Tarea | Historias |
| --- | --- | --- |
| T-040 | Maqueta aprobada de todos los estados (artifact) | — |
| T-041 | `ArticleVoiceElement`: plantilla, atributos → config, eventos, métodos | HU-16 |
| T-042 | Estados visuales, i18n es/en, accesibilidad, aviso de motor de respaldo | HU-09 |

## Épica 5 · Después de la 0.1.0 (0.2.0 → 1.0.0)

T-052 resaltado con Highlight API (HU-12) · T-053 velocidad y voz con preferencias (HU-13) ·
T-054 tematización y partes (HU-14) · T-055 `article-voice/auto` (HU-15) · T-056 ejemplos por
framework · T-057 Media Session (HU-17) · T-058 README completo y sitio de demostración.

## Épica 6 · `moss-browser` experimental (fuera de la 0.1.0)

Solo se activa con `engine="moss-browser"`, con el tamaño de descarga visible (RN-15). No entra en `auto`.

| ID | Tarea | Historias | Criterio de salida |
| --- | --- | --- | --- |
| T-030 | Runtime del worker (a partir del spike): tokenizador, prefill/decode, códec en streaming | HU-04 | Experimental |
| T-031 | `MossBrowserEngine` + protocolo de mensajes tipado | HU-04 | Pasa la suite de contrato |
| T-032 | `CacheModelStore` con manifiesto, SHA-256, progreso, cancelación y reanudación | HU-06, HU-07 | — |
| T-033 | `PrepareEngine.use-case` con confirmación (RN-15) y `clearModelCache()` | HU-06, HU-07 | — |
| T-035 | **Investigación:** acelerar MOSS en el navegador: códec por lotes, KV cache en GPU, WebNN | — | Informe con RTF medido; si RTF ≤ 0,5 (WebGPU) o ≤ 0,8 (WASM) se reabre ADR-0018 y `auto` puede elegirlo |
