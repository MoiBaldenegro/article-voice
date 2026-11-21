import type { AudioOutput, Unsubscribe } from '../../../libs/reader/src/core-api.js';
import type { AudioChunk } from '../../../libs/reader/src/core-api.js';
import { PLAYBACK_PROCESSOR_NAME, PLAYBACK_PROCESSOR_SOURCE } from './playbackProcessorSource.js';

export interface WebAudioOutputOptions {
  /** Por defecto `new AudioContext()`. */
  createContext?: () => AudioContext;
  /** Por defecto `new AudioWorkletNode(ctx, name)`. */
  createNode?: (ctx: AudioContext, name: string) => AudioWorkletNode;
}

/** Salida de audio con AudioWorklet: reproduce PCM en streaming y cuenta underruns. */
export class WebAudioOutput implements AudioOutput {
  private ctx: AudioContext | undefined;
  private node: AudioWorkletNode | undefined;
  private pending: { msg: { type: string }; transfer: Transferable[] }[] = [];
  private ended = new Set<(i: number) => void>();
  private underrunListeners = new Set<() => void>();
  private closed = false;
  private paused = false;
  private underrunCount = 0;
  private readonly ready: Promise<void>;

  constructor(private readonly options: WebAudioOutputOptions = {}) {
    this.ready = this.init().catch(() => undefined);
  }

  /** Cuántas veces la salida se quedó sin audio a mitad de un segmento. */
  get underruns(): number {
    return this.underrunCount;
  }

  /** Resuelve cuando el worklet está cargado (o falló la carga). */
  whenReady(): Promise<void> {
    return this.ready;
  }

  private async init(): Promise<void> {
    const ctx = (this.options.createContext ?? (() => new AudioContext()))();
    this.ctx = ctx;
    const url = URL.createObjectURL(
      new Blob([PLAYBACK_PROCESSOR_SOURCE], { type: 'text/javascript' }),
    );
    try {
      await ctx.audioWorklet.addModule(url);
    } finally {
      URL.revokeObjectURL(url);
    }
    if (this.closed) return;
    const create =
      this.options.createNode ??
      ((c: AudioContext, n: string) => new AudioWorkletNode(c, n, { outputChannelCount: [1] }));
    const node = create(ctx, PLAYBACK_PROCESSOR_NAME);
    node.port.onmessage = (e: MessageEvent<{ type: string; segmentIndex?: number }>) => {
      if (e.data.type === 'ended') {
        for (const l of [...this.ended]) l(e.data.segmentIndex ?? 0);
      } else if (e.data.type === 'underrun') {
        this.underrunCount++;
        for (const l of [...this.underrunListeners]) l();
      }
    };
    node.connect(ctx.destination);
    this.node = node;
    for (const p of this.pending) node.port.postMessage(p.msg, p.transfer);
    this.pending = [];
  }

  private post(msg: { type: string }, transfer: Transferable[] = []): void {
    if (this.node) this.node.port.postMessage(msg, transfer);
    else this.pending.push({ msg, transfer });
  }

  private wake(): void {
    if (this.paused || !this.ctx || this.ctx.state === 'running') return;
    void this.ctx.resume().catch(() => undefined);
  }

  enqueue(segmentIndex: number, chunk: AudioChunk, last: boolean): void {
    if (this.closed) return;
    const target = this.ctx?.sampleRate ?? chunk.sampleRate;
    const samples = resample(chunk.samples, chunk.sampleRate, target);
    this.post({ type: 'chunk', segmentIndex, samples, last } as { type: string }, [
      samples.buffer as ArrayBuffer,
    ]);
    this.wake();
  }

  pause(): void {
    if (this.closed) return;
    this.paused = true;
    this.post({ type: 'pause' });
  }

  resume(): void {
    if (this.closed) return;
    this.paused = false;
    this.post({ type: 'resume' });
    this.wake();
  }

  clear(): void {
    if (this.closed) return;
    this.pending = this.pending.filter((p) => p.msg.type !== 'chunk');
    this.post({ type: 'clear' });
  }

  setRate(rate: number): void {
    if (this.closed) return;
    this.post({ type: 'rate', rate } as { type: string });
  }

  onSegmentEnded(listener: (segmentIndex: number) => void): Unsubscribe {
    this.ended.add(listener);
    return () => void this.ended.delete(listener);
  }

  onUnderrun(listener: () => void): Unsubscribe {
    this.underrunListeners.add(listener);
    return () => void this.underrunListeners.delete(listener);
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    this.ended.clear();
    this.underrunListeners.clear();
    this.pending = [];
    if (this.node) {
      this.node.port.onmessage = null;
      this.node.disconnect();
    }
    void this.ctx?.close().catch(() => undefined);
  }
}

/** Interpolación lineal; siempre devuelve una copia (se transfiere al worklet). */
export function resample(input: Float32Array, from: number, to: number): Float32Array {
  if (from === to || input.length === 0) return input.slice();
  const length = Math.max(1, Math.round((input.length * to) / from));
  const out = new Float32Array(length);
  const ratio = from / to;
  for (let i = 0; i < length; i++) {
    const p = i * ratio;
    const k = Math.floor(p);
    const a = input[Math.min(k, input.length - 1)] ?? 0;
    const b = input[Math.min(k + 1, input.length - 1)] ?? a;
    out[i] = a + (b - a) * (p - k);
  }
  return out;
}
