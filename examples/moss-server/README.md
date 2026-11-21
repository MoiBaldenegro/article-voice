# Servidor de referencia para `moss-server`

Un solo archivo, sin dependencias (Node ≥ 22), que implementa `POST /v1/audio/speech` con
respuesta `pcm` (16-bit LE, mono, 48 kHz), CORS por lista de orígenes y validación de entrada.
Guía completa: [docs/07-operacion/moss-server.md](../../docs/07-operacion/moss-server.md).

```sh
ALLOWED_ORIGINS=http://localhost:5173 node server.mjs          # backend tone (pitido, para probar)
```

| Variable | Por defecto | Uso |
| --- | --- | --- |
| `ALLOWED_ORIGINS` | — (obligatoria) | Orígenes permitidos, separados por comas. `*` solo para pruebas |
| `PORT` / `HOST` | `8000` / `127.0.0.1` | Dónde escucha |
| `VOICES` | `default` | Voces aceptadas en el campo `voice` |
| `MAX_INPUT_CHARS` | `4000` | Máximo de caracteres por petición |
| `BACKEND` | `tone` | `tone`, `command` o `upstream` |
| `TTS_COMMAND` | — | Con `command`: lee texto por stdin, escribe PCM 16-bit mono 48 kHz por stdout |
| `UPSTREAM_URL` / `UPSTREAM_API_KEY` | — | Con `upstream`: otro servidor `/v1/audio/speech` (p. ej. MOSS-TTS-Nano en vLLM-Omni). La clave, si existe, va en el entorno, nunca en el código |

Ejemplos:

```sh
BACKEND=upstream UPSTREAM_URL=http://127.0.0.1:9000 ALLOWED_ORIGINS=https://blog.example node server.mjs
BACKEND=command TTS_COMMAND="python mi_tts.py" ALLOWED_ORIGINS=https://blog.example node server.mjs
```

Es un punto de partida: en producción ponlo detrás de https y de un limitador de tasa.
Prueba automática: `pnpm test examples`.
