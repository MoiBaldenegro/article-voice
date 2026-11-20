/// <reference lib="webworker" />
/**
 * Spike T-000 · worker de inferencia con onnxruntime-web (WebGPU o WASM).
 * Mensajes: init → ready; synth (segmentos) → chunk* → segment-done* → done.
 */
import { SentencePieceBpe } from '../sentencepiece.ts';
import { MossRuntime, prepareText, type OrtLike, type OrtSession, type MossManifest, type OrtTensor } from '../moss-runtime.ts';

declare const self: DedicatedWorkerGlobalScope;

interface InitMsg {
  type: 'init';
  backend: 'webgpu' | 'wasm';
  threads: number;
  modelBase: string; // termina en '/', contiene MOSS-TTS-Nano-100M-ONNX/ y MOSS-Audio-Tokenizer-Nano-ONNX/
  gpuKvCache: boolean;
}
interface SynthMsg {
  type: 'synth';
  segments: string[];
  voice: string;
  replayDraws?: number[][]; // por segmento, para comprobar paridad
  seed: number;
  codecPolicy: 'single' | 'adaptive';
}

let runtime: MossRuntime | null = null;
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
  const tts = `${msg.modelBase}MOSS-TTS-Nano-100M-ONNX/`;
  const codec = `${msg.modelBase}MOSS-Audio-Tokenizer-Nano-ONNX/`;
  const getJson = async (u: string) => (await fetch(u)).json();
  manifest = (await getJson(`${tts}browser_poc_manifest.json`)) as MossManifest;
  const ttsMeta = await getJson(`${tts}tts_browser_onnx_meta.json`);
  const codecMeta = await getJson(`${codec}codec_browser_onnx_meta.json`);
  tokenizer = new SentencePieceBpe(new Uint8Array(await (await fetch(`${tts}tokenizer.model`)).arrayBuffer()));

  const sessionTimes: Record<string, number> = {};
  runtime = await MossRuntime.create(ort as unknown as OrtLike, manifest, ttsMeta, codecMeta, async (role, file, data) => {
    const base = role.startsWith('codec') ? codec : tts;
    const ts = performance.now();
    const options: Record<string, unknown> = {
      executionProviders: [msg.backend],
      graphOptimizationLevel: 'all',
      externalData: data.map((d) => ({ path: d, data: `${base}${d}` })),
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
  });
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
    const stream = rt.createCodecStream();
    const pending: number[][] = [];
    let codecMs = 0;

    const flush = async (force: boolean) => {
      if (pending.length === 0) return;
      let budget = 1;
      if (msg.codecPolicy === 'adaptive' && firstChunkAt >= 0) {
        // Misma política que la referencia: cuanto más adelantado va el audio, más frames por llamada.
        const lead = emittedSamples / sr - (performance.now() - firstChunkAt) / 1000;
        budget = lead < 0.2 ? 1 : lead < 0.55 ? 2 : lead < 1.1 ? 4 : 8;
      }
      while (pending.length > 0 && (force || pending.length >= budget)) {
        const batch = pending.splice(0, force ? pending.length : budget);
        const tc = performance.now();
        const channels = await stream.push(batch);
        codecMs += performance.now() - tc;
        if (channels[0]!.length === 0) continue;
        if (firstChunkAt < 0) firstChunkAt = performance.now();
        emittedSamples += channels[0]!.length;
        self.postMessage({ type: 'chunk', segment: s, channels }, channels.map((c) => c.buffer));
        if (!force) break;
      }
    };

    const { frames, timings } = await rt.generateFrames(rows, rng, async (frame) => {
      pending.push(frame);
      await flush(false);
    });
    await flush(true);
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

self.onmessage = async (e: MessageEvent<InitMsg | SynthMsg>) => {
  try {
    if (e.data.type === 'init') await init(e.data);
    else await synth(e.data);
  } catch (err) {
    self.postMessage({ type: 'error', message: String((err as Error)?.stack ?? err) });
  }
};

export type { OrtTensor };
