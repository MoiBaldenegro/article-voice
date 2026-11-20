import type { AudioOutput, Unsubscribe } from '../AudioOutput.port.js';
import type { AudioChunk } from '../SpeechEngine.port.js';

/** Doble: acumula lo encolado; el test dispara `finishSegment`/`drain`. */
export class InMemoryAudioOutput implements AudioOutput {
  readonly queued: { segmentIndex: number; chunk: AudioChunk; last: boolean }[] = [];
  paused = false;
  closed = false;
  rate = 1;
  private ended = new Set<(i: number) => void>();
  private underruns = new Set<() => void>();

  enqueue(segmentIndex: number, chunk: AudioChunk, last: boolean): void {
    if (this.closed) return;
    this.queued.push({ segmentIndex, chunk, last });
  }
  pause(): void {
    this.paused = true;
  }
  resume(): void {
    this.paused = false;
  }
  clear(): void {
    this.queued.length = 0;
  }
  setRate(rate: number): void {
    this.rate = rate;
  }
  onSegmentEnded(listener: (segmentIndex: number) => void): Unsubscribe {
    this.ended.add(listener);
    return () => void this.ended.delete(listener);
  }
  onUnderrun(listener: () => void): Unsubscribe {
    this.underruns.add(listener);
    return () => void this.underruns.delete(listener);
  }
  close(): void {
    this.closed = true;
    this.queued.length = 0;
    this.ended.clear();
    this.underruns.clear();
  }

  /** Simula que terminó de sonar el segmento (si estaba encolado y no hay pausa). */
  finishSegment(segmentIndex: number): void {
    if (this.paused || this.closed) return;
    const idx = this.queued.findIndex((q) => q.segmentIndex === segmentIndex && q.last);
    if (idx < 0) return;
    this.queued.splice(0, idx + 1);
    for (const l of [...this.ended]) l(segmentIndex);
  }
  /** Simula que la salida se quedó sin audio. */
  drain(): void {
    this.queued.length = 0;
    for (const l of [...this.underruns]) l();
  }
}
