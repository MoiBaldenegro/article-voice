import { DomainValidationError } from '../exceptions/errors.js';
import { ValueObject } from './ValueObject.js';

/**
 * Idiomas base (BCP 47) soportados por MOSS-TTS-Nano (RN-10).
 * Lista pendiente de contrastar con el informe T-000 / ADR-0018.
 */
// prettier-ignore
export const SUPPORTED_LANGUAGES = [
  'zh', 'en', 'de', 'es', 'fr', 'ja', 'it', 'hu', 'ko', 'ru',
  'fa', 'ar', 'pl', 'pt', 'cs', 'da', 'sv', 'el', 'tr', 'uk',
] as const;
export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number];

export class Language extends ValueObject<{ value: LanguageCode }> {
  /** Acepta etiquetas completas ("es-MX", "EN_us") y conserva la parte base. */
  static from(raw: string): Language {
    const base = typeof raw === 'string' ? (raw.trim().toLowerCase().split(/[-_]/)[0] ?? '') : '';
    if (!(SUPPORTED_LANGUAGES as readonly string[]).includes(base)) {
      throw new DomainValidationError(
        'AV_UNSUPPORTED_LANGUAGE',
        `Idioma no soportado: "${String(raw)}"`,
        { details: { lang: raw } },
      );
    }
    return new Language({ value: base as LanguageCode });
  }

  static of(value: string): Language {
    return Language.from(value);
  }

  get value(): LanguageCode {
    return this.props.value;
  }
}
