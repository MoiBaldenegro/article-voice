# Handoff

- #54 (CI en rojo: Landing/GitHub Pages): `deploy-pages` falló con «Multiple artifacts named "github-pages"… count is 2». El workflow solo sube un artefacto, así que el segundo vino de un intento anterior de la misma corrida (re-run): los artefactos de intentos previos siguen visibles.
  - Fix en `.github/workflows/pages.yml`: artefacto `github-pages-${{ github.run_attempt }}` en `upload-pages-artifact` y el mismo `artifact_name` en `deploy-pages`. No se saltó ni desactivó ningún paso.
  - Verificado: Prettier OK en el workflow. No se pudo correr en Actions desde aquí (sin actionlint ni gh).
- Siguiente paso concreto: tras publicar, confirmar que la corrida «Landing (GitHub Pages)» de main queda en verde; si vuelve a fallar en el primer intento, revisar si otro job/workflow sube `github-pages`. Pendiente aparte: #52 (landing móvil).
