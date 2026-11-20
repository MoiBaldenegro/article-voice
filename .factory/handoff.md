# Handoff

- Hecho (constructor, issue #3): intento del informe T-000. No se pudo ejecutar: faltan los pesos de MOSS-TTS-Nano (no están en el repo) y las mediciones requieren Chrome real con WebGPU. Terminó como needs-human; no se escribió informe ni se tocó ADR-0018.
- Estado: sin cambios de código. Los issues #4–#9 siguen abiertos.
- Siguiente paso: una persona descarga los pesos, corre `spikes/t000-moss-browser` (reference.py, node-parity.ts, bench-browser.ts) en Chrome con WebGPU y aporta los números; con ellos se redacta `docs/03-arquitectura/spikes/T-000-informe.md` (directorio aún no existe) y se acepta ADR-0018.
