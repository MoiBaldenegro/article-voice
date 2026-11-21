# Handoff

- #29 (Release en rojo) arreglado: la publicación a npm ahora es opt-in del dueño. `pnpm release` → `scripts/release.mjs`, que sale en verde sin publicar salvo que la variable del repo `NPM_PUBLISH_ENABLED` sea `true` (release.yml la pasa por env). nightly.yml solo publica si además esa variable es `true`. No se tocaron pasos de CI.
- Para activar publicación (solo el dueño): configurar Trusted Publishing en npmjs.com (paquete article-voice, repo MoiBaldenegro/article-voice, workflow release.yml/nightly.yml, entorno npm-publish), añadir un changeset que suba a 0.1.0 y crear la variable `NPM_PUBLISH_ENABLED=true`.
- Siguiente paso: #28 (q4 en WebGPU con KV en GPU y WebNN).
