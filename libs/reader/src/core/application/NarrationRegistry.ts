// Garantiza una sola narración activa: activar una nueva detiene la anterior.

import type { NarrationSession } from './NarrationSession.js';

export class NarrationRegistry {
  private current: NarrationSession | undefined;

  get active(): NarrationSession | undefined {
    return this.current;
  }

  /** Registra `session` como la activa; si había otra viva, la detiene. */
  activate(session: NarrationSession): void {
    const previous = this.current;
    if (previous === session) return;
    this.current = session;
    session.setOnFinished(() => {
      if (this.current === session) this.current = undefined;
    });
    if (previous !== undefined && !previous.isFinished) {
      try {
        previous.stop();
      } catch {
        // ya estaba en un estado terminal (idle/stopped): nada que detener
      }
    }
  }

  stopActive(): void {
    this.current?.stop();
  }
}
