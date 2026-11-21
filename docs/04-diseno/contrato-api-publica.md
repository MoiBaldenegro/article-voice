# Contrato de la API pública · `article-voice`

- **Estado:** En revisión · **Fecha:** 2026-11-20
- **Base:** [ADR-0009](../03-arquitectura/adr/0009-api-publica-minima-y-verificada.md), [ADR-0012](../03-arquitectura/adr/0012-web-component-sin-framework.md), [ADR-0013](../03-arquitectura/adr/0013-solo-esm-y-solo-navegador.md)

> Para un Web Component, el contrato es: **atributos, propiedades, métodos, eventos, partes y
> variables CSS del elemento**, más lo que exporta el módulo. Todo lo de esta página está sujeto a
> SemVer. API Extractor verifica la parte de TypeScript; las pruebas de componente verifican el resto.

## Uso

```html
<!-- Con bundler -->
<script type="module">import 'article-voice';</script>

<!-- Sin bundler -->
<script type="module" src="https://cdn.jsdelivr.net/npm/article-voice@1/dist/cdn/article-voice.js"></script>

<article-voice></article-voice>                         <!-- detecta el artículo -->
<article-voice for="post" lang="es"></article-voice>    <!-- artículo explícito -->
<article-voice server-url="https://tts.example.com"></article-voice>
```

```html
<!-- Inserción automática: no hace falta escribir el elemento -->
<script type="module" src="https://cdn.jsdelivr.net/npm/article-voice@1/dist/cdn/auto.js"></script>
```

## Puntos de entrada (`exports`)

| Ruta | Efecto al importar | Exporta |
| --- | --- | --- |
| `article-voice` | Registra `<article-voice>` si existe `customElements` y el nombre está libre | Ver "Exportaciones" |
| `article-voice/auto` | Lo anterior + inserta un elemento antes del artículo detectado | — |
| `article-voice/worker` | Nada (es el script del worker, para alojarlo uno mismo) | — |

## Atributos (y propiedad equivalente)

| Atributo | Propiedad | Tipo / valores | Por defecto | Descripción |
| --- | --- | --- | --- | --- |
| `for` | `htmlFor` | id | — | Artículo explícito por id (RN-04) |
| `target` | `target` | selector CSS | — | Artículo explícito por selector (RN-04) |
| `lang` | `lang` | BCP 47 | del artículo / `<html>` | Fuerza el idioma (RN-10) |
| `engine` | `engine` | `auto`\|`moss-browser`\|`moss-server`\|`web-speech` | `auto` | ADR-0014 |
| `fallback` | `fallback` | `web-speech`\|`none` | `web-speech` | RN-13 |
| `server-url` | `serverUrl` | URL https | — | Motor `moss-server` |
| `model-url` | `modelUrl` | URL https | HF fijado a commit | Base de los recursos del modelo |
| `ort-wasm-url` | `ortWasmUrl` | URL https | jsDelivr, versión exacta | Origen del wasm de ORT |
| `worker-url` | `workerUrl` | URL | el del paquete | Para alojar el worker uno mismo |
| `voice` | `voice` | id de voz | la primera del idioma | Voz |
| `rate` | `rate` | 0.75–2.0 | 1 o la preferencia guardada | RN-08 |
| `min-words` | `minWords` | entero | 120 | RN-01 |
| `no-highlight` | `noHighlight` | booleano | ausente | Desactiva el resaltado (CSS Custom Highlight API; sin soporte del navegador no se resalta, y el DOM del artículo nunca se modifica). Con `prefers-reduced-motion` el seguimiento por scroll no se anima |
| `confirm-download` | `confirmDownload` | `always`\|`never` | `always` | `never` solo si el sitio ya pidió consentimiento por su cuenta |

Un valor inválido emite `AV_INVALID_OPTION` y se usa el valor por defecto: **un atributo mal
escrito nunca rompe la página.**

## Propiedades de solo lectura

| Propiedad | Tipo |
| --- | --- |
| `state` | `'idle' \| 'preparing' \| 'buffering' \| 'playing' \| 'paused' \| 'ended' \| 'error'` |
| `progress` | `{ segment: number; segments: number; remainingMs: number }` |
| `article` | `{ title?: string; language: string; words: number; durationMs: number } \| null` |
| `activeEngine` | `{ kind: 'moss-browser' \| 'moss-server' \| 'web-speech'; fallback: boolean } \| null` |
| `voices` | `ReadonlyArray<{ id: string; name: string; languages: string[] }>` |

## Métodos

| Método | Devuelve | Notas |
| --- | --- | --- |
| `play()` | `Promise<void>` | Se resuelve al empezar a sonar. Rechaza con `ArticleVoiceError` |
| `pause()` / `stop()` | `void` | Sin efecto si no aplica |
| `next()` / `previous()` | `void` | RF-14 |
| `refresh()` | `Promise<void>` | Vuelve a detectar el artículo (contenido cargado después) |

## Eventos (`CustomEvent`, `bubbles: true`, `composed: true`)

| Evento | `detail` |
| --- | --- |
| `article-voice:ready` | `{ article }` — artículo detectado, botón visible |
| `article-voice:statechange` | `{ state, previous }` |
| `article-voice:segment` | `{ index, segments }` |
| `article-voice:download-required` | `{ bytes }` — antes de confirmar (RN-15) |
| `article-voice:download-progress` | `{ loaded, total }` |
| `article-voice:ended` | `{}` |
| `article-voice:fallback` | `{ from, to: 'web-speech', reason: 'no-server-url'\|'server-unreachable', label: 'voz del sistema' }` — se usa la voz del sistema en lugar del motor preferido (RN-13); la UI muestra la etiqueta |
| `article-voice:error` | `{ code, message, details? }` |

## Estilo

- **Variables CSS** (heredables desde fuera): `--av-accent`, `--av-accent-hover`, `--av-surface`,
  `--av-text`, `--av-text-secondary`, `--av-border`, `--av-radius`, `--av-font`, `--av-font-mono`,
  `--av-highlight` (color del resaltado en la página). Valores por defecto: tokens MXVI.
- **Partes:** `::part(root)`, `::part(play)`, `::part(progress)`, `::part(meta)`, `::part(controls)`,
  `::part(rate)`, `::part(voice)`, `::part(download)`.
- **Antes de definirse:** `article-voice:not(:defined)` reserva 44 px de alto para no mover la página.

## Exportaciones del módulo

| Símbolo | Tipo | Estabilidad | Descripción |
| --- | --- | --- | --- |
| `ArticleVoiceElement` | clase | `@public` | La clase del elemento (para `instanceof` y tipos) |
| `defineArticleVoice(tagName?)` | función | `@public` | Registra el elemento con otro nombre |
| `clearModelCache()` | `Promise<{ bytes: number }>` | `@public` | RF-13 |
| `ArticleVoiceError` y subclases | clases | `@public` | [Catálogo](catalogo-de-errores.md) |
| `ArticleVoiceState`, `ArticleVoiceEventMap`, … | tipos | `@public` | Tipos de lo anterior |
| `SpeechEngine` | interfaz | `@beta` | Para motores propios (F-16) |

Además se declara `HTMLElementTagNameMap['article-voice']` para el autocompletado en TS y JSX.

## Qué cuenta como cambio incompatible (major)

Quitar o renombrar un atributo, propiedad, método, evento, parte o variable CSS; cambiar su
tipo, su valor por defecto de forma observable o el `code` de un error; quitar un punto de entrada;
dejar de soportar un navegador de la lista de RNF-COMP-01.

**No** es incompatible: añadir atributos, eventos o partes; mejorar mensajes; cambiar la estética
dentro de los mismos tokens; cambiar la versión del modelo por defecto si mantiene idiomas y voces.

## Deprecación

`@deprecated` + aviso por `Logger` una vez por página, al menos una versión menor completa, y
eliminación en la siguiente mayor.
