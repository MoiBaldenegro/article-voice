# Handoff

- #28 (T-035c) hecho: medido q4+WebGPU+KV GPU (RTF 3,02), WebNN oficial (3,43) y q4 en WebNN (no carga). Ninguno cumple RTF<1; cifras en informe T-000 §9 (puntos 5-7). Spike con backend `webnn` en `spikes/t000-moss-browser/src`.
- Siguiente paso: decidir si se sigue optimizando WASM+worker (mejor 1,18) o se deja moss-browser experimental para 0.1.0.
