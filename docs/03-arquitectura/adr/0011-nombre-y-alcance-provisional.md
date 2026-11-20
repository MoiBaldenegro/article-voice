# ADR-0011 · Nombre y entorno de ejecución: `article-voice`, solo navegador, con UI y sin CLI

- **Estado:** Aceptado
- **Fecha:** 2026-11-20 (propuesto con nombre provisional; aceptado el mismo día al llegar la idea)
- **Relacionados:** [Visión](../../01-producto/vision.md), ADR-0012, ADR-0013

## Contexto

La documentación se armó antes de conocer el producto, con cuatro decisiones abiertas: nombre,
entorno, CLI y UI. La idea ya llegó: **un componente que cualquier sitio importa para que sus
artículos se puedan escuchar con voz sintetizada por MOSS-TTS-Nano.**

## Decisión

1. **Nombre:** paquete `article-voice` en npm, sin scope (verificado libre el 2026-11-20). El
   elemento HTML es `<article-voice>` y la carpeta es `07-article-voice/`. El nombre describe lo
   que hace y **no usa "MOSS"**, para que nadie lo confunda con un paquete oficial de OpenMOSS.
2. **Entorno:** solo navegador. No corre en Node (ver ADR-0013).
3. **Sin CLI.**
4. **Con UI**: un botón y un pequeño reproductor. Aplica el [design system MXVI](../../04-diseno/ui/design-system.md)
   como tema por defecto, que el sitio que lo usa puede cambiar.

## Alternativas consideradas

| Opción | Por qué no |
| --- | --- |
| `moss-reader` (libre) | Parece oficial de OpenMOSS; ata el nombre a un solo motor cuando el motor es intercambiable (ADR-0014) |
| `read-aloud-element` (libre) | Más largo y genérico |
| `voz-articulo` (libre) | Los usuarios del paquete son internacionales; la API va en inglés |

## Consecuencias

- Se renombran la carpeta y las referencias a "gadget" en los documentos.
- Antes de la primera publicación se reservan variantes obvias del nombre (amenaza T-07).
