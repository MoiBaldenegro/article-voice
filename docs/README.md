# Documentación de `article-voice`

Regla del proyecto: **no se escribe código de producción hasta que los niveles 1 a 4 estén
aprobados.** La única excepción es el spike T-000, cuyo código es desechable y vive en `spikes/`.

| Nivel | Pregunta | Documentos | Estado |
| --- | --- | --- | --- |
| 1 · Producto | ¿Por qué existe? | [Visión](01-producto/vision.md) · [PRD](01-producto/prd.md) · [Glosario](01-producto/glosario.md) | 🟡 En revisión |
| 2 · Requisitos | ¿Qué debe hacer? | [SRS](02-requisitos/srs.md) · [Historias](02-requisitos/historias-de-usuario.md) · [No funcionales](02-requisitos/requisitos-no-funcionales.md) · [Casos de uso](02-requisitos/casos-de-uso.md) · [Reglas de negocio](02-requisitos/reglas-de-negocio.md) | 🟡 En revisión (umbrales ⚑ esperan el spike) |
| 3 · Arquitectura | ¿Cómo está organizado? | [SAD (arc42 + C4)](03-arquitectura/sad.md) · [ADRs](03-arquitectura/adr/README.md) · [Mapa de contextos](03-arquitectura/mapa-de-contextos.md) · [Modelo de datos](03-arquitectura/modelo-de-datos.md) · [Amenazas (STRIDE)](03-arquitectura/modelo-de-amenazas.md) | 🟡 En revisión (ADR-0018 espera el spike) |
| 4 · Diseño y contratos | ¿Cómo se comunican las piezas? | [Contrato de la API pública](04-diseno/contrato-api-publica.md) · [Catálogo de errores](04-diseno/catalogo-de-errores.md) · [RFCs](04-diseno/rfc/README.md) · [Diagramas](04-diseno/diagramas.md) · [UI y design system](04-diseno/ui/design-system.md) | 🟡 En revisión |
| 5 · Estándares | ¿Cómo escribimos el código? | [Guía de estilo](05-estandares/guia-de-estilo.md) · [Arquitectura interna](05-estandares/arquitectura-interna.md) · [Branching y commits](05-estandares/branching-y-commits.md) · [Code review](05-estandares/code-review.md) · [DoR y DoD](05-estandares/dor-dod.md) · [CONTRIBUTING](../CONTRIBUTING.md) | ✅ Listo |
| 6 · Calidad | ¿Cómo sabemos que funciona? | [Estrategia de pruebas](06-calidad/estrategia-de-pruebas.md) · [Plan de pruebas](06-calidad/plan-de-pruebas.md) · [Rendimiento](06-calidad/rendimiento.md) | ✅ Listo (umbrales ⚑ esperan el spike) |
| 7 · Operación | ¿Cómo se corre, publica y mantiene? | [Onboarding](07-operacion/onboarding.md) · [Configuración](07-operacion/configuracion.md) · [Servidor moss-server](07-operacion/moss-server.md) · [CI/CD](07-operacion/ci-cd.md) · [Runbooks](07-operacion/runbooks.md) · [Observabilidad](07-operacion/observabilidad.md) · [Postmortems](07-operacion/postmortems/README.md) | ✅ Listo |
| 8 · La tarea | ¿Qué hago hoy? | [Plantilla de ticket](08-tareas/plantilla-de-ticket.md) · [Backlog](08-tareas/backlog.md) · [T-000 (en curso)](08-tareas/tickets/T-000-spike-moss-en-el-navegador.md) | 🔄 T-000 en curso |

## Cómo se aprueba un nivel

1. El autor abre un PR solo con documentación.
2. La revisión usa el [checklist de code review](05-estandares/code-review.md) (sección *Documentación*).
3. Al fusionar, la tabla de arriba cambia a ✅ y el documento pasa a `Aprobado` en su encabezado.

## Convenciones de los documentos

- Escritos en español, en Markdown, dentro del repo: la documentación se versiona con el código.
- Cada documento abre con estado (`Borrador`, `En revisión`, `Aprobado`, `Obsoleto`), dueño y fecha.
- Diagramas en Mermaid dentro del Markdown.
- Las maquetas de UI se hacen como artifacts de Claude y se exportan a `docs/04-diseno/ui/` (no hay Figma).
- Un término del [glosario](01-producto/glosario.md) significa lo mismo en docs, código, tests y mensajes de error.
