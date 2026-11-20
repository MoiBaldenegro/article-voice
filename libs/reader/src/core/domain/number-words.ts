// Números a palabras en es/en. Puro. Soporta enteros 0 ≤ n < 1e12; fuera de rango
// el llamador lee dígito a dígito (`spellDigits`).

export type NumberLang = 'es' | 'en';

export const MAX_SPELLABLE = 999_999_999_999;

export interface EsOptions {
  /** Concordancia femenina: "una", "doscientas". */
  readonly fem?: boolean;
  /** Apócope de "uno" antes de un sustantivo masculino: "un". */
  readonly apo?: boolean;
}

const ES_SMALL = [
  'cero',
  'uno',
  'dos',
  'tres',
  'cuatro',
  'cinco',
  'seis',
  'siete',
  'ocho',
  'nueve',
  'diez',
  'once',
  'doce',
  'trece',
  'catorce',
  'quince',
  'dieciséis',
  'diecisiete',
  'dieciocho',
  'diecinueve',
  'veinte',
  'veintiuno',
  'veintidós',
  'veintitrés',
  'veinticuatro',
  'veinticinco',
  'veintiséis',
  'veintisiete',
  'veintiocho',
  'veintinueve',
];
const ES_TENS = [
  '',
  '',
  '',
  'treinta',
  'cuarenta',
  'cincuenta',
  'sesenta',
  'setenta',
  'ochenta',
  'noventa',
];
const ES_HUNDREDS = [
  '',
  'ciento',
  'doscientos',
  'trescientos',
  'cuatrocientos',
  'quinientos',
  'seiscientos',
  'setecientos',
  'ochocientos',
  'novecientos',
];

function esOne(word: string, o: EsOptions): string {
  // `word` termina en "uno": uno / veintiuno / "treinta y uno".
  if (o.fem) return word.replace(/uno$/, 'una');
  if (o.apo) return word.replace(/uno$/, word === 'uno' ? 'un' : 'ún');
  return word;
}

function es999(n: number, o: EsOptions): string {
  if (n === 100) return 'cien';
  const parts: string[] = [];
  const h = Math.floor(n / 100);
  const r = n % 100;
  if (h > 0) {
    const w = ES_HUNDREDS[h] as string;
    parts.push(o.fem ? w.replace(/ientos$/, 'ientas') : w);
  }
  if (r > 0) {
    if (r < 30) {
      const w = ES_SMALL[r] as string;
      parts.push(r === 1 || r === 21 ? esOne(w, o) : w);
    } else {
      const t = Math.floor(r / 10);
      const u = r % 10;
      const tens = ES_TENS[t] as string;
      parts.push(u === 0 ? tens : `${tens} y ${esOne(ES_SMALL[u] as string, o)}`);
    }
  }
  return parts.join(' ');
}

export function spanishCardinal(n: number, o: EsOptions = {}): string {
  if (n === 0) return 'cero';
  if (n >= 1_000_000) {
    const m = Math.floor(n / 1_000_000);
    const r = n % 1_000_000;
    const head = m === 1 ? 'un millón' : `${spanishCardinal(m, { apo: true })} millones`;
    return r > 0 ? `${head} ${spanishCardinal(r, o)}` : head;
  }
  const th = Math.floor(n / 1000);
  const r = n % 1000;
  const parts: string[] = [];
  if (th > 0) {
    parts.push(th === 1 ? 'mil' : `${es999(th, { fem: o.fem === true, apo: true })} mil`);
  }
  if (r > 0) parts.push(es999(r, o));
  return parts.join(' ');
}

const ES_ORD_UNITS = [
  '',
  'primero',
  'segundo',
  'tercero',
  'cuarto',
  'quinto',
  'sexto',
  'séptimo',
  'octavo',
  'noveno',
];
const ES_ORD_TENS = [
  '',
  'décimo',
  'vigésimo',
  'trigésimo',
  'cuadragésimo',
  'quincuagésimo',
  'sexagésimo',
  'septuagésimo',
  'octogésimo',
  'nonagésimo',
];

/** Ordinal 1–99 en español; `null` si queda fuera (el llamador usa el cardinal). */
export function spanishOrdinal(n: number, fem: boolean): string | null {
  if (!Number.isInteger(n) || n < 1 || n > 99) return null;
  const t = Math.floor(n / 10);
  const u = n % 10;
  const w = [ES_ORD_TENS[t], ES_ORD_UNITS[u]].filter(Boolean).join(' ');
  return fem ? w.replace(/o\b/g, 'a') : w;
}

const EN_SMALL = [
  'zero',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'eleven',
  'twelve',
  'thirteen',
  'fourteen',
  'fifteen',
  'sixteen',
  'seventeen',
  'eighteen',
  'nineteen',
];
const EN_TENS = [
  '',
  '',
  'twenty',
  'thirty',
  'forty',
  'fifty',
  'sixty',
  'seventy',
  'eighty',
  'ninety',
];
const EN_SCALES = ['', 'thousand', 'million', 'billion'];

function en999(n: number): string {
  const parts: string[] = [];
  const h = Math.floor(n / 100);
  const r = n % 100;
  if (h > 0) parts.push(`${EN_SMALL[h]} hundred`);
  if (r > 0) {
    if (r < 20) parts.push(EN_SMALL[r] as string);
    else {
      const u = r % 10;
      parts.push(
        u === 0
          ? (EN_TENS[Math.floor(r / 10)] as string)
          : `${EN_TENS[Math.floor(r / 10)]}-${EN_SMALL[u]}`,
      );
    }
  }
  return parts.join(' ');
}

export function englishCardinal(n: number): string {
  if (n === 0) return 'zero';
  const groups: string[] = [];
  let rest = n;
  let scale = 0;
  while (rest > 0) {
    const g = rest % 1000;
    if (g > 0) groups.unshift(`${en999(g)}${scale > 0 ? ` ${EN_SCALES[scale]}` : ''}`);
    rest = Math.floor(rest / 1000);
    scale += 1;
  }
  return groups.join(' ');
}

const EN_ORD_IRREGULAR: Readonly<Record<string, string>> = {
  one: 'first',
  two: 'second',
  three: 'third',
  five: 'fifth',
  eight: 'eighth',
  nine: 'ninth',
  twelve: 'twelfth',
};

export function englishOrdinal(n: number): string {
  const card = englishCardinal(n);
  return card.replace(/([a-z]+)$/, (last: string) => {
    const irregular = EN_ORD_IRREGULAR[last];
    if (irregular) return irregular;
    if (last.endsWith('y')) return `${last.slice(0, -1)}ieth`;
    return `${last}th`;
  });
}

/** Año hablado en inglés: 1999 → "nineteen ninety-nine", 2005 → "two thousand five". */
export function englishYear(y: number): string {
  if (y >= 2000 && y <= 2009)
    return y === 2000 ? 'two thousand' : `two thousand ${englishCardinal(y - 2000)}`;
  if (y < 1000 || y > 9999) return englishCardinal(y);
  const hi = Math.floor(y / 100);
  const lo = y % 100;
  if (lo === 0) return `${englishCardinal(hi)} hundred`;
  if (lo < 10) return `${englishCardinal(hi)} oh ${englishCardinal(lo)}`;
  return `${englishCardinal(hi)} ${englishCardinal(lo)}`;
}

export function spellDigits(digits: string, lang: NumberLang): string {
  const names = lang === 'es' ? ES_SMALL : EN_SMALL;
  return [...digits].map((d) => names[Number(d)] ?? d).join(' ');
}

export function cardinal(n: number, lang: NumberLang, o: EsOptions = {}): string {
  return lang === 'es' ? spanishCardinal(n, o) : englishCardinal(n);
}
