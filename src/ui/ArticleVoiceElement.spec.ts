/**
 * @jest-environment jsdom
 */
import { ArticleVoiceElement, FALLBACK_EVENT } from './ArticleVoiceElement.js';

customElements.define('article-voice', ArticleVoiceElement);

function make(attrs: Record<string, string>, speech = true): ArticleVoiceElement {
  const el = document.createElement('article-voice') as ArticleVoiceElement;
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  el.capabilities = {
    detect: async () => ({
      webgpu: false,
      wasmThreads: false,
      estimatedMemoryMb: undefined,
      speechSynthesis: speech,
    }),
  };
  return el;
}

describe('<article-voice> arranque con SelectEngine', () => {
  it('servidor caído: activeEngine web-speech con fallback, etiqueta visible y evento', async () => {
    const el = make({ 'server-url': 'http://localhost:9/' });
    el.probe = async () => false;
    const events: CustomEvent[] = [];
    document.addEventListener(FALLBACK_EVENT, (e) => events.push(e as CustomEvent), {
      once: true,
    });
    document.body.append(el);
    await el.ready;

    expect(el.activeEngine).toEqual({ kind: 'web-speech', fallback: true });
    const meta = el.shadowRoot?.querySelector('[part="meta"]') as HTMLElement;
    expect(meta.hidden).toBe(false);
    expect(meta.textContent).toBe('Se usa la voz del sistema');
    expect(events).toHaveLength(1);
    expect(events[0]?.detail).toMatchObject({
      reason: 'server-unreachable',
      to: 'web-speech',
      label: 'voz del sistema',
    });
    expect(events[0]?.bubbles && events[0]?.composed).toBe(true);
    el.remove();
  });

  it('servidor vivo: moss-server sin respaldo ni etiqueta', async () => {
    const el = make({ 'server-url': 'http://localhost:9/' });
    el.probe = async () => true;
    document.body.append(el);
    await el.ready;
    expect(el.activeEngine).toEqual({ kind: 'moss-server', fallback: false });
    expect((el.shadowRoot?.querySelector('[part="meta"]') as HTMLElement).hidden).toBe(true);
    el.remove();
  });

  it('fallback="none" con servidor caído: article-voice:error AV_ENGINE_UNAVAILABLE', async () => {
    const el = make({ 'server-url': 'http://localhost:9/', fallback: 'none' });
    el.probe = async () => false;
    const errors: CustomEvent[] = [];
    el.addEventListener('article-voice:error', (e) => errors.push(e as CustomEvent));
    document.body.append(el);
    await el.ready;
    expect(el.activeEngine).toBeNull();
    expect(errors[0]?.detail.code).toBe('AV_ENGINE_UNAVAILABLE');
    el.remove();
  });

  it('server-url inválido: AV_INVALID_OPTION y sigue con el respaldo', async () => {
    const el = make({ 'server-url': 'http://ejemplo.com/' });
    const errors: CustomEvent[] = [];
    el.addEventListener('article-voice:error', (e) => errors.push(e as CustomEvent));
    document.body.append(el);
    await el.ready;
    expect(errors[0]?.detail.code).toBe('AV_INVALID_OPTION');
    expect(el.activeEngine).toEqual({ kind: 'web-speech', fallback: true });
    el.remove();
  });
});
