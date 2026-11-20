import { ValueObject } from './ValueObject.js';
import { invalidOption } from './invalid-option.js';

const PATTERN = /^[a-z0-9-]{1,64}$/;

/** Voz del motor: `[a-z0-9-]{1,64}`. */
export class VoiceId extends ValueObject<{ value: string }> {
  static of(value: string): VoiceId {
    if (typeof value !== 'string' || !PATTERN.test(value)) {
      throw invalidOption('voice', 'debe cumplir [a-z0-9-]{1,64}', value);
    }
    return new VoiceId({ value });
  }

  static from(raw: string): VoiceId {
    return VoiceId.of(typeof raw === 'string' ? raw.trim() : raw);
  }

  get value(): string {
    return this.props.value;
  }
}
