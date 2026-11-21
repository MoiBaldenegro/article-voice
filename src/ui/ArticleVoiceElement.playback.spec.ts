/**
 * @jest-environment jsdom
 */
import { ArticleVoiceElement } from './ArticleVoiceElement.js';

customElements.define('article-voice-full', class extends ArticleVoiceElement {});

type Listener = (i: number) => void;

class FakeAudio {
  enders = new Set<Listener>();
  rate = 1;
  enqueue(): void {}
  pause(): void {}
  resume(): void {}
  clear(): void {}
  setRate(r: number): void {
    this.rate = r;
  }
  onSegmentEnded(l: Listener): () => void {
    this.enders.add(l);
    return () => this.enders.delete(l);
  }
  onUnderrun(): () => void {
    return () => undefined;
  }
  close(): void {}
  finish(index: number): void {
    for (const l of [...this.enders]) l(index);
  }
}

function fakeEngine(voices = ['default', 'otra']) {
  return {
    kind: { value: 'moss-server' },
    prepare: async () => undefined,
    voices: () => voices.map((v) => ({ value: v })),
    async *synthesize() {
      yield { samples: new Float32Array(4), sampleRate: 24000 };
    },
    dispose: () => undefined,
  };
}

const PARAGRAPH = Array.from({ length: 10 }, (_, i) => `Palabra${i}`).join(' ') + '.';
const source = {
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
    title: 'Título',
    language: 'es',
    wordCount: 90,
    blocks: [1, 2, 3].map((n) => ({
      ref: `b${n}`,
      role: 'paragraph' as const,
      text: `${PARAGRAPH} Otra frase aquí.`,
    })),
  }),
};

const flush = async (): Promise<void> => {
  for (let i = 0; i < 200; i++) await Promise.resolve();
};

function full(attrs: Record<string, string> = {}, withSource = true) {
  const el = document.createElement('article-voice-full') as ArticleVoiceElement;
  const all = { 'server-url': 'https://tts.example.com/', 'min-words': '10', ...attrs };
  for (const [k, v] of Object.entries(all)) el.setAttribute(k, v);
  el.capabilities = {
    detect: async () => ({
      webgpu: false,
      wasmThreads: false,
      estimatedMemoryMb: undefined,
      speechSynthesis: true,
    }),
  };
  el.probe = async () => true;
  if (withSource) el.articleSource = source as never;
  const audio = new FakeAudio();
  const requests: unknown[] = [];
  el.createEngine = ((r: unknown) => {
    requests.push(r);
    return fakeEngine();
  }) as never;
  el.createAudioOutput = (() => audio) as never;
  const events: CustomEvent[] = [];
  for (const t of ['ready', 'statechange', 'segment', 'ended', 'error']) {
    el.addEventListener(`article-voice:${t}`, (e) => events.push(e as CustomEvent));
  }
  return { el, audio, requests, events };
}
const of = (events: CustomEvent[], type: string): CustomEvent[] =>
  events.filter((e) => e.type === `article-voice:${type}`);
const button = (el: HTMLElement, part: string): HTMLButtonElement =>
  el.shadowRoot?.querySelector(`button[part="${part}"]`) as HTMLButtonElement;

describe('<article-voice> atributos', () => {
  it('detecta el artículo y emite ready con el resumen', async () => {
    const { el, events } = full({ lang: 'es' });
    document.body.append(el);
    await el.ready;
    expect(of(events, 'ready')).toHaveLength(1);
    expect(el.article).toMatchObject({ title: 'Título', language: 'es', words: 3 * 13 });
    expect(el.article?.durationMs).toBeGreaterThan(0);
    expect(button(el, 'play').disabled).toBe(false);
    el.remove();
  });

  it('refleja atributos en propiedades y viceversa', () => {
    const { el } = full({ rate: '1.5', 'min-words': '50', 'no-highlight': '' });
    expect(el.rate).toBe(1.5);
    expect(el.minWords).toBe(50);
    expect(el.noHighlight).toBe(true);
    el.voice = 'ana';
    expect(el.getAttribute('voice')).toBe('ana');
    el.serverUrl = null;
    expect(el.hasAttribute('server-url')).toBe(false);
    el.rate = 2;
    expect(el.getAttribute('rate')).toBe('2');
    expect(el.engine).toBe('auto');
    expect(el.fallback).toBe('web-speech');
    expect(el.confirmDownload).toBe('always');
  });

  it('rate inválido emite AV_INVALID_OPTION y usa el valor por defecto', async () => {
    const { el, events } = full({ rate: '9' });
    document.body.append(el);
    await el.ready;
    expect(of(events, 'error')[0]?.detail.code).toBe('AV_INVALID_OPTION');
    expect(el.rate).toBe(1);
    el.remove();
  });

  it('min-words mayor que el artículo: error de artículo corto y botón deshabilitado', async () => {
    const { el, events } = full({ 'min-words': '5000' });
    document.body.append(el);
    await el.ready;
    expect(of(events, 'error')[0]?.detail.code).toBe('AV_ARTICLE_TOO_SHORT');
    expect(button(el, 'play').disabled).toBe(true);
    expect(el.article).toBeNull();
    el.remove();
  });
});

describe('<article-voice> reproducción', () => {
  it('play → playing → fin de segmentos → ended, con eventos en orden', async () => {
    const { el, audio, requests, events } = full({ voice: 'otra', rate: '1.25' });
    document.body.append(el);
    await el.ready;
    await el.play();
    await flush();
    expect(el.state).toBe('playing');
    expect(requests[0]).toMatchObject({
      kind: 'moss-server',
      serverUrl: 'https://tts.example.com/',
      language: 'es',
      rate: 1.25,
    });
    const total = el.progress.segments;
    expect(total).toBeGreaterThan(1);
    expect(button(el, 'pause').hidden).toBe(false);
    expect(button(el, 'play').hidden).toBe(true);

    for (let i = 0; i < total; i++) {
      audio.finish(i);
      await flush();
    }
    expect(el.state).toBe('ended');
    expect(of(events, 'statechange').map((e) => e.detail.state)).toEqual([
      'preparing',
      'playing',
      'ended',
    ]);
    expect(of(events, 'ended')).toHaveLength(1);
    expect(of(events, 'segment')).toHaveLength(total);
    el.remove();
  });

  it('pause / play (reanuda) / stop con los botones de la plantilla', async () => {
    const { el } = full();
    document.body.append(el);
    await el.ready;
    button(el, 'play').click();
    await flush();
    expect(el.state).toBe('playing');
    button(el, 'pause').click();
    expect(el.state).toBe('paused');
    expect(button(el, 'play').textContent).toBe('Reanudar');
    button(el, 'play').click();
    await flush();
    expect(el.state).toBe('playing');
    button(el, 'stop').click();
    expect(el.state).toBe('idle');
    el.remove();
  });

  it('next() y previous() mueven el cursor; sin narración no hacen nada', async () => {
    const { el, events } = full();
    document.body.append(el);
    await el.ready;
    expect(() => {
      el.pause();
      el.stop();
      el.next();
    }).not.toThrow();
    await el.play();
    await flush();
    el.next();
    expect(el.progress.segment).toBe(1);
    el.previous();
    expect(el.progress.segment).toBe(0);
    el.previous();
    expect(el.progress.segment).toBe(0);
    expect(of(events, 'segment').length).toBeGreaterThanOrEqual(3);
    el.remove();
  });

  it('play sin artículo rechaza con AV_ARTICLE_NOT_FOUND y emite error', async () => {
    const { el, events } = full({}, false);
    document.body.append(el);
    await el.ready;
    await expect(el.play()).rejects.toMatchObject({ code: 'AV_ARTICLE_NOT_FOUND' });
    expect(of(events, 'error').at(-1)?.detail.code).toBe('AV_ARTICLE_NOT_FOUND');
    expect(el.state).toBe('error');
    el.remove();
  });

  it('cambiar rate mientras suena actualiza la salida; refresh() vuelve a detectar', async () => {
    const { el, audio, events } = full();
    document.body.append(el);
    await el.ready;
    await el.play();
    await flush();
    el.rate = 1.5;
    expect(audio.rate).toBe(1.5);
    await el.refresh();
    expect(of(events, 'ready')).toHaveLength(2);
    el.remove();
  });
});

describe('<article-voice> resaltado', () => {
  function withHighlighter(attrs: Record<string, string> = {}) {
    const f = full(attrs);
    const calls: string[] = [];
    const spans: unknown[][] = [];
    f.el.highlighter = {
      highlight: (s) => {
        calls.push('highlight');
        spans.push([...s]);
      },
      clear: () => calls.push('clear'),
    };
    return { ...f, calls, spans };
  }

  it('resalta el segmento actual al sonar y lo mueve con cada segmento', async () => {
    const { el, audio, calls, spans } = withHighlighter();
    document.body.append(el);
    await el.ready;
    await el.play();
    await flush();
    expect(calls).toEqual(['highlight']);
    expect(spans[0]).toEqual([expect.objectContaining({ block: 'b1', start: 0 })]);
    audio.finish(0);
    await flush();
    expect(calls).toEqual(['highlight', 'highlight']);
    expect(spans[1]).not.toEqual(spans[0]);
    el.remove();
  });

  it('mantiene el resaltado en pausa y lo quita al detener o terminar', async () => {
    const { el, audio, calls } = withHighlighter();
    document.body.append(el);
    await el.ready;
    await el.play();
    await flush();
    el.pause();
    expect(calls).toEqual(['highlight']);
    await el.play();
    await flush();
    el.stop();
    await flush();
    expect(calls.at(-1)).toBe('clear');

    calls.length = 0;
    await el.play();
    await flush();
    for (let i = 0; i < el.progress.segments; i++) {
      audio.finish(i);
      await flush();
    }
    expect(el.state).toBe('ended');
    expect(calls.at(-1)).toBe('clear');
    el.remove();
  });

  it('con no-highlight no resalta; al activarlo en marcha limpia', async () => {
    const off = withHighlighter({ 'no-highlight': '' });
    document.body.append(off.el);
    await off.el.ready;
    await off.el.play();
    await flush();
    expect(off.calls).toEqual([]);
    off.el.remove();

    const on = withHighlighter();
    document.body.append(on.el);
    await on.el.ready;
    await on.el.play();
    await flush();
    on.el.noHighlight = true;
    expect(on.calls).toEqual(['highlight', 'clear']);
    on.el.noHighlight = false;
    expect(on.calls).toEqual(['highlight', 'clear', 'highlight']);
    on.el.remove();
  });

  it('sin highlighter inyectado funciona igual', async () => {
    const { el } = full();
    document.body.append(el);
    await el.ready;
    await el.play();
    await flush();
    expect(el.state).toBe('playing');
    el.remove();
  });
});
