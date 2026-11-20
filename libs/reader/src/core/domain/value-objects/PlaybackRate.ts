import { ValueObject } from './ValueObject.js';
import { invalidOption } from './invalid-option.js';

/** RN-08: velocidad de 0.75 a 2.0 en pasos de 0.25. */
export class PlaybackRate extends ValueObject<{ value: number }> {
  static readonly MIN = 0.75;
  static readonly MAX = 2;
  static readonly STEP = 0.25;
  static readonly DEFAULT = new PlaybackRate({ value: 1 });

  static of(value: number): PlaybackRate {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw invalidOption('rate', 'debe ser un número', value);
    }
    const steps = value / PlaybackRate.STEP;
    if (value < PlaybackRate.MIN || value > PlaybackRate.MAX || steps !== Math.round(steps)) {
      throw invalidOption('rate', 'debe estar entre 0.75 y 2.0 en pasos de 0.25', value);
    }
    return new PlaybackRate({ value });
  }

  /** Acepta texto de atributo HTML ("1.25"). */
  static from(raw: string | number): PlaybackRate {
    return PlaybackRate.of(typeof raw === 'string' ? parseNumber(raw) : raw);
  }

  get value(): number {
    return this.props.value;
  }
}

function parseNumber(raw: string): number {
  const t = raw.trim();
  return t === '' ? Number.NaN : Number(t);
}
