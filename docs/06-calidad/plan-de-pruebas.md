# Plan de pruebas (QA)

- **Estado:** En revisión · **Fecha:** 2026-11-20

## Alcance

El elemento `<article-voice>`, sus puntos de entrada (`.`, `./auto`, `./worker`), los tres motores
y el bundle de CDN.

## Matriz de entornos

| Eje | Valores |
| --- | --- |
| Navegador | Chromium, Firefox, WebKit (Playwright) en cada PR; Safari iOS y Chrome Android a mano antes de cada versión menor |
| Backend de inferencia | WebGPU (manual / Ref-D), WASM (CI nocturno) |
| Integración | HTML sin bundler (CDN), Vite, React 19, Vue 3, Svelte 5, Angular, Astro (proyectos de ejemplo en `examples/`) |
| Idiomas | es, en (completo); de, fr, pt (humo) |
| Condiciones | Red lenta (3G simulada), sin red tras la caché, navegación privada, CSP estricta, `prefers-reduced-motion`, zoom 200 % |

## Corpus de detección

`test/fixtures/pages/`: 30+ páginas reales guardadas y anonimizadas (blogs en WordPress, Ghost y
Medium, medios, documentación con Docusaurus, Astro y MkDocs, Wikipedia, una portada, una página de
producto y una de contacto). Cada una con su "verdad": el texto esperado del artículo.
**Criterio:** ≥ 90 % de las páginas con artículo detectado correctamente (≥ 95 % del texto
esperado y ≤ 5 % de texto ajeno), y 0 falsos positivos en las páginas sin artículo.

## Casos de prueba

Cada criterio de aceptación de las [historias](../02-requisitos/historias-de-usuario.md) es un caso
`CP-HUxx-n` automatizado con el mismo ID en el nombre de la prueba. Además:

| ID | Caso | Nivel | Automatizado |
| --- | --- | --- | --- |
| CP-SPIKE-1 | El bucle de inferencia portado produce los mismos tokens que el runtime Python con la misma semilla | Integración (Node + onnxruntime-node) | Sí |
| CP-SPIKE-2 | El tokenizador TS produce los mismos ids que `sentencepiece` en 500 frases es/en | Unitario | Sí |
| CP-SPIKE-3 | Escucha ciega: 5 personas comparan 10 frases (oficial vs cuantizada); MOS ≥ 3.5 y diferencia ≤ 0.5 | Manual | No (perceptivo) |
| CP-NET-1 | Ninguna petición de recursos del modelo antes del primer play | Playwright | Sí |
| CP-NET-2 | Ninguna petición que contenga texto del artículo con motores locales | Playwright | Sí |
| CP-SEC-1 | Archivo de pesos alterado → `AV_MODEL_INTEGRITY` | Playwright (ruta interceptada) | Sí |
| CP-SEC-2 | Artículo con `<img onerror>` en el texto → nada se ejecuta | Playwright | Sí |
| CP-A11Y-1 | axe sin violaciones en cada estado | Playwright | Sí |
| CP-A11Y-2 | Recorrido con NVDA (Windows) y VoiceOver (macOS/iOS) | Manual | No |

## Pruebas exploratorias antes de cada versión menor

- Integrar en un sitio real siguiendo solo el README (cronometrado).
- Escuchar 3 artículos completos en es y en en Ref-D y Ref-M.
- Cortar la red a mitad de descarga y de narración.

## Criterio de salida de una versión

Sin defectos críticos o altos abiertos, todos los `CP-` automatizados en verde, corpus de
detección ≥ 90 %, RNF-PERF-10/11 medidos en Ref-D y prueba de humo del paquete publicado.
