# Diagramas de secuencia y de estados

- **Estado:** En revisión · **Fecha:** 2026-11-20

## Estados de la narración

```mermaid
stateDiagram-v2
  [*] --> idle : artículo detectado
  idle --> preparing : play (motor sin preparar)
  idle --> buffering : play (motor listo)
  preparing --> buffering : motor listo
  preparing --> idle : descarga cancelada / rechazada
  preparing --> error : fallo de descarga, integridad o inicio
  buffering --> playing : primer fragmento de audio
  playing --> buffering : la salida se queda sin audio
  playing --> paused : pause
  buffering --> paused : pause
  paused --> buffering : play
  playing --> ended : terminó el último segmento
  ended --> buffering : play (desde el inicio)
  playing --> error : fallo de síntesis
  buffering --> error : fallo de síntesis
  error --> buffering : play (reintento desde el cursor)
  playing --> idle : stop
  paused --> idle : stop
  buffering --> idle : stop
```

Cualquier otra transición es un error de programación (`InvalidNarrationTransition`), que en
producción se ignora y se registra con `Logger.warn`.

## Primer play con descarga (motor `moss-browser`)

```mermaid
sequenceDiagram
  autonumber
  actor V as Visitante
  participant E as ArticleVoiceElement
  participant P as PlayNarration
  participant PE as PrepareEngine
  participant MS as CacheModelStore
  participant ENG as MossBrowserEngine
  participant W as Worker (MOSS + ORT)
  V->>E: clic en play
  E->>P: execute()
  P->>PE: execute(signal)
  PE->>MS: missing(manifest)
  MS-->>PE: 6 archivos, 168 MB
  PE-->>E: download-required { bytes }
  E-->>V: "Descargar voz · 168 MB"
  V->>E: confirmar
  loop por archivo pendiente
    PE->>MS: fetch + SHA-256 + guardar
    MS-->>E: download-progress
  end
  PE->>ENG: prepare()
  ENG->>W: init { files, backend: webgpu }
  alt WebGPU falla
    W->>W: reintenta con wasm
  end
  W-->>ENG: ready { voices }
  P->>ENG: synthesize(segmento 0, signal)
  ENG->>W: synth { text, voice }
  W-->>ENG: AudioChunk (Float32Array transferido) ×N
  ENG-->>P: AsyncIterable<AudioChunk>
  P->>E: estado playing
```

## Reproducción con adelanto

```mermaid
sequenceDiagram
  participant P as PlayNarration
  participant N as Narration
  participant ENG as SpeechEngine
  participant O as WebAudioOutput
  P->>N: pendingSynthesis() → [0, 1, 2]  (lookahead = 2)
  par síntesis en orden
    P->>ENG: synthesize(0) → chunks → O.enqueue(0, chunk)
    P->>ENG: synthesize(1) → chunks → O.enqueue(1, chunk)
    P->>ENG: synthesize(2) → chunks → O.enqueue(2, chunk)
  end
  O-->>P: segmentEnded(0)
  P->>N: segmentEnded() → cursor = 1
  P->>N: pendingSynthesis() → [3]
  P->>ENG: synthesize(3) …
  Note over O: Si la cola se vacía antes de tiempo:<br/>underrun → estado buffering
```

La síntesis es **secuencial** en el worker (un modelo, una cola), pero va por delante de la
reproducción; el paralelismo está entre síntesis y reproducción, no entre segmentos.

## Selección del motor (`engine="auto"`)

```mermaid
flowchart TD
  A[engine = auto] --> B{¿server-url?}
  B -- sí --> S[moss-server]
  B -- no --> C{¿WebGPU o WASM con hilos<br/>y memoria suficiente?}
  C -- sí --> M[moss-browser]
  C -- no --> D{¿fallback = web-speech<br/>y hay voz del sistema para el idioma?}
  D -- sí --> W[web-speech + etiqueta 'voz del sistema']
  D -- no --> X[AV_ENGINE_UNAVAILABLE<br/>botón oculto]
```
