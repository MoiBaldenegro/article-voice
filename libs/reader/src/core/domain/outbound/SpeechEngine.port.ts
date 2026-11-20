import type { EngineKind } from '../value-objects/EngineKind.js';
import type { VoiceId } from '../value-objects/VoiceId.js';

/** Fragmento de audio PCM mono. */
export interface AudioChunk {
  readonly samples: Float32Array;
  readonly sampleRate: number;
}

export interface SpeechEngine {
  readonly kind: EngineKind;
  /** Idempotente. Rechaza con AV_ABORTED si `signal` se cancela. */
  prepare(signal?: AbortSignal): Promise<void>;
  /** Voces disponibles; requiere `prepare()` previo. */
  voices(): readonly VoiceId[];
  /** Sintetiza un segmento. Requiere `prepare()`. Rechaza con AV_ABORTED si se cancela. */
  synthesize(text: string, voice: VoiceId, signal?: AbortSignal): AsyncIterable<AudioChunk>;
  dispose(): void;
}
