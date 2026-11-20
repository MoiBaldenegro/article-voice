# T-000 · Spike: MOSS-TTS-Nano en el navegador, medido

- **Tipo:** spike (investigación con código desechable) · **Estado:** 🔄 En curso · **Estimación:** L (time-box: 3 días)
- **Épica:** S · **Bloquea a:** T-030, T-031, T-032 y la aceptación de ADR-0018

## Contexto

Todo el producto asume que MOSS-TTS-Nano puede narrar en el navegador del visitante sin cortes
(R-1 del PRD). Nadie ha publicado cifras de velocidad en navegador, la variante oficial pesa
≈ 685 MB y la cuantizada de la comunidad (≈ 168 MB) no está probada. La demo oficial en JS no
tiene licencia, así que hay que portar el runtime Python (Apache-2.0) (ADR-0016).

## Objetivo

Responder con números, en el hardware de referencia:

1. ¿Funciona el runtime portado a TypeScript con los grafos oficiales? (mismos tokens que Python)
2. ¿Cuál es el RTF y el tiempo hasta el primer audio con WASM y con WebGPU?
3. ¿Cuánto pesa y cómo suena la variante cuantizada frente a la oficial?
4. ¿Cuánta memoria usa?

## Fuera de alcance

Código de producción, UI, caché, verificación de hashes, normalización de texto. El código del
spike vive en `spikes/t000-moss-browser/` y **no se reutiliza tal cual**: lo útil se reescribe en
T-030 con las reglas de la arquitectura.

## Criterios de aceptación

- **CA-1 (CP-SPIKE-2):** el tokenizador en TS produce los mismos ids que el de referencia en un corpus de frases es/en.
- **CA-2 (CP-SPIKE-1):** con muestreo determinista, el bucle portado (Node + onnxruntime-node) produce los mismos códigos de audio que el runtime Python para 3 frases.
- **CA-3:** el bucle portado genera un WAV inteligible en español y en inglés.
- **CA-4:** una página de prueba con onnxruntime-web en un Web Worker reproduce audio en streaming; se registran el tiempo hasta el primer audio, el RTF (mediana y p95) y la memoria pico, para WASM y WebGPU.
- **CA-5:** lo mismo con la variante cuantizada, más su tamaño real de descarga.
- **CA-6:** informe en `docs/03-arquitectura/spikes/T-000-informe.md` con tablas, entorno exacto (equipo, navegador, versiones) y recomendación para ADR-0018 (opción A, B o C).

## Plan

| Paso | Qué | Resultado |
| --- | --- | --- |
| 1 | Leer `onnx_tts_runtime.py`, `ort_cpu_runtime.py` e `infer_onnx.py` (Apache-2.0) y los metadatos `tts_browser_onnx_meta.json` / `codec_browser_onnx_meta.json` | Mapa de entradas, salidas y bucle |
| 2 | Ejecutar la referencia en Python (`infer_onnx.py`, CPU) y guardar tokens y códigos con semilla fija | Datos dorados para CA-1/CA-2 + RTF de CPU de referencia |
| 3 | Portar tokenizador y bucle a TS; ejecutarlo en Node con `onnxruntime-node` | CA-1, CA-2, CA-3 |
| 4 | Mismo código en un Web Worker con `onnxruntime-web` (WASM, luego WebGPU) en una página local | CA-4 |
| 5 | Repetir con la variante cuantizada | CA-5 |
| 6 | Informe y propuesta de ADR-0018 | CA-6 |

## Enlaces

- PRD R-1, R-2, R-3 · RNF-PERF-10, 11, 14, RNF-NET-02 · ADR-0014, 0015, 0016, 0018
- Modelo: github.com/OpenMOSS/MOSS-TTS-Nano · huggingface.co/OpenMOSS-Team/MOSS-TTS-Nano-100M-ONNX · huggingface.co/OpenMOSS-Team/MOSS-Audio-Tokenizer-Nano-ONNX · huggingface.co/danyalmalik/MOSS-TTS-Nano-100M-ONNX-WebGPU

## Cambio publicado

- [x] Ninguno (spike)
