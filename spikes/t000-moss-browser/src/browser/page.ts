/**
 * Spike T-000 · página de medición. Reproduce lo que llega del worker con Web Audio,
 * encadenando fragmentos sin huecos, y cuenta los vacíos de búfer (underruns).
 */

interface BenchConfig {
  backend: 'webgpu' | 'wasm' | 'webnn';
  threads: number;
  gpuKvCache: boolean;
  segments: string[];
  voice: string;
  replayDraws?: number[][];
  codecPolicy: string;
  play: boolean;
  variant?: 'official' | 'q4';
  capture?: boolean;
}

const log = (m: string) => {
  const el = document.getElementById('log')!;
  el.textContent += m + '\n';
};

async function runBench(cfg: BenchConfig): Promise<unknown> {
  const worker = new Worker('/dist/worker.js', { type: 'module' });
  const wait = <T>(pred: (d: any) => boolean) =>
    new Promise<T>((resolve, reject) => {
      const h = (e: MessageEvent) => {
        if (e.data.type === 'error') reject(new Error(e.data.message));
        else if (pred(e.data)) {
          worker.removeEventListener('message', h);
          resolve(e.data as T);
        }
      };
      worker.addEventListener('message', h);
    });

  const viaWorker = cfg.codecPolicy.endsWith(':worker');
  let codecWorker: Worker | null = null;
  const codecDone = new Map<number, number>();
  let lastChunkAt = 0;
  let firstChunkAtPage = -1;
  worker.postMessage({ type: 'init', backend: cfg.backend, threads: viaWorker ? Math.max(1, cfg.threads - 1) : cfg.threads, modelBase: '/models/', gpuKvCache: cfg.gpuKvCache, variant: cfg.variant, only: viaWorker ? ['prefill', 'decode', 'local_fixed'] : undefined });
  if (viaWorker) {
    codecWorker = new Worker('/dist/worker.js', { type: 'module' });
    // El códec va en su propio worker (otro runtime de ORT) para solaparse con la generación.
    codecWorker.postMessage({ type: 'init', backend: 'wasm', threads: 1, modelBase: '/models/', gpuKvCache: false, variant: cfg.variant, only: ['codec_step'] });
    await new Promise<void>((res, rej) => {
      codecWorker!.onmessage = (e) => (e.data.type === 'ready' ? res() : e.data.type === 'error' && rej(new Error(e.data.message)));
    });
    const ch = new MessageChannel();
    worker.postMessage({ type: 'port', role: 'tts' }, [ch.port1]);
    codecWorker.postMessage({ type: 'port', role: 'codec' }, [ch.port2]);
    codecWorker.addEventListener('message', (e) => {
      if (e.data.type === 'chunk') {
        lastChunkAt = performance.now();
        if (firstChunkAtPage < 0) firstChunkAtPage = lastChunkAt;
        handle(e);
      } else if (e.data.type === 'codec-end') codecDone.set(e.data.segment, e.data.codecMs);
    });
  }
  const ready: any = await wait((d) => d.type === 'ready');
  log(`listo en ${ready.initMs} ms (${cfg.backend}, hilos=${cfg.threads}, aislado=${ready.crossOriginIsolated})`);

  const ctx = new AudioContext({ sampleRate: 48000 });
  await ctx.resume();
  let nextTime = 0;
  let underruns = 0;
  let underrunGapS = 0;
  let firstPlayed = -1;
  const segments: any[] = [];
  const captured: Float32Array[][] = [];
  const parity: { segment: number; frames: number[][] }[] = [];

  const handle = (e: MessageEvent) => {
    const d = e.data;
    if (d.type === 'chunk' && cfg.capture) captured.push(d.channels);
    if (d.type === 'chunk' && cfg.play) {
      const ch: Float32Array[] = d.channels;
      const buf = ctx.createBuffer(ch.length, ch[0]!.length, 48000);
      ch.forEach((c, i) => buf.copyToChannel(c, i));
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      const t = ctx.currentTime;
      if (nextTime === 0) {
        nextTime = t + 0.05;
        firstPlayed = performance.now();
      } else if (nextTime < t) {
        underruns++;
        underrunGapS += t - nextTime;
        nextTime = t + 0.02;
      }
      src.start(nextTime);
      nextTime += buf.duration;
    } else if (d.type === 'segment-done') {
      segments.push({ ...d, frames: d.frames.length });
      parity.push({ segment: d.segment, frames: d.frames });
    }
  };
  worker.addEventListener('message', handle);

  const t0 = performance.now();
  worker.postMessage({ type: 'synth', segments: cfg.segments, voice: cfg.voice, replayDraws: cfg.replayDraws, seed: 7, codecPolicy: cfg.codecPolicy });
  const done: any = await wait((d) => d.type === 'done');
  if (viaWorker) {
    while (codecDone.size < cfg.segments.length) await new Promise((r) => setTimeout(r, 10));
    done.totalMs = Math.round(lastChunkAt - t0);
    done.firstChunkMs = Math.round(firstChunkAtPage - t0);
    segments.forEach((s) => (s.codecMs = codecDone.get(s.segment) ?? 0));
  }
  codecWorker?.terminate();
  // Esperar a que suene lo programado para contar underruns hasta el final.
  if (cfg.play) await new Promise((r) => setTimeout(r, Math.max(0, (nextTime - ctx.currentTime) * 1000) + 200));
  worker.terminate();
  await ctx.close();

  const perFrame = segments.flatMap((s) => s.localMs.map((l: number, i: number) => l + (s.decodeMs[i] ?? 0)));
  perFrame.sort((a: number, b: number) => a - b);
  const q = (p: number) => +(perFrame[Math.floor(perFrame.length * p)] ?? 0).toFixed(1);
  const audioS = segments.reduce((a, s) => a + s.audioS, 0);
  const result = {
    backend: cfg.backend,
    threads: cfg.threads,
    gpuKvCache: cfg.gpuKvCache,
    codecPolicy: cfg.codecPolicy,
    crossOriginIsolated: ready.crossOriginIsolated,
    initMs: ready.initMs,
    sessionTimes: ready.sessionTimes,
    firstChunkMs: done.firstChunkMs,
    firstPlayedMs: firstPlayed > 0 ? Math.round(firstPlayed - t0) : null,
    totalMs: done.totalMs,
    audioS: +audioS.toFixed(2),
    rtf: +(done.totalMs / 1000 / audioS).toFixed(3),
    msPerFrameMedian: q(0.5),
    msPerFrameP95: q(0.95),
    prefillMs: segments.map((s) => s.prefillMs),
    codecMs: segments.map((s) => s.codecMs),
    underruns,
    underrunGapS: +underrunGapS.toFixed(2),
    segments: segments.length,
  };
  log(JSON.stringify(result));
  let pcm: string | undefined;
  if (cfg.capture) {
    const n = captured.reduce((a, c) => a + c[0]!.length, 0);
    const out = new Int16Array(n * 2);
    let o = 0;
    for (const c of captured) for (let i = 0; i < c[0]!.length; i++) for (let k = 0; k < 2; k++) out[o++] = Math.max(-1, Math.min(1, c[k]?.[i] ?? c[0]![i]!)) * 32767;
    let bin = '';
    const u8 = new Uint8Array(out.buffer);
    for (let i = 0; i < u8.length; i += 8192) bin += String.fromCharCode(...u8.subarray(i, i + 8192));
    pcm = btoa(bin);
  }
  return { result, parity, pcm };
}

(window as any).runBench = runBench;
(window as any).benchReady = true;
log('página lista');
