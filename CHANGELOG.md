# Changelog

Este archivo lo genera [Changesets](https://github.com/changesets/changesets) al publicar cada
versión ([ADR-0007](docs/03-arquitectura/adr/0007-semver-changesets-y-provenance.md)). No se edita a mano.

El proyecto sigue [SemVer](https://semver.org/lang/es/).

## 0.1.0

Primera versión publicada (a mano; las siguientes las publica el workflow Release).

- `<article-voice>`: detecta el artículo de la página y lo lee en voz alta.
- Motor `moss-server` (MOSS-TTS-Nano en tu servidor) con respaldo `web-speech` y aviso visible.
- Resaltado de la frase, velocidad y voz persistentes, Media Session, estados, i18n es/en y accesibilidad.
- `moss-browser` (MOSS en el navegador) es experimental: aún no llega a tiempo real.
