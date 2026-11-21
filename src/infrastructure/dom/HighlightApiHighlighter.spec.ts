/**
 * @jest-environment jsdom
 */
import { Segmenter } from '../../../libs/reader/src/core-api.js';
import { DomArticleSource } from './DomArticleSource.js';
import {
  HighlightApiHighlighter,
  HIGHLIGHT_NAME,
  SCROLL_IDLE_MS,
} from './HighlightApiHighlighter.js';

class FakeHighlight {
  readonly ranges: Range[];
  constructor(...ranges: Range[]) {
    this.ranges = ranges;
  }
}

function install(): Map<string, FakeHighlight> {
  const map = new Map<string, FakeHighlight>();
  (window as unknown as { CSS: unknown }).CSS = { highlights: map };
  (window as unknown as { Highlight: unknown }).Highlight = FakeHighlight;
  return map;
}

function uninstall(): void {
  delete (window as unknown as { CSS?: unknown }).CSS;
  delete (window as unknown as { Highlight?: unknown }).Highlight;
}

const HTML = `<article id="a"><h1>Título</h1>
  <p id="p1">Primera   frase con <em>énfasis</em> y <a href="#">enlace</a>.<br>Segunda frase aquí.
  <button>Compartir</button> Tercera frase final.</p>
  <p id="p2">Otro párrafo distinto.</p></article>`;

function setup() {
  document.body.innerHTML = HTML;
  const source = new DomArticleSource(document);
  const cands = source.candidates('a');
  const article = source.extract(cands[0]?.id ?? 'a');
  if (!article) throw new Error('sin artículo');
  const segments = new Segmenter().segment(article.blocks, 'es');
  return { source, article, segments };
}

afterEach(() => {
  uninstall();
  document.head.innerHTML = '';
});

describe('DomArticleSource.rangeOf', () => {
  it('mapea el texto normalizado al DOM a través de nodos inline', () => {
    const { source, article } = setup();
    const block = article.blocks[1];
    if (!block) throw new Error('sin bloque');
    const slice = (text: string): string | undefined => {
      const start = block.text.indexOf(text);
      return source.rangeOf({ block: block.ref, start, end: start + text.length })?.toString();
    };
    expect(slice('Primera frase con énfasis')).toBe('Primera   frase con énfasis');
    expect(slice('enlace.')).toBe('enlace.');
    expect(slice('Segunda frase aquí.')).toBe('Segunda frase aquí.');
    expect(slice('Tercera frase final.')).toBe('Tercera frase final.');
    expect(source.rangeOf({ block: block.ref, start: 0, end: 9999 })).toBeUndefined();
  });

  it('devuelve undefined si el bloque ya no está en el documento', () => {
    const { source, segments } = setup();
    document.body.innerHTML = '';
    const span = segments[1]?.spans[0];
    expect(span && source.rangeOf(span)).toBeUndefined();
  });

  it('no muta el DOM', () => {
    const { source, segments } = setup();
    const before = document.body.innerHTML;
    for (const s of segments) for (const sp of s.spans) source.rangeOf(sp);
    expect(document.body.innerHTML).toBe(before);
  });
});

describe('HighlightApiHighlighter', () => {
  it('registra un Highlight con los rangos del segmento y no muta el artículo', () => {
    const map = install();
    const { source, segments } = setup();
    const before = document.body.innerHTML;
    const h = new HighlightApiHighlighter(source, document);
    expect(h.supported).toBe(true);
    const last = segments[segments.length - 1];
    h.highlight(last?.spans ?? []);
    expect(map.get(HIGHLIGHT_NAME)?.ranges.map((r) => r.toString())).toEqual([
      'Otro párrafo distinto.',
    ]);
    expect(document.body.innerHTML).toBe(before);
    h.clear();
    expect(map.has(HIGHLIGHT_NAME)).toBe(false);
  });

  it('reemplaza el resaltado anterior y añade una sola hoja ::highlight', () => {
    const map = install();
    const { source, segments } = setup();
    const h = new HighlightApiHighlighter(source, document);
    h.highlight(segments[0]?.spans ?? []);
    const first = map.get(HIGHLIGHT_NAME);
    h.highlight(segments[1]?.spans ?? []);
    expect(map.get(HIGHLIGHT_NAME)).not.toBe(first);
    expect(document.head.querySelectorAll('style[data-article-voice-highlight]').length).toBe(1);
    expect(document.head.textContent).toContain(`::highlight(${HIGHLIGHT_NAME})`);
  });

  it('clear no borra el resaltado de otra instancia', () => {
    const map = install();
    const { source, segments } = setup();
    const a = new HighlightApiHighlighter(source, document);
    const b = new HighlightApiHighlighter(source, document);
    a.highlight(segments[0]?.spans ?? []);
    b.highlight(segments[1]?.spans ?? []);
    a.clear();
    expect(map.has(HIGHLIGHT_NAME)).toBe(true);
  });

  it('sin Highlight API no hace nada ni falla', () => {
    const { source, segments } = setup();
    const before = document.documentElement.outerHTML;
    const h = new HighlightApiHighlighter(source, document);
    expect(h.supported).toBe(false);
    expect(() => h.highlight(segments[0]?.spans ?? [])).not.toThrow();
    expect(() => h.clear()).not.toThrow();
    expect(document.documentElement.outerHTML).toBe(before);
  });

  describe('seguimiento con scroll', () => {
    const offscreen = (): void => {
      Range.prototype.getBoundingClientRect = () =>
        ({ top: 2000, bottom: 2020, width: 100, height: 20 }) as DOMRect;
    };
    afterEach(() => {
      delete (Range.prototype as { getBoundingClientRect?: unknown }).getBoundingClientRect;
    });

    function run(reduced: boolean, now: () => number) {
      install();
      offscreen();
      window.matchMedia = ((q: string) => ({
        matches: reduced && q.includes('reduce'),
      })) as never;
      const scrollTo = jest.fn();
      window.scrollTo = scrollTo as never;
      const { source, segments } = setup();
      const h = new HighlightApiHighlighter(source, document, now);
      h.highlight(segments[0]?.spans ?? []);
      return scrollTo;
    }

    it('se desplaza suave si el segmento está fuera de la vista', () => {
      const scrollTo = run(false, () => 10_000);
      expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ behavior: 'smooth' }));
    });

    it('sin animación con prefers-reduced-motion', () => {
      const scrollTo = run(true, () => 10_000);
      expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ behavior: 'auto' }));
    });

    it('no se desplaza si el visitante hizo scroll hace menos de 5 s', () => {
      let t = 10_000;
      install();
      offscreen();
      const scrollTo = jest.fn();
      window.scrollTo = scrollTo as never;
      const { source, segments } = setup();
      const h = new HighlightApiHighlighter(source, document, () => t);
      window.dispatchEvent(new Event('wheel'));
      t += SCROLL_IDLE_MS - 1;
      h.highlight(segments[0]?.spans ?? []);
      expect(scrollTo).not.toHaveBeenCalled();
      t += 2;
      h.highlight(segments[1]?.spans ?? []);
      expect(scrollTo).toHaveBeenCalledTimes(1);
    });
  });
});
