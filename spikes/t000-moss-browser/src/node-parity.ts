/**
 * Spike T-000 · CA-1, CA-2 y CA-3 en Node con onnxruntime-node.
 *
 * Uso: node src/node-parity.ts <carpeta de pesos> <golden.json> <carpeta de salida> [hilos]
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import * as ort from 'onnxruntime-node';
import { SentencePieceBpe } from './sentencepiece.ts';
import { MossRuntime, prepareText, type OrtLike, type OrtSession, type MossManifest } from './moss-runtime.ts';

const [modelsDir, goldenPath, outDir, threadsArg] = process.argv.slice(2);
if (!modelsDir || !goldenPath || !outDir) throw new Error('uso: node-parity.ts <pesos> <golden.json> <salida> [hilos]');
const threads = Number(threadsArg ?? 4);
mkdirSync(outDir, { recursive: true });

const ttsDir = join(modelsDir, 'MOSS-TTS-Nano-100M-ONNX');
const codecDir = join(modelsDir, 'MOSS-Audio-Tokenizer-Nano-ONNX');
const golden = JSON.parse(readFileSync(goldenPath, 'utf8'));
const json = (p: string) => JSON.parse(readFileSync(p, 'utf8'));

// ---- CA-1: tokenizador ----
const sp = new SentencePieceBpe(readFileSync(join(ttsDir, 'tokenizer.model')));
let tokOk = 0;
const tokCases = [
  ...golden.tokenizer.map((c: { text: string; ids: number[] }) => ({ text: c.text, ids: c.ids })),
  ...golden.phrases.map((p: { prepared_text: string; token_ids: number[] }) => ({ text: p.prepared_text, ids: p.token_ids })),
];
for (const c of tokCases) {
  const ids = sp.encode(c.text);
  const same = ids.length === c.ids.length && ids.every((v, i) => v === c.ids[i]);
  if (same) tokOk++;
  else console.log('TOKENIZADOR DIFIERE', JSON.stringify(c.text), '\n  esperado', c.ids.join(','), '\n  obtenido', ids.join(','));
}
console.log(`CA-1 tokenizador: ${tokOk}/${tokCases.length} iguales`);

// ---- Runtime ----
const sessionOptions: ort.InferenceSession.SessionOptions = {
  executionProviders: ['cpu'],
  graphOptimizationLevel: 'all',
  intraOpNumThreads: threads,
  interOpNumThreads: 1,
};
const t0 = performance.now();
const manifest = json(join(ttsDir, 'browser_poc_manifest.json')) as MossManifest;
const runtime = await MossRuntime.create(
  ort as unknown as OrtLike,
  manifest,
  json(join(ttsDir, 'tts_browser_onnx_meta.json')),
  json(join(codecDir, 'codec_browser_onnx_meta.json')),
  async (role, file) => {
    const dir = role.startsWith('codec') ? codecDir : ttsDir;
    const session = await ort.InferenceSession.create(join(dir, file), sessionOptions);
    return session as unknown as OrtSession;
  },
);
console.log(`sesiones creadas en ${(performance.now() - t0).toFixed(0)} ms`);

const median = (a: number[]) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)] ?? 0;
const p95 = (a: number[]) => [...a].sort((x, y) => x - y)[Math.floor(a.length * 0.95)] ?? 0;

function writeWav(path: string, channels: Float32Array[], sampleRate: number): void {
  const n = channels[0]!.length;
  const buf = Buffer.alloc(44 + n * channels.length * 2);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + n * channels.length * 2, 4);
  buf.write('WAVEfmt ', 8);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(channels.length, 22);
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * channels.length * 2, 28);
  buf.writeUInt16LE(channels.length * 2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(n * channels.length * 2, 40);
  let o = 44;
  for (let i = 0; i < n; i++) for (const ch of channels) (buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, ch[i]!)) * 32767), o), (o += 2));
  writeFileSync(path, buf);
}

// ---- CA-2 y CA-3: mismos frames con los mismos números aleatorios; audio y tiempos ----
const report: unknown[] = [];
for (const phrase of golden.phrases) {
  const prepared = prepareText(phrase.prepared_text.trim());
  const ids = sp.encode(prepared);
  const voice = manifest.builtin_voices.find((v) => v.voice === phrase.voice)!;
  const rows = runtime.buildRequestRows(voice.prompt_audio_codes, ids);
  const draws: number[] = phrase.random_draws;
  let k = 0;
  const replay = { random: () => draws[k++] ?? Math.random() };

  // Streaming del códec mientras se genera, para medir el tiempo hasta el primer audio.
  const stream = runtime.createCodecStream();
  const start = performance.now();
  let firstAudioMs = -1;
  let streamedSamples = 0;
  const { frames, timings } = await runtime.generateFrames(rows, replay, async (frame) => {
    const chunk = await stream.push([frame]);
    if (firstAudioMs < 0 && chunk[0]!.length > 0) firstAudioMs = performance.now() - start;
    streamedSamples += chunk[0]!.length;
  });
  const totalMs = performance.now() - start;

  const expected: number[][] = phrase.frames;
  let firstDiff = -1;
  for (let i = 0; i < Math.max(frames.length, expected.length); i++) {
    const a = frames[i];
    const b = expected[i];
    if (!a || !b || a.some((v, j) => v !== b[j])) {
      firstDiff = i;
      break;
    }
  }
  const channels = await runtime.decodeFull(frames);
  writeWav(join(outDir, `${phrase.id}.ts.wav`), channels, runtime.sampleRate);
  const audioS = channels[0]!.length / runtime.sampleRate;
  const perFrame = timings.localMs.map((l, i) => l + (timings.decodeMs[i] ?? 0));
  const row = {
    id: phrase.id,
    textIdsIguales: ids.length === phrase.token_ids.length && ids.every((v: number, i: number) => v === phrase.token_ids[i]),
    frames: `${frames.length} (python ${expected.length})`,
    framesIguales: firstDiff < 0,
    primerFrameDistinto: firstDiff,
    prefillMs: Math.round(timings.prefillMs),
    msPorFrameMediana: +median(perFrame).toFixed(1),
    msPorFrameP95: +p95(perFrame).toFixed(1),
    primerAudioMs: Math.round(firstAudioMs),
    audioS: +audioS.toFixed(2),
    rtfStreaming: +(totalMs / 1000 / (streamedSamples / runtime.sampleRate)).toFixed(3),
  };
  report.push(row);
  console.log(JSON.stringify(row));
}
writeFileSync(join(outDir, 'node-parity.json'), JSON.stringify({ threads, ort: 'onnxruntime-node', report }, null, 2));
