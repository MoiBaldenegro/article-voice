# Visión / Product Brief · `article-voice`

- **Estado:** En revisión · **Dueño:** Moises Baldenegro · **Fecha:** 2026-11-20

## Problema

Leer un artículo largo en pantalla no siempre es posible ni cómodo: mientras se cocina, se maneja
o se camina; con baja visión, dislexia o fatiga visual; o simplemente porque se prefiere escuchar.
Hoy un sitio que quiere ofrecer "escuchar este artículo" tiene tres caminos y ninguno es bueno:

- **Servicios de pago en la nube** (widgets de TTS): cobran por carácter, envían el texto a un
  tercero y añaden scripts de rastreo.
- **La voz del sistema** (`speechSynthesis`): gratis, pero suena robótica, cambia por navegador y
  sistema, y en muchos dispositivos no tiene voz en español.
- **Hacerlo a mano**: detectar el texto, limpiarlo, dividirlo, sintetizarlo y reproducirlo sin
  cortes es mucho trabajo para un equipo que solo quiere publicar artículos.

## Para quién

- **Quien integra** (usuario del paquete): desarrolladores de blogs, medios, documentación y sitios
  de contenido, con cualquier stack (WordPress, Astro, Next, Vue, HTML plano). Quieren añadir la
  función en minutos y sin operar servidores.
- **Quien escucha** (usuario final): el visitante del sitio. No sabe que existe un paquete: solo ve
  un botón de play junto al artículo.

## Propuesta de valor

Para **sitios de contenido** que quieren que sus artículos se puedan **escuchar**, `article-voice`
es un **componente web** que **detecta el artículo y lo lee con una voz neuronal natural**, con una
línea de código. A diferencia de los servicios de TTS en la nube, **el texto no va a ningún tercero**
(solo al servidor del propio sitio, o se queda en el dispositivo con la voz del sistema), no tiene
costo por uso y funciona con cualquier framework.

## Qué es

1. **Detección automática del artículo**: encuentra el contenido principal de la página e ignora
   menús, barras laterales, pies de página y publicidad. También acepta un artículo indicado a mano.
2. **Botón de play listo para usar**, con pausa, progreso, velocidad y voz.
3. **Voz neuronal MOSS-TTS-Nano**, en 20 idiomas, incluido el español, generada por el servidor
   del propio sitio (`moss-server`, compatible con OpenAI `/v1/audio/speech`), con la voz del sistema
   como respaldo automático. Ejecutar MOSS en el navegador (`moss-browser`) es experimental y opt-in:
   hoy no llega a tiempo real (RTF 1,93 en WASM, 5,5 q4 WebGPU, 10,6 WebGPU; ADR-0018).
4. **Lectura sin cortes**: genera el audio por segmentos mientras reproduce y resalta en la página
   la frase que se está leyendo.
5. **Agnóstico del framework**: un Custom Element estándar. Se importa y funciona.

## Qué NO es (no-objetivos)

- **No es un lector de pantalla** ni lo reemplaza: no navega la página ni lee la interfaz.
- **No es un servicio en la nube** ni ofrece un servidor alojado de TTS.
- **No traduce** el artículo; lo lee en el idioma en que está escrito.
- **No genera podcasts ni archivos** de audio para descargar (v1).
- **No lee contenido dentro de iframes** ni de otros dominios.
- **No clona voces** en la v1 (MOSS lo permite, pero requiere el codificador y plantea dudas de
  consentimiento).
- **No es una extensión del navegador**: lo integra el sitio, no el visitante.

## Alternativas existentes

| Alternativa | Qué hace bien | Qué le falta |
| --- | --- | --- |
| Widgets de TTS en la nube (de pago) | Voz natural, fácil de integrar | Costo por uso, privacidad, dependencia de un tercero |
| `speechSynthesis` del navegador | Gratis, sin descarga | Calidad y voces disponibles muy desiguales |
| Extensión MOSS-TTS-Nano-Reader | Demuestra MOSS en el navegador | La instala el visitante, no el sitio; sin licencia declarada |
| Bibliotecas de "read aloud" basadas en `speechSynthesis` | Sencillas | Heredan las limitaciones de la voz del sistema |

## Métricas de éxito (resumen; detalle en el [PRD](prd.md))

- Integración en ≤ 5 minutos siguiendo el README.
- Primer audio en ≤ 2 s tras pulsar play con `moss-server`.
- Cero cortes en la reproducción de un artículo de 10 minutos en el hardware de referencia.

## Principios del producto

1. **Privado y sin terceros:** el texto solo va al servidor que el propio sitio configura, o se queda
   en el dispositivo con la voz del sistema; nunca a un servicio ajeno.
2. **Respetuoso con el visitante:** por defecto no se descarga nada pesado; si se usa el motor
   experimental del navegador, solo tras pulsar play y diciendo cuánto pesa.
3. **Siempre hay voz:** si no hay servidor o no responde, hay respaldo, y se indica.
4. **Ligero y seguro de instalar:** una sola dependencia, cargada solo cuando hace falta (ADR-0015).
5. **Accesible:** WCAG 2.2 AA en el propio componente.
