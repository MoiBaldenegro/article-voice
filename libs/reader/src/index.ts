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
export { ArticleDetector, densityScore } from './core/domain/ArticleDetector.js';
export type {
  ArticleCandidate,
  DetectInput,
  DetectionResult,
  DetectionRule,
} from './core/domain/ArticleDetector.js';
export type { BlockRef, Segment, TextSpan } from './core/domain/Segment.js';
export { MinWords } from './core/domain/value-objects/MinWords.js';
export { Article, DEFAULT_WPM, MAX_ARTICLE_CHARS } from './core/domain/Article.js';
export type {
  ArticleSource,
  BlockRole,
  ContentBlock,
  ExtractedArticle,
} from './core/domain/outbound/index.js';
export { DetectArticle, DEFAULT_MIN_WORDS } from './core/application/DetectArticle.use-case.js';
export type {
  DetectArticleInput,
  DetectArticleOutput,
} from './core/application/DetectArticle.use-case.js';
