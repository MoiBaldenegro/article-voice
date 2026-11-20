# Landing del proyecto

Página pública: <https://moibaldenegro.github.io/article-voice/>

| Archivo | Qué es |
| --- | --- |
| `landing.html` | Maqueta y fuente única de la landing. Se escribe sin `<html>`, `<head>` ni `<body>`. |
| `../../../../scripts/build-landing.sh` | Le pone el esqueleto HTML y la deja en `_site/`. |
| `../../../../.github/workflows/pages.yml` | Publica `_site/` en GitHub Pages en cada push a `main` que toque la landing. |

## Objetivo

Que un desarrollador entienda en un minuto qué hace el componente, lo escuche funcionar y copie las dos líneas para instalarlo, **sin promesas que el código de hoy no cumple**: la voz MOSS la genera `moss-server`, `web-speech` es el respaldo y `moss-browser` es experimental (T-000, ADR-0018).

## Secciones

1. **Héroe.** Promesa, CTA a la demo y al código, y el snippet de instalación con botón de copiar.
2. **Demo.** Un artículo de ejemplo con el componente encima. Recorre los estados del contrato (`docs/04-diseno/contrato-api-publica.md`): reposo, confirmar descarga, descargando, leyendo con resaltado, voz del sistema y error. Hoy el audio se simula; cuando exista el paquete, la demo usará `<article-voice>` real (ver «Pendiente»).
3. **Cómo funciona.** Detectar → preparar → hablar, con ejemplos concretos de cada paso.
4. **Motores.** Tabla `moss-server` (recomendado) / `web-speech` (respaldo) / `moss-browser` (experimental; `auto` nunca lo elige).
5. **Integrar.** Pestañas HTML, React, Vue, Svelte, Astro y tema con `--av-*`.
6. **Principios.** Las garantías de privacidad y consentimiento (RN-06, SEC-*).
7. **Estado.** Mediciones reales de T-000 (RTF 1,85 WASM 4 hilos, 10,6 WebGPU, 5,5 q4 WebGPU; 728 MiB oficial, 168 MiB q4) y hoja de ruta por versión (0.1.0 = `moss-server` + `web-speech`).
8. **Preguntas** y pie con la atribución a OpenMOSS (Apache-2.0).

## Diseño

- Design system MXVI v1.1 (<https://moibaldenegro.github.io/mxvi-design-system/>), tema oscuro, esquinas rectas, acento morado solo como señal.
- Tipografía: Geist para el texto, Geist Mono para etiquetas y datos.
- Responsive hasta 360 px, foco visible, `prefers-reduced-motion` y región `aria-live` para los estados del reproductor.

## Reglas

- Las cifras de «Estado» salen de `docs/03-arquitectura/spikes/T-000-informe.md`; si cambian, se actualiza la landing y ese informe. Cuando haya `moss-browser` fluido (T-035) o la 0.1.0 salga, hay que revisar el héroe, la tabla de motores y la pregunta «¿De verdad corre sin servidores?».
- No prometer «sin servidores» ni que la voz corre en el navegador mientras ADR-0018 siga en la opción C. La demo es una maqueta: su insignia `moss · webgpu` ilustra el motor experimental.
- La landing no carga analítica ni cookies (coherente con la promesa de privacidad).
- Ninguna voz de la demo imita a personas o personajes reales.

## Pendiente

- Sustituir la demo simulada por el componente real cuando se publique `0.1.0` (cargar `dist/cdn/article-voice.js` del propio sitio, sin descargar el modelo hasta el play).
- Las versiones de las acciones de GitHub están fijadas por etiqueta mayor; fijarlas por SHA antes de `1.0.0`.
