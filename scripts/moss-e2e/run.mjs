// Prueba de punta a punta de moss-server con los pesos reales de MOSS-TTS-Nano (CPU).
//
//   pnpm test:moss-real            (requiere `pnpm build`; lo hace el script de package.json)
//
// 1. Comprueba/descarga los pesos (spikes/t000-moss-browser/models, ignorado por git).
// 2. Arranca moss_upstream.py (modelo cargado) y el servidor de referencia con BACKEND=upstream.
// 3. Pide audio en español e inglés por /v1/audio/speech: valida formato, duración y RTF.
// 4. Abre examples/html en Chromium (Playwright) contra ese servidor: reproduce, avanza y resalta.
// Escribe temp/moss-e2e-report.json y sale con código 1 si algo falla (con el error exacto).
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { createSpeechServer, loadConfig } from '../../examples/moss-server/server.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '../..');
const spike = join(root, 'spikes/t000-moss-browser');
const models = join(spike, 'models');
const UP_PORT = 9100;
const SRV_PORT = 8100;
const PAGE_PORT = 4180;
const RATE = 48000;
const report = { startedAt: new Date().toISOString(), requests: [], browser: null, failures: [] };
const children = [];
const fail = (msg) => {
  report.failures.push(msg);
  console.error(`FALLO: ${msg}`);
};

function ensureWeights() {
  const repos = [
    'OpenMOSS-Team/MOSS-TTS-Nano-100M-ONNX@f52645cb467506d8e18e746ddd59482685b74e58',
    'OpenMOSS-Team/MOSS-Audio-Tokenizer-Nano-ONNX@ceff0d07' /* se completa abajo */,
  ];
  const have = existsSync(
    join(models, 'OpenMOSS-Team__MOSS-TTS-Nano-100M-ONNX/moss_tts_prefill.onnx'),
  );
  const haveCodec = existsSync(
    join(
      models,
      'OpenMOSS-Team__MOSS-Audio-Tokenizer-Nano-ONNX/moss_audio_tokenizer_decode_full.onnx',
    ),
  );
  if (have && haveCodec && existsSync(join(models, 'ref-runtime/ort_cpu_runtime.py'))) return;
  // Los commits exactos (40 hex) salen del manifiesto del spike si existe; si no, hay que darlos.
  const manifestPath = join(models, 'manifest.json');
  const specs = existsSync(manifestPath)
    ? [
        ...new Set(
          JSON.parse(readFileSync(manifestPath, 'utf8')).map((e) => `${e.repo}@${e.commit}`),
        ),
      ]
    : repos;
  console.log('Descargando pesos públicos de Hugging Face…');
  const r = spawnSync(
    process.execPath,
    [join(spike, 'scripts/download-models.mjs'), ...specs, '--out', models],
    {
      stdio: 'inherit',
    },
  );
  if (r.status !== 0) throw new Error('No se pudieron descargar los pesos (ver salida anterior)');
  if (!existsSync(join(models, 'ref-runtime/ort_cpu_runtime.py'))) {
    throw new Error(
      'Falta models/ref-runtime/ort_cpu_runtime.py (runtime oficial Apache-2.0 del repo MOSS-TTS-Nano); ver spikes/t000-moss-browser/README.md',
    );
  }
}

function pythonBin() {
  const venv = join(
    spike,
    process.platform === 'win32' ? '.venv/Scripts/python.exe' : '.venv/bin/python',
  );
  return existsSync(venv) ? venv : 'python';
}

function startUpstream() {
  return new Promise((resolve, reject) => {
    const child = spawn(
      pythonBin(),
      [
        '-I',
        '-X',
        'utf8',
        join(here, 'moss_upstream.py'),
        '--models',
        models,
        '--runtime',
        join(models, 'ref-runtime'),
        '--port',
        String(UP_PORT),
      ],
      { stdio: ['ignore', 'pipe', 'pipe'] },
    );
    children.push(child);
    let err = '';
    child.stderr.on('data', (d) => (err += d));
    child.stdout.on('data', (d) => String(d).includes('listo') && resolve());
    child.on('close', (code) =>
      reject(new Error(`moss_upstream.py salió con ${code}: ${err.slice(-1500)}`)),
    );
  });
}

const PHRASES = [
  {
    lang: 'es',
    text: 'Escuchar un artículo mientras haces otra cosa es cada vez más común. Basta con pulsar un botón y la página empieza a leerse en voz alta.',
  },
  {
    lang: 'en',
    text: 'Listening to an article while you do something else is increasingly common. You just press a button and the page starts reading itself aloud.',
  },
];

async function checkSpeech(base) {
  for (const { lang, text } of PHRASES) {
    const t0 = performance.now();
    const res = await fetch(`${base}/v1/audio/speech`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        model: 'moss-tts-nano',
        input: text,
        voice: 'default',
        response_format: 'pcm',
      }),
    });
    const wall = (performance.now() - t0) / 1000;
    const entry = { lang, status: res.status, contentType: res.headers.get('content-type') };
    report.requests.push(entry);
    if (!res.ok) {
      fail(`[${lang}] HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
      continue;
    }
    const pcm = Buffer.from(await res.arrayBuffer());
    const samples = pcm.length / 2;
    const seconds = samples / RATE;
    let peak = 0;
    for (let i = 0; i < samples; i++) peak = Math.max(peak, Math.abs(pcm.readInt16LE(i * 2)));
    Object.assign(entry, {
      bytes: pcm.length,
      audioSeconds: +seconds.toFixed(2),
      peak,
      wallSeconds: +wall.toFixed(2),
      rtf: +(wall / seconds).toFixed(2),
    });
    if (entry.contentType !== 'audio/pcm') fail(`[${lang}] content-type ${entry.contentType}`);
    if (pcm.length % 2 !== 0) fail(`[${lang}] longitud impar: no es PCM de 16 bits`);
    if (!(seconds > 0.5)) fail(`[${lang}] duración ${seconds.toFixed(2)} s`);
    if (peak < 500) fail(`[${lang}] audio casi en silencio (pico ${peak})`);
    console.log(
      `[${lang}] ${seconds.toFixed(2)} s de audio en ${wall.toFixed(2)} s → RTF ${entry.rtf}`,
    );
  }
}

function servePage() {
  const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript' };
  const html = readFileSync(join(root, 'examples/html/index.html'), 'utf8')
    .replace('https://tts.example.com', `http://127.0.0.1:${SRV_PORT}`)
    .replace('<article-voice ', '<article-voice engine="moss-server" ')
    .replace(/https:\/\/cdn\.jsdelivr\.net\/npm\/article-voice@[^"]+/, '/dist/index.js');
  return new Promise((resolve) => {
    const s = createServer((req, res) => {
      const p = new URL(req.url, 'http://x').pathname;
      if (p === '/') return res.writeHead(200, { 'content-type': types['.html'] }).end(html);
      if (p === '/dist/index.js') {
        return res
          .writeHead(200, { 'content-type': types['.js'] })
          .end(readFileSync(join(root, p)));
      }
      res.writeHead(404).end();
    }).listen(PAGE_PORT, '127.0.0.1', () => resolve(s));
  });
}

async function checkBrowser() {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    await page.addInitScript(() => {
      const w = window;
      w.__events = [];
      w.__maxHighlight = 0;
      for (const t of ['statechange', 'segment', 'ended', 'fallback', 'error']) {
        document.addEventListener(`article-voice:${t}`, (e) =>
          w.__events.push({ type: t, detail: e.detail }),
        );
      }
      setInterval(() => {
        const h = CSS.highlights?.get('article-voice');
        w.__maxHighlight = Math.max(w.__maxHighlight, h ? h.size : 0);
      }, 100);
    });
    await page.goto(`http://127.0.0.1:${PAGE_PORT}/`);
    await page.waitForFunction(() => customElements.get('article-voice') !== undefined);
    const root = page.locator('article-voice [part="root"]');
    await root.waitFor({ state: 'attached' });
    const t0 = Date.now();
    await page.locator('article-voice button[part="play"]').click();
    await page.waitForFunction(
      () =>
        document
          .querySelector('article-voice')
          .shadowRoot?.querySelector('[part="root"]')
          ?.getAttribute('data-state') === 'playing',
      null,
      { timeout: 120_000 },
    );
    const timeToPlayingMs = Date.now() - t0;
    // Espera a que avance a una segunda frase.
    await page.waitForFunction(
      () =>
        new Set(window.__events.filter((e) => e.type === 'segment').map((e) => e.detail.index))
          .size >= 2,
      null,
      { timeout: 180_000 },
    );
    const events = await page.evaluate(() => window.__events);
    const maxHighlight = await page.evaluate(() => window.__maxHighlight);
    const indexes = [
      ...new Set(events.filter((e) => e.type === 'segment').map((e) => e.detail.index)),
    ];
    report.browser = {
      timeToPlayingMs,
      segmentsSeen: indexes,
      maxHighlightRanges: maxHighlight,
      fallback: events.some((e) => e.type === 'fallback'),
      errors: events.filter((e) => e.type === 'error').map((e) => e.detail),
      pageErrors: errors,
    };
    if (report.browser.fallback)
      fail('el elemento cayó a la voz del sistema (article-voice:fallback)');
    if (report.browser.errors.length)
      fail(`evento article-voice:error: ${JSON.stringify(report.browser.errors)}`);
    if (indexes.length < 2) fail('no avanzó de segmento');
    if (maxHighlight < 1) fail('no hubo resaltado (CSS.highlights vacío)');
    console.log(
      `[navegador] playing en ${timeToPlayingMs} ms; segmentos ${indexes}; resaltado ${maxHighlight} rango(s)`,
    );
  } finally {
    await browser.close();
  }
}

try {
  if (!existsSync(join(root, 'dist/index.js')))
    throw new Error('Falta dist/index.js: ejecuta `pnpm build`');
  ensureWeights();
  console.log('Cargando MOSS-TTS-Nano (CPU)…');
  await startUpstream();
  const srv = createSpeechServer({
    ...loadConfig({
      PORT: String(SRV_PORT),
      BACKEND: 'upstream',
      UPSTREAM_URL: `http://127.0.0.1:${UP_PORT}`,
      ALLOWED_ORIGINS: `http://127.0.0.1:${PAGE_PORT}`,
    }),
  });
  await new Promise((r) => srv.listen(SRV_PORT, '127.0.0.1', r));
  const page = await servePage();
  try {
    await checkSpeech(`http://127.0.0.1:${SRV_PORT}`);
    await checkBrowser();
  } finally {
    srv.close();
    page.close();
  }
} catch (e) {
  fail(e instanceof Error ? e.message : String(e));
} finally {
  for (const c of children) c.kill();
  mkdirSync(join(root, 'temp'), { recursive: true });
  writeFileSync(join(root, 'temp/moss-e2e-report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.failures.length ? 1 : 0);
}
