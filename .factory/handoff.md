# Handoff

- T-042 hecho (#23): estados visuales, i18n es/en y accesibilidad de `<article-voice>`.
  - `src/ui/i18n/{es,en,messages,index}.ts`: diccionarios; idioma = idioma del artículo > atributo `lang` > `<html lang>` > es (es→es, otro→en).
  - Elemento: estilos en shadow (variables `--av-*`, foco 2px con `:focus-visible`, `prefers-reduced-motion`), `role=group` con aria-label, región `role=status aria-live=polite` que anuncia playing/paused/error una vez, `aria-busy` en preparing, mensaje de error visible (`part=error`, texto por código AV_*), aviso de respaldo en `part=meta` ("Se usa la voz del sistema" / "Using the system voice").
  - Pruebas: `ArticleVoiceElement.a11y.spec.ts` (jest) y `pnpm test:a11y` (Playwright + @axe-core/playwright, puerto 4175, en CI).
- `pnpm verify`, `api:check`, `size`, `test:a11y` OK.
- Pendiente: sin cablear moss-browser, resaltado, `confirm-download`/`download-*`, selector `target`, selector de voz/velocidad en la UI, estado `buffering`; los errores no-DomainError del motor salen como AV_UNKNOWN (texto genérico).
