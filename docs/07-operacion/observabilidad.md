# Observabilidad

- **Estado:** Aprobado

## Principio

Una librería **no escribe en la consola ni envía telemetría**. El que decide qué se registra y a
dónde va es quien la usa. Por eso la observabilidad se ofrece como **ganchos opcionales**.

## Logs

- Puerto de salida `Logger` en el dominio (`debug`, `info`, `warn`, `error` con objeto de contexto).
- Por defecto, un adaptador que no hace nada (`NoopLogger`).
- El usuario puede pasar su propio logger en las opciones (compatible con la forma de `console`,
  pino o winston).
- Convención de los mensajes: evento en `snake_case` + contexto estructurado, sin datos sensibles:
  `logger.debug('item_parsed', { itemId, durationMs })`.

## Eventos y métricas

- Si el dominio tiene operaciones observables, se exponen como eventos tipados (`on('evento', fn)`)
  o como callbacks en las opciones: el usuario los conecta a sus métricas.
- Los nombres de evento son parte del contrato público ([ADR-0009](../03-arquitectura/adr/0009-api-publica-minima-y-verificada.md)).

## Trazas

- Si el producto hace E/S, se acepta opcionalmente un `tracer` compatible con OpenTelemetry API
  como `peerDependency` opcional ([ADR-0010](../03-arquitectura/adr/0010-cero-dependencias-de-runtime.md)).

## SLOs del proyecto (no del runtime)

Lo que sí se mide es la salud del proyecto como producto de código abierto:

| SLI | SLO |
| --- | --- |
| Tiempo hasta la primera respuesta a un issue | ≤ 3 días hábiles en el 90 % |
| Tiempo para corregir una vulnerabilidad alta o crítica | ≤ 7 días |
| Versiones publicadas con provenance | 100 % |
| `main` en verde | ≥ 95 % de los días |
