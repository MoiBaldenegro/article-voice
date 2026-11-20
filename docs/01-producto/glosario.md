# Glosario de dominio (lenguaje ubicuo)

- **Estado:** En revisión · **Fecha:** 2026-11-20

Cada término tiene **un solo significado** y **un solo nombre** en documentos, código, pruebas,
mensajes de error y la API pública. Un PR que introduce un término nuevo lo agrega aquí.

## Términos del dominio

| Término | Código | Definición | Sinónimos prohibidos |
| --- | --- | --- | --- |
| Artículo | `Article` | Contenido principal legible de una página, con título opcional, idioma y una lista ordenada de bloques. | "post", "documento", "página" (la página es el contenedor) |
| Bloque | `ContentBlock` | Unidad de texto del artículo con un papel (`heading`, `paragraph`, `list-item`, `quote`) y una referencia opaca al nodo de origen. | "nodo" (es el detalle del DOM), "párrafo" (es solo un tipo de bloque) |
| Candidato | `ArticleCandidate` | Región de la página que podría ser el artículo, con su puntuación. | — |
| Detección | `ArticleDetector` | Elegir el candidato que es el artículo según las [reglas](../02-requisitos/reglas-de-negocio.md) RN-01 a RN-04. | "parseo", "scraping" |
| Normalización | `TextNormalizer` | Convertir el texto escrito en texto pronunciable: números, fechas, monedas, abreviaturas, URLs. | "limpieza" |
| Segmento | `Segment` | Fragmento de texto normalizado que se sintetiza de una vez (RN-05). Conoce los bloques y rangos de texto de los que sale. | "chunk", "trozo", "frase" (una frase puede ser varios segmentos) |
| Narración | `Narration` | Sesión de lectura de un artículo: sus segmentos, el cursor y el estado. Es el agregado principal. | "lectura", "reproducción", "sesión" |
| Cursor | `cursor` | Índice del segmento que suena o sonará a continuación. | "posición" (se reserva para el tiempo) |
| Estado de la narración | `NarrationState` | `idle`, `preparing`, `buffering`, `playing`, `paused`, `ended`, `error` (ver diagrama de estados). | — |
| Motor de voz | `SpeechEngine` | Puerto que convierte un segmento en audio. Implementaciones: `moss-browser`, `moss-server`, `web-speech`. | "TTS" (en código), "sintetizador" |
| Preparar el motor | `prepare()` | Dejar el motor listo para sintetizar: descargar y verificar los pesos, crear las sesiones. | "cargar", "inicializar" |
| Recursos del modelo | `ModelAssets` | Archivos de pesos, grafos y tokenizador del modelo, descritos por el manifiesto. | "modelo" a secas cuando se habla de archivos |
| Manifiesto | `ModelManifest` | Lista versionada de los recursos del modelo con URL relativa, tamaño y SHA-256. | — |
| Fragmento de audio | `AudioChunk` | Muestras PCM (Float32, 48 kHz) producidas por el motor; un segmento produce uno o varios. | "buffer" |
| Salida de audio | `AudioOutput` | Puerto que reproduce fragmentos en orden, sin huecos, y aplica la velocidad. | "player" |
| Adelanto | `lookahead` | Número de segmentos que se sintetizan por delante del que suena (RN-07). | "prefetch" |
| Velocidad | `rate` | Multiplicador de la velocidad de lectura (RN-08). | "speed" |
| Voz | `Voice` | Identidad de voz que ofrece un motor, con su `id`, nombre e idiomas. | "speaker", "locutor" |
| Capacidades del dispositivo | `DeviceCapabilities` | Lo que el navegador permite: WebGPU, WASM con hilos, memoria estimada, `speechSynthesis`. | — |
| Respaldo | `fallback` | Uso del motor `web-speech` cuando el elegido no está disponible. | "degradado" |
| Resaltado | `highlight` | Marca visual en la página del texto del segmento que suena. | "subrayado" |

## Términos del proyecto

| Término | Código | Definición |
| --- | --- | --- |
| Integrador | — | Quien instala el paquete en su sitio (usuario del paquete) |
| Visitante | — | Quien escucha el artículo en el sitio (usuario final) |
| Opción | atributo / propiedad | Configuración que el integrador pasa al elemento |
| Contrato público | — | Todo lo exportado, más atributos, eventos, partes y propiedades CSS del elemento ([contrato](../04-diseno/contrato-api-publica.md)) |
| Puerto / Adaptador / Caso de uso | `*.port.ts` / `src/infrastructure/**` / `*.use-case.ts` | Igual que en 05/06 |
| Código de error | `code` | Identificador estable `AV_*` ([catálogo](../04-diseno/catalogo-de-errores.md)) |
| Hardware de referencia | Ref-D, Ref-M | Equipos donde se miden los RNF de rendimiento ([rendimiento](../06-calidad/rendimiento.md)) |
