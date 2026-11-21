// CU-02..CU-05: reproducir, pausar, reanudar, detener y saltar.

import { ResourceNotFoundError } from '../domain/exceptions/errors.js';
import type { Narration } from '../domain/Narration.js';
import type { AudioOutput } from '../domain/outbound/AudioOutput.port.js';
import type { SpeechEngine } from '../domain/outbound/SpeechEngine.port.js';
import { NarrationRegistry } from './NarrationRegistry.js';
import { NarrationSession } from './NarrationSession.js';

function activeSession(registry: NarrationRegistry): NarrationSession {
  const session = registry.active;
  if (session === undefined) {
    throw new ResourceNotFoundError('AV_INVALID_NARRATION_TRANSITION', 'No hay narración activa', {
      details: { from: 'none', action: 'control' },
    });
  }
  return session;
}

/** Inicia una narración; detiene la que hubiera activa. Resuelve al empezar a sonar. */
export class PlayNarration {
  constructor(
    private readonly registry: NarrationRegistry,
    private readonly engine: SpeechEngine,
    private readonly audio: AudioOutput,
  ) {}

  async execute(narration: Narration): Promise<NarrationSession> {
    const session = new NarrationSession(narration, this.engine, this.audio);
    this.registry.activate(session);
    await session.start();
    return session;
  }
}

export class PauseNarration {
  constructor(private readonly registry: NarrationRegistry) {}
  execute(): void {
    activeSession(this.registry).pause();
  }
}

export class ResumeNarration {
  constructor(private readonly registry: NarrationRegistry) {}
  execute(): void {
    activeSession(this.registry).resume();
  }
}

export class StopNarration {
  constructor(private readonly registry: NarrationRegistry) {}
  execute(): void {
    activeSession(this.registry).stop();
  }
}

export class SeekNarration {
  constructor(private readonly registry: NarrationRegistry) {}
  execute(segmentIndex: number): void {
    activeSession(this.registry).seek(segmentIndex);
  }
}
