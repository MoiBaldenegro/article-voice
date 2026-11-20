import type { ArticleCandidate } from '../domain/ArticleDetector.js';
import type { ArticleSource, ExtractedArticle } from '../domain/outbound/ArticleSource.port.js';
import { MinWords } from '../domain/value-objects/MinWords.js';
import { PlaybackRate } from '../domain/value-objects/PlaybackRate.js';
import { DetectArticle } from './DetectArticle.use-case.js';

class FakeSource implements ArticleSource {
  constructor(
    private readonly cands: ArticleCandidate[],
    private readonly article?: ExtractedArticle,
  ) {}
  candidates(): ArticleCandidate[] {
    return this.cands;
  }
  extract(): ExtractedArticle | undefined {
    return this.article;
  }
}

const words = (n: number): string => Array.from({ length: n }, () => 'palabra').join(' ');
const cand = (id: string, wordCount: number, tag = 'article'): ArticleCandidate => ({
  id,
  tag,
  wordCount,
  linkWordCount: 0,
  paragraphCount: 1,
});
const extracted = (text: string, language?: string): ExtractedArticle => ({
  title: 'Título',
  ...(language !== undefined ? { language } : {}),
  blocks: [{ ref: 'av-b1', role: 'paragraph', text }],
  wordCount: text.split(' ').length,
});

describe('DetectArticle', () => {
  it('devuelve el Article con bloques y duración estimada', () => {
    const src = new FakeSource([cand('a', 300)], extracted(words(300), 'es-MX'));
    const out = new DetectArticle(src).execute({ wpm: 150 });
    expect(out.article.language.value).toBe('es');
    expect(out.article.blocks).toHaveLength(1);
    expect(out.article.wordCount).toBe(300);
    expect(out.rule).toBe('single-article');
    expect(out.estimatedDurationMs).toBe(120_000);
    expect(out.warnings).toEqual([]);
  });

  it('la duración baja al subir la velocidad', () => {
    const src = new FakeSource([cand('a', 300)], extracted(words(300), 'es'));
    const out = new DetectArticle(src).execute({ wpm: 150, rate: PlaybackRate.of(2) });
    expect(out.estimatedDurationMs).toBe(60_000);
  });

  it('la opción language manda sobre la de la página', () => {
    const src = new FakeSource([cand('a', 300)], extracted(words(300), 'es'));
    expect(new DetectArticle(src).execute({ language: 'en' }).article.language.value).toBe('en');
  });

  it('lanza AV_ARTICLE_NOT_FOUND sin candidatos', () => {
    expect(() => new DetectArticle(new FakeSource([])).execute()).toThrow(
      expect.objectContaining({ code: 'AV_ARTICLE_NOT_FOUND' }),
    );
  });

  it('lanza AV_ARTICLE_NOT_FOUND si el id explícito no existe (RN-04)', () => {
    const src = new FakeSource([cand('a', 300)], extracted(words(300), 'es'));
    expect(() => new DetectArticle(src).execute({ explicitId: 'zzz' })).toThrow(
      expect.objectContaining({ code: 'AV_ARTICLE_NOT_FOUND' }),
    );
  });

  it('lanza AV_ARTICLE_TOO_SHORT bajo el mínimo', () => {
    const src = new FakeSource([cand('a', 40)], extracted(words(40), 'es'));
    expect(() => new DetectArticle(src).execute()).toThrow(
      expect.objectContaining({ code: 'AV_ARTICLE_TOO_SHORT' }),
    );
    expect(() => new DetectArticle(src).execute({ minWords: MinWords.of(30) })).not.toThrow();
  });

  it('lanza AV_UNSUPPORTED_LANGUAGE con idioma desconocido o ausente', () => {
    const src = new FakeSource([cand('a', 300)], extracted(words(300), 'xx'));
    expect(() => new DetectArticle(src).execute()).toThrow(
      expect.objectContaining({ code: 'AV_UNSUPPORTED_LANGUAGE' }),
    );
  });

  it('trunca y avisa por RN-12', () => {
    const src = new FakeSource([cand('a', 300)], extracted(words(300), 'es'));
    const out = new DetectArticle(src).execute({ maxChars: 100 });
    expect(out.article.truncated).toBe(true);
    expect(out.warnings).toEqual(['AV_INPUT_TOO_LARGE']);
    expect(out.article.blocks[0]?.text.length).toBeLessThanOrEqual(100);
  });
});
