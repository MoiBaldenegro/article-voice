import { DomainValidationError, InvalidStateTransitionError } from './exceptions/errors.js';
import type { NarrationState } from './NarrationState.js';
import type { Segment } from './Segment.js';
import { EngineKind } from './value-objects/EngineKind.js';
import { PlaybackRate } from './value-objects/PlaybackRate.js';
import type { VoiceId } from './value-objects/VoiceId.js';

export type NarrationAction =
  'play' | 'prepared' | 'cancelPreparation' | 'pause' | 'resume' | 'stop' | 'segmentEnded' | 'fail';

type Transitions = Record<NarrationState, Partial<Record<NarrationAction, NarrationState>>>;

/** Transiciones válidas (docs/04-diseno/diagramas.md). Cualquier otra lanza error. */
const TRANSITIONS: Readonly<Transitions> = {
  idle: { play: 'preparing' },
  preparing: { prepared: 'playing', cancelPreparation: 'idle', fail: 'error', stop: 'stopped' },
  playing: { pause: 'paused', stop: 'stopped', fail: 'error', segmentEnded: 'playing' },
  paused: { resume: 'playing', stop: 'stopped' },
  stopped: { play: 'preparing' },
  error: { play: 'preparing', stop: 'stopped' },
};

export interface NarrationInit {
  readonly id: string;
  readonly segments: readonly Segment[];
  readonly voice: VoiceId;
  readonly rate?: PlaybackRate;
  readonly engine?: EngineKind;
  readonly isFallback?: boolean;
}

/** Una lectura en curso de un artículo: cursor sobre segmentos + estado. */
export class Narration {
  readonly id: string;
  readonly segments: readonly Segment[];
  readonly voice: VoiceId;
  readonly engine: EngineKind;
  readonly isFallback: boolean;
  private _rate: PlaybackRate;
  private _state: NarrationState = 'idle';
  private _cursor = 0;
  private _errorCode: string | undefined;

  constructor(init: NarrationInit) {
    if (init.segments.length === 0) {
      throw new DomainValidationError(
        'AV_INVALID_OPTION',
        'A narration needs at least one segment',
        { details: { name: 'segments', reason: 'vacío' } },
      );
    }
    this.id = init.id;
    this.segments = init.segments;
    this.voice = init.voice;
    this._rate = init.rate ?? PlaybackRate.DEFAULT;
    this.engine = init.engine ?? EngineKind.DEFAULT;
    this.isFallback = init.isFallback ?? false;
  }

  get state(): NarrationState {
    return this._state;
  }
  get cursor(): number {
    return this._cursor;
  }
  get rate(): PlaybackRate {
    return this._rate;
  }
  get errorCode(): string | undefined {
    return this._errorCode;
  }

  setRate(rate: PlaybackRate): void {
    this._rate = rate;
  }

  /** idle|stopped → preparing; error → preparing (reintento desde el cursor). */
  play(): void {
    const from = this._state;
    this.move('play');
    if (from === 'stopped') this._cursor = 0;
    this._errorCode = undefined;
  }

  /** El motor está listo: preparing → playing. */
  prepared(): void {
    this.move('prepared');
  }

  /** Descarga cancelada o rechazada: preparing → idle. */
  cancelPreparation(): void {
    this.move('cancelPreparation');
  }

  pause(): void {
    this.move('pause');
  }

  resume(): void {
    this.move('resume');
  }

  stop(): void {
    this.move('stop');
  }

  /** Mueve el cursor a `index` sin cambiar de estado (solo reproduciendo o en pausa). */
  seek(index: number): void {
    if (this._state !== 'playing' && this._state !== 'paused') {
      throw this.invalid('seek');
    }
    if (!Number.isInteger(index) || index < 0 || index >= this.segments.length) {
      throw new DomainValidationError('AV_INVALID_OPTION', 'Segment index out of range', {
        details: { name: 'index', reason: 'fuera de rango', value: index },
      });
    }
    this._cursor = index;
  }

  /** Terminó el segmento actual: avanza el cursor; tras el último pasa a stopped. */
  segmentEnded(): void {
    if (this._state !== 'playing') throw this.invalid('segmentEnded');
    if (this._cursor + 1 >= this.segments.length) {
      this._state = 'stopped';
      return;
    }
    this._cursor += 1;
  }

  /** Fallo (síntesis, descarga, inicio): preparing|playing → error; conserva el cursor. */
  fail(code: string): void {
    this.move('fail');
    this._errorCode = code;
  }

  /** Índices por sintetizar: desde el cursor, como máximo `lookahead` por delante (RN-07). */
  pendingSynthesis(lookahead = 2): number[] {
    const last = Math.min(this._cursor + lookahead, this.segments.length - 1);
    const out: number[] = [];
    for (let i = this._cursor; i <= last; i++) out.push(i);
    return out;
  }

  private move(action: NarrationAction): void {
    const next = TRANSITIONS[this._state][action];
    if (next === undefined) throw this.invalid(action);
    this._state = next;
  }

  private invalid(action: string): InvalidStateTransitionError {
    return new InvalidStateTransitionError(
      'AV_INVALID_NARRATION_TRANSITION',
      `Cannot ${action} while the narration is ${this._state}`,
      { details: { from: this._state, action } },
    );
  }
}
