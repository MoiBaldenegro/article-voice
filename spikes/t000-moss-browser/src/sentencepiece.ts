/**
 * Spike T-000 · tokenizador SentencePiece (modelo BPE) en TypeScript, sin dependencias.
 *
 * Implementado desde la especificación pública del formato (sentencepiece_model.proto) y el
 * comportamiento documentado de SentencePiece: normalización con `precompiled_charsmap`
 * (trie darts-clone), espacios como "▁", prefijo ficticio, fusión BPE por puntuación y
 * byte fallback. No copia código de MOSS-TTS-Nano-Reader (ADR-0016).
 */

const PIECE_NORMAL = 1;
const PIECE_UNKNOWN = 2;
const PIECE_CONTROL = 3;
const PIECE_USER_DEFINED = 4;
const PIECE_UNUSED = 5;
const PIECE_BYTE = 6;
const SPACE_SYMBOL = '▁';

interface Piece {
  readonly piece: string;
  readonly score: number;
  readonly type: number;
}

interface ParsedModel {
  readonly pieces: Piece[];
  readonly modelType: number;
  readonly byteFallback: boolean;
  readonly unkId: number;
  readonly charsmap: Uint8Array | null;
  readonly addDummyPrefix: boolean;
  readonly removeExtraWhitespaces: boolean;
  readonly escapeWhitespaces: boolean;
}

/** Lector mínimo de protobuf: solo lo necesario para ModelProto. */
class ProtoReader {
  private pos = 0;
  private readonly buf: Uint8Array;
  constructor(buf: Uint8Array) {
    this.buf = buf;
  }

  get done(): boolean {
    return this.pos >= this.buf.length;
  }

  varint(): number {
    let result = 0;
    let shift = 0;
    for (;;) {
      const byte = this.buf[this.pos++]!;
      // Los varint de este formato caben en 53 bits; se evita el desbordamiento de << en 32 bits.
      result += (byte & 0x7f) * 2 ** shift;
      if ((byte & 0x80) === 0) return result;
      shift += 7;
    }
  }

  tag(): { field: number; wire: number } {
    const key = this.varint();
    return { field: Math.floor(key / 8), wire: key & 7 };
  }

  bytes(): Uint8Array {
    const len = this.varint();
    const out = this.buf.subarray(this.pos, this.pos + len);
    this.pos += len;
    return out;
  }

  float32(): number {
    const view = new DataView(this.buf.buffer, this.buf.byteOffset + this.pos, 4);
    this.pos += 4;
    return view.getFloat32(0, true);
  }

  skip(wire: number): void {
    if (wire === 0) this.varint();
    else if (wire === 1) this.pos += 8;
    else if (wire === 2) {
      // Primero leer la longitud: `this.pos += this.varint()` usaría el pos de antes de leerla.
      const len = this.varint();
      this.pos += len;
    }
    else if (wire === 5) this.pos += 4;
    else throw new Error(`protobuf: tipo de cable no soportado ${wire}`);
  }
}

const utf8 = new TextDecoder('utf-8');
const utf8Encoder = new TextEncoder();

function parseModel(buf: Uint8Array): ParsedModel {
  const pieces: Piece[] = [];
  let modelType = 1;
  let byteFallback = false;
  let unkId = 0;
  let charsmap: Uint8Array | null = null;
  let addDummyPrefix = true;
  let removeExtraWhitespaces = true;
  let escapeWhitespaces = true;

  const root = new ProtoReader(buf);
  while (!root.done) {
    const { field, wire } = root.tag();
    if (field === 1 && wire === 2) {
      const r = new ProtoReader(root.bytes());
      let piece = '';
      let score = 0;
      let type = PIECE_NORMAL;
      while (!r.done) {
        const t = r.tag();
        if (t.field === 1 && t.wire === 2) piece = utf8.decode(r.bytes());
        else if (t.field === 2 && t.wire === 5) score = r.float32();
        else if (t.field === 3 && t.wire === 0) type = r.varint();
        else r.skip(t.wire);
      }
      pieces.push({ piece, score, type });
    } else if (field === 2 && wire === 2) {
      const r = new ProtoReader(root.bytes());
      while (!r.done) {
        const t = r.tag();
        if (t.field === 3 && t.wire === 0) modelType = r.varint();
        else if (t.field === 35 && t.wire === 0) byteFallback = r.varint() !== 0;
        else if (t.field === 40 && t.wire === 0) unkId = r.varint();
        else r.skip(t.wire);
      }
    } else if (field === 3 && wire === 2) {
      const r = new ProtoReader(root.bytes());
      while (!r.done) {
        const t = r.tag();
        if (t.field === 2 && t.wire === 2) charsmap = r.bytes().slice();
        else if (t.field === 3 && t.wire === 0) addDummyPrefix = r.varint() !== 0;
        else if (t.field === 4 && t.wire === 0) removeExtraWhitespaces = r.varint() !== 0;
        else if (t.field === 5 && t.wire === 0) escapeWhitespaces = r.varint() !== 0;
        else r.skip(t.wire);
      }
    } else {
      root.skip(wire);
    }
  }
  return { pieces, modelType, byteFallback, unkId, charsmap, addDummyPrefix, removeExtraWhitespaces, escapeWhitespaces };
}

/**
 * Normalizador con el charsmap precompilado: un trie darts-clone sobre bytes UTF-8 seguido de
 * un bloque de cadenas normalizadas terminadas en \0. Coincidencia de prefijo más largo.
 */
class CharsmapNormalizer {
  private readonly trie: Uint32Array;
  private readonly normalized: Uint8Array;

  constructor(blob: Uint8Array) {
    const view = new DataView(blob.buffer, blob.byteOffset, blob.byteLength);
    const trieSize = view.getUint32(0, true);
    const units = new Uint32Array(trieSize / 4);
    for (let i = 0; i < units.length; i++) units[i] = view.getUint32(4 + i * 4, true);
    this.trie = units;
    this.normalized = blob.subarray(4 + trieSize);
  }

  /** Devuelve [bytes consumidos, bytes de reemplazo] o null si no hay coincidencia. */
  private longestMatch(input: Uint8Array, start: number): [number, Uint8Array] | null {
    const t = this.trie;
    const offset = (u: number) => (u >>> 10) << ((u & (1 << 9)) >>> 6);
    const label = (u: number) => u & ((1 << 31) | 0xff);
    const hasLeaf = (u: number) => ((u >>> 8) & 1) === 1;
    const value = (u: number) => u & 0x7fffffff;

    let nodePos = 0;
    let unit = t[nodePos]!;
    nodePos ^= offset(unit);
    let best: [number, number] | null = null;
    for (let i = start; i < input.length; i++) {
      const c = input[i]!;
      if (c === 0) break;
      nodePos ^= c;
      unit = t[nodePos]!;
      if (label(unit) !== c) break;
      nodePos ^= offset(unit);
      if (hasLeaf(unit)) best = [i - start + 1, value(t[nodePos]!)];
    }
    if (!best) return null;
    const [len, valueOffset] = best;
    let end = valueOffset;
    while (end < this.normalized.length && this.normalized[end] !== 0) end++;
    return [len, this.normalized.subarray(valueOffset, end)];
  }

  normalize(text: string): string {
    const input = utf8Encoder.encode(text);
    const out: number[] = [];
    let i = 0;
    while (i < input.length) {
      const match = this.longestMatch(input, i);
      if (match) {
        for (const b of match[1]) out.push(b);
        i += match[0];
        continue;
      }
      // Sin coincidencia: se copia un carácter UTF-8 completo.
      const lead = input[i]!;
      const len = lead < 0x80 ? 1 : lead < 0xe0 ? 2 : lead < 0xf0 ? 3 : 4;
      for (let k = 0; k < len && i + k < input.length; k++) out.push(input[i + k]!);
      i += len;
    }
    return utf8.decode(new Uint8Array(out));
  }
}

export class SentencePieceBpe {
  private readonly model: ParsedModel;
  private readonly pieceToId = new Map<string, number>();
  private readonly byteToId = new Map<number, number>();
  private readonly userDefined: string[] = [];
  private readonly normalizer: CharsmapNormalizer | null;

  constructor(modelBytes: Uint8Array) {
    this.model = parseModel(modelBytes);
    if (this.model.modelType !== 2) throw new Error(`Solo se soporta BPE (model_type=2); recibido ${this.model.modelType}`);
    this.model.pieces.forEach((p, id) => {
      if (p.type === PIECE_BYTE) {
        const m = /^<0x([0-9A-Fa-f]{2})>$/.exec(p.piece);
        if (m) this.byteToId.set(parseInt(m[1]!, 16), id);
        return;
      }
      if (p.type === PIECE_CONTROL || p.type === PIECE_UNKNOWN) return;
      if (p.type === PIECE_USER_DEFINED) this.userDefined.push(p.piece);
      this.pieceToId.set(p.piece, id);
    });
    this.userDefined.sort((a, b) => b.length - a.length);
    this.normalizer = this.model.charsmap && this.model.charsmap.length > 0 ? new CharsmapNormalizer(this.model.charsmap) : null;
  }

  get vocabSize(): number {
    return this.model.pieces.length;
  }

  normalize(text: string): string {
    let s = this.normalizer ? this.normalizer.normalize(text) : text;
    if (this.model.removeExtraWhitespaces) s = s.replace(/ +/g, ' ').replace(/^ | $/g, '');
    if (s.length === 0) return '';
    if (this.model.addDummyPrefix) s = ' ' + s;
    if (this.model.escapeWhitespaces) s = s.replace(/ /g, SPACE_SYMBOL);
    return s;
  }

  encode(text: string): number[] {
    const normalized = this.normalize(text);
    if (normalized.length === 0) return [];

    // 1) Símbolos iniciales: piezas definidas por el usuario (coincidencia más larga) o caracteres.
    const symbols: string[] = [];
    const chars = Array.from(normalized);
    for (let i = 0; i < chars.length; ) {
      const rest = chars.slice(i).join('');
      const user = this.userDefined.find((u) => rest.startsWith(u));
      if (user) {
        symbols.push(user);
        i += Array.from(user).length;
      } else {
        symbols.push(chars[i]!);
        i += 1;
      }
    }

    // 2) Fusiones BPE: siempre el par adyacente cuya unión tiene mayor puntuación (empate: el de la izquierda).
    const isUser = new Set(this.userDefined);
    for (;;) {
      let bestScore = -Infinity;
      let bestIndex = -1;
      for (let i = 0; i + 1 < symbols.length; i++) {
        if (isUser.has(symbols[i]!) || isUser.has(symbols[i + 1]!)) continue;
        const id = this.pieceToId.get(symbols[i]! + symbols[i + 1]!);
        if (id === undefined) continue;
        const piece = this.model.pieces[id]!;
        if (piece.type === PIECE_UNUSED) continue;
        if (piece.score > bestScore) {
          bestScore = piece.score;
          bestIndex = i;
        }
      }
      if (bestIndex < 0) break;
      symbols.splice(bestIndex, 2, symbols[bestIndex]! + symbols[bestIndex + 1]!);
    }

    // 3) A ids; lo que no está en el vocabulario va por byte fallback o como desconocido.
    const ids: number[] = [];
    for (const sym of symbols) {
      const id = this.pieceToId.get(sym);
      if (id !== undefined && this.model.pieces[id]!.type !== PIECE_UNUSED) {
        ids.push(id);
      } else if (this.model.byteFallback) {
        for (const b of utf8Encoder.encode(sym)) {
          const byteId = this.byteToId.get(b);
          ids.push(byteId ?? this.model.unkId);
        }
      } else {
        ids.push(this.model.unkId);
      }
    }
    return ids;
  }
}
