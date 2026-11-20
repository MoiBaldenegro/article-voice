# Handoff

- Issue #3 (T-000) hecho: informe en `docs/03-arquitectura/spikes/T-000-informe.md` con datos medidos (Chrome 157, RTX 4060 Ti); ADR-0018 aceptado (opción C, commits fijados); ticket y backlog marcados hechos. `pnpm verify` verde (208 tests).
- Resultado clave: paridad exacta de frames TS=Python; en navegador RTF WASM 4 hilos 1,85, WASM 1 hilo 3,0, WebGPU 10,6; WebGPU con KV en GPU falla por memoria. No se cumple RNF-PERF-11.
- CA-5 parcial: solo tamaño de la cuantizada (168 MiB); su velocidad/calidad no se midió (otro contrato de grafos).
- Siguiente paso: T-022 (`PlayNarration`, etc., ver issues abiertos #8/#9 ya planeados); y un spike de seguimiento para CA-5/optimización WASM.
- Para repetir el bench: `out/servir/` tiene junctions a los pesos con el layout que espera `serve.ts`; `node src/bench-browser.ts out/servir out/golden/golden.json out/x.json "" <configs>`. Ojo con servidores viejos en el puerto 8787.
