import { ValueObject } from './ValueObject.js';
import { invalidOption } from './invalid-option.js';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

/** URL `https:` (o `http://localhost` en desarrollo). Sin credenciales embebidas. */
export class HttpsUrl extends ValueObject<{ value: string }> {
  static of(value: string, name = 'url'): HttpsUrl {
    if (typeof value !== 'string') throw invalidOption(name, 'debe ser texto', value);
    let url: URL;
    try {
      url = new URL(value.trim());
    } catch {
      throw invalidOption(name, 'no es una URL válida', value);
    }
    const isHttps = url.protocol === 'https:';
    const isLocalHttp = url.protocol === 'http:' && LOCAL_HOSTS.has(url.hostname);
    if (!isHttps && !isLocalHttp) {
      throw invalidOption(name, 'debe usar https (o http://localhost en desarrollo)', value);
    }
    if (url.username !== '' || url.password !== '') {
      throw invalidOption(name, 'no puede incluir credenciales', '[redactado]');
    }
    return new HttpsUrl({ value: url.href });
  }

  static from(raw: string, name = 'url'): HttpsUrl {
    return HttpsUrl.of(raw, name);
  }

  get value(): string {
    return this.props.value;
  }
}
