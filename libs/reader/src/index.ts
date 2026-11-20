export { ValueObject } from './core/domain/value-objects/ValueObject.js';
export {
  DomainError,
  DomainValidationError,
  InvalidStateTransitionError,
  ResourceNotFoundError,
} from './core/domain/exceptions/errors.js';
export type { DomainErrorOptions } from './core/domain/exceptions/errors.js';
export { Narration } from './core/domain/Narration.js';
export type { NarrationInit, NarrationAction } from './core/domain/Narration.js';
export { NARRATION_STATES, type NarrationState } from './core/domain/NarrationState.js';
export type {
  AudioChunk,
  AudioOutput,
  DeviceCapabilities,
  DeviceCapabilitiesSnapshot,
  ModelStore,
  SpeechEngine,
  Unsubscribe,
} from './core/domain/outbound/index.js';
export { createCore } from './reader-core.js';
export type { Core, CoreOptions } from './reader-core.js';
