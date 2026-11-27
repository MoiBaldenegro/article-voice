# Handoff

- #53: landing actualizada y verificada. `pnpm verify` en verde (26 suites, 359 pruebas) y `pnpm test:landing` en verde (5 pruebas).
  - Archivos tocados: `docs/04-diseno/ui/landing/landing.html`, `docs/04-diseno/ui/landing/README.md`, `test/landing/landing.pw.ts`.
  - CDN real anunciado: `https://cdn.jsdelivr.net/npm/article-voice@0.1/dist/index.js` (npm `0.1.0` publicado). Ya no se anuncia `@1/dist/cdn` ni el entrypoint `auto`.
  - Se añadió sección «Qué incluye la 0.1.0», banner de publicación, roadmap actualizado y cifras RTF de T-035; se corrigió el tamaño del script (≈28 kB gzip). Fix de scroll horizontal en móvil con `.hero > * { min-width: 0; }`.
- Siguiente paso concreto: el README raíz aún dice «pre-lanzamiento / el paquete aún no se ha publicado en npm» (desactualizado) y el contrato promete un atributo `target` que no está en `observedAttributes`. Abordar esos dos puntos (ver nextIssues del resultado).
