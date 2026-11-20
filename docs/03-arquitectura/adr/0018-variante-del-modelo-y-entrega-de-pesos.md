# ADR-0018 · Variante del modelo y entrega de los pesos

- **Estado:** Propuesto · se decide con los resultados del spike T-000
- **Fecha:** 2026-11-20
- **Relacionados:** ADR-0014, [Rendimiento](../../06-calidad/rendimiento.md)

## Contexto

Ver las dos variantes y sus tamaños en ADR-0014. La oficial está probada pero pesa ≈ 685 MB; la
cuantizada a 4 bits de la comunidad pesa ≈ 168 MB pero no tiene uso público y su calidad es
desconocida. No hay métricas publicadas de velocidad en navegador.

## Lo que ya está decidido (independiente de la variante)

- Los pesos se descargan de una URL base configurable (`model-url`). Por defecto, el repo de Hugging
  Face **fijado a un commit** (`/resolve/<sha>/…`), nunca a `main`.
- El paquete incluye un **manifiesto** con la lista de archivos, su tamaño y su **SHA-256**. Cada
  archivo se verifica al descargarlo; si no coincide, error `AV_MODEL_INTEGRITY` y no se usa.
- Los archivos se guardan en Cache Storage (`article-voice-models-v<manifiesto>`), se reutilizan
  entre páginas del mismo sitio y se pueden borrar con `clearModelCache()`.
- La UI muestra el tamaño **antes** de descargar y el progreso durante la descarga, con opción de cancelar.

## Opciones a decidir con el spike

| Opción | Condición para elegirla |
| --- | --- |
| A · Cuantizada de la comunidad (4 bits) | Calidad aceptable en la escucha ciega (CP-SPIKE-3) y RNF-PERF-10/11 cumplidos |
| B · Cuantización propia (int8/q4) desde los ONNX oficiales, publicada en un repo propio | A no cumple calidad, pero una cuantización propia sí |
| C · Oficial completa | Ninguna cuantizada cumple; entonces `auto` no elige `moss-browser` en móviles |

## Consecuencias

Al aceptar este ADR se fija el commit de Hugging Face y se genera el manifiesto con los hashes.
