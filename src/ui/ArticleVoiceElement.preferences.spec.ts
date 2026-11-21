/**
 * @jest-environment jsdom
 */
import { ArticleVoiceElement } from './ArticleVoiceElement.js';
import { PREFERENCES_KEY, localStoragePreferences, parsePreferences } from './preferences.js';

customElements.define('article-voice-prefs', class extends ArticleVoiceElement {});

class FakeAudio {
  rate = 1;
  enqueue(): void {}
  pause(): void {}
  resume(): void {}
  clear(): void {}
  setRate(r: number): void {
    this.rate = r;
  }
  onSegmentEnded(): () => void {
    return () => undefined;
  }
  onUnderrun(): () => void {
    return () => undefined;
  }
  close(): void {}
}

const engine = () => ({
  kind: { value: 'moss-server' },
  prepare: async () => undefined,
  voices: () => [{ value: 'default' }, { value: 'otra' }],
  async *synthesize() {
    yield { samples: new Float32Array(4), sampleRate: 24000 };
  },
  dispose: () => undefined,
});

const para = Array.from({ length: 10 }, (_, i) => `Palabra${i}`).join(' ') + '.';
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
    title: 'T',
    language: 'es',
    wordCount: 90,
    blocks: [1, 2, 3].map((n) => ({ ref: `b${n}`, role: 'paragraph' as const, text: para })),
  }),
};

function make(attrs: Record<string, string> = {}) {
  const el = document.createElement('article-voice-prefs') as ArticleVoiceElement;
  for (const [k, v] of Object.entries({
    'server-url': 'https://tts.example.com/',
    'min-words': '10',
    ...attrs,
  }))
    el.setAttribute(k, v);
  el.capabilities = {
    detect: async () => ({
      webgpu: false,
      wasmThreads: false,
      estimatedMemoryMb: undefined,
      speechSynthesis: true,
    }),
  };
  el.probe = async () => true;
  el.articleSource = source as never;
  const audio = new FakeAudio();
  const requests: Array<{ rate: number }> = [];
  el.createEngine = ((r: { rate: number }) => {
    requests.push(r);
    return engine();
  }) as never;
  el.createAudioOutput = (() => audio) as never;
  return { el, audio, requests };
}
const sel = (el: HTMLElement, part: string): HTMLSelectElement =>
  el.shadowRoot?.querySelector(`select[part="${part}"]`) as HTMLSelectElement;
const choose = (s: HTMLSelectElement, v: string): void => {
  s.value = v;
  s.dispatchEvent(new Event('change'));
};

beforeEach(() => localStorage.clear());

describe('preferencias de velocidad y voz', () => {
  it('cambiar la velocidad aplica en reproducción y se guarda', async () => {
    const { el, audio } = make();
    document.body.append(el);
    await el.ready;
    await el.play();
    choose(sel(el, 'speed'), '1.5');
    expect(audio.rate).toBe(1.5);
    expect(JSON.parse(localStorage.getItem(PREFERENCES_KEY) ?? '{}')).toEqual({ rate: 1.5 });
    el.remove();
  });

  it('restaura la velocidad al recargar y manda sobre el atributo', async () => {
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify({ rate: 1.75 }));
    const { el, requests } = make({ rate: '1' });
    document.body.append(el);
    await el.ready;
    expect(sel(el, 'speed').value).toBe('1.75');
    await el.play();
    expect(requests[0]?.rate).toBe(1.75);
    el.remove();
  });

  it('muestra la voz tras preparar el motor, la guarda y la restaura', async () => {
    const first = make();
    document.body.append(first.el);
    await first.el.ready;
    expect(first.el.shadowRoot?.querySelector('[part="voice-label"]')?.hasAttribute('hidden')).toBe(
      true,
    );
    await first.el.play();
    const voice = sel(first.el, 'voice');
    expect(voice.options).toHaveLength(2);
    choose(voice, 'otra');
    expect(JSON.parse(localStorage.getItem(PREFERENCES_KEY) ?? '{}')).toEqual({ voice: 'otra' });
    first.el.remove();

    const second = make();
    document.body.append(second.el);
    await second.el.ready;
    await second.el.play();
    expect(sel(second.el, 'voice').value).toBe('otra');
    second.el.remove();
  });

  it('un cambio posterior del atributo rate manda sobre lo recordado', async () => {
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify({ rate: 2 }));
    const { el } = make();
    document.body.append(el);
    await el.ready;
    el.setAttribute('rate', '0.75');
    expect(sel(el, 'speed').value).toBe('0.75');
    el.remove();
  });

  it('etiquetas en es y en', async () => {
    const es = make({ lang: 'es' });
    document.body.append(es.el);
    expect(es.el.shadowRoot?.querySelector('[part="speed-label"] span')?.textContent).toBe(
      'Velocidad',
    );
    es.el.remove();
    const en = make({ lang: 'en' });
    document.body.append(en.el);
    expect(en.el.shadowRoot?.querySelector('[part="speed-label"] span')?.textContent).toBe('Speed');
    en.el.remove();
  });

  it('ignora preferencias corruptas o fuera de rango', async () => {
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify({ rate: 9 }));
    const { el } = make();
    document.body.append(el);
    await el.ready;
    expect(sel(el, 'speed').value).toBe('1');
    el.remove();
    expect(parsePreferences('{no json')).toEqual({});
    expect(parsePreferences('[1]')).toEqual({});
    expect(parsePreferences('{"rate":"x","voice":3}')).toEqual({});
  });

  it('tolera localStorage que lanza', () => {
    const get = jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied');
    });
    const set = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    expect(localStoragePreferences.load()).toEqual({});
    expect(() => localStoragePreferences.save({ rate: 1.5 })).not.toThrow();
    get.mockRestore();
    set.mockRestore();
  });
});
