// Sesión de una narración activa: enlaza Narration con SpeechEngine y AudioOutput.
// Sintetiza por delante del cursor (RN-07) y reacciona al fin de cada segmento.

import { DomainError } from '../domain/exceptions/errors.js';
import type { Narration } from '../domain/Narration.js';
import type { NarrationState } from '../domain/NarrationState.js';
import type { AudioChunk } from '../domain/outbound/SpeechEngine.port.js';
import type { AudioOutput, Unsubscribe } from '../domain/outbound/AudioOutput.port.js';
import type { SpeechEngine } from '../domain/outbound/SpeechEngine.port.js';

export const DEFAULT_LOOKAHEAD = 2;

class SessionError extends DomainError {}

export class NarrationSession {
  private controller = new AbortController();
  private waiters: (() => void)[] = [];
  private unsubscribe: Unsubscribe | undefined;
  private onFinished: (() => void) | undefined;
  private finished = false;
  private changeListener: (() => void) | undefined;

  constructor(
    readonly narration: Narration,
    private readonly engine: SpeechEngine,
    private readonly audio: AudioOutput,
    private readonly lookahead = DEFAULT_LOOKAHEAD,
  ) {}

  /** El registro se entera de que la sesión terminó (stop, fin o error). */
  setOnFinished(fn: () => void): void {
    this.onFinished = fn;
  }

  /** Avisa tras cada cambio de estado o de cursor (para que la UI se actualice). */
  onChange(listener: () => void): void {
    this.changeListener = listener;
  }

  private changed(): void {
    this.changeListener?.();
  }

  get isFinished(): boolean {
    return this.finished;
  }

  /** idle|stopped|error → preparing → playing; empieza a sintetizar desde el cursor. */
  async start(): Promise<void> {
    const n = this.narration;
    n.play();
    this.changed();
    this.controller = new AbortController();
    const { signal } = this.controller;
    this.unsubscribe = this.audio.onSegmentEnded((i) => this.handleSegmentEnded(i));
    try {
      await this.engine.prepare(signal);
    } catch (e) {
      if (signal.aborted || n.state !== 'preparing') return; // detenida mientras preparaba
      this.fail(e, 'AV_ENGINE_INIT_FAILED');
      throw e;
    }
    if (signal.aborted || n.state !== 'preparing') return;
    n.prepared();
    this.changed();
    this.audio.setRate(n.rate.value);
    this.audio.resume();
    void this.pump(n.cursor, signal);
  }

  pause(): void {
    this.narration.pause();
    this.audio.pause();
    this.changed();
  }

  resume(): void {
    this.narration.resume();
    this.audio.resume();
    this.changed();
  }

  stop(): void {
    this.narration.stop();
    this.finish();
    this.changed();
  }

  /** Salta al segmento `index`: descarta lo encolado y re-sintetiza desde ahí. */
  seek(index: number): void {
    const n = this.narration;
    n.seek(index);
    this.controller.abort();
    this.controller = new AbortController();
    this.audio.clear();
    this.wake();
    this.changed();
    void this.pump(index, this.controller.signal);
  }

  /** Cierra la sesión sin tocar el estado (lo usa el registro al reemplazarla). */
  private finish(): void {
    if (this.finished) return;
    this.finished = true;
    this.controller.abort();
    this.unsubscribe?.();
    this.audio.clear();
    this.wake();
    this.onFinished?.();
  }

  private handleSegmentEnded(index: number): void {
    const n = this.narration;
    if (this.finished || n.state !== 'playing' || index !== n.cursor) return;
    n.segmentEnded();
    if ((n.state as NarrationState) === 'stopped') this.finish();
    else this.wake();
    this.changed();
  }

  private fail(error: unknown, fallbackCode: string): void {
    const code = error instanceof DomainError ? error.code : fallbackCode;
    if (this.narration.state === 'preparing' || this.narration.state === 'playing') {
      this.narration.fail(code);
    }
    this.finish();
    this.changed();
  }

  private wake(): void {
    const ws = this.waiters;
    this.waiters = [];
    for (const w of ws) w();
  }

  private async waitWindow(index: number, signal: AbortSignal): Promise<void> {
    while (!signal.aborted && index - this.narration.cursor > this.lookahead) {
      await new Promise<void>((resolve) => this.waiters.push(resolve));
    }
  }

  private async pump(from: number, signal: AbortSignal): Promise<void> {
    const n = this.narration;
    try {
      for (let i = from; i < n.segments.length; i++) {
        await this.waitWindow(i, signal);
        if (signal.aborted) return;
        await this.synthesizeSegment(i, signal);
      }
    } catch (e) {
      if (signal.aborted) return;
      this.fail(e, 'AV_SYNTHESIS_FAILED');
    }
  }

  private async synthesizeSegment(index: number, signal: AbortSignal): Promise<void> {
    const n = this.narration;
    const segment = n.segments[index];
    if (segment === undefined) return;
    let held: AudioChunk | undefined;
    for await (const chunk of this.engine.synthesize(segment.text, n.voice, signal)) {
      if (signal.aborted) return;
      if (held !== undefined) this.audio.enqueue(index, held, false);
      held = chunk;
    }
    if (signal.aborted) return;
    if (held === undefined) {
      throw new SessionError('AV_SYNTHESIS_FAILED', 'El motor no produjo audio', {
        recoverable: true,
        details: { segment: index },
      });
    }
    this.audio.enqueue(index, held, true);
  }
}
