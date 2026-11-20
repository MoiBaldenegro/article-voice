import {
  ArticleDetector,
  densityScore,
  type ArticleCandidate,
  type DetectionRule,
} from './ArticleDetector.js';
import { MinWords } from './value-objects/MinWords.js';

function c(
  id: string,
  tag: string,
  wordCount: number,
  extra: Partial<ArticleCandidate> = {},
): ArticleCandidate {
  const paragraphCount = Math.floor(wordCount / 60);
  return { id, tag, wordCount, linkWordCount: 0, paragraphCount, ...extra };
}

interface Page {
  readonly name: string;
  readonly candidates: ArticleCandidate[];
  readonly explicitId?: string;
  readonly expected: { id: string; rule: DetectionRule } | { code: string };
}

// Corpus: estructuras típicas de página, descritas como candidatos.
const CORPUS: Page[] = [
  {
    name: 'blog con un único <article>',
    candidates: [c('a', 'article', 800), c('side', 'aside', 300), c('foot', 'footer', 200)],
    expected: { id: 'a', rule: 'single-article' },
  },
  {
    name: 'tres <article> de tarjetas y un <main> con el cuerpo real en un div',
    candidates: [
      c('card1', 'article', 30),
      c('card2', 'article', 30),
      c('card3', 'article', 30),
      c('body', 'div', 900),
    ],
    expected: { id: 'body', rule: 'density' },
  },
  {
    name: 'itemprop="articleBody" entre varios div',
    candidates: [
      c('d1', 'div', 500),
      c('body', 'div', 450, { isArticleBody: true }),
      c('d2', 'div', 100),
    ],
    expected: { id: 'body', rule: 'article-body' },
  },
  {
    name: 'un único <main> sin <article>',
    candidates: [c('m', 'main', 700), c('n', 'nav', 400)],
    expected: { id: 'm', rule: 'single-main' },
  },
  {
    name: 'div soup: gana el div con más prosa',
    candidates: [
      c('wrap', 'div', 600, { linkWordCount: 100 }),
      c('post', 'div', 550),
      c('c', 'div', 80),
    ],
    expected: { id: 'post', rule: 'density' },
  },
  {
    name: 'portada de noticias: bloque grande pero casi todo enlaces pierde',
    candidates: [
      c('links', 'div', 1200, { linkWordCount: 1100, paragraphCount: 0 }),
      c('story', 'section', 400),
    ],
    expected: { id: 'story', rule: 'density' },
  },
  {
    name: 'nav, aside, footer y form nunca ganan aunque tengan más texto',
    candidates: [
      c('nav', 'nav', 2000),
      c('aside', 'aside', 2000),
      c('footer', 'footer', 2000),
      c('form', 'form', 2000),
      c('text', 'div', 300),
    ],
    expected: { id: 'text', rule: 'density' },
  },
  {
    name: 'candidato marcado como excluido por el adaptador (oculto)',
    candidates: [c('hidden', 'div', 5000, { excluded: true }), c('visible', 'div', 250)],
    expected: { id: 'visible', rule: 'density' },
  },
  {
    name: '<article> dentro de un aside (excluido) y un main',
    candidates: [c('related', 'article', 400, { excluded: true }), c('m', 'main', 600)],
    expected: { id: 'm', rule: 'single-main' },
  },
  {
    name: 'for explícito gana sobre un <article> único',
    candidates: [c('a', 'article', 900), c('post', 'div', 300)],
    explicitId: 'post',
    expected: { id: 'post', rule: 'explicit' },
  },
  {
    name: 'for explícito inexistente no cae a la detección automática (RN-04)',
    candidates: [c('a', 'article', 900)],
    explicitId: 'nope',
    expected: { code: 'AV_ARTICLE_NOT_FOUND' },
  },
  {
    name: 'página de contacto con pocas palabras (RN-01)',
    candidates: [c('m', 'main', 40)],
    expected: { code: 'AV_ARTICLE_TOO_SHORT' },
  },
  {
    name: 'página sin candidatos',
    candidates: [],
    expected: { code: 'AV_ARTICLE_NOT_FOUND' },
  },
  {
    name: 'solo candidatos excluidos',
    candidates: [c('n', 'nav', 500), c('f', 'footer', 500)],
    expected: { code: 'AV_ARTICLE_NOT_FOUND' },
  },
];

describe('ArticleDetector', () => {
  const detector = new ArticleDetector();

  it('el corpus tiene al menos 10 estructuras', () => {
    expect(CORPUS.length).toBeGreaterThanOrEqual(10);
  });

  it.each(CORPUS)('$name', ({ candidates, explicitId, expected }) => {
    const result = detector.detect({
      candidates,
      minWords: MinWords.of(120),
      ...(explicitId === undefined ? {} : { explicitId }),
    });
    if ('code' in expected) {
      expect(result).toEqual({ ok: false, code: expected.code });
    } else {
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.candidate.id).toBe(expected.id);
        expect(result.rule).toBe(expected.rule);
      }
    }
  });

  it('respeta min-words configurable', () => {
    const candidates = [c('m', 'main', 40)];
    expect(detector.detect({ candidates, minWords: MinWords.of(40) }).ok).toBe(true);
    expect(detector.detect({ candidates, minWords: MinWords.of(41) }).ok).toBe(false);
  });

  it('desempata por orden de documento', () => {
    const candidates = [c('first', 'div', 300), c('second', 'div', 300)];
    const r = detector.detect({ candidates, minWords: MinWords.of(120) });
    expect(r.ok && r.candidate.id).toBe('first');
  });

  it('densityScore es 0 sin palabras y penaliza enlaces', () => {
    expect(densityScore(c('e', 'div', 0))).toBe(0);
    expect(densityScore(c('p', 'div', 300))).toBeGreaterThan(
      densityScore(c('l', 'div', 300, { linkWordCount: 200 })),
    );
  });
});
