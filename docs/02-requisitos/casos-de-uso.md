# Casos de uso

- **Estado:** En revisión · **Fecha:** 2026-11-20

Cada caso de uso corresponde a un archivo `*.use-case.ts` de `libs/reader` (mismo nombre).
Actor por defecto: el elemento `<article-voice>`, en nombre del visitante o del integrador.

## CU-01 · Detectar el artículo (`DetectArticle.use-case.ts`)

| Campo | Contenido |
| --- | --- |
| Disparador | El elemento se conecta al DOM o cambia `for`/`target` |
| Precondiciones | Hay un `ArticleSource` (adaptador del DOM) |
| Postcondiciones (éxito) | `Article` con bloques, idioma, número de palabras y duración estimada |
| Postcondiciones (fallo) | Sin artículo; error del catálogo; el botón no se muestra |
| Requisitos | RF-02…06, RF-15; RN-01…05, RN-10…12 |

**Flujo principal**
1. Si hay `for`/`target`, pide al `ArticleSource` los bloques de ese elemento (RN-04).
2. Si no, pide los candidatos y el `ArticleDetector` elige uno (RN-03).
3. Comprueba el mínimo de palabras (RN-01) y el máximo de caracteres (RN-12).
4. Resuelve el idioma (RN-10), normaliza (RN-11) y segmenta (RN-05).
5. Estima la duración con las palabras por minuto de la voz y la velocidad.

**Excepciones:** `AV_ARTICLE_NOT_FOUND`, `AV_ARTICLE_TOO_SHORT`, `AV_UNSUPPORTED_LANGUAGE`; `AV_INPUT_TOO_LARGE` es un aviso.

## CU-02 · Reproducir la narración (`PlayNarration.use-case.ts`)

| Campo | Contenido |
| --- | --- |
| Disparador | Clic en play o `el.play()` |
| Precondiciones | Artículo detectado |
| Postcondiciones | Estado `playing`; o `ended` al terminar; o `error` |
| Requisitos | RF-07, RF-09, RF-19, RF-25; RN-07, RN-09 |

**Flujo principal**
1. `NarrationRegistry` pausa cualquier otra narración de la página (RN-09).
2. Si el motor no está preparado → CU-04 (incluye la confirmación de descarga).
3. Estado `buffering`; se sintetizan el segmento del cursor y hasta `lookahead` más (RN-07).
4. En cuanto llega el primer `AudioChunk`, `AudioOutput` empieza a sonar → `playing`.
5. Al terminar cada segmento: avanza el cursor, se emite `segment`, se pide el siguiente pendiente.
6. Tras el último segmento → `ended`.

**Alternativos:** 4a. Si la salida se queda sin audio antes de que llegue el siguiente fragmento →
`buffering` hasta que llega. 5a. Pausa → CU-03.

**Excepciones:** `AV_SYNTHESIS_FAILED` (el cursor queda en el segmento que falló), `AV_AUDIO_BLOCKED`.

## CU-03 · Pausar, reanudar y detener (`PauseNarration`, `ResumeNarration`, `StopNarration`)

Pausa: `AudioOutput.suspend()`, la síntesis por adelantado se detiene al completar el segmento en
curso. Reanudar: `resume()` en el mismo punto. Detener: aborta la síntesis (`AbortSignal`), vacía la
salida y lleva el cursor a 0. Transiciones inválidas → `InvalidNarrationTransition` interno (sin efecto visible).

## CU-04 · Preparar el motor (`PrepareEngine.use-case.ts`)

| Campo | Contenido |
| --- | --- |
| Disparador | Primer play (RN-06) |
| Postcondiciones | Motor listo; recursos verificados en caché |
| Requisitos | RF-10…12; RN-06, RN-14, RN-15 |

**Flujo principal**
1. Consulta al `ModelStore` qué recursos del manifiesto faltan y cuánto pesan.
2. Si falta algo, emite `download-required` con los bytes pendientes y espera la confirmación (RN-15).
3. Descarga lo pendiente con progreso, verifica cada archivo (RN-14) y lo guarda.
4. Pide al motor `prepare()` (crear sesiones de ORT en el worker).

**Excepciones:** `AV_MODEL_DOWNLOAD_FAILED`, `AV_MODEL_INTEGRITY`, `AV_STORAGE_QUOTA` (continúa sin
caché, avisando), `AV_ABORTED` (cancelación), `AV_ENGINE_UNAVAILABLE`.

## CU-05 · Moverse por el artículo (`SeekNarration.use-case.ts`)

Siguiente/anterior: aborta lo pendiente, mueve el cursor (acotado a [0, n-1]), vacía la salida y
continúa como en CU-02 paso 3.

## CU-06 · Elegir el motor (`SelectEngine.use-case.ts`)

Aplica el algoritmo de ADR-0014 con `engine`, `server-url`, `fallback`, `DeviceCapabilities` y el
idioma. Devuelve el tipo de motor elegido y si es respaldo (para la etiqueta de RN-13).
