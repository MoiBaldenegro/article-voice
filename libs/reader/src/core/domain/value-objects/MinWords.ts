import { ValueObject } from './ValueObject.js';
import { invalidOption } from './invalid-option.js';

/** RN-01: mínimo de palabras para considerar un artículo; entero de 1 a 10 000. */
export class MinWords extends ValueObject<{ value: number }> {
  static readonly MIN = 1;
  static readonly MAX = 10_000;

  static of(value: number): MinWords {
    if (!Number.isInteger(value) || value < MinWords.MIN || value > MinWords.MAX) {
      throw invalidOption('min-words', 'debe ser un entero entre 1 y 10000', value);
    }
    return new MinWords({ value });
  }

  static from(raw: string | number): MinWords {
    if (typeof raw === 'number') return MinWords.of(raw);
    const t = raw.trim();
    return MinWords.of(/^\d+$/.test(t) ? Number(t) : Number.NaN);
  }

  get value(): number {
    return this.props.value;
  }
}
