# ADR-0006 · Licencia MIT

- **Estado:** Aceptado
- **Fecha:** 2026-11-20

## Contexto

El proyecto es de código libre y se distribuye por npm. La licencia decide quién puede usarlo y con
qué obligaciones; cambiarla después de tener contribuidores externos requiere su consentimiento.

## Decisión

MIT. Se aceptan contribuciones bajo la misma licencia (inbound = outbound), sin CLA.

## Alternativas consideradas

| Opción | Por qué no |
| --- | --- |
| Apache-2.0 | Da concesión explícita de patentes, pero es más larga; no hay riesgo de patentes identificado |
| GPL / AGPL | Copyleft; limita la adopción en productos cerrados, contrario al objetivo de difusión |
| ISC | Equivalente a MIT, menos reconocida |

## Consecuencias

- `LICENSE` en la raíz, `"license": "MIT"` en `package.json`.
- Toda dependencia de runtime debe tener una licencia compatible (MIT, ISC, BSD, Apache-2.0); lo
  comprueba CI (ver [CI/CD](../../07-operacion/ci-cd.md)).
- Señal de revisión: si aparece riesgo de patentes en el dominio del producto, evaluar Apache-2.0
  **antes** de la primera contribución externa.
