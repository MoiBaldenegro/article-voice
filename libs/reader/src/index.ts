export { ValueObject } from './core/domain/value-objects/ValueObject.js';
export {
  DomainError,
  DomainValidationError,
  InvalidStateTransitionError,
  ResourceNotFoundError,
} from './core/domain/exceptions/errors.js';
export type { DomainErrorOptions } from './core/domain/exceptions/errors.js';
export { createCore } from './reader-core.js';
export type { Core, CoreOptions } from './reader-core.js';
