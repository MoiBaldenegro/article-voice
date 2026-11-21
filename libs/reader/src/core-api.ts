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
  SegmentHighlighter,
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
export { VoiceId } from './core/domain/value-objects/VoiceId.js';
export { EngineKind } from './core/domain/value-objects/EngineKind.js';
export { HttpsUrl } from './core/domain/value-objects/HttpsUrl.js';
export { SelectEngine, SYSTEM_VOICE_LABEL } from './core/application/SelectEngine.use-case.js';
export type {
  FallbackEvent,
  FallbackReason,
  SelectEngineInput,
  SelectEngineOutput,
  ServerProbe,
} from './core/application/SelectEngine.use-case.js';
export { Segmenter } from './core/domain/Segmenter.js';
export type { SegmenterBlock } from './core/domain/Segmenter.js';
export { Language } from './core/domain/value-objects/Language.js';
export type { LanguageCode } from './core/domain/value-objects/Language.js';
export { PlaybackRate } from './core/domain/value-objects/PlaybackRate.js';
export { NarrationRegistry } from './core/application/NarrationRegistry.js';
export { NarrationSession } from './core/application/NarrationSession.js';
export {
  PauseNarration,
  PlayNarration,
  ResumeNarration,
  SeekNarration,
  StopNarration,
} from './core/application/narration.use-cases.js';
