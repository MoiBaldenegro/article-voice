/**
 * Spike T-000 · runtime de MOSS-TTS-Nano sobre ONNX Runtime (node o web, mismo código).
 *
 * Portado de `ort_cpu_runtime.py` de OpenMOSS/MOSS-TTS-Nano
 * (Copyright 2026 OpenMOSS Team, Fudan University, SII and MOSI; Apache License 2.0).
 * Cambios: solo el camino de muestreo "fixed" (grafo local_fixed_sampled_frame), sin
 * clonación de voz desde audio, generador aleatorio inyectable, E/S de sesiones abstraída
 * para funcionar en Node y en navegador, y streaming del códec por frames.
 */

export interface OrtTensor {
  readonly data: ArrayLike<number | bigint>;
  readonly dims: readonly number[];
  readonly type: string;
}

export interface OrtSession {
  run(feeds: Record<string, OrtTensor>): Promise<Record<string, OrtTensor>>;
  readonly outputNames: readonly string[];
}

export interface OrtLike {
  Tensor: new (type: string, data: Int32Array | Float32Array, dims: number[]) => OrtTensor;
}

/** El anfitrión (Node o navegador) sabe cómo crear una sesión a partir de un archivo del modelo. */
export type SessionFactory = (role: SessionRole, onnxFile: string, externalData: string[]) => Promise<OrtSession>;
export type SessionRole = 'prefill' | 'decode' | 'local_fixed' | 'codec_step' | 'codec_full';

export interface UniformRandom {
  random(): number;
}

export interface MossManifest {
  tts_config: {
    n_vq: number;
    audio_pad_token_id: number;
    audio_start_token_id: number;
    audio_end_token_id: number;
    audio_user_slot_token_id: number;
    audio_assistant_slot_token_id: number;
  };
  prompt_templates: {
    user_prompt_prefix_token_ids: number[];
    user_prompt_after_reference_token_ids: number[];
    assistant_prompt_prefix_token_ids: number[];
  };
  generation_defaults: { max_new_frames: number };
  builtin_voices: { voice: string; display_name: string; group?: string; prompt_audio_codes: number[][] }[];
}

interface TtsMeta {
  files: Record<string, string>;
  external_data_files: Record<string, string[]>;
  model_config: { audio_codebook_sizes: number[]; hidden_size: number };
  onnx: { prefill_output_names: string[]; decode_input_names: string[]; decode_output_names: string[] };
}

interface CodecMeta {
  files: Record<string, string>;
  external_data_files: Record<string, string[]>;
  codec_config: { sample_rate: number; channels: number; downsample_rate: number; num_quantizers: number };
  streaming_decode: {
    transformer_offsets: { input_name: string; output_name: string; shape: number[] }[];
    attention_caches: {
      offset_input_name: string;
      offset_output_name: string;
      cached_keys_input_name: string;
      cached_keys_output_name: string;
      cached_values_input_name: string;
      cached_values_output_name: string;
      cached_positions_input_name: string;
      cached_positions_output_name: string;
      offset_shape: number[];
      cache_shape: number[];
      positions_shape: number[];
    }[];
  };
}

export interface StepTimings {
  prefillMs: number;
  localMs: number[];
  decodeMs: number[];
}

const now = () => performance.now();
const prod = (dims: number[]) => dims.reduce((a, b) => a * b, 1);

function lastHidden(t: OrtTensor, hidden: number): Float32Array {
  const data = t.data as Float32Array;
  return data.slice(data.length - hidden);
}

export class MossRuntime {
  private readonly ort: OrtLike;
  readonly manifest: MossManifest;
  private readonly tts: TtsMeta;
  readonly codec: CodecMeta;
  private readonly sessions: Record<SessionRole, OrtSession>;

  private constructor(ort: OrtLike, manifest: MossManifest, tts: TtsMeta, codec: CodecMeta, sessions: Record<SessionRole, OrtSession>) {
    this.ort = ort;
    this.manifest = manifest;
    this.tts = tts;
    this.codec = codec;
    this.sessions = sessions;
  }

  static async create(
    ort: OrtLike,
    manifest: MossManifest,
    ttsMeta: TtsMeta,
    codecMeta: CodecMeta,
    createSession: SessionFactory,
  ): Promise<MossRuntime> {
    const tts = (name: string) => ({ file: ttsMeta.files[name]!, data: ttsMeta.external_data_files[ttsMeta.files[name]!] ?? [] });
    const cod = (name: string) => ({ file: codecMeta.files[name]!, data: codecMeta.external_data_files[codecMeta.files[name]!] ?? [] });
    const specs: [SessionRole, { file: string; data: string[] }][] = [
      ['prefill', tts('prefill')],
      ['decode', tts('decode_step')],
      ['local_fixed', tts('local_fixed_sampled_frame')],
      ['codec_step', cod('decode_step')],
      ['codec_full', cod('decode_full')],
    ];
    const sessions = {} as Record<SessionRole, OrtSession>;
    for (const [role, spec] of specs) if (spec.file) sessions[role] = await createSession(role, spec.file, spec.data);
    return new MossRuntime(ort, manifest, ttsMeta, codecMeta, sessions);
  }

  get sampleRate(): number {
    return this.codec.codec_config.sample_rate;
  }

  get samplesPerFrame(): number {
    return this.codec.codec_config.downsample_rate;
  }

  /** Filas de entrada [texto | 16 codebooks] para una voz incluida y unos ids de texto. */
  buildRequestRows(promptAudioCodes: number[][], textTokenIds: number[]): number[][] {
    const c = this.manifest.tts_config;
    const width = c.n_vq + 1;
    const textRow = (id: number) => {
      const row = new Array<number>(width).fill(c.audio_pad_token_id);
      row[0] = id;
      return row;
    };
    const audioRow = (codes: number[]) => {
      const row = new Array<number>(width).fill(c.audio_pad_token_id);
      row[0] = c.audio_user_slot_token_id;
      for (let i = 0; i < Math.min(codes.length, c.n_vq); i++) row[i + 1] = codes[i]!;
      return row;
    };
    const t = this.manifest.prompt_templates;
    return [
      ...[...t.user_prompt_prefix_token_ids, c.audio_start_token_id].map(textRow),
      ...promptAudioCodes.map(audioRow),
      ...[c.audio_end_token_id, ...t.user_prompt_after_reference_token_ids, ...textTokenIds, ...t.assistant_prompt_prefix_token_ids, c.audio_start_token_id].map(textRow),
    ];
  }

  /** Genera los frames de códigos de audio. `onFrame` se llama con cada frame en cuanto existe. */
  async generateFrames(
    rows: number[][],
    rng: UniformRandom,
    onFrame?: (frame: number[], index: number) => void | Promise<void>,
    signal?: AbortSignal,
  ): Promise<{ frames: number[][]; timings: StepTimings }> {
    const { Tensor } = this.ort;
    const c = this.manifest.tts_config;
    const width = c.n_vq + 1;
    const hidden = this.tts.model_config.hidden_size;
    const codebook = this.tts.model_config.audio_codebook_sizes[0]!;
    const timings: StepTimings = { prefillMs: 0, localMs: [], decodeMs: [] };

    const ids = new Int32Array(rows.length * width);
    rows.forEach((row, i) => row.forEach((v, j) => (ids[i * width + j] = v)));
    let t0 = now();
    const prefill = await this.sessions.prefill.run({
      input_ids: new Tensor('int32', ids, [1, rows.length, width]),
      attention_mask: new Tensor('int32', new Int32Array(rows.length).fill(1), [1, rows.length]),
    });
    timings.prefillMs = now() - t0;

    let globalHidden = lastHidden(prefill['global_hidden']!, hidden);
    let pastLength = rows.length;
    let past: Record<string, OrtTensor> = {};
    for (const name of this.tts.onnx.prefill_output_names.slice(1)) past[name.replace('present_', 'past_')] = prefill[name]!;

    const seen = new Int32Array(c.n_vq * codebook);
    const frames: number[][] = [];
    const clampU = (u: number) => Math.min(0.99999994, Math.max(0, u));

    for (let step = 0; step < this.manifest.generation_defaults.max_new_frames; step++) {
      if (signal?.aborted) throw new DOMException('aborted', 'AbortError');
      const assistantU = new Float32Array([clampU(rng.random())]);
      const audioU = new Float32Array(c.n_vq);
      for (let i = 0; i < c.n_vq; i++) audioU[i] = clampU(rng.random());

      t0 = now();
      const local = await this.sessions.local_fixed.run({
        global_hidden: new Tensor('float32', globalHidden, [1, hidden]),
        repetition_seen_mask: new Tensor('int32', seen, [1, c.n_vq, codebook]),
        assistant_random_u: new Tensor('float32', assistantU, [1]),
        audio_random_u: new Tensor('float32', audioU, [1, c.n_vq]),
      });
      timings.localMs.push(now() - t0);
      if (Number(local['should_continue']!.data[0]) === 0) break;

      const frame = Array.from(local['frame_token_ids']!.data, (v) => Number(v));
      frame.forEach((token, channel) => {
        if (token >= 0 && token < codebook) seen[channel * codebook + token] = 1;
      });
      frames.push(frame);
      if (onFrame) await onFrame(frame, frames.length - 1);

      const nextRow = new Int32Array(width).fill(c.audio_pad_token_id);
      nextRow[0] = c.audio_assistant_slot_token_id;
      frame.forEach((token, i) => (nextRow[i + 1] = token));
      const feeds: Record<string, OrtTensor> = {
        input_ids: new Tensor('int32', nextRow, [1, 1, width]),
        past_valid_lengths: new Tensor('int32', new Int32Array([pastLength]), [1]),
      };
      for (const name of this.tts.onnx.decode_input_names.slice(2)) feeds[name] = past[name]!;
      t0 = now();
      const decoded = await this.sessions.decode.run(feeds);
      timings.decodeMs.push(now() - t0);
      globalHidden = lastHidden(decoded['global_hidden']!, hidden);
      pastLength += 1;
      past = {};
      for (const name of this.tts.onnx.decode_output_names.slice(1)) past[name.replace('present_', 'past_')] = decoded[name]!;
    }
    return { frames, timings };
  }

  /** Decodificador del códec con estado, para convertir frames en audio a medida que llegan. */
  createCodecStream(): CodecStream {
    return new CodecStream(this.ort, this.codec, this.sessions.codec_step);
  }

  /** Decodificación completa de una vez (equivale a decode_full_audio de la referencia). */
  async decodeFull(frames: number[][]): Promise<Float32Array[]> {
    if (!this.sessions.codec_full) throw new Error('esta variante no incluye decode_full');
    return runCodec(this.ort, this.codec, this.sessions.codec_full, frames, {}).then((r) => r.channels);
  }
}

async function runCodec(
  ort: OrtLike,
  codec: CodecMeta,
  session: OrtSession,
  frames: number[][],
  state: Record<string, OrtTensor>,
): Promise<{ channels: Float32Array[]; outputs: Record<string, OrtTensor> }> {
  const q = codec.codec_config.num_quantizers;
  const codes = new Int32Array(frames.length * q);
  frames.forEach((f, i) => {
    for (let k = 0; k < q; k++) codes[i * q + k] = f[k] ?? 0;
  });
  const outputs = await session.run({
    audio_codes: new ort.Tensor('int32', codes, [1, frames.length, q]),
    audio_code_lengths: new ort.Tensor('int32', new Int32Array([frames.length]), [1]),
    ...state,
  });
  const audio = outputs['audio']!;
  const length = Number(outputs['audio_lengths']!.data[0]);
  const [, channelsCount, total] = audio.dims as [number, number, number];
  const data = audio.data as Float32Array;
  const channels: Float32Array[] = [];
  for (let ch = 0; ch < channelsCount; ch++) channels.push(data.slice(ch * total, ch * total + length));
  return { channels, outputs };
}

export class CodecStream {
  private state: Record<string, OrtTensor> = {};
  private readonly ort: OrtLike;
  private readonly codec: CodecMeta;
  private readonly session: OrtSession;

  constructor(ort: OrtLike, codec: CodecMeta, session: OrtSession) {
    this.ort = ort;
    this.codec = codec;
    this.session = session;
    this.reset();
  }

  reset(): void {
    const { Tensor } = this.ort;
    const s: Record<string, OrtTensor> = {};
    for (const spec of this.codec.streaming_decode.transformer_offsets) s[spec.input_name] = new Tensor('int32', new Int32Array(prod(spec.shape)), spec.shape);
    for (const spec of this.codec.streaming_decode.attention_caches) {
      s[spec.offset_input_name] = new Tensor('int32', new Int32Array(prod(spec.offset_shape)), spec.offset_shape);
      s[spec.cached_keys_input_name] = new Tensor('float32', new Float32Array(prod(spec.cache_shape)), spec.cache_shape);
      s[spec.cached_values_input_name] = new Tensor('float32', new Float32Array(prod(spec.cache_shape)), spec.cache_shape);
      s[spec.cached_positions_input_name] = new Tensor('int32', new Int32Array(prod(spec.positions_shape)).fill(-1), spec.positions_shape);
    }
    this.state = s;
  }

  async push(frames: number[][]): Promise<Float32Array[]> {
    const { channels, outputs } = await runCodec(this.ort, this.codec, this.session, frames, this.state);
    for (const spec of this.codec.streaming_decode.transformer_offsets) this.state[spec.input_name] = outputs[spec.output_name]!;
    for (const spec of this.codec.streaming_decode.attention_caches) {
      this.state[spec.offset_input_name] = outputs[spec.offset_output_name]!;
      this.state[spec.cached_keys_input_name] = outputs[spec.cached_keys_output_name]!;
      this.state[spec.cached_values_input_name] = outputs[spec.cached_values_output_name]!;
      this.state[spec.cached_positions_input_name] = outputs[spec.cached_positions_output_name]!;
    }
    return channels;
  }
}

/** Preparación de texto latino igual que _prepare_text_for_sentence_chunking de la referencia. */
export function prepareText(text: string): string {
  let t = text.replace(/[\r\n]/g, ' ').trim();
  while (t.includes('  ')) t = t.replace(/ {2}/g, ' ');
  if (/^\p{Ll}/u.test(t)) t = t[0]!.toUpperCase() + t.slice(1);
  if (/[\p{L}\p{N}]$/u.test(t)) t += '.';
  if (t.split(/\s+/).filter(Boolean).length < 5) t = `        ${t}`;
  return t;
}
