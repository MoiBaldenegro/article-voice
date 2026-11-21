// Preferencias del lector (velocidad y voz) recordadas en el navegador (HU-13).
// Tolerante a fallos: sin localStorage, bloqueado, lleno o con datos corruptos no lanza.

export const PREFERENCES_KEY = 'article-voice:preferences:v1';

export interface Preferences {
  readonly rate?: number;
  readonly voice?: string;
}

export interface PreferencesStore {
  load(): Preferences;
  save(patch: Preferences): void;
}

function storage(): Storage | undefined {
  try {
    return typeof localStorage === 'undefined' ? undefined : localStorage;
  } catch {
    return undefined; // acceso denegado (p. ej. cookies bloqueadas)
  }
}

export function parsePreferences(raw: string | null | undefined): Preferences {
  if (!raw) return {};
  try {
    const data: unknown = JSON.parse(raw);
    if (typeof data !== 'object' || data === null) return {};
    const { rate, voice } = data as Record<string, unknown>;
    return {
      ...(typeof rate === 'number' && Number.isFinite(rate) ? { rate } : {}),
      ...(typeof voice === 'string' && voice !== '' ? { voice } : {}),
    };
  } catch {
    return {};
  }
}

export const localStoragePreferences: PreferencesStore = {
  load(): Preferences {
    try {
      return parsePreferences(storage()?.getItem(PREFERENCES_KEY));
    } catch {
      return {};
    }
  },
  save(patch: Preferences): void {
    try {
      const s = storage();
      if (!s) return;
      const merged = { ...parsePreferences(s.getItem(PREFERENCES_KEY)), ...patch };
      s.setItem(PREFERENCES_KEY, JSON.stringify(merged));
    } catch {
      // cuota llena o acceso denegado: la preferencia solo vale para esta página
    }
  },
};
