# Landing del proyecto

Página pública: <https://moibaldenegro.github.io/article-voice/>

| Archivo | Qué es |
| --- | --- |
| `landing.html` | Maqueta y fuente única de la landing. Se escribe sin `<html>`, `<head>` ni `<body>`. |
| `../../../../scripts/build-landing.sh` | Le pone el esqueleto HTML y la deja en `_site/`. |
| `../../../../.github/workflows/pages.yml` | Publica `_site/` en GitHub Pages en cada push a `main` que toque la landing. |

## Objetivo

Que un desarrollador entienda en un minuto qué hace el componente, lo escuche funcionar y copie las dos líneas para instalarlo.

## Secciones

1. **Héroe.** Promesa, CTA a la demo y al código, y el snippet de instalación con botón de copiar.
2. **Demo.** Un artículo de ejemplo con el componente encima. Recorre los estados del contrato (`docs/04-diseno/contrato-api-publica.md`): reposo, confirmar descarga, descargando, leyendo con resaltado, voz del sistema y error. Hoy el audio se simula; cuando exista el paquete, la demo usará `<article-voice>` real (ver «Pendiente»).
3. **Cómo funciona.** Detectar → preparar → hablar, con ejemplos concretos de cada paso.
4. **Motores.** Tabla `moss-browser` / `moss-server` / `web-speech`.
5. **Integrar.** Pestañas HTML, React, Vue, Svelte, Astro y tema con `--av-*`.
6. **Principios.** Las garantías de privacidad y consentimiento (RN-06, SEC-*).
7. **Estado.** Mediciones reales del spike T-000 y hoja de ruta por versión.
8. **Preguntas** y pie con la atribución a OpenMOSS (Apache-2.0).

## Diseño

- Design system MXVI v1.1 (<https://moibaldenegro.github.io/mxvi-design-system/>), tema oscuro, esquinas rectas, acento morado solo como señal.
- Tipografía: Geist para el texto, Geist Mono para etiquetas y datos.
- Responsive hasta 360 px, foco visible, `prefers-reduced-motion` y región `aria-live` para los estados del reproductor.

## Reglas

- Las cifras de «Estado» salen de mediciones del spike; si cambian, se actualizan aquí y en `docs/08-tareas/tickets/T-000-spike-moss-en-el-navegador.md`.
- La landing no carga analítica ni cookies (coherente con la promesa de privacidad).
- Ninguna voz de la demo imita a personas o personajes reales.

## Pendiente

- Sustituir la demo simulada por el componente real cuando se publique `0.1.0` (cargar `dist/cdn/article-voice.js` del propio sitio, sin descargar el modelo hasta el play).
- Las versiones de las acciones de GitHub están fijadas por etiqueta mayor; fijarlas por SHA antes de `1.0.0`.
