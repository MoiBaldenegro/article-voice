// Errores base del dominio (docs/04-diseno/catalogo-de-errores.md).
// `code` es contrato público: AV_ + SCREAMING_SNAKE_CASE, estable para siempre.

export interface DomainErrorOptions {
  readonly details?: Readonly<Record<string, unknown>>;
  readonly cause?: unknown;
  readonly recoverable?: boolean;
}

export abstract class DomainError extends Error {
  readonly code: string;
  readonly details: Readonly<Record<string, unknown>> | undefined;
  readonly recoverable: boolean;

  constructor(code: string, message: string, options: DomainErrorOptions = {}) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = new.target.name;
    this.code = code;
    this.details = options.details;
    this.recoverable = options.recoverable ?? false;
  }
}

export class DomainValidationError extends DomainError {}
export class InvalidStateTransitionError extends DomainError {}
export class ResourceNotFoundError extends DomainError {}
