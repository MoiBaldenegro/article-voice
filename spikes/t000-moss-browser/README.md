# Spike T-000 · MOSS-TTS-Nano en el navegador

Código **desechable** del [ticket T-000](../../docs/08-tareas/tickets/T-000-spike-moss-en-el-navegador.md).
No sigue la arquitectura del paquete a propósito; lo útil se reescribe en T-030.

| Archivo | Qué es |
| --- | --- |
| `reference/reference.py` | Corre el runtime oficial (Python, Apache-2.0) y guarda datos dorados: ids, aleatorios, frames |
| `src/sentencepiece.ts` | Tokenizador SentencePiece BPE en TS (con el charsmap NFKC exacto) |
| `src/moss-runtime.ts` | Bucle de inferencia portado; mismo código para onnxruntime-node y -web |
| `src/node-parity.ts` | CA-1/CA-2/CA-3: compara con los datos dorados y mide |

Los pesos no se guardan en el repo. Descárgalos de Hugging Face (commits fijados en el informe) a
una carpeta propia y pásala como argumento.
