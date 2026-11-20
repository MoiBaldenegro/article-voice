// DomArticleSource: adaptador DOM. Describe candidatos para ArticleDetector y extrae
// los bloques de lectura del artículo aplicando RN-02 (menús, scripts, publicidad...).
// Los BlockRef son opacos: apuntan al nodo mediante un WeakRef propio, así el dominio
// no retiene nodos del DOM.

import type { ArticleCandidate, BlockRef } from '../../../libs/reader/src/index.js';

export type BlockRole = 'heading' | 'paragraph' | 'list-item' | 'quote';

export interface ContentBlock {
  readonly ref: BlockRef;
  readonly role: BlockRole;
  readonly text: string;
}

export interface ExtractedArticle {
  readonly title?: string;
  /** Idioma declarado en `<html lang>` (sin normalizar). */
  readonly language?: string;
  readonly blocks: readonly ContentBlock[];
  readonly wordCount: number;
}

/** Etiquetas excluidas por RN-02 (más las que nunca llevan prosa legible). */
const EXCLUDED_TAGS: ReadonlySet<string> = new Set([
  'nav',
  'aside',
  'footer',
  'form',
  'button',
  'script',
  'style',
  'noscript',
  'template',
  'pre',
  'figcaption',
  'header',
  'iframe',
  'ins',
  'svg',
  'select',
  'textarea',
  'input',
  'object',
  'embed',
  'canvas',
]);

const EXCLUDED_ROLES: ReadonlySet<string> = new Set([
  'navigation',
  'complementary',
  'contentinfo',
  'banner',
  'search',
  'presentation',
]);

/** Fichas de `class`/`id` que delatan publicidad. */
const AD_TOKENS: ReadonlySet<string> = new Set([
  'ad',
  'ads',
  'advert',
  'adverts',
  'advertisement',
  'advertising',
  'adsbygoogle',
  'sponsor',
  'sponsored',
  'promo',
  'promoted',
  'banner',
]);

/** Elementos que cortan el texto en bloques distintos. */
const BLOCK_TAGS: ReadonlySet<string> = new Set([
  'address',
  'article',
  'blockquote',
  'body',
  'dd',
  'details',
  'div',
  'dl',
  'dt',
  'fieldset',
  'figure',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'hr',
  'li',
  'main',
  'ol',
  'p',
  'section',
  'summary',
  'table',
  'tbody',
  'td',
  'tfoot',
  'th',
  'thead',
  'tr',
  'ul',
]);

const CANDIDATE_SELECTOR = 'article, main, [role="main"], [itemprop="articleBody"], div, section';

interface RawBlock {
  readonly el: Element;
  readonly role: BlockRole;
  readonly text: string;
  readonly linkWords: number;
}

function countWords(text: string): number {
  const t = text.trim();
  return t === '' ? 0 : t.split(/\s+/).length;
}

function roleOf(tag: string, inherited: BlockRole): BlockRole {
  if (/^h[1-6]$/.test(tag)) return 'heading';
  if (tag === 'li') return 'list-item';
  if (tag === 'blockquote') return 'quote';
  return inherited;
}

export class DomArticleSource {
  private readonly refs = new Map<BlockRef, WeakRef<Element>>();
  private readonly refOf = new WeakMap<Element, BlockRef>();
  private readonly candidateEls = new Map<string, Element>();
  private nextRef = 1;
  private nextCandidate = 1;

  constructor(private readonly doc: Document) {}

  /** Candidatos descritos para `ArticleDetector` (palabras sin los excluidos por RN-02). */
  candidates(explicitId?: string): ArticleCandidate[] {
    this.candidateEls.clear();
    const out: ArticleCandidate[] = [];
    const els = Array.from(this.doc.querySelectorAll(CANDIDATE_SELECTOR));
    if (explicitId) {
      const explicit = this.doc.getElementById(explicitId);
      if (explicit && !els.includes(explicit)) els.push(explicit);
    }
    for (const el of els) {
      const excluded = this.isExcludedOrInside(el);
      const raw = excluded ? [] : this.collect(el);
      const wordCount = raw.reduce((n, b) => n + countWords(b.text), 0);
      const isExplicit = explicitId !== undefined && el.id === explicitId;
      if (wordCount === 0 && !isExplicit) continue;
      const id = el.id && !this.candidateEls.has(el.id) ? el.id : `av-c${this.nextCandidate++}`;
      this.candidateEls.set(id, el);
      out.push({
        id,
        tag: el.tagName.toLowerCase(),
        wordCount,
        linkWordCount: raw.reduce((n, b) => n + b.linkWords, 0),
        paragraphCount: raw.filter((b) => b.role === 'paragraph').length,
        isArticleBody: el.getAttribute('itemprop') === 'articleBody',
        excluded,
      });
    }
    return out;
  }

  /** Extrae los bloques legibles del candidato (llamar tras `candidates()`). */
  extract(candidateId: string): ExtractedArticle | undefined {
    const el = this.candidateEls.get(candidateId);
    if (!el) return undefined;
    const blocks: ContentBlock[] = this.collect(el).map((b) => ({
      ref: this.refFor(b.el),
      role: b.role,
      text: b.text,
    }));
    const heading = blocks.find((b) => b.role === 'heading');
    const title = heading?.text ?? (this.doc.title.trim() || undefined);
    const language = this.doc.documentElement.getAttribute('lang')?.trim() || undefined;
    return {
      ...(title !== undefined ? { title } : {}),
      ...(language !== undefined ? { language } : {}),
      blocks,
      wordCount: blocks.reduce((n, b) => n + countWords(b.text), 0),
    };
  }

  /** Vuelve al nodo de un bloque, o `undefined` si ya no está en el documento. */
  resolve(ref: BlockRef): Element | undefined {
    const el = this.refs.get(ref)?.deref();
    return el?.isConnected ? el : undefined;
  }

  private refFor(el: Element): BlockRef {
    const known = this.refOf.get(el);
    if (known) return known;
    const ref: BlockRef = `av-b${this.nextRef++}`;
    this.refOf.set(el, ref);
    this.refs.set(ref, new WeakRef(el));
    return ref;
  }

  /** RN-02 sobre un elemento (sin mirar a sus ancestros). */
  private isExcluded(el: Element): boolean {
    const tag = el.tagName.toLowerCase();
    if (EXCLUDED_TAGS.has(tag)) return true;
    // `code` en bloque: fuera de un texto corrido.
    if (tag === 'code' && !this.isTextBlock(el.parentElement)) return true;
    if (el.hasAttribute('hidden') || el.hasAttribute('data-av-skip')) return true;
    if (el.getAttribute('aria-hidden') === 'true') return true;
    const role = el.getAttribute('role');
    if (role && EXCLUDED_ROLES.has(role)) return true;
    if (this.looksLikeAd(el)) return true;
    return this.isInvisible(el);
  }

  private isTextBlock(el: Element | null): boolean {
    if (!el) return false;
    const tag = el.tagName.toLowerCase();
    return (
      tag === 'p' || tag === 'li' || tag === 'td' || tag === 'blockquote' || /^h[1-6]$/.test(tag)
    );
  }

  private looksLikeAd(el: Element): boolean {
    if (Array.from(el.attributes).some((a) => /^data-ad(-|$)/.test(a.name))) return true;
    const tokens = `${el.getAttribute('class') ?? ''} ${el.id}`.toLowerCase().split(/[^a-z0-9]+/);
    return tokens.some((t) => AD_TOKENS.has(t));
  }

  private isInvisible(el: Element): boolean {
    const view = this.doc.defaultView;
    if (!view) return false;
    try {
      const style = view.getComputedStyle(el);
      return (
        style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse'
      );
    } catch {
      return false;
    }
  }

  private isExcludedOrInside(el: Element): boolean {
    for (let cur: Element | null = el; cur; cur = cur.parentElement) {
      if (this.isExcluded(cur)) return true;
    }
    return false;
  }

  /** Bloques de lectura de `root` en orden de documento. */
  private collect(root: Element): RawBlock[] {
    const out: RawBlock[] = [];
    this.walk(root, 'paragraph', out);
    return out;
  }

  private walk(el: Element, inherited: BlockRole, out: RawBlock[]): void {
    const role = roleOf(el.tagName.toLowerCase(), inherited);
    let text = '';
    let linkWords = 0;

    const flush = (): void => {
      const clean = text.replace(/\s+/g, ' ').trim();
      if (clean !== '') {
        out.push({ el, role, text: clean, linkWords: Math.min(linkWords, countWords(clean)) });
      }
      text = '';
      linkWords = 0;
    };

    const inline = (node: Node, inLink: boolean): void => {
      if (node.nodeType === 3) {
        const t = node.textContent ?? '';
        text += t;
        if (inLink) linkWords += countWords(t);
        return;
      }
      if (node.nodeType !== 1) return;
      const child = node as Element;
      if (this.isExcluded(child)) return;
      const tag = child.tagName.toLowerCase();
      if (BLOCK_TAGS.has(tag)) {
        flush();
        this.walk(child, role === 'heading' || role === 'list-item' ? 'paragraph' : role, out);
        return;
      }
      if (tag === 'br') {
        text += ' ';
        return;
      }
      for (const c of Array.from(child.childNodes)) inline(c, inLink || tag === 'a');
    };

    for (const c of Array.from(el.childNodes)) inline(c, el.tagName.toLowerCase() === 'a');
    flush();
  }
}
