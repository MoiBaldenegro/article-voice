// Servidor de referencia para el motor `moss-server` de <article-voice>.
// Sin dependencias: Node >= 22. Implementa POST /v1/audio/speech (compatible con OpenAI) y
// responde `pcm` = 16 bits little-endian, mono, 48 kHz.
//
// El audio lo produce un BACKEND intercambiable (variable BACKEND):
//   tone     (por defecto) un tono por frase; sirve para comprobar CORS y la integración.
//   command  ejecuta TTS_COMMAND por petición: recibe el texto en stdin y escribe en stdout
//            PCM 16-bit LE mono a 48 kHz (conecta aquí MOSS-TTS-Nano; ver README).
//   upstream pasa la petición a UPSTREAM_URL (otro servidor /v1/audio/speech, p. ej. vLLM-Omni
//            con MOSS-TTS-Nano), añadiendo la clave UPSTREAM_API_KEY si existe.
//
// Variables: PORT (8000), HOST (127.0.0.1), ALLOWED_ORIGINS (lista separada por comas; obligatoria,
// `*` solo para probar), VOICES (lista, por defecto `default`), MAX_INPUT_CHARS (4000).
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { pathToFileURL } from 'node:url';

const SAMPLE_RATE = 48000;

export function loadConfig(env = process.env) {
  const list = (v, d) =>
    (v ?? d)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  return {
    port: Number(env.PORT ?? 8000),
    host: env.HOST ?? '127.0.0.1',
    origins: list(env.ALLOWED_ORIGINS, ''),
    voices: list(env.VOICES, 'default'),
    maxChars: Number(env.MAX_INPUT_CHARS ?? 4000),
    backend: env.BACKEND ?? 'tone',
    command: env.TTS_COMMAND ?? '',
    upstreamUrl: env.UPSTREAM_URL ?? '',
    upstreamKey: env.UPSTREAM_API_KEY ?? '',
  };
}

/** Cabeceras CORS solo para orígenes permitidos (nunca credenciales). */
function corsHeaders(config, origin) {
  const any = config.origins.includes('*');
  if (!origin || !(any || config.origins.includes(origin))) return null;
  return {
    'access-control-allow-origin': any ? '*' : origin,
    'access-control-allow-methods': 'GET, HEAD, POST, OPTIONS',
    'access-control-allow-headers': 'content-type',
    'access-control-max-age': '600',
    vary: 'Origin',
  };
}

function tone(text) {
  const seconds = Math.min(3, 0.05 * Math.max(1, text.length));
  const n = Math.round(SAMPLE_RATE * seconds);
  const buf = Buffer.alloc(n * 2);
  for (let i = 0; i < n; i++) {
    buf.writeInt16LE(Math.round(Math.sin((2 * Math.PI * 440 * i) / SAMPLE_RATE) * 6000), i * 2);
  }
  return buf;
}

function runCommand(command, text) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, { shell: true, stdio: ['pipe', 'pipe', 'inherit'] });
    const out = [];
    child.stdout.on('data', (c) => out.push(c));
    child.on('error', reject);
    child.on('close', (code) =>
      code === 0 ? resolve(Buffer.concat(out)) : reject(new Error(`TTS_COMMAND salió con ${code}`)),
    );
    child.stdin.on('error', () => undefined);
    child.stdin.end(text);
  });
}

async function synthesize(config, body) {
  if (config.backend === 'command') return runCommand(config.command, body.input);
  if (config.backend === 'upstream') {
    const res = await fetch(new URL('/v1/audio/speech', config.upstreamUrl), {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(config.upstreamKey ? { authorization: `Bearer ${config.upstreamKey}` } : {}),
      },
      body: JSON.stringify({ ...body, response_format: 'pcm' }),
    });
    if (!res.ok) throw new Error(`upstream respondió ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  }
  return tone(body.input);
}

function readJson(req, limit) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const parts = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) {
        reject(Object.assign(new Error('Cuerpo demasiado grande'), { status: 413 }));
        req.destroy();
      } else parts.push(c);
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(parts).toString('utf8')));
      } catch {
        reject(Object.assign(new Error('JSON inválido'), { status: 400 }));
      }
    });
    req.on('error', reject);
  });
}

export function createSpeechServer(config = loadConfig()) {
  return createServer(async (req, res) => {
    const cors = corsHeaders(config, req.headers.origin) ?? {};
    const send = (status, headers, body) =>
      res.writeHead(status, { ...cors, ...headers }).end(body);
    const json = (status, message) =>
      send(status, { 'content-type': 'application/json' }, JSON.stringify({ error: { message } }));
    const { pathname } = new URL(req.url ?? '/', 'http://localhost');

    if (req.method === 'OPTIONS') return send(204, {});
    // Sondeo de disponibilidad de <article-voice> (HEAD/GET sobre server-url).
    if (pathname === '/' && (req.method === 'HEAD' || req.method === 'GET')) {
      return send(200, { 'content-type': 'text/plain' }, req.method === 'HEAD' ? undefined : 'ok');
    }
    if (pathname !== '/v1/audio/speech' || req.method !== 'POST') return json(404, 'No encontrado');
    // Si el origen no está permitido, no se genera audio (el navegador igual lo bloquearía).
    if (req.headers.origin && !cors['access-control-allow-origin']) {
      return json(403, 'Origen no permitido');
    }

    try {
      const body = await readJson(req, 64 * 1024);
      if (typeof body.input !== 'string' || !body.input.trim()) return json(400, 'Falta `input`');
      if (body.input.length > config.maxChars) return json(413, '`input` demasiado largo');
      if (body.response_format !== undefined && body.response_format !== 'pcm') {
        return json(400, 'Solo se admite response_format "pcm"');
      }
      if (typeof body.voice === 'string' && !config.voices.includes(body.voice)) {
        return json(400, `Voz desconocida: ${body.voice}`);
      }
      const audio = await synthesize(config, body);
      send(200, { 'content-type': 'audio/pcm', 'x-sample-rate': String(SAMPLE_RATE) }, audio);
    } catch (e) {
      // No se registra el texto del artículo: solo el motivo.
      process.stderr.write(`error: ${e.message}\n`);
      json(e.status ?? 502, e.status ? e.message : 'Fallo al sintetizar');
    }
  });
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const config = loadConfig();
  if (!config.origins.length) {
    process.stderr.write(
      'Define ALLOWED_ORIGINS (p. ej. https://tu-sitio.com, o `*` para probar).\n',
    );
    process.exit(1);
  }
  createSpeechServer(config).listen(config.port, config.host, () => {
    process.stdout.write(
      `moss-server de referencia en http://${config.host}:${config.port} (backend: ${config.backend})\n`,
    );
  });
}
