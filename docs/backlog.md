# Backlog (orden = prioridad)

Detalle completo y épicas: [08-tareas/backlog.md](08-tareas/backlog.md). Revisado en #45 (2026-11-21).

## Hecho (alcance de la 0.1.0 completo)
T-000, T-001..T-006 (salvo protección de `main`), T-010..T-015, T-020..T-023, T-041, T-042, T-050, T-051,
cableado SelectEngine, landing con audio, README real, E2E con servidor falso, resaltado (T-052),
preferencias (T-053), guía y servidor de referencia de `moss-server`, Media Session (T-057),
ejemplos por framework (T-056, probados con `pnpm test:examples`), T-035 (medido; ninguna vía cumple RTF<1).

`pnpm verify`: 26 suites, 359 pruebas en verde (2026-11-21).

## Pendiente humano (no bloquea el MVP)
- Proteger `main` (Settings → Branches).
- Configurar npm Trusted Publishing y activar `NPM_PUBLISH_ENABLED=true` para publicar.
- Verificar `moss-server` con pesos reales de MOSS-TTS-Nano (la guía solo se probó con servidor falso).

## Después (post 0.1.0)
`article-voice/auto` (T-055), tematización y partes (T-054), sitio de demostración (T-058), `test:examples` en CI.
Experimental: T-030..T-033 `moss-browser` solo si se alcanza RTF ≤ 0,8 (WASM) o ≤ 0,5 (WebGPU); hoy no.
