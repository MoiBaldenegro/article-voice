import { WebAudioOutput } from '../../src/infrastructure/audio/WebAudioOutput.js';

/** Seno sintético de `seconds` s a `rate` Hz. */
function sine(seconds: number, rate: number): Float32Array {
  const s = new Float32Array(Math.round(seconds * rate));
  for (let i = 0; i < s.length; i++) s[i] = 0.2 * Math.sin((2 * Math.PI * 440 * i) / rate);
  return s;
}

/**
 * Reproduce `segments` segmentos de 0,4 s, cada uno en fragmentos de 0,1 s a 24 kHz,
 * entregados por adelantado (streaming sin cortes) o con un hueco (`gapMs`) a mitad.
 */
async function play(segments: number, gapMs: number) {
  const out = new WebAudioOutput();
  await out.whenReady();
  const ended: number[] = [];
  out.onSegmentEnded((i) => ended.push(i));
  const done = new Promise<void>((resolve) => {
    out.onSegmentEnded((i) => i === segments - 1 && resolve());
  });
  const chunk = () => ({ samples: sine(0.1, 24000), sampleRate: 24000 });
  for (let s = 0; s < segments; s++) {
    for (let c = 0; c < 4; c++) {
      if (gapMs > 0 && s === 0 && c === 2) await new Promise((r) => setTimeout(r, gapMs));
      out.enqueue(s, chunk(), c === 3);
    }
  }
  await Promise.race([done, new Promise((r) => setTimeout(r, 8000))]);
  const result = { ended, underruns: out.underruns, sampleRate: 0 };
  out.close();
  return result;
}

(window as unknown as { play: typeof play }).play = play;
