// HttpServerProbe: ¿responde el servidor de `server-url`? HEAD (y GET si el servidor no admite
// HEAD) con timeout, sin credenciales ni cookies y sin enviar texto del artículo (RNF-PRIV-01).
// Cualquier respuesta HTTP < 500 significa "el servidor está vivo"; red caída, timeout o 5xx → false.

import type { ServerProbe } from '../../../libs/reader/src/index.js';

export interface HttpServerProbeOptions {
  /** Por defecto `globalThis.fetch`. */
  readonly fetch?: typeof fetch;
  readonly timeoutMs?: number;
}

export const DEFAULT_PROBE_TIMEOUT_MS = 3000;

export function createHttpServerProbe(options: HttpServerProbeOptions = {}): ServerProbe {
  const timeoutMs = options.timeoutMs ?? DEFAULT_PROBE_TIMEOUT_MS;
  return async (serverUrl, signal) => {
    const doFetch = options.fetch ?? globalThis.fetch?.bind(globalThis);
    if (!doFetch) return false;

    const controller = new AbortController();
    const onAbort = (): void => controller.abort();
    if (signal?.aborted) return false;
    signal?.addEventListener('abort', onAbort, { once: true });
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      for (const method of ['HEAD', 'GET'] as const) {
        const res = await doFetch(serverUrl, {
          method,
          credentials: 'omit',
          cache: 'no-store',
          redirect: 'error',
          referrerPolicy: 'no-referrer',
          signal: controller.signal,
        });
        if (res.status === 405 || res.status === 501) continue; // HEAD no admitido: probar GET
        return res.status < 500;
      }
      return false;
    } catch {
      return false;
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
    }
  };
}
