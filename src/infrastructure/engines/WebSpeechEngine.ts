// WebSpeechEngine: adaptador del puerto SpeechEngine sobre `speechSynthesis` (voz del sistema).
// El navegador no entrega el audio de la voz del sistema: la reproduce él mismo. Por eso
// `synthesize` habla el texto y, al terminar, entrega UN fragmento mínimo de silencio para que
// la narración avance al siguiente segmento (el texto nunca sale del dispositivo, RNF-PRIV-01).

import {
  DomainError,
  EngineKind,
  VoiceId,
  type AudioChunk,
  type SpeechEngine,
} from '../../../libs/reader/src/index.js';

export interface SystemVoice {
  readonly name: string;
  readonly voiceURI: string;
  readonly lang: string;
}

export interface UtteranceLike {
  text: string;
  lang: string;
  rate: number;
  voice: SystemVoice | null;
  onend: (() => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
}

export interface SpeechSynthesisLike {
  getVoices(): SystemVoice[];
  speak(utterance: UtteranceLike): void;
  cancel(): void;
  addEventListener?(type: 'voiceschanged', listener: () => void): void;
  removeEventListener?(type: 'voiceschanged', listener: () => void): void;
}

export interface WebSpeechEngineOptions {
  /** Por defecto `globalThis.speechSynthesis`. */
  readonly synthesis?: SpeechSynthesisLike | undefined;
  /** Por defecto `new SpeechSynthesisUtterance(text)`. */
  readonly createUtterance?: (text: string) => UtteranceLike;
  /** Idioma base del artículo: prioriza las voces que lo hablan. */
  readonly language?: string;
  readonly rate?: number;
  /** Espera máxima a que el navegador cargue las voces. */
  readonly voicesTimeoutMs?: number;
}

class AbortedError extends DomainError {}
class UnavailableError extends DomainError {}
class SynthesisError extends DomainError {}

const aborted = (): AbortedError =>
  new AbortedError('AV_ABORTED', 'Operation aborted', { recoverable: true });

const SILENCE: AudioChunk = { samples: new Float32Array(1), sampleRate: 24000 };

function slug(voice: SystemVoice): string {
  const base = `${voice.name}-${voice.lang}`
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return base === '' ? 'voice' : base;
}

export class WebSpeechEngine implements SpeechEngine {
  readonly kind = EngineKind.of('web-speech');
  private readonly synthesis: SpeechSynthesisLike | undefined;
  private readonly createUtterance: (text: string) => UtteranceLike;
  private readonly language: string | undefined;
  private readonly rate: number;
  private readonly voicesTimeoutMs: number;
  private readonly byId = new Map<string, SystemVoice>();
  private ready = false;
  private disposed = false;

  constructor(options: WebSpeechEngineOptions = {}) {
    this.synthesis =
      'synthesis' in options
        ? options.synthesis
        : (globalThis as { speechSynthesis?: SpeechSynthesisLike }).speechSynthesis;
    this.createUtterance =
      options.createUtterance ??
      ((text) => {
        const Ctor = (
          globalThis as unknown as {
            SpeechSynthesisUtterance: new (t: string) => UtteranceLike;
          }
        ).SpeechSynthesisUtterance;
        return new Ctor(text);
      });
    this.language = options.language?.toLowerCase().split(/[-_]/)[0];
    this.rate = options.rate ?? 1;
    this.voicesTimeoutMs = options.voicesTimeoutMs ?? 1500;
  }

  async prepare(signal?: AbortSignal): Promise<void> {
    if (signal?.aborted || this.disposed) throw aborted();
    const synthesis = this.synthesis;
    if (!synthesis) throw this.unavailable('Este navegador no tiene voz del sistema');
    if (this.ready) return;

    let voices = synthesis.getVoices();
    if (voices.length === 0) voices = await this.waitForVoices(synthesis, signal);
    if (signal?.aborted || this.disposed) throw aborted();
    if (voices.length === 0) throw this.unavailable('No hay voces del sistema instaladas');

    const preferred =
      this.language === undefined
        ? voices
        : voices.filter((v) => v.lang.toLowerCase().split(/[-_]/)[0] === this.language);
    this.byId.clear();
    for (const v of preferred.length > 0 ? preferred : voices) {
      let id = slug(v);
      for (let n = 2; this.byId.has(id); n++) id = `${slug(v).slice(0, 56)}-${n}`;
      this.byId.set(id, v);
    }
    this.ready = true;
  }

  voices(): readonly VoiceId[] {
    this.assertReady();
    return [...this.byId.keys()].map((id) => VoiceId.of(id));
  }

  async *synthesize(text: string, voice: VoiceId, signal?: AbortSignal): AsyncIterable<AudioChunk> {
    this.assertReady();
    if (signal?.aborted) throw aborted();
    const synthesis = this.synthesis as SpeechSynthesisLike;
    const systemVoice = this.byId.get(voice.value);
    if (!systemVoice) throw this.unavailable(`Voz del sistema desconocida: ${voice.value}`);

    await new Promise<void>((resolve, reject) => {
      const utterance = this.createUtterance(text);
      utterance.voice = systemVoice;
      utterance.lang = systemVoice.lang;
      utterance.rate = this.rate;
      const onAbort = (): void => {
        synthesis.cancel();
        finish(aborted());
      };
      const finish = (error?: Error): void => {
        signal?.removeEventListener('abort', onAbort);
        utterance.onend = null;
        utterance.onerror = null;
        if (error) reject(error);
        else resolve();
      };
      utterance.onend = () => finish();
      utterance.onerror = (event) =>
        finish(
          event.error === 'canceled' || event.error === 'interrupted'
            ? aborted()
            : new SynthesisError('AV_SYNTHESIS_FAILED', 'La voz del sistema falló', {
                details: { engine: 'web-speech', error: event.error },
                recoverable: true,
              }),
        );
      signal?.addEventListener('abort', onAbort, { once: true });
      synthesis.speak(utterance);
    });
    if (this.disposed) throw aborted();
    yield SILENCE;
  }

  dispose(): void {
    this.disposed = true;
    this.ready = false;
    this.synthesis?.cancel();
  }

  private waitForVoices(
    synthesis: SpeechSynthesisLike,
    signal?: AbortSignal,
  ): Promise<SystemVoice[]> {
    return new Promise((resolve) => {
      const timer = setTimeout(() => done(), this.voicesTimeoutMs);
      const done = (): void => {
        clearTimeout(timer);
        synthesis.removeEventListener?.('voiceschanged', done);
        signal?.removeEventListener('abort', done);
        resolve(synthesis.getVoices());
      };
      synthesis.addEventListener?.('voiceschanged', done);
      signal?.addEventListener('abort', done, { once: true });
    });
  }

  private unavailable(message: string): UnavailableError {
    return new UnavailableError('AV_ENGINE_UNAVAILABLE', message);
  }

  private assertReady(): void {
    if (!this.ready) {
      throw this.unavailable('Engine not prepared; call prepare() first');
    }
  }
}
