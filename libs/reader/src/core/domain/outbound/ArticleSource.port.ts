import type { ArticleCandidate } from '../ArticleDetector.js';
import type { BlockRef } from '../Segment.js';

export type BlockRole = 'heading' | 'paragraph' | 'list-item' | 'quote';

export interface ContentBlock {
  readonly ref: BlockRef;
  readonly role: BlockRole;
  readonly text: string;
}

export interface ExtractedArticle {
  readonly title?: string;
  /** Idioma declarado por la página (sin normalizar). */
  readonly language?: string;
  readonly blocks: readonly ContentBlock[];
  readonly wordCount: number;
}

/** Puerto de entrada de contenido; lo implementa DomArticleSource. */
export interface ArticleSource {
  /** Candidatos descritos para `ArticleDetector`. */
  candidates(explicitId?: string): ArticleCandidate[];
  /** Bloques legibles del candidato (llamar tras `candidates()`). */
  extract(candidateId: string): ExtractedArticle | undefined;
}
