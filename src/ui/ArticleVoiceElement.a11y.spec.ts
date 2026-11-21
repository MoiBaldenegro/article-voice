/**
 * @jest-environment jsdom
 */
import { ArticleVoiceElement } from './ArticleVoiceElement.js';
import { messagesFor, resolveUiLanguage } from './i18n/index.js';

customElements.define('article-voice-a11y', class extends ArticleVoiceElement {});

class FakeAudio {
  enders = new Set<(i: number) => void>();
  enqueue(): void {}
  pause(): void {}
  resume(): void {}
  clear(): void {}
  setRate(): void {}
  onSegmentEnded(l: (i: number) => void): () => void {
    this.enders.add(l);
    return () => this.enders.delete(l);
  }
  onUnderrun(): () => void {
    return () => undefined;
  }
  close(): void {}
}

const engine = (fail = false) => ({
  kind: { value: 'moss-server' },
  prepare: async () => {
    if (fail) throw Object.assign(new Error('boom'), { code: 'AV_ENGINE_INIT_FAILED' });
  },
  voices: () => [{ value: 'default' }],
  async *synthesize() {
    yield { samples: new Float32Array(4), sampleRate: 24000 };
  },
  dispose: () => undefined,
});

const WORDS = Array.from({ length: 10 }, (_, i) => `Word${i}`).join(' ') + '.';
const sourceFor = (language: string) => ({
  candidates: () => [
    {
      id: 'post',
      tag: 'article',
      wordCount: 90,
      linkWordCount: 0,
      paragraphCount: 3,
      isArticleBody: false,
      excluded: false,
    },
  ],
  extract: () => ({
    title: 'T',
    language,
    wordCount: 90,
    blocks: [1, 2, 3].map((n) => ({ ref: `b${n}`, role: 'paragraph' as const, text: WORDS })),
  }),
});

const flush = async (): Promise<void> => {
  for (let i = 0; i < 200; i++) await Promise.resolve();
};

function make(language: string, opts: { serverUp?: boolean; failEngine?: boolean } = {}) {
  const el = document.createElement('article-voice-a11y') as ArticleVoiceElement;
  el.setAttribute('server-url', 'https://tts.example.com/');
  el.setAttribute('min-words', '10');
  el.capabilities = {
    detect: async () => ({
      webgpu: false,
      wasmThreads: false,
      estimatedMemoryMb: undefined,
      speechSynthesis: true,
    }),
  };
  el.probe = async () => opts.serverUp ?? true;
  el.articleSource = sourceFor(language) as never;
  el.createEngine = (() => engine(opts.failEngine)) as never;
  el.createAudioOutput = (() => new FakeAudio()) as never;
  document.body.append(el);
  return el;
}

const q = <T extends Element>(el: HTMLElement, sel: string): T =>
  el.shadowRoot?.querySelector(sel) as T;

describe('<article-voice> i18n', () => {
  it('resuelve el idioma de la interfaz', () => {
    expect(resolveUiLanguage('es-MX')).toBe('es');
    expect(resolveUiLanguage('en-GB')).toBe('en');
    expect(resolveUiLanguage('fr')).toBe('en');
    expect(resolveUiLanguage(undefined, '', null)).toBe('es');
    expect(resolveUiLanguage(undefined, 'en')).toBe('en');
  });

  it('los diccionarios tienen las mismas claves', () => {
    const es = messagesFor('es');
    const en = messagesFor('en');
    expect(Object.keys(es.state)).toEqual(Object.keys(en.state));
    expect(Object.keys(es.errors)).toEqual(Object.keys(en.errors));
    expect(es.progress(1, 2)).not.toBe(en.progress(1, 2));
  });

  it('artículo en español → etiquetas en español', async () => {
    const el = make('es');
    await el.ready;
    expect(q<HTMLButtonElement>(el, '[part="play"]').textContent).toBe('Escuchar');
    expect(q(el, '[part="controls"]').getAttribute('aria-label')).toBe('Escuchar este artículo');
    el.remove();
  });

  it('artículo en inglés → etiquetas en inglés (HU-14 CA-2)', async () => {
    const el = make('en');
    await el.ready;
    expect(q<HTMLButtonElement>(el, '[part="play"]').textContent).toBe('Listen');
    expect(q<HTMLButtonElement>(el, '[part="pause"]').textContent).toBe('Pause');
    expect(q<HTMLButtonElement>(el, '[part="stop"]').textContent).toBe('Stop');
    expect(q(el, '[part="controls"]').getAttribute('aria-label')).toBe('Listen to this article');
    el.remove();
  });

  it('aviso de motor de respaldo en cada idioma', async () => {
    const en = make('en', { serverUp: false });
    await en.ready;
    expect(q(en, '[part="meta"]').textContent).toBe('Using the system voice');
    expect(q<HTMLElement>(en, '[part="meta"]').hidden).toBe(false);
    en.remove();
    const es = make('es', { serverUp: false });
    await es.ready;
    expect(q(es, '[part="meta"]').textContent).toBe('Se usa la voz del sistema');
    es.remove();
  });
});

describe('<article-voice> accesibilidad', () => {
  it('estructura aria: grupo etiquetado, botones nativos y región en vivo polite', async () => {
    const el = make('es');
    await el.ready;
    expect(q(el, '[part="controls"]').getAttribute('role')).toBe('group');
    for (const part of ['play', 'pause', 'stop']) {
      const b = q<HTMLButtonElement>(el, `button[part="${part}"]`);
      expect(b.type).toBe('button');
      expect((b.textContent ?? '').length).toBeGreaterThan(0);
    }
    const live = q(el, '[role="status"]');
    expect(live.getAttribute('aria-live')).toBe('polite');
    expect(live.getAttribute('aria-atomic')).toBe('true');
    expect(q(el, '[part="root"]').getAttribute('aria-busy')).toBe('false');
    el.remove();
  });

  it('anuncia playing y paused y no anuncia idle/preparing', async () => {
    const el = make('en');
    await el.ready;
    const live = q(el, '[role="status"]');
    expect(live.textContent).toBe('');
    const p = el.play();
    await Promise.resolve();
    expect(live.textContent).toBe('');
    await p;
    await flush();
    expect(el.state).toBe('playing');
    expect(live.textContent).toBe('Playing');
    el.pause();
    expect(live.textContent).toBe('Paused');
    expect(q<HTMLButtonElement>(el, '[part="play"]').textContent).toBe('Resume');
    el.stop();
    expect(live.textContent).toBe('');
    el.remove();
  });

  it('estado error: mensaje visible por código y anuncio', async () => {
    const el = make('en', { failEngine: true });
    await el.ready;
    await expect(el.play()).rejects.toBeDefined();
    expect(el.state).toBe('error');
    const err = q<HTMLElement>(el, '[part="error"]');
    expect(err.hidden).toBe(false);
    expect(err.textContent).toBe('The narration could not be played');
    expect(q(el, '[role="status"]').textContent).toBe(err.textContent);
    expect(q(el, '[part="root"]').getAttribute('data-state')).toBe('error');
    el.remove();
  });

  it('data-state y botones visibles según el estado', async () => {
    const el = make('es');
    await el.ready;
    const root = q<HTMLElement>(el, '[part="root"]');
    expect(root.dataset['state']).toBe('idle');
    expect(q<HTMLElement>(el, '[part="pause"]').hidden).toBe(true);
    await el.play();
    await flush();
    expect(root.dataset['state']).toBe('playing');
    expect(q<HTMLElement>(el, '[part="play"]').hidden).toBe(true);
    expect(q<HTMLElement>(el, '[part="pause"]').hidden).toBe(false);
    el.pause();
    expect(root.dataset['state']).toBe('paused');
    el.remove();
  });
});
