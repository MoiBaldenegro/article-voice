# Reglas de negocio

- **Estado:** En revisión · **Fecha:** 2026-11-20

Cada regla tiene **un solo dueño en el código**: el value object, la entidad o el servicio de
dominio que la aplica. Los ejemplos válido e inválido se convierten en pruebas.

| ID | Regla | Ejemplo válido | Ejemplo inválido | Dónde vive | Error |
| --- | --- | --- | --- | --- | --- |
| RN-01 | Un artículo debe tener al menos `min-words` palabras legibles (por defecto 120) para mostrar el botón. | 800 palabras | 40 palabras en una página de contacto | `ArticleDetector` | `AV_ARTICLE_TOO_SHORT` (el botón no se muestra) |
| RN-02 | Se excluye del artículo: `nav`, `aside`, `footer`, `form`, `button`, `script`, `style`, `noscript`, `template`, `pre`, `code` en bloque, `figcaption`, `[hidden]`, `[aria-hidden="true"]`, `[data-av-skip]` y todo elemento no visible. | `<p>` dentro de `<article>` | Un `<aside>` "Artículos relacionados" dentro del `<article>` | `DomArticleSource` (marca) + `ArticleDetector` (decide) | — |
| RN-03 | Prioridad de detección: 1) `for`/`target` explícito; 2) un único `<article>`; 3) `[itemprop="articleBody"]`; 4) un único `<main>`; 5) el candidato con mayor puntuación de densidad de texto. | Página con un solo `<article>` → ese | Página con tres `<article>` de tarjetas cortas y un `<main>` → se puntúan, no se toma el primer `<article>` | `ArticleDetector` | — |
| RN-04 | Si `for`/`target` apunta a un elemento que no existe, **no** se cae a la detección automática. | `for="post"` y existe `#post` | `for="post"` sin `#post` | `ArticleDetector` | `AV_ARTICLE_NOT_FOUND` |
| RN-05 | Un segmento tiene como máximo 300 caracteres normalizados, corta en el final de una oración si puede, si no en una coma o punto y coma, y nunca dentro de una palabra. Un título es siempre un segmento propio. | "Hola. ¿Qué tal?" → 1 segmento | Corte en "ejem-plo" | `Segmenter` | — |
| RN-06 | No se descarga ningún recurso del modelo antes de que el visitante pulse play por primera vez. | Clic en play → descarga | Descarga al cargar la página | `PrepareEngineUseCase` + UI | — |
| RN-07 | Se sintetizan como máximo `lookahead` segmentos por delante del cursor (por defecto 2). | Suena el 4 y están listos el 5 y el 6 | Sintetizar el artículo entero al empezar | `Narration` | — |
| RN-08 | La velocidad va de 0.75 a 2.0 en pasos de 0.25. | 1.25 | 3 | `PlaybackRate.vo` | `AV_INVALID_OPTION` |
| RN-09 | En una página suena una sola narración a la vez: iniciar otra pausa la actual. | Dos componentes en la misma página | Dos voces a la vez | `NarrationRegistry` | — |
| RN-10 | Idioma del artículo: opción `lang` → `lang` del artículo o de su ancestro más cercano → `lang` de `<html>`. Si ninguno es soportado por el motor, se usa el respaldo si está permitido. | `<html lang="es-MX">` → `es` | `lang="xx"` sin respaldo | `Language.vo` | `AV_UNSUPPORTED_LANGUAGE` |
| RN-11 | La normalización en es/en convierte a palabras: números, ordinales, porcentajes, monedas, fechas, horas y abreviaturas comunes; lee las URLs solo por su dominio; elimina emojis y símbolos sin pronunciación. | "3,5 %" → "tres coma cinco por ciento" | Leer "https://…" carácter a carácter | `TextNormalizer` | — |
| RN-12 | Un artículo de más de 200 000 caracteres legibles no se narra entero: se narran los primeros 200 000 y se avisa. | Un ensayo de 50 000 | Un volcado de 2 MB de texto | `Article` | `AV_INPUT_TOO_LARGE` (aviso, no bloquea) |
| RN-13 | El respaldo `web-speech` solo se usa si `fallback` lo permite (por defecto sí) y la UI lo indica siempre. | Etiqueta "voz del sistema" visible | Cambiar de voz sin avisar | `SelectEngineUseCase` | `AV_ENGINE_UNAVAILABLE` |
| RN-14 | Un recurso del modelo cuyo SHA-256 no coincide con el manifiesto no se usa ni se guarda en caché. | Hash correcto | Archivo alterado por un proxy | `ModelAssets` | `AV_MODEL_INTEGRITY` |
| RN-15 | Antes de descargar, la UI muestra el tamaño total pendiente (lo que no está ya en caché). | "Descargar voz · 168 MB" | Descarga silenciosa | `PrepareEngineUseCase` + UI | — |
