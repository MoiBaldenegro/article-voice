# SRS · Especificación de requisitos de software · `article-voice`

- **Estado:** En revisión · **Fecha:** 2026-11-20
- **Estándar:** estructura según ISO/IEC/IEEE 29148:2018 (sucesor de IEEE 830)

## 1. Introducción

### 1.1 Propósito
Especifica el componente `article-voice` para quienes lo construyen, lo prueban y lo integran.

### 1.2 Alcance
Componente web que detecta el artículo de una página y lo lee en voz alta con MOSS-TTS-Nano, en el
navegador o en un servidor del sitio, con respaldo a la voz del sistema. Fuera de alcance: ver
[visión](../01-producto/vision.md#qué-no-es-no-objetivos).

### 1.3 Definiciones
[Glosario](../01-producto/glosario.md).

### 1.4 Referencias
[PRD](../01-producto/prd.md), [ADRs](../03-arquitectura/adr/README.md),
[contrato](../04-diseno/contrato-api-publica.md), MOSS-TTS-Nano (github.com/OpenMOSS/MOSS-TTS-Nano, Apache-2.0).

## 2. Descripción general

### 2.1 Perspectiva del producto
Biblioteca de navegador distribuida por npm y CDN. Se ejecuta en la página del integrador; la
inferencia corre en un Web Worker. Sistemas externos: Hugging Face (pesos), CDN (wasm de ORT),
servidor TTS opcional del integrador, `speechSynthesis` del navegador.

### 2.2 Funciones del producto
F-01 … F-16 del PRD.

### 2.3 Usuarios
Integrador y visitante (ver visión).

### 2.4 Restricciones
- R-01 · TypeScript estricto, solo ESM, solo navegador (ADR-0003, ADR-0013).
- R-02 · Única dependencia de runtime: `onnxruntime-web`, cargada de forma diferida (ADR-0015).
- R-03 · Licencia MIT; atribución Apache-2.0 de MOSS-TTS-Nano (ADR-0006, ADR-0016).
- R-04 · Arquitectura hexagonal de 05/06 (ADR-0002); el Custom Element es la capa de entrada (ADR-0012).
- R-05 · No se copia código del repo `MOSS-TTS-Nano-Reader` (sin licencia) (ADR-0016).

### 2.5 Supuestos y dependencias
- S-1 · Los grafos ONNX oficiales funcionan en onnxruntime-web (afirmado por OpenMOSS; **lo verifica T-000**).
- S-2 · Los navegadores objetivo soportan Custom Elements v1, Shadow DOM, Web Workers, Web Audio y WebAssembly.
- S-3 · Hugging Face sirve los archivos con CORS permitido.

## 3. Requisitos específicos

### 3.1 Requisitos funcionales

| ID | Requisito | Prioridad | Origen | Historias |
| --- | --- | --- | --- | --- |
| RF-01 | Al importar el paquete, el sistema debe registrar el elemento `article-voice` si aún no existe. | Must | F-13 | HU-16 |
| RF-02 | El sistema debe detectar el artículo de la página según RN-01 a RN-03. | Must | F-01 | HU-01 |
| RF-03 | El sistema debe usar el artículo indicado con `for` (id) o `target` (selector CSS) cuando se indique, según RN-04. | Must | F-01 | HU-02 |
| RF-04 | El sistema debe extraer el texto legible del artículo aplicando las exclusiones de RN-02 y conservando el orden de lectura. | Must | F-02 | HU-03 |
| RF-05 | El sistema debe normalizar el texto en español e inglés según RN-11. | Must | F-02 | HU-03 |
| RF-06 | El sistema debe dividir el texto en segmentos según RN-05. | Must | F-02 | HU-03 |
| RF-07 | Al pulsar play, el sistema debe preparar el motor (si hace falta) y reproducir desde el cursor. | Must | F-03 | HU-04 |
| RF-08 | El sistema debe permitir pausar, reanudar y detener; detener vuelve el cursor al inicio. | Must | F-03 | HU-05 |
| RF-09 | El sistema debe reproducir los segmentos sin silencios añadidos entre ellos, sintetizando por adelantado según RN-07. | Must | F-03 | HU-04 |
| RF-10 | El motor `moss-browser` debe ejecutar MOSS-TTS-Nano en un Web Worker con WebGPU si está disponible y WASM si no. | Must | F-04 | HU-06 |
| RF-11 | El sistema debe descargar los recursos del modelo solo tras el primer play (RN-06), mostrar el tamaño pendiente (RN-15) y el progreso, y permitir cancelar. | Must | F-04 | HU-06 |
| RF-12 | El sistema debe verificar cada recurso con SHA-256 (RN-14) y guardarlo en Cache Storage para reutilizarlo. | Must | F-04 | HU-07 |
| RF-13 | El sistema debe ofrecer `clearModelCache()` para borrar los recursos guardados. | Must | F-04 | HU-07 |
| RF-14 | El sistema debe mostrar el tiempo restante estimado y permitir ir al segmento anterior o siguiente. | Must | F-05 | HU-08 |
| RF-15 | El sistema debe mostrar la duración estimada del artículo antes de reproducir ("Escuchar · 7 min"). | Must | F-05 | HU-01 |
| RF-16 | El sistema debe elegir el motor según `engine` y, con `auto`, según el algoritmo de ADR-0014. | Must | F-07, F-08 | HU-10, HU-11 |
| RF-17 | El motor `web-speech` debe narrar con `speechSynthesis` en el idioma del artículo y la UI debe indicarlo (RN-13). | Should | F-07 | HU-10 |
| RF-18 | El motor `moss-server` debe pedir el audio de cada segmento a `server-url` con el contrato OpenAI `POST /v1/audio/speech`. | Should | F-08 | HU-11 |
| RF-19 | El sistema debe resaltar en la página el texto del segmento que suena, sin modificar el DOM del sitio. | Should | F-09 | HU-12 |
| RF-20 | El sistema debe permitir elegir velocidad (RN-08) y voz, y recordar ambas en el navegador. | Should | F-10 | HU-13 |
| RF-21 | El sistema debe permitir tematizar con `--av-*` y `::part()` y mostrar la interfaz en el idioma del artículo (es/en). | Should | F-11 | HU-14 |
| RF-22 | Importar `article-voice/auto` debe insertar el elemento antes del artículo detectado sin escribir HTML. | Should | F-12 | HU-15 |
| RF-23 | El sistema debe exponer métodos (`play`, `pause`, `stop`, `next`, `previous`), propiedades de solo lectura (`state`, `progress`, `engine`) y los eventos del contrato. | Must | F-13 | HU-16 |
| RF-24 | El sistema debe integrar los controles del sistema operativo (Media Session). | Could | F-14 | HU-17 |
| RF-25 | Solo una narración debe sonar a la vez en la página (RN-09). | Must | F-03 | HU-04 |

### 3.2 Interfaces externas
- **API del componente:** [contrato](../04-diseno/contrato-api-publica.md).
- **Hugging Face:** `GET https://huggingface.co/<repo>/resolve/<sha>/<archivo>`, con soporte de `Range`.
- **Servidor TTS del integrador:** `POST {server-url}/v1/audio/speech` `{ model, input, voice, response_format: "pcm"|"wav", speed }`.
- **APIs del navegador:** Custom Elements, Shadow DOM, Web Worker, WebGPU, WebAssembly, Web Audio, Cache Storage, `speechSynthesis`, CSS Custom Highlight API, Media Session.

### 3.3 Requisitos no funcionales
[Requisitos no funcionales](requisitos-no-funcionales.md).

### 3.4 Reglas de negocio
[Reglas de negocio](reglas-de-negocio.md).

## 4. Trazabilidad

| Funcionalidad | RF | Historias | Casos de uso | Reglas |
| --- | --- | --- | --- | --- |
| F-01 | RF-02, RF-03, RF-15 | HU-01, HU-02 | CU-01 | RN-01…04 |
| F-02 | RF-04…06 | HU-03 | CU-01 | RN-02, RN-05, RN-11, RN-12 |
| F-03 | RF-07…09, RF-25 | HU-04, HU-05 | CU-02, CU-03 | RN-07, RN-09 |
| F-04 | RF-10…13 | HU-06, HU-07 | CU-04 | RN-06, RN-14, RN-15 |
| F-05 | RF-14, RF-15 | HU-08 | CU-05 | — |
| F-07, F-08 | RF-16…18 | HU-10, HU-11 | CU-06 | RN-10, RN-13 |
| F-09 | RF-19 | HU-12 | CU-02 | — |
| F-10 | RF-20 | HU-13 | — | RN-08 |
| F-11, F-12 | RF-21, RF-22 | HU-14, HU-15 | — | — |
| F-13 | RF-01, RF-23 | HU-16 | — | — |
