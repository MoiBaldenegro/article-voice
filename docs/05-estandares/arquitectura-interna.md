# Guía de arquitectura interna

- **Estado:** Aprobado · **Base:** [ADR-0002](../03-arquitectura/adr/0002-arquitectura-hexagonal-como-05-y-06.md)

Esta guía hace operativa la estructura de 05/06 para una librería. Si algo aquí contradice un ADR,
manda el ADR y esta guía se corrige.

## Árbol de carpetas

```text
07-article-voice/
├── libs/reader/                          # núcleo: sin E/S, sin dependencias de runtime
│   ├── tsconfig.lib.json
│   └── src/
│       ├── index.ts                     # reexporta el núcleo (uso interno del paquete)
│       ├── reader.tokens.ts              # un Symbol por puerto de salida
│       ├── reader-core.ts                # createCore(options): composición (≈ factory-core.module)
│       └── core/
│           ├── domain/
│           │   ├── <Agregado>.entity.ts           # entidad + Primitives + create/fromPrimitives
│           │   ├── value-objects/<grupo>/<Nombre>.vo.ts
│           │   ├── value-objects/ValueObject.ts
│           │   ├── exceptions/                    # errores de dominio (ver catálogo)
│           │   ├── outbound/<Nombre>.port.ts      # puertos de salida (interfaces)
│           │   └── services/
│           │       ├── <Protocolo>.ts             # funciones puras de dominio
│           │       ├── <Nombre>Service.ts         # servicio de dominio con estado/puertos
│           │       ├── contracts/<Nombre>Service.port.ts
│           │       └── tests/*.spec.ts
│           └── application/
│               ├── ReaderSettings.ts
│               ├── use-cases/<grupo>/<Verbo><Sustantivo>.use-case.ts
│               ├── use-cases/<grupo>/tests/*.spec.ts
│               └── services/<Grupo>ApplicationService.ts   # fachadas
├── src/                                 # el paquete publicado
│   ├── index.ts                         # ÚNICA API pública (ADR-0009): registra el elemento y exporta
│   ├── auto.ts                          # punto de entrada article-voice/auto
│   ├── create-reader.ts                 # arma adaptadores + createCore con la config resuelta
│   ├── config/reader.config.ts          # atributos → VOs → settings con valores por defecto
│   ├── ui/                              # capa de entrada (≈ controllers de 05/06, ADR-0012)
│   │   ├── ArticleVoiceElement.ts       # Custom Element: atributos, métodos, eventos; sin reglas de negocio
│   │   ├── template.ts / styles.ts      # Shadow DOM y tokens MXVI como --av-*
│   │   ├── i18n/{es,en}.ts
│   │   └── tests/*.spec.ts
│   ├── infrastructure/<tecnología>/     # adaptadores: dom/, audio/, engines/, storage/, device/
│   │   └── tests/*.spec.ts
│   └── worker/                          # runtime de MOSS en el Web Worker (detalle de MossBrowserEngine)
│       ├── worker.ts                    # protocolo de mensajes
│       ├── tokenizer/                   # SentencePiece en TS
│       ├── moss-runtime/                # bucle portado de onnx_tts_runtime.py (ADR-0016)
│       └── tests/
├── test/package/                        # prueba dist/ como lo usaría alguien (Vite y HTML sin bundler, en navegador real)
├── etc/<paquete>.api.md                 # reporte de API Extractor (contrato)
└── docs/
```

## Reglas de dependencia

| Capa | Puede importar | No puede importar |
| --- | --- | --- |
| `core/domain` | Solo `core/domain` | `application`, `src/**`, APIs del navegador (DOM, `window`, `fetch`, Web Audio, Worker), paquetes externos |
| `core/application` | `core/domain` | `src/**`, E/S |
| `reader-core.ts` | `core/**`, tokens | `src/**` |
| `src/infrastructure` | `lib/reader` (vía su `index.ts`), APIs del navegador, `onnxruntime-web` (solo en `src/worker`) | `core/**` por ruta relativa profunda |
| `src/ui` | `create-reader.ts`, servicios de aplicación (vía `lib/reader`), errores públicos | Entidades por ruta profunda, `src/worker` |
| `src/worker` | `onnxruntime-web`, su propio código | `lib/reader`, `src/ui`: se comunica solo por mensajes |
| `src/index.ts` | `create-reader.ts`, tipos y errores públicos | Entidades, casos de uso, adaptadores (no se exportan) |

Se verifican con `eslint-plugin-boundaries` (o `import/no-restricted-paths`) en CI. Un PR que
necesite romper una regla necesita ADR.

## Convenciones por tipo de archivo (iguales a 05/06)

- **Value object** (`X.vo.ts`): extiende `ValueObject<Props>`, constructor privado, fábricas
  estáticas `from(raw: unknown)` (valida y lanza `DomainValidationError` con código) y, si aplica,
  `of(valor tipado)`. Inmutable. Métodos que expresan reglas (`canAdvanceTo`, `isUrgent`).
- **Entidad** (`X.entity.ts`): exporta `XPrimitives` (objeto plano serializable, fechas en ISO),
  `X.create(...)` y `X.fromPrimitives(...)`; los cambios de estado devuelven `XPrimitives` nuevas.
- **Puerto de salida** (`X.port.ts`): `interface` en `domain/outbound`. Lo implementa un adaptador
  en `src/infrastructure`. Su token vive en `reader.tokens.ts`.
- **Caso de uso** (`VerboSustantivo.use-case.ts`): una clase, un método público `execute()`,
  dependencias por constructor (puertos o contratos de servicio, nunca adaptadores concretos).
- **Servicio de aplicación** (`XApplicationService.ts`): fachada delgada que agrupa casos de uso;
  es lo que usa `create-reader.ts`.
- **Composición** (`reader-core.ts`): `createCore(options: CoreOptions)` recibe los adaptadores ya
  construidos y devuelve los servicios de aplicación. Es el equivalente explícito de
  `FactoryCoreModule.registerAsync`: sin magia de DI, solo constructores.
- **Imports internos de la librería con sufijo `.js`** (ESM), igual que en `libs/factory` de 06.

## Patrones

**Permitidos:** dobles en memoria de cada puerto para pruebas; funciones puras para protocolos;
`Result` explícito solo en fronteras donde lanzar sería peor (documentado en el catálogo de errores).

**Prohibidos:**
- `any` (usar `unknown` y validar con un VO).
- Estado global mutable o singletons a nivel de módulo (todo se crea en `createCore`).
- Clases "util" o "helpers" genéricas: la lógica vive en el VO o servicio que la posee.
- Lanzar `Error` genérico desde el dominio: siempre un error del [catálogo](../04-diseno/catalogo-de-errores.md).
- `console.*` en el código publicado (ver [observabilidad](../07-operacion/observabilidad.md)).
- Exportar desde `src/index.ts` algo que no esté en el [contrato](../04-diseno/contrato-api-publica.md).
