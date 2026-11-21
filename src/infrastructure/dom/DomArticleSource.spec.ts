/**
 * @jest-environment jsdom
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ArticleDetector, MinWords } from '../../../libs/reader/src/core-api.js';
import { DomArticleSource } from './DomArticleSource.js';

function load(html: string): Document {
  // Documento real de jsdom (con vista): getComputedStyle aplica las hojas de estilo.
  document.open();
  document.write(html);
  document.close();
  return document;
}

function fixture(name: string): Document {
  return load(readFileSync(join(__dirname, 'fixtures', name), 'utf8'));
}

function extractBest(doc: Document, minWords = 5) {
  const source = new DomArticleSource(doc);
  const res = new ArticleDetector().detect({
    candidates: source.candidates(),
    minWords: MinWords.of(minWords),
  });
  if (!res.ok) throw new Error(res.code);
  return { source, res, article: source.extract(res.candidate.id) };
}

describe('DomArticleSource', () => {
  it('extrae solo la prosa del artículo en orden de lectura con sus roles', () => {
    const { article, res } = extractBest(fixture('blog.html'));
    expect(res.rule).toBe('single-article');
    expect(article?.title).toBe('Cómo cuidar un huerto urbano');
    expect(article?.language).toBe('es');
    expect(article?.blocks.map((b) => [b.role, b.text])).toEqual([
      ['heading', 'Cómo cuidar un huerto urbano'],
      [
        'paragraph',
        'Un huerto urbano necesita luz, agua y paciencia. Con buena tierra todo crece mejor.',
      ],
      ['paragraph', 'Riega por la mañana. Evita mojar las hojas.'],
      ['list-item', 'Primer consejo'],
      ['list-item', 'Segundo consejo con inline dentro'],
      ['quote', 'La paciencia es la madre de la cosecha.'],
    ]);
  });

  it('ignora menús, scripts, publicidad, ocultos, código en bloque y pies', () => {
    const { article } = extractBest(fixture('blog.html'));
    const all = article?.blocks.map((b) => b.text).join(' ') ?? '';
    for (const banned of [
      'Menú',
      'console',
      'patrocinado',
      'Publicidad',
      'relacionados',
      'hidden',
      'aria',
      'omitir',
      'CSS',
      'codigo',
      'Pie de foto',
      'Suscríbete',
      'Enviar',
      'derechos',
    ]) {
      expect(all).not.toContain(banned);
    }
  });

  it('describe candidatos sin contar excluidos y omite los que están dentro de uno', () => {
    const doc = load(`<body>
      <nav><div id="menu">uno dos tres cuatro cinco seis siete</div></nav>
      <div id="a"><p>uno dos tres</p><aside><p>cuatro cinco seis</p></aside></div>
    </body>`);
    const cands = new DomArticleSource(doc).candidates();
    expect(cands.find((c) => c.id === 'menu')).toBeUndefined();
    expect(cands.find((c) => c.id === 'a')).toMatchObject({
      wordCount: 3,
      paragraphCount: 1,
      excluded: false,
    });
  });

  it('cuenta las palabras dentro de enlaces', () => {
    const doc = load('<body><div id="a"><p>uno <a href="#">dos tres</a> cuatro</p></div></body>');
    const a = new DomArticleSource(doc).candidates().find((c) => c.id === 'a');
    expect(a).toMatchObject({ wordCount: 4, linkWordCount: 2 });
  });

  it('sin <article> elige el contenedor de prosa, no el de enlaces', () => {
    const doc = load(`<body>
      <div id="links"><p><a href="#">uno</a> <a href="#">dos</a> <a href="#">tres</a> <a href="#">cuatro</a> <a href="#">cinco</a> <a href="#">seis</a></p></div>
      <div id="texto"><p>Esta es una frase larga de prosa real que cuenta bien.</p></div>
    </body>`);
    const { res } = extractBest(doc, 5);
    expect(res.candidate.id).toBe('texto');
  });

  it('resuelve cada BlockRef al nodo y deja de resolver si el nodo sale del documento', () => {
    const doc = load(
      '<body><article id="art"><p id="p1">Un párrafo de prueba con palabras.</p></article></body>',
    );
    const source = new DomArticleSource(doc);
    source.candidates();
    const ref = source.extract('art')?.blocks[0]?.ref as string;
    expect(source.resolve(ref)).toBe(doc.getElementById('p1'));
    doc.getElementById('p1')?.remove();
    expect(source.resolve(ref)).toBeUndefined();
    expect(source.resolve('av-b999')).toBeUndefined();
  });

  it('mantiene el mismo BlockRef al extraer dos veces y refs distintos por bloque', () => {
    const doc = load('<body><article id="art"><p>Uno dos.</p><p>Tres cuatro.</p></article></body>');
    const source = new DomArticleSource(doc);
    source.candidates();
    const first = source.extract('art')?.blocks.map((b) => b.ref);
    const second = source.extract('art')?.blocks.map((b) => b.ref);
    expect(first).toEqual(second);
    expect(new Set(first).size).toBe(2);
  });

  it('un id explícito inexistente o vacío sigue RN-03.1/RN-04', () => {
    const doc = load(
      '<body><div id="vacio"></div><article><p>uno dos tres cuatro cinco</p></article></body>',
    );
    const source = new DomArticleSource(doc);
    const detector = new ArticleDetector();
    const minWords = MinWords.of(5);
    expect(
      detector.detect({ candidates: source.candidates('nada'), minWords, explicitId: 'nada' }),
    ).toEqual({ ok: false, code: 'AV_ARTICLE_NOT_FOUND' });
    expect(
      detector.detect({ candidates: source.candidates('vacio'), minWords, explicitId: 'vacio' }),
    ).toEqual({ ok: false, code: 'AV_ARTICLE_TOO_SHORT' });
  });

  it('conserva el código inline y excluye el código en bloque', () => {
    const doc = load(
      '<body><article id="a"><p>Usa <code>npm</code> para instalar todo.</p><code>suelto</code></article></body>',
    );
    const source = new DomArticleSource(doc);
    source.candidates();
    expect(source.extract('a')?.blocks.map((b) => b.text)).toEqual(['Usa npm para instalar todo.']);
  });
});
