# Checklist de code review

- **Estado:** Aprobado

El revisor aprueba cuando todo lo que aplica está en ✅. CI cubre formato, lint, tipos, pruebas,
cobertura, contrato y tamaño: **no se gasta revisión humana en lo que CI ya comprueba.**

## Diseño

- [ ] El cambio está en la capa correcta ([arquitectura interna](arquitectura-interna.md)); el dominio no importa infraestructura.
- [ ] Las reglas de negocio viven en un VO, entidad o servicio de dominio, no en un adaptador.
- [ ] Si toma una decisión de arquitectura, dependencias, contrato o publicación: hay ADR.
- [ ] No agrega dependencias de runtime sin ADR ([ADR-0010](../03-arquitectura/adr/0010-cero-dependencias-de-runtime.md)).
- [ ] Los nombres coinciden con el [glosario](../01-producto/glosario.md).

## Contrato público

- [ ] Si cambia `etc/*.api.md`: el cambio es intencional, está en el PR y el changeset tiene el tipo SemVer correcto.
- [ ] Lo exportado tiene TSDoc con `@example` y `@throws`.
- [ ] Los errores nuevos están en el [catálogo](../04-diseno/catalogo-de-errores.md) con código estable.

## Correctitud y pruebas

- [ ] Hay pruebas que fallarían sin el cambio (no solo que pasan con él).
- [ ] Se cubren los casos borde de los criterios de aceptación (Given/When/Then) de la historia.
- [ ] Las pruebas de casos de uso usan dobles en memoria de los puertos, no mocks de detalles internos.
- [ ] Sin `skip`, `only` ni pruebas que dependan del orden o del reloj real.

## Seguridad

- [ ] Toda entrada externa se valida con un VO antes de usarse.
- [ ] Nada de `eval`, `new Function`, rutas de archivo sin normalizar ni regex vulnerables a ReDoS.
- [ ] No se registran ni se incluyen en errores datos sensibles.

## Documentación

- [ ] README, docs y changeset actualizados si cambia algo visible.
- [ ] En un PR solo de docs: el documento sigue la plantilla, enlaza sus fuentes (IDs de requisitos, ADRs) y cambia su estado.

## Cómo comentar

Prefijos: **bloqueante:** (no se fusiona sin resolverlo), **sugerencia:** (opcional),
**pregunta:**, **nit:** (detalle menor). Se comenta el código, no a la persona.
