import { DomainError, InvalidStateTransitionError } from '../domain/exceptions/errors.js';
import { Narration } from '../domain/Narration.js';
import type { AudioChunk, SpeechEngine } from '../domain/outbound/SpeechEngine.port.js';
import { InMemoryAudioOutput } from '../domain/outbound/testing/InMemoryAudioOutput.js';
import { InMemorySpeechEngine } from '../domain/outbound/testing/InMemorySpeechEngine.js';
import { PlaybackRate } from '../domain/value-objects/PlaybackRate.js';
import { VoiceId } from '../domain/value-objects/VoiceId.js';
import { NarrationRegistry } from './NarrationRegistry.js';
import {
  PauseNarration,
  PlayNarration,
  ResumeNarration,
  SeekNarration,
  StopNarration,
} from './narration.use-cases.js';

const seg = (index: number) => ({
  index,
  text: `Frase ${index}.`,
  spans: [{ block: 'b', start: 0, end: 5 }],
});
const make = (id = 'n1', count = 5, rate?: PlaybackRate): Narration =>
  new Narration({
    id,
    segments: Array.from({ length: count }, (_, i) => seg(i)),
    voice: VoiceId.of('default'),
    ...(rate ? { rate } : {}),
  });

const flush = async (): Promise<void> => {
  for (let i = 0; i < 200; i++) await Promise.resolve();
};

function setup(engine: SpeechEngine = new InMemorySpeechEngine()) {
  const registry = new NarrationRegistry();
  const audio = new InMemoryAudioOutput();
  return {
    registry,
    audio,
    engine,
    play: new PlayNarration(registry, engine, audio),
    pause: new PauseNarration(registry),
    resume: new ResumeNarration(registry),
    stop: new StopNarration(registry),
    seek: new SeekNarration(registry),
  };
}

const segmentsQueued = (a: InMemoryAudioOutput): number[] => [
  ...new Set(a.queued.map((q) => q.segmentIndex)),
];

describe('PlayNarration', () => {
  it('prepara el motor, pasa a playing y sintetiza solo la ventana de lookahead', async () => {
    const s = setup();
    const n = make('n1', 5, PlaybackRate.of(1.5));
    await s.play.execute(n);
    await flush();
    expect(n.state).toBe('playing');
    expect(s.audio.rate).toBe(1.5);
    expect(segmentsQueued(s.audio)).toEqual([0, 1, 2]);
    expect(s.audio.queued.filter((q) => q.last).map((q) => q.segmentIndex)).toEqual([0, 1, 2]);
  });

  it('avanza el cursor y sintetiza más al terminar cada segmento; tras el último queda stopped', async () => {
    const s = setup();
    const n = make('n1', 4);
    await s.play.execute(n);
    await flush();
    s.audio.finishSegment(0);
    await flush();
    expect(n.cursor).toBe(1);
    expect(segmentsQueued(s.audio)).toContain(3);
    s.audio.finishSegment(1);
    s.audio.finishSegment(2);
    s.audio.finishSegment(3);
    await flush();
    expect(n.state).toBe('stopped');
    expect(s.registry.active).toBeUndefined();
  });

  it('una sola narración activa: reproducir otra detiene la anterior', async () => {
    const s = setup();
    const a = make('a');
    const b = make('b');
    await s.play.execute(a);
    await s.play.execute(b);
    expect(a.state).toBe('stopped');
    expect(b.state).toBe('playing');
    expect(s.registry.active?.narration).toBe(b);
  });

  it('un fallo de síntesis lleva a error con el código AV_ del motor y libera el registro', async () => {
    class Failing extends InMemorySpeechEngine {
      override async *synthesize(): AsyncIterable<AudioChunk> {
        yield* [];
        throw new (class extends DomainError {})('AV_SYNTHESIS_FAILED', 'boom', {
          recoverable: true,
        });
      }
    }
    const s = setup(new Failing());
    const n = make();
    await s.play.execute(n);
    await flush();
    expect(n.state).toBe('error');
    expect(n.errorCode).toBe('AV_SYNTHESIS_FAILED');
    expect(s.registry.active).toBeUndefined();
  });

  it('si prepare() falla: error, se propaga y el registro queda libre', async () => {
    class BadPrepare extends InMemorySpeechEngine {
      override async prepare(): Promise<void> {
        throw new (class extends DomainError {})('AV_ENGINE_INIT_FAILED', 'no init');
      }
    }
    const s = setup(new BadPrepare());
    const n = make();
    await expect(s.play.execute(n)).rejects.toMatchObject({ code: 'AV_ENGINE_INIT_FAILED' });
    expect(n.state).toBe('error');
    expect(n.errorCode).toBe('AV_ENGINE_INIT_FAILED');
    expect(s.registry.active).toBeUndefined();
  });

  it('un fallo sin código usa AV_SYNTHESIS_FAILED', async () => {
    class Plain extends InMemorySpeechEngine {
      override async *synthesize(): AsyncIterable<AudioChunk> {
        yield* [];
        throw new Error('raro');
      }
    }
    const s = setup(new Plain());
    const n = make();
    await s.play.execute(n);
    await flush();
    expect(n.errorCode).toBe('AV_SYNTHESIS_FAILED');
  });

  it('stop durante preparing no llega a reproducir', async () => {
    let release: () => void = () => undefined;
    class Slow extends InMemorySpeechEngine {
      override prepare(): Promise<void> {
        return new Promise((r) => (release = r));
      }
    }
    const s = setup(new Slow());
    const n = make();
    const p = s.play.execute(n);
    expect(n.state).toBe('preparing');
    s.stop.execute();
    release();
    await p;
    expect(n.state).toBe('stopped');
    expect(s.audio.queued).toHaveLength(0);
  });
});

describe('Pause / Resume / Stop', () => {
  it('pause y resume actualizan narración y salida', async () => {
    const s = setup();
    const n = make();
    await s.play.execute(n);
    s.pause.execute();
    expect(n.state).toBe('paused');
    expect(s.audio.paused).toBe(true);
    s.resume.execute();
    expect(n.state).toBe('playing');
    expect(s.audio.paused).toBe(false);
  });

  it('stop descarta el audio, libera el registro y permite otra narración', async () => {
    const s = setup();
    const n = make();
    await s.play.execute(n);
    await flush();
    s.stop.execute();
    expect(n.state).toBe('stopped');
    expect(s.audio.queued).toHaveLength(0);
    expect(s.registry.active).toBeUndefined();
    await flush();
    expect(s.audio.queued).toHaveLength(0);
  });

  it('resume sin pausa lanza AV_INVALID_NARRATION_TRANSITION', async () => {
    const s = setup();
    await s.play.execute(make());
    expect(() => s.resume.execute()).toThrow(InvalidStateTransitionError);
    expect(() => s.resume.execute()).toThrow(
      expect.objectContaining({ code: 'AV_INVALID_NARRATION_TRANSITION' }),
    );
  });

  it('sin narración activa los controles lanzan error AV_', () => {
    const s = setup();
    for (const c of [s.pause, s.resume, s.stop]) {
      expect(() => c.execute()).toThrow(
        expect.objectContaining({ code: 'AV_INVALID_NARRATION_TRANSITION' }),
      );
    }
    expect(() => s.seek.execute(0)).toThrow(Error);
  });
});

describe('SeekNarration', () => {
  it('salta: limpia lo encolado y sintetiza desde el nuevo segmento', async () => {
    const s = setup();
    const n = make('n1', 8);
    await s.play.execute(n);
    await flush();
    s.seek.execute(5);
    await flush();
    expect(n.cursor).toBe(5);
    expect(n.state).toBe('playing');
    expect(segmentsQueued(s.audio)).toEqual([5, 6, 7]);
  });

  it('también funciona en pausa y mantiene el estado', async () => {
    const s = setup();
    const n = make('n1', 8);
    await s.play.execute(n);
    s.pause.execute();
    s.seek.execute(3);
    await flush();
    expect(n.state).toBe('paused');
    expect(n.cursor).toBe(3);
  });

  it('un índice fuera de rango lanza AV_INVALID_OPTION y no altera nada', async () => {
    const s = setup();
    const n = make('n1', 3);
    await s.play.execute(n);
    expect(() => s.seek.execute(9)).toThrow(expect.objectContaining({ code: 'AV_INVALID_OPTION' }));
    expect(n.cursor).toBe(0);
  });

  it('ignora el fin de un segmento anterior tras saltar', async () => {
    const s = setup();
    const n = make('n1', 8);
    await s.play.execute(n);
    await flush();
    s.seek.execute(4);
    await flush();
    s.audio.finishSegment(0);
    expect(n.cursor).toBe(4);
  });
});
