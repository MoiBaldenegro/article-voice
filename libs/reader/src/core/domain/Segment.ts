import { DomainValidationError } from './exceptions/errors.js';

/** Referencia opaca a un bloque del artículo (la define el adaptador, T-012). */
export type BlockRef = string;

/** Rango `[start, end)` del texto original de un bloque, para resaltarlo. */
export interface TextSpan {
  readonly block: BlockRef;
  readonly start: number;
  readonly end: number;
}

/** Valida `0 ≤ start < end ≤ blockLength` (modelo de datos). */
export function createTextSpan(
  block: BlockRef,
  start: number,
  end: number,
  blockLength: number,
): TextSpan {
  const ok =
    Number.isInteger(start) &&
    Number.isInteger(end) &&
    start >= 0 &&
    start < end &&
    end <= blockLength;
  if (!ok) {
    throw new DomainValidationError('AV_INVALID_TEXT_SPAN', 'Rango de texto inválido', {
      details: { block, start, end, blockLength },
    });
  }
  return { block, start, end };
}

/** Fragmento de texto normalizado que se sintetiza de una vez (RN-05). */
export interface Segment {
  readonly index: number;
  /** Texto normalizado, 1–300 caracteres. */
  readonly text: string;
  /** De dónde sale en el texto original. */
  readonly spans: readonly TextSpan[];
}
