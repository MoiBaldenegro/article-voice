# Ejemplos

| Ejemplo | Arranque |
| --- | --- |
| [html](html) | `npx serve examples/html` |
| [astro](astro) | `cd examples/astro && pnpm install --ignore-workspace && pnpm dev` |
| [react](react) | `cd examples/react && pnpm install --ignore-workspace && pnpm dev` |
| [moss-server](moss-server) | `ALLOWED_ORIGINS=http://localhost:5173 node examples/moss-server/server.mjs` |

Astro y React enlazan el paquete local (`"article-voice": "link:../.."`), así que hay que correr
`pnpm build` en la raíz antes. `pnpm test:examples` instala ambos ejemplos, los arranca y comprueba
con Playwright que el elemento se registra y detecta el artículo.
