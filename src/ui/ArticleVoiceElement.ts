// <article-voice>: plantilla (play/pausa/detener), atributos → configuración, métodos, eventos y
// propiedades de solo lectura (docs/…/contrato-api-publica). `ui` no importa infraestructura: los
// adaptadores (fuente del DOM, motores, salida de audio) los inyecta `src/compose.ts` o las pruebas.

import {
  Article,
  DetectArticle,
  DomainError,
  ResourceNotFoundError,
  EngineKind,
  HttpsUrl,
  Language,
  MinWords,
  Narration,
  NarrationRegistry,
  PauseNarration,
  PlaybackRate,
  PlayNarration,
  ResumeNarration,
  SelectEngine,
  SeekNarration,
  Segmenter,
  StopNarration,
  VoiceId,
  type ArticleSource,
  type AudioOutput,
  type DeviceCapabilities,
  type FallbackEvent,
  type NarrationSession,
  type SegmentHighlighter,
  type SelectEngineOutput,
  type ServerProbe,
  type SpeechEngine,
} from '../../libs/reader/src/core-api.js';
import { localStoragePreferences, type PreferencesStore } from './preferences.js';
import { messagesFor, resolveUiLanguage, type Messages } from './i18n/index.js';

const STYLES = `
:host { display: inline-block; font-family: var(--av-font, system-ui, sans-serif); color: var(--av-text, #1a1a1a); }
:host([hidden]) { display: none; }
[part="root"] { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; min-height: 44px; padding: 4px 8px; background: var(--av-surface, #fff); border: 1px solid var(--av-border, #d0d0d0); border-radius: var(--av-radius, 8px); }
[part="controls"] { display: flex; gap: 8px; }
button { min-height: 36px; padding: 0 14px; font: inherit; color: #fff; background: var(--av-accent, #0b5fff); border: 0; border-radius: var(--av-radius, 8px); cursor: pointer; }
button:hover:not(:disabled) { background: var(--av-accent-hover, #0847c4); }
button:disabled { opacity: 0.6; cursor: not-allowed; }
button:focus-visible { outline: 2px solid var(--av-accent, #0b5fff); outline-offset: 2px; box-shadow: 0 0 0 4px var(--av-surface, #fff); }
[hidden] { display: none !important; }
label { display: inline-flex; align-items: center; gap: 4px; font-size: 0.875rem; }
select { min-height: 36px; font: inherit; color: inherit; background: var(--av-surface, #fff); border: 1px solid var(--av-border, #d0d0d0); border-radius: var(--av-radius, 8px); }
select:focus-visible { outline: 2px solid var(--av-accent, #0b5fff); outline-offset: 2px; }
[part="progress"], [part="meta"] { margin: 0; font-size: 0.875rem; color: var(--av-text-secondary, #595959); }
[part="error"] { margin: 0; font-size: 0.875rem; color: #b00020; }
.sr-only { position: absolute; width: 1px; height: 1px; margin: -1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }
@media (prefers-reduced-motion: reduce) { * { transition: none !important; animation: none !important; } }
`;

const RATE_OPTIONS = [0.75, 1, 1.25, 1.5, 1.75, 2];

export const FALLBACK_EVENT = 'article-voice:fallback';

export interface ActiveEngine {
  readonly kind: SelectEngineOutput['kind'];
  readonly fallback: boolean;
}

export type ArticleVoiceState = 'idle' | 'preparing' | 'playing' | 'paused' | 'ended' | 'error';

export interface ArticleVoiceArticleInfo {
  readonly title?: string;
  readonly language: string;
  readonly words: number;
  readonly durationMs: number;
}

export interface ArticleVoiceProgress {
  readonly segment: number;
  readonly segments: number;
  readonly remainingMs: number;
}

/** Lo que recibe la fábrica de motores: el motor elegido y las opciones de los atributos. */
export interface EngineRequest {
  readonly kind: ActiveEngine['kind'];
  readonly serverUrl?: string;
  readonly modelUrl?: string;
  readonly ortWasmUrl?: string;
  readonly workerUrl?: string;
  readonly language: string;
  readonly rate: number;
}

/** Subconjunto de `navigator.mediaSession` que usa el elemento (inyectable en pruebas). */
export interface MediaSessionLike {
  metadata: unknown;
  playbackState: string;
  setActionHandler(action: string, handler: (() => void) | null): void;
}

const MEDIA_ACTIONS = ['play', 'pause', 'stop', 'previoustrack', 'nexttrack'] as const;

const EMPTY_SOURCE: ArticleSource = { candidates: () => [], extract: () => undefined };

// Importar el paquete en SSR/Node no debe fallar: sin DOM la clase queda inerte.
const BaseElement = (
  typeof HTMLElement === 'undefined' ? class {} : HTMLElement
) as typeof HTMLElement;

export class ArticleVoiceElement extends BaseElement {
  static readonly observedAttributes = [
    'for',
    'lang',
    'engine',
    'fallback',
    'server-url',
    'model-url',
    'ort-wasm-url',
    'worker-url',
    'voice',
    'rate',
    'min-words',
    'no-highlight',
    'confirm-download',
  ];

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
  articleSource: ArticleSource = EMPTY_SOURCE;
  createEngine: ((request: EngineRequest) => SpeechEngine) | undefined;
  createAudioOutput: (() => AudioOutput) | undefined;
  /** Resalta el segmento en lectura; sin él (o con `no-highlight`) no se resalta nada. */
  highlighter: SegmentHighlighter | undefined;
  /** D�nde se recuerdan velocidad y voz; por defecto localStorage (tolerante a fallos). */
  preferences: PreferencesStore = localStoragePreferences;

  /** Media Session (teclas multimedia, pantalla de bloqueo); por defecto `navigator.mediaSession`. */
  mediaSession: MediaSessionLike | null | undefined;

  readonly #registry = new NarrationRegistry();
  #active: ActiveEngine | null = null;
  #article: Article | null = null;
  #durationMs = 0;
  #narration: Narration | null = null;
  #session: NarrationSession | null = null;
  #engine: SpeechEngine | null = null;
  #audio: AudioOutput | null = null;
  #state: ArticleVoiceState = 'idle';
  #lastCursor = -1;
  #highlighted = -1;
  #userStopped = false;
  #run = 0;
  #parts: {
    root: HTMLElement;
    meta: HTMLElement;
    play: HTMLButtonElement;
    pause: HTMLButtonElement;
    stop: HTMLButtonElement;
    progress: HTMLElement;
    live: HTMLElement;
    alert: HTMLElement;
    speed: HTMLSelectElement;
    speedLabel: HTMLLabelElement;
    voiceSelect: HTMLSelectElement;
    voiceLabel: HTMLLabelElement;
  } | null = null;
  #controls: HTMLElement | null = null;
  #prefRate: number | undefined;
  #prefVoice: string | undefined;
  #errorCode: string | undefined;
  #announced: ArticleVoiceState | null = null;
  #mediaOwned = false;

  /** Resuelve cuando termina la selección de motor y la detección en curso (útil en pruebas). */
  ready: Promise<void> = Promise.resolve();

  // ── Propiedades de solo lectura ──────────────────────────────────────────────────────
  get activeEngine(): ActiveEngine | null {
    return this.#active;
  }
  get state(): ArticleVoiceState {
    return this.#state;
  }
  get article(): ArticleVoiceArticleInfo | null {
    const a = this.#article;
    if (!a) return null;
    return {
      ...(a.title !== undefined ? { title: a.title } : {}),
      language: a.language.value,
      words: a.wordCount,
      durationMs: this.#durationMs,
    };
  }
  get progress(): ArticleVoiceProgress {
    const n = this.#narration;
    const segments = n?.segments.length ?? 0;
    const segment = n ? n.cursor : 0;
    const total = this.#durationMs;
    const remainingMs =
      segments === 0 ? total : Math.round((total * (segments - segment)) / segments);
    return { segment, segments, remainingMs };
  }
  get voices(): ReadonlyArray<{ id: string; name: string; languages: string[] }> {
    if (!this.#engine || !this.#article) return [];
    try {
      return this.#engine.voices().map((v) => ({
        id: v.value,
        name: v.value,
        languages: [this.#article?.language.value ?? ''],
      }));
    } catch {
      return [];
    }
  }

  // ── Propiedades equivalentes a los atributos ─────────────────────────────────────────
  get htmlFor(): string | null {
    return this.getAttribute('for');
  }
  set htmlFor(v: string | null) {
    this.#reflect('for', v);
  }
  get engine(): string {
    return this.getAttribute('engine') ?? 'auto';
  }
  set engine(v: string) {
    this.#reflect('engine', v);
  }
  get fallback(): string {
    return this.getAttribute('fallback') ?? 'web-speech';
  }
  set fallback(v: string) {
    this.#reflect('fallback', v);
  }
  get serverUrl(): string | null {
    return this.getAttribute('server-url');
  }
  set serverUrl(v: string | null) {
    this.#reflect('server-url', v);
  }
  get modelUrl(): string | null {
    return this.getAttribute('model-url');
  }
  set modelUrl(v: string | null) {
    this.#reflect('model-url', v);
  }
  get ortWasmUrl(): string | null {
    return this.getAttribute('ort-wasm-url');
  }
  set ortWasmUrl(v: string | null) {
    this.#reflect('ort-wasm-url', v);
  }
  get workerUrl(): string | null {
    return this.getAttribute('worker-url');
  }
  set workerUrl(v: string | null) {
    this.#reflect('worker-url', v);
  }
  get voice(): string | null {
    return this.getAttribute('voice');
  }
  set voice(v: string | null) {
    this.#reflect('voice', v);
  }
  get rate(): number {
    const raw = this.getAttribute('rate');
    if (raw === null) return PlaybackRate.DEFAULT.value;
    try {
      return PlaybackRate.from(raw).value;
    } catch {
      return PlaybackRate.DEFAULT.value;
    }
  }
  set rate(v: number) {
    this.setAttribute('rate', String(v));
  }
  get minWords(): number {
    const raw = this.getAttribute('min-words');
    if (raw === null) return 120;
    try {
      return MinWords.from(raw).value;
    } catch {
      return 120;
    }
  }
  set minWords(v: number) {
    this.setAttribute('min-words', String(v));
  }
  get noHighlight(): boolean {
    return this.hasAttribute('no-highlight');
  }
  set noHighlight(v: boolean) {
    this.toggleAttribute('no-highlight', Boolean(v));
  }
  get confirmDownload(): string {
    return this.getAttribute('confirm-download') ?? 'always';
  }
  set confirmDownload(v: string) {
    this.#reflect('confirm-download', v);
  }

  // ── Ciclo de vida ────────────────────────────────────────────────────────────────────
  connectedCallback(): void {
    if (!this.shadowRoot) this.#buildTemplate();
    const prefs = this.preferences.load();
    this.#prefRate = prefs.rate !== undefined ? this.#validRate(prefs.rate) : undefined;
    this.#prefVoice = prefs.voice;
    this.#syncSpeed();
    this.#syncUi();
    this.ready = this.#setup();
  }

  disconnectedCallback(): void {
    if (this.#registry.active?.isFinished === false) this.#safe(() => this.stop());
    this.#highlighted = -1;
    this.highlighter?.clear();
    this.#syncMediaSession('idle');
  }

  attributeChangedCallback(name: string, oldValue: string | null, value: string | null): void {
    if (oldValue === value || !this.isConnected || !this.shadowRoot) return;
    if (name === 'rate') {
      this.#prefRate = undefined; // un cambio expl�cito del atributo manda sobre lo recordado
      this.#applyRate();
      return;
    }
    if (name === 'no-highlight') {
      if (this.noHighlight) this.#syncHighlight('idle');
      else this.#syncHighlight(this.#state);
      return;
    }
    if (name === 'voice' || name === 'confirm-download') return;
    this.ready = this.#setup();
  }

  // ── Métodos ──────────────────────────────────────────────────────────────────────────
  /** Resuelve al empezar a sonar. Rechaza con el error del dominio (también emitido). */
  async play(): Promise<void> {
    await this.ready;
    const session = this.#session;
    if (session && !session.isFinished) {
      if (this.#state === 'paused')
        this.#safeThrow(() => new ResumeNarration(this.#registry).execute());
      return;
    }
    try {
      await this.#startNarration();
    } catch (error) {
      const detail = toErrorDetail(error);
      this.#errorCode = detail.code;
      this.#emit('article-voice:error', detail);
      this.#setState('error');
      throw error;
    }
  }

  pause(): void {
    if (this.#state === 'playing') this.#safe(() => new PauseNarration(this.#registry).execute());
  }

  stop(): void {
    if (this.#state === 'playing' || this.#state === 'paused' || this.#state === 'preparing') {
      this.#userStopped = true;
      this.#safe(() => new StopNarration(this.#registry).execute());
    }
  }

  next(): void {
    const n = this.#narration;
    if (n && this.#isActive()) this.#seek(n.cursor + 1);
  }

  previous(): void {
    const n = this.#narration;
    if (n && this.#isActive()) this.#seek(n.cursor - 1);
  }

  /** Vuelve a detectar el artículo (contenido cargado después). */
  async refresh(): Promise<void> {
    this.ready = this.#detect();
    await this.ready;
  }

  // ── Interno ──────────────────────────────────────────────────────────────────────────
  #reflect(name: string, value: string | null): void {
    if (value === null) this.removeAttribute(name);
    else this.setAttribute(name, value);
  }

  #isActive(): boolean {
    return this.#state === 'playing' || this.#state === 'paused';
  }

  #seek(index: number): void {
    const n = this.#narration;
    if (!n || index < 0 || index >= n.segments.length) return;
    this.#safe(() => new SeekNarration(this.#registry).execute(index));
  }

  #safe(fn: () => void): void {
    try {
      fn();
    } catch (error) {
      this.#emit('article-voice:error', toErrorDetail(error));
    }
  }

  #safeThrow(fn: () => void): void {
    try {
      fn();
    } catch (error) {
      this.#emit('article-voice:error', toErrorDetail(error));
      throw error;
    }
  }

  #buildTemplate(): void {
    const root = this.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = STYLES;
    const wrapper = document.createElement('div');
    wrapper.setAttribute('part', 'root');
    const controls = document.createElement('div');
    controls.setAttribute('part', 'controls');
    controls.setAttribute('role', 'group');
    const button = (part: string, onClick: () => void): HTMLButtonElement => {
      const b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('part', part);
      b.addEventListener('click', onClick);
      return b;
    };
    const play = button('play', () => {
      void this.play().catch(() => undefined);
    });
    const pause = button('pause', () => this.pause());
    const stop = button('stop', () => this.stop());
    const progress = document.createElement('div');
    progress.setAttribute('part', 'progress');
    const meta = document.createElement('p');
    meta.setAttribute('part', 'meta');
    meta.hidden = true;
    // Región en vivo siempre presente: anuncia cada cambio de estado una sola vez.
    const live = document.createElement('div');
    live.setAttribute('role', 'status');
    live.setAttribute('aria-live', 'polite');
    live.setAttribute('aria-atomic', 'true');
    live.className = 'sr-only';
    const alert = document.createElement('p');
    alert.setAttribute('part', 'error');
    alert.hidden = true;
    const speed = document.createElement('select');
    speed.setAttribute('part', 'speed');
    for (const v of RATE_OPTIONS) speed.append(new Option(`${v}�`, String(v)));
    speed.addEventListener('change', () => this.#chooseRate(Number(speed.value)));
    const speedLabel = document.createElement('label');
    speedLabel.setAttribute('part', 'speed-label');
    const speedText = document.createElement('span');
    speedLabel.append(speedText, speed);
    const voiceSelect = document.createElement('select');
    voiceSelect.setAttribute('part', 'voice');
    voiceSelect.addEventListener('change', () => this.#chooseVoice(voiceSelect.value));
    const voiceLabel = document.createElement('label');
    voiceLabel.setAttribute('part', 'voice-label');
    voiceLabel.hidden = true;
    voiceLabel.append(document.createElement('span'), voiceSelect);
    controls.append(play, pause, stop);
    wrapper.append(controls, speedLabel, voiceLabel, progress, meta, alert, live);
    root.append(style, wrapper);
    this.#parts = {
      root: wrapper,
      meta,
      play,
      pause,
      stop,
      progress,
      live,
      alert,
      speed,
      speedLabel,
      voiceSelect,
      voiceLabel,
    };
    this.#controls = controls;
  }

  async #setup(): Promise<void> {
    const run = ++this.#run;
    await this.#selectEngine(run);
    if (run !== this.#run) return;
    if (this.articleSource !== EMPTY_SOURCE) await this.#detect();
  }

  async #selectEngine(run: number): Promise<void> {
    this.#active = null;
    this.#syncUi();
    try {
      const engine = this.#option(() => EngineKind.from(this.getAttribute('engine') ?? 'auto'));
      const fallback = this.getAttribute('fallback') === 'none' ? 'none' : 'web-speech';
      const rawUrl = this.getAttribute('server-url');
      const serverUrl = rawUrl
        ? this.#option(() => HttpsUrl.of(rawUrl, 'server-url').value)
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
      this.#syncUi();
      for (const detail of events) this.#emit(FALLBACK_EVENT, detail);
    } catch (error) {
      if (run !== this.#run) return;
      this.#emit('article-voice:error', toErrorDetail(error));
    }
  }

  async #detect(): Promise<void> {
    try {
      const minWords = this.#option(() => MinWords.from(this.getAttribute('min-words') ?? '120'));
      const rate = this.#option(() => PlaybackRate.from(this.getAttribute('rate') ?? '1'));
      const explicitId = this.getAttribute('for') ?? undefined;
      const lang = this.getAttribute('lang') || undefined;
      const out = new DetectArticle(this.articleSource).execute({
        ...(explicitId ? { explicitId } : {}),
        ...(minWords ? { minWords } : {}),
        ...(rate ? { rate } : {}),
        ...(lang ? { language: lang } : {}),
      });
      this.#article = out.article;
      this.#durationMs = out.estimatedDurationMs;
      this.#syncUi();
      if (out.warnings.length > 0) {
        this.#emit('article-voice:error', {
          code: 'AV_INPUT_TOO_LARGE',
          message: 'El artículo supera el límite y se recortó',
        });
      }
      this.#emit('article-voice:ready', { article: this.article });
    } catch (error) {
      this.#article = null;
      this.#syncUi();
      this.#emit('article-voice:error', toErrorDetail(error));
    }
  }

  async #startNarration(): Promise<void> {
    if (!this.#article) await this.#detect();
    const article = this.#article;
    if (!article) {
      throw new ResourceNotFoundError('AV_ARTICLE_NOT_FOUND', 'No hay artículo que leer', {
        recoverable: true,
      });
    }
    const active = this.#active;
    if (!active)
      throw new ResourceNotFoundError('AV_ENGINE_UNAVAILABLE', 'Ningún motor disponible');
    if (!this.createEngine || !this.createAudioOutput) {
      throw new ResourceNotFoundError(
        'AV_ENGINE_UNAVAILABLE',
        'El elemento no tiene motor ni salida de audio',
      );
    }
    const rate = this.#effectiveRate();

    this.#disposeResources();
    this.#setState('preparing');
    const serverUrl = this.getAttribute('server-url');
    const modelUrl = this.getAttribute('model-url');
    const ortWasmUrl = this.getAttribute('ort-wasm-url');
    const workerUrl = this.getAttribute('worker-url');
    const engine = this.createEngine({
      kind: active.kind,
      ...(serverUrl ? { serverUrl } : {}),
      ...(modelUrl ? { modelUrl } : {}),
      ...(ortWasmUrl ? { ortWasmUrl } : {}),
      ...(workerUrl ? { workerUrl } : {}),
      language: article.language.value,
      rate: rate.value,
    });
    this.#engine = engine;
    await engine.prepare();
    const wanted = this.#prefVoice ?? this.getAttribute('voice');
    const available = engine.voices();
    this.#syncVoices(available.map((v) => v.value));
    const voice =
      (wanted ? available.find((v) => v.value === wanted) : undefined) ??
      available[0] ??
      VoiceId.of('default');

    const segments = new Segmenter().segment(
      article.blocks,
      Language.of(article.language.value).value,
    );
    const narration = new Narration({
      id: `av-${Date.now()}`,
      segments,
      voice,
      rate,
      engine: EngineKind.of(active.kind),
      isFallback: active.fallback,
    });
    this.#narration = narration;
    this.#lastCursor = -1;
    this.#userStopped = false;
    const audio = this.createAudioOutput();
    this.#audio = audio;
    const play = new PlayNarration(this.#registry, engine, audio);
    const session = await this.#play(play, narration);
    this.#session = session;
  }

  async #play(play: PlayNarration, narration: Narration): Promise<NarrationSession> {
    // La sesión se crea dentro de execute(); nos suscribimos en cuanto queda registrada.
    const pending = play.execute(narration);
    const session = this.#registry.active;
    if (session) {
      this.#session = session;
      session.onChange(() => this.#onSessionChange());
      this.#onSessionChange();
    }
    return pending;
  }

  #onSessionChange(): void {
    const n = this.#narration;
    if (!n) return;
    let state: ArticleVoiceState;
    switch (n.state) {
      case 'idle':
        state = 'idle';
        break;
      case 'stopped':
        state = this.#userStopped ? 'idle' : 'ended';
        break;
      default:
        state = n.state;
    }
    if (n.cursor !== this.#lastCursor && (state === 'playing' || state === 'paused')) {
      this.#lastCursor = n.cursor;
      this.#emit('article-voice:segment', { index: n.cursor, segments: n.segments.length });
    }
    if (n.state === 'error') {
      this.#errorCode = n.errorCode;
      this.#emit('article-voice:error', {
        code: n.errorCode ?? 'AV_UNKNOWN',
        message: 'La narración falló',
      });
    }
    this.#syncHighlight(state);
    this.#setState(state);
    if (state === 'ended') this.#emit('article-voice:ended', {});
  }

  #syncHighlight(state: ArticleVoiceState): void {
    const n = this.#narration;
    const h = this.highlighter;
    if (!h) return;
    const spans = n?.segments[n.cursor]?.spans;
    if (spans && (state === 'playing' || state === 'paused') && !this.noHighlight) {
      if (this.#highlighted !== n?.cursor) {
        this.#highlighted = n?.cursor ?? -1;
        h.highlight(spans);
      }
    } else if (this.#highlighted !== -1) {
      this.#highlighted = -1;
      h.clear();
    }
  }

  #setState(state: ArticleVoiceState): void {
    const previous = this.#state;
    if (state === previous) {
      this.#syncUi();
      return;
    }
    this.#state = state;
    this.#syncMediaSession(state);
    this.#syncUi();
    this.#emit('article-voice:statechange', { state, previous });
  }

  #syncMediaSession(state: ArticleVoiceState): void {
    const session =
      this.mediaSession !== undefined
        ? this.mediaSession
        : typeof navigator !== 'undefined' && 'mediaSession' in navigator
          ? (navigator.mediaSession as unknown as MediaSessionLike)
          : null;
    if (!session) return;
    const active = state === 'playing' || state === 'paused';
    try {
      if (!active) {
        if (this.#mediaOwned) {
          this.#mediaOwned = false;
          session.metadata = null;
          session.playbackState = 'none';
          for (const a of MEDIA_ACTIONS) session.setActionHandler(a, null);
        }
        return;
      }
      if (!this.#mediaOwned) {
        this.#mediaOwned = true;
        const title =
          this.#article?.title || (typeof document !== 'undefined' ? document.title : '');
        if (typeof MediaMetadata !== 'undefined') {
          session.metadata = new MediaMetadata({
            title: title || 'article-voice',
            artist: typeof location !== 'undefined' ? location.hostname : '',
          });
        }
        const handlers: Record<(typeof MEDIA_ACTIONS)[number], () => void> = {
          play: () => void this.play().catch(() => undefined),
          pause: () => this.pause(),
          stop: () => this.stop(),
          previoustrack: () => this.previous(),
          nexttrack: () => this.next(),
        };
        for (const a of MEDIA_ACTIONS) session.setActionHandler(a, handlers[a]);
      }
      session.playbackState = state === 'playing' ? 'playing' : 'paused';
    } catch {
      // Acciones no soportadas por el navegador: la Media Session es opcional.
    }
  }

  #applyRate(): void {
    const n = this.#narration;
    const rate = this.#effectiveRate();
    this.#syncSpeed();
    if (n) {
      n.setRate(rate);
      this.#audio?.setRate(rate.value);
    }
  }

  #validRate(v: number): number | undefined {
    try {
      return PlaybackRate.from(v).value;
    } catch {
      return undefined; // valor recordado fuera de RN-08: se ignora sin error
    }
  }

  /** Lo recordado manda sobre el atributo; un atributo inv�lido emite AV_INVALID_OPTION. */
  #effectiveRate(): PlaybackRate {
    if (this.#prefRate !== undefined) return PlaybackRate.from(this.#prefRate);
    return (
      this.#option(() => PlaybackRate.from(this.getAttribute('rate') ?? '1')) ??
      PlaybackRate.DEFAULT
    );
  }

  #chooseRate(value: number): void {
    const rate = this.#validRate(value);
    if (rate === undefined) return;
    this.#prefRate = rate;
    this.preferences.save({ rate });
    this.#applyRate();
  }

  #chooseVoice(value: string): void {
    if (value === '') return;
    this.#prefVoice = value; // se aplica en la siguiente narraci�n
    this.preferences.save({ voice: value });
  }

  #syncSpeed(): void {
    const speed = this.#parts?.speed;
    if (!speed) return;
    const current = this.#prefRate ?? this.#attrRate();
    speed.value = String(current);
  }

  #attrRate(): number {
    const raw = this.getAttribute('rate');
    return (raw === null ? undefined : this.#validRate(Number(raw))) ?? PlaybackRate.DEFAULT.value;
  }

  #syncVoices(ids: readonly string[]): void {
    const p = this.#parts;
    if (!p) return;
    const sel = p.voiceSelect;
    sel.replaceChildren(...ids.map((id) => new Option(id, id)));
    const chosen = this.#prefVoice ?? this.getAttribute('voice');
    if (chosen && ids.includes(chosen)) sel.value = chosen;
    p.voiceLabel.hidden = ids.length < 2;
  }

  #disposeResources(): void {
    this.#engine?.dispose();
    this.#audio?.close();
    this.#engine = null;
    this.#audio = null;
  }

  /** Un atributo inválido emite AV_INVALID_OPTION y se usa el valor por defecto. */
  #option<T>(parse: () => T): T | undefined {
    try {
      return parse();
    } catch (error) {
      this.#emit('article-voice:error', toErrorDetail(error));
      return undefined;
    }
  }

  #messages(): Messages {
    return messagesFor(
      resolveUiLanguage(
        this.#article?.language.value,
        this.getAttribute('lang'),
        typeof document === 'undefined' ? undefined : document.documentElement.lang,
      ),
    );
  }

  #syncUi(): void {
    const p = this.#parts;
    if (!p) return;
    const t = this.#messages();
    const s = this.#state;
    const fallback = this.#active?.fallback === true;
    p.meta.textContent = fallback ? t.fallback : '';
    p.meta.hidden = !fallback;
    const canPlay = this.#article !== null && this.#active !== null;
    p.play.hidden = s === 'playing' || s === 'preparing';
    p.play.disabled = !canPlay;
    p.play.textContent = s === 'paused' ? t.resume : t.play;
    p.pause.textContent = t.pause;
    p.stop.textContent = t.stop;
    p.speedLabel.firstElementChild!.textContent = t.speed;
    p.voiceLabel.firstElementChild!.textContent = t.voice;
    p.speed.disabled = s === 'preparing';
    p.pause.hidden = s !== 'playing';
    p.stop.hidden = s !== 'playing' && s !== 'paused' && s !== 'preparing';
    this.#controls?.setAttribute('aria-label', t.group);
    p.root.setAttribute('aria-busy', String(s === 'preparing'));
    const { segment, segments } = this.progress;
    p.progress.textContent = segments > 0 ? `${segment + 1}/${segments}` : '';
    if (segments > 0) p.progress.setAttribute('title', t.progress(segment + 1, segments));
    else p.progress.removeAttribute('title');
    p.alert.textContent = s === 'error' ? (t.errors[this.#errorCode ?? ''] ?? t.genericError) : '';
    p.alert.hidden = s !== 'error';
    p.root.dataset['state'] = s;
    // Anuncio único por estado: solo playing, paused y error (HU-09 CA-2).
    if (s !== this.#announced) {
      this.#announced = s;
      p.live.textContent =
        s === 'error' ? p.alert.textContent : s === 'playing' || s === 'paused' ? t.state[s] : '';
    }
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
