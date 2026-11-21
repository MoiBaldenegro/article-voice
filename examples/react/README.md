# Ejemplo: React (Vite)

```sh
pnpm build           # en la raíz, una vez
cd examples/react
pnpm install --ignore-workspace
pnpm dev          # http://localhost:5173
```

Con React 19 los elementos personalizados reciben atributos y eventos sin envoltorio. Escucha
`article-voice:*` con `addEventListener` sobre una `ref` si necesitas los eventos.
