// Resaltado del segmento en lectura con la CSS Custom Highlight API (HU-12, RF-19).
// No toca el DOM del artículo: solo registra `Range`s en `CSS.highlights` y añade una hoja de
// estilos con `::highlight()`. Sin soporte del navegador no hace nada (respaldo sin resaltado).

import type { SegmentHighlighter, TextSpan } from '../../../libs/reader/src/core-api.js';

export const HIGHLIGHT_NAME = 'article-voice';
/** Segundos sin que el visitante haga scroll antes de seguir la lectura (HU-12 CA-2). */
export const SCROLL_IDLE_MS = 5000;

/** Lo que el adaptador necesita de la fuente del artículo. */
export interface RangeResolver {
  rangeOf(span: TextSpan): Range | undefined;
}

interface HighlightRegistry {
  set(name: string, highlight: unknown): unknown;
  get(name: string): unknown;
  delete(name: string): boolean;
}

type HighlightCtor = new (...ranges: Range[]) => unknown;

export class HighlightApiHighlighter implements SegmentHighlighter {
  #current: unknown;
  #lastUserScroll = Number.NEGATIVE_INFINITY;
  #styled = false;

  constructor(
    private readonly resolver: RangeResolver,
    private readonly doc: Document = document,
    private readonly now: () => number = () => Date.now(),
  ) {
    const win = doc.defaultView;
    if (win && this.#registry() !== undefined) {
      const mark = (): void => {
        this.#lastUserScroll = this.now();
      };
      for (const type of ['wheel', 'touchmove', 'keydown'])
        win.addEventListener(type, mark, { passive: true });
    }
  }

  /** `true` si el navegador soporta la Highlight API. */
  get supported(): boolean {
    return this.#registry() !== undefined && this.#ctor() !== undefined;
  }

  highlight(spans: readonly TextSpan[]): void {
    const registry = this.#registry();
    const Ctor = this.#ctor();
    if (!registry || !Ctor) return;
    const ranges = spans.flatMap((s) => this.resolver.rangeOf(s) ?? []);
    if (ranges.length === 0) {
      this.clear();
      return;
    }
    this.#ensureStyle();
    this.#current = new Ctor(...ranges);
    registry.set(HIGHLIGHT_NAME, this.#current);
    this.#follow(ranges[0]);
  }

  clear(): void {
    const registry = this.#registry();
    if (registry && this.#current !== undefined && registry.get(HIGHLIGHT_NAME) === this.#current) {
      registry.delete(HIGHLIGHT_NAME);
    }
    this.#current = undefined;
  }

  #registry(): HighlightRegistry | undefined {
    const css = (this.doc.defaultView as unknown as { CSS?: { highlights?: HighlightRegistry } })
      ?.CSS;
    return css?.highlights;
  }

  #ctor(): HighlightCtor | undefined {
    return (this.doc.defaultView as unknown as { Highlight?: HighlightCtor } | null)?.Highlight;
  }

  #ensureStyle(): void {
    if (this.#styled) return;
    this.#styled = true;
    const css = `::highlight(${HIGHLIGHT_NAME}){background-color:var(--av-highlight,#ffe08a);color:inherit;}`;
    const win = this.doc.defaultView as unknown as { CSSStyleSheet?: typeof CSSStyleSheet };
    const sheet = win?.CSSStyleSheet ? new win.CSSStyleSheet() : undefined;
    if (sheet && 'replaceSync' in sheet && 'adoptedStyleSheets' in this.doc) {
      sheet.replaceSync(css);
      this.doc.adoptedStyleSheets = [...this.doc.adoptedStyleSheets, sheet];
      return;
    }
    const style = this.doc.createElement('style');
    style.setAttribute('data-article-voice-highlight', '');
    style.textContent = css;
    this.doc.head.appendChild(style);
  }

  /** Mantiene el segmento a la vista salvo que el visitante haya hecho scroll hace poco. */
  #follow(range: Range | undefined): void {
    const win = this.doc.defaultView;
    if (!range || !win || this.now() - this.#lastUserScroll < SCROLL_IDLE_MS) return;
    const rect = range.getBoundingClientRect?.();
    if (!rect) return;
    if (rect.height === 0 && rect.width === 0) return;
    if (rect.top >= 0 && rect.bottom <= win.innerHeight) return;
    const reduced = win.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
    win.scrollTo({
      top: win.scrollY + rect.top - win.innerHeight / 3,
      behavior: reduced ? 'auto' : 'smooth',
    });
  }
}
