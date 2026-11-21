# T-000 · Informe del spike: MOSS-TTS-Nano en el navegador

- **Fecha de las mediciones:** 2026-11-20 · **Código:** `spikes/t000-moss-browser/` (desechable, ADR-0016)
- **Resultado en una línea:** el port a TypeScript es **exacto** (mismos tokens y mismos frames que Python), pero
  **en Chrome ninguna configuración medida cumple RNF-PERF-11**: el mejor caso (WASM con 4 hilos) tiene RTF ≈ 1,85; la cuantizada q4 (solo WebGPU) da RTF 5,5.

## 1. Entorno exacto

| Elemento | Valor |
| --- | --- |
| Equipo | PC de escritorio Windows 10 Pro 10.0.19045 · Intel Core i7-12700 (12.ª gen) |
| GPU | NVIDIA GeForce RTX 4060 Ti, 8 GB, driver 581.29 (adaptador WebGPU: vendor `nvidia`, arquitectura `lovelace`) |
| Navegador | Google Chrome 157.0.8103.79 controlado con `playwright-core`, `--enable-unsafe-webgpu`, sin interfaz |
| Runtimes | `onnxruntime-web` 1.31.1 y `onnxruntime-node` 1.31.1 (port TS) · `onnxruntime` 1.32.0 (referencia Python) |
| Lenguajes | Node v26.13.0 · Python 3.13.7 (venv `spikes/t000-moss-browser/.venv`, ignorado por git) |
| Hardware de referencia | **No es Ref-D** (portátil de gama media con GPU integrada). Este equipo es más potente: los números son una cota optimista |

Pesos: commits fijados, descargados con `spikes/t000-moss-browser/scripts/download-models.mjs`, que verifica el
SHA-256 de cada archivo y escribe `models/manifest.json` (la carpeta `models/` está ignorada por git).

| Repo | Commit | Bytes |
| --- | --- | --- |
| `OpenMOSS-Team/MOSS-TTS-Nano-100M-ONNX` | `f52645cb467506d8e18e746ddd59482685b74e58` | 672 627 229 |
| `OpenMOSS-Team/MOSS-Audio-Tokenizer-Nano-ONNX` | `ceff0d0749bfb3fa2d61149794ec6feef0d1e1ae` | 90 578 835 |
| `danyalmalik/MOSS-TTS-Nano-100M-ONNX-WebGPU` (cuantizada q4) | `95c5b2837c41178879a1794381a11b483bc7f518` | 176 522 124 |

## 2. Paridad con la referencia Python (CA-1, CA-2, CA-3)

- **CA-1 · cumplido.** El tokenizador SentencePiece BPE en TS produce los mismos ids que `sentencepiece` en las
  6 cadenas del corpus (es/en, Unicode, emoji, espacios múltiples, cadena vacía) y en las 3 frases del bucle.
- **CA-2 · cumplido.** Con los números aleatorios de la referencia, el bucle portado genera los **mismos frames**
  que Python: 55/55 (es_corta), 64/64 (en_corta), 81/81 (es_larga), sin ningún frame distinto
  (`out/node/node-parity.json`). En el navegador hay paridad exacta de es_corta (55/55) en WebGPU,
  WebGPU con KV en GPU, WASM 1 hilo y WASM 4 hilos.
- **CA-3 · cumplido en lo medible.** Los WAV de 48 kHz del port TS y de Python tienen el mismo número de muestras y
  difieren como máximo en 1 LSB de 16 bits (SNR 64–66 dB), diferencia de redondeo entre versiones de ORT. Quien
  ejecutó este informe no pudo escucharlos; la inteligibilidad se apoya en la igualdad de frames con la
  referencia. Falta una escucha humana de `out/node/*.wav`.

## 3. Velocidad en CPU nativa (4 hilos)

| Medida | Python (referencia) | Node (port TS) |
| --- | --- | --- |
| ms por frame, mediana | 26,3 (es) / 26,4 (en) | 37,1 / 36,4 / 36,3 |
| ms por frame, p95 | 30,3 / 29,6 | 49,5 / 53,9 / 49,9 |
| Primer audio | 235 ms / 155 ms | 215 / 183 / 218 ms |
| RTF | 0,40–0,42 (generación) | 0,76–0,79 (streaming con códec) |

Un frame equivale a 80 ms de audio: 37 ms/frame ≈ 0,46 de RTF solo en el bucle.

## 4. Navegador (CA-4): artículo de 6 frases, 44,16 s de audio, reproduciéndose en streaming

Datos en `out/bench-oficial.json` y `out/bench-resto.json`. RTF total = tiempo de síntesis / duración del audio.
«RTF por frame» = ms por frame / 80 ms (solo generación, sin códec).

| Configuración | Primer audio (ms) | RTF total | ms/frame mediana | ms/frame p95 | RTF por frame (med. / p95) | Huecos en la reproducción | Memoria de Chrome (Δ MB) | Init (ms) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| WebGPU, KV en CPU | 2 621 | 10,56 | 513 | 582 | 6,4 / 7,3 | 408 s | +661 | 11 466 |
| WebGPU, KV en GPU | — | — | — | — | — | — | — | — |
| WASM, 1 hilo | 2 790 | 3,00 | 124 | 154 | 1,55 / 1,93 | 75 s | no fiable | 14 424 |
| WASM, 4 hilos (aislado COOP/COEP) | **893** | **1,85** | **74** | **102** | **0,93 / 1,28** | 26 s | +2 218 | 11 624 |

Notas:
- **WebGPU con KV en GPU falló:** Chrome devolvió `CheckOutOfMemoryHRESULTImpl … CreateBuffer` y el dispositivo
  quedó inservible (`OrtRun … Invalid Buffer`) tras la paridad. No hay cifras de velocidad.
- Memoria: diferencia de `WorkingSet64` de todos los procesos `chrome` antes y después de la corrida. En WASM 1 hilo
  salió negativa porque otros procesos de Chrome ajenos al spike se cerraron durante la medición; se descarta. No se
  usó `measureUserAgentSpecificMemory`.
- Con RTF > 1 la síntesis no alcanza a la reproducción: hay cortes continuos (la columna suma el tiempo de silencio
  acumulado sobre 44 s de audio).
- Tiempos de creación de sesión (ms) en WebGPU: prefill 3 441, decode 2 080, local 3 035, códec 1 403 / 1 436; en WASM
  4 hilos: 2 614, 2 319, 3 581, 1 453 / 1 602.
- Una corrida por configuración, un solo equipo: son órdenes de magnitud, no el p95 de 20 repeticiones de RNF-PERF-10.

## 5. Variante cuantizada (CA-5, T-000b): medida en Chrome

- **Tamaño real de descarga: 176 522 124 B ≈ 168 MiB** (`moss_tts_global_shared_q4.data` 69 312 512;
  `moss_tts_local_fixed_sampled_frame_cpu.onnx` 97 983 500; `moss_audio_tokenizer_decode_step_cpu.onnx` 7 719 606;
  `moss_tts_prefill_q4.onnx` 442 349; `moss_tts_decode_step_q4.onnx` 454 013; más `tokenizer.json`, `moss.json`,
  README y LICENSE). La oficial son 763 206 064 B ≈ 728 MiB: la cuantizada pesa ≈ 23 %.
- **Port del contrato (T-000b):** el worker del spike lee `moss.json` (plantillas, voces, estado del códec) y
  carga `onnx/*_q4.onnx` (`MatMulNBits`, `GatherBlockQuantized`) con el mismo bucle de inferencia. El muestreador y
  el códec (`*_cpu.onnx`) van siempre al motor CPU de ORT-web. El tokenizador sigue siendo el SentencePiece del port
  (mismo `tokenizer.model` oficial; la ficha dice que `tokenizer.json` da los mismos ids): no se portó el formato HF.
- **Hallazgo: la cuantizada solo corre en WebGPU.** En WASM, `prefill`/`decode_step` fallan al crear la sesión:
  `Could not find an implementation for GatherBlockQuantized(1) node ... '/wte/Gather_Q4'`. No hay camino WASM
  para el modelo global q4, y WASM es hoy el único camino que se acerca a la fluidez.

Mismo artículo de 6 frases (44 s de audio en la oficial; 39,6 s en la q4, que habla ≈ 10 % más corto), voz Nathan, Chrome 157, una corrida:

| Configuración | TTFA (ms) | RTF | ms/frame mediana | ms/frame p95 | Memoria Chrome (MB) | Vacíos de búfer / s |
| --- | --- | --- | --- | --- | --- | --- |
| Oficial · WASM 4 hilos aislado | 842 | 1,93 | 78 | 112 | +2 120 | 551 / 29 |
| Oficial · WebGPU | 2 621 | 10,56 | 513 | 582 | +661 | 551 / 408 |
| **q4 · WebGPU** | **903** | **5,50** | **335** | **393** | **+694** | 494 / 167 |
| q4 · WASM | no corre (falta `GatherBlockQuantized`) | – | – | – | – | – |

- La q4 es ≈ 2× más rápida que la oficial en WebGPU y su TTFA entra en RNF-PERF-10 (≤ 2 s), pero **RTF 5,5 frente a
  ≤ 0,5 (RNF-PERF-11)**: sigue sin ser reproducible sin cortes. El tiempo se va en el códec y en las copias CPU↔GPU,
  que la cuantización no reduce (el códec q4 es CPU float16). Las cifras de WASM oficial se repitieron y coinciden
  con la sección 4 (RTF 1,85 → 1,93).
- **Calidad (CP-SPIKE-3): pendiente de personas.** Se preparó el material: `scripts/make-blind-pack.mjs` genera
  `A.wav`/`B.wav` aleatorizados (oficial vs q4, mismo artículo) y `clave.json`; el protocolo exige 5 oyentes y MOS ≥ 3,5
  con diferencia ≤ 0,5. No se emitió ningún juicio de calidad. Según su ficha: WER 11,4 % frente a 9,1 %.
- **Conclusión CA-5:** la q4 no cumple RNF-PERF-11, así que **ADR-0018 no se enmienda a la opción A**.

## 6. Interpretación

1. El runtime Python se porta a TS **sin desvío** con los grafos oficiales.
2. **WebGPU es hoy el peor camino:** con KV en CPU hay copias CPU↔GPU por frame (513 ms/frame) y con KV en GPU
   Chrome se queda sin memoria. En esta máquina WASM es 5–7 veces más rápido.
3. **WASM con 4 hilos es el mejor camino** (RTF 1,85; 0,93 solo en el bucle) pero no llega a RNF-PERF-11
   (≤ 0,8 en WASM ⚑) y exige aislamiento entre orígenes, que un componente embebible no puede imponer a la página
   anfitriona. Sin aislamiento corre a 1 hilo (RTF 3,0).
4. El primer audio es alcanzable en WASM con 4 hilos (0,9 s ≤ 4 s) y casi en WebGPU (2,6 s frente a ≤ 2 s).
5. ORT-web cuesta ≈ 2–2,5× más que ORT nativo en este equipo (WASM 4 hilos frente a Node/Python).
6. Ref-D es más modesto que este PC: ahí los números serán peores.

## 7. Recomendación para ADR-0018

La cuantizada se midió (sección 5: RTF 5,5, solo WebGPU) y el cuello de botella no es el tamaño de los pesos. Se recomienda:

- **Opción C como variante por defecto** (oficial completa, ≈ 728 MiB), con la entrega ya fijada: commit de HF,
  manifiesto con SHA-256, Cache Storage.
- **`auto` no elige `moss-browser`** hasta cumplir RNF-PERF-11; la voz del sistema es el camino por defecto y MOSS
  queda opt-in con el tamaño visible antes de descargar.
- Reabrir A/B solo si una optimización de cómputo (códec, KV en GPU) acerca la cuantizada a RNF-PERF-11 y pasa la escucha ciega.

## 8. Pendiente

1. Escucha ciega CP-SPIKE-3 con 5 personas (material preparado en el spike; ver sección 5).
2. Optimizar WASM (códec en hilo aparte, opciones de sesión) y WebGPU con KV en GPU sin agotar memoria; repetir en un
   equipo tipo Ref-D con 20 repeticiones y `measureUserAgentSpecificMemory`.
3. Escucha humana de los WAV de `out/node/`.

## 9. T-035: optimizaciones medidas (códec por lotes, KV en GPU, q4)

Modelo fijo: MOSS-TTS-Nano (decisión del producto). Mismo artículo de 6 frases, Chrome, WASM 4 hilos aislado,
`bench-browser.ts`, tres repeticiones por configuración. La máquina tenía carga ajena, así que el ruido es grande
(el RTF de una misma configuración varía hasta ×2,9); se reporta la mediana.

| Configuración | TTFA (ms) mediana | RTF por repetición | RTF mediana | ms/frame | Vacíos (s) mediana |
|---|---|---|---|---|---|
| base (códec en el mismo hilo) | 956 | 1,84 / 1,81 / 2,37 | 1,84 | 74,7 | 25,2 |
| batch4-worker (códec en worker aparte, lotes de 4) | 1427 | 1,18 / 1,53 / 0,82 | 1,18 | 80,2 | 5,9 |
| batch8 (lotes de 8, mismo hilo) | 983 | 1,54 / 1,00 / 2,20 | 1,54 | 75,3 | 21,6 |
| **WebGPU + KV en GPU + códec en worker, lotes de 8** (`webgpu-kvgpu-batch8-worker`, T-035b) | 2027 | 4,70 / 4,80 / 4,87 | **4,80** | 381,9 | 164,7 |

Conclusiones:
1. Sacar el códec a un worker y decodificarlo por lotes es la mejora más clara: RTF mediano 1,84 → 1,18 y los
   vacíos de audio bajan de ≈25 s a ≈6 s. En la mejor repetición (0,82) ya hay tiempo real, pero la mediana no lo es.
2. Lotes de 8 sin worker no mejoran de forma fiable (1,00 a 2,20).
3. El código del intento está en el spike (`src/moss-runtime.ts`, `src/browser/worker.ts`, `page.ts`, `bench-browser.ts`).
4. **KV en GPU (T-035b, 2026-11-21).** `webgpu-kvgpu-batch8-worker`, 3 repeticiones, GPU NVIDIA (Lovelace), Chrome:
   **0 errores `Invalid Buffer`** en las 3 repeticiones, en la corrida con códec adaptativo (`webgpu-kvgpu`, RTF 8,07)
   y en la paridad de frames (55/55 iguales a Python). La causa del fallo anterior era no liberar los tensores
   `gpu-buffer` del KV de cada paso (`disposeAll` en `moss-runtime.ts`). RTF mediana **4,80** (4,70–4,87, muy estable),
   ≈382 ms/frame, memoria Chrome ≈770 MB. Es peor que WASM con worker (1,18): con KV en GPU el cuello de botella es el
   `local_fixed`/sincronización por frame, no la copia del KV. No cumple RNF-PERF-11; `auto` sigue sin elegir moss-browser.
5. **q4 + WebGPU + KV en GPU (T-035c, 2026-11-21).** `q4-webgpu-kvgpu-batch8-worker`, 3 repeticiones, mismo Chrome/GPU:
   RTF 2,71 / 3,03 / 3,02 → **mediana 3,02**, ≈244 ms/frame, TTFA ≈1,2 s, 61-62 vacíos (≈78 s), memoria ≈720 MB.
   Mejora frente a oficial+KV GPU (4,80) y frente a q4 sin KV GPU (5,5), pero **no cumple RTF<1** y sigue peor que WASM
   con worker (1,18).
6. **WebNN (T-035c).** Chrome 157 expone `navigator.ml` (gpu/cpu/npu crean contexto) con
   `--enable-features=WebMachineLearningNeuralNetwork` y el EP `webnn` (`deviceType: 'gpu'`) de onnxruntime-web 1.31.1.
   Oficial fp32 con `webnn-gpu-batch8-worker`: carga y da frames idénticos a Python (55/55); RTF 3,43 / 2,47 / 3,45 →
   **mediana 3,43**, ≈249 ms/frame. **q4 no carga en WebNN**: `GatherBlockQuantized` ('/wte/Gather_Q4') sin proveedor
   asignado, así que ni q4 ni sus pesos más pequeños aplican. No cumple RTF<1.
7. **Conclusión T-035c:** ninguna opción de GPU (WebGPU oficial 4,80; q4 WebGPU+KV GPU 3,02; WebNN 3,43) alcanza RTF<1;
   la mejor sigue siendo WASM+worker (1,18, mejor repetición 0,82). Las medidas se hicieron con la máquina con carga
   ajena posible (no se pudo garantizar una máquina vacía); la dispersión entre repeticiones fue baja (≤×1,4) en GPU.
   Crudos: `spikes/t000-moss-browser/out/bench-q4kv-w*.log`, `bench-webnn-*`.
   `auto` sigue sin elegir moss-browser: RNF-PERF-11 no se cumple de forma estable.
