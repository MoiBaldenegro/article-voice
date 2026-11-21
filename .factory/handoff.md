# Handoff

- #48: Dependabot aplicado directo en main, uno por uno, `pnpm verify` verde tras cada paso (+ api:check y package:lint tras TS).
  - Actualizado: jest 30.5.2 + @types/jest 30, jest-environment-jsdom 30.5.2, typescript 6.0.3 (jest.config.cjs: ignoreDeprecations '6.0'), eslint 10.15 + @eslint/js 10, @types/node 20→22 (mínimo de engines), GitHub Actions: checkout v7, setup-node v7, configure-pages v6, deploy-pages v5, upload-pages-artifact v5, pnpm/action-setup v6.
  - No actualizado: typescript 7 (typescript-eslint no lo soporta: "typescript-eslint does not support TS 7.0"); @types/node 26 (engines >=22 → 22); changesets/action sigue en v1.
- Los tags de actions se tomaron de git ls-remote; no pude ver el PR #38: confirmar en CI que los workflows corren.
- Siguiente paso: vigilar CI; revisar TS 7 cuando typescript-eslint lo soporte (>=7.1).
