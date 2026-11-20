// CU-01: detectar el artículo (RN-01, RN-03, RN-04, RN-10, RN-12) y estimar su duración.

import { Article, DEFAULT_WPM, MAX_ARTICLE_CHARS } from '../domain/Article.js';
import { ArticleDetector, type DetectionRule } from '../domain/ArticleDetector.js';
import { DomainValidationError, ResourceNotFoundError } from '../domain/exceptions/errors.js';
import type { ArticleSource } from '../domain/outbound/ArticleSource.port.js';
import { Language } from '../domain/value-objects/Language.js';
import { MinWords } from '../domain/value-objects/MinWords.js';
import { PlaybackRate } from '../domain/value-objects/PlaybackRate.js';

export interface DetectArticleInput {
  /** `for`/`target` explícito. */
  readonly explicitId?: string;
  readonly minWords?: MinWords;
  /** Opción `lang`: manda sobre el idioma de la página (RN-10). */
  readonly language?: string;
  readonly rate?: PlaybackRate;
  readonly wpm?: number;
  readonly maxChars?: number;
}

export interface DetectArticleOutput {
  readonly article: Article;
  readonly rule: DetectionRule;
  readonly estimatedDurationMs: number;
  /** Aviso AV_INPUT_TOO_LARGE (RN-12): no bloquea. */
  readonly warnings: readonly 'AV_INPUT_TOO_LARGE'[];
}

export const DEFAULT_MIN_WORDS = 120;

export class DetectArticle {
  constructor(
    private readonly source: ArticleSource,
    private readonly detector: ArticleDetector = new ArticleDetector(),
  ) {}

  execute(input: DetectArticleInput = {}): DetectArticleOutput {
    const minWords = input.minWords ?? MinWords.of(DEFAULT_MIN_WORDS);
    const candidates = this.source.candidates(input.explicitId);
    const result = this.detector.detect({
      candidates,
      minWords,
      ...(input.explicitId !== undefined ? { explicitId: input.explicitId } : {}),
    });
    if (!result.ok) {
      if (result.code === 'AV_ARTICLE_NOT_FOUND') {
        throw new ResourceNotFoundError(result.code, 'No se encontró el artículo', {
          recoverable: true,
          details: { explicitId: input.explicitId },
        });
      }
      throw new DomainValidationError(result.code, 'El artículo es demasiado corto', {
        details: { minWords: minWords.value },
      });
    }

    const extracted = this.source.extract(result.candidate.id);
    if (!extracted) {
      throw new ResourceNotFoundError('AV_ARTICLE_NOT_FOUND', 'No se pudo extraer el artículo', {
        recoverable: true,
        details: { candidate: result.candidate.id },
      });
    }

    const language = Language.from(input.language ?? extracted.language ?? '');
    const { blocks, truncated } = Article.truncate(
      extracted.blocks,
      input.maxChars ?? MAX_ARTICLE_CHARS,
    );
    const article = new Article({
      ...(extracted.title !== undefined ? { title: extracted.title } : {}),
      language,
      blocks,
      truncated,
    });
    return {
      article,
      rule: result.rule,
      estimatedDurationMs: article.estimatedDuration(
        input.rate ?? PlaybackRate.DEFAULT,
        input.wpm ?? DEFAULT_WPM,
      ),
      warnings: truncated ? ['AV_INPUT_TOO_LARGE'] : [],
    };
  }
}
