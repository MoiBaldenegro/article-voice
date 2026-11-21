import type { TextSpan } from '../Segment.js';

/** Puerto de salida: marca en la página el texto del segmento en lectura (HU-12). */
export interface SegmentHighlighter {
  /** Resalta los rangos (reemplaza el resaltado anterior). Sin soporte: no hace nada. */
  highlight(spans: readonly TextSpan[]): void;
  /** Quita el resaltado propio. */
  clear(): void;
}
