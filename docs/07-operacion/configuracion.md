# Configuración

- **Estado:** En revisión · **Fecha:** 2026-11-20

## Principio

Una biblioteca de navegador **no lee variables de entorno**: se configura con los atributos y
propiedades del elemento (ver la tabla completa en el [contrato](../04-diseno/contrato-api-publica.md#atributos-y-propiedad-equivalente)).
Se resuelven en `src/config/reader.config.ts` (equivalente a `src/global/*.config.ts` de 05/06):
atributos → VOs → settings con valores por defecto. Un valor inválido emite `AV_INVALID_OPTION` y
usa el valor por defecto.

## Configuraciones típicas

| Escenario | Configuración |
| --- | --- |
| Lo más simple | `<article-voice></article-voice>` |
| Plantilla con el contenido en `.entry-content` | `<article-voice target=".entry-content">` |
| Sin descarga para el visitante | `<article-voice server-url="https://tts.midominio.com">` |
| Todo alojado en el propio sitio (sin terceros) | `model-url="/voz/moss/"`, `ort-wasm-url="/voz/ort/"`, `worker-url="/voz/worker.js"` |
| Solo MOSS, nunca la voz del sistema | `fallback="none"` |

## Content Security Policy

Mínimo para el motor `moss-browser` con recursos de terceros:

```text
script-src 'self' 'wasm-unsafe-eval';
worker-src 'self';
connect-src 'self' https://huggingface.co https://cdn-lfs.huggingface.co https://*.hf.co https://cdn.jsdelivr.net;
```

Con todo alojado en el propio sitio, `connect-src 'self'` basta. Con `moss-server`, se añade el
origen de `server-url`.

## Servidor TTS (motor `moss-server`)

Cualquier servidor que implemente `POST /v1/audio/speech` compatible con OpenAI:

```json
{ "model": "moss-tts-nano", "input": "Texto del segmento", "voice": "<voz>", "response_format": "pcm", "speed": 1.0 }
```

Respuesta: PCM de 16 bits little-endian a 48 kHz (`pcm`) o `wav`. El servidor debe permitir CORS
desde el origen del sitio. Referencia: vLLM-Omni sirve MOSS-TTS-Nano con este contrato.
Guía paso a paso y servidor de ejemplo: [moss-server.md](moss-server.md).

## Desarrollo y CI

| Variable | Dónde | Uso |
| --- | --- | --- |
| `CI` | GitHub Actions | Sin modo observador ni colores |
| `AV_MODEL_CACHE_DIR` | Job nocturno y spike | Carpeta con los pesos ya descargados, para no bajarlos en cada ejecución |
| — | — | La publicación usa Trusted Publishing: **no hay `NPM_TOKEN`** |
