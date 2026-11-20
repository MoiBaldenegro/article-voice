# Architecture Decision Records

Un ADR por decisión importante: su contexto, la opción elegida, las alternativas descartadas y las
consecuencias. Sirven para que nadie "arregle" algo que estaba así a propósito.

## Reglas

- Se numeran en orden y **no se reescriben**. Si una decisión cambia, se crea un ADR nuevo que
  *reemplaza* al anterior, y el viejo pasa a `Reemplazado por ADR-XXXX`.
- Estados: `Propuesto` → `Aceptado` | `Rechazado`; luego, opcionalmente, `Reemplazado` u `Obsoleto`.
- Un PR que contradiga un ADR `Aceptado` no se fusiona; primero se propone el ADR nuevo.
- Plantilla: [0000-plantilla.md](0000-plantilla.md).

## Índice

| # | Decisión | Estado |
| --- | --- | --- |
| [0001](0001-registrar-decisiones-con-adrs.md) | Registrar las decisiones de arquitectura con ADRs | Aceptado |
| [0002](0002-arquitectura-hexagonal-como-05-y-06.md) | Arquitectura hexagonal y estructura de carpetas de 05/06 | Aceptado |
| [0003](0003-typescript-estricto-y-build-dual.md) | TypeScript estricto y paquete dual ESM + CJS con tsup | Reemplazado en parte por 0013 |
| [0004](0004-pruebas-con-jest.md) | Pruebas con Jest y ts-jest, junto al código | Aceptado (complementado por 0017) |
| [0005](0005-pnpm.md) | pnpm como gestor de paquetes | Aceptado |
| [0006](0006-licencia-mit.md) | Licencia MIT | Aceptado |
| [0007](0007-semver-changesets-y-provenance.md) | SemVer, Changesets y publicación con provenance desde CI | Aceptado |
| [0008](0008-trunk-based-y-conventional-commits.md) | Trunk-based development y Conventional Commits | Aceptado |
| [0009](0009-api-publica-minima-y-verificada.md) | API pública mínima y reporte verificado | Aceptado |
| [0010](0010-cero-dependencias-de-runtime.md) | Cero dependencias de runtime salvo excepción aprobada | Aceptado |
| [0011](0011-nombre-y-alcance-provisional.md) | Nombre `article-voice`; solo navegador, con UI, sin CLI | Aceptado |
| [0012](0012-web-component-sin-framework.md) | Web Component estándar, sin framework | Aceptado |
| [0013](0013-solo-esm-y-solo-navegador.md) | Paquete solo ESM y solo para navegador | Aceptado |
| [0014](0014-motores-de-voz-intercambiables.md) | Motor de voz como puerto, con tres adaptadores | Aceptado |
| [0015](0015-onnxruntime-web-como-excepcion.md) | `onnxruntime-web` como única dependencia, cargada de forma diferida | Aceptado |
| [0016](0016-portar-el-runtime-de-referencia.md) | Portar el runtime Apache-2.0; no copiar la demo sin licencia | Aceptado |
| [0017](0017-pruebas-en-navegadores-reales.md) | Playwright en navegadores reales | Aceptado |
| [0018](0018-variante-del-modelo-y-entrega-de-pesos.md) | Variante del modelo y entrega de los pesos | Propuesto (espera el spike) |
