import type { AudioOutput } from '../AudioOutput.port.js';
import type { DeviceCapabilities } from '../DeviceCapabilities.port.js';
import type { ModelStore } from '../ModelStore.port.js';
import type { AudioChunk, SpeechEngine } from '../SpeechEngine.port.js';
import { VoiceId } from '../../value-objects/VoiceId.js';

// Suites de contrato: cualquier implementación real de un puerto debe pasarlas.
// Se invocan desde un `*.spec.ts` (jest aporta describe/it/expect como globales).

const chunk = (n = 4): AudioChunk => ({ samples: new Float32Array(n), sampleRate: 24000 });

export function speechEngineContract(name: string, create: () => SpeechEngine): void {
  describe(`contrato SpeechEngine: ${name}`, () => {
    it('prepare es idempotente', async () => {
      const e = create();
      await e.prepare();
      await expect(e.prepare()).resolves.toBeUndefined();
    });

    it('prepare con señal ya cancelada rechaza con AV_ABORTED', async () => {
      const ac = new AbortController();
      ac.abort();
      await expect(create().prepare(ac.signal)).rejects.toMatchObject({ code: 'AV_ABORTED' });
    });

    it('voices exige prepare y luego devuelve al menos una voz', async () => {
      const e = create();
      expect(() => e.voices()).toThrow();
      await e.prepare();
      expect(e.voices().length).toBeGreaterThan(0);
    });

    it('synthesize entrega fragmentos PCM válidos', async () => {
      const e = create();
      await e.prepare();
      const chunks: AudioChunk[] = [];
      for await (const c of e.synthesize('Hola mundo.', e.voices()[0] as VoiceId)) chunks.push(c);
      expect(chunks.length).toBeGreaterThan(0);
      for (const c of chunks) {
        expect(c.samples).toBeInstanceOf(Float32Array);
        expect(c.sampleRate).toBeGreaterThan(0);
      }
    });

    it('synthesize cancelado rechaza con AV_ABORTED', async () => {
      const e = create();
      await e.prepare();
      const ac = new AbortController();
      ac.abort();
      const run = async (): Promise<void> => {
        for await (const _ of e.synthesize('Hola.', e.voices()[0] as VoiceId, ac.signal)) void _;
      };
      await expect(run()).rejects.toMatchObject({ code: 'AV_ABORTED' });
    });

    it('tras dispose ya no sintetiza', async () => {
      const e = create();
      await e.prepare();
      const voice = e.voices()[0] as VoiceId;
      e.dispose();
      const run = async (): Promise<void> => {
        for await (const _ of e.synthesize('Hola.', voice)) void _;
      };
      await expect(run()).rejects.toBeDefined();
    });
  });
}

export function audioOutputContract(name: string, create: () => AudioOutput): void {
  describe(`contrato AudioOutput: ${name}`, () => {
    it('acepta enqueue, pause, resume, clear y setRate sin lanzar', () => {
      const o = create();
      o.enqueue(0, chunk(), true);
      o.pause();
      o.resume();
      o.setRate(1.25);
      o.clear();
      o.close();
    });

    it('onSegmentEnded y onUnderrun devuelven una función de baja idempotente', () => {
      const o = create();
      const off1 = o.onSegmentEnded(() => undefined);
      const off2 = o.onUnderrun(() => undefined);
      expect(() => {
        off1();
        off1();
        off2();
        off2();
      }).not.toThrow();
    });

    it('close es idempotente y enqueue posterior no lanza', () => {
      const o = create();
      o.close();
      expect(() => {
        o.close();
        o.enqueue(0, chunk(), true);
      }).not.toThrow();
    });
  });
}

export function modelStoreContract(name: string, create: () => ModelStore): void {
  describe(`contrato ModelStore: ${name}`, () => {
    it('read de una clave ausente es undefined y has es false', async () => {
      const s = create();
      expect(await s.has('a')).toBe(false);
      expect(await s.read('a')).toBeUndefined();
    });

    it('write/read devuelven los mismos bytes y no comparten memoria', async () => {
      const s = create();
      const bytes = new Uint8Array([1, 2, 3]);
      await s.write('a', bytes);
      bytes[0] = 9;
      const back = await s.read('a');
      expect(Array.from(back ?? [])).toEqual([1, 2, 3]);
      expect(await s.has('a')).toBe(true);
    });

    it('write sobrescribe y size suma los bytes', async () => {
      const s = create();
      await s.write('a', new Uint8Array(3));
      await s.write('b', new Uint8Array(5));
      await s.write('a', new Uint8Array(2));
      expect(await s.size()).toBe(7);
      expect(await s.keys()).toEqual(['a', 'b']);
    });

    it('delete quita la clave y es idempotente', async () => {
      const s = create();
      await s.write('a', new Uint8Array(1));
      await s.delete('a');
      await s.delete('a');
      expect(await s.has('a')).toBe(false);
      expect(await s.size()).toBe(0);
    });
  });
}

export function deviceCapabilitiesContract(name: string, create: () => DeviceCapabilities): void {
  describe(`contrato DeviceCapabilities: ${name}`, () => {
    it('detect devuelve booleanos y memoria numérica o indefinida', async () => {
      const c = await create().detect();
      expect(typeof c.webgpu).toBe('boolean');
      expect(typeof c.wasmThreads).toBe('boolean');
      expect(typeof c.speechSynthesis).toBe('boolean');
      expect(['number', 'undefined']).toContain(typeof c.estimatedMemoryMb);
    });
  });
}
