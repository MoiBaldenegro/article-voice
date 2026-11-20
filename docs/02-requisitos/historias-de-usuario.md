# Historias de usuario

- **Estado:** En revisión · **Fecha:** 2026-11-20

Formato Gherkin; cada escenario es una prueba con el mismo ID (`HU-04 · CA-2`). Reglas para
escribirlas: INVEST, un escenario de error como mínimo, comportamiento observable.

---

```gherkin
# HU-01 · Ver el botón junto al artículo detectado
# Como visitante, quiero ver un botón "Escuchar" con la duración junto al artículo,
# para saber que puedo escucharlo y cuánto dura.
# Prioridad: Must · RF-02, RF-15 · RN-01, RN-02, RN-03 · Estimación: M

Característica: Detección automática del artículo

  Escenario: CA-1 · Un único <article>
    Dado una página con un <article> de 900 palabras y un <nav>
    Cuando la página carga con <article-voice> presente
    Entonces el botón muestra "Escuchar · 6 min"
    Y el texto del <nav> no forma parte del artículo

  Escenario: CA-2 · Varios <article> de tarjetas
    Dado una portada con 12 <article> de 30 palabras y un <main> con un texto de 700 palabras
    Cuando la página carga
    Entonces el artículo detectado es el texto de 700 palabras

  Escenario: CA-3 · Página sin artículo
    Dado una página de contacto con 40 palabras
    Cuando la página carga
    Entonces el botón no se muestra
    Y el elemento emite "article-voice:error" con código "AV_ARTICLE_TOO_SHORT"
```

```gherkin
# HU-02 · Indicar el artículo a mano
# Como integrador, quiero indicar qué elemento es el artículo,
# para que la detección no se equivoque en mi plantilla.
# Prioridad: Must · RF-03 · RN-04 · Estimación: S

  Escenario: CA-1 · Por id
    Dado <article-voice for="post"> y un elemento con id "post"
    Cuando la página carga
    Entonces el artículo es el contenido de #post

  Escenario: CA-2 · Por selector
    Dado <article-voice target=".entry-content">
    Entonces el artículo es el primer elemento que coincide con ".entry-content"

  Escenario: CA-3 · El objetivo no existe
    Dado <article-voice for="post"> sin elemento #post
    Entonces el botón no se muestra
    Y se emite el error "AV_ARTICLE_NOT_FOUND" con detalle { for: "post" }
    Y no se usa la detección automática
```

```gherkin
# HU-03 · Escuchar un texto bien pronunciado
# Como visitante, quiero que números, fechas y abreviaturas se lean como se dicen,
# para entender el artículo sin esfuerzo.
# Prioridad: Must · RF-04…06 · RN-05, RN-11 · Estimación: L

  Escenario: CA-1 · Números y porcentajes en español
    Dado el texto "El 3,5 % de 1.200 personas"
    Cuando se normaliza en "es"
    Entonces el resultado es "El tres coma cinco por ciento de mil doscientas personas"

  Escenario: CA-2 · URL
    Dado el texto "Visita https://example.com/docs/x"
    Cuando se normaliza
    Entonces el resultado es "Visita example punto com"

  Escenario: CA-3 · Segmentos largos
    Dado un párrafo de 900 caracteres con cinco oraciones
    Cuando se segmenta
    Entonces ningún segmento supera 300 caracteres
    Y ningún corte cae dentro de una palabra
```

```gherkin
# HU-04 · Reproducir el artículo
# Como visitante, quiero pulsar play y escuchar el artículo de corrido,
# para no tener que leerlo.
# Prioridad: Must · RF-07, RF-09, RF-25 · RN-07, RN-09 · Estimación: L

  Escenario: CA-1 · Play con el motor listo
    Dado un artículo detectado y el motor preparado
    Cuando pulso play
    Entonces el estado pasa a "buffering" y luego a "playing"
    Y escucho el primer segmento

  Escenario: CA-2 · Sin silencios entre segmentos
    Dado un artículo de 20 segmentos
    Cuando se reproduce completo en el hardware de referencia
    Entonces no hay pausas añadidas mayores de 150 ms entre segmentos
    Y el estado final es "ended"

  Escenario: CA-3 · Dos componentes en la misma página
    Dado dos <article-voice> y el primero sonando
    Cuando pulso play en el segundo
    Entonces el primero pasa a "paused"

  Escenario: CA-4 · Falla la síntesis de un segmento
    Dado el motor falla al sintetizar el segmento 5
    Entonces el estado pasa a "error" con código "AV_SYNTHESIS_FAILED"
    Y al pulsar play se reintenta desde el segmento 5
```

```gherkin
# HU-05 · Pausar, reanudar y detener
# Prioridad: Must · RF-08 · Estimación: S

  Escenario: CA-1 · Pausa y reanudación
    Dado una narración en "playing" en el segmento 3
    Cuando pulso pausa y luego play
    Entonces la voz continúa en el mismo punto del segmento 3

  Escenario: CA-2 · Detener
    Cuando pulso detener
    Entonces el estado es "idle" y el cursor vuelve al segmento 0
```

```gherkin
# HU-06 · Descargar la voz con consentimiento y progreso
# Como visitante, quiero saber cuánto voy a descargar antes de hacerlo y ver el progreso,
# para decidir si lo hago con mis datos móviles.
# Prioridad: Must · RF-10, RF-11 · RN-06, RN-15 · Estimación: L

  Escenario: CA-1 · Nada se descarga al cargar
    Dado una página con <article-voice> y motor "moss-browser"
    Cuando la página termina de cargar
    Entonces no se ha pedido ningún recurso del modelo

  Escenario: CA-2 · Primer play
    Cuando pulso play por primera vez
    Entonces veo "Descargar voz · 168 MB" y un botón para confirmar
    Cuando confirmo
    Entonces veo el progreso en porcentaje y megas
    Y al terminar empieza la reproducción

  Escenario: CA-3 · Cancelar la descarga
    Dado una descarga en curso
    Cuando pulso cancelar
    Entonces la descarga se detiene, el estado vuelve a "idle"
    Y los archivos completos ya verificados se conservan en caché

  Escenario: CA-4 · Error de red
    Dado que la red falla durante la descarga
    Entonces se muestra "AV_MODEL_DOWNLOAD_FAILED" con opción de reintentar
    Y el reintento continúa con los archivos que faltan
```

```gherkin
# HU-07 · Reutilizar y borrar los recursos del modelo
# Prioridad: Must · RF-12, RF-13 · RN-14 · Estimación: M

  Escenario: CA-1 · Segunda visita
    Dado los recursos del modelo ya en caché
    Cuando pulso play en otro artículo del mismo sitio
    Entonces no se descarga nada y no se pide confirmación

  Escenario: CA-2 · Archivo alterado
    Dado un recurso cuyo SHA-256 no coincide con el manifiesto
    Entonces no se guarda ni se usa
    Y se emite "AV_MODEL_INTEGRITY"

  Escenario: CA-3 · Borrar la caché
    Cuando el integrador llama a clearModelCache()
    Entonces los recursos guardados se eliminan y la promesa se resuelve con los bytes liberados
```

```gherkin
# HU-08 · Saber cuánto falta y moverme por el artículo
# Prioridad: Must · RF-14 · Estimación: M

  Escenario: CA-1 · Tiempo restante
    Dado una narración en curso
    Entonces veo el tiempo restante estimado, actualizado al cambiar de segmento

  Escenario: CA-2 · Siguiente y anterior
    Cuando pulso "siguiente"
    Entonces la voz salta al inicio del siguiente segmento
    Cuando pulso "anterior" en el segmento 0
    Entonces la voz vuelve al inicio del segmento 0
```

```gherkin
# HU-09 · Usar el componente con teclado y lector de pantalla
# Prioridad: Must · RNF-A11Y-01 · Estimación: M

  Escenario: CA-1 · Teclado
    Dado el foco en el botón de play
    Cuando pulso Espacio o Enter
    Entonces se alterna play/pausa
    Y el foco es visible con el anillo de 2px del design system

  Escenario: CA-2 · Anuncios
    Cuando cambia el estado a "playing", "paused" o "error"
    Entonces una región aria-live "polite" lo anuncia una sola vez

  Escenario: CA-3 · Sin violaciones
    Entonces axe no reporta violaciones en ningún estado del componente
```

```gherkin
# HU-10 · Escuchar aunque el dispositivo no pueda con el modelo
# Prioridad: Should · RF-16, RF-17 · RN-13 · Estimación: M

  Escenario: CA-1 · Respaldo
    Dado un dispositivo sin WebGPU ni WASM con hilos y engine="auto"
    Cuando pulso play
    Entonces se narra con la voz del sistema
    Y veo la etiqueta "voz del sistema"

  Escenario: CA-2 · Respaldo prohibido
    Dado fallback="none" y el mismo dispositivo
    Entonces el botón no se muestra y se emite "AV_ENGINE_UNAVAILABLE"
```

```gherkin
# HU-11 · Usar mi propio servidor de voz
# Como integrador, quiero que el audio se genere en mi servidor,
# para que mis visitantes no descarguen el modelo.
# Prioridad: Should · RF-18 · Estimación: M

  Escenario: CA-1 · Servidor configurado
    Dado server-url="https://tts.example.com" y engine="auto"
    Cuando pulso play
    Entonces cada segmento se pide con POST /v1/audio/speech
    Y no se descarga ningún recurso del modelo

  Escenario: CA-2 · Servidor caído
    Dado que el servidor responde 503
    Entonces se emite "AV_SERVER_ERROR" con el estado HTTP en details
    Y, si el respaldo está permitido, se ofrece continuar con la voz del sistema
```

```gherkin
# HU-12 · Seguir la lectura con la vista
# Prioridad: Should · RF-19 · Estimación: M

  Escenario: CA-1 · Resaltado
    Dado una narración en "playing"
    Entonces el texto del segmento actual aparece resaltado en la página
    Y el DOM del artículo no se modifica

  Escenario: CA-2 · Seguimiento con scroll
    Dado que el segmento actual sale de la pantalla y el visitante no ha hecho scroll en 5 s
    Entonces la página se desplaza suavemente hasta él (sin animación si prefers-reduced-motion)
```

```gherkin
# HU-13 · Elegir velocidad y voz
# Prioridad: Should · RF-20 · RN-08 · Estimación: S

  Escenario: CA-1 · Velocidad
    Cuando elijo 1.5×
    Entonces la voz se acelera sin cambiar de tono
    Y en la siguiente visita la velocidad sigue en 1.5×

  Escenario: CA-2 · Valor inválido por atributo
    Dado rate="3"
    Entonces se emite "AV_INVALID_OPTION" y se usa 1×
```

```gherkin
# HU-14 · Adaptar el aspecto a mi sitio
# Prioridad: Should · RF-21 · Estimación: S

  Escenario: CA-1 · Variables CSS
    Dado article-voice { --av-accent: #0a7 }
    Entonces el botón usa ese color de acento

  Escenario: CA-2 · Idioma de la interfaz
    Dado un artículo en inglés
    Entonces las etiquetas del componente están en inglés
```

```gherkin
# HU-15 · Activarlo sin tocar el HTML
# Prioridad: Should · RF-22 · Estimación: S

  Escenario: CA-1 · Inserción automática
    Dado un sitio que solo añade <script type="module" src=".../auto.js">
    Cuando la página carga y hay un artículo
    Entonces aparece el botón antes del primer título del artículo
```

```gherkin
# HU-16 · Controlarlo desde mi código
# Prioridad: Must · RF-01, RF-23 · Estimación: M

  Escenario: CA-1 · Métodos y eventos
    Dado el elemento en la página
    Cuando llamo a el.play()
    Entonces se emite "article-voice:statechange" con detail.state = "preparing" o "buffering"

  Escenario: CA-2 · Import en servidor
    Dado un entorno sin customElements (SSR)
    Cuando se importa el paquete
    Entonces no lanza error
```

```gherkin
# HU-17 · Controles del sistema (Could)
  Escenario: CA-1 · Pantalla bloqueada
    Dado una narración en curso en el móvil
    Entonces puedo pausar desde la pantalla bloqueada o los auriculares
```
