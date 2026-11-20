# Definition of Ready y Definition of Done

- **Estado:** Aprobado

## Definition of Ready (una tarea puede empezarse cuando…)

- [ ] Sigue la [plantilla de ticket](../08-tareas/plantilla-de-ticket.md): contexto, objetivo y fuera de alcance.
- [ ] Enlaza la historia de usuario y sus criterios de aceptación en Given/When/Then.
- [ ] Enlaza los requisitos (IDs `RF-`/`RNF-`) y reglas de negocio (`RN-`) que toca.
- [ ] Si cambia el contrato público: el cambio está descrito en el [contrato](../04-diseno/contrato-api-publica.md) o en un RFC aprobado.
- [ ] Si toma una decisión de arquitectura: el ADR existe (al menos `Propuesto`).
- [ ] Si tiene UI: la maqueta (artifact exportado) está en `docs/04-diseno/ui/`.
- [ ] Los errores nuevos están en el catálogo.
- [ ] Es lo bastante pequeña para un PR revisable (orientativo: menos de ~400 líneas de cambio).
- [ ] No tiene dependencias bloqueantes abiertas.

## Definition of Done (una tarea está terminada cuando…)

- [ ] Todos los criterios de aceptación tienen una prueba automatizada que pasa.
- [ ] CI en verde: formato, lint, tipos, pruebas, cobertura mínima, reglas de capas, `etc/*.api.md`, publint/attw y size-limit.
- [ ] Revisión aprobada con el [checklist](code-review.md).
- [ ] Changeset incluido si cambia algo publicado.
- [ ] TSDoc, README y docs actualizados; el estado de los documentos tocados está al día.
- [ ] Fusionado a `main` por squash con título Conventional Commit.
- [ ] El issue se cierra enlazando el PR.

**Done de una versión:** el PR de versión de Changesets se fusiona, CI publica en npm con
provenance, el release de GitHub tiene las notas y la prueba de humo del paquete publicado pasa
(ver [CI/CD](../07-operacion/ci-cd.md)).
