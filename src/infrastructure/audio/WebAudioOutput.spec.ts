import { audioOutputContract } from '../../../libs/reader/src/core/domain/outbound/testing/contracts.js';
import { WebAudioOutput, resample } from './WebAudioOutput.js';
import { PLAYBACK_PROCESSOR_NAME, PLAYBACK_PROCESSOR_SOURCE } from './playbackProcessorSource.js';

type Msg = { type: string; [k: string]: unknown };

/** Procesador real (evaluado desde su texto) con las globales del worklet simuladas. */
function loadProcessor() {
  class FakeProcessor {
    port: {
      onmessage: ((e: { data: Msg }) => void) | null;
      posted: Msg[];
      postMessage(m: Msg): void;
    } = {
      onmessage: null,
      posted: [],
      postMessage(m: Msg) {
        this.posted.push(m);
      },
    };
  }
  let Ctor:
    (new () => FakeProcessor & { process(i: unknown, o: Float32Array[][]): boolean }) | undefined;
  new Function('AudioWorkletProcessor', 'registerProcessor', PLAYBACK_PROCESSOR_SOURCE)(
    FakeProcessor,
    (name: string, c: typeof Ctor) => {
      expect(name).toBe(PLAYBACK_PROCESSOR_NAME);
      Ctor = c;
    },
  );
  const p = new Ctor!();
  return {
    send: (m: Msg) => p.port.onmessage!({ data: m }),
    run: (frames: number): Float32Array => {
      const out = new Float32Array(frames);
      p.process([], [[out]]);
      return out;
    },
    posted: p.port.posted,
  };
}

const samples = (...v: number[]) => new Float32Array(v);

describe('playbackProcessor', () => {
  it('reproduce las muestras y avisa el fin del segmento al consumir el último fragmento', () => {
    const p = loadProcessor();
    p.send({ type: 'chunk', segmentIndex: 3, samples: samples(0.1, 0.2), last: false });
    p.send({ type: 'chunk', segmentIndex: 3, samples: samples(0.3, 0.4), last: true });
    expect(Array.from(p.run(5)).map((x) => +x.toFixed(2))).toEqual([0.1, 0.2, 0.3, 0.4, 0]);
    expect(p.posted).toEqual([{ type: 'ended', segmentIndex: 3 }]);
  });

  it('cuenta un underrun por corte a mitad de segmento, no al terminar un segmento', () => {
    const p = loadProcessor();
    p.send({ type: 'chunk', segmentIndex: 0, samples: samples(1, 1), last: false });
    p.run(10);
    p.run(10);
    expect(p.posted.filter((m) => m.type === 'underrun')).toHaveLength(1);
    p.send({ type: 'chunk', segmentIndex: 0, samples: samples(1), last: false });
    p.run(4);
    expect(p.posted.filter((m) => m.type === 'underrun')).toHaveLength(2);
    const q = loadProcessor();
    q.send({ type: 'chunk', segmentIndex: 0, samples: samples(1, 1), last: true });
    q.run(20);
    expect(q.posted.filter((m) => m.type === 'underrun')).toHaveLength(0);
  });

  it('pausa sin consumir ni reportar underrun; clear descarta y no reporta', () => {
    const p = loadProcessor();
    p.send({ type: 'chunk', segmentIndex: 0, samples: samples(0.5, 0.5, 0.5), last: false });
    p.run(1);
    p.send({ type: 'pause' });
    expect(Array.from(p.run(3))).toEqual([0, 0, 0]);
    p.send({ type: 'resume' });
    expect(Array.from(p.run(2))).toEqual([0.5, 0.5]);
    p.send({ type: 'clear' });
    p.run(5);
    expect(p.posted).toEqual([]);
  });

  it('rate 2 consume el doble de rápido', () => {
    const p = loadProcessor();
    p.send({ type: 'rate', rate: 2 });
    p.send({ type: 'chunk', segmentIndex: 0, samples: samples(0, 1, 2, 3), last: true });
    expect(Array.from(p.run(3))).toEqual([0, 2, 0]);
    expect(p.posted).toHaveLength(1);
  });
});

describe('resample', () => {
  it('es copia si no cambia la tasa y escala la longitud si cambia', () => {
    const a = samples(1, 2, 3);
    const same = resample(a, 24000, 24000);
    expect(same).not.toBe(a);
    expect(Array.from(same)).toEqual([1, 2, 3]);
    expect(resample(samples(0, 1), 24000, 48000)).toHaveLength(4);
  });
});

class FakePort {
  onmessage: ((e: { data: Msg }) => void) | null = null;
  sent: Msg[] = [];
  postMessage(m: Msg): void {
    this.sent.push(m);
  }
}

function fakeEnv() {
  const port = new FakePort();
  const ctx = {
    sampleRate: 48000,
    state: 'suspended',
    destination: {},
    audioWorklet: { addModule: jest.fn(() => Promise.resolve()) },
    resume: jest.fn(() => Promise.resolve()),
    close: jest.fn(() => Promise.resolve()),
  };
  const node = { port, connect: jest.fn(), disconnect: jest.fn() };
  const out = new WebAudioOutput({
    createContext: () => ctx as unknown as AudioContext,
    createNode: () => node as unknown as AudioWorkletNode,
  });
  return { out, ctx, node, port };
}

beforeAll(() => {
  Object.assign(URL, { createObjectURL: () => 'blob:x', revokeObjectURL: () => undefined });
});

audioOutputContract('WebAudioOutput', () => fakeEnv().out);

describe('WebAudioOutput', () => {
  it('guarda lo encolado hasta cargar el worklet y lo envía remuestreado', async () => {
    const { out, port, ctx } = fakeEnv();
    out.enqueue(0, { samples: samples(0, 1), sampleRate: 24000 }, true);
    expect(port.sent).toEqual([]);
    await out.whenReady();
    expect(port.sent).toHaveLength(1);
    expect((port.sent[0]!.samples as Float32Array).length).toBe(4);
    expect(ctx.resume).toHaveBeenCalled();
  });

  it('reenvía ended y underrun, y cuenta los underruns', async () => {
    const { out, port } = fakeEnv();
    await out.whenReady();
    const ended: number[] = [];
    let under = 0;
    out.onSegmentEnded((i) => ended.push(i));
    out.onUnderrun(() => under++);
    port.onmessage!({ data: { type: 'ended', segmentIndex: 2 } });
    port.onmessage!({ data: { type: 'underrun' } });
    expect(ended).toEqual([2]);
    expect(under).toBe(1);
    expect(out.underruns).toBe(1);
  });

  it('pause/resume/rate/clear llegan al worklet y close libera el contexto', async () => {
    const { out, port, ctx, node } = fakeEnv();
    await out.whenReady();
    out.pause();
    out.resume();
    out.setRate(1.5);
    out.clear();
    expect(port.sent.map((m) => m.type)).toEqual(['pause', 'resume', 'rate', 'clear']);
    out.close();
    expect(node.disconnect).toHaveBeenCalled();
    expect(ctx.close).toHaveBeenCalled();
  });
});
