# ADR-0015 · `onnxruntime-web` como única dependencia de runtime, cargada de forma diferida

- **Estado:** Aceptado
- **Fecha:** 2026-11-20
- **Relacionados:** [ADR-0010](0010-cero-dependencias-de-runtime.md) (excepción), ADR-0014

## Contexto

ADR-0010 prohíbe dependencias de runtime salvo excepción justificada. Ejecutar los grafos ONNX de
MOSS-TTS-Nano en el navegador requiere un runtime de ONNX. Las cuatro preguntas de ADR-0010:

1. **¿Hacerlo a mano es claramente peor?** Sí: un runtime de ONNX con kernels WebGPU y WASM es un
   proyecto en sí mismo.
2. **Mantenimiento:** `onnxruntime-web` es de Microsoft, se publica con cada versión de ONNX
   Runtime y es el runtime para el que OpenMOSS exportó los grafos ("designed for onnxruntime and
   onnxruntime-web").
3. **Árbol y licencia:** MIT. ⏳ El árbol transitivo se audita en el spike T-000 antes de fijar la versión.
4. **Tamaño:** el JS ronda decenas de kB y el `.wasm` unos 12 MB; ninguno de los dos va en el
   bundle principal.

## Decisión

- `onnxruntime-web` es `dependency` con **versión exacta** (sin `^`).
- Se importa **solo dentro del Web Worker** y **solo después del primer play**: el bundle principal no
  lo contiene (lo comprueba size-limit, RNF-PERF-12).
- Los archivos `.wasm` se sirven desde `ort-wasm-url` si el sitio los aloja, o desde jsDelivr con la
  misma versión exacta. Se documenta la CSP necesaria (`'wasm-unsafe-eval'`, `worker-src`).
- Ninguna otra dependencia de runtime. El tokenizador SentencePiece, la normalización de texto y la
  detección del artículo se escriben en el propio dominio.

## Alternativas consideradas

| Opción | Por qué no |
| --- | --- |
| `peerDependency` | Rompe "importar y listo": el sitio tendría que instalar y configurar ORT |
| Cargar ORT desde un CDN sin declararlo | La versión no quedaría fijada en el lockfile ni la auditaría `pnpm audit` |
| `@huggingface/transformers` | No tiene soporte para esta arquitectura y arrastra mucho más código |

## Consecuencias

- Dependabot propone actualizaciones de ORT; cada una pasa la suite de inferencia con audio de
  referencia (los mismos tokens deben dar el mismo audio con muestreo fijo).
