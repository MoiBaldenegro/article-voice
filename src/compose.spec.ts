/**
 * @jest-environment jsdom
 */
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { defineArticleVoice, ComposedArticleVoiceElement } from './compose.js';
import { createHttpServerProbe } from './infrastructure/net/HttpServerProbe.js';

describe('composición de <article-voice>', () => {
  it('con un servidor falso caído cae a la voz del sistema y emite el evento', async () => {
    defineArticleVoice();
    const server = createServer();
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
    const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/`;
    await new Promise((r) => server.close(r));

    const el = document.createElement('article-voice') as ComposedArticleVoiceElement;
    el.setAttribute('server-url', url);
    // jsdom no trae fetch: simulamos el rechazo de red (ECONNREFUSED) del servidor caído.
    el.probe = createHttpServerProbe({
      fetch: (() => Promise.reject(new TypeError('fetch failed'))) as typeof fetch,
    });
    Object.defineProperty(globalThis, 'speechSynthesis', { value: {}, configurable: true });
    const seen: CustomEvent[] = [];
    el.addEventListener('article-voice:fallback', (e) => seen.push(e as CustomEvent));
    document.body.append(el);
    await el.ready;

    expect(el.activeEngine).toEqual({ kind: 'web-speech', fallback: true });
    expect(seen[0]?.detail.reason).toBe('server-unreachable');
    expect(el.shadowRoot?.querySelector('[part="meta"]')?.textContent).toBe('voz del sistema');
    el.remove();
  });
});
