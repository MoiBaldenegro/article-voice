import { DomainError } from '../../exceptions/errors.js';
import { EngineKind } from '../../value-objects/EngineKind.js';
import { VoiceId } from '../../value-objects/VoiceId.js';
import type { AudioChunk, SpeechEngine } from '../SpeechEngine.port.js';

class AbortedError extends DomainError {}
class NotPreparedError extends DomainError {}
const aborted = (): AbortedError =>
  new AbortedError('AV_ABORTED', 'Operation aborted', { recoverable: true });

/** Doble: genera `chunksPerSegment` fragmentos de silencio por segmento. */
export class InMemorySpeechEngine implements SpeechEngine {
  readonly kind = EngineKind.of('moss-browser');
  prepareCalls = 0;
  private ready = false;
  private disposed = false;

  constructor(
    private readonly options: { voices?: readonly string[]; chunksPerSegment?: number } = {},
  ) {}

  async prepare(signal?: AbortSignal): Promise<void> {
    if (signal?.aborted) throw aborted();
    this.prepareCalls += 1;
    this.ready = true;
  }

  voices(): readonly VoiceId[] {
    this.assertReady();
    return (this.options.voices ?? ['default']).map((v) => VoiceId.of(v));
  }

  async *synthesize(
    text: string,
    _voice: VoiceId,
    signal?: AbortSignal,
  ): AsyncIterable<AudioChunk> {
    this.assertReady();
    const n = this.options.chunksPerSegment ?? 2;
    for (let i = 0; i < n; i++) {
      if (signal?.aborted) throw aborted();
      yield { samples: new Float32Array(Math.max(1, text.length)), sampleRate: 24000 };
      await Promise.resolve();
    }
  }

  dispose(): void {
    this.disposed = true;
    this.ready = false;
  }

  get isDisposed(): boolean {
    return this.disposed;
  }

  private assertReady(): void {
    if (!this.ready) {
      throw new NotPreparedError(
        'AV_ENGINE_UNAVAILABLE',
        'Engine not prepared; call prepare() first',
      );
    }
  }
}
