// TextNormalizer (RN-11): dominio puro. Convierte a palabras números, ordinales,
// porcentajes, monedas, fechas, horas y abreviaturas comunes; lee las URLs solo por
// su dominio; elimina emojis y símbolos sin pronunciación. Solo es/en convierten
// números; otros idiomas reciben únicamente la limpieza (URLs, emojis, símbolos).

import type { LanguageCode } from './value-objects/Language.js';
import {
  MAX_SPELLABLE,
  type NumberLang,
  cardinal,
  englishOrdinal,
  englishYear,
  spanishCardinal,
  spanishOrdinal,
  spellDigits,
} from './number-words.js';

const ES_MONTHS = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];
const EN_MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const ES_ABBREVIATIONS: ReadonlyArray<readonly [RegExp, string]> = [
  [/\bp\. ?ej\.?/gi, 'por ejemplo'],
  [/\bSra\./g, 'señora'],
  [/\bSr\./g, 'señor'],
  [/\bSrta\./g, 'señorita'],
  [/\bDra\./g, 'doctora'],
  [/\bDr\./g, 'doctor'],
  [/\bProf\./g, 'profesor'],
  [/\bUds\./g, 'ustedes'],
  [/\bUd\./g, 'usted'],
  [/\baprox\./gi, 'aproximadamente'],
  [/\bpág\./gi, 'página'],
  [/\bpágs\./gi, 'páginas'],
  [/\bnúm\./gi, 'número'],
  [/\bvs\./gi, 'versus'],
  [/\betc\./gi, 'etcétera'],
];
const EN_ABBREVIATIONS: ReadonlyArray<readonly [RegExp, string]> = [
  [/\be\.g\.?/gi, 'for example'],
  [/\bi\.e\.?/gi, 'that is'],
  [/\bMrs\./g, 'missus'],
  [/\bMr\./g, 'mister'],
  [/\bMs\./g, 'miz'],
  [/\bDr\./g, 'doctor'],
  [/\bProf\./g, 'professor'],
  [/\bapprox\./gi, 'approximately'],
  [/\bvs\./gi, 'versus'],
  [/\bno\. ?(?=\d)/gi, 'number '],
  [/\betc\./gi, 'et cetera'],
];

/** Sustantivos femeninos acabados en -a que NO deben hacer concordar al numeral. */
const ES_MASCULINE_AS = /^(d[ií]as?|mapas?|temas?|problemas?|sistemas?|idiomas?|programas?)$/i;

/** Palabras que, tras un numeral, no son el sustantivo contado (no hay apócope). */
const ES_FUNCTION_WORDS = /^(de|del|y|o|a|al|en|con|por|para|que|se|es|son|fue|más|menos)$/i;

function isSpellable(n: number): boolean {
  return Number.isSafeInteger(n) && n >= 0 && n <= MAX_SPELLABLE;
}

interface ParsedNumber {
  readonly int: string;
  readonly frac: string | undefined;
}

function parseNumber(token: string, lang: NumberLang): ParsedNumber | null {
  const thousands = lang === 'es' ? '\\.' : ',';
  const decimal = lang === 'es' ? ',' : '\\.';
  const grouped = new RegExp(`^(\\d{1,3}(?:${thousands}\\d{3})+)(?:${decimal}(\\d+))?$`);
  const plain = new RegExp(`^(\\d+)(?:${decimal}(\\d+))?$`);
  const m = grouped.exec(token) ?? plain.exec(token);
  if (!m) return null;
  return { int: (m[1] as string).replace(/[.,]/g, ''), frac: m[2] };
}

export class TextNormalizer {
  normalize(text: string, lang: LanguageCode): string {
    let out = text.normalize('NFC');
    out = this.stripUrls(out, lang);
    if (lang === 'es' || lang === 'en') {
      out = this.dates(out, lang);
      out = this.times(out, lang);
      out = this.money(out, lang);
      out = this.percents(out, lang);
      out = this.ordinals(out, lang);
      out = this.abbreviations(out, lang);
      out = this.numbers(out, lang);
    }
    out = this.stripSymbols(out, lang);
    return out.replace(/\s+/g, ' ').trim();
  }

  // --- URLs -----------------------------------------------------------------

  private stripUrls(text: string, lang: LanguageCode): string {
    const dot = lang === 'es' ? 'punto' : 'dot';
    return text.replace(/\bhttps?:\/\/[^\s<>"]+/gi, (url) => {
      const trailing = /[.,;:!?)\]»”'"]+$/.exec(url)?.[0] ?? '';
      const body = url.slice(0, url.length - trailing.length);
      const host = (body.replace(/^https?:\/\//i, '').split(/[/?#]/)[0] ?? '')
        .replace(/^[^@]*@/, '')
        .replace(/:\d+$/, '')
        .replace(/^www\./i, '');
      const spoken = host.split('.').filter(Boolean).join(` ${dot} `).replace(/[-_]/g, ' ');
      return `${spoken}${trailing}`;
    });
  }

  // --- Fechas ---------------------------------------------------------------

  private dateWords(y: number, mo: number, d: number, lang: NumberLang): string {
    if (lang === 'es') {
      const day = d === 1 ? 'primero' : spanishCardinal(d, { apo: true });
      return `${day} de ${ES_MONTHS[mo - 1]} de ${spanishCardinal(y)}`;
    }
    return `${EN_MONTHS[mo - 1]} ${englishOrdinal(d)}, ${englishYear(y)}`;
  }

  private dates(text: string, lang: NumberLang): string {
    const valid = (y: number, mo: number, d: number): boolean =>
      mo >= 1 && mo <= 12 && d >= 1 && d <= 31 && y >= 1000;
    return text
      .replace(
        /(?<![\d/-])(\d{4})-(\d{2})-(\d{2})(?![\d/-])/g,
        (all, y: string, mo: string, d: string) =>
          valid(+y, +mo, +d) ? this.dateWords(+y, +mo, +d, lang) : all,
      )
      .replace(
        /(?<![\d/.-])(\d{1,2})\/(\d{1,2})\/(\d{4})(?![\d/])/g,
        (all, a: string, b: string, y: string) => {
          const [d, mo] = lang === 'es' ? [+a, +b] : [+b, +a];
          return valid(+y, mo, d) ? this.dateWords(+y, mo, d, lang) : all;
        },
      );
  }

  // --- Horas ----------------------------------------------------------------

  private times(text: string, lang: NumberLang): string {
    return text.replace(
      /(?<![\d:])(\d{1,2}):(\d{2})(?![\d:])(?:\s?([ap])\.?m\.?(?![a-z]))?/gi,
      (all, h: string, mi: string, ap: string | undefined) => {
        const hour = +h;
        const min = +mi;
        if (hour > 23 || min > 59) return all;
        if (lang === 'es') {
          const art = hour === 1 ? 'la' : 'las';
          const hourWord = spanishCardinal(hour, { fem: true });
          if (min === 0) return `${art} ${hourWord} en punto`;
          return `${art} ${hourWord} y ${spanishCardinal(min)}`;
        }
        const suffix = ap ? ` ${ap.toLowerCase()} m` : '';
        const hw = englishCardinal0(hour);
        if (min === 0) return ap ? `${hw}${suffix}` : hour === 0 ? 'zero hundred' : `${hw} o'clock`;
        const mw = min < 10 ? `oh ${englishCardinal0(min)}` : englishCardinal0(min);
        return `${hw} ${mw}${suffix}`;
      },
    );
  }

  // --- Monedas --------------------------------------------------------------

  private money(text: string, lang: NumberLang): string {
    const cur: Record<string, readonly [string, string, string, string]> =
      lang === 'es'
        ? {
            $: ['dólar', 'dólares', 'centavo', 'centavos'],
            '€': ['euro', 'euros', 'céntimo', 'céntimos'],
            '£': ['libra', 'libras', 'penique', 'peniques'],
          }
        : {
            $: ['dollar', 'dollars', 'cent', 'cents'],
            '€': ['euro', 'euros', 'cent', 'cents'],
            '£': ['pound', 'pounds', 'penny', 'pence'],
          };
    const build = (symbol: string, amount: string): string | null => {
      const names = cur[symbol];
      const parsed = parseNumber(amount, lang);
      if (!names || !parsed) return null;
      const whole = Number(parsed.int);
      if (!isSpellable(whole)) return null;
      const w = cardinal(whole, lang, { apo: true });
      let result = `${w} ${whole === 1 ? names[0] : names[1]}`;
      if (parsed.frac && /[1-9]/.test(parsed.frac)) {
        const cents = Number(parsed.frac.padEnd(2, '0').slice(0, 2));
        const c = cardinal(cents, lang, { apo: true });
        result += `${lang === 'es' ? ' con' : ' and'} ${c} ${cents === 1 ? names[2] : names[3]}`;
      }
      return result;
    };
    const num = '\\d+(?:[.,]\\d+)*';
    return text
      .replace(new RegExp(`([$€£])\\s?(${num})`, 'g'), (all, s: string, n: string) => {
        const trimmed = n.replace(/[.,]$/, '');
        return build(s, trimmed) ?? all;
      })
      .replace(
        new RegExp(`(?<![\\d.,])(${num})\\s?([€£])`, 'g'),
        (all, n: string, s: string) => build(s, n) ?? all,
      );
  }

  // --- Porcentajes ----------------------------------------------------------

  private percents(text: string, lang: NumberLang): string {
    return text.replace(/(\d+(?:[.,]\d+)*)\s?%/g, (all, n: string) => {
      const words = this.numberWords(n, lang, {});
      if (words === null) return all;
      return `${words} ${lang === 'es' ? 'por ciento' : 'percent'}`;
    });
  }

  // --- Ordinales ------------------------------------------------------------

  private ordinals(text: string, lang: NumberLang): string {
    if (lang === 'es') {
      return text.replace(
        /(?<![\d.,])(\d{1,3})\.?\s?([ºª°])(?![\p{L}\d])/gu,
        (all, n: string, g: string) => {
          const word = spanishOrdinal(+n, g === 'ª');
          return word ?? all;
        },
      );
    }
    return text.replace(/(?<![\d.,])(\d{1,6})(st|nd|rd|th)\b/gi, (all, n: string) => {
      const v = Number(n);
      return v > 0 ? englishOrdinal(v) : all;
    });
  }

  // --- Abreviaturas ---------------------------------------------------------

  private abbreviations(text: string, lang: NumberLang): string {
    const table = lang === 'es' ? ES_ABBREVIATIONS : EN_ABBREVIATIONS;
    return table.reduce((acc, [re, word]) => acc.replace(re, word), text);
  }

  // --- Números --------------------------------------------------------------

  private numberWords(
    token: string,
    lang: NumberLang,
    o: { fem?: boolean; apo?: boolean },
  ): string | null {
    const parsed = parseNumber(token, lang);
    if (!parsed) return null;
    const whole = Number(parsed.int);
    if (!isSpellable(whole)) return spellDigits(parsed.int, lang);
    const intWords = cardinal(whole, lang, parsed.frac === undefined ? o : {});
    if (parsed.frac === undefined) return intWords;
    const point = lang === 'es' ? 'coma' : 'point';
    const f = parsed.frac;
    const fracWords =
      f.startsWith('0') || f.length > 9 ? spellDigits(f, lang) : cardinal(Number(f), lang, {});
    return `${intWords} ${point} ${fracWords}`;
  }

  private numbers(text: string, lang: NumberLang): string {
    return text.replace(
      /((?<=^|[\s(¿¡])-)?(?<![\p{L}\d])(\d+(?:[.,]\d+)*)(?!\d)/gu,
      (all: string, minus: string | undefined, token: string, offset: number) => {
        const next = /^\s+(\p{L}+)/u.exec(text.slice(offset + all.length))?.[1];
        const opts =
          lang === 'es' && next && !ES_FUNCTION_WORDS.test(next)
            ? { fem: /as$/i.test(next) && !ES_MASCULINE_AS.test(next), apo: true }
            : {};
        // Formato raro (p. ej. "1.2.3"): leer cada grupo por separado.
        const words =
          this.numberWords(token, lang, opts) ??
          token
            .split(/[.,]/)
            .map((g) => this.numberWords(g, lang, {}) ?? g)
            .join(' ');
        const sign = minus ? (lang === 'es' ? 'menos ' : 'minus ') : '';
        return `${sign}${words}`;
      },
    );
  }

  // --- Emojis y símbolos ----------------------------------------------------

  private stripSymbols(text: string, lang: LanguageCode): string {
    const and = lang === 'es' ? ' y ' : lang === 'en' ? ' and ' : ' ';
    return text
      .replace(/\p{Extended_Pictographic}|\p{Emoji_Modifier}|\u{FE0F}|\u{200D}|\u{20E3}/gu, ' ')
      .replace(/&/g, and)
      .replace(/[*#_~^|\\<>{}[\]=•·●▪■□◆◇★☆→←↑↓©®™]/g, ' ');
  }
}

function englishCardinal0(n: number): string {
  return cardinal(n, 'en');
}
