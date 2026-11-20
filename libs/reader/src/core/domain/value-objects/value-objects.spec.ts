import { DomainValidationError } from '../exceptions/errors.js';
import { EngineKind } from './EngineKind.js';
import { HttpsUrl } from './HttpsUrl.js';
import { Language } from './Language.js';
import { MinWords } from './MinWords.js';
import { PlaybackRate } from './PlaybackRate.js';
import { VoiceId } from './VoiceId.js';

function codeOf(fn: () => unknown): string {
  try {
    fn();
  } catch (e) {
    expect(e).toBeInstanceOf(DomainValidationError);
    return (e as DomainValidationError).code;
  }
  throw new Error('no lanzó');
}

describe('PlaybackRate', () => {
  it.each([0.75, 1, 1.25, 1.5, 2])('acepta %s', (v) => {
    expect(PlaybackRate.of(v).value).toBe(v);
  });
  it.each([0.5, 0.8, 2.25, 1.1, Number.NaN, Infinity])('rechaza %s', (v) => {
    expect(codeOf(() => PlaybackRate.of(v))).toBe('AV_INVALID_OPTION');
  });
  it('from parsea texto y compara por valor', () => {
    expect(PlaybackRate.from('1.25').equals(PlaybackRate.of(1.25))).toBe(true);
    expect(codeOf(() => PlaybackRate.from(''))).toBe('AV_INVALID_OPTION');
    expect(codeOf(() => PlaybackRate.from('abc'))).toBe('AV_INVALID_OPTION');
  });
  it('tiene valor por defecto 1', () => {
    expect(PlaybackRate.DEFAULT.value).toBe(1);
  });
});

describe('MinWords', () => {
  it.each([1, 120, 10000])('acepta %s', (v) => {
    expect(MinWords.of(v).value).toBe(v);
  });
  it.each([0, -1, 10001, 1.5, Number.NaN])('rechaza %s', (v) => {
    expect(codeOf(() => MinWords.of(v))).toBe('AV_INVALID_OPTION');
  });
  it('from parsea texto', () => {
    expect(MinWords.from(' 50 ').value).toBe(50);
    expect(codeOf(() => MinWords.from('5x'))).toBe('AV_INVALID_OPTION');
    expect(codeOf(() => MinWords.from(''))).toBe('AV_INVALID_OPTION');
  });
});

describe('VoiceId', () => {
  it('acepta ids válidos', () => {
    expect(VoiceId.of('es-female-1').value).toBe('es-female-1');
    expect(VoiceId.from(' abc ').value).toBe('abc');
    expect(VoiceId.of('a'.repeat(64)).value).toHaveLength(64);
  });
  it.each(['', 'A', 'a b', 'a_b', 'a'.repeat(65)])('rechaza %j', (v) => {
    expect(codeOf(() => VoiceId.of(v))).toBe('AV_INVALID_OPTION');
  });
});

describe('EngineKind', () => {
  it.each(['auto', 'moss-browser', 'moss-server', 'web-speech'])('acepta %s', (v) => {
    expect(EngineKind.of(v).value).toBe(v);
  });
  it('from normaliza mayúsculas y espacios', () => {
    expect(EngineKind.from(' Web-Speech ').value).toBe('web-speech');
  });
  it('rechaza desconocidos', () => {
    expect(codeOf(() => EngineKind.of('cloud'))).toBe('AV_INVALID_OPTION');
    expect(codeOf(() => EngineKind.of(''))).toBe('AV_INVALID_OPTION');
  });
  it('por defecto es auto', () => {
    expect(EngineKind.DEFAULT.value).toBe('auto');
  });
});

describe('HttpsUrl', () => {
  it('acepta https y http en localhost', () => {
    expect(HttpsUrl.of('https://example.com/model').value).toBe('https://example.com/model');
    expect(HttpsUrl.of('http://localhost:8080/tts').value).toBe('http://localhost:8080/tts');
    expect(HttpsUrl.of('http://127.0.0.1:3000').value).toBe('http://127.0.0.1:3000/');
  });
  it.each(['http://example.com', 'ftp://example.com', 'javascript:alert(1)', 'nope', ''])(
    'rechaza %j',
    (v) => {
      expect(codeOf(() => HttpsUrl.of(v))).toBe('AV_INVALID_OPTION');
    },
  );
  it('rechaza credenciales sin filtrarlas en details', () => {
    try {
      HttpsUrl.of('https://user:secret@example.com');
    } catch (e) {
      const err = e as DomainValidationError;
      expect(err.code).toBe('AV_INVALID_OPTION');
      expect(JSON.stringify(err.details)).not.toContain('secret');
      return;
    }
    throw new Error('no lanzó');
  });
  it('reporta el nombre de la opción', () => {
    try {
      HttpsUrl.of('http://x.com', 'server-url');
    } catch (e) {
      expect((e as DomainValidationError).details?.name).toBe('server-url');
      return;
    }
    throw new Error('no lanzó');
  });
});

describe('Language', () => {
  it('acepta soportados y normaliza a la base', () => {
    expect(Language.from('es-MX').value).toBe('es');
    expect(Language.from('EN_us').value).toBe('en');
    expect(Language.of('fr').equals(Language.from('fr-CA'))).toBe(true);
  });
  it.each(['xx', '', 'klingon'])('rechaza %j con AV_UNSUPPORTED_LANGUAGE', (v) => {
    expect(codeOf(() => Language.from(v))).toBe('AV_UNSUPPORTED_LANGUAGE');
  });
});
