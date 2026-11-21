import type { Messages } from './messages.js';

export const en: Messages = {
  group: 'Listen to this article',
  play: 'Listen',
  resume: 'Resume',
  pause: 'Pause',
  stop: 'Stop',
  speed: 'Speed',
  voice: 'Voice',
  progress: (segment, segments) => `Part ${segment} of ${segments}`,
  state: {
    idle: 'Ready to listen',
    preparing: 'Preparing the narration',
    playing: 'Playing',
    paused: 'Paused',
    ended: 'Narration finished',
    error: 'The narration could not be played',
  },
  fallback: 'Using the system voice',
  errors: {
    AV_ARTICLE_NOT_FOUND: 'No article to read was found',
    AV_ENGINE_UNAVAILABLE: 'No voice is available on this device',
    AV_AUDIO_BLOCKED: 'The browser blocked audio; press again',
    AV_SYNTHESIS_FAILED: 'Speech synthesis failed',
    AV_ENGINE_INIT_FAILED: 'The voice could not be started',
  },
  genericError: 'The narration could not be played',
};
