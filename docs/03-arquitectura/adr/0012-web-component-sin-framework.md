# ADR-0012 · Web Component estándar, sin framework, como forma de entrega

- **Estado:** Aceptado
- **Fecha:** 2026-11-20
- **Relacionados:** ADR-0002, ADR-0009, ADR-0010, [Contrato](../../04-diseno/contrato-api-publica.md)

## Contexto

Requisito del producto: "cualquiera lo importa en su web y listo", **sin importar el framework**
(React, Vue, Angular, Svelte, Astro, WordPress, HTML plano). Un componente hecho para un framework
obliga a los demás a usar envoltorios.

## Decisión

- Se entrega como **Custom Element** (`customElements.define('article-voice', …)`) con
  **Shadow DOM** abierto: los estilos del sitio no rompen el reproductor y los del reproductor no
  se filtran al sitio.
- **Sin Lit ni Stencil**: se escribe sobre las APIs del navegador (ADR-0010). El elemento es pequeño
  (un botón, una barra de progreso, un menú de velocidad y voz); no justifica una dependencia.
- Personalización mediante **CSS custom properties** (`--av-*`) y **`::part()`**, que atraviesan el
  Shadow DOM de forma controlada.
- Integración con frameworks sin envoltorios: atributos para la configuración simple, propiedades y
  métodos para la programática, y `CustomEvent` con `bubbles` y `composed` para los eventos.
- El elemento es la **capa de entrada** (el "controlador" de 05/06): vive en `src/ui/`, traduce
  atributos y clics a llamadas a los servicios de aplicación y **no contiene reglas de negocio**.
- Si el nombre `article-voice` ya está registrado en la página, se puede elegir otro con
  `defineArticleVoice('otro-nombre')`.

## Alternativas consideradas

| Opción | Por qué no |
| --- | --- |
| Componente React (+ envoltorios para los demás) | Ata el producto a un framework; los envoltorios duplican el mantenimiento |
| Lit | Buena opción, pero suma una dependencia de runtime para muy poca UI |
| Script que inyecta HTML sin Shadow DOM | Los estilos del sitio rompen el reproductor |
| iframe | Aísla demasiado: no puede leer el artículo de la página |

## Consecuencias

- Funciona igual en cualquier framework; React 19 ya maneja propiedades y eventos de Custom Elements.
- El renderizado en servidor (SSR) muestra el elemento vacío hasta que el script se carga; se
  documenta un estado inicial con `:not(:defined)`.
- Se añaden ejemplos de integración por framework en el README (tarea del backlog).
