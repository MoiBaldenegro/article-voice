# Plantilla de ticket

Un ticket está listo para empezarse cuando cumple la [Definition of Ready](../05-estandares/dor-dod.md).
La misma plantilla está en `.github/ISSUE_TEMPLATE/tarea.md`.

```markdown
## Contexto
Por qué existe esta tarea y qué problema del usuario resuelve (1–3 frases).

## Objetivo
Qué cambia cuando esté hecha, en términos observables.

## Fuera de alcance
Lo que NO se hace en este ticket.

## Criterios de aceptación
Copiados de la historia (Given/When/Then), con su ID:
- HU-XX · CA-1: Dado … Cuando … Entonces …
- HU-XX · CA-2: …

## Enlaces
- Historia: HU-XX · Requisitos: RF-XX, RNF-XX · Reglas: RN-XX
- Diseño: RFC-NNNN / diagrama / maqueta (`docs/04-diseno/ui/…`)
- Contrato: sección de `contrato-api-publica.md` afectada
- ADR relevante: ADR-NNNN
- Errores: códigos del catálogo que se agregan o usan

## Notas técnicas
Capas y archivos previstos (caso de uso, VOs, puertos, adaptador).

## Cambio publicado
- [ ] Requiere changeset: patch / minor / major
- [ ] Cambia `etc/*.api.md`

## Estimación
S (≤ 1 día) · M (2–3 días) · L (más: dividir el ticket)
```
