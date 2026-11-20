# ADR-0016 · Portar a TypeScript el runtime de referencia Apache-2.0; no copiar la demo sin licencia

- **Estado:** Aceptado
- **Fecha:** 2026-11-20
- **Relacionados:** ADR-0006, ADR-0015

## Contexto

Hay dos fuentes de código para ejecutar MOSS-TTS-Nano con ONNX:

| Repositorio | Contenido útil | Licencia (verificada 2026-11-20) |
| --- | --- | --- |
| `OpenMOSS/MOSS-TTS-Nano` | `onnx_tts_runtime.py`, `ort_cpu_runtime.py`, `text_normalization_pipeline.py`, exportador de grafos para navegador | **Apache-2.0** |
| `OpenMOSS/MOSS-TTS-Nano-Reader` | Extensión con runtime en JS (`browser_onnx_runtime.js`, tokenizador) | **Sin licencia declarada** |

Código sin licencia no se puede copiar ni adaptar en un proyecto MIT, aunque sea público.

## Decisión

- El bucle de inferencia (prefill, pasos de decodificación, muestreo, decodificación del códec) se
  **porta a TypeScript desde el runtime Python Apache-2.0**, con atribución en `NOTICE` y en la
  cabecera de los archivos portados, como exige Apache-2.0 §4.
- **No se copia ni se adapta código de `MOSS-TTS-Nano-Reader`.** Se puede usar para observar su
  comportamiento (por ejemplo, ejecutando la extensión), no como fuente. Si sus autores publican una
  licencia compatible, se revisa este ADR.
- Los pesos no se redistribuyen: se descargan del repo de origen (ADR-0014), así que el paquete
  solo incluye la atribución.

## Consecuencias

- `NOTICE` en la raíz y en el tarball publicado (`files`).
- Más trabajo de port, que es el núcleo del spike T-000.
- La revisión de PRs comprueba que los archivos portados conservan su cabecera de atribución.
