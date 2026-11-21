// MossServerEngine: adaptador del puerto SpeechEngine contra un servidor TTS del integrador
// que implemente `POST {server-url}/v1/audio/speech` (compatible con OpenAI).
// Pide `response_format: "pcm"` (16 bits little-endian, mono) y lo entrega en streaming.
// El texto solo viaja a `serverUrl`: sin redirecciones, sin cookies ni credenciales.

import {
  DomainError,
  EngineKind,
  HttpsUrl,
  VoiceId,
  type AudioChunk,
  type SpeechEngine,
} from '../../../libs/reader/src/core-api.js';

export const DEFAULT_MODEL = 'moss-tts-nano';
export const DEFAULT_SAMPLE_RATE = 48000;

export interface MossServerEngineOptions {
  readonly serverUrl: string;
  readonly model?: string;
  /** El contrato OpenAI no tiene endpoint de voces: se declaran. Por defecto `default`. */
  readonly voices?: readonly string[];
  readonly speed?: number;
  readonly sampleRate?: number;
  /** Para pruebas; por defecto el `fetch` global. */
  readonly fetch?: typeof fetch;
}

class ServerError extends DomainError {}
class AbortedError extends DomainError {}
class NotPreparedError extends DomainError {}

const aborted = (): AbortedError =>
  new AbortedError('AV_ABORTED', 'Operation aborted', { recoverable: true });

function isAbort(e: unknown): boolean {
  return typeof e === 'object' && e !== null && (e as { name?: unknown }).name === 'AbortError';
}

export class MossServerEngine implements SpeechEngine {
  readonly kind = EngineKind.of('moss-server');
  private readonly endpoint: string;
  private readonly model: string;
  private readonly voiceIds: readonly VoiceId[];
  private readonly speed: number;
  private readonly sampleRate: number;
  private readonly doFetch: typeof fetch;
  private ready = false;
  private readonly lifecycle = new AbortController();

  constructor(options: MossServerEngineOptions) {
    const base = HttpsUrl.of(options.serverUrl, 'server-url').value;
    this.endpoint = new URL('v1/audio/speech', base.endsWith('/') ? base : `${base}/`).href;
    this.model = options.model ?? DEFAULT_MODEL;
    this.voiceIds = (options.voices ?? ['default']).map((v) => VoiceId.of(v));
    this.speed = options.speed ?? 1;
    this.sampleRate = options.sampleRate ?? DEFAULT_SAMPLE_RATE;
    this.doFetch = options.fetch ?? ((...args) => globalThis.fetch(...args));
  }

  async prepare(signal?: AbortSignal): Promise<void> {
    if (signal?.aborted || this.lifecycle.signal.aborted) throw aborted();
    this.ready = true;
  }

  voices(): readonly VoiceId[] {
    this.assertReady();
    return this.voiceIds;
  }

  async *synthesize(text: string, voice: VoiceId, signal?: AbortSignal): AsyncIterable<AudioChunk> {
    this.assertReady();
    if (signal?.aborted) throw aborted();

    const ac = new AbortController();
    const onAbort = (): void => ac.abort();
    signal?.addEventListener('abort', onAbort, { once: true });
    this.lifecycle.signal.addEventListener('abort', onAbort, { once: true });
    const check = (): void => {
      if (ac.signal.aborted) throw aborted();
    };

    try {
      let response: Response;
      try {
        response = await this.doFetch(this.endpoint, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            model: this.model,
            input: text,
            voice: voice.value,
            response_format: 'pcm',
            speed: this.speed,
          }),
          signal: ac.signal,
          redirect: 'error',
          credentials: 'omit',
        });
      } catch (e) {
        if (isAbort(e) || ac.signal.aborted) throw aborted();
        throw this.serverError('No se pudo contactar con el servidor de voz', undefined, e);
      }

      if (!response.ok) {
        await response.body?.cancel().catch(() => undefined);
        throw this.serverError(`El servidor de voz respondió ${response.status}`, response.status);
      }
      if (!response.body) {
        throw this.serverError('El servidor de voz respondió sin audio', response.status);
      }

      const reader = response.body.getReader();
      let pending: Uint8Array = new Uint8Array(0);
      try {
        for (;;) {
          check();
          let step: ReadableStreamReadResult<Uint8Array>;
          try {
            step = await reader.read();
          } catch (e) {
            if (isAbort(e) || ac.signal.aborted) throw aborted();
            throw this.serverError('Se cortó la respuesta del servidor de voz', response.status, e);
          }
          if (step.done) break;
          check();
          pending = concat(pending, step.value);
          const usable = pending.length - (pending.length % 2);
          if (usable === 0) continue;
          const samples = pcm16ToFloat32(pending.subarray(0, usable));
          pending = pending.slice(usable);
          yield { samples, sampleRate: this.sampleRate };
        }
      } finally {
        await reader.cancel().catch(() => undefined);
      }
    } finally {
      signal?.removeEventListener('abort', onAbort);
      this.lifecycle.signal.removeEventListener('abort', onAbort);
    }
  }

  dispose(): void {
    this.ready = false;
    this.lifecycle.abort();
  }

  private serverError(message: string, status?: number, cause?: unknown): ServerError {
    return new ServerError('AV_SERVER_ERROR', message, {
      details: status === undefined ? {} : { status },
      recoverable: true,
      ...(cause === undefined ? {} : { cause }),
    });
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

function concat(a: Uint8Array, b: Uint8Array): Uint8Array {
  if (a.length === 0) return b;
  const out = new Uint8Array(a.length + b.length);
  out.set(a, 0);
  out.set(b, a.length);
  return out;
}

function pcm16ToFloat32(bytes: Uint8Array): Float32Array {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const out = new Float32Array(bytes.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = view.getInt16(i * 2, true) / 32768;
  return out;
}
