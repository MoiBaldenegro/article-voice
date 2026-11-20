# ADR-0014 · Motor de voz como puerto, con tres adaptadores

- **Estado:** Aceptado
- **Fecha:** 2026-11-20
- **Relacionados:** ADR-0015, ADR-0018, [Modelo de amenazas](../modelo-de-amenazas.md)

## Contexto

El producto usa **MOSS-TTS-Nano** (Apache-2.0, ~100 M de parámetros, 20 idiomas incluido el
español, 48 kHz, generación por partes). Datos medidos el 2026-11-20 en Hugging Face:

| Variante | Descarga para sintetizar (sin clonar voz) |
| --- | --- |
| Oficial ONNX (`OpenMOSS-Team/MOSS-TTS-Nano-100M-ONNX` + decodificador del códec) | **≈ 685 MB** |
| Comunidad, cuantizada a 4 bits para WebGPU (`danyalmalik/MOSS-TTS-Nano-100M-ONNX-WebGPU`) | **≈ 168 MB**, sin uso público ni mediciones |

La velocidad en navegador **no está publicada**. Descargar cientos de megas no es aceptable para
todos los visitantes ni en todos los dispositivos. Además, "importar y listo" exige que haya voz
aunque el dispositivo no pueda ejecutar el modelo.

## Decisión

El dominio define el puerto `SpeechEngine` (preparar, sintetizar un segmento como flujo de audio y
liberar). Hay tres adaptadores:

| Motor (`engine=`) | Dónde corre MOSS | Descarga del visitante | Texto sale del navegador | Uso previsto |
| --- | --- | --- | --- | --- |
| `moss-browser` | En el navegador del visitante (onnxruntime-web en un Web Worker; WebGPU, o WASM si no hay) | Pesos del modelo, la primera vez; luego, de caché | **No** | Por defecto; privacidad y cero servidores |
| `moss-server` | En un servidor del sitio con API compatible con OpenAI `POST /v1/audio/speech` (por ejemplo vLLM-Omni) | Solo el audio | Sí, al servidor configurado | Sitios que no quieren que el visitante descargue el modelo |
| `web-speech` | No usa MOSS: voz del sistema (`speechSynthesis`) | Nada | Depende del sistema operativo | **Respaldo** cuando lo anterior no está disponible |

Selección con `engine="auto"` (por defecto):

1. Si hay `server-url`, usar `moss-server`.
2. Si no, y el dispositivo cumple los requisitos de capacidad (WebGPU o WASM con hilos, memoria
   suficiente), usar `moss-browser`.
3. Si no, y el respaldo está permitido (`fallback="web-speech"`, por defecto), usar `web-speech`
   **indicándolo en la UI** ("voz del sistema").
4. Si no, error `AV_ENGINE_UNAVAILABLE` y el botón no se muestra.

Reglas comunes:

- **Ningún byte del modelo se descarga antes de que el visitante pulse play** (RN-06).
- Los pesos **no van dentro del paquete de npm**: se descargan de `model-url` (por defecto, el repo
  de Hugging Face fijado a un commit concreto) y se verifican con SHA-256 (ADR-0018).
- Quien use el paquete puede aportar su propio motor que implemente `SpeechEngine` (API `@beta`).

## Alternativas consideradas

| Opción | Por qué no |
| --- | --- |
| Solo en el navegador | Cientos de MB para cada visitante; sin voz en dispositivos modestos |
| Solo servidor | Contradice "importar y listo"; obliga a cada sitio a operar una GPU o CPU dedicada |
| Sin respaldo | El botón desaparecería justo en los dispositivos más comunes |

## Consecuencias

- Las tres implementaciones pasan la misma suite de contrato del puerto (estrategia de pruebas).
- La viabilidad de `moss-browser` como motor por defecto depende del spike T-000; si no cumple los
  RNF de rendimiento, `auto` pasa a preferir el respaldo y se documenta (ADR nuevo).
- Señal de revisión: si OpenMOSS publica un paquete oficial de JS, evaluar usarlo como adaptador.
