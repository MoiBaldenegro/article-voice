import type { Messages } from './messages.js';

export const es: Messages = {
  group: 'Escuchar este artículo',
  play: 'Escuchar',
  resume: 'Reanudar',
  pause: 'Pausar',
  stop: 'Detener',
  speed: 'Velocidad',
  voice: 'Voz',
  progress: (segment, segments) => `Fragmento ${segment} de ${segments}`,
  state: {
    idle: 'Listo para escuchar',
    preparing: 'Preparando la narración',
    playing: 'Reproduciendo',
    paused: 'En pausa',
    ended: 'Narración terminada',
    error: 'No se pudo reproducir la narración',
  },
  fallback: 'Se usa la voz del sistema',
  errors: {
    AV_ARTICLE_NOT_FOUND: 'No se encontró un artículo que leer',
    AV_ENGINE_UNAVAILABLE: 'No hay ninguna voz disponible en este dispositivo',
    AV_AUDIO_BLOCKED: 'El navegador bloqueó el audio; pulsa de nuevo',
    AV_SYNTHESIS_FAILED: 'La síntesis de voz falló',
    AV_ENGINE_INIT_FAILED: 'No se pudo iniciar la voz',
  },
  genericError: 'No se pudo reproducir la narración',
};
