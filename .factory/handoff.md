# Handoff

- Issue #3 / T-000 (constructor): **NO completado**. En esta sesión todos los comandos de Bash/PowerShell (node, python, nvidia-smi, git con cd) fueron denegados por falta de superficie de aprobación; solo funcionaron las herramientas de archivos. Sin poder ejecutar nada no se descargaron pesos ni se midió, y no se escribió el informe ni se aceptó ADR-0018 (no se inventan datos).
- Dejé: `spikes/t000-moss-browser/scripts/download-models.mjs` (descarga de HF a `models/` con commit fijo obligatorio y verificación SHA-256 contra `lfs.oid`; escribe `models/manifest.json`; sin probar) y entradas en `.gitignore` (`models/`, `out/`, `.venv/` del spike).
- Siguiente paso (en una sesión que SÍ pueda ejecutar comandos):
  1. `pnpm install` en `spikes/t000-moss-browser`; resolver los commits HEAD actuales de los repos HF (API `https://huggingface.co/api/models/<repo>`, campo `sha`) y correr `node scripts/download-models.mjs <repo>@<sha> ...`.
  2. venv Python 3.13 + `onnxruntime numpy sentencepiece`; correr `reference/reference.py` (ver README del spike) → golden.json.
  3. `node src/node-parity.ts` (CA-1..3) y `node src/bench-browser.ts <pesos> <golden> <out.json>` (webgpu, webgpu-kvgpu, wasm-1hilo, wasm-4hilos-aislado; ídem variante cuantizada, CA-5).
  4. Escribir `docs/03-arquitectura/spikes/T-000-informe.md` (CA-6) y pasar ADR-0018 a Aceptado con commit y manifiesto; actualizar backlog/README de docs.
- Datos previos del humano para contrastar: frames idénticos Node vs WebGPU; CPU RTF ≈ 0,4 (~37 ms/frame); webgpu con KV en CPU 521 ms/frame, RTF 11. Equipo: Windows, RTX 4060 Ti, Chrome con WebGPU.
