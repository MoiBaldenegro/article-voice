# PRD · `article-voice`

- **Estado:** En revisión · **Fuente:** [Visión](vision.md) · **Fecha:** 2026-11-20

## 1. Objetivo de la versión

- **0.1.0 (validación, etiqueta `next`):** un sitio importa el paquete, coloca `<article-voice>` y el
  visitante escucha el artículo en español o inglés, con play/pausa y progreso, usando `moss-server`
  (si el sitio configura `server-url`) o, si no, la voz del sistema (`web-speech`) con aviso visible.
  `moss-browser` es experimental y solo con `engine="moss-browser"` (ADR-0018).
- **1.0.0:** los tres motores, resaltado, velocidad, voces, inserción automática, accesibilidad
  AA verificada y contrato estable.

## 2. Escenarios clave

1. **Blog en Astro.** Lucía tiene un blog técnico. Instala el paquete, añade `<article-voice>` en su
   plantilla de entrada y publica. Sus lectores ven un botón "Escuchar · 7 min" sobre cada artículo.
2. **Visitante en el móvil.** Andrés abre un artículo y pulsa play. Sin descargar nada pesado, el
   audio empieza a los pocos segundos (desde el servidor del sitio o con la voz del sistema, con la
   etiqueta correspondiente). Con el resaltado (0.2.0) verá la frase actual; con Media Session (1.x)
   podrá bloquear el móvil y seguir escuchando.
3. **Medio con su propio servidor.** Un medio no quiere que sus lectores descarguen el modelo. Monta
   un servidor compatible con `/v1/audio/speech` y configura `server-url`. Los lectores solo reciben
   el audio.
4. **Sitio sin servidor de voz.** Sin `server-url` (o si el servidor no responde), el componente usa
   la voz del sistema y lo indica con una etiqueta "voz del sistema".

## 3. Funcionalidades

| ID | Funcionalidad | Prioridad | Versión | Historias |
| --- | --- | --- | --- | --- |
| F-01 | Detección automática del artículo y artículo explícito | Must | 0.1.0 | HU-01, HU-02 |
| F-02 | Extracción, normalización (es/en) y segmentación del texto | Must | 0.1.0 | HU-03 |
| F-03 | Reproducir, pausar, reanudar y detener | Must | 0.1.0 | HU-04, HU-05 |
| F-04 | Motor `moss-browser` con descarga bajo demanda, caché e integridad (experimental, solo `engine="moss-browser"`) | Could | Experimental | HU-06, HU-07 |
| F-05 | Progreso (tiempo restante) y saltar entre segmentos | Must | 0.1.0 | HU-08 |
| F-06 | Accesibilidad AA y teclado | Must | 0.1.0 | HU-09 |
| F-07 | Respaldo automático `web-speech` con aviso visible | Must | 0.1.0 | HU-10 |
| F-08 | Motor `moss-server` (OpenAI `/v1/audio/speech`) con streaming y `AV_SERVER_ERROR` | Must | 0.1.0 | HU-11 |
| F-09 | Resaltado de la frase actual en la página | Should | 0.2.0 | HU-12 |
| F-10 | Velocidad y selección de voz, recordadas por el navegador | Should | 0.2.0 | HU-13 |
| F-11 | Tematización (`--av-*`, `::part`) e idioma de la interfaz (es/en) | Should | 0.3.0 | HU-14 |
| F-12 | Inserción automática (`article-voice/auto`) | Should | 0.3.0 | HU-15 |
| F-13 | API JS y eventos para integraciones | Must | 0.1.0 | HU-16 |
| F-14 | Controles del sistema (Media Session: pantalla bloqueada, auriculares) | Could | 1.x | HU-17 |
| F-15 | Recordar la posición de lectura por artículo | Could | 1.x | — |
| F-16 | Motor personalizado aportado por el integrador | Could | 1.x | — |
| F-17 | Clonación de voz | Won't (v1) | — | — |
| F-18 | Descargar el audio como archivo | Won't (v1) | — | — |

## 4. Métricas de éxito

| Métrica | Línea base | Objetivo a 3 meses de la 1.0 | Fuente |
| --- | --- | --- | --- |
| Descargas semanales en npm | 0 | 500 | npm |
| Sitios públicos que lo usan | 0 | 20 | búsqueda de `<article-voice` en GitHub / dependents |
| Tiempo hasta integrar con el README | — | ≤ 5 min | prueba con 3 personas |
| Tiempo hasta el primer audio (`moss-server`, red de referencia) | — | ≤ 2 s p95 | RNF-PERF-10 |
| Reproducciones con cortes | — | 0 en el hardware de referencia | RNF-PERF-11 |
| Issues "no detectó el artículo" | — | < 5 % de los issues | etiqueta `detection` |

## 5. Supuestos y riesgos

| Supuesto o riesgo | Impacto | Validación / mitigación |
| --- | --- | --- |
| R-1 · MOSS no es lo bastante rápido en el navegador | **Materializado** (T-000, #10): RTF 1,93 WASM, 5,5 q4 WebGPU, 10,6 WebGPU oficial | `auto` no elige `moss-browser` (ADR-0018); 0.1.0 con `moss-server` y `web-speech`; investigación T-035 (códec por lotes, KV en GPU, WebNN) |
| R-2 · La descarga (168–685 MB) espanta a los visitantes | Alto | Descarga solo tras pulsar play y con tamaño visible; caché; motor de servidor; ADR-0018 |
| R-3 · La variante cuantizada suena mal | Medio | Escucha ciega en el spike; cuantización propia (ADR-0018 opción B) |
| R-4 · La heurística de detección falla en ciertos sitios | Medio | Atributo `for`/`target` explícito; corpus de páginas reales en las pruebas |
| R-5 · Normalización pobre (números, siglas) | Medio | Normalizador propio con casos de prueba por idioma; el original en Python sirve de referencia |
| R-6 · Políticas de autoplay y CSP de los sitios | Medio | El audio arranca siempre desde el clic; CSP documentada |
| R-7 · El repo de los pesos cambia o desaparece | Medio | Commit fijado + hash; `model-url` para alojar los pesos uno mismo |

## 6. Fuera de alcance

Ver la sección *Qué NO es* de la [visión](vision.md), más las funcionalidades marcadas Won't.

## 7. Hitos

| Hito | Contenido | Criterio de salida |
| --- | --- | --- |
| H0 · Spike | T-000: MOSS en el navegador medido | ✅ Informe con números; ADR-0018 en opción C (la escucha ciega #12 no bloquea) |
| H1 · Docs aprobadas | Niveles 1–4 | Todos en `Aprobado` |
| H2 · Esqueleto | Épica 0 | `pnpm verify` y publicación `0.0.1-next.0` con provenance |
| H3 · 0.1.0 | F-01…F-03, F-05…F-08, F-13 (detección, estado, UI, `moss-server`, `web-speech`) | DoD cumplida, publicada en `next`; sin depender de `moss-browser` |
| H4 · 0.2.0 / 0.3.0 | Should; `moss-browser` sigue experimental salvo que T-035 cumpla RNF-PERF-11 | Igual |
| H5 · 1.0.0 | Contrato estable | Sin cambios incompatibles en 4 semanas de `next` |
