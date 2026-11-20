# ADR-0001 · Registrar las decisiones de arquitectura con ADRs

- **Estado:** Aceptado
- **Fecha:** 2026-11-20

## Contexto

Es un proyecto de código abierto: lo leerán y modificarán personas que no estuvieron en las
conversaciones donde se decidió cada cosa. Sin registro, el porqué se pierde y las decisiones se
revierten por accidente.

## Decisión

Cada decisión que afecte la estructura, las dependencias, el contrato público o el proceso de
publicación se registra como ADR en `docs/03-arquitectura/adr/`, con la [plantilla](0000-plantilla.md).

## Alternativas consideradas

| Opción | Por qué no |
| --- | --- |
| Wiki externa | Se desincroniza del código y no pasa por revisión de PR |
| Comentarios en el código | Explican el cómo local, no el porqué global ni las alternativas |
| No registrar | El conocimiento se queda en una sola cabeza |

## Consecuencias

- Revisar un PR incluye revisar si necesita ADR (está en el [checklist](../../05-estandares/code-review.md)).
- Un ADR aceptado no se edita; se reemplaza.
