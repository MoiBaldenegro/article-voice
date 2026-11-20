import { DomainValidationError, ResourceNotFoundError } from './errors.js';

describe('errores de dominio', () => {
  it('conservan code, details, cause y recoverable', () => {
    const cause = new Error('x');
    const e = new DomainValidationError('AV_INVALID_OPTION', 'bad', {
      details: { name: 'rate' },
      cause,
      recoverable: true,
    });
    expect(e).toBeInstanceOf(Error);
    expect(e.name).toBe('DomainValidationError');
    expect(e.code).toBe('AV_INVALID_OPTION');
    expect(e.details).toEqual({ name: 'rate' });
    expect(e.cause).toBe(cause);
    expect(e.recoverable).toBe(true);
  });

  it('recoverable es false por defecto', () => {
    expect(new ResourceNotFoundError('AV_ARTICLE_NOT_FOUND', 'm').recoverable).toBe(false);
  });
});
