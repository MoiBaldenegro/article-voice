# Ejemplo: Astro

```sh
pnpm build           # en la raíz, una vez
cd examples/astro
pnpm install --ignore-workspace
pnpm dev          # http://localhost:4321
```

El `import 'article-voice'` va en un `<script>` de cliente de la página, no en el frontmatter,
porque registra un elemento del navegador.
