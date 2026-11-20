// Composición: une la UI con los adaptadores reales (ui no importa infrastructure).
import { BrowserDeviceCapabilities } from './infrastructure/device/BrowserDeviceCapabilities.js';
import { createHttpServerProbe } from './infrastructure/net/HttpServerProbe.js';
import { ArticleVoiceElement } from './ui/ArticleVoiceElement.js';

/** Elemento con probe HTTP y capacidades reales; así se registra `<article-voice>`. */
export class ComposedArticleVoiceElement extends ArticleVoiceElement {
  override probe = createHttpServerProbe();
  override capabilities = new BrowserDeviceCapabilities();
}

export function defineArticleVoice(registry: CustomElementRegistry = customElements): void {
  if (!registry.get('article-voice')) registry.define('article-voice', ComposedArticleVoiceElement);
}
