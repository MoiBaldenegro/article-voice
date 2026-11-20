import { createTextSpan } from './Segment.js';
import { MAX_SEGMENT_CHARS, Segmenter, type SegmenterBlock } from './Segmenter.js';

const seg = new Segmenter();
const para = (ref: string, text: string): SegmenterBlock => ({ ref, role: 'paragraph', text });

function spanText(block: SegmenterBlock, start: number, end: number): string {
  return block.text.slice(start, end);
}

describe('createTextSpan', () => {
  it('acepta 0 ≤ start < end ≤ largo', () => {
    expect(createTextSpan('b1', 0, 5, 5)).toEqual({ block: 'b1', start: 0, end: 5 });
  });
  it.each([
    [-1, 3, 5],
    [3, 3, 5],
    [4, 3, 5],
    [0, 6, 5],
    [0.5, 3, 5],
  ])('rechaza (%s, %s) en bloque de %s', (s, e, len) => {
    expect(() => createTextSpan('b1', s, e, len)).toThrow(
      expect.objectContaining({ code: 'AV_INVALID_TEXT_SPAN' }),
    );
  });
});

describe('Segmenter', () => {
  it('"Hola. ¿Qué tal?" → 1 segmento', () => {
    const b = para('p1', 'Hola. ¿Qué tal?');
    const out = seg.segment([b], 'es');
    expect(out).toHaveLength(1);
    expect(out[0]?.text).toBe('Hola. ¿Qué tal?');
    expect(out[0]?.index).toBe(0);
  });

  it('cada título es un segmento propio y los índices son consecutivos', () => {
    const blocks: SegmenterBlock[] = [
      { ref: 'h1', role: 'heading', text: 'Título' },
      para('p1', 'Primer párrafo.'),
      para('p2', 'Segundo párrafo.'),
    ];
    const out = seg.segment(blocks, 'es');
    expect(out.map((s) => s.index)).toEqual([0, 1, 2]);
    expect(out.map((s) => s.spans[0]?.block)).toEqual(['h1', 'p1', 'p2']);
  });

  it('el span apunta al texto ORIGINAL aunque la normalización cambie el texto', () => {
    const b = para('p1', 'El 3,5 % de 1.200 personas');
    const [s] = seg.segment([b], 'es');
    expect(s?.text).toBe('El tres coma cinco por ciento de mil doscientas personas');
    const span = s?.spans[0];
    expect(span).toBeDefined();
    expect(spanText(b, span?.start ?? 0, span?.end ?? 0)).toBe('El 3,5 % de 1.200 personas');
  });

  it('CA-3: párrafo de ~900 caracteres con cinco oraciones → ninguno supera 300 y sin cortar palabras', () => {
    const sentence = `Palabra ${'palabra '.repeat(23).trim()}.`; // ~168 caracteres
    const longSentence = `Otra ${'otra '.repeat(29).trim()}.`;
    const b = para('p1', [sentence, sentence, sentence, longSentence, sentence].join(' '));
    expect(b.text.length).toBeGreaterThan(800);
    const out = seg.segment([b], 'es');
    expect(out.length).toBeGreaterThan(2);
    for (const s of out) {
      expect(s.text.length).toBeLessThanOrEqual(MAX_SEGMENT_CHARS);
      expect(s.text.length).toBeGreaterThan(0);
      const span = s.spans[0];
      const original = spanText(b, span?.start ?? 0, span?.end ?? 0);
      // Cortes en final de oración: cada segmento termina en punto y empieza en palabra completa.
      expect(original.endsWith('.')).toBe(true);
      expect(original).toBe(original.trim());
    }
  });

  it('una oración larga corta en coma o punto y coma', () => {
    const clause = `${'dato '.repeat(20).trim()}`; // 99 caracteres
    const text = `${clause}, ${clause}; ${clause}, ${clause}.`;
    const b = para('p1', text);
    const out = seg.segment([b], 'es');
    expect(out.length).toBeGreaterThan(1);
    for (const s of out) {
      expect(s.text.length).toBeLessThanOrEqual(MAX_SEGMENT_CHARS);
      const span = s.spans[0];
      expect(/[,;.]$/.test(spanText(b, span?.start ?? 0, span?.end ?? 0))).toBe(true);
    }
  });

  it('sin puntuación: corta entre palabras, nunca dentro de una', () => {
    const words = Array.from({ length: 150 }, (_, i) => `palabra${i}`);
    const b = para('p1', words.join(' '));
    const out = seg.segment([b], 'es');
    expect(out.length).toBeGreaterThan(1);
    const rebuilt: string[] = [];
    for (const s of out) {
      expect(s.text.length).toBeLessThanOrEqual(MAX_SEGMENT_CHARS);
      rebuilt.push(...s.text.split(' '));
    }
    expect(rebuilt).toEqual(words);
  });

  it('no corta tras abreviaturas ni números decimales', () => {
    const b = para('p1', `Dr. López mide 1.75 m. ${'x '.repeat(160)}fin.`);
    const out = seg.segment([b], 'en');
    expect(out[0]?.text.startsWith('doctor López')).toBe(true);
  });

  it('los spans de segmentos consecutivos del mismo bloque no se solapan', () => {
    const sentence = `Palabra ${'palabra '.repeat(29).trim()}.`;
    const b = para('p1', Array.from({ length: 6 }, () => sentence).join(' '));
    const out = seg.segment([b], 'es');
    for (let i = 1; i < out.length; i += 1) {
      expect(out[i]?.spans[0]?.start).toBeGreaterThanOrEqual(out[i - 1]?.spans[0]?.end ?? 0);
    }
  });

  it('una palabra imposible de partir se corta en trozos de ≤ 300', () => {
    const b = para('p1', 'a'.repeat(700));
    const out = seg.segment([b], 'es');
    expect(out).toHaveLength(3);
    for (const s of out) expect(s.text.length).toBeLessThanOrEqual(MAX_SEGMENT_CHARS);
  });

  it('ignora bloques vacíos o solo con emojis', () => {
    const out = seg.segment([para('p1', '   '), para('p2', '😀😀'), para('p3', 'Hola.')], 'es');
    expect(out).toHaveLength(1);
    expect(out[0]?.spans[0]?.block).toBe('p3');
  });
});
