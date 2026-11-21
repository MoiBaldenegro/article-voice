/**
 * @jest-environment jsdom
 */
import { ArticleVoiceElement, type MediaSessionLike } from './ArticleVoiceElement.js';

customElements.define('article-voice-ms', class extends ArticleVoiceElement {});

class FakeAudio {
  enqueue(): void {}
  pause(): void {}
  resume(): void {}
  clear(): void {}
  setRate(): void {}
  onSegmentEnded(): () => void {
    return () => undefined;
  }
  onUnderrun(): () => void {
    return () => undefined;
  }
  close(): void {}
}

const engine = {
  kind: { value: 'moss-server' },
  prepare: async () => undefined,
  voices: () => [{ value: 'default' }],
  async *synthesize() {
    yield { samples: new Float32Array(4), sampleRate: 24000 };
  },
  dispose: () => undefined,
};

const text = Array.from({ length: 10 }, (_, i) => `Palabra${i}`).join(' ') + '. Otra frase aquí.';
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
    title: 'Mi artículo',
    language: 'es',
    wordCount: 90,
    blocks: [1, 2, 3].map((n) => ({ ref: `b${n}`, role: 'paragraph' as const, text })),
  }),
};

const flush = async (): Promise<void> => {
  for (let i = 0; i < 200; i++) await Promise.resolve();
};

function fakeSession() {
  const handlers = new Map<string, (() => void) | null>();
  const session: MediaSessionLike = {
    metadata: null,
    playbackState: 'none',
    setActionHandler: (a, h) => void handlers.set(a, h),
  };
  return { session, handlers };
}

function make(session: MediaSessionLike | null) {
  const el = document.createElement('article-voice-ms') as ArticleVoiceElement;
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
  el.probe = async () => true;
  el.articleSource = source as never;
  el.createEngine = (() => engine) as never;
  el.createAudioOutput = (() => new FakeAudio()) as never;
  el.mediaSession = session;
  return el;
}

describe('<article-voice> Media Session', () => {
  beforeEach(() => {
    (globalThis as Record<string, unknown>)['MediaMetadata'] = class {
      constructor(public init: { title: string; artist: string }) {}
    };
  });
  afterEach(() => {
    delete (globalThis as Record<string, unknown>)['MediaMetadata'];
  });

  it('publica metadatos con el título del artículo y los handlers al sonar', async () => {
    const { session, handlers } = fakeSession();
    const el = make(session);
    document.body.append(el);
    await el.ready;
    await el.play();
    await flush();
    expect(el.state).toBe('playing');
    expect((session.metadata as { init: { title: string } }).init.title).toBe('Mi artículo');
    expect(session.playbackState).toBe('playing');
    for (const a of ['play', 'pause', 'stop', 'previoustrack', 'nexttrack']) {
      expect(typeof handlers.get(a)).toBe('function');
    }
    el.remove();
  });

  it('los handlers controlan el elemento y se liberan al detener', async () => {
    const { session, handlers } = fakeSession();
    const el = make(session);
    document.body.append(el);
    await el.ready;
    await el.play();
    await flush();
    handlers.get('pause')?.();
    expect(el.state).toBe('paused');
    expect(session.playbackState).toBe('paused');
    handlers.get('play')?.();
    await flush();
    expect(el.state).toBe('playing');
    handlers.get('stop')?.();
    await flush();
    expect(el.state).toBe('idle');
    expect(session.metadata).toBeNull();
    expect(session.playbackState).toBe('none');
    expect(handlers.get('play')).toBeNull();
    el.remove();
  });

  it('sin Media Session no falla', async () => {
    const el = make(null);
    document.body.append(el);
    await el.ready;
    await el.play();
    await flush();
    expect(el.state).toBe('playing');
    el.remove();
  });
});
