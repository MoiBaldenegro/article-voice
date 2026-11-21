# article-voice

**Que cualquier artículo se pueda escuchar.** Un componente web (`<article-voice>`) que detecta el
artículo de la página y lo lee en voz alta. Funciona con cualquier framework o sin ninguno.

> **Estado: 0.1.0 (pre-lanzamiento).** El paquete aún no se ha publicado en npm: la publicación la
> hace el dueño del repositorio (ver [CONTRIBUTING.md](CONTRIBUTING.md)). Mientras tanto se puede
> construir desde el código fuente (ver [Desarrollo](#desarrollo)). Ver
> [docs/README.md](docs/README.md) y el [backlog](docs/08-tareas/backlog.md).

## Motores de voz

| Motor (`engine`) | Estado | Qué hace |
| --- | --- | --- |
| `moss-server` | **Recomendado** | Voz neuronal [MOSS-TTS-Nano](https://github.com/OpenMOSS/MOSS-TTS-Nano) generada por **tu propio servidor**, compatible con OpenAI `/v1/audio/speech`. El visitante no descarga nada. Requiere `server-url`. |
| `web-speech` | Respaldo | La voz del sistema (`speechSynthesis`). Sin servidor ni descargas; la calidad y los idiomas dependen del dispositivo. |
| `moss-browser` | **Experimental, opt-in** | MOSS en el navegador del visitante. Hoy no llega a tiempo real (RTF 1,93 en WASM; ver ADR-0018) y descarga cientos de MiB. Solo se usa si lo pides con `engine="moss-browser"`; `auto` nunca lo elige. |

Con `engine="auto"` (por defecto) se usa `moss-server` si hay `server-url` y responde; si no, se
usa la voz del sistema y el componente lo indica (evento `article-voice:fallback`). El texto solo
va al servidor que tú configuras, o se queda en el dispositivo; nunca a un tercero.

## Instalar y usar

Con npm:

```sh
npm install article-voice
```

```js
import 'article-voice'; // registra <article-voice>
```

```html
<article-voice server-url="https://tts.example.com"></article-voice>
```

Sin bundler (módulo ES desde un CDN, una vez publicado el paquete):

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/article-voice@0.1/dist/index.js"></script>
<article-voice server-url="https://tts.example.com"></article-voice>
```

Sin `server-url` el componente lee con la voz del sistema. Un artículo concreto se indica con
`for="id"` o `target="selector"`.

### Atributos principales

| Atributo | Valores | Por defecto | Descripción |
| --- | --- | --- | --- |
| `server-url` | URL https | — | Servidor para `moss-server` |
| `engine` | `auto` \| `moss-server` \| `web-speech` \| `moss-browser` | `auto` | Motor preferido |
| `fallback` | `web-speech` \| `none` | `web-speech` | Respaldo si falla el motor |
| `for` / `target` | id / selector CSS | — | Artículo explícito |
| `lang` | BCP 47 | del artículo | Fuerza el idioma |
| `voice` | id de voz | la primera del idioma | Voz |
| `rate` | 0.75–2.0 | 1 | Velocidad |
| `min-words` | entero | 120 | Mínimo de palabras para ofrecer el botón |

Un valor inválido emite `AV_INVALID_OPTION` y se usa el valor por defecto. Lista completa,
propiedades, métodos, eventos y estilos en el
[contrato de la API](docs/04-diseno/contrato-api-publica.md); errores en el
[catálogo](docs/04-diseno/catalogo-de-errores.md). Algunos atributos del contrato (resaltado de la
frase, guía de `moss-server`) aún están en el backlog.

## Documentación

- **Por qué existe y para quién:** [visión](docs/01-producto/vision.md), [PRD](docs/01-producto/prd.md)
- **Qué debe hacer:** [requisitos](docs/02-requisitos/srs.md), [historias](docs/02-requisitos/historias-de-usuario.md)
- **Cómo está hecho y por qué:** [SAD](docs/03-arquitectura/sad.md) y [ADRs](docs/03-arquitectura/adr/README.md)
- **Qué se está haciendo:** [backlog](docs/08-tareas/backlog.md)
- **Contribuir:** [CONTRIBUTING.md](CONTRIBUTING.md) · **Seguridad:** [SECURITY.md](SECURITY.md)

## Desarrollo

Requisitos: Node >= 22 y [pnpm](https://pnpm.io).

```sh
pnpm install        # instala dependencias
pnpm verify         # typecheck + lint + prettier + tests: antes de abrir un PR
pnpm build          # genera dist/ (ESM + tipos)
pnpm test:package   # build + prueba en Chromium de dist/ (requiere `pnpm exec playwright install chromium`)
```

Otros: `pnpm test`, `pnpm lint`, `pnpm api:check`, `pnpm package:lint`, `pnpm size`,
`pnpm test:a11y`, `pnpm test:audio`, `pnpm test:landing`.

## Licencia y atribución

[MIT](LICENSE). Usa el modelo MOSS-TTS-Nano de OpenMOSS Team (Fudan University, SII y MOSI),
publicado bajo Apache-2.0; los pesos no se redistribuyen en este paquete. `article-voice` no es un
proyecto oficial de OpenMOSS.
