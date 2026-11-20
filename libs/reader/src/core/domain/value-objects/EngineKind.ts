import { ValueObject } from './ValueObject.js';
import { invalidOption } from './invalid-option.js';

export const ENGINE_KINDS = ['auto', 'moss-browser', 'moss-server', 'web-speech'] as const;
export type EngineKindValue = (typeof ENGINE_KINDS)[number];

/** Motor pedido o elegido. */
export class EngineKind extends ValueObject<{ value: EngineKindValue }> {
  static readonly DEFAULT = new EngineKind({ value: 'auto' });

  static of(value: string): EngineKind {
    if (!(ENGINE_KINDS as readonly string[]).includes(value)) {
      throw invalidOption('engine', `debe ser uno de: ${ENGINE_KINDS.join(', ')}`, value);
    }
    return new EngineKind({ value: value as EngineKindValue });
  }

  static from(raw: string): EngineKind {
    return EngineKind.of(typeof raw === 'string' ? raw.trim().toLowerCase() : raw);
  }

  get value(): EngineKindValue {
    return this.props.value;
  }
}
