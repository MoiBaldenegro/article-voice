import type { ContentBlock } from './outbound/ArticleSource.port.js';
import type { Language } from './value-objects/Language.js';
import type { PlaybackRate } from './value-objects/PlaybackRate.js';

/** RN-12: máximo de caracteres legibles que se narran. */
export const MAX_ARTICLE_CHARS = 200_000;
/** Palabras por minuto por defecto a velocidad 1.0. */
export const DEFAULT_WPM = 150;

export interface ArticleInit {
  readonly title?: string;
  readonly language: Language;
  readonly blocks: readonly ContentBlock[];
  readonly truncated?: boolean;
}

export function countWords(text: string): number {
  const t = text.trim();
  return t === '' ? 0 : t.split(/\s+/).length;
}

export class Article {
  readonly title: string | undefined;
  readonly language: Language;
  readonly blocks: readonly ContentBlock[];
  readonly wordCount: number;
  readonly truncated: boolean;

  constructor(init: ArticleInit) {
    this.title = init.title;
    this.language = init.language;
    this.blocks = init.blocks;
    this.truncated = init.truncated ?? false;
    this.wordCount = init.blocks.reduce((n, b) => n + countWords(b.text), 0);
  }

  /** Aplica RN-12: recorta a `max` caracteres y marca `truncated`. */
  static truncate(
    blocks: readonly ContentBlock[],
    max: number = MAX_ARTICLE_CHARS,
  ): { blocks: readonly ContentBlock[]; truncated: boolean } {
    const out: ContentBlock[] = [];
    let used = 0;
    for (const b of blocks) {
      const room = max - used;
      if (b.text.length <= room) {
        out.push(b);
        used += b.text.length;
        continue;
      }
      const cut = room > 0 ? b.text.slice(0, room).trimEnd() : '';
      if (cut !== '') out.push({ ...b, text: cut });
      return { blocks: out, truncated: true };
    }
    return { blocks: out, truncated: false };
  }

  /** Duración estimada en ms: palabras / (wpm × velocidad). */
  estimatedDuration(rate: PlaybackRate, wpm: number = DEFAULT_WPM): number {
    if (!Number.isFinite(wpm) || wpm <= 0) return 0;
    return Math.round((this.wordCount / (wpm * rate.value)) * 60_000);
  }
}
