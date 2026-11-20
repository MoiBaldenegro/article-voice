import { createCore } from './index.js';

describe('createCore', () => {
  it('devuelve un núcleo vacío sin adaptadores', () => {
    expect(createCore({})).toEqual({});
  });
});
