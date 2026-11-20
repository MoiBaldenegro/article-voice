/**
 * Spike T-000: descarga los pesos de Hugging Face a una carpeta ignorada por git y verifica el SHA-256.
 *
 * Uso: node scripts/download-models.mjs <repo>@<commit> [<repo>@<commit> ...] [--out models]
 * Ej.: node scripts/download-models.mjs OpenMOSS-Team/MOSS-TTS-Nano-100M-ONNX@<sha40> OpenMOSS-Team/MOSS-Audio-Tokenizer-Nano-ONNX@<sha40>
 *
 * El commit es obligatorio (nunca `main`). El SHA-256 esperado sale de la API de HF (`lfs.oid`) para
 * archivos LFS; los archivos no-LFS se verifican con el git blob id (`oid`, SHA-1) y se imprime su SHA-256
 * para copiarlo al informe. Cada repo se guarda en <out>/<repo con "/" -> "__">/.
 */
import { createHash } from 'node:crypto';
import { createReadStream, createWriteStream, existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';

const args = process.argv.slice(2);
const outIdx = args.indexOf('--out');
const out = outIdx >= 0 ? args.splice(outIdx, 2)[1] : 'models';
if (!args.length) throw new Error('uso: download-models.mjs <repo>@<commit> ... [--out models]');

const sha256 = (path) =>
  new Promise((ok, fail) => {
    const h = createHash('sha256');
    createReadStream(path).on('data', (d) => h.update(d)).on('end', () => ok(h.digest('hex'))).on('error', fail);
  });

const manifest = [];
for (const spec of args) {
  const [repo, commit] = spec.split('@');
  if (!repo || !/^[0-9a-f]{40}$/.test(commit ?? '')) throw new Error(`${spec}: falta commit de 40 hex`);
  const tree = await (await fetch(`https://huggingface.co/api/models/${repo}/tree/${commit}?recursive=true`)).json();
  for (const f of tree.filter((e) => e.type === 'file')) {
    const dest = join(out, repo.replace('/', '__'), f.path);
    mkdirSync(dirname(dest), { recursive: true });
    const expected = f.lfs?.oid;
    if (!(existsSync(dest) && statSync(dest).size === f.size && (!expected || (await sha256(dest)) === expected))) {
      const res = await fetch(`https://huggingface.co/${repo}/resolve/${commit}/${f.path}`);
      if (!res.ok) throw new Error(`${f.path}: HTTP ${res.status}`);
      await pipeline(Readable.fromWeb(res.body), createWriteStream(dest));
    }
    const actual = await sha256(dest);
    if (expected && actual !== expected) throw new Error(`SHA-256 distinto en ${repo}/${f.path}: ${actual} != ${expected}`);
    manifest.push({ repo, commit, path: f.path, size: f.size, sha256: actual, verificadoContraHF: Boolean(expected) });
    console.log(`${expected ? 'OK ' : 'ok*'} ${repo}/${f.path} ${f.size} ${actual}`);
  }
}
writeFileSync(join(out, 'manifest.json'), JSON.stringify(manifest, null, 2));
