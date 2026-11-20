# Presupuestos de rendimiento y pruebas de carga

- **Estado:** En revisión · los valores con ⚑ se confirman en el spike T-000 · **Fecha:** 2026-11-20

## Hardware de referencia

| ID | Equipo | Uso |
| --- | --- | --- |
| Ref-D | Portátil de gama media: 4 núcleos, GPU integrada con WebGPU, 8–16 GB, Chrome estable | Objetivo principal |
| Ref-D-wasm | El mismo equipo con WebGPU desactivado | Camino WASM |
| Ref-M | Android de gama media (2024), Chrome estable | Móvil; decide si `auto` usa MOSS en móviles |
| CI | Runner `ubuntu-latest` sin GPU | Regresiones relativas, no valores absolutos |

## Presupuestos del paquete

| ID | Métrica | Presupuesto | Cómo se mide | Falla CI |
| --- | --- | --- | --- | --- |
| RNF-PERF-01 | `dist/index.js` (elemento + núcleo) min+gzip | ≤ 15 kB | size-limit | Sí |
| RNF-PERF-02 | Tarball de npm | ≤ 300 kB (sin pesos ni wasm) | script de CI | Sí |
| RNF-PERF-03 | Coste de importar el módulo en la página | ≤ 5 ms de script en Ref-D | Playwright + trazas | Aviso |
| RNF-PERF-04 | `onnxruntime-web` fuera del bundle principal | 0 bytes de ORT en `dist/index.js` | size-limit (`ignore` falla si aparece) | Sí |
| RNF-PERF-05 | Sin trabajo al importar | 0 peticiones de red, 0 timers | Playwright | Sí |

## Presupuestos de la voz

| ID | Métrica | Objetivo | Cómo se mide |
| --- | --- | --- | --- |
| RNF-PERF-10 | Play → primer audio (modelo en caché) | ≤ 2 s p95 Ref-D WebGPU; ≤ 4 s Ref-D-wasm ⚑ | `performance.now()` entre clic y primer `AudioChunk` reproducido, 20 repeticiones |
| RNF-PERF-11 | RTF (tiempo de síntesis / duración del audio) | ≤ 0.5 WebGPU; ≤ 0.8 WASM ⚑ | Por segmento, mediana y p95 en un artículo de 10 min |
| RNF-PERF-11b | Vacíos de búfer | 0 en 10 min en Ref-D | Contador de underruns del AudioWorklet |
| RNF-PERF-13 | Tareas largas en el hilo principal | 0 > 50 ms | PerformanceObserver `longtask` |
| RNF-PERF-14 | Memoria pico | ⚑ | DevTools |
| RNF-PERF-15 | Preparación del motor con caché (crear sesiones) | ≤ 3 s Ref-D ⚑ | Medido en el worker |

## Pruebas de carga

No hay tráfico propio: la "carga" es un artículo largo. Casos:

- **Artículo largo:** 200 000 caracteres (RN-12) — segmentación ≤ 100 ms, sin tareas largas.
- **Sesión larga:** 60 min de narración — memoria estable (sin crecimiento > 10 % tras el minuto 5).
- **`moss-server`:** con un servidor local, 20 narraciones simultáneas desde 20 pestañas para
  documentar cuánto aguanta un servidor de CPU de referencia (dato para integradores, no un requisito del paquete).

Herramientas: tinybench para dominio (normalizador, segmentador, detector), Playwright para
navegador, y el arnés del spike para la inferencia.
