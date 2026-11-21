// Composición: une la UI con los adaptadores reales (ui no importa infrastructure).
import { BrowserDeviceCapabilities } from './infrastructure/device/BrowserDeviceCapabilities.js';
import { WebAudioOutput } from './infrastructure/audio/WebAudioOutput.js';
import { DomArticleSource } from './infrastructure/dom/DomArticleSource.js';
import { HighlightApiHighlighter } from './infrastructure/dom/HighlightApiHighlighter.js';
import { MossServerEngine } from './infrastructure/engines/MossServerEngine.js';
import { WebSpeechEngine } from './infrastructure/engines/WebSpeechEngine.js';
import { createHttpServerProbe } from './infrastructure/net/HttpServerProbe.js';
import { ArticleVoiceElement, type EngineRequest } from './ui/ArticleVoiceElement.js';
import type { SpeechEngine } from '../libs/reader/src/core-api.js';

function engineFor(request: EngineRequest): SpeechEngine {
  if (request.kind === 'moss-server' && request.serverUrl) {
    return new MossServerEngine({ serverUrl: request.serverUrl, speed: request.rate });
  }
  // moss-browser es experimental y aún no se cablea al elemento: cae a la voz del sistema.
  return new WebSpeechEngine({ language: request.language, rate: request.rate });
}

/** Elemento con probe HTTP, capacidades, DOM, motores y audio reales. */
export class ComposedArticleVoiceElement extends ArticleVoiceElement {
  override probe = createHttpServerProbe();
  override capabilities = new BrowserDeviceCapabilities();
  override articleSource = new DomArticleSource(document);
  override highlighter = new HighlightApiHighlighter(this.articleSource, document);
  override createEngine = engineFor;
  override createAudioOutput = () => new WebAudioOutput();
}

/** Registra `<article-voice>` (o `tagName`) si el nombre está libre. */
export function defineArticleVoice(
  tagName = 'article-voice',
  registry: CustomElementRegistry = customElements,
): void {
  if (!registry.get(tagName)) registry.define(tagName, ComposedArticleVoiceElement);
}
