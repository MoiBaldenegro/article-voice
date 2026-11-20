# ADR-0018 · Variante del modelo y entrega de los pesos

- **Estado:** Aceptado · decidido con el informe del spike [T-000](../spikes/T-000-informe.md)
- **Fecha:** 2026-11-20
- **Relacionados:** ADR-0014, [Rendimiento](../../06-calidad/rendimiento.md)

## Contexto

Ver las dos variantes y sus tamaños en ADR-0014. La oficial está probada pero pesa ≈ 685 MB; la
cuantizada a 4 bits de la comunidad pesa ≈ 168 MB pero no tiene uso público y su calidad es
desconocida. No hay métricas publicadas de velocidad en navegador.

## Lo que ya está decidido (independiente de la variante)

- Los pesos se descargan de una URL base configurable (`model-url`). Por defecto, el repo de Hugging
  Face **fijado a un commit** (`/resolve/<sha>/…`), nunca a `main`.
- El paquete incluye un **manifiesto** con la lista de archivos, su tamaño y su **SHA-256**. Cada
  archivo se verifica al descargarlo; si no coincide, error `AV_MODEL_INTEGRITY` y no se usa.
- Los archivos se guardan en Cache Storage (`article-voice-models-v<manifiesto>`), se reutilizan
  entre páginas del mismo sitio y se pueden borrar con `clearModelCache()`.
- La UI muestra el tamaño **antes** de descargar y el progreso durante la descarga, con opción de cancelar.

## Opciones a decidir con el spike

| Opción | Condición para elegirla |
| --- | --- |
| A · Cuantizada de la comunidad (4 bits) | Calidad aceptable en la escucha ciega (CP-SPIKE-3) y RNF-PERF-10/11 cumplidos |
| B · Cuantización propia (int8/q4) desde los ONNX oficiales, publicada en un repo propio | A no cumple calidad, pero una cuantización propia sí |
| C · Oficial completa | Ninguna cuantizada cumple; entonces `auto` no elige `moss-browser` en móviles |

## Decisión

Se elige la **opción C: variante oficial completa** (≈ 728 MiB) como predeterminada, fijada a estos commits de Hugging Face:

- `OpenMOSS-Team/MOSS-TTS-Nano-100M-ONNX` @ `f52645cb467506d8e18e746ddd59482685b74e58`
- `OpenMOSS-Team/MOSS-Audio-Tokenizer-Nano-ONNX` @ `ceff0d0749bfb3fa2d61149794ec6feef0d1e1ae`

Motivo (datos del informe): el port es exacto, pero en Chrome el mejor caso medido (WASM 4 hilos, aislado) da RTF 1,85 y WebGPU 10,6, frente a ≤ 0,8 y ≤ 0,5 exigidos; el cuello de botella es el cómputo en el navegador, no el tamaño de los pesos. La variante cuantizada (A, 168 MiB) no se midió en navegador ni se escuchó a ciegas, así que no se puede elegir A ni B. Consecuencia: `auto` no elige `moss-browser` hasta cumplir RNF-PERF-11; MOSS es opt-in con el tamaño visible. A y B se reabren con una medición nueva (CA-5 queda pendiente).

## Consecuencias

Al aceptar este ADR se fija el commit de Hugging Face y se genera el manifiesto con los hashes.
