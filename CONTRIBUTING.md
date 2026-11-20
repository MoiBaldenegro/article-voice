# Cómo contribuir

¡Gracias por tu interés! Este proyecto se documenta antes de programarse; leer los documentos
correctos primero ahorra idas y vueltas en la revisión.

## Antes de empezar

1. Lee la [visión](docs/01-producto/vision.md) para saber qué es y qué **no** es el proyecto.
2. Revisa los [ADRs](docs/03-arquitectura/adr/README.md): explican por qué las cosas son como son.
3. Para algo más grande que un arreglo pequeño, abre primero un issue (o un
   [RFC](docs/04-diseno/rfc/README.md) si cambia el contrato público) y espera acuerdo.

## Preparar el entorno

Ver [onboarding](docs/07-operacion/onboarding.md). En resumen:

```bash
corepack enable
pnpm install
pnpm verify      # lint + tipos + pruebas + build + contrato
```

## Hacer el cambio

- Rama corta desde `main` ([branching y commits](docs/05-estandares/branching-y-commits.md)).
- Respeta las capas ([arquitectura interna](docs/05-estandares/arquitectura-interna.md)) y la
  [guía de estilo](docs/05-estandares/guia-de-estilo.md).
- Pruebas para cada criterio de aceptación ([estrategia de pruebas](docs/06-calidad/estrategia-de-pruebas.md)).
- Si cambia algo publicado: `pnpm changeset`.
- Si cambia el contrato público a propósito: `pnpm api:update` y explica el cambio en el PR.

## Abrir el PR

- Título en Conventional Commits (será el commit de squash).
- Completa la plantilla del PR.
- La revisión sigue el [checklist](docs/05-estandares/code-review.md) y el PR se fusiona cuando cumple
  la [Definition of Done](docs/05-estandares/dor-dod.md).

## Conducta y seguridad

Este proyecto sigue el [Código de conducta](CODE_OF_CONDUCT.md). Las vulnerabilidades **no** se
reportan en issues públicos: ver [SECURITY.md](SECURITY.md).

Al contribuir aceptas que tu aporte se publique bajo la [licencia MIT](LICENSE) del proyecto.
