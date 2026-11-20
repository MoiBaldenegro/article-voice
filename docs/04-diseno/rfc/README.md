# RFCs · Design docs por feature

Antes de construir algo grande se escribe una propuesta técnica y se revisa.

## Cuándo hace falta un RFC

- Cambia el [contrato público](../contrato-api-publica.md) (símbolos, opciones, errores).
- Agrega un caso de uso que toca más de un puerto o un puerto nuevo.
- Afecta el rendimiento o la seguridad de forma medible.
- Se estima en más de ~3 días de trabajo.

## Proceso

1. Copiar [0000-plantilla.md](0000-plantilla.md) como `NNNN-titulo.md` y abrir un PR solo con el RFC.
2. Discusión en el PR, durante al menos 3 días hábiles si cambia el contrato.
3. Resultado: `Aceptado` (se fusiona y se crean los tickets), `Rechazado` (se fusiona igual, con el
   motivo, para no repetir la discusión) o `Retirado`.
4. Si el RFC toma una decisión de arquitectura, genera su ADR.

## Índice

_Ninguno todavía._
