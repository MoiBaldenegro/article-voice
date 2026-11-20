export const NARRATION_STATES = [
  'idle',
  'preparing',
  'playing',
  'paused',
  'stopped',
  'error',
] as const;
export type NarrationState = (typeof NARRATION_STATES)[number];
