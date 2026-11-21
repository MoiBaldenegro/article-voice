import { en } from './en.js';
import { es } from './es.js';
import type { Messages } from './messages.js';

export type { Messages, UiState } from './messages.js';
export type UiLanguage = 'es' | 'en';

const dictionaries: Record<UiLanguage, Messages> = { es, en };

/** es → es; cualquier otro idioma → en; sin dato → es (idioma por defecto del producto). */
export function resolveUiLanguage(...candidates: Array<string | null | undefined>): UiLanguage {
  const tag = candidates.find((c) => c && c.trim() !== '');
  if (!tag) return 'es';
  return tag.trim().toLowerCase().startsWith('es') ? 'es' : 'en';
}

export function messagesFor(language: UiLanguage): Messages {
  return dictionaries[language];
}
