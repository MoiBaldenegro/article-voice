// ArticleVoiceElement (parcial, T-052): solo el arranque con selección de motor.
// Al conectarse elige el motor con SelectEngine (CU-06), expone `activeEngine`, muestra la
// etiqueta "voz del sistema" cuando suena el respaldo (RN-13) y re-emite el FallbackEvent como
// `article-voice:fallback`. La plantilla completa, los atributos restantes y la reproducción
// llegan con T-041/T-042.

import {
  DomainError,
  EngineKind,
  HttpsUrl,
  SelectEngine,
  type DeviceCapabilities,
  type FallbackEvent,
  type SelectEngineOutput,
  type ServerProbe,
} from '../../libs/reader/src/index.js';

export const FALLBACK_EVENT = 'article-voice:fallback';

export interface ActiveEngine {
  readonly kind: SelectEngineOutput['kind'];
  readonly fallback: boolean;
}

export class ArticleVoiceElement extends HTMLElement {
  static readonly observedAttributes = ['engine', 'fallback', 'server-url'];

  /** Inyectados por la composición (`src/compose.ts`) o por las pruebas. */
  probe: ServerProbe = async () => false;
  capabilities: DeviceCapabilities = {
    detect: async () => ({
      webgpu: false,
      wasmThreads: false,
      estimatedMemoryMb: undefined,
      speechSynthesis: false,
    }),
  };

  #active: ActiveEngine | null = null;
  #meta: HTMLElement | undefined;
  #run = 0;

  get activeEngine(): ActiveEngine | null {
    return this.#active;
  }

  /** Resuelve cuando termina la selección de motor en curso (útil en pruebas). */
  ready: Promise<void> = Promise.resolve();

  connectedCallback(): void {
    if (!this.shadowRoot) {
      const root = this.attachShadow({ mode: 'open' });
      const meta = document.createElement('p');
      meta.setAttribute('part', 'meta');
      meta.setAttribute('role', 'status');
      meta.hidden = true;
      root.append(meta);
      this.#meta = meta;
    }
    this.ready = this.#selectEngine();
  }

  attributeChangedCallback(): void {
    if (this.isConnected && this.shadowRoot) this.ready = this.#selectEngine();
  }

  async #selectEngine(): Promise<void> {
    const run = ++this.#run;
    this.#active = null;
    this.#render(undefined);
    try {
      const engine = this.#option('engine', () =>
        EngineKind.from(this.getAttribute('engine') ?? 'auto'),
      );
      const fallbackAttr = this.getAttribute('fallback');
      const fallback = fallbackAttr === 'none' ? 'none' : 'web-speech';
      const rawUrl = this.getAttribute('server-url');
      const serverUrl = rawUrl
        ? this.#option('server-url', () => HttpsUrl.of(rawUrl, 'server-url').value)
        : undefined;

      const events: FallbackEvent[] = [];
      const out = await new SelectEngine(this.capabilities, this.probe, (e) =>
        events.push(e),
      ).execute({
        ...(engine ? { engine } : {}),
        ...(serverUrl ? { serverUrl } : {}),
        fallback,
      });
      if (run !== this.#run) return; // llegó una selección más nueva
      this.#active = { kind: out.kind, fallback: out.fallback };
      this.#render(out.label);
      for (const detail of events) this.#emit(FALLBACK_EVENT, detail);
    } catch (error) {
      if (run !== this.#run) return;
      this.#emit('article-voice:error', toErrorDetail(error));
    }
  }

  /** Un atributo inválido emite AV_INVALID_OPTION y se usa el valor por defecto. */
  #option<T>(name: string, parse: () => T): T | undefined {
    try {
      return parse();
    } catch (error) {
      this.#emit('article-voice:error', toErrorDetail(error));
      void name;
      return undefined;
    }
  }

  #render(label: string | undefined): void {
    if (!this.#meta) return;
    this.#meta.textContent = label ?? '';
    this.#meta.hidden = label === undefined;
  }

  #emit(type: string, detail: unknown): void {
    this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
  }
}

function toErrorDetail(error: unknown): { code: string; message: string; details?: unknown } {
  if (error instanceof DomainError) {
    return {
      code: error.code,
      message: error.message,
      ...(error.details ? { details: error.details } : {}),
    };
  }
  return { code: 'AV_UNKNOWN', message: error instanceof Error ? error.message : String(error) };
}
