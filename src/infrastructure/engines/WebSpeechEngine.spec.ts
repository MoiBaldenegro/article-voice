import { VoiceId, type AudioChunk } from '../../../libs/reader/src/core-api.js';
import { speechEngineContract } from '../../../libs/reader/src/core/domain/outbound/testing/contracts.js';
import {
  WebSpeechEngine,
  type SpeechSynthesisLike,
  type SystemVoice,
  type UtteranceLike,
} from './WebSpeechEngine.js';

const VOICES: SystemVoice[] = [
  { name: 'Sabina', voiceURI: 'sabina', lang: 'es-MX' },
  { name: 'Zira', voiceURI: 'zira', lang: 'en-US' },
];

class FakeSynthesis implements SpeechSynthesisLike {
  spoken: UtteranceLike[] = [];
  cancelled = 0;
  autoEnd: 'end' | 'error' | 'none' = 'end';
  errorCode = 'synthesis-failed';
  private listeners: (() => void)[] = [];
  constructor(public voices: SystemVoice[] = VOICES) {}
  getVoices(): SystemVoice[] {
    return this.voices;
  }
  speak(u: UtteranceLike): void {
    this.spoken.push(u);
    if (this.autoEnd === 'end') queueMicrotask(() => u.onend?.());
    if (this.autoEnd === 'error') queueMicrotask(() => u.onerror?.({ error: this.errorCode }));
  }
  cancel(): void {
    this.cancelled++;
  }
  addEventListener(_t: 'voiceschanged', l: () => void): void {
    this.listeners.push(l);
  }
  removeEventListener(_t: 'voiceschanged', l: () => void): void {
    this.listeners = this.listeners.filter((x) => x !== l);
  }
  fireVoicesChanged(): void {
    [...this.listeners].forEach((l) => l());
  }
}

const utterance = (text: string): UtteranceLike => ({
  text,
  lang: '',
  rate: 1,
  voice: null,
  onend: null,
  onerror: null,
});
const make = (synthesis: SpeechSynthesisLike | undefined, extra = {}): WebSpeechEngine =>
  new WebSpeechEngine({ synthesis, createUtterance: utterance, ...extra });

speechEngineContract('WebSpeechEngine', () => make(new FakeSynthesis()));

describe('WebSpeechEngine', () => {
  it('kind es web-speech', () => {
    expect(make(new FakeSynthesis()).kind.value).toBe('web-speech');
  });

  it('habla el texto con la voz e idioma elegidos y entrega un fragmento al terminar', async () => {
    const s = new FakeSynthesis();
    const e = make(s, { rate: 1.2 });
    await e.prepare();
    const chunks: AudioChunk[] = [];
    for await (const c of e.synthesize('Hola.', e.voices()[0] as VoiceId)) chunks.push(c);
    expect(chunks).toHaveLength(1);
    expect(s.spoken[0]).toMatchObject({ text: 'Hola.', lang: 'es-MX', rate: 1.2 });
    expect(s.spoken[0]?.voice?.name).toBe('Sabina');
  });

  it('los ids de voz son válidos y únicos aunque se repitan nombres', async () => {
    const e = make(new FakeSynthesis([VOICES[0] as SystemVoice, VOICES[0] as SystemVoice]));
    await e.prepare();
    const ids = e.voices().map((v) => v.value);
    expect(new Set(ids).size).toBe(2);
  });

  it('prioriza las voces del idioma indicado', async () => {
    const e = make(new FakeSynthesis(), { language: 'en' });
    await e.prepare();
    expect(e.voices()).toHaveLength(1);
  });

  it('sin speechSynthesis → AV_ENGINE_UNAVAILABLE', async () => {
    await expect(make(undefined).prepare()).rejects.toMatchObject({
      code: 'AV_ENGINE_UNAVAILABLE',
    });
  });

  it('espera a voiceschanged si no hay voces al inicio', async () => {
    const s = new FakeSynthesis([]);
    const e = make(s);
    const p = e.prepare();
    s.voices = VOICES;
    s.fireVoicesChanged();
    await p;
    expect(e.voices().length).toBe(2);
  });

  it('sin voces tras la espera → AV_ENGINE_UNAVAILABLE', async () => {
    const e = make(new FakeSynthesis([]), { voicesTimeoutMs: 5 });
    await expect(e.prepare()).rejects.toMatchObject({ code: 'AV_ENGINE_UNAVAILABLE' });
  });

  it('abortar mientras habla cancela la voz y rechaza con AV_ABORTED', async () => {
    const s = new FakeSynthesis();
    s.autoEnd = 'none';
    const e = make(s);
    await e.prepare();
    const ac = new AbortController();
    const run = (async (): Promise<void> => {
      for await (const _ of e.synthesize('Hola.', e.voices()[0] as VoiceId, ac.signal)) void _;
    })();
    ac.abort();
    await expect(run).rejects.toMatchObject({ code: 'AV_ABORTED' });
    expect(s.cancelled).toBe(1);
  });

  it('un error de la voz → AV_SYNTHESIS_FAILED; "interrupted" → AV_ABORTED', async () => {
    const s = new FakeSynthesis();
    s.autoEnd = 'error';
    const e = make(s);
    await e.prepare();
    const run = async (): Promise<void> => {
      for await (const _ of e.synthesize('x', e.voices()[0] as VoiceId)) void _;
    };
    await expect(run()).rejects.toMatchObject({ code: 'AV_SYNTHESIS_FAILED' });
    s.errorCode = 'interrupted';
    await expect(run()).rejects.toMatchObject({ code: 'AV_ABORTED' });
  });

  it('dispose cancela la voz en curso', async () => {
    const s = new FakeSynthesis();
    const e = make(s);
    await e.prepare();
    e.dispose();
    expect(s.cancelled).toBe(1);
  });
});
