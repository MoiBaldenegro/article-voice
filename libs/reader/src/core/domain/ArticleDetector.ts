// ArticleDetector: dominio puro (sin DOM). Aplica RN-01..RN-04 sobre candidatos ya
// descritos por el adaptador (DomArticleSource, T-012), que cuenta palabras sin
// los descendientes excluidos por RN-02 y marca los candidatos que están dentro
// de un contenedor excluido.

import { MinWords } from './value-objects/MinWords.js';

/** Etiquetas cuyo bloque nunca es el artículo (RN-02). */
const EXCLUDED_TAGS: ReadonlySet<string> = new Set([
  'nav',
  'aside',
  'footer',
  'form',
  'header',
  'button',
  'script',
  'style',
  'noscript',
  'template',
]);

export interface ArticleCandidate {
  readonly id: string;
  /** Nombre de etiqueta en minúsculas: `article`, `main`, `div`, `section`... */
  readonly tag: string;
  /** Palabras legibles del bloque, sin descendientes excluidos. */
  readonly wordCount: number;
  /** Palabras que están dentro de enlaces. */
  readonly linkWordCount: number;
  /** Párrafos con texto propio. */
  readonly paragraphCount: number;
  /** Tiene `itemprop="articleBody"`. */
  readonly isArticleBody?: boolean;
  /** El adaptador lo marcó como excluido (RN-02: oculto, aria-hidden, data-av-skip, dentro de nav...). */
  readonly excluded?: boolean;
}

export interface DetectInput {
  readonly candidates: readonly ArticleCandidate[];
  readonly minWords: MinWords;
  /** `for`/`target` explícito: id del elemento pedido (RN-03.1). Si se pide y no está → RN-04. */
  readonly explicitId?: string;
}

export type DetectionRule =
  | 'explicit'
  | 'single-article'
  | 'article-body'
  | 'single-main'
  | 'density';

export type DetectionResult =
  | { readonly ok: true; readonly candidate: ArticleCandidate; readonly rule: DetectionRule }
  | { readonly ok: false; readonly code: 'AV_ARTICLE_NOT_FOUND' | 'AV_ARTICLE_TOO_SHORT' };

/** Puntuación de densidad: palabras de prosa penalizadas por proporción de enlaces. */
export function densityScore(c: ArticleCandidate): number {
  if (c.wordCount <= 0) return 0;
  const linkRatio = Math.min(1, c.linkWordCount / c.wordCount);
  const proseWords = c.wordCount - c.linkWordCount;
  return (proseWords + 10 * c.paragraphCount) * (1 - linkRatio);
}

function isEligible(c: ArticleCandidate): boolean {
  return c.excluded !== true && !EXCLUDED_TAGS.has(c.tag.toLowerCase());
}

function only<T>(items: readonly T[]): T | undefined {
  return items.length === 1 ? items[0] : undefined;
}

export class ArticleDetector {
  detect(input: DetectInput): DetectionResult {
    const { candidates, minWords, explicitId } = input;

    // RN-03.1 / RN-04: lo explícito manda y nunca cae a la detección automática.
    if (explicitId !== undefined) {
      const found = candidates.find((c) => c.id === explicitId);
      if (!found) return { ok: false, code: 'AV_ARTICLE_NOT_FOUND' };
      return this.check(found, 'explicit', minWords);
    }

    const eligible = candidates.filter(isEligible);
    if (eligible.length === 0) return { ok: false, code: 'AV_ARTICLE_NOT_FOUND' };

    const article = only(eligible.filter((c) => c.tag === 'article'));
    if (article) return this.check(article, 'single-article', minWords);

    const body = only(eligible.filter((c) => c.isArticleBody === true));
    if (body) return this.check(body, 'article-body', minWords);

    const main = only(eligible.filter((c) => c.tag === 'main'));
    if (main) return this.check(main, 'single-main', minWords);

    // Desempate estable: gana el primero en orden de documento.
    let best = eligible[0] as ArticleCandidate;
    let bestScore = densityScore(best);
    for (const c of eligible.slice(1)) {
      const s = densityScore(c);
      if (s > bestScore) {
        best = c;
        bestScore = s;
      }
    }
    return this.check(best, 'density', minWords);
  }

  private check(
    candidate: ArticleCandidate,
    rule: DetectionRule,
    minWords: MinWords,
  ): DetectionResult {
    if (candidate.wordCount < minWords.value) return { ok: false, code: 'AV_ARTICLE_TOO_SHORT' };
    return { ok: true, candidate, rule };
  }
}
