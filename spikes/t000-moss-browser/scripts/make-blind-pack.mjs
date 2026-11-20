/**
 * Spike T-000b · prepara la escucha ciega (CP-SPIKE-3): convierte los .pcm capturados (estéreo 48 kHz, int16)
 * a WAV y los guarda como A.wav / B.wav en orden aleatorio. La clave queda en clave.json (no abrir hasta puntuar).
 *
 * Uso: node scripts/make-blind-pack.mjs <oficial.pcm> <cuantizada.pcm> <carpeta salida>
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const [official, quant, outDir] = process.argv.slice(2);
if (!official || !quant || !outDir) throw new Error('uso: make-blind-pack.mjs <oficial.pcm> <cuantizada.pcm> <salida>');

function wav(pcm) {
  const h = Buffer.alloc(44);
  h.write('RIFF', 0);
  h.writeUInt32LE(36 + pcm.length, 4);
  h.write('WAVEfmt ', 8);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20);
  h.writeUInt16LE(2, 22);
  h.writeUInt32LE(48000, 24);
  h.writeUInt32LE(48000 * 4, 28);
  h.writeUInt16LE(4, 32);
  h.writeUInt16LE(16, 34);
  h.write('data', 36);
  h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}

mkdirSync(outDir, { recursive: true });
const swap = Math.random() < 0.5;
const [a, b] = swap ? [quant, official] : [official, quant];
writeFileSync(join(outDir, 'A.wav'), wav(readFileSync(a)));
writeFileSync(join(outDir, 'B.wav'), wav(readFileSync(b)));
writeFileSync(join(outDir, 'clave.json'), JSON.stringify({ A: swap ? 'cuantizada' : 'oficial', B: swap ? 'oficial' : 'cuantizada' }));
console.log('listo en', outDir);
