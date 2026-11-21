/**
 * Spike T-000 · CA-4: lanza Chrome con varias configuraciones, sintetiza un artículo corto
 * reproduciéndolo y recoge los tiempos. Además comprueba la paridad de frames con la referencia.
 *
 * Uso: node src/bench-browser.ts <pesos> <golden.json> <salida.json> [chrome.exe] [configs separadas por coma]
 */
import { spawn, execSync, type ChildProcess } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { chromium } from 'playwright-core';

const [modelsDir, goldenPath, outPath, chromePath, only] = process.argv.slice(2);
if (!modelsDir || !goldenPath || !outPath) throw new Error('uso: bench-browser.ts <pesos> <golden.json> <salida.json> [chrome] [configs]');
const root = resolve(import.meta.dirname, '..');
const golden = JSON.parse(readFileSync(goldenPath, 'utf8'));

execSync(
  `npx esbuild src/browser/page.ts src/browser/worker.ts --bundle --format=esm --target=es2022 --outdir=out/dist --external:/ort/*`,
  { cwd: root, stdio: 'inherit' },
);

const ARTICLE = [
  'Durante años, escuchar un artículo dependía de servicios de pago en la nube.',
  'Hoy, un modelo pequeño puede generar la voz directamente en el navegador.',
  'El texto no sale del dispositivo de quien lee, y no hay costo por cada palabra.',
  'La primera vez hay que descargar el modelo, y luego queda guardado en la caché.',
  'Si el dispositivo no puede con el modelo, el componente usa la voz del sistema.',
  'Así, cualquier sitio puede ofrecer sus artículos para escuchar con una sola línea de código.',
];

interface Config {
  name: string;
  backend: 'webgpu' | 'wasm';
  threads: number;
  isolated: boolean;
  gpuKvCache: boolean;
  codecPolicy: string;
  variant?: 'official' | 'q4';
}
const CONFIGS: Config[] = [
  { name: 'webgpu', backend: 'webgpu', threads: 1, isolated: false, gpuKvCache: false, codecPolicy: 'adaptive' },
  { name: 'webgpu-kvgpu', backend: 'webgpu', threads: 1, isolated: false, gpuKvCache: true, codecPolicy: 'adaptive' },
  { name: 'wasm-1hilo', backend: 'wasm', threads: 1, isolated: false, gpuKvCache: false, codecPolicy: 'adaptive' },
  { name: 'wasm-4hilos-aislado', backend: 'wasm', threads: 4, isolated: true, gpuKvCache: false, codecPolicy: 'adaptive' },
  { name: 'q4-webgpu', backend: 'webgpu', threads: 1, isolated: false, gpuKvCache: false, codecPolicy: 'adaptive', variant: 'q4' },
  { name: 'q4-wasm-1hilo', backend: 'wasm', threads: 1, isolated: false, gpuKvCache: false, codecPolicy: 'adaptive', variant: 'q4' },
  { name: 'q4-wasm-4hilos-aislado', backend: 'wasm', threads: 4, isolated: true, gpuKvCache: false, codecPolicy: 'adaptive', variant: 'q4' },
  { name: 'wasm4-batch8', backend: 'wasm', threads: 4, isolated: true, gpuKvCache: false, codecPolicy: 'batch:8' },
  { name: 'wasm4-batch8-async', backend: 'wasm', threads: 4, isolated: true, gpuKvCache: false, codecPolicy: 'batch:8:async' },
  { name: 'wasm4-batch8-worker', backend: 'wasm', threads: 4, isolated: true, gpuKvCache: false, codecPolicy: 'batch:8:worker' },
  { name: 'wasm4-batch4-worker', backend: 'wasm', threads: 4, isolated: true, gpuKvCache: false, codecPolicy: 'batch:4:worker' },
  { name: 'wasm4-batch16', backend: 'wasm', threads: 4, isolated: true, gpuKvCache: false, codecPolicy: 'batch:16' },
  { name: 'webgpu-batch8', backend: 'webgpu', threads: 1, isolated: false, gpuKvCache: false, codecPolicy: 'batch:8' },
  { name: 'webgpu-kvgpu-batch8', backend: 'webgpu', threads: 1, isolated: false, gpuKvCache: true, codecPolicy: 'batch:8' },
  { name: 'q4-webgpu-batch8', backend: 'webgpu', threads: 1, isolated: false, gpuKvCache: false, codecPolicy: 'batch:8', variant: 'q4' },
  { name: 'q4-webgpu-kvgpu-batch8', backend: 'webgpu', threads: 1, isolated: false, gpuKvCache: true, codecPolicy: 'batch:8', variant: 'q4' },
  { name: 'webgpu-kvgpu-batch8-worker', backend: 'webgpu', threads: 2, isolated: false, gpuKvCache: true, codecPolicy: 'batch:8:worker' },
  { name: 'webgpu-batch8-worker', backend: 'webgpu', threads: 2, isolated: false, gpuKvCache: false, codecPolicy: 'batch:8:worker' },
  { name: 'q4-webgpu-kvgpu-batch8-worker', backend: 'webgpu', threads: 2, isolated: false, gpuKvCache: true, codecPolicy: 'batch:8:worker', variant: 'q4' },
  { name: 'q4-webgpu-batch8-worker', backend: 'webgpu', threads: 2, isolated: false, gpuKvCache: false, codecPolicy: 'batch:8:worker', variant: 'q4' },
].filter((c) => !only || only.split(',').includes(c.name)) as Config[];

function startServer(isolated: boolean, port: number): Promise<ChildProcess> {
  return new Promise((ok, fail) => {
    const child = spawn(process.execPath, ['src/serve.ts', modelsDir!, String(port), ...(isolated ? ['--isolated'] : [])], { cwd: root });
    child.stdout.on('data', (d) => String(d).includes('spike en') && ok(child));
    child.stderr.on('data', (d) => process.stderr.write(d));
    child.on('exit', (code) => fail(new Error(`servidor salió con ${code}`)));
  });
}

function chromeMemoryMb(): number {
  try {
    const out = execSync(`powershell -NoProfile -c "(Get-Process chrome -ErrorAction SilentlyContinue | Measure-Object WorkingSet64 -Sum).Sum"`).toString().trim();
    return Math.round(Number(out || 0) / 1048576);
  } catch {
    return -1;
  }
}

const results: unknown[] = [];
mkdirSync(join(root, 'out'), { recursive: true });
for (const cfg of CONFIGS) {
  const port = cfg.isolated ? 8788 : 8787;
  const server = await startServer(cfg.isolated, port);
  const baseMem = chromeMemoryMb();
  const browser = await chromium.launch({
    executablePath: chromePath || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
    args: ['--enable-unsafe-webgpu', '--autoplay-policy=no-user-gesture-required', '--enable-features=Vulkan', '--js-flags=--max-old-space-size=4096'],
  });
  try {
    const page = await browser.newPage();
    page.on('console', (m) => m.type() === 'error' && console.log('[consola]', m.text()));
    await page.goto(`http://127.0.0.1:${port}/`);
    await page.waitForFunction(() => (window as any).benchReady === true);
    const adapter = await page.evaluate(async () => {
      const gpu = (navigator as any).gpu;
      if (!gpu) return null;
      const a = await gpu.requestAdapter();
      return a ? { vendor: a.info?.vendor, architecture: a.info?.architecture, description: a.info?.description } : null;
    });

    // 1) Paridad: la frase corta con los aleatorios de la referencia.
    const isQ4 = cfg.variant === 'q4';
    const es = golden.phrases.find((p: any) => p.id === 'es_corta');
    const par: any = await page.evaluate(
      (c) => (window as any).runBench(c),
      { backend: cfg.backend, threads: cfg.threads, gpuKvCache: cfg.gpuKvCache, segments: [es.prepared_text.trim()], voice: es.voice, replayDraws: isQ4 ? undefined : [es.random_draws], codecPolicy: cfg.codecPolicy, play: false, variant: cfg.variant },
    );
    const got: number[][] = par.parity[0].frames;
    const exp: number[][] = es.frames;
    let firstDiff = -1;
    for (let i = 0; i < Math.max(got.length, exp.length); i++) {
      if (!got[i] || !exp[i] || got[i]!.some((v, j) => v !== exp[i]![j])) {
        firstDiff = i;
        break;
      }
    }

    // 2) Artículo de 6 frases, reproduciéndolo, para medir fluidez.
    const art: any = await page.evaluate(
      (c) => (window as any).runBench(c),
      { backend: cfg.backend, threads: cfg.threads, gpuKvCache: cfg.gpuKvCache, segments: ARTICLE, voice: 'Nathan', codecPolicy: cfg.codecPolicy, play: true, variant: cfg.variant, capture: true },
    );
    if (art.pcm) writeFileSync(join(root, 'out', `articulo-${cfg.name}.pcm`), Buffer.from(art.pcm, 'base64'));
    const peakMem = chromeMemoryMb();
    const row = {
      config: cfg.name,
      adapter,
      paridad: isQ4 ? 'no aplica (variante cuantizada, frames distintos por diseño)' : { framesIguales: firstDiff < 0, primerFrameDistinto: firstDiff, frames: `${got.length} (python ${exp.length})` },
      articulo: art.result,
      memoriaChromeMb: peakMem >= 0 && baseMem >= 0 ? peakMem - baseMem : null,
    };
    results.push(row);
    console.log(JSON.stringify(row));
  } catch (err) {
    results.push({ config: cfg.name, error: String(err) });
    console.log(cfg.name, 'ERROR', String(err).slice(0, 600));
  } finally {
    await browser.close();
    server.kill();
  }
}
writeFileSync(outPath, JSON.stringify({ fecha: new Date().toISOString(), results }, null, 2));
