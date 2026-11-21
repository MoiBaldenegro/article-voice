export * from './core-api.js';
export { ArticleVoiceElement } from '../../../src/ui/ArticleVoiceElement.js';
export type {
  ActiveEngine,
  ArticleVoiceState,
  ArticleVoiceArticleInfo,
  ArticleVoiceProgress,
} from '../../../src/ui/ArticleVoiceElement.js';
export { defineArticleVoice } from '../../../src/compose.js';
import { defineArticleVoice } from '../../../src/compose.js';

// Registra <article-voice> al importar el módulo si el entorno lo permite.
if (typeof customElements !== 'undefined' && typeof HTMLElement !== 'undefined') {
  defineArticleVoice();
}
