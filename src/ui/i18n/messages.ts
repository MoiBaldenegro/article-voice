export type UiState = 'idle' | 'preparing' | 'playing' | 'paused' | 'ended' | 'error';

/** Textos de la interfaz del elemento en un idioma. */
export interface Messages {
  readonly group: string;
  readonly play: string;
  readonly resume: string;
  readonly pause: string;
  readonly stop: string;
  readonly speed: string;
  readonly voice: string;
  readonly progress: (segment: number, segments: number) => string;
  readonly state: Readonly<Record<UiState, string>>;
  /** Aviso cuando suena el motor de respaldo (RN-13). */
  readonly fallback: string;
  readonly errors: Readonly<Record<string, string>>;
  readonly genericError: string;
}
