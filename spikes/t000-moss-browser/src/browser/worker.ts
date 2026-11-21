/// <reference lib="webworker" />
/**
 * Spike T-000 · worker de inferencia con onnxruntime-web (WebGPU o WASM).
 * Mensajes: init → ready; synth (segmentos) → chunk* → segment-done* → done.
 */
import { SentencePieceBpe } from '../sentencepiece.ts';
import { MossRuntime, prepareText, type SessionRole, type OrtLike, type OrtSession, type MossManifest, type OrtTensor } from '../moss-runtime.ts';

declare const self: DedicatedWorkerGlobalScope;

interface InitMsg {
  type: 'init';
  backend: 'webgpu' | 'wasm' | 'webnn';
  threads: number;
  modelBase: string; // termina en '/', contiene MOSS-TTS-Nano-100M-ONNX/ y MOSS-Audio-Tokenizer-Nano-ONNX/
  gpuKvCache: boolean;
  variant?: 'official' | 'q4';
  only?: SessionRole[];
}
interface SynthMsg {
  type: 'synth';
  segments: string[];
  voice: string;
  replayDraws?: number[][]; // por segmento, para comprobar paridad
  seed: number;
  codecPolicy: string; // 'single' | 'adaptive' | 'batch:N' | 'batch:N:async'
}

let runtime: MossRuntime | null = null;
let codecPort: MessagePort | null = null;
let tokenizer: SentencePieceBpe | null = null;
let manifest: MossManifest | null = null;

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return {
    random() {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
  };
}

async function init(msg: InitMsg): Promise<void> {
  const t0 = performance.now();
  const ort = (await import(/* @vite-ignore */ '/ort/ort.webgpu.min.mjs' as string)) as typeof import('onnxruntime-web');
  ort.env.wasm.wasmPaths = '/ort/';
  ort.env.wasm.numThreads = msg.threads;
  const q4 = msg.variant === 'q4';
  const tts = `${msg.modelBase}MOSS-TTS-Nano-100M-ONNX/`;
  const codec = `${msg.modelBase}MOSS-Audio-Tokenizer-Nano-ONNX/`;
  const q4Base = `${msg.modelBase}danyalmalik__MOSS-TTS-Nano-100M-ONNX-WebGPU/`;
  const getJson = async (u: string) => (await fetch(u)).json();
  let ttsMeta: any;
  let codecMeta: any;
  if (q4) {
    // Contrato de grafos de la variante cuantizada: moss.json + onnx/*_q4.onnx (MatMulNBits).
    const moss = await getJson(`${q4Base}moss.json`);
    const names = (kind: string) => Array.from({ length: moss.global_layers }, (_, i) => [`${kind}_key_${i}`, `${kind}_value_${i}`]).flat();
    manifest = {
      tts_config: moss.tts,
      prompt_templates: moss.templates,
      generation_defaults: moss.generation,
      builtin_voices: Object.entries(moss.voices).map(([voice, v]: [string, any]) => ({ voice, display_name: v.label, group: v.group, prompt_audio_codes: v.codes })),
    } as MossManifest;
    ttsMeta = {
      files: {
        prefill: 'onnx/moss_tts_prefill_q4.onnx',
        decode_step: 'onnx/moss_tts_decode_step_q4.onnx',
        local_fixed_sampled_frame: 'onnx/moss_tts_local_fixed_sampled_frame_cpu.onnx',
      },
      external_data_files: {
        'onnx/moss_tts_prefill_q4.onnx': ['onnx/moss_tts_global_shared_q4.data'],
        'onnx/moss_tts_decode_step_q4.onnx': ['onnx/moss_tts_global_shared_q4.data'],
      },
      model_config: { audio_codebook_sizes: moss.tts.audio_codebook_sizes, hidden_size: 768 },
      onnx: {
        prefill_output_names: ['global_hidden', ...names('present')],
        decode_input_names: ['input_ids', 'past_valid_lengths', ...names('past')],
        decode_output_names: ['global_hidden', ...names('present')],
      },
    };
    codecMeta = {
      files: { decode_step: 'onnx/moss_audio_tokenizer_decode_step_cpu.onnx' },
      external_data_files: {},
      codec_config: { sample_rate: moss.codec.sample_rate, channels: moss.codec.channels, downsample_rate: moss.codec.downsample_rate, num_quantizers: moss.codec.num_quantizers },
      streaming_decode: { transformer_offsets: moss.codec.transformer_offsets, attention_caches: moss.codec.attention_caches },
    };
    // El tokenizer.json de q4 es el mismo SentencePiece BPE; se usa el .model oficial (mismos ids).
    tokenizer = new SentencePieceBpe(new Uint8Array(await (await fetch(`${tts}tokenizer.model`)).arrayBuffer()));
  } else {
    manifest = (await getJson(`${tts}browser_poc_manifest.json`)) as MossManifest;
    ttsMeta = await getJson(`${tts}tts_browser_onnx_meta.json`);
    codecMeta = await getJson(`${codec}codec_browser_onnx_meta.json`);
    tokenizer = new SentencePieceBpe(new Uint8Array(await (await fetch(`${tts}tokenizer.model`)).arrayBuffer()));
  }

  const sessionTimes: Record<string, number> = {};
  runtime = await MossRuntime.create(ort as unknown as OrtLike, manifest, ttsMeta, codecMeta, async (role, file, data) => {
    const base = q4 ? q4Base : role.startsWith('codec') ? codec : tts;
    const ts = performance.now();
    // En q4 el muestreador y el códec son grafos _cpu: van siempre al motor CPU (wasm).
    const ep: string = q4 && role !== 'prefill' && role !== 'decode' ? 'wasm' : msg.backend;
    const options: Record<string, unknown> = {
      executionProviders: [ep === 'webnn' ? { name: 'webnn', deviceType: 'gpu' } : ep],
      graphOptimizationLevel: 'all',
      externalData: data.map((d) => ({ path: d.split('/').pop()!, data: `${base}${d}` })),
    };
    // KV cache en la GPU para no copiar decenas de MB por paso entre GPU y CPU.
    if (msg.backend === 'webgpu' && msg.gpuKvCache && (role === 'prefill' || role === 'decode')) {
      const loc: Record<string, string> = {};
      for (let i = 0; i < 12; i++) {
        loc[`present_key_${i}`] = 'gpu-buffer';
        loc[`present_value_${i}`] = 'gpu-buffer';
      }
      options['preferredOutputLocation'] = loc;
    }
    const session = await ort.InferenceSession.create(`${base}${file}`, options);
    sessionTimes[role] = Math.round(performance.now() - ts);
    return session as unknown as OrtSession;
  }, msg.only);
  self.postMessage({
    type: 'ready',
    initMs: Math.round(performance.now() - t0),
    sessionTimes,
    crossOriginIsolated: self.crossOriginIsolated,
    voices: manifest.builtin_voices.map((v) => v.voice),
  });
}

async function synth(msg: SynthMsg): Promise<void> {
  if (!runtime || !tokenizer || !manifest) throw new Error('no inicializado');
  const rt = runtime;
  const voice = manifest.builtin_voices.find((v) => v.voice === msg.voice)!;
  const sr = rt.sampleRate;
  const start = performance.now();
  let firstChunkAt = -1;
  let emittedSamples = 0;

  for (let s = 0; s < msg.segments.length; s++) {
    const segStart = performance.now();
    const ids = tokenizer.encode(prepareText(msg.segments[s]!));
    const rows = rt.buildRequestRows(voice.prompt_audio_codes, ids);
    const draws = msg.replayDraws?.[s];
    let k = 0;
    const rng = draws ? { random: () => draws[k++] ?? 0.5 } : mulberry32(msg.seed + s);
    const bm = /^batch:(\d+)(:async|:worker)?$/.exec(msg.codecPolicy);
    const viaWorker = bm?.[2] === ':worker';
    const batchN = bm ? Number(bm[1]) : 0;
    const stream = viaWorker ? null : rt.createCodecStream();
    if (viaWorker) codecPort!.postMessage({ type: 'start', segment: s });
    const pending: number[][] = [];
    let emittedFrames = 0;
    let codecMs = 0;

    const asyncCodec = bm?.[2] === ':async';
    let chain: Promise<void> = Promise.resolve();
    const emit = async (batch: number[][]) => {
      const tc = performance.now();
      const channels = await stream!.push(batch);
      codecMs += performance.now() - tc;
      if (channels[0]!.length === 0) return;
      if (firstChunkAt < 0) firstChunkAt = performance.now();
      emittedSamples += channels[0]!.length;
      self.postMessage({ type: 'chunk', segment: s, channels }, channels.map((c) => c.buffer));
    };
    const flush = async (force: boolean) => {
      if (pending.length === 0) return;
      if (batchN > 0) {
        // Lotes fijos: el primero sale con 1 frame para bajar el primer audio.
        const size = firstChunkAt < 0 && emittedFrames === 0 ? 1 : batchN;
        if (!force && pending.length < size) return;
        const batch = pending.splice(0);
        emittedFrames += batch.length;
        if (viaWorker) {
          codecPort!.postMessage({ type: 'frames', segment: s, frames: batch });
          return;
        }
        if (asyncCodec) chain = chain.then(() => emit(batch));
        else await emit(batch);
        return;
      }
      let budget = 1;
      if (msg.codecPolicy === 'adaptive' && firstChunkAt >= 0) {
        // Misma política que la referencia: cuanto más adelantado va el audio, más frames por llamada.
        const lead = emittedSamples / sr - (performance.now() - firstChunkAt) / 1000;
        budget = lead < 0.2 ? 1 : lead < 0.55 ? 2 : lead < 1.1 ? 4 : 8;
      }
      while (pending.length > 0 && (force || pending.length >= budget)) {
        await emit(pending.splice(0, force ? pending.length : budget));
        if (!force) break;
      }
    };

    const { frames, timings } = await rt.generateFrames(rows, rng, async (frame) => {
      pending.push(frame);
      await flush(false);
    });
    await flush(true);
    await chain;
    if (viaWorker) codecPort!.postMessage({ type: 'end', segment: s });
    self.postMessage({
      type: 'segment-done',
      segment: s,
      frames,
      tokens: ids.length,
      prefillMs: Math.round(timings.prefillMs),
      localMs: timings.localMs,
      decodeMs: timings.decodeMs,
      codecMs: Math.round(codecMs),
      segmentMs: Math.round(performance.now() - segStart),
      audioS: (frames.length * rt.samplesPerFrame) / sr,
    });
  }
  self.postMessage({ type: 'done', totalMs: Math.round(performance.now() - start), firstChunkMs: Math.round(firstChunkAt - start), emittedS: emittedSamples / sr });
}

/** Rol «códec»: decodifica frames recibidos por el puerto y envía el audio a la página. */
function serveCodec(port: MessagePort): void {
  let stream: ReturnType<MossRuntime['createCodecStream']> | null = null;
  let chain: Promise<void> = Promise.resolve();
  let codecMs = 0;
  port.onmessage = (ev) => {
    const d = ev.data;
    chain = chain.then(async () => {
      if (d.type === 'start') {
        stream = runtime!.createCodecStream();
        codecMs = 0;
      } else if (d.type === 'frames') {
        const t = performance.now();
        const channels = await stream!.push(d.frames);
        codecMs += performance.now() - t;
        if (channels[0]!.length > 0) self.postMessage({ type: 'chunk', segment: d.segment, channels }, channels.map((c) => c.buffer));
      } else if (d.type === 'end') {
        self.postMessage({ type: 'codec-end', segment: d.segment, codecMs: Math.round(codecMs) });
      }
    }).catch((err) => self.postMessage({ type: 'error', message: String((err as Error)?.stack ?? err) }));
  };
}

self.onmessage = async (e: MessageEvent<InitMsg | SynthMsg>) => {
  try {
    if ((e.data as any).type === 'port') {
      const port: MessagePort = (e as any).ports[0];
      if ((e.data as any).role === 'tts') codecPort = port;
      else serveCodec(port);
    }
    else if (e.data.type === 'init') await init(e.data);
    else await synth(e.data);
  } catch (err) {
    self.postMessage({ type: 'error', message: String((err as Error)?.stack ?? err) });
  }
};

export type { OrtTensor };
