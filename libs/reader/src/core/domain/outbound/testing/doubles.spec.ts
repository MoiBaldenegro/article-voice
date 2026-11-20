import {
  audioOutputContract,
  deviceCapabilitiesContract,
  modelStoreContract,
  speechEngineContract,
} from './contracts.js';
import {
  InMemoryAudioOutput,
  InMemoryModelStore,
  InMemorySpeechEngine,
  StaticDeviceCapabilities,
} from './index.js';

speechEngineContract('InMemorySpeechEngine', () => new InMemorySpeechEngine());
audioOutputContract('InMemoryAudioOutput', () => new InMemoryAudioOutput());
modelStoreContract('InMemoryModelStore', () => new InMemoryModelStore());
deviceCapabilitiesContract('StaticDeviceCapabilities', () => new StaticDeviceCapabilities());
deviceCapabilitiesContract(
  'StaticDeviceCapabilities con valores',
  () => new StaticDeviceCapabilities({ webgpu: true, estimatedMemoryMb: 8192 }),
);

describe('InMemoryAudioOutput', () => {
  const chunk = { samples: new Float32Array(2), sampleRate: 24000 };

  it('finishSegment notifica y consume lo encolado', () => {
    const o = new InMemoryAudioOutput();
    const ended: number[] = [];
    o.onSegmentEnded((i) => ended.push(i));
    o.enqueue(0, chunk, false);
    o.enqueue(0, chunk, true);
    o.finishSegment(0);
    expect(ended).toEqual([0]);
    expect(o.queued).toHaveLength(0);
  });

  it('en pausa no termina segmentos; drain emite underrun', () => {
    const o = new InMemoryAudioOutput();
    const ended: number[] = [];
    let underruns = 0;
    o.onSegmentEnded((i) => ended.push(i));
    o.onUnderrun(() => (underruns += 1));
    o.enqueue(1, chunk, true);
    o.pause();
    o.finishSegment(1);
    expect(ended).toEqual([]);
    o.drain();
    expect(underruns).toBe(1);
  });
});
