# Ejemplo: HTML plano

Sin bundler ni dependencias: una etiqueta `<script type="module">` desde el CDN y el elemento.

```sh
npx serve examples/html      # o: python -m http.server -d examples/html 5173
```

Abre la URL que imprima el comando. Sin `server-url` accesible, el componente usa la voz del
sistema. Para usar el build local en vez del CDN, apunta el `src` del script a `dist/index.js`
(tras `pnpm build`).
