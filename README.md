# article-voice

**Que cualquier artículo se pueda escuchar.** Un componente web que detecta el artículo de la
página y lo lee en voz alta con [MOSS-TTS-Nano](https://github.com/OpenMOSS/MOSS-TTS-Nano), una voz
neuronal de código abierto que corre **en el navegador del visitante**. Funciona con cualquier
framework o sin ninguno.

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/article-voice@1/dist/cdn/article-voice.js"></script>
<article-voice></article-voice>
```

> **Estado:** documentación y spike de viabilidad (T-000). Todavía no hay versión publicada.
> Ver [docs/README.md](docs/README.md).

## Qué hace

- Encuentra el artículo de la página e ignora menús, barras laterales y pies de página.
- Muestra un botón "Escuchar · 7 min" con pausa, progreso, velocidad y voz.
- Lee con voz natural en 20 idiomas, incluido el español, y resalta la frase que suena.
- **Privado por defecto:** el texto no sale del navegador. La voz se descarga solo cuando el
  visitante pulsa play, con su tamaño a la vista, y queda en caché.
- Si el dispositivo no puede ejecutar el modelo, usa la voz del sistema y lo indica.
- O usa tu propio servidor de voz (`server-url`) y el visitante no descarga nada.

## Mapa de la documentación

- **Por qué existe y para quién:** [visión](docs/01-producto/vision.md), [PRD](docs/01-producto/prd.md)
- **Qué debe hacer:** [requisitos](docs/02-requisitos/srs.md), [historias](docs/02-requisitos/historias-de-usuario.md)
- **Cómo está hecho y por qué:** [SAD](docs/03-arquitectura/sad.md) y [ADRs](docs/03-arquitectura/adr/README.md)
- **API del componente:** [contrato](docs/04-diseno/contrato-api-publica.md) y [errores](docs/04-diseno/catalogo-de-errores.md)
- **Qué se está haciendo:** [backlog](docs/08-tareas/backlog.md)
- **Contribuir:** [CONTRIBUTING.md](CONTRIBUTING.md) · **Seguridad:** [SECURITY.md](SECURITY.md)

## Desarrollo

Requisitos: Node >= 22 (size-limit 14 usa `fs.glob`) y [pnpm](https://pnpm.io).

```sh
pnpm install   # instala dependencias
pnpm test      # corre Jest
pnpm lint      # ESLint, incluidas las reglas de capas (docs/05-estandares/arquitectura-interna.md)
pnpm verify    # typecheck + lint + prettier + tests: lo que debe pasar antes de abrir un PR
```

Todavía no hay build ni componente publicable: solo el núcleo `libs/reader` (T-001/T-002).

## Licencia y atribución

[MIT](LICENSE). Usa el modelo MOSS-TTS-Nano de OpenMOSS Team (Fudan University, SII y MOSI),
publicado bajo Apache-2.0; los pesos se descargan de su repositorio de origen y no se redistribuyen
en este paquete. `article-voice` no es un proyecto oficial de OpenMOSS.
