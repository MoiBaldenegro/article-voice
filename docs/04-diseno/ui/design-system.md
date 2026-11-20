# UI y design system (MXVI)

- **Estado:** Aprobado como referencia · aplica solo si el producto tiene interfaz ([ADR-0011](../../03-arquitectura/adr/0011-nombre-y-alcance-provisional.md))
- **Fuente:** https://moibaldenegro.github.io/mxvi-design-system/ (v1.1) · repo `MoiBaldenegro/mxvi-design-system`

## Cómo se diseña aquí

- **Sin Figma.** Las maquetas se hacen como artifacts de Claude (HTML que usa los tokens de MXVI) y
  se exportan a esta carpeta: `ui/<pantalla>/<pantalla>.html` + captura `.png`.
- Cada maqueta enlaza la historia de usuario que resuelve y muestra todos sus estados (ver abajo).
- La fuente de verdad de los tokens es `mxvi/tokens.css` del design system; aquí solo se resumen.

## Identidad (resumen)

- **Solo tema oscuro.** No hay valores de tema claro definidos.
- Fondo `#070716` (nunca negro puro ni gris neutro), líneas finas de 1px en lugar de cajas pesadas.
- **Esquinas cuadradas en todo** (`--radius-square: 0`).
- **Un único acento ciruela** usado como señal, nunca como relleno de botón.
- Geist Pixel para títulos, Geist Sans para texto, Geist Mono para código; etiquetas en mayúsculas con `letter-spacing: .08em`.

## Tokens principales

| Token | Valor | Uso |
| --- | --- | --- |
| `--color-background` | `#070716` | Lienzo |
| `--color-surface` | `#101018` | Tarjetas y paneles |
| `--color-text` | `#ffffff` | Texto principal (19.98:1) |
| `--color-text-secondary` | `#b8b8c5` | Texto secundario (9.65:1 sobre surface) |
| `--color-border` / `--color-border-strong` | `rgba(255,255,255,.08)` / `.15` | Separadores |
| `--color-accent` / `--color-accent-hover` | `#B37AC2` / `#C396CF` | Señal, foco, enlaces |
| `--color-success` / `--color-danger` | `#39C98A` / `#F05B72` | Estados (sin token para warning/info) |
| `--font-display` / `--font-sans` / `--font-mono` | Geist Pixel / Geist Sans / Geist Mono | |
| `--gap-card` | `14px` | Unidad base de espaciado (múltiplos: 7, 14, 21, 28, 42, 56) |
| `--shadow-card-rest` / `--shadow-card-hover` | ver tokens.css | Elevación de tarjetas |
| `--transition-default` | `.28s cubic-bezier(.2,.8,.2,1)` | Único token de movimiento; movimientos de 2–8px, sin rebotes |

Componentes con prefijo `.mx-*` (BEM): `.mx-button` (`--accent`, `--surface`, `--quiet`, `--sm`,
`--cta`), `.mx-input`, `.mx-field`, `.mx-card`, `.mx-alert` (`--error`, `--success`), `.mx-code`,
`.mx-table`, entre otros. Los breakpoints no son consistentes entre las fuentes leídas: **se
verifican en `mxvi.css` antes de usarlos.**

## Uso en el paquete (si tiene UI)

- Los tokens se consumen como CSS custom properties; el paquete **no** empaqueta las fuentes ni el
  CSS del design system: el usuario los carga (`mxvi.css`) o el paquete los declara como opcionales.
- Si se necesitan los valores en JS, se generan desde `tokens.css` en el build, no se copian a mano.

## Estados obligatorios de cada componente

default, hover, focus-visible, active, disabled, loading, error y vacío (además de selected si aplica).

## Accesibilidad (requisito RNF-A11Y-01)

WCAG 2.2 AA: HTML semántico, teclado completo, foco visible (2px `#B37AC2` con 2px de separación),
`prefers-reduced-motion` respetado, el color nunca como única señal, objetivos táctiles de 44×44px.

## Maquetas

⏳ Ninguna todavía.
