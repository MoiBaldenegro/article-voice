import type { AudioChunk } from './SpeechEngine.port.js';

export type Unsubscribe = () => void;

export interface AudioOutput {
  /** Encola audio del segmento `segmentIndex`; `last` marca su último fragmento. */
  enqueue(segmentIndex: number, chunk: AudioChunk, last: boolean): void;
  /** Pausa la salida sin perder lo encolado. */
  pause(): void;
  resume(): void;
  /** Descarta todo lo encolado. */
  clear(): void;
  setRate(rate: number): void;
  /** Se llama cuando termina de sonar el último fragmento de un segmento. */
  onSegmentEnded(listener: (segmentIndex: number) => void): Unsubscribe;
  /** Se llama cuando la salida se queda sin audio con la reproducción activa. */
  onUnderrun(listener: () => void): Unsubscribe;
  close(): void;
}
