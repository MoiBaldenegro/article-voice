// Segmenter (RN-05): dominio puro. Un segmento tiene como máximo 300 caracteres
// normalizados, corta en final de oración si puede, si no en coma o punto y coma,
// y nunca dentro de una palabra. Un bloque (p. ej. un título) nunca comparte
// segmento con otro. Cada segmento conserva el rango del texto ORIGINAL (TextSpan).

import { type BlockRef, type Segment, createTextSpan } from './Segment.js';
import { TextNormalizer } from './TextNormalizer.js';
import type { LanguageCode } from './value-objects/Language.js';

export const MAX_SEGMENT_CHARS = 300;

export interface SegmenterBlock {
  readonly ref: BlockRef;
  readonly role: 'heading' | 'paragraph' | 'list-item' | 'quote';
  readonly text: string;
}

interface Piece {
  readonly start: number;
  readonly end: number;
  readonly text: string;
}

interface Range {
  readonly start: number;
  readonly end: number;
}

/** Abreviaturas (en minúsculas, sin punto) tras las que un punto no cierra oración. */
const ABBREVIATIONS: ReadonlySet<string> = new Set([
  'dr',
  'dra',
  'sr',
  'sra',
  'srta',
  'prof',
  'mr',
  'mrs',
  'ms',
  'vs',
  'ud',
  'uds',
  'aprox',
  'approx',
  'pág',
  'págs',
  'núm',
  'ej',
  'no',
]);

function trimRange(text: string, start: number, end: number): Range | null {
  let s = start;
  let e = end;
  while (s < e && /\s/.test(text.charAt(s))) s += 1;
  while (e > s && /\s/.test(text.charAt(e - 1))) e -= 1;
  return s < e ? { start: s, end: e } : null;
}

function rangesFromCuts(text: string, base: Range, cuts: readonly number[]): Range[] {
  const out: Range[] = [];
  let from = base.start;
  for (const cut of [...cuts, base.end]) {
    const r = trimRange(text, from, cut);
    if (r) out.push(r);
    from = cut;
  }
  return out;
}

function sentenceRanges(text: string, base: Range): Range[] {
  const slice = text.slice(base.start, base.end);
  const cuts: number[] = [];
  for (const m of slice.matchAll(/\n+/g)) cuts.push(base.start + m.index + m[0].length);
  for (const m of slice.matchAll(/[.!?…]+["'”’»)\]]*(?=\s|$)/g)) {
    const endIdx = m.index + m[0].length;
    if (endIdx >= slice.length) continue;
    if (m[0] === '.') {
      const prev = /([\p{L}.]+)$/u.exec(slice.slice(0, m.index))?.[1]?.toLowerCase() ?? '';
      if (ABBREVIATIONS.has(prev) || /^\p{L}$/u.test(prev) || prev.includes('.')) continue;
    }
    if (m[0].startsWith('.') && /^\s*\p{Ll}/u.test(slice.slice(endIdx))) continue;
    cuts.push(base.start + endIdx);
  }
  cuts.sort((a, b) => a - b);
  return rangesFromCuts(text, base, cuts);
}

function clauseRanges(text: string, base: Range): Range[] {
  const slice = text.slice(base.start, base.end);
  const cuts: number[] = [];
  for (const m of slice.matchAll(/[,;](?=\s)/g)) cuts.push(base.start + m.index + 1);
  return rangesFromCuts(text, base, cuts);
}

function wordRanges(text: string, base: Range): Range[] {
  const out: Range[] = [];
  for (const m of text.slice(base.start, base.end).matchAll(/\S+/g)) {
    out.push({ start: base.start + m.index, end: base.start + m.index + m[0].length });
  }
  return out;
}

export class Segmenter {
  constructor(private readonly normalizer: TextNormalizer = new TextNormalizer()) {}

  segment(blocks: readonly SegmenterBlock[], lang: LanguageCode): Segment[] {
    const segments: Segment[] = [];
    for (const block of blocks) {
      const whole = trimRange(block.text, 0, block.text.length);
      if (!whole) continue;
      for (const piece of this.cut(block.text, whole, lang, 0)) {
        segments.push({
          index: segments.length,
          text: piece.text,
          spans: [createTextSpan(block.ref, piece.start, piece.end, block.text.length)],
        });
      }
    }
    return segments;
  }

  private norm(text: string, range: Range, lang: LanguageCode): string {
    return this.normalizer.normalize(text.slice(range.start, range.end), lang);
  }

  /** Divide `range` en piezas de ≤ MAX_SEGMENT_CHARS, bajando de nivel solo si hace falta. */
  private cut(text: string, range: Range, lang: LanguageCode, level: number): Piece[] {
    const normalized = this.norm(text, range, lang);
    if (normalized === '') return [];
    if (normalized.length <= MAX_SEGMENT_CHARS) return [{ ...range, text: normalized }];
    if (level >= 3) return this.hardCut(text, range, lang);

    const splitter = [sentenceRanges, clauseRanges, wordRanges][level] as typeof sentenceRanges;
    const subs = splitter(text, range);
    if (subs.length <= 1) return this.cut(text, range, lang, level + 1);

    const pieces = subs.flatMap((sub) => this.cut(text, sub, lang, level + 1));
    return this.merge(text, pieces, lang);
  }

  /** Une piezas contiguas mientras el texto normalizado resultante quepa. */
  private merge(text: string, pieces: readonly Piece[], lang: LanguageCode): Piece[] {
    const out: Piece[] = [];
    for (const piece of pieces) {
      const last = out[out.length - 1];
      if (last) {
        const range = { start: last.start, end: piece.end };
        const joined = this.norm(text, range, lang);
        if (joined.length <= MAX_SEGMENT_CHARS) {
          out[out.length - 1] = { ...range, text: joined };
          continue;
        }
      }
      out.push(piece);
    }
    return out;
  }

  /** Palabra única más larga que el límite: único caso donde se corta dentro de ella. */
  private hardCut(text: string, range: Range, lang: LanguageCode): Piece[] {
    const out: Piece[] = [];
    for (let s = range.start; s < range.end; s += MAX_SEGMENT_CHARS) {
      const r = { start: s, end: Math.min(s + MAX_SEGMENT_CHARS, range.end) };
      const t = this.norm(text, r, lang).slice(0, MAX_SEGMENT_CHARS).trim();
      if (t) out.push({ ...r, text: t });
    }
    return out;
  }
}
