import { ValueObject } from './ValueObject.js';

class Rate extends ValueObject<{ value: number }> {
  static of(value: number): Rate {
    return new Rate({ value });
  }
}
class Other extends ValueObject<{ value: number }> {
  static of(value: number): Other {
    return new Other({ value });
  }
}

describe('ValueObject', () => {
  it('compara por valor', () => {
    expect(Rate.of(1).equals(Rate.of(1))).toBe(true);
    expect(Rate.of(1).equals(Rate.of(2))).toBe(false);
  });

  it('no es igual a otro tipo ni a null', () => {
    expect(Rate.of(1).equals(Other.of(1) as unknown as Rate)).toBe(false);
    expect(Rate.of(1).equals(null)).toBe(false);
  });
});
