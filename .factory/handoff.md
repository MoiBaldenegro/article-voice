# Handoff

- #26 hecho: la demo de la landing suena con MOSS real. Audio en `docs/04-diseno/ui/landing/audio/` (6 OGG/Opus mono, 288 KB, voz Nathan), generado con `scripts/generate-landing-audio.py` (venv del spike + soundfile). `build-landing.sh` copia `audio/` a `_site/`. `landing.html` reproduce con `Audio`, sincroniza progreso/resaltado/velocidad/salto y cae a `speechSynthesis` (web-speech) con aviso. Prueba: `pnpm test:landing` (verde); `pnpm verify` verde.
- Siguiente: nada pendiente de este issue. No escuché el audio (sin oído en la sesión): conviene que una persona lo oiga; Nathan locuta español con acento inglés.
- Pendiente anterior (T-035): KV en GPU, q4+WebGPU, WebNN (issues #27, #28).
