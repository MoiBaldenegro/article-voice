#!/usr/bin/env sh
# Arma el sitio de GitHub Pages a partir de la maqueta de la landing (fuente única).
# La maqueta se escribe sin <html>/<head>/<body>; aquí se le pone el esqueleto.
set -eu
src="docs/04-diseno/ui/landing/landing.html"
out="${1:-_site}"
mkdir -p "$out"
{
  printf '<!doctype html>\n<html lang="es">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
  sed -n '1,/<\/style>/p' "$src"
  printf '</head>\n<body>\n'
  sed '1,/<\/style>/d' "$src"
  printf '</body>\n</html>\n'
} > "$out/index.html"
touch "$out/.nojekyll"
echo "landing en $out/index.html"
