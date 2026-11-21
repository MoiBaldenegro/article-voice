# Visión · `article-voice`

> Resumen de la visión del producto. El documento completo (problema, público, alcance y métricas)
> está en [01-producto/vision.md](01-producto/vision.md).

## Visión

**Que cualquier artículo se pueda escuchar.** `article-voice` es un componente web
(`<article-voice>`) que detecta el artículo de la página y lo lee en voz alta, con una línea de
código y con cualquier framework (o sin ninguno).

## Problema

Leer un artículo largo en pantalla no siempre es posible ni cómodo (cocinar, manejar, baja visión,
dislexia, fatiga). Las opciones actuales son malas: TTS en la nube de pago que envía el texto a
terceros, la voz del sistema (`speechSynthesis`) con calidad desigual, o implementarlo a mano.

## Para quién

- **Quien integra:** desarrolladores de blogs, medios y documentación que quieren añadir la función
  en minutos y sin operar servicios de terceros.
- **Quien escucha:** el visitante del sitio, que solo ve un botón de play junto al artículo.

## Propuesta de valor

- Una voz neuronal natural ([MOSS-TTS-Nano](https://github.com/OpenMOSS/MOSS-TTS-Nano)) generada
  por el servidor del propio sitio, con respaldo a la voz del sistema.
- Privacidad: el texto solo va al servidor que el integrador configura, o se queda en el
  dispositivo; nunca a un tercero.
- Agnóstico de framework: un custom element estándar.

## Alcance de 0.1.0

Motores `moss-server` (recomendado) y `web-speech` (respaldo); `moss-browser` es experimental y
opt-in. Detección y segmentación del artículo, controles, velocidad y voz con preferencias
persistentes, resaltado, Media Session, i18n (es/en) y accesibilidad.

## Fuera de alcance (por ahora)

Servicio alojado de TTS, edición de voces, soporte de PDF/audio descargable.

## Más información

- [Visión completa](01-producto/vision.md) · [PRD](01-producto/prd.md)
- [Backlog](08-tareas/backlog.md)
