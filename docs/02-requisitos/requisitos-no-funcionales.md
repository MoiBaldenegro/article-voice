# Requisitos no funcionales

- **Estado:** En revisión · los umbrales marcados con ⚑ se confirman con el spike T-000 · **Fecha:** 2026-11-20

Hardware de referencia: ver [rendimiento](../06-calidad/rendimiento.md#hardware-de-referencia).

| ID | Categoría | Requisito | Medida | Verificación |
| --- | --- | --- | --- | --- |
| RNF-PERF-01…05 | Tamaño e importación | Presupuestos de [rendimiento](../06-calidad/rendimiento.md) | — | size-limit, Playwright |
| RNF-PERF-10 | Latencia | Tiempo desde play hasta el primer audio con el modelo en caché | ≤ 2 s p95 en Ref-D con WebGPU; ≤ 4 s en WASM ⚑ | benchmark del spike y nocturno |
| RNF-PERF-11 | Fluidez | Sin cortes: la síntesis va por delante de la reproducción | RTF ≤ 0.5 con WebGPU y ≤ 0.8 con WASM en Ref-D ⚑; 0 vacíos de búfer en un artículo de 10 min | nocturno + manual |
| RNF-PERF-12 | Peso de la página | El JS que se carga con la página (sin el worker ni ORT) | ≤ 15 kB min+gzip | size-limit |
| RNF-PERF-13 | Hilo principal | Durante la reproducción, el componente no causa tareas largas | 0 tareas > 50 ms atribuibles al componente | Playwright + PerformanceObserver |
| RNF-PERF-14 | Memoria | Memoria pico del worker durante la narración | ≤ ⚑ (se fija en el spike) | DevTools / `performance.measureUserAgentSpecificMemory` |
| RNF-NET-01 | Red | Recursos del modelo descargados antes del primer play | 0 bytes | Playwright (intercepción de peticiones) |
| RNF-NET-02 | Red | Descarga del motor por defecto | ≤ 200 MB ⚑ (ADR-0018) | manifiesto |
| RNF-NET-03 | Red | Descarga interrumpida | Se reanuda sin volver a bajar los archivos ya verificados | prueba con red cortada |
| RNF-COMP-01 | Compatibilidad | Navegadores | Chrome/Edge y Firefox (2 últimas versiones), Safari ≥ 17 (escritorio e iOS) | Playwright (Chromium, Firefox, WebKit) |
| RNF-COMP-02 | Compatibilidad | Frameworks | Funciona sin envoltorio en HTML plano, React 19, Vue 3, Svelte 5, Angular 18+ y Astro | ejemplos probados en CI |
| RNF-COMP-03 | Compatibilidad | SSR | Importar en Node no lanza errores | prueba de paquete |
| RNF-COMP-04 | Compatibilidad | CSP | Funciona con `script-src 'self' 'wasm-unsafe-eval'`, `worker-src 'self'` y `connect-src` a los orígenes de los pesos | página de prueba con CSP estricta |
| RNF-SEC-01 | Seguridad | Dependencias de runtime | Solo `onnxruntime-web` (ADR-0015) | revisión + CI |
| RNF-SEC-02 | Seguridad | Versiones publicadas con provenance | 100 % | npm |
| RNF-SEC-03 | Seguridad | Vulnerabilidades altas o críticas conocidas | 0 | `pnpm audit --prod` |
| RNF-SEC-04 | Seguridad | Integridad de los recursos del modelo | 100 % verificados con SHA-256 | prueba con archivo alterado |
| RNF-SEC-05 | Seguridad | El texto del artículo nunca se inserta como HTML | 0 usos de `innerHTML`/`insertAdjacentHTML` con datos | lint (`no-unsanitized`) |
| RNF-PRIV-01 | Privacidad | Con `moss-browser` y `web-speech`, el texto no sale del navegador | 0 peticiones con contenido del artículo | Playwright (intercepción) |
| RNF-PRIV-02 | Privacidad | Sin telemetría ni cookies propias | 0 | revisión |
| RNF-A11Y-01 | Accesibilidad | WCAG 2.2 AA del componente | 0 violaciones de axe; teclado completo; foco visible; `prefers-reduced-motion` | Playwright + axe; revisión manual con NVDA y VoiceOver antes de 1.0 |
| RNF-A11Y-02 | Accesibilidad | Objetivos táctiles | ≥ 44×44 px | prueba visual |
| RNF-I18N-01 | Idiomas | Narración y normalización | es y en en v1 (Must); el resto de los 20 idiomas de MOSS sin normalización avanzada (Could) | casos por idioma |
| RNF-MANT-01 | Mantenibilidad | Reglas de capas | 0 violaciones | ESLint boundaries |
| RNF-MANT-02 | Mantenibilidad | Cobertura por capa | Ver [estrategia de pruebas](../06-calidad/estrategia-de-pruebas.md) | CI |
| RNF-USA-01 | DX | Lo exportado tiene TSDoc con ejemplo | 100 % | API Extractor |
| RNF-USA-02 | DX | Integración siguiendo solo el README | ≤ 5 min | 3 personas antes de 1.0 |
| RNF-USA-03 | DX | Cada error tiene código estable y acción sugerida | 100 % del catálogo | revisión |
| RNF-LEG-01 | Cumplimiento | Atribución de MOSS-TTS-Nano (Apache-2.0) | `NOTICE` en el tarball | prueba de paquete |
