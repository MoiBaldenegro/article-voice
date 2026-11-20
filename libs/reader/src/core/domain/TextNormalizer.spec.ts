import { TextNormalizer } from './TextNormalizer.js';
import { englishCardinal, englishOrdinal, spanishCardinal } from './number-words.js';

const n = new TextNormalizer();

describe('number-words', () => {
  it.each([
    [0, 'cero'],
    [21, 'veintiuno'],
    [100, 'cien'],
    [101, 'ciento uno'],
    [1000, 'mil'],
    [2026, 'dos mil veintiséis'],
    [1_000_000, 'un millón'],
    [2_500_000, 'dos millones quinientos mil'],
  ])('es %i → %s', (v, w) => {
    expect(spanishCardinal(v)).toBe(w);
  });

  it.each([
    [0, 'zero'],
    [13, 'thirteen'],
    [42, 'forty-two'],
    [1200, 'one thousand two hundred'],
    [1_000_001, 'one million one'],
  ])('en %i → %s', (v, w) => {
    expect(englishCardinal(v)).toBe(w);
  });

  it.each([
    [1, 'first'],
    [2, 'second'],
    [12, 'twelfth'],
    [20, 'twentieth'],
    [21, 'twenty-first'],
  ])('en ordinal %i → %s', (v, w) => {
    expect(englishOrdinal(v)).toBe(w);
  });
});

describe('TextNormalizer es', () => {
  it.each([
    ['El 3,5 % de 1.200 personas', 'El tres coma cinco por ciento de mil doscientas personas'],
    ['Tengo 21 libros y 21 casas', 'Tengo veintiún libros y veintiuna casas'],
    ['Eran 200 días', 'Eran doscientos días'],
    ['Costó 0,05 euros', 'Costó cero coma cero cinco euros'],
    ['Hubo -4 grados', 'Hubo menos cuatro grados'],
    ['Pagó $1.200,50', 'Pagó mil doscientos dólares con cincuenta centavos'],
    ['Cuesta 5 €', 'Cuesta cinco euros'],
    ['Quedó en el 3.º lugar y la 2.ª fila', 'Quedó en el tercero lugar y la segunda fila'],
    ['Nació el 20/11/2026', 'Nació el veinte de noviembre de dos mil veintiséis'],
    ['Fue el 2026-01-01', 'Fue el primero de enero de dos mil veintiséis'],
    ['Sale 15:30 hoy', 'Sale las quince y treinta hoy'],
    ['Sale 1:05 hoy', 'Sale la una y cinco hoy'],
    ['El Dr. López y la Sra. Ruiz', 'El doctor López y la señora Ruiz'],
    ['Frutas, p. ej. manzanas, etc.', 'Frutas, por ejemplo manzanas, etcétera'],
  ])('%s', (input, expected) => {
    expect(n.normalize(input, 'es')).toBe(expected);
  });

  it('lee las URLs solo por su dominio', () => {
    expect(n.normalize('Visita https://example.com/docs/x', 'es')).toBe('Visita example punto com');
    expect(n.normalize('Mira (https://www.sitio.org/a?b=1#c).', 'es')).toBe(
      'Mira (sitio punto org).',
    );
  });

  it('elimina emojis y símbolos sin pronunciación', () => {
    expect(n.normalize('Hola 😀 **mundo** #1 ✨', 'es')).toBe('Hola mundo uno');
  });

  it('colapsa espacios y es idempotente sobre texto ya normalizado', () => {
    const once = n.normalize('  Hola   mundo \n ', 'es');
    expect(once).toBe('Hola mundo');
    expect(n.normalize(once, 'es')).toBe(once);
  });
});

describe('TextNormalizer en', () => {
  it.each([
    ['3.5% of 1,200 people', 'three point five percent of one thousand two hundred people'],
    ['It costs $5.50', 'It costs five dollars and fifty cents'],
    ['It costs $1', 'It costs one dollar'],
    ['The 1st, 2nd and 23rd', 'The first, second and twenty-third'],
    ['On 11/20/2026', 'On November twentieth, twenty twenty-six'],
    ['On 2005-03-01', 'On March first, two thousand five'],
    ['At 3:30 pm', 'At three thirty p m'],
    ['At 9:05', 'At nine oh five'],
    ['At 9:00', "At nine o'clock"],
    ['Mr. Smith vs. Mrs. Jones', 'mister Smith versus missus Jones'],
    ['Fruits, e.g. apples, etc.', 'Fruits, for example apples, et cetera'],
    ['It was -3 degrees', 'It was minus three degrees'],
    ['Tom & Jerry', 'Tom and Jerry'],
  ])('%s', (input, expected) => {
    expect(n.normalize(input, 'en')).toBe(expected);
  });

  it('lee las URLs solo por su dominio', () => {
    expect(n.normalize('See http://docs.example.com/a/b.', 'en')).toBe(
      'See docs dot example dot com.',
    );
  });
});

describe('TextNormalizer otros idiomas', () => {
  it('solo limpia URLs, emojis y símbolos; no convierte números', () => {
    expect(n.normalize('Bonjour 😀 42 https://exemple.fr/x', 'fr')).toBe(
      'Bonjour 42 exemple dot fr',
    );
  });
});
