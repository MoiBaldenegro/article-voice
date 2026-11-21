# Guía: levantar un servidor para `moss-server`

El motor `moss-server` envía cada frase del artículo a **tu** servidor y reproduce el audio que
devuelve. Esta guía explica el contrato, cómo probarlo en 2 minutos con el servidor de referencia
([`examples/moss-server`](../../examples/moss-server)) y cómo conectarlo a MOSS-TTS-Nano.

## 1. Contrato

`<article-voice server-url="https://tts.tu-sitio.com">` llama a:

| Petición | Para qué |
| --- | --- |
| `HEAD /` (o `GET /` si da 405) sobre `server-url` | Sondeo de disponibilidad (con `engine="auto"`). Vale cualquier respuesta menor a 500 (si HEAD da 405/501 se prueba GET); sin redirecciones. |
| `OPTIONS /v1/audio/speech` | Preflight CORS del navegador. |
| `POST /v1/audio/speech` | Síntesis de una frase. |

Cuerpo del `POST` (JSON, `content-type: application/json`):

```json
{ "model": "moss-tts-nano", "input": "Texto de la frase", "voice": "default", "response_format": "pcm", "speed": 1 }
```

Respuesta `200`: **PCM de 16 bits little-endian, mono, 48 kHz**, sin cabecera (`audio/pcm`), en
streaming si puedes. Sin cookies, sin redirecciones: el motor las rechaza.

**Voces.** El contrato OpenAI no tiene endpoint de voces. Hoy el motor solo ofrece la voz `default`
(opción `voices` del motor, aún sin atributo en el elemento): tu servidor debe aceptar `default` y
puede mapearla a la voz que quieras.

## 2. Probar con el servidor de referencia

Requiere Node ≥ 22 y nada más:

```sh
ALLOWED_ORIGINS=http://localhost:5173 node examples/moss-server/server.mjs
curl -i -X POST http://127.0.0.1:8000/v1/audio/speech \
  -H 'content-type: application/json' -d '{"input":"Hola","response_format":"pcm"}' -o /dev/null
```

Debe responder `200 audio/pcm`. Con el backend por defecto (`tone`) suena un pitido: sirve para
validar CORS y la integración, no para la voz. Después, en tu página:

```html
<article-voice server-url="http://127.0.0.1:8000" engine="moss-server"></article-voice>
```

> `server-url` exige `https`, salvo `localhost`/`127.0.0.1` en desarrollo.

## 3. Conectar MOSS-TTS-Nano

Elige una de las dos vías (el servidor de referencia soporta ambas; ver su
[README](../../examples/moss-server/README.md)):

- **`BACKEND=upstream`**: ya tienes un servidor compatible con OpenAI que sirve MOSS-TTS-Nano
  (por ejemplo vLLM-Omni). El de referencia hace de puerta de entrada: aplica CORS, límites y
  validación, y reenvía a `UPSTREAM_URL` pidiendo `pcm`. Si el upstream devuelve otro formato o
  frecuencia, no sirve: debe dar PCM 16-bit a 48 kHz.
- **`BACKEND=command`**: defines `TTS_COMMAND`, un comando que lee el texto por stdin y escribe PCM
  16-bit mono 48 kHz por stdout . Se ejecuta
  una vez por frase: para uso real, mantén el modelo cargado en un proceso propio y usa `upstream`.

Si el modelo produce otra frecuencia (p. ej. WAV), remuestrea a 48 kHz y quita la cabecera antes de
responder. Los pesos oficiales no se incluyen en este repositorio; la sección 7 documenta una conexión real verificada.

## 4. CORS

El navegador bloquea las respuestas de otro origen salvo que el servidor lo permita. Tu servidor debe:

1. Responder el preflight `OPTIONS` con `204` y
   `Access-Control-Allow-Methods: POST` y `Access-Control-Allow-Headers: content-type`.
2. Devolver `Access-Control-Allow-Origin: <origen de tu sitio>` en el `POST` (y en el sondeo).
3. **No** enviar `Access-Control-Allow-Credentials`: el componente usa `credentials: 'omit'`.

El de referencia exige `ALLOWED_ORIGINS` (lista de orígenes exactos, p. ej.
`https://blog.tu-sitio.com`) y rechaza con `403` los demás. Usa `*` solo para pruebas locales.
Si tu sitio tiene CSP, añade el origen del servidor a `connect-src`
([configuración](configuracion.md)).

## 5. Privacidad

- El texto del artículo viaja **solo** a `server-url`; no hay terceros ni telemetría del componente.
- No registres el cuerpo de las peticiones: el servidor de referencia solo escribe el motivo de un
  error, nunca el texto.
- Sirve por `https` en producción y limita el tamaño (`MAX_INPUT_CHARS`, 4000 por defecto) y la
  tasa de peticiones (con un proxy inverso) para que nadie use tu servidor como TTS gratuito.
- Si el servidor cae, el componente usa la voz del sistema (`article-voice:fallback`); eso envía el
  texto al motor de voz del navegador, no a la red (salvo voces remotas del sistema operativo).

## 6. Solución de problemas

| Síntoma | Causa probable |
| --- | --- |
| Error de CORS en consola | `ALLOWED_ORIGINS` no incluye el origen exacto (esquema, host y puerto) |
| Siempre suena la voz del sistema | El sondeo `HEAD /` falla o `server-url` no es https |
| Audio acelerado o ruidoso | El servidor no entrega 16-bit mono a 48 kHz |
| `403` | Origen no permitido |

## 7. Verificación con los pesos reales (2026-11-21)

`pnpm test:moss-real` ejecuta la prueba de punta a punta (`scripts/moss-e2e/`): usa los pesos
públicos del spike T-000 (`spikes/t000-moss-browser/models`, ignorados por git; si faltan, los
descarga con `download-models.mjs` y el commit fijado en su `manifest.json`), arranca
`moss_upstream.py` (MOSS-TTS-Nano 100M ONNX en CPU, 4 hilos, modelo cargado una vez, voz `Nathan`,
salida PCM mono 48 kHz) detrás del servidor de referencia (`BACKEND=upstream`), pide un párrafo en
español y otro en inglés y abre `examples/html` en Chromium con Playwright.
Requiere `pnpm build`, el venv del spike (`onnxruntime`, `sentencepiece`, `numpy`) y
`playwright install chromium`. El informe queda en `temp/moss-e2e-report.json`.

Resultado (CPU de escritorio de 20 hilos lógicos, Windows 10, onnxruntime 1.32, sin GPU):

| Idioma | Audio | Tiempo de síntesis | RTF (síntesis / audio) | Formato |
| --- | --- | --- | --- | --- |
| es (2 frases, 137 caracteres) | 12,80 s | 6,08 s | 0,48 | `audio/pcm`, 16-bit mono 48 kHz, pico 10305 |
| en (2 frases, 142 caracteres) | 9,12 s | 4,06 s | 0,45 | `audio/pcm`, 16-bit mono 48 kHz, pico 7368 |

Una sola medición por idioma (incluye la ida y vuelta HTTP, no el arranque del modelo): orientativa.
En el navegador, `<article-voice engine="moss-server">` pasó a `playing`, avanzó de la frase 0 a la 1,
resaltó con la CSS Custom Highlight API y no emitió `article-voice:fallback` ni `error`.

Notas: la voz `default` se asigna a `Nathan`; la síntesis es secuencial (un candado, un solo modelo),
así que varias peticiones simultáneas se encolan. Un RTF < 1 en CPU significa que el audio se genera
más rápido de lo que dura, por lo que la narración no se corta con el `lookahead` actual.
