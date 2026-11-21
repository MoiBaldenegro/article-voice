import { ArticleVoiceElement } from '../../src/ui/ArticleVoiceElement.js';

customElements.define('article-voice', ArticleVoiceElement);

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

const audio = () => ({
  enqueue() {},
  pause() {},
  resume() {},
  clear() {},
  setRate() {},
  onSegmentEnded: () => () => undefined,
  onUnderrun: () => () => undefined,
  close() {},
});

function setup(id: string, language: string, serverUp: boolean, failEngine = false) {
  const el = document.createElement('article-voice') as ArticleVoiceElement;
  el.id = id;
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
  el.probe = async () => serverUp;
  el.articleSource = sourceFor(language) as never;
  el.createEngine = (() => ({
    kind: { value: 'moss-server' },
    prepare: async () => {
      if (failEngine) throw new Error('boom');
    },
    voices: () => [{ value: 'default' }],
    async *synthesize() {
      yield { samples: new Float32Array(4), sampleRate: 24000 };
    },
    dispose: () => undefined,
  })) as never;
  el.createAudioOutput = audio as never;
  document.getElementById('host')?.append(el);
  return el;
}

(window as unknown as { __ready: Promise<unknown> }).__ready = Promise.all([
  setup('es', 'es', true),
  setup('en', 'en', true),
  setup('fb', 'en', false),
]).then((els) => Promise.all(els.map((e) => e.ready)));
