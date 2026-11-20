import { DomainValidationError } from '../exceptions/errors.js';

/** Error AV_INVALID_OPTION con `details.name` y `details.reason` (catálogo de errores). */
export function invalidOption(name: string, reason: string, value: unknown): DomainValidationError {
  return new DomainValidationError('AV_INVALID_OPTION', `Opción inválida "${name}": ${reason}`, {
    details: { name, reason, value },
    recoverable: true,
  });
}
